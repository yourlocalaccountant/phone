/* =========================================================================
   OnDuty recreation – paperwork engine, folders and shared paperwork screens
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav, val = OD.val;
  const screen = OD.screen, action = OD.action;

  /* ================================================================ FOLDERS */
  const FD = (OD.folders = {});
  FD.get = (id) => OD.db.folders.find((f) => f.id === id);
  FD.create = (o = {}) => {
    const f = { id: o.id || OD.uid('fo'), ts: o.ts || Date.now(), code: o.code || '', card: o.card || '', loc: o.loc || '', name: o.name || '', items: [], shared: [], owner: OD.db.me.qid };
    OD.db.folders.push(f);
    OD.db.home.push({ id: OD.uid('h'), k: 'folder', ref: f.id, ts: f.ts });
    OD.save();
    return f;
  };
  FD.add = (fid, item) => {
    const f = FD.get(fid); if (!f) return;
    if (!f.items.some((x) => x.k === item.k && x.id === item.id)) f.items.push(item);
    const h = OD.db.home.find((x) => x.k === 'folder' && x.ref === fid); if (h && !OD.seeding) h.ts = Date.now();
    OD.save();
  };
  FD.title = (f) => f.name || (f.card ? `${F.hm(new Date(f.ts))} - ${f.code}` : F.stamp(f.ts));
  FD.chips = (f) => {
    const out = []; const counts = {};
    f.items.forEach((it) => {
      if (it.k === 'pw') { const pw = OD.db.paperwork[it.id]; if (!pw) return; const k = pw.type; counts[k] = (counts[k] || 0) + 1; }
      if (it.k === 'q') { const q = OD.db.queries.find((x) => x.id === it.id); if (!q) return; counts['Q:' + q.type] = (counts['Q:' + q.type] || 0) + 1; }
    });
    Object.entries(counts).forEach(([k, n]) => {
      if (k.startsWith('Q:')) out.push(n > 1 ? `Q x ${n}` : k.slice(2));
      else if (n > 1) out.push(`${k} x ${n}`);
      else { const pw = f.items.map((it) => it.k === 'pw' && OD.db.paperwork[it.id]).find((p) => p && p.type === k); const sub = pw && OD.pwSubject(pw, true); out.push(sub ? `${k} - ${sub}` : k); }
    });
    return out;
  };
  FD.square = (f) => {
    if (f.card) return f.code;
    const types = [...new Set(f.items.filter((i) => i.k === 'pw').map((i) => OD.db.paperwork[i.id]?.type).filter(Boolean))];
    if (types.length === 1) return types[0];
    if (types.length > 1) return '';
    const qt = [...new Set(f.items.filter((i) => i.k === 'q').map((i) => OD.db.queries.find((q) => q.id === i.id)?.type).filter(Boolean))];
    return qt.length === 1 ? qt[0] : '';
  };

  /* ============================================================== PAPERWORK */
  OD.defType = (code, def) => {
    def.code = code;
    OD.types[code] = def;
    // auto-generate the occurrence form for the type
    def.sections.filter((s) => s.t === 'fields').forEach((s) => (OD.forms['inline-' + code + '-' + secKey(s)] = { fields: s.fields }));
    const occ = def.sections.find((s) => s.t === 'occ');
    if (occ) {
      OD.forms['occ-' + code] = {
        title: occ.title || 'Occurrence Details',
        init: (d) => { if (!d.station) d.station = OD.db.settings.reporting; },
        fields: [
          { h: occ.dateHeader || 'DATE AND TIME' },
          ...(occ.between ? [{ seg: 'mode', l: occ.l.replace(/ On:?$/, '').replace(/:$/, ''), o: ['On', 'Between'] }] : []),
          { dt: 'date', l: occ.between ? 'Date|Time' : (occ.l || '').replace(/:$/, '') },
          ...(occ.between ? [{ dt: 'date2', l: 'And', w: (d) => d.mode === 'Between' }] : []),
          ...(occ.fields || []),
          ...(occ.noStation ? [] : [{ h: 'FILE INFORMATION' }, { pk: 'station', l: 'Reporting Station', o: 'stations' }]),
        ],
      };
    }
    return def;
  };
  const secKey = (s) => s.k || { persons: 'persons', vehicles: 'vehicles', orgs: 'orgs', loc: 'loc', photos: 'photos' }[s.t] || s.t;
  OD.secKey = secKey;

  OD.pwSubject = (pw, short) => {
    const ps = OD.pwPersonIds(pw);
    if (ps.length === 1) { const p = OD.person(ps[0]); return p ? (short ? p.sn : p.sn) : ''; }
    if (ps.length > 1) return short ? `${ps.length} persons` : `${ps.length} persons`;
    const loc = Object.values(pw.loc || {}).find((l) => l && l.addr);
    if (loc && !short) return loc.addr;
    const vs = Object.values(pw.v || {}).flat();
    if (vs.length) return OD.vehicle(vs[0].vid)?.rego || '';
    return '';
  };
  OD.pwPersonIds = (pw) => { if (!pw) return []; const out = []; Object.values(pw.p || {}).forEach((arr) => (arr || []).forEach((e) => e.pid && !out.includes(e.pid) && out.push(e.pid))); return out; };
  OD.pwVehicleIds = (pw) => { const out = []; Object.values(pw?.v || {}).forEach((arr) => (arr || []).forEach((e) => e.vid && !out.includes(e.vid) && out.push(e.vid))); return out; };
  OD.pwFirstPerson = (pw) => OD.person(OD.pwPersonIds(pw)[0]);

  OD.pwNew = (type, opts = {}) => {
    const T = OD.types[type]; const now = Date.now();
    const pw = { id: opts.id || OD.uid('pw'), type, created: opts.created || now, updated: now, status: 'Incomplete', qid: OD.db.me.qid, folder: opts.folder || null, card: '', occ: {}, loc: {}, p: {}, v: {}, o: {}, off: [], photos: {}, d: {}, l: {}, val: {}, links: [], notice: {}, owners: {} };
    if (T.occNow) { const d = new Date(opts.created || now); pw.occ.date = F.iso(d); pw.occ.date_t = F.hm(d); }
    pw.occ.station = OD.db.settings.reporting;
    if (opts.occ) Object.assign(pw.occ, opts.occ);
    OD.db.paperwork[pw.id] = pw;
    T.init && T.init(pw, opts);
    if (opts.src) OD.pwPrefill(pw, opts.src);
    if (opts.from) OD.pwCopyFrom(pw, OD.db.paperwork[opts.from]);
    if (!pw.folder || !FD.get(pw.folder)) {
      const src = opts.src || '';
      const f = FD.create({ ts: pw.created, code: type });
      pw.folder = f.id;
      if (src.startsWith('card:')) { const ce = OD.db.cardEvents.find((c) => c.no === src.slice(5)); if (ce) { f.card = ce.no; f.code = ce.code; } }
    }
    FD.add(pw.folder, { k: 'pw', id: pw.id });
    OD.db.lastUsed = [type, ...OD.db.lastUsed.filter((x) => x !== type)].slice(0, 3);
    OD.save();
    return pw;
  };
  const firstSec = (T, t) => T.sections.find((s) => s.t === t);
  OD.pwAddObj = (pw, kind, k, id, extra = {}) => {
    const bucket = kind === 'person' ? 'p' : kind === 'vehicle' ? 'v' : 'o';
    const idKey = kind === 'person' ? 'pid' : kind === 'vehicle' ? 'vid' : 'oid';
    const T = OD.types[pw.type];
    const s = T.sections.find((x) => ({ person: 'persons', vehicle: 'vehicles', org: 'orgs' }[kind] === x.t) && secKey(x) === k);
    const arr = (pw[bucket][k] = pw[bucket][k] || []);
    if (arr.some((e) => e[idKey] === id)) return null;
    if (s && s.max && arr.length >= s.max) { if (s.max === 1) arr.length = 0; else { OD.ui.alert({ title: 'Limit reached', msg: `Up to ${s.max} can be added to this section.` }); return null; } }
    const e = { id: OD.uid('pe'), [idKey]: id, ...extra };
    if (s && s.role) e.role = s.role;
    arr.push(e); pw.updated = Date.now(); OD.save();
    return e;
  };
  OD.pwPrefill = (pw, src) => {
    const T = OD.types[pw.type];
    const [kind, id] = src.split(':');
    if (kind === 'person') { const s = firstSec(T, 'persons'); s && OD.pwAddObj(pw, 'person', secKey(s), id); }
    if (kind === 'vehicle') { const s = firstSec(T, 'vehicles'); s && OD.pwAddObj(pw, 'vehicle', secKey(s), id); }
    if (kind === 'org') { const s = firstSec(T, 'orgs'); s && OD.pwAddObj(pw, 'org', secKey(s), id); }
    if (kind === 'location') { const s = firstSec(T, 'loc'); const l = OD.location(id); if (s && l) pw.loc[secKey(s)] = { lid: id, addr: l.addr }; }
    if (kind === 'card') { pw.card = id; const ce = OD.db.cardEvents.find((c) => c.no === id); const s = firstSec(T, 'loc'); if (ce && s && ce.loc) pw.loc[secKey(s)] = { lid: ce.loc, addr: OD.location(ce.loc).addr }; }
    T.prefill && T.prefill(pw, kind, id);
  };
  OD.pwCopyFrom = (pw, from) => {
    if (!from) return;
    const T = OD.types[pw.type];
    if (from.card && firstSec(T, 'card')) pw.card = from.card;
    if (from.occ?.date) { pw.occ.date = from.occ.date; pw.occ.date_t = from.occ.date_t; }
    const fl = Object.values(from.loc || {}).find((l) => l && l.addr); const ls = firstSec(T, 'loc');
    if (fl && ls) pw.loc[secKey(ls)] = { lid: fl.lid, addr: fl.addr };
    const ps = firstSec(T, 'persons');
    if (ps) OD.pwPersonIds(from).slice(0, ps.max || 99).forEach((pid) => OD.pwAddObj(pw, 'person', secKey(ps), pid));
    const vs = firstSec(T, 'vehicles');
    if (vs) OD.pwVehicleIds(from).slice(0, vs.max || 99).forEach((vid) => OD.pwAddObj(pw, 'vehicle', secKey(vs), vid));
    pw.folder = from.folder;
  };

  /* --------------------------------------------------------- section status */
  const occForm = (pw) => 'occ-' + pw.type;
  OD.secStatus = (pw, s) => {
    const k = secKey(s);
    const segs = [];
    const fs = (fid, d) => OD.formStatus(fid, d, pw);
    switch (s.t) {
      case 'card': segs.push(!!pw.card); break;
      case 'occ': { const st = fs(occForm(pw), pw.occ); segs.push(!!pw.occ.date, !!pw.occ.date_t); if (st !== 'none') segs.push(st === 'done'); break; }
      case 'loc': { const l = pw.loc[k]; if (l && (l.addr || s.direct)) { segs.push(!!l.addr); if (s.f) segs.push(fs(s.f, l) === 'done'); } break; }
      case 'persons': case 'vehicles': case 'orgs': {
        const b = s.t === 'persons' ? 'p' : s.t === 'vehicles' ? 'v' : 'o';
        (pw[b][k] || []).forEach((e) => segs.push(!s.f || fs(s.f, e) === 'done'));
        break;
      }
      case 'offences': pw.off.filter((o) => !s.k || o.k === s.k).forEach((o) => segs.push(!s.f || fs(offForm(pw, s, o), o) === 'done')); break;
      case 'sub': case 'fields': { const st = fs(s.f || 'inline-' + pw.type + '-' + k, pw.d[k]); if (st !== 'none') segs.push(st === 'done'); if (st === 'partial') segs.push(false); break; }
      case 'list': (pw.l[k] || []).forEach((e) => segs.push(fs(s.f, e) === 'done')); break;
      case 'photos': (pw.photos[k] || []).length && segs.push(true); break;
      case 'value': segs.push(!!pw.val[k]); break;
      case 'notice': segs.push(!!pw.notice.revealed); break;
      case 'links': if (pw.links.length) segs.push(true); break;
      case 'custom': return s.status ? s.status(pw) : { st: 'none', segs: [] };
      default: break;
    }
    const min = s.min || (val(s.req, pw) && ['persons', 'vehicles', 'orgs', 'offences', 'list'].includes(s.t) ? 1 : 0);
    let st = 'none';
    if (segs.length) st = segs.every(Boolean) ? 'done' : segs.some(Boolean) ? 'partial' : 'partial';
    if (st === 'done' && min && segs.length < min) st = 'partial';
    return { st, segs };
  };
  const offForm = (pw, s, o) => (typeof s.f === 'function' ? s.f(o, pw) : s.f);
  OD.pwErrors = (pw) => {
    const T = OD.types[pw.type]; const errs = [];
    T.sections.forEach((s) => {
      if (s.w && !s.w(pw)) return;
      if (!val(s.req, pw)) return;
      const { st } = OD.secStatus(pw, s);
      const name = (s.h || '').charAt(0) + (s.h || '').slice(1).toLowerCase();
      if (st !== 'done') errs.push({ sec: s, msg: `${name} ${st === 'none' ? 'is required' : 'is incomplete'}` });
    });
    (T.validate ? T.validate(pw) : []).forEach((m) => errs.push({ msg: m }));
    return errs;
  };

  /* ------------------------------------------------------- section renderers */
  const addRow = (label, attrs) => `<div class="row add" ${attrs}>${esc(label)}</div>`;
  const goAttr = (s, p) => `data-go="${OD.go(s, p)}"`;
  const rmBtn = (ref) => ({ label: 'Remove', act: 'pwRemove', a: ref });
  const SEC = {};
  SEC.card = (pw, s, lock) => pw.card ? `<div class="row" ${lock ? '' : goAttr('card-event', { id: pw.id })}><div class="grow" style="font-size:15px">${esc(pw.card)}</div>${lock ? '' : `<span class="chev">${I.chev}</span>`}</div>` : lock ? '<div class="row center" style="color:#999">No CARD Event</div>' : addRow('+ Card Event', goAttr('card-event', { id: pw.id }));
  SEC.occ = (pw, s, lock) => {
    const go = lock ? '' : goAttr('form', { t: `pw:${pw.id}:occ`, f: occForm(pw) });
    if (!pw.occ.date && s.add) return addRow(s.add, go);
    const v = pw.occ.date ? F.occ(pw.occ.date, pw.occ.date_t) : 'Date and Time Required';
    return `<div class="row" ${go}><div class="grow"><div class="lbl">${esc(s.l || 'Occurred On:')}</div><div class="val ${pw.occ.date ? 'dark' : ''}" style="text-align:center;font-size:${pw.occ.date ? 15 : 14}px">${esc(v)}${s.l2 && pw.occ.mode === 'Between' && pw.occ.date2 ? '<br>and ' + esc(F.occ(pw.occ.date2, pw.occ.date2_t)) : ''}</div></div>${lock ? '' : `<span class="chev">${I.chev}</span>`}</div>`;
  };
  SEC.loc = (pw, s, lock) => {
    const k = secKey(s); const l = pw.loc[k];
    const form = s.f || 'loc-generic';
    if (!l || (!l.addr && !s.direct)) {
      if (lock) return '<div class="row center" style="color:#999">No location</div>';
      return addRow(s.add || '+ Location', s.direct ? `data-act="pwLocDirect" data-a="${k}" data-f="${form}"` : goAttr('sel-loc', { id: pw.id, k }));
    }
    const go = lock ? '' : goAttr('form', { t: `pw:${pw.id}:loc.${k}`, f: form, rm: 1 });
    if (s.pinStyle) return `<div class="row" ${go}><span class="circ" style="background:#8e8e93;display:flex;align-items:center;justify-content:center;width:28px;height:28px"><svg width="12" height="16" viewBox="0 0 12 16"><path d="M6 0C2.7 0 0 2.6 0 5.8 0 10.2 6 16 6 16s6-5.8 6-10.2C12 2.6 9.3 0 6 0z" fill="#fff"/></svg></span><div class="grow" style="font-weight:600">AT ${esc(l.addr || 'Location Specified')}</div><span class="chev">${I.chev}</span></div>`;
    return `<div class="row" ${go}><div class="grow"><div class="lbl">${esc(s.label || 'Location Details:')}</div><div class="kv-k" style="font-size:14px">${esc(l.addr || 'Location Specified')}</div></div>${lock ? '' : `<span class="chev">${I.chev}</span>`}</div>`;
  };
  SEC.persons = (pw, s, lock) => {
    const k = secKey(s); const arr = pw.p[k] || [];
    const rows = arr.map((e) => {
      const p = OD.person(e.pid); if (!p) return '';
      const go = lock ? '' : OD.link('form', { t: `pw:${pw.id}:p.${k}#${e.id}`, f: s.f || 'pw-person', rm: 1 });
      const sub = [p.g, F.age(p.dob)].join(', ') + (s.safvr && p.safvr ? '' : '') + (e.role ? ` · ${e.role}` : '');
      const card = `<div class="card ${lock ? '' : ''}" ${go ? `data-go="${esc(go)}"` : ''} style="align-items:center"><div class="ph sm">${p.photoless ? OD.silhouette() : OD.avatar(p.id, p.g)}</div><div class="info"><div class="nm">${esc(OD.fullName(p))}</div><div class="sub">${esc(sub)}${s.safvr && p.safvr ? `, SAFVR - <span style="color:${p.safvr === 'Low' ? 'var(--green)' : 'var(--orange)'}">${esc(p.safvr)}</span>` : ''}${p.isNew ? ' · <span style="color:var(--orange)">New person</span>' : ''}</div>${U.pills(p.alerts)}</div>${p.nzta ? `<span class="badge-r" style="bottom:auto;top:50%;transform:translateY(-50%);right:24px">${I.badge}</span>` : ''}${lock ? '' : `<span class="chev">${I.chev}</span>`}</div>`;
      return lock ? card : OD.swipeRow(card, { right: [rmBtn(`pw:${pw.id}:p.${k}#${e.id}`)] });
    }).join('');
    const canAdd = !lock && (!s.max || arr.length < s.max);
    return rows + (canAdd ? addRow(s.add || '+ Person', goAttr('sel-obj', { id: pw.id, kind: 'person', k, max: s.max || '' })) : '');
  };
  SEC.vehicles = (pw, s, lock) => {
    const k = secKey(s); const arr = pw.v[k] || [];
    const rows = arr.map((e) => {
      const v = OD.vehicle(e.vid); if (!v) return '';
      const go = lock ? '' : OD.link('form', { t: `pw:${pw.id}:v.${k}#${e.id}`, f: s.f || 'pw-vehicle', rm: 1 });
      const card = `${e.label ? `<div class="footnote" style="background:#fff;padding:4px 12px 0">${esc(e.label)}</div>` : ''}` + OD.vehicleCard(v, { go, inline: true });
      return lock ? card : OD.swipeRow(card, { right: [rmBtn(`pw:${pw.id}:v.${k}#${e.id}`)] });
    }).join('');
    if (lock) return rows;
    if (s.adds) return rows + s.adds.filter((a) => !arr.some((e) => e.label === a.replace('+ ', ''))).map((a) => addRow(a, goAttr('sel-obj', { id: pw.id, kind: 'vehicle', k, label: a.replace('+ ', '') }))).join('');
    return rows + (!s.max || arr.length < s.max ? addRow(s.add || '+ Vehicle', goAttr('sel-obj', { id: pw.id, kind: 'vehicle', k, max: s.max || '' })) : '');
  };
  SEC.orgs = (pw, s, lock) => {
    const k = secKey(s); const arr = pw.o[k] || [];
    const rows = arr.map((e) => {
      const g = OD.org(e.oid); if (!g) return '';
      const go = lock ? '' : OD.link('form', { t: `pw:${pw.id}:o.${k}#${e.id}`, f: s.f || 'pw-org', rm: 1 });
      const card = OD.orgCard(g, { go });
      return lock ? card : OD.swipeRow(card, { right: [rmBtn(`pw:${pw.id}:o.${k}#${e.id}`)] });
    }).join('');
    return rows + (!lock && (!s.max || arr.length < s.max) ? addRow(s.add || '+ Organisation', goAttr('sel-obj', { id: pw.id, kind: 'org', k, max: s.max || '' })) : '');
  };
  SEC.offences = (pw, s, lock) => {
    const list = pw.off.filter((o) => !s.k || o.k === s.k);
    const notesOnly = pw.locked === 'notes';
    const rows = list.map((o) => {
      const def = o.lib === 'nia' ? OD.data.niaByCode[o.code] : OD.data.lrtByCode[o.code];
      const fid = offForm(pw, s, o);
      const st = OD.formStatus(fid, o, pw);
      const go = lock && !notesOnly ? '' : OD.link('form', { t: `pw:${pw.id}:off#${o.id}`, f: fid, rm: lock ? '' : 1 });
      const res = (o.r && o.r.type) || o.res;
      const fee = def && def.fee && res !== 'Written Warning' ? `<div class="kv-v" style="font-size:13px">Fee: $${def.fee}</div>` : '';
      const comp = res === 'Compliance' && def?.comp ? '<div class="kv-v" style="font-size:12.5px;color:#333">Compliance: Compliance offered valid for 28 days.<br><br>Proof of compliance to be sent to the address on the notice using the notice number in the reference line.</div>' : '';
      const card = `<div class="row" ${go ? `data-go="${esc(go)}"` : ''} style="align-items:flex-start"><div class="grow"><div class="kv-k" style="font-weight:600;font-size:14px">${esc(o.code)} - ${esc(def ? def.desc : '')}</div>${(o.r && o.r.type) || o.res ? `<div class="kv-v" style="font-size:12.5px">${esc((o.r && o.r.type) || o.res)}</div>` : ''}${fee}${comp}</div>${go ? `<span class="chev">${I.chev}</span>` : ''}</div><div class="bar ${st === 'done' ? '' : ''}">${st === 'done' ? '<i class="ok"></i>' : st === 'partial' ? '<i class="ok"></i><i></i>' : '<i></i>'}</div>`;
      return lock ? card : OD.swipeRow(card, { right: [rmBtn(`pw:${pw.id}:off#${o.id}`)] });
    }).join('');
    const canAdd = !lock && (!s.max || list.length < s.max);
    return rows + (canAdd ? addRow(s.add || '+ Offence', s.lib === 'nia' ? goAttr('nia-lib', { id: pw.id, k: s.k || '' }) : goAttr('lib', { mode: 'add', id: pw.id })) : '');
  };
  SEC.links = (pw, s, lock) => {
    const ex = OD.pwExistingLinks(pw);
    const exist = ex.length ? ex.map((l) => `<div class="row" style="font-size:13px"><div class="grow">${esc(l)}</div></div>`).join('') : '<div class="row center" style="font-size:14px">No Existing Links</div>';
    const neu = pw.links.map((l, i) => `<div class="row" style="font-size:13px"><div class="grow">${esc(l.text)}</div>${lock ? '' : `<button class="nb red" data-act="pwLinkRm" data-a="${i}" style="font-size:13px">Remove</button>`}</div>`).join('');
    return exist + (s.noNew ? '' : `<div class="sh">NEW LINKS</div>${neu}${lock ? '' : addRow('+ New Link', goAttr('new-link', { id: pw.id }))}`);
  };
  SEC.photos = (pw, s, lock) => {
    const k = secKey(s); const arr = pw.photos[k] || [];
    const th = arr.length ? `<div class="photos">${arr.map((src, i) => `<div class="th"><img src="${src}" alt="">${lock ? '' : `<button data-act="pwPhotoRm" data-a="${k}|${i}">✕</button>`}</div>`).join('')}</div>` : '';
    const max = s.max || 15;
    return th + (!lock && arr.length < max ? addRow(s.add || '+ Photo', `data-act="pwPhoto" data-a="${k}" data-max="${max}"`) : '');
  };
  SEC.sub = (pw, s, lock) => {
    const k = secKey(s); const d = pw.d[k];
    const st = OD.formStatus(s.f, d, pw);
    const go = goAttr('form', { t: `pw:${pw.id}:d.${k}`, f: s.f });
    if (st === 'none' && !s.always) return lock ? '<div class="row center" style="color:#999">Not completed</div>' : addRow(s.add || '+ ' + (s.h || ''), go);
    const summary = val(s.done, d, pw) ?? `${(s.noun || s.h || '').replace(/^\w/, (c) => c.toUpperCase()).toLowerCase().replace(/^\w/, (c) => c.toUpperCase())} Specified`;
    return `<div class="row" ${go}><div class="grow" style="font-size:14px">${esc(summary)}</div><span class="chev">${I.chev}</span></div>`;
  };
  SEC.fields = (pw, s, lock) => {
    const k = secKey(s); pw.d[k] = pw.d[k] || {};
    return `<div data-ref="pw:${pw.id}:d.${k}">${OD.renderFields(s.fields, pw.d[k], { ref: `pw:${pw.id}:d.${k}`, fid: 'inline-' + pw.type + '-' + k, pw, reviewed: pw.reviewed, locked: !!pw.locked })}</div>`;
  };
  SEC.list = (pw, s, lock) => {
    const k = secKey(s); const arr = pw.l[k] || [];
    const rows = arr.map((e) => {
      const st = OD.formStatus(val(s.f, e), e, pw);
      const go = OD.link('form', { t: `pw:${pw.id}:l.${k}#${e.id}`, f: val(s.f, e), rm: lock ? '' : 1 });
      const inner = s.card ? s.card(e, pw, go) : `<div class="row" data-go="${esc(go)}">${s.circle === false ? '' : U.circ(st)}<div class="grow"><div class="kv-k">${esc(val(s.title, e, pw) || 'Entry')}</div>${s.sum ? `<div class="kv-v" style="font-size:12.5px">${esc(val(s.sum, e, pw) || '')}</div>` : ''}</div><span class="chev">${I.chev}</span></div>`;
      return lock ? inner : OD.swipeRow(inner, { right: [rmBtn(`pw:${pw.id}:l.${k}#${e.id}`)] });
    }).join('');
    const canAdd = !lock && (!s.max || arr.length < s.max);
    return rows + (canAdd ? addRow(s.add || '+ Add', `data-act="pwListAdd" data-a="${k}"`) : '');
  };
  SEC.value = (pw, s, lock) => {
    const k = secKey(s); const v = pw.val[k];
    return `<div class="field pick" ${lock ? '' : goAttr('picker', { t: `pw:${pw.id}:val`, k, o: s.o, title: s.l })}><span class="lbl">${esc(s.l)}</span><div class="pv ${v ? '' : 'ph'}">${esc(v ? String(v).split(' - ')[0] : 'Select')}</div></div>${s.note ? `<div class="para grey small">${esc(s.note)}</div>` : ''}`;
  };
  SEC.static = (pw, s) => `<div class="row center" style="font-size:14px">${esc(val(s.text, pw))}</div>`;
  SEC.notice = (pw, s, lock) => {
    if (pw.notice.revealed) return `<div class="row"><div class="grow"><div class="kv-k">Notice Number(s)</div><div class="kv-v" style="color:#000;font-weight:600">${esc(pw.notice.numbers.join('\n'))}</div></div></div>` + (pw.status === 'Incomplete' ? '<div class="footnote">The notice number has been revealed. The contents of the INF can no longer be changed – only the offence notes can be completed. Cancel the INF in OnDuty and reissue it to correct a mistake.</div>' : '');
    const can = pw.off.length > 0;
    return `<div class="row" ${can ? 'data-act="infReveal"' : ''}><div class="grow">Notice Number(s)</div><span class="right" style="color:${can ? 'var(--tint)' : '#c7c7cc'}">Reveal</span></div>`;
  };
  SEC.custom = (pw, s, lock) => s.render(pw, lock);

  OD.pwExistingLinks = (pw) => {
    const out = [];
    const pids = OD.pwPersonIds(pw), vids = OD.pwVehicleIds(pw);
    vids.forEach((vid) => { const v = OD.vehicle(vid); if (v && v.owner && pids.includes(v.owner)) out.push(`${OD.fullName(OD.person(v.owner))} — Registered owner of — ${v.rego}`); });
    const locs = Object.values(pw.loc || {}).filter((l) => l && l.lid);
    locs.forEach((l) => { const loc = OD.location(l.lid); (loc?.occupants || []).forEach((pid) => { if (pids.includes(pid)) out.push(`${OD.fullName(OD.person(pid))} — Resides at — ${loc.addr}`); }); });
    return out;
  };

  const renderSection = (pw, s, i) => {
    if (s.w && !s.w(pw)) return '';
    const lock = !!pw.locked && !(s.t === 'notice');
    const { st, segs } = OD.secStatus(pw, s);
    const k = secKey(s);
    const owner = pw.owners && pw.owners[k];
    const ownedByOther = owner && owner !== OD.db.me.qid;
    const reqd = !!val(s.req, pw);
    const err = pw.reviewed && reqd && st !== 'done';
    let bar = '';
    const showBar = st !== 'none' || reqd;
    if (showBar) {
      const n = Math.max(segs.length, 1);
      const cls = ownedByOther ? 'other' : owner === OD.db.me.qid && FD.get(pw.folder)?.shared?.length ? 'mine' : err ? 'error' : '';
      bar = `<div class="bar ${cls}">${Array.from({ length: n }, (_, j) => `<i class="${segs[j] ? 'ok' : ''}"></i>`).join('')}</div>`;
    }
    const head = `<div class="sh" id="sec-${pw.id}-${i}">${esc(s.h || '')}${owner ? `<span class="owner ${ownedByOther ? '' : 'me'}">${ownedByOther ? `Currently being completed by ${esc(owner)}` : 'You are completing this section'}</span>` : ''}</div>`;
    let body;
    if (ownedByOther && !pw.locked) body = `<div class="row center" data-act="pwTakeOver" data-a="${k}" style="color:var(--orange);font-size:13px">Owned by ${esc(owner)} – tap to take over this section</div>`;
    else body = (SEC[s.t] || (() => ''))(pw, s, lock);
    return head + bar + `<div class="group">${body}</div>` + (s.foot ? `<div class="footnote">${esc(val(s.foot, pw))}</div>` : '');
  };

  /* ========================================================= PAPERWORK SCREEN */
  const statusBanner = (pw) => {
    if (pw.status === 'Incomplete') return pw.returnComment ? `<div class="center-note" style="background:#fff3f3;color:#b00"><b>Returned by supervisor</b>${esc(pw.returnComment)}</div>` : '';
    return `<div class="center-note"><b>${esc(pw.status)}</b><small>${pw.submitted ? 'Submitted ' + esc(F.stamp(pw.submitted)) : ''}${pw.supervisor ? ' · Supervisor ' + esc(String(pw.supervisor).split(' - ')[0]) : ''}</small></div>`;
  };
  screen('pw', {
    title: (p) => { const pw = OD.db.paperwork[p.id]; return pw ? esc(OD.types[pw.type].title) : 'Paperwork'; },
    left: (p, ctx) => {
      const pw = OD.db.paperwork[p.id];
      if (!pw || (pw.locked && pw.locked !== 'notes')) return ctx.root && ctx.modal ? '<button class="nb" data-dismiss>Close</button>' : null;
      return '<button class="nb" data-act="pwDraft">Save as Draft</button>';
    },
    right: (p) => (OD.db.paperwork[p.id] ? `<button class="nb icon" data-act="pwMenu">${I.dots}</button>` : ''),
    foot: (p) => (p.today ? '<div class="foot today" data-act="todayTab">Today</div>' : ''),
    target: (p) => OD.db.paperwork[p.id],
    cls: 'grouped',
    body: (p) => {
      const pw = OD.db.paperwork[p.id];
      if (!pw) return U.empty('This paperwork has been deleted.');
      const T = OD.types[pw.type];
      const secs = T.sections.map((s, i) => renderSection(pw, s, i)).join('');
      const canSubmit = !pw.locked || pw.locked === 'notes';
      return statusBanner(pw) + (T.top ? T.top(pw) : '') + secs + (canSubmit && pw.status === 'Incomplete' ? `<div style="height:14px"></div><button class="bigbtn" data-go="${OD.go('pw-review', { id: pw.id })}">Review to Submit</button>` : '');
    },
  });
  action('pwDraft', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id]; if (pw) { pw.updated = Date.now(); OD.saveNow(); }
    OD.ui.toast('Saved as draft');
    if (ctx.root && ctx.modal) N.dismiss(); else N.pop();
  });
  action('pwRemove', (d) => { OD.ui.confirm('Remove', 'Remove this from the paperwork?', 'Remove', () => { OD.removeByRef(d.a); OD.save(); N.refresh(); }, true); });
  action('pwLocDirect', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; pw.loc[d.a] = pw.loc[d.a] || {}; OD.save(); N.push('form', { t: `pw:${pw.id}:loc.${d.a}`, f: d.f, rm: 1 }); });
  action('pwListAdd', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id]; const T = OD.types[pw.type];
    const s = T.sections.find((x) => x.t === 'list' && secKey(x) === d.a);
    const add = (kind) => {
      const e = { id: OD.uid('li'), kind };
      s.init && s.init(e, pw);
      (pw.l[d.a] = pw.l[d.a] || []).push(e); pw.updated = Date.now(); OD.save();
      if (s.onAdd) return s.onAdd(e, pw);
      N.push('form', { t: `pw:${pw.id}:l.${d.a}#${e.id}`, f: val(s.f, e), rm: 1 });
    };
    if (s.choices) OD.ui.sheet({ title: s.choiceTitle || 'Add', items: s.choices.map((c) => ({ label: c, fn: () => add(c) })) });
    else add(s.kind || '');
  });
  action('pwTakeOver', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id];
    OD.ui.confirm('Take over section', `${pw.owners[d.a]} is currently completing this section. Do you want to take over and complete it yourself?`, 'Take Over', () => { pw.owners[d.a] = OD.db.me.qid; OD.save(); N.refresh(); OD.ui.toast('You are now completing this section'); });
  });
  action('pwLinkRm', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; pw.links.splice(+d.a, 1); OD.save(); N.refresh(); });

  // photos (downscaled into browser storage)
  action('pwPhoto', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id]; const k = d.a; const max = +d.max || 15;
    const inp = document.createElement('input'); inp.type = 'file'; inp.accept = 'image/*'; inp.multiple = true;
    inp.onchange = async () => {
      const files = [...inp.files].slice(0, max - (pw.photos[k] || []).length);
      for (const f of files) { const url = await OD.downscale(f, 520); (pw.photos[k] = pw.photos[k] || []).push(url); }
      if (inp.files.length > files.length) OD.ui.toast(`Up to ${max} photos can be added`);
      pw.updated = Date.now(); OD.save(); N.refresh(ctx.u);
    };
    inp.click();
  });
  action('pwPhotoRm', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; const [k, i] = d.a.split('|'); pw.photos[k].splice(+i, 1); OD.save(); N.refresh(ctx.u); });
  OD.downscale = (file, maxDim) => new Promise((res) => {
    const r = new FileReader();
    r.onload = () => {
      const img = new Image();
      img.onload = () => { const s = Math.min(1, maxDim / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * s); c.height = Math.round(img.height * s); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', 0.6)); };
      img.onerror = () => res(r.result);
      img.src = r.result;
    };
    r.readAsDataURL(file);
  });

  /* ------------------------------------------------------------- ••• menu */
  const MENU = {
    noting: { label: 'Create Noting', fn: (pw) => spawn('N', pw) },
    awhi: { label: 'Create AWHI Referral', fn: (pw) => spawn('AWHI', pw, true) },
    ws: { label: 'Create Warrantless Search', fn: (pw) => spawn('WS', pw) },
    hr: { label: 'Create Health Referral - Drug Use', fn: (pw) => spawn('HR', pw) },
    inf: { label: 'Create Infringement Notice Form', fn: (pw) => spawn('INF', pw) },
    similar: { label: (pw) => `Create similar ${OD.types[pw.type].name}`, fn: (pw) => spawn(pw.type, pw) },
    similarItem: { label: 'Create Similar Item', fn: (pw) => { const it = (pw.l.items || []).slice(-1)[0]; const e = { id: OD.uid('li'), ...(it ? { type: it.type, cat: it.cat } : {}) }; (pw.l.items = pw.l.items || []).push(e); OD.save(); N.push('form', { t: `pw:${pw.id}:l.items#${e.id}`, f: 'pf-item-ov', rm: 1 }); OD.ui.toast('Item attributes copied'); } },
    share: { label: 'Share folder with officers', fn: (pw) => N.push('share-folder', { folder: pw.folder }) },
    reporting: { label: 'Become reporting member', fn: (pw) => { Object.keys(pw.owners || {}).forEach((k) => (pw.owners[k] = OD.db.me.qid)); pw.reporting = OD.db.me.qid; OD.save(); N.refresh(); OD.ui.toast('You are now the reporting member'); } },
    abandon: { label: 'Abandon EBA Procedure Sheet', danger: true, fn: (pw) => OD.ui.alert({ title: 'Abandon EBA', msg: 'A supervisor will need to approve the abandon request. Enter a reason:', input: { ph: 'Reason' }, buttons: [{ label: 'Cancel' }, { label: 'Request', bold: true, fn: (v) => { pw.status = 'Abandon Requested'; pw.locked = true; pw.returnComment = v || ''; pw.submitted = Date.now(); OD.save(); N.dismiss(); OD.ui.toast('Abandon request sent to supervisor'); } }] }) },
    affirm: { label: 'Affirm CVIR', fn: (pw) => N.push('pw-review', { id: pw.id }) },
    cancelInf: { label: 'Cancel Infringement Notice', danger: true, fn: (pw) => OD.ui.confirm('Cancel INF', 'Cancel this Infringement Notice? You will need to reissue it.', 'Cancel INF', () => { pw.status = 'Cancelled'; pw.locked = true; OD.save(); N.dismiss(); }, true) },
    delete: { label: 'Delete Paperwork', danger: true, fn: (pw) => OD.ui.confirm('Delete Paperwork', 'Are you sure you want to delete this paperwork? This cannot be undone.', 'Delete', () => { OD.pwDelete(pw.id); N.dismiss(); OD.ui.toast('Paperwork deleted'); }, true) },
    approve: { label: 'Approve (supervisor)', fn: (pw) => OD.ui.alert({ title: 'Approve', msg: 'Enter a supervisor comment:', input: { ph: 'Comment' }, buttons: [{ label: 'Cancel' }, { label: 'Approve', bold: true, fn: () => { pw.status = 'Completed'; OD.save(); N.refresh(); OD.ui.toast('Approved'); } }] }) },
    returnPw: { label: 'Return to officer (supervisor)', fn: (pw) => OD.ui.alert({ title: 'Return', msg: 'Enter a supervisor comment:', input: { ph: 'Comment' }, buttons: [{ label: 'Cancel' }, { label: 'Return', bold: true, fn: (v) => { pw.status = 'Incomplete'; pw.locked = false; pw.returned = true; pw.returnComment = v || 'Please review.'; OD.save(); N.refresh(); OD.ui.toast('Returned to officer'); } }] }) },
  };
  const spawn = (type, from, pickPerson) => {
    const go = (pid) => {
      const npw = OD.pwNew(type, { folder: from.folder, from: from.id });
      if (pid) { Object.keys(npw.p).forEach((k) => (npw.p[k] = [])); const s = firstSec(OD.types[type], 'persons'); s && OD.pwAddObj(npw, 'person', secKey(s), pid); }
      if (type === 'INF') { npw.occ.date = from.occ.date || F.iso(); npw.occ.date_t = from.occ.date_t || F.hm(); }
      OD.save(); N.replaceModal('pw', { id: npw.id }); OD.ui.toast(`${OD.types[type].name} created from ${OD.types[from.type].name}`);
    };
    const pids = OD.pwPersonIds(from);
    if (pickPerson && pids.length > 1) OD.ui.sheet({ title: 'Which person does the referral relate to?', items: pids.map((pid) => ({ label: OD.fullName(OD.person(pid)), fn: () => go(pid) })) });
    else go(pickPerson ? pids[0] : null);
  };
  action('pwMenu', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id]; if (!pw) return;
    const T = OD.types[pw.type];
    let keys = [...(T.menu || []), 'share'];
    if (T.multi) keys.push('reporting');
    if (pw.status === 'Awaiting Approval') keys = ['approve', 'returnPw', 'share'];
    else if (pw.locked === true) keys = keys.filter((k) => ['noting', 'awhi', 'ws', 'hr', 'similar', 'share'].includes(k));
    if (pw.type === 'INF' && pw.notice.revealed && pw.status === 'Incomplete') keys.push('cancelInf');
    if (pw.status === 'Incomplete' && !(pw.type === 'INF' && pw.notice.revealed)) keys.push('delete');
    if (OD.nav.st.edu && pw.type === 'WTA') keys = keys.filter((k) => k !== 'similar');
    OD.ui.sheet({ items: keys.map((k) => MENU[k]).filter(Boolean).map((m) => ({ label: val(m.label, pw), danger: m.danger, fn: () => m.fn(pw) })) });
  });
  OD.pwDelete = (id) => {
    const pw = OD.db.paperwork[id]; if (!pw) return;
    const f = FD.get(pw.folder); if (f) f.items = f.items.filter((i) => !(i.k === 'pw' && i.id === id));
    delete OD.db.paperwork[id]; OD.save();
  };

  /* ================================================================ REVIEW */
  screen('pw-review', {
    title: 'Review to Submit',
    target: (p) => OD.db.paperwork[p.id],
    body: (p) => {
      const pw = OD.db.paperwork[p.id]; if (!pw) return U.empty('Not found');
      const T = OD.types[pw.type];
      if (!pw.reviewed) { pw.reviewed = true; OD.save(); }
      const errs = OD.pwErrors(pw);
      let h = '';
      if (errs.length) {
        h += '<div class="sh">THE FOLLOWING NEED ATTENTION</div><div class="group">' + errs.map((e) => `<div class="row" data-act="reviewJump" data-a="${e.sec ? T.sections.indexOf(e.sec) : ''}" style="color:var(--ios-red)"><div class="grow" style="font-size:14px">${esc(e.msg)}</div><span class="chev">${I.chev}</span></div>`).join('') + '</div><div class="footnote">Sections that need attention are highlighted in red on the paperwork.</div>';
      } else h += '<div class="center-note" style="background:#eef9f0;color:#1c7a31"><b>All sections complete</b><small>No validation errors found</small></div>';
      h += '<div class="sh">SUMMARY</div><div class="group">' + T.sections.filter((s) => !s.w || s.w(pw)).map((s) => { const { st } = OD.secStatus(pw, s); return `<div class="row"><span class="circ ${st === 'done' ? 'done' : st === 'partial' ? 'partial' : ''}" style="width:16px;height:16px"></span><div class="grow" style="font-size:13px">${esc(s.h || '')}</div><span class="right">${st === 'done' ? 'Complete' : st === 'partial' ? 'Incomplete' : s.req ? 'Required' : 'Optional'}</span></div>`; }).join('') + '</div>';
      if (T.approval) {
        if (!pw.supervisor) pw.supervisor = OD.db.settings.supervisor;
        h += `<div class="sh">SUPERVISOR APPROVAL</div><div class="field pick" data-go="${OD.go('picker', { t: `pw:${pw.id}:`, k: 'supervisor', o: 'l:supervisors', title: 'Approving Supervisor' })}"><span class="lbl">Approving Supervisor</span><div class="pv">${esc(pw.supervisor)}</div></div><div class="footnote">${esc(T.approvalNote || 'Supervisor approval is required before this paperwork is sent to FMC/NIA.')}</div>`;
      }
      if (OD.db.offline) h += `<div class="footnote" style="color:var(--ios-red)">${T.onlineOnly ? 'You are offline. This paperwork must be submitted while online.' : 'You are offline. The paperwork will be queued and processed once you are back in coverage.'}</div>`;
      const dis = errs.length || (OD.db.offline && T.onlineOnly);
      return h + `<button class="bigbtn ${dis ? 'grey' : ''}" ${dis ? 'disabled' : 'data-act="pwSubmit"'}>${esc(T.submitLabel || 'Submit')}</button>`;
    },
  });
  action('reviewJump', (d, el, ctx) => {
    N.pop();
    if (d.a === '') return;
    setTimeout(() => { const t = document.getElementById(`sec-${ctx.p.id}-${d.a}`); t && t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 380);
  });
  action('pwSubmit', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id]; const T = OD.types[pw.type];
    pw.submitted = Date.now();
    pw.status = OD.db.offline ? 'Queued (Offline)' : T.approval ? 'Awaiting Approval' : T.submitStatus || 'Completed';
    pw.locked = true;
    T.onSubmit && T.onSubmit(pw);
    OD.save();
    N.push('pw-done', { id: pw.id });
  });
  screen('pw-done', {
    title: (p) => (OD.db.paperwork[p.id]?.status === 'Queued (Offline)' ? 'Queued' : 'Submitted'),
    left: '',
    right: '<button class="nb bold" data-dismiss>Done</button>',
    body: (p) => {
      const pw = OD.db.paperwork[p.id]; if (!pw) return '';
      const T = OD.types[pw.type];
      const q = pw.status === 'Queued (Offline)';
      let h = `<div style="text-align:center;padding:30px 20px 10px;background:#fff"><div style="width:64px;height:64px;border-radius:50%;background:${q ? 'var(--orange)' : 'var(--green)'};margin:0 auto 12px;display:flex;align-items:center;justify-content:center;color:#fff">${q ? '<span style="font-size:30px">⏳</span>' : '<svg width="30" height="24" viewBox="0 0 14 12"><path d="M1.5 6.5l4 4 7-9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>'}</div><div style="font-weight:600;font-size:17px">${esc(T.name)} ${q ? 'queued' : 'submitted'}</div><div style="color:var(--sub);font-size:13px;margin-top:4px">${esc(pw.status)}${pw.notice.numbers?.length ? ' · ' + esc(pw.notice.numbers.join(', ')) : ''}</div></div>`;
      if (q) h += '<div class="para">You are offline. This paperwork will be processed by the system once you are back in coverage.</div>';
      const next = val(T.next, pw) || [];
      if (next.length) h += '<div class="sh">WHAT HAPPENS NEXT</div><div class="group">' + next.map((n) => `<div class="row" style="font-size:13.5px;align-items:flex-start"><span style="color:var(--tint);margin-right:8px">•</span><div class="grow">${esc(n)}</div></div>`).join('') + '</div>';
      if (T.doneExtra) h += T.doneExtra(pw);
      return h + `<button class="bigbtn" data-dismiss>Done</button>`;
    },
  });

  /* ===================================================== TAKE ACTION / START */
  const TA_ORDER = ['AWHI', 'CVIR', 'EBA', 'FH', 'FDR', 'GCR', 'HR', 'INF', 'N', 'OR', 'PoE', 'PoW', 'PF', 's118', 'TCR', 'WS'];
  screen('take-action', {
    title: 'Take Action',
    left: '<button class="nb" data-dismiss>Cancel</button>',
    right: (p) => (p.folder ? `<button class="nb" data-go="${OD.go('share-folder', { folder: p.folder })}">Share</button>` : ''),
    body: (p, ctx) => U.search('Search paperwork', 'q', ctx.e.q || '') + `<div class="talist">${OD.screens['take-action'].list(p, ctx)}</div>`,
    list: (p, ctx) => {
      const q = (ctx.e.q || '').toLowerCase();
      const row = (code, name, act, a) => `<div class="ta-row" data-act="${act}" data-a="${esc(a || code)}"><span class="code">${esc(code)}</span><span>${esc(name)}</span></div>`;
      const m = (code) => { const T = OD.types[code]; return T && (!q || T.name.toLowerCase().includes(q) || code.toLowerCase().includes(q)); };
      let h = '';
      const [kind, id] = (p.src || '').split(':');
      if (kind === 'occ') {
        const o = OD.occ(id);
        h += '<div class="sh">OCCURRENCE</div>' + row('UN', 'Update Narrative', 'taStart', 'UN');
        if (o && o.fh) h += row('FH', 'Create Similar Family Harm Investigation', 'taStart', 'FH');
      }
      const recent = OD.db.lastUsed.filter(m);
      if (recent.length && !q) h += '<div class="sh">RECENTLY USED</div>' + recent.map((c) => row(c, OD.types[c].name, 'taStart')).join('');
      const all = TA_ORDER.filter(m);
      h += '<div class="sh">ALL</div>' + (all.length ? all.map((c) => row(c, OD.types[c].name, 'taStart')).join('') : U.empty('No paperwork matches'));
      if (p.folder && !q) h += '<div class="sh">FOLDER</div>' + `<div class="ta-row" data-go="${OD.go('share-folder', { folder: p.folder })}"><span class="code"></span>Share folder with officers</div><div class="ta-row" data-act="folderRename" data-a="${esc(p.folder)}"><span class="code"></span>Rename folder</div>`;
      return h;
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; ctx.el.querySelector('.talist').innerHTML = OD.screens['take-action'].list(ctx.p, ctx); },
  });
  action('taStart', (d, el, ctx) => OD.pwStart(d.a, { folder: ctx.p.folder, src: ctx.p.src }));
  OD.pwStart = (type, opts = {}) => {
    const T = OD.types[type]; if (!T) return;
    const folder = opts.folder && FD.get(opts.folder);
    if (type === 'TCR' && folder && folder.items.some((i) => i.k === 'pw' && OD.db.paperwork[i.id]?.type === 'TCR')) return OD.ui.alert({ title: 'TCR already exists', msg: 'You can only have 1 TCR in each folder in OnDuty.' });
    if (type === 'FH' && opts.src && opts.src.startsWith('occ:')) opts.src = 'location:' + (OD.occ(opts.src.slice(4))?.loc || '');
    const open = (pw) => { if (N.st.modals.length) N.replaceModal('pw', { id: pw.id }); else N.present('pw', { id: pw.id }); };
    if (type === 'INF') return OD.infCreateDialog((occ) => open(OD.pwNew(type, { ...opts, occ })));
    open(OD.pwNew(type, opts));
  };
  OD.infCreateDialog = (cb) => {
    const tmp = { date: F.iso(), date_t: '' };
    OD.ui.dialog(`<div class="dh">Infringement Notice</div><div class="sh tight" style="background:#fff">DATE/TIME</div><div class="field" style="border:0"><span class="lbl">Date</span><div class="dtrow notime"><div class="dtbox" data-x="date">${F.dmy(tmp.date)}</div><div class="dtbox wd">${F.wd(tmp.date)}</div></div></div><div class="field" style="border:0"><span class="lbl">Time</span><div class="dtrow timeonly"><div class="dtbox ph" data-x="time">--:--</div></div></div><button class="bigbtn" data-x="create">Create Infringement Notice</button>`, (el, close) => {
      const upd = () => { el.querySelector('[data-x=date]').textContent = F.dmy(tmp.date); el.querySelector('.wd').textContent = F.wd(tmp.date); const t = el.querySelector('[data-x=time]'); t.textContent = tmp.date_t || '--:--'; t.classList.toggle('ph', !tmp.date_t); };
      el.addEventListener('click', (ev) => {
        const x = ev.target.closest('[data-x]')?.dataset.x;
        if (x === 'date') OD.ui.wheel({ mode: 'date', value: tmp.date, onDone: (v) => { tmp.date = v; upd(); } });
        if (x === 'time') OD.ui.wheel({ mode: 'time', value: tmp.date_t, onDone: (v) => { tmp.date_t = v; upd(); } });
        if (x === 'create') { if (!tmp.date_t) return OD.ui.toast('Enter the time of the infringement'); close(); cb({ date: tmp.date, date_t: tmp.date_t }); }
      });
    });
  };
  action('folderRename', (d) => { const f = FD.get(d.a); OD.ui.alert({ title: 'Rename Folder', input: { value: f.name || '', ph: 'Folder name' }, buttons: [{ label: 'Cancel' }, { label: 'Save', bold: true, fn: (v) => { f.name = v; OD.save(); N.refreshAll(); } }] }); });

  screen('share-folder', {
    title: 'Share Folder',
    right: '<button class="nb bold" data-act="shareDone">Done</button>',
    body: (p) => {
      const f = FD.get(p.folder); if (!f) return U.empty('Folder not found');
      return '<div class="para small grey">When you share a folder, everything it contains is shared (paperwork and queries) so it is a great place to group relevant information.</div><div class="sh">OFFICERS</div><div class="group">' + OD.data.officers.filter((o) => !o.me).map((o) => `<div class="row" data-act="shareToggle" data-a="${o.qid}"><div class="grow"><div class="kv-k">${esc(o.qid)}</div><div class="kv-v">${esc(o.name)}</div></div>${f.shared.includes(o.qid) ? `<span style="color:var(--tint);position:absolute;right:12px">${I.check}</span>` : ''}</div>`).join('') + '</div>';
    },
  });
  action('shareToggle', (d, el, ctx) => { const f = FD.get(ctx.p.folder); const i = f.shared.indexOf(d.a); if (i >= 0) f.shared.splice(i, 1); else f.shared.push(d.a); OD.save(); N.refresh(ctx.u); });
  action('shareDone', (d, el, ctx) => { const f = FD.get(ctx.p.folder); OD.ui.toast(f.shared.length ? `Folder shared with ${f.shared.length} officer${f.shared.length > 1 ? 's' : ''}` : 'Folder not shared'); N.pop(); });

  /* ================================================================ CARD EVENT */
  screen('card-event', {
    title: 'CARD Event',
    target: (p) => OD.db.paperwork[p.id],
    body: (p) => {
      const pw = OD.db.paperwork[p.id];
      return `<div class="sh">CARD EVENT</div><div class="field"><span class="lbl">CARD Event Number</span><input data-k="card" value="${esc(pw.card || '')}" placeholder="P123456789" style="text-transform:uppercase" maxlength="10" autocomplete="off"></div><div class="sh">MY ASSIGNED CARD EVENTS</div><div class="group">${OD.db.cardEvents.map((c) => `<div class="row" data-act="cardPick" data-a="${c.no}"><div class="grow"><div class="kv-k">${esc(c.no)} - ${esc(c.code)}</div><div class="kv-v" style="font-size:12.5px">${esc(c.addr)}</div></div>${pw.card === c.no ? `<span style="color:var(--tint);position:absolute;right:12px">${I.check}</span>` : ''}</div>`).join('')}</div><button class="bigbtn" data-act="cardSave">Save</button>${pw.card ? '<button class="bigbtn outline" data-act="cardClear">Remove CARD Event</button>' : ''}`;
    },
    onChange: (k, v, ctx, tgt) => { tgt.card = String(v).toUpperCase(); },
  });
  action('cardPick', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; pw.card = d.a; const T = OD.types[pw.type]; const s = firstSec(T, 'loc'); const ce = OD.db.cardEvents.find((c) => c.no === d.a); if (s && ce && ce.loc && !(pw.loc[secKey(s)] || {}).addr) pw.loc[secKey(s)] = { lid: ce.loc, addr: OD.location(ce.loc).addr }; OD.save(); N.pop(); });
  action('cardSave', (d, el, ctx) => { const pw = OD.db.paperwork[ctx.p.id]; if (pw.card && !/^P\d{9}$/.test(pw.card)) return OD.ui.alert({ title: 'Invalid CARD Event', msg: 'A CARD event number is the letter P followed by 9 digits, e.g. P123456789.' }); OD.save(); N.pop(); });
  action('cardClear', (d, el, ctx) => { OD.db.paperwork[ctx.p.id].card = ''; OD.save(); N.pop(); });

  /* ============================================================ SELECT LOCATION */
  screen('sel-loc', {
    title: 'Select Location',
    body: (p, ctx) => {
      const pw = OD.db.paperwork[p.id];
      const f = pw && FD.get(pw.folder);
      const fLocs = [];
      if (f) {
        if (f.card) { const ce = OD.db.cardEvents.find((c) => c.no === f.card); ce && ce.loc && fLocs.push(ce.loc); }
        f.items.forEach((it) => { if (it.k === 'q') { const q = OD.db.queries.find((x) => x.id === it.id); if (q && q.type === 'QL') (q.ids || []).slice(0, 2).forEach((id) => fLocs.push(id)); } if (it.k === 'obj' && it.t === 'location') fLocs.push(it.id); });
      }
      const recent = OD.db.home.filter((h) => h.k === 'obj' && h.t === 'location').map((h) => h.ref);
      const res = ctx.e.res || [];
      const row = (l) => `<div class="row" data-act="selLoc" data-a="${l.id}"><div class="grow" style="font-size:13.5px">${esc(l.addr)}</div>${U.pills(l.alerts)}</div>`;
      let h = `<div class="searchbar"><label class="sbx">${I.search}<input data-local="q" data-enter="selLocSearch" placeholder="Search address – press return" value="${esc(ctx.e.q || '')}" autocomplete="off"></label></div>`;
      if (res.length) h += '<div class="sh">SEARCH RESULTS</div><div class="group">' + res.map((id) => row(OD.location(id))).join('') + '</div>';
      h += `<div class="group"><div class="row link" data-act="selLoc" data-a="${OD.nearby()[0].id}">Use Current Location (GPS)</div><div class="row link" data-go="${OD.go('ql-map', { mode: 'pick', id: p.id, k: p.k })}">Show map of nearby locations<span class="chev">${I.chev}</span></div></div>`;
      if (fLocs.length) h += '<div class="sh">LOCATIONS IN FOLDER</div><div class="group">' + [...new Set(fLocs)].map((id) => OD.location(id)).filter(Boolean).map(row).join('') + '</div>';
      h += '<div class="sh">NEARBY LOCATIONS</div><div class="group">' + OD.nearby().map(row).join('') + '</div>';
      if (recent.length) h += '<div class="sh">RECENT LOCATIONS</div><div class="group">' + [...new Set(recent)].map((id) => OD.location(id)).filter(Boolean).map(row).join('') + '</div>';
      return h;
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; },
  });
  action('selLocSearch', (d, el, ctx) => { const r = OD.gen.ql({ quick: ctx.e.q }); ctx.e.res = r.ids; OD.save(); N.refresh(ctx.u); });
  action('selLoc', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id]; const l = OD.location(d.a);
    pw.loc[ctx.p.k] = { ...(pw.loc[ctx.p.k] || {}), lid: l.id, addr: l.addr };
    pw.updated = Date.now(); OD.save(); N.pop();
  });

  /* ======================================================== SELECT OBJECTS */
  const KIND = {
    person: { title: 'Select Persons', q: 'QP', create: 'Create new person', bucket: 'p', idKey: 'pid', get: (id) => OD.person(id), card: (o, opt) => OD.personCard(o, { compact: true, ...opt }) },
    vehicle: { title: 'Select Vehicle', q: 'QV', create: 'Create new vehicle', bucket: 'v', idKey: 'vid', get: (id) => OD.vehicle(id), card: (o, opt) => OD.vehicleCard(o, { inline: true, ...opt }) },
    org: { title: 'Select Organisation', q: 'QO', create: 'Create new organisation', bucket: 'o', idKey: 'oid', get: (id) => OD.org(id), card: (o, opt) => OD.orgCard(o, opt) },
  };
  const candidates = (pw, kind) => {
    const K = KIND[kind]; const groups = [];
    const inPw = new Set(); Object.values(pw[K.bucket] || {}).forEach((a) => (a || []).forEach((e) => inPw.add(e[K.idKey])));
    const f = FD.get(pw.folder);
    const otherPw = new Set(); const folderObjs = new Set();
    if (f) f.items.forEach((it) => {
      if (it.k === 'pw' && it.id !== pw.id) { const o = OD.db.paperwork[it.id]; o && Object.values(o[K.bucket] || {}).forEach((a) => (a || []).forEach((e) => otherPw.add(e[K.idKey]))); }
      if (it.k === 'obj' && it.t === kind) folderObjs.add(it.id);
      if (it.k === 'q') { const q = OD.db.queries.find((x) => x.id === it.id); if (q && q.type === K.q) (q.ids || []).slice(0, 3).forEach((id) => folderObjs.add(id)); }
    });
    if (kind === 'person') { Object.values(pw.loc || {}).forEach((l) => { const loc = l && l.lid && OD.location(l.lid); (loc?.occupants || []).forEach((pid) => folderObjs.add(pid)); }); }
    const hist = new Set(OD.db.home.filter((h) => h.k === 'obj' && h.t === kind).map((h) => h.ref));
    OD.db.queries.filter((q) => q.type === K.q && q.status === 'done').slice(-4).forEach((q) => (q.ids || []).slice(0, 2).forEach((id) => hist.add(id)));
    if (otherPw.size) groups.push(['IN OTHER PAPERWORK IN FOLDER', [...otherPw]]);
    if (folderObjs.size) groups.push([kind === 'person' ? 'PERSONS IN FOLDER / INVOLVED AT THIS LOCATION' : 'IN FOLDER', [...folderObjs].filter((x) => !otherPw.has(x))]);
    groups.push(['QUERY HISTORY', [...hist].filter((x) => !otherPw.has(x) && !folderObjs.has(x))]);
    return { groups: groups.filter((g) => g[1].length), inPw };
  };
  screen('sel-obj', {
    title: (p) => KIND[p.kind].title,
    right: '<button class="nb" data-back>Cancel</button>',
    left: '',
    body: (p, ctx) => {
      const pw = OD.db.paperwork[p.id]; const K = KIND[p.kind];
      ctx.e.sel = ctx.e.sel || [];
      const { groups, inPw } = candidates(pw, p.kind);
      let h = `<div style="padding:8px 10px;background:var(--grouped)"><button class="fullbtn" data-act="selObjQuery">${K.q} / ${esc(K.create)}</button></div>`;
      if (inPw.size) h += `<div class="sh">ALREADY IN PAPERWORK</div>` + [...inPw].map((id) => K.get(id)).filter(Boolean).map((o) => K.card(o, { check: true, checked: true })).join('');
      groups.forEach(([title, ids]) => {
        const objs = ids.filter((id) => !inPw.has(id)).map(K.get).filter(Boolean);
        if (objs.length) h += `<div class="sh">${esc(title)}</div>` + objs.map((o) => K.card(o, { act: 'selObjToggle', a: o.id, check: true, checked: ctx.e.sel.includes(o.id) })).join('');
      });
      if (!groups.length && !inPw.size) h += U.empty(`No recent ${p.kind === 'org' ? 'organisations' : p.kind + 's'}.<br>Use ${K.q} to search NIA.`);
      return h;
    },
    foot: (p, ctx) => { const n = (ctx.e.sel || []).length; return n ? `<div class="foot" style="padding-top:6px"><button class="fullbtn" style="height:40px" data-act="selObjAdd">Add ${n} ${p.kind === 'person' ? (n > 1 ? 'persons' : 'person') : p.kind === 'vehicle' ? (n > 1 ? 'vehicles' : 'vehicle') : n > 1 ? 'organisations' : 'organisation'}</button></div>` : ''; },
  });
  action('selObjToggle', (d, el, ctx) => {
    const sel = ctx.e.sel; const i = sel.indexOf(d.a);
    if (i >= 0) sel.splice(i, 1); else { if (ctx.p.max === '1') sel.length = 0; sel.push(d.a); }
    N.refresh(ctx.u);
  });
  action('selObjAdd', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id];
    ctx.e.sel.forEach((id) => OD.pwAddObj(pw, ctx.p.kind, ctx.p.k, id, ctx.p.label ? { label: ctx.p.label } : {}));
    OD.save(); N.pop();
  });
  action('selObjQuery', (d, el, ctx) => {
    const K = KIND[ctx.p.kind];
    const pick = `${ctx.p.id}|${ctx.p.kind}|${ctx.p.k}|${ctx.p.label || ''}`;
    OD.ui.sheet({ items: [
      { label: `Query ${ctx.p.kind === 'org' ? 'Organisation' : ctx.p.kind === 'person' ? 'Person' : 'Vehicle'} (${K.q})`, fn: () => N.present(K.q.toLowerCase(), { pick, folder: OD.db.paperwork[ctx.p.id]?.folder }) },
      { label: K.create.replace(/^\w/, (c) => c.toUpperCase()), fn: () => N.push('new-obj', { id: ctx.p.id, kind: ctx.p.kind, k: ctx.p.k, label: ctx.p.label || '' }) },
    ] });
  });
  OD.pwCandidates = candidates;
  /** Called from query summary screens when picking for paperwork */
  OD.pickReturn = (pick, objId) => {
    if (pick.startsWith('field|')) {
      const [, ref, k, multi] = pick.split('|');
      const tgt = OD.resolve(ref); const pw = OD.pwOfRef(ref);
      if (tgt) { if (multi === '1') { tgt[k] = Array.isArray(tgt[k]) ? tgt[k] : []; if (!tgt[k].includes(objId)) tgt[k].push(objId); } else tgt[k] = objId; }
      const ctxE = N.st.modals[N.st.modals.length - 2];
      const f = ctxE && ctxE.slice().reverse().find((e) => e.s === 'form');
      if (f && OD.forms[f.p.f]?.onChange) OD.forms[f.p.f].onChange(k, tgt[k], tgt, pw);
      N.st.modals.pop();
      const top = N.st.modals[N.st.modals.length - 1];
      if (top) while (top.length > 1 && top[top.length - 1].s === 'pick-person') top.pop();
      OD.save(); N.commit('dismiss');
      OD.ui.toast('Person added'); return;
    }
    const [pwId, kind, k, label] = pick.split('|');
    const pw = OD.db.paperwork[pwId]; if (!pw) return;
    OD.pwAddObj(pw, kind, k, objId, label ? { label } : {});
    N.st.modals.pop();
    const top = N.st.modals[N.st.modals.length - 1];
    if (top) while (top.length > 1 && top[top.length - 1].s !== 'pw') top.pop();
    N.commit('dismiss');
    OD.ui.toast(`Added to ${OD.types[pw.type].name}`);
  };

  // ----------------------------------------------------- create new object
  const NEWF = {
    person: { title: 'New Person', fields: [{ h: 'PERSON DETAILS' }, { t: 'sn', l: 'Surname', req: 1, upper: 1 }, { t: 'gn', l: 'Given Name(s)', req: 1, upper: 1 }, { dt: 'dob', l: 'Date of Birth', time: false }, { seg: 'g', l: 'Gender', o: ['Male', 'Female', 'Unknown'] }, { t: 'addr', l: 'Address', opt: 1 }, { p: 'New persons will be sent to FMC to re-query or create in NIA once the paperwork is submitted.', cls: 'grey small' }] },
    vehicle: { title: 'New Vehicle', fields: [{ h: 'VEHICLE DETAILS' }, { t: 'rego', l: 'Registration', req: 1, upper: 1 }, { pk: 'make', l: 'Make', o: 'makes' }, { t: 'model', l: 'Model', opt: 1 }, { pk: 'colour', l: 'Colour', o: 'colours' }, { pk: 'type', l: 'Vehicle Type', o: 'vehTypes', opt: 1 }] },
    org: { title: 'New Organisation', fields: [{ h: 'ORGANISATION DETAILS' }, { t: 'name', l: 'Name', req: 1, upper: 1 }, { seg: 'cat', l: 'Category', o: ['Business', 'Club', 'Gang', 'Other'] }, { t: 'addr', l: 'Address', opt: 1 }] },
  };
  Object.entries(NEWF).forEach(([k, f]) => (OD.forms['new-' + k] = { ...f, saveLabel: 'Add', onSave: (d, pw, ctx) => { OD.createNewObj(ctx.p, d); return false; } }));
  screen('new-obj', {
    title: (p) => NEWF[p.kind].title,
    target: () => OD.resolve('tmp:newobj'),
    body: (p) => {
      const d = OD.resolve('tmp:newobj');
      return OD.renderFields(NEWF[p.kind].fields, d, { ref: 'tmp:newobj', fid: 'new-' + p.kind, pw: null }) + '<button class="bigbtn" data-act="newObjAdd">Add</button>';
    },
  });
  action('newObjAdd', (d, el, ctx) => OD.createNewObj(ctx.p, OD.resolve('tmp:newobj')));
  OD.createNewObj = (p, d) => {
    const db = OD.db; let id;
    if (p.kind === 'person') { if (!d.sn || !d.gn) return OD.ui.alert({ title: 'Required', msg: 'Surname and given name are required.' }); id = OD.uid('NP'); db.persons[id] = { id, sn: d.sn.toUpperCase(), gn: d.gn.toUpperCase(), g: d.g || 'Unknown', dob: d.dob || '', prn: 'NEW', addr: d.addr || 'No address', addrType: '', alerts: [], alertList: [], isNew: true, photoless: true }; }
    if (p.kind === 'vehicle') { if (!d.rego) return OD.ui.alert({ title: 'Required', msg: 'Registration is required.' }); id = OD.uid('NV'); db.vehicles[id] = { id, rego: d.rego.toUpperCase(), make: d.make || '', model: d.model || '', colour: d.colour || '', body: d.type || '', vin: 'Unknown', alerts: [], isNew: true, hex: '#9aa0a8' }; }
    if (p.kind === 'org') { if (!d.name) return OD.ui.alert({ title: 'Required', msg: 'Name is required.' }); id = OD.uid('NO'); db.orgs[id] = { id, name: d.name.toUpperCase(), cat: d.cat || 'Other', type: d.cat || '', addr: d.addr || '', alerts: [], isNew: true }; }
    OD.tmp.newobj = {};
    OD.pwAddObj(db.paperwork[p.id], p.kind, p.k, id, p.label ? { label: p.label } : {});
    OD.save(); N.popTo('pw');
  };

  /* ================================================================ NEW LINK */
  const LINK_TYPES = {
    'Person-Person': ['Associate of', 'Partner of', 'Former partner of', 'Parent of', 'Child of', 'Sibling of'],
    'Person-Vehicle': ['Driver of', 'Passenger in', 'Owner of', 'Seen in'],
    'Person-Location': ['Resides at', 'Frequents', 'Works at', 'Seen at'],
    'Person-Organisation': ['Employee of', 'Member of', 'Director of', 'Associate of'],
    'Vehicle-Location': ['Garaged at', 'Seen at'],
    'Vehicle-Organisation': ['Owned by', 'Used by'],
    'Location-Organisation': ['Premises of'],
  };
  const pwObjs = (pw, kind) => {
    if (kind === 'Person') return OD.pwPersonIds(pw).map((id) => ({ id, t: OD.fullName(OD.person(id)), html: OD.personCard(OD.person(id), { compact: true }) }));
    if (kind === 'Vehicle') return OD.pwVehicleIds(pw).map((id) => ({ id, t: OD.vehicle(id).rego, html: OD.vehicleCard(OD.vehicle(id), { inline: true }) }));
    if (kind === 'Location') return Object.values(pw.loc || {}).filter((l) => l && l.addr).map((l) => ({ id: l.lid || l.addr, t: l.addr, html: `<div class="row"><div class="grow">${esc(l.addr)}</div></div>` }));
    return Object.values(pw.o || {}).flat().map((e) => ({ id: e.oid, t: OD.org(e.oid)?.name, html: OD.orgCard(OD.org(e.oid)) }));
  };
  screen('new-link', {
    title: 'Create New Link',
    left: '<button class="nb" data-back>Cancel</button>',
    target: (p) => OD.resolve('tmp:link' + p.id),
    body: (p) => {
      const pw = OD.db.paperwork[p.id]; const d = OD.resolve('tmp:link' + p.id);
      d.ak = d.ak || 'Person'; d.bk = d.bk || 'Vehicle';
      const kinds = ['Person', 'Vehicle', 'Location', 'Organisation'];
      const list = (side, kind) => { const objs = pwObjs(pw, kind); return objs.length ? objs.map((o) => `<div data-act="linkPick" data-a="${side}|${esc(o.id)}" style="position:relative">${o.html.replace('class="card', `class="card boxed ${d[side] === o.id ? 'sel' : ''}`)}${d[side] === o.id ? `<span class="check on" style="position:absolute;right:30px;top:50%;transform:translateY(-50%);width:22px;height:22px;border-radius:50%;background:var(--btn)"></span>` : ''}</div>`).join('') : `<div class="para grey small" style="text-align:center">No ${kind.toLowerCase()}s in this paperwork</div>`; };
      const key = [d.ak, d.bk].sort((a, b) => kinds.indexOf(a) - kinds.indexOf(b)).join('-');
      return `<div class="gap s"></div><div style="padding:0 10px">${U.seg('ak', kinds, d.ak)}</div>${list('a', d.ak)}<div style="text-align:center;margin:10px 0"><button class="sbtn" data-act="linkType">${esc(d.type || 'Select Link Type')}</button></div><div style="padding:0 10px">${U.seg('bk', kinds, d.bk)}</div>${list('b', d.bk)}<button class="bigbtn ${d.a && d.b && d.type ? '' : 'grey'}" data-act="linkCreate">Create Link</button><div class="footnote">Available link types: ${esc((LINK_TYPES[key] || ['Associated with']).join(', '))}</div>`;
    },
    onChange: (k, v, ctx, tgt) => { if (k === 'ak') { tgt.a = null; tgt.type = ''; } if (k === 'bk') { tgt.b = null; tgt.type = ''; } },
  });
  action('linkPick', (d, el, ctx) => { const t = OD.resolve('tmp:link' + ctx.p.id); const [side, id] = d.a.split('|'); t[side] = t[side] === id ? null : id; N.refresh(ctx.u); });
  action('linkType', (d, el, ctx) => {
    const t = OD.resolve('tmp:link' + ctx.p.id); const kinds = ['Person', 'Vehicle', 'Location', 'Organisation'];
    const key = [t.ak, t.bk].sort((a, b) => kinds.indexOf(a) - kinds.indexOf(b)).join('-');
    OD.ui.sheet({ title: 'Link Type', items: (LINK_TYPES[key] || ['Associated with']).map((x) => ({ label: x, fn: () => { t.type = x; N.refresh(ctx.u); } })) });
  });
  action('linkCreate', (d, el, ctx) => {
    const t = OD.resolve('tmp:link' + ctx.p.id); const pw = OD.db.paperwork[ctx.p.id];
    if (!(t.a && t.b && t.type)) return OD.ui.toast('Select both objects and a link type');
    const nameOf = (kind, id) => (pwObjs(pw, kind).find((o) => o.id === id) || {}).t || id;
    pw.links.push({ a: t.a, b: t.b, type: t.type, text: `${nameOf(t.ak, t.a)} — ${t.type} — ${nameOf(t.bk, t.b)}` });
    OD.tmp['link' + ctx.p.id] = {}; OD.save(); N.pop();
  });

  /* ======================================================= LRT OFFENCE LIBRARY */
  OD.tmp.libEdit = false;
  const libAddLabel = (p) => (p.id && OD.db.paperwork[p.id] ? `Add to ${OD.db.paperwork[p.id].type}` : 'Add');
  screen('lib', {
    title: 'Offence Library',
    right: () => `<button class="nb" data-act="libEdit">${OD.tmp.libEdit ? 'Done' : 'Edit'}</button>`,
    body: (p, ctx) => {
      const code = (ctx.e.code || '').toUpperCase(); const hit = OD.data.lrtByCode[code];
      let h = `<div class="sh">OFFENCE CODE</div><div class="field"><input data-local="code" placeholder="Enter here..." value="${esc(ctx.e.code || '')}" style="text-transform:uppercase" autocomplete="off"></div><div class="btnbar" style="background:#fff;padding-top:4px"><button class="${hit ? '' : 'grey'}" data-act="libCode" data-a="details">Offence Details</button><button class="${hit ? '' : 'grey'}" data-act="libCode" data-a="add">${esc(p.mode === 'add' ? libAddLabel(p) : 'Pin')}</button></div>`;
      const pins = OD.db.pinnedOffences.map((c) => OD.data.lrtByCode[c]).filter(Boolean);
      h += '<div class="sh">PINNED OFFENCES</div>';
      if (!pins.length) h += '<div class="row center" style="color:#8a8a8f">No Pinned Offences</div><div class="footnote">Pin offences to this section by selecting \'Pin\' in the Offence Details screen.</div>';
      else if (OD.tmp.libEdit) h += `<div class="reolist">${pins.map((o) => `<div class="reo" data-code="${o.code}"><button class="minus" data-act="libUnpin" data-a="${o.code}">−</button><span>${esc(o.code)} - ${esc(o.desc)}</span><span class="handle">${I.handle}</span></div>`).join('')}</div><div class="footnote">Drag the handles to reorder, or tap − to remove a pinned offence.</div>`;
      else h += '<div class="group">' + pins.map((o) => `<div class="row" data-go="${OD.go('lib-offence', { code: o.code, mode: p.mode || '', id: p.id || '' })}" style="font-size:13.5px"><div class="grow">${esc(o.code)} - ${esc(o.desc)}</div></div>`).join('') + '</div><div class="footnote">Select \'Edit\' above to remove or reorder pinned offences.</div>';
      h += `<div class="sh">BROWSE CATEGORY</div><div class="group" style="${OD.tmp.libEdit ? 'opacity:.4;pointer-events:none' : ''}"><div class="row" data-go="${OD.go('lib-cat', { cat: 'All', mode: p.mode || '', id: p.id || '' })}">Search All Offences<span class="chev">${I.chev}</span></div>${OD.data.lrtCats.map((c) => `<div class="row" data-go="${OD.go('lib-cat', { cat: c, mode: p.mode || '', id: p.id || '' })}">${esc(c)}<span class="chev">${I.chev}</span></div>`).join('')}</div>`;
      return h;
    },
    onLocal: (k, v, ctx) => { ctx.e.code = v; const hit = OD.data.lrtByCode[v.toUpperCase()]; const b = ctx.el.querySelectorAll('.btnbar button'); b[0].classList.toggle('grey', !hit); b[1].classList.toggle('grey', !hit); },
    mount: (el) => OD.initReorder(el.querySelector('.reolist'), (codes) => { OD.db.pinnedOffences = codes; OD.save(); }),
  });
  action('libEdit', (d, el, ctx) => { OD.tmp.libEdit = !OD.tmp.libEdit; N.refresh(ctx.u); });
  action('libUnpin', (d, el, ctx) => { OD.db.pinnedOffences = OD.db.pinnedOffences.filter((c) => c !== d.a); OD.save(); N.refresh(ctx.u); });
  action('libCode', (d, el, ctx) => {
    const code = (ctx.e.code || '').toUpperCase(); if (!OD.data.lrtByCode[code]) return OD.ui.toast('Enter a valid offence code');
    if (d.a === 'details') return N.push('lib-offence', { code, mode: ctx.p.mode || '', id: ctx.p.id || '' });
    if (ctx.p.mode === 'add') return OD.pwAddOffence(ctx.p.id, code, 'lrt');
    if (!OD.db.pinnedOffences.includes(code)) { OD.db.pinnedOffences.push(code); OD.save(); N.refresh(ctx.u); OD.ui.toast('Offence pinned'); } else OD.ui.toast('Already pinned');
  });
  OD.initReorder = (list, onDone) => {
    if (!list) return;
    let drag = null;
    list.addEventListener('pointerdown', (ev) => {
      const h = ev.target.closest('.handle'); if (!h) return;
      const row = h.closest('.reo'); drag = { row, y0: ev.clientY, id: ev.pointerId }; row.classList.add('dragging'); h.setPointerCapture(ev.pointerId); ev.preventDefault();
    });
    list.addEventListener('pointermove', (ev) => {
      if (!drag) return;
      const dy = ev.clientY - drag.y0; drag.row.style.transform = `translateY(${dy}px)`;
      const hgt = drag.row.offsetHeight;
      if (dy > hgt * 0.6 && drag.row.nextElementSibling) { list.insertBefore(drag.row.nextElementSibling, drag.row); drag.y0 += hgt; drag.row.style.transform = `translateY(${ev.clientY - drag.y0}px)`; }
      if (dy < -hgt * 0.6 && drag.row.previousElementSibling) { list.insertBefore(drag.row, drag.row.previousElementSibling); drag.y0 -= hgt; drag.row.style.transform = `translateY(${ev.clientY - drag.y0}px)`; }
    });
    const end = () => { if (!drag) return; drag.row.classList.remove('dragging'); drag.row.style.transform = ''; drag = null; onDone([...list.querySelectorAll('.reo')].map((r) => r.dataset.code)); };
    list.addEventListener('pointerup', end); list.addEventListener('pointercancel', end);
  };
  screen('lib-cat', {
    title: (p) => (p.cat === 'All' ? 'All Offences' : esc(p.cat)),
    body: (p, ctx) => U.search('Search', 'q', ctx.e.q || '') + `<div class="plist">${OD.screens['lib-cat'].list(p, ctx)}</div>`,
    list: (p, ctx) => {
      const q = (ctx.e.q || '').toLowerCase();
      const items = OD.data.lrt.filter((o) => (p.cat === 'All' || o.cat === p.cat) && (!q || (o.code + ' ' + o.desc).toLowerCase().includes(q)));
      return items.length ? '<div class="group">' + items.map((o) => `<div class="row" data-go="${OD.go('lib-offence', { code: o.code, mode: p.mode || '', id: p.id || '' })}" style="font-size:13.5px"><div class="grow">${esc(o.code)} - ${esc(o.desc)}</div><span class="chev">${I.chev}</span></div>`).join('') + '</div>' : U.empty('No offences found');
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; ctx.el.querySelector('.plist').innerHTML = OD.screens['lib-cat'].list(ctx.p, ctx); },
  });
  screen('lib-offence', {
    title: 'Offence Details',
    right: (p) => `<button class="nb" data-act="libPin">${OD.db.pinnedOffences.includes(p.code) ? 'Unpin' : 'Pin'}</button>`,
    body: (p) => {
      const o = OD.data.lrtByCode[p.code]; if (!o) return U.empty('Unknown offence');
      return `<div class="sh">SUMMARY</div><div class="para"><b>${esc(o.code)} - ${esc(o.desc)}</b>\n${esc(o.eff)}</div><div class="sh">DETAILS</div>${U.kv('Effective', o.eff)}${U.kv('Maximum Fine', o.max)}${U.kv('Notice Type', o.ntype)}${U.kv('Infringement Fee', o.fee ? '$' + o.fee.toFixed(2) : o.speed ? 'Depends on speed' : 'Depends on weight')}${U.kv('Infringement Fee Type', o.fee ? 'Prescribed' : 'Scaled')}${U.kv('Demerit Points', o.dem ?? '—')}${U.kv('Compliance Available', o.comp ? 'Yes (28 days)' : 'No')}${U.kv('Written Warning Available', o.wtw || o.comp ? 'Yes' : 'No')}<div class="sh">OFFENCE WORDING</div><div class="para">${esc(o.text)}</div><div class="sh">LEGISLATIVE REFERENCE</div><div class="para">${esc(o.leg)}</div>${p.mode === 'add' ? `<button class="bigbtn" data-act="libAdd">${esc(libAddLabel(p))}</button>` : ''}`;
    },
  });
  action('libPin', (d, el, ctx) => { const c = ctx.p.code; const a = OD.db.pinnedOffences; const i = a.indexOf(c); if (i >= 0) a.splice(i, 1); else a.push(c); OD.save(); N.refresh(ctx.u); OD.ui.toast(i >= 0 ? 'Offence unpinned' : 'Offence pinned'); });
  action('libAdd', (d, el, ctx) => OD.pwAddOffence(ctx.p.id, ctx.p.code, 'lrt'));

  OD.pwAddOffence = (pwId, code, lib, k) => {
    const pw = OD.db.paperwork[pwId]; if (!pw) return;
    const T = OD.types[pw.type];
    const s = T.sections.find((x) => x.t === 'offences' && (!k || x.k === k));
    if (T.canAddOffence) { const msg = T.canAddOffence(pw, code, lib); if (msg) return OD.ui.alert({ title: 'Cannot add offence', msg }); }
    if (s && s.max && pw.off.filter((o) => !s.k || o.k === s.k).length >= s.max) return OD.ui.alert({ title: 'Limit reached', msg: `Only ${s.max} offence${s.max > 1 ? 's' : ''} can be added.` });
    const o = { id: OD.uid('of'), code, lib, k: s?.k };
    T.initOffence && T.initOffence(o, pw);
    pw.off.push(o); pw.updated = Date.now(); OD.save();
    const top = N.st.modals[N.st.modals.length - 1] || N.layers()[N.layers().length - 1];
    while (top.length > 1 && top[top.length - 1].s !== 'pw') top.pop();
    top.push(N.entry('form', { t: `pw:${pw.id}:off#${o.id}`, f: offForm(pw, s, o), rm: 1 }));
    N.commit('pop');
  };

  /* ============================================================ NIA offences */
  screen('nia-lib', {
    title: 'Incident / Offence',
    body: (p, ctx) => U.search('Search code or description', 'q', ctx.e.q || '') + `<div class="plist">${OD.screens['nia-lib'].list(p, ctx)}</div>`,
    list: (p, ctx) => {
      const pw = OD.db.paperwork[p.id]; const T = OD.types[pw.type];
      const q = (ctx.e.q || '').toLowerCase();
      const items = OD.data.nia.filter((o) => (!T.niaFilter || T.niaFilter(o)) && (!q || (o.code + ' ' + o.desc).toLowerCase().includes(q)));
      const common = (T.niaCommon || []).map((c) => OD.data.niaByCode[c]).filter(Boolean);
      const row = (o) => `<div class="row" data-act="niaPick" data-a="${o.code}" style="font-size:13.5px;${pw.type === 'OR' && o.noOR ? 'color:#aaa' : ''}"><div class="grow">${esc(o.code)} - ${esc(o.desc)}</div></div>`;
      return (common.length && !q ? '<div class="sh">COMMON</div><div class="group">' + common.map(row).join('') + '</div>' : '') + '<div class="sh">ALL</div><div class="group">' + items.map(row).join('') + '</div>';
    },
    onLocal: (k, v, ctx) => { ctx.e.q = v; ctx.el.querySelector('.plist').innerHTML = OD.screens['nia-lib'].list(ctx.p, ctx); },
  });
  action('niaPick', (d, el, ctx) => OD.pwAddOffence(ctx.p.id, d.a, 'nia', ctx.p.k || undefined));

  /* ========================================================= PAPERWORK TAB */
  OD.paperworkBadge = () => Object.values(OD.db?.paperwork || {}).filter((p) => p.status === 'Incomplete' && p.qid === OD.db.me.qid).length;
  const pwRow = (pw) => {
    const T = OD.types[pw.type]; if (!T) return '';
    const d = pw.occ.date ? `${F.dmy(pw.occ.date)} - ${pw.occ.date_t || ''}` : F.stamp(pw.created);
    const sub = OD.pwSubject(pw);
    const grey = pw.status !== 'Incomplete';
    return `<div class="pwrow" data-present="${OD.go('pw', { id: pw.id })}">${I.doc(pw.type, grey && pw.status !== 'Completed' ? '#8e8e93' : '#3a8def')}<div style="flex:1;min-width:0"><div class="t">${esc(d)}</div>${sub ? `<div class="s">${esc(sub)}</div>` : ''}<div class="q"><span>${esc(pw.qid)}</span><span>${esc(pw.returned && pw.status === 'Incomplete' ? 'Returned' : pw.status)}</span></div></div>${pw.status === 'Awaiting Approval' || pw.returned ? '<span class="excl">!</span>' : ''}</div>`;
  };
  OD.tmp.pwFilter = 'All';
  screen('paperwork', {
    title: 'Paperwork',
    left: `<button class="nb icon" data-act="pwFilter">${I.filter}</button>`,
    extra: '<button class="fullbtn" data-present="take-action">Take Action</button>',
    cls: '',
    body: () => {
      const all = Object.values(OD.db.paperwork).filter((p) => OD.types[p.type] && (OD.tmp.pwFilter === 'All' || p.type === OD.tmp.pwFilter));
      const by = (fn) => all.filter(fn).sort((a, b) => (b.occ.date ? new Date(b.occ.date + 'T' + (b.occ.date_t || '00:00')).getTime() : b.created) - (a.occ.date ? new Date(a.occ.date + 'T' + (a.occ.date_t || '00:00')).getTime() : a.created));
      const groups = [
        ['Awaiting Approval', by((p) => p.status === 'Awaiting Approval' || p.status === 'Abandon Requested')],
        ['Returned', by((p) => p.status === 'Incomplete' && p.returned)],
        ['Incomplete', by((p) => p.status === 'Incomplete' && !p.returned)],
        ['Queued', by((p) => p.status === 'Queued (Offline)')],
        ['Completed', by((p) => ['Completed', 'Submitted', 'Processing', 'At Prop', 'Cancelled', 'Sent to FMC'].includes(p.status) && Date.now() - (p.submitted || p.updated) < 30 * 864e5)],
      ].filter((g) => g[1].length);
      if (!groups.length) return U.empty('No paperwork');
      return (OD.tmp.pwFilter !== 'All' ? `<div class="center-note">Showing ${esc(OD.types[OD.tmp.pwFilter].name)} only</div>` : '') + groups.map(([t, arr]) => `<div class="listhead">${t}${t === 'Completed' ? ' <small style="font-weight:400;color:#888">(last 30 days)</small>' : ''}</div>` + arr.map(pwRow).join('')).join('');
    },
  });
  action('pwFilter', () => OD.ui.sheet({ title: 'Filter paperwork by type', items: [{ label: 'Show All', fn: () => { OD.tmp.pwFilter = 'All'; N.refresh(); } }, ...TA_ORDER.map((c) => ({ label: `${c} - ${OD.types[c].name}`, fn: () => { OD.tmp.pwFilter = c; N.refresh(); } }))] }));
  OD.pwRow = pwRow;
})();
