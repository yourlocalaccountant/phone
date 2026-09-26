/* =========================================================================
   OnDuty recreation – reference data, fictional demo records, seed + generators
   Every person / vehicle / location / record here is invented demo data.
   ========================================================================= */
(function () {
  'use strict';
  const OD = window.OD, F = OD.fmt;
  const D = (OD.data = {});
  OD.optProviders = OD.optProviders || {}; // data.js loads before forms.js, which normally owns this
  const MIN = 60000, HOUR = 60 * MIN, DAY = 24 * HOUR;

  /* ------------------------------------------------------------ option lists */
  const L = OD.lists;
  L.stations = ['Wellington Central', 'Porirua', 'Waitangirua', 'Lower Hutt', 'Upper Hutt', 'Kapiti', 'Johnsonville', 'Auckland Central', 'Manukau', 'Henderson', 'Hamilton Central', 'Tauranga', 'Rotorua', 'Napier', 'Palmerston North', 'Nelson', 'Christchurch Central', 'Dunedin Central', 'Invercargill', 'PNHQ'];
  L.districts = ['Northland', 'Waitematā', 'Auckland City', 'Counties Manukau', 'Waikato', 'Bay of Plenty', 'Eastern', 'Central', 'Wellington', 'Tasman', 'Canterbury', 'Southern'];
  L.boundaries = ['Wellington Central, Wellington', 'Porirua, Wellington', 'Lower Hutt, Wellington', 'Auckland Central, Auckland City', 'Christchurch Central, Canterbury', 'Dunedin Central, Southern'];
  L.channels = ['Officer - discovered', 'Phone', '111 Call', 'Front Counter', 'Online Report', 'Email', 'Other Agency'];
  L.notingTypes = ['Gang/ Organised Crime', 'Drugs', 'Firearms', 'Family Harm', 'General Intelligence', 'Vehicle Sighting', 'Associates', 'Property', 'COVID-19 breach', 'AWHI Referral', 'Other'];
  L.sourceRel = ['A-Completely Reliable', 'B-Usually Reliable', 'C-Fairly Reliable', 'D-Not Usually Reliable', 'E-Unreliable', 'F-Cannot be assessed'];
  L.infoRel = ['1-Confirmed', '2-Probably True', '3-Possibly True', '4-Doubtful', '5-Improbable', '6-Cannot be assessed'];
  L.orRoles = ['Offender', 'Suspect', 'Victim', 'Witness', 'Informant', 'Complainant', 'Person of Interest', 'Other'];
  L.sceneTypes = ['Street, road, footpath', 'Dwelling', 'Commercial premises', 'Licensed premises', 'Park / reserve', 'School', 'Public transport', 'Carpark', 'Other'];
  L.weapons = ['No weapon used', 'Knife / cutting instrument', 'Firearm', 'Blunt instrument', 'Hands / feet', 'Vehicle', 'Other'];
  L.hateTypes = ['Race/Ethnicity', 'Religion', 'Sexual orientation', 'Gender identity', 'Disability', 'Age', 'Other'];
  L.requestedAction = ['Assign to Reporting Officer', 'File Reassignment', 'For Filing'];
  L.closure = ['Resolved - no further action', 'Insufficient evidence', 'Complainant withdrew', 'Offender unknown', 'Dealt with by other means', 'Other'];
  L.colours = ['Black', 'Blue', 'Brown', 'Gold', 'Green', 'Grey', 'Maroon', 'Orange', 'Pink', 'Purple', 'Red', 'Silver', 'White', 'Yellow'];
  L.markTypes = ['Tattoo', 'Scar', 'Birthmark', 'Piercing', 'Deformity', 'Amputation', 'Other'];
  L.markLocs = ['Head', 'Face', 'Neck', 'Left arm', 'Right arm', 'Left hand', 'Right hand', 'Chest', 'Back', 'Abdomen', 'Left leg', 'Right leg', 'Other'];
  L.iwi = ['Ngāpuhi', 'Ngāti Porou', 'Ngāti Kahungunu', 'Ngāi Tahu', 'Waikato-Tainui', 'Te Arawa', 'Ngāti Tūwharetoa', 'Tūhoe', 'Te Āti Awa', 'Ngāti Toa Rangatira', 'Ngāti Raukawa', 'Unknown / Declined'];
  L.weather = ['Fine', 'Light rain', 'Heavy rain', 'Mist / Fog', 'Snow', 'Hail / Sleet', 'Strong wind'];
  L.lighting = ['Bright sun', 'Overcast', 'Twilight', 'Dark - street lights on', 'Dark - no street lights'];
  L.speeds = ['10', '20', '30', '40', '50', '60', '70', '80', '90', '100', '110'];
  L.roadSurface = ['Sealed', 'Unsealed', 'Sealed - wet', 'Sealed - ice / snow', 'Loose material'];
  L.roadCurve = ['Straight', 'Easy curve', 'Moderate curve', 'Severe curve'];
  L.markings = ['Centre line', 'No passing line', 'Edge lines', 'Median barrier', 'Wire rope barrier', 'None'];
  L.severity = ['None', 'Minor', 'Moderate', 'Severe', 'Destroyed'];
  L.injury = ['None', 'Minor', 'Serious', 'Fatal'];
  L.seats = ['Driver', 'Front passenger', 'Rear left', 'Rear centre', 'Rear right', 'Other'];
  L.safety = ['Seatbelt worn', 'Seatbelt not worn', 'Child restraint', 'Helmet worn', 'Not applicable', 'Unknown'];
  L.impair = ['None suspected', 'Alcohol suspected', 'Drugs suspected', 'Fatigue', 'Medical condition'];
  L.vehTypes = ['Car', 'Station wagon', 'Van', 'Ute', 'SUV', 'Truck', 'Bus', 'Motorcycle', 'Moped', 'Bicycle', 'E-scooter', 'Other'];
  L.makes = ['Toyota', 'Holden', 'Ford', 'Mazda', 'Nissan', 'Honda', 'Mitsubishi', 'Subaru', 'Suzuki', 'Hyundai', 'Kia', 'Volkswagen'];
  L.reasonStop = ['Compulsory breath test checkpoint', 'Traffic offence observed', 'Crash', 'Driving manner', 'Vehicle of interest', 'Other'];
  L.breathDevices = ['Drager 7510NZ', 'Drager 9510NZ'];
  L.speedDevices = ['Laser', 'Speedo', 'Radar (mobile)', 'Radar (hand held)'];
  L.accompany = ['Police Station', 'Hospital', 'Medical Centre', 'Mobile Breath Testing Unit', 'Other place'];
  L.fleeReasons = ['Traffic Offending', 'Criminal Offending', 'Vehicle of Interest', 'Driver Behaviour', 'Other'];
  L.fleeOutcome = ['Driver apprehended at scene', 'Driver identified - apprehended later', 'Driver not identified', 'Vehicle abandoned', 'Crash - driver apprehended', 'Other'];
  L.tddMethod = ['Static', 'Dynamic'];
  L.callSigns = ['WN10', 'WN11', 'WN22', 'PR51', 'HV30', 'DOG1', 'EAGLE'];
  L.phoneCodes = ['New Zealand - 64', 'Australia - 61', 'Samoa - 685', 'Tonga - 676', 'Fiji - 679', 'Cook Islands - 682', 'United Kingdom - 44', 'United States - 1'];
  L.awhiAreas = ['Wellington - Wellington Area', 'Wellington - Kapiti Mana Area', 'Wellington - Hutt Valley Area', 'Auckland City - Auckland Central Area', 'Bay of Plenty - Rotorua Area', 'Canterbury - Christchurch Central Area'];
  L.serviceTypes = ['Show All', 'Accommodation', 'Addiction Services', 'Age Concern', 'Family Wellbeing', 'Mental Health', 'PSO', 'Road Police', 'Sexual Health'];
  L.cvstLocations = ['Roadside', 'Plimmerton Weigh Station', 'Bombay Weigh Station', 'Glasnevin Weigh Station', 'Rakaia Weigh Station', 'Mangatawhiri Weigh Station'];
  L.cvstAreas = ['Upper North', 'Central North', 'Lower North', 'Upper South', 'Lower South'];
  L.inspLevels = ['Level 1 - Driver and documentation', 'Level 2 - Walk around', 'Level 3 - Full mechanical', 'Level 4 - Load and dimension'];
  L.propTypes = ['Cash', 'Drugs', 'Firearm', 'Ammunition', 'Weapon (other)', 'Electronic Device', 'Vehicle', 'Jewellery', 'Documents', 'Clothing', 'General Property'];
  L.propCats = ['Found Property', 'Seized - Evidential', 'Seized - Safekeeping', 'Surrendered', 'Deceased Estate'];
  L.currency = ['NZD', 'AUD', 'USD', 'GBP', 'EUR', 'Other'];
  L.ipRoles = ['Owner', 'Finder', 'Person seized from', 'Claimant', 'Other'];
  L.orgRoles = ['Victim', 'Offender', 'Owner', 'Employer', 'Witness', 'Other'];
  L.vehRoles = ['Offender vehicle', 'Victim vehicle', 'Vehicle of interest', 'Stolen', 'Involved', 'Other'];
  L.fhRoles = ['Person at Risk', 'Person Posing Risk', 'Child', 'Mutual Participant', 'Witness', 'Other'];
  L.relationships = ['Current partner', 'Former partner', 'Parent', 'Child', 'Sibling', 'Other family member', 'Flatmate', 'Other'];
  L.alertTypes = ['SAFETY - Uses or carries weapon', 'SAFETY - Violent', 'SAFETY - Mental health risk', 'ACTION - Locate and advise', 'ACTION - Arrest', 'FLAGS - Drug user', 'FLAGS - Gang member', 'PLANS - Family harm safety plan', 'ORDERS - Protection order'];
  L.psoActions = ['PSO Issued', 'PSO Breached / Person Bound Taken into Custody', 'PSO Not Issued'];
  L.taskStatus = ['Not Started', 'In Progress', 'Awaiting Response', 'Completed'];
  L.bailActions = ['No action required', 'Arrested - breach of bail', 'Warning given', 'Referred to OC Bail', 'Other'];
  L.wsTargets = ['Place', 'Vehicle', 'Other Target'];
  L.userReasons = ['Investigation of an offence', 'Verification of identity', 'Locate / apprehend', 'Deportation liability check', 'Other lawful purpose'];
  L.visitPurpose = ['Reassurance visit', 'Community engagement', 'Security advice', 'Incident follow-up', 'Event planning', 'Other'];
  L.visitMethod = ['In person', 'Phone', 'Email', 'Video call'];
  L.infNoteConditions = ['Dry', 'Wet', 'Road works', 'Night', 'Daylight', 'School zone'];
  L.intoxication = ['Sober', 'Influenced', 'Intoxicated'];
  L.alcoholFrom = ['Liquor store', 'Supermarket', 'Licensed premises', 'Private supply', 'Unknown'];
  L.listedDrugs = ['Cannabis (THC)', 'Cocaine', 'Methamphetamine', 'MDMA', 'Amphetamine', 'Ketamine', 'Morphine', 'Oxycodone', 'Clonazepam', 'Diazepam'];
  L.unlistedDrugs = ['Other qualifying drug (unlisted)', 'Prescription medication (unlisted)'];
  L.drugForms = ['Plant material', 'Powder', 'Crystal', 'Tablet / Pill', 'Liquid', 'Other'];
  L.powers = [
    'Section 7 - Entry without warrant to find and arrest person unlawfully at large',
    'Section 8 - Entry without warrant to avoid loss of offender or evidence',
    'Section 14 - Entry without warrant to prevent offence or respond to risk to life or safety',
    'Section 18 - Search and seizure without warrant in relation to arms',
    'Section 19 - Search of person in relation to Misuse of Drugs Act 1975 offence when search warrant is issued',
    'Section 20 - Search of place or vehicle without warrant for certain drug offences',
    'Section 21 - Search of person without warrant for certain drug offences',
    'Section 88 - Search of person following arrest',
    'COVID-19 Public Health Response Act 2020 - s 20 (demo)',
  ];

  /* -------------------------------------------------------------- officers */
  // Fictional sample roster, only ever loaded via Settings > "Load sample
  // data" (never on by default – see OD.seed below). The real, editable
  // roster (accounts created via login / More > Officers) lives in
  // OD.db.officers; every name/QID/password here is invented demo data.
  L.ranks = ['Constable', 'Senior Constable', 'Sergeant', 'Senior Sergeant', 'Inspector', 'Senior Inspector', 'Detective', 'Detective Sergeant', 'Detective Senior Sergeant', 'Superintendent'];
  const SAMPLE_PASS = OD.simpleHash('demo1234');
  D.officers = [
    { qid: 'ABCD01', name: 'Constable D. User', rank: 'Constable', email: 'd.user@police.demo', role: 'Admin' },
    { qid: 'TTT123', name: 'Sergeant T. Taylor', rank: 'Sergeant', email: 't.taylor@police.demo', role: 'Officer' },
    { qid: 'ABC012', name: 'Constable A. Brown', rank: 'Constable', email: 'a.brown@police.demo', role: 'Officer' },
    { qid: 'ABC021', name: 'Constable R. Ngata', rank: 'Constable', email: 'r.ngata@police.demo', role: 'Officer' },
    { qid: 'KWCA02', name: 'Sergeant K. Walker', rank: 'Sergeant', email: 'k.walker@police.demo', role: 'Officer' },
    { qid: 'DHC142', name: 'Detective H. Chen', rank: 'Detective', email: 'h.chen@police.demo', role: 'Officer' },
    { qid: 'MPL310', name: 'Constable M. Patel', rank: 'Constable', email: 'm.patel@police.demo', role: 'Officer' },
    { qid: 'JRS220', name: 'Senior Sergeant J. Ross', rank: 'Senior Sergeant', email: 'j.ross@police.demo', role: 'Officer' },
    { qid: 'LKT445', name: 'Constable L. Kaur', rank: 'Constable', email: 'l.kaur@police.demo', role: 'Officer' },
  ].map((o) => ({ station: 'Wellington Central', passHash: SAMPLE_PASS, ...o }));
  // Dynamic option providers – always read the *current* roster (seed + any
  // officers registered in this browser), so newly registered officers show
  // up in every supervisor / QID picker immediately.
  OD.optProviders.supervisors = () => OD.db.officers.filter((o) => /Sergeant|Inspector|Superintendent/.test(o.rank)).map((o) => `${o.qid} - ${o.name}`);
  OD.optProviders.officerQids = () => OD.db.officers.map((o) => `${o.qid} - ${o.name}`);
  OD.isAdmin = () => !!OD.db && OD.officer(OD.db.session)?.role === 'Admin';

  /* ------------------------------------------------------- LRT offence library */
  const O = (code, desc, cat, fee, extra = {}) => ({ code, desc, cat, fee, ...extra });
  D.lrtCats = ['Speeding', 'Vehicle', 'Driver Licensing', 'Driving Offences', 'Intersection', 'Impaired Driving', 'Alcohol', 'Commercial Vehicle', 'Overloading', 'Smoke/Vape in M/Vehicle', 'COVID-19'];
  D.lrt = [
    O('E972', 'EXCEEDED 30 KM/H POSTED SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E975', 'EXCEEDED 50 KM/H POSTED SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E977', 'EXCEEDED 80 KM/H POSTED SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E979', 'EXCEEDED 100 KM/H POSTED SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E985', 'EXCEEDED TEMPORARY SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('C101', 'No Evidence of Current Warrant of Fitness', 'Vehicle', 200, { comp: true, text: 'OPERATED A PRIVATE VEHICLE ON A ROAD WHEN THAT VEHICLE WAS NOT DISPLAYING CURRENT EVIDENCE OF VEHICLE INSPECTION' }),
    O('C120', 'Operated vehicle with a defective tyre', 'Vehicle', 150, { comp: true }),
    O('L452', 'Operated an unregistered motor vehicle', 'Vehicle', 200, { comp: true }),
    O('L463', 'Operated an unlicensed motor vehicle', 'Vehicle', 200, { comp: true }),
    O('D130', 'Drove without appropriate driver licence', 'Driver Licensing', 400),
    O('D141', 'Learner licence holder drove unaccompanied', 'Driver Licensing', 100),
    O('D152', 'Restricted licence holder carried unauthorised passenger', 'Driver Licensing', 100),
    O('D160', 'Failed to carry driver licence', 'Driver Licensing', 55),
    O('M401', 'Driver or passenger not wearing seatbelt', 'Driving Offences', 150, { dem: 0 }),
    O('M408', 'Failed to ensure child under 7 years in approved child restraint', 'Driving Offences', 150, { comp: true }),
    O('P101', 'Used a mobile phone while driving', 'Driving Offences', 150, { dem: 20 }),
    O('P120', 'Failed to keep left', 'Driving Offences', 150),
    O('F201', 'Failed To Stop At Stop Sign', 'Intersection', 150, { dem: 20 }),
    O('F205', 'Failed to give way at give way sign', 'Intersection', 150, { dem: 20 }),
    O('F301', 'Failed to stop at red traffic signal', 'Intersection', 150, { dem: 20 }),
    ...[
      ['A805', 'Drove while 1 listed qualifying drug in blood not over high-risk level'],
      ['A806', 'Driver`s blood contained 1 unlisted qualifying drug - no CIT'],
      ['A807', 'Drove when 2 oral fluid tests were positive for 1 qualifying drug'],
      ['A812', '2 or more listed qualifying drugs in blood not over high-risk level'],
      ['A813', '2 or more unlisted qualifying drugs in blood - no CIT'],
      ['A814', '1 or more listed and unlisted qualifying drug in driver`s blood - no CIT'],
      ['A815', 'Drove when oral fluid tests were positive for 2 or more qualifying drugs'],
      ['A828', 'Blood alcohol 80mgm or less & listed qual drug not over high-risk level'],
      ['A829', 'Under 20 blood/alc 30mgm or less & listed qual drug not at high-risk level'],
      ['A830', 'Blood alcohol 80mgm or less & unlisted qual drug - no CIT'],
      ['A831', 'Under 20 blood/alcohol 30mgm or less & unlisted qual drug - no CIT'],
      ['A832', 'Drove while blood alcohol level 80mgm or less & positive OFT'],
      ['A833', 'Under 20 drove with blood alcohol 30mgm or less & positive OFT'],
      ['A834', 'Drove with breath alcohol 250-400 mcg & positive OFT'],
      ['A835', 'Under 20 drove with breath alcohol 150 mcg or less & positive OFT'],
    ].map(([c, d]) => O(c, d, 'Impaired Driving', 200, { drug: true, dem: 50 })),
    O('A151', '(20 or over), 251-400mcg/L breath or 50-80mg/100ml blood', 'Impaired Driving', 200, { dem: 50 }),
    O('A152', 'Under 20 - breath alcohol not exceeding 150mcg/L', 'Impaired Driving', 200, { dem: 50 }),
    O('W656', 'Consumed alcohol in an alcohol banned area', 'Alcohol', 250, { aion: true, wtw: true }),
    O('W657', 'Possessed alcohol in an alcohol banned area', 'Alcohol', 250, { aion: true, wtw: true }),
    O('W660', 'Brought alcohol into an alcohol banned area', 'Alcohol', 250, { aion: true, wtw: true }),
    O('V101', 'Failed to produce logbook on demand', 'Commercial Vehicle', 300),
    O('V120', 'Exceeded maximum work time', 'Commercial Vehicle', 300),
    O('V130', 'Transport service licence not displayed', 'Commercial Vehicle', 150),
    O('C401', 'Exceeded Certificate Of Loading (Weight)', 'Overloading', null, { ooin: true }),
    O('H601', 'Exceeded Axle Weight', 'Overloading', null, { ooin: true }),
    O('H602', 'Exceeded Weight On 2 Axles In Tandem Axle Set', 'Overloading', null, { ooin: true }),
    O('H603', 'Exceeded Maximum Gross Weight', 'Overloading', null, { ooin: true }),
    O('H604', 'Exceeded Axle Mass Limit - Bridge (30% to 70% of Class 1)', 'Overloading', null, { ooin: true }),
    O('H605', 'Exceeded Axle Mass Limit - Bridge (80% to 90% of Class 1)', 'Overloading', null, { ooin: true }),
    O('H607', 'Exceeded Group Mass Limit - Bridge (30% to 70% of Class 1)', 'Overloading', null, { ooin: true }),
    O('H608', 'Exceeded Group Mass Limit - Bridge (80% to 90% of Class 1)', 'Overloading', null, { ooin: true }),
    O('S101', 'Smoked in a motor vehicle carrying a child occupant', 'Smoke/Vape in M/Vehicle', 50, { wtw: true }),
    O('S102', 'Vaped in a motor vehicle carrying a child occupant', 'Smoke/Vape in M/Vehicle', 50, { wtw: true }),
    O('W772', 'Breached 8.3(b) COVID-19 Public Health Response Order 2020', 'COVID-19', 300, { covid: true, wtw: true, text: 'PARTICIPATED IN A SOCIAL GATHERING AND FAILED TO COMPLY WITH CLAUSE 17 OF THE COVID-19 PUBLIC HEALTH RESPONSE ORDER' }),
    O('W775', 'Breached 15(2) COVID-19 Public Health Response (ALR) Order', 'COVID-19', 300, { covid: true, wtw: true, text: 'PERSON FAILED TO REMAIN AT CURRENT HOME / RESIDENCE OTHER THAN FOR ESSENTIAL PERSONAL MOVEMENT' }),
    // ---- additional Speeding tiers ----
    O('E971', 'EXCEEDED 20 KM/H POSTED SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E973', 'EXCEEDED 40 KM/H POSTED SPEED LIMIT', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E981', 'EXCEEDED 110 KM/H POSTED SPEED LIMIT (MOTORWAY)', 'Speeding', null, { speed: true, dem: 'Depends on speed' }),
    O('E990', 'EXCEEDED VARIABLE SPEED LIMIT AT ROADWORKS', 'Speeding', null, { speed: true, dem: 'Depends on speed', comp: true }),
    // ---- additional Vehicle (registration / WOF / equipment) offences ----
    O('C110', 'No Evidence of Current Vehicle Registration', 'Vehicle', 200, { comp: true }),
    O('C130', 'Operated vehicle with a defective/inoperative headlamp', 'Vehicle', 150, { comp: true }),
    O('C140', 'Operated vehicle with excessively tinted windscreen/front windows', 'Vehicle', 150, { comp: true }),
    O('C150', 'Operated vehicle emitting excessive noise (modified exhaust)', 'Vehicle', 150),
    O('C160', 'Number plate obscured or not clearly legible', 'Vehicle', 150, { comp: true }),
    O('C170', 'Failed to affix warning flag/light to projecting load', 'Vehicle', 150),
    O('L470', 'Failed to notify change of registered person within 7 days', 'Vehicle', 100),
    // ---- additional Driver Licensing offences ----
    O('D170', 'Restricted licence holder drove between 10pm and 5am unaccompanied', 'Driver Licensing', 100),
    O('D180', 'Learner licence holder failed to display L plates', 'Driver Licensing', 100, { comp: true }),
    O('D190', 'Breached zero alcohol licence condition (non-EBA)', 'Driver Licensing', 200),
    // ---- additional Driving Offences ----
    O('M301', 'Careless use of a motor vehicle', 'Driving Offences', 150, { dem: 35 }),
    O('M310', 'Followed another vehicle too closely', 'Driving Offences', 150, { dem: 20 }),
    O('M320', 'Failed to indicate when changing lanes/turning', 'Driving Offences', 150),
    O('M330', 'Overtook on the left in breach of the rules', 'Driving Offences', 150, { dem: 35 }),
    O('M340', 'Drove on the incorrect side of the road', 'Driving Offences', 150, { dem: 35 }),
    O('M350', 'Opened a vehicle door carelessly / left it open so as to cause danger', 'Driving Offences', 150),
    O('M360', 'Rider failed to wear an approved safety helmet', 'Driving Offences', 150, { comp: true }),
    O('M370', 'Sounded a vehicle horn unnecessarily', 'Driving Offences', 55),
    O('M380', 'Failed to comply with a lawful sign or road marking', 'Driving Offences', 150),
    // ---- additional Intersection offences ----
    O('F210', 'Failed to give way when turning', 'Intersection', 150, { dem: 20 }),
    O('F220', 'Failed to stop at a pedestrian crossing', 'Intersection', 150, { dem: 20 }),
    O('F310', 'Proceeded through a railway level crossing when prohibited', 'Intersection', 150, { dem: 35 }),
    // ---- additional Alcohol (local alcohol ban / liquor ban) offences ----
    O('W658', 'Supplied alcohol to a minor in an alcohol banned area', 'Alcohol', 250, { aion: true, wtw: true }),
    // ---- additional Commercial Vehicle offences ----
    O('V140', 'Exceeded permitted driving hours (work time)', 'Commercial Vehicle', 300),
    O('V150', 'Logbook not maintained in accordance with the rules', 'Commercial Vehicle', 150),
  ];
  D.lrt.forEach((o) => {
    o.eff = '05/11/20 - Current';
    o.max = o.fee ? '$' + o.fee * 5 : '$1,000';
    o.ntype = o.aion ? 'AION' : o.ooin ? 'OOIN' : o.covid ? 'COVID' : 'ION';
    o.leg = { Speeding: 'Land Transport (Road User) Rule 2004 cl 5.1(1)', Vehicle: 'Land Transport Rule: Vehicle Standards Compliance 2002', 'Driver Licensing': 'Land Transport (Driver Licensing) Rule 1999', 'Driving Offences': 'Land Transport (Road User) Rule 2004', Intersection: 'Land Transport (Road User) Rule 2004 Part 4', 'Impaired Driving': 'Land Transport Act 1998 Part 6', Alcohol: 'Local Government Act 2002 s 239A', 'Commercial Vehicle': 'Land Transport Rule: Work Time and Logbooks 2007', Overloading: 'Land Transport Rule: Vehicle Dimensions and Mass 2016', 'Smoke/Vape in M/Vehicle': 'Smokefree Environments and Regulated Products Act 1990 s 20B', 'COVID-19': 'Section 26(2) COVID-19 Public Health Response Act 2020' }[o.cat];
    o.text = o.text || o.desc.toUpperCase();
  });
  D.lrtByCode = Object.fromEntries(D.lrt.map((o) => [o.code, o]));

  /* ---------------------------------------------- NIA incident / offence codes */
  // `leg` cites the real NZ Act (and, where reasonably well known, the section)
  // that the offence sits under. Reference/demo content only – always confirm
  // the current wording and section numbers against legislation.govt.nz before
  // relying on it for anything real; several sections have been renumbered or
  // amended over the years and this is not a substitute for the LRT/legal advice.
  const NIA_LEG = {
    admin: null,
    crimes: 'Crimes Act 1961',
    summary: 'Summary Offences Act 1981',
    trespass: 'Trespass Act 1980',
    drugs: 'Misuse of Drugs Act 1975',
    arms: 'Arms Act 1983',
    transport: 'Land Transport Act 1998',
    familyViolence: 'Family Violence Act 2018',
    bail: 'Bail Act 2000',
    harassment: 'Harassment Act 1997',
    covid: 'COVID-19 Public Health Response Act 2020',
    search: 'Search and Surveillance Act 2012',
  };
  const N = (code, desc, cat, extra = {}) => ({ code, desc, cat, leg: extra.leg || NIA_LEG[cat] || null, ...extra });
  D.nia = [
    // ---- operational incident categories (not themselves an offence) ----
    N('1C', 'Car/Person Acting Suspiciously', 'admin'),
    N('1X', 'Suicide / Attempted Suicide', 'admin'),
    N('1Z', 'Other Incident', 'admin'),
    N('1U', 'Traffic Incident', 'admin'),
    N('1V', 'Vehicle Collision', 'admin', { noOR: true }),
    N('1D', 'Domestic Dispute', 'admin', { noOR: true }),
    N('2M', 'Missing Person', 'admin', { noOR: true }),
    N('2O', 'Court Order', 'admin'),
    N('5F', 'Family Harm', 'admin', { noOR: true }),
    N('6A', 'Police Conduct', 'admin', { noOR: true }),
    N('6C', 'Child Protection Report', 'admin', { noOR: true }),
    N('6D', 'Bail Breach', 'bail', { noOR: true, leg: 'Bail Act 2000, s 38 (breach of bail condition)' }),
    N('6F', 'Forbidden to Drive', 'transport', { noOR: true, leg: 'Land Transport Act 1998, s 96 (breach of forbidden-to-drive notice)' }),
    N('6X', 'Warrantless Search Power Exercised', 'search'),
    N('7P', 'Family Violence Order', 'familyViolence'),
    // ---- Crimes Act 1961 – violence ----
    N('1543', 'Common Assault (Manually)', 'crimes', { leg: 'Crimes Act 1961, s 196 (Common assault)' }),
    N('1833', 'Assaults Child (Manually)', 'crimes', { leg: 'Crimes Act 1961, s 194(a) (Assault on a child)' }),
    N('1834', 'Male Assaults Female', 'crimes', { leg: 'Crimes Act 1961, s 194(b)' }),
    N('1851', 'Assault on a Constable / Prison Officer', 'summary', { leg: 'Summary Offences Act 1981, s 10' }),
    N('1861', 'Assault with Intent to Injure', 'crimes', { leg: 'Crimes Act 1961, s 193' }),
    N('1871', 'Injures with Intent to Injure', 'crimes', { leg: 'Crimes Act 1961, s 189(2)' }),
    N('1881', 'Wounds with Intent to Cause Grievous Bodily Harm', 'crimes', { leg: 'Crimes Act 1961, s 188(1)' }),
    N('1891', 'Aggravated Assault', 'crimes', { leg: 'Crimes Act 1961, s 192' }),
    N('1901', 'Common Assault (Domestic)', 'crimes', { leg: 'Crimes Act 1961, s 196' }),
    N('1911', 'Threatens to Kill or Do Grievous Bodily Harm', 'crimes', { leg: 'Crimes Act 1961, s 306' }),
    N('1921', 'Intimidation', 'summary', { leg: 'Summary Offences Act 1981, s 21' }),
    N('1931', 'Criminal Harassment', 'harassment', { leg: 'Harassment Act 1997, s 8' }),
    // ---- Crimes Act 1961 – dishonesty / property ----
    N('3100', 'Wilful Damage', 'crimes', { leg: 'Crimes Act 1961, s 269 (Intentional damage)' }),
    N('4111', 'Burglary', 'crimes', { leg: 'Crimes Act 1961, s 231' }),
    N('4121', 'Aggravated Burglary', 'crimes', { leg: 'Crimes Act 1961, s 232' }),
    N('4131', 'Robbery', 'crimes', { leg: 'Crimes Act 1961, s 234' }),
    N('4141', 'Aggravated Robbery', 'crimes', { leg: 'Crimes Act 1961, s 235' }),
    N('4211', 'Unlawfully Takes Motor Vehicle', 'crimes', { noOR: true, towing: true, leg: 'Crimes Act 1961, s 226(1)' }),
    N('4221', 'Unlawfully Interferes With Motor Vehicle', 'crimes', { noOR: true, towing: true, leg: 'Crimes Act 1961, s 226(2)' }),
    N('4410', 'Shoplifting (under $500)', 'crimes', { leg: 'Crimes Act 1961, s 219 / s 223(d) (Theft)' }),
    N('4420', 'Theft (between $500 and $1000)', 'crimes', { leg: 'Crimes Act 1961, s 219 / s 223(c)' }),
    N('4430', 'Theft (over $1000)', 'crimes', { leg: 'Crimes Act 1961, s 219 / s 223(a)' }),
    N('4440', 'Receiving Stolen Property', 'crimes', { leg: 'Crimes Act 1961, s 246' }),
    N('4450', 'Obtains by Deception', 'crimes', { leg: 'Crimes Act 1961, s 240' }),
    N('4951', 'Sell, transfer or make available false document', 'crimes', { leg: 'Crimes Act 1961, s 258 (Using forged document)' }),
    // ---- Summary Offences Act 1981 / Trespass Act 1980 ----
    N('3521', 'Disorderly Behaviour', 'summary', { leg: 'Summary Offences Act 1981, s 3' }),
    N('3531', 'Offensive Behaviour or Language', 'summary', { leg: 'Summary Offences Act 1981, s 4' }),
    N('3541', 'Fighting in a Public Place', 'summary', { leg: 'Summary Offences Act 1981, s 7' }),
    N('3551', 'Possession of Offensive Weapon', 'summary', { leg: 'Summary Offences Act 1981, s 13A' }),
    N('3561', 'Wilful Trespass (Warned to Leave)', 'trespass', { leg: 'Trespass Act 1980, s 3/4' }),
    N('3871', 'Contravenes Protection Order (Violence)', 'familyViolence', { leg: 'Family Violence Act 2018, s 112 (Offence to breach protection order)' }),
    N('3881', 'Breaches Police Safety Order', 'familyViolence', { leg: 'Family Violence Act 2018' }),
    // ---- Misuse of Drugs Act 1975 ----
    N('6921', 'Possess Cannabis', 'drugs', { drug: true, leg: 'Misuse of Drugs Act 1975, s 7(1)(a) (Class C)' }),
    N('6931', 'Possess Methamphetamine', 'drugs', { drug: true, leg: 'Misuse of Drugs Act 1975, s 7(1)(a) (Class A)' }),
    N('6941', 'Possess Utensil for Drug Use', 'drugs', { drug: true, leg: 'Misuse of Drugs Act 1975, s 13(1)' }),
    N('6951', 'Cultivate Prohibited Plant', 'drugs', { leg: 'Misuse of Drugs Act 1975, s 9' }),
    N('6961', 'Supply or Offer to Supply Class A Drug', 'drugs', { leg: 'Misuse of Drugs Act 1975, s 6(1)(c)' }),
    N('6971', 'Supply or Offer to Supply Class B/C Drug', 'drugs', { leg: 'Misuse of Drugs Act 1975, s 6(1)(c)' }),
    N('6981', 'Possess Precursor Substance', 'drugs', { leg: 'Misuse of Drugs Act 1975, Part 3 (precursor substances)' }),
    // ---- Arms Act 1983 ----
    N('7011', 'Careless Use of Firearm', 'arms', { leg: 'Arms Act 1983, s 45' }),
    N('7021', 'Unlawful Possession of Firearm', 'arms', { leg: 'Arms Act 1983, s 50/50A' }),
    N('7031', 'Unlawful Possession of Restricted Weapon', 'arms', { leg: 'Arms Act 1983, s 51' }),
    // ---- Land Transport Act 1998 (summary driving offences) ----
    N('A101', 'Drove with excess breath alcohol (over 400mcg)', 'transport', { eba: true, leg: 'Land Transport Act 1998, s 56(1)' }),
    N('A102', 'Drove with excess blood alcohol (over 80mg)', 'transport', { eba: true, leg: 'Land Transport Act 1998, s 56(2)' }),
    N('A103', 'Failed or refused to supply blood specimen', 'transport', { eba: true, leg: 'Land Transport Act 1998, s 60' }),
    N('A110', 'Under 20 drove with breath alcohol over 150mcg', 'transport', { eba: true, leg: 'Land Transport Act 1998, s 57' }),
    N('A201', 'Reckless Driving', 'transport', { leg: 'Land Transport Act 1998, s 35' }),
    N('A211', 'Careless Driving Causing Injury or Death', 'transport', { leg: 'Land Transport Act 1998, s 36' }),
    N('A221', 'Failed to Stop / Ascertain Injury (Hit and Run)', 'transport', { leg: 'Land Transport Act 1998, s 51' }),
    N('A231', 'Driving While Disqualified', 'transport', { leg: 'Land Transport Act 1998, s 32' }),
    N('A241', 'Failed to Stop When Signalled (Fleeing Driver)', 'transport', { leg: 'Land Transport Act 1998, s 52' }),
    // ---- COVID-19 Public Health Response Act 2020 ----
    N('W772', 'Breached COVID-19 Public Health Response Order', 'covid', { covid: true, leg: 'COVID-19 Public Health Response Act 2020, s 26' }),
  ];
  D.niaByCode = Object.fromEntries(D.nia.map((o) => [o.code, o]));
  D.niaCats = [...new Set(D.nia.map((o) => o.cat))];

  /* ------------------------------------------------------ CVIR defect library */
  D.cvirCats = {
    Brakes: ['BR01 - Service brake ineffective', 'BR02 - Park brake ineffective', 'BR03 - Air leak audible', 'BR04 - Brake lining worn below limit'],
    Steering: ['ST01 - Excessive free play', 'ST02 - Steering component damaged', 'ST03 - Power steering leak'],
    Suspension: ['SU01 - Spring broken', 'SU02 - Air bag leaking', 'SU03 - Shock absorber missing'],
    'Tyres and Wheels': ['TW01 - Tread depth below 1.5mm', 'TW02 - Tyre damaged / cord exposed', 'TW03 - Wheel nut missing'],
    Lighting: ['LI01 - Headlamp inoperative', 'LI02 - Stop lamp inoperative', 'LI03 - Indicator inoperative', 'LI04 - Reflector missing'],
    'Body and Chassis': ['BC01 - Chassis cracked', 'BC02 - Body panel insecure', 'BC03 - Under-run protection damaged'],
    Couplings: ['CO01 - Kingpin worn', 'CO02 - Safety chain missing', 'CO03 - Drawbar cracked'],
    'Load Security': ['LS01 - Load unrestrained', 'LS02 - Lashing damaged', 'LS03 - Load exceeds overhang'],
    Documentation: ['DO01 - COF not displayed', 'DO02 - RUC licence not displayed', 'DO03 - TSL not carried'],
  };

  /* --------------------------------------------------------- AWHI services */
  D.services = [
    { id: 'S1', name: 'Whānau Recovery Support', type: 'Addiction Services', area: 'Auckland City - Auckland Central Area', urgent: true, summary: 'Support for the families of those who have a methamphetamine addiction problem. Methamphetamine ONLY. Passes are required for group meetings, but we can still do individual support sessions either in the office or via video call.', cond: 'Referral must have consent. Family members only.' },
    { id: 'S2', name: 'Quit Together', type: 'Addiction Services', area: 'Auckland City - Auckland Central Area', summary: 'Quit Together is a stop smoking service in Auckland. This face-to-face service is free to people who have decided to stop smoking.', cond: 'Must be 16 years or older.' },
    { id: 'S3', name: 'Housing First (Demo)', type: 'Accommodation', area: 'Bay of Plenty - Rotorua Area', summary: 'Supports people experiencing homelessness into long-term housing with wraparound support.', cond: 'Must be currently without stable accommodation.' },
    { id: 'S4', name: 'Kaumātua Care Network', type: 'Age Concern', area: 'Wellington - Wellington Area', summary: 'Visiting and support service for older people living alone.', cond: 'Aged 65+.' },
    { id: 'S5', name: 'Family Start Wellbeing', type: 'Family Wellbeing', area: 'Wellington - Wellington Area', summary: 'Home visiting programme supporting whānau with young children.', cond: 'Children under 5 in the household.' },
    { id: 'S6', name: 'Mind Matters Wellington', type: 'Mental Health', area: 'Wellington - Wellington Area', summary: 'Free community mental health support and counselling.', cond: 'None.' },
    { id: 'S7', name: 'Safe Home PSO Support', type: 'PSO', area: 'Wellington - Wellington Area', summary: 'Contacts persons at risk after a Police Safety Order is issued.', cond: 'PSO must have been issued.' },
    { id: 'S8', name: 'Driver Licence Pathways', type: 'Road Police', area: 'Wellington - Kapiti Mana Area', summary: 'Helps people get their learner, restricted and full licences. Suitable for those issued a notice with 56 days compliance.', cond: 'Must hold or be eligible for a licence.' },
    { id: 'S9', name: 'Sexual Health Clinic (Demo)', type: 'Sexual Health', area: 'Wellington - Wellington Area', summary: 'Free confidential sexual health services.', cond: 'None.' },
    { id: 'S10', name: 'Hutt Valley Budget Service', type: 'Family Wellbeing', area: 'Wellington - Hutt Valley Area', summary: 'Free financial mentoring for whānau.', cond: 'None.' },
  ];

  /* -------------------------------------------------------------- CARD events */
  D.cardEvents = [
    { no: 'P012345678', code: '5F', addr: '123 BLUE STREET, THORNDON, WELLINGTON', loc: 'L1', mins: 42 },
    { no: 'P123456789', code: '1C', addr: 'MOLESWORTH STREET, THORNDON, WELLINGTON CITY', loc: 'L2', mins: 75 },
    { no: 'P012345699', code: '1V', addr: 'JACKSON STREET, PETONE, LOWER HUTT', loc: 'L5', mins: 130 },
    { no: 'P012345710', code: '3T', addr: 'PAREMATA HAYWARDS ROAD, WHITBY, PORIRUA', loc: 'L4', mins: 190 },
  ];

  /* ------------------------------------------------------------ seed records */
  const alertNames = {
    SAFETY: ['Uses or Carries Knife / Other Weapon', 'Violent Towards Police', 'Mental Health - Risk to Self'],
    ACTION: ['Breaches Police Bail', 'Locate and Advise', 'Arrest - Warrant to Arrest'],
    FLAGS: ['Drug User', 'Photo Driver Licence Card Cancelled', 'Gang Associate'],
    PLANS: ['Family Violence Involvement', 'Safety Plan in Place'],
    ORDERS: ['Protection Order - Respondent', 'Trespass Notice'],
  };
  const mkAlerts = (cats, seed) => {
    const r = OD.rng('al' + seed); const out = [];
    cats.forEach((c) => { const pool = alertNames[c] || []; const n = c === 'FLAGS' ? 2 : 1; for (let i = 0; i < n && i < pool.length; i++) out.push({ cat: c, t: pool[(i + Math.floor(r() * pool.length)) % pool.length], n: 1 + Math.floor(r() * 3), start: F.dmy('20' + (15 + Math.floor(r() * 7)) + '-0' + (1 + Math.floor(r() * 9)) + '-1' + Math.floor(r() * 9)) }); });
    return out;
  };
  D.mkAlerts = mkAlerts;

  const P = (id, sn, gn, g, dob, prn, addr, alerts, extra = {}) => ({ id, sn, gn, g, dob, prn, addr, alerts, addrType: 'Home Address', dl: 'DL' + prn.slice(2), nzta: true, ...extra });
  const seedPersons = () => {
    const ps = [
      P('P1', 'WILLIAMS', 'TIM STEPHEN', 'Male', '2001-04-13', 'AB123456', '123 Blue Street, Thorndon, Wellington 6011', ['SAFETY', 'ACTION', 'FLAGS', 'PLANS', 'ORDERS'], { bail: ['B1', 'B2'], wta: 'W4', safvr: 'Moderate', phone: '021 123 456', height: '178cm', build: 'Medium', hair: 'Brown', eyes: 'Brown', eth: 'NZ European', interacted: true, awhiHistory: true }),
      P('P2', 'WILLIAMS', 'TIM TIPENE', 'Male', '2001-04-13', 'AB123457', '123 Blue Street, Thorndon, Wellington 6011', ['FLAGS']),
      P('P3', 'WILLIAMS', 'TIMOTHY', 'Male', '2001-04-13', 'AB123458', '123 Blue Street, Thorndon, Wellington 6011', ['ACTION', 'ORDERS']),
      P('P4', 'WILLIAMS', 'TIMM STEVEN', 'Male', '1985-04-13', 'AA123456', '321 Blue Street, Thorndon, Wellington 6011', ['FLAGS']),
      P('P5', 'WILLIAMS', 'KARA MIKA', 'Female', '1983-04-13', 'AA123459', '321 Blue Street, Thorndon, Wellington 6011', ['SAFETY', 'ACTION', 'FLAGS', 'PLANS', 'ORDERS'], { safvr: 'Low', vhs: 'High' }),
      P('P6', 'WILLIAMS', 'ELLIE MIRANDA', 'Female', '2013-02-08', 'AA123460', '321 Blue Street, Thorndon, Wellington 6011', ['ACTION', 'FLAGS'], { safvr: 'Low' }),
      P('P7', 'ABBOT', 'MICHAEL', 'Male', '1990-07-01', 'AC220011', '775 Green Road, Thorndon, Wellington 6011', ['SAFETY', 'ACTION', 'PLANS'], { wta: 'W1' }),
      P('P8', 'JOYCE', 'FRANK', 'Male', '1978-12-17', 'AC220012', '341 Navy Place, Thorndon, Wellington 6011', ['SAFETY'], { wta: 'W2' }),
      P('P9', 'SMITH', 'CARL', 'Male', '1995-03-09', 'AC220013', '789 Yellow Street, Thorndon, Wellington 6011', ['FLAGS'], { wta: 'W3' }),
      P('P10', 'TAYLOR', 'JAMES ROBERT', 'Male', '1999-10-22', 'AD330021', '14 Harbour View Road, Kelburn, Wellington 6012', ['ACTION', 'FLAGS'], { bail: ['B3'] }),
      P('P11', 'NGATA', 'RAWIRI', 'Male', '1992-05-30', 'AD330022', '8 Totara Lane, Newtown, Wellington 6021', ['PLANS'], { bail: ['B4'] }),
      P('P12', 'KING', 'AROHA LEE', 'Female', '1997-01-11', 'AD330023', '52 Karaka Street, Mount Cook, Wellington 6021', ['SAFETY', 'FLAGS'], { bail: ['B5'] }),
      P('P13', 'BROWN', 'LIAM JOSEPH', 'Male', '2003-08-19', 'AD330024', '9 Rimu Road, Aro Valley, Wellington 6021', ['ACTION'], { bail: ['B6'] }),
      P('P14', 'SMITH', 'JOHN PAUL', 'Male', '1988-06-02', 'AE440031', '11 Kowhai Crescent, Porirua 5022', []),
    ];
    const out = {};
    ps.forEach((p) => { p.alertList = mkAlerts(p.alerts, p.id); p.expired = 10 + (p.id.length * 7) % 35; out[p.id] = p; });
    out.P1.alertList = [
      { cat: 'SAFETY', t: 'Uses or Carries Knife / Other Weapon', n: 1, start: '12/03/2019' },
      { cat: 'ACTION', t: 'Breaches Police Bail', n: 1, start: '02/02/2021' },
      { cat: 'FLAGS', t: 'Drug User', n: 2, start: '19/11/2018' },
      { cat: 'FLAGS', t: 'Photo Driver Licence Card Cancelled', n: 1, start: '05/05/2020' },
      { cat: 'PLANS', t: 'Family Violence Involvement', n: 1, start: '14/08/2020' },
      { cat: 'ORDERS', t: 'Protection Order - Respondent', n: 1, start: '30/09/2020' },
    ];
    out.P1.expired = 40;
    out.P1.aliases = ['WILLIAMS, TIMOTHY STEPHEN', 'WILLIAMS, TIM'];
    out.P1.marks = [{ type: 'Tattoo', loc: 'Left arm', desc: 'Koru design, black ink, approx 10cm' }, { type: 'Scar', loc: 'Face', desc: 'Small scar above right eyebrow' }];
    return out;
  };

  const V = (id, rego, make, model, colour, body, extra = {}) => ({ id, rego, make, model, colour, body, vin: '123456789000', year: 2001, alerts: [], regExp: '2023-11-30', wofExp: '2023-06-05', ...extra });
  const seedVehicles = () => {
    const vs = [
      V('V1', 'ABC123', 'Ford', 'Falcon AUIII XR6 4FA', 'Red', 'Hatchback Car', { hex: '#e8352d', alerts: ['SAFETY', 'ACTION', 'FLAGS', 'ORDERS'], owner: 'P1', year: 2001 }),
      V('V2', 'ABC123', 'Mazda', 'Demio', 'White', 'Coupe Car', { hex: '#fff', outline: true, alerts: ['ACTION', 'ORDERS'], owner: 'P3', year: 2004 }),
      V('V3', 'ABC123', '', '', '', 'Plate Only', { plateOnly: true, alerts: ['ACTION'] }),
      V('V4', 'XR64FA', 'Holden', 'VX COMMODORE', 'Blue', 'Car/Wagon', { hex: '#2f6fd6', alerts: ['ORDERS'], owner: 'P1', year: 2001 }),
      V('V5', 'LFT682', 'Toyota', 'Corolla', 'Silver', 'Sedan', { hex: '#b8bec6', owner: 'P14', year: 2012 }),
      V('V6', 'KRA55', 'Nissan', 'Tiida', 'Grey', 'Hatchback Car', { hex: '#7d858f', owner: 'P5', year: 2009 }),
    ];
    return Object.fromEntries(vs.map((v) => [v.id, v]));
  };

  const Lc = (id, addr, type, alerts, x, y, extra = {}) => ({ id, addr, type, alerts, x, y, ...extra });
  const seedLocations = () => {
    const ls = [
      Lc('L1', '123 BLUE STREET, THORNDON, WELLINGTON 6011', 'Residential', ['SAFETY', 'FLAGS'], 48, 44, { occupants: ['P1', 'P2', 'P3'], fh: 19 }),
      Lc('L2', 'MOLESWORTH STREET, THORNDON, WELLINGTON CITY', 'Street', [], 55, 30),
      Lc('L3', '42 MOLESWORTH STREET, THORNDON, WELLINGTON CITY 6011', 'Commercial', [], 58, 36),
      Lc('L4', 'PAREMATA HAYWARDS ROAD, WHITBY, PORIRUA', 'Street', [], 20, 12),
      Lc('L5', 'JACKSON STREET, PETONE, LOWER HUTT', 'Street', [], 80, 18),
      Lc('L6', '321 BLUE STREET, THORNDON, WELLINGTON 6011', 'Residential', ['PLANS'], 42, 52, { occupants: ['P4', 'P5', 'P6'], fh: 4 }),
      Lc('L7', '775 GREEN ROAD, THORNDON, WELLINGTON 6011', 'Residential', ['SAFETY'], 30, 62, { occupants: ['P7'] }),
      Lc('L8', '341 NAVY PLACE, THORNDON, WELLINGTON 6011', 'Residential', [], 68, 58, { occupants: ['P8'] }),
      Lc('L9', '789 YELLOW STREET, THORNDON, WELLINGTON 6011', 'Residential', ['FLAGS'], 36, 74, { occupants: ['P9'] }),
      Lc('L10', 'LEVEL 9, 42 MOLESWORTH STREET, THORNDON, WELLINGTON CITY 6011', 'Commercial', [], 60, 34),
      Lc('L11', 'THORNDON QUAY / MULGRAVE STREET INTERSECTION, WELLINGTON', 'Intersection', [], 72, 26),
      Lc('L12', '14 HARBOUR VIEW ROAD, KELBURN, WELLINGTON 6012', 'Residential', [], 24, 40, { occupants: ['P10'] }),
      Lc('L13', '8 TOTARA LANE, NEWTOWN, WELLINGTON 6021', 'Residential', [], 62, 80, { occupants: ['P11'] }),
      Lc('L14', 'ST MARKS CHURCH, 2 WOODWARD STREET, WELLINGTON (demo)', 'Place of Worship', [], 50, 22),
      Lc('L15', 'THORNDON SCHOOL (demo), 20 TURNBULL STREET, WELLINGTON', 'Education', [], 40, 18),
    ];
    return Object.fromEntries(ls.map((l) => [l.id, l]));
  };

  const seedOccurrences = (now) => {
    const occ = [
      { id: 'O1', no: '210531/2803', code: '1C', desc: 'Car/Person Acting Suspiciously', date: '31/05/2021 08:00:00', reported: '31/05/2021 08:01:00', channel: 'Phone', scene: 'Waitangirua', repStn: 'PNHQ', subject: 'Offence Report (OnDuty recorded)', loc: 'L1', recordId: '1234000065678', docloc: '123456/7890', card: 'P012345678', narrative: 'Created by ABCD01 25/06/2021 08:04\nInformant reported a male acting suspiciously near parked vehicles. Area searched with negative result.', assigned: '31/05/2021 - 13:34', unread: true, persons: ['P1'] },
      { id: 'O2', no: '210210/1707', code: '1V', desc: 'Vehicle Collision', date: '10/02/2021 09:40:00', reported: '10/02/2021 09:45:00', channel: '111 Call', scene: 'Wellington Central', repStn: 'Wellington Central', subject: 'Traffic Crash Report (OnDuty recorded)', loc: 'L1', recordId: '1234000061234', docloc: '123456/7891', card: 'P012300001', narrative: 'Two vehicle non-injury crash. Details exchanged.', assigned: '10/02/2021 - 10:15', unread: true, persons: ['P1', 'P14'] },
      { id: 'O3', no: '201105/0331', code: '4951', desc: 'Sell, transfer or make available false document and 1 other', date: '05/11/2020 19:10:00', reported: '05/11/2020 19:30:00', channel: 'Front Counter', scene: 'Wellington Central', repStn: 'Wellington Central', subject: 'False documents', loc: 'L1', recordId: '1234000059990', docloc: '123456/7892', card: 'P011100002', narrative: 'Complainant reports being sold a vehicle with a falsified registration document.', assigned: '05/11/2020 - 20:16', unread: true, persons: ['P3'] },
      { id: 'O4', no: '220909/1200', code: '1Z', desc: 'Other Incident', date: '09/09/2022 12:00:00', reported: '09/09/2022 12:00:15', channel: 'Officer - discovered', scene: 'Wellington', repStn: 'Wellington', subject: 'General occurrence', loc: 'L1', recordId: '288100912345', docloc: '123456/7890', card: 'P000000123', narrative: '', persons: ['P1'] },
    ];
    const fh = ['220331/1128', '220112/2210', '211018/0405', '210722/1930', '210301/2255'].map((no, i) => ({ id: 'OF' + i, no, code: '5F', desc: 'Family Harm', date: `${no.slice(4, 6)}/${no.slice(2, 4)}/20${no.slice(0, 2)} ${no.slice(7, 9)}:${no.slice(9, 11)}:00`, reported: '', channel: '111 Call', scene: 'Wellington Central', repStn: 'Wellington Central', subject: 'Family Harm Investigation', loc: 'L1', recordId: '12340000' + (70000 + i), docloc: '1234' + (50 + i) + '/78' + (10 + i), card: 'P0123' + (40000 + i), narrative: 'Family harm episode at address. Parties spoken to separately. Safety plan completed.', fh: true, persons: ['P1', 'P5'] }));
    return Object.fromEntries([...occ, ...fh].map((o) => [o.id, o]));
  };

  const seedBail = (now) => ({
    B1: { id: 'B1', pid: 'P1', loc: 'L1', addr: '123 Blue Street, Thorndon, Wellington 6011', curfew: true, verified: true, lastCheck: now - 7 * DAY, status: 'grey', priority: true, conditions: ['Reside at 123 Blue Street, Thorndon, Wellington on MonTueWedThuFriSatSun', 'Curfew to remain at 123 Blue Street, Thorndon between the hours of 2100 and 0700 on MonTueWedThuFriSatSun and to present self at door if called upon by Police', 'Not to go or be found within 1K of the address of Walmart Wellington (demo)'], nextHearing: '10/06/2021 (278 days)', court: 'Christchurch', crime: 'Violence', station: 'Papanui', risk: 'High', x: 48, y: 44 },
    B2: { id: 'B2', pid: 'P1', loc: 'L1', addr: '123 Blue Street, Thorndon, Wellington 6011', curfew: false, verified: true, lastCheck: null, status: 'black', conditions: ['Not to associate with any co-defendant', 'Report to Wellington Central Police Station every Monday'], nextHearing: '22/07/2021', court: 'Wellington', crime: 'Burglary', station: 'Wellington Central', risk: 'Medium', x: 48, y: 44, hidden: true },
    B3: { id: 'B3', pid: 'P10', loc: 'L12', addr: '14 Harbour View Road, Kelburn, Wellington 6012', curfew: true, verified: true, lastCheck: now - 70 * MIN, status: 'green', conditions: ['Curfew to remain at 14 Harbour View Road between 2000 and 0600 daily', 'Not to consume alcohol'], nextHearing: '12/12/2022', court: 'Wellington', crime: 'Vehicle', station: 'Wellington Central', risk: 'Low', x: 24, y: 40 },
    B4: { id: 'B4', pid: 'P11', loc: 'L13', addr: '8 Totara Lane, Newtown, Wellington 6021', curfew: false, verified: true, lastCheck: now - 20 * HOUR, status: 'lgrey', conditions: ['Reside at 8 Totara Lane, Newtown', 'Not to contact complainant'], nextHearing: '03/11/2022', court: 'Wellington', crime: 'Drugs', station: 'Newtown', risk: 'Medium', x: 62, y: 80 },
    B5: { id: 'B5', pid: 'P12', loc: null, addr: '52 Karaka Street, Mount Cook, Wellington 6021', curfew: true, verified: false, lastCheck: now - 3 * HOUR, status: 'red', breach: true, conditions: ['Curfew to remain at 52 Karaka Street between 1900 and 0700 daily'], nextHearing: '28/10/2022', court: 'Wellington', crime: 'Burglary', station: 'Wellington Central', risk: 'High', x: 52, y: 66 },
    B6: { id: 'B6', pid: 'P13', loc: null, addr: '9 Rimu Road, Aro Valley, Wellington 6021', curfew: false, verified: true, lastCheck: null, status: 'black', conditions: ['Reside at 9 Rimu Road, Aro Valley', 'Not to drive a motor vehicle'], nextHearing: '15/11/2022', court: 'Porirua', crime: 'Vehicle', station: 'Wellington Central', risk: 'Low', x: 30, y: 50 },
  });
  const seedWta = () => ({
    W1: { id: 'W1', pid: 'P7', no: '8521608540', offence: '3521 - Failure To Answer District Court Bail', issued: '01/07/2022', court: 'Wellington District Court', contact: '+64 21 000 1111', x: 30, y: 62, comments: [{ by: 'DHC142', ts: '12/09/2022 - 09:10', text: 'Attended address, occupants advise he is working out of town.' }] },
    W2: { id: 'W2', pid: 'P8', no: '8521608541', offence: '7191 - Failure To Answer District Court Bail', issued: '12/07/2022', court: 'Wellington District Court', contact: '+64 22 000 2222', x: 68, y: 58, comments: [] },
    W3: { id: 'W3', pid: 'P9', no: '8521608542', offence: '3871 - Contravenes Protection Order', issued: '09/08/2022', court: 'Porirua District Court', contact: '+64 27 000 3333', x: 36, y: 74, comments: [] },
    W4: { id: 'W4', pid: 'P1', no: '8521608543', offence: '7191 - Failure To Answer District Court Bail', issued: '29/04/2022 - 10:00', court: 'Auckland District Court', contact: '+64 210 9874654', x: 48, y: 44, comments: [{ by: 'DHC142', ts: '22/09/2022 - 12:09', text: 'HCTA will be back home tomorrow (9th Oct).' }] },
  });

  const seedTasks = (now) => {
    const T = (id, district, title, type, dueIn, status, extra = {}) => ({ id, district, title, type, due: now + dueIn, status, by: 'TTT123', to: 'ABCD01', priority: 'Medium', file: '22' + id.slice(1).padStart(4, '0') + '/7' + id.slice(1), detail: '', actions: [], delegates: ['ABC012', 'MPL310'], attachments: ['Attachment 1.docx'], ...extra });
    return Object.fromEntries([
      T('T1', 'Southern', 'Serve summons - WILLIAMS, TIM STEPHEN', 'Summons Service', -5 * HOUR, 'In Progress', { priority: 'High', detail: 'Serve summons at the home address. If not located, leave a card and update the task with the time of attendance.', actions: [{ by: 'ABC012', ts: now - 30 * HOUR, text: 'Attended address 1930 hrs, no answer. Card left.', status: 'In Progress' }] }),
      T('T2', 'Southern', 'Obtain statement from witness (demo)', 'Enquiry', 10 * HOUR, 'Not Started', { detail: 'Witness to the 1C event on Molesworth Street has called back and is available after 1600 hrs.' }),
      T('T3', 'Southern', 'Canvass CCTV - Blue Street', 'Enquiry', 20 * HOUR, 'Not Started', { detail: 'Identify and request CCTV footage from premises on Blue Street between 0100 and 0400 hrs.', attachments: ['Area map.pdf', 'FLINT - Blue Street.pdf'] }),
      T('T4', 'Southern', 'Bail check - TAYLOR, JAMES ROBERT', 'Bail Check', 3 * DAY, 'Not Started', { priority: 'Low', detail: 'Complete curfew check and record outcome in OnDuty Bail.' }),
      T('T5', 'Southern', 'Return property to owner', 'Property', 5 * DAY, 'Awaiting Response', { priority: 'Low', detail: 'Contact owner to arrange return of found property (bicycle).', attachments: ['Photo 1.jpg'] }),
      T('T6', 'Wellington', 'Follow up family harm referral', 'Family Harm', 26 * HOUR, 'Not Started', { detail: 'Confirm referral was received by service provider and update NIA.' }),
      T('T7', 'Wellington', 'Locate and advise - SMITH, CARL', 'Locate', -26 * HOUR, 'In Progress', { priority: 'High', detail: 'Locate and advise of court date.' }),
    ].map((t) => [t.id, t]));
  };

  /* ---------------------------------------------------------------- seed
     By default this produces a genuinely empty install: no officers, no
     accounts, no cases – log in via the in-app login to create the first
     (admin) account. Pass {sample:true} (only ever done via an explicit
     "Load sample data" action) to additionally load the fictional roster
     and case data below, for exploring every screen. */
  OD.seed = (opts = {}) => {
    const now = Date.now();
    const db = {
      v: 1, offline: false, created: now,
      session: null,
      me: { qid: '', name: '' },
      settings: {
        boundary: 'District', boundaryName: '', district: '', scene: '', reporting: '',
        supervisor: '', authOfficer: '', callSign: '',
        vehicles: [],
        defaultVehicle: null,
      },
      officers: [],
      persons: {}, vehicles: {}, locations: {}, occurrences: {},
      orgs: {},
      items: {},
      bail: {}, wta: {},
      tasks: {}, taskDistrict: 'Wellington', tasksUpdated: now,
      queries: [], folders: [], home: [], paperwork: {},
      pinnedOffences: [],
      audit: [], bookmarks: [], cardEvents: [],
      homeFilter: { days: 1, owner: 'Mine', hidden: false, types: ['Folders', 'QP', 'QV', 'QL', 'QO', 'QI', 'Objects'] },
      lastUsed: [],
      caseRead: {},
    };
    OD.db = db;
    if (opts.sample) {
      OD.seeding = true;
      try {
        Object.assign(db, {
          settings: {
            boundary: 'District', boundaryName: 'Wellington Central, Wellington', district: 'Wellington', scene: 'Wellington Central', reporting: 'Wellington Central',
            supervisor: 'TTT123 - Sergeant T. Taylor', authOfficer: 'KWCA02 - Sergeant K. Walker', callSign: 'WN10',
            vehicles: [
              { id: 'pv1', rego: 'AAA111', type: 'Marked', speed: ['Laser', 'Speedo'], breath: [{ id: 'bd1', device: 'Drager 7510NZ', serial: '223456', cal: '2026-01-01' }] },
              { id: 'pv2', rego: 'BBB222', type: 'Marked', speed: [], breath: [] },
              { id: 'pv3', rego: 'CCC333', type: 'Marked', speed: ['Laser', 'Speedo'], breath: [] },
              { id: 'pv4', rego: 'DDD444', type: 'Unmarked', speed: ['Laser'], breath: [] },
              { id: 'pv5', rego: 'EEEFFF', type: 'Marked', speed: ['Laser'], breath: [] },
            ],
            defaultVehicle: 'pv1',
          },
          officers: OD.clone(D.officers),
          persons: seedPersons(), vehicles: seedVehicles(), locations: seedLocations(), occurrences: seedOccurrences(now),
          orgs: {
            G1: { id: 'G1', name: 'BLUE STREET MOTORS LIMITED', cat: 'Business', type: 'Car dealer', addr: '12 Blue Street, Thorndon, Wellington 6011', alerts: [] },
            G2: { id: 'G2', name: 'HARBOUR FREIGHT (DEMO) LTD', cat: 'Business', type: 'Transport operator', addr: '5 Wharf Road, Wellington 6011', alerts: ['FLAGS'], tsl: 'TSL123456' },
            G3: { id: 'G3', name: 'ST MARKS CHURCH (DEMO)', cat: 'Other', type: 'Place of Worship', addr: '2 Woodward Street, Wellington', alerts: [] },
            G4: { id: 'G4', name: 'THORNDON SCHOOL (DEMO)', cat: 'Other', type: 'School', addr: '20 Turnbull Street, Wellington', alerts: [] },
            G5: { id: 'G5', name: 'CAPITAL PISTOL CLUB (DEMO)', cat: 'Club', type: 'Gun Club / Range', addr: '1 Range Road, Wellington', alerts: [] },
          },
          bail: seedBail(now), wta: seedWta(),
          tasks: seedTasks(now), taskDistrict: 'Southern',
          pinnedOffences: ['E975', 'E979', 'C101', 'L452', 'F201'],
          cardEvents: OD.clone(D.cardEvents),
          lastUsed: ['PoW', 'PoE', 'GCR'],
        });
        OD.seedActivity && OD.seedActivity(now);
        const me = db.officers.find((o) => o.qid === 'ABCD01') || db.officers[0];
        if (me) { db.session = me.qid; db.me = { qid: me.qid, name: me.name }; }
      } finally { OD.seeding = false; }
    }
    return db;
  };

  /* ================================================================ ACCESSORS */
  OD.person = (id) => OD.db.persons[id];
  OD.vehicle = (id) => OD.db.vehicles[id];
  OD.location = (id) => OD.db.locations[id];
  OD.org = (id) => OD.db.orgs[id];
  OD.item = (id) => OD.db.items[id];
  OD.occ = (id) => OD.db.occurrences[id];
  OD.fullName = (p) => (p ? `${p.sn}, ${p.gn}` : '');
  OD.shortName = (p) => (p ? `${p.sn}, ${p.gn.split(' ')[0]}` : '');
  OD.personLine = (p) => (p ? `${F.dmy(p.dob)} (${F.age(p.dob)}) | ${p.prn}` : '');
  OD.officer = (qid) => OD.db.officers.find((o) => o.qid === qid);
  OD.objTitle = (t, id) => {
    if (t === 'person') return OD.fullName(OD.person(id));
    if (t === 'vehicle') { const v = OD.vehicle(id); return v ? `${v.rego} ${v.make} ${v.model}`.trim() : ''; }
    if (t === 'location') return OD.location(id)?.addr || '';
    if (t === 'org') return OD.org(id)?.name || '';
    if (t === 'item') return OD.item(id)?.ident || '';
    if (t === 'occ') return OD.occ(id)?.no || '';
    return '';
  };

  /* ================================================================ GENERATORS */
  const GN_M = ['TIM', 'TIMOTHY', 'TIMM', 'TAMA', 'TE RANGI', 'THOMAS', 'TOBY', 'TYLER', 'JAMES', 'JOHN', 'JACK', 'LIAM', 'NOAH', 'OLIVER', 'MANAIA', 'NIKO', 'SAM', 'RYAN', 'DANIEL', 'MICHAEL', 'WIREMU', 'HEMI', 'ARI', 'LUKE', 'BEN'];
  const GN_F = ['TIA', 'TINA', 'TIANA', 'TAYLA', 'KARA', 'ELLIE', 'AROHA', 'MERE', 'SARAH', 'EMMA', 'OLIVIA', 'AMELIA', 'ISLA', 'CHARLOTTE', 'HANA', 'MAIA', 'GRACE', 'RUBY', 'ZOE', 'LILY'];
  const MIDS = ['STEPHEN', 'TIPENE', 'JAMES', 'ROBERT', 'MICHAEL', 'JOHN', 'PAUL', 'ANDREW', 'MARIE', 'LEE', 'ROSE', 'ANNE', 'MIKA', 'KAHU', 'DAVID'];
  const STREETS = ['Blue Street', 'Green Road', 'Navy Place', 'Yellow Street', 'Harbour View Road', 'Totara Lane', 'Karaka Street', 'Rimu Road', 'Kowhai Crescent', 'Matai Street', 'Pohutukawa Drive', 'Rata Street'];
  const SUBURBS = [['Thorndon', 'Wellington', '6011'], ['Newtown', 'Wellington', '6021'], ['Kelburn', 'Wellington', '6012'], ['Porirua', 'Porirua', '5022'], ['Petone', 'Lower Hutt', '5012'], ['Johnsonville', 'Wellington', '6037'], ['Karori', 'Wellington', '6012']];
  const randAddr = (r) => { const s = OD.pick(r, SUBURBS); return `${1 + Math.floor(r() * 400)} ${OD.pick(r, STREETS)}, ${s[0]}, ${s[1]} ${s[2]}`; };
  const randDob = (r, age) => { const y = new Date().getFullYear() - (age ?? 16 + Math.floor(r() * 50)); return `${y}-${String(1 + Math.floor(r() * 12)).padStart(2, '0')}-${String(1 + Math.floor(r() * 28)).padStart(2, '0')}`; };
  const randAlerts = (r) => ['SAFETY', 'ACTION', 'FLAGS', 'PLANS', 'ORDERS'].filter(() => r() > 0.65);
  const hash = (s) => { let h = 0; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h).toString(36); };

  OD.gen = {};
  OD.gen.parseName = (raw) => {
    const s = String(raw || '').toUpperCase().trim();
    if (!s) return { sn: '', gn: '' };
    let parts;
    if (s.includes(',')) parts = s.split(',');
    else if (s.includes('.')) parts = s.split('.');
    else if (/\s{2,}/.test(s)) parts = s.split(/\s{2,}/);
    else parts = [s.split(/\s+/)[0], s.split(/\s+/).slice(1).join(' ')];
    return { sn: parts[0].trim(), gn: (parts[1] || '').trim() };
  };
  /** Person query – returns {ids, total} */
  OD.gen.qp = (c) => {
    const db = OD.db;
    const text = (c.name || c.nick || c.tsl || '').trim();
    const idLike = /^[A-Z]{2}\d{6}$/i.test(text) || /^\d{5,}$/.test(text);
    if (idLike) {
      const t = text.toUpperCase();
      const hit = Object.values(db.persons).find((p) => p.prn === t || p.dl === t);
      if (hit) return { ids: [hit.id], total: 1 };
      const r = OD.rng('id' + t);
      const g = r() > 0.5 ? 'Male' : 'Female';
      const id = 'G' + hash(t);
      if (!db.persons[id]) db.persons[id] = { id, sn: OD.pick(r, ['SMITH', 'NGATA', 'BROWN', 'TAYLOR', 'KING', 'WILSON']), gn: OD.pick(r, g === 'Male' ? GN_M : GN_F) + ' ' + OD.pick(r, MIDS), g, dob: randDob(r), prn: /^[A-Z]{2}\d{6}$/.test(t) ? t : 'AF' + t.slice(-6).padStart(6, '0'), addr: randAddr(r), addrType: 'Home Address', alerts: randAlerts(r), dl: 'DL' + t.slice(-6).padStart(6, '0'), nzta: true, gen: true };
      const p = db.persons[id]; p.alertList = D.mkAlerts(p.alerts, id); p.expired = Math.floor(r() * 20);
      return { ids: [id], total: 1 };
    }
    const { sn, gn } = OD.gen.parseName(text);
    const age = c.age && /^\d{1,3}$/.test(c.age) ? +c.age : null;
    const gender = c.gender === 'Male' || c.gender === 'Female' ? c.gender : null;
    const match = (p) => p.sn.startsWith(sn) && (!gn || p.gn.split(' ').some((x) => x.startsWith(gn.split(' ')[0])) || p.gn.startsWith(gn)) && (!gender || p.g === gender);
    const existing = Object.values(db.persons).filter((p) => !p.gen && match(p));
    const r = OD.rng('qp' + sn + gn + (age || '') + (gender || ''));
    const total = Math.max(existing.length, sn ? 5 + Math.floor(r() * 36) : 0);
    const ids = existing.sort((a, b) => (age ? Math.abs(F.age(a.dob) - age) - Math.abs(F.age(b.dob) - age) : 0)).map((p) => p.id);
    for (let i = ids.length; i < Math.min(total, 60); i++) {
      const g = gender || (r() > 0.4 ? 'Male' : 'Female');
      const pool = (g === 'Male' ? GN_M : GN_F).filter((n) => !gn || n.startsWith(gn.split(' ')[0].slice(0, 2)));
      const first = gn ? (r() > 0.5 && pool.length ? OD.pick(r, pool) : gn.split(' ')[0]) : OD.pick(r, g === 'Male' ? GN_M : GN_F);
      const id = 'G' + hash(sn + gn + i + (age || '') + (gender || ''));
      if (!db.persons[id]) {
        const a = age ? Math.max(12, age + Math.floor(r() * 7) - 3) : undefined;
        db.persons[id] = { id, sn, gn: `${first} ${OD.pick(r, MIDS)}`, g, dob: randDob(r, a), prn: 'A' + String.fromCharCode(65 + Math.floor(r() * 26)) + String(100000 + Math.floor(r() * 899999)), addr: randAddr(r), addrType: 'Home Address', alerts: randAlerts(r), nzta: r() > 0.3, gen: true };
        const p = db.persons[id]; p.dl = 'DL' + p.prn.slice(2); p.alertList = D.mkAlerts(p.alerts, id); p.expired = Math.floor(r() * 30);
      }
      ids.push(id);
    }
    return { ids, total };
  };
  /** Vehicle query */
  OD.gen.qv = (c) => {
    const db = OD.db;
    const t = String(c.value || '').toUpperCase().replace(/\s+/g, '');
    if (!t) return { ids: [], total: 0 };
    const field = { REGNO: 'rego', VIN: 'vin', 'Chassis No': 'chassis', 'Engine No': 'engine' }[c.by || 'REGNO'] || 'rego';
    if (t.includes('*')) {
      const re = new RegExp('^' + t.replace(/\*/g, '.*') + '$');
      const r = OD.rng('wild' + t + (c.make || '') + (c.colour || ''));
      const ids = Object.values(db.vehicles).filter((v) => re.test(v[field] || '')).map((v) => v.id);
      const n = 3 + Math.floor(r() * 5);
      for (let i = 0; i < n; i++) {
        const rego = t.replace(/\*/g, () => String.fromCharCode(65 + Math.floor(r() * 26)));
        const id = 'GV' + hash(t + i);
        if (!db.vehicles[id]) db.vehicles[id] = mkVehicle(id, rego, r, c);
        ids.push(id);
      }
      return { ids, total: ids.length };
    }
    const hits = Object.values(db.vehicles).filter((v) => (v[field] || '') === t);
    if (hits.length) return { ids: hits.map((v) => v.id), total: hits.length };
    const id = 'GV' + hash(field + t);
    if (!db.vehicles[id]) { const v = mkVehicle(id, field === 'rego' ? t : 'GEN' + t.slice(-3), OD.rng('v' + t), c); if (field !== 'rego') v[field] = t; db.vehicles[id] = v; }
    return { ids: [id], total: 1 };
  };
  const HEX = { Red: '#e8352d', Blue: '#2f6fd6', White: '#fff', Silver: '#b8bec6', Black: '#2a2a2a', Grey: '#7d858f', Green: '#2f8f4e', Yellow: '#f2c230', Maroon: '#7a1f2b', Gold: '#c9a13b' };
  const mkVehicle = (id, rego, r, c = {}) => {
    const make = c.make || OD.pick(r, L.makes);
    const colour = c.colour || OD.pick(r, Object.keys(HEX));
    const models = { Toyota: ['Corolla', 'Hilux', 'RAV4', 'Aqua'], Holden: ['Commodore', 'Colorado', 'Barina'], Ford: ['Falcon', 'Ranger', 'Focus'], Mazda: ['Demio', 'Axela', 'CX-5'], Nissan: ['Tiida', 'Navara', 'Leaf'], Honda: ['Fit', 'Civic', 'Odyssey'], Mitsubishi: ['Outlander', 'Triton', 'Lancer'], Subaru: ['Legacy', 'Impreza', 'Forester'], Suzuki: ['Swift', 'Vitara'], Hyundai: ['Tucson', 'i30'], Kia: ['Sportage', 'Rio'], Volkswagen: ['Golf', 'Polo', 'Amarok'] };
    return { id, rego, make, model: OD.pick(r, models[make] || ['Sedan']), colour, hex: HEX[colour], outline: colour === 'White', body: c.type || OD.pick(r, ['Sedan', 'Hatchback Car', 'Station Wagon', 'Utility', 'SUV']), year: 1998 + Math.floor(r() * 24), vin: 'JT' + String(Math.floor(r() * 1e12)).padStart(12, '0'), alerts: randAlerts(r).slice(0, 2), regExp: F.iso(new Date(Date.now() + (r() - 0.3) * 300 * DAY)), wofExp: F.iso(new Date(Date.now() + (r() - 0.3) * 300 * DAY)), gen: true };
  };
  /** Location query */
  OD.gen.ql = (c) => {
    const db = OD.db;
    const t = [c.quick, c.common, c.num && c.street ? `${c.num} ${c.street}` : c.street, c.st1 && c.st2 ? `${c.st1} / ${c.st2}` : ''].find((x) => x && x.trim()) || '';
    const q = t.toUpperCase().trim();
    if (!q) return { ids: [], total: 0 };
    const words = q.split(/[\s,/]+/).filter(Boolean);
    const hits = Object.values(db.locations).filter((l) => words.every((w) => l.addr.includes(w)));
    if (hits.length) return { ids: hits.map((l) => l.id), total: hits.length };
    const r = OD.rng('l' + q);
    const n = 1 + Math.floor(r() * 3);
    const ids = [];
    for (let i = 0; i < n; i++) {
      const id = 'GL' + hash(q + i);
      const s = OD.pick(r, SUBURBS);
      if (!db.locations[id]) db.locations[id] = { id, addr: (/^\d/.test(q) ? q : `${i ? (i * 7 + 3) + ' ' : ''}${q}`) + `, ${s[0].toUpperCase()}, ${s[1].toUpperCase()} ${s[2]}`, type: c.st1 ? 'Intersection' : 'Residential', alerts: r() > 0.7 ? ['FLAGS'] : [], x: 10 + r() * 80, y: 10 + r() * 80, gen: true };
      ids.push(id);
    }
    return { ids, total: ids.length };
  };
  OD.gen.qo = (c) => {
    const db = OD.db; const q = String(c.name || '').toUpperCase().trim();
    if (!q) return { ids: [], total: 0 };
    const hits = Object.values(db.orgs).filter((o) => o.name.includes(q) || o.tsl === q);
    if (hits.length) return { ids: hits.map((o) => o.id), total: hits.length };
    const r = OD.rng('o' + q); const ids = [];
    ['LIMITED', 'TRUST', 'HOLDINGS LTD'].slice(0, 1 + Math.floor(r() * 3)).forEach((suf, i) => { const id = 'GO' + hash(q + i); if (!db.orgs[id]) db.orgs[id] = { id, name: `${q} ${suf}`, cat: c.cat || 'Business', type: c.type || 'Company', addr: randAddr(r), alerts: r() > 0.7 ? ['FLAGS'] : [], gen: true }; ids.push(id); });
    return { ids, total: ids.length };
  };
  OD.gen.qi = (c) => {
    const db = OD.db; const q = String(c.ident || '').toUpperCase().trim();
    if (!q) return { ids: [], total: 0 };
    const id = 'GI' + hash(q + (c.cat || ''));
    const r = OD.rng('i' + q);
    if (!db.items[id]) db.items[id] = { id, ident: q, cat: c.cat || 'Other', desc: { Firearm: 'Rifle, bolt action (demo)', 'Electronic Device': 'Mobile phone, black (demo)', Bicycle: 'Mountain bike, red (demo)', Jewellery: 'Gold ring (demo)' }[c.cat] || 'Item (demo)', status: r() > 0.6 ? 'Reported Stolen' : 'No record of interest', stolenDate: F.dmy(F.iso(new Date(Date.now() - r() * 200 * DAY))), occ: r() > 0.6 ? 'O3' : null, gen: true };
    return { ids: [id], total: 1 };
  };

  /** Nearby locations for current GPS (fixed demo position) */
  OD.nearby = () => ['L3', 'L10', 'L2', 'L1', 'L11', 'L6'].map((id) => OD.db.locations[id]).filter(Boolean);
})();
