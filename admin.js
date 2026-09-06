/* Admin editor: password gate, generated form, live preview, publish to GitHub. */
(function () {
  'use strict';
  var Core = window.AdminCore;
  var CONFIG = window.ADMIN_CONFIG || {};
  // One model per language. Korean starts from the English copy when content.ko.js is missing.
  function clone(o) { return JSON.parse(JSON.stringify(o || {})); }
  var models = { en: clone(window.SITE_CONTENT), ko: clone(window.SITE_CONTENT_KO || window.SITE_CONTENT) };
  var lang = 'en';
  var model = models.en;
  // Content written before the banner existed still gets the banner fields.
  function normalize(m) {
    if (m.profile && !m.profile.cover) m.profile.cover = { theme: 'mint', image: '' };
    return m;
  }
  Object.keys(models).forEach(function (k) { normalize(models[k]); });
  // What the live file held when each model was loaded, adopted or published.
  // Publish compares against it so a stale tab cannot silently overwrite a newer copy.
  function snapshot(m) { return JSON.stringify(m); }
  var baseline = { en: snapshot(models.en), ko: snapshot(models.ko) };
  var token = null;
  var dirty = false;
  var dirtyBy = { en: false, ko: false };
  // Languages whose file changed only because shared data was mirrored into it.
  var mediaDirty = { en: false, ko: false };
  function contentPathFor(l) {
    return l === 'ko' ? (CONFIG.contentPathKo || 'content.ko.js') : (CONFIG.contentPath || 'content.js');
  }
  function anyDirty() { return dirty || Object.keys(dirtyBy).some(function (k) { return k !== lang && dirtyBy[k]; }); }

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
    courses: { type: 'courses', title: 'Coursework', courses: [{ dept: 'Computer Science', code: 'CMPSC 465', course: 'Data Structures and Algorithms', description: 'What the course covered.' }] },
    skills:  { type: 'skills', title: 'Skills', rows: [{ label: 'Category', items: ['One', 'Two'], text: '' }] },
    stats:   { type: 'stats', title: 'At a glance', stats: [{ value: '1', label: 'Label' }] },
    cards:   { type: 'cards', title: 'New section', cards: [{ meta: 'Category', title: 'Card', text: 'Description', facts: [{ label: 'Fact', value: 'Value' }] }] },
    posts:   { type: 'posts', title: 'Updates', posts: [] },
    races:   { type: 'races', title: 'Racing', races: [] },
    blog:    { type: 'blog', title: 'Writing', posts: [] }
  };
  var KEY_TEMPLATES = {
    tabs:    { id: 'new', label: 'New tab', blocks: [] },
    entries: { heading: '', org: '', location: '', when: '', current: false, bullets: [] },
    rows:    { name: '', text: '', tag: '' },
    courses: { dept: '', code: '', course: '', description: '' },
    stats:   { value: '', label: '' },
    cards:   { meta: '', title: '', text: '', facts: [] },
    facts:   { label: '', value: '' },
    contact: { label: '', value: '', href: '', lines: [] },
    cover:   { theme: 'mint', image: '' },
    lines:   { value: '', href: '', icon: '' },
    posts:   { title: '', date: '', body: '', media: [] },
    media:   { type: 'image', src: '', alt: '' },
    races:   { name: '', date: '', distance: 'full', km: '', time: '', pace: '', location: '', note: '', map: '', media: [] }
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

  /* ================= races: shared vocabulary ================= */
  var RACE_OPTIONS = [
    ['full', 'Full marathon'], ['half', 'Half marathon'], ['10k', '10 km'], ['5k', '5 km'],
    ['ultra', 'Ultramarathon'], ['tri', 'Triathlon'], ['hyrox', 'Hyrox'], ['other', 'Other']
  ];
  // Accepts 2026-10-25, 2026.10.25, 2026/10/25 -> 'YYYY-MM-DD'; '' if unparseable.
  function isoDate(v) {
    var m = /^\s*(\d{4})[-./](\d{1,2})[-./](\d{1,2})/.exec(v || '');
    if (!m) return '';
    var mo = +m[2], d = +m[3];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return m[1] + '-' + ('0' + mo).slice(-2) + '-' + ('0' + d).slice(-2);
  }
  var RACE_KM = { full: '42.195', half: '21.0975', '10k': '10', '5k': '5' };
  var RACE_SHORT = { full: 'Full', half: 'Half', '10k': '10 km', '5k': '5 km', ultra: 'Ultra', tri: 'Tri', hyrox: 'Hyrox', other: 'Race' };
  var PRESET_KM = Object.keys(RACE_KM).map(function (k) { return RACE_KM[k]; });
  // Off-preset distances show the distance itself, not a generic "Race".
  function raceBadge(r) {
    if (RACE_SHORT[r.distance] && r.distance !== 'other') return RACE_SHORT[r.distance];
    return r.km ? r.km + ' km' : 'Race';
  }

  // "3:42:15" or "42:10" -> seconds. Anything else -> null.
  function durationSeconds(txt) {
    var m = /^\s*(?:(\d+):)?(\d{1,2}):(\d{1,2})\s*$/.exec(txt || '');
    if (!m) return null;
    return (m[1] ? +m[1] : 0) * 3600 + (+m[2]) * 60 + (+m[3]);
  }
  function paceFor(timeTxt, kmTxt) {
    var secs = durationSeconds(timeTxt), km = parseFloat(kmTxt);
    if (!secs || !(km > 0)) return '';
    var per = Math.round(secs / km);
    return Math.floor(per / 60) + ':' + ('0' + (per % 60)).slice(-2);
  }

  /* ================= entry dates ("May 2026 – Present") ================= */
  var MONTHS_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  // "May 2026", "2026년 5월", "2026-05", "2026" -> "YYYY-MM-DD"; '' when it is not a date.
  function monthISO(txt) {
    var t = String(txt || '').trim(), m, i;
    if ((m = /^(\d{4})[-./](\d{1,2})(?:[-./](\d{1,2}))?$/.exec(t)) || (m = /^(\d{4})년\s*(\d{1,2})월(?:\s*(\d{1,2})일)?$/.exec(t))) {
      return m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + (m[3] ? ('0' + m[3]).slice(-2) : '01');
    }
    if ((m = /^([A-Za-z]{3,9})\.?\s+(\d{4})$/.exec(t))) {
      for (i = 0; i < 12; i++) if (MONTHS_EN[i].toLowerCase() === m[1].slice(0, 3).toLowerCase()) return m[2] + '-' + ('0' + (i + 1)).slice(-2) + '-01';
    }
    if ((m = /^(\d{4})년?$/.exec(t))) return m[1] + '-01-01';
    return '';
  }
  // Splits on an en dash, em dash, tilde, "to", or a spaced hyphen; a bare hyphen
  // stays, so an ISO date is not cut in half.
  function parseWhen(v) {
    var parts = String(v || '').split(/\s+[–—-]\s+|\s*[–—~]\s*|\s+to\s+/i).map(function (s) { return s.trim(); });
    var toTxt = parts[1] || '';
    var present = /^(present|current|now|ongoing|현재|재직\s*중|재학\s*중)$/i.test(toTxt);
    return { from: monthISO(parts[0]), to: present ? '' : monthISO(toTxt), present: present };
  }
  function fmtMonth(iso) {
    var m = /^(\d{4})-(\d{2})/.exec(iso || '');
    if (!m) return '';
    return lang === 'ko' ? m[1] + '년 ' + (+m[2]) + '월' : MONTHS_EN[+m[2] - 1] + ' ' + m[1];
  }
  function whenText(from, to, present) {
    var a = fmtMonth(from), b = present ? (lang === 'ko' ? '현재' : 'Present') : fmtMonth(to);
    return a && b ? a + ' – ' + b : (a || b);
  }

  /* ================= form rendering ================= */
  var LABELS = {
    nameKo: 'Name (Korean)', footerNote: 'Footer note (right)', href: 'Link (URL, mailto:, tel:)',
    when: 'Dates', current: 'Currently active (shows a mint dot)', org: 'Organization', meta: 'Category label',
    tag: 'Small tag (language, license…)', items: 'Items as chips', text: 'Text', paragraphs: 'Paragraphs',
    bullets: 'Bullet points', photo: 'Photo path', brand: 'Header name', roles: 'Roles / titles',
    focus: 'Focus areas', id: 'Tab id (used in the URL)', label: 'Label',
    body: 'Body', media: 'Photos and videos', src: 'File path or URL', alt: 'Caption / alt text',
    date: 'Date (YYYY-MM-DD)', posts: 'Posts', author: 'Author (defaults to your name)',
    races: 'Races', km: 'Distance in km', time: 'Finish time', pace: 'Average pace per km',
    note: 'Notes', map: 'Route map (file path)', distance: 'Distance',
    lines: 'Boxes (each row has its own icon)', icon: 'Icon / logo',
    cover: 'Banner above the photo', theme: 'Banner colour', image: 'Banner wallpaper',
    accent: 'Accent colour (hex)', accent2: 'Second colour for a gradient (optional)',
    courses: 'Courses', dept: 'Department', code: 'Course code', course: 'Course name'
  };
  var LINES_HINT = { paragraphs: 'One paragraph per line.', bullets: 'One bullet per line. Use **text** for bold.', items: 'One per line.', roles: 'One per line.', focus: 'One per line.' };
  var MULTILINE = { text: 1, value: 1, body: 1, note: 1, description: 1 };
  // Lists whose items are objects, so an empty one is still edited as a list.
  var OBJECT_LISTS = { lines: 1, media: 1, facts: 1, races: 1, posts: 1 };
  // Nicer wording for the "+ Add" button where the plural is not a simple -s.
  var ADD_LABEL = { lines: 'box' };
  // Fields that hold an image path, with where an upload of one should land.
  var ASSET_FIELDS = {
    icon:  { dir: 'images/logos/', hint: 'PNG, JPEG, WebP or SVG. Saves under images/logos/ and shows next to the text.' },
    image: { dir: 'images/covers/', hint: 'Wide image works best, about 1200 by 400. Saves under images/covers/.' }
  };
  var COVER_THEMES = ['mint', 'midnight', 'sand', 'slate', 'plum', 'sunrise', 'ink'];

  function humanize(k) {
    if (LABELS[k]) return LABELS[k];
    return k.replace(/([A-Z])/g, ' $1').replace(/^./, function (c) { return c.toUpperCase(); });
  }
  function isStringArray(a) { return Array.isArray(a) && a.every(function (x) { return typeof x === 'string'; }); }
  // The key whose text names an item, so the header can be edited in place.
  function titleKey(item) {
    var keys = ['title', 'heading', 'label', 'name', 'course'];
    for (var k = 0; k < keys.length; k++) if (item && typeof item[keys[k]] === 'string') return keys[k];
    return null;
  }
  function itemTitle(item, i) {
    var keys = ['title', 'heading', 'label', 'name', 'course', 'value', 'id'];
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
    if (key === 'distance' && path[path.length - 3] === 'races') {
      return '<div class="field"><label for="f' + p + '">Distance</label>' +
        '<select id="f' + p + '" data-path="' + p + '" data-kind="str">' +
        RACE_OPTIONS.map(function (o) {
          return '<option value="' + o[0] + '"' + (o[0] === v ? ' selected' : '') + '>' + esc(o[1]) + '</option>';
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
    if (key === 'theme' && path[path.length - 2] === 'cover') {
      return '<div class="field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        '<select id="f' + p + '" data-path="' + p + '" data-kind="str">' +
        COVER_THEMES.map(function (o) {
          return '<option value="' + o + '"' + (o === v ? ' selected' : '') + '>' + o + '</option>';
        }).join('') + '</select>' +
        '<span class="hint">Used on its own, or as the colour behind a wallpaper.</span></div>';
    }
    if (ASSET_FIELDS[key] && typeof v === 'string') {
      var asset = ASSET_FIELDS[key];
      return '<div class="field">' +
        '<label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        '<div class="photo-row">' +
          '<div class="photo-thumb icon-thumb' + (key === 'image' ? ' cover-thumb' : '') + '" data-icon-thumb="' + p + '">' +
            (v ? '<img src="' + esc(v) + '" alt="" onerror="this.remove()">' : '') +
          '</div>' +
          '<div class="photo-controls">' +
            '<div class="photo-buttons">' +
              '<button type="button" class="btn secondary small" data-act="pick-icon" data-path="' + p + '">' +
                (key === 'icon' ? 'Upload logo\u2026' : 'Upload wallpaper\u2026') + '</button>' +
              (v ? '<button type="button" class="btn secondary small" data-act="clear-icon" data-path="' + p + '">Remove</button>' : '') +
            '</div>' +
            '<input type="file" class="icon-file" data-path="' + p + '" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden>' +
            '<input type="text" id="f' + p + '" data-path="' + p + '" data-kind="str" value="' + esc(v) + '">' +
            '<span class="hint">' + esc(asset.hint) + '</span>' +
          '</div>' +
        '</div></div>';
    }
    if (typeof v === 'boolean') {
      return '<div class="field check"><input type="checkbox" id="f' + p + '" data-path="' + p + '" data-kind="bool"' + (v ? ' checked' : '') + '>' +
             '<label for="f' + p + '">' + esc(humanize(key)) + '</label></div>';
    }
    // Entry dates come from two calendar pickers and a Present switch; the text
    // underneath is what the site shows and can still be edited by hand.
    if (key === 'when' && typeof v === 'string') {
      var span = parseWhen(v);
      return '<div class="field when-field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        '<div class="when-row">' +
          '<span class="when-part"><span class="when-l">From</span><input type="date" class="when-from" value="' + esc(span.from) + '" aria-label="Start date"></span>' +
          '<span class="when-arrow">\u2013</span>' +
          '<span class="when-part"><span class="when-l">To</span><input type="date" class="when-to" value="' + esc(span.to) + '"' + (span.present ? ' disabled' : '') + ' aria-label="End date"></span>' +
          '<label class="when-present"><input type="checkbox" class="when-now"' + (span.present ? ' checked' : '') + '> Present</label>' +
        '</div>' +
        '<input type="text" id="f' + p + '" data-path="' + p + '" data-kind="str" value="' + esc(v) + '" placeholder="' + (lang === 'ko' ? '2026년 5월 – 현재' : 'May 2026 – Present') + '">' +
        '<span class="hint">Pick from the calendars and the month and year are written for you. The text can also be edited by hand.</span>' +
        '</div>';
    }
    // Date fields open the browser's calendar. A value we cannot parse stays in a
    // text box so nothing is silently thrown away.
    if (key === 'date' && (v === '' || isoDate(v))) {
      return '<div class="field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        '<input type="date" id="f' + p + '" data-path="' + p + '" data-kind="str" data-picker="1" value="' + esc(isoDate(v)) + '"></div>';
    }
    // Anywhere a file path is stored, offer to upload the file instead of typing one.
    if ((key === 'src' && path[path.length - 3] === 'media') || (key === 'map' && path[path.length - 3] === 'races')) {
      var isMap = key === 'map';
      return '<div class="field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        '<div class="upload-row">' +
          '<div class="upload-thumb' + (v ? ' has' : '') + '">' +
            (v ? '<img src="' + esc(previewSrc(v)) + '" alt="" onerror="this.remove()">' : (isMap ? 'Map' : 'File')) +
          '</div>' +
          '<div class="upload-controls">' +
            '<input type="text" id="f' + p + '" data-path="' + p + '" data-kind="str" value="' + esc(v) + '" placeholder="media/…">' +
            '<div class="upload-buttons">' +
              '<button type="button" class="btn secondary small" data-act="upload-file" data-path="' + p + '"' +
                ' data-accept="' + (isMap ? 'image/*' : 'image/*,video/*') + '">Upload file…</button>' +
              (v ? '<button type="button" class="btn secondary small" data-act="clear-file" data-path="' + p + '">Clear</button>' : '') +
            '</div>' +
          '</div>' +
        '</div></div>';
    }
    if (typeof v === 'string') {
      var multi = MULTILINE[key] || v.length > 70 || v.indexOf('\n') !== -1;
      return '<div class="field"><label for="f' + p + '">' + esc(humanize(key)) + '</label>' +
        (multi
          ? '<textarea id="f' + p + '" data-path="' + p + '" data-kind="str" rows="' + Math.min(8, Math.max(2, Math.ceil(v.length / 60))) + '">' + esc(v) + '</textarea>'
          : '<input type="text" id="f' + p + '" data-path="' + p + '" data-kind="str" value="' + esc(v) + '">') +
        '</div>';
    }
    if (isStringArray(v) && !OBJECT_LISTS[key]) {
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
    return Object.keys(obj).filter(function (k) { return k.charAt(0) !== '_'; })
      .map(function (k) { return renderValue(obj[k], path.concat([k]), k, level); }).join('');
  }

  function renderList(list, path, key, level) {
    var p = encPath(path);
    var items = list.map(function (item, i) {
      var ip = path.concat([i]);
      var title = itemTitle(item, i);
      var tk = titleKey(item);
      var badge = item && item.type ? item.type : (key === 'tabs' ? (item.blocks || []).length + ' sections' : '');
      // The header name is a live field: type here or in the form below, both update.
      var head = tk
        ? '<input type="text" class="title title-edit" data-path="' + encPath(ip.concat([tk])) + '" data-kind="str" value="' + esc(item[tk]) + '"' +
          ' placeholder="' + esc(title) + '" aria-label="' + esc(humanize(tk)) + '" title="Click to rename">'
        : '<span class="title">' + esc(title) + '</span>';
      return '<details class="group item level-' + level + '"><summary>' + head +
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
      foot = '<button type="button" class="btn secondary small" data-act="add" data-path="' + p + '">+ Add ' + esc(ADD_LABEL[key] || humanize(key).replace(/s$/, '').toLowerCase()) + '</button>';
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
  // Deleting arms the button instead of opening a native confirm(): browsers that
  // suppress repeated dialogs would otherwise swallow the click silently.
  var armedBtn = null, armTimer = null;
  function disarmDelete() {
    clearTimeout(armTimer);
    if (armedBtn && armedBtn.isConnected) {
      armedBtn.textContent = '\u00D7';
      armedBtn.classList.remove('armed');
      armedBtn.removeAttribute('data-armed');
    }
    armedBtn = null;
  }

  // Writes a file path back into the model and refreshes just that row, so the
  // open/closed state of the rest of the form survives.
  function putFilePath(path, value) {
    setAt(path, value);
    var field = document.querySelector('[data-path="' + encPath(path) + '"]');
    if (field) field.value = value;
    var row = field && field.closest('.upload-row');
    if (row) {
      var thumb = row.querySelector('.upload-thumb');
      thumb.className = 'upload-thumb' + (value ? ' has' : '');
      thumb.innerHTML = value
        ? '<img src="' + esc(previewSrc(value)) + '" alt="" onerror="this.remove()">'
        : (path[path.length - 1] === 'map' ? 'Map' : 'File');
    }
    markDirty();
    schedulePreview(path);
  }

  // Pick a file, push it to the repo, drop the path in the field.
  function pickAndUpload(path, accept) {
    if (!token) { setStatus('Locked. Reload and unlock first.', 'error'); return; }
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = accept || 'image/*,video/*';
    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      if (!file) return;
      if (file.size > MAX_BYTES) { setStatus('That file is over 40 MB.', 'error'); return; }
      var dest = 'media/' + todayISO().slice(0, 7) + '/' + Date.now() + '-' + slugify(file.name);
      var url = URL.createObjectURL(file);
      setStatus('Uploading ' + file.name + '\u2026');
      fileToB64(file)
        .then(function (b64) { return github().putBase64(dest, b64, 'Add media ' + dest); })
        .then(function () {
          localUrls[dest] = url;
          putFilePath(path, dest);
          setStatus('Uploaded ' + file.name + '. Click Publish to put it on the live site.', 'ok');
        })
        .catch(function (err) { setStatus(err.message || String(err), 'error'); });
    });
    picker.click();
  }

  // Clicking anywhere in a date field opens the calendar, not just the tiny icon.
  document.addEventListener('click', function (e) {
    var d = e.target.closest && e.target.closest('input[type="date"]');
    if (!d || d.disabled || d.readOnly || !d.showPicker) return;
    try { d.showPicker(); } catch (err) { /* already open, or no user gesture */ }
  });

  $('form').addEventListener('input', function (e) {
    var t = e.target;
    if (!t.dataset || !t.dataset.path || !t.dataset.kind) return;
    var path = decPath(t.dataset.path);
    var v;
    if (t.dataset.kind === 'bool') v = t.checked;
    else if (t.dataset.kind === 'lines') v = t.value.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
    else v = t.value;
    if (path[path.length - 1] === 'date' && t.type !== 'date') v = isoDate(v) || v;
    setAt(path, v);
    // The same value can be shown twice (section header and its Title field).
    if (t.dataset.kind === 'str' && t.type !== 'date') {
      Array.prototype.forEach.call(document.querySelectorAll('[data-path="' + t.dataset.path + '"][data-kind="str"]'), function (o) {
        if (o !== t && o.value !== t.value) o.value = t.value;
      });
    }
    markDirty();
    schedulePreview(path);
  });

  // Typing in a header name must not fold or unfold its section.
  $('form').addEventListener('click', function (e) {
    if (e.target.classList && e.target.classList.contains('title-edit')) e.preventDefault();
  });
  $('form').addEventListener('keydown', function (e) {
    if (!e.target.classList || !e.target.classList.contains('title-edit')) return;
    if (e.key === 'Enter') { e.preventDefault(); e.target.blur(); }
    if (e.key === ' ') e.stopPropagation();
  });
  // Entry date pickers write the text field, the model and the preview; typing in
  // the text field moves the pickers.
  $('form').addEventListener('input', function (e) {
    var box = e.target.closest ? e.target.closest('.when-field') : null;
    if (!box) return;
    var from = box.querySelector('.when-from'), to = box.querySelector('.when-to'), now = box.querySelector('.when-now');
    var text = box.querySelector('input[data-path]');
    if (e.target === text) {
      var span = parseWhen(text.value);
      from.value = span.from; to.value = span.to; now.checked = span.present; to.disabled = span.present;
      return;   // the generic handler above has already stored the text
    }
    to.disabled = now.checked;
    text.value = whenText(from.value, to.value, now.checked);
    var path = decPath(text.dataset.path);
    setAt(path, text.value);
    // "Present" also switches on the entry's current marker.
    if (now.checked) {
      var cp = path.slice(0, -1).concat(['current']);
      if (typeof getAt(cp) === 'boolean') {
        setAt(cp, true);
        var cb = document.querySelector('input[data-path="' + encPath(cp) + '"]');
        if (cb) cb.checked = true;
      }
    }
    markDirty();
    schedulePreview(path);
  });
  // Chrome toggles a <summary> on the space key's release, so that is cancelled too.
  $('form').addEventListener('keyup', function (e) {
    if (e.key === ' ' && e.target.classList && e.target.classList.contains('title-edit')) { e.preventDefault(); e.stopPropagation(); }
  });

  $('form').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-act]');
    if (btn !== armedBtn) disarmDelete();
    if (!btn) return;
    e.preventDefault();
    if (btn.dataset.act === 'pick-photo') { var picker = $('photo-file'); if (picker) picker.click(); return; }
    if (btn.dataset.act === 'pick-icon') {
      var f = document.querySelector('input.icon-file[data-path="' + btn.dataset.path + '"]');
      if (f) f.click();
      return;
    }
    if (btn.dataset.act === 'clear-icon') { setIcon(decPath(btn.dataset.path), '', ''); return; }
    if (btn.dataset.act === 'upload-file') { pickAndUpload(decPath(btn.dataset.path), btn.dataset.accept); return; }
    if (btn.dataset.act === 'clear-file') { putFilePath(decPath(btn.dataset.path), ''); return; }
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
        if (btn.dataset.armed !== '1') {
          btn.dataset.armed = '1';
          btn.textContent = 'Delete?';
          btn.classList.add('armed');
          armedBtn = btn;
          armTimer = setTimeout(disarmDelete, 5000);
          setStatus('Click Delete? again to remove \u201C' + itemTitle(list[i], i) + '\u201D.');
          return;
        }
        disarmDelete();
        setStatus('');
        list.splice(i, 1);
        break;
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
    // localUrls lets the preview show a file that GitHub has not rebuilt yet.
    iframe.contentWindow.postMessage({ type: 'site-content', content: model, tab: tab || null, assets: localUrls, lang: lang }, '*');
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

  /* ================= contact icons: logo upload ================= */
  var LOGO_DIR = 'images/logos/';
  // Freshly uploaded files 404 until GitHub Pages rebuilds, so preview them from memory.
  var localUrls = {};

  // Writes the icon path into the model, the text field and the thumbnail.
  function setIcon(path, value, previewUrl) {
    setAt(path, value);
    var p = encPath(path);
    var field = document.querySelector('input[data-path="' + p + '"][data-kind="str"]');
    if (field) field.value = value;
    var thumb = document.querySelector('[data-icon-thumb="' + p + '"]');
    if (thumb) thumb.innerHTML = value ? '<img src="' + esc(previewUrl || value) + '" alt="" onerror="this.remove()">' : '';
    markDirty();
    schedulePreview(path);
  }

  function uploadIcon(path, file) {
    if (!token) { setStatus('Locked. Reload and unlock first.', 'error'); return; }
    var field = ASSET_FIELDS[path[path.length - 1]] || { dir: LOGO_DIR };
    var dest = field.dir + slugify(file.name);
    setStatus('Uploading logo\u2026');
    fileToB64(file)
      .then(function (b64) { return github().putBase64(dest, b64, 'Add image ' + dest); })
      .then(function () {
        var url = URL.createObjectURL(file);
        localUrls[dest] = url;
        setIcon(path, dest, url);
        setStatus('Uploaded to ' + dest + '. Publish to put it on the page.', 'ok');
      })
      .catch(function (err) { setStatus(err.message || 'Could not upload that logo.', 'error'); });
  }

  $('form').addEventListener('change', function (e) {
    if (e.target && e.target.classList && e.target.classList.contains('icon-file') && e.target.files && e.target.files[0]) {
      var f = e.target.files[0];
      e.target.value = '';
      if (!/^image\//.test(f.type)) { setStatus('Choose an image file (PNG, JPEG, WebP or SVG).', 'error'); return; }
      if (f.size > 6 * 1024 * 1024) { setStatus('That image is over 6 MB. Use a smaller one.', 'error'); return; }
      uploadIcon(decPath(e.target.dataset.path), f);
      return;
    }
    if (!e.target || e.target.id !== 'photo-file' || !e.target.files || !e.target.files[0]) return;
    var file = e.target.files[0];
    e.target.value = '';
    if (!/^image\//.test(file.type)) { setStatus('Choose an image file (JPEG, PNG or WebP).', 'error'); return; }
    cropThenUpload(URL.createObjectURL(file), true);
  });

  /* ================= data is shared by every language =================
     A photo, a date, a finish time, a link or a colour is the same whichever
     language you read the site in; only the words are translated. So everything
     that is not text mirrors across the language models and rides along on the
     next publish. A row added in one language appears in the other with the
     source text as a placeholder to translate; a row removed disappears from both. */
  var MEDIA_KEYS = { photo: 1, image: 1, icon: 1, map: 1, poster: 1, cover: 1 };
  // Scalars that carry no language: dates, numbers, flags, links, ids, colours.
  var SHARED_KEYS = {
    date: 1, time: 1, pace: 1, km: 1, distance: 1, current: 1, lead: 1,
    href: 1, url: 1, id: 1, _id: 1, slug: 1, type: 1, theme: 1, accent: 1, accent2: 1
  };
  function isObj(v) { return !!v && typeof v === 'object' && !Array.isArray(v); }

  // Rows (races, posts, entries, contact lines…) carry a language-independent _id so
  // the two files pair up exactly, whatever is inserted, removed or reordered. Rows
  // written before ids existed pair by position once, and take the same id on both sides.
  function newId() { return Math.random().toString(36).slice(2, 8); }
  function ensureRowIds(node, key) {
    if (Array.isArray(node)) {
      var rows = key !== 'tabs' && key !== 'blocks' && key !== 'media' && node.length && node.every(isObj);
      node.forEach(function (row) {
        if (rows && !row._id) row._id = newId();
        ensureRowIds(row);
      });
      return;
    }
    if (!isObj(node)) return;
    Object.keys(node).forEach(function (k) { ensureRowIds(node[k], k); });
  }

  function normalizeMedia(list) {
    return (Array.isArray(list) ? list : []).filter(function (m) { return m && m.src; })
      .map(function (m) { return { type: m.type || 'image', src: m.src, alt: m.alt || '' }; });
  }

  // Drops half-filled rows so both languages hold the same list.
  function compactMedia(node) {
    if (Array.isArray(node)) { node.forEach(compactMedia); return; }
    if (!node || typeof node !== 'object') return;
    Object.keys(node).forEach(function (k) {
      if (k === 'media' && Array.isArray(node[k])) node[k] = normalizeMedia(node[k]);
      else compactMedia(node[k]);
    });
  }

  function syncNode(src, dst) {
    var changed = false;
    if (Array.isArray(src) && Array.isArray(dst)) {
      // Rows of objects (races, posts, entries, contact lines) align by position and
      // the other language gains or loses rows to match. Lists of strings are text
      // (bullets, paragraphs, chips) and stay as written in each language.
      var rows = src.length ? src.every(isObj) : dst.every(isObj);
      if (!rows) return false;
      // Pass 1: pair by _id. Pass 2: a source row with no partner takes the next
      // destination row that has no id yet (rows written before ids existed) and
      // gives it the same id; otherwise it is a new row and is copied over. Any
      // destination row left unpaired was deleted at the source.
      var used = dst.map(function () { return false; }), byId = {};
      dst.forEach(function (row, j) { if (isObj(row) && row._id) byId[row._id] = j; });
      var pair = src.map(function (row) { return isObj(row) && row._id && byId[row._id] != null ? byId[row._id] : -1; });
      pair.forEach(function (j) { if (j >= 0) used[j] = true; });
      var cursor = 0, out = [];
      src.forEach(function (row, i) {
        var j = pair[i];
        if (j < 0) {
          while (cursor < dst.length && (used[cursor] || (isObj(dst[cursor]) && dst[cursor]._id))) cursor++;
          if (cursor < dst.length) { j = cursor; used[j] = true; }
        }
        if (j >= 0) { if (syncNode(row, dst[j])) changed = true; out.push(dst[j]); }
        else { out.push(clone(row)); changed = true; }
      });
      if (out.length !== dst.length || out.some(function (r, i) { return r !== dst[i]; })) {
        dst.length = 0; out.forEach(function (r) { dst.push(r); }); changed = true;
      }
      return changed;
    }
    if (!src || !dst || typeof src !== 'object' || typeof dst !== 'object') return false;
    Object.keys(src).forEach(function (k) {
      var sv = src[k], dv = dst[k];
      // Page structure is each language's own. Tabs pair up by id and sections by
      // kind (the 2nd "races" block here syncs with the 2nd "races" block there);
      // nothing is added or removed, so a section that exists in one language only
      // is left exactly as written.
      if ((k === 'tabs' || k === 'blocks') && Array.isArray(sv) && Array.isArray(dv)) {
        var seen = {};
        sv.forEach(function (row) {
          if (!isObj(row)) return;
          var key = k === 'tabs' ? 'id:' + row.id : 'type:' + row.type;
          var n = seen[key] = (seen[key] || 0) + 1, hit = 0;
          for (var j = 0; j < dv.length; j++) {
            var cand = dv[j];
            if (!isObj(cand)) continue;
            var ck = k === 'tabs' ? 'id:' + cand.id : 'type:' + cand.type;
            if (ck === key && ++hit === n) { if (syncNode(row, cand)) changed = true; break; }
          }
        });
        return;
      }
      if (k === 'media' && Array.isArray(sv)) {
        var keep = {};
        (Array.isArray(dv) ? dv : []).forEach(function (m) { if (m && m.src && m.alt) keep[m.src] = m.alt; });
        var next = normalizeMedia(sv).map(function (m) {
          return { type: m.type, src: m.src, alt: keep[m.src] || m.alt };
        });
        if (JSON.stringify(next) !== JSON.stringify(dv)) { dst[k] = next; changed = true; }
        return;
      }
      if ((MEDIA_KEYS[k] || SHARED_KEYS[k]) && (sv == null || typeof sv !== 'object')) {
        if (dv !== sv) { dst[k] = sv; changed = true; }
        return;
      }
      if (sv && typeof sv === 'object') {
        // A structure that exists in one language only (a new section, a theme) is
        // copied whole, text included, so there is something to translate.
        if (!dv || typeof dv !== 'object' || Array.isArray(dv) !== Array.isArray(sv)) { dst[k] = clone(sv); changed = true; return; }
        if (syncNode(sv, dv)) changed = true;
      }
    });
    return changed;
  }

  // Mirrors shared data out of the language being edited. Returns the languages it changed.
  function syncMediaToOthers(compactSource) {
    if (compactSource) compactMedia(model);
    ensureRowIds(model);
    var touched = [];
    Object.keys(models).forEach(function (l) {
      if (l === lang) return;
      if (syncNode(model, models[l])) {
        touched.push(l);
        dirtyBy[l] = true;
        mediaDirty[l] = true;
      }
    });
    return touched;
  }

  // Compose publishes in one step; Structure edits sit in the browser until Publish,
  // so the button has to say so.
  function setDirty(v) {
    dirty = v;
    dirtyBy[lang] = v;
    var btn = $('btn-publish');
    btn.classList.toggle('pending', v);
    btn.textContent = (v ? 'Publish changes' : 'Publish') + (lang === 'ko' ? ' (KO)' : '');
  }
  function markDirty() {
    if (!dirty) setDirty(true);
    syncMediaToOthers(false);
    if (!/^Click Delete/.test($('status').textContent)) {
      setStatus('Unpublished changes \u2014 click Publish to put them on the live site.');
    }
  }
  window.addEventListener('beforeunload', function (e) {
    if (anyDirty()) { e.preventDefault(); e.returnValue = ''; }
  });

  /* ================= publish / download / lock / password ================= */
  function github() { return Core.GitHub(token, CONFIG.repo, CONFIG.branch || 'main'); }

  var lastPublishedPath = contentPathFor('en');
  function publishContent(message) {
    if (!token) return Promise.reject(new Error('Locked. Reload and unlock first.'));
    syncMediaToOthers(true);
    var payload = Core.serializeContent(model, lang);
    var path = contentPathFor(lang);
    lastPublishedPath = path;
    var gh = github();
    // Languages that only picked up mirrored data go out with this publish, so
    // the two sites never disagree about dates, photos, links or colours.
    var extras = Object.keys(models).filter(function (l) { return l !== lang && mediaDirty[l]; });
    return gh.putFile(path, payload, (message || 'Update site content') + (lang === 'ko' ? ' (Korean)' : ''))
      .then(function () {
        return extras.reduce(function (chain, l) {
          return chain.then(function () {
            return gh.putFile(contentPathFor(l), Core.serializeContent(models[l], l), 'Sync shared data across languages')
              .then(function () { mediaDirty[l] = false; dirtyBy[l] = false; baseline[l] = snapshot(models[l]); });
          });
        }, Promise.resolve());
      })
      .then(function () { setDirty(false); baseline[lang] = snapshot(model); return payload; });
  }

  /* ---- keeping the editor in step with the live file ---- */

  // The live copy of one language's file, parsed; null when it cannot be read.
  function fetchLive(l) {
    return fetch(contentPathFor(l) + '?cb=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : ''; })
      .then(function (t) { var o = Core.parseContent(t); return o ? normalize(o) : null; })
      .catch(function () { return null; });
  }
  // 'same' when the live file is what this editor started from, 'changed' when
  // something else published since, 'unknown' when it could not be read.
  function compareLive(l, live) {
    if (!live) return 'unknown';
    return snapshot(live) === baseline[l] ? 'same' : 'changed';
  }
  // Replaces a language's model with the live copy and redraws if it is on screen.
  function adoptLive(l, live) {
    models[l] = live;
    baseline[l] = snapshot(live);
    dirtyBy[l] = false;
    mediaDirty[l] = false;
    if (l !== lang) return;
    model = models[l];
    setDirty(false);
    renderForm();
    renderCompose();
    pushPreview(model.tabs && model.tabs[composeTab] ? model.tabs[composeTab].id : null);
  }

  /* ---- waiting for GitHub Pages to serve the new file ---- */

  // Locally there is nothing to rebuild, so polling would only stall.
  function isLiveHost() {
    return /^https?:$/.test(location.protocol) &&
           !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
  }

  // Polls the published file until it matches what was just written.
  function waitForLive(expected, onTick) {
    var url = lastPublishedPath;
    var started = Date.now();
    var LIMIT = 150000;
    function check() {
      return fetch(url + '?cb=' + Date.now(), { cache: 'no-store' })
        .then(function (r) { return r.ok ? r.text() : ''; })
        .then(function (t) { return t.trim() === expected.trim(); })
        .catch(function () { return false; });
    }
    function loop() {
      return check().then(function (ok) {
        if (ok) return true;
        if (Date.now() - started > LIMIT) return false;
        if (onTick) onTick(Math.round((Date.now() - started) / 1000));
        return new Promise(function (go) { setTimeout(go, 2500); }).then(loop);
      });
    }
    return loop();
  }

  // Shared tail for every publish: report progress, then confirm it is really live.
  function confirmLive(payload, doneWord) {
    if (!isLiveHost()) {
      setStatus((doneWord || 'Published') + ' to GitHub. Reload the site file locally to see it.', 'ok');
      return Promise.resolve(false);
    }
    setStatus((doneWord || 'Published') + '. Waiting for the site to rebuild\u2026');
    return waitForLive(payload, function (secs) {
      setStatus((doneWord || 'Published') + '. Waiting for the site to rebuild\u2026 ' + secs + 's');
    }).then(function (live) {
      if (live) {
        setStatus((doneWord || 'Published') + ' and live now.', 'ok');
        refreshPreview();
      } else {
        setStatus((doneWord || 'Published') + '. GitHub is still rebuilding \u2014 use Refresh in a moment.', 'ok');
      }
      return live;
    });
  }

  // Reloads the preview frame from the network, then re-sends the current draft.
  function refreshPreview() {
    previewReady = false;
    iframe.src = 'index.html?preview=1&cb=' + Date.now();
  }

  $('btn-publish').addEventListener('click', function () {
    var btn = $('btn-publish');
    btn.disabled = true;
    setStatus('Checking the live site\u2026');
    fetchLive(lang)
      .then(function (live) {
        if (compareLive(lang, live) === 'changed' &&
            !confirm('The live site has changed since this editor loaded \u2014 probably published from another tab or device.\n\n' +
                     'Publish anyway and replace it with what is in this editor?\n' +
                     'Cancel keeps your draft; click Refresh to see the live version instead.')) {
          setStatus('Not published. The live site is newer than this editor \u2014 click Refresh to load it.', 'error');
          return null;
        }
        setStatus('Publishing\u2026');
        return publishContent('Update site content').then(function (payload) { return confirmLive(payload); });
      })
      .catch(function (err) { setStatus(err.message, 'error'); })
      .then(function () { btn.disabled = false; });
  });

  $('btn-refresh').addEventListener('click', function () {
    var btn = $('btn-refresh');
    btn.disabled = true;
    refreshPreview();
    setStatus('Reloading the preview and checking the live site\u2026');
    // Both languages are checked; the one on screen decides the message.
    Promise.all(['en', 'ko'].map(fetchLive)).then(function (lives) {
      var state = {};
      ['en', 'ko'].forEach(function (l, i) {
        state[l] = compareLive(l, lives[i]);
        // A live copy that differs replaces the model, unless a draft here would be lost.
        if (state[l] === 'changed' && !dirtyBy[l] && !mediaDirty[l] && !(l === lang && editingIndex >= 0)) {
          adoptLive(l, lives[i]);
          state[l] = 'adopted';
        }
      });
      var s = state[lang];
      if (s === 'adopted') setStatus('Preview reloaded. The editor now shows what is live \u2014 it had changed since this page opened.', 'ok');
      else if (s === 'same' && dirty) setStatus('Preview reloaded. You have unpublished changes; the live site is behind this editor.', 'ok');
      else if (s === 'same') setStatus('Preview reloaded. The live site matches this editor.', 'ok');
      else if (s === 'changed') setStatus('Preview reloaded. The live site changed since this page opened, but your draft was kept. Publish will ask before replacing it.', 'error');
      else setStatus('Preview reloaded. The live site could not be checked.', 'ok');
    }).then(function () { btn.disabled = false; });
  });

  $('btn-download').addEventListener('click', function () {
    var file = contentPathFor(lang);
    var blob = new Blob([Core.serializeContent(model, lang)], { type: 'text/javascript' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = file;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
    setStatus('Downloaded ' + file + '. Replace the file in your site folder to apply.', 'ok');
  });

  $('btn-lock').addEventListener('click', function () {
    if (anyDirty() && !confirm('You have unpublished changes. Lock anyway?')) return;
    setDirty(false);
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

  /* ================= language being edited ================= */
  // Each language is its own file with its own draft; switching swaps the whole model.
  function setEditLang(l) {
    if (l === lang || !models[l]) return;
    if (editingIndex >= 0 && !confirm('Discard the item you are editing?')) return;
    dirtyBy[lang] = dirty;
    lang = l;
    model = models[l];
    $('lang-en').setAttribute('aria-pressed', l === 'en' ? 'true' : 'false');
    $('lang-ko').setAttribute('aria-pressed', l === 'ko' ? 'true' : 'false');
    setDirty(!!dirtyBy[l]);
    resetComposer();
    renderForm();
    renderCompose();
    pushPreview(model.tabs && model.tabs[composeTab] ? model.tabs[composeTab].id : null);
    setStatus(l === 'ko'
      ? 'Editing the Korean site (content.ko.js). Publish writes only this language.'
      : 'Editing the English site (content.js). Publish writes only this language.');
  }
  $('lang-en').addEventListener('click', function () { setEditLang('en'); });
  $('lang-ko').addEventListener('click', function () { setEditLang('ko'); });

  /* ================= compose: social-style posts ================= */
  var composeTab = 0;
  var composeKind = 'post';   // 'post' writes an update, 'race' writes a race result
  var draft = [];             // { kind: 'new' | 'existing', mtype, src, alt, file, url, name }
  var mapDraft = null;        // the route map, same shape as a draft item
  var coverDraft = null;      // a blog post's cover image
  var paceTouched = false;
  var editingIndex = -1;      // index in the tab's list, -1 while writing something new
  var MAX_BYTES = 40 * 1024 * 1024;
  var nextDraftId = 1;
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

  // Each tab keeps at most one "posts" and one "races" section, created on first use.
  var BLOCK_FOR = {
    post: { type: 'posts', key: 'posts', title: 'Updates', titleKo: '\uC18C\uC2DD' },
    race: { type: 'races', key: 'races', title: 'Racing',  titleKo: '\uB808\uC774\uC2A4' },
    blog: { type: 'blog',  key: 'posts', title: 'Writing', titleKo: '\uAE00' }
  };
  function blockFor(tabIndex, kind, create) {
    var spec = BLOCK_FOR[kind];
    var tab = model.tabs[tabIndex];
    if (!tab) return null;
    tab.blocks = tab.blocks || [];
    for (var i = 0; i < tab.blocks.length; i++) {
      if (tab.blocks[i].type === spec.type) return tab.blocks[i];
    }
    if (!create) return null;
    var block = { type: spec.type, title: lang === 'ko' ? spec.titleKo : spec.title };
    block[spec.key] = [];
    tab.blocks.push(block);
    return block;
  }
  function itemsOf(tabIndex, kind) {
    var b = blockFor(tabIndex, kind, false);
    return (b && b[BLOCK_FOR[kind].key]) || [];
  }
  function postsOf(tabIndex) { return itemsOf(tabIndex, 'post'); }
  function currentItems() { return itemsOf(composeTab, composeKind); }

  function renderCompose() {
    renderComposeTabs();
    renderComposerHead();
    renderDraftMedia();
    renderMapPreview();
    renderCoverPreview();
    renderComposeFeed();
  }

  function setComposeKind(kind) {
    if (kind === composeKind) return;
    if (editingIndex >= 0 && !confirm('Discard the item you are editing?')) return;
    composeKind = kind;
    resetComposer();
    ['post', 'race', 'blog'].forEach(function (k) {
      $('kind-' + k).setAttribute('aria-pressed', kind === k ? 'true' : 'false');
    });
    $('post-fields').hidden = kind !== 'post';
    $('race-fields').hidden = kind !== 'race';
    $('blog-fields').hidden = kind !== 'blog';
    $('post-date').hidden = kind !== 'post';
    // A blog post carries its images inline, so the attach strip stays out of the way.
    $('pick-media').hidden = kind === 'blog';
    $('dropnote').hidden = kind === 'blog';
    renderCompose();
  }
  $('kind-post').addEventListener('click', function () { setComposeKind('post'); });
  $('kind-race').addEventListener('click', function () { setComposeKind('race'); });
  $('kind-blog').addEventListener('click', function () { setComposeKind('blog'); });

  function renderComposeTabs() {
    var host = $('compose-tabs');
    host.innerHTML = '<span class="pill-label">' + (composeKind === 'race' ? 'Add to' : composeKind === 'blog' ? 'Write in' : 'Post in') + '</span>' +
      (model.tabs || []).map(function (t, i) {
        return '<button type="button" class="pill" data-tab="' + i + '" aria-pressed="' + (i === composeTab) + '">' +
          esc(t.label || t.id) + '<span class="count">' + itemsOf(i, composeKind).length + '</span></button>';
      }).join('');
  }

  function renderComposerHead() {
    var pro = model.profile || {};
    $('composer-avatar').innerHTML = pro.photo
      ? '<img src="' + esc(pro.photo) + '" alt="" onerror="this.remove()">'
      : esc(initialsOf(pro.name));
    $('composer-author').textContent = pro.name || 'You';
    var tab = model.tabs[composeTab];
    var where = tab ? tab.label : '';
    var noun = composeKind === 'race' ? 'race result' : composeKind === 'blog' ? 'blog post' : 'post';
    $('composer-target').textContent = editingIndex >= 0
      ? 'Editing a ' + noun + ' in ' + where
      : (composeKind === 'race' ? 'Logging a race in '
        : composeKind === 'blog' ? 'Writing in ' : 'Posting to ') + where;
    $('composer-badge').hidden = editingIndex < 0;
    $('post-cancel').hidden = editingIndex < 0 && !composerHasContent();
    $('post-submit').textContent = editingIndex >= 0
      ? 'Save changes'
      : (composeKind === 'race' ? 'Log race' : composeKind === 'blog' ? 'Publish post' : 'Post');
  }

  function composerHasContent() {
    if (draft.length || mapDraft) return true;
    if (composeKind === 'race') return !!($('race-name').value.trim() || $('race-time').value.trim() || $('race-note').value.trim());
    if (composeKind === 'blog') return !!($('blog-title').value.trim() || $('blog-body').value.trim());
    return !!($('post-title').value.trim() || $('post-body').value.trim());
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
    $('dropnote').hidden = draft.length > 0 || composeKind === 'blog';
  }

  function renderMapPreview() {
    var box = $('map-preview');
    var src = mapDraft ? (mapDraft.kind === 'new' ? mapDraft.url : previewSrc(mapDraft.src)) : '';
    box.className = 'map-preview' + (src ? ' has' : '');
    box.innerHTML = src ? '<img src="' + esc(src) + '" alt="Route map">' : 'Route map';
    $('map-remove').hidden = !mapDraft;
  }

  // Pace fills itself in from finish time and distance until you type your own.
  function syncPace() {
    if (paceTouched) { $('pace-auto').hidden = true; return; }
    var auto = paceFor($('race-time').value, $('race-km').value);
    $('race-pace').value = auto;
    $('pace-auto').hidden = !auto;
  }
  $('race-distance').addEventListener('change', function () {
    var km = $('race-km').value.trim();
    if (!km || PRESET_KM.indexOf(km) !== -1) $('race-km').value = RACE_KM[this.value] || '';
    syncPace();
  });
  $('race-time').addEventListener('input', syncPace);
  $('race-km').addEventListener('input', syncPace);
  $('race-pace').addEventListener('input', function () {
    paceTouched = true;
    $('pace-auto').hidden = true;
  });
  ['race-name', 'race-note', 'race-time'].forEach(function (id) {
    $(id).addEventListener('input', renderComposerHead);
  });
  $('pick-media').addEventListener('click', function () { $('post-files').click(); });
  $('pick-map').addEventListener('click', function () { $('race-map-file').click(); });

  $('race-map-file').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { setStatus('The route map needs to be an image.', 'error'); return; }
    if (file.size > MAX_BYTES) { setStatus('That map is over 40 MB.', 'error'); return; }
    if (mapDraft && mapDraft.kind === 'new' && mapDraft.url && !mapDraft.keepUrl) URL.revokeObjectURL(mapDraft.url);
    mapDraft = { kind: 'new', file: file, url: URL.createObjectURL(file), mtype: 'image', name: file.name, alt: '' };
    renderMapPreview();
    renderComposerHead();
  });
  $('map-remove').addEventListener('click', function () {
    if (mapDraft && mapDraft.kind === 'new' && mapDraft.url && !mapDraft.keepUrl) URL.revokeObjectURL(mapDraft.url);
    mapDraft = null;
    renderMapPreview();
    renderComposerHead();
  });

  function renderCoverPreview() {
    var box = $('cover-preview');
    var src = coverDraft ? (coverDraft.kind === 'new' ? coverDraft.url : previewSrc(coverDraft.src)) : '';
    box.className = 'map-preview' + (src ? ' has' : '');
    box.innerHTML = src ? '<img src="' + esc(src) + '" alt="Cover">' : 'Cover';
    $('cover-remove').hidden = !coverDraft;
  }

  // Wraps or prefixes the selection in the body textarea.
  var MD_ACTIONS = {
    h2:     { line: '## ' },
    list:   { line: '- ' },
    num:    { line: '1. ' },
    quote:  { line: '> ' },
    bold:   { wrap: '**' },
    italic: { wrap: '*' },
    code:   { block: '```\n', close: '\n```' },
    rule:   { block: '\n---\n', close: '' }
  };
  function applyMd(kind) {
    var ta = $('blog-body');
    var spec = MD_ACTIONS[kind];
    if (!spec) return;
    var start = ta.selectionStart, end = ta.selectionEnd;
    var sel = ta.value.slice(start, end);
    // Block-level marks need to begin their own line.
    var atLineStart = start === 0 || ta.value.charAt(start - 1) === '\n';
    var lead = (spec.wrap || atLineStart) ? '' : '\n';
    var out;
    if (spec.wrap) {
      out = spec.wrap + (sel || 'text') + spec.wrap;
    } else if (spec.line) {
      out = lead + (sel || 'text').split('\n').map(function (l) { return spec.line + l; }).join('\n');
    } else {
      out = lead + spec.block + (sel || '') + spec.close;
    }
    ta.setRangeText(out, start, end, 'end');
    ta.focus();
    onBlogInput();
  }
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('.md-btn[data-md]');
    if (b) { e.preventDefault(); applyMd(b.dataset.md); }
  });

  function insertAtCursor(text) {
    var ta = $('blog-body');
    ta.setRangeText(text, ta.selectionStart, ta.selectionEnd, 'end');
    ta.focus();
    onBlogInput();
  }

  function onBlogInput() {
    var words = $('blog-body').value.trim().split(/\s+/).filter(Boolean).length;
    $('blog-count').textContent = words ? words + ' words · ' + Math.max(1, Math.round(words / 200)) + ' min read' : '';
    renderComposerHead();
    schedulePreview(['tabs', composeTab]);
  }
  $('blog-body').addEventListener('input', onBlogInput);
  $('blog-title').addEventListener('input', renderComposerHead);

  $('pick-cover').addEventListener('click', function () { $('blog-cover-file').click(); });
  $('blog-cover-file').addEventListener('change', function (e) {
    var file = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!/^image\//.test(file.type)) { setStatus('The cover needs to be an image.', 'error'); return; }
    if (file.size > MAX_BYTES) { setStatus('That cover is over 40 MB.', 'error'); return; }
    if (coverDraft && coverDraft.kind === 'new' && coverDraft.url && !coverDraft.keepUrl) URL.revokeObjectURL(coverDraft.url);
    coverDraft = { kind: 'new', file: file, url: URL.createObjectURL(file), mtype: 'image', name: file.name, alt: '' };
    renderCoverPreview();
    renderComposerHead();
  });
  $('cover-remove').addEventListener('click', function () {
    if (coverDraft && coverDraft.kind === 'new' && coverDraft.url && !coverDraft.keepUrl) URL.revokeObjectURL(coverDraft.url);
    coverDraft = null;
    renderCoverPreview();
    renderComposerHead();
  });

  // Images inside a post upload straight away and drop a Markdown tag at the cursor.
  $('insert-image').addEventListener('click', function () {
    if (!token) { setStatus('Locked. Reload and unlock first.', 'error'); return; }
    var picker = document.createElement('input');
    picker.type = 'file';
    picker.accept = 'image/*';
    picker.addEventListener('change', function () {
      var file = picker.files && picker.files[0];
      if (!file) return;
      if (file.size > MAX_BYTES) { setStatus('That image is over 40 MB.', 'error'); return; }
      var dest = 'media/' + todayISO().slice(0, 7) + '/' + Date.now() + '-' + slugify(file.name);
      var url = URL.createObjectURL(file);
      setStatus('Uploading ' + file.name + '\u2026');
      fileToB64(file)
        .then(function (b64) { return github().putBase64(dest, b64, 'Add media ' + dest); })
        .then(function () {
          localUrls[dest] = url;
          insertAtCursor('\n![](' + dest + ')\n');
          setStatus('Image added. Put a caption in the square brackets if you want one.', 'ok');
        })
        .catch(function (err) { setStatus(err.message || String(err), 'error'); });
    });
    picker.click();
  });

  function renderComposeFeed() {
    if (composeKind === 'race') return renderRaceFeed();
    if (composeKind === 'blog') return renderBlogFeed();
    return renderPostFeed();
  }

  function renderBlogFeed() {
    var list = itemsOf(composeTab, 'blog');
    $('feed-count').textContent = list.length
      ? list.length + (list.length === 1 ? ' post' : ' posts') + ' in this tab'
      : '';
    if (!list.length) {
      $('compose-feed').innerHTML = '<div class="empty-note">Nothing written in this tab yet.</div>';
      return;
    }
    var order = list.map(function (_, i) { return i; }).sort(function (a, b) {
      return (list[b].date || '') < (list[a].date || '') ? -1 : 1;
    });
    $('compose-feed').innerHTML = order.map(function (i) {
      var p = list[i];
      var words = String(p.body || '').trim().split(/\s+/).filter(Boolean).length;
      return '<article class="card apost">' +
        '<div class="apost-top">' +
          '<span class="apost-title">' + esc(p.title || '(untitled)') + '</span>' +
          '<span class="apost-when">' + esc(niceDate(p.date)) + '</span>' +
          '<span class="apost-tools">' +
            '<button type="button" class="btn secondary small" data-pact="edit" data-i="' + i + '">Edit</button>' +
            '<button type="button" class="btn danger small" data-pact="del" data-i="' + i + '">Delete</button>' +
          '</span>' +
        '</div>' +
        '<div class="arace-figs">' +
          '<span>' + words + ' words</span>' +
          '<span>' + Math.max(1, Math.round(words / 200)) + ' min read</span>' +
          (p.cover ? '<span>cover</span>' : '') +
          ((p.tags || []).length ? '<span>' + esc(p.tags.join(', ')) + '</span>' : '') +
        '</div></article>';
    }).join('');
  }

  function raceUpcoming(r) { return !!r.date && r.date > todayISO(); }

  function renderRaceFeed() {
    var list = itemsOf(composeTab, 'race');
    $('feed-count').textContent = list.length
      ? list.length + (list.length === 1 ? ' race' : ' races') + ' in this tab'
      : '';
    if (!list.length) {
      $('compose-feed').innerHTML = '<div class="empty-note">No races logged in this tab yet.</div>';
      return;
    }
    // Shown newest first, like the site, but each row keeps its real index.
    var order = list.map(function (_, i) { return i; }).sort(function (a, b) {
      return (list[b].date || '') < (list[a].date || '') ? -1 : 1;
    });
    $('compose-feed').innerHTML = order.map(function (i) {
      var r = list[i];
      var up = raceUpcoming(r);
      var figs = [];
      if (r.km) figs.push('<span><b>' + esc(r.km) + '</b> km</span>');
      if (r.time) figs.push('<span>' + esc(r.time) + '</span>');
      if (r.pace) figs.push('<span>' + esc(r.pace) + ' /km</span>');
      if (r.map) figs.push('<span>route map</span>');
      if ((r.media || []).length) figs.push('<span>' + r.media.length + ' photo' + (r.media.length === 1 ? '' : 's') + '</span>');
      return '<article class="card arace">' +
        '<div class="arace-top">' +
          '<span class="arace-badge' + (up ? ' upcoming' : '') + '">' + esc(raceBadge(r)) + '</span>' +
          '<div class="arace-id"><div class="arace-name">' + esc(r.name || '(unnamed race)') + '</div>' +
          '<div class="arace-sub">' + esc([niceDate(r.date), r.location].filter(Boolean).join(' · ') || 'No date') +
          (up ? ' · upcoming' : '') + '</div></div>' +
          '<span class="apost-tools">' +
            '<button type="button" class="btn secondary small" data-pact="edit" data-i="' + i + '">Edit</button>' +
            '<button type="button" class="btn danger small" data-pact="del" data-i="' + i + '">Delete</button>' +
          '</span>' +
        '</div>' +
        (figs.length ? '<div class="arace-figs">' + figs.join('') + '</div>' : '') +
        '</article>';
    }).join('');
  }

  function renderPostFeed() {
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
    if (mapDraft && mapDraft.kind === 'new' && mapDraft.url && !mapDraft.keepUrl) URL.revokeObjectURL(mapDraft.url);
    mapDraft = null;
    editingIndex = -1;
    paceTouched = false;
    $('post-title').value = '';
    $('post-body').value = '';
    $('post-date').value = todayISO();
    $('race-name').value = '';
    $('race-date').value = todayISO();
    $('race-location').value = '';
    $('race-distance').value = 'full';
    $('race-km').value = RACE_KM.full;
    $('race-time').value = '';
    $('race-pace').value = '';
    $('race-note').value = '';
    $('pace-auto').hidden = true;
    if (coverDraft && coverDraft.kind === 'new' && coverDraft.url && !coverDraft.keepUrl) URL.revokeObjectURL(coverDraft.url);
    coverDraft = null;
    $('blog-title').value = '';
    $('blog-date').value = todayISO();
    $('blog-tags').value = '';
    $('blog-body').value = '';
    $('blog-count').textContent = '';
    renderDraftMedia();
    renderMapPreview();
    renderCoverPreview();
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

  // Uploads every new file (route map first, then photos) to media/YYYY-MM/.
  // Resolves to { map, media } with repo paths in place of the local files.
  function uploadPending() {
    var gh = github();
    var stamp = Date.now();
    var folder = 'media/' + todayISO().slice(0, 7);
    var pending = (mapDraft && mapDraft.kind === 'new' ? 1 : 0) +
      (coverDraft && coverDraft.kind === 'new' ? 1 : 0) +
      draft.filter(function (m) { return m.kind === 'new'; }).length;
    var done = 0;
    var out = { map: '', cover: '', media: [] };

    function upload(m, tag) {
      var path = folder + '/' + stamp + '-' + tag + '-' + slugify(m.name);
      setStatus('Uploading ' + (done + 1) + ' of ' + pending + '…');
      return fileToB64(m.file)
        .then(function (b64) { return gh.putBase64(path, b64, 'Add media ' + path); })
        .then(function () {
          done++;
          localUrls[path] = m.url;
          m.keepUrl = true;
          return path;
        });
    }

    var chain = Promise.resolve();
    if (mapDraft) {
      chain = chain.then(function () {
        if (mapDraft.kind !== 'new') { out.map = mapDraft.src; return; }
        return upload(mapDraft, 'map').then(function (path) { out.map = path; });
      });
    }
    if (coverDraft) {
      chain = chain.then(function () {
        if (coverDraft.kind !== 'new') { out.cover = coverDraft.src; return; }
        return upload(coverDraft, 'cover').then(function (path) { out.cover = path; });
      });
    }
    draft.forEach(function (m, i) {
      chain = chain.then(function () {
        if (m.kind !== 'new') {
          out.media.push({ type: isVideoSrc(m) ? 'video' : 'image', src: m.src, alt: m.alt || '' });
          return;
        }
        return upload(m, i).then(function (path) {
          out.media.push({ type: m.mtype, src: path, alt: m.alt || '' });
        });
      });
    });
    return chain.then(function () { return out; });
  }

  /* ---- events ---- */
  $('compose-tabs').addEventListener('click', function (e) {
    var pill = e.target.closest('.pill');
    if (!pill) return;
    var i = parseInt(pill.dataset.tab, 10);
    if (i === composeTab) return;
    if (editingIndex >= 0 && !confirm('Discard the item you are editing?')) return;
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

    var race = composeKind === 'race';
    var blog = composeKind === 'blog';
    var title = $('post-title').value.trim();
    var body = $('post-body').value.trim();
    var raceName = $('race-name').value.trim();
    var blogTitle = $('blog-title').value.trim();

    if (race && !raceName) { setStatus('Give the race a name first.', 'error'); return; }
    if (blog && !blogTitle) { setStatus('Give the post a title first.', 'error'); return; }
    if (!race && !blog && !title && !body && !draft.length) { setStatus('Add a title, some text, or a file first.', 'error'); return; }

    var submit = $('post-submit');
    submit.disabled = true;
    $('post-cancel').disabled = true;
    var uploading = (mapDraft && mapDraft.kind === 'new') || (coverDraft && coverDraft.kind === 'new') ||
      draft.some(function (m) { return m.kind === 'new'; });
    setStatus(uploading ? 'Uploading…' : 'Publishing…');

    uploadPending().then(function (up) {
      var editing = editingIndex >= 0;
      var block, list, item;
      if (race) {
        item = {
          name: raceName,
          date: $('race-date').value || todayISO(),
          distance: $('race-distance').value,
          km: $('race-km').value.trim(),
          time: $('race-time').value.trim(),
          pace: $('race-pace').value.trim(),
          location: $('race-location').value.trim(),
          note: $('race-note').value.trim(),
          map: up.map,
          media: up.media
        };
      } else if (blog) {
        item = {
          title: blogTitle,
          date: $('blog-date').value || todayISO(),
          tags: $('blog-tags').value.split(',').map(function (t) { return t.trim(); }).filter(Boolean),
          cover: up.cover,
          body: $('blog-body').value.trim()
        };
      } else {
        item = { title: title, date: $('post-date').value || todayISO(), body: body, media: up.media };
      }
      block = blockFor(composeTab, composeKind, true);
      list = block[BLOCK_FOR[composeKind].key];
      if (editing) list[editingIndex] = item;
      else list.unshift(item);
      setStatus('Publishing…');
      return publishContent((editing ? 'Edit ' : 'Add ') + (race ? 'race' : blog ? 'blog post' : 'post'));
    }).then(function (payload) {
      resetComposer();
      renderCompose();
      renderForm();
      pushPreview(model.tabs[composeTab].id);
      return confirmLive(payload, race ? 'Race logged' : blog ? 'Post published' : 'Posted');
    }).catch(function (err) {
      setStatus(err.message || String(err), 'error');
    }).then(function () {
      submit.disabled = false;
      $('post-cancel').disabled = false;
    });
  });

  function mediaToDraft(media) {
    return (media || []).filter(function (m) { return m && m.src; }).map(function (m) {
      return { id: nextDraftId++, kind: 'existing', src: m.src, mtype: m.type || 'image', alt: m.alt || '' };
    });
  }

  $('compose-feed').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-pact]');
    if (!btn) return;
    var race = composeKind === 'race';
    var list = currentItems();
    var i = parseInt(btn.dataset.i, 10);
    var act = btn.dataset.pact;
    var item = list[i];

    if (act === 'edit') {
      resetComposer();
      editingIndex = i;
      draft = mediaToDraft(item.media);
      if (composeKind === 'blog') {
        $('blog-title').value = item.title || '';
        $('blog-date').value = /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') ? item.date : todayISO();
        $('blog-tags').value = (item.tags || []).join(', ');
        $('blog-body').value = item.body || '';
        coverDraft = item.cover ? { kind: 'existing', src: item.cover, mtype: 'image', alt: '' } : null;
        onBlogInput();
      } else if (race) {
        $('race-name').value = item.name || '';
        $('race-date').value = /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') ? item.date : todayISO();
        $('race-location').value = item.location || '';
        $('race-distance').value = RACE_KM.hasOwnProperty(item.distance) || RACE_SHORT[item.distance] ? item.distance : 'other';
        $('race-km').value = item.km || RACE_KM[item.distance] || '';
        $('race-time').value = item.time || '';
        $('race-pace').value = item.pace || '';
        $('race-note').value = item.note || '';
        paceTouched = !!item.pace && item.pace !== paceFor(item.time, item.km);
        mapDraft = item.map ? { kind: 'existing', src: item.map, mtype: 'image', alt: '' } : null;
      } else {
        $('post-title').value = item.title || '';
        $('post-body').value = item.body || '';
        $('post-date').value = /^\d{4}-\d{2}-\d{2}$/.test(item.date || '') ? item.date : todayISO();
      }
      renderDraftMedia();
      renderMapPreview();
      renderCoverPreview();
      renderComposerHead();
      $('compose-pane').scrollTo({ top: 0, behavior: 'smooth' });
      $(composeKind === 'blog' ? 'blog-body' : race ? 'race-name' : 'post-body').focus();
      setStatus('Editing. Save changes to publish, or Cancel to leave it as it is.');
      return;
    }

    if (act === 'del') {
      var name = (race ? item.name : item.title) || (race ? 'this race' : 'this post');
      if (!confirm('Delete "' + name + '"? The uploaded files stay in the repository.')) return;
      list.splice(i, 1);
      if (editingIndex === i) resetComposer();
      else if (editingIndex > i) editingIndex--;
    } else if (act === 'up' && i > 0) {
      list.splice(i - 1, 0, list.splice(i, 1)[0]);
    } else if (act === 'down' && i < list.length - 1) {
      list.splice(i + 1, 0, list.splice(i, 1)[0]);
    } else {
      return;
    }

    renderCompose();
    renderForm();
    pushPreview(model.tabs[composeTab].id);
    setStatus('Publishing…');
    publishContent(act === 'del' ? 'Delete entry' : 'Reorder entries')
      .then(function (payload) { return confirmLive(payload); })
      .catch(function (err) { setStatus(err.message, 'error'); markDirty(); });
  });

  /* ================= site colour theme =================
     Stored as site.theme = { accent, accent2? } on both language models, so
     whichever file is published next carries it. The site derives everything
     else (text-safe shade, tint, text-on-accent) from these two values. */
  var DEFAULT_THEME = { accent: '#57EBDE', accent2: '#AEFB2A' };
  var THEME_PRESETS = [
    ['Mint → Lime', '#57EBDE', '#AEFB2A'], ['Mint', '#50EACE', ''], ['Teal', '#0B7F69', ''],
    ['Ink', '#0B0C0E', ''], ['Coral', '#FF6B57', ''], ['Sky → Violet', '#5AC8FA', '#AF52DE'],
    ['Amber → Rose', '#FFB347', '#FF5E7E'], ['Slate', '#55606F', '']
  ];
  var colorProbe = document.createElement('span');
  colorProbe.hidden = true;
  document.body.appendChild(colorProbe);
  // Any CSS colour the browser understands -> '#RRGGBB'; null if it does not parse.
  function toHex(v) {
    v = String(v || '').trim();
    if (!v) return null;
    if (/^[0-9a-f]{6}$/i.test(v)) v = '#' + v;                       // forgive a missing '#'
    if (/^#[0-9a-f]{3}$/i.test(v)) v = '#' + v.slice(1).split('').map(function (c) { return c + c; }).join('');
    colorProbe.style.color = '';
    colorProbe.style.color = v;
    if (!colorProbe.style.color) return null;
    var m = /(\d+)[,\s]+(\d+)[,\s]+(\d+)/.exec(getComputedStyle(colorProbe).color);
    return m ? '#' + [m[1], m[2], m[3]].map(function (n) { return ('0' + (+n).toString(16)).slice(-2); }).join('').toUpperCase() : null;
  }
  function currentTheme() {
    var site = models.en.site || {};
    return site.theme && site.theme.accent ? site.theme : null;
  }
  function writeTheme(theme) {
    Object.keys(models).forEach(function (k) {
      var m = models[k];
      m.site = m.site || {};
      if (theme) m.site.theme = clone(theme); else delete m.site.theme;
      // Written to every language directly, so the sync step sees no difference;
      // flag the others so they publish alongside.
      if (k !== lang) { mediaDirty[k] = true; dirtyBy[k] = true; }
    });
    markDirty();
    schedulePreview(['site']);
  }

  var pop = $('theme-pop');
  function themeOpen() { return !pop.hidden; }
  function fillThemeUI(theme) {
    var t = theme || DEFAULT_THEME;
    $('theme-a').value = t.accent || '';
    $('theme-a-pick').value = toHex(t.accent) || '#57EBDE';
    var grad = !!t.accent2;
    $('theme-grad').checked = grad;
    $('theme-b-row').hidden = !grad;
    $('theme-b').value = t.accent2 || '';
    $('theme-b-pick').value = toHex(t.accent2) || '#AEFB2A';
    paintSwatch(t);
    $('theme-err').hidden = true;
  }
  function paintSwatch(t) {
    var a = toHex(t.accent), b = t.accent2 ? toHex(t.accent2) : null;
    $('theme-swatch').style.background = a ? (b ? 'linear-gradient(90deg, ' + a + ', ' + b + ')' : a) : 'var(--bg)';
  }
  // Read the fields, validate, and apply live. Bad input shows a message and leaves the site alone.
  function applyThemeFromUI() {
    var aRaw = $('theme-a').value, bRaw = $('theme-grad').checked ? $('theme-b').value : '';
    var a = toHex(aRaw), b = bRaw ? toHex(bRaw) : null;
    var err = $('theme-err');
    if (!a) { err.textContent = '“' + aRaw + '” is not a colour. Try a hex code like #57EBDE.'; err.hidden = !aRaw.trim(); return; }
    if (bRaw && !b) { err.textContent = '“' + bRaw + '” is not a colour. Try a hex code like #AEFB2A.'; err.hidden = false; return; }
    err.hidden = true;
    var theme = { accent: a };
    if (b) theme.accent2 = b;
    $('theme-a-pick').value = a;
    if (b) $('theme-b-pick').value = b;
    paintSwatch(theme);
    writeTheme(theme);
  }

  $('theme-presets').innerHTML = THEME_PRESETS.map(function (p, i) {
    var bg = p[2] ? 'linear-gradient(90deg, ' + p[1] + ', ' + p[2] + ')' : p[1];
    return '<button type="button" data-preset="' + i + '"><i style="background:' + bg + '"></i>' + esc(p[0]) + '</button>';
  }).join('');

  $('btn-theme').addEventListener('click', function () {
    var open = !themeOpen();
    pop.hidden = !open;
    $('btn-theme').setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open) { fillThemeUI(currentTheme()); $('theme-a').focus(); }
  });
  $('theme-close').addEventListener('click', function () { pop.hidden = true; $('btn-theme').setAttribute('aria-expanded', 'false'); $('btn-theme').focus(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && themeOpen()) { pop.hidden = true; $('btn-theme').setAttribute('aria-expanded', 'false'); } });
  $('theme-a').addEventListener('input', applyThemeFromUI);
  $('theme-b').addEventListener('input', applyThemeFromUI);
  $('theme-a-pick').addEventListener('input', function () { $('theme-a').value = this.value.toUpperCase(); applyThemeFromUI(); });
  $('theme-b-pick').addEventListener('input', function () { $('theme-b').value = this.value.toUpperCase(); applyThemeFromUI(); });
  $('theme-grad').addEventListener('change', function () {
    $('theme-b-row').hidden = !this.checked;
    if (this.checked && !$('theme-b').value) { $('theme-b').value = $('theme-b-pick').value.toUpperCase(); }
    applyThemeFromUI();
  });
  $('theme-presets').addEventListener('click', function (e) {
    var btn = e.target.closest('button[data-preset]');
    if (!btn) return;
    var p = THEME_PRESETS[+btn.dataset.preset];
    fillThemeUI({ accent: p[1], accent2: p[2] || undefined });
    applyThemeFromUI();
  });
  $('theme-reset').addEventListener('click', function () {
    writeTheme(null);            // the site falls back to its built-in theme
    fillThemeUI(null);
    setStatus('Theme reset to the site default. Click Publish to make it live.');
  });

  /* ================= boot ================= */
  (function boot() {
    $('post-date').value = todayISO();
    $('race-date').value = todayISO();
    $('race-km').value = RACE_KM.full;
    $('blog-date').value = todayISO();
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
