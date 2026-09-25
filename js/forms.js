/* =========================================================================
   OnDuty recreation – declarative form engine
   Field kinds (key property decides the kind):
     h   section header            p   paragraph         note  footnote
     seg segmented control         t   text input        a     text area
     pk  push-picker               dt  date (+time)      tm    time only
     dur duration hh:mm:ss         nsew compass          sub   nested form row
     list repeatable entries       person  select person(s) from paperwork
     rights read-aloud text        link  CheckPoint link  btn  button
     html custom renderer          info  read-only key/value
   Common props: l label, o options, w(d,pw) visibility, req / opt, ph placeholder
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc;
  const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
  OD.val = val;
  OD.tmp = {};

  /* --------------------------------------------------------- data references */
  OD.getPath = (obj, path, create = true) => {
    if (!obj) return null;
    if (!path) return obj;
    let o = obj;
    for (const seg of path.split('.')) {
      if (!seg) continue;
      if (seg.includes('#')) {
        const [arr, id] = seg.split('#');
        o = (o[arr] || []).find((e) => e.id === id);
        if (!o) return null;
      } else {
        if (o[seg] == null || typeof o[seg] !== 'object') { if (!create) return null; o[seg] = {}; }
        o = o[seg];
      }
    }
    return o;
  };
  OD.resolve = (ref) => {
    if (!ref) return null;
    const i = ref.indexOf(':');
    const kind = i < 0 ? ref : ref.slice(0, i), rest = i < 0 ? '' : ref.slice(i + 1);
    if (kind === 'pw') { const j = rest.indexOf(':'); const id = j < 0 ? rest : rest.slice(0, j); const pw = OD.db.paperwork[id]; return pw ? OD.getPath(pw, j < 0 ? '' : rest.slice(j + 1)) : null; }
    if (kind === 'db') return OD.getPath(OD.db, rest);
    if (kind === 'tmp') { const [k, ...p] = rest.split('.'); OD.tmp[k] = OD.tmp[k] || {}; return OD.getPath(OD.tmp[k], p.join('.')); }
    return null;
  };
  OD.pwOfRef = (ref) => { if (!ref || !ref.startsWith('pw:')) return null; const id = ref.slice(3).split(':')[0]; return OD.db.paperwork[id] || null; };
  OD.removeByRef = (ref) => {
    // ref like pw:ID:a.b#id  -> remove entry id from array b under a
    const pw = OD.pwOfRef(ref); const root = pw || (ref.startsWith('db:') ? OD.db : null); if (!root) return false;
    const path = ref.startsWith('pw:') ? ref.split(':').slice(2).join(':') : ref.slice(3);
    const segs = path.split('.'); const last = segs.pop();
    if (!last.includes('#')) { const parent = OD.getPath(root, segs.join('.')); if (parent) delete parent[last]; return true; }
    const [arr, id] = last.split('#'); const parent = OD.getPath(root, segs.join('.'));
    if (!parent || !Array.isArray(parent[arr])) return false;
    parent[arr] = parent[arr].filter((e) => e.id !== id); return true;
  };

  /* --------------------------------------------------------------- options */
  OD.optProviders = {};
  const normOpt = (o) => (typeof o === 'string' ? { v: o, l: o } : { v: o.v, l: o.l ?? o.v, sub: o.sub });
  OD.options = (oref, d, pw) => {
    let arr = [];
    if (Array.isArray(oref)) arr = oref;
    else if (typeof oref === 'string') {
      if (oref.startsWith('l:')) arr = OD.lists[oref.slice(2)] || [];
      else if (oref.startsWith('f:')) {
        const [, fid, k, which] = oref.split(':'); const fl = findField(fid, k);
        if (fl && which === 'lo') { const lo = val(fl.lo, d, pw); arr = Array.isArray(lo) ? lo : OD.lists[String(lo).replace(/^l:/, '')] || []; }
        else arr = fl ? optsOf(fl, d, pw) : [];
      }
      else if (oref.startsWith('x:')) { const [, name, ...arg] = oref.split(':'); arr = OD.optProviders[name] ? OD.optProviders[name](arg.join(':'), d, pw) : []; }
      else arr = OD.lists[oref] || [];
    }
    return arr.map(normOpt);
  };
  const optsOf = (fl, d, pw) => { const o = val(fl.o, d, pw); return Array.isArray(o) ? o : OD.lists[o] || []; };
  const findField = (fid, k) => {
    const f = OD.forms[fid]; if (!f) return null;
    return (f.fields || []).find((fl) => keyOf(fl) === k || fl.person === k);
  };
  OD.findField = findField;

  /* ------------------------------------------------------------ status logic */
  const keyOf = (fl) => fl.seg || fl.t || fl.a || fl.pk || fl.dt || fl.tm || fl.dur || fl.nsew || fl.num;
  OD.keyOf = keyOf;
  const isReq = (fl, d, pw) => (val(fl.opt, d, pw) ? false : val(fl.req, d, pw) ? true : !!(fl.seg || fl.pk || fl.dt || fl.tm));
  const filled = (fl, d) => {
    const k = keyOf(fl); const v = d ? d[k] : undefined;
    const ok = Array.isArray(v) ? v.length > 0 : v !== undefined && v !== null && v !== '';
    if (ok && fl.dt && fl.time !== false && !fl.dateOnly) return !!d[k + '_t'];
    return ok;
  };
  OD.filled = filled;
  OD.formStatus = (fid, d, pw) => {
    const f = OD.forms[fid];
    if (!f || !d) return 'none';
    if (f.status) return f.status(d, pw);
    let req = 0, ok = 0, touched = false;
    for (const fl of f.fields) {
      if (fl.w && !fl.w(d, pw)) continue;
      if (fl.sub) {
        const s = OD.formStatus(fl.f, d[fl.sub], pw);
        if (s !== 'none') touched = true;
        if (val(fl.opt, d, pw)) continue;
        req++; if (s === 'done') ok++;
        continue;
      }
      if (fl.list) {
        const arr = d[fl.list] || [];
        if (arr.length) touched = true;
        if (fl.min) { req++; if (arr.length >= fl.min && arr.every((e) => OD.formStatus(fl.f, e, pw) === 'done')) ok++; }
        else if (arr.some((e) => OD.formStatus(fl.f, e, pw) !== 'done')) { req++; }
        continue;
      }
      if (fl.person) {
        const v = d[fl.person]; const has = Array.isArray(v) ? v.length : !!v;
        if (has) touched = true;
        if (!val(fl.opt, d, pw)) { req++; if (has) ok++; }
        continue;
      }
      if (!keyOf(fl)) continue;
      const fi = filled(fl, d);
      if (fi) touched = true;
      if (isReq(fl, d, pw)) { req++; if (fi) ok++; }
    }
    if (!req) return touched ? 'done' : 'none';
    return ok === req ? 'done' : ok > 0 || touched ? 'partial' : 'none';
  };
  OD.missingFields = (fid, d, pw, prefix = '') => {
    const f = OD.forms[fid]; const out = [];
    if (!f || !d) return [prefix || (f && val(f.title, d, pw)) || 'Details'];
    for (const fl of f.fields) {
      if (fl.w && !fl.w(d, pw)) continue;
      if (fl.sub && !val(fl.opt, d, pw) && OD.formStatus(fl.f, d[fl.sub], pw) !== 'done') out.push(val(fl.l, d, pw));
      else if (fl.person && !val(fl.opt, d, pw) && !(Array.isArray(d[fl.person]) ? d[fl.person].length : d[fl.person])) out.push(val(fl.l, d, pw));
      else if (keyOf(fl) && isReq(fl, d, pw) && !filled(fl, d)) out.push(stripTags(val(fl.l, d, pw) || keyOf(fl)));
    }
    return out;
  };
  const stripTags = (s) => String(s || '').replace(/<[^>]*>/g, '');

  /* ---------------------------------------------------------- field renderers */
  const lbl = (fl, d, fc) => {
    const l = val(fl.l, d, fc.pw);
    if (l === undefined || l === null) return '';
    const miss = fc.reviewed && isReq(fl, d, fc.pw) && !filled(fl, d);
    return `<span class="lbl ${miss ? 'req' : ''}">${l}${miss ? ' - is required' : ''}${fl.hint ? ` <span class="hint">${esc(fl.hint)}</span>` : ''}</span>`;
  };
  const dis = (fc, fl) => fc.locked && !fl.always;
  const R = {};
  R.h = (fl, d, fc) => `<div class="sh ${fl.cls || ''}">${val(fl.h, d, fc.pw)}</div>`;
  R.p = (fl, d, fc) => `<div class="para ${fl.cls || ''}">${val(fl.p, d, fc.pw)}</div>`;
  R.note = (fl, d, fc) => `<div class="footnote">${val(fl.note, d, fc.pw)}</div>`;
  R.gap = () => '<div class="gap s"></div>';
  R.seg = (fl, d, fc) => {
    const miss = fc.reviewed && isReq(fl, d, fc.pw) && !filled(fl, d);
    const opts = optsOf(fl, d, fc.pw);
    return `<div class="field ${miss ? 'req' : ''}">${lbl(fl, d, fc)}${U.seg(fl.seg, opts, d[fl.seg], dis(fc, fl) ? 'dis' : '')}</div>`;
  };
  R.t = (fl, d, fc) => {
    const k = fl.t; const icons = [];
    if (fl.cam) icons.push(`<button class="ficon cam" data-act="scan" data-k="${k}" data-kind="${fl.cam}">${I.camera}</button>`);
    if (fl.lo) icons.push(`<button class="ficon" data-go="${OD.go('picker', { t: fc.ref, k, o: typeof fl.lo === 'string' ? fl.lo : `f:${fc.fid}:${k}:lo`, title: stripTags(val(fl.l, d, fc.pw)) || 'Select' })}">${I.list}</button>`);
    const miss = fc.reviewed && isReq(fl, d, fc.pw) && !filled(fl, d);
    return `<div class="field ${icons.length ? 'has-icon' : ''} ${miss ? 'req' : ''}">${lbl(fl, d, fc)}<input type="text" data-k="${k}" value="${esc(d[k] ?? '')}" placeholder="${esc(fl.ph ?? 'Tap to add...')}" ${fl.kb ? `inputmode="${fl.kb}"` : ''} ${fl.max ? `maxlength="${fl.max}"` : ''} ${fl.upper ? 'style="text-transform:uppercase"' : ''} ${dis(fc, fl) ? 'readonly' : ''} autocomplete="off">${icons.join('')}</div>`;
  };
  R.num = (fl, d, fc) => R.t({ ...fl, t: fl.num, kb: 'numeric' }, d, fc);
  R.a = (fl, d, fc) => {
    const k = fl.a; const v = d[k] ?? '';
    const miss = fc.reviewed && isReq(fl, d, fc.pw) && !filled(fl, d);
    return `<div class="field ${miss ? 'req' : ''}">${lbl(fl, d, fc)}<textarea data-k="${k}" rows="${fl.rows || 3}" class="${fl.tall ? 'tall' : ''}" placeholder="${esc(fl.ph ?? 'Tap to add...')}" ${fl.max ? `maxlength="${fl.max}"` : ''} ${dis(fc, fl) ? 'readonly' : ''}>${esc(v)}</textarea>${fl.max ? `<span class="count">${String(v).length} / ${fl.max}</span>` : ''}</div>`;
  };
  R.pk = (fl, d, fc) => {
    const k = fl.pk; let v = d[k];
    if (Array.isArray(v)) v = v.join(', ');
    const miss = fc.reviewed && isReq(fl, d, fc.pw) && !filled(fl, d);
    const go = dis(fc, fl) ? '' : `data-go="${OD.go('picker', { t: fc.ref, k, o: typeof fl.o === 'string' && !fl.o.startsWith('f:') ? (fl.o.includes(':') ? fl.o : 'l:' + fl.o) : `f:${fc.fid}:${k}`, title: fl.title || stripTags(val(fl.l, d, fc.pw)) || 'Select', multi: fl.multi ? 1 : '', search: fl.search ? 1 : '' })}"`;
    return `<div class="field pick ${miss ? 'req' : ''}" ${go}>${lbl(fl, d, fc)}<div class="pv ${v ? '' : 'ph'}">${esc(v || fl.ph || 'Select')}</div></div>`;
  };
  R.dt = (fl, d, fc) => {
    const k = fl.dt; const date = d[k], time = d[k + '_t'];
    const miss = fc.reviewed && isReq(fl, d, fc.pw) && !filled(fl, d);
    const lock = dis(fc, fl);
    const withTime = fl.time !== false && !fl.dateOnly;
    return `<div class="field ${miss ? 'req' : ''}">${lbl(fl, d, fc)}<div class="dtrow ${withTime ? '' : 'notime'}"><div class="dtbox ${date ? '' : 'ph'}" ${lock ? '' : `data-act="pickDate" data-k="${k}" data-mode="date"`}>${date ? F.dmy(date) : fl.dph || 'DD/MM/YYYY'}</div><div class="dtbox wd">${date ? F.wd(date) : ''}</div>${withTime ? `<div class="dtbox tm ${time ? '' : 'ph'}" ${lock ? '' : `data-act="pickDate" data-k="${k}_t" data-mode="time"`}>${time || '--:--'}</div>` : ''}</div></div>`;
  };
  R.tm = (fl, d, fc) => {
    const k = fl.tm; const v = d[k];
    return `<div class="field">${lbl(fl, d, fc)}<div class="dtrow timeonly"><div class="dtbox ${v ? '' : 'ph'}" ${dis(fc, fl) ? '' : `data-act="pickDate" data-k="${k}" data-mode="time"`}>${v || '--:--'}</div></div></div>`;
  };
  R.dur = (fl, d, fc) => {
    const k = fl.dur; const v = d[k];
    return `<div class="field">${lbl(fl, d, fc)}<div class="dtrow timeonly"><div class="dtbox ${v ? '' : 'ph'}" ${dis(fc, fl) ? '' : `data-act="pickDate" data-k="${k}" data-mode="duration"`}>${v || 'HH:MM:SS'}</div></div></div>`;
  };
  R.nsew = (fl, d, fc) => `<div class="field">${lbl(fl, d, fc)}<div class="nsew" data-k="${fl.nsew}">${['N', 'S', 'E', 'W'].map((x) => `<button class="${d[fl.nsew] === x ? 'on' : ''}" ${dis(fc, fl) ? '' : `data-ns="${x}"`}>${x}</button>`).join('')}</div></div>`;
  R.sub = (fl, d, fc) => {
    const child = d[fl.sub] || {};
    const st = OD.formStatus(fl.f, child, fc.pw);
    if (fl.lockUntil && !fl.lockUntil(d, fc.pw)) return `<div class="row lg" style="opacity:.45">${U.circ('')}<div class="grow"><div class="kv-k">${val(fl.l, d, fc.pw)}</div><div class="kv-v" style="font-size:12px">Complete the previous step first</div></div></div>`;
    const miss = fc.reviewed && !val(fl.opt, d, fc.pw) && st !== 'done';
    const summary = val(fl.sum, child, fc.pw);
    return `<div class="row lg" data-go="${OD.go('form', { t: fc.ref + '.' + fl.sub, f: fl.f })}">${U.circ(miss ? 'error' : st)}<div class="grow"><div class="kv-k">${val(fl.l, d, fc.pw)}</div>${summary ? `<div class="kv-v">${esc(summary)}</div>` : ''}</div><span class="chev">${I.chev}</span></div>`;
  };
  R.list = (fl, d, fc) => {
    const arr = d[fl.list] || [];
    const rows = arr.map((e) => {
      const st = OD.formStatus(fl.f, e, fc.pw);
      return `<div class="row lg" data-go="${OD.go('form', { t: `${fc.ref}.${fl.list}#${e.id}`, f: fl.f, rm: 1 })}">${U.circ(st)}<div class="grow"><div class="kv-k">${esc(val(fl.title, e, fc.pw) || 'Entry')}</div>${fl.sum ? `<div class="kv-v">${esc(val(fl.sum, e, fc.pw) || '')}</div>` : ''}</div><span class="chev">${I.chev}</span></div>`;
    }).join('');
    const canAdd = !dis(fc, fl) && (!fl.max || arr.length < fl.max);
    return rows + (canAdd ? `<div class="row add" data-act="formListAdd" data-k="${fl.list}" data-f="${fl.f}">${esc(fl.add || '+ Add')}</div>` : '');
  };
  R.person = (fl, d, fc) => {
    const v = d[fl.person]; const ids = Array.isArray(v) ? v : v ? [v] : [];
    const go = dis(fc, fl) ? '' : `data-go="${OD.go('pick-person', { t: fc.ref, k: fl.person, multi: fl.multi ? 1 : '', title: stripTags(val(fl.l, d, fc.pw)), src: fl.src || '' })}"`;
    const miss = fc.reviewed && !val(fl.opt, d, fc.pw) && !ids.length;
    return `<div class="rolebar ${miss ? '' : ''}" ${go} style="${miss ? 'background:var(--ios-red)' : ''}">${val(fl.l, d, fc.pw)}</div>` + ids.map((pid) => OD.personCard(OD.person(pid), { boxed: true, check: true, checked: true, safvr: fl.safvr })).join('') + (ids.length ? '' : `<div class="para grey small" style="text-align:center">${fl.ph || 'Tap above to select'}</div>`);
  };
  R.rights = (fl, d, fc) => `<div class="para" style="padding-top:10px">${val(fl.rights, d, fc.pw).split('\n\n').map((x) => `<p style="margin:0 0 10px">${esc(x)}</p>`).join('')}</div>`;
  R.link = (fl, d, fc) => `<div class="row link" data-act="checkpoint" data-a="${esc(fl.link)}"><span style="margin-right:8px;display:flex">${I.checkpoint}</span>${esc(fl.link)}</div>`;
  R.btn = (fl, d, fc) => `<button class="bigbtn ${fl.cls || ''}" data-act="${fl.act}" data-a="${esc(fl.a || '')}">${esc(val(fl.btn, d, fc.pw))}</button>`;
  R.html = (fl, d, fc) => fl.html(d, fc.pw, fc);
  R.info = (fl, d, fc) => U.kv(val(fl.l, d, fc.pw), val(fl.info, d, fc.pw) || '—');
  R.concern = (fl, d, fc) => { const c = val(fl.concern, d, fc.pw) || 'None'; return `<div class="concern ${c}">${c === 'None' ? 'Not yet assessed' : c}</div>`; };

  const kindOf = (fl) => ['h', 'p', 'note', 'gap', 'seg', 'num', 't', 'a', 'pk', 'dt', 'tm', 'dur', 'nsew', 'sub', 'list', 'person', 'rights', 'link', 'btn', 'html', 'info', 'concern'].find((k) => fl[k] !== undefined);
  OD.renderFields = (fields, d, fc) => fields.map((fl) => {
    if (fl.w && !fl.w(d, fc.pw)) return '';
    const kind = kindOf(fl);
    return kind ? R[kind](fl, d, fc) : '';
  }).join('');

  /* ================================================================ SCREENS */
  // Generic form screen: params t (data ref), f (form id), rm (show Remove)
  OD.screen = (id, def) => (OD.screens[id] = def);
  OD.action = (id, fn) => (OD.actions[id] = fn);
  const formCtx = (p) => {
    const f = OD.forms[p.f] || { fields: [] };
    const d = OD.resolve(p.t) || {};
    const pw = OD.pwOfRef(p.t);
    const locked = pw && pw.locked && !f.allowLocked && !(pw.locked === 'notes' && f.notes);
    return { f, d, pw, fc: { ref: p.t, fid: p.f, pw, reviewed: pw && pw.reviewed, locked } };
  };
  OD.screen('form', {
    title: (p) => { const { f, d, pw } = formCtx(p); return val(f.title, d, pw) || 'Details'; },
    back: (p) => OD.forms[p.f]?.back,
    left: (p, ctx) => { const f = OD.forms[p.f]; return f && f.left ? val(f.left, p, ctx) : null; },
    right: (p) => { const { f, d, pw, fc } = formCtx(p); if (f.right) return val(f.right, d, pw, p); return p.rm && !fc.locked ? '<button class="nb" data-act="formRemove">Remove</button>' : ''; },
    extra: (p) => { const { f, d, pw } = formCtx(p); return f.extra ? val(f.extra, d, pw, p) : ''; },
    target: (p) => OD.resolve(p.t),
    cls: 'grouped',
    body: (p) => {
      const { f, d, pw, fc } = formCtx(p);
      if (!OD.resolve(p.t)) return U.empty('This item no longer exists.');
      if (f.init && !d._init) { f.init(d, pw); d._init = 1; OD.save(); }
      const top = f.top ? val(f.top, d, pw, fc) : '';
      const fields = val(f.fields, d, pw);
      const save = f.noSave || fc.locked ? '' : `<button class="bigbtn" data-act="formSave">${esc(f.saveLabel || 'Save')}</button>`;
      return top + OD.renderFields(fields, d, fc) + (f.bottom ? val(f.bottom, d, pw, fc) : '') + save;
    },
    onChange: (k, v, ctx, tgt) => {
      const { f, pw } = formCtx(ctx.p);
      f.onChange && f.onChange(k, v, tgt, pw);
      if (pw) pw.updated = Date.now();
      const fl = findField(ctx.p.f, k);
      // text inputs: repaint only when the field drives visibility
      if (fl && (fl.t || fl.a || fl.num) && fl.rr) OD.nav.refresh(ctx.u);
    },
    mount: (el) => el.querySelectorAll('textarea').forEach((t) => { t.style.height = 'auto'; t.style.height = Math.max(t.scrollHeight, 60) + 'px'; }),
  });
  OD.action('formSave', (d, el, ctx) => {
    const { f, d: data, pw } = formCtx(ctx.p);
    if (f.onSave && f.onSave(data, pw, ctx) === false) return;
    if (pw) pw.updated = Date.now();
    OD.save();
    if (f.afterSave) f.afterSave(data, pw, ctx); else OD.nav.pop();
  });
  OD.action('formRemove', (d, el, ctx) => {
    const { f } = formCtx(ctx.p);
    OD.ui.confirm('Remove', `Remove this ${f.noun || 'item'} from the paperwork?`, 'Remove', () => { OD.removeByRef(ctx.p.t); OD.save(); OD.nav.pop(); }, true);
  });
  OD.action('formListAdd', (d, el, ctx) => {
    const tgt = OD.target(ctx); if (!tgt) return;
    const fl = findField(ctx.p.f, d.k) || (OD.forms[ctx.p.f].fields || []).find((x) => x.list === d.k);
    const e = { id: OD.uid('le') };
    if (fl && fl.init) fl.init(e, tgt);
    (tgt[d.k] = tgt[d.k] || []).push(e);
    OD.save();
    OD.nav.push('form', { t: `${ctx.p.t}.${d.k}#${e.id}`, f: d.f, rm: 1 });
  });
  OD.action('pickDate', (d, el, ctx) => {
    const tgt = OD.targetFor(el, ctx); if (!tgt) return;
    OD.ui.wheel({
      mode: d.mode, value: tgt[d.k],
      onDone: (v) => {
        tgt[d.k] = v;
        const def = OD.screens[ctx.e.s]; def.onChange && def.onChange(d.k, v, ctx, tgt);
        OD.save(); OD.nav.refresh(ctx.u);
      },
    });
  });
  const SCAN = { dl: () => 'DL' + String(Math.floor(100000 + Math.random() * 899999)), rego: () => 'ABC123', tsl: () => 'TSL123456', id: () => 'SN' + Math.floor(Math.random() * 1e8), serial: () => String(Math.floor(100000 + Math.random() * 899999)) };
  OD.action('scan', (d, el, ctx) => {
    OD.ui.scan(d.kind, () => {
      const tgt = OD.targetFor(el, ctx); if (!tgt) return;
      tgt[d.k] = (SCAN[d.kind] || SCAN.id)();
      const def = OD.screens[ctx.e.s]; def.onChange && def.onChange(d.k, tgt[d.k], ctx, tgt);
      OD.save(); OD.nav.refresh(ctx.u); OD.ui.toast('Scanned: ' + tgt[d.k]);
    });
  });
  OD.action('checkpoint', (d) => OD.ui.alert({ title: 'CheckPoint', msg: `This link opens “${d.a}” guidance in the CheckPoint app. (Not included in this recreation.)` }));

  // ---------------------------------------------------------------- picker
  OD.screen('picker', {
    title: (p) => esc(p.title || 'Select'),
    right: (p) => (p.multi ? '<button class="nb bold" data-back>Done</button>' : ''),
    target: (p) => OD.resolve(p.t),
    cls: 'grouped',
    body: (p, ctx) => {
      const opts = OD.options(p.o, OD.resolve(p.t), OD.pwOfRef(p.t));
      const search = p.search || opts.length > 8;
      return (search ? U.search('Search', 'q', ctx.e.q || '') : '<div class="gap s"></div>') + `<div class="plist">${OD.screens.picker.list(p, ctx, opts)}</div>`;
    },
    list: (p, ctx, opts) => {
      opts = opts || OD.options(p.o, OD.resolve(p.t), OD.pwOfRef(p.t));
      const tgt = OD.resolve(p.t) || {}; const cur = tgt[p.k];
      const q = (ctx.e.q || '').toLowerCase();
      const rows = opts.map((o, i) => ({ o, i })).filter(({ o }) => !q || String(o.l).toLowerCase().includes(q));
      if (!rows.length) return U.empty('No matches');
      return '<div class="group">' + rows.map(({ o, i }) => {
        const sel = Array.isArray(cur) ? cur.includes(o.v) : cur === o.v;
        return `<div class="row" data-act="pickOpt" data-a="${i}"><div class="grow"><div class="kv-k" style="font-size:14px">${esc(o.l)}</div>${o.sub ? `<div class="kv-v" style="font-size:12px">${esc(o.sub)}</div>` : ''}</div>${sel ? `<span style="color:var(--tint);position:absolute;right:12px">${I.check}</span>` : ''}</div>`;
      }).join('') + '</div>';
    },
    onLocal: (k, v, ctx, el) => { ctx.e.q = v; const box = ctx.el.querySelector('.plist'); box.innerHTML = OD.screens.picker.list(ctx.p, ctx); },
  });
  OD.action('pickOpt', (d, el, ctx) => {
    const p = ctx.p; const tgt = OD.resolve(p.t); if (!tgt) return;
    const pw = OD.pwOfRef(p.t);
    const o = OD.options(p.o, tgt, pw)[+d.a];
    if (p.multi) {
      const arr = Array.isArray(tgt[p.k]) ? tgt[p.k] : [];
      const i = arr.indexOf(o.v); if (i >= 0) arr.splice(i, 1); else arr.push(o.v);
      tgt[p.k] = arr; OD.save(); OD.nav.refresh(ctx.u); return;
    }
    tgt[p.k] = o.v;
    // notify the form that owns this data (for onChange hooks)
    const prev = ctx.stack[ctx.stack.indexOf(ctx.e) - 1];
    if (prev && prev.s === 'form') { const f = OD.forms[prev.p.f]; f && f.onChange && f.onChange(p.k, o.v, tgt, pw); }
    if (prev && OD.screens[prev.s]?.onChange && prev.s !== 'form') OD.screens[prev.s].onChange(p.k, o.v, { p: prev.p, e: prev }, tgt);
    if (pw) pw.updated = Date.now();
    OD.save(); OD.nav.pop();
  });

  // --------------------------------------------------- pick persons from paperwork
  OD.screen('pick-person', {
    title: (p) => esc(p.title || 'Select Person'),
    right: (p) => (p.multi ? '<button class="nb bold" data-back>Done</button>' : ''),
    target: (p) => OD.resolve(p.t),
    body: (p) => {
      const pw = OD.pwOfRef(p.t); const tgt = OD.resolve(p.t) || {};
      const cur = tgt[p.k]; const sel = Array.isArray(cur) ? cur : cur ? [cur] : [];
      const pids = OD.pwPersonIds(pw);
      const card = (pid) => OD.personCard(OD.person(pid), { compact: true, check: true, checked: sel.includes(pid), act: 'pickPersonToggle', a: pid, safvr: true });
      let h = '';
      if (p.src === 'any') h += `<div style="padding:8px 10px;background:var(--grouped)"><button class="fullbtn" data-present="${OD.go('qp', { pick: `field|${p.t}|${p.k}|${p.multi ? 1 : ''}` })}">QP / Query Person</button></div>`;
      if (pids.length) h += '<div class="sh">PERSONS IN PAPERWORK</div>' + pids.map(card).join('');
      if (p.src === 'any' && pw) {
        const { groups } = OD.pwCandidates(pw, 'person');
        groups.forEach(([title, ids]) => { const rest = ids.filter((id) => !pids.includes(id) && OD.person(id)); if (rest.length) h += `<div class="sh">${esc(title)}</div>` + rest.map(card).join(''); });
      }
      return h || U.empty('Add persons to the paperwork first.<br><br>Persons added to the paperwork will be available to select here.');
    },
  });
  OD.action('pickPersonToggle', (d, el, ctx) => {
    const p = ctx.p; const tgt = OD.resolve(p.t); if (!tgt) return;
    if (p.multi) { const arr = Array.isArray(tgt[p.k]) ? tgt[p.k] : []; const i = arr.indexOf(d.a); if (i >= 0) arr.splice(i, 1); else arr.push(d.a); tgt[p.k] = arr; OD.save(); OD.nav.refresh(ctx.u); }
    else { tgt[p.k] = d.a; OD.save(); OD.nav.pop(); }
  });

  /* ============================================================ CARD RENDERERS */
  OD.personCard = (p, o = {}) => {
    if (!p) return '';
    const attrs = o.go ? `data-go="${esc(o.go)}"` : o.act ? `data-act="${o.act}" data-a="${esc(o.a ?? p.id)}"` : '';
    const age = F.age(p.dob);
    if (o.small) {
      return `<div class="card person-sm ${o.boxed ? 'boxed' : ''}" ${attrs}><div class="ph round">${p.photoless ? OD.silhouette() : `<div style="width:34px;height:34px;border-radius:50%;overflow:hidden">${OD.avatar(p.id, p.g)}</div>`}</div><div class="info"><div class="nm">${esc(OD.fullName(p))}${o.ageInName ? ` (${age} yrs)` : ''}</div>${o.sub !== false ? `<div class="sub">${esc(o.sub || `${p.g}, ${age}`)}</div>` : ''}${U.pills(p.alerts)}</div>${o.chev !== false && attrs ? `<span class="chev">${I.chev}</span>` : ''}</div>`;
    }
    const safvr = o.safvr && p.safvr ? `, SAFVR - <span style="color:${p.safvr === 'Low' ? 'var(--green)' : p.safvr === 'High' ? 'var(--ios-red)' : 'var(--orange)'}">${esc(p.safvr)}</span>` : '';
    if (o.compact) {
      return `<div class="card ${o.boxed ? 'boxed' : ''} ${o.checked ? 'sel' : ''}" ${attrs}><div class="ph sm">${p.photoless ? OD.silhouette() : OD.avatar(p.id, p.g)}</div><div class="info"><div class="nm">${esc(OD.fullName(p))}</div><div class="sub">${esc(p.g)}, ${age}${safvr}</div>${U.pills(p.alerts)}</div>${o.check ? `<span class="check ${o.checked ? 'on' : ''}"></span>` : ''}<span class="badge-r" style="bottom:auto;top:50%;transform:translateY(-50%)">${I.badge}</span></div>`;
    }
    if (o.nameTop) return `<div class="pcard-wrap" ${attrs} style="cursor:${attrs ? 'pointer' : 'default'}"><div class="nm-top">${esc(OD.fullName(p))}</div>${OD.personCard(p, { ...o, nameTop: false, noName: true, go: null, act: null, chev: attrs ? true : false, fakeChev: !!attrs })}</div>`;
    return `<div class="card ${o.boxed ? 'boxed' : ''} ${o.checked ? 'sel' : ''}" ${attrs}><div class="ph">${OD.avatar(p.id, p.g)}</div><div class="info">${o.noName ? '' : `<div class="nm">${esc(OD.fullName(p))}</div>`}${o.safvr ? `<div class="sub">${esc(p.g)}, ${age}${safvr}</div>` : ''}<div>${esc(p.addr)}${p.addrType ? ` (${esc(p.addrType)})` : ''}</div><div class="meta">${esc(o.meta || OD.personLine(p))}</div>${U.pills(p.alerts)}</div>${o.check ? `<span class="check ${o.checked ? 'on' : ''}"></span>` : ''}${p.nzta ? `<span class="badge-r">${I.badge}</span>` : ''}${(o.chev !== false && attrs && !o.check) || o.fakeChev ? `<span class="chev">${I.chev}</span>` : ''}</div>`;
  };
  OD.vehicleCard = (v, o = {}) => {
    if (!v) return '';
    const attrs = o.go ? `data-go="${esc(o.go)}"` : o.act ? `data-act="${o.act}" data-a="${esc(o.a ?? v.id)}"` : '';
    const title = v.plateOnly ? '' : `${o.year ? v.year + ', ' : ''}${v.make} ${v.model}`;
    return `<div class="card vcard ${o.boxed ? 'boxed' : ''} ${o.checked ? 'sel' : ''}" ${attrs} style="flex-direction:column;gap:2px">${title && !o.inline ? `<div class="ttl">${esc(title)}</div>` : ''}<div style="display:flex;gap:10px;align-items:center"><div class="veh">${v.plateOnly ? '<div style="height:30px"></div>' : I.car(v.hex || '#999', v.outline)}<span class="plate">${esc(v.rego)}</span></div><div class="info">${o.inline && title ? `<div class="nm" style="text-transform:none">${esc(title)}</div>` : ''}${v.plateOnly ? 'Plate Only' : `${esc(v.colour)}<br>${esc(v.body)}`}<br>ID: ${esc(v.vin)}</div></div>${U.pills(v.alerts)}${o.check ? `<span class="check ${o.checked ? 'on' : ''}"></span>` : ''}${o.chev !== false && attrs && !o.check ? `<span class="chev">${I.chev}</span>` : ''}</div>`;
  };
  OD.locationCard = (l, o = {}) => {
    if (!l) return '';
    const attrs = o.go ? `data-go="${esc(o.go)}"` : o.act ? `data-act="${o.act}" data-a="${esc(o.a ?? l.id)}"` : '';
    return `<div class="card ${o.checked ? 'sel' : ''}" ${attrs} style="align-items:center"><div class="ph round" style="background:${l.alerts && l.alerts.length ? 'var(--red)' : '#8e8e93'};color:#fff;font-size:11px;align-items:center">${l.type === 'Intersection' ? 'INT' : 'QL'}</div><div class="info"><div class="nm" style="text-transform:none;font-size:14px">${esc(l.addr)}</div><div class="sub">${esc(l.type || '')}</div>${U.pills(l.alerts)}</div>${o.check ? `<span class="check ${o.checked ? 'on' : ''}"></span>` : ''}${o.chev !== false && attrs && !o.check ? `<span class="chev">${I.chev}</span>` : ''}</div>`;
  };
  OD.orgCard = (g, o = {}) => {
    if (!g) return '';
    const attrs = o.go ? `data-go="${esc(o.go)}"` : o.act ? `data-act="${o.act}" data-a="${esc(o.a ?? g.id)}"` : '';
    return `<div class="card ${o.checked ? 'sel' : ''}" ${attrs} style="align-items:center"><div class="ph round" style="background:#5b6f8f;color:#fff;font-size:11px;align-items:center">QO</div><div class="info"><div class="nm" style="font-size:14px">${esc(g.name)}</div><div class="sub">${esc(g.type || g.cat || '')}${g.addr ? ' · ' + esc(g.addr) : ''}</div>${U.pills(g.alerts)}</div>${o.check ? `<span class="check ${o.checked ? 'on' : ''}"></span>` : ''}${o.chev !== false && attrs && !o.check ? `<span class="chev">${I.chev}</span>` : ''}</div>`;
  };

  /** swipe row wrapper: left/right = [{label, act, a, cls}] */
  OD.swipeRow = (inner, { left = [], right = [] } = {}) => `<div class="swipe"><div class="sw-back">${left.map((b) => `<button class="sw-left ${b.cls || ''}" data-act="${b.act}" data-a="${esc(b.a)}">${esc(b.label)}</button>`).join('')}<span style="flex:1"></span>${right.map((b) => `<button class="sw-right ${b.cls || ''}" data-act="${b.act}" data-a="${esc(b.a)}">${esc(b.label)}</button>`).join('')}</div><div class="sw-front">${inner}</div></div>`;
})();
