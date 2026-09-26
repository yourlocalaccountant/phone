/* =========================================================================
   OnDuty recreation – paperwork type definitions and their sub-forms
   (sections and questions follow the OnDuty user guides in the OIA release)
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, U = OD.U, I = OD.I, F = OD.fmt, esc = OD.esc, L = OD.lists;
  const FM = OD.forms, T = OD.defType;
  const YN = ['Yes', 'No'], YNU = ['Yes', 'No', 'Unknown'];
  const person = (d) => OD.person(d && d.pid);
  const lrt = (code) => OD.data.lrtByCode[code] || {};
  const nia = (code) => OD.data.niaByCode[code] || {};
  L.nearStreets = ['JACKSON STREET', 'MOLESWORTH STREET', 'BLUE STREET', 'THORNDON QUAY', 'MULGRAVE STREET', 'HAWKESTONE STREET', 'PAREMATA HAYWARDS ROAD'];

  /* ------------------------------------------------------ option providers */
  OD.optProviders.policeVehicles = () => OD.db.settings.vehicles.map((v) => `${v.rego} - ${v.type}`);
  OD.optProviders.breathDevices = () => { const v = OD.db.settings.vehicles.find((x) => x.id === OD.db.settings.defaultVehicle); const b = (v?.breath || []).map((x) => x.device); return b.length ? [...new Set([...b, ...L.breathDevices])] : L.breathDevices; };
  OD.optProviders.wsTargets = (a, d, pw) => [...OD.pwPersonIds(pw).map((pid) => OD.fullName(OD.person(pid))), ...(pw?.l.targets || []).filter((t) => t.type).map((t) => `${t.type}${t.desc ? ' - ' + t.desc : ''}`)];
  OD.optProviders.pwOrgs = (a, d, pw) => Object.values(pw?.o || {}).flat().map((e) => OD.org(e.oid)?.name).filter(Boolean);
  OD.optProviders.personPhones = (a, d) => { const p = person(d); return [p?.phone || '021 123 456', '04 000 0000'].filter(Boolean); };
  OD.optProviders.addresses = () => Object.values(OD.db.locations).map((l) => l.addr);

  const RIGHTS = 'You have been detained for the purpose of breath or blood test procedures for alcohol.\n\nYou have the right to remain silent.\n\nYou do not have to make any statement.\n\nAnything you say will be recorded and may be given in evidence in court.\n\nYou have the right to speak with a lawyer without delay and in private before deciding to answer any questions.\n\nPolice have a list of lawyers you may speak to for free.\n\nThese rights will continue throughout the breath or blood alcohol test procedures.\n\nIf you wish to speak to a lawyer a telephone will be made available to you for that purpose as soon as practicable. You will be allowed a reasonable time to consult and instruct a lawyer from the time a telephone is made available to you.';
  const DEVICE_TEXT = 'A device approved by the Minister of Police by notice in the New Zealand Gazette; Land Transport (Breath Tests) Notice 2015. The test was administered in accordance with the Land Transport (Breath Tests) Notice 2015.';
  OD.RIGHTS = RIGHTS;

  /* ================================================================ COMMON */
  const personTop = (d) => { const p = person(d); return p ? `<div class="sh">SUMMARY</div>${OD.personCard(p, { compact: true, safvr: true })}` : ''; };
  const vehicleTop = (d) => { const v = OD.vehicle(d && d.vid); return v ? `<div class="sh">SUMMARY</div>${OD.vehicleCard(v, { year: true, inline: true })}` : ''; };
  const offTop = (d, pw, fc, opts = {}) => {
    const o = d.lib === 'nia' ? nia(d.code) : lrt(d.code);
    const lock = fc && fc.locked;
    return `<div class="sh">SUMMARY</div><div class="para"><b>${esc(d.code)} - ${esc(o.desc || '')}</b>${o.eff ? '\n' + esc(o.eff) : ''}</div>${lock ? '' : `<button class="bigbtn thin" data-act="offChooseOther">Choose Other Offence</button>`}${opts.wording !== false && o.text ? `<div class="sh">OFFENCE</div><div class="para">${esc(o.text)}</div>` : ''}${opts.fee && o.ntype ? `<div class="sh">FEES AND DEMERITS</div><div class="para">Fee\n${o.fee ? '$' + o.fee : o.speed ? 'Depends on speed' : 'Depends on weight'}${o.dem ? `\nDemerits: ${esc(o.dem)}` : ''}</div>` : ''}${o.leg ? `<div class="sh">LEGISLATION</div><div class="para">${esc(o.leg)}</div>` : ''}`;
  };
  OD.action('offChooseOther', (d, el, ctx) => {
    const pw = OD.pwOfRef(ctx.p.t); const off = OD.resolve(ctx.p.t); if (!pw || !off) return;
    pw.off = pw.off.filter((o) => o.id !== off.id); OD.save();
    OD.nav.replace(off.lib === 'nia' ? 'nia-lib' : 'lib', off.lib === 'nia' ? { id: pw.id, k: off.k || '' } : { mode: 'add', id: pw.id });
  });

  FM.narrative = { title: 'Narrative', fields: [{ h: 'NARRATIVE' }, { a: 'text', l: 'Narrative', req: 1, tall: 1, max: 15000, ph: 'Tap to add...' }] };
  FM['loc-generic'] = {
    title: 'Location', noun: 'location',
    top: (d, pw, fc) => { const k = fc.ref.split('loc.')[1]; return `<div class="sh">LOCATION</div><div class="row" data-go="${OD.go('sel-loc', { id: pw.id, k })}"><div class="grow"><div class="lbl">Location Details:</div><div class="kv-k" style="font-size:14px">${esc(d.addr || 'Select a location')}</div></div><span class="right" style="color:var(--tint)">Change</span></div>`; },
    fields: [{ h: 'ADDITIONAL DETAILS' }, { t: 'desc', l: 'Location Description', opt: 1, ph: 'e.g. outside the dairy' }, { pk: 'scene', l: 'Scene Station', o: 'stations', opt: 1 }],
  };
  FM['pw-person'] = {
    title: 'Person Details', noun: 'person', top: personTop,
    fields: [{ h: 'ROLE' }, { pk: 'role', l: 'Role', o: 'orRoles' }, { h: 'CONTACT DETAILS' }, { t: 'addr', l: 'Address', opt: 1, ph: 'Current address as per NIA' }, { t: 'phone', l: 'Phone Number', kb: 'tel' }, { t: 'email', l: 'Email' }, { h: 'DESCRIPTION' }, { a: 'clothing', l: 'Clothing', ph: 'What was the person wearing?' }, { sub: 'marks', l: 'Body Marks', f: 'body-marks', opt: 1 }, { h: 'CULTURE' }, { pk: 'iwi', l: 'Iwi', o: 'iwi', opt: 1 }, { t: 'hapu', l: 'Hapū' }],
    init: (d) => { d.marks = d.marks || { pid: d.pid }; },
  };
  FM['or-person'] = { ...FM['pw-person'] };
  FM['n-person'] = {
    title: 'Person Details', noun: 'person', top: (d) => personTop(d) + (person(d)?.cpor ? '<div class="para red small">This person is on the Child Protection Offenders Register – additional questions must be answered before submitting. Use discretion to protect the privacy of the registered person.</div>' : ''),
    fields: [{ h: 'CONTACT DETAILS' }, { t: 'addr', l: 'Address', opt: 1, ph: 'Current address as per NIA' }, { t: 'phone', l: 'Phone Number', kb: 'tel' }, { h: 'DESCRIPTION' }, { a: 'clothing', l: 'Clothing', ph: 'What was the person wearing? This can be searched in NIA.' }, { sub: 'marks', l: 'Body Marks', f: 'body-marks', opt: 1 }, { h: 'CULTURE' }, { pk: 'iwi', l: 'Iwi', o: 'iwi', opt: 1 }, { t: 'hapu', l: 'Hapū' }],
    init: (d) => { d.marks = d.marks || { pid: d.pid }; },
  };
  FM['body-marks'] = {
    title: 'Body Marks',
    status: (d) => ((d.new || []).length ? 'done' : 'none'),
    top: (d) => { const p = person(d); const m = (p && p.marks) || []; return `<div class="sh">EXISTING BODY MARKS (NIA)</div>${m.length ? m.map((x) => U.kv(`${x.type} - ${x.loc}`, x.desc)).join('') : '<div class="row center" style="color:#999">No body marks recorded</div>'}<div class="footnote">Check what information is already recorded to avoid creating a duplicate. You cannot modify or remove an existing body mark.</div>`; },
    fields: [{ h: 'NEW BODY MARKS' }, { list: 'new', add: '+ Body Mark', f: 'body-mark', title: (e) => `${e.type || 'Body mark'}${e.loc ? ' - ' + e.loc : ''}`, sum: (e) => e.desc }],
  };
  FM['body-mark'] = { title: 'Body Mark', noun: 'body mark', fields: [{ h: 'BODY MARK' }, { pk: 'type', l: 'Type', o: 'markTypes' }, { pk: 'loc', l: 'Location', o: 'markLocs' }, { a: 'desc', l: 'Description', req: 1, ph: 'Include as much information as you can, including size and colour' }] };
  FM['pw-vehicle'] = { title: 'Vehicle', noun: 'vehicle', top: vehicleTop, fields: [{ h: 'ROLE' }, { pk: 'role', l: 'Vehicle Role', o: 'vehRoles', opt: 1 }, { h: 'VEHICLE COLOURS' }, { pk: 'primary', l: 'Primary Colour', o: 'colours', opt: 1 }, { pk: 'secondary', l: 'Secondary Colour', o: 'colours', opt: 1 }] };
  FM['n-vehicle'] = { title: 'Vehicle', noun: 'vehicle', top: vehicleTop, fields: [{ h: 'VEHICLE COLOURS' }, { pk: 'primary', l: 'Primary Colour', o: 'colours', opt: 1 }, { pk: 'secondary', l: 'Secondary Colour', o: 'colours', opt: 1 }] };
  FM['pw-org'] = { title: 'Organisation', noun: 'organisation', top: (d) => `<div class="sh">SUMMARY</div>${OD.orgCard(OD.org(d.oid))}`, fields: [{ h: 'ROLE' }, { pk: 'role', l: 'Role', o: 'orgRoles', opt: 1 }, { t: 'contact', l: 'Contact person', opt: 1 }] };
  FM['add-loc'] = { title: 'Additional Location', noun: 'location', fields: [{ h: 'LOCATION' }, { pk: 'addr', l: 'Address', o: 'x:addresses', search: 1 }, { t: 'desc', l: 'Why is this location relevant?', opt: 1 }] };
  FM['or-cp'] = {
    title: 'Criminal Proceedings', back: 'Offence',
    fields: [
      { h: 'CRIMINAL PROCEEDINGS' },
      { seg: 'arrest', l: 'Will an arrest be made?', o: YN },
      { seg: 'charges', l: 'Will charges be laid?', o: YN },
      { seg: 'warning', l: 'Will a formal warning be issued?', o: YN, w: (d) => d.arrest === 'No' && d.charges === 'No' },
      { pk: 'sup', l: 'Formal warning approving supervisor', o: 'supervisors', w: (d) => d.warning === 'Yes' },
      { seg: 'servedBy', l: 'Warning to be served by', o: ['Email', 'Post'], w: (d) => d.warning === 'Yes' },
      { note: 'Formal warnings can only be issued on valid offences (where the formal warning flag on the LRT = ‘Y’) and only for offenders over 18 years. The formal warning must be approved by a supervisor who is not the reporting officer.', w: (d) => d.warning === 'Yes' },
    ],
  };
  FM['offence-generic'] = {
    title: 'Incident / Offence', noun: 'offence', top: (d, pw, fc) => offTop(d, pw, fc, { wording: false }),
    fields: [{ h: 'OFFENCE DETAILS' }, { person: 'offenders', l: 'Offender(s)', multi: 1, opt: 1, ph: 'Tap above to select offenders from the paperwork' }, { seg: 'injury', l: 'Physical Injury', o: ['Fatal', 'Serious', 'Minor', 'None'] }, { pk: 'weapon', l: 'Weapons Used', o: 'weapons' }, { h: 'CONTRIBUTING FACTORS' }, { seg: 'alcohol', l: 'Is alcohol a contributing factor in the offence?', o: YNU }, { seg: 'mental', l: 'Is mental health a contributing factor in the offence?', o: YNU }, { h: 'CRIMINAL PROCEEDINGS' }, { sub: 'cp', l: 'Criminal Proceedings', f: 'or-cp' }],
  };
  FM['info-alert'] = {
    title: 'Information Alert', noun: 'alert',
    fields: [{ h: 'ALERT' }, { seg: 'obj', l: 'Alert for', o: ['Person', 'Location', 'Vehicle'] }, { person: 'pid', l: 'Person', w: (d) => d.obj === 'Person' }, { pk: 'alertType', l: 'Alert Type', o: 'alertTypes' }, { a: 'details', l: 'Alert Details', req: 1 }, { note: 'The alert is loaded into NIA following supervisor approval or FMC action.' }],
  };

  /* ============================================================ OFFENCE REPORT */
  FM['or-offence'] = {
    title: 'Offence', back: 'Offence Report', noun: 'offence', top: (d, pw, fc) => offTop(d, pw, fc, { wording: false }),
    fields: [
      { h: 'OFFENCE DETAILS' }, { seg: 'injury', l: 'Physical Injury', o: ['Fatal', 'Serious', 'Minor', 'None'] }, { pk: 'scene', l: 'Scene Type', o: 'sceneTypes' }, { pk: 'weapon', l: 'Weapons Used', o: 'weapons' }, { person: 'offenders', l: 'Offender(s) / Roles', multi: 1, opt: 1, ph: 'Optional – select persons involved in this offence' },
      { h: 'CONTRIBUTING FACTORS' }, { seg: 'alcohol', l: 'Is alcohol a contributing factor in the offence?', o: YNU }, { seg: 'hate', l: 'Is hate a contributing factor in the offence?', o: YNU }, { pk: 'hateType', l: 'Hate Type', o: 'hateTypes', w: (d) => d.hate === 'Yes' }, { seg: 'mental', l: 'Is mental health a contributing factor in the offence?', o: YNU },
      { h: 'CRIMINAL PROCEEDINGS' }, { sub: 'cp', l: 'Criminal Proceedings', f: 'or-cp' },
    ],
  };
  FM['or-fm'] = {
    title: 'File Management',
    fields: [{ h: 'REQUESTED ACTION' }, { pk: 'action', l: 'Requested Action', o: 'requestedAction', search: 1, title: 'Requested Action' }, { a: 'comment', l: 'Comment', req: 1, w: (d) => d.action === 'File Reassignment' }, { pk: 'closure', l: 'File Closure Reason', o: 'closure', w: (d) => d.action === 'For Filing' }, { note: 'This information is for FMC only, it is not passed to NIA. FMC will manually update NIA based on the instructions provided.' }],
  };
  T('OR', {
    name: 'Offence Report', title: 'Offence Report', approval: true, multi: true,
    approvalNote: 'Offence Reports require supervisor approval before they are sent to FMC/NIA. The supervisor must enter a comment when approving or returning an Offence Report.',
    menu: ['noting', 'awhi', 'ws', 'hr', 'similar'],
    niaFilter: (o) => !o.eba, niaCommon: ['1C', '1X', '1Z', '1543', '3100', '3521', '4410'],
    canAddOffence: (pw, code, lib) => { const o = nia(code); if (o.noOR) return o.towing ? `${code} - ${o.desc} must NOT be added to an Offence Report as the towing information cannot yet be captured.` : `${code} - ${o.desc} must NOT be added to an Offence Report as it has a special process in NIA.`; return null; },
    sections: [
      { t: 'card', h: 'CARD EVENT', req: 1 },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Offence Report Occurred On:', req: 1 },
      { t: 'loc', h: 'LOCATION', req: 1 },
      { t: 'persons', h: 'PERSONS', max: 10, f: 'or-person' },
      { t: 'vehicles', h: 'VEHICLES' },
      { t: 'orgs', h: 'ORGANISATIONS' },
      { t: 'offences', h: 'OFFENCES', lib: 'nia', f: 'or-offence', req: 1 },
      { t: 'links', h: 'EXISTING LINKS' },
      { t: 'photos', h: 'PHOTOS', max: 15 },
      { t: 'sub', k: 'fm', h: 'FILE MANAGEMENT', add: '+ Requested Action', f: 'or-fm', req: 1, done: (d) => d.action },
    ],
    next: ['The Offence Report has been sent to your supervisor for approval.', 'Once approved it will go to FMC to action prior to being entered into NIA as an occurrence.', 'FMC checks for duplication and validates people, vehicles and locations.', 'Supervisor comments will be created as NIA review entries on the case.'],
  });

  /* ========================================================= INFRINGEMENT (INF) */
  const offKind = (code) => { const o = lrt(code); return o.aion ? 'aion' : o.covid ? 'covid' : o.ooin ? 'ooin' : o.drug ? 'drug' : 'traffic'; };
  const resOptions = (d) => { const o = lrt(d.code); if (o.drug) return ['Infringement']; if (o.comp) return ['Compliance', 'Written Warning', 'Infringement']; return ['Written Warning', 'Infringement']; };
  FM['inf-offence'] = {
    title: 'Offence', back: 'Back', noun: 'offence',
    init: (d) => { d.r = d.r || { code: d.code }; const o = lrt(d.code); if (o.comp && !d.r.type) d.r.type = 'Compliance'; if (o.drug) d.r.type = 'Infringement'; },
    top: (d, pw, fc) => offTop(d, pw, fc, { fee: true }),
    fields: [
      { h: 'SPEED DETAILS', w: (d) => lrt(d.code).speed },
      { t: 'speed', l: 'Speed Detected (km/h)', kb: 'numeric', req: 1, w: (d) => lrt(d.code).speed },
      { pk: 'device', l: 'Speed Detection Device', o: 'speedDevices', w: (d) => lrt(d.code).speed },
      { h: 'OFFENCE NOTES' },
      { sub: 'notes', l: 'Offence Notes', f: 'inf-drug-notes', w: (d) => lrt(d.code).drug },
      { sub: 'notes', l: 'COVID-19 Notes', f: 'inf-covid-notes', w: (d) => lrt(d.code).covid },
      { sub: 'notes', l: 'Offence Notes', f: 'inf-gen-notes', opt: 1, w: (d) => !lrt(d.code).drug && !lrt(d.code).covid },
      { h: 'RESOLUTION' },
      { sub: 'r', l: 'Resolution', f: 'inf-res', sum: (d) => d.type },
    ],
  };
  FM['inf-res'] = {
    title: 'Resolution', back: 'Offence',
    fields: [{ h: 'RESOLUTION' }, { seg: 'type', l: 'Resolution Type', o: resOptions }, { p: 'Compliance: Compliance offered valid for 28 days.', cls: 'grey small', w: (d) => d.type === 'Compliance' }, { h: 'CRASH RELATED' }, { seg: 'crash', l: 'Is Offence crash related?', o: YN }, { seg: 'approved', l: 'Approved by Supervisor?', o: YN, w: (d) => d.type === 'Written Warning' }],
  };
  FM['inf-drug-notes'] = {
    title: 'Offence Notes', back: 'Offence', notes: true,
    status: (d) => ((d.listed || d.unlisted) && d.admits ? 'done' : d.listed || d.unlisted || d.admits ? 'partial' : 'none'),
    fields: [
      { h: 'LISTED DRUG' }, { pk: 'listed', l: 'Listed Drug', o: 'listedDrugs', opt: 1 },
      { info: (d) => ({ 'Cannabis (THC)': '3', Cocaine: '5', Methamphetamine: '10', MDMA: '10', Amphetamine: '10' }[d.listed] || '5'), l: 'Drug Tolerance (ng/mL)', w: (d) => d.listed },
      { info: (d) => ({ 'Cannabis (THC)': '5', Cocaine: '20', Methamphetamine: '20', MDMA: '20', Amphetamine: '20' }[d.listed] || '20'), l: 'High Risk Level (ng/mL)', w: (d) => d.listed },
      { h: 'UNLISTED DRUG' }, { pk: 'unlisted', l: 'Unlisted Drug', o: 'unlistedDrugs', opt: 1 },
      { note: 'If selecting from multiple drug results use listed drugs first, followed by the highest listed results (or any unlisted) drugs. Up to 2 drugs can be added to the offence.' },
      { h: 'A8XX - OFFENCE NOTES' }, { seg: 'admits', l: 'Admits Offence', o: YN },
    ],
  };
  FM['inf-covid-notes'] = { title: 'COVID-19 Notes', back: 'Offence', notes: true, fields: [{ h: 'OFFENDER COMMENTS' }, { a: 'comments', l: 'Offender Comments', req: 1 }, { h: 'EXPLANATION GIVEN' }, { a: 'explanation', l: 'Explanation Given', req: 1 }] };
  FM['inf-gen-notes'] = { title: 'Offence Notes', back: 'Offence', notes: true, fields: [{ h: 'OFFENCE NOTES' }, { a: 'notes', l: 'Offence Notes', ph: 'Notes that apply to this offence only' }, { a: 'comments', l: 'Offender Comments', opt: 1 }] };
  FM['inf-traffic-notes'] = {
    title: 'Traffic Notes', notes: true,
    init: (d) => { const v = OD.db.settings.vehicles.find((x) => x.id === OD.db.settings.defaultVehicle); if (!d.vehReg && v) { d.vehReg = v.rego; d.vehType = v.type; } },
    fields: [
      { h: 'BASIC NOTES' }, { nsew: 'dir', l: 'Offender first seen' }, { t: 'on', l: 'on', lo: 'l:nearStreets', upper: 1, req: 1 }, { t: 'between', l: 'between', lo: 'l:nearStreets', upper: 1 }, { t: 'and', l: 'and', lo: 'l:nearStreets', upper: 1 },
      { h: 'CONDITIONS' }, { pk: 'conditions', l: 'Conditions', o: 'infNoteConditions', multi: 1, opt: 1 }, { seg: 'traffic', l: 'Traffic', o: ['Light', 'Medium', 'Heavy'] }, { seg: 'visibility', l: 'Visibility', o: ['Fog', 'Clear'] },
      { h: 'POLICE VEHICLE DETAILS' }, { t: 'vehReg', l: 'Vehicle Registration', upper: 1 }, { seg: 'vehType', l: 'Vehicle', o: ['Marked', 'Unmarked'] },
      { h: 'OFFENDER COMMENTS' }, { a: 'comments', l: 'Offender Comments', opt: 1 },
    ],
  };
  FM['inf-alcohol-notes'] = {
    title: 'Alcohol Notes', notes: true,
    fields: [
      { h: 'ALCOHOL DETAILS' }, { pk: 'from', l: 'Alcohol obtained from', o: 'alcoholFrom' }, { seg: 'trade', l: 'Alcohol in a trade labelled container', o: YN }, { seg: 'admitted', l: 'Admitted substance was alcohol', o: YN }, { seg: 'seized', l: 'Alcohol seized for evidential purposes', o: YN }, { seg: 'disposed', l: 'Alcohol disposed of', o: YN }, { seg: 'intox', l: 'Intoxication assessment', o: 'intoxication' }, { link: 'View SCAB Assessment' },
      { h: 'OFFICER NOTES' }, { a: 'summary', l: 'Summary of offence', req: 1 }, { a: 'explanation', l: 'Explanation given', req: 1 },
    ],
  };
  FM['inf-ooin-notes'] = {
    title: 'Overloading Notes', notes: true,
    init: (d) => { const v = OD.db.settings.vehicles.find((x) => x.id === OD.db.settings.defaultVehicle); d.vehReg = d.vehReg || v?.rego; d.weighDevice = d.weighDevice || 'Portable scales (demo)'; },
    fields: [{ h: 'POLICE VEHICLE DETAILS' }, { t: 'vehReg', l: 'Vehicle Registration' }, { t: 'weighDevice', l: 'Weighing Device' }, { h: 'WEIGHT' }, { t: 'measured', l: 'Measured weight (kg)', kb: 'numeric', req: 1 }, { t: 'permitted', l: 'Permitted weight (kg)', kb: 'numeric', req: 1 }, { note: 'The Overloading notes are completed for you with your Police vehicle details.' }],
  };
  FM['inf-recipient'] = {
    title: 'Recipient', noun: 'recipient', top: personTop,
    init: (d) => { const p = person(d); if (p && !d.postal) d.postal = p.addr; },
    fields: [{ h: 'RECIPIENT DETAILS' }, { t: 'postal', l: 'Postal Address', req: 1 }, { t: 'dl', l: 'Driver Licence Number', cam: 'dl' }, { seg: 'licProduced', l: 'Licence produced?', o: YN }, { t: 'phone', l: 'Phone Number', kb: 'tel', opt: 1 }, { t: 'email', l: 'Email', opt: 1 }],
  };
  const infNotesNeeded = (pw) => {
    const kinds = pw.off.map((o) => ({ k: offKind(o.code), res: o.r && o.r.type }));
    const out = [];
    if (kinds.some((x) => x.k === 'traffic' && x.res)) out.push(['traffic', 'Traffic Notes', 'inf-traffic-notes']);
    if (kinds.some((x) => x.k === 'aion')) out.push(['alcohol', 'Alcohol Notes', 'inf-alcohol-notes']);
    if (kinds.some((x) => x.k === 'ooin')) out.push(['ooin', 'Overloading Notes', 'inf-ooin-notes']);
    return out;
  };
  const infNumbers = (pw) => {
    const g = (p) => p + String(Math.floor(1000000 + Math.random() * 8999999));
    const nums = []; const offs = pw.off.map((o) => ({ k: offKind(o.code), res: o.r && o.r.type }));
    const traffic = offs.filter((x) => x.k === 'traffic' || x.k === 'drug');
    if (traffic.some((x) => x.res !== 'Written Warning')) nums.push(g('A'));
    traffic.filter((x) => x.res === 'Written Warning').forEach(() => nums.push(g('W')));
    const aion = offs.filter((x) => x.k === 'aion');
    if (aion.some((x) => x.res !== 'Written Warning')) nums.push(g('L'));
    aion.filter((x) => x.res === 'Written Warning').forEach(() => nums.push(g('W')));
    offs.filter((x) => x.k === 'covid').forEach(() => nums.push(g('C')));
    if (offs.some((x) => x.k === 'ooin')) nums.push(g('O'));
    return nums;
  };
  OD.action('infReveal', (d, el, ctx) => {
    const pw = OD.db.paperwork[ctx.p.id];
    const errs = OD.pwErrors(pw).filter((e) => !(e.sec && e.sec.t === 'notice') && !/notice number/i.test(e.msg) && !/notes/i.test(e.msg));
    if (errs.length) { pw.reviewed = true; OD.save(); OD.nav.refresh(); return OD.ui.alert({ title: 'Cannot reveal yet', msg: 'Complete the following before revealing the notice number(s):\n\n' + errs.map((e) => '• ' + e.msg).join('\n') }); }
    OD.ui.confirm('Reveal Notice Number(s)', 'Once you reveal the notice number you cannot change the contents of the INF and can only complete the offence notes.\n\nIf you make a mistake you will need to cancel the INF in OnDuty and reissue it.', 'Reveal', () => {
      pw.notice = { revealed: true, numbers: infNumbers(pw), ts: Date.now() }; pw.locked = 'notes'; OD.save(); OD.nav.refresh();
      OD.ui.toast(`${pw.notice.numbers.length} notice number${pw.notice.numbers.length > 1 ? 's' : ''} revealed`);
    });
  });
  T('INF', {
    name: 'Infringement Notice Form', title: 'Infringement Notice',
    menu: ['noting', 'awhi', 'ws', 'similar'],
    canAddOffence: (pw, code) => {
      const k = offKind(code); const ks = pw.off.map((o) => offKind(o.code));
      if (pw.off.some((o) => o.code === code)) return 'This offence has already been added.';
      if ((k === 'traffic' || k === 'drug') && ks.filter((x) => x === 'traffic' || x === 'drug').length >= 6) return 'You can add up to 6 traffic offences to the Infringement Form.';
      if (k === 'aion' && ks.filter((x) => x === 'aion').length >= 3) return 'You can add up to 3 AIONs to the same Infringement Form.';
      if (k === 'drug' && ks.includes('drug')) return 'An Infringement paperwork can have only one Drug Driving offence.';
      if (k === 'covid' && ks.includes('covid')) return 'You can issue one COVID-19 offence per notice.';
      return null;
    },
    sections: [
      { t: 'card', h: 'CARD EVENT' },
      { t: 'occ', h: 'NOTICE DETAILS', l: 'Infringement Occurred On:', title: 'Notice Details', req: 1 },
      { t: 'loc', h: 'LOCATION', req: 1 },
      { t: 'persons', k: 'recipient', h: 'RECIPIENT', add: '+ Recipient', max: 1, f: 'inf-recipient', req: 1 },
      { t: 'vehicles', h: 'VEHICLES', max: 1 },
      { t: 'offences', h: 'OFFENCES', lib: 'lrt', f: 'inf-offence', req: 1 },
      {
        t: 'custom', h: 'NOTES',
        render: (pw) => { const n = infNotesNeeded(pw); if (!n.length) return '<div class="row center" style="color:#999;font-size:13.5px">Infringement Notes not yet required</div>'; return n.map(([k, l, f]) => { const st = OD.formStatus(f, pw.d[k], pw); return `<div class="row" data-go="${OD.go('form', { t: `pw:${pw.id}:d.${k}`, f })}">${U.circ(st)}<div class="grow">${l}</div><span class="chev">${I.chev}</span></div>`; }).join(''); },
        status: (pw) => { const n = infNotesNeeded(pw); const segs = n.map(([k, , f]) => OD.formStatus(f, pw.d[k], pw) === 'done'); return { st: !segs.length ? 'none' : segs.every(Boolean) ? 'done' : 'partial', segs }; },
        req: (pw) => infNotesNeeded(pw).length > 0,
      },
      { t: 'notice', h: 'NOTICE NUMBER(S)', req: 1 },
      { t: 'photos', h: 'PHOTOS', max: 15, foot: 'REMINDER: You should only take a photo of the driver if their identification is in question.' },
    ],
    validate: (pw) => {
      const out = [];
      const traffic = pw.off.filter((o) => ['traffic', 'drug'].includes(offKind(o.code)));
      if (traffic.some((o) => o.r?.type === 'Written Warning') && traffic.length > 1) out.push('A Written Traffic Warning can only contain 1 traffic offence');
      return out;
    },
    next: (pw) => [`${pw.notice.numbers?.length || 1} notice(s) will be issued to the recipient – OnDuty works out how many notices to issue behind the scenes.`, pw.off.some((o) => lrt(o.code).covid) ? 'NZ Post will print the COVID-19 Infringement Notice, the officer copy is stored in SMART Reports.' : 'The officer copy is stored in SMART Reports.', 'Proof of compliance (if offered) is sent in by the recipient using the notice number in the reference line.'],
  });

  /* ================================================================== NOTING */
  T('N', {
    name: 'Noting', title: 'Noting', occNow: true, multi: true, menu: ['similar'],
    sections: [
      { t: 'occ', h: 'NOTING DETAILS', l: '', title: 'Noting Details', noStation: true, fields: [{ pk: 'type', l: 'Noting Type', o: 'notingTypes', search: 1 }, { pk: 'channel', l: 'Reporting Channel', o: 'channels' }, { h: 'NOTING RELIABILITY' }, { pk: 'srcRel', l: 'Source Reliability', o: 'sourceRel' }, { pk: 'infoRel', l: 'Information Reliability', o: 'infoRel' }, { h: 'ADDITIONAL DETAILS' }, { t: 'subject', l: 'Subject', ph: 'e.g. BOP Gangs' }, { t: 'desc', l: 'Description', ph: 'e.g. Chapter / group name' }, { t: 'ref', l: 'Reference', ph: 'e.g. the event number' }], req: 1 },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', f: 'narrative', req: 1 },
      { t: 'loc', h: 'LOCATION' },
      { t: 'list', k: 'addLocs', h: 'ADDITIONAL LOCATIONS', add: '+ Additional Location', f: 'add-loc', title: (e) => e.addr || 'Additional Location', circle: false },
      { t: 'persons', h: 'PERSONS', f: 'n-person' },
      { t: 'vehicles', h: 'VEHICLES', f: 'n-vehicle' },
      { t: 'orgs', h: 'ORGANISATIONS' },
      { t: 'links', h: 'EXISTING LINKS' },
      { t: 'photos', h: 'PHOTOS', max: 15 },
    ],
    submitStatus: 'Completed',
    onSubmit: (pw) => { const hasNew = OD.pwPersonIds(pw).some((id) => OD.person(id)?.isNew); if (hasNew) pw.status = 'Sent to FMC'; },
    next: (pw) => ['Supervisor approval is not required prior to submitting a noting to NIA.', pw.status === 'Sent to FMC' ? 'There are new objects – the noting has been sent to FMC to re-query or to assist with validation before being entered into NIA.' : 'The noting has been submitted directly into NIA as the information already exists.', 'Intelligence staff can view notings that are in flight or recently submitted in OnDuty Office.'],
  });

  /* ============================================================ FAMILY HARM */
  const rank = (c) => ({ Low: 1, Moderate: 2, High: 3 }[c] || 0);
  const DAQ = [
    'Is anything currently causing {n} a lot of stress?',
    'Is {n} deliberately harming anyone in the family?',
    'Is {n} deliberately harming anyone vulnerable in the family?',
    'Has {n} ever strangled, choked or suffocated you?',
    'Has {n} threatened to kill you or anyone else?',
    'Is {n} obsessively jealous or controlling?',
    'Has the violence become worse or more frequent recently?',
    'Does {n} have access to firearms or weapons?',
    'Have you recently separated or tried to separate?',
    'Are you afraid of what {n} might do?',
  ];
  const concernOf = (d) => {
    if (d.cannot) return 'Moderate';
    const ans = DAQ.map((_, i) => d['q' + i]);
    if (ans.some((a) => !a)) return ans.some(Boolean) ? 'None' : 'None';
    const yes = ans.filter((a) => a === 'Yes').length;
    return yes >= 6 ? 'High' : yes >= 3 ? 'Moderate' : 'Low';
  };
  OD.concernOf = concernOf;
  const ppName = (d) => d.pref || (person({ pid: d.ppr })?.gn.split(' ')[0] || 'the person').replace(/^\w+/, (w) => w[0] + w.slice(1).toLowerCase());
  FM['fh-da'] = {
    title: (d) => `<div class="navseg" data-k="view"><button data-seg="Officer View" class="${d.view !== 'Guided View' ? 'on' : ''}">Officer View</button><button data-seg="Guided View" class="${d.view === 'Guided View' ? 'on' : ''}">Guided View</button></div>`,
    back: 'Back', noun: 'dynamic assessment',
    status: (d, pw) => { const c = concernOf(d); if (c === 'None') return Object.keys(d).some((k) => /^q\d/.test(k)) || d.par ? 'partial' : 'none'; return d.par && d.ppr && OD.formStatus('fh-sp', d.sp, pw) === 'done' ? 'done' : 'partial'; },
    onChange: (k, v, d) => { d.sp = d.sp || {}; d.sp.concern = concernOf(d); d.sp.ppr = d.ppr; d.sp.par = d.par; if (d.par && !d.sp.primary) d.sp.primary = d.par; },
    fields: [
      { p: 'Complete the Dynamic Assessment questions with the Person at Risk. The ‘Guided View’ allows the Person at Risk to answer the questions directly on this device.', cls: 'small grey', w: (d) => d.view !== 'Guided View' },
      { p: 'Please read each question and tap Yes or No. You can hand the device back to the officer at any time.', w: (d) => d.view === 'Guided View' },
      { h: 'TOTAL CONCERN FOR SAFETY' }, { concern: (d) => concernOf(d) },
      { h: 'PERSONS INVOLVED', w: (d) => d.view !== 'Guided View' }, { person: 'par', l: 'Person at Risk', safvr: 1, w: (d) => d.view !== 'Guided View' }, { person: 'ppr', l: 'Person Posing Risk', safvr: 1, w: (d) => d.view !== 'Guided View' },
      { h: 'DYNAMIC ASSESSMENT DETAILS', w: (d) => d.view !== 'Guided View' },
      { t: 'pref', l: 'Preferred name for Person Posing Risk to display in risk questions', rr: 1, w: (d) => d.view !== 'Guided View' },
      { info: (d) => { const p = person({ pid: d.ppr }); return p ? `${OD.fullName(p)}\n${p.safvr || 'Not available'}` : 'Select the Person Posing Risk'; }, l: 'Static Assessment of Family Violence Recidivism', w: (d) => d.view !== 'Guided View' },
      { seg: 'intimate', l: 'Are the Person Posing Risk and Person at Risk intimate partners? (Formerly or currently intimate)', o: YN, w: (d) => d.view !== 'Guided View' },
      { btn: (d) => (d.cannot ? 'Questions cannot be answered ✓' : 'Questions cannot be answered'), act: 'daCannot', cls: 'outline thin', w: (d) => d.view !== 'Guided View' },
      { note: 'Use ‘Questions cannot be answered’ if the Person at Risk cannot or refuses to answer all of the Dynamic Assessment questions.', w: (d) => d.view !== 'Guided View' },
      { h: 'DYNAMIC ASSESSMENT QUESTIONS' },
      ...DAQ.map((q, i) => ({ seg: 'q' + i, l: (d) => `${q.replace(/\{n\}/g, ppName(d))} <span class="i" style="float:right;color:var(--tint)">ⓘ</span>`, o: YN, opt: (d) => !!d.cannot })),
      { h: 'SAFETY PLAN', w: (d) => concernOf(d) !== 'None' && d.view !== 'Guided View' },
      { sub: 'sp', l: 'Safety Plan', f: 'fh-sp', w: (d) => concernOf(d) !== 'None' && d.view !== 'Guided View' },
    ],
  };
  OD.action('daCannot', (d, el, ctx) => { const t = OD.target(ctx); t.cannot = !t.cannot; FM['fh-da'].onChange('cannot', t.cannot, t); OD.save(); OD.nav.refresh(ctx.u); });
  FM['fh-sp'] = {
    title: 'Safety Plan', back: 'Back',
    fields: [
      { h: 'TOTAL CONCERN FOR SAFETY' }, { concern: (d) => d.concern || 'None' },
      { p: 'Previous Total Concern for Safety scores\n19/02/2020 - <span style="color:var(--orange)">Moderate</span>\n06/08/2018 - <span style="color:var(--ios-red)">High</span>', cls: 'small' },
      { h: 'PERSON POSING RISK' }, { html: (d) => (d.ppr ? OD.personCard(OD.person(d.ppr), { nameTop: true }) : '<div class="para grey small">Select the Person Posing Risk in the Dynamic Assessment</div>') },
      { h: 'SELECT PERSONS TO PROTECT' }, { person: 'primary', l: 'Primary Contact', safvr: 1 }, { p: 'Inform the primary contact that information collected through the process of the investigation will be shared with partner agencies to enable joint safety planning.', cls: 'grey small' }, { person: 'others', l: 'Additional Persons to Protect', multi: 1, opt: 1, safvr: 1 },
      { p: (d) => `The Total Concern for Safety of the persons in this Safety Plan is <b>${esc(d.concern || '—').toUpperCase()}</b>. Complete the following to ensure their safety.`, cls: 'small' },
      { h: '<span class="risk-dot Low"></span>LOW RISK QUESTIONS' },
      { seg: 'l1', l: 'Police can share information about you and your circumstances to help you with safety and appropriate supports. Agencies can include, but are not limited to: Ara Poutama (Corrections), health providers, Oranga Tamariki, ACC and family violence specialists. Have you explained the above?', o: YN },
      { seg: 'l2', l: 'Do you have any concerns about your information being shared within a multi-agency family violence meeting?', o: YN }, { a: 'l2c', l: 'If yes, please explain the concerns', w: (d) => d.l2 === 'Yes', req: 1 },
      { h: '<span class="risk-dot Medium"></span>MEDIUM RISK QUESTIONS' },
      { seg: 'm1', l: 'Has a referral to a specialist family violence service been offered?', o: YN, opt: (d) => rank(d.concern) < 2 },
      { seg: 'm2', l: 'Has a safety check / follow up visit been arranged?', o: YN, opt: (d) => rank(d.concern) < 2 },
      { h: '<span class="risk-dot High"></span>HIGH RISK QUESTIONS' },
      { seg: 'h1', l: 'Is a Police Safety Order (PSO) being issued?', o: YN, opt: (d) => rank(d.concern) < 3 },
      { seg: 'h2', l: 'Has the Person at Risk been offered emergency accommodation?', o: YN, opt: (d) => rank(d.concern) < 3 },
      { seg: 'h3', l: 'Has the Person Posing Risk been arrested or removed from the address?', o: YN, opt: (d) => rank(d.concern) < 3 },
    ],
  };
  FM['fh-person'] = {
    title: 'Person Details', noun: 'person', top: personTop, init: FM['pw-person'].init,
    fields: [{ h: 'ROLE' }, { pk: 'role', l: 'Role', o: 'fhRoles' }, { pk: 'rel', l: 'Relationship to Person Posing Risk', o: 'relationships', opt: 1 }, { h: 'RISK MEASURES' }, { info: (d) => person(d)?.safvr || 'Not available', l: 'Static Assessment of Family Violence Recidivism (SAFVR)' }, { info: (d) => person(d)?.vhs || 'Not available', l: 'Victimisation History Score (VHS)' }, { h: 'CONTACT DETAILS' }, { t: 'phone', l: 'Phone Number', kb: 'tel' }, { t: 'addr', l: 'Address', opt: 1 }, { h: 'DESCRIPTION' }, { a: 'clothing', l: 'Clothing', opt: 1 }, { sub: 'marks', l: 'Body Marks', f: 'body-marks', opt: 1 }],
  };
  FM['fh-narr'] = { title: (d) => d.kind || 'Narrative', noun: 'narrative section', fields: [{ a: 'text', l: (d) => d.kind || 'Narrative', req: 1, tall: 1, max: 15000 }] };
  FM['fh-pso'] = {
    title: 'PSO Information',
    fields: [
      { h: 'PSO INFORMATION' }, { p: 'Will PSO information be captured through OnDuty or by other means (e.g. CRL)?\n\nOnly call CRL if captured by other means. CRL number 0800 000 000 (demo).', cls: 'small' }, { seg: 'how', o: ['OnDuty', 'Other means'] },
      { pk: 'action', l: 'PSO Action', o: 'psoActions', w: (d) => d.how === 'OnDuty' },
      { h: 'ROLES', w: (d) => d.how === 'OnDuty' }, { person: 'bound', l: 'Person Bound by Order', w: (d) => d.how === 'OnDuty' }, { person: 'atRisk', l: 'Person at Risk', w: (d) => d.how === 'OnDuty' },
      { h: 'PSO DETAILS', w: (d) => d.how === 'OnDuty' }, { dt: 'issued', l: 'Date/Time Issued', w: (d) => d.how === 'OnDuty' }, { pk: 'duration', l: 'Duration', o: ['1 day', '2 days', '3 days', '4 days', '5 days', '10 days'], w: (d) => d.how === 'OnDuty' }, { a: 'explanation', l: 'Explanation', req: 1, w: (d) => d.how === 'OnDuty' },
    ],
  };
  const txt = (title, label) => ({ title, fields: [{ h: title.toUpperCase() }, { a: 'text', l: label || title, req: 1, tall: 1 }] });
  FM['cpr-incident'] = txt('Alleged Incident', 'Describe the alleged incident');
  FM['cpr-prev'] = txt('Prevention', 'What actions have been taken to prevent further harm?');
  FM['cpr-hist'] = txt('Police History', 'Relevant Police history');
  FM['cpr-staff'] = { title: 'Reporting Staff Member', init: (d) => { d.qid = d.qid || `${OD.db.me.qid} - ${OD.db.me.name}`; }, fields: [{ h: 'REPORTING STAFF MEMBER' }, { pk: 'qid', l: 'Staff Member', o: 'x:officerQids' }, { t: 'phone', l: 'Contact phone', kb: 'tel', req: 1 }] };
  FM['fh-cpr'] = { title: 'Child Protection Referral', fields: [{ h: 'PERSONS INVOLVED' }, { person: 'children', l: 'Children at Risk', multi: 1 }, { h: 'REFERRAL' }, { sub: 'incident', l: 'Alleged Incident', f: 'cpr-incident' }, { sub: 'prevention', l: 'Prevention', f: 'cpr-prev' }, { sub: 'history', l: 'Police History', f: 'cpr-hist' }, { sub: 'staff', l: 'Reporting Staff Member', f: 'cpr-staff' }] };
  T('FH', {
    name: 'Family Harm Investigation', title: 'Family Harm', approval: true, multi: true,
    approvalNote: 'A submitted FH must be approved by a Supervisor using OnDuty or OnDuty Office. Supervisors who create an FH can approve it themselves by selecting themselves as the approving supervisor.',
    menu: ['awhi', 'hr', 'ws', 'similar'], niaCommon: ['5F', '1543', '3871', '7P', '3100', '1833'],
    init: (pw) => { pw.val.sup = OD.db.settings.supervisor; pw.l.narr = [{ id: OD.uid('li'), kind: 'Circumstances' }]; },
    sections: [
      { t: 'card', h: 'CARD EVENT', req: 1 },
      { t: 'occ', h: 'OCCURRENCE DETAILS', add: '+ Occurrence Details', l: 'Family Harm Occurred On:', fields: [{ pk: 'channel', l: 'Reporting Channel', o: 'channels' }], req: 1 },
      { t: 'value', k: 'sup', h: 'EVENT SUPERVISOR', l: 'Event Supervisor', o: 'x:supervisors', note: 'The Event Supervisor is responsible for reviewing the Family Harm Investigation as it is completed.', req: 1 },
      { t: 'loc', h: 'LOCATION', pinStyle: true, req: 1 },
      { t: 'persons', h: 'PERSONS', f: 'fh-person', safvr: true, req: 1 },
      { t: 'list', k: 'da', h: 'SAFETY PLANNING', add: '+ Dynamic Assessment', f: 'fh-da', req: 1, title: (e) => { const c = concernOf(e); const p = OD.person(e.par); return `Dynamic Assessment${p ? ' – ' + OD.shortName(p) : ''}`; }, sum: (e) => `Total Concern for Safety: ${concernOf(e) === 'None' ? 'Not yet assessed' : concernOf(e)}` },
      { t: 'list', k: 'narr', h: 'NARRATIVE', add: '+ Narrative Section', f: 'fh-narr', choices: ['Mutual Participants', 'Primary Victims / Victims', 'Predominant Aggressor / Offender', 'Children', 'Scene / Evidence / Exhibits / Witnesses', 'Risks and Opportunities'], choiceTitle: 'Add narrative section', title: (e) => e.kind, circle: false, foot: 'Only complete the ‘Circumstances’ section for less complex matters.' },
      { t: 'vehicles', h: 'VEHICLES' },
      { t: 'links', h: 'LINKS' },
      { t: 'offences', h: 'OFFENCES/INCIDENTS', add: '+ Incident/Offence', lib: 'nia', f: 'offence-generic' },
      { t: 'sub', k: 'cpr', h: 'CHILD PROTECTION', add: '+ Child Protection Referral', f: 'fh-cpr', w: (pw) => OD.pwPersonIds(pw).some((id) => F.age(OD.person(id)?.dob) < 17) },
      { t: 'sub', k: 'pso', h: 'POLICE SAFETY ORDER', add: '+ PSO Information', f: 'fh-pso', w: (pw) => (pw.l.da || []).some((e) => e.sp && e.sp.h1 === 'Yes'), req: 1 },
      { t: 'list', k: 'alerts', h: 'INFORMATION ALERT', add: '+ Information Alert', f: 'info-alert', title: (e) => e.alertType || 'Information Alert' },
      { t: 'photos', h: 'PHOTOS', max: 15 },
    ],
    next: ['The FH has been sent to your supervisor for approval (OnDuty or OnDuty Office). Supervisors can take ownership and edit the paperwork as needed.', 'Once approved, any referrals to Oranga Tamariki are sent automatically and cc’d to the Child Protection Team.', 'New objects are sent to FMC to re-query or assist with validation errors.', 'The Family Harm Investigation will be entered into NIA as an occurrence.'],
  });

  /* ========================================================= TRAFFIC CRASH */
  const pickPerson = (k, l, extra = {}) => ({ person: k, l, src: 'any', ...extra });
  FM['tcr-loc'] = {
    title: 'Location', noun: 'location',
    extra: (d, pw, p) => `<button class="fullbtn" data-go="${OD.go('sel-loc', { id: pw.id, k: 'loc' })}">Select Location</button>`,
    status: (d) => (d.addr && d.coords && d.scene ? 'done' : d.addr || d.coords || d.scene ? 'partial' : 'none'),
    fields: [
      { h: 'LOCATION' },
      { html: (d, pw) => `<div class="field pick" data-go="${OD.go('crash-map', { id: pw.id })}"><span class="lbl">Coordinates</span><div class="pv ${d.coords ? '' : 'ph'}">${d.coords ? esc(d.coords.text) : 'Unselected'}</div></div>` },
      { info: (d) => d.addr || 'Location not yet selected', l: 'Location Detail' },
      { pk: 'scene', l: 'Scene Station', o: 'stations' },
      { h: 'SIDE ROAD / FEATURE' }, { sub: 'side', l: 'Side Road / Feature', f: 'tcr-side', opt: 1 },
    ],
  };
  FM['tcr-side'] = { title: 'Side Road / Feature', fields: [{ h: 'SIDE ROAD / FEATURE' }, { t: 'road', l: 'Side road', lo: 'l:nearStreets', upper: 1 }, { t: 'dist', l: 'Distance from side road (m)', kb: 'numeric' }, { nsew: 'dir', l: 'Direction from side road' }, { t: 'feature', l: 'Landmark / feature', opt: 1 }] };
  FM['tcr-cond'] = { title: 'Road Conditions', back: 'TCR', fields: [{ gap: 1 }, { sub: 'speed', l: 'Speed Limits', f: 'tcr-speed' }, { sub: 'road', l: 'Road Information', f: 'tcr-road' }, { sub: 'weather', l: 'Weather Conditions and Lighting', f: 'tcr-weather' }, { sub: 'mark', l: 'Road Markings and Barriers', f: 'tcr-mark' }] };
  FM['tcr-speed'] = { title: 'Speed Limits', fields: [{ h: 'SPEED LIMITS' }, { pk: 'posted', l: 'Posted Speed Limit (km/h)', o: 'speeds' }, { seg: 'temp', l: 'Temporary speed limit in place?', o: YN }, { pk: 'tempLimit', l: 'Temporary Speed Limit (km/h)', o: 'speeds', w: (d) => d.temp === 'Yes' }, { pk: 'advisory', l: 'Advisory speed (km/h)', o: 'speeds', opt: 1 }] };
  FM['tcr-road'] = { title: 'Road Information', fields: [{ h: 'ROAD INFORMATION' }, { pk: 'surface', l: 'Road Surface', o: 'roadSurface' }, { pk: 'curve', l: 'Road Curvature', o: 'roadCurve' }, { seg: 'grad', l: 'Gradient', o: ['Flat', 'Uphill', 'Downhill'] }, { seg: 'lanes', l: 'Number of lanes', o: ['1', '2', '3', '4+'] }, { seg: 'junction', l: 'At an intersection?', o: YN }] };
  FM['tcr-weather'] = { title: 'Weather Conditions and Lighting', fields: [{ h: 'WEATHER' }, { pk: 'weather', l: 'Weather', o: 'weather' }, { h: 'LIGHTING' }, { pk: 'light', l: 'Natural Light', o: 'lighting' }, { seg: 'street', l: 'Street lights', o: ['On', 'Off', 'None'] }] };
  FM['tcr-mark'] = { title: 'Road Markings and Barriers', fields: [{ h: 'ROAD MARKINGS' }, { pk: 'markings', l: 'Road Markings', o: 'markings', multi: 1 }, { h: 'BARRIERS' }, { seg: 'barrier', l: 'Was a barrier struck?', o: YN }] };
  FM['tcr-narr'] = { title: 'Narrative', fields: [{ h: 'OFFICER NOTES' }, { a: 'what', l: 'What happened and objects hit', req: 1, tall: 1 }, { a: 'why', l: 'Why the crash happened', req: 1, tall: 1 }] };
  const partSubs = (who, extra = []) => [
    { sub: 'pd', l: 'Personal Details', f: 'tcr-pd' },
    { sub: 'cm', l: `${who} Comments`, f: 'tcr-cm' },
    { sub: 'inj', l: 'Injury Details', f: 'tcr-inj' },
    { sub: 'seat', l: 'Seating and Safety', f: 'tcr-seat' },
    ...extra,
  ];
  FM['tcr-pd'] = { title: 'Personal Details', fields: [{ h: 'PERSONAL DETAILS' }, { t: 'phone', l: 'Phone Number', kb: 'tel' }, { t: 'dl', l: 'Driver Licence Number', cam: 'dl', opt: 1 }, { seg: 'licType', l: 'Licence Type', o: ['Full', 'Restricted', 'Learner', 'None', 'Overseas'] }, { t: 'occupation', l: 'Occupation', opt: 1 }] };
  FM['tcr-cm'] = { title: 'Comments', fields: [{ h: 'COMMENTS' }, { a: 'comments', l: 'Comments made (record what was said)', req: 1, tall: 1 }] };
  FM['tcr-inj'] = { title: 'Injury Details', fields: [{ h: 'INJURY' }, { seg: 'injury', l: 'Injury severity', o: L.injury }, { seg: 'hospital', l: 'Taken to hospital?', o: YN, w: (d) => d.injury && d.injury !== 'None' }, { a: 'desc', l: 'Injury description', w: (d) => d.injury && d.injury !== 'None', opt: 1 }] };
  FM['tcr-seat'] = { title: 'Seating and Safety', fields: [{ h: 'SEATING' }, { pk: 'seat', l: 'Seating position', o: 'seats' }, { h: 'SAFETY EQUIPMENT' }, { pk: 'safety', l: 'Safety equipment', o: 'safety' }, { seg: 'airbag', l: 'Airbag deployed?', o: ['Yes', 'No', 'N/A'] }] };
  FM['tcr-impair'] = { title: 'Impairment', fields: [{ h: 'IMPAIRMENT' }, { pk: 'impair', l: 'Suspected impairment', o: 'impair' }, { seg: 'breath', l: 'Breath test conducted?', o: YN }, { t: 'result', l: 'Result (mcg)', kb: 'numeric', w: (d) => d.breath === 'Yes', req: 1 }] };
  FM['tcr-journey'] = { title: 'Journey and Fatigue', fields: [{ h: 'JOURNEY' }, { t: 'from', l: 'Journey from', req: 1 }, { t: 'to', l: 'Journey to', req: 1 }, { tm: 'start', l: 'Journey start time' }, { h: 'FATIGUE' }, { seg: 'fatigue', l: 'Was fatigue a factor?', o: YNU }] };
  FM['tcr-driver'] = { title: 'Driver', top: personTop, fields: [{ h: 'DRIVER DETAILS' }, ...partSubs('Driver', [{ sub: 'imp', l: 'Impairment', f: 'tcr-impair' }, { sub: 'jf', l: 'Journey and Fatigue', f: 'tcr-journey' }])] };
  FM['tcr-passenger'] = { title: 'Passenger', noun: 'passenger', fields: [pickPerson('pid', 'Passenger'), { h: 'PASSENGER DETAILS', w: (d) => d.pid }, ...partSubs('Passenger').map((s) => ({ ...s, w: (d) => d.pid }))] };
  FM['tcr-veh-details'] = { title: 'Vehicle Details', fields: [{ h: 'VEHICLE DETAILS' }, { pk: 'type', l: 'Vehicle Type', o: 'vehTypes' }, { t: 'direction', l: 'Direction of travel', opt: 1 }, { t: 'movement', l: 'Vehicle movement', ph: 'e.g. Turning right', opt: 1 }, { seg: 'towed', l: 'Towed from scene?', o: YN }, { seg: 'left', l: 'Vehicle left the scene?', o: YN }] };
  FM['tcr-damage'] = {
    title: 'Damage Severity and Location',
    status: (d) => (d.severity && (d.severity === 'None' || (d.zones || []).length) ? 'done' : d.severity || (d.zones || []).length ? 'partial' : 'none'),
    fields: [{ h: 'DAMAGE SEVERITY' }, { seg: 'severity', l: 'Damage Severity', o: ['None', 'Minor', 'Moderate', 'Severe'] }, { h: 'DAMAGE LOCATION' }, { html: (d, pw, fc) => `<div class="row" data-go="${OD.go('damage', { t: fc.ref })}">${U.circ((d.zones || []).length ? 'done' : '')}<div class="grow"><div class="kv-k">Specific Damage Location</div><div class="kv-v">${(d.zones || []).length ? esc(d.zones.join(', ')) : 'Tap to mark damaged areas'}</div></div><span class="chev">${I.chev}</span></div>` }],
  };
  FM['tcr-vehicle'] = {
    title: 'Vehicle', back: 'TCR', noun: 'vehicle', top: vehicleTop,
    onChange: (k, v, d) => { if (k === 'driver') { d.drv = d.drv || {}; d.drv.pid = v; } },
    fields: [{ h: 'VEHICLE DETAILS' }, { sub: 'details', l: 'Vehicle Details', f: 'tcr-veh-details' }, { sub: 'damage', l: 'Damage Severity and Location', f: 'tcr-damage' }, { h: 'DRIVER' }, pickPerson('driver', 'Driver'), { sub: 'drv', l: 'Driver Details', f: 'tcr-driver', w: (d) => d.driver }, { h: 'PASSENGERS' }, { list: 'pax', add: '+ Passenger', f: 'tcr-passenger', title: (e) => (e.pid ? OD.fullName(OD.person(e.pid)) + ` (${F.age(OD.person(e.pid).dob)} yrs)` : 'Passenger') }],
  };
  FM['tcr-ped'] = { title: 'Pedestrian', noun: 'pedestrian', fields: [pickPerson('pid', 'Pedestrian'), { h: 'PEDESTRIAN DETAILS', w: (d) => d.pid }, { pk: 'action', l: 'Pedestrian action', o: ['Crossing road', 'Walking along road', 'Standing on road', 'On footpath', 'Other'], w: (d) => d.pid }, { sub: 'cm', l: 'Pedestrian Comments', f: 'tcr-cm', w: (d) => d.pid }, { sub: 'inj', l: 'Injury Details', f: 'tcr-inj', w: (d) => d.pid }] };
  FM['tcr-witness'] = { title: 'Witness', noun: 'witness', fields: [pickPerson('pid', 'Witness'), { h: 'WITNESS DETAILS', w: (d) => d.pid }, { t: 'phone', l: 'Phone Number', kb: 'tel', w: (d) => d.pid }, { a: 'account', l: 'Witness account', req: 1, tall: 1, w: (d) => d.pid }] };
  FM['tcr-outcome'] = { title: 'Outcome', fields: [{ h: 'OUTCOME' }, { seg: 'enf', l: 'Was enforcement action taken?', o: YN }, { pk: 'action', l: 'Enforcement action', o: ['Infringement notice', 'Summons', 'Arrest', 'Warning', 'Referred to another agency'], multi: 1, w: (d) => d.enf === 'Yes' }, { a: 'nfa', l: 'Reason no further action', req: 1, w: (d) => d.enf === 'No' }] };
  T('TCR', {
    name: 'Traffic Crash Report', title: 'TCR', approval: true, multi: true, menu: ['awhi', 'inf', 'noting'],
    approvalNote: 'Once you submit the TCR, your supervisor will be required to review and approve the report. Once approved, FMC will process the TCR into NIA.',
    sections: [
      { t: 'card', h: 'CARD EVENT', req: 1 },
      { t: 'occ', h: 'EVENT DETAILS', add: '+ Details', title: 'Event Details', l: 'Crash Occurred On:', between: true, l2: true, req: 1 },
      { t: 'loc', h: 'LOCATION', direct: true, f: 'tcr-loc', req: 1 },
      { t: 'sub', k: 'cond', h: 'ENVIRONMENT AND ROAD CONDITIONS', add: '+ Conditions', f: 'tcr-cond', done: () => 'Road Conditions Specified', req: 1 },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'tcr-narr', req: 1 },
      { t: 'vehicles', h: 'VEHICLES', f: 'tcr-vehicle', req: 1 },
      { t: 'list', k: 'ped', h: 'PEDESTRIAN', add: '+ Pedestrian', f: 'tcr-ped', title: (e) => (e.pid ? OD.fullName(OD.person(e.pid)) : 'Pedestrian') },
      { t: 'custom', h: 'CRASH DIAGRAM', render: (pw) => { const n = (pw.d.diagram?.objs || []).length; return n ? `<div class="row" data-go="${OD.go('crash-diagram', { id: pw.id })}"><div class="grow">Crash Diagram (${n} object${n > 1 ? 's' : ''})</div><span class="chev">${I.chev}</span></div>` : `<div class="row add" data-go="${OD.go('crash-diagram', { id: pw.id })}">+ Crash Diagram</div>`; }, status: (pw) => { const n = (pw.d.diagram?.objs || []).length; return { st: n ? 'done' : 'none', segs: n ? [true] : [] }; } },
      { t: 'list', k: 'wit', h: 'WITNESSES', add: '+ Witness', f: 'tcr-witness', title: (e) => (e.pid ? OD.fullName(OD.person(e.pid)) : 'Witness') },
      { t: 'sub', k: 'outcome', h: 'OUTCOME', add: '+ Outcome', f: 'tcr-outcome', req: 1, done: (d) => (d.enf === 'Yes' ? 'Enforcement: ' + (d.action || []).join(', ') : 'No further action') },
      { t: 'photos', h: 'PHOTOS', max: 15 },
    ],
    next: ['Your supervisor will be required to review and approve the report.', 'Once approved, FMC will process the TCR into NIA.', 'A copy of the TCR will be available to print from NIA.'],
  });

  /* ==================================================================== EBA */
  const ebaAge = (pw) => { const p = OD.person((pw.p.driver || [])[0]?.pid); return p ? F.age(p.dob) : 30; };
  const pbtFail = (pw) => { const d = pw.d.pbt || {}; return d.done === 'No' || d.result === 'Alcohol detected'; };
  const bstRes = (pw) => pw.d.bst?.details?.result;
  const needAcc = (pw) => { const b = pw.d.bst || {}; if (b.undergone === 'No') return true; const r = bstRes(pw); if (!r) return false; return ebaAge(pw) < 20 ? r !== 'Pass' : ['250+ Over', 'Over 400'].includes(r); };
  const ebtVal = (pw) => { const s = pw.d.ebt?.res?.steps || {}; if (s.noResult === 'Yes') return null; return s.mcg === undefined || s.mcg === '' ? undefined : +s.mcg; };
  const ebtCategory = (pw) => {
    const v = ebtVal(pw); const age = ebaAge(pw);
    if (v === null) return 'No result obtained';
    if (v === undefined || isNaN(v)) return '';
    if (age >= 20) return v <= 250 ? 'Passed (250 micrograms or less, 20 years or over)' : v <= 400 ? 'Contains alcohol between 251 and 400 micrograms of alcohol per litre of breath (20 years or over)' : 'Contains alcohol over 400 micrograms of alcohol per litre of breath (20 years or over)';
    return v === 0 ? 'Passed (no alcohol, under 20)' : v <= 150 ? 'Contains alcohol not exceeding 150 micrograms of alcohol per litre of breath (under 20)' : 'Contains alcohol over 150 micrograms of alcohol per litre of breath (under 20)';
  };
  OD.ebtCategory = ebtCategory;
  const tenMin = (pw) => { const v = ebtVal(pw); return v !== undefined && v !== null && ebaAge(pw) >= 20 && v > 400; };
  const bloodNeeded = (pw) => pw.d.tmp?.period?.elect === 'Yes' || ebtVal(pw) === null || pw.d.ebt?.res?.noDelay === 'No';
  const chargeable = (pw) => { const v = ebtVal(pw); if (bloodNeeded(pw)) return true; if (v === undefined || v === null) return false; return ebaAge(pw) >= 20 ? v > 250 : v > 0; };
  const posAdvice = (pw) => { const v = ebtVal(pw); const age = ebaAge(pw); if (v === null) return 'No result was obtained from the evidential breath test. You are now required to permit a blood specimen to be taken by a medical practitioner or nurse.'; if (age >= 20 && v > 400) return `The result of your evidential breath test is ${v} micrograms of alcohol per litre of breath. As the result exceeds 400 micrograms, you have the right to elect to have a blood test. You have 10 minutes to consider this option. If you do not elect a blood test within 10 minutes, the result of your breath test may be used in evidence against you.`; if (age >= 20) return `The result of your evidential breath test is ${v} micrograms of alcohol per litre of breath. This is between 251 and 400 micrograms and you will be issued an infringement notice.`; return `The result of your evidential breath test is ${v} micrograms of alcohol per litre of breath. As you are under 20 years of age, ${v > 150 ? 'you may be charged with an offence' : 'you will be issued an infringement notice'}.`; };
  FM['eba-reason'] = { title: 'Reason Stopped/Officer Uniform', fields: [{ h: 'REASON FOR STOP' }, { pk: 'reason', l: 'Reason for stop', o: 'reasonStop' }, { h: 'OFFICER IN UNIFORM' }, { seg: 'uniform', l: 'Was the officer in uniform?', o: YN }, { seg: 'produceId', l: 'Did the officer produce identification to the driver?', o: YN, w: (d) => d.uniform === 'No' }, { a: 'comment', l: 'Comment', opt: 1, ph: 'Record the conversation, e.g. Driver nodded head and said, "Yes I understand."' }] };
  FM['eba-adm'] = { title: 'Admissions/Observations', fields: [{ h: 'ADMISSIONS' }, { seg: 'drinking', l: 'Driver admitted drinking?', o: YN }, { t: 'drinks', l: 'What and how much?', req: 1, w: (d) => d.drinking === 'Yes' }, { tm: 'last', l: 'Time of last drink', w: (d) => d.drinking === 'Yes' }, { h: 'OBSERVATIONS OF DRIVER' }, { seg: 'smell', l: 'Smell of alcohol on breath?', o: YN }, { seg: 'speech', l: 'Slurred speech?', o: YN }, { seg: 'eyes', l: 'Bloodshot or glazed eyes?', o: YN }, { seg: 'balance', l: 'Unsteady on feet?', o: YN }, { a: 'comment', l: 'Comment', opt: 1, ph: 'Record what the driver said' }] };
  FM['eba-person'] = { title: 'Person', noun: 'person', top: personTop, fields: [{ h: 'DRIVER LICENCE DETAILS' }, { t: 'dl', l: 'Driver Licence Number', cam: 'dl', req: 1 }, { seg: 'produced', l: 'Driver licence produced?', o: YN }, { seg: 'licType', l: 'Licence type', o: ['Full', 'Restricted', 'Learner', 'None', 'Overseas'] }, { h: 'CONTACT' }, { t: 'phone', l: 'Phone Number', kb: 'tel', opt: 1 }, { t: 'occupation', l: 'Occupation', opt: 1 }] };
  FM['eba-vehicle'] = { title: 'Vehicle', noun: 'vehicle', top: vehicleTop, fields: [{ h: 'TSL VEHICLE DETAILS' }, { seg: 'tsl', l: 'Is the vehicle being used in a transport service (TSL)?', o: YN }, { t: 'tslNo', l: 'TSL Number', req: 1, w: (d) => d.tsl === 'Yes' }, { seg: 'pax', l: 'Were there passengers in the vehicle?', o: YN }] };
  FM['eba-pbt'] = { title: 'Passive Breath Test', fields: [{ h: 'PASSIVE BREATH TEST' }, { seg: 'done', l: 'Passive breath test undergone', o: YN }, { seg: 'result', l: 'Result', o: ['No alcohol detected', 'Alcohol detected'], w: (d) => d.done === 'Yes' }, { tm: 'time', l: 'Time of test', w: (d) => d.done === 'Yes' }, { pk: 'reasonNot', l: 'Reason not undergone', o: ['Driver refused', 'Device unavailable', 'Driver behaviour indicated alcohol', 'Other'], w: (d) => d.done === 'No' }, { a: 'comment', l: 'Comment', opt: 1 }] };
  FM['eba-bst'] = {
    title: 'Breath Screening Test',
    init: (d) => { const v = OD.db.settings.vehicles.find((x) => x.id === OD.db.settings.defaultVehicle); const b = v?.breath?.[0]; if (b && !d.device) { d.device = b.device; d.serial = b.serial; d.cal = F.dmy2(b.cal); } },
    fields: [
      { h: 'BREATH SCREENING TEST' }, { seg: 'undergone', l: 'Test undergone', o: YN },
      { h: 'BREATH SCREENING TEST DEVICE DETAILS', w: (d) => d.undergone === 'Yes' }, { pk: 'device', l: 'Breath Screening Test Device Used', o: 'x:breathDevices', w: (d) => d.undergone === 'Yes' }, { p: DEVICE_TEXT, cls: 'small', w: (d) => d.undergone === 'Yes' }, { t: 'serial', l: 'Serial Number', ph: 'e.g. AB1234', cam: 'serial', req: 1, w: (d) => d.undergone === 'Yes' }, { t: 'cal', l: 'Calibration Due Date', ph: 'DD/MM/YY', req: 1, w: (d) => d.undergone === 'Yes' },
      { h: 'BREATH SCREENING TEST DETAILS', w: (d) => d.undergone === 'Yes' }, { sub: 'details', l: 'Breath Screening Test', f: 'eba-bst-details', w: (d) => d.undergone === 'Yes', sum: (d) => d.result },
      { pk: 'reasonNot', l: 'Reason', o: ['Driver refused', 'Driver failed to undergo test', 'Medical reason', 'Other'], w: (d) => d.undergone === 'No' }, { a: 'comment', l: 'Comment', w: (d) => d.undergone === 'No', opt: 1 },
    ],
  };
  FM['eba-bst-details'] = { title: 'Breath Screening Test', fields: [{ h: 'BREATH SCREENING TEST DETAILS' }, { seg: 'mouthpiece', l: 'Enforcement Officer attached a mouthpiece to the breath inlet port of the device', o: YN }, { seg: 'display', l: "Display panel showed 'Screening'", o: YN }, { seg: 'blew', l: 'Driver being tested blew through the mouthpiece until a sufficient specimen of breath was obtained for analysis', o: YN }, { h: 'BREATH SCREENING TEST RESULT' }, { seg: 'result', l: 'Result', o: ['Pass', 'Under 250', '250+ Over', 'Over 400'] }, { seg: 'shown', l: 'Driver Shown Result', o: YN }] };
  FM['eba-rta'] = {
    title: 'Require to Accompany',
    init: (d) => { d.to = d.to || 'Police Station'; d.station = d.station || OD.db.settings.scene.replace(' Central', ''); },
    fields: [{ h: 'ACCOMPANY LOCATION' }, { pk: 'to', l: 'Location to accompany to', o: 'accompany' }, { pk: 'station', l: 'Station', o: 'stations', w: (d) => d.to === 'Police Station' }, { h: 'RIGHTS TO BE READ ALOUD' }, { rights: (d) => `I now require you to accompany me to the ${d.to === 'Police Station' ? (d.station || '…') + ' Police Station' : (d.to || 'Police Station').toLowerCase()} or other such place, for the purpose of an evidential breath test, blood test, or both.\n\n` + RIGHTS.split('\n\n').slice(1).join('\n\n') }, { seg: 'understood', l: 'Driver advised and understood?', o: YN }, { tm: 'time', l: 'Time advised' }, { a: 'comment', l: 'Comment', opt: 1, ph: 'Record what the driver said' }],
  };
  FM['eba-bora'] = { title: 'BORA Act 1990 EBT Advice', fields: [{ h: 'RIGHTS TO BE READ ALOUD' }, { rights: RIGHTS }, { h: 'LAWYER REQUEST' }, { seg: 'lawyer', l: 'Would you like to speak to a lawyer?', o: YN }, { a: 'comment', l: 'Comment', opt: 1 }, { h: 'LAWYER CONTACT', w: (d) => d.lawyer === 'Yes' }, { seg: 'spoke', l: 'Did the driver speak to a lawyer?', o: YN, w: (d) => d.lawyer === 'Yes' }, { tm: 'lawyerTime', l: 'Time telephone made available', w: (d) => d.lawyer === 'Yes' }] };
  FM['eba-ebt-steps'] = { title: 'Evidential Breath Test', fields: [{ h: 'EVIDENTIAL BREATH TEST DETAILS' }, { seg: 'button', l: 'Button depressed to start test', o: YN }, { seg: 'followed', l: 'Followed instructions appearing on display panel of the device used', o: YN }, { seg: 'mouthpiece', l: 'Attached new mouthpiece to the breath inlet port or tube and instructed person to blow through mouthpiece', o: YN }, { seg: 'blew', l: 'Person being tested blew through mouthpiece to provide a breath specimen sufficient for analysis', o: YN }, { seg: 'repeat', l: 'Repeat above step as required until testing sequence is completed', o: YN }, { h: 'EVIDENTIAL BREATH TEST RESULT' }, { seg: 'noResult', l: 'Result obtained?', o: ['Yes', 'No'], hint: '' }, { t: 'mcg', l: 'Micrograms of alcohol per litre of breath', kb: 'numeric', req: 1, w: (d) => d.noResult !== 'No' }] };
  FM['eba-ebt-steps'].onChange = (k, v, d) => { if (k === 'noResult') d.noResult = v === 'No' ? 'Yes' : ''; };
  // store "Result obtained? No" as noResult=Yes while keeping the seg readable
  FM['eba-ebt-steps'].fields = FM['eba-ebt-steps'].fields.map((f) => (f.seg === 'noResult' ? { seg: 'obtained', l: 'Result obtained?', o: YN } : f.t === 'mcg' ? { ...f, w: (d) => d.obtained !== 'No' } : f));
  FM['eba-ebt-steps'].onChange = (k, v, d) => { if (k === 'obtained') d.noResult = v === 'No' ? 'Yes' : ''; };
  FM['eba-ebt-res'] = {
    title: 'EBT Details and Results',
    init: (d) => { const v = OD.db.settings.vehicles.find((x) => x.id === OD.db.settings.defaultVehicle); const b = v?.breath?.[0]; if (b && !d.device) { d.device = 'Drager 9510NZ'; d.serial = b.serial; d.cal = F.dmy2(b.cal); } },
    fields: [{ h: 'EVIDENTIAL BREATH TEST' }, { seg: 'noDelay', l: 'Test undergone without delay', o: YN }, { dt: 'recorded', l: 'Officer recorded time' }, { h: 'EVIDENTIAL BREATH TEST DEVICE DETAILS' }, { pk: 'device', l: 'Evidential Breath Test Device used', o: 'x:breathDevices' }, { p: DEVICE_TEXT, cls: 'small' }, { t: 'serial', l: 'Serial Number', cam: 'serial', req: 1 }, { t: 'cal', l: 'Calibration Due Date', ph: 'DD/MM/YY', req: 1 }, { h: 'EVIDENTIAL BREATH TEST DETAILS' }, { sub: 'steps', l: 'Evidential Breath Test', f: 'eba-ebt-steps', sum: (d) => (d.obtained === 'No' ? 'No result obtained' : d.mcg ? d.mcg + ' mcg/L' : '') }],
  };
  FM['eba-ebt-pos'] = { title: 'Advice of EBT Result', fields: [{ h: 'RIGHTS TO BE READ ALOUD' }, { rights: (d, pw) => posAdvice(pw) + '\n\n' + RIGHTS.split('\n\n').slice(1).join('\n\n') }, { seg: 'understood', l: 'Driver advised and understood?', o: YN }, { tm: 'time', l: 'Time advised' }] };
  FM['eba-ebt-adv'] = {
    title: 'Advice of EBT Result',
    fields: [{ h: 'ADVISED DRIVER OF RESULT' }, { seg: 'obtained', l: 'Test results obtained', o: YN }, { dt: 'advised', l: 'Advised driver of evidential breath test results without delay' }, { h: 'EVIDENTIAL BREATH TEST RESULT' }, { info: (d, pw) => ebtCategory(pw) || 'Enter the result on the EBT Details and Results screen', l: 'Result' }, { h: 'RIGHTS TO ADVISE', w: (d, pw) => chargeable(pw) }, { sub: 'pos', l: 'Advice of Positive EBT Result', f: 'eba-ebt-pos', w: (d, pw) => chargeable(pw) }],
  };
  FM['eba-ebt'] = {
    title: 'Evidential Breath Test',
    status: (d, pw) => { const s = ['bora', 'res', 'adv'].map((k, i) => OD.formStatus(['eba-bora', 'eba-ebt-res', 'eba-ebt-adv'][i], d[k], pw)); return s.every((x) => x === 'done') ? 'done' : s.some((x) => x !== 'none') ? 'partial' : 'none'; },
    fields: [{ h: 'RIGHTS TO ADVISE' }, { sub: 'bora', l: 'BORA Act 1990 EBT Advice', f: 'eba-bora' }, { h: 'EVIDENTIAL BREATH TEST RESULT' }, { sub: 'res', l: 'EBT Details and Results', f: 'eba-ebt-res', lockUntil: (d, pw) => OD.formStatus('eba-bora', d.bora, pw) === 'done' }, { sub: 'adv', l: 'Advice of EBT Result', f: 'eba-ebt-adv', lockUntil: (d, pw) => OD.formStatus('eba-ebt-res', d.res, pw) === 'done' }, { note: 'The Evidential Breath Test section has 3 parts that must be completed in sequence.' }],
  };
  FM['eba-10-advice'] = { title: 'Advice Prior to 10 Minute Period', fields: [{ h: 'RIGHTS TO BE READ ALOUD' }, { rights: RIGHTS }, { h: 'LAWYER REQUEST' }, { seg: 'lawyer', l: 'Would you like to speak to a lawyer?', o: YN }, { a: 'comment', l: 'Comment', opt: 1 }, { h: 'RIGHTS ADVISED' }, { seg: 'advised', l: 'Rights advised', o: YN }, { tm: 'time', l: 'Time advised' }] };
  FM['eba-10-period'] = { title: '10 Minute Period', fields: [{ h: '10 MINUTE PERIOD' }, { p: 'Provide driver with a full 10 minutes unless the driver elects blood.', cls: 'small' }, { dt: 'start', l: 'Period Commenced (Officer recorded time driver advised)' }, { dt: 'end', l: 'Period Finished (Officer recorded time driver advised)' }, { a: 'comment', l: 'Comment', opt: 1 }, { h: 'BLOOD TEST ELECTED' }, { seg: 'elect', l: 'Does driver elect to undergo blood test', o: YN }, { dt: 'electTime', l: 'Officer recorded time', w: (d) => d.elect === 'Yes' }] };
  FM['eba-10'] = {
    title: 'Blood Test Consideration Period',
    status: (d, pw) => { const a = OD.formStatus('eba-10-advice', d.advice, pw), b = OD.formStatus('eba-10-period', d.period, pw); return a === 'done' && b === 'done' ? 'done' : a !== 'none' || b !== 'none' ? 'partial' : 'none'; },
    fields: [{ h: 'RIGHTS TO ADVISE' }, { sub: 'advice', l: 'Advice Prior to 10 Minute Period', f: 'eba-10-advice' }, { h: 'BLOOD TEST' }, { sub: 'period', l: '10 Minute Period', f: 'eba-10-period', lockUntil: (d, pw) => OD.formStatus('eba-10-advice', d.advice, pw) === 'done' }],
  };
  FM['eba-blood'] = { title: 'Blood Test', fields: [{ h: 'BLOOD TEST' }, { seg: 'consent', l: 'Driver permitted blood specimen to be taken?', o: YN }, { pk: 'where', l: 'Location of blood test', o: ['Police Station', 'Hospital', 'Medical Centre'], w: (d) => d.consent === 'Yes' }, { t: 'doctor', l: 'Medical practitioner / nurse name', req: 1, w: (d) => d.consent === 'Yes' }, { dt: 'taken', l: 'Blood specimen taken', w: (d) => d.consent === 'Yes' }, { t: 'kit', l: 'Blood specimen kit number', req: 1, w: (d) => d.consent === 'Yes' }, { a: 'refusal', l: 'Record the refusal (what was said)', req: 1, w: (d) => d.consent === 'No' }, { note: 'If a blood test has been taken, update the details in NIA once the blood results have been returned to complete the charging process.' }] };
  const summonsCase = (pw) => { const v = ebtVal(pw); const age = ebaAge(pw); return bloodNeeded(pw) || (v !== undefined && v !== null && (age >= 20 ? v > 400 : v > 150)); };
  FM['eba-charge'] = {
    title: 'Charging Decision',
    fields: [
      { h: 'CHARGING DECISION DETAILS', w: (d, pw) => summonsCase(pw) }, { seg: 'summons', l: 'Complete Summons to Defendant, POL2141', o: YN, w: (d, pw) => summonsCase(pw) }, { seg: 'arrest', l: 'Arrest and advise of right of opportunity for bail and Bill of Rights', o: YN, w: (d, pw) => summonsCase(pw) },
      { h: 'ARREST/NOTICE', w: (d, pw) => !summonsCase(pw) }, { seg: 'inf', l: 'Infringement Notice issued to Driver', o: YN, w: (d, pw) => !summonsCase(pw) }, { info: (d, pw) => (ebaAge(pw) >= 20 ? '(20 or over), 251-400mcg/L breath or 50-80mg/100ml blood' : 'Under 20 - breath alcohol not exceeding 150mcg/L'), l: 'Type of Infringement Notice', w: (d, pw) => !summonsCase(pw) && d.inf === 'Yes' }, { t: 'notice', l: 'Notice Number', req: 1, w: (d, pw) => !summonsCase(pw) && d.inf === 'Yes' },
      { note: 'OnDuty EBA just captures the EBA charge. Any additional charges will need to be laid in the summons or custody module.' },
    ],
  };
  FM['eba-ppa'] = { title: 'Post Procedure Administration', fields: [{ h: 'CHARGE ONLY' }, { seg: 'q1', l: 'Motor vehicle sale or disposal prohibition qualifying offence', o: YN }, { p: 'Complete Sale or Disposal Prohibition Notice (POL 1160), s129 Sentencing Act 2002', cls: 'small', w: (d) => d.q1 === 'Yes' }, { seg: 'q2', l: 'Failed or refused blood specimen', o: YN }, { p: 'Complete Mandatory Suspension of Driver Licence (POL 1006), s95 LTA', cls: 'small', w: (d) => d.q2 === 'Yes' }, { seg: 'q3', l: 'Mandatory 28 day suspension of driver licence qualifying offence', o: YN }, { p: 'Complete Mandatory Suspension of Driver Licence (POL 1006) s95 LTA (EBT over 400 plus relevant previous convictions or EBT result over 650)', cls: 'small', w: (d) => d.q3 === 'Yes' }, { h: 'IDENTIFYING PARTICULARS' }, { p: 'All drivers (with exception of drivers aged 17 years or under) who are to be arrested/summonsed can be required to provide identifying particulars.', cls: 'small' }, { seg: 'ip', l: 'Identifying particulars to be taken', o: YN }, { pk: 'ipType', l: 'Particulars to be taken', o: ['Fingerprints', 'Photograph', 'Fingerprints and Photograph'], w: (d) => d.ip === 'Yes' }] };
  FM['eba-other'] = { title: 'Other Actions', fields: [{ h: 'OTHER ACTIONS' }, { seg: 'forbidden', l: 'Forbidden to drive for up to 12 hours', o: YN }, { p: 'Complete Road Safety Directive (POL 406)', cls: 'small', w: (d) => d.forbidden === 'Yes' }, { seg: 'keys', l: 'Keys handed to Officer/other', o: YN }, { seg: 'impound', l: 'Vehicle Impounded', o: YN }, { t: 'reason', l: 'Reason for driving', req: 1 }, { t: 'owner', l: 'Who owns the motor vehicle', req: 1 }] };
  T('EBA', {
    name: 'EBA Procedure Sheet', title: 'EBA Procedure Sheet', onlineOnly: true, menu: ['inf', 'awhi', 'abandon'],
    niaFilter: (o) => o.eba || o.code === '1U', niaCommon: ['1U', 'A101', 'A102', 'A110'],
    sections: [
      { t: 'card', h: 'CARD EVENT' },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Vehicle Stop Occurred On:', req: 1 },
      { t: 'loc', k: 'stopped', h: 'WHERE STOPPED', req: 1 },
      { t: 'loc', k: 'firstSeen', h: 'ROAD FIRST SEEN ON', add: '+ Location First Seen', req: 1 },
      { t: 'sub', k: 'reason', h: 'REASON FOR STOP/OFFICER IN UNIFORM', add: '+ Reason Stopped/Officer Uniform', f: 'eba-reason', req: 1, done: (d) => d.reason },
      { t: 'sub', k: 'adm', h: 'ADMISSIONS/OBSERVATIONS OF DRIVER', add: '+ Admissions/Observations', f: 'eba-adm', req: 1 },
      { t: 'persons', k: 'driver', h: 'PERSON', max: 1, f: 'eba-person', req: 1 },
      { t: 'vehicles', h: 'VEHICLE', max: 1, f: 'eba-vehicle', req: 1 },
      { t: 'sub', k: 'pbt', h: 'PASSIVE BREATH TEST', add: '+ Passive Breath Test', f: 'eba-pbt', req: 1, done: (d) => (d.done === 'No' ? 'Not undergone' : d.result) },
      { t: 'sub', k: 'bst', h: 'BREATH SCREENING TEST', add: '+ Breath Screening Test', f: 'eba-bst', req: pbtFail, done: (d) => (d.undergone === 'No' ? 'Not undergone' : d.details?.result ? 'Result: ' + d.details.result : 'Breath Screening Test') },
      { t: 'sub', k: 'rta', h: 'REQUIRE TO ACCOMPANY', add: '+ Require to Accompany', f: 'eba-rta', req: needAcc, done: (d) => `Accompany to ${d.to === 'Police Station' ? d.station + ' Police Station' : d.to}` },
      { t: 'sub', k: 'ebt', h: 'EVIDENTIAL BREATH TEST', add: '+ Evidential Breath Test', f: 'eba-ebt', req: needAcc, done: (d, pw) => ebtCategory(pw) || 'Evidential Breath Test' },
      { t: 'sub', k: 'tmp', h: '10 MINUTE PERIOD TO CONSIDER OPTION OF BLOOD', add: '+ Blood Test Consideration Period', f: 'eba-10', req: tenMin, done: (d) => (d.period?.elect === 'Yes' ? 'Driver elected blood test' : d.period?.elect === 'No' ? 'Driver did not elect blood test' : 'Blood Test Consideration Period') },
      { t: 'sub', k: 'blood', h: 'BLOOD TEST', add: '+ Blood Test', f: 'eba-blood', req: bloodNeeded },
      { t: 'sub', k: 'charge', h: 'CHARGING DECISION', add: '+ Charging Decision', f: 'eba-charge', req: chargeable },
      { t: 'sub', k: 'ppa', h: 'POST PROCEDURE ADMINISTRATION', add: '+ Post Procedure Administration', f: 'eba-ppa', req: chargeable },
      { t: 'sub', k: 'other', h: 'OTHER ACTIONS', add: '+ Other Actions', f: 'eba-other', req: 1 },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'narrative', foot: 'Add your EBA notes. This section should not be used for NIA occurrence details as the NIA narrative is populated from the EBA information captured.' },
      { t: 'offences', h: 'OFFENCE', lib: 'nia', f: 'offence-generic', add: '+ Offence' },
      { t: 'photos', k: 'ebt', h: 'EBT RESULT PHOTO', max: 1, add: '+ Photo', foot: 'Optional – only use this to take a copy of the Evidential Breath Test printout from the Drager.' },
    ],
    next: ['A NIA Occurrence will automatically be created.', 'The EBA details are recorded in an EBA Procedure Sheet which is saved as a NIA attachment on the occurrence.', 'OnDuty enters the event number in the narrative as opposed to attaching it in NIA.', 'The EBA will go via FMC if there are items that need to be re-queried.'],
  });

  /* ============================================================ FLEEING DRIVER */
  FM['fdr-unitdet'] = { title: 'Unit Details', noun: 'unit', fields: [{ h: 'UNIT' }, { pk: 'callsign', l: 'Call Sign', o: 'callSigns' }, { pk: 'vehicle', l: 'Police Vehicle', o: 'x:policeVehicles' }, { pk: 'driver', l: 'Driver', o: 'x:officerQids' }, { pk: 'pax', l: 'Passengers', o: 'x:officerQids', multi: 1, opt: 1 }] };
  FM['fdr-unit'] = {
    title: 'Unit Details',
    fields: [
      { h: 'DEATH OR SERIOUS INJURY' }, { seg: 'dsi', l: 'Are you completing this form on behalf of a member you supervise (or a direct report) for a flee incident where there has been a death or life-threatening injury?', o: YN },
      { seg: 'resulted', l: 'Fleeing Driver incident resulted in', o: ['Death', 'Serious Injury'], w: (d) => d.dsi === 'Yes' }, { seg: 'critical', l: "Is this a critical incident as defined in the 'Investigation of critical incidents' chapter of the Police Manual?", o: YN, w: (d) => d.dsi === 'Yes' }, { p: 'If Yes, it is not mandatory to enter involved staff, units, or TDD deployment details. Please refer to the Police Manual chapter for further information.', cls: 'small', w: (d) => d.critical === 'Yes' },
      { h: 'REPORTING OFFICER DETAILS' }, { seg: 'role', l: 'Role in Fleeing Driver Report', o: ['Initiating Unit Officer', 'Supervisor'], opt: (d) => d.critical === 'Yes' },
      { h: 'PRIMARY UNIT DETAILS' }, { sub: 'primary', l: (d) => (d.primary?.callsign ? d.primary.callsign : 'Primary Unit'), f: 'fdr-unitdet', opt: (d) => d.critical === 'Yes' },
      { h: 'SECONDARY UNIT DETAILS' }, { list: 'secondary', add: '+ Secondary Unit', f: 'fdr-unitdet', title: (e) => e.callsign || 'Secondary Unit' },
    ],
  };
  FM['fdr-tdd'] = { title: 'TDD Deployment Details', noun: 'TDD deployment', fields: [{ h: 'TDD DEPLOYMENT DETAILS' }, { seg: 'method', l: 'TDD Method', o: 'tddMethod' }, { t: 'location', l: 'Location', req: 1, lo: 'l:nearStreets' }, { pk: 'staff', l: 'Staff Member QID', o: 'x:officerQids' }] };
  FM['fdr-details'] = {
    title: 'Fleeing Details',
    fields: [
      { h: 'FLEEING INCIDENT DETAILS' }, { seg: 'pursuit', l: 'Did the Fleeing Driver incident result in a pursuit?', o: YN }, { dur: 'duration', l: 'What was the duration of the pursuit? (HH:mm:ss)', w: (d) => d.pursuit === 'Yes', req: 1 }, { seg: 'signalled', l: 'Was the driver signalled to stop?', o: YN }, { pk: 'reason', l: 'Select the reason for signalling the driver to stop', o: 'fleeReasons', w: (d) => d.signalled === 'Yes' },
      { h: 'TDD DETAILS' }, { seg: 'tdd', l: 'Were tyre deflation devices (TDD) used in the Fleeing Driver incident?', o: YN }, { seg: 'tddStopped', l: 'Did TDD result in stopping the vehicle?', o: YN, w: (d) => d.tdd === 'Yes' },
      { h: 'TDD DEPLOYMENT DETAILS', w: (d) => d.tdd === 'Yes' }, { list: 'tddDeploy', add: '+ TDD Deployment', f: 'fdr-tdd', min: 1, w: (d) => d.tdd === 'Yes', title: (e) => `${e.method || 'TDD'} deployment${e.location ? ' - ' + e.location : ''}` },
      { h: 'CRASH DETAILS' }, { seg: 'crash', l: 'Did the fleeing vehicle crash?', o: YN }, { seg: 'injuries', l: 'Were there any injuries?', o: YN, w: (d) => d.crash === 'Yes' },
      { h: 'OUTCOME' }, { pk: 'outcome', l: 'Outcome', o: 'fleeOutcome' },
    ],
  };
  FM['fdr-narr'] = { title: 'Narrative', fields: [{ h: 'FLEEING DRIVERS CONTENT' }, { link: 'View Fleeing Drivers' }, { h: 'NARRATIVE' }, { a: 'text', l: 'Threat / Exposure / Necessity / Response', ph: 'If insufficient space please add directly to NIA\nTap to add...', req: 1, tall: 1 }] };
  FM['fdr-debrief'] = { title: 'Debrief', fields: [{ h: 'DEBRIEF' }, { seg: 'done', l: 'Debrief completed', o: YN }, { a: 'notes', l: (d) => (d.done === 'No' ? 'Reason debrief not completed' : 'Debrief notes and recommendations'), req: 1 }] };
  T('FDR', {
    name: 'Fleeing Driver Report', title: 'Fleeing Driver Report', menu: ['noting'],
    sections: [
      { t: 'card', h: 'CARD EVENT', req: 1 },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Fleeing Driver Incident Occurred On:', req: 1 },
      { t: 'sub', k: 'unit', h: 'UNIT DETAILS', add: '+ Unit Details', f: 'fdr-unit', req: 1, done: (d) => (d.primary?.callsign ? `Primary unit ${d.primary.callsign}` : 'Unit Details Specified') },
      { t: 'loc', h: 'FLEE START LOCATION', req: 1 },
      { t: 'vehicles', h: 'FLEEING VEHICLE', max: 1, req: 1 },
      { t: 'persons', k: 'driver', h: 'FLEEING DRIVER', add: '+ Driver', max: 1 },
      { t: 'persons', k: 'pax', h: 'PASSENGERS', add: '+ Passenger' },
      { t: 'sub', k: 'details', h: 'FLEEING DETAILS', add: '+ Fleeing Details', f: 'fdr-details', req: 1 },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'fdr-narr', req: 1 },
      { t: 'sub', k: 'debrief', h: 'DEBRIEF', add: '+ Debrief', f: 'fdr-debrief', req: 1, done: (d) => (d.done === 'Yes' ? 'Debrief completed' : 'Debrief not completed') },
      { t: 'photos', h: 'PHOTOS', max: 15 },
    ],
    next: ['In NIA a Fleeing Driver Occurrence is created.', 'An email notification is sent to the relevant Emergency Communications Centre to advise that input into the report is required, including the CARD event number and a link to the report.'],
  });

  /* ================================================================== AWHI */
  FM['awhi-prd'] = { title: 'Person Referral Details', fields: [{ h: 'PERSON REFERRAL DETAILS' }, { seg: 'canConsent', l: 'Can this person provide consent?', o: YN }, { seg: 'contact', l: 'Preferred contact method', o: ['Phone', 'Email'] }] };
  FM['awhi-person'] = {
    title: 'Person Details', back: 'AWHI Referral', noun: 'person', top: personTop,
    init: (d) => { const p = person(d); if (!p) return; d.age = d.age || String(F.age(p.dob)); d.gender = d.gender || p.g; d.cc = d.cc || 'New Zealand - 64'; d.phone = d.phone || p.phone || ''; d.phoneStatus = d.phoneStatus || (p.phone ? 'Confirmed' : ''); d.licCountry = d.licCountry || 'New Zealand'; d.dl = d.dl || p.dl || ''; },
    fields: [{ h: 'PERSON DETAILS' }, { t: 'age', l: 'Extd. Age', kb: 'numeric' }, { seg: 'gender', l: 'Gender', o: ['Male', 'Female', 'Unknown'] }, { seg: 'phoneStatus', l: 'Phone', o: ['Confirmed', 'Unconfirmed', 'No Phone'] }, { pk: 'cc', l: 'Phone Country Code', o: 'phoneCodes', w: (d) => d.phoneStatus !== 'No Phone' }, { t: 'phone', l: 'Phone Number', kb: 'tel', lo: 'x:personPhones', w: (d) => d.phoneStatus !== 'No Phone' }, { t: 'email', l: 'E-mail' }, { seg: 'licCountry', l: 'Licence Country', o: ['New Zealand', 'Overseas'] }, { t: 'dl', l: 'DLICNO', cam: 'dl' }, { note: 'If a person does not have a phone number or email, you can ask for a family, whānau or close friend’s contact details.' }, { h: 'PERSON REFERRAL DETAILS' }, { sub: 'prd', l: 'Person Referral Details', f: 'awhi-prd' }],
  };
  FM['awhi-behalf'] = { title: 'Person to Consent on Behalf', noun: 'person', top: personTop, fields: [{ p: 'A ‘Person to Consent on Behalf’ is only applicable when someone holds enduring power of attorney.', cls: 'small grey' }, { seg: 'epa', l: 'Holds enduring power of attorney?', o: YN }, { t: 'phone', l: 'Phone Number', kb: 'tel' }] };
  FM['awhi-privacy'] = { title: 'Privacy Statement', fields: [{ h: 'EMAIL PRIVACY STATEMENT' }, { seg: 'email', l: 'Email Privacy Statement?', o: YN }, { h: 'PRIVACY STATEMENT' }, { rights: 'YOUR PRIVACY\n\nThis statement tells you what information we collect as part of an awhi referral. It explains what we do with the information.\n\nCOLLECTION AND USE OF PERSONAL INFORMATION\n\nWe collect information as part of an awhi referral in order to help you. You don’t have to accept an offer of help if you don’t want to. It won’t have any negative effect.\n\nThe information we collect includes: your name; your gender; your date of birth and age; your phone number and/or email address; basic information on how the service provider can help you.\n\nIf you don’t provide this information, we cannot refer you to a service provider for help.\n\nSHARING OF INFORMATION\n\nWe will share your information with the service provider(s) you have agreed to be referred to so they can contact you.' }] };
  FM['awhi-consent'] = {
    title: 'Consent and Privacy',
    fields: [{ h: 'CONSENT STATEMENT' }, { rights: 'If you would like some help, I will ask you for some information for the referral.\n\nYour information will be stored in our Police systems.\n\nYour information will also be sent to the service provider who will use the information provided to contact you.\n\nI can email you the statement that talks about how we use your information.\n\nIf you want to read the statement, I can show it to you now.\n\nQ1. Do you understand what I have said?\n\nQ2. Do you have any questions about this referral?' }, { a: 'questions', l: 'Questions / comments', opt: 1 }, { seg: 'consent', l: 'Do you consent to this referral?', o: YN }, { h: 'PRIVACY STATEMENT' }, { sub: 'privacy', l: 'Privacy Statement', f: 'awhi-privacy' }, { note: 'NOTE: If the person is a youth (aged 15 years or under), mentally impaired or under the influence of alcohol or drugs you cannot offer a referral.' }],
  };
  FM['awhi-service'] = {
    title: 'Service', back: 'AWHI Referral', noun: 'service',
    top: (d) => { const s = OD.data.services.find((x) => x.id === d.sid); return s ? `<div class="sh">SERVICE DETAILS</div>${U.kv('Service Provider', s.name)}${U.kv('Service Summary', s.summary)}${U.kv('Conditions', s.cond)}` : `<div class="row add" data-go="${OD.go('sel-service', {})}">Select a service</div>`; },
    status: (d) => (d.sid && d.bg ? 'done' : d.sid ? 'partial' : 'none'),
    fields: [{ h: 'BACKGROUND AND CIRCUMSTANCES' }, { a: 'bg', l: '', ph: 'Tap to add...', req: 1, tall: 1 }, { note: 'Keep your background and circumstances basic and factual e.g. “<NAME> would like your assistance with <SERVICE>”.' }],
  };
  FM['awhi-ref'] = { title: 'Referral Details', fields: [{ h: 'ASSOCIATED NOTICE' }, { seg: 'notice', l: 'Is a notice associated with this referral?', o: YN }, { seg: 'comp56', l: 'Infringement Offence Notice issued - with 56 days compliance offered?', o: YN, w: (d) => d.notice === 'Yes' }, { note: 'This information is included in the email to the service provider to assist conversations and service type.' }] };
  T('AWHI', {
    name: 'AWHI Referral', title: 'AWHI Referral', occNow: true, menu: [],
    sections: [
      { t: 'occ', h: 'DATE/TIME', l: 'AWHI Referral Occurred On:', req: 1 },
      { t: 'persons', k: 'person', h: 'PERSON', max: 1, f: 'awhi-person', req: 1 },
      { t: 'persons', k: 'behalf', h: 'PERSON PROVIDING CONSENT ON BEHALF OF', add: '+ Person to Consent on Behalf', max: 1, f: 'awhi-behalf' },
      { t: 'sub', k: 'consent', h: 'CONSENT AND PRIVACY', add: '+ Consent and Privacy', f: 'awhi-consent', req: 1, done: (d) => (d.consent === 'Yes' ? 'Consent given' : d.consent === 'No' ? 'Consent NOT given' : 'Consent and Privacy') },
      { t: 'list', k: 'services', h: 'SERVICES', add: '+ Service', f: 'awhi-service', req: 1, title: (e) => OD.data.services.find((s) => s.id === e.sid)?.name || 'Select a service', sum: (e) => OD.data.services.find((s) => s.id === e.sid)?.type, onAdd: (e, pw) => OD.nav.push('sel-service', { id: pw.id, e: e.id }) },
      { t: 'sub', k: 'ref', h: 'REFERRAL DETAILS', add: '+ Referral Details', f: 'awhi-ref', req: 1 },
    ],
    validate: (pw) => { const out = []; const p = OD.pwFirstPerson(pw); if (p && F.age(p.dob) <= 15) out.push('A referral cannot be offered to a youth aged 15 years or under'); if (pw.d.consent?.consent === 'No') out.push('Informed consent must be given for a referral'); return out; },
    next: ['A referral email is automatically generated and sent to the service provider.', 'A copy is emailed to the area Kaiawhi.', 'A noting is placed in NIA (Category: Intelligence Noting, Type: AWHI Referral, Subject: AWHI Referral).', 'You can see the referral history from the Person Summary screen and via the Record in the links section.'],
    doneExtra: (pw) => {
      const p = OD.pwFirstPerson(pw); const e = (pw.p.person || [])[0] || {}; const s = OD.data.services.find((x) => x.id === (pw.l.services || [])[0]?.sid);
      if (!p) return '';
      const first = p.gn.split(' ')[0].replace(/^(\w)(\w*)/, (m, a, b) => a + b.toLowerCase());
      return `<div class="sh">EMAIL PREVIEW (DEMO)</div><div class="para small" style="font-family:Calibri,Arial,sans-serif;border:1px solid #ccc;margin:8px 12px;background:#fff">From: ${esc(OD.db.me.qid)}@demo.invalid\nSent: ${esc(F.stamp(pw.submitted))}\nSubject: AWHI Referral for ${esc(first)} ${esc(p.sn.charAt(0) + p.sn.slice(1).toLowerCase())} ${esc(s ? s.name : '')}\n\nAWHI Referral from Police for ${esc(first)} who has consented to a referral from Police to your organisation with the aim of enrolling in a program which will help them.\n\n<b>Their preferred method of contact is:</b> ${esc(e.prd?.contact === 'Email' ? e.email || 'email' : e.phone || '—')}\n\n<b>The referred person is:</b> ${esc(p.g)} with a DOB of ${esc(F.dmy(p.dob))}\n\n<b>${esc(s ? s.name : 'Service')}:</b>\n${esc((pw.l.services || [])[0]?.bg || '')}</div>`;
    },
  });

  /* ================================================================== CVIR */
  FM['cvir-inspector'] = { title: 'Inspector', noun: 'inspector', fields: [{ h: 'INSPECTOR' }, { pk: 'qid', l: 'Inspector', o: 'x:officerQids' }] };
  FM['cvir-insp'] = {
    title: 'Inspection Details', back: 'CVIR',
    init: (d) => { d.date = d.date || F.iso(); d.date_t = d.date_t || F.hm(); },
    fields: [{ h: 'DATE AND TIME' }, { dt: 'date', l: 'Inspection Date' }, { h: 'LOCATION' }, { pk: 'cvstLoc', l: 'CVST Location', o: 'cvstLocations' }, { t: 'locDesc', l: 'Location Description', lo: 'l:nearStreets', opt: 1 }, { nsew: 'dir', l: 'Direction of Travel' }, { pk: 'area', l: 'CVST Area', o: 'cvstAreas' }, { h: 'INSPECTION' }, { pk: 'levels', l: 'Inspection Level(s)', o: 'inspLevels', multi: 1 }, { note: 'Non CVST officers can record level 1 inspections only.' }, { list: 'inspectors', add: '+ Inspector', f: 'cvir-inspector', title: (e) => (e.qid ? e.qid.split(' - ')[0] : 'Inspector') }, { h: 'OPERATION' }, { t: 'op', l: 'Operation Name', opt: 1 }],
  };
  FM['cvir-defect'] = { title: 'Defect', noun: 'defect', top: (d) => `<div class="sh">DEFECT</div><div class="para"><b>${esc(d.defect || 'Select a defect')}</b>\n${esc(d.cat || '')}</div>`, fields: [{ h: 'DETAILS' }, { seg: 'severity', l: 'Severity', o: ['Minor', 'Major', 'Dangerous'] }, { seg: 'action', l: 'Action', o: ['Advised', 'Verification', 'Order not to operate'] }, { a: 'notes', l: 'Notes', opt: 1 }] };
  FM['cvir-outcome'] = { title: 'Outcome', fields: [{ h: 'OUTCOME' }, { seg: 'result', l: 'Inspection result', o: ['Pass', 'Fail'] }, { seg: 'inf', l: 'Will an infringement be issued?', o: YN }, { p: 'Before you affirm the CVIR: tap the 3 dots on the top right corner then Create Infringement Notice Form. Enter the infringement details and submit the form, then come back to the CVIR and affirm it – the report number will be revealed automatically.', cls: 'small', w: (d) => d.inf === 'Yes' }] };
  T('CVIR', {
    name: 'Commercial Vehicle Inspection Report', title: 'CVIR', menu: ['inf', 'affirm'], submitLabel: 'Affirm CVIR', submitStatus: 'Completed',
    sections: [
      { t: 'sub', k: 'insp', h: 'INSPECTION DETAILS', add: '+ Details', f: 'cvir-insp', req: 1, done: (d) => `${F.occ(d.date, d.date_t)}${d.cvstLoc ? '\n' + d.cvstLoc : ''}` },
      { t: 'fields', k: 'logbook', h: 'LOGBOOK REFERENCE', fields: [{ seg: 'produced', l: 'Logbook Produced?', o: ['No', 'Yes'] }, { t: 'ref', l: 'Logbook reference', w: (d) => d.produced === 'Yes', req: 1 }], req: 1 },
      { t: 'fields', k: 'odo', h: 'ODOMETER READING', fields: [{ t: 'reading', l: 'Odometer Reading', kb: 'numeric', req: 1 }, { seg: 'type', l: 'Type', o: ['Km', 'Miles'] }], req: 1 },
      { t: 'orgs', k: 'operator', h: 'OPERATOR', add: '+ Operator', max: 1 },
      { t: 'persons', k: 'driver', h: 'DRIVER', add: '+ Driver', max: 1, req: 1 },
      { t: 'vehicles', h: 'VEHICLES', adds: ['+ Combination', '+ Vehicle A', '+ Vehicle B', '+ Vehicle C'], req: 1 },
      { t: 'list', k: 'defects', h: 'DEFECTS', add: '+ Defect', f: 'cvir-defect', title: (e) => e.defect || 'Defect', sum: (e) => [e.severity, e.action].filter(Boolean).join(' · '), onAdd: (e, pw) => OD.nav.push('cvir-lib', { id: pw.id, e: e.id }) },
      { t: 'sub', k: 'outcome', h: 'OUTCOME', add: '+ Outcome', f: 'cvir-outcome', req: 1, done: (d) => d.result },
      { t: 'photos', h: 'PHOTOS', max: 15 },
    ],
    onSubmit: (pw) => { pw.notice = { revealed: true, numbers: ['CVIR ' + Math.floor(10000000 + Math.random() * 89999999)] }; },
    next: ['The CVIR is sent electronically to NZTA and NZTA will email the report to the transport operator listed on its database.', 'The CVIR data is stored and available in SMART Reports.', 'The CVIR does not go to NIA.'],
  });

  /* ======================================================== HEALTH REFERRAL */
  FM['hr-ref'] = { title: 'Referral', back: 'Health Referral', fields: [{ h: 'REFERRAL' }, { seg: 'willing', l: 'Is the person willing to be connected to health services?', o: YN }, { seg: 'arrest', l: 'Will an arrest be made?', o: YN }, { pk: 'warning', l: 'Warning type', o: ['Verbal warning', 'Pre-charge warning'], w: (d) => d.arrest === 'No' }, { note: 'A referral will only be sent if answered ‘Yes’ to Is the person willing to be connected to health services? If making a health referral as part of a verbal warning, remember to seize the drug and exhibit as per the normal process.' }] };
  FM['hr-offence'] = { title: 'Offence', noun: 'offence', top: (d, pw, fc) => offTop(d, pw, fc, { wording: false }), fields: [{ h: 'OFFENCE DETAILS' }, { pk: 'drug', l: 'Drug type', o: 'listedDrugs' }, { pk: 'form', l: 'Drug form', o: 'drugForms' }, { t: 'qty', l: 'Quantity', req: 1 }, { h: 'CONTRIBUTING FACTORS' }, { seg: 'alcohol', l: 'Is alcohol a contributing factor in the offence?', o: YNU }, { seg: 'mental', l: 'Is mental health a contributing factor in the offence?', o: YNU }] };
  FM['hr-person'] = { title: 'Person Details', noun: 'person', top: (d) => personTop(d) + (person(d)?.hrHistory ? '<div class="para small" style="background:#fff4e0;color:#9a5c00">This person has previously had one or more ‘Health Referral - Drug Use’ completed.</div>' : ''), fields: [{ h: 'CONTACT DETAILS' }, { t: 'phone', l: 'Phone Number', kb: 'tel', req: 1 }, { t: 'email', l: 'Email', opt: 1 }, { t: 'addr', l: 'Address', opt: 1 }] };
  FM['hr-narr'] = { title: 'Narrative', fields: [{ h: 'NARRATIVE' }, { a: 'text', l: 'Narrative', ph: 'Describe the circumstances / person’s current level of intoxication (drugs/alcohol) / how you have processed the drug exhibit / what types of drugs they are using', req: 1, tall: 1, max: 15000 }] };
  T('HR', {
    name: 'Health Referral - Drug Use', title: 'Health Referral', menu: ['ws'],
    niaFilter: (o) => o.drug, niaCommon: ['6921', '6931', '6941'],
    sections: [
      { t: 'card', h: 'CARD EVENT', req: 1 },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Occurrence Occurred On:', req: 1 },
      { t: 'loc', h: 'LOCATION', req: 1 },
      { t: 'persons', h: 'PERSON', max: 1, f: 'hr-person', req: 1 },
      { t: 'sub', k: 'ref', h: 'REFERRAL', add: '+ Referral', f: 'hr-ref', req: 1, done: (d) => (d.willing === 'Yes' ? 'Willing to be connected to health services' : 'Not willing – no referral will be sent') },
      { t: 'offences', h: 'OFFENCES', lib: 'nia', f: 'hr-offence', req: 1 },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'hr-narr', req: 1 },
      { t: 'photos', h: 'PHOTOS', max: 15 },
    ],
    next: (pw) => ['When the Health Referral has passed validation or FMC processing a NIA occurrence and case is created with the subject "Health Referral - Drugs" and assigned to the reporting officer.', 'The reporting officer will need to manually complete the NIA filing process in NIA.', pw.d.ref?.willing === 'Yes' ? 'Details are automatically sent to the health provider, who make the referral.' : 'No referral was sent as the person was not willing to be connected to health services.'],
  });

  /* ================================================================ PROPERTY */
  FM['pf-case'] = { title: 'Case', fields: [{ h: 'CASE' }, { t: 'docloc', l: 'DOCLOC Number', ph: '123456/7890', rr: 1 }, { t: 'name', l: 'Case Name', req: 1, w: (d) => !d.docloc }, { note: 'If you don’t know the DOCLOC number, you need to add the Case Name. The Case Name does not get sent through to PROP Desktop.' }], status: (d) => (d.docloc || d.name ? 'done' : 'none') };
  FM['pf-sub-cash'] = { title: 'Cash Details', fields: [{ h: 'CASH DETAILS' }, { pk: 'currency', l: 'Currency', o: 'currency' }, { t: 'amount', l: 'Amount', kb: 'decimal', req: 1 }, { t: 'denoms', l: 'Denominations', opt: 1, ph: 'e.g. 5 x $20, 2 x $50' }, { seg: 'sealed', l: 'Sealed in bag?', o: YN }, { t: 'bag', l: 'Bag number', w: (d) => d.sealed === 'Yes', req: 1 }] };
  FM['pf-sub-gen'] = { title: 'Item Subtype Details', fields: [{ h: 'DESCRIPTION' }, { a: 'desc', l: 'Description', req: 1 }, { t: 'make', l: 'Make / Brand', opt: 1 }, { t: 'model', l: 'Model', opt: 1 }, { pk: 'colour', l: 'Colour', o: 'colours', opt: 1 }, { t: 'qty', l: 'Quantity', kb: 'numeric', opt: 1 }] };
  FM['pf-serial'] = { title: 'Serial Number', noun: 'serial number', fields: [{ h: 'SERIAL NUMBER' }, { t: 'no', l: 'Serial Number', cam: 'serial', req: 1 }] };
  FM['pf-item'] = {
    title: 'Item', back: 'Item Overview',
    fields: [
      { h: 'ITEM DETAILS' }, { info: (d) => d.propNo || (OD.db.offline ? 'Available when online' : 'Assigned by PROP on submit'), l: 'Property Number' },
      { pk: 'type', l: 'Type', o: 'propTypes' }, { pk: 'cat', l: 'Category', o: 'propCats' }, { pk: 'origin', l: 'Origin', o: ['Found', 'Seized', 'Surrendered', 'Handed in'] }, { seg: 'ssa', l: 'Seized under Search and Surveillance Act', o: YN }, { seg: 'haz', l: 'Hazardous', o: YNU },
      { h: 'ITEM SUBTYPE DETAILS' }, { sub: 'cash', l: 'Cash Details', f: 'pf-sub-cash', w: (d) => d.type === 'Cash' }, { sub: 'gen', l: (d) => `${d.type || 'Item'} Details`, f: 'pf-sub-gen', w: (d) => d.type && d.type !== 'Cash' },
      { h: 'FINDER DETAILS', w: (d) => d.cat === 'Found Property' }, { seg: 'finderWants', l: 'Finder wants property', o: YN, w: (d) => d.cat === 'Found Property' },
      { h: 'SERIAL NUMBERS' }, { list: 'serials', add: '+ Serial Number', f: 'pf-serial', title: (e) => e.no || 'Serial Number' },
      { h: 'ALTERNATIVE REFERENCES' }, { list: 'alt', add: '+ Alternative Reference', f: 'pf-serial', title: (e) => e.no || 'Reference' },
    ],
  };
  FM['pf-coc'] = { title: 'Chain of Custody', init: (d) => { d.by = d.by || `${OD.db.me.qid} - ${OD.db.me.name}`; d.dt = d.dt || F.iso(); }, fields: [{ h: 'SEIZED DETAILS' }, { dt: 'dt', l: 'Date/Time' }, { pk: 'by', l: 'Seized By', o: 'x:officerQids' }, { t: 'subloc', l: 'Sub Location', opt: 1 }, { note: 'The initial Chain of Custody (first seized by details) is automatically recorded. Chain of Custody cannot be transferred to another Person or Organisation in OnDuty – this is only available from PROP Desktop.' }] };
  FM['pf-ver'] = { title: 'Verification', back: 'Item Overview', fields: [{ h: 'VERIFICATION DETAILS' }, { seg: 'by', l: 'Verified By', o: ['Police User', 'Other'] }, { dt: 'dt', l: 'Verified Date/Time' }, { pk: 'qid', l: 'QID', o: 'x:officerQids', w: (d) => d.by === 'Police User' }, { t: 'name', l: 'Verifier Name', req: 1, w: (d) => d.by === 'Other' }, { note: 'Verification will need to be completed in PROP Desktop if the verifier was a Police User. If the Verifier was Other, it will automatically be set to Verified in PROP Desktop.' }] };
  FM['pf-ip-role'] = { title: 'Person Role', noun: 'role', fields: [{ h: 'PERSON ROLE' }, { pk: 'role', l: 'Role', o: 'ipRoles' }, { person: 'pid', l: 'Person' }] };
  FM['pf-ip-org'] = { title: 'Organisation Role', noun: 'role', fields: [{ h: 'ORGANISATION ROLE' }, { pk: 'role', l: 'Role', o: 'ipRoles' }, { pk: 'org', l: 'Organisation', o: 'x:pwOrgs' }] };
  FM['pf-ip'] = { title: 'Interested Parties', back: 'Back', status: (d) => ((d.roles || []).length || (d.orgRoles || []).length ? 'done' : 'none'), fields: [{ h: 'INTERESTED PARTIES' }, { list: 'roles', add: '+ Person Role', f: 'pf-ip-role', title: (e) => `${e.role || 'Role'}${e.pid ? ' – ' + OD.fullName(OD.person(e.pid)) : ''}` }, { list: 'orgRoles', add: '+ Org Role', f: 'pf-ip-org', title: (e) => `${e.role || 'Role'}${e.org ? ' – ' + e.org : ''}` }, { note: 'Record the relevant Interested Party details for every Property Item (e.g. the Owner, the Finder). Each Person or Organisation in the Property paperwork must have at least one role on at least one Property Item.' }] };
  const itemTitle = (e) => (e.det?.type ? `${e.det.type}${e.det.cat ? ' – ' + e.det.cat : ''}` : 'Unknown Item');
  FM['pf-item-ov'] = {
    title: 'Item Overview', noun: 'item',
    init: (d) => { d.coc = d.coc || {}; FM['pf-coc'].init(d.coc); },
    fields: [{ h: 'OVERVIEW' }, { html: (d, pw) => `<div class="row lg">${U.circ(OD.formStatus('pf-item-ov', d, pw))}<div class="grow" style="font-weight:600">${esc(itemTitle(d))}</div></div>` }, { h: 'ITEM DETAILS' }, { sub: 'det', l: 'Item Details', f: 'pf-item' }, { sub: 'coc', l: 'Chain of Custody', f: 'pf-coc' }, { sub: 'ver', l: 'Verification', f: 'pf-ver', opt: 1 }, { sub: 'ip', l: 'Interested Parties', f: 'pf-ip' }],
  };
  T('PF', {
    name: 'Property Form', title: 'Property Form', occNow: true, menu: ['similarItem'], submitStatus: 'Processing',
    sections: [
      { t: 'card', h: 'CARD EVENT' },
      { t: 'sub', k: 'case', h: 'CASE', add: '+ Case', f: 'pf-case', req: 1, done: (d) => d.docloc || d.name },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Occurrence Occurred On:', req: 1 },
      { t: 'loc', h: 'SEIZED LOCATION', req: 1 },
      { t: 'persons', h: 'PERSONS' },
      { t: 'orgs', h: 'ORGANISATIONS' },
      { t: 'list', k: 'items', h: 'ITEM', add: '+ Item', f: 'pf-item-ov', req: 1, title: itemTitle, sum: (e) => (e.det?.propNo ? 'Property Number ' + e.det.propNo : '') },
    ],
    validate: (pw) => { const roles = (pw.l.items || []).flatMap((i) => (i.ip?.roles || []).map((r) => r.pid)); const missing = OD.pwPersonIds(pw).filter((pid) => !roles.includes(pid)); return missing.length ? missing.map((pid) => `${OD.fullName(OD.person(pid))} needs a role on at least one Property Item`) : []; },
    onSubmit: (pw) => { (pw.l.items || []).forEach((i) => { i.det = i.det || {}; if (!i.det.propNo && !OD.db.offline) i.det.propNo = 'PR' + Math.floor(1000000 + Math.random() * 8999999); }); },
    next: ['The status is set to Processing. When this has been processed into PROP, the status will change to At Prop. In PROP, it will be set to a status of Draft.', 'Once the paperwork has been submitted, it is not able to be updated or returned.', 'Complete the details in the PROP Desktop application when you return to the station.', 'Ensure you label each item with the Property Number.'],
    doneExtra: (pw) => { const items = (pw.l.items || []).filter((i) => i.det?.propNo); return items.length ? '<div class="sh">PROPERTY NUMBERS</div>' + items.map((i) => U.kv(itemTitle(i), i.det.propNo)).join('') : ''; },
  });

  /* ================================================================ s118 */
  FM['s118-owner'] = { title: 'Owner', noun: 'owner', top: personTop, init: (d) => { const p = person(d); if (p && !d.postal) d.postal = p.addr; }, fields: [{ h: 'POSTAL ADDRESS' }, { t: 'postal', l: 'Postal Address', req: 1 }, { note: 'Ensure you have the correct postal address. The owner is the recipient of the s118 Letter.' }] };
  FM['s118-offence'] = { title: 'Offence', noun: 'offence', top: (d, pw, fc) => offTop(d, pw, fc, {}), status: () => 'done', fields: [{ h: 'OFFENCE NOTES' }, { a: 'notes', l: 'Offence details', opt: 1 }] };
  FM['s118-info'] = { title: 'Information Requested', fields: [{ h: 'INFORMATION REQUESTED' }, { seg: 'ident', l: 'Identification requested', o: ['Driver', 'Passenger'] }, { h: 'OFFICER CONTACT DETAILS' }, { seg: 'phone', l: 'Provide phone', o: YN }, { t: 'phoneNo', l: 'Phone number', req: 1, w: (d) => d.phone === 'Yes' }, { seg: 'email', l: 'Provide email', o: YN }, { t: 'emailAddr', l: 'Email address', req: 1, w: (d) => d.email === 'Yes' }, { seg: 'address', l: 'Provide address', o: YN }, { t: 'addr', l: 'Address', req: 1, w: (d) => d.address === 'Yes' }] };
  T('s118', {
    name: 's118 Letter', title: 's118 Letter', menu: [],
    canAddOffence: (pw, code, lib) => { const o = lrt(code); if (o.aion || o.covid) return 'The s118 Letter can only be used for traffic offences.'; return null; },
    sections: [
      { t: 'card', h: 'CARD EVENT', req: 1 },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Occurrence Occurred On:', req: 1 },
      { t: 'loc', h: 'RECORD LOCATION', req: 1 },
      { t: 'vehicles', h: 'VEHICLE', max: 1, req: 1 },
      { t: 'persons', k: 'owner', h: 'OWNER', add: '+ Owner', max: 1, f: 's118-owner', req: 1 },
      { t: 'offences', h: 'OFFENCE', lib: 'lrt', max: 1, f: 's118-offence', req: 1 },
      { t: 'sub', k: 'info', h: 'INFORMATION REQUESTED', add: '+ Information Requested', f: 's118-info', req: 1, done: (d) => `Identification of ${String(d.ident || '').toLowerCase()} requested` },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'narrative', foot: 'The narrative will be part of the occurrence narrative in NIA but is not included within the s118 Letter that is sent to the recipient.' },
    ],
    next: ['NZ Post prints and sends the letter to the owner of the vehicle.', 'The letter is entered into NIA as a new occurrence.', 'FMC can link the CARD Event to any other offence/occurrence with the same number.'],
  });

  /* ================================================================ VISITS */
  FM['visit-contact'] = { title: 'Contact', noun: 'contact', top: personTop, fields: [{ h: 'CONTACT DETAILS' }, { t: 'role', l: 'Role / Position', opt: 1 }, { t: 'phone', l: 'Phone Number', kb: 'tel', opt: 1 }, { t: 'email', l: 'Email', opt: 1 }] };
  const visitInfo = (extra) => ({ title: 'Visit Information', fields: [{ h: 'VISIT INFORMATION' }, { pk: 'purpose', l: 'Purpose of visit', o: 'visitPurpose' }, { pk: 'method', l: 'Visit method', o: 'visitMethod' }, ...extra, { seg: 'concerns', l: 'Were any concerns raised?', o: YN }, { a: 'concernDetail', l: 'Concern details', req: 1, w: (d) => d.concerns === 'Yes' }, { seg: 'advice', l: 'Security advice provided?', o: YN }] });
  FM['visit-info-PoW'] = visitInfo([{ seg: 'service', l: 'Service in progress during visit?', o: YN }]);
  FM['visit-info-PoE'] = visitInfo([{ seg: 'lockdown', l: 'Lockdown procedures discussed?', o: YN }]);
  FM['visit-info-GCR'] = visitInfo([{ seg: 'rangeSafe', l: 'Range safety procedures sighted?', o: YN }, { t: 'members', l: 'Number of members present', kb: 'numeric', opt: 1 }]);
  [['PoW', 'Place of Worship Visit'], ['PoE', 'Place of Education Visit'], ['GCR', 'Gun Club/Range Visit']].forEach(([code, name]) => T(code, {
    name, title: name, occNow: true, menu: ['similar'],
    sections: [
      { t: 'occ', h: 'VISIT DETAILS', l: '', noStation: true, title: 'Visit Details', req: 1 },
      { t: 'orgs', k: 'org', h: 'ORGANISATION', max: 1, req: 1 },
      { t: 'persons', k: 'contact', h: 'CONTACT SPOKEN TO', add: '+ Contact Spoken To', max: 1, f: 'visit-contact' },
      { t: 'persons', k: 'pref', h: 'PREFERRED CONTACT', add: '+ Preferred Contact', max: 1, f: 'visit-contact' },
      { t: 'sub', k: 'info', h: 'VISIT INFORMATION', add: '+ Visit Information', f: 'visit-info-' + code, req: 1, done: (d) => d.purpose },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'narrative' },
    ],
    next: ['No supervisor approval is required.', 'The visit has been entered into NIA as a noting.'],
  }));

  /* ======================================================= WARRANTLESS SEARCH */
  FM['ws-target'] = { title: 'Target', noun: 'target', fields: [{ h: 'TARGET' }, { pk: 'type', l: 'Target Type', o: 'wsTargets' }, { t: 'desc', l: 'Description', req: (d) => d.type === 'Other Target', ph: (d) => (d.type === 'Vehicle' ? 'e.g. ABC123' : 'Describe the target') }] };
  FM['ws-power'] = {
    title: 'Power Details', noun: 'power',
    fields: [{ h: 'POWER' }, { pk: 'power', l: 'Power', o: 'powers', search: 1 }, { h: 'TARGETS' }, { pk: 'on', l: 'Power Executed On', o: 'x:wsTargets', multi: 1 }, { h: 'DETAILS' }, { pk: 'seized', l: 'Select target(s) where use of the power resulted in the seizure of evidential material', o: 'x:wsTargets', multi: 1, opt: 1 }],
  };
  FM['ws-cp'] = { title: 'Criminal Proceedings', fields: [{ h: 'CRIMINAL PROCEEDINGS' }, { seg: 'brought', l: 'Criminal proceedings have been brought as a consequence of evidential material seized?', o: YN }, { seg: 'consider', l: 'Criminal proceedings are under consideration as a consequence of evidential material seized?', o: YN }, { h: 'PERSONS CHARGED', w: (d) => d.brought === 'Yes' }, { t: 'charged', l: 'Number of persons charged', kb: 'numeric', req: 1, w: (d) => d.brought === 'Yes' }] };
  T('WS', {
    name: 'Warrantless Search', title: 'Warrantless Search', occNow: true, menu: ['noting'],
    init: (pw) => { pw.val.auth = OD.db.settings.authOfficer; },
    sections: [
      { t: 'card', h: 'CARD EVENT' },
      { t: 'occ', h: 'INCIDENT DETAILS', l: '', req: 1 },
      { t: 'value', k: 'auth', h: 'AUTHORISING OFFICER', l: 'Authorising Officer', o: 'x:supervisors', req: 1 },
      { t: 'loc', h: 'POWER LOCATION', add: '+ Power Location', foot: 'The location where the power was exercised', req: 1 },
      { t: 'list', k: 'targets', h: 'SEARCH TARGETS', add: '+ Target', f: 'ws-target', title: (e) => (e.type ? `${e.type}${e.desc ? ' - ' + e.desc : ''}` : 'Target'), foot: 'The targets that the power was executed on' },
      { t: 'persons', k: 'ptargets', h: 'PERSON TARGETS', add: '+ Person' },
      { t: 'list', k: 'powers', h: 'POWERS', add: '+ Power', f: 'ws-power', req: 1, title: (e) => (e.power ? e.power.split(' - ')[0] : 'Power'), sum: (e) => (e.on || []).join(', '), circle: false },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'narrative', req: 1 },
      { t: 'sub', k: 'cp', h: 'CRIMINAL PROCEEDINGS', add: '+ Criminal Proceedings', f: 'ws-cp', req: 1 },
    ],
    validate: (pw) => {
      const out = []; const targets = OD.optProviders.wsTargets('', {}, pw);
      if (!targets.length) out.push('At least one target is required');
      const linked = new Set((pw.l.powers || []).flatMap((p) => p.on || []));
      targets.filter((t) => !linked.has(t)).forEach((t) => out.push(`${t} must be linked with at least one power`));
      return out;
    },
    next: ['The Authorising Officer will receive a notification in OnDuty and an email with a link to the occurrence in NIA.', 'A 6X occurrence and a case is created in NIA.', 'A separate Warrantless Search Notification will be created for each Target. The data is sent to the Warrantless Search Database once the NIA Occurrence has been created.', 'NOTE: If drugs or firearms were found, or there was concern for a child or young person, a secondary notification process must be followed.'],
  });

  /* ============================================================== BAIL CHECK */
  const bailOf = (pw) => OD.db.bail[pw.val.bail];
  FM['bc-cond'] = {
    title: 'Bail Conditions', back: 'Bail Check',
    status: (d, pw) => { const b = pw && bailOf(pw); const n = b ? b.conditions.length : 0; const done = Array.from({ length: n }, (_, i) => d['c' + i]).filter(Boolean).length; return !n || !done ? 'none' : done === n ? 'done' : 'partial'; },
    fields: [{ html: (d, pw) => { const b = bailOf(pw); if (!b) return U.empty('No bail record linked'); return b.conditions.map((c, i) => `<div class="sh">CONDITION ${i + 1}</div><div class="field"><div style="font-size:13.5px;margin-bottom:4px">${esc(c)}</div>${U.seg('c' + i, ['Comply', 'Breach'], d['c' + i], pw.locked ? 'dis' : '')}</div>`).join(''); } }],
  };
  FM['bc-notes'] = { title: 'Bail Check Notes', fields: [{ h: 'BAIL CHECK NOTES' }, { a: 'text', l: 'Notes', tall: 1, req: 1 }] };
  const anyBreach = (pw) => Object.entries(pw.d.cond || {}).some(([k, v]) => /^c\d/.test(k) && v === 'Breach');
  FM['bc-action'] = { title: 'Action Taken', fields: [{ h: 'ACTION TAKEN' }, { pk: 'action', l: 'Action taken', o: 'bailActions' }, { seg: 'sixD', l: 'Create 6D (Bail Breach) occurrence?', o: YN, w: (d, pw) => anyBreach(pw) }, { seg: 'alert', l: 'Create an alert?', o: YN }, { pk: 'alertType', l: 'Alert type', o: 'alertTypes', w: (d) => d.alert === 'Yes' }, { note: 'If Breach and 6D is selected, then the record goes to NIA and the BMA. If Breach and 6D is not selected, then the record goes only to the BMA.' }] };
  T('BC', {
    name: 'Bail Check', title: 'Bail Check', occNow: true, menu: [],
    prefill: (pw, kind, id) => { if (kind === 'bail') { const b = OD.db.bail[id]; pw.val.bail = id; OD.pwAddObj(pw, 'person', 'persons', b.pid); pw.loc.loc = { lid: b.loc, addr: b.addr.toUpperCase() }; } },
    sections: [
      { t: 'card', h: 'CARD EVENT' },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Bail Check Occurred On:', req: 1 },
      { t: 'loc', h: 'LOCATION', req: 1 },
      { t: 'persons', h: 'PERSON', max: 1, req: 1 },
      { t: 'sub', k: 'cond', h: 'BAIL CONDITIONS', add: '+ Bail Conditions', f: 'bc-cond', req: 1, done: (d, pw) => (anyBreach(pw) ? 'Breach recorded' : 'All conditions complied with') },
      { t: 'sub', k: 'notes', h: 'BAIL CHECK NOTES', add: '+ Bail Check Notes', f: 'bc-notes' },
      { t: 'sub', k: 'action', h: 'ACTION TAKEN', add: '+ Action Taken', f: 'bc-action', req: 1, done: (d) => d.action },
    ],
    onSubmit: (pw) => { const b = bailOf(pw); if (b) { b.lastCheck = Date.now(); b.status = anyBreach(pw) ? 'red' : 'green'; b.breach = anyBreach(pw); b.lastNotes = pw.d.notes?.text || ''; b.fiveK = false; } },
    next: (pw) => [anyBreach(pw) && pw.d.action?.sixD === 'Yes' ? 'Breach and 6D selected – the record goes to NIA and the BMA.' : anyBreach(pw) ? 'Breach recorded without a 6D – the record goes only to the BMA.' : 'The bail check has been recorded in the BMA.', 'The 5K event has been automatically cleared.'],
  });

  /* ======================================================= UPDATE NARRATIVE */
  T('UN', {
    name: 'Update Narrative', title: 'Update Narrative', menu: [],
    prefill: (pw, kind, id) => { if (kind === 'occ') { const o = OD.occ(id); pw.val.case = id; const [dd, tt] = o.date.split(' '); const [d, m, y] = dd.split('/'); pw.occ.date = `${y}-${m}-${d}`; pw.occ.date_t = tt.slice(0, 5); } },
    sections: [
      { t: 'custom', h: 'CASE', render: (pw) => { const o = OD.occ(pw.val.case); if (!o) return '<div class="row center">No case</div>'; const p = OD.person((o.persons || [])[0]); const sub = (OD.location(o.loc)?.addr || '').split(',')[1] || ''; return `<div class="row"><div class="grow"><div class="kv-v">${esc(o.docloc)}</div><div class="kv-k" style="font-size:14px">${esc(o.date.slice(0, 10))} - ${esc(p ? p.sn : '')} - ${esc(sub.trim())}</div></div></div>`; }, status: (pw) => ({ st: pw.val.case ? 'done' : 'none', segs: [!!pw.val.case] }) },
      { t: 'occ', h: 'OCCURRENCE DETAILS', l: 'Occurrence Occurred On:', noStation: true },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'narrative', req: 1 },
    ],
    onSubmit: (pw) => { const o = OD.occ(pw.val.case); if (o) o.narrative = `${o.narrative ? o.narrative + '\n\n' : ''}Updated by ${OD.db.me.qid} ${F.stamp(Date.now())}\n${pw.d.narr?.text || ''}`; },
    next: ['Updates in OnDuty will be reflected in the NIA Occurrence narrative.'],
  });

  /* ============================================================ UPDATE WTA */
  FM['wta-addr'] = { title: 'Offender Address', fields: [{ h: 'ADDRESS' }, { info: (d, pw) => OD.pwFirstPerson(pw)?.addr, l: 'Current NIA address' }, { seg: 'change', l: 'Address', o: ['Confirm current', 'Update', 'Unknown'] }, { t: 'newAddr', l: 'New address', req: 1, w: (d) => d.change === 'Update' }] };
  T('WTA', {
    name: 'Update WTA', title: 'Update WTA', menu: [],
    prefill: (pw, kind, id) => { if (kind === 'wta') { const w = OD.db.wta[id]; pw.val.wta = id; OD.pwAddObj(pw, 'person', 'persons', w.pid); } },
    sections: [
      { t: 'persons', h: 'PERSON', max: 1, req: 1 },
      { t: 'custom', h: 'WARRANT', render: (pw) => { const w = OD.db.wta[pw.val.wta]; return w ? U.kv('Warrant Number', w.no) + U.kv('Offence', w.offence) : ''; }, status: (pw) => ({ st: 'done', segs: [true] }) },
      { t: 'sub', k: 'addr', h: 'ADDRESS', add: '+ Update Address', f: 'wta-addr', done: (d) => (d.change === 'Update' ? 'New address: ' + d.newAddr : d.change === 'Unknown' ? 'Address changed to Unknown' : 'Address confirmed') },
      { t: 'sub', k: 'narr', h: 'NARRATIVE', add: '+ Narrative', f: 'narrative', req: 1 },
    ],
    onSubmit: (pw) => { const w = OD.db.wta[pw.val.wta]; if (w) w.comments.unshift({ by: OD.db.me.qid, ts: F.stamp(Date.now()), text: pw.d.narr?.text || '' }); },
    next: ['The 2W narrative has been updated.', 'OnDuty does not replace the current process where the WTA has been actioned and the offender has been arrested.'],
  });

  /* ========================================================= SEED ACTIVITY */
  OD.seedActivity = (now) => {
    const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;
    const db = OD.db, FD = OD.folders;
    const q = (o) => OD.addQuery({ status: 'done', ...o });
    const pw = (type, id, ago, opts = {}) => OD.pwNew(type, { id, created: now - ago, ...opts });

    // --- today's activity (mirrors the Home screenshot) ---------------------
    const fMixed = FD.create({ id: 'f-mixed', ts: now - 23 * HOUR });
    const tcr = pw('TCR', 'demo-TCR', 23 * HOUR + 30 * MIN, { folder: fMixed.id });
    tcr.card = 'P012345699'; tcr.occ.date = F.iso(new Date(now - 23 * HOUR - 40 * MIN)); tcr.occ.date_t = F.hm(new Date(now - 23 * HOUR - 40 * MIN));
    tcr.loc.loc = { lid: 'L5', addr: 'JACKSON STREET, PETONE, LOWER HUTT' };
    tcr.d.cond = { speed: { posted: '50', temp: 'No' } }; tcr.owners = { cond: 'ABC012', narr: 'ABC012' };
    OD.pwAddObj(tcr, 'vehicle', 'vehicles', 'V4');
    const or = pw('OR', 'demo-OR', 23 * HOUR + 25 * MIN, { folder: fMixed.id });
    or.card = 'P123456789'; or.occ.date = '2022-06-02'; or.occ.date_t = '08:08'; or.loc.loc = { lid: 'L2', addr: 'MOLESWORTH STREET, THORNDON, WELLINGTON CITY' };
    OD.pwAddObj(or, 'person', 'persons', 'P14'); OD.pwAddObj(or, 'person', 'persons', 'P2');
    const fh1 = pw('FH', 'demo-FH2', 23 * HOUR + 20 * MIN, { folder: fMixed.id });
    const inf = pw('INF', 'demo-INF', 23 * HOUR + 15 * MIN, { folder: fMixed.id, occ: { date: F.iso(new Date(now - 23 * HOUR - 15 * MIN)), date_t: F.hm(new Date(now - 23 * HOUR - 15 * MIN)) } });
    OD.pwAddObj(inf, 'person', 'recipient', 'P1'); OD.pwAddObj(inf, 'vehicle', 'vehicles', 'V1'); inf.loc.loc = { lid: 'L5', addr: 'JACKSON STREET, PETONE, LOWER HUTT' };
    inf.off.push({ id: 'of_demo1', code: 'C101', lib: 'lrt', r: { code: 'C101', type: 'Compliance' } });
    const eba = pw('EBA', 'demo-EBA', 23 * HOUR + 10 * MIN, { folder: fMixed.id }); OD.pwAddObj(eba, 'person', 'driver', 'P1'); OD.pwAddObj(eba, 'vehicle', 'vehicles', 'V1');
    eba.card = 'P012345710'; eba.loc.stopped = { lid: 'L4', addr: 'PAREMATA HAYWARDS ROAD, WHITBY, PORIRUA' };
    pw('EBA', 'demo-EBA2', 23 * HOUR + 5 * MIN, { folder: fMixed.id });
    q({ type: 'QP', crit: { name: 'SMITH', gender: 'Male' }, label: 'SMITH, Male', folder: fMixed.id, ts: now - 23 * HOUR });

    const fFH = FD.create({ id: 'f-fh', ts: now - 20 * HOUR });
    const fh = pw('FH', 'demo-FH', 20 * HOUR + 10 * MIN, { folder: fFH.id });
    fh.card = 'P012345678'; fh.loc.loc = { lid: 'L6', addr: '321 Blue Street Thorndon' };
    ['P5', 'P6', 'P1'].forEach((id) => OD.pwAddObj(fh, 'person', 'persons', id));
    fh.p.persons[0].role = 'Person at Risk'; fh.p.persons[2].role = 'Person Posing Risk'; fh.p.persons[1].role = 'Child';
    q({ type: 'QP', crit: { name: 'WILLIAMS KARA' }, label: 'WILLIAMS, KARA', folder: fFH.id, ts: now - 20 * HOUR });
    q({ type: 'QP', crit: { name: 'WILLIAMS TIM' }, label: 'WILLIAMS, TIM', folder: fFH.id, ts: now - 20 * HOUR });
    q({ type: 'QL', crit: { quick: '321 BLUE STREET' }, label: '321 BLUE STREET, THORNDON', folder: fFH.id, ts: now - 20 * HOUR });

    q({ id: 'q-12345', type: 'QP', crit: { name: '12345' }, label: '12345', ts: now - 3 * HOUR - 12 * MIN });

    const fN = FD.create({ id: 'f-n', ts: now - 3 * HOUR + 2 * MIN });
    const n = pw('N', 'demo-N', 3 * HOUR - 5 * MIN, { folder: fN.id });
    OD.pwAddObj(n, 'person', 'persons', 'P1');
    n.occ.type = 'Gang/ Organised Crime'; n.occ.channel = 'Officer - discovered';
    q({ id: 'q-williams20', type: 'QP', crit: { name: 'WILLIAMS.TIM', age: '20', gender: 'Male' }, label: 'WILLIAMS, TIM, 20, Male', folder: fN.id, ts: now - 3 * HOUR });

    db.home.push({ id: OD.uid('h'), k: 'obj', t: 'person', ref: 'P1', ts: now - 2 * HOUR - 58 * MIN });
    q({ id: 'q-williams30', type: 'QP', crit: { name: 'WILLIAMS TIM', age: '30', gender: 'Male' }, label: 'WILLIAMS, TIM, 30, Male', total: 374, ts: now - 2 * HOUR - 59 * MIN });
    const fQV = FD.create({ id: 'f-qv', ts: now - 2 * HOUR - 57 * MIN });
    q({ id: 'q-abc123', type: 'QV', crit: { value: 'ABC123', by: 'REGNO', reason: '3T' }, label: 'ABC123', folder: fQV.id, ts: now - 2 * HOUR - 57 * MIN });

    // CARD event folder (FH 5F) – shows the auto QL + FH delve
    const fCard = FD.create({ id: 'f-card', ts: now - 42 * MIN, code: '5F', card: 'P012345678' });
    q({ id: 'q-ql-card', type: 'QL', crit: { quick: '123 BLUE STREET THORNDON' }, label: '123 BLUE STREET, THORNDON, Wellington', folder: fCard.id, ts: now - 42 * MIN, auto: true });
    q({ id: 'q-delve-card', type: 'DELVE', crit: { loc: 'L1' }, label: 'Recent FH occurrences at 123 BLUE STREET, THORNDON, Wellington', folder: fCard.id, ts: now - 42 * MIN, total: 19, ids: ['OF0', 'OF1', 'OF2', 'OF3', 'OF4'] });

    // --- older paperwork (not on the 24h Home view) ---------------------------
    const old = (type, id, days, setup) => { const p = pw(type, id, days * DAY); setup && setup(p); return p; };
    old('FH', 'demo-FH-appr', 120, (p) => { p.loc.loc = { lid: 'L1', addr: '123 BLUE STREET, THORNDON, WELLINGTON, 6011' }; p.status = 'Awaiting Approval'; p.locked = true; p.submitted = now - 120 * DAY + HOUR; p.supervisor = db.settings.supervisor; p.occ.date = '2022-03-10'; p.occ.date_t = '15:22'; });
    old('N', 'demo-N2', 1.2, (p) => OD.pwAddObj(p, 'person', 'persons', 'P1'));
    old('N', 'demo-N3', 1.5, (p) => { OD.pwAddObj(p, 'person', 'persons', 'P7'); OD.pwAddObj(p, 'person', 'persons', 'P8'); });
    old('OR', 'demo-OR-ret', 3, (p) => { p.card = 'P012300045'; OD.pwAddObj(p, 'person', 'persons', 'P9'); p.returned = true; p.returnComment = 'Please add the offender\'s role and complete the criminal proceedings section. – TTT123'; });
    old('AWHI', 'demo-AWHI', 2, (p) => OD.pwAddObj(p, 'person', 'person', 'P14'));
    old('CVIR', 'demo-CVIR', 4, (p) => OD.pwAddObj(p, 'org', 'operator', 'G2'));
    old('HR', 'demo-HR', 5, (p) => OD.pwAddObj(p, 'person', 'persons', 'P13'));
    old('PF', 'demo-PF', 6, (p) => { p.l.items = [{ id: 'li_demo', det: { type: 'Cash', cat: 'Found Property' }, coc: {} }]; FM['pf-coc'].init(p.l.items[0].coc); });
    old('s118', 'demo-s118', 7, (p) => OD.pwAddObj(p, 'vehicle', 'vehicles', 'V5'));
    old('PoW', 'demo-PoW', 8, (p) => OD.pwAddObj(p, 'org', 'org', 'G3'));
    old('PoE', 'demo-PoE', 8.5, (p) => OD.pwAddObj(p, 'org', 'org', 'G4'));
    old('GCR', 'demo-GCR', 9, (p) => OD.pwAddObj(p, 'org', 'org', 'G5'));
    old('WS', 'demo-WS', 10, (p) => OD.pwAddObj(p, 'person', 'ptargets', 'P1'));
    old('FDR', 'demo-FDR', 11, (p) => OD.pwAddObj(p, 'vehicle', 'vehicles', 'V6'));
    old('BC', 'demo-BC', 12, (p) => OD.pwPrefill(p, 'bail:B1'));
    old('UN', 'demo-UN', 13, (p) => OD.pwPrefill(p, 'occ:O4'));
    old('WTA', 'demo-WTA', 14, (p) => OD.pwPrefill(p, 'wta:W4'));
    old('INF', 'demo-INF-done', 2, (p) => { OD.pwAddObj(p, 'person', 'recipient', 'P3'); p.off.push({ id: 'of_d2', code: 'M401', lib: 'lrt', r: { code: 'M401', type: 'Infringement' } }); p.notice = { revealed: true, numbers: ['A4521877'] }; p.status = 'Completed'; p.locked = true; p.submitted = now - 2 * DAY; });
    old('N', 'demo-N-done', 4, (p) => { OD.pwAddObj(p, 'person', 'persons', 'P11'); p.status = 'Completed'; p.locked = true; p.submitted = now - 4 * DAY; });
    db.lastUsed = ['PoW', 'PoE', 'GCR'];
  };
})();
