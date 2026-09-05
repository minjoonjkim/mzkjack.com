/* Admin editor: password gate, generated form, live preview, publish to GitHub. */
(function () {
  'use strict';
  var Core = window.AdminCore;
  var CONFIG = window.ADMIN_CONFIG || {};
  var model = JSON.parse(JSON.stringify(window.SITE_CONTENT || {}));
  var token = null;
  var dirty = false;

  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ================= vault / gate ================= */
  // Fresh setups are cached locally because GitHub Pages takes a minute to serve the new admin-config.js.
  function currentVault() {
    if (CONFIG.vault) return CONFIG.vault;
    try {
      var cached = localStorage.getItem('admin-vault');
      if (cached) return JSON.parse(cached);
    } catch (e) { /* ignore */ }
    return null;
  }

  var setupMode = false;
  function setMode(setup) {
    setupMode = setup;
    $('mode-login').hidden = setup;
    $('mode-setup').hidden = !setup;
    $('gate-submit').textContent = setup ? 'Set up and unlock' : 'Unlock';
    $('toggle-setup').textContent = setup ? 'Back to login' : 'Reset access…';
    $('toggle-setup').hidden = setup ? !currentVault() : false;
    $('setup-repo').textContent = CONFIG.repo || '(repo not set)';
    showGateError('');
  }
  function showGateError(msg) { $('gate-error').textContent = msg; $('gate-error').hidden = !msg; }

  $('toggle-setup').addEventListener('click', function () { setMode(!setupMode); });

  $('gate-form').addEventListener('submit', function (e) {
    e.preventDefault();
    var btn = $('gate-submit');
    btn.disabled = true;
    showGateError('');
    var p = setupMode ? doSetup() : doLogin();
    p.then(function () { enterEditor(); })
     .catch(function (err) { showGateError(err.message || String(err)); })
     .then(function () { btn.disabled = false; });
  });

  function doLogin() {
    var vault = currentVault();
    if (!vault) return Promise.reject(new Error('No admin password has been set up yet. Use "Reset access…".'));
    return Core.openVault($('pw').value, vault).then(function (secret) {
      token = secret;
      $('pw').value = '';
    }, function () { throw new Error('Wrong password.'); });
  }

  function doSetup() {
    var t = $('setup-token').value.trim();
    var pw = $('setup-pw').value, pw2 = $('setup-pw2').value;
    if (!CONFIG.repo) return Promise.reject(new Error('admin-config.js has no repo set.'));
    if (!t) return Promise.reject(new Error('Paste a GitHub token.'));
    if (pw.length < 8) return Promise.reject(new Error('Use a password of at least 8 characters.'));
    if (pw !== pw2) return Promise.reject(new Error('Passwords do not match.'));

    var gh = Core.GitHub(t, CONFIG.repo, CONFIG.branch || 'main');
    return gh.checkRepo().then(function (r) {
      if (!r.ok) throw new Error('GitHub rejected the token (' + r.status + '). Check the token and that it covers ' + CONFIG.repo + '.');
      if (!r.canPush) throw new Error('This token cannot write to ' + CONFIG.repo + '. Grant Contents: Read and write.');
      return Core.sealVault(pw, t);
    }).then(function (vault) {
      var cfg = Object.assign({}, CONFIG, { vault: vault });
      return gh.putFile(CONFIG.configPath || 'admin-config.js', Core.serializeConfig(cfg), 'Set up admin access').then(function () {
        CONFIG = cfg;
        try { localStorage.setItem('admin-vault', JSON.stringify(vault)); } catch (e) { /* ignore */ }
        token = t;
        $('setup-token').value = ''; $('setup-pw').value = ''; $('setup-pw2').value = '';
      });
    });
  }

  function enterEditor() {
    try { sessionStorage.setItem('admin-token', token); } catch (e) { /* ignore */ }
    $('gate').hidden = true;
    $('app').hidden = false;
    renderForm();
    setStatus('Unlocked. Changes appear in the preview; click Publish to make them live.');
  }

  function lock() {
    token = null;
    try { sessionStorage.removeItem('admin-token'); } catch (e) { /* ignore */ }
    location.reload();
  }

  /* ================= status ================= */
  function setStatus(msg, kind) {
    var s = $('status');
    s.textContent = msg || '';
    s.className = 'status' + (kind ? ' ' + kind : '');
  }

  /* ================= model paths ================= */
  function getAt(path) { return path.reduce(function (o, k) { return o == null ? o : o[k]; }, model); }
  function setAt(path, v) { var p = path.slice(), k = p.pop(); getAt(p)[k] = v; }
  function encPath(path) { return encodeURIComponent(JSON.stringify(path)); }
  function decPath(s) { return JSON.parse(decodeURIComponent(s)); }

  /* ================= templates for "Add" ================= */
  function blank(v) {
    if (Array.isArray(v)) return [];
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).forEach(function (k) { o[k] = (k === 'type') ? v[k] : blank(v[k]); });
      return o;
    }
    if (typeof v === 'boolean') return false;
    return '';
  }
  var BLOCK_TEMPLATES = {
    text:    { type: 'text', title: 'New section', paragraphs: ['Write something here.'] },
    entries: { type: 'entries', title: 'New section', entries: [{ heading: 'Role or degree', org: 'Organization', location: '', when: '2026', current: false, bullets: ['What you did.'] }] },
    table:   { type: 'table', title: 'New section', rows: [{ name: 'Name', text: 'Description', tag: '' }] },
    skills:  { type: 'skills', title: 'Skills', rows: [{ label: 'Category', items: ['One', 'Two'], text: '' }] },
    stats:   { type: 'stats', title: 'At a glance', stats: [{ value: '1', label: 'Label' }] },
    cards:   { type: 'cards', title: 'New section', cards: [{ meta: 'Category', title: 'Card', text: 'Description', facts: [{ label: 'Fact', value: 'Value' }] }] }
  };
  var KEY_TEMPLATES = {
    tabs:    { id: 'new', label: 'New tab', blocks: [] },
    entries: { heading: '', org: '', location: '', when: '', current: false, bullets: [] },
    rows:    { name: '', text: '', tag: '' },
    stats:   { value: '', label: '' },
    cards:   { meta: '', title: '', text: '', facts: [] },
    facts:   { label: '', value: '' },
    contact: { label: '', value: '', href: '' }
  };
  function templateFor(path, list) {
    var key = path[path.length - 1];
    if (list.length) return blank(list[0]);
    if (key === 'rows') {
      var parent = getAt(path.slice(0, -1));
      if (parent && parent.type === 'skills') return { label: '', items: [], text: '' };
    }
    return KEY_TEMPLATES[key] ? JSON.parse(JSON.stringify(KEY_TEMPLATES[key])) : {};
  }

  /* ================= form rendering ================= */
  var LABELS = {
    nameKo: 'Name (Korean)', footerNote: 'Footer note (right)', href: 'Link (URL, mailto:, tel:)',
    when: 'Dates', current: 'Currently active (shows a mint dot)', org: 'Organization', meta: 'Category label',
    tag: 'Small tag (language, license…)', items: 'Items as chips', text: 'Text', paragraphs: 'Paragraphs',
    bullets: 'Bullet points', photo: 'Photo path', brand: 'Header name', roles: 'Roles / titles',
    focus: 'Focus areas', id: 'Tab id (used in the URL)', label: 'Label'
  };
  var LINES_HINT = { paragraphs: 'One paragraph per line.', bullets: 'One bullet per line. Use **text** for bold.', items: 'One per line.', roles: 'One per line.', focus: 'One per line.' };
  var MULTILINE = { text: 1, value: 1 };

  function humanize(k) {
    if (LABELS[k]) return LABELS[k];
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function isStringArray(a) { return Array.isArray(a) && a.every(function (x) { return typeof x === 'string'; }); }
  function itemTitle(item, i) {
    var keys = ['title', 'heading', 'label', 'name', 'value', 'id'];
    for (var k = 0; k < keys.length; k++) {
      if (item && typeof item[keys[k]] === 'string' && item[keys[k]].trim()) return item[keys[k]];
    }
    return 'Item ' + (i + 1);
  }

  function renderValue(v, path, key, level) {
    var p = encPath(path);
    if (key === 'type') {
      return '<div class="readonly">Section type: <b>' + esc(v) + '</b></div>';
    }
    if (typeof v === 'boolean') {
      return '<div class="field check"><input type="checkbox" id="f' + p + '" data-path="' + p + '" data-kind="bool"' + (v ? ' checked' : '') + '>' +
             '<label for="f' + p + '">' + esc(humanize(key)) + '</label></div>';
    }
    if (typeof v === 'string') {
      var multi = MULTILINE[key] || v.length > 70 || v.indexOf('\n') !== -1;
      return '<div class="field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        (multi
          ? '<textarea id="f' + p + '" data-path="' + p + '" data-kind="str" rows="' + Math.min(8, Math.max(2, Math.ceil(v.length / 60))) + '">' + esc(v) + '</textarea>'
          : '<input type="text" id="f' + p + '" data-path="' + p + '" data-kind="str" value="' + esc(v) + '">') +
        '</div>';
    }
    if (isStringArray(v)) {
      return '<div class="field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        '<textarea id="f' + p + '" data-path="' + p + '" data-kind="lines" rows="' + Math.min(10, Math.max(2, v.length + 1)) + '">' + esc(v.join('\n')) + '</textarea>' +
        (LINES_HINT[key] ? '<span class="hint">' + LINES_HINT[key] + '</span>' : '') + '</div>';
    }
    if (Array.isArray(v)) return renderList(v, path, key, level);
    if (v && typeof v === 'object') {
      return '<details class="group level-' + level + '"' + (level === 0 ? ' open' : '') + '><summary>' + esc(humanize(key)) + '</summary>' +
        '<div class="body">' + renderObjectBody(v, path, level + 1) + '</div></details>';
    }
    return '';
  }

  function renderObjectBody(obj, path, level) {
    return Object.keys(obj).map(function (k) { return renderValue(obj[k], path.concat([k]), k, level); }).join('');
  }

  function renderList(list, path, key, level) {
    var p = encPath(path);
    var items = list.map(function (item, i) {
      var ip = path.concat([i]);
      var title = itemTitle(item, i);
      var badge = item && item.type ? item.type : (key === 'tabs' ? (item.blocks || []).length + ' sections' : '');
      return '<details class="group item level-' + level + '"><summary>' +
        '<span class="title">' + esc(title) + '</span>' +
        (badge ? '<span class="badge">' + esc(badge) + '</span>' : '<span class="badge"></span>') +
        '<span class="item-actions">' +
          '<button type="button" class="btn secondary small" data-act="up" data-path="' + p + '" data-index="' + i + '" title="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
          '<button type="button" class="btn secondary small" data-act="down" data-path="' + p + '" data-index="' + i + '" title="Move down"' + (i === list.length - 1 ? ' disabled' : '') + '>↓</button>' +
          '<button type="button" class="btn danger small" data-act="remove" data-path="' + p + '" data-index="' + i + '" title="Remove">×</button>' +
        '</span></summary>' +
        '<div class="body">' + renderObjectBody(item, ip, level + 1) + '</div></details>';
    }).join('');

    var foot;
    if (key === 'blocks') {
      foot = '<select data-role="block-type" aria-label="Section type" style="width:auto">' +
        Object.keys(BLOCK_TEMPLATES).map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') +
        '</select><button type="button" class="btn secondary small" data-act="add-block" data-path="' + p + '">+ Add section</button>';
    } else {
      foot = '<button type="button" class="btn secondary small" data-act="add" data-path="' + p + '">+ Add ' + esc(humanize(key).replace(/s$/, '').toLowerCase()) + '</button>';
    }

    return '<div class="field"><label>' + esc(humanize(key)) + '</label>' +
      '<div class="list" data-list="' + p + '">' + items + '<div class="list-foot">' + foot + '</div></div></div>';
  }

  function renderForm() {
    $('form').innerHTML = renderObjectBody(model, [], 0);
  }

  // Re-render just one list after a structural change.
  function rerenderList(path) {
    var container = document.querySelector('[data-list="' + encPath(path) + '"]');
    if (!container) { renderForm(); return; }
    var list = getAt(path);
    var key = path[path.length - 1];
    var level = parseInt((container.closest('details') || {}).className.match(/level-(\d+)/) ? container.closest('details').className.match(/level-(\d+)/)[1] : 0, 10) + 1;
    var wrapper = container.parentElement;
    wrapper.outerHTML = renderList(list, path, key, level);
  }

  /* ================= events (delegated) ================= */
  $('form').addEventListener('input', function (e) {
    var t = e.target;
    if (!t.dataset || !t.dataset.path || !t.dataset.kind) return;
    var path = decPath(t.dataset.path);
    var v;
    if (t.dataset.kind === 'bool') v = t.checked;
    else if (t.dataset.kind === 'lines') v = t.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    else v = t.value;
    setAt(path, v);
    markDirty();
    schedulePreview(path);
  });

  $('form').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (!btn) return;
    e.preventDefault();
    var path = decPath(btn.dataset.path);
    var list = getAt(path);
    var i = parseInt(btn.dataset.index, 10);
    switch (btn.dataset.act) {
      case 'up':   if (i > 0) { list.splice(i - 1, 0, list.splice(i, 1)[0]); } break;
      case 'down': if (i < list.length - 1) { list.splice(i + 1, 0, list.splice(i, 1)[0]); } break;
      case 'remove':
        if (!confirm('Remove "' + itemTitle(list[i], i) + '"?')) return;
        list.splice(i, 1); break;
      case 'add':  list.push(templateFor(path, list)); break;
      case 'add-block':
        var sel = btn.parentElement.querySelector('[data-role="block-type"]');
        list.push(JSON.parse(JSON.stringify(BLOCK_TEMPLATES[sel.value])));
        break;
    }
    rerenderList(path);
    if (btn.dataset.act === 'add' || btn.dataset.act === 'add-block') {
      var container = document.querySelector('[data-list="' + encPath(path) + '"]');
      var last = container && container.querySelectorAll(':scope > details');
      if (last && last.length) { last[last.length - 1].open = true; last[last.length - 1].scrollIntoView({ block: 'nearest' }); }
    }
    markDirty();
    schedulePreview(path);
  });

  /* ================= preview ================= */
  var previewTimer = null, previewReady = false;
  var iframe = $('preview');
  iframe.addEventListener('load', function () { previewReady = true; pushPreview(); });

  function tabForPath(path) {
    if (path && path[0] === 'tabs' && typeof path[1] === 'number' && model.tabs[path[1]]) return model.tabs[path[1]].id;
    return null;
  }
  function schedulePreview(path) {
    clearTimeout(previewTimer);
    var tab = tabForPath(path);
    previewTimer = setTimeout(function () { pushPreview(tab); }, 150);
  }
  function pushPreview(tab) {
    if (!previewReady || !iframe.contentWindow) return;
    iframe.contentWindow.postMessage({ type: 'site-content', content: model, tab: tab || null }, '*');
  }

  /* ================= dirty state ================= */
  function markDirty() {
    if (!dirty) { dirty = true; setStatus('Unpublished changes.'); }
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= publish / download / lock / password ================= */
  $('btn-publish').addEventListener('click', function () {
    if (!token) { setStatus('Locked. Reload and unlock first.', 'error'); return; }
    var btn = $('btn-publish');
    btn.disabled = true;
    setStatus('Publishing…');
    var gh = Core.GitHub(token, CONFIG.repo, CONFIG.branch || 'main');
    gh.putFile(CONFIG.contentPath || 'content.js', Core.serializeContent(model), 'Update site content')
      .then(function () {
        dirty = false;
        setStatus('Published. The live site updates within about a minute.', 'ok');
      })
      .catch(function (err) { setStatus(err.message, 'error'); })
      .then(function () { btn.disabled = false; });
  });

  $('btn-download').addEventListener('click', function () {
    var blob = new Blob([Core.serializeContent(model)], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'content.js';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    setStatus('Downloaded content.js. Replace the file in your site folder to apply.', 'ok');
  });

  $('btn-lock').addEventListener('click', function () {
    if (dirty && !confirm('You have unpublished changes. Lock anyway?')) return;
    dirty = false;
    lock();
  });

  $('btn-password').addEventListener('click', function () {
    if (!token) return;
    var pw = prompt('New password (at least 8 characters; longer is safer):');
    if (pw == null) return;
    if (pw.length < 8) { setStatus('Password must be at least 8 characters.', 'error'); return; }
    var pw2 = prompt('Repeat the new password:');
    if (pw2 !== pw) { setStatus('Passwords did not match. Nothing changed.', 'error'); return; }
    setStatus('Updating password…');
    var gh = Core.GitHub(token, CONFIG.repo, CONFIG.branch || 'main');
    Core.sealVault(pw, token).then(function (vault) {
      var cfg = Object.assign({}, CONFIG, { vault: vault });
      return gh.putFile(CONFIG.configPath || 'admin-config.js', Core.serializeConfig(cfg), 'Change admin password').then(function () {
        CONFIG = cfg;
        try { localStorage.setItem('admin-vault', JSON.stringify(vault)); } catch (e) { /* ignore */ }
        setStatus('Password changed.', 'ok');
      });
    }).catch(function (err) { setStatus(err.message, 'error'); });
  });

  /* ================= boot ================= */
  (function boot() {
    if (!window.isSecureContext || !window.crypto || !window.crypto.subtle) {
      showGateError('This editor needs a secure context (https:// or localhost). Run a local server, e.g. `python3 -m http.server`, or use the live site.');
    }
    var vault = currentVault();
    setMode(!vault);
    try {
      var saved = sessionStorage.getItem('admin-token');
      if (saved && vault) { token = saved; enterEditor(); return; }
    } catch (e) { /* ignore */ }
  })();
})();
