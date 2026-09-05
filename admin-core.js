/* Pure helpers for the admin editor: crypto, encoding, serialization, GitHub API.
   No DOM access here so it can be unit-tested in Node. */
(function (root) {
  'use strict';
  var subtle = (root.crypto && root.crypto.subtle);
  var enc = new TextEncoder();
  var dec = new TextDecoder();

  /* ---------- base64 ---------- */
  function bytesToB64(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i += 0x8000) {
      bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    }
    return btoa(bin);
  }
  function b64ToBytes(s) {
    var bin = atob(s), out = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  }
  function utf8ToB64(str) { return bytesToB64(enc.encode(str)); }
  function b64ToUtf8(s) { return dec.decode(b64ToBytes(s)); }

  /* ---------- password vault (PBKDF2 -> AES-GCM) ---------- */
  var ITERATIONS = 600000;

  function deriveKey(password, salt, iterations) {
    return subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey'])
      .then(function (km) {
        return subtle.deriveKey(
          { name: 'PBKDF2', salt: salt, iterations: iterations, hash: 'SHA-256' },
          km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
      });
  }

  // Returns a vault object safe to store publicly.
  function sealVault(password, secret) {
    var salt = root.crypto.getRandomValues(new Uint8Array(16));
    var iv = root.crypto.getRandomValues(new Uint8Array(12));
    return deriveKey(password, salt, ITERATIONS).then(function (key) {
      return subtle.encrypt({ name: 'AES-GCM', iv: iv }, key, enc.encode(secret));
    }).then(function (ct) {
      return {
        v: 1,
        kdf: 'PBKDF2-SHA256',
        iterations: ITERATIONS,
        salt: bytesToB64(salt),
        iv: bytesToB64(iv),
        data: bytesToB64(new Uint8Array(ct))
      };
    });
  }

  // Rejects if the password is wrong.
  function openVault(password, vault) {
    return deriveKey(password, b64ToBytes(vault.salt), vault.iterations || ITERATIONS).then(function (key) {
      return subtle.decrypt({ name: 'AES-GCM', iv: b64ToBytes(vault.iv) }, key, b64ToBytes(vault.data));
    }).then(function (pt) { return dec.decode(pt); });
  }

  /* ---------- serialization ---------- */
  // English writes content.js (SITE_CONTENT); Korean writes content.ko.js (SITE_CONTENT_KO).
  function serializeContent(content, lang) {
    if (lang === 'ko') {
      return '/* Korean site content. Edit this file directly, or use admin.html (password protected)\n' +
             '   with the language switch set to \uD55C\uAD6D\uC5B4. Text fields support **bold** and line breaks.\n' +
             '   This file is managed separately from content.js (English). */\n' +
             'window.SITE_CONTENT_KO = ' + JSON.stringify(content, null, 2) + ';\n';
    }
    return '/* Site content. Edit this file directly, or use admin.html (password protected).\n' +
           '   Text fields support **bold** and line breaks. */\n' +
           'window.SITE_CONTENT = ' + JSON.stringify(content, null, 2) + ';\n';
  }
  function serializeConfig(config) {
    return '/* Admin settings. The "vault" holds your GitHub token encrypted with your admin\n' +
           '   password (AES-GCM, key derived with PBKDF2). It is written by admin.html during\n' +
           '   first-time setup. Never put a plain token in this file. */\n' +
           'window.ADMIN_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n';
  }

  /* ---------- GitHub Contents API ---------- */
  function GitHub(token, repo, branch, fetchImpl) {
    var f = fetchImpl || root.fetch.bind(root);
    function call(path, opts) {
      opts = opts || {};
      opts.headers = Object.assign({
        'Authorization': 'Bearer ' + token,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28'
      }, opts.headers || {});
      return f('https://api.github.com' + path, opts);
    }
    return {
      // Resolves to { ok, canPush, name }
      checkRepo: function () {
        return call('/repos/' + repo).then(function (r) {
          if (!r.ok) return { ok: false, status: r.status };
          return r.json().then(function (j) {
            return { ok: true, canPush: !!(j.permissions && j.permissions.push), name: j.full_name };
          });
        });
      },
      getFileSha: function (path) {
        // Cache-bust with a query param. A Cache-Control header cannot be used:
        // it is not CORS-safelisted and GitHub does not allow it, which fails the
        // preflight and surfaces as "Failed to fetch".
        return call('/repos/' + repo + '/contents/' + encodeURI(path) + '?ref=' + encodeURIComponent(branch) + '&_=' + Date.now()).then(function (r) {
          if (r.status === 404) return null;
          if (!r.ok) throw new Error('GitHub read failed (' + r.status + ')');
          return r.json().then(function (j) { return j.sha; });
        });
      },
      putFile: function (path, text, message) {
        return this.putBase64(path, utf8ToB64(text), message);
      },
      // Writes any file from base64 content (used for photo and video uploads).
      putBase64: function (path, b64, message) {
        var self = this;
        // The contents API is eventually consistent: a correct sha can still be
        // rejected with 409 moments after another write. Re-read and retry.
        function attempt(n) {
          return self.getFileSha(path).then(function (sha) {
            var body = { message: message, content: b64, branch: branch };
            if (sha) body.sha = sha;
            return call('/repos/' + repo + '/contents/' + encodeURI(path), { method: 'PUT', body: JSON.stringify(body) });
          }).then(function (r) {
            if (r.ok) return r.json();
            if ((r.status === 409 || r.status === 422) && n < 4) {
              return new Promise(function (go) { setTimeout(go, 500 * n); }).then(function () { return attempt(n + 1); });
            }
            return r.json().catch(function () { return {}; }).then(function (j) {
              throw new Error('GitHub write failed (' + r.status + '): ' + (j.message || 'unknown error'));
            });
          });
        }
        return attempt(1);
      }
    };
  }

  root.AdminCore = {
    utf8ToB64: utf8ToB64, b64ToUtf8: b64ToUtf8, bytesToB64: bytesToB64,
    sealVault: sealVault, openVault: openVault,
    serializeContent: serializeContent, serializeConfig: serializeConfig,
    GitHub: GitHub
  };
})(typeof window !== 'undefined' ? window : globalThis);
