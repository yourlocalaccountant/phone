/* =========================================================================
   OnDuty recreation – Home tab: activity list, filter, folders
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav;
  const screen = OD.screen, action = OD.action, FD = OD.folders;
  const DAY = 864e5;

  const qbar = (p = {}) => `<div class="qbar"><button data-present="${OD.go('qp', p)}">QP</button><button data-present="${OD.go('qv', p)}">QV</button><button data-present="${OD.go('ql', p)}">QL</button><button class="more" data-act="qMore" data-a="${esc(p.folder || '')}">More</button></div>`;
  OD.qbar = qbar;
  action('qMore', (d) => OD.ui.sheet({ items: [{ label: 'QO', fn: () => N.present('qo', d.a ? { folder: d.a } : {}) }, { label: 'QI', fn: () => N.present('qi', d.a ? { folder: d.a } : {}) }] }));

  /* ------------------------------------------------------------ row renderers */
  const qCircle = (type) => `<div class="av circle">${esc(type === 'DELVE' ? 'Q' : type)}</div>`;
  OD.queryRow = (q, opts = {}) => {
    const sub = q.status === 'queued' ? '<div class="s red">Queued (Offline)...</div>' : q.status === 'running' ? '<div class="s">Running in background…</div>' : `<div class="s">${q.total} Result${q.total === 1 ? '' : 's'} ${esc(F.stampRev(q.ts))}</div>`;
    const go = q.status === 'queued' ? 'data-act="queuedInfo"' : `data-go="${OD.go(q.type === 'DELVE' ? 'delve' : 'qres', { q: q.id })}"`;
    return `<div class="hitem" ${go}>${opts.pin ? '<span class="pin-flag"></span>' : ''}${qCircle(q.type)}<div style="flex:1;min-width:0"><div class="t">${esc(q.label)}</div>${sub}</div><span class="chev">${I.chev}</span></div>`;
  };
  const folderRow = (f, h) => {
    const code = FD.square(f); const chips = FD.chips(f);
    return `<div class="hitem" data-go="${OD.go('folder', { id: f.id })}">${h && h.pinned ? '<span class="pin-flag"></span>' : ''}<div class="av ${code ? '' : 'blank'}">${esc(code)}</div><div style="flex:1;min-width:0"><div class="t">${esc(FD.title(f))}</div>${f.card ? `<div class="s" style="font-size:12px">${esc(f.card)}</div>` : ''}<div class="chips">${chips.map((c) => `<span>${esc(c)}</span>`).join('')}</div>${f.shared.length ? `<div class="s" style="font-size:11px">Shared with ${f.shared.length} officer${f.shared.length > 1 ? 's' : ''}</div>` : ''}${f.owner !== OD.db.me.qid ? `<div class="s" style="font-size:11px;color:var(--orange)">Shared by ${esc(f.owner)}</div>` : ''}</div><span class="chev">${I.chev}</span></div>`;
  };
  const objRow = (h) => {
    if (h.t === 'person') {
      const p = OD.person(h.ref); if (!p) return '';
      return `<div class="card" data-go="${OD.go('person', { id: p.id })}" style="padding-left:0">${h.pinned ? '<span class="pin-flag" style="position:absolute;left:0;top:0;bottom:0;width:4px;background:var(--orange)"></span>' : ''}<div class="ph" style="width:74px;height:86px">${OD.avatar(p.id, p.g)}</div><div class="info"><div class="nm">${esc(OD.fullName(p))}</div><div>${esc(p.addr)} (${esc(p.addrType || 'Home Address')})</div><div class="meta">${esc(F.stampRev(h.ts))}</div>${U.pills(p.alerts)}</div>${p.nzta ? `<span class="badge-r">${I.badge}</span>` : ''}<span class="chev">${I.chev}</span></div>`;
    }
    const title = OD.objTitle(h.t, h.ref); const go = { vehicle: 'vehicle', location: 'location', org: 'org', item: 'item', occ: 'occ' }[h.t];
    return `<div class="hitem" data-go="${OD.go(go, { id: h.ref })}">${qCircle({ vehicle: 'QV', location: 'QL', org: 'QO', item: 'QI', occ: 'N' }[h.t])}<div style="flex:1;min-width:0"><div class="t">${esc(title)}</div><div class="s">${esc(F.stampRev(h.ts))}</div></div><span class="chev">${I.chev}</span></div>`;
  };
  const homeRows = () => {
    const db = OD.db; const f = db.homeFilter; const cutoff = Date.now() - f.days * DAY;
    const rows = db.home.filter((h) => {
      if (h.hidden && !f.hidden) return false;
      if (!h.pinned && h.ts < cutoff) return false;
      if (h.k === 'folder') { const fo = FD.get(h.ref); if (!fo || !f.types.includes('Folders')) return false; if (f.owner === 'Mine' && fo.owner !== db.me.qid) return false; if (f.owner === 'Shared' && !fo.shared.length && fo.owner === db.me.qid) return false; return true; }
      if (h.k === 'query') { const q = db.queries.find((x) => x.id === h.ref); return q && f.types.includes(q.type === 'DELVE' ? 'QL' : q.type); }
      if (h.k === 'obj') return f.types.includes('Objects');
      return false;
    }).sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || b.ts - a.ts);
    return rows;
  };
  const renderHomeItem = (h) => {
    let inner = '';
    if (h.k === 'folder') inner = folderRow(FD.get(h.ref), h);
    else if (h.k === 'query') inner = OD.queryRow(OD.db.queries.find((x) => x.id === h.ref), { pin: h.pinned });
    else inner = objRow(h);
    if (!inner) return '';
    return OD.swipeRow(inner + (h.hidden ? '<div style="position:absolute;right:30px;top:6px;font-size:10px;color:var(--ios-red)">Hidden</div>' : ''), { left: [{ label: h.pinned ? 'Unpin' : 'Pin', act: 'homePin', a: h.id }], right: [{ label: h.hidden ? 'Unhide' : 'Hide', act: 'homeHide', a: h.id }] });
  };

  /* ------------------------------------------------------------------ HOME */
  screen('home', {
    title: 'Home',
    left: `<button class="nb icon" data-present="home-filter" aria-label="Filter">${I.filter}</button><button class="nb icon" data-act="newFolder" aria-label="New folder">${I.folderPlus}</button>`,
    right: () => (OD.db.offline ? `<button class="nb icon" data-act="offlineInfo" aria-label="Offline">${I.warn}</button>` : ''),
    extra: () => qbar(),
    cls: '',
    body: () => {
      const rows = homeRows();
      const f = OD.db.homeFilter;
      const note = f.days !== 1 || f.hidden || f.owner !== 'Mine' || f.types.length < 7 ? `<div class="center-note" data-present="home-filter">Showing ${f.days === 1 ? 'last 24 hours' : 'last ' + f.days + ' days'}${f.hidden ? ' · including hidden items' : ''}${f.owner !== 'Mine' ? ' · ' + f.owner : ''}</div>` : '';
      return `<div class="ptr" data-ptr></div>${note}${rows.length ? rows.map(renderHomeItem).join('') : U.empty('No activity in the last 24 hours.<br><br>Run a query with QP, QV, QL or More, or tap the folder icon to add a folder.')}`;
    },
  });
  action('homePin', (d) => { const h = OD.db.home.find((x) => x.id === d.a); if (h) { h.pinned = !h.pinned; OD.save(); N.refresh(); } });
  action('homeHide', (d) => { const h = OD.db.home.find((x) => x.id === d.a); if (h) { h.hidden = !h.hidden; if (h.hidden) h.pinned = false; OD.save(); N.refresh(); OD.ui.toast(h.hidden ? 'Hidden from Home – use the filter to show hidden items. Hiding a folder does not delete the paperwork.' : 'Item restored', 2800); } });
  action('newFolder', () => { const f = FD.create({}); N.push('folder', { id: f.id }); OD.ui.toast('New folder added'); });
  action('offlineInfo', () => OD.ui.alert({ title: 'Offline', msg: 'You are offline. Paperwork can still be completed and queries will be queued – they run automatically once you are back in coverage. Previously queried objects can still be added to paperwork.' }));
  action('queuedInfo', () => OD.ui.alert({ title: 'Queued (Offline)', msg: 'This query is queued and will run automatically once you are back in coverage.' }));

  /* ------------------------------------------------------------- FILTER */
  screen('home-filter', {
    title: 'Filter Options',
    left: '<button class="nb bold" data-dismiss>Done</button>',
    right: '<button class="nb" data-act="homeFilterReset">Reset</button>',
    target: () => OD.db.homeFilter,
    body: () => {
      const f = OD.db.homeFilter;
      const types = ['Folders', 'QP', 'QV', 'QL', 'QO', 'QI', 'Objects'];
      return `<div class="sh">SHOW ACTIVITY FROM</div><div class="field"><span class="lbl">Last ${f.days} day${f.days > 1 ? 's' : ''} ${f.days === 1 ? '(24 hours)' : ''}</span><input type="range" min="1" max="30" value="${f.days}" data-k="days" data-rr class="slider" style="width:100%"></div><div class="sh">OWNER</div><div class="field">${U.seg('owner', ['Mine', 'Shared', 'All'], f.owner)}</div><div class="sh">HIDDEN ITEMS</div><div class="row tap" data-act="homeFilterHidden"><div class="grow">Show hidden items</div><span class="switch ${f.hidden ? 'on' : ''}"></span></div><div class="sh">TYPE</div><div class="group">${types.map((t) => `<div class="row tap" data-act="homeFilterType" data-a="${t}"><div class="grow">${t === 'Objects' ? 'Viewed persons / vehicles / locations' : t}</div>${f.types.includes(t) ? `<span style="color:var(--tint);position:absolute;right:12px">${I.check}</span>` : ''}</div>`).join('')}</div>`;
    },
    onChange: (k, v, ctx, tgt) => { if (k === 'days') tgt.days = +v; },
  });
  action('homeFilterHidden', (d, el, ctx) => { OD.db.homeFilter.hidden = !OD.db.homeFilter.hidden; OD.save(); N.refresh(ctx.u); });
  action('homeFilterType', (d, el, ctx) => { const t = OD.db.homeFilter.types; const i = t.indexOf(d.a); if (i >= 0) t.splice(i, 1); else t.push(d.a); OD.save(); N.refresh(ctx.u); });
  action('homeFilterReset', (d, el, ctx) => { OD.db.homeFilter = { days: 1, owner: 'Mine', hidden: false, types: ['Folders', 'QP', 'QV', 'QL', 'QO', 'QI', 'Objects'] }; OD.save(); N.refresh(ctx.u); });

  /* --------------------------------------------------------------- FOLDER */
  screen('folder', {
    title: (p) => { const f = FD.get(p.id); return f ? esc(FD.title(f)) : 'Folder'; },
    back: 'Home',
    right: (p) => `<button class="nb icon" data-act="folderMenu" data-a="${esc(p.id)}">${I.dots}</button>`,
    extra: (p) => qbar({ folder: p.id }) + `<div style="height:6px"></div><button class="fullbtn" data-present="${OD.go('take-action', { folder: p.id })}">Take Action</button>`,
    cls: 'grouped',
    body: (p) => {
      const f = FD.get(p.id); if (!f) return U.empty('Folder not found');
      let h = '';
      if (f.card) {
        const ce = OD.db.cardEvents.find((c) => c.no === f.card);
        const loc = ce && OD.location(ce.loc);
        h += `<div class="card-banner" data-go="${OD.go('card-detail', { no: f.card })}" style="cursor:pointer"><span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(ce ? ce.addr : f.card)}</span><b style="color:#333;margin-left:4px">(CARD)</b><span style="margin-left:4px">${I.chev}</span></div>`;
        if (loc) h += `<div class="row" data-act="cardLocQuery" data-a="${esc(f.id)}"><div class="grow"><div class="kv-k" style="font-size:13.5px">CARD Location (Tap to Query)</div><div class="kv-k" style="font-size:13.5px">${esc(loc.addr)}</div><div class="kv-v" style="font-size:12px">${esc(F.stampRev(f.ts))}</div></div><span class="chev">${I.chev}</span></div>`;
      }
      const items = f.items.slice().reverse();
      const pws = items.filter((i) => i.k === 'pw').map((i) => OD.db.paperwork[i.id]).filter(Boolean);
      const qs = items.filter((i) => i.k === 'q').map((i) => OD.db.queries.find((q) => q.id === i.id)).filter(Boolean);
      const objs = items.filter((i) => i.k === 'obj');
      if (pws.length) h += '<div class="listhead">Paperwork</div>' + pws.map(OD.pwRow).join('');
      if (qs.length) h += '<div class="listhead">Queries</div>' + qs.map((q) => OD.queryRow(q)).join('');
      if (objs.length) h += '<div class="listhead">Bookmarks</div>' + objs.map((o) => objRow({ t: o.t, ref: o.id, ts: o.ts || f.ts })).join('');
      if (!pws.length && !qs.length && !objs.length && !f.card) h += U.empty('This folder is empty.<br><br>Tap ‘Take Action’ to add a paperwork item, or run a query with QP, QV or QL to add it to this folder.');
      if (f.shared.length) h += `<div class="footnote">Shared with ${esc(f.shared.join(', '))}. Everything in this folder (paperwork and queries) is shared.</div>`;
      return h;
    },
    foot: (p) => `<div class="foot"><button class="linkbtn" data-act="unitWork">${OD.tmp.unitWork === false ? 'My Work - Showing Mine' : "Unit's Work - Showing All"}</button></div>`,
  });
  action('unitWork', (d, el, ctx) => { OD.tmp.unitWork = OD.tmp.unitWork === false; N.refresh(ctx.u); });
  action('folderMenu', (d) => {
    const f = FD.get(d.a); const h = OD.db.home.find((x) => x.k === 'folder' && x.ref === d.a);
    OD.ui.sheet({ items: [
      { label: 'Share folder with officers', fn: () => N.push('share-folder', { folder: d.a }) },
      { label: 'Rename folder', fn: () => OD.actions.folderRename({ a: d.a }) },
      { label: h && h.pinned ? 'Unpin from top of Home' : 'Pin to top of Home', fn: () => { if (h) { h.pinned = !h.pinned; OD.save(); OD.ui.toast(h.pinned ? 'Pinned' : 'Unpinned'); } } },
      { label: 'Hide folder from Home', danger: true, fn: () => { if (h) { h.hidden = true; OD.save(); } N.pop(); OD.ui.toast('Folder hidden. Hiding a folder does not delete the paperwork.'); } },
    ] });
  });
  action('cardLocQuery', (d) => {
    const f = FD.get(d.a); const ce = OD.db.cardEvents.find((c) => c.no === f.card); const loc = ce && OD.location(ce.loc);
    if (!loc) return;
    const q = OD.runQuery('QL', { quick: loc.addr.split(',').slice(0, 2).join(' ') }, { folder: f.id });
    if (q.status === 'done') N.push('qres', { q: q.id }); else OD.ui.toast('Query queued (offline)');
  });
  screen('card-detail', {
    title: 'CARD Event',
    body: (p) => {
      const ce = OD.db.cardEvents.find((c) => c.no === p.no); if (!ce) return U.empty('Not found');
      return `<div class="sh">EVENT</div>${U.kv('Event Number', ce.no)}${U.kv('Incident Code', ce.code + ' - ' + (OD.data.niaByCode[ce.code]?.desc || ''))}${U.kv('Location', ce.addr)}${U.kv('Dispatched', F.stamp(Date.now() - ce.mins * 60000))}${U.kv('Units', 'WN10, WN22')}<div class="sh">EVENT REMARKS (DEMO)</div><div class="para small">Informant reports shouting heard from address. Informant does not wish to be identified. Units dispatched. The CARD Event is dispatched to the QIDs of all officers in the police vehicle(s).</div>`;
    },
  });
})();
