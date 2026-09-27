/* =========================================================================
   OnDuty recreation – CAD (Computer-Aided Dispatch)
   A fictional, local-only dispatch board: units and incidents here are demo
   data kept only in this browser. Not connected to any real Police or
   emergency dispatch system, and no real emergency service is contacted by
   anything in this file.
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, N = OD.nav, L = OD.lists;
  const screen = OD.screen, action = OD.action;

  const qidOf = (s) => String(s || '').split(' - ')[0];
  const nameOf = (s) => { const parts = String(s || '').split(' - '); return parts[1] || parts[0]; };
  const myUnits = () => OD.db.units.filter((u) => (u.officers || []).some((o) => qidOf(o) === OD.db.session));
  const canEditUnit = (u) => OD.isAdmin() || (u.officers || []).some((o) => qidOf(o) === OD.db.session);
  const crewNames = (u) => ((u.officers || []).map(nameOf).join(', ') || 'Unstaffed');
  const statusClass = (s) => String(s || '').replace(/\s+/g, '');
  const priCode = (p) => String(p || '').slice(0, 2);

  const unitRow = (u) => {
    const inc = u.incidentId && OD.db.cad[u.incidentId];
    return `<div class="row" data-go="${OD.go('cad-unit', { id: u.id })}"><span class="risk-dot ${statusClass(u.status)}"></span><div class="grow"><div class="kv-k">${esc(u.callSign)} <small style="color:#8a8a8f;font-weight:400">${esc(u.type || '')}</small></div><div class="kv-v">${esc(crewNames(u))}</div><div class="kv-v" style="font-size:12px">${esc(u.status)}${inc ? ' · ' + esc(inc.typeDesc) : ''}</div></div><span class="chev">${I.chev}</span></div>`;
  };
  const incidentRow = (c) => `<div class="row" data-go="${OD.go('cad-incident', { id: c.id })}"><span class="pill ${priCode(c.priority)}" style="margin-right:10px">${esc(priCode(c.priority))}</span><div class="grow"><div class="kv-k">${esc(c.typeDesc)}</div><div class="kv-v">${esc(c.addr)}</div><div class="kv-v" style="font-size:12px">${esc(c.no)} · ${c.cleared ? 'Cleared' : c.units.length ? `${c.units.length} unit${c.units.length > 1 ? 's' : ''} assigned` : 'Awaiting dispatch'}</div></div><span class="chev">${I.chev}</span></div>`;

  /* ==================================================================== board */
  screen('dispatch', {
    title: 'Dispatch',
    right: () => (OD.isAdmin() ? '<button class="nb" data-go="cad-new-incident">+ Incident</button>' : ''),
    body: () => {
      const mine = myUnits();
      const incidents = Object.values(OD.db.cad).sort((a, b) => (a.cleared === b.cleared ? priCode(a.priority).localeCompare(priCode(b.priority)) || b.created - a.created : a.cleared ? 1 : -1));
      const open = incidents.filter((c) => !c.cleared);
      const cleared = incidents.filter((c) => c.cleared).slice(0, 10);
      const units = OD.db.units.slice().sort((a, b) => a.callSign.localeCompare(b.callSign));
      return (mine.length ? `${U.sh('MY UNIT')}<div class="group">${mine.map(unitRow).join('')}</div>` : '')
        + `${U.sh(`INCIDENTS (${open.length})`)}<div class="group">${open.length ? open.map(incidentRow).join('') : U.empty('No open incidents')}</div>`
        + (cleared.length ? `${U.sh('CLEARED')}<div class="group">${cleared.map(incidentRow).join('')}</div>` : '')
        + `${U.sh(`UNITS (${units.length})`)}<div class="group">${units.length ? units.map(unitRow).join('') : U.empty('No units registered')}</div>`
        + (OD.isAdmin() ? '<div class="row add" data-go="cad-new-unit">+ Register Unit</div>' : '')
        + '<div class="footnote">A fictional, local-only dispatch board – nothing here is connected to any real Police or emergency dispatch system.</div>';
    },
  });

  /* ================================================================== incident */
  screen('cad-incident', {
    title: (p) => { const c = OD.db.cad[p.id]; return c ? c.no : 'Incident'; },
    right: (p) => { const c = OD.db.cad[p.id]; return (OD.isAdmin() && c && !c.cleared) ? `<button class="nb red" data-act="cadClear" data-a="${p.id}">Clear</button>` : ''; },
    body: (p) => {
      const c = OD.db.cad[p.id]; if (!c) return U.empty('Incident not found');
      const units = c.units.map((uid) => OD.db.units.find((u) => u.id === uid)).filter(Boolean);
      const unitRows = units.map((u) => OD.swipeRow(
        `<div class="row" data-go="${OD.go('cad-unit', { id: u.id })}"><span class="risk-dot ${statusClass(u.status)}"></span><div class="grow"><div class="kv-k">${esc(u.callSign)}</div><div class="kv-v">${esc(u.status)}</div></div><span class="chev">${I.chev}</span></div>`,
        OD.isAdmin() && !c.cleared ? { right: [{ label: 'Unassign', act: 'cadUnassign', a: `${c.id}|${u.id}` }] } : {}
      )).join('');
      return `<div class="sh">INCIDENT</div><div class="para"><b>${esc(c.typeDesc)}</b></div>${U.kv('CAD Number', c.no)}${U.kv('Priority', c.priority)}${U.kv('Address', c.addr)}${U.kv('Status', c.cleared ? 'Cleared' : units.length ? 'Dispatched' : 'Awaiting dispatch')}${U.kv('Reported', F.stamp(c.created))}`
        + `<div class="sh">UNITS ASSIGNED (${units.length})</div><div class="group">${units.length ? unitRows : U.empty('No units assigned yet')}</div>`
        + (OD.isAdmin() && !c.cleared ? `<div class="row add" data-act="cadAssign" data-a="${c.id}">+ Assign Unit</div>` : '')
        + `<div class="sh">NOTES</div>${c.notes.length ? c.notes.slice().reverse().map((n) => U.kv(`${n.by} · ${F.stamp(n.ts)}`, n.text)).join('') : U.empty('No notes yet')}`
        + `<button class="bigbtn" data-act="cadAddNote" data-a="${c.id}">Add Note</button>`;
    },
  });
  action('cadAssign', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const c = OD.db.cad[d.a]; if (!c || c.cleared) return;
    const avail = OD.db.units.filter((u) => u.status === 'Available');
    if (!avail.length) return OD.ui.toast('No available units to dispatch');
    OD.ui.sheet({ title: 'Assign Unit', items: avail.map((u) => ({ label: `${u.callSign} - ${crewNames(u)}`, fn: () => {
      u.status = 'Dispatched'; u.incidentId = c.id; u.updated = Date.now();
      c.units.push(u.id);
      OD.save(); N.refresh(ctx.u); OD.ui.toast(`${u.callSign} dispatched`);
    } })) });
  });
  action('cadUnassign', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const [cid, uid] = d.a.split('|');
    const c = OD.db.cad[cid]; const u = OD.db.units.find((x) => x.id === uid);
    if (!c || !u) return;
    c.units = c.units.filter((id) => id !== uid);
    if (u.incidentId === cid) { u.incidentId = null; u.status = 'Available'; u.updated = Date.now(); }
    OD.save(); N.refresh(ctx.u); OD.ui.toast(`${u.callSign} unassigned`);
  });
  action('cadClear', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const c = OD.db.cad[d.a]; if (!c) return;
    OD.ui.confirm('Clear Incident', 'Mark this incident as cleared and free all assigned units?', 'Clear', () => {
      c.units.forEach((uid) => { const u = OD.db.units.find((x) => x.id === uid); if (u) { u.status = 'Available'; u.incidentId = null; u.updated = Date.now(); } });
      c.cleared = true; c.clearedAt = Date.now();
      OD.save(); N.refresh(ctx.u); OD.ui.toast('Incident cleared');
    });
  });
  action('cadAddNote', (d, el, ctx) => {
    const c = OD.db.cad[d.a]; if (!c) return;
    OD.ui.alert({ title: 'Add Note', input: { ph: 'Note text' }, buttons: [{ label: 'Cancel' }, { label: 'Add', bold: true, fn: (text) => {
      if (!text || !text.trim()) return;
      c.notes.push({ by: OD.db.me.qid, ts: Date.now(), text: text.trim() });
      OD.save(); N.refresh(ctx.u);
    } }] });
  });

  /* ============================================================== new incident */
  OD.forms['cad-new-incident'] = {
    fields: [
      { h: 'INCIDENT DETAILS' },
      { pk: 'type', l: 'Incident Type', o: 'cadTypes', req: 1 },
      { t: 'addr', l: 'Address / Location', req: 1 },
      { pk: 'priority', l: 'Priority', o: 'cadPriorities', req: 1 },
      { note: 'A fictional demo incident kept only in this browser – not sent to any real dispatch system.' },
    ],
  };
  screen('cad-new-incident', {
    title: 'New Incident',
    target: () => OD.resolve('tmp:cadnew'),
    body: () => {
      if (!OD.isAdmin()) return U.empty('Admin access required.');
      const d = OD.resolve('tmp:cadnew');
      return OD.renderFields(OD.forms['cad-new-incident'].fields, d, { ref: 'tmp:cadnew', fid: 'cad-new-incident', pw: null, reviewed: d._reviewed }) + '<button class="bigbtn" data-act="cadCreateIncident">Create Incident</button>';
    },
  });
  action('cadCreateIncident', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const x = OD.resolve('tmp:cadnew');
    if (!x.type || !x.addr || !x.priority) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('Type, address and priority are required'); }
    const id = OD.uid('cad');
    OD.db.cad[id] = { id, no: 'CAD' + String(Date.now()).slice(-6), type: x.type.split(' - ')[0], typeDesc: x.type, addr: x.addr, priority: x.priority, units: [], cleared: false, created: Date.now(), notes: [] };
    OD.tmp.cadnew = {}; OD.save(); N.pop(); OD.ui.toast('Incident created');
  });

  /* ===================================================================== unit */
  screen('cad-unit', {
    title: (p) => { const u = OD.db.units.find((x) => x.id === p.id); return u ? u.callSign : 'Unit'; },
    right: (p) => { const u = OD.db.units.find((x) => x.id === p.id); return (OD.isAdmin() && u && !u.incidentId) ? `<button class="nb red" data-act="cadDeleteUnit" data-a="${p.id}">Delete</button>` : ''; },
    target: (p) => OD.db.units.find((x) => x.id === p.id),
    body: (p) => {
      const u = OD.db.units.find((x) => x.id === p.id); if (!u) return U.empty('Unit not found');
      const inc = u.incidentId && OD.db.cad[u.incidentId];
      const editable = canEditUnit(u);
      return `<div class="sh">UNIT</div>${U.kv('Call Sign', u.callSign)}${U.kv('Type', u.type || '')}${U.kv('Crew', crewNames(u))}${U.kv('Vehicle', u.vehicle || '—')}`
        + `<div class="sh">STATUS</div>${editable ? `<div class="field">${U.seg('status', L.unitStatuses, u.status)}</div>` : `<div class="para">${esc(u.status)}</div><div class="footnote">Only this unit's crew or an Admin can change its status.</div>`}`
        + (inc ? `<div class="sh">CURRENT INCIDENT</div><div class="row" data-go="${OD.go('cad-incident', { id: inc.id })}"><div class="grow"><div class="kv-k">${esc(inc.typeDesc)}</div><div class="kv-v">${esc(inc.addr)}</div></div><span class="chev">${I.chev}</span></div>` : '');
    },
    onChange: (k, v, ctx, tgt) => {
      if (k !== 'status') return;
      tgt.updated = Date.now();
      if (v === 'Available' && tgt.incidentId) {
        const inc = OD.db.cad[tgt.incidentId]; if (inc) inc.units = inc.units.filter((id) => id !== tgt.id);
        tgt.incidentId = null;
      }
      OD.save();
      OD.ui.toast(`${tgt.callSign} status set to ${v}`);
    },
  });
  action('cadDeleteUnit', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const u = OD.db.units.find((x) => x.id === d.a); if (!u) return;
    if (u.incidentId) return OD.ui.toast('Unassign this unit from its incident first');
    OD.ui.confirm('Delete Unit', `Remove ${u.callSign} from the roster?`, 'Delete', () => {
      OD.db.units = OD.db.units.filter((x) => x.id !== u.id);
      OD.save(); N.pop();
    }, true);
  });

  /* ================================================================= new unit */
  OD.forms['cad-new-unit'] = {
    fields: [
      { h: 'UNIT DETAILS' },
      { t: 'callSign', l: 'Call Sign', req: 1, upper: 1, ph: 'e.g. WN30' },
      { pk: 'type', l: 'Unit Type', o: 'unitTypes' },
      { pk: 'officers', l: 'Crew', o: 'x:officerQids', multi: 1 },
      { t: 'vehicle', l: 'Vehicle Registration', opt: 1, upper: 1 },
      { note: 'A fictional demo unit kept only in this browser.' },
    ],
  };
  screen('cad-new-unit', {
    title: 'Register Unit',
    target: () => OD.resolve('tmp:cadunitnew'),
    body: () => {
      if (!OD.isAdmin()) return U.empty('Admin access required.');
      const d = OD.resolve('tmp:cadunitnew');
      if (!d._loaded) Object.assign(d, { type: 'Patrol Car', officers: [], _loaded: true });
      return OD.renderFields(OD.forms['cad-new-unit'].fields, d, { ref: 'tmp:cadunitnew', fid: 'cad-new-unit', pw: null, reviewed: d._reviewed }) + '<button class="bigbtn" data-act="cadCreateUnit">Register Unit</button>';
    },
  });
  action('cadCreateUnit', (d, el, ctx) => {
    if (!OD.isAdmin()) return OD.ui.toast('Admin access required');
    const x = OD.resolve('tmp:cadunitnew');
    if (!x.callSign) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('Call sign is required'); }
    const callSign = String(x.callSign).toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (OD.db.units.some((u) => u.callSign === callSign)) return OD.ui.toast('A unit with that call sign already exists');
    OD.db.units.push({ id: OD.uid('unit'), callSign, type: x.type || 'Patrol Car', officers: x.officers || [], vehicle: x.vehicle || '', status: 'Available', incidentId: null, updated: Date.now() });
    OD.tmp.cadunitnew = {}; OD.save(); N.pop(); OD.ui.toast(`${callSign} registered`);
  });

  /* ================================================================= RECORDS
     Register real persons and vehicles into this browser's NIA data (the
     same OD.db.persons/OD.db.vehicles used by Query Person / Query Vehicle
     in OnDuty) – there is no seeded or generated data anywhere in this
     recreation, so this is how records get in. */
  screen('records', {
    title: 'Records',
    body: () => {
      const persons = Object.values(OD.db.persons);
      const vehicles = Object.values(OD.db.vehicles);
      const locations = Object.values(OD.db.locations);
      const orgs = Object.values(OD.db.orgs);
      return '<div class="gap"></div><div class="group"><div class="row add" data-go="records-new-person">+ Add Person</div><div class="row add" data-go="records-new-vehicle">+ Add Vehicle</div><div class="row add" data-go="records-new-location">+ Add Location</div><div class="row add" data-go="records-new-org">+ Add Organisation</div></div>'
        + `${U.sh(`PERSONS (${persons.length})`)}<div class="group">${persons.length ? persons.map((p) => OD.personCard(p, { go: OD.go('person', { id: p.id }) })).join('') : U.empty('No persons added yet')}</div>`
        + `${U.sh(`VEHICLES (${vehicles.length})`)}<div class="group">${vehicles.length ? vehicles.map((v) => OD.vehicleCard(v, { go: OD.go('vehicle', { id: v.id }) })).join('') : U.empty('No vehicles added yet')}</div>`
        + `${U.sh(`LOCATIONS (${locations.length})`)}<div class="group">${locations.length ? locations.map((l) => OD.locationCard(l, { go: OD.go('location', { id: l.id }) })).join('') : U.empty('No locations added yet')}</div>`
        + `${U.sh(`ORGANISATIONS (${orgs.length})`)}<div class="group">${orgs.length ? orgs.map((o) => OD.orgCard(o, { go: OD.go('org', { id: o.id }) })).join('') : U.empty('No organisations added yet')}</div>`
        + '<div class="footnote">Records added here become searchable via Query Person / Vehicle / Location / Organisation in OnDuty. Stored only in this browser.</div>';
    },
  });

  OD.forms['records-person'] = {
    fields: [
      { h: 'PERSON DETAILS' },
      { t: 'sn', l: 'Surname', req: 1, upper: 1 },
      { t: 'gn', l: 'Given Name(s)', req: 1, upper: 1 },
      { seg: 'g', l: 'Gender', o: ['Male', 'Female'] },
      { dt: 'dob', l: 'Date of Birth', time: false, req: 1 },
      { h: 'CONTACT' },
      { t: 'addr', l: 'Address', req: 1 },
      { t: 'phone', l: 'Phone Number', opt: 1, kb: 'tel' },
      { h: 'IDENTIFIERS (OPTIONAL)' },
      { t: 'prn', l: 'PRN', opt: 1, upper: 1, ph: 'Leave blank to auto-generate' },
      { t: 'dl', l: 'Driver Licence Number', opt: 1, upper: 1 },
      { note: 'Adds a real person record to this browser’s NIA data. Stored only here – not sent anywhere.' },
    ],
  };
  screen('records-new-person', {
    title: 'Add Person',
    target: () => OD.resolve('tmp:recperson'),
    body: () => {
      const d = OD.resolve('tmp:recperson');
      if (!d._loaded) Object.assign(d, { g: 'Male', _loaded: true });
      return OD.renderFields(OD.forms['records-person'].fields, d, { ref: 'tmp:recperson', fid: 'records-person', pw: null, reviewed: d._reviewed }) + '<button class="bigbtn" data-act="recordsSavePerson">Add Person</button>';
    },
  });
  action('recordsSavePerson', (d, el, ctx) => {
    const x = OD.resolve('tmp:recperson');
    if (!x.sn || !x.gn || !x.dob || !x.addr) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('Surname, given name(s), date of birth and address are required'); }
    const id = OD.uid('P');
    let prn = x.prn ? x.prn.toUpperCase() : '';
    if (!prn) prn = 'A' + String.fromCharCode(65 + Math.floor(Math.random() * 26)) + String(100000 + Math.floor(Math.random() * 899999));
    if (Object.values(OD.db.persons).some((p) => p.prn === prn)) return OD.ui.toast('A person with that PRN already exists');
    OD.db.persons[id] = { id, sn: x.sn.toUpperCase(), gn: x.gn.toUpperCase(), g: x.g || 'Male', dob: x.dob, prn, addr: x.addr, addrType: 'Home Address', phone: x.phone || '', dl: x.dl ? x.dl.toUpperCase() : '', alerts: [], alertList: [], expired: 0, nzta: !!x.dl };
    OD.tmp.recperson = {}; OD.save(); N.pop(); OD.ui.toast(`${OD.fullName(OD.db.persons[id])} added`);
  });

  OD.forms['records-vehicle'] = {
    fields: [
      { h: 'VEHICLE DETAILS' },
      { t: 'rego', l: 'Registration Plate', req: 1, upper: 1 },
      { pk: 'make', l: 'Make', o: 'makes' },
      { t: 'model', l: 'Model', opt: 1 },
      { pk: 'colour', l: 'Colour', o: 'colours' },
      { pk: 'body', l: 'Body Type', o: ['Sedan', 'Hatchback Car', 'Station Wagon', 'Utility', 'SUV', 'Van', 'Truck', 'Motorcycle'] },
      { h: 'IDENTIFIERS (OPTIONAL)' },
      { t: 'vin', l: 'VIN', opt: 1, upper: 1 },
      { note: 'Adds a real vehicle record to this browser’s NIA data. Stored only here – not sent anywhere.' },
    ],
  };
  screen('records-new-vehicle', {
    title: 'Add Vehicle',
    target: () => OD.resolve('tmp:recvehicle'),
    body: () => {
      const d = OD.resolve('tmp:recvehicle');
      if (!d._loaded) Object.assign(d, { body: 'Sedan', _loaded: true });
      return OD.renderFields(OD.forms['records-vehicle'].fields, d, { ref: 'tmp:recvehicle', fid: 'records-vehicle', pw: null, reviewed: d._reviewed }) + '<button class="bigbtn" data-act="recordsSaveVehicle">Add Vehicle</button>';
    },
  });
  action('recordsSaveVehicle', (d, el, ctx) => {
    const x = OD.resolve('tmp:recvehicle');
    if (!x.rego) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('Registration plate is required'); }
    const rego = x.rego.toUpperCase().replace(/\s+/g, '');
    if (Object.values(OD.db.vehicles).some((v) => v.rego === rego)) return OD.ui.toast('A vehicle with that registration already exists');
    const id = OD.uid('V');
    const colour = x.colour || '';
    OD.db.vehicles[id] = { id, rego, make: x.make || '', model: x.model || '', colour, hex: OD.colourHex[colour] || '#8a8a8f', outline: colour === 'White', body: x.body || 'Sedan', vin: x.vin ? x.vin.toUpperCase() : '', year: new Date().getFullYear(), alerts: [], regExp: '', wofExp: '' };
    OD.tmp.recvehicle = {}; OD.save(); N.pop(); OD.ui.toast(`${rego} added`);
  });

  OD.forms['records-location'] = {
    fields: [
      { h: 'LOCATION DETAILS' },
      { t: 'addr', l: 'Address', req: 1 },
      { pk: 'type', l: 'Type', o: ['Residential', 'Commercial', 'Street', 'Intersection', 'Place of Worship', 'Education', 'Other'] },
      { note: 'Adds a real location record to this browser’s NIA data. Stored only here – not sent anywhere.' },
    ],
  };
  screen('records-new-location', {
    title: 'Add Location',
    target: () => OD.resolve('tmp:recloc'),
    body: () => {
      const d = OD.resolve('tmp:recloc');
      if (!d._loaded) Object.assign(d, { type: 'Residential', _loaded: true });
      return OD.renderFields(OD.forms['records-location'].fields, d, { ref: 'tmp:recloc', fid: 'records-location', pw: null, reviewed: d._reviewed }) + '<button class="bigbtn" data-act="recordsSaveLocation">Add Location</button>';
    },
  });
  action('recordsSaveLocation', (d, el, ctx) => {
    const x = OD.resolve('tmp:recloc');
    if (!x.addr) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('Address is required'); }
    const id = OD.uid('L');
    OD.db.locations[id] = { id, addr: x.addr.toUpperCase(), type: x.type || 'Residential', alerts: [], x: 30 + Math.random() * 40, y: 30 + Math.random() * 40 };
    OD.tmp.recloc = {}; OD.save(); N.pop(); OD.ui.toast('Location added');
  });

  OD.forms['records-org'] = {
    fields: [
      { h: 'ORGANISATION DETAILS' },
      { t: 'name', l: 'Name', req: 1, upper: 1 },
      { seg: 'cat', l: 'Category', o: ['Business', 'Club', 'Other'] },
      { t: 'type', l: 'Type', opt: 1, ph: 'e.g. Car dealer, School' },
      { t: 'addr', l: 'Address', opt: 1 },
      { note: 'Adds a real organisation record to this browser’s NIA data. Stored only here – not sent anywhere.' },
    ],
  };
  screen('records-new-org', {
    title: 'Add Organisation',
    target: () => OD.resolve('tmp:recorg'),
    body: () => {
      const d = OD.resolve('tmp:recorg');
      if (!d._loaded) Object.assign(d, { cat: 'Business', _loaded: true });
      return OD.renderFields(OD.forms['records-org'].fields, d, { ref: 'tmp:recorg', fid: 'records-org', pw: null, reviewed: d._reviewed }) + '<button class="bigbtn" data-act="recordsSaveOrg">Add Organisation</button>';
    },
  });
  action('recordsSaveOrg', (d, el, ctx) => {
    const x = OD.resolve('tmp:recorg');
    if (!x.name) { x._reviewed = true; OD.save(); N.refresh(ctx.u); return OD.ui.toast('Name is required'); }
    const id = OD.uid('G');
    OD.db.orgs[id] = { id, name: x.name.toUpperCase(), cat: x.cat || 'Business', type: x.type || '', addr: x.addr || '', alerts: [] };
    OD.tmp.recorg = {}; OD.save(); N.pop(); OD.ui.toast(`${OD.org(id).name} added`);
  });
})();
