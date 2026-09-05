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
    // Hidden-but-required fields would otherwise block the form from submitting.
    disableInputs('mode-login', setup);
    disableInputs('mode-setup', !setup);
    $('gate-submit').textContent = setup ? 'Set up and unlock' : 'Unlock';
    $('toggle-setup').textContent = setup ? 'Back to login' : 'Reset access…';
    $('toggle-setup').hidden = setup ? !currentVault() : false;
    $('setup-repo').textContent = CONFIG.repo || '(repo not set)';
    showGateError('');
  }
  function disableInputs(id, off) {
    Array.prototype.forEach.call($(id).querySelectorAll('input'), function (i) { i.disabled = off; });
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
    renderCompose();
    setEditorMode('compose');
    setStatus('Unlocked. Write a post, or switch to Structure to edit the rest of the page.');
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
    cards:   { type: 'cards', title: 'New section', cards: [{ meta: 'Category', title: 'Card', text: 'Description', facts: [{ label: 'Fact', value: 'Value' }] }] },
    posts:   { type: 'posts', title: 'Updates', posts: [] }
  };
  var KEY_TEMPLATES = {
    tabs:    { id: 'new', label: 'New tab', blocks: [] },
    entries: { heading: '', org: '', location: '', when: '', current: false, bullets: [] },
    rows:    { name: '', text: '', tag: '' },
    stats:   { value: '', label: '' },
    cards:   { meta: '', title: '', text: '', facts: [] },
    facts:   { label: '', value: '' },
    contact: { label: '', value: '', href: '' },
    posts:   { title: '', date: '', body: '', media: [] },
    media:   { type: 'image', src: '', alt: '' }
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
    focus: 'Focus areas', id: 'Tab id (used in the URL)', label: 'Label',
    body: 'Body', media: 'Photos and videos', src: 'File path or URL', alt: 'Caption / alt text',
    date: 'Date (YYYY-MM-DD)', posts: 'Posts', author: 'Author (defaults to your name)'
  };
  var LINES_HINT = { paragraphs: 'One paragraph per line.', bullets: 'One bullet per line. Use **text** for bold.', items: 'One per line.', roles: 'One per line.', focus: 'One per line.' };
  var MULTILINE = { text: 1, value: 1, body: 1 };

  function humanize(k) {
    if (LABELS[k]) return LABELS[k];
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function isStringArray(a) { return Array.isArray(a) && a.every(function (x) { return typeof x === 'string'; }); }
  function itemTitle(item, i) {
    var keys = ['title', 'heading', 'label', 'name', 'value', 'id'];
    if (item && item.src && !item.title) return String(item.src).split('/').pop();
    for (var k = 0; k < keys.length; k++) {
      if (item && typeof item[keys[k]] === 'string' && item[keys[k]].trim()) return item[keys[k]];
    }
    return 'Item ' + (i + 1);
  }

  function renderValue(v, path, key, level) {
    var p = encPath(path);
    if (key === 'type') {
      // Section types are fixed; a media item's type is image or video.
      if (path[path.length - 3] === 'blocks') return '<div class="readonly">Section type: <b>' + esc(v) + '</b></div>';
      return '<div class="field"><label for="f' + p + '">Kind</label>' +
        '<select id="f' + p + '" data-path="' + p + '" data-kind="str">' +
        ['image', 'video'].map(function (o) {
          return '<option value="' + o + '"' + (o === v ? ' selected' : '') + '>' + o + '</option>';
        }).join('') + '</select></div>';
    }
    if (key === 'photo' && path.length === 2 && path[0] === 'profile') {
      return '<div class="field">' +
        '<label for="f' + p + '">Profile photo</label>' +
        '<div class="photo-row">' +
          '<div class="photo-thumb" id="photo-thumb">' +
            (v ? '<img src="' + esc(v) + '" alt="" onerror="this.remove()">' : '') +
          '</div>' +
          '<div class="photo-controls">' +
            '<div class="photo-buttons">' +
              '<button type="button" class="btn secondary small" data-act="pick-photo">Upload photo\u2026</button>' +
              (v ? '<button type="button" class="btn secondary small" data-act="recrop-photo">Recrop current</button>' : '') +
            '</div>' +
            '<input type="file" id="photo-file" accept="image/jpeg,image/png,image/webp" hidden>' +
            '<input type="text" id="f' + p + '" data-path="' + p + '" data-kind="str" value="' + esc(v) + '">' +
            '<span class="hint">JPEG, PNG or WebP. You choose the square crop; it saves as images/profile.jpg.</span>' +
          '</div>' +
        '</div></div>';
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
    if (btn.dataset.act === 'pick-photo') { var picker = $('photo-file'); if (picker) picker.click(); return; }
    if (btn.dataset.act === 'recrop-photo') {
      var cur = (model.profile && model.profile.photo) || PHOTO_PATH;
      cropThenUpload(cur + (cur.indexOf('?') === -1 ? '?' : '&') + 't=' + Date.now(), false);
      return;
    }
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
  /* ================= profile photo: upload + crop ================= */
  var PHOTO_PATH = 'images/profile.jpg';
  var CROP_STAGE = 320;   // on-screen crop square, in CSS pixels
  var CROP_OUT = 800;     // exported square, in pixels

  function loadImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        if (!img.naturalWidth || !img.naturalHeight) { reject(new Error('That image could not be read.')); return; }
        resolve(img);
      };
      img.onerror = function () {
        reject(new Error('Your browser cannot read that file. iPhone HEIC photos are not supported: export it as JPEG first.'));
      };
      img.src = src;
    });
  }

  // Square cropper: drag to pan, slider or wheel to zoom.
  // Resolves to {dataUrl, b64}, or null when cancelled.
  function cropSquare(img) {
    return new Promise(function (resolve) {
      var overlay = $('crop-overlay'), canvas = $('crop-canvas'), zoom = $('crop-zoom');
      var ctx = canvas.getContext('2d');
      var minScale = Math.max(CROP_STAGE / img.naturalWidth, CROP_STAGE / img.naturalHeight);
      var scale = minScale, ox = 0, oy = 0, dragging = false, lastX = 0, lastY = 0;

      function clamp() {
        var w = img.naturalWidth * scale, h = img.naturalHeight * scale;
        ox = Math.min(0, Math.max(CROP_STAGE - w, ox));
        oy = Math.min(0, Math.max(CROP_STAGE - h, oy));
      }
      function draw() {
        ctx.fillStyle = '#ededed';
        ctx.fillRect(0, 0, CROP_STAGE, CROP_STAGE);
        ctx.drawImage(img, ox, oy, img.naturalWidth * scale, img.naturalHeight * scale);
      }
      function setZoom(mult, cx, cy) {
        var next = minScale * mult;
        if (cx == null) { cx = CROP_STAGE / 2; cy = CROP_STAGE / 2; }
        ox = cx - (cx - ox) * (next / scale);
        oy = cy - (cy - oy) * (next / scale);
        scale = next; clamp(); draw();
      }

      ox = (CROP_STAGE - img.naturalWidth * scale) / 2;
      oy = (CROP_STAGE - img.naturalHeight * scale) / 2;
      clamp(); draw();
      zoom.value = '1';

      function onZoom() { setZoom(parseFloat(zoom.value)); }
      function onDown(e) {
        dragging = true; lastX = e.clientX; lastY = e.clientY;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      function onMove(e) {
        if (!dragging) return;
        ox += e.clientX - lastX; oy += e.clientY - lastY;
        lastX = e.clientX; lastY = e.clientY;
        clamp(); draw();
      }
      function onUp(e) {
        dragging = false;
        try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      function onWheel(e) {
        e.preventDefault();
        var rect = canvas.getBoundingClientRect();
        var mult = Math.min(4, Math.max(1, parseFloat(zoom.value) * (e.deltaY < 0 ? 1.1 : 1 / 1.1)));
        zoom.value = String(mult);
        setZoom(mult, e.clientX - rect.left, e.clientY - rect.top);
      }
      function onKey(e) { if (e.key === 'Escape') finish(null); }

      function cleanup() {
        zoom.removeEventListener('input', onZoom);
        canvas.removeEventListener('pointerdown', onDown);
        canvas.removeEventListener('pointermove', onMove);
        canvas.removeEventListener('pointerup', onUp);
        canvas.removeEventListener('pointercancel', onUp);
        canvas.removeEventListener('wheel', onWheel);
        document.removeEventListener('keydown', onKey);
        $('crop-save').removeEventListener('click', onSave);
        $('crop-cancel').removeEventListener('click', onCancel);
        overlay.hidden = true;
      }
      function finish(v) { cleanup(); resolve(v); }
      function onCancel() { finish(null); }
      function onSave() {
        var out = document.createElement('canvas');
        out.width = CROP_OUT; out.height = CROP_OUT;
        var octx = out.getContext('2d');
        var r = CROP_OUT / CROP_STAGE;
        octx.fillStyle = '#ffffff';
        octx.fillRect(0, 0, CROP_OUT, CROP_OUT);
        octx.drawImage(img, ox * r, oy * r, img.naturalWidth * scale * r, img.naturalHeight * scale * r);
        var dataUrl;
        try { dataUrl = out.toDataURL('image/jpeg', 0.88); }
        catch (err) { finish(null); setStatus('That image could not be processed.', 'error'); return; }
        finish({ dataUrl: dataUrl, b64: dataUrl.slice(dataUrl.indexOf(',') + 1) });
      }

      zoom.addEventListener('input', onZoom);
      canvas.addEventListener('pointerdown', onDown);
      canvas.addEventListener('pointermove', onMove);
      canvas.addEventListener('pointerup', onUp);
      canvas.addEventListener('pointercancel', onUp);
      canvas.addEventListener('wheel', onWheel, { passive: false });
      document.addEventListener('keydown', onKey);
      $('crop-save').addEventListener('click', onSave);
      $('crop-cancel').addEventListener('click', onCancel);
      overlay.hidden = false;
      $('crop-save').focus();
    });
  }

  function commitPhoto(out) {
    setStatus('Uploading photo\u2026');
    return github().putBase64(PHOTO_PATH, out.b64, 'Update profile photo').then(function () {
      var thumb = $('photo-thumb');
      if (thumb) thumb.innerHTML = '<img src="' + out.dataUrl + '" alt="">';
      var field = document.querySelector('[data-path="' + encPath(['profile', 'photo']) + '"]');
      if (field) field.value = PHOTO_PATH;
      if (model.profile) model.profile.photo = PHOTO_PATH;
      setStatus('Photo updated. The live site shows it once GitHub rebuilds, about a minute.', 'ok');
    });
  }

  function cropThenUpload(src, revoke) {
    if (!token) { setStatus('Locked. Reload and unlock first.', 'error'); return; }
    setStatus('Opening the photo\u2026');
    loadImage(src).then(function (img) {
      if (revoke) URL.revokeObjectURL(src);
      return cropSquare(img);
    }).then(function (out) {
      if (!out) { setStatus('Photo unchanged.'); return; }
      return commitPhoto(out);
    }).catch(function (err) {
      if (revoke) URL.revokeObjectURL(src);
      setStatus(err.message || 'Could not use that photo.', 'error');
    });
  }

  $('form').addEventListener('change', function (e) {
    if (!e.target || e.target.id !== 'photo-file' || !e.target.files || !e.target.files[0]) return;
    var file = e.target.files[0];
    e.target.value = '';
    if (!/^image\//.test(file.type)) { setStatus('Choose an image file (JPEG, PNG or WebP).', 'error'); return; }
    cropThenUpload(URL.createObjectURL(file), true);
  });

  function markDirty() {
    if (!dirty) { dirty = true; setStatus('Unpublished changes.'); }
  }
  window.addEventListener('beforeunload', function (e) {
    if (dirty) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= publish / download / lock / password ================= */
  function github() { return Core.GitHub(token, CONFIG.repo, CONFIG.branch || 'main'); }

  function publishContent(message) {
    if (!token) return Promise.reject(new Error('Locked. Reload and unlock first.'));
    return github()
      .putFile(CONFIG.contentPath || 'content.js', Core.serializeContent(model), message || 'Update site content')
      .then(function (r) { dirty = false; return r; });
  }

  $('btn-publish').addEventListener('click', function () {
    var btn = $('btn-publish');
    btn.disabled = true;
    setStatus('Publishing…');
    publishContent('Update site content')
      .then(function () { setStatus('Published. The live site updates within about a minute.', 'ok'); })
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

  /* ================= editor mode ================= */
  var editorMode = 'compose';
  function setEditorMode(mode) {
    editorMode = mode;
    $('mode-compose').setAttribute('aria-pressed', mode === 'compose' ? 'true' : 'false');
    $('mode-structure').setAttribute('aria-pressed', mode === 'structure' ? 'true' : 'false');
    $('compose-pane').hidden = mode !== 'compose';
    $('panes').hidden = mode !== 'structure';
    if (mode === 'compose') renderCompose();
    else { renderForm(); pushPreview(model.tabs[composeTab] && model.tabs[composeTab].id); }
  }
  $('mode-compose').addEventListener('click', function () { setEditorMode('compose'); });
  $('mode-structure').addEventListener('click', function () { setEditorMode('structure'); });

  /* ================= compose: social-style posts ================= */
  var composeTab = 0;
  var draft = [];          // { kind: 'new' | 'existing', mtype, src, alt, file, url, name }
  var editingIndex = -1;   // index in the tab's post list, -1 while writing a new post
  var MAX_BYTES = 40 * 1024 * 1024;
  var nextDraftId = 1;
  // Freshly uploaded files 404 until GitHub Pages rebuilds, so preview them from memory.
  var localUrls = {};
  function previewSrc(src) { return localUrls[src] || src; }

  function todayISO() {
    var d = new Date();
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
  }
  function niceDate(v) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(v || '');
    if (!m) return v || '';
    return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m[2] - 1] + ' ' + (+m[3]) + ', ' + m[1];
  }
  function initialsOf(name) {
    return String(name || '').split(/\s+/).map(function (w) { return w[0] || ''; }).join('').slice(0, 2).toUpperCase();
  }
  function isVideoSrc(item) {
    return item.mtype === 'video' || item.type === 'video' || /\.(mp4|webm|mov|m4v|ogg)$/i.test(item.src || '');
  }

  // Every tab keeps one "posts" section; it is created the first time you post there.
  function postsBlock(tabIndex, create) {
    var tab = model.tabs[tabIndex];
    if (!tab) return null;
    tab.blocks = tab.blocks || [];
    for (var i = 0; i < tab.blocks.length; i++) {
      if (tab.blocks[i].type === 'posts') return tab.blocks[i];
    }
    if (!create) return null;
    var block = { type: 'posts', title: 'Updates', posts: [] };
    tab.blocks.push(block);
    return block;
  }
  function postsOf(tabIndex) {
    var b = postsBlock(tabIndex, false);
    return (b && b.posts) || [];
  }

  function renderCompose() {
    renderComposeTabs();
    renderComposerHead();
    renderDraftMedia();
    renderComposeFeed();
  }

  function renderComposeTabs() {
    var host = $('compose-tabs');
    host.innerHTML = '<span class="pill-label">Post in</span>' + (model.tabs || []).map(function (t, i) {
      var n = postsOf(i).length;
      return '<button type="button" class="pill" data-tab="' + i + '" aria-pressed="' + (i === composeTab) + '">' +
        esc(t.label || t.id) + '<span class="count">' + n + '</span></button>';
    }).join('');
  }

  function renderComposerHead() {
    var pro = model.profile || {};
    $('composer-avatar').innerHTML = pro.photo
      ? '<img src="' + esc(pro.photo) + '" alt="" onerror="this.remove()">'
      : esc(initialsOf(pro.name));
    $('composer-author').textContent = pro.name || 'You';
    var tab = model.tabs[composeTab];
    $('composer-target').textContent = editingIndex >= 0
      ? 'Editing a post in ' + (tab ? tab.label : '')
      : 'Posting to ' + (tab ? tab.label : '');
    $('composer-badge').hidden = editingIndex < 0;
    $('post-cancel').hidden = editingIndex < 0 && !draft.length && !$('post-title').value && !$('post-body').value;
    $('post-submit').textContent = editingIndex >= 0 ? 'Save changes' : 'Post';
  }

  function renderDraftMedia() {
    $('media-strip').innerHTML = draft.map(function (m, i) {
      var src = m.kind === 'new' ? m.url : previewSrc(m.src);
      var inner = isVideoSrc(m)
        ? '<video src="' + esc(src) + '" preload="metadata" muted playsinline></video>'
        : '<img src="' + esc(src) + '" alt="">';
      return '<div class="media-tile">' + inner +
        '<span class="kind">' + (isVideoSrc(m) ? 'video' : 'photo') + '</span>' +
        '<span class="tools">' +
          '<button type="button" data-mact="left" data-i="' + i + '" title="Move left"' + (i === 0 ? ' disabled' : '') + '>‹</button>' +
          '<button type="button" data-mact="right" data-i="' + i + '" title="Move right"' + (i === draft.length - 1 ? ' disabled' : '') + '>›</button>' +
          '<button type="button" data-mact="del" data-i="' + i + '" title="Remove">✕</button>' +
        '</span></div>';
    }).join('');
    $('dropnote').hidden = draft.length > 0;
  }

  function renderComposeFeed() {
    var posts = postsOf(composeTab);
    $('feed-count').textContent = posts.length
      ? posts.length + (posts.length === 1 ? ' post' : ' posts') + ' in this tab'
      : '';
    if (!posts.length) {
      $('compose-feed').innerHTML = '<div class="empty-note">Nothing posted in this tab yet.</div>';
      return;
    }
    $('compose-feed').innerHTML = posts.map(function (post, i) {
      var media = (post.media || []).filter(function (m) { return m && m.src; });
      var thumbs = media.slice(0, 6).map(function (m) {
        var src = previewSrc(m.src);
        var inner = isVideoSrc(m)
          ? '<video src="' + esc(src) + '" preload="metadata" muted playsinline></video><span>video</span>'
          : '<img src="' + esc(src) + '" alt="" loading="lazy">';
        return '<div class="thumb">' + inner + '</div>';
      }).join('');
      var body = String(post.body || '');
      if (body.length > 260) body = body.slice(0, 260) + '…';
      return '<article class="card apost">' +
        '<div class="apost-top">' +
          '<span class="apost-title">' + esc(post.title || '(no title)') + '</span>' +
          '<span class="apost-when">' + esc(niceDate(post.date)) + '</span>' +
          '<span class="apost-tools">' +
            '<button type="button" class="btn secondary small" data-pact="up" data-i="' + i + '" title="Move up"' + (i === 0 ? ' disabled' : '') + '>↑</button>' +
            '<button type="button" class="btn secondary small" data-pact="down" data-i="' + i + '" title="Move down"' + (i === posts.length - 1 ? ' disabled' : '') + '>↓</button>' +
            '<button type="button" class="btn secondary small" data-pact="edit" data-i="' + i + '">Edit</button>' +
            '<button type="button" class="btn danger small" data-pact="del" data-i="' + i + '">Delete</button>' +
          '</span>' +
        '</div>' +
        (body ? '<div class="apost-body">' + esc(body) + '</div>' : '') +
        (thumbs ? '<div class="apost-media">' + thumbs + (media.length > 6 ? '<div class="thumb"><span>+' + (media.length - 6) + '</span></div>' : '') + '</div>' : '') +
        '</article>';
    }).join('');
  }

  /* ---- draft media ---- */
  function addFiles(files) {
    var rejected = [];
    Array.prototype.forEach.call(files, function (file) {
      var video = /^video\//.test(file.type);
      if (!video && !/^image\//.test(file.type)) { rejected.push(file.name + ' (not a photo or video)'); return; }
      if (file.size > MAX_BYTES) { rejected.push(file.name + ' (over 40 MB)'); return; }
      draft.push({
        id: nextDraftId++, kind: 'new', file: file, url: URL.createObjectURL(file),
        mtype: video ? 'video' : 'image', name: file.name, alt: ''
      });
    });
    renderDraftMedia();
    renderComposerHead();
    if (rejected.length) setStatus('Skipped: ' + rejected.join(', ') + '.', 'error');
    else if (files.length) setStatus(draft.length + (draft.length === 1 ? ' file' : ' files') + ' attached. They upload when you post.');
  }

  function clearDraft() {
    draft.forEach(function (m) { if (m.kind === 'new' && m.url && !m.keepUrl) URL.revokeObjectURL(m.url); });
    draft = [];
  }

  function resetComposer() {
    clearDraft();
    editingIndex = -1;
    $('post-title').value = '';
    $('post-body').value = '';
    $('post-date').value = todayISO();
    renderDraftMedia();
    renderComposerHead();
  }

  function slugify(name) {
    var dot = name.lastIndexOf('.');
    var base = (dot > 0 ? name.slice(0, dot) : name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'file';
    var ext = (dot > 0 ? name.slice(dot + 1) : '').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin';
    return base + '.' + ext;
  }
  function fileToB64(file) {
    return new Promise(function (resolve, reject) {
      var fr = new FileReader();
      fr.onload = function () { resolve(String(fr.result).split(',')[1]); };
      fr.onerror = function () { reject(new Error('Could not read ' + file.name + '.')); };
      fr.readAsDataURL(file);
    });
  }

  // Uploads each new file to media/YYYY-MM/ and resolves to the finished media list.
  function uploadDraft() {
    var gh = github();
    var stamp = Date.now();
    var folder = 'media/' + todayISO().slice(0, 7);
    var todo = draft.filter(function (m) { return m.kind === 'new'; });
    var done = 0;

    return draft.reduce(function (chain, m, i) {
      return chain.then(function (out) {
        if (m.kind !== 'new') { out.push({ type: isVideoSrc(m) ? 'video' : 'image', src: m.src, alt: m.alt || '' }); return out; }
        var path = folder + '/' + stamp + '-' + i + '-' + slugify(m.name);
        setStatus('Uploading ' + (done + 1) + ' of ' + todo.length + '…');
        return fileToB64(m.file)
          .then(function (b64) { return gh.putBase64(path, b64, 'Add media ' + path); })
          .then(function () {
            done++;
            localUrls[path] = m.url;
            m.keepUrl = true;
            out.push({ type: m.mtype, src: path, alt: m.alt || '' });
            return out;
          });
      });
    }, Promise.resolve([]));
  }

  /* ---- events ---- */
  $('compose-tabs').addEventListener('click', function (e) {
    var pill = e.target.closest('.pill');
    if (!pill) return;
    var i = parseInt(pill.dataset.tab, 10);
    if (i === composeTab) return;
    if (editingIndex >= 0 && !confirm('Discard the post you are editing?')) return;
    composeTab = i;
    resetComposer();
    renderCompose();
    pushPreview(model.tabs[composeTab].id);
  });

  $('media-strip').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-mact]');
    if (!btn) return;
    var i = parseInt(btn.dataset.i, 10);
    if (btn.dataset.mact === 'del') {
      var gone = draft.splice(i, 1)[0];
      if (gone && gone.kind === 'new' && gone.url && !gone.keepUrl) URL.revokeObjectURL(gone.url);
    } else if (btn.dataset.mact === 'left' && i > 0) {
      draft.splice(i - 1, 0, draft.splice(i, 1)[0]);
    } else if (btn.dataset.mact === 'right' && i < draft.length - 1) {
      draft.splice(i + 1, 0, draft.splice(i, 1)[0]);
    }
    renderDraftMedia();
    renderComposerHead();
  });

  $('post-files').addEventListener('change', function (e) {
    addFiles(e.target.files);
    e.target.value = '';
  });

  var composer = $('composer');
  ['dragenter', 'dragover'].forEach(function (evt) {
    composer.addEventListener(evt, function (e) { e.preventDefault(); composer.classList.add('dragging'); });
  });
  ['dragleave', 'drop'].forEach(function (evt) {
    composer.addEventListener(evt, function (e) {
      if (evt === 'drop') { e.preventDefault(); addFiles(e.dataTransfer.files); }
      composer.classList.remove('dragging');
    });
  });
  $('post-body').addEventListener('paste', function (e) {
    var files = e.clipboardData && e.clipboardData.files;
    if (files && files.length) { e.preventDefault(); addFiles(files); }
  });
  $('post-title').addEventListener('input', renderComposerHead);
  $('post-body').addEventListener('input', renderComposerHead);

  $('post-cancel').addEventListener('click', function () {
    resetComposer();
    renderCompose();
    setStatus('Draft cleared.');
  });

  composer.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!token) { setStatus('Locked. Reload and unlock first.', 'error'); return; }
    var title = $('post-title').value.trim();
    var body = $('post-body').value.trim();
    if (!title && !body && !draft.length) { setStatus('Add a title, some text, or a file first.', 'error'); return; }

    var submit = $('post-submit');
    submit.disabled = true;
    $('post-cancel').disabled = true;
    setStatus(draft.some(function (m) { return m.kind === 'new'; }) ? 'Uploading…' : 'Publishing…');

    uploadDraft().then(function (media) {
      var post = { title: title, date: $('post-date').value || todayISO(), body: body, media: media };
      var block = postsBlock(composeTab, true);
      if (editingIndex >= 0) block.posts[editingIndex] = post;
      else block.posts.unshift(post);
      setStatus('Publishing…');
      return publishContent(editingIndex >= 0 ? 'Edit post' : 'Add post');
    }).then(function () {
      resetComposer();
      renderCompose();
      renderForm();
      pushPreview(model.tabs[composeTab].id);
      setStatus('Posted. The live site updates within about a minute; new files appear once it rebuilds.', 'ok');
    }).catch(function (err) {
      setStatus(err.message || String(err), 'error');
    }).then(function () {
      submit.disabled = false;
      $('post-cancel').disabled = false;
    });
  });

  $('compose-feed').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-pact]');
    if (!btn) return;
    var posts = postsOf(composeTab);
    var i = parseInt(btn.dataset.i, 10);
    var act = btn.dataset.pact;

    if (act === 'edit') {
      var post = posts[i];
      clearDraft();
      editingIndex = i;
      $('post-title').value = post.title || '';
      $('post-body').value = post.body || '';
      $('post-date').value = /^\d{4}-\d{2}-\d{2}$/.test(post.date || '') ? post.date : todayISO();
      draft = (post.media || []).filter(function (m) { return m && m.src; }).map(function (m) {
        return { id: nextDraftId++, kind: 'existing', src: m.src, mtype: m.type || 'image', alt: m.alt || '' };
      });
      renderDraftMedia();
      renderComposerHead();
      $('compose-pane').scrollTo({ top: 0, behavior: 'smooth' });
      $('post-body').focus();
      setStatus('Editing a post. Save changes to publish, or Cancel to leave it as it is.');
      return;
    }

    if (act === 'del') {
      if (!confirm('Delete "' + (posts[i].title || 'this post') + '"? The uploaded files stay in the repository.')) return;
      posts.splice(i, 1);
      if (editingIndex === i) resetComposer();
      else if (editingIndex > i) editingIndex--;
    } else if (act === 'up' && i > 0) {
      posts.splice(i - 1, 0, posts.splice(i, 1)[0]);
    } else if (act === 'down' && i < posts.length - 1) {
      posts.splice(i + 1, 0, posts.splice(i, 1)[0]);
    } else {
      return;
    }

    renderCompose();
    renderForm();
    pushPreview(model.tabs[composeTab].id);
    setStatus('Publishing…');
    publishContent(act === 'del' ? 'Delete post' : 'Reorder posts')
      .then(function () { setStatus('Published. The live site updates within about a minute.', 'ok'); })
      .catch(function (err) { setStatus(err.message, 'error'); markDirty(); });
  });

  /* ================= boot ================= */
  (function boot() {
    $('post-date').value = todayISO();
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
