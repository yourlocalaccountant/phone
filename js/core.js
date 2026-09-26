/* =========================================================================
   OnDuty recreation – core runtime
   helpers · icons · avatars · persistence · router · overlays · gestures
   ========================================================================= */
(function () {
  'use strict';
  const OD = (window.OD = { screens: {}, actions: {}, forms: {}, types: {}, lists: {} });

  /* ---------------------------------------------------------------- helpers */
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  OD.esc = esc;
  let uidN = 0;
  OD.uid = (p = 'x') => p + Date.now().toString(36).slice(-5) + (uidN++).toString(36) + Math.floor(Math.random() * 36).toString(36);
  OD.qs = (o) => Object.entries(o || {}).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  OD.parseQs = (s) => {
    const o = {};
    (s || '').split('&').forEach((kv) => {
      if (!kv) return;
      const i = kv.indexOf('=');
      o[decodeURIComponent(i < 0 ? kv : kv.slice(0, i))] = i < 0 ? '' : decodeURIComponent(kv.slice(i + 1));
    });
    return o;
  };
  OD.link = (s, p) => s + (p && Object.keys(p).length ? '?' + OD.qs(p) : '');
  OD.go = (s, p) => esc(OD.link(s, p));
  OD.clone = (o) => JSON.parse(JSON.stringify(o));
  OD.debounce = (fn, ms) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };

  // deterministic PRNG from a string
  OD.rng = (seedStr) => {
    let h = 1779033703 ^ String(seedStr).length;
    for (let i = 0; i < String(seedStr).length; i++) { h = Math.imul(h ^ String(seedStr).charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    return () => { h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); return ((h ^= h >>> 16) >>> 0) / 4294967296; };
  };
  OD.pick = (r, arr) => arr[Math.floor(r() * arr.length)];
  // Not real crypto – just avoids storing passwords as plain text in this demo's local storage.
  OD.simpleHash = (s) => { s = String(s); let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); };

  /* ------------------------------------------------------------ formatting */
  const pad = (n) => String(n).padStart(2, '0');
  const WD = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const F = (OD.fmt = {});
  F.pad = pad;
  F.iso = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  F.hm = (d = new Date()) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  F.dmy = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}` : '');
  F.dmy2 = (iso) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(2, 4)}` : '');
  F.wd = (iso) => (iso ? WD[new Date(iso + 'T12:00:00').getDay()] : '');
  F.occ = (date, time) => (date ? `${F.wd(date)} ${F.dmy(date)}${time ? ' - Time: ' + time : ''}` : '');
  F.stamp = (ts) => { const d = new Date(ts); return `${F.dmy(F.iso(d))} - ${F.hm(d)}`; };
  F.stampRev = (ts) => { const d = new Date(ts); return `${F.hm(d)} - ${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}`; };
  F.age = (dob) => {
    if (!dob) return '';
    const d = new Date(dob + 'T12:00:00'), n = new Date();
    let a = n.getFullYear() - d.getFullYear();
    if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
    return a;
  };
  F.ago = (ts) => {
    const m = Math.floor((Date.now() - ts) / 60000);
    if (m < 1) return '< 1 minute ago';
    if (m < 60) return m + (m === 1 ? ' minute ago' : ' minutes ago');
    const h = Math.floor(m / 60);
    if (h < 24) return h + (h === 1 ? ' hour ago' : ' hours ago');
    const d = Math.floor(h / 24);
    return d + (d === 1 ? ' day ago' : ' days ago');
  };
  F.clock = () => { const d = new Date(); return `${d.getHours() % 12 || 12}:${pad(d.getMinutes())}`; };

  /* ------------------------------------------------------------------ icons */
  const I = (OD.I = {});
  I.chev = '<svg width="8" height="13" viewBox="0 0 8 13"><path d="M1.5 1.5l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  I.back = '<svg width="13" height="21" viewBox="0 0 13 21"><path d="M11 2L2.5 10.5 11 19" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  I.down = '<svg width="13" height="8" viewBox="0 0 13 8"><path d="M1.5 1.5l5 5 5-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  I.camera = '<svg width="20" height="16" viewBox="0 0 20 16"><path d="M7 1h6l1.5 2H18a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1h3.5z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="9" r="3.4" fill="none" stroke="currentColor" stroke-width="1.6"/></svg>';
  I.filter = '<svg width="24" height="24" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10.5" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M6.5 9h11M8.5 12.5h7M10.5 16h3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  I.folderPlus = '<svg width="30" height="24" viewBox="0 0 30 24"><path d="M2 5.5V20a1.5 1.5 0 001.5 1.5h20A1.5 1.5 0 0025 20V8.5A1.5 1.5 0 0023.5 7H12l-2.5-3h-6A1.5 1.5 0 002 5.5z" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="24.5" cy="5.5" r="4.5" fill="#fff" stroke="currentColor" stroke-width="1.4"/><path d="M24.5 3v5M22 5.5h5" stroke="currentColor" stroke-width="1.4"/></svg>';
  I.dots = '<svg width="26" height="8" viewBox="0 0 26 8"><circle cx="4" cy="4" r="2.6" fill="currentColor"/><circle cx="13" cy="4" r="2.6" fill="currentColor"/><circle cx="22" cy="4" r="2.6" fill="currentColor"/></svg>';
  I.list = '<svg width="20" height="16" viewBox="0 0 20 16"><g fill="currentColor"><circle cx="2" cy="2" r="1.6"/><circle cx="2" cy="8" r="1.6"/><circle cx="2" cy="14" r="1.6"/><rect x="6" y="1" width="14" height="2" rx="1"/><rect x="6" y="7" width="14" height="2" rx="1"/><rect x="6" y="13" width="14" height="2" rx="1"/></g></svg>';
  I.search = '<svg width="15" height="15" viewBox="0 0 15 15"><circle cx="6" cy="6" r="4.8" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M9.7 9.7l4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  I.warn = '<svg width="24" height="22" viewBox="0 0 24 22"><path d="M12 1.5L23 20.5H1z" fill="#ec2227"/><path d="M12 8v6" stroke="#fff" stroke-width="2.2" stroke-linecap="round"/><circle cx="12" cy="17.3" r="1.3" fill="#fff"/></svg>';
  I.globe = '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="7.6" fill="none" stroke="currentColor" stroke-width="1.3"/><ellipse cx="9" cy="9" rx="3.4" ry="7.6" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M1.6 9h14.8M2.8 5h12.4M2.8 13h12.4" stroke="currentColor" stroke-width="1.1"/></svg>';
  I.badge = '<svg width="14" height="20" viewBox="0 0 14 20"><circle cx="7" cy="12" r="6" fill="none" stroke="currentColor" stroke-width="1.3"/><circle cx="7" cy="10.5" r="2" fill="currentColor"/><path d="M3.8 16c.6-2 1.8-3 3.2-3s2.6 1 3.2 3" fill="currentColor"/><path d="M4 1h6v4H4z" fill="currentColor"/></svg>';
  I.check = '<svg width="14" height="12" viewBox="0 0 14 12"><path d="M1.5 6.5l4 4 7-9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  I.x = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  I.undo = '<svg width="20" height="16" viewBox="0 0 20 16"><path d="M7 2L2 7l5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 7H13a5 5 0 010 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  I.layers = '<svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 2l9 5-9 5-9-5z" fill="currentColor"/><path d="M2 11l9 5 9-5M2 15l9 5 9-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  I.locate = '<svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="11" cy="11" r="2" fill="currentColor"/><path d="M11 1v4M11 17v4M1 11h4M17 11h4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
  I.cuffs = '<svg width="18" height="18" viewBox="0 0 18 18"><circle cx="5.2" cy="11.5" r="3.8" fill="none" stroke="#fff" stroke-width="1.8"/><circle cx="12.8" cy="11.5" r="3.8" fill="none" stroke="#fff" stroke-width="1.8"/><path d="M5.2 7.7V4.5a3.8 3.8 0 017.6 0v3.2" fill="none" stroke="#fff" stroke-width="1.6"/></svg>';
  I.route = '<svg width="16" height="16" viewBox="0 0 16 16"><path d="M2 14L14 8 2 2l2.5 6z" fill="currentColor"/></svg>';
  I.plane = '<svg width="16" height="14" viewBox="0 0 16 14"><path d="M15 7c0-.7-.6-1.2-1.3-1.2H10L6.3 0H4.8l1.8 5.8H3L1.8 4.2H.6L1.4 7 .6 9.8h1.2L3 8.2h3.6L4.8 14h1.5L10 8.2h3.7C14.4 8.2 15 7.7 15 7z" fill="currentColor"/></svg>';
  I.signal = '<svg width="18" height="12" viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx=".8" fill="currentColor"/><rect x="5" y="5.5" width="3" height="6.5" rx=".8" fill="currentColor"/><rect x="10" y="3" width="3" height="9" rx=".8" fill="currentColor"/><rect x="15" y="0" width="3" height="12" rx=".8" fill="currentColor"/></svg>';
  I.wifi = '<svg width="16" height="12" viewBox="0 0 16 12"><path d="M8 11.5l2.3-2.6a3.3 3.3 0 00-4.6 0zM3.9 7a5.9 5.9 0 018.2 0l1.4-1.6a8 8 0 00-11 0zM.9 3.8a10 10 0 0114.2 0L16.5 2.2a12.2 12.2 0 00-17 0z" fill="currentColor"/></svg>';
  I.battery = '<svg width="26" height="12" viewBox="0 0 26 12"><rect x=".5" y=".5" width="22" height="11" rx="3" fill="none" stroke="currentColor" opacity=".45"/><rect x="2" y="2" width="17" height="8" rx="1.8" fill="currentColor"/><path d="M24 4v4a2 2 0 000-4z" fill="currentColor" opacity=".45"/></svg>';
  I.arrow = '<svg width="10" height="10" viewBox="0 0 10 10"><path d="M9.5.5L.8 4.4l3.9 1 1 3.9z" fill="currentColor"/></svg>';
  I.info = '<svg width="20" height="20" viewBox="0 0 20 20"><circle cx="10" cy="10" r="8.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M10 9v5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="10" cy="6.2" r="1.1" fill="currentColor"/></svg>';
  I.handle = '<svg width="20" height="12" viewBox="0 0 20 12"><path d="M1 1h18M1 6h18M1 11h18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
  I.pinDrop = '<svg width="26" height="34" viewBox="0 0 26 34"><path d="M13 1C6.4 1 1 6.2 1 12.7 1 21.5 13 33 13 33s12-11.5 12-20.3C25 6.2 19.6 1 13 1z" fill="#ec2227" stroke="#fff" stroke-width="1.5"/><circle cx="13" cy="12.5" r="4.2" fill="#fff"/></svg>';
  I.checkpoint = '<svg width="22" height="22" viewBox="0 0 22 22"><rect width="22" height="22" rx="5" fill="#1f3f8f"/><path d="M5 11.5l4 4 8-9" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  I.paperclip = '<svg width="14" height="16" viewBox="0 0 14 16"><path d="M12 7.5l-5.2 5.2a3.2 3.2 0 01-4.5-4.5L8 2.5a2.1 2.1 0 013 3L5.4 11a1 1 0 01-1.4-1.4l4.8-4.8" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
  I.tabs = {
    home: '<svg viewBox="0 0 30 26"><path d="M3 12c0-5 5.4-9 12-9s12 4 12 9H3z" fill="currentColor"/><rect x="2" y="12" width="26" height="4" rx="1" fill="currentColor"/><path d="M6 16h18l-2 4H8z" fill="currentColor" opacity=".75"/><g fill="#fff"><rect x="9" y="12.6" width="2.4" height="2.4"/><rect x="13.8" y="12.6" width="2.4" height="2.4"/><rect x="18.6" y="12.6" width="2.4" height="2.4"/></g><circle cx="15" cy="8" r="2.2" fill="#fff"/></svg>',
    tasks: '<svg viewBox="0 0 30 26"><rect x="5" y="2" width="21" height="21" rx="3" fill="currentColor"/><path d="M10 12.5l4 4 7-8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    paperwork: '<svg viewBox="0 0 30 26"><path d="M8 1h10l6 6v17a1 1 0 01-1 1H8a1 1 0 01-1-1V2a1 1 0 011-1z" fill="currentColor"/><path d="M18 1v6h6" fill="#fff" opacity=".6"/><path d="M10.5 11h10M10.5 15h10M10.5 19h7" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/></svg>',
    assigned: '<svg viewBox="0 0 30 26"><path d="M9 8l3-4h6l3 4z" fill="currentColor" opacity=".8"/><rect x="11.5" y="2" width="7" height="2" rx="1" fill="currentColor"/><path d="M3 12c0-2.2 1.8-4 4-4h16c2.2 0 4 1.8 4 4v8H3z" fill="currentColor"/><circle cx="8.5" cy="20.5" r="3" fill="currentColor" stroke="#fff" stroke-width="1.4"/><circle cx="21.5" cy="20.5" r="3" fill="currentColor" stroke="#fff" stroke-width="1.4"/><path d="M5.5 12h19" stroke="#fff" stroke-width="1.2"/></svg>',
    more: '<svg viewBox="0 0 30 26"><path d="M4 6h22M4 13h22M4 20h22" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="19" cy="6" r="2.6" fill="#fff" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="13" r="2.6" fill="#fff" stroke="currentColor" stroke-width="1.6"/><circle cx="16" cy="20" r="2.6" fill="#fff" stroke="currentColor" stroke-width="1.6"/></svg>',
  };
  // side-view car
  I.car = (color = '#e8352d', outline = false) => {
    const fill = outline ? '#fff' : color, st = outline ? '#222' : 'rgba(0,0,0,.35)';
    return `<svg viewBox="0 0 120 44" width="118" height="44"><path d="M5 31l3-9c1.5-3.5 5-5 9-5.2l18-1.3 13-9.5C50 4.6 53 4 57 4h24c4 0 7 1.4 9.3 3.8l8.2 8.4c7.5.8 14 2.8 16.3 6.5l1.2 7.8c.3 1.8-1 3.5-3 3.5H8c-2.2 0-3.6-1.3-3-3z" fill="${fill}" stroke="${st}" stroke-width="1.6"/><path d="M40 16.5l11-8.4c1.4-1 3.2-1.6 5-1.6h8.5l-1 10zM66.5 6.5h13c2.8 0 5.2 1 7 2.9l6.7 7.1H65.5z" fill="${outline ? '#fff' : '#dbe7f3'}" stroke="${outline ? '#222' : 'rgba(0,0,0,.25)'}" stroke-width="1.3"/><circle cx="29" cy="33" r="8" fill="#222"/><circle cx="29" cy="33" r="3.6" fill="#ccc"/><circle cx="93" cy="33" r="8" fill="#222"/><circle cx="93" cy="33" r="3.6" fill="#ccc"/></svg>`;
  };
  I.carTop = (color = '#3a8def', label = '') => `<svg viewBox="0 0 30 56" width="22" height="42"><rect x="2" y="2" width="26" height="52" rx="8" fill="${color}" stroke="#fff" stroke-width="1.5"/><rect x="6" y="12" width="18" height="9" rx="2" fill="#dbe7f3"/><rect x="6" y="38" width="18" height="6" rx="2" fill="#dbe7f3"/>${label ? `<text x="15" y="31" font-size="6" text-anchor="middle" fill="#fff" font-weight="700" transform="rotate(-90 15 30)">${esc(label)}</text>` : ''}</svg>`;
  I.doc = (code, color = '#3a8def') => `<svg viewBox="0 0 30 40" class="doc"><path d="M2 2a2 2 0 012-2h16l8 8v30a2 2 0 01-2 2H4a2 2 0 01-2-2z" fill="${color}"/><path d="M20 0v8h8" fill="#fff" opacity=".45"/><text x="15" y="27" font-size="${code.length > 2 ? 8.5 : 10}" text-anchor="middle" fill="#fff" font-weight="700" font-family="Helvetica, Arial">${esc(code)}</text></svg>`;

  /* ------------------------------------------------------ avatars (fictional) */
  const SKIN = ['#f1c7a5', '#e0ac86', '#c68c63', '#a86f4b', '#7d4f33', '#f6d5bd'];
  const HAIR = ['#2b1b10', '#4a2e1a', '#6b4526', '#15110e', '#8d6a43', '#b88a55', '#3b3b3b'];
  const SHIRT = ['#3e4c63', '#5b6f8f', '#2e3a4d', '#6c7a89', '#4d5d53', '#7a5c61', '#344e6c'];
  OD.avatar = (seed, gender = 'Male') => {
    const r = OD.rng('av' + seed);
    const skin = OD.pick(r, SKIN), hair = OD.pick(r, HAIR), shirt = OD.pick(r, SHIRT);
    const bg = ['#dfe3e8', '#e6e2dc', '#dde4e0', '#e3e0e8'][Math.floor(r() * 4)];
    const fem = gender === 'Female';
    const faceW = 15 + r() * 2.5, faceH = 19 + r() * 2;
    const hairTop = fem
      ? `<path d="M${40 - faceW - 5} 44 C ${40 - faceW - 7} 18, ${40 + faceW + 7} 18, ${40 + faceW + 5} 44 L ${40 + faceW + 6} 64 L ${40 + faceW - 1} 64 L ${40 + faceW - 2} 32 C 50 26, 30 26, ${40 - faceW + 2} 32 L ${40 - faceW + 1} 64 L ${40 - faceW - 6} 64 Z" fill="${hair}"/>`
      : `<path d="M${40 - faceW - 1} 36 C ${40 - faceW - 2} 16, ${40 + faceW + 2} 16, ${40 + faceW + 1} 36 C ${40 + faceW - 3} ${26 + r() * 3}, ${40 - faceW + 3} ${26 + r() * 3}, ${40 - faceW - 1} 36 Z" fill="${hair}"/>`;
    const beard = !fem && r() > 0.7 ? `<path d="M${40 - faceW + 3} 44 Q40 ${63 + r() * 3} ${40 + faceW - 3} 44 Q40 56 ${40 - faceW + 3} 44Z" fill="${hair}" opacity=".75"/>` : '';
    return `<svg viewBox="0 0 80 96" preserveAspectRatio="xMidYMid slice"><rect width="80" height="96" fill="${bg}"/><path d="M6 96c2-18 14-24 34-24s32 6 34 24z" fill="${shirt}"/><rect x="33" y="58" width="14" height="16" fill="${skin}"/><path d="M33 70q7 6 14 0v4q-7 5-14 0z" fill="rgba(0,0,0,.12)"/><ellipse cx="40" cy="42" rx="${faceW}" ry="${faceH}" fill="${skin}"/><ellipse cx="${40 - faceW}" cy="44" rx="2.6" ry="4.5" fill="${skin}"/><ellipse cx="${40 + faceW}" cy="44" rx="2.6" ry="4.5" fill="${skin}"/>${hairTop}<ellipse cx="33.5" cy="42" rx="1.8" ry="1.3" fill="#2a2320"/><ellipse cx="46.5" cy="42" rx="1.8" ry="1.3" fill="#2a2320"/><path d="M30.5 37.5q3-1.6 6 0M43.5 37.5q3-1.6 6 0" stroke="${hair}" stroke-width="1.4" fill="none"/><path d="M40 43v7l-2.4.8" stroke="rgba(0,0,0,.25)" stroke-width="1.1" fill="none"/><path d="M35.5 54.5q4.5 2 9 0" stroke="#8e4b3f" stroke-width="1.5" fill="none" stroke-linecap="round"/>${beard}</svg>`;
  };
  OD.silhouette = () => '<svg viewBox="0 0 34 34"><circle cx="17" cy="17" r="17" fill="#d1d1d6"/><circle cx="17" cy="13" r="6" fill="#fff"/><path d="M6 29c2-6 6-8 11-8s9 2 11 8a16 16 0 01-22 0z" fill="#fff"/></svg>';

  /* ------------------------------------------------------------ persistence */
  const KEY = 'onduty-recreation-v1';
  OD.db = null;
  OD.loadDB = () => { try { const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } };
  let saveFailWarned = false;
  const doSave = () => {
    try { localStorage.setItem(KEY, JSON.stringify(OD.db)); }
    catch (e) { if (!saveFailWarned) { saveFailWarned = true; OD.ui && OD.ui.toast('Browser storage is full or unavailable – changes will not persist'); } }
  };
  OD.save = OD.debounce(doSave, 200);
  OD.saveNow = doSave;
  OD.wipe = () => { try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

  /* --------------------------------------------------------- UI fragments */
  const U = (OD.U = {});
  U.sh = (t, cls = '') => `<div class="sh ${cls}">${t}</div>`;
  U.row = (o) => {
    const attrs = o.go ? `data-go="${esc(o.go)}"` : o.act ? `data-act="${esc(o.act)}"${o.a !== undefined ? ` data-a="${esc(o.a)}"` : ''}` : o.present ? `data-present="${esc(o.present)}"` : '';
    const chev = o.chev ?? !!(o.go || o.act || o.present);
    return `<div class="row ${o.cls || ''}" ${attrs}>${o.pre || ''}<div class="grow">${o.l !== undefined ? `<div class="${o.lcls || 'kv-k'}">${o.l}</div>` : ''}${o.v !== undefined && o.v !== '' ? `<div class="${o.vcls || 'kv-v'}">${o.v}</div>` : ''}${o.html || ''}</div>${o.right ? `<span class="right">${o.right}</span>` : ''}${chev ? `<span class="chev">${I.chev}</span>` : ''}</div>`;
  };
  U.kv = (k, v, go) => `<div class="kv ${go ? 'tap' : ''}" ${go ? `data-go="${esc(go)}"` : ''}><div class="k">${esc(k)}</div><div class="v">${esc(v ?? '')}</div></div>`;
  U.btn = (label, attrs = '', cls = '') => `<button class="bigbtn ${cls}" ${attrs}>${label}</button>`;
  U.seg = (k, opts, val, cls = '') => `<div class="seg ${cls}" data-k="${esc(k)}">${opts.map((o) => `<button class="${val === o ? 'on' : ''}" data-seg="${esc(o)}">${esc(o)}</button>`).join('')}</div>`;
  U.pills = (alerts, cls = '') => (alerts && alerts.length ? `<div class="pills">${alerts.map((a) => `<span class="pill ${a.replace(/\s+/g, '')} ${cls}">${esc(a)}</span>`).join('')}</div>` : '');
  U.circ = (st) => `<span class="circ ${st || ''}"></span>`;
  U.search = (ph = 'Search', k = 'q', val = '') => `<div class="searchbar"><label class="sbx">${I.search}<input data-local="${k}" placeholder="${esc(ph)}" value="${esc(val)}" autocomplete="off"></label></div>`;
  U.empty = (t) => `<div class="empty">${t}</div>`;

  /* ================================================================ ROUTER */
  const TABS = ['home', 'tasks', 'paperwork', 'assigned', 'more'];
  const CAD_TABS = ['dispatch', 'records'];
  const N = (OD.nav = {});
  const st = (N.st = {
    app: 'sb', edu: false, tab: 'home',
    stacks: { home: [], tasks: [], paperwork: [], assigned: [], more: [] },
    modals: [], sam: [], fromSam: false,
    cadTab: 'dispatch', cadStacks: { dispatch: [], records: [] },
  });
  const entry = (s, p = {}) => ({ s, p: Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => [k, String(v)])), u: OD.uid('e') });
  N.entry = entry;
  const ensureRoots = () => { TABS.forEach((t) => { if (!st.stacks[t].length) st.stacks[t].push(entry(t)); }); if (!st.sam.length) st.sam.push(entry('sam')); CAD_TABS.forEach((t) => { if (!st.cadStacks[t].length) st.cadStacks[t].push(entry(t)); }); };
  const layers = (N.layers = () => (st.app === 'od' ? [st.stacks[st.tab], ...st.modals] : st.app === 'sam' ? [st.sam] : st.app === 'cad' ? [st.cadStacks[st.cadTab]] : []));
  N.top = () => { const L = layers(); const l = L[L.length - 1]; return l ? l[l.length - 1] : null; };

  // --- hash (de)serialisation --------------------------------------------
  const encV = (v) => encodeURIComponent(v).replace(/~/g, '%7E');
  const encE = (e) => [e.s, ...Object.entries(e.p || {}).map(([k, v]) => k + '=' + encV(v))].join(',');
  const decE = (str) => { const [s, ...ps] = str.split(','); const p = {}; ps.forEach((x) => { const i = x.indexOf('='); if (i > 0) p[x.slice(0, i)] = decodeURIComponent(x.slice(i + 1)); }); return { s, p }; };
  N.hashFor = (app, tab, stack, modals = []) => {
    const E = (arr) => arr.map(([s, p]) => encE({ s, p: p || {} })).join('/');
    if (app === 'sam') return '#/sam/' + E(stack);
    if (app === 'cad') return '#/cad/' + tab + '/' + E(stack);
    if (app === 'sb') return '#/';
    return '#/' + app + '/' + tab + '/' + [E(stack), ...modals.map(E)].join('/~/');
  };
  N.toHash = () => {
    if (st.app === 'od') return '#/' + (st.edu ? 'edu' : 'od') + '/' + st.tab + '/' + [st.stacks[st.tab].map(encE).join('/'), ...st.modals.map((m) => m.map(encE).join('/'))].join('/~/');
    if (st.app === 'sam') return '#/sam/' + st.sam.map(encE).join('/');
    if (st.app === 'cad') return '#/cad/' + st.cadTab + '/' + st.cadStacks[st.cadTab].map(encE).join('/');
    return '#/';
  };
  const parseHash = (h) => {
    const parts = (h || '').replace(/^#\/?/, '').split('/').filter((x) => x !== '');
    if (!parts.length) return { app: 'sb' };
    const a = parts.shift();
    if (a === 'sam') return { app: 'sam', sam: parts.map(decE) };
    if (a === 'cad') {
      const tab = CAD_TABS.includes(parts[0]) ? parts.shift() : 'dispatch';
      const stack = parts.map(decE);
      if (!stack.length || stack[0].s !== tab) stack.unshift({ s: tab, p: {} });
      return { app: 'cad', tab, cadStack: stack };
    }
    if (a === 'od' || a === 'edu') {
      const tab = TABS.includes(parts[0]) ? parts.shift() : 'home';
      const groups = [[]];
      parts.forEach((x) => { if (x === '~') groups.push([]); else groups[groups.length - 1].push(decE(x)); });
      if (!groups[0].length || groups[0][0].s !== tab) groups[0].unshift({ s: tab, p: {} });
      return { app: 'od', edu: a === 'edu', tab, stack: groups[0], modals: groups.slice(1).filter((g) => g.length) };
    }
    return { app: 'sb' };
  };
  const sameP = (a, b) => JSON.stringify(a || {}) === JSON.stringify(b || {});
  const reuse = (old, neu) => { let ok = true; return neu.map((n, i) => { if (ok && old[i] && old[i].s === n.s && sameP(old[i].p, n.p)) return old[i]; ok = false; return entry(n.s, n.p); }); };

  let lastHash = '';
  const writeHash = (replace) => {
    const h = N.toHash();
    if (h === location.hash) { lastHash = h; return; }
    lastHash = h;
    try { history[replace ? 'replaceState' : 'pushState'](null, '', h); } catch (e) { location.hash = h; }
  };
  N.applyHash = (anim) => {
    const P = parseHash(location.hash);
    const oldL = layers().map((l) => l.map((e) => e.u));
    const oldApp = st.app + st.tab;
    st.app = P.app;
    if (P.app === 'od') {
      st.edu = P.edu; st.tab = P.tab; ensureRoots();
      st.stacks[P.tab] = reuse(st.stacks[P.tab], P.stack);
      st.modals = P.modals.map((m, i) => reuse(st.modals[i] || [], m));
    } else if (P.app === 'sam') { ensureRoots(); st.sam = reuse(st.sam, P.sam.length ? P.sam : [{ s: 'sam', p: {} }]); }
    else if (P.app === 'cad') { ensureRoots(); st.cadTab = P.tab; st.cadStacks[P.tab] = reuse(st.cadStacks[P.tab], P.cadStack); }
    if (anim === undefined) {
      const newL = layers().map((l) => l.map((e) => e.u));
      anim = 'none';
      if (oldApp === st.app + st.tab) {
        if (newL.length === oldL.length + 1) anim = 'present';
        else if (newL.length === oldL.length - 1) anim = 'dismiss';
        else if (newL.length === oldL.length && newL.length) {
          const a = oldL[oldL.length - 1], b = newL[newL.length - 1];
          if (b.length === a.length + 1 && a.every((u, i) => b[i] === u)) anim = 'push';
          else if (b.length === a.length - 1 && b.every((u, i) => a[i] === u)) anim = 'pop';
        }
      }
    }
    lastHash = location.hash;
    render(anim);
  };
  window.addEventListener('popstate', () => { if (location.hash !== lastHash) N.applyHash(); });
  window.addEventListener('hashchange', () => { if (location.hash !== lastHash) N.applyHash(); });

  const commit = (anim, replace) => { writeHash(replace); render(anim); };
  N.commit = commit;
  N.push = (s, p) => { const L = layers(); if (!L.length) return; L[L.length - 1].push(entry(s, p)); commit('push'); };
  N.pop = () => {
    const L = layers(); const l = L[L.length - 1];
    if (l && l.length > 1) { l.pop(); commit('pop'); }
    else if (L.length > 1) N.dismiss();
  };
  N.popTo = (pred) => {
    const L = layers(); const l = L[L.length - 1];
    const test = typeof pred === 'function' ? pred : (e) => e.s === pred;
    let i = l.length - 1; while (i > 0 && !test(l[i])) i--;
    if (i < l.length - 1) { l.length = i + 1; commit('pop'); }
  };
  N.popN = (n) => { const L = layers(); const l = L[L.length - 1]; const keep = Math.max(1, l.length - n); if (keep < l.length) { l.length = keep; commit('pop'); } };
  N.replace = (s, p) => { const L = layers(); const l = L[L.length - 1]; l.pop(); l.push(entry(s, p)); commit('none', true); };
  N.popAndPush = (n, s, p) => { const L = layers(); const l = L[L.length - 1]; l.length = Math.max(1, l.length - n); l.push(entry(s, p)); commit('push'); };
  N.present = (s, p) => { if (st.app !== 'od') return; st.modals.push([entry(s, p)]); commit('present'); };
  N.presentStack = (arr) => { st.modals.push(arr.map(([s, p]) => entry(s, p))); commit('present'); };
  N.dismiss = (all) => { if (!st.modals.length) return; if (all) st.modals.length = 0; else st.modals.pop(); commit('dismiss'); };
  N.replaceModal = (s, p) => { if (!st.modals.length) return N.present(s, p); st.modals[st.modals.length - 1] = [entry(s, p)]; commit('none'); };
  N.tab = (t) => {
    if (st.app === 'cad') {
      if (st.cadTab === t) { if (st.cadStacks[t].length > 1) { st.cadStacks[t].length = 1; commit('pop'); } else { const el = screenEls.get(st.cadStacks[t][0].u); el && el.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
      st.cadTab = t; commit('none'); return;
    }
    if (st.tab === t && !st.modals.length) { if (st.stacks[t].length > 1) { st.stacks[t].length = 1; commit('pop'); } else { const el = screenEls.get(st.stacks[t][0].u); el && el.querySelector('.content')?.scrollTo({ top: 0, behavior: 'smooth' }); } return; }
    st.modals.length = 0; st.tab = t; commit('none');
  };
  N.launch = (app, opts = {}) => {
    ensureRoots();
    if (app === 'edu') { if (!st.edu) resetOD(); st.edu = true; app = 'od'; }
    else if (app === 'od' && st.edu && !opts.keepEdu) { resetOD(); st.edu = false; }
    st.app = app; if (!opts.fromSam) st.fromSam = false;
    commit('none');
  };
  const resetOD = () => { TABS.forEach((t) => (st.stacks[t] = [entry(t)])); st.modals = []; st.tab = 'home'; };
  N.homeScreen = () => { st.app = 'sb'; st.fromSam = false; commit('none'); };
  N.set = (app, tab, stack, modals = []) => {
    ensureRoots(); st.app = app;
    if (app === 'od') { st.tab = tab; st.stacks[tab] = stack.map(([s, p]) => entry(s, p)); st.modals = modals.map((m) => m.map(([s, p]) => entry(s, p))); }
    if (app === 'sam') st.sam = stack.map(([s, p]) => entry(s, p));
    if (app === 'cad') { st.cadTab = tab; st.cadStacks[tab] = stack.map(([s, p]) => entry(s, p)); }
    commit('none');
  };

  /* ---------------------------------------------------------------- render */
  const $ = (id) => document.getElementById(id);
  const screenEls = new Map();
  const reg = new Map(); // uid -> {e, stack, li}
  const containers = {};
  let areaEl, rootEl, tabbarEl;

  const val = (v, ...a) => (typeof v === 'function' ? v(...a) : v);
  const stripTags = (h) => String(h || '').replace(/<[^>]*>/g, '').trim();
  const titleOf = (e) => {
    if (!e) return 'Back';
    const def = OD.screens[e.s];
    if (!def) return 'Back';
    if (def.short) return val(def.short, e.p);
    let t; try { t = stripTags(val(def.title, e.p, { p: e.p, e, stack: [], idx: 0 })); } catch (err) { t = ''; }
    if (!t || t.length > 16) return 'Back';
    return t;
  };
  N.titleOf = titleOf;

  const getContainer = (key) => {
    if (containers[key]) return containers[key];
    const el = document.createElement('div');
    el.className = 'appc'; el.dataset.appc = key;
    el.style.cssText = 'position:absolute;inset:0;';
    rootEl.appendChild(el);
    const c = { el, tabs: {}, modals: [] };
    if (key === 'od') {
      TABS.forEach((t) => { const l = document.createElement('div'); l.className = 'layer'; l.dataset.layerTab = t; el.appendChild(l); c.tabs[t] = l; });
      tabbarEl = document.createElement('div'); tabbarEl.className = 'tabbar'; el.appendChild(tabbarEl); c.tabbar = tabbarEl;
    } else if (key === 'sam') {
      const l = document.createElement('div'); l.className = 'layer'; el.appendChild(l); c.tabs.main = l;
    } else if (key === 'cad') {
      CAD_TABS.forEach((t) => { const l = document.createElement('div'); l.className = 'layer'; l.dataset.layerTab = t; el.appendChild(l); c.tabs[t] = l; });
      const tb = document.createElement('div'); tb.className = 'tabbar'; el.appendChild(tb); c.cadTabbar = tb;
    } else if (key === 'sb') {
      const l = document.createElement('div'); l.className = 'layer'; el.appendChild(l); c.tabs.main = l;
    }
    return (containers[key] = c);
  };

  const onAnimEnd = (el, fn) => {
    let done = false;
    const f = () => { if (done) return; done = true; fn(); };
    el.addEventListener('animationend', f, { once: true });
    setTimeout(f, 450);
  };

  const paint = (e, el, stack, li, keepScroll) => {
    const def = OD.screens[e.s] || OD.screens._missing;
    const idx = stack.indexOf(e);
    const ctx = { e, p: e.p, idx, li, modal: li > 0, root: idx === 0, stack, prev: idx > 0 ? stack[idx - 1] : null, el };
    reg.set(e.u, { e, stack, li });
    const oldC = el.querySelector(':scope > .content');
    const top = oldC ? oldC.scrollTop : 0;
    // remember the focused field so a repaint doesn't kick the user out of it
    const ae = document.activeElement;
    let keep = null;
    if (ae && el.contains(ae) && (ae.dataset.k || ae.dataset.local !== undefined)) {
      keep = { k: ae.dataset.k, l: ae.dataset.local, ref: ae.closest('[data-ref]')?.dataset.ref };
      try { keep.s = ae.selectionStart; keep.e = ae.selectionEnd; } catch (err) { /* not a text field */ }
    }
    let html;
    try {
      if (def.full) html = def.full(e.p, ctx);
      else {
        const title = val(def.title, e.p, ctx) ?? '';
        let left = val(def.left, e.p, ctx);
        if (left == null) left = idx > 0 ? `<button class="nb back" data-back>${I.back}<span>${esc(val(def.back, e.p, ctx) ?? titleOf(stack[idx - 1]))}</span></button>` : li > 0 ? '<button class="nb" data-dismiss>Cancel</button>' : '';
        const right = val(def.right, e.p, ctx) || '';
        html = `<div class="nav ${def.navCls || ''}"><div class="nav-l">${left}</div><div class="nav-t" data-tt>${title}</div><div class="nav-r">${right}</div></div>`;
        const extra = val(def.extra, e.p, ctx);
        if (extra) html += `<div class="nav-extra">${extra}</div>`;
        html += `<div class="content">${def.body ? def.body(e.p, ctx) : ''}${def.noPad ? '' : '<div class="pad-bottom"></div>'}</div>`;
        const foot = val(def.foot, e.p, ctx);
        if (foot) html += foot;
      }
    } catch (err) {
      console.error(err);
      html = `<div class="nav"><div class="nav-l"><button class="nb back" data-back>${I.back}<span>Back</span></button></div><div class="nav-t">Error</div><div class="nav-r"></div></div><div class="content"><div class="empty">Something went wrong rendering “${esc(e.s)}”.<br><small>${esc(err.message)}</small></div></div>`;
    }
    const tabRoot = st.app === 'od' && li === 0 && idx === 0;
    el.className = 'screen ' + (def.cls ?? 'grouped') + (tabRoot ? ' has-tabbar' : '') + (el.classList.contains('hidden') ? ' hidden' : '');
    el.innerHTML = html;
    const nc = el.querySelector(':scope > .content');
    if (nc && keepScroll) nc.scrollTop = top;
    if (def.mount) { try { def.mount(el, e.p, ctx); } catch (err) { console.error(err); } }
    if (keep) {
      const q = keep.k !== undefined ? `[data-k="${CSS.escape(keep.k)}"]` : `[data-local="${CSS.escape(keep.l)}"]`;
      const scope = keep.ref ? el.querySelector(`[data-ref="${CSS.escape(keep.ref)}"]`) || el : el;
      const n = [...scope.querySelectorAll(q)].find((x) => x.matches('input,textarea,select'));
      if (n) { n.focus({ preventScroll: true }); try { if (keep.s != null) n.setSelectionRange(keep.s, keep.e); } catch (err) { /* ignore */ } }
    }
  };

  const syncLayer = (layerEl, stack, li, anim) => {
    const top = stack[stack.length - 1];
    const keep = new Set(stack.map((e) => e.u));
    const existing = [...layerEl.children];
    const prevVisible = existing.find((el) => !el.classList.contains('hidden') && !el.classList.contains('leaving'));
    let topEl = screenEls.get(top.u);
    const created = !topEl;
    if (created) {
      topEl = document.createElement('div');
      topEl.dataset.u = top.u;
      screenEls.set(top.u, topEl);
      layerEl.appendChild(topEl);
      paint(top, topEl, stack, li, false);
    } else {
      topEl.classList.remove('hidden', 'anim-push-out', 'anim-pop-in', 'anim-push-in');
      paint(top, topEl, stack, li, true);
    }
    existing.forEach((el) => {
      if (el === topEl) return;
      const u = el.dataset.u;
      if (!keep.has(u)) {
        if (anim === 'pop' && el === prevVisible) {
          el.classList.add('leaving', 'anim-pop-out');
          onAnimEnd(el, () => el.remove());
        } else el.remove();
        screenEls.delete(u); reg.delete(u);
      } else if (anim === 'push' && el === prevVisible) {
        el.classList.add('anim-push-out');
        onAnimEnd(el, () => { el.classList.remove('anim-push-out'); if (screenEls.get(N.top()?.u) !== el) el.classList.add('hidden'); });
      } else el.classList.add('hidden');
    });
    if (anim === 'push' && prevVisible && prevVisible !== topEl) { topEl.classList.add('anim-push-in'); onAnimEnd(topEl, () => topEl.classList.remove('anim-push-in')); }
    if (anim === 'pop' && prevVisible && prevVisible !== topEl) { topEl.classList.add('anim-pop-in'); onAnimEnd(topEl, () => topEl.classList.remove('anim-pop-in')); }
  };

  const render = (N.render = (anim = 'none') => {
    OD.ui.closeAll(true);
    const key = st.app;
    Object.entries(containers).forEach(([k, c]) => (c.el.style.display = k === key ? '' : 'none'));
    const c = getContainer(key);
    c.el.style.display = '';
    areaEl.classList.toggle('edu', st.app === 'od' && st.edu);
    if (key === 'sb') {
      c.tabs.main.innerHTML = OD.screens._springboard.full();
    } else if (key === 'sam') {
      syncLayer(c.tabs.main, st.sam, 0, anim);
    } else if (key === 'cad') {
      CAD_TABS.forEach((t) => (c.tabs[t].style.display = t === st.cadTab ? '' : 'none'));
      const cbase = st.cadStacks[st.cadTab];
      syncLayer(c.tabs[st.cadTab], cbase, 0, anim);
      renderCadTabbar(c, cbase.length === 1);
    } else if (key === 'od') {
      TABS.forEach((t) => (c.tabs[t].style.display = t === st.tab ? '' : 'none'));
      const base = st.stacks[st.tab];
      syncLayer(c.tabs[st.tab], base, 0, st.modals.length ? 'none' : anim);
      // modal layers
      while (c.modals.length > st.modals.length) {
        const m = c.modals.pop();
        [...m.children].forEach((el) => { screenEls.delete(el.dataset.u); reg.delete(el.dataset.u); });
        if (anim === 'dismiss' && c.modals.length === st.modals.length) { m.classList.add('anim-down'); onAnimEnd(m, () => m.remove()); }
        else m.remove();
      }
      st.modals.forEach((stack, i) => {
        let m = c.modals[i];
        let isNew = false;
        if (!m) { m = document.createElement('div'); m.className = 'layer modal'; c.el.insertBefore(m, c.tabbar); c.modals[i] = m; isNew = true; }
        const isTop = i === st.modals.length - 1;
        syncLayer(m, stack, i + 1, isTop ? (isNew ? 'none' : anim) : 'none');
        if (isNew && anim === 'present' && isTop) { m.classList.add('anim-up'); onAnimEnd(m, () => m.classList.remove('anim-up')); }
      });
      renderTabbar(base.length === 1 && !st.modals.length);
    }
    renderStatus();
    OD.onRoute && OD.onRoute();
  });

  const renderTabbar = (show) => {
    if (!tabbarEl) return;
    tabbarEl.classList.toggle('hidden', !show);
    if (!show) return;
    const badge = OD.paperworkBadge ? OD.paperworkBadge() : 0;
    const labels = { home: 'Home', tasks: 'Tasks', paperwork: 'Paperwork', assigned: 'Assigned', more: 'More' };
    tabbarEl.innerHTML = TABS.map((t) => `<button class="${st.tab === t ? 'on' : ''}" data-tab="${t}">${I.tabs[t]}<span>${labels[t]}</span>${t === 'paperwork' && badge ? `<span class="badge">${badge > 99 ? '99+' : badge}</span>` : ''}</button>`).join('');
  };

  const CAD_TAB_META = { dispatch: ['Dispatch', I.tabs.tasks], records: ['Records', I.tabs.paperwork] };
  const renderCadTabbar = (c, show) => {
    const tb = c.cadTabbar; if (!tb) return;
    tb.classList.toggle('hidden', !show);
    if (!show) return;
    tb.innerHTML = CAD_TABS.map((t) => `<button class="${st.cadTab === t ? 'on' : ''}" data-tab="${t}">${CAD_TAB_META[t][1]}<span>${CAD_TAB_META[t][0]}</span></button>`).join('');
  };

  /** Re-render the screen that contains element/ctx (or the current top screen) */
  N.refresh = (u) => {
    const target = u || N.top()?.u;
    const r = reg.get(target); const el = screenEls.get(target);
    if (r && el) paint(r.e, el, r.stack, r.li, true);
    if (st.app === 'od') renderTabbar(st.stacks[st.tab].length === 1 && !st.modals.length);
  };
  N.refreshAll = () => { reg.forEach((r, u) => { const el = screenEls.get(u); if (el && !el.classList.contains('hidden')) paint(r.e, el, r.stack, r.li, true); }); renderStatus(); if (st.app === 'od') renderTabbar(st.stacks[st.tab].length === 1 && !st.modals.length); };
  N.ctxOf = (node) => { const s = node.closest('.screen'); if (!s) return null; const r = reg.get(s.dataset.u); return r ? { ...r, p: r.e.p, u: s.dataset.u, el: s } : null; };

  /* ------------------------------------------------------------ status bar */
  const renderStatus = (N.renderStatus = () => {
    const sb = $('statusbar'); if (!sb) return;
    const light = st.app === 'sb';
    sb.classList.toggle('light', light);
    $('home-indicator').classList.toggle('light', light);
    const off = OD.db && OD.db.offline;
    const back = st.app === 'od' && st.fromSam ? '<span class="sb-back" data-sb-sam>◀ SAM</span>' : '';
    sb.innerHTML = `<div class="sb-l"><span>${F.clock()} ${st.app !== 'sb' ? I.arrow : ''}</span>${back}</div><div class="sb-r">${off ? I.plane : I.signal + ' ' + I.wifi} ${I.battery}</div>`;
    let flag = document.querySelector('.edu-flag');
    if (st.app === 'od' && st.edu) { if (!flag) { flag = document.createElement('div'); flag.className = 'edu-flag'; flag.textContent = 'EDUCATION'; areaEl.appendChild(flag); } }
    else if (flag) flag.remove();
  });
  setInterval(renderStatus, 15000);

  /* ============================================================== OVERLAYS */
  const ui = (OD.ui = {});
  let ovEl;
  const overlay = (html, cls = '') => {
    const w = document.createElement('div');
    w.className = 'ov ' + cls; w.style.cssText = 'position:absolute;inset:0;';
    w.innerHTML = html; ovEl.appendChild(w); return w;
  };
  ui.closeAll = (onlyTransient) => { if (!ovEl) return; [...ovEl.children].forEach((c) => { if (!onlyTransient || !c.classList.contains('sticky')) c.remove(); }); };
  ui.sheet = ({ title, items, cancel = 'Cancel' }) => {
    const w = overlay(`<div class="scrim"></div><div class="asheet"><div class="grp">${title ? `<div class="ttl">${esc(title)}</div>` : ''}${items.map((it, i) => `<button data-i="${i}" class="${it.danger ? 'danger' : ''} ${items.length > 6 ? 'small' : ''}">${esc(it.label)}</button>`).join('')}</div><div class="grp"><button class="cancel" data-i="-1">${esc(cancel)}</button></div></div>`);
    w.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-i]');
      if (!b && !ev.target.classList.contains('scrim')) return;
      w.remove();
      const i = b ? +b.dataset.i : -1;
      if (i >= 0 && items[i].fn) items[i].fn();
    });
  };
  ui.alert = ({ title, msg, buttons = [{ label: 'OK', bold: true }], input, vertical }) => {
    const w = overlay(`<div class="scrim"></div><div class="alert">${title ? `<div class="at">${esc(title)}</div>` : ''}${msg ? `<div class="am">${esc(msg)}</div>` : '<div style="height:14px"></div>'}${input ? `<div class="af"><input value="${esc(input.value || '')}" placeholder="${esc(input.ph || '')}"></div>` : ''}<div class="ab ${vertical || buttons.length > 2 ? 'vert' : ''}">${buttons.map((b, i) => `<button data-i="${i}" class="${b.bold ? 'bold' : ''} ${b.danger ? 'danger' : ''}">${esc(b.label)}</button>`).join('')}</div></div>`);
    const inp = w.querySelector('input'); if (inp) setTimeout(() => inp.focus(), 50);
    w.addEventListener('click', (ev) => {
      const b = ev.target.closest('[data-i]'); if (!b) return;
      const v = inp ? inp.value : undefined; w.remove();
      const bt = buttons[+b.dataset.i]; bt.fn && bt.fn(v);
    });
  };
  ui.confirm = (title, msg, okLabel, fn, danger) => ui.alert({ title, msg, buttons: [{ label: 'Cancel' }, { label: okLabel || 'OK', bold: !danger, danger, fn }] });
  ui.toast = (msg, ms = 2200) => {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    $('toast-root').appendChild(t); setTimeout(() => t.remove(), ms);
  };
  ui.dialog = (html, mount) => {
    const w = overlay(`<div class="scrim"></div><div class="dialog">${html}</div>`);
    const close = () => w.remove();
    w.querySelector('.scrim').addEventListener('click', close);
    mount && mount(w.querySelector('.dialog'), close);
    return close;
  };
  ui.custom = (html, mount, cls) => { const w = overlay(html, cls); const close = () => w.remove(); mount && mount(w, close); return close; };

  // --- iOS style wheel picker ---------------------------------------------
  const wheelCol = (items, selIdx, cls = '') => `<div class="wheel ${cls}"><div class="sp"></div>${items.map((t) => `<div>${esc(t)}</div>`).join('')}<div class="sp"></div></div>`;
  ui.wheel = ({ mode = 'date', value, onDone, quick = true }) => {
    const now = new Date();
    let cols;
    if (mode === 'date') {
      const v = value || F.iso(now);
      const years = []; for (let y = now.getFullYear() - 100; y <= now.getFullYear() + 10; y++) years.push(String(y));
      const days = []; for (let d = 1; d <= 31; d++) days.push(pad(d));
      const months = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
      cols = [{ items: days, sel: +v.slice(8, 10) - 1 }, { items: months, sel: +v.slice(5, 7) - 1 }, { items: years, sel: years.indexOf(v.slice(0, 4)) }];
    } else if (mode === 'time') {
      const v = value || F.hm(now);
      const hs = []; for (let h = 0; h < 24; h++) hs.push(pad(h));
      const ms = []; for (let m = 0; m < 60; m++) ms.push(pad(m));
      cols = [{ items: hs, sel: +v.slice(0, 2) }, { items: ms, sel: +v.slice(3, 5) }];
    } else if (mode === 'duration') {
      const v = (value || '00:00:00').split(':');
      const r = (n) => Array.from({ length: n }, (_, i) => pad(i));
      cols = [{ items: r(24), sel: +v[0] || 0 }, { items: r(60), sel: +v[1] || 0 }, { items: r(60), sel: +v[2] || 0 }];
    } else if (mode === 'list') {
      cols = [{ items: value.items, sel: Math.max(0, value.items.indexOf(value.sel)), cls: 'wide' }];
    }
    const label = mode === 'time' ? 'Time Picker' : mode === 'date' ? 'Date Picker' : '';
    const w = overlay(`<div class="scrim clear"></div><div class="wheel-sheet"><div class="wtb"><button data-q>${quick && label ? label : ''}</button><button class="bold" data-done>Done</button></div><div class="wheels">${cols.map((c) => wheelCol(c.items, c.sel, c.cls)).join('')}</div></div>`);
    const wheels = [...w.querySelectorAll('.wheel')];
    wheels.forEach((wh, i) => { wh.scrollTop = Math.max(0, cols[i].sel) * 36; });
    const read = () => wheels.map((wh, i) => cols[i].items[Math.min(cols[i].items.length - 1, Math.max(0, Math.round(wh.scrollTop / 36)))]);
    const result = () => {
      const r = read();
      if (mode === 'date') { let [d, m, y] = r; const max = new Date(+y, +m, 0).getDate(); if (+d > max) d = pad(max); return `${y}-${m}-${d}`; }
      if (mode === 'time') return `${r[0]}:${r[1]}`;
      if (mode === 'duration') return r.join(':');
      return r[0];
    };
    w.querySelector('.scrim').addEventListener('click', () => { w.remove(); onDone && onDone(result()); });
    w.querySelector('[data-done]').addEventListener('click', () => { w.remove(); onDone && onDone(result()); });
    w.querySelector('[data-q]').addEventListener('click', () => { w.remove(); onDone && onDone(mode === 'date' ? F.iso() : F.hm()); });
    wheels.forEach((wh) => wh.addEventListener('click', (ev) => { const idx = [...wh.children].indexOf(ev.target) - 1; if (idx >= 0) wh.scrollTo({ top: idx * 36, behavior: 'smooth' }); }));
  };

  // --- camera scanner simulation -----------------------------------------
  ui.scan = (kind, onResult) => {
    const txt = { dl: 'Scan the barcode on the back of the driver licence', rego: 'Scan the registration label / RUC details', tsl: 'Scan the TSL', id: 'Scan the identifier', serial: 'Scan the serial number' }[kind] || 'Scanning…';
    const w = overlay(`<div class="scanner"><div class="vf"></div><p>${esc(txt)}</p><button data-c>Cancel</button></div>`);
    const t = setTimeout(() => { w.remove(); onResult && onResult(); }, 1600);
    w.querySelector('[data-c]').addEventListener('click', () => { clearTimeout(t); w.remove(); });
  };

  /* ============================================================== GESTURES */
  let suppressClick = false;
  const initSwipe = () => {
    let cur = null; // {row, front, x0, y0, dx, mode, maxL, maxR, base}
    const closeOpen = (except) => document.querySelectorAll('.swipe.open').forEach((s) => { if (s !== except) { s.classList.remove('open'); s.querySelector('.sw-front').style.transform = ''; } });
    areaEl.addEventListener('pointerdown', (ev) => {
      const front = ev.target.closest('.sw-front');
      if (!front) { if (!ev.target.closest('.sw-back')) closeOpen(); return; }
      const row = front.parentElement;
      const back = row.querySelector('.sw-back');
      const nL = back ? back.querySelectorAll('.sw-left').length : 0, nR = back ? back.querySelectorAll('.sw-right').length : 0;
      const m = /translateX\((-?\d+)/.exec(front.style.transform || '');
      cur = { row, front, x0: ev.clientX, y0: ev.clientY, dx: 0, mode: null, maxL: nL * 84, maxR: nR * 84, base: m ? +m[1] : 0, id: ev.pointerId };
    });
    areaEl.addEventListener('pointermove', (ev) => {
      if (!cur || ev.pointerId !== cur.id) return;
      const dx = ev.clientX - cur.x0, dy = ev.clientY - cur.y0;
      if (!cur.mode) { if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) { cur.mode = 'h'; cur.row.classList.add('dragging'); closeOpen(cur.row); } else if (Math.abs(dy) > 8) { cur = null; return; } }
      if (cur.mode === 'h') {
        cur.raw = cur.base + dx;
        const x = Math.max(-cur.maxR - 30, Math.min(cur.maxL + 30, cur.raw));
        cur.front.style.transform = `translateX(${x}px)`; cur.dx = x; ev.preventDefault();
      }
    });
    const end = () => {
      if (!cur) return;
      if (cur.mode === 'h') {
        suppressClick = true; setTimeout(() => (suppressClick = false), 60);
        cur.row.classList.remove('dragging');
        const x = cur.dx, raw = cur.raw || 0;
        let target = 0;
        if (x > 50 && cur.maxL) target = cur.maxL; else if (x < -50 && cur.maxR) target = -cur.maxR;
        // a long swipe triggers the primary action straight away
        if ((raw > 150 && cur.maxL) || (raw < -150 && cur.maxR)) {
          const b = cur.row.querySelector(raw > 0 ? '.sw-left' : '.sw-right');
          cur.front.style.transform = ''; cur.row.classList.remove('open'); cur = null;
          if (b) setTimeout(() => b.click(), 90);
          return;
        }
        cur.front.style.transform = target ? `translateX(${target}px)` : '';
        cur.row.classList.toggle('open', !!target);
      }
      cur = null;
    };
    areaEl.addEventListener('pointerup', end);
    areaEl.addEventListener('pointercancel', end);
  };

  // pull-to-refresh on .content elements that have a [data-ptr] child
  const initPTR = () => {
    let p = null;
    areaEl.addEventListener('pointerdown', (ev) => {
      const c = ev.target.closest('.content'); if (!c || c.scrollTop > 0) return;
      const ptr = c.querySelector(':scope > [data-ptr]'); if (!ptr) return;
      if (ev.target.closest('input,textarea,button,.sw-front')) return;
      p = { c, ptr, y0: ev.clientY, id: ev.pointerId };
    });
    areaEl.addEventListener('pointermove', (ev) => { if (!p || ev.pointerId !== p.id) return; const dy = ev.clientY - p.y0; if (dy > 20) p.ptr.classList.add('on'); if (dy < 0) p = null; });
    const end = (ev) => {
      if (!p) return; const dy = ev.clientY - p.y0; const { ptr, c } = p; p = null;
      if (dy > 60) {
        ptr.innerHTML = '<span class="spinner"></span> Refreshing…'; ptr.classList.add('on');
        suppressClick = true; setTimeout(() => (suppressClick = false), 60);
        setTimeout(() => { const cx = N.ctxOf(c); const def = cx && OD.screens[cx.e.s]; def && def.onRefresh && def.onRefresh(cx.p, cx); OD.ui.toast('Information is up to date'); N.refresh(cx && cx.u); }, 900);
      } else ptr.classList.remove('on');
    };
    areaEl.addEventListener('pointerup', end);
    areaEl.addEventListener('pointercancel', () => { if (p) p.ptr.classList.remove('on'); p = null; });
  };

  /* ======================================================= EVENT DELEGATION */
  const splitGo = (s) => { const i = s.indexOf('?'); return i < 0 ? [s, {}] : [s.slice(0, i), OD.parseQs(s.slice(i + 1))]; };
  OD.splitGo = splitGo;
  OD.target = (ctx) => { if (!ctx) return null; const def = OD.screens[ctx.e.s]; return def && def.target ? def.target(ctx.p, ctx) : null; };
  /** target object for an element – honours an enclosing [data-ref] scope (inline paperwork fields) */
  OD.targetFor = (el, ctx) => { const sc = el && el.closest && el.closest('[data-ref]'); return sc ? OD.resolve(sc.dataset.ref) : OD.target(ctx); };

  const onClick = (ev) => {
    if (suppressClick) { ev.stopPropagation(); ev.preventDefault(); return; }
    if (ev.target.closest('[data-sb-sam]')) { OD.nav.launch('sam'); return; }
    const t = ev.target.closest('[data-go],[data-present],[data-back],[data-dismiss],[data-tab],[data-act],[data-seg],[data-app],[data-tt],[data-ns]');
    if (!t || !areaEl.contains(t) || t.matches('.appc, .layer, .screen, #app-root')) return;
    const ctx = N.ctxOf(t);
    const d = t.dataset;
    if (d.seg !== undefined && !d.act) {
      const seg = t.closest('[data-k]'); if (!seg || seg.classList.contains('dis')) return;
      const tgt = OD.targetFor(t, ctx); if (!tgt) return;
      const k = seg.dataset.k;
      const multi = seg.hasAttribute('data-multi');
      if (multi) { const arr = Array.isArray(tgt[k]) ? tgt[k] : []; const i = arr.indexOf(d.seg); if (i >= 0) arr.splice(i, 1); else arr.push(d.seg); tgt[k] = arr; }
      else tgt[k] = d.seg;
      const def = OD.screens[ctx.e.s]; def.onChange && def.onChange(k, tgt[k], ctx, tgt);
      OD.save(); N.refresh(ctx.u); return;
    }
    if (d.ns !== undefined) { // compass buttons
      const box = t.closest('[data-k]'); const tgt = OD.targetFor(t, ctx); if (!box || !tgt) return;
      tgt[box.dataset.k] = tgt[box.dataset.k] === d.ns ? '' : d.ns; OD.save(); N.refresh(ctx.u); return;
    }
    if (d.tt !== undefined) { const c = t.closest('.screen')?.querySelector(':scope > .content'); c && c.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (d.go) { const [s, p] = splitGo(d.go); if (OD.guard && OD.guard(s, p, ctx) === false) return; N.push(s, p); return; }
    if (d.present) { const [s, p] = splitGo(d.present); N.present(s, p); return; }
    if (d.back !== undefined) { N.pop(); return; }
    if (d.dismiss !== undefined) { N.dismiss(); return; }
    if (d.tab) { N.tab(d.tab); return; }
    if (d.app) { N.launch(d.app); return; }
    if (d.act) {
      const fn = OD.actions[d.act];
      if (fn) fn(d, t, ctx, ev); else console.warn('No action', d.act);
    }
  };
  const onInput = (ev) => {
    const el = ev.target;
    if (el.dataset.local !== undefined) { const ctx = N.ctxOf(el); const def = ctx && OD.screens[ctx.e.s]; def && def.onLocal && def.onLocal(el.dataset.local, el.value, ctx, el); return; }
    const k = el.dataset.k; if (!k) return;
    const ctx = N.ctxOf(el); const tgt = OD.targetFor(el, ctx); if (!tgt) return;
    tgt[k] = el.type === 'checkbox' ? el.checked : el.value;
    const def = OD.screens[ctx.e.s]; def.onChange && def.onChange(k, tgt[k], ctx, tgt);
    OD.save();
    const cnt = el.parentElement.querySelector('.count'); if (cnt && el.maxLength > 0) cnt.textContent = `${el.value.length} / ${el.maxLength}`;
    if (el.tagName === 'TEXTAREA') { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; }
  };
  const onChange = (ev) => { const el = ev.target; if (el.dataset.rr !== undefined) { const ctx = N.ctxOf(el); ctx && N.refresh(ctx.u); } };

  /* ================================================================== BOOT */
  OD.boot = () => {
    areaEl = $('screen-area'); rootEl = $('app-root'); ovEl = $('overlay-root');
    areaEl.addEventListener('click', onClick, true);
    areaEl.addEventListener('input', onInput);
    areaEl.addEventListener('change', onChange);
    // Enter on inputs inside forms triggers primary action
    areaEl.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && ev.target.matches('input[data-enter]')) { ev.preventDefault(); const ctx = N.ctxOf(ev.target); const fn = OD.actions[ev.target.dataset.enter]; fn && fn(ev.target.dataset, ev.target, ctx); }
    });
    $('home-indicator').addEventListener('click', () => N.homeScreen());
    initSwipe(); initPTR();
    ensureRoots();
    if (location.hash && location.hash !== '#/' && location.hash !== '#') N.applyHash('none');
    else render('none');
  };
})();
