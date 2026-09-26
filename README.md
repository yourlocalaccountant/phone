# OnDuty – browser recreation

An interactive, click-through recreation of the NZ Police **OnDuty** iPhone app (and its companion **SAM** map app), rebuilt in plain HTML/CSS/JavaScript from the screenshots and procedures in the publicly released OIA response **IR-01-23-16062** ("OnDuty" user guides, June 2023).

> **Unofficial demo.** This project is not affiliated with or endorsed by New Zealand Police, and is not connected to any real Police system. No police crest or logo is used. Nothing is sent over the network – all state (including any account you create) lives in the browser's `localStorage`. It starts completely empty and stays that way until you put something in it: create your own accounts, and add persons/vehicles via **CAD › Records**. Nothing in this recreation is seeded, fabricated or auto-generated – a search that finds nothing just says so.

## Run it

No build step and no dependencies.

* **Open `index.html`** directly in a browser, **or**
* serve the folder, e.g. `php -S localhost:8000` or `npx serve .`, then open <http://localhost:8000>.

On a desktop the app is shown centred inside an iPhone frame. On a phone-sized screen it runs full-screen.

Every screen has its own URL (`#/od/<tab>/<screen>,<params>/…`, `#/sam/…`, `#/cad/…`), so the browser back/forward buttons, bookmarks and refresh all work.

## What's included

**Phone shell** – home screen with *OnDuty*, *OnDuty Edu* (Education build, pink icon + banner), *SAM* and *CAD*; iOS status bar; tap the home bar to go back to the home screen. Opening *OnDuty*, *SAM* or *CAD* asks you to create an **account** (name, email, password – the first account becomes an Admin); after that it's a normal email/password log in, stored only in this browser. Log out again from *More › Settings*.

**OnDuty tabs**

| Tab | Screens |
| --- | --- |
| Home | 24-hour activity list (folders, queries, viewed objects), swipe right to pin / left to hide, filter options (1–30 days, owner, hidden items, type), new folder, CARD-event folders with auto QL + FH occurrence delve, folder Take Action / share / rename |
| Queries | QP (quick entry / nickname / TSL, camera scan), QV (REGNO/VIN/chassis/engine, wildcard, 3T reason, location), QL (boundary, quick/common/street/intersection, nearby list + map), QO, QI (via **More**), background queries, results with Load More, swipe-to-Delve, person / vehicle / location / organisation / item / occurrence summaries, alerts, expired alerts, active bail + 5K + Action Bail, warrant to arrest, photos (Police/NZTA), external agency queries (INZ, DIA Passports, DIA Births), bookmark, Take Action |
| Tasks | district picker, colour-coded due times, task detail, previous actions, delegates, attachments, update task (offline sync pending) |
| Paperwork | Awaiting Approval / Returned / Incomplete / Completed lists, Take Action (search, recently used), type filter |
| Assigned | 30 most recent assigned cases, case summary, Update Narrative |
| More | Settings (account / log out, location boundary, stations, vehicles & equipment incl. speed and breath-test devices, supervisor, call sign), **Officers** – *Admin accounts only* (register / edit / remove officer accounts – email, password and an Admin/Officer role each – who then appear in every Supervisor / Authorising Officer / Call Sign / "Seized By" picker in the app), Support (Refresh / Wipe & Reload, notice numbers, reference data), Audit Log, LRT Offence Library (pin / reorder pinned offences, categories incl. Impaired Driving), CVIR Defect Library |

**Paperwork (19 types)** – each with its sections, sub-screens, blue/grey/red completion bars, *Review to Submit* validation, supervisor approval where required, and a "what happens next" confirmation:

Offence Report · Infringement Notice (INF create dialog, compliance / written warning / infringement resolutions, traffic / alcohol / overloading / drug-driving / COVID-19 notes, notice-number reveal & lock) · Noting · Family Harm (SAFVR, dynamic assessment with Officer/Guided view, safety plan, PSO, child protection referral, narrative sections) · Traffic Crash Report (crash location map, road conditions, vehicles with damage diagram, drivers/passengers, crash diagram editor) · EBA Procedure Sheet (passive → screening → accompany → evidential breath test → 10-minute blood option → blood test → charging decision → post-procedure admin, with rights read-aloud text) · Fleeing Driver Report · AWHI Referral (consent & privacy, service-provider search/filter, email preview) · CVIR · Health Referral – Drug Use · Property Form (items, chain of custody, verification, interested parties) · s118 Letter · Place of Worship / Education / Gun Club visits · Warrantless Search · Bail Check · Update Narrative · Update WTA.

