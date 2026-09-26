# OnDuty – browser recreation

An interactive, click-through recreation of the NZ Police **OnDuty** iPhone app (and its companion **SAM** map app), rebuilt in plain HTML/CSS/JavaScript from the screenshots and procedures in the publicly released OIA response **IR-01-23-16062** ("OnDuty" user guides, June 2023).

> **Unofficial demo.** This project is not affiliated with or endorsed by New Zealand Police, and is not connected to any real Police system. No police crest or logo is used. Nothing is sent over the network – all state (including any account you create) lives in the browser's `localStorage`. It starts completely empty; open **More › Settings** (or the side panel) to load fictional sample data instead, if you'd rather explore every screen pre-populated.

## Run it

No build step and no dependencies.

* **Open `index.html`** directly in a browser, **or**
* serve the folder, e.g. `php -S localhost:8000` or `npx serve .`, then open <http://localhost:8000>.

On a desktop the app is shown inside an iPhone frame with a **screen directory** on the left that deep-links to every screen. On a phone-sized screen it runs full-screen; tap the small tab on the left edge to open the directory.

Every screen has its own URL (`#/od/<tab>/<screen>,<params>/…`), so the browser back/forward buttons, bookmarks and refresh all work.

## What's included

**Phone shell** – home screen with *OnDuty*, *OnDuty Edu* (Education build, pink icon + banner) and *SAM*; iOS status bar; tap the home bar to go back to the home screen; a cosmetic **passcode lock screen** appears on every page load (any 4-digit code, or the SKIP button, unlocks it – for realism only, it is not real security and gates nothing outside this demo). Opening *OnDuty* or *SAM* for the first time asks you to create an **account** (name, email, password – the first account becomes an Admin); after that it's a normal email/password log in, stored only in this browser. Log out again from *More › Settings*.

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

**Demo controls** (side panel, or *More › Settings*) – toggle *Offline* (airplane mode; queries and submissions queue, then process when back online); *Load sample data* to wipe the browser and load a fictional account, roster, persons/vehicles/locations and in-progress cases so you can explore every screen (login `d.user@police.demo` / `demo1234`, an Admin account); *Erase all data* to wipe everything back to the empty starting state.

## Code layout

```
wrangler.jsonc       Cloudflare Workers Static Assets config (serves this folder as-is; no build step, no server code)
index.html          phone frame + side panel
css/app.css         iOS-style UI, frame, SAM, responsive rules
js/core.js          helpers, icons, avatars, storage, router (hash ⇄ nav stacks), overlays, gestures
js/data.js          option lists, offence libraries, fictional records, query generators
js/forms.js         declarative form engine, picker, person/vehicle cards
js/paperwork.js     paperwork engine, folders, Take Action, selectors, offence libraries, review/submit
js/pw-types.js      the 19 paperwork definitions + seed activity
js/screens-home.js  Home tab, filter, folders
js/screens-query.js queries, results, summaries, maps, crash diagram, external agencies
js/screens-tabs.js  Tasks, Assigned, More, AWHI service picker
js/sam.js           SAM map app
js/app.js           home screen, screen directory, demo controls, boot
```

## Note on scope

This started from a public user-guide PDF, not from New Zealand Police's real systems, and it never will be connected to them. The login, accounts and Admin/Officer roles are a genuine (if simple) local feature – an email/password check and a roster you manage yourself – but they are still entirely local to your own browser: there's no server, no real credential, and no identity check against any real Police or government system. Nothing here verifies who anyone actually is, and it should never be mistaken for the genuine operational tool or used as if it were one.
