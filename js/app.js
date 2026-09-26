/* =========================================================================
   OnDuty recreation – springboard, screen directory, demo controls, boot
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav;

  /* ------------------------------------------------------------ springboard */
  OD.screens._springboard = {
    full: () => {
      const d = new Date();
      const date = d.toLocaleDateString('en-NZ', { weekday: 'long', day: 'numeric', month: 'long' });
      return `<div class="springboard"><div class="sb-widget"><div class="small">${esc(date)}</div><div class="big">${F.hm(d)}</div><div class="small">Police iPhone (demo) · ${OD.db.offline ? 'Airplane mode' : 'Connected'}</div></div><div class="sb-grid"><div class="sb-app" data-app="od"><img src="assets/icon-onduty.svg" alt="">OnDuty</div><div class="sb-app" data-app="edu"><img src="assets/icon-edu.svg" alt="">OnDuty Edu</div><div class="sb-app" data-app="sam"><img src="assets/icon-sam.svg" alt="">SAM</div></div><div class="sb-hint">OnDuty – browser recreation<br>Tap an app to open it. Tap the bar at the bottom of the screen to come back here.<br>Unofficial demo · fictional data</div><div class="sb-dock"><div class="sb-app" data-app="od"><img src="assets/icon-onduty.svg" alt=""></div><div class="sb-app" data-app="sam"><img src="assets/icon-sam.svg" alt=""></div></div></div>`;
    },
  };
  OD.screens._missing = { title: 'Not found', body: (p, ctx) => U.empty(`Unknown screen “${esc(ctx.e.s)}”`) };

  /* ------------------------------------------------------------ demo state */
  OD.setOffline = (v) => {
    OD.db.offline = !!v;
    if (!v) {
      OD.processQueued && OD.processQueued();
      Object.values(OD.db.paperwork).filter((p) => p.status === 'Queued (Offline)').forEach((p) => { const T = OD.types[p.type]; p.status = T.approval ? 'Awaiting Approval' : T.submitStatus || 'Completed'; });
      Object.values(OD.db.tasks).forEach((t) => (t.pendingSync = false));
    }
    OD.save();
    const cb = document.getElementById('pc-offline'); if (cb) cb.checked = OD.db.offline;
    N.refreshAll(); N.renderStatus();
    if (N.st.app === 'sb') N.render('none');
    OD.ui.toast(v ? 'Offline – no coverage (queries will be queued)' : 'Back online');
  };
  OD.resetDemo = () => { OD.wipe(); OD.tmp = {}; OD.seed(); OD.saveNow(); location.hash = '#/'; location.reload(); };
  OD.loadSample = () => { OD.wipe(); OD.tmp = {}; OD.seed({ sample: true }); OD.saveNow(); location.hash = '#/'; location.reload(); };

  /* ------------------------------------------------------------ in-app login
     A cosmetic email/password gate in front of the OnDuty/SAM apps: accounts
     (admin or officer) are created here and stored only in this browser.
     This is NOT real authentication, a real Police credential, or an
     identity check against any real system – see README "Note on scope". */
  const authRoot = () => document.getElementById('auth-root');
  let authErr = '';
  const authForm = (mode, err) => {
    const badge = `<div class="au-badge"><img src="assets/icon-onduty.svg" alt="">Police iPhone (demo)</div>`;
    if (mode === 'setup') {
      return `<div class="authscreen">${badge}<div class="au-title">Create Admin Account</div><div class="au-sub">No accounts exist yet in this browser. Create the first account (it will be an Admin account) to continue.</div><form data-f="setup"><input name="name" placeholder="Full name" autocomplete="off" required><input name="email" type="email" placeholder="Email" autocomplete="username" required><input name="pass" type="password" placeholder="Password" autocomplete="new-password" required><input name="pass2" type="password" placeholder="Confirm password" autocomplete="new-password" required><div class="au-err">${esc(err)}</div><button type="submit" class="au-submit">Create Account</button></form><div class="au-hint">Fictional login for realism only. Accounts live in this browser's storage – this is not a real Police credential and isn't checked against any real system.</div></div>`;
    }
    return `<div class="authscreen">${badge}<div class="au-title">Log In</div><div class="au-sub">Sign in to OnDuty (demo).</div><form data-f="login"><input name="email" type="email" placeholder="Email" autocomplete="username" required><input name="pass" type="password" placeholder="Password" autocomplete="current-password" required><div class="au-err">${esc(err)}</div><button type="submit" class="au-submit">Log In</button></form><div class="au-hint">Fictional login for realism only. Accounts live in this browser's storage – this is not a real Police credential and isn't checked against any real system.</div></div>`;
  };
  const renderAuth = () => {
    const root = authRoot(); if (!root) return;
    const mode = OD.db.officers && OD.db.officers.length ? 'login' : 'setup';
    root.innerHTML = authForm(mode, authErr);
    const form = root.querySelector('form');
    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(form);
      const email = String(fd.get('email') || '').trim().toLowerCase();
      const pass = String(fd.get('pass') || '');
      if (mode === 'setup') {
        const name = String(fd.get('name') || '').trim();
        const pass2 = String(fd.get('pass2') || '');
        if (!name || !email || !pass) { authErr = 'All fields are required.'; return renderAuth(); }
        if (pass !== pass2) { authErr = 'Passwords do not match.'; return renderAuth(); }
        const qid = 'ADM' + String(1000 + Math.floor(Math.random() * 9000));
        const officer = { qid, name, email, phone: '', rank: 'Sergeant', station: '', role: 'Admin', passHash: OD.simpleHash(pass) };
        OD.db.officers.push(officer);
        OD.db.session = qid; OD.db.me = { qid, name };
        OD.saveNow(); authErr = ''; hideAuth(); N.render('none');
        OD.ui.toast(`Welcome, ${name}`);
      } else {
        const officer = OD.db.officers.find((o) => (o.email || '').toLowerCase() === email && o.passHash === OD.simpleHash(pass));
        if (!officer) { authErr = 'Incorrect email or password.'; return renderAuth(); }
        OD.db.session = officer.qid; OD.db.me = { qid: officer.qid, name: officer.name };
        OD.saveNow(); authErr = ''; hideAuth(); N.render('none');
        OD.ui.toast(`Welcome back, ${officer.name}`);
      }
    });
  };
  const hideAuth = () => { const root = authRoot(); if (root) root.innerHTML = ''; };
  OD.showAuth = () => { authErr = ''; renderAuth(); };
  OD.hideAuth = hideAuth;
  OD.logOut = () => { OD.db.session = null; OD.db.me = { qid: '', name: '' }; OD.saveNow(); N.homeScreen(); };

  /* -------------------------------------------------------------- directory */
  const H = (app, tab, stack, modals) => N.hashFor(app, tab, stack, modals);
  const od = (tab, stack, modals) => H('od', tab, [[tab], ...stack], modals);
  const pwLink = (id, extra = []) => H('od', 'paperwork', [['paperwork']], [[['pw', { id }], ...extra]]);
  const formLinks = (pwId, fid, t, depth) => {
    const f = OD.forms[fid]; if (!f || depth > 2) return [];
    const out = [];
    (f.fields || []).forEach((fl) => {
      if (fl.sub && OD.forms[fl.f]) {
        const label = typeof fl.l === 'function' ? OD.forms[fl.f].title : fl.l;
        const tt = `${t}.${fl.sub}`;
        out.push({ label: typeof label === 'function' ? fl.f : String(label).replace(/<[^>]*>/g, ''), depth, chain: [tt, fl.f] });
        formLinks(pwId, fl.f, tt, depth + 1).forEach((x) => out.push({ ...x, chain: [tt, fl.f, ...x.chain] }));
      }
    });
    return out;
  };
  const buildDirectory = () => {
    const G = [];
    G.push(['Launcher', [['Phone home screen', '#/'], ['OnDuty (Production)', od('home', [])], ['OnDuty Education', H('edu', 'home', [['home']])], ['SAM map', H('sam', '', [['sam']])]]]);
    G.push(['Home tab', [
      ['Home (last 24 hours)', od('home', [])], ['Filter options', od('home', [], [[['home-filter']]])],
      ['CARD event folder (5F)', od('home', [['folder', { id: 'f-card' }]])], ['CARD event details', od('home', [['folder', { id: 'f-card' }], ['card-detail', { no: 'P012345678' }]])],
      ['Folder with paperwork', od('home', [['folder', { id: 'f-mixed' }]])], ['Take Action (folder)', od('home', [['folder', { id: 'f-mixed' }]], [[['take-action', { folder: 'f-mixed' }]]])], ['Share folder with officers', od('home', [['folder', { id: 'f-mixed' }], ['share-folder', { folder: 'f-mixed' }]])],
      ['FH occurrence delve', od('home', [['folder', { id: 'f-card' }], ['delve', { q: 'q-delve-card' }]])],
    ]]);
    G.push(['Queries', [
      ['Query Person (QP)', od('home', [], [[['qp']]])], ['QP results (5 of 26)', od('home', [], [[['qp'], ['qres', { q: 'q-williams20' }]]])], ['Person summary', od('home', [['person', { id: 'P1' }]])], ['Alert detail', od('home', [['person', { id: 'P1' }], ['alert', { pid: 'P1', i: 0 }]])], ['Expired alerts', od('home', [['person', { id: 'P1' }], ['alerts-expired', { pid: 'P1' }]])], ['Active Bail list', od('home', [['person', { id: 'P1' }], ['bail-list', { pid: 'P1' }]])], ['Bail (Action Bail / 5K)', od('home', [['person', { id: 'P1' }], ['bail', { id: 'B1' }]])], ['Warrant to Arrest', od('home', [['person', { id: 'P1' }], ['wta', { id: 'W4' }]])], ['Names / aliases', od('home', [['person', { id: 'P1' }], ['person-list', { id: 'P1', kind: 'Names' }]])], ['Linked records', od('home', [['person', { id: 'P1' }], ['links', { t: 'person', id: 'P1', kind: 'Records' }]])], ['Photos (Police / NZTA)', od('home', [['person', { id: 'P1' }], ['photos', { id: 'P1' }]])],
      ['Query External Agency', od('home', [['person', { id: 'P1' }], ['ext-query', { pid: 'P1' }]])], ['INZ identity', od('home', [['person', { id: 'P1' }], ['ext-result', { pid: 'P1', svc: 'INZ' }]])], ['DIA Passport result', od('home', [['person', { id: 'P1' }], ['ext-result', { pid: 'P1', svc: 'DIA Passports' }]])],
      ['Query Vehicle (QV)', od('home', [], [[['qv']]])], ['QV results (3 of 3)', od('home', [], [[['qv'], ['qres', { q: 'q-abc123' }]]])], ['Vehicle summary', od('home', [['vehicle', { id: 'V1' }]])],
      ['Query Location (QL)', od('home', [], [[['ql']]])], ['Nearby locations map', od('home', [], [[['ql'], ['ql-map', { mode: 'query' }]]])], ['QL results (swipe to Delve)', od('home', [['folder', { id: 'f-card' }], ['qres', { q: 'q-ql-card' }]])], ['Location summary', od('home', [['location', { id: 'L1' }]])],
      ['Query Organisation (QO)', od('home', [], [[['qo']]])], ['Query Item (QI)', od('home', [], [[['qi']]])], ['Occurrence summary', od('home', [['occ', { id: 'O4' }]])],
    ]]);
    G.push(['Tasks tab', [['Tasks', od('tasks', [])], ['Task detail', od('tasks', [['task', { id: 'T1' }]])], ['Previous actions', od('tasks', [['task', { id: 'T1' }], ['task-actions', { id: 'T1' }]])], ['Delegates', od('tasks', [['task', { id: 'T1' }], ['task-delegates', { id: 'T1' }]])], ['Attachment', od('tasks', [['task', { id: 'T1' }], ['task-attach', { id: 'T1', i: 0 }]])], ['Update task', od('tasks', [['task', { id: 'T1' }], ['task-update', { id: 'T1' }]])]]]);
    const pwCommon = [['Paperwork list', od('paperwork', [])], ['Take Action (new paperwork)', od('paperwork', [], [[['take-action']]])], ['CARD Event', pwLink('demo-OR', [['card-event', { id: 'demo-OR' }]])], ['Select Location', pwLink('demo-OR', [['sel-loc', { id: 'demo-OR', k: 'loc' }]])], ['Select Persons', pwLink('demo-OR', [['sel-obj', { id: 'demo-OR', kind: 'person', k: 'persons' }]])], ['Select Vehicle', pwLink('demo-OR', [['sel-obj', { id: 'demo-OR', kind: 'vehicle', k: 'vehicles' }]])], ['Create New Link', pwLink('demo-OR', [['new-link', { id: 'demo-OR' }]])], ['Incident / Offence (NIA)', pwLink('demo-OR', [['nia-lib', { id: 'demo-OR' }]])], ['Offence Library (add to INF)', pwLink('demo-INF', [['lib', { mode: 'add', id: 'demo-INF' }]])], ['Review to Submit', pwLink('demo-OR', [['pw-review', { id: 'demo-OR' }]])], ['Returned paperwork', pwLink('demo-OR-ret')], ['Awaiting approval (FH)', pwLink('demo-FH-appr')]];
    G.push(['Paperwork – common', pwCommon]);
    const demo = { OR: 'demo-OR', INF: 'demo-INF', N: 'demo-N', FH: 'demo-FH', TCR: 'demo-TCR', EBA: 'demo-EBA', FDR: 'demo-FDR', AWHI: 'demo-AWHI', CVIR: 'demo-CVIR', HR: 'demo-HR', PF: 'demo-PF', s118: 'demo-s118', PoW: 'demo-PoW', PoE: 'demo-PoE', GCR: 'demo-GCR', WS: 'demo-WS', BC: 'demo-BC', UN: 'demo-UN', WTA: 'demo-WTA' };
    Object.entries(demo).forEach(([code, id]) => {
      const T = OD.types[code]; const items = [[`${T.name}`, pwLink(id)]];
      if (code === 'INF') items.push(['  Traffic Notes', pwLink(id, [['form', { t: `pw:${id}:d.traffic`, f: 'inf-traffic-notes' }]])], ['  Alcohol Notes', pwLink(id, [['form', { t: `pw:${id}:d.alcohol`, f: 'inf-alcohol-notes' }]])], ['  Offence (C101)', pwLink(id, [['form', { t: `pw:${id}:off#of_demo1`, f: 'inf-offence', rm: 1 }]])], ['  Resolution', pwLink(id, [['form', { t: `pw:${id}:off#of_demo1`, f: 'inf-offence', rm: 1 }], ['form', { t: `pw:${id}:off#of_demo1.r`, f: 'inf-res' }]])]);
      if (code === 'TCR') items.push(['  Location', pwLink(id, [['form', { t: `pw:${id}:loc.loc`, f: 'tcr-loc', rm: 1 }]])], ['  Crash location map', pwLink(id, [['crash-map', { id }]])], ['  Crash diagram', pwLink(id, [['crash-diagram', { id }]])]);
      const occ = T.sections.find((s) => s.t === 'occ'); if (occ) items.push([`  ${OD.forms['occ-' + code].title}`, pwLink(id, [['form', { t: `pw:${id}:occ`, f: 'occ-' + code }]])]);
      T.sections.filter((s) => s.t === 'sub').forEach((s) => {
        const t = `pw:${id}:d.${s.k}`;
        items.push([`  ${OD.forms[s.f].title && typeof OD.forms[s.f].title === 'string' ? OD.forms[s.f].title : s.h}`, pwLink(id, [['form', { t, f: s.f }]])]);
        formLinks(id, s.f, t, 1).forEach((x) => { const stack = []; for (let i = 0; i < x.chain.length; i += 2) stack.push(['form', { t: x.chain[i], f: x.chain[i + 1] }]); items.push([`${'  '.repeat(x.depth + 1)}${x.label}`, pwLink(id, [['form', { t, f: s.f }], ...stack])]); });
      });
      T.sections.filter((s) => s.t === 'list').forEach((s) => {
        const pw = OD.db.paperwork[id]; const e = (pw && pw.l[s.k] || [])[0];
        if (e) items.push([`  ${s.h.charAt(0) + s.h.slice(1).toLowerCase()} entry`, pwLink(id, [['form', { t: `pw:${id}:l.${s.k}#${e.id}`, f: typeof s.f === 'function' ? s.f(e) : s.f, rm: 1 }]])]);
      });
      if (code === 'AWHI') items.push(['  Select Service', pwLink(id, [['sel-service', { id, e: 'none' }]])], ['  Service filter', pwLink(id, [['sel-service', { id, e: 'none' }], ['svc-filter']])]);
      if (code === 'CVIR') items.push(['  CVIR defect library', H('od', 'more', [['more'], ['cvir-lib']])]);
      items.push(['  Review to Submit', pwLink(id, [['pw-review', { id }]])]);
      G.push([`Paperwork – ${code}`, items]);
    });
    G.push(['Assigned tab', [['Assigned Cases', od('assigned', [])], ['Case summary', od('assigned', [['occ', { id: 'O1' }]])], ['Update Narrative (Take Action)', od('assigned', [['occ', { id: 'O1' }]], [[['take-action', { src: 'occ:O1' }]]])]]]);
    G.push(['More tab', [['More', od('more', [])], ['Officers roster', od('more', [['officers']])], ['Register Officer', od('more', [['officers'], ['officer-edit']])], ['Edit Officer', od('more', [['officers'], ['officer-edit', { qid: 'TTT123' }]])], ['Settings', od('more', [['settings']])],['Vehicles and Equipment', od('more', [['settings']], [[['veh-equip']]])], ['Vehicle and Equipment (edit)', od('more', [['settings']], [[['veh-equip'], ['veh-equip-edit', { id: 'pv1' }]]])], ['Breath Test Device', od('more', [['settings']], [[['veh-equip'], ['veh-equip-edit', { id: 'pv1' }], ['form', { t: 'db:settings.vehicles#pv1.breath#bd1', f: 'breath-device', rm: 1 }]]])], ['Support', od('more', [['support']])], ['Audit Log', od('more', [['audit']])], ['LRT Offence Library', od('more', [['lib', { mode: 'browse' }]])], ['Offence category (Speeding)', od('more', [['lib', { mode: 'browse' }], ['lib-cat', { cat: 'Speeding' }]])], ['Impaired Driving (drug driving)', od('more', [['lib', { mode: 'browse' }], ['lib-cat', { cat: 'Impaired Driving' }]])], ['Offence details', od('more', [['lib', { mode: 'browse' }], ['lib-offence', { code: 'C101' }]])], ['CVIR Defect Library', od('more', [['cvir-lib']])], ['CVIR defect category', od('more', [['cvir-lib'], ['cvir-lib-cat', { cat: 'Brakes' }]])]]]);
    G.push(['SAM app', [['Map', H('sam', '', [['sam']])], ['Map type and layers', H('sam', '', [['sam', { sheet: 'layers' }]])], ['Bail details (drawer)', H('sam', '', [['sam'], ['sam', { sheet: 'bail:B3' }]])], ['Bail cluster', H('sam', '', [['sam', { sheet: 'cluster:B1,B2' }]])], ['Warrant to Arrest details', H('sam', '', [['sam'], ['sam', { sheet: 'wta:W4' }]])], ['Nearby list', H('sam', '', [['sam', { sheet: 'list:' }]])], ['Route to bailee', H('sam', '', [['sam', { route: 'bail:B3' }]])], ['OnDuty Bail Check (from SAM)', H('od', 'home', [['home']], [[['pw', { id: 'demo-BC', today: 1 }], ['form', { t: 'pw:demo-BC:d.cond', f: 'bc-cond' }]]])], ['OnDuty Update WTA (Action 2W)', H('od', 'home', [['home']], [[['pw', { id: 'demo-WTA', today: 1 }]]])]]]);
    return G;
  };
  const renderDirectory = () => {
    const nav = document.getElementById('directory'); if (!nav) return;
    const q = (document.getElementById('pc-filter').value || '').toLowerCase();
    const groups = buildDirectory();
    nav.innerHTML = groups.map(([g, items], gi) => {
      const f = items.filter(([l]) => !q || l.toLowerCase().includes(q) || g.toLowerCase().includes(q));
      if (!f.length) return '';
      return `<details ${q || gi < 3 ? 'open' : ''}><summary>${esc(g)} <small style="color:#6b7487;font-weight:400">${f.length}</small></summary>${f.map(([l, h]) => { const depth = (l.match(/^ */)[0].length) / 2; return `<a href="${esc(h)}" class="${depth ? 'sub' : ''}" style="${depth > 1 ? `padding-left:${12 + depth * 12}px` : ''}">${esc(l.trim())}</a>`; }).join('')}</details>`;
    }).join('');
  };
  OD.onRoute = () => {
    const r = document.getElementById('pc-route'); if (r) r.textContent = decodeURIComponent(location.hash || '#/');
    document.querySelectorAll('#directory a').forEach((a) => a.classList.toggle('cur', a.getAttribute('href') === location.hash));
    if ((N.st.app === 'od' || N.st.app === 'sam') && !OD.db.session) OD.showAuth(); else OD.hideAuth();
  };

  /* ------------------------------------------------------------------ fit */
  const fit = () => {
    const dev = document.getElementById('device'); if (!dev) return;
    if (window.innerWidth <= 760 || (window.innerHeight <= 700 && window.innerWidth <= 900)) { dev.style.zoom = ''; return; }
    const panel = document.getElementById('panel');
    const availW = window.innerWidth - (panel ? panel.offsetWidth : 0) - 40;
    dev.style.zoom = Math.min(1, (window.innerHeight - 30) / 868, availW / 414);
  };

  /* ================================================================= BOOT */
  const start = () => {
    OD.db = OD.loadDB();
    if (!OD.db || OD.db.v !== 1) { OD.seed(); OD.saveNow(); }
    // --- migrations for saves from before accounts/login existed ---
    if (OD.db.session === undefined) OD.db.session = null;
    if (!OD.db.me) OD.db.me = { qid: '', name: '' };
    if (!OD.db.officers) OD.db.officers = [];
    OD.db.officers.forEach((o) => {
      if (!o.role) o.role = 'Admin'; // grandfather pre-existing officers in as Admin
      if (!o.email) o.email = (o.qid || '').toLowerCase() + '@police.demo';
      if (!o.passHash) o.passHash = OD.simpleHash('changeme');
      delete o.me;
    });
    OD.saveNow();
    OD.boot();
    renderDirectory(); OD.onRoute();
    document.getElementById('pc-filter').addEventListener('input', renderDirectory);
    const cb = document.getElementById('pc-offline'); cb.checked = !!OD.db.offline; cb.addEventListener('change', () => OD.setOffline(cb.checked));
    document.getElementById('pc-home').addEventListener('click', () => N.homeScreen());
    document.getElementById('pc-sample').addEventListener('click', () => { if (confirm('Erase everything currently stored in this browser and load fictional sample data (accounts, persons, vehicles, cases) so you can explore every screen?')) OD.loadSample(); });
    document.getElementById('pc-reset').addEventListener('click', () => { if (confirm('Erase all accounts, paperwork and settings stored in this browser? This cannot be undone.')) OD.resetDemo(); });
    document.getElementById('directory').addEventListener('click', (e) => { if (e.target.closest('a') && window.innerWidth <= 760) document.getElementById('panel').classList.remove('open'); });
    document.getElementById('dir-fab').addEventListener('click', () => document.getElementById('panel').classList.toggle('open'));
    window.addEventListener('resize', fit); fit();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