Common paperwork features: CARD events, occurrence date/time wheels (with the *Date Picker* / *Time Picker* quick fill), location selection (search, GPS, nearby, folder, map), person/vehicle/organisation selection (from paperwork, folder, query history, or a QP/QV/QO query), create new objects, links (existing + new), photos (downscaled and stored locally), swipe-left to remove, "•••" menu (create Noting / AWHI / Warrantless Search / INF / similar, share folder, become reporting member, abandon EBA, delete), multi-user section ownership, offline queueing.

**Offence & legislation reference** – both offence libraries cite a real NZ Act (and, for well-known ones, section) alongside each offence: the LRT/infringement library (traffic, vehicle, driver licensing, alcohol, overloading, commercial vehicle – Land Transport Act 1998 / Road User Rule 2004 etc.) and the NIA incident/offence codes used in Offence Reports, Family Harm and similar (Crimes Act 1961, Summary Offences Act 1981, Misuse of Drugs Act 1975, Arms Act 1983, Family Violence Act 2018, Land Transport Act 1998, Harassment Act 1997, Bail Act 2000, COVID-19 Public Health Response Act 2020). This is reference content for the recreation, generated from general legal knowledge, not an authoritative or complete copy of Police's real LRT/NIA code tables – always check legislation.govt.nz for current wording.

**SAM** – map with Officers, Bail and WTA layers (status-coloured bail pins, clusters, filters for priority / curfew / crime type, WTA issued-date filter), bail and warrant drawers, nearby list with search, route, *Action Bail* (5K prompt) and *Action 2W* deep links into OnDuty with the ◀ SAM breadcrumb and "Today" tab.

**CAD** – a fictional, local-only computer-aided dispatch app with two tabs:

| Tab | Screens |
| --- | --- |
| Dispatch | Incident queue (type, address, priority, notes) and a unit roster (call sign, type, crew, vehicle, status). *Admin* accounts create incidents, register units and assign/dispatch a unit to an incident; any logged-in officer who's crew on a unit can update that unit's own status (Available / Dispatched / En Route / On Scene / Busy / Off Duty) – setting it back to Available clears it from its incident. Clearing an incident (Admin) frees all its units. |
| Records | Add Person / Add Vehicle – the only way persons and vehicles get into this recreation. Records added here are the same `OD.db.persons`/`OD.db.vehicles` that Query Person / Query Vehicle in OnDuty search, so anything you add is immediately queryable there. |

Not connected to any real Police or emergency dispatch system.

**Demo controls** (*More › Settings*) – toggle *Offline* (airplane mode; queries and submissions queue, then process when back online); *Erase all data* to wipe everything in this browser back to the empty starting state (you'll need to create a new account afterwards).

## Code layout

```
wrangler.jsonc       Cloudflare Workers Static Assets config (serves this folder as-is; no build step, no server code)
index.html          phone frame
css/app.css         iOS-style UI, frame, SAM, CAD, responsive rules
js/core.js          helpers, icons, avatars, storage, router (hash ⇄ nav stacks incl. sam/cad), overlays, gestures
js/data.js          option lists, offence/legislation libraries, real-record queries (no fabrication)
js/forms.js         declarative form engine, picker, person/vehicle cards
js/paperwork.js     paperwork engine, folders, Take Action, selectors, offence libraries, review/submit
js/pw-types.js      the 19 paperwork definitions
js/screens-home.js  Home tab, filter, folders
js/screens-query.js queries, results, summaries, maps, crash diagram, external agencies
js/screens-tabs.js  Tasks, Assigned, More, AWHI service picker
js/sam.js           SAM map app
js/cad.js           CAD app (Dispatch: units + incidents; Records: add persons/vehicles)
js/app.js           springboard, login gate, demo controls, boot
```

## Note on scope

This started from a public user-guide PDF, not from New Zealand Police's real systems, and it never will be connected to them. The login, accounts and Admin/Officer roles are a genuine (if simple) local feature – an email/password check and a roster you manage yourself – but they are still entirely local to your own browser: there's no server, no real credential, and no identity check against any real Police or government system. Nothing here verifies who anyone actually is, and it should never be mistaken for the genuine operational tool or used as if it were one.
