/* =========================================================================
   OnDuty recreation – Tasks, Assigned, More tabs (+ AWHI service picker)
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav, L = OD.lists;
  const screen = OD.screen, action = OD.action;
  const HOUR = 36e5;
  L.qoTypes = ['Company', 'Trust', 'Car dealer', 'Transport operator', 'School', 'Place of Worship', 'Gun Club / Range', 'Licensed premises'];
  L.qiCats = ['Firearm', 'Electronic Device', 'Bicycle', 'Jewellery', 'Tool', 'Other'];

  /* ================================================================= TASKS */
  const dueCls = (t) => { const ms = t.due - Date.now(); return t.status === 'Completed' ? 'green' : ms < 0 ? 'red' : ms < 48 * HOUR ? 'orange' : 'green'; };
  const dueText = (t) => { const ms = t.due - Date.now(); const h = Math.round(Math.abs(ms) / HOUR); return ms < 0 ? `Overdue by ${h < 24 ? h + ' hrs' : Math.round(h / 24) + ' days'}` : `Due in ${h < 24 ? h + ' hrs' : Math.round(h / 24) + ' days'}`; };
  screen('tasks', {
    title: 'Tasks',
    left: () => `<button class="nb" data-act="taskDistrict">${esc(OD.db.taskDistrict)}</button>`,
    cls: '',
    body: () => {
      const db = OD.db;
      if (Date.now() - db.tasksUpdated > 15 * 60000 && !db.offline) { db.tasksUpdated = Date.now(); OD.save(); }
      const tasks = Object.values(db.tasks).filter((t) => t.district === db.taskDistrict).sort((a, b) => a.due - b.due);
      return `<div class="ptr" data-ptr></div><div class="center-note">Last updated: ${esc(F.ago(db.tasksUpdated))}${db.offline ? ' · Offline – updates will sync to RIOD when back online' : ''}</div><div class="listhead">${esc(db.taskDistrict)}</div>` + (tasks.length ? tasks.map((t) => `<div class="task" data-go="${OD.go('task', { id: t.id })}"><span class="tb ${dueCls(t)}"></span><div class="tc"><div class="tt">${esc(t.title)}</div><div class="ts">${esc(t.type)} · File ${esc(t.file)}</div><div class="ts" style="color:${dueCls(t) === 'red' ? 'var(--ios-red)' : dueCls(t) === 'orange' ? '#c77700' : 'var(--green)'}">${esc(dueText(t))} · ${esc(F.stamp(t.due))}</div><div class="ts">${esc(t.status)}${t.pendingSync ? ' · <span style="color:var(--orange)">Pending sync</span>' : ''}</div></div><span class="chev">${I.chev}</span></div>`).join('') : U.empty('No tasks assigned or delegated to you in this district.')) + '<div class="footnote">Tasks are colour coded by due time: red – overdue, orange – due within 48 hours, green – 48+ hours. Tasks refresh every 15 minutes when open.</div>';
    },
    onRefresh: () => { OD.db.tasksUpdated = Date.now(); OD.save(); },
  });
  action('taskDistrict', () => OD.ui.sheet({ title: 'Select a District to view your tasks', items: L.districts.map((d) => ({ label: d, fn: () => { OD.db.taskDistrict = d; OD.save(); N.refresh(); } })) }));
  screen('task', {
    title: 'Task Detail', back: 'Tasks',
    body: (p) => {
      const t = OD.db.tasks[p.id]; if (!t) return U.empty('Task not found');
      return `<div class="sh">TASK</div><div class="para"><b>${esc(t.title)}</b></div>${U.kv('Task Type', t.type)}${U.kv('Priority', t.priority)}${U.kv('Status', t.status)}${U.kv('Due', `${F.stamp(t.due)} (${dueText(t)})`)}${U.kv('Assigned By', t.by)}${U.kv('Assigned To', t.to)}${U.kv('File Number', t.file)}<div class="sh">DETAILS</div><div class="para">${esc(t.detail || 'No further details.')}</div><div class="gap s"></div><div class="group"><div class="row" data-go="${OD.go('task-actions', { id: t.id })}">Previous Actions (${t.actions.length})<span class="chev">${I.chev}</span></div><div class="row" data-go="${OD.go('task-delegates', { id: t.id })}">Delegates (${t.delegates.length})<span class="chev">${I.chev}</span></div>${t.attachments.map((a, i) => `<div class="row" data-go="${OD.go('task-attach', { id: t.id, i })}"><span style="margin-right:6px;color:#8a8a8f">${I.paperclip}</span>${esc(a)}<span class="chev">${I.chev}</span></div>`).join('')}</div>`;
    },
    foot: (p) => `<div class="foot"><button class="linkbtn" data-go="${OD.go('task-update', { id: p.id })}">Update Task</button></div>`,
  });
  screen('task-actions', { title: 'Previous Actions', body: (p) => { const t = OD.db.tasks[p.id]; return t.actions.length ? t.actions.slice().reverse().map((a) => U.kv(`${a.by} · ${F.stamp(a.ts)} · ${a.status}`, a.text)).join('') : U.empty('No actions taken to date'); } });
  screen('task-delegates', { title: 'Delegates', body: (p) => { const t = OD.db.tasks[p.id]; return t.delegates.map((q) => U.kv(q, OD.officer(q)?.name || '')).join(''); } });
  screen('task-attach', {
    title: (p) => esc(OD.db.tasks[p.id].attachments[+p.i]), cls: 'grouped',
    body: (p) => { const t = OD.db.tasks[p.id]; const a = t.attachments[+p.i]; if (/map/i.test(a)) return `<div class="map" style="height:520px">${OD.mapSVG()}<div class="pin" style="left:48%;top:44%">${I.pinDrop}</div></div>`; if (/photo|jpg/i.test(a)) return `<div class="gallery" style="height:520px">${OD.avatar('attach' + p.id, 'Male')}</div>`; return `<div class="doc-page"><h3>${esc(a)}</h3><p><b>File:</b> ${esc(t.file)}<br><b>Task:</b> ${esc(t.title)}</p><p>${esc(t.detail)}</p><p style="color:#999">This is a placeholder attachment in the browser recreation. In OnDuty, attachments such as FLINTs, PDFs, photos and maps open in a viewer.</p></div>`; },
  });
  screen('task-update', {
    title: 'Update Task',
    target: (p) => OD.resolve('tmp:task' + p.id),
    body: (p) => { const t = OD.db.tasks[p.id]; const d = OD.resolve('tmp:task' + p.id); if (!d.status) d.status = t.status; return OD.renderFields([{ h: 'ACTION TAKEN' }, { a: 'text', l: 'Action taken', req: 1, tall: 1 }, { h: 'STATUS' }, { pk: 'status', l: 'Status', o: 'taskStatus' }], d, { ref: 'tmp:task' + p.id, fid: 'task-update', pw: null }) + '<button class="bigbtn" data-act="taskSave">Save</button>' + (OD.db.offline ? '<div class="footnote">You are offline – the update will not send to RIOD or be viewable to others until the connection is restored.</div>' : ''); },
  });
  action('taskSave', (d, el, ctx) => {
    const t = OD.db.tasks[ctx.p.id]; const x = OD.resolve('tmp:task' + ctx.p.id);
    if (!x.text) return OD.ui.toast('Enter the action taken');
    t.actions.push({ by: OD.db.me.qid, ts: Date.now(), text: x.text, status: x.status }); t.status = x.status; if (OD.db.offline) t.pendingSync = true;
    OD.tmp['task' + ctx.p.id] = {}; OD.save(); N.pop(); OD.ui.toast(OD.db.offline ? 'Saved – will sync to RIOD when online' : 'Task updated in RIOD');
  });

  /* ============================================================== ASSIGNED */
  screen('assigned', {
    title: 'Assigned Cases', cls: '',
    body: () => {
      const cases = Object.values(OD.db.occurrences).filter((o) => o.assigned).slice(0, 30);
      return '<div class="ptr" data-ptr></div>' + cases.map((o) => { const loc = OD.location(o.loc); return `<div class="row" data-go="${OD.go('occ', { id: o.id })}" style="align-items:flex-start;padding-left:14px">${o.unread ? '<span class="dot-unread"></span>' : ''}<div class="grow"><div class="kv-k" style="font-weight:600;font-size:15px">${esc(o.no)}</div><div class="kv-v" style="color:#333">${esc(o.code)} - ${esc(o.desc)}</div><div class="kv-v" style="color:#333">${esc(loc ? loc.addr.replace(/^\d+\s/, '') : '')}</div><div class="kv-v">Assigned: ${esc(o.assigned)}</div></div><span class="chev">${I.chev}</span></div>`; }).join('') + '<div class="footnote">The 30 most current NIA cases assigned to you. Open a case to view the occurrence and use Take Action › Update Narrative to update the narrative.</div>';
    },
  });

  /* ================================================================== MORE */
  screen('more', {
    title: 'More', cls: 'grouped',
    body: () => `<div class="gap"></div><div class="group"><div class="row lg" data-go="settings">Settings<span class="chev">${I.chev}</span></div>${OD.isAdmin() ? `<div class="row lg" data-go="officers">Officers<span class="right">${OD.db.officers.length}</span><span class="chev">${I.chev}</span></div>` : ''}<div class="row lg" data-go="support">Support<span class="chev">${I.chev}</span></div><div class="row lg" data-go="audit">Audit Log<span class="chev">${I.chev}</span></div></div><div class="gap"></div><div class="group"><div class="row lg" data-go="${OD.go('lib', { mode: 'browse' })}">LRT Offence Library<span class="chev">${I.chev}</span></div><div class="row lg" data-go="cvir-lib">CVIR Defect Library<span class="chev">${I.chev}</span></div></div>`,
  });

  /* ============================================================== OFFICERS
     An admin-only, local-only roster and login-account list (Register
     Officer / manage officers). This is demo account management, not real
     identity verification – it only ever feeds the pickers inside this
     browser (supervisor, call sign, "seized by" etc) and the in-app login.
     Nothing here is sent anywhere or checked against any real Police
     system. */
  screen('officers', {
    title: 'Officers',
    right: () => (OD.isAdmin() ? '<button class="nb" data-go="officer-edit">+ Register</button>' : ''),
    body: () => {
      if (!OD.isAdmin()) return U.empty('Admin access required.');
      const rows = OD.db.officers.map((o) => {
        const you = o.qid === OD.db.session;
        const inner = `<div class="row" data-go="${OD.go('officer-edit', { qid: o.qid })}"><div class="grow"><div class="kv-k">${esc(o.qid)}${you ? ' (you)' : ''}</div><div class="kv-v">${esc(o.name)} · ${esc(o.station || '')} · ${esc(o.role || 'Officer')}</div></div><span class="chev">${I.chev}</span></div>`;
        return you ? inner : OD.swipeRow(inner, { right: [{ label: 'Delete', act: 'officerDelete', a: o.qid }] });
      }).join('');
      return `<div class="footnote">A fictional, local-only roster and login-account list – it feeds the Supervisor, Authorising Officer, Call Sign and "Seized/Verified By" pickers elsewhere in the demo, and each officer can log in with their email and password. Swipe an officer left to remove them.</div><div class="sh">ROSTER (${OD.db.officers.length})</div><div class="group">${rows}</div><div class="row add" data-go="officer-edit">+ Register Officer</div>`;
    },
  });
  action('officerDelete', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const o = OD.officer(d.a); if (!o) return;
    if (o.qid === OD.db.session) return OD.ui.toast("You can't remove the account you're logged in as");
    if (o.role === 'Admin' && OD.db.officers.filter((x) => x.role === 'Admin').length <= 1) return OD.ui.toast('At least one Admin account is required');
    OD.ui.confirm('Remove officer', `Remove ${o.name} (${o.qid}) from the roster? This also deletes their login.`, 'Remove', () => {
      OD.db.officers = OD.db.officers.filter((x) => x.qid !== d.a);
      // clear any picker values that pointed at the removed officer
      const label = `${o.qid} - ${o.name}`;
      const s = OD.db.settings;
      if (s.supervisor === label) s.supervisor = '';
      if (s.authOfficer === label) s.authOfficer = '';
      OD.save(); N.refresh(ctx.u);
    }, true);
  });
  OD.forms['officer-edit'] = {
    fields: [
      { h: 'OFFICER DETAILS' },
      { t: 'qid', l: 'QID / Badge Number', req: 1, upper: 1, ph: 'e.g. ABCD01', w: (d) => !d._existing },
      { info: (d) => d.qid, l: 'QID / Badge Number', w: (d) => d._existing },
      { pk: 'rank', l: 'Rank', o: 'ranks' },
      { t: 'first', l: 'First Name', req: 1 },
      { t: 'last', l: 'Last Name', req: 1 },
      { pk: 'station', l: 'Station', o: 'stations' },
      { h: 'LOGIN' },
      { t: 'email', l: 'Email (used to log in)', req: 1, kb: 'email' },
      { seg: 'role', l: 'Role', o: ['Admin', 'Officer'] },
      { h: 'CONTACT (OPTIONAL)' },
      { t: 'phone', l: 'Phone Number', opt: 1, kb: 'tel' },
      { note: 'This is a fictional demo profile stored only in this browser. Email and password are used only to log in to this recreation locally – not a real Police credential and not checked against any real system.' },
    ],
  };
  screen('officer-edit', {
    title: (p) => (p.qid ? 'Edit Officer' : 'Register Officer'),
    right: (p) => (p.qid && p.qid !== OD.db.session ? '<button class="nb red" data-act="officerDeleteEdit">Delete</button>' : ''),
    target: (p) => OD.resolve('tmp:officer' + (p.qid || 'new')),
    body: (p) => {
      if (!OD.isAdmin()) return U.empty('Admin access required.');
      const key = 'officer' + (p.qid || 'new');
      const existing = p.qid && OD.officer(p.qid);
      const d = OD.resolve('tmp:' + key);
      if (existing && !d._loaded) { const [first, ...rest] = existing.name.replace(/^\S+\s+/, '').split(' '); Object.assign(d, { qid: existing.qid, rank: existing.rank, station: existing.station, email: existing.email || '', phone: existing.phone || '', role: existing.role || 'Officer', first: existing.first || first || '', last: existing.last || rest.join(' ') || '', _existing: true, _loaded: true }); }
      if (!existing && !d._loaded) { Object.assign(d, { rank: 'Constable', station: OD.db.settings.reporting || '', role: 'Officer', _loaded: true }); }
      const passBlock = `<div class="sh">${existing ? 'CHANGE PASSWORD (OPTIONAL)' : 'SET PASSWORD'}</div><div class="field"><span class="lbl">${existing ? 'New Password' : 'Password'}</span><input type="password" data-k="pass" value="${esc(d.pass || '')}" placeholder="${existing ? 'Leave blank to keep current' : 'Tap to add...'}" autocomplete="new-password"></div><div class="field"><span class="lbl">Confirm Password</span><input type="password" data-k="pass2" value="${esc(d.pass2 || '')}" placeholder="Tap to add..." autocomplete="new-password"></div>`;
      return OD.renderFields(OD.forms['officer-edit'].fields, d, { ref: 'tmp:' + key, fid: 'officer-edit', pw: null, reviewed: d._reviewed }) + passBlock + `<button class="bigbtn" data-act="officerSave" data-a="${esc(p.qid || '')}">${existing ? 'Save' : 'Register Officer'}</button>`;
    },
  });
  action('officerSave', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const p = ctx.p; const key = 'officer' + (p.qid || 'new');
    const x = OD.resolve('tmp:' + key);
    if (!x.qid || !x.first || !x.last || !x.email) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('QID, name and email are required'); }
    const email = String(x.email).trim().toLowerCase();
    const qid = String(x.qid).toUpperCase().replace(/[^A-Z0-9]/g, '');
    const dupEmail = OD.db.officers.find((o) => (o.email || '').toLowerCase() === email && o.qid !== p.qid);
    if (dupEmail) return OD.ui.toast('That email is already used by another officer');
    if (x.pass || x.pass2) { if (x.pass !== x.pass2) return OD.ui.toast('Passwords do not match'); }
    else if (!p.qid) return OD.ui.toast('Set a password');
    const name = `${x.rank} ${x.first.charAt(0).toUpperCase()}. ${x.last.charAt(0).toUpperCase()}${x.last.slice(1)}`;
    if (p.qid) {
      const o = OD.officer(p.qid);
      if (o.role === 'Admin' && x.role !== 'Admin' && OD.db.officers.filter((y) => y.role === 'Admin').length <= 1) return OD.ui.toast('At least one Admin account is required');
      Object.assign(o, { name, rank: x.rank, station: x.station, email, phone: x.phone, first: x.first, last: x.last, role: x.role || o.role });
      if (x.pass) o.passHash = OD.simpleHash(x.pass);
      if (o.qid === OD.db.session) OD.db.me = { qid: o.qid, name: o.name };
    } else {
      if (OD.officer(qid)) return OD.ui.toast('An officer with that QID already exists');
      OD.db.officers.push({ qid, name, rank: x.rank, station: x.station, email, phone: x.phone, first: x.first, last: x.last, role: x.role || 'Officer', passHash: OD.simpleHash(x.pass) });
    }
    OD.tmp[key] = {}; OD.save(); N.pop(); OD.ui.toast(p.qid ? 'Officer updated' : `${name} registered`);
  });
  action('officerDeleteEdit', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const o = OD.officer(ctx.p.qid); if (!o) return;
    if (o.qid === OD.db.session) return OD.ui.toast("You can't remove the account you're logged in as");
    if (o.role === 'Admin' && OD.db.officers.filter((x) => x.role === 'Admin').length <= 1) return OD.ui.toast('At least one Admin account is required');
    OD.ui.confirm('Remove officer', `Remove ${o.name} (${o.qid}) from the roster? This also deletes their login.`, 'Remove', () => {
      OD.db.officers = OD.db.officers.filter((x) => x.qid !== o.qid);
      const label = `${o.qid} - ${o.name}`; const s = OD.db.settings;
      if (s.supervisor === label) s.supervisor = ''; if (s.authOfficer === label) s.authOfficer = '';
      OD.save(); N.pop();
    }, true);
  });
  screen('settings', {
    title: 'Settings', target: () => OD.db.settings,
    body: () => {
      const s = OD.db.settings; const db = OD.db;
      const pk = (k, l, o, title) => `<div class="field pick" data-go="${OD.go('picker', { t: 'db:settings', k, o, title: title || l })}"><span class="lbl">${esc(l)}</span><div class="pv">${esc(s[k] || 'Select')}</div></div>`;
      const dv = s.vehicles.find((v) => v.id === s.defaultVehicle);
      const me = OD.officer(db.session);
      return `<div class="sh">ACCOUNT</div>${U.kv('QID', db.me.qid)}${U.kv('Name', db.me.name)}${U.kv('Role', (me && me.role) || '')}<div class="row danger" data-act="logOut">Log Out</div><div class="sh">LOCATION SEARCHES</div><div class="field"><span class="lbl">Default location query boundary</span>${U.seg('boundary', ['National', 'District', 'Station'], s.boundary)}</div>${pk('boundaryName', 'Boundary', 'l:boundaries')}<div class="sh">STATION SETTINGS</div>${pk('scene', 'Scene Station', 'l:stations')}${pk('reporting', 'Reporting Station', 'l:stations')}${pk('district', 'District', 'l:districts')}<div class="sh">VEHICLES AND EQUIPMENT</div><div class="row" data-present="veh-equip"><div class="grow"><div class="kv-k">Vehicles and Equipment</div><div class="kv-v">${esc(dv ? `${dv.rego} - ${dv.type}` : 'Not set')}</div></div><span class="chev">${I.chev}</span></div><div class="sh">SUPERVISOR</div>${pk('supervisor', 'Supervisor', 'x:supervisors')}${pk('authOfficer', 'Warrantless Search Authorising Officer', 'x:supervisors')}<div class="sh">UNIT</div>${pk('callSign', 'Call Sign', 'l:callSigns')}<div class="sh">DEMO CONTROLS</div><div class="row tap" data-act="toggleOffline"><div class="grow">Offline (simulate no coverage)</div><span class="switch ${db.offline ? 'on' : ''}"></span></div><div class="row" data-act="loadSample">Load sample data (for exploring every screen)</div><div class="row danger" data-act="resetDemo">Erase all data</div><div class="footnote">This is an unofficial browser recreation built from a publicly released OIA document. It is not NZ Police software and is not connected to any real Police system – nothing you enter is sent anywhere, it stays in this browser only.</div>`;
    },
  });
  action('toggleOffline', () => OD.setOffline(!OD.db.offline));
  action('logOut', () => OD.ui.confirm('Log Out', 'Log out of this OnDuty (demo) account?', 'Log Out', () => OD.logOut(), true));
  action('loadSample', () => OD.ui.confirm('Load sample data', 'This erases anything currently stored in this browser and loads fictional sample accounts, persons, vehicles and cases so you can explore every screen.', 'Load Sample Data', () => OD.loadSample(), true));
  action('resetDemo', () => OD.ui.confirm('Erase all data', 'This permanently erases all accounts, paperwork and settings stored in this browser. You will need to create a new admin account afterwards.', 'Erase All Data', () => OD.resetDemo(), true));

  screen('veh-equip', {
    title: 'Vehicles and Equipment',
    left: '<button class="nb" data-dismiss>Cancel</button>',
    right: '<button class="nb bold" data-dismiss>Done</button>',
    body: () => {
      const s = OD.db.settings; const dv = s.vehicles.find((v) => v.id === s.defaultVehicle);
      const eq = (v) => [...v.speed, ...v.breath.map((b) => b.device)].join(', ') || 'No Equipment Added';
      const row = (v) => OD.swipeRow(`<div class="row" data-go="${OD.go('veh-equip-edit', { id: v.id })}"><div class="grow"><div class="kv-k">${esc(v.rego)}${v.type ? ' - ' + esc(v.type) : ''}</div><div class="kv-v">${esc(eq(v))}</div></div><span class="chev">${I.chev}</span></div>`, { right: [{ label: 'Delete', act: 'pvDelete', a: v.id }] });
      return `<div class="sh">DEFAULT VEHICLE AND EQUIPMENT</div>${dv ? row(dv) : '<div class="row center" style="color:#999">No default vehicle</div>'}<div class="sh">VEHICLES AND EQUIPMENT</div>${s.vehicles.filter((v) => v !== dv).map(row).join('')}${s.vehicles.length < 5 ? '<div class="row add" data-act="pvAdd">+ Vehicle</div>' : ''}<div class="footnote">You can save up to 5 vehicles and their set of equipment. This allows you to easily select your assigned vehicle at the start of your shift.</div>`;
    },
  });
  action('pvAdd', () => { const v = { id: OD.uid('pv'), rego: '', type: 'Marked', speed: [], breath: [] }; OD.db.settings.vehicles.push(v); OD.save(); N.push('veh-equip-edit', { id: v.id }); });
  action('pvDelete', (d) => { const s = OD.db.settings; s.vehicles = s.vehicles.filter((v) => v.id !== d.a); if (s.defaultVehicle === d.a) s.defaultVehicle = s.vehicles[0]?.id; OD.save(); N.refresh(); });
  screen('veh-equip-edit', {
    title: 'Vehicle and Equipment',
    right: (p) => `<button class="nb red" data-act="pvDeleteEdit">Delete</button>`,
    target: (p) => OD.db.settings.vehicles.find((v) => v.id === p.id),
    body: (p) => {
      const v = OD.db.settings.vehicles.find((x) => x.id === p.id); if (!v) return U.empty('Vehicle deleted');
      return `<div class="sh">VEHICLE DETAILS</div><div class="field"><span class="lbl">Police Vehicle Registration</span><input data-k="rego" value="${esc(v.rego)}" placeholder="REGNO" style="text-transform:uppercase" autocomplete="off"></div><div class="field">${U.seg('type', ['Marked', 'Unmarked', 'Other'], v.type)}</div><div class="sh">SPEED DETECTION DEVICES</div>${v.speed.map((s, i) => `<div class="row"><div class="grow">${esc(s)}</div><button class="nb red" data-act="pvSpeedRm" data-a="${i}" style="font-size:13px">Remove</button></div>`).join('')}<div class="row add" data-act="pvSpeedAdd">+ Speed Detection Device</div><div class="sh">BREATH TEST DEVICES</div>${v.breath.map((b) => `<div class="row" data-go="${OD.go('form', { t: `db:settings.vehicles#${v.id}.breath#${b.id}`, f: 'breath-device', rm: 1 })}"><div class="grow"><div class="kv-k">${esc(b.device || 'Breath Test Device')}</div><div class="kv-v">Serial ${esc(b.serial || '—')} · Calibration due ${esc(b.cal ? F.dmy(b.cal) : '—')}</div></div><span class="chev">${I.chev}</span></div>`).join('')}<div class="row add" data-act="pvBreathAdd">+ Breath Test Device</div><button class="bigbtn ${OD.db.settings.defaultVehicle === v.id ? 'grey' : ''}" data-act="pvDefault">${OD.db.settings.defaultVehicle === v.id ? 'Default Vehicle' : 'Set as Default'}</button>`;
    },
    onChange: (k, v, ctx, tgt) => { if (k === 'rego') tgt.rego = String(v).toUpperCase(); },
  });
  const pvOf = (ctx) => OD.db.settings.vehicles.find((v) => v.id === ctx.p.id);
  action('pvDeleteEdit', (d, el, ctx) => OD.ui.confirm('Delete Vehicle', 'Remove this vehicle and its equipment from your settings?', 'Delete', () => { OD.actions.pvDelete({ a: ctx.p.id }); N.pop(); }, true));
  action('pvSpeedAdd', (d, el, ctx) => { const v = pvOf(ctx); OD.ui.sheet({ title: 'Speed Detection Device', items: L.speedDevices.filter((x) => !v.speed.includes(x)).map((x) => ({ label: x, fn: () => { v.speed.push(x); OD.save(); N.refresh(ctx.u); } })) }); });
  action('pvSpeedRm', (d, el, ctx) => { pvOf(ctx).speed.splice(+d.a, 1); OD.save(); N.refresh(ctx.u); });
  action('pvBreathAdd', (d, el, ctx) => { const v = pvOf(ctx); const b = { id: OD.uid('bd'), device: '' }; v.breath.push(b); OD.save(); N.push('form', { t: `db:settings.vehicles#${v.id}.breath#${b.id}`, f: 'breath-device', rm: 1 }); });
  action('pvDefault', (d, el, ctx) => { OD.db.settings.defaultVehicle = ctx.p.id; OD.save(); N.refresh(ctx.u); OD.ui.toast('Set as default vehicle'); });
  OD.forms['breath-device'] = { title: 'Breath Test Device', noun: 'breath test device', fields: [{ h: 'BREATH TEST DEVICE' }, { pk: 'device', l: 'Device', o: 'breathDevices' }, { t: 'serial', l: 'Serial Number', req: 1, cam: 'serial' }, { dt: 'cal', l: 'Calibration Due Date', time: false }, { note: 'The serial number and calibration due date are mandatory. Once set, the device is available for selection in the EBA Procedure Sheet.' }] };

  screen('support', {
    title: 'Support',
    body: () => {
      const edu = N.st.edu; const now = Date.now();
      const refs = ['ICODETABLEDETAIL', 'ALERTPRIORITY', 'LINKCODE1', 'TRANSLATION', 'LRT', 'CVIRDEFECT', 'AWHISERVICE', 'NEARBYLOCATIONS'];
      return `<div class="btnbar" style="margin-top:10px"><button class="outline" style="background:#fff;color:var(--tint);border:1px solid var(--tint)" data-act="supRefresh">Refresh</button><button style="background:#fff;color:var(--ios-red);border:1px solid var(--ios-red)" data-act="supWipe">Wipe &amp; Reload</button></div><div class="sh">ENVIRONMENT INFORMATION</div>${U.kv('Environment', edu ? 'Education' : 'Production')}${U.kv('CAD Library Version', '12.0')}${U.kv('App Version', '2.30.7 (browser recreation)')}${U.kv('Device', navigator.platform || 'Browser')}<div class="sh">NOTICE NUMBERS</div>${U.kv('Remaining CN Notice Numbers', '4')}${U.kv('Remaining Warning Notice Numbers', '49')}${U.kv('Remaining CVIR Numbers', '0')}${U.kv('Remaining Alcohol Notice Numbers', '4')}${U.kv('Remaining Overloading Notice Numbers', '4')}<div class="sh">REFERENCE DATA LOADED</div><table class="reftable">${refs.map((r, i) => `<tr><td>${r}</td><td>${esc(F.stamp(OD.db.created + i * 1000))}</td></tr>`).join('')}</table><div class="footnote">If updated offence codes do not appear, tap ‘Wipe &amp; Reload’ to reload reference data. Technical help: Service Desk.</div>`;
    },
  });
  action('supRefresh', () => OD.ui.toast('Reference data is up to date'));
  action('supWipe', () => OD.ui.confirm('Wipe & Reload', 'Wipe and reload reference data? Your paperwork will not be affected.', 'Wipe & Reload', () => { OD.ui.toast('Reloading reference data…'); setTimeout(() => { OD.db.created = Date.now(); OD.save(); N.refresh(); OD.ui.toast('Reference data reloaded'); }, 1200); }, true));
  screen('audit', {
    title: 'Audit Log',
    body: () => OD.db.audit.length ? OD.db.audit.slice(0, 100).map((a) => `<div class="row"><div class="grow"><div class="kv-k" style="font-size:14px"><b>${esc(a.type)}</b> ${esc(a.label)}</div><div class="kv-v" style="font-size:12px">${esc(F.stamp(a.ts))}${a.reason ? ' · Reason ' + esc(a.reason) : ''}${a.status === 'queued' ? ' · Queued (offline)' : ''}</div></div></div>`).join('') : U.empty('No queries have been run yet'),
  });

  /* ---------------------------------------------------- CVIR defect library */
  screen('cvir-lib', {
    title: 'CVIR Defect Library',
    body: (p, ctx) => U.search('Search defects', 'q', ctx.e.q || '') + `<div class="plist">${OD.screens['cvir-lib'].list(p, ctx)}</div>`,
    list: (p, ctx) => {
      const q = (ctx.e.q || '').toLowerCase(); const cats = OD.data.cvirCats;
      if (q) { const hits = Object.entries(cats).flatMap(([c, ds]) => ds.filter((d) => d.toLowerCase().includes(q)).map((d) => [c, d])); return '<div class="group">' + hits.map(([c, d]) => `<div class="row" data-act="cvirPick" data-a="${esc(c)}|${esc(d)}" style="font-size:13.5px"><div class="grow">${esc(d)}<div class="kv-v" style="font-size:12px">${esc(c)}</div></div></div>`).join('') + '</div>'; }
      return '<div class="sh">BROWSE CATEGORY</div><div class="group">' + Object.keys(cats).map((c) => `<div class="row" data-go="${OD.go('cvir-lib-cat', { cat: c, id: p.id || '', e: p.e || '' })}">${esc(c)}<span class="right">${cats[c].length}</span><span class="chev">${I.chev}</span></div>`).join('') + '</div>';
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; ctx.el.querySelector('.plist').innerHTML = OD.screens['cvir-lib'].list(ctx.p, ctx); },
  });
  screen('cvir-lib-cat', {
    title: (p) => esc(p.cat),
    body: (p) => '<div class="group">' + OD.data.cvirCats[p.cat].map((d) => `<div class="row" data-act="cvirPick" data-a="${esc(p.cat)}|${esc(d)}" style="font-size:13.5px"><div class="grow">${esc(d)}</div>${p.id ? '' : `<span class="chev">${I.chev}</span>`}</div>`).join('') + '</div>',
  });
  action('cvirPick', (d, el, ctx) => {
    const [cat, defect] = d.a.split('|');
    const layer = N.layers()[N.layers().length - 1];
    const lib = layer.find((e) => e.s === 'cvir-lib');
    const pwId = lib && lib.p.id, eid = lib && lib.p.e;
    if (!pwId) return OD.ui.alert({ title: defect, msg: `Category: ${cat}\n\nUse this defect code when recording a Commercial Vehicle Inspection Report.` });
    const pw = OD.db.paperwork[pwId]; const e = (pw.l.defects || []).find((x) => x.id === eid); if (!e) return;
    e.defect = defect; e.cat = cat; OD.save();
    while (layer.length > 1 && layer[layer.length - 1].s !== 'pw') layer.pop();
    layer.push(N.entry('form', { t: `pw:${pwId}:l.defects#${eid}`, f: 'cvir-defect', rm: 1 }));
    N.commit('pop');
  });

  /* ---------------------------------------------------- AWHI service picker */
  const awhiF = () => (OD.db.awhiFilter = OD.db.awhiFilter || { area: 'Wellington - Wellington Area', type: 'Show All' });
  screen('sel-service', {
    title: 'Select Service',
    left: '<button class="nb" data-act="svcCancel">Cancel</button>',
    right: `<button class="nb icon" data-go="svc-filter">${I.filter}</button>`,
    extra: () => { const f = awhiF(); return `<div style="font-size:11px;color:#8a8a8f;text-align:center">Displaying: ${esc(f.area)}, ${esc(f.type)}</div>`; },
    body: (p, ctx) => U.search('Search service providers', 'q', ctx.e.q || '') + `<div class="plist">${OD.screens['sel-service'].list(p, ctx)}</div>`,
    list: (p, ctx) => {
      const f = awhiF(); const q = (ctx.e.q || '').toLowerCase();
      const list = OD.data.services.filter((s) => (f.type === 'Show All' || s.type === f.type) && (!q || s.name.toLowerCase().includes(q)) && (s.area === f.area || q));
      if (!list.length) return U.empty('No service providers match the filter.<br>Change the area or service type using the filter icon.');
      return list.map((s) => OD.swipeRow(`<div class="card" data-go="${OD.go('svc-details', { id: p.id, e: p.e, s: s.id })}" style="padding-left:0">${s.urgent ? '<div style="width:52px;background:var(--orange);color:#fff;font-size:10px;display:flex;align-items:center;justify-content:center">Urgent</div>' : '<div style="width:10px"></div>'}<div class="info"><div class="nm" style="text-transform:none">${esc(s.name)}</div><div class="sub" style="color:#333">${esc(s.summary)}</div><div class="sub">${esc(s.type)} · ${esc(s.area)}</div></div><span class="chev">${I.chev}</span></div>`, { left: [{ label: 'Select', act: 'svcSelect', a: s.id }] })).join('') + '<div class="footnote">Tap a service provider to view the details, summary and conditions, or swipe right to select it.</div>';
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; ctx.el.querySelector('.plist').innerHTML = OD.screens['sel-service'].list(ctx.p, ctx); },
  });
  action('svcCancel', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; if (pw) { const e = (pw.l.services || []).find((x) => x.id === ctx.p.e); if (e && !e.sid) pw.l.services = pw.l.services.filter((x) => x.id !== ctx.p.e); OD.save(); } N.pop(); });
  screen('svc-filter', {
    title: 'Filter Options',
    left: '<button class="nb bold" data-back>Done</button>',
    right: '<button class="nb" data-act="svcReset">Reset</button>',
    target: () => awhiF(),
    body: () => { const f = awhiF(); return `<div class="sh">DISTRICTS AND AREAS</div><div class="field pick" data-go="${OD.go('picker', { t: 'db:awhiFilter', k: 'area', o: 'l:awhiAreas', title: 'District / Area' })}"><div class="pv">${esc(f.area)}</div></div><div class="sh">SERVICE TYPE</div><div class="group">${L.serviceTypes.map((t) => `<div class="row tap" data-act="svcType" data-a="${esc(t)}"><div class="grow">${esc(t)}</div>${f.type === t ? `<span style="color:var(--tint);position:absolute;right:12px">${I.check}</span>` : ''}</div>`).join('')}</div>`; },
  });
  action('svcType', (d, el, ctx) => { awhiF().type = d.a; OD.save(); N.refresh(ctx.u); });
  action('svcReset', (d, el, ctx) => { OD.db.awhiFilter = null; awhiF(); OD.save(); N.refresh(ctx.u); });
  screen('svc-details', {
    title: 'Service Details',
    body: (p) => { const s = OD.data.services.find((x) => x.id === p.s); return `<div class="sh">SERVICE DETAILS</div>${U.kv('Service Provider', s.name)}${U.kv('Service Type', s.type)}${U.kv('Area', s.area)}${U.kv('Service Summary', s.summary)}${U.kv('Conditions', s.cond)}<button class="bigbtn" data-act="svcSelect" data-a="${s.id}">Select Service</button>`; },
  });
  action('svcSelect', (d, el, ctx) => {
    const layer = N.layers()[N.layers().length - 1];
    const sel = layer.find((e) => e.s === 'sel-service'); if (!sel) return;
    const pw = OD.db.paperwork[sel.p.id]; const e = (pw.l.services || []).find((x) => x.id === sel.p.e); if (!e) return;
    e.sid = d.a; OD.save();
    while (layer.length > 1 && layer[layer.length - 1].s !== 'pw') layer.pop();
    layer.push(N.entry('form', { t: `pw:${pw.id}:l.services#${e.id}`, f: 'awhi-service', rm: 1 }));
    N.commit('push');
  });
})();
