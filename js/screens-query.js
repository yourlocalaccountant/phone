/* =========================================================================
   OnDuty recreation – queries (QP/QV/QL/QO/QI), results and summaries
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav;
  const screen = OD.screen, action = OD.action, FD = OD.folders;

  /* ============================================================ QUERY MODEL */
  const labelOf = (type, c) => {
    if (type === 'QP') { if (c.mode === 'TSL') return c.tsl || ''; if (c.mode === 'Nickname') return `"${(c.nick || '').toUpperCase()}"${c.age ? ', ' + c.age : ''}`; const { sn, gn } = OD.gen.parseName(c.name); return [gn ? `${sn}, ${gn}` : sn, c.age, c.gender && c.gender !== 'Unknown' ? c.gender : ''].filter(Boolean).join(', '); }
    if (type === 'QV') return String(c.value || '').toUpperCase();
    if (type === 'QL') return (c.quick || c.common || (c.num ? c.num + ' ' + (c.street || '') : c.street) || (c.st1 ? c.st1 + ' / ' + c.st2 : '') || '').toUpperCase();
    if (type === 'QO') return String(c.name || '').toUpperCase();
    if (type === 'QI') return String(c.ident || '').toUpperCase() + (c.cat ? ` (${c.cat})` : '');
    return '';
  };
  const execQuery = (q) => {
    const c = q.crit;
    const r = q.type === 'QP' ? OD.gen.qp({ name: c.mode === 'Nickname' ? c.nick : c.mode === 'TSL' ? c.tsl : c.name, age: c.age, gender: c.gender }) : q.type === 'QV' ? OD.gen.qv(c) : q.type === 'QL' ? OD.gen.ql(c) : q.type === 'QO' ? OD.gen.qo(c) : q.type === 'QI' ? OD.gen.qi(c) : { ids: q.ids || [], total: q.total || 0 };
    q.ids = r.ids; q.total = q.total && q.total > r.total ? q.total : r.total; q.status = 'done';
  };
  OD.addQuery = (o) => {
    const q = { id: OD.uid('q'), ts: Date.now(), status: 'done', ids: [], total: 0, ...o };
    q.label = q.label || labelOf(q.type, q.crit || {});
    if (q.status === 'done' && !(o.ids && o.ids.length)) execQuery(q);
    OD.db.queries.push(q);
    if (q.folder) FD.add(q.folder, { k: 'q', id: q.id }); else OD.db.home.push({ id: OD.uid('h'), k: 'query', ref: q.id, ts: q.ts });
    if (q.type !== 'DELVE') OD.db.audit.unshift({ ts: q.ts, type: q.type, label: q.label, reason: q.crit?.reason || '', status: q.status });
    OD.save();
    return q;
  };
  OD.runQuery = (type, crit, opts = {}) => OD.addQuery({ type, crit: OD.clone(crit), folder: opts.folder || undefined, status: OD.db.offline ? 'queued' : opts.bg ? 'running' : 'done' });
  OD.processQueued = () => {
    const qs = OD.db.queries.filter((q) => q.status === 'queued');
    qs.forEach((q) => { execQuery(q); q.ts = Date.now(); const a = OD.db.audit.find((x) => x.label === q.label && x.status === 'queued'); if (a) a.status = 'done'; });
    if (qs.length) { OD.save(); OD.ui.toast(`Back in coverage – ${qs.length} queued quer${qs.length > 1 ? 'ies' : 'y'} completed`); }
  };
  const qOf = (id) => OD.db.queries.find((x) => x.id === id);
  OD.qOf = qOf;

  /* ------------------------------------------------------- query form helpers */
  const tmp = (k, init) => { OD.tmp[k] = OD.tmp[k] || init; return OD.tmp[k]; };
  const runBtns = (type) => `<div class="btnbar"><button class="plain" data-act="qRun" data-a="${type}|bg">Background</button><button data-act="qRun" data-a="${type}|run">Run</button></div>`;
  const qSeg = (k, opts, v) => `<div style="padding:4px 12px 8px;background:#fff">${U.seg(k, opts, v)}</div>`;
  const fld = (k, label, v, o = {}) => `<div class="field ${o.cam ? 'has-icon' : ''}"><span class="lbl">${label}</span><input type="text" data-k="${k}" value="${esc(v || '')}" placeholder="${esc(o.ph || 'Enter here...')}" ${o.upper ? 'style="text-transform:uppercase"' : ''} ${o.kb ? `inputmode="${o.kb}"` : ''} data-enter="qEnter" data-a="${o.type || ''}" autocomplete="off" ${o.focus ? 'autofocus' : ''}>${o.cam ? `<button class="ficon cam" data-act="scan" data-k="${k}" data-kind="${o.cam}">${I.camera}</button>` : ''}</div>`;
  const pickNote = (p) => (p.pick ? '<div class="center-note" style="background:#eef5fe">Select a result to add it to the paperwork</div>' : '');
  const qDone = '<button class="nb" data-dismiss>Done</button>';

  screen('qp', {
    title: 'Query Person', left: qDone, target: () => tmp('qp', { mode: 'Quick Entry', gender: 'Male' }),
    body: (p) => {
      const d = tmp('qp', { mode: 'Quick Entry', gender: 'Male' });
      let h = pickNote(p) + '<div class="sh">SEARCH CRITERIA</div>' + qSeg('mode', ['Quick Entry', 'Nickname', 'TSL'], d.mode);
      if (d.mode === 'TSL') h += fld('tsl', 'TSL', d.tsl, { cam: 'tsl', upper: 1, type: 'QP', focus: 1 });
      else {
        h += d.mode === 'Nickname' ? fld('nick', 'NICKNAME', d.nick, { upper: 1, type: 'QP', focus: 1 }) : fld('name', 'NAME <span class="hint">/ DLIC / PRN</span>', d.name, { cam: 'dl', upper: 1, type: 'QP', focus: 1, ph: 'SURNAME.FIRSTNAME' });
        h += fld('age', 'AGE <span class="hint">/ DOB</span>', d.age, { kb: 'numeric', type: 'QP' }) + qSeg('gender', ['Male', 'Female', 'Unknown'], d.gender);
      }
      return h + runBtns('QP') + '<div class="footnote">Double tap the spacebar or enter a ‘.’ between surname and first name. The first 5 results are shown – tap Load More to view more results. Scan a driver licence with the camera to auto enter the search criteria.</div>';
    },
  });
  screen('qv', {
    title: 'Query Vehicle', left: qDone, target: () => tmp('qv', { by: 'REGNO', reason: '3T', locMode: 'Use Current Location' }),
    body: (p) => {
      const d = tmp('qv', { by: 'REGNO', reason: '3T', locMode: 'Use Current Location' });
      const wild = String(d.value || '').includes('*');
      let h = pickNote(p) + '<div class="sh">SEARCH CRITERIA</div>' + qSeg('by', ['REGNO', 'VIN', 'Chassis No', 'Engine No'], d.by) + fld('value', d.by.toUpperCase(), d.value, { cam: 'rego', upper: 1, type: 'QV', focus: 1, ph: d.by === 'REGNO' ? 'ABC123' : 'Enter here...' });
      if (wild) h += `<div class="sh">WILDCARD (*) – NARROW THE SEARCH</div><div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qv', k: 'type', o: 'l:vehTypes', title: 'Vehicle Type' })}"><span class="lbl">Vehicle Type</span><div class="pv ${d.type ? '' : 'ph'}">${esc(d.type || 'Select')}</div></div><div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qv', k: 'make', o: 'l:makes', title: 'Make' })}"><span class="lbl">Make</span><div class="pv ${d.make ? '' : 'ph'}">${esc(d.make || 'Select')}</div></div><div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qv', k: 'colour', o: 'l:colours', title: 'Colour' })}"><span class="lbl">Colour</span><div class="pv ${d.colour ? '' : 'ph'}">${esc(d.colour || 'Select')}</div></div>`;
      h += '<div class="sh">REASON</div>' + qSeg('reason', ['3T', '4Q', '3B', 'MOB', 'Other'], d.reason);
      if (d.reason === 'Other') h += fld('reasonText', 'OTHER REASON', d.reasonText, {});
      h += '<div class="sh">LOCATION</div>' + qSeg('locMode', ['Use Current Location', 'Select Location'], d.locMode);
      h += d.locMode === 'Select Location' ? `<div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qv', k: 'loc', o: 'x:addresses', title: 'Select Location', search: 1 })}"><div class="pv ${d.loc ? '' : 'ph'}">${esc(d.loc || 'Select recent / nearby location')}</div></div>` : `<div class="para grey" style="font-size:13.5px">${esc(OD.nearby()[0].addr)}</div>`;
      return h + runBtns('QV') + '<div class="footnote">The reason defaults to 3T. If 3T is selected, a 3T event is logged in CAD (if you are logged into Responder/CAD) and an updated GPS location is sent to Comms when you run the query. A wildcard (*) can be entered in the regno.</div>';
    },
  });
  screen('ql', {
    title: 'Query Location', left: qDone, target: () => tmp('ql', { bmode: 'District', mode: 'Quick Entry', boundary: OD.db.settings.boundaryName }),
    body: (p) => {
      const d = tmp('ql', { bmode: OD.db.settings.boundary || 'District', mode: 'Quick Entry', boundary: OD.db.settings.boundaryName });
      let h = pickNote(p) + `<div class="sh">BOUNDARY</div><div class="field pick" data-go="${OD.go('picker', { t: 'tmp:ql', k: 'boundary', o: 'l:boundaries', title: 'Boundary' })}"><div class="pv">${esc(d.boundary)}</div></div>` + qSeg('bmode', ['National', 'District', 'Station'], d.bmode);
      h += '<div class="sh">SEARCH CRITERIA</div>' + qSeg('mode', ['Quick Entry', 'Common', 'Street number', 'Intersection'], d.mode);
      if (d.mode === 'Quick Entry') h += fld('quick', 'Quick Entry search', d.quick, { upper: 1, type: 'QL', focus: 1 });
      if (d.mode === 'Common') h += fld('common', 'Common name', d.common, { upper: 1, type: 'QL', ph: 'e.g. Railway Station' });
      if (d.mode === 'Street number') h += fld('num', 'Street number', d.num, { type: 'QL', kb: 'numeric' }) + fld('street', 'Street name', d.street, { upper: 1, type: 'QL' });
      if (d.mode === 'Intersection') h += fld('st1', 'Street 1', d.st1, { upper: 1, type: 'QL' }) + fld('st2', 'Street 2', d.st2, { upper: 1, type: 'QL' });
      h += runBtns('QL');
      h += `<div class="sh">NEARBY LOCATIONS</div><div class="row link" data-go="${OD.go('ql-map', { mode: 'query', folder: p.folder || '', pick: p.pick || '' })}">Show map of nearby locations<span class="chev">${I.chev}</span></div>` + OD.nearby().map((l) => `<div class="row" data-act="qlNearby" data-a="${l.id}" style="font-size:13px"><div class="grow">${esc(l.addr)}</div>${U.pills(l.alerts)}</div>`).join('');
      if (OD.db.offline) h += '<div class="footnote">Offline – nearby locations still display while GPS is on and available.</div>';
      return h;
    },
  });
  action('qlNearby', (d, el, ctx) => { const l = OD.location(d.a); const t = tmp('ql', {}); t.mode = 'Quick Entry'; t.quick = l.addr.split(',').slice(0, 2).join(' '); OD.save(); N.refresh(ctx.u); OD.ui.toast('Tap Run to perform the search'); });
  screen('qo', {
    title: 'Query Organisation', left: qDone, target: () => tmp('qo', { bmode: 'National' }),
    body: (p) => {
      const d = tmp('qo', { bmode: 'National' });
      return pickNote(p) + `<div class="sh">BOUNDARY</div><div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qo', k: 'boundary', o: 'l:boundaries', title: 'Boundary' })}"><div class="pv ${d.boundary ? '' : 'ph'}">${esc(d.boundary || 'Select...')}</div></div>${qSeg('bmode', ['National', 'District'], d.bmode)}<div class="sh">NAME / TSL</div>${fld('name', '', d.name, { cam: 'tsl', upper: 1, type: 'QO', focus: 1 })}<div class="sh">CATEGORY</div>${qSeg('cat', ['Business', 'Club', 'Gang', 'Other'], d.cat)}<div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qo', k: 'type', o: 'l:qoTypes', title: 'Type' })}"><span class="lbl">Type</span><div class="pv ${d.type ? '' : 'ph'}">${esc(d.type || 'Select')}</div></div>` + runBtns('QO');
    },
  });
  screen('qi', {
    title: 'Query Item', left: qDone, target: () => tmp('qi', {}),
    body: (p) => {
      const d = tmp('qi', {});
      return pickNote(p) + `<div class="sh">IDENTIFIER</div>${fld('ident', '', d.ident, { cam: 'id', upper: 1, type: 'QI', focus: 1 })}<div class="sh">CATEGORY</div><div class="field pick" data-go="${OD.go('picker', { t: 'tmp:qi', k: 'cat', o: 'l:qiCats', title: 'Category' })}"><div class="pv ${d.cat ? '' : 'ph'}">${esc(d.cat || 'Select...')}</div></div>` + runBtns('QI');
    },
  });
  // the picker options for qo type are passed as array – make them resolvable
  OD.optProviders.none = () => [];
  action('qEnter', (d) => d.a && OD.actions.qRun({ a: d.a + '|run' }));
  action('qRun', (d, el, ctx) => {
    const [type, mode] = d.a.split('|');
    const crit = OD.clone(OD.tmp[type.toLowerCase()] || {});
    const p = N.top()?.p || {};
    const lbl = labelOf(type, crit);
    if (!lbl.trim()) return OD.ui.toast('Enter search criteria');
    if (type === 'QI' && !crit.cat) return OD.ui.toast('Select a category');
    if (type === 'QV' && crit.reason === '3T' && !OD.db.offline) setTimeout(() => OD.ui.toast('3T event logged in CAD with your GPS location'), 400);
    const q = OD.runQuery(type, crit, { folder: p.folder, bg: mode === 'bg' });
    if (q.status === 'queued') { N.dismiss(); OD.ui.toast('Offline – query queued. It will run once you are back in coverage.', 3000); return; }
    if (mode === 'bg') {
      OD.ui.toast('Query running in the background');
      setTimeout(() => { execQuery(q); OD.save(); N.refreshAll(); OD.ui.toast(`${q.type} ${q.label}: ${q.total} result${q.total === 1 ? '' : 's'}`); }, 1500);
      if (p.pick) return; // stay to allow more queries
      N.dismiss(); return;
    }
    if (q.total === 1 && ['QV', 'QI'].includes(type) || (type === 'QP' && q.total === 1)) return N.push(summaryScreen(type), { id: q.ids[0], q: q.id, pick: p.pick || '' });
    N.push('qres', { q: q.id, pick: p.pick || '' });
  });
  const summaryScreen = (type) => ({ QP: 'person', QV: 'vehicle', QL: 'location', QO: 'org', QI: 'item' }[type]);

  /* ================================================================ RESULTS */
  screen('qres', {
    title: (p, ctx) => { const q = qOf(p.q); if (!q) return 'Results'; const shown = Math.min(q.ids.length, (ctx.e && ctx.e.more) || 5); return `${q.type === 'QP' ? shown : q.ids.length} of ${q.total}`; },
    back: (p) => ({ QP: 'Query Person', QV: 'Query Vehicle', QL: 'Query Location', QO: 'Query Organisation', QI: 'Query Item' }[qOf(p.q)?.type] || 'Back'),
    cls: '',
    body: (p, ctx) => {
      const q = qOf(p.q); if (!q) return U.empty('Query not found');
      if (q.status === 'queued') return U.empty('Queued (Offline)… This query will run once you are back in coverage.');
      const top = `<div class="center-note" data-ptr-note><b>Information displayed is up to date</b><small>${esc(q.label)}</small></div>`;
      if (!q.ids.length) return top + U.empty('No results found');
      const pick = p.pick || '';
      if (q.type === 'QP') {
        const shown = Math.min(q.ids.length, ctx.e.more || 5);
        return top + q.ids.slice(0, shown).map((id) => OD.personCard(OD.person(id), { nameTop: true, go: OD.link('person', { id, q: q.id, pick }) })).join('') + (shown < q.ids.length || shown < q.total ? '<div class="row center link" data-act="loadMore" style="justify-content:center">Load More</div>' : '') + `<div style="padding:10px 12px"><button class="fullbtn" style="height:36px" data-go="${OD.go('ext-query', { q: q.id })}">${I.globe} Query External Agency</button></div>`;
      }
      if (q.type === 'QV') return top + q.ids.map((id) => OD.vehicleCard(OD.vehicle(id), { go: OD.link('vehicle', { id, q: q.id, pick }) })).join('');
      if (q.type === 'QL') return top + q.ids.map((id) => OD.swipeRow(OD.locationCard(OD.location(id), { go: OD.link('location', { id, q: q.id, pick }) }), { left: [{ label: 'Delve', act: 'delve', a: id, cls: 'delve' }] })).join('') + '<div class="footnote">Swipe right on a location to perform a Delve.</div>';
      if (q.type === 'QO') return top + q.ids.map((id) => OD.orgCard(OD.org(id), { go: OD.link('org', { id, q: q.id, pick }) })).join('');
      if (q.type === 'QI') return top + q.ids.map((id) => { const it = OD.item(id); return `<div class="row" data-go="${OD.go('item', { id, q: q.id })}"><div class="grow"><div class="kv-k">${esc(it.ident)}</div><div class="kv-v">${esc(it.cat)} · ${esc(it.status)}</div></div><span class="chev">${I.chev}</span></div>`; }).join('');
      return '';
    },
  });
  action('loadMore', (d, el, ctx) => { ctx.e.more = (ctx.e.more || 5) + 5; N.refresh(ctx.u); });
  action('delve', (d, el, ctx) => {
    const loc = OD.location(d.a);
    const q = OD.addQuery({ type: 'DELVE', crit: { loc: d.a }, label: `Recent FH occurrences at ${loc.addr}`, folder: qOf(ctx.p.q)?.folder, total: loc.fh || 0, ids: (loc.fh ? Object.values(OD.db.occurrences).filter((o) => o.fh && o.loc === d.a).map((o) => o.id).slice(0, 5) : []), status: 'done' });
    N.push('delve', { q: q.id });
  });
  screen('delve', {
    title: 'FH Occurrence Delve',
    body: (p) => {
      const q = qOf(p.q); if (!q) return '';
      const occs = q.ids.map(OD.occ).filter(Boolean);
      return `<div class="center-note"><b>${esc(q.label)}</b><small>${q.total} FH occurrence${q.total === 1 ? '' : 's'} · showing the ${occs.length} most recent</small></div>` + (occs.length ? occs.map((o) => `<div class="row" data-go="${OD.go('occ', { id: o.id })}"><div class="grow"><div class="kv-k" style="font-weight:600">${esc(o.no)}</div><div class="kv-v">${esc(o.code)} - ${esc(o.desc)}\n${esc(o.date)}</div></div><span class="chev">${I.chev}</span></div>`).join('') : U.empty('No Family Harm occurrences at this location'));
    },
  });

  /* ============================================================ SUMMARIES */
  const viewed = (t, id) => {
    const h = OD.db.home.find((x) => x.k === 'obj' && x.t === t && x.ref === id);
    if (h) h.ts = Date.now(); else OD.db.home.push({ id: OD.uid('h'), k: 'obj', t, ref: id, ts: Date.now() });
    OD.save();
  };
  const sumExtra = (t, id, p) => {
    if (p.pick) { const [pwId] = p.pick.split('|'); const pw = OD.db.paperwork[pwId]; const lbl = p.pick.startsWith('field|') ? 'Select Person' : `Add to ${pw ? OD.types[pw.type].name : 'Paperwork'}`; return `<button class="fullbtn" data-act="pickAdd" data-a="${esc(id)}">${esc(lbl)}</button>`; }
    const q = p.q ? qOf(p.q) : null;
    return `<div class="twobtn"><button class="grey" data-act="bookmark" data-a="${t}|${esc(id)}|${esc(q?.folder || '')}">Bookmark</button><button data-present="${OD.go('take-action', { src: `${t}:${id}`, folder: q?.folder || '' })}">Take Action</button></div>`;
  };
  action('pickAdd', (d, el, ctx) => OD.pickReturn(ctx.p.pick, d.a));
  action('bookmark', (d) => {
    const [t, id, folder] = d.a.split('|');
    let f = folder && FD.get(folder);
    if (!f) f = FD.create({});
    FD.add(f.id, { k: 'obj', t, id, ts: Date.now() });
    OD.ui.toast(`Bookmarked to folder ${FD.title(f)}`);
  });
  const upToDate = '<div class="ptr" data-ptr></div><div class="center-note">Information displayed is up to date (pull to refresh)</div>';

  screen('person', {
    title: 'Summary',
    extra: (p) => sumExtra('person', p.id, p),
    cls: '',
    body: (p) => {
      const P = OD.person(p.id); if (!P) return U.empty('Person not found');
      if (!p.pick) viewed('person', P.id);
      const al = P.alertList || [];
      let h = upToDate;
      if (P.interacted) h += `<div class="notice-7d" data-go="${OD.go('links', { t: 'person', id: P.id, kind: 'Records' })}">This person has interacted with Police in the last 7 days ›</div>`;
      if (P.awhiHistory) h += `<div class="notice-7d" data-go="${OD.go('links', { t: 'person', id: P.id, kind: 'Records' })}">AWHI referral history available – see Records ›</div>`;
      h += `<div class="sum-name">${esc(OD.fullName(P))}</div><div class="sum-top"><div><div class="ph" data-go="${OD.go('photos', { id: P.id })}" style="cursor:pointer">${P.photoless ? OD.silhouette() : OD.avatar(P.id, P.g)}</div><div class="phsrc">Photo: ${P.nzta ? 'Police' : 'Police'}</div></div><div style="flex:1"><div class="addr">${esc(P.addr)}${P.addrType ? ` (${esc(P.addrType)})` : ''}</div><div class="dob">${esc(OD.personLine(P))}</div></div>${P.nzta ? `<span style="position:absolute;right:14px;bottom:10px;color:#8a8a8f">${I.badge}</span>` : ''}</div><div class="sum-pills">${U.pills(P.alerts)}</div>`;
      if (al.length) h += `<div class="sh red">Alerts (${al.length})</div>` + al.map((a, i) => `<div class="kv tap" data-go="${OD.go('alert', { pid: P.id, i })}"><div class="k">${esc(a.t)}</div><div class="v">${a.n}</div></div>`).join('');
      if (P.bail && P.bail.length) { const active = P.bail.filter((b) => OD.db.bail[b]); h += `<div class="sh dark">Bail</div><div class="kv tap" data-go="${OD.go(active.length > 1 ? 'bail-list' : 'bail', active.length > 1 ? { pid: P.id } : { id: active[0] })}"><div class="k">Active Bail</div><div class="v">${active.length}</div></div>`; }
      if (P.wta) h += `<div class="sh dark">Warrant to Arrest</div><div class="kv tap" data-go="${OD.go('wta', { id: P.wta })}"><div class="k">Active Warrant to Arrest</div><div class="v">${esc(OD.db.wta[P.wta]?.no || '')}</div></div>`;
      h += `<div class="sh dark">Expired Alerts (${P.expired || 0})</div><div class="kv tap" data-go="${OD.go('alerts-expired', { pid: P.id })}"><div class="k">Expired Alerts</div><div class="v">${P.expired || 0}</div></div>`;
      h += `<div class="sh dark">Description and Information</div>${U.kv('Gender', P.g)}${U.kv('Date of Birth', `${F.dmy(P.dob)} (${F.age(P.dob)})`)}${U.kv('Height', P.height || '175cm')}${U.kv('Build', P.build || 'Medium')}${U.kv('Hair', P.hair || 'Brown')}${U.kv('Eye Colour', P.eyes || 'Brown')}${U.kv('Ethnicity', P.eth || 'Not recorded')}`;
      h += `<div class="sh dark">Additional Information</div>${U.kv('Person ID', P.prn)}<div class="kv tap" data-go="${OD.go('person-list', { id: P.id, kind: 'Names' })}"><div class="k">Names</div><div class="v">${1 + (P.aliases || []).length}</div></div><div class="kv tap" data-go="${OD.go('person-list', { id: P.id, kind: 'Addresses' })}"><div class="k">Addresses</div><div class="v">2</div></div><div class="kv tap" data-go="${OD.go('person-list', { id: P.id, kind: 'Phone Numbers' })}"><div class="k">Phone Numbers</div><div class="v">${P.phone ? 1 : 0}</div></div><div class="kv tap" data-go="${OD.go('person-list', { id: P.id, kind: 'Body Marks' })}"><div class="k">Body Marks</div><div class="v">${(P.marks || []).length}</div></div>`;
      h += `<div class="sh dark">Driver Licence (NZTA)</div>${U.kv('DLICNO', P.dl || '—')}${U.kv('Licence Status', P.alerts.includes('FLAGS') && P.id === 'P1' ? 'Current - Photo card cancelled' : 'Current')}${U.kv('Class', '1 (Full)')}${U.kv('Expiry', F.dmy(`${new Date().getFullYear() + 3}-04-13`))}`;
      h += `<div class="sh dark">External Agency Information</div><div class="kv tap" data-go="${OD.go('ext-result', { pid: P.id, svc: 'INZ' })}"><div class="k">INZ Details</div><div class="v">Linked identity</div><span class="globe">${I.globe}</span></div><div class="kv tap" data-go="${OD.go('ext-query', { pid: P.id })}"><div class="k" style="color:var(--tint)">Query External Agencies</div></div>`;
      const vs = Object.values(OD.db.vehicles).filter((v) => v.owner === P.id);
      const occs = Object.values(OD.db.occurrences).filter((o) => (o.persons || []).includes(P.id));
      h += `<div class="sh dark">Links</div><div class="kv tap" data-go="${OD.go('links', { t: 'person', id: P.id, kind: 'Vehicles' })}"><div class="k">Vehicles</div><div class="v">${vs.length}</div></div><div class="kv tap" data-go="${OD.go('links', { t: 'person', id: P.id, kind: 'Locations' })}"><div class="k">Locations</div><div class="v">1</div></div><div class="kv tap" data-go="${OD.go('links', { t: 'person', id: P.id, kind: 'Records' })}"><div class="k">Records</div><div class="v">${occs.length}</div></div>`;
      return h;
    },
  });
  screen('alert', {
    title: 'Alert',
    body: (p) => { const P = OD.person(p.pid); const a = (P?.alertList || [])[+p.i]; if (!a) return U.empty('Alert not found'); return `<div class="sh">ALERT</div>${U.kv('Alert', a.t)}${U.kv('Category', a.cat)}${U.kv('Priority', { SAFETY: '1 - Critical', ACTION: '2 - High', FLAGS: '3 - Medium', PLANS: '3 - Medium', ORDERS: '2 - High' }[a.cat])}${U.kv('Occurrences', a.n)}${U.kv('Start Date', a.start)}${U.kv('Expiry Date', 'None')}${U.kv('Reporting Station', 'Wellington Central')}<div class="sh">DETAILS (DEMO)</div><div class="para">${esc(a.cat === 'SAFETY' ? 'Subject has been known to carry a knife. Approach with caution. Officer safety – conduct a TENR assessment.' : a.cat === 'ORDERS' ? 'Subject is the respondent of a Protection Order. Standard conditions apply.' : 'Refer to the linked occurrence for further information.')}</div>`; },
  });
  screen('alerts-expired', { title: 'Expired Alerts', body: (p) => { const P = OD.person(p.pid); const r = OD.rng('ex' + p.pid); const names = ['Breaches Police Bail', 'Locate and Advise', 'Trespass Notice', 'Drug User', 'Mental Health - Risk to Self', 'Gang Associate', 'Violent Towards Police']; return Array.from({ length: Math.min(P?.expired || 0, 40) }, (_, i) => U.kv(OD.pick(r, names), `Expired ${F.dmy(`20${10 + Math.floor(r() * 11)}-0${1 + Math.floor(r() * 9)}-1${Math.floor(r() * 9)}`)}`)).join('') || U.empty('No expired alerts'); } });
  screen('person-list', {
    title: (p) => esc(p.kind),
    body: (p) => {
      const P = OD.person(p.id); if (!P) return '';
      if (p.kind === 'Names') return `<div class="sh">PRIMARY NAME</div>${U.kv(OD.fullName(P), 'Created Date: 22/09/2016')}<div class="sh">ALIAS</div>${(P.aliases || []).map((a) => U.kv(a, 'Created Date: 12/03/2019')).join('') || '<div class="row center" style="color:#999">No aliases</div>'}`;
      if (p.kind === 'Addresses') return `<div class="sh">CURRENT</div>${U.kv(P.addr, 'Home Address · Verified')}<div class="sh">PREVIOUS</div>${U.kv('14 Rimu Road, Aro Valley, Wellington 6021', 'Previous Address · 2019')}`;
      if (p.kind === 'Phone Numbers') return P.phone ? U.kv(P.phone, 'Mobile · Confirmed') : U.empty('No phone numbers');
      if (p.kind === 'Body Marks') return (P.marks || []).map((m) => U.kv(`${m.type} - ${m.loc}`, m.desc)).join('') || U.empty('No body marks');
      return '';
    },
  });
  screen('links', {
    title: (p) => esc(p.kind),
    body: (p) => {
      if (p.kind === 'Vehicles') { const vs = Object.values(OD.db.vehicles).filter((v) => v.owner === p.id); return vs.length ? vs.map((v) => OD.vehicleCard(v, { go: OD.link('vehicle', { id: v.id }) })).join('') : U.empty('No linked vehicles'); }
      if (p.kind === 'Locations') { const P = OD.person(p.id); const l = Object.values(OD.db.locations).find((x) => (x.occupants || []).includes(p.id)) || null; return l ? OD.locationCard(l, { go: OD.link('location', { id: l.id }) }) : U.kv('Home Address', P.addr); }
      if (p.kind === 'Records') {
        const occs = Object.values(OD.db.occurrences).filter((o) => (o.persons || []).includes(p.id));
        const pws = Object.values(OD.db.paperwork).filter((w) => OD.pwPersonIds(w).includes(p.id) && w.status !== 'Incomplete');
        return (pws.length ? '<div class="sh">RECENT ONDUTY PAPERWORK</div>' + pws.map(OD.pwRow).join('') : '') + '<div class="sh">NIA RECORDS</div>' + (occs.length ? occs.map((o) => `<div class="row" data-go="${OD.go('occ', { id: o.id })}"><div class="grow"><div class="kv-k" style="font-weight:600">${esc(o.no)}</div><div class="kv-v">${esc(o.code)} - ${esc(o.desc)}</div></div><span class="chev">${I.chev}</span></div>`).join('') : U.empty('No records'));
      }
      return '';
    },
  });
  screen('photos', {
    title: 'Photos', cls: '',
    body: (p, ctx) => {
      const P = OD.person(p.id); const i = ctx.e.i || 0;
      return `<div class="center-note"><b>Photo Source: ${i ? 'NZTA' : 'Police'}</b><small>${i ? 'Driver licence photo' : 'Taken 12/03/2021'}</small></div><div class="gallery" style="height:430px" data-act="photoNext">${OD.avatar(P.id + (i ? 'nzta' : ''), P.g)}</div><div class="dots"><i class="${i ? '' : 'on'}"></i><i class="${i ? 'on' : ''}"></i></div><div class="footnote" style="text-align:center">Tap the photo to see the next image</div>`;
    },
  });
  action('photoNext', (d, el, ctx) => { ctx.e.i = ctx.e.i ? 0 : 1; N.refresh(ctx.u); });

  // ----------------------------------------------------------------- bail
  const bailStatusText = (b) => (b.lastCheck ? `Last checked ${F.ago(b.lastCheck)}` : 'Never been checked');
  screen('bail-list', {
    title: 'Active Bail',
    body: (p) => { const P = OD.person(p.pid); return (P.bail || []).map((id) => OD.db.bail[id]).filter(Boolean).map((b) => `<div class="row" data-go="${OD.go('bail', { id: b.id })}"><div class="grow"><div class="kv-k">${esc(b.crime)} · Next hearing ${esc(b.nextHearing)}</div><div class="kv-v">${esc(b.court)} · ${esc(bailStatusText(b))}</div></div><span class="chev">${I.chev}</span></div>`).join(''); },
  });
  screen('bail', {
    title: 'Bail', back: 'Active Bail',
    extra: (p) => `<button class="fullbtn" data-act="actionBail" data-a="${esc(p.id)}">Action Bail</button>`,
    cls: '',
    body: (p) => {
      const b = OD.db.bail[p.id]; if (!b) return U.empty('Bail record not found');
      return `<div class="sh dark">Bail Address</div><div class="row"><div class="grow" style="color:#8a8a8f;font-size:13.5px">${esc(b.addr.toUpperCase())}</div>${b.curfew ? `<button class="sbtn" data-act="fiveK" data-a="${b.id}">${b.fiveK ? '5K ✓' : '5K'}</button>` : ''}</div>${b.verified ? '' : '<div class="para small red">Confirm in Conditions – the curfew address is not verified. The address displayed is the NIA Primary address.</div>'}<div class="sh dark">Bail Conditions</div>${b.conditions.map((c) => `<div class="para small grey" style="border-bottom:.5px solid var(--sep)">${esc(c)}</div>`).join('')}<div class="sh dark">Last Bail Check</div><div class="para small grey">${b.lastCheck ? `${esc(F.stamp(b.lastCheck))} – ${b.breach ? 'Breach' : 'Complied'}${b.lastNotes ? '\n' + esc(b.lastNotes) : ''}` : 'No previous history'}</div><div class="sh dark">Bail Details</div>${U.kv('Next Hearing', b.nextHearing)}${U.kv('Court', b.court)}${U.kv('Crime Type', b.crime)}${U.kv('Assignment Station', b.station)}<div class="sh dark">Additional Information</div>${U.kv('Risk Rating', b.risk)}${U.kv('Priority Offender', b.priority ? 'Yes' : 'No')}${U.kv('Curfew', b.curfew ? 'Yes' : 'No')}`;
    },
  });
  action('fiveK', (d, el, ctx) => { const b = OD.db.bail[d.a]; b.fiveK = true; OD.save(); N.refresh(ctx.u); OD.ui.toast('5K event created – Comms informed'); });
  OD.startBailCheck = (bailId, fromSam) => {
    const existing = Object.values(OD.db.paperwork).find((w) => w.type === 'BC' && w.status === 'Incomplete' && w.val.bail === bailId && w.id !== 'demo-BC');
    const pw = existing || OD.pwNew('BC', { src: 'bail:' + bailId });
    if (fromSam) { N.st.fromSam = true; N.set('od', 'home', [['home']], [[['pw', { id: pw.id, today: 1 }]]]); }
    else N.present('pw', { id: pw.id });
  };
  action('actionBail', (d) => {
    const b = OD.db.bail[d.a];
    if (!b.verified) return OD.ui.alert({ title: 'Address not verified', msg: 'The curfew address is not verified. Please contact Comms via radio to create the 5K event.', buttons: [{ label: 'OK', bold: true, fn: () => OD.startBailCheck(d.a) }] });
    OD.ui.alert({ title: 'Would you like to create a 5K event?', buttons: [{ label: 'No', fn: () => OD.startBailCheck(d.a) }, { label: 'Yes', bold: true, fn: () => { b.fiveK = true; OD.save(); OD.startBailCheck(d.a); OD.ui.toast('5K event triggered'); } }] });
  });
  screen('wta', {
    title: 'Warrant to Arrest',
    body: (p) => { const w = OD.db.wta[p.id]; if (!w) return ''; return `<div class="sh">WARRANT</div>${U.kv('Warrant Number', w.no)}${U.kv('Offences', w.offence)}${U.kv('Issue Date', w.issued)}${U.kv('District Court', w.court)}<div class="sh">COMMENTS</div>${w.comments.length ? w.comments.map((c) => U.kv(`${c.by} · ${c.ts}`, c.text)).join('') : '<div class="row center" style="color:#999">No comments</div>'}<div class="footnote">The WTA record is sourced from the Ministry of Justice Courts Management System (demo data). Update WTA is available when deep-linking from SAM (Action 2W).</div>`; },
  });

  // --------------------------------------------------------------- vehicle
  screen('vehicle', {
    title: 'Summary', extra: (p) => sumExtra('vehicle', p.id, p), cls: '',
    body: (p) => {
      const v = OD.vehicle(p.id); if (!v) return U.empty('Vehicle not found');
      if (!p.pick) viewed('vehicle', v.id);
      const exp = (iso) => (iso ? `${F.dmy(iso)}${new Date(iso) < new Date() ? ' (EXPIRED)' : ''}` : '—');
      const owner = OD.person(v.owner);
      return upToDate + `<div style="background:#fff;padding:10px 12px;display:flex;gap:12px;align-items:center"><div style="display:flex;flex-direction:column;align-items:center;gap:3px">${v.plateOnly ? '' : I.car(v.hex || '#999', v.outline)}<span class="plate">${esc(v.rego)}</span></div><div><div style="font-weight:700">${esc(v.plateOnly ? 'Plate Only' : `${v.year} ${v.make} ${v.model}`)}</div><div style="color:#8a8a8f;font-size:13px">${esc(v.colour || '')} ${esc(v.body || '')}</div></div></div><div class="sum-pills">${U.pills(v.alerts)}</div>` +
        (v.alerts.length ? `<div class="sh red">Alerts (${v.alerts.length})</div>` + v.alerts.map((a) => `<div class="kv"><div class="k">${esc({ SAFETY: 'Occupants known to carry weapons', ACTION: 'Vehicle of interest - stop and advise', FLAGS: 'Suspected false plates', ORDERS: 'Owner subject to court order', PLANS: 'Associated with safety plan' }[a])}</div><div class="v">${a}</div></div>`).join('') : '') +
        `<div class="sh dark">Registration (NZTA)</div>${U.kv('Registration Status', v.plateOnly ? 'Unknown' : 'Registered')}${U.kv('Licence Expiry', exp(v.regExp))}${U.kv('WoF/CoF Expiry', exp(v.wofExp))}${U.kv('Reported Stolen', 'No')}<div class="sh dark">Vehicle Details</div>${U.kv('VIN', v.vin)}${U.kv('Chassis', v.chassis || '—')}${U.kv('Engine Number', v.engine || '—')}${U.kv('Year', v.year || '—')}<div class="sh dark">Owner</div>${owner ? OD.personCard(owner, { go: OD.link('person', { id: owner.id }) }) : '<div class="row center" style="color:#999">No registered owner</div>'}`;
    },
  });
  // -------------------------------------------------------------- location
  screen('location', {
    title: 'Summary', extra: (p) => sumExtra('location', p.id, p), cls: '',
    body: (p) => {
      const l = OD.location(p.id); if (!l) return U.empty('Location not found');
      if (!p.pick) viewed('location', l.id);
      const occ = (l.occupants || []).map(OD.person).filter(Boolean);
      return upToDate + `<div class="sum-name" style="text-transform:none">${esc(l.addr)}</div><div class="para grey small">${esc(l.type)}</div><div class="sum-pills">${U.pills(l.alerts)}</div><div class="map" style="height:150px">${OD.mapSVG()}<div class="pin" style="left:50%;top:60%">${I.pinDrop}</div></div>${l.alerts.length ? `<div class="sh red">Alerts (${l.alerts.length})</div>` + l.alerts.map((a) => U.kv(a === 'SAFETY' ? 'Dog on property / occupants hostile to Police' : a === 'PLANS' ? 'Family harm safety plan in place' : 'Drug activity reported', a)).join('') : ''}<div class="sh dark">Delve</div><div class="kv tap" data-act="delve" data-a="${l.id}"><div class="k">Family Harm occurrences at this location</div><div class="v">${l.fh || 0}</div></div><div class="sh dark">Persons linked to this location</div>${occ.length ? occ.map((P) => OD.personCard(P, { go: OD.link('person', { id: P.id }) })).join('') : '<div class="row center" style="color:#999">No linked persons</div>'}`;
    },
  });
  screen('org', {
    title: 'Summary', extra: (p) => sumExtra('org', p.id, p), cls: '',
    body: (p) => { const g = OD.org(p.id); if (!g) return U.empty('Organisation not found'); if (!p.pick) viewed('org', g.id); return upToDate + `<div class="sum-name">${esc(g.name)}</div><div class="sum-pills">${U.pills(g.alerts)}</div><div class="sh dark">Details</div>${U.kv('Category', g.cat)}${U.kv('Type', g.type)}${U.kv('Address', g.addr)}${g.tsl ? U.kv('TSL', g.tsl) : ''}`; },
  });
  screen('item', {
    title: 'Summary', extra: (p) => sumExtra('item', p.id, p), cls: '',
    body: (p) => { const it = OD.item(p.id); if (!it) return U.empty('Item not found'); if (!p.pick) viewed('item', it.id); return upToDate + `<div class="sum-name">${esc(it.ident)}</div>${it.status === 'Reported Stolen' ? '<div class="sh red">Reported Stolen</div>' : ''}<div class="sh dark">Details</div>${U.kv('Category', it.cat)}${U.kv('Description', it.desc)}${U.kv('Status', it.status)}${it.status === 'Reported Stolen' ? U.kv('Date Reported', it.stolenDate) : ''}${it.occ ? `<div class="kv tap" data-go="${OD.go('occ', { id: it.occ })}"><div class="k">Linked Occurrence</div><div class="v">${esc(OD.occ(it.occ).no)}</div></div>` : ''}`; },
  });
  // ------------------------------------------------------------ occurrence
  screen('occ', {
    title: 'Summary',
    extra: (p) => `<div class="twobtn"><button class="grey" data-act="bookmark" data-a="occ|${esc(p.id)}|">Bookmark</button><button data-present="${OD.go('take-action', { src: 'occ:' + p.id })}">Take Action</button></div>`,
    cls: '',
    body: (p) => {
      const o = OD.occ(p.id); if (!o) return U.empty('Occurrence not found');
      if (o.unread) { o.unread = false; OD.save(); }
      const loc = OD.location(o.loc);
      return upToDate + `<div class="sh dark" style="background:#fff">Occurrence</div><div class="kv"><div class="v">Date: ${esc(o.date)}${o.reported ? '\nReported: ' + esc(o.reported) : ''}</div></div><div class="sh dark">Description and Information</div>${U.kv('Incident / Offence', `${o.code} - ${o.desc}`)}${U.kv('Reporting Channel', o.channel)}${U.kv('Scene Station', o.scene)}${U.kv('Reporting Station', o.repStn)}${U.kv('Subject', o.subject)}${loc ? `<div class="kv tap" data-go="${OD.go('location', { id: loc.id })}"><div class="k">Record Location</div><div class="v">${esc(loc.addr)}</div></div>` : ''}<div class="sh dark">Additional Information</div>${U.kv('Record ID', o.recordId)}${U.kv('DOCLOC Number', o.docloc)}${U.kv('CARD Number', o.card)}<div class="sh dark">Persons</div>${(o.persons || []).map((id) => OD.personCard(OD.person(id), { go: OD.link('person', { id }) })).join('')}<div class="sh dark">Record Narrative</div><div class="kv"><div class="k">Narrative</div><div class="v">${esc(o.narrative || 'No narrative')}</div></div>`;
    },
  });

  /* =================================================== EXTERNAL AGENCY (web) */
  screen('ext-query', {
    title: 'Query External Agency', cls: '',
    target: () => OD.resolve('tmp:ext'),
    body: (p) => {
      const d = OD.resolve('tmp:ext');
      if (p.pid && d._pid !== p.pid) { const P = OD.person(p.pid); Object.assign(d, { _pid: p.pid, sn: P.sn, gn: P.gn.split(' ')[0], mid: P.gn.split(' ').slice(1).join(' '), dob: P.dob, g: P.g }); }
      if (p.q && d._q !== p.q) { const q = qOf(p.q); const { sn, gn } = OD.gen.parseName(q.crit.name || ''); Object.assign(d, { _q: p.q, sn, gn, g: q.crit.gender }); }
      d.svc = d.svc || 'INZ'; d.by = d.by || 'By Name';
      const seg = (k, opts) => `<div class="wseg" data-k="${k}">${opts.map((o) => `<button class="${d[k] === o ? 'on' : ''}" data-seg="${o}">${o}</button>`).join('')}</div>`;
      const inp = (k, l, rq, type = 'text') => `<div class="wf"><label>${l}${rq ? ' <span class="rq">*</span>' : ''}</label><input type="${type}" data-k="${k}" value="${esc(d[k] || '')}"></div>`;
      let h = `<div class="web"><div class="wh">Query External Agency</div><div class="wf"><label>External Agency Service <span class="rq">*</span></label>${seg('svc', ['INZ', 'DIA Passports', 'DIA Births'])}</div>`;
      if (d.svc === 'DIA Passports') h += `<div class="wf"><label>DIA Passport Query Options <span class="rq">*</span></label>${seg('by', ['By Name', 'By Passport #'])}</div>`;
      if (d.svc === 'DIA Passports' && d.by === 'By Passport #') h += inp('passport', 'Passport Number', 1);
      else h += inp('sn', 'Surname', 1) + inp('gn', 'First Name', 1) + inp('mid', 'Middle Name(s)') + inp('dob', 'Date of Birth', 1, 'date') + `<div class="wf"><label>Gender <span class="rq">*</span></label>${seg('g', ['Female', 'Male', 'Unknown'])}</div>`;
      h += `<div class="wf"><label>User Reason <span class="rq">*</span></label><select data-k="reason"><option value="">Choose One</option>${OD.lists.userReasons.map((r) => `<option ${d.reason === r ? 'selected' : ''}>${esc(r)}</option>`).join('')}</select></div><button class="wbtn" data-act="extRun">🔍 Run Query</button><button class="wbtn ghost" data-act="extReset">↻ Reset</button><div class="para small grey">Police can only query and access information from external agencies for law enforcement purposes. You will have to select a reason for every search you complete. The globe icon signifies you are leaving OnDuty to access different websites.</div></div>`;
      return h;
    },
  });
  action('extReset', (d, el, ctx) => { OD.tmp.ext = {}; N.refresh(ctx.u); });
  action('extRun', (d, el, ctx) => {
    const x = OD.resolve('tmp:ext');
    if (!x.reason) return OD.ui.alert({ title: 'User Reason required', msg: 'You must select a reason for every search you complete.' });
    if (!(x.passport || (x.sn && x.gn))) return OD.ui.toast('Complete the required fields');
    N.push('ext-results', { svc: x.svc, sn: x.sn || '', gn: x.gn || '', dob: x.dob || '', g: x.g || '', pass: x.passport || '' });
  });
  const extTitle = { INZ: 'Immigration (INZ)', 'DIA Passports': 'DIA Passports', 'DIA Births': 'DIA Births' };
  screen('ext-results', {
    title: 'Query Results', cls: '',
    body: (p) => `<div class="web"><div class="wh">Showing 1 result from ${esc(extTitle[p.svc])}</div><div class="wres" data-go="${OD.go('ext-result', p)}"><div style="width:56px;height:66px;border-radius:4px;overflow:hidden">${OD.silhouette()}</div><div style="flex:1"><b>${esc((p.sn || 'SMITH').toUpperCase())}, ${esc((p.gn || '').toUpperCase())}</b><div style="color:#666;font-size:12px">${esc(p.dob ? F.dmy(p.dob) : '27/07/1964')} · ${esc(p.g || 'Unknown')}</div><div style="color:#666;font-size:12px">${p.svc === 'INZ' ? 'Client ID: 1234 5678 (demo)' : p.svc === 'DIA Births' ? 'Birth Registration #: 1987/012345 (demo)' : 'Passport: LA123456 (demo)'}</div></div><span style="color:#1f7b83">${I.chev}</span></div></div>`,
  });
  screen('ext-result', {
    title: (p) => `Identity: ${esc(extTitle[p.svc] || 'INZ')}`,
    cls: '',
    body: (p) => {
      const P = p.pid ? OD.person(p.pid) : null;
      const sn = (P ? P.sn : p.sn || 'SMITH').toUpperCase(), gn = (P ? P.gn : p.gn || '').toUpperCase(), dob = P ? P.dob : p.dob || '1964-07-27', g = P ? P.g : p.g || 'Female';
      let rows = [['Gender', g], ['Date of Birth', `${F.dmy(dob)} (${F.age(dob)})`]];
      if (p.svc === 'DIA Passports') rows = rows.concat([['Passport Number', p.pass || 'LA123456'], ['Height', '1.64 (metres)'], ['Birth Country', 'NEW ZEALAND'], ['Expiry', F.dmy(`${new Date().getFullYear() + 4}-02-01`)]]);
      else if (p.svc === 'DIA Births') rows = rows.concat([['Family Name', sn], ['Given Name(s)', gn], ['Country of Birth', 'New Zealand'], ['Place of Birth', 'Auckland'], ['Birth Registration #', '1987/012345']]);
      else rows = rows.concat([['Country of Birth', '(NZ) New Zealand'], ['Nationality', '(NZ) New Zealand'], ['Client Status', 'In'], ['Client ID', '1234 5678'], ['INZ Fingerprints Held', 'No']]);
      return `<div class="web"><div class="wh">${esc(extTitle[p.svc] || 'INZ')} – demo data</div><div style="display:flex;gap:12px;padding:12px"><div style="width:70px;height:84px">${OD.silhouette()}</div><div><b style="color:#1f7b83">${esc(sn)}, ${esc(gn)}</b></div></div>${p.svc === 'DIA Passports' ? '<div class="issued">✓ ISSUED<br><small style="font-weight:400">Passport is valid for travel. The status is not shown if a passport is STOLEN – passport results are NOT checked against passport numbers in NIA.</small></div>' : ''}<table>${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>${esc(v)}</td></tr>`).join('')}</table>${p.svc === 'INZ' ? `<div class="wh" style="margin-top:10px;text-align:left">Address Details (1)</div><table><tr><td>Communication</td><td>${esc(P ? P.addr : '12 Harbour View Road, Wellington')}</td></tr></table>` : ''}</div>`;
    },
  });

  /* ===================================================================== MAPS */
  OD.mapSVG = (opts = {}) => {
    const sat = opts.type === 'Satellite';
    const bg = sat ? '#4a5a3c' : '#efebe3', minor = sat ? 'rgba(255,255,255,.35)' : '#fff', major = sat ? 'rgba(255,220,150,.75)' : '#f6c67c', park = sat ? '#3d5a2f' : '#cfe6c1', water = sat ? '#23445e' : '#aad3f5', block = sat ? '#5b6650' : '#e6e0d4';
    const lbl = (x, y, t, r = 0) => `<text x="${x}" y="${y}" transform="rotate(${r} ${x} ${y})" font-size="9" fill="${sat ? '#eee' : '#7d7466'}" font-family="Helvetica, Arial" letter-spacing="1">${t}</text>`;
    const blocks = [];
    for (let x = 10; x < 330; x += 64) for (let y = 12; y < 700; y += 76) blocks.push(`<rect x="${x}" y="${y}" width="52" height="62" rx="3" fill="${block}"/>`);
    return `<svg class="base" viewBox="0 0 400 700" preserveAspectRatio="xMidYMid slice"><rect width="400" height="700" fill="${bg}"/>${blocks.join('')}<rect x="138" y="240" width="116" height="138" rx="6" fill="${park}"/><path d="M330 0H400V700H350Q325 520 345 360Q360 200 330 0Z" fill="${water}"/><g stroke="${minor}" stroke-width="9" fill="none">${[70, 134, 198, 262, 326].map((x) => `<path d="M${x - 6} 0V700"/>`).join('')}${[82, 158, 234, 310, 386, 462, 538, 614].map((y) => `<path d="M0 ${y - 7}H340"/>`).join('')}</g><g stroke="${major}" stroke-width="15" fill="none" stroke-linecap="round"><path d="M-10 420 Q120 400 190 300 T320 40"/><path d="M200 -10V710"/><path d="M-10 610H340"/></g>${lbl(206, 150, 'MOLESWORTH ST', 90)}${lbl(40, 405, 'THORNDON QUAY', -12)}${lbl(10, 603, 'MULGRAVE ST')}${lbl(12, 73, 'BLUE ST')}${lbl(12, 227, 'GREEN RD')}${lbl(12, 379, 'NAVY PL')}${lbl(12, 531, 'YELLOW ST')}${lbl(143, 312, 'BOTANIC PARK')}${lbl(340, 330, 'HARBOUR', 90)}</svg>`;
  };
  screen('ql-map', {
    title: 'Nearby',
    left: '<button class="nb" data-back>Done</button>',
    right: '<button class="nb" data-act="openMaps">Open in Maps</button>',
    cls: '', noPad: true,
    body: (p, ctx) => {
      const locs = Object.values(OD.db.locations).filter((l) => !l.gen);
      const sel = ctx.e.sel;
      return `<div class="map" style="position:absolute;inset:0" data-act="mapTap">${OD.mapSVG()}<div class="map-top">1,485 locations, 42 with alerts</div>${locs.map((l) => `<span class="lpin ${l.alerts.length ? 'alert' : ''} ${sel === l.id ? 'sel' : ''}" style="left:${l.x}%;top:${l.y}%" data-act="mapPick" data-a="${l.id}">${l.type === 'Intersection' ? '✚' : l.alerts.length ? '!' : ''}</span>`).join('')}<span class="locdot" style="left:58%;top:36%"></span>${sel ? `<div class="map-bubble" style="left:${OD.location(sel).x}%;top:${OD.location(sel).y}%">${esc(OD.location(sel).addr.split(',').slice(0, 2).join(','))}</div>` : ''}<div class="map-bottom"><button class="plain" data-back>Cancel</button><button data-act="mapSelect">Select</button></div></div>`;
    },
  });
  action('openMaps', () => OD.ui.toast('Would open the Apple Maps app (not included)'));
  action('mapPick', (d, el, ctx) => { ctx.e.sel = d.a; N.refresh(ctx.u); });
  action('mapTap', (d, el, ctx) => { OD.ui.toast('Tap a location marker, or tap the map to search in a different location'); });
  action('mapSelect', (d, el, ctx) => {
    const id = ctx.e.sel; if (!id) return OD.ui.toast('Select a location on the map');
    const p = ctx.p;
    if (p.mode === 'pick') { const pw = OD.db.paperwork[p.id]; const l = OD.location(id); pw.loc[p.k] = { ...(pw.loc[p.k] || {}), lid: id, addr: l.addr }; OD.save(); N.popTo('pw'); return; }
    const t = OD.resolve('tmp:ql'); t.mode = 'Quick Entry'; t.quick = OD.location(id).addr.split(',').slice(0, 2).join(' ');
    N.pop(); OD.ui.toast('Location selected – tap Run to perform the search');
  });

  // TCR crash location map
  screen('crash-map', {
    title: 'Crash Location', back: 'Location', cls: '', noPad: true,
    body: (p, ctx) => {
      const pw = OD.db.paperwork[p.id]; const cur = ctx.e.pt || pw.loc.loc?.coords;
      return `<div class="map" style="position:absolute;inset:0" data-act="crashTap">${OD.mapSVG()}<span class="locdot" style="left:52%;top:46%"></span>${cur ? `<div class="pin" style="left:${cur.x}%;top:${cur.y}%">${I.pinDrop}</div>` : ''}<div class="map-bubble" style="left:${cur ? cur.x : 52}%;top:${cur ? cur.y - 6 : 42}%">${cur ? 'New Crash Location' : 'Set New Crash Location'}</div><div class="map-acc">Accuracy (m) - Current: ${cur ? '5' : 'Not Set'} | GPS: 4.57 | ${cur ? esc(cur.text) : '-41.2786, 174.7772'}</div><div class="map-bottom"><button class="plain" data-back>Cancel</button><button data-act="crashSelect">Select</button></div></div>`;
    },
  });
  action('crashTap', (d, el, ctx, ev) => {
    const box = el.getBoundingClientRect();
    const x = ((ev.clientX - box.left) / box.width) * 100, y = ((ev.clientY - box.top) / box.height) * 100;
    ctx.e.pt = { x: +x.toFixed(1), y: +y.toFixed(1), text: `${(-41.27 - y / 4000).toFixed(5)}, ${(174.77 + x / 4000).toFixed(5)}` };
    N.refresh(ctx.u);
  });
  action('crashSelect', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; const pt = ctx.e.pt || pw.loc.loc?.coords; if (!pt) return OD.ui.toast('Tap the map to set the crash location'); pw.loc.loc = pw.loc.loc || {}; pw.loc.loc.coords = pt; OD.save(); N.pop(); });

  // TCR damage location
  const ZONES = [['Front', 'M40 30 Q115 -5 190 30 L190 70 L40 70Z'], ['Front Left', 'M10 70 L40 70 L40 150 L10 150Z'], ['Front Right', 'M190 70 L220 70 L220 150 L190 150Z'], ['Bonnet', 'M40 70 L190 70 L180 130 L50 130Z'], ['Roof', 'M50 150 L180 150 L180 260 L50 260Z'], ['Left Side', 'M10 150 L40 150 L40 290 L10 290Z'], ['Right Side', 'M190 150 L220 150 L220 290 L190 290Z'], ['Boot', 'M50 290 L180 290 L190 340 L40 340Z'], ['Rear Left', 'M10 290 L40 290 L40 350 L10 350Z'], ['Rear Right', 'M190 290 L220 290 L220 350 L190 350Z'], ['Rear', 'M40 340 L190 340 Q115 385 40 340Z']];
  screen('damage', {
    title: 'Specific Damage Location',
    target: (p) => OD.resolve(p.t),
    body: (p) => {
      const d = OD.resolve(p.t) || {}; const z = d.zones || [];
      return `<div class="dmg"><svg viewBox="0 0 230 400"><text x="115" y="12" class="lab" text-anchor="middle">FRONT</text>${ZONES.map(([n, path]) => `<path d="${path}" class="z ${z.includes(n) ? 'on' : ''}" data-act="dmgZone" data-a="${n}"/>`).join('')}<rect x="55" y="132" width="120" height="16" rx="4" fill="#fff" opacity=".8"/><rect x="55" y="262" width="120" height="16" rx="4" fill="#fff" opacity=".8"/><text x="115" y="396" class="lab" text-anchor="middle">BACK</text></svg><div style="position:absolute;left:8px;top:45%;font-size:11px;font-weight:700;writing-mode:vertical-rl;text-orientation:upright">LEFT</div><div style="position:absolute;right:8px;top:45%;font-size:11px;font-weight:700;writing-mode:vertical-rl;text-orientation:upright">RIGHT</div></div><div class="footnote" style="text-align:center">Tap the areas of the vehicle that were damaged.${z.length ? ' Selected: ' + esc(z.join(', ')) : ''}</div><button class="bigbtn" data-back>Save</button>`;
    },
  });
  action('dmgZone', (d, el, ctx) => { const t = OD.resolve(ctx.p.t); t.zones = t.zones || []; const i = t.zones.indexOf(d.a); if (i >= 0) t.zones.splice(i, 1); else t.zones.push(d.a); OD.save(); N.refresh(ctx.u); });

  // TCR crash diagram
  const PAL = [['car', (c) => I.carTop(c || '#3a8def')], ['truck', () => '<svg viewBox="0 0 24 60" width="18" height="44"><rect x="2" y="2" width="20" height="16" rx="3" fill="#3a8def"/><rect x="1" y="20" width="22" height="38" rx="2" fill="#5ba2f2"/></svg>'], ['bike', () => '<svg viewBox="0 0 20 44" width="14" height="32"><rect x="8" y="2" width="4" height="40" rx="2" fill="#1f56c4"/><rect x="3" y="14" width="14" height="3" rx="1.5" fill="#1f56c4"/></svg>'], ['ped', () => '<svg viewBox="0 0 20 30" width="16" height="24"><circle cx="10" cy="5" r="4" fill="#333"/><path d="M10 10v10M4 14h12M10 20l-5 9M10 20l5 9" stroke="#333" stroke-width="2.4" stroke-linecap="round"/></svg>'], ['tree', () => '<svg viewBox="0 0 30 30" width="26" height="26"><circle cx="15" cy="15" r="13" fill="#4caf50" stroke="#2e7d32" stroke-width="2"/></svg>'], ['sign', () => '<svg viewBox="0 0 30 30" width="24" height="24"><polygon points="9,1 21,1 29,9 29,21 21,29 9,29 1,21 1,9" fill="#e53935"/><text x="15" y="19" font-size="8" text-anchor="middle" fill="#fff" font-weight="700">STOP</text></svg>'], ['pole', () => '<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="8" fill="#8d6e63"/></svg>'], ['arrow', () => '<svg viewBox="0 0 20 40" width="14" height="30"><path d="M10 38V6M3 12l7-8 7 8" stroke="#ec2227" stroke-width="3" fill="none" stroke-linecap="round"/></svg>']];
  screen('crash-diagram', {
    title: (p) => { const d = OD.db.paperwork[p.id].d.diagram || {}; return `<div class="navseg" data-k="mode"><button data-seg="Blank" class="${d.mode === 'Blank' ? 'on' : ''}">Blank</button><button data-seg="Map" class="${d.mode !== 'Blank' ? 'on' : ''}">Map</button></div>`; },
    back: 'TCR',
    right: `<button class="nb icon" data-act="diagUndo">${I.undo}</button>`,
    target: (p) => { const pw = OD.db.paperwork[p.id]; pw.d.diagram = pw.d.diagram || { mode: 'Map', objs: [] }; return pw.d.diagram; },
    cls: '', noPad: true,
    body: (p) => {
      const pw = OD.db.paperwork[p.id]; const d = (pw.d.diagram = pw.d.diagram || { mode: 'Map', objs: [] });
      const vehs = (pw.v.vehicles || []).map((e) => OD.vehicle(e.vid)).filter(Boolean);
      const drawn = d.objs.map((o, i) => `<div class="obj" data-i="${i}" style="left:${o.x}%;top:${o.y}%;transform:translate(-50%,-50%) rotate(${o.r || 0}deg)">${o.kind === 'veh' ? I.carTop(OD.vehicle(o.vid)?.hex === '#fff' ? '#9aa0a8' : OD.vehicle(o.vid)?.hex || '#3a8def', OD.vehicle(o.vid)?.rego) : (PAL.find((x) => x[0] === o.kind) || PAL[0])[1]()}</div>`).join('');
      return `<div style="display:flex;flex-direction:column;height:100%"><div class="diag"><div class="canvas ${d.mode === 'Blank' ? 'blank' : 'map'}">${d.mode === 'Blank' ? '' : OD.mapSVG()}</div><span class="nts">NOT TO SCALE</span><div class="objs" style="position:absolute;inset:0">${drawn}</div></div><div class="palette">${vehs.map((v) => `<button data-act="diagAdd" data-a="veh|${v.id}" title="${esc(v.rego)}">${I.carTop(v.hex === '#fff' ? '#9aa0a8' : v.hex, v.rego)}</button>`).join('')}${PAL.map(([k, f]) => `<button data-act="diagAdd" data-a="${k}|">${f()}</button>`).join('')}<div class="ptabs"><span style="font-size:11px;color:#8a8a8f">Drag to move · double-tap to rotate · drag off the canvas to delete</span></div></div></div>`;
    },
    mount: (el, p) => {
      const pw = OD.db.paperwork[p.id]; const d = pw.d.diagram; const box = el.querySelector('.diag'); if (!box) return;
      let drag = null, lastTap = 0;
      box.addEventListener('pointerdown', (ev) => { const o = ev.target.closest('.obj'); if (!o) return; ev.preventDefault(); o.setPointerCapture(ev.pointerId); drag = { o, i: +o.dataset.i }; const now = Date.now(); if (now - lastTap < 300) { d.objs[drag.i].r = ((d.objs[drag.i].r || 0) + 45) % 360; OD.save(); OD.nav.refresh(); drag = null; } lastTap = now; });
      box.addEventListener('pointermove', (ev) => { if (!drag) return; const r = box.getBoundingClientRect(); const x = ((ev.clientX - r.left) / r.width) * 100, y = ((ev.clientY - r.top) / r.height) * 100; drag.o.style.left = x + '%'; drag.o.style.top = y + '%'; drag.x = x; drag.y = y; });
      box.addEventListener('pointerup', () => { if (!drag) return; if (drag.x !== undefined) { if (drag.x < -2 || drag.x > 102 || drag.y < -2 || drag.y > 102) d.objs.splice(drag.i, 1); else { d.objs[drag.i].x = +drag.x.toFixed(1); d.objs[drag.i].y = +drag.y.toFixed(1); } OD.save(); } drag = null; });
    },
  });
  action('diagAdd', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; const [kind, vid] = d.a.split('|'); pw.d.diagram.objs.push({ kind: vid ? 'veh' : kind, vid, x: 40 + Math.random() * 20, y: 35 + Math.random() * 20, r: 0 }); OD.save(); N.refresh(ctx.u); });
  action('diagUndo', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; pw.d.diagram.objs.pop(); OD.save(); N.refresh(ctx.u); });
})();
