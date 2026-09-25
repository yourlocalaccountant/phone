/* =========================================================================
   OnDuty recreation – SAM (map) app: Bail and Warrant to Arrest layers
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav;
  const HOUR = 36e5, DAY = 24 * HOUR;

  const S = () => (OD.db.sam = OD.db.sam || { mapType: 'Default', officers: true, bail: true, bailF: false, wta: false, wtaF: false, priority: 'Show All', curfew: 'Show All', curfewType: 'Show All', crime: [], wtaUnit: 'Month', wtaN: 6 });
  const bailStatus = (b) => (b.breach ? 'red' : !b.lastCheck ? 'black' : Date.now() - b.lastCheck < 2 * HOUR ? 'green' : Date.now() - b.lastCheck < 48 * HOUR ? 'lgrey' : 'grey');
  const parseDmy = (s) => { const [d, m, y] = String(s).slice(0, 10).split('/'); return new Date(+y, +m - 1, +d).getTime(); };
  const bails = () => {
    const s = S();
    return Object.values(OD.db.bail).filter((b) => (s.priority !== 'Priority Only' || b.priority) && (s.curfew !== 'Curfews Only' || b.curfew) && (s.curfewType !== 'Active Only' || b.curfew) && (!s.crime.length || s.crime.includes(b.crime)));
  };
  const wtas = () => { const s = S(); const span = s.wtaN * (s.wtaUnit === 'Day' ? DAY : s.wtaUnit === 'Week' ? 7 * DAY : 30 * DAY); return Object.values(OD.db.wta).filter((w) => s.wtaUnit === 'Month' && s.wtaN >= 6 ? true : Date.now() - parseDmy(w.issued) <= span + 400 * DAY /* demo data is older – keep visible */); };
  const officers = [{ cs: 'WN10', x: 56, y: 38 }, { cs: 'WN22', x: 28, y: 70 }, { cs: 'PR51', x: 74, y: 16 }];

  const personHead = (P, sub) => `<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px"><div style="width:62px;height:74px;border-radius:6px;overflow:hidden;flex:none">${OD.avatar(P.id, P.g)}</div><div style="flex:1"><div style="font-weight:700;font-size:14.5px">${esc(OD.fullName(P))}</div><div style="font-size:12px;color:#8a8a8f">${esc(P.g)} • ${esc(F.dmy(P.dob))} • ${F.age(P.dob)} Yrs</div>${sub ? `<div style="font-size:12px;color:#8a8a8f">${esc(sub)}</div>` : ''}${U.pills(P.alerts)}</div></div>`;
  const drawerBail = (b) => {
    const P = OD.person(b.pid);
    const pills = (b.priority ? '<span class="pill PRIORITY">Priority</span>' : '');
    return `<div class="drawer ${OD.tmp.samFull ? 'full' : ''}"><div class="grab" data-act="samGrow"></div><div class="dh"><span class="sam-pin" style="position:static;transform:none"><span class="bp" style="width:22px;height:22px;font-size:13px">B</span></span>Bail<span class="x" data-act="samClose">✕</span></div><div class="dbody"><div class="dcard">${personHead(P, b.lastCheck ? `Last checked ${F.ago(b.lastCheck)}` : 'Never been checked').replace('<div class="pills">', `<div class="pills">${pills}`)}<div class="drow"><div><div class="dl">PRN</div><div class="dv">${esc(P.prn)}</div></div><span class="dlink" data-act="samQP" data-a="${P.id}">${I.search} Query Person</span></div><div class="drow" style="display:block"><div class="dl">Bail Address</div><div class="dv">${esc(b.addr)}</div>${b.verified ? '' : '<div style="color:var(--ios-red);font-size:12px">Confirm in Conditions – this is the NIA Primary address and may be different to the curfew address.</div>'}<div style="text-align:right"><span class="dlink" data-act="samQL" data-a="${b.id}">${I.search} Query Location</span></div></div></div><div class="dcard"><div class="dv" style="margin-bottom:6px">Bail Conditions</div>${b.conditions.map((c) => `<div style="font-size:12.5px;padding:6px 0;border-bottom:.5px solid #eee">${esc(c)}</div>`).join('')}</div><div class="dcard"><div class="dv" style="margin-bottom:4px">Last Bail Check</div><div style="font-size:12.5px;color:#666">${b.lastCheck ? `${esc(F.stamp(b.lastCheck))} – ${b.breach ? 'Breached' : 'Complied'}${b.lastNotes ? '<br>' + esc(b.lastNotes) : ''}` : 'No previous history'}</div></div><div class="dcard"><div class="dv" style="margin-bottom:4px">Notes</div><div style="font-size:12.5px;color:#666">Person Notes and Bail Notes display here if they exist (edited via the desktop BMA).</div></div><div class="dcard">${[['Next Hearing', b.nextHearing], ['Court', b.court], ['Crime Type', b.crime], ['Risk Rating', b.risk]].map(([k, v]) => `<div class="drow"><div class="dl">${k}</div><div style="font-size:13px">${esc(v)}</div></div>`).join('')}</div></div><div class="dfoot"><button data-act="samRoute" data-a="bail:${b.id}">${I.route} Route</button><button data-act="samActionBail" data-a="${b.id}">${I.checkpoint} Action Bail</button></div></div>`;
  };
  const drawerWta = (w) => {
    const P = OD.person(w.pid); const last = w.comments[0];
    return `<div class="drawer ${OD.tmp.samFull ? 'full' : ''}"><div class="grab" data-act="samGrow"></div><div class="dh"><span class="bp wta" style="width:22px;height:22px;border-radius:6px;background:var(--brown);display:flex;align-items:center;justify-content:center">${I.cuffs}</span>Warrant to Arrest<span class="x" data-act="samClose">✕</span></div><div class="dbody"><div class="dcard">${personHead(P, OD.personLine(P))}<div class="drow"><div><div class="dl">PRN</div><div class="dv">${esc(P.prn)}</div></div><span class="dlink" data-act="samQP" data-a="${P.id}">${I.search} Query Person</span></div><div class="drow"><div><div class="dl">Contact Number</div><div class="dv" style="color:var(--tint)">${esc(w.contact)}</div></div></div><div class="drow" style="display:block"><div class="dl">Address</div><div class="dv">${esc(P.addr)}</div>${U.pills(Object.values(OD.db.locations).find((l) => (l.occupants || []).includes(w.pid))?.alerts || [])}<div style="text-align:right"><span class="dlink" data-act="samQLAddr" data-a="${esc(P.addr)}">${I.search} Query Location</span></div></div></div><div class="dcard"><div class="dv" style="margin-bottom:6px">Warrant</div>${[['Warrant Number', w.no], ['Offences', w.offence], ['Issue Date', w.issued], ['District Court', w.court]].map(([k, v]) => `<div class="drow" style="display:block"><div class="dl">${k}</div><div style="font-size:13.5px;font-weight:600">${esc(v)}</div></div>`).join('')}<div class="drow" style="display:block"><div class="dl">Last Comment</div>${last ? `<div style="font-size:13px;font-weight:600">${esc(last.by)} • ${esc(last.ts)}</div><div style="font-size:12.5px;color:#666">${esc(last.text)}</div>` : '<div style="font-size:12.5px;color:#666">No comments</div>'}<div class="dlink" data-act="samComments" data-a="${w.id}" style="margin-top:4px">View All</div></div><div class="drow"><span class="dlink" data-act="samAttachment" data-a="${w.id}"><span style="color:var(--green)">●</span> View Attachment</span></div></div></div><div class="dfoot"><button data-act="samRoute" data-a="wta:${w.id}">${I.route} Route</button><button data-act="samAction2W" data-a="${w.id}">${I.checkpoint} Action 2W</button></div></div>`;
  };
  const drawerList = (kind, ctx) => {
    const q = (ctx.e.q || '').toLowerCase();
    const s = S();
    const items = [];
    if (kind !== 'wta' && s.bail) bails().forEach((b) => items.push({ k: 'bail', o: b, P: OD.person(b.pid) }));
    if (kind !== 'bail' && (s.wta || kind === 'wta')) wtas().forEach((w) => items.push({ k: 'wta', o: w, P: OD.person(w.pid) }));
    const f = items.filter(({ P, o }) => !q || OD.fullName(P).toLowerCase().includes(q) || P.prn.toLowerCase().includes(q) || (o.addr || P.addr).toLowerCase().includes(q));
    const title = kind === 'wta' ? 'Nearby Warrants to Arrest' : kind === 'bail' ? 'Nearby Bail' : 'Nearby';
    return `<div class="drawer full"><div class="grab" data-act="samClose"></div><div class="dh" style="font-size:18px">${title}<span class="x" data-act="samClose">✕</span></div><div style="padding:0 12px 8px"><label class="searchbar" style="padding:0;background:none"><span class="sbx">${I.search}<input data-local="q" placeholder="Search name, PRN or address" value="${esc(ctx.e.q || '')}" autocomplete="off"></span></label></div><div class="dbody samlist">${f.length ? f.map(({ k, o, P }) => `<div class="dcard" data-act="samOpen" data-a="${k}:${o.id}" style="cursor:pointer;display:flex;gap:10px"><span class="bp ${k === 'wta' ? 'wta' : ''}" style="width:26px;height:26px;border-radius:7px;background:${k === 'wta' ? 'var(--brown)' : 'var(--orange)'};color:#fff;font-weight:800;display:flex;align-items:center;justify-content:center;flex:none">${k === 'wta' ? I.cuffs : 'B'}</span><div style="flex:1"><div style="font-weight:700;font-size:13.5px">${esc(OD.fullName(P))}</div><div style="font-size:11.5px;color:#8a8a8f">${k === 'wta' ? 'Issued on ' + esc(o.issued) : o.lastCheck ? 'Last checked ' + esc(F.ago(o.lastCheck)) : 'Never been checked'}</div>${U.pills(P.alerts)}<div style="font-size:12.5px;margin-top:3px">${esc(o.addr || P.addr)}</div></div></div>`).join('') : '<div class="empty">No matches</div>'}</div></div>`;
  };
  const layersSheet = () => {
    const s = S();
    const th = (t) => `<div class="th" style="background:${t === 'Default' ? '#efebe3' : t === 'Satellite' ? '#4a5a3c' : 'linear-gradient(160deg,#cfd8dc,#8a9aa6)'};${t === 'Default' ? 'background-image:linear-gradient(90deg,transparent 45%,#f6c67c 45%,#f6c67c 55%,transparent 55%)' : ''}"></div>`;
    const sw = (k) => `<span class="switch ${s[k] ? 'on' : ''}" data-act="samToggle" data-a="${k}"></span>`;
    const seg2 = (k, opts) => `<div class="wseg2" >${opts.map((o) => `<button class="${s[k] === o ? 'on' : ''}" data-act="samSet" data-a="${k}|${o}">${o}</button>`).join('')}</div>`;
    return `<div class="drawer layers" style="max-height:78%"><div class="grab" data-act="samClose"></div><div class="dbody"><h4>Map Type</h4><div class="mt">${['Default', 'Satellite', '3D'].map((t) => `<button class="${s.mapType === t ? 'on' : ''}" data-act="samSet" data-a="mapType|${t}">${th(t)}${t}</button>`).join('')}</div><h4>Map Layers <a data-act="samReset">Reset</a></h4><div class="fbox"><div class="lrow"><span class="li" style="background:#1f56c4">≋</span><span class="lt">Officers</span>${sw('officers')}</div></div><div class="fbox"><div class="lrow"><span class="li" style="background:var(--orange)">B</span><span class="lt">Bail</span><span class="lf" data-act="samToggle" data-a="bailF">${s.bailF ? 'Hide Filters' : 'Show Filters'}</span>${sw('bail')}</div>${s.bailF ? `<div class="fl">Priority</div>${seg2('priority', ['Show All', 'Priority Only'])}<div class="fl">Curfew</div>${seg2('curfew', ['Curfews Only', 'Show All'])}<div class="fl">Curfew Type</div>${seg2('curfewType', ['Show All', 'Active Only', '24 Hours Only'])}<div class="fl">Crime Type</div><div class="wseg2 multi" style="flex-wrap:wrap">${['Burglary', 'Drugs', 'Violence', 'Vehicle'].map((c) => `<button class="${s.crime.includes(c) ? 'on' : ''}" data-act="samCrime" data-a="${c}" style="flex:1 0 45%">${c}</button>`).join('')}</div>` : ''}</div><div class="fbox"><div class="lrow"><span class="li" style="background:var(--brown)">${I.cuffs}</span><span class="lt">WTA</span><span class="lf" data-act="samToggle" data-a="wtaF">${s.wtaF ? 'Hide Filters' : 'Show Filters'}</span>${sw('wta')}</div>${s.wtaF ? `<div class="fl">Issued Date</div>${seg2('wtaUnit', ['Day', 'Week', 'Month'])}<input class="slider" type="range" min="1" max="6" value="${s.wtaN}" data-samslider><div style="display:flex;justify-content:space-between;font-size:11px;color:#8a8a8f"><span>1 ${s.wtaUnit}</span><span>${s.wtaN} ${s.wtaUnit}${s.wtaN > 1 ? 's' : ''}</span></div>` : ''}</div><p style="font-size:11px;color:#8a8a8f">The WTA layer is off by default and is not displayed in SAM web. Priority Offenders are identified in the Bail Management Application.</p></div></div>`;
  };

  OD.screen('sam', {
    full: (p, ctx) => {
      const s = S();
      const sheet = p.sheet || '';
      let pins = '';
      if (s.officers) pins += officers.map((o) => `<div class="sam-pin" style="left:${o.x}%;top:${o.y}%"><div class="off">${o.cs}</div></div>`).join('');
      if (s.bail) {
        const groups = {};
        bails().forEach((b) => { const k = b.x + ',' + b.y; (groups[k] = groups[k] || []).push(b); });
        pins += Object.values(groups).map((g) => g.length > 1 ? `<div class="sam-pin" style="left:${g[0].x}%;top:${g[0].y}%" data-act="samCluster" data-a="${g.map((b) => b.id).join(',')}"><div class="cluster">${g.length}</div></div>` : `<div class="sam-pin" style="left:${g[0].x}%;top:${g[0].y}%" data-act="samOpen" data-a="bail:${g[0].id}"><div class="bp">B</div><span class="st ${bailStatus(g[0])}"></span></div>`).join('');
      }
      if (s.wta) pins += wtas().map((w) => `<div class="sam-pin" style="left:${w.x + 2.5}%;top:${w.y + 2}%" data-act="samOpen" data-a="wta:${w.id}"><div class="bp wta">${I.cuffs}</div></div>`).join('');
      let route = '';
      if (p.route) {
        const [k, id] = p.route.split(':'); const o = k === 'bail' ? OD.db.bail[id] : OD.db.wta[id];
        if (o) route = `<svg style="position:absolute;inset:0;width:100%;height:100%;z-index:4;pointer-events:none" viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points="52,30 52,${o.y} ${o.x},${o.y}" fill="none" stroke="#1a7ff5" stroke-width="1.4" stroke-linejoin="round" vector-effect="non-scaling-stroke" style="stroke-width:6px;opacity:.85"/></svg><div class="route-info"><b>${3 + Math.round(Math.abs(o.x - 52) / 8 + Math.abs(o.y - 30) / 8)} min</b><br>${(0.4 + (Math.abs(o.x - 52) + Math.abs(o.y - 30)) / 40).toFixed(1)} km · <span class="dlink" data-act="samEndRoute">End</span></div>`;
      }
      let drawer = '';
      if (sheet === 'layers') drawer = layersSheet();
      else if (sheet.startsWith('bail:')) { const b = OD.db.bail[sheet.slice(5)]; if (b) drawer = drawerBail(b); }
      else if (sheet.startsWith('wta:')) { const w = OD.db.wta[sheet.slice(4)]; if (w) drawer = drawerWta(w); }
      else if (sheet.startsWith('list')) drawer = drawerList(sheet.split(':')[1] || '', ctx);
      else if (sheet.startsWith('cluster:')) { const ids = sheet.slice(8).split(','); drawer = `<div class="drawer"><div class="grab"></div><div class="dh">Bail (${ids.length})<span class="x" data-act="samClose">✕</span></div><div class="dbody">${ids.map((id) => { const b = OD.db.bail[id]; const P = OD.person(b.pid); return `<div class="dcard" data-act="samOpen" data-a="bail:${id}" style="cursor:pointer"><b>${esc(OD.fullName(P))}</b><div style="font-size:12px;color:#8a8a8f">${esc(b.crime)} · ${b.lastCheck ? 'Last checked ' + esc(F.ago(b.lastCheck)) : 'Never been checked'}</div></div>`; }).join('')}</div></div>`; }
      return `<div class="sam"><div class="map">${OD.mapSVG({ type: s.mapType })}${pins}<span class="locdot" style="left:52%;top:30%"></span>${route}</div><div class="sam-logo">${I.locate.replace('currentColor', '#1f56c4')} SAM</div><div class="sam-btns"><button data-act="samLayers" aria-label="Map layers">${I.layers}</button><button data-act="samLocate" aria-label="Locate me">${I.locate}</button></div>${drawer || `<div class="sam-search"><div class="sbx" data-act="samList">${I.search} Enter three characters or more to search</div><div style="display:flex;justify-content:center;gap:10px;margin-top:8px;font-size:11px;color:#8a8a8f"><span><span class="risk-dot" style="background:#2fcf4f"></span>&lt; 2h</span><span><span class="risk-dot" style="background:#b6b6b6"></span>2–48h</span><span><span class="risk-dot" style="background:#8e8e8e"></span>&gt; 48h</span><span><span class="risk-dot" style="background:#000"></span>Never</span><span><span class="risk-dot" style="background:#ff1f1f"></span>Breached</span></div></div>`}</div>`;
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; const box = ctx.el.querySelector('.samlist'); if (box) { const tmp = document.createElement('div'); tmp.innerHTML = drawerList(ctx.p.sheet.split(':')[1] || '', ctx); box.innerHTML = tmp.querySelector('.samlist').innerHTML; } },
    mount: (el, p, ctx) => { const sl = el.querySelector('[data-samslider]'); if (sl) sl.addEventListener('change', () => { S().wtaN = +sl.value; OD.save(); N.refresh(ctx.u); }); },
    cls: '',
  });
  const setSheet = (sheet, extra = {}) => { const top = N.top(); N.replace('sam', { ...(top ? top.p : {}), sheet, ...extra }); };
  const A = OD.action;
  A('samLayers', () => setSheet('layers'));
  A('samLocate', () => OD.ui.toast('Centred on your current location'));
  A('samClose', () => { OD.tmp.samFull = false; setSheet(''); });
  A('samGrow', (d, el, ctx) => { OD.tmp.samFull = !OD.tmp.samFull; N.refresh(ctx.u); });
  A('samList', () => setSheet('list:' + (S().wta && !S().bail ? 'wta' : S().bail && !S().wta ? 'bail' : '')));
  A('samOpen', (d) => { const top = N.top(); N.push('sam', { ...(top ? { route: top.p.route } : {}), sheet: d.a }); });
  A('samCluster', (d) => setSheet('cluster:' + d.a));
  A('samToggle', (d, el, ctx) => { const s = S(); s[d.a] = !s[d.a]; OD.save(); N.refresh(ctx.u); });
  A('samSet', (d, el, ctx) => { const [k, v] = d.a.split('|'); S()[k] = v; OD.save(); N.refresh(ctx.u); });
  A('samCrime', (d, el, ctx) => { const c = S().crime; const i = c.indexOf(d.a); if (i >= 0) c.splice(i, 1); else c.push(d.a); OD.save(); N.refresh(ctx.u); });
  A('samReset', (d, el, ctx) => { OD.db.sam = null; S(); OD.save(); N.refresh(ctx.u); });
  A('samRoute', (d) => setSheet('', { route: d.a }));
  A('samEndRoute', () => { const top = N.top(); N.replace('sam', { sheet: top.p.sheet || '' }); });
  A('samComments', (d) => { const w = OD.db.wta[d.a]; OD.ui.alert({ title: 'Comments', msg: w.comments.length ? w.comments.map((c) => `${c.by} • ${c.ts}\n${c.text}`).join('\n\n') : 'No comments' }); });
  A('samAttachment', () => OD.ui.alert({ title: 'Scanned WTA attachment', msg: 'The scanned warrant would open here. (Placeholder in this recreation.)' }));

  /* ------------------------------------------------ deep links into OnDuty */
  const openOnDuty = (stack, modals = []) => { N.st.edu = false; N.st.fromSam = true; N.set('od', 'home', stack, modals); };
  OD.openOnDuty = openOnDuty;
  A('samQP', (d) => openOnDuty([['home'], ['person', { id: d.a }]]));
  A('samQL', (d) => { const b = OD.db.bail[d.a]; if (b.loc) openOnDuty([['home'], ['location', { id: b.loc }]]); else { const q = OD.runQuery('QL', { quick: b.addr.split(',')[0] }); openOnDuty([['home'], ['qres', { q: q.id }]]); } });
  A('samQLAddr', (d) => { const q = OD.runQuery('QL', { quick: d.a.split(',')[0] }); openOnDuty([['home'], ['qres', { q: q.id }]]); });
  const linkActive = () => N.st.modals.some((m) => m.some((e) => e.s === 'pw' && ['BC', 'WTA'].includes(OD.db.paperwork[e.p.id]?.type) && OD.db.paperwork[e.p.id]?.status === 'Incomplete'));
  A('samActionBail', (d) => {
    const b = OD.db.bail[d.a];
    if (linkActive()) return OD.ui.alert({ title: 'Link Already Active', msg: 'You already have a Bail Check paperwork open. Close the OnDuty Bail paperwork before the link will open.' });
    const go = () => OD.startBailCheck(d.a, true);
    if (!b.verified) return OD.ui.alert({ title: 'Contact Comms', msg: 'The curfew address is unverified. Please contact Comms via radio to create the 5K event.', buttons: [{ label: 'OK', bold: true, fn: go }] });
    OD.ui.alert({ title: 'Would you like to create a 5K event?', buttons: [{ label: 'No', fn: go }, { label: 'Yes', bold: true, fn: () => { b.fiveK = true; OD.save(); go(); setTimeout(() => OD.ui.toast('5K event triggered'), 300); } }] });
  });
  A('samAction2W', (d) => {
    if (linkActive()) return OD.ui.alert({ title: 'Link Already Active', msg: 'Close the open OnDuty paperwork before the link will open.' });
    const go = (card) => { const w = OD.db.wta[d.a]; const existing = Object.values(OD.db.paperwork).find((x) => x.type === 'WTA' && x.status === 'Incomplete' && x.val.wta === d.a && x.id !== 'demo-WTA'); const pw = existing || OD.pwNew('WTA', { src: 'wta:' + d.a }); if (card) pw.card = 'P0' + Math.floor(10000000 + Math.random() * 89999999); OD.save(); openOnDuty([['home']], [[['pw', { id: pw.id, today: 1 }]]]); if (card) setTimeout(() => OD.ui.toast('2W CARD event created'), 300); };
    OD.ui.alert({ title: 'Create a 2W CARD event?', buttons: [{ label: 'No', fn: () => go(false) }, { label: 'Yes', bold: true, fn: () => go(true) }] });
  });
  A('todayTab', () => { N.dismiss(); });
})();
