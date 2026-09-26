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
      return `<div class="springboard"><div class="sb-widget"><div class="small">${esc(date)}</div><div class="big">${F.hm(d)}</div><div class="small">Police iPhone (demo) · ${OD.db.offline ? 'Airplane mode' : 'Connected'}</div></div><div class="sb-grid"><div class="sb-app" data-app="od"><img src="assets/icon-onduty.svg" alt="">OnDuty</div><div class="sb-app" data-app="edu"><img src="assets/icon-edu.svg" alt="">OnDuty Edu</div><div class="sb-app" data-app="sam"><img src="assets/icon-sam.svg" alt="">SAM</div><div class="sb-app" data-app="cad"><img src="assets/icon-cad.svg" alt="">CAD</div></div><div class="sb-hint">OnDuty – browser recreation<br>Tap an app to open it. Tap the bar at the bottom of the screen to come back here.<br>Unofficial demo · fictional data</div><div class="sb-dock"><div class="sb-app" data-app="od"><img src="assets/icon-onduty.svg" alt=""></div><div class="sb-app" data-app="sam"><img src="assets/icon-sam.svg" alt=""></div><div class="sb-app" data-app="cad"><img src="assets/icon-cad.svg" alt=""></div></div></div>`;
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

  OD.onRoute = () => {
    if ((N.st.app === 'od' || N.st.app === 'sam' || N.st.app === 'cad') && !OD.db.session) OD.showAuth(); else OD.hideAuth();
  };

  /* ------------------------------------------------------------------ fit */
  const fit = () => {
    const dev = document.getElementById('device'); if (!dev) return;
    if (window.innerWidth <= 760 || (window.innerHeight <= 700 && window.innerWidth <= 900)) { dev.style.zoom = ''; return; }
    const availW = window.innerWidth - 40;
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
    OD.onRoute();
    window.addEventListener('resize', fit); fit();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
