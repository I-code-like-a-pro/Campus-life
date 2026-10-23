# Campus Life: Product & Technical Specification

**Status:** Draft v1.0 for owner review · **Scope:** take the current prototype to a public, live, scalable browser game.
**Priority tags:** **[P0]** required to launch · **[P1]** strongly wanted at launch · **[P2]** after launch.
Time estimates are planning figures for a small team (1 to 2 engineers, 1 designer, 1 to 2 artists, part-time QA/community), not promises.

---

## 1. Vision and positioning

**One-line pitch.** *Live the full Nigerian student story in your browser: from waiting for your JAMB result, to clearance and hostel life, to lectures, exams, hustles and friendships, all the way to graduation.*

**What makes this different from other campus/life games** (competitor facts below come from public posts the owner shared and are unverified):
- **The aspirant-to-graduate arc.** Almost no game starts at JAMB results. This is the emotional hook that every Nigerian recognises. **Keep and deepen it.**
- **Phone-first, no install.** Runs on mid-range Android over mobile data.
- **A real story, not only a sandbox.** Reported competitors (Lagos Life, UniLife) lean on a shared multiplayer world. Our edge is a rich single-player narrative first, with social features layered on top.
- **Authentic voice.** English with Pidgin, real campus landmarks, real campus problems (NEPA, sapa, handouts, ASUU).

**Design pillars**
1. **Familiar and funny.** Players should laugh and say "this is exactly my school".
2. **Every minute has a choice.** Time, money, energy and attention always trade off against each other.
3. **Phone-first.** One thumb, short sessions, instant resume.
4. **Fair, not pay-to-win.** Money buys style and convenience, never grades.
5. **Always something next.** A visible goal and a reason to come back tomorrow.

**Target players:** 15 to 30-year-old Nigerians (and diaspora), mobile-first, short sessions (5 to 15 minutes), often on limited data.

---

## 2. Current state (honest assessment)

**Built and working (about 2,900 lines of JavaScript, three.js + Vite, saves to the browser):**
three campuses (UNILAG, UI, OAU); needs and mood; naira economy basics; day/night; walk-in interiors (hostel, home, canteen, library, lecture hall, cyber cafe); JAMB aspirant journey with admission branching and retakes; home neighbourhood; NPC dialogue and a guide marker; bus journey and four-desk clearance; academics (timetable, lectures, study, assignments, CA, exams, 5.0 GPA, carryovers, graduation); student portal.

**Gaps that block a public launch**

| Area | Gap |
|---|---|
| Accounts & data | Saves live only in one browser. No accounts, no cloud save, no save versioning or migration. |
| Content depth | One semester loop is playable, but content is thin: 100-level questions only, 4 NPC types, no jobs, no social, no events, alerts switched off. |
| Art & audio | Placeholder box models, no sound, no animation polish, oversized floating signs on phones. |
| Onboarding | No tutorial; players must discover the goal pill and portal. |
| Retention | No daily goals, achievements, progression meta, or reasons to return. |
| Online | No backend, leaderboards, friends, chat, or moderation. |
| Quality | No automated tests, error tracking, analytics, performance profiling, or accessibility work. |
| Business | No monetisation, legal review (real university names), privacy policy, or support channel. |

---

## 3. Core loop and retention design

**Moment-to-moment (seconds):** walk, talk, enter, act, watch needs and money change.
**Session loop (5 to 15 min):** pick the next goal (class, study, hustle, hang out) → do it → see a reward (marks, naira, friendship, story beat) → plan the next.
**Daily loop:** a game day is about 12 real minutes. Players log in to (1) catch today's classes, (2) claim a daily reward, (3) progress a story thread or semester goal.
**Semester loop (about 70 real minutes):** attend → study → CA → exams → results → carryover drama → break → next semester.
**Meta loop:** years, degree class, achievements, titles, collections, unlocking campuses and cosmetics.

**Retention hooks (all [P0] unless noted)**
- Persistent **goal line** and **next-action prompts** (already started).
- **Daily rewards and streaks** (login reward, "Chop money" mini bonus).
- **Weekly challenges** ("attend every lecture", "earn ₦20,000 from hustles").
- **Story threads** (friend arcs, lecturer arcs, a campus mystery, a society election) with cliffhangers across semesters. [P1]
- **Push/PWA reminders** ("Exams hold tomorrow!") with strict opt-in and frequency caps. [P1]

---

## 4. Feature specification

Each feature has an ID, a short spec, and acceptance criteria (AC).

### 4.1 Accounts, onboarding and saves

| ID | Feature | Spec / AC |
|---|---|---|
| F-001 [P0] | Guest play | Play instantly with no signup. AC: new user reaches the first playable moment in under 30 seconds on a mid-range phone on 4G. |
| F-002 [P0] | Account upgrade | Link a guest save to an account (email magic link, Google sign-in; phone OTP via a Nigerian SMS provider [P1]). AC: no progress lost on upgrade; works across devices. |
| F-003 [P0] | Cloud save | Auto-save to server every 30 s and on key events; conflict resolution by last-write with a "keep this device / keep cloud" prompt. AC: playing on two devices never silently loses more than 30 s of progress. |
| F-004 [P0] | Save versioning | Every save carries `schemaVersion`; forward migrations are unit-tested. AC: a v1 save always loads in the newest build. |
| F-005 [P0] | Interactive tutorial | First 3 minutes teach movement, talk, enter, needs, goal line and portal as part of the story (Mama and Tobi guide). Skippable. AC: ≥85% of playtesters complete it without help. |
| F-006 [P0] | Character creator | Name, gender presentation, skin tone, hair, face, outfit; changeable later at a shop. Uses the final 3D asset set. AC: ≥30 combinations at launch; persists in saves. |
| F-007 [P0] | Settings | Sound, music, vibration, graphics quality (Low/Med/High), language (English / Pidgin labels), control size, left/right handed joystick, reduced motion, text size. |
| F-008 [P1] | Player profile | Public card: avatar, campus, course, level, CGPA, titles. |

### 4.2 Character, needs and wellbeing

| ID | Feature | Spec / AC |
|---|---|---|
| F-020 [P0] | Needs | Hunger, energy, fun, hygiene, stress (exists). Add **health** (sickness: malaria, typhoid, cold), **social** and **finances stress**. AC: each need has clear sources/sinks and visible effects on performance. |
| F-021 [P0] | Mood and status effects | Mood modifies study efficiency, exam score bonus/penalty and social outcomes. Status effects: sick, hungover, sleepless, inspired, broke. AC: a player can see why their mood changed. |
| F-022 [P1] | Traits and aspirations | At creation pick 2 traits (Bookworm, Hustler, Social Butterfly, Night Owl, Frugal). Each changes balance slightly. Aspirations ("Top of the class", "Campus celebrity", "Mogul") give long-term goals and rewards. |
| F-023 [P1] | Health system | Clinic and pharmacy. Illness mechanic with treatment cost and time. Unhealthy habits increase risk. |
| F-024 [P2] | Skills | Coding, public speaking, cooking, fitness, writing. Practise-and-level system; unlocks jobs and options. |

### 4.3 World and campuses

| ID | Feature | Spec / AC |
|---|---|---|
| F-040 [P0] | Three launch campuses | UNILAG, UI, OAU with distinct layouts, landmarks and ambience, built from reviewed reference (see Section 9 legal note). Each has hostels, lecture venues, library, canteens, field, gate, markets and a hangout spot. |
| F-041 [P0] | Final art pass | Replace placeholder geometry with a consistent low-poly stylised look. Budgets in Section 5. AC: reviewed by 10 players as "looks like a real game", not a prototype. |
| F-042 [P0] | Interiors | Hostel room, canteen, library, lecture halls, clinic, bank, bookshop, cyber cafe, chapel/mosque. All enterable with interactable props. |
| F-043 [P0] | Wayfinding | Minimap, tap-to-travel to a destination (auto-walk), guide marker (exists), and a campus map screen. |
| F-044 [P0] | Day/night, weather, seasons | Day/night (exists). Add rainy season, harmattan (haze, cold mornings), dry season. Seasons change visuals and gameplay (e.g., harmattan raises sickness chance). |
| F-045 [P1] | Off-campus world | Neighbourhood around each campus: off-campus lodges, market, restaurant row, motor park, bank. |
| F-046 [P1] | Transport | Okada, keke, danfo and campus shuttle with fares, time and random incidents. |
| F-047 [P2] | More campuses | Add 3 to 6 further universities and a polytechnic/college track after launch. |

### 4.4 Academics

Builds on the existing system.

| ID | Feature | Spec / AC |
|---|---|---|
| F-060 [P0] | Full curriculum | Real-feeling course catalogues for each launch course across all levels (100 to final year) with 4 to 6 courses per semester, units, prerequisites and electives. AC: no repeated codes/titles within a degree. |
| F-061 [P0] | Question banks at scale | ≥ 60 questions per course tag per level, tagged by difficulty and topic, plus rotating "past question" sets. AC: a player finishing a degree rarely sees the same question twice in one semester. Authored and reviewed by subject-matter reviewers. |
| F-062 [P0] | Lecturers as NPCs | Named lecturers with personalities (strict, funny, absent, generous). They appear in the hall, take attendance and give hints that affect marks. |
| F-063 [P0] | Assessment variety | Besides MCQ: short-answer and true/false CA, group assignment (with NPC groupmates), practical/lab sessions, project defence in final year. |
| F-064 [P0] | Academic standing | Probation (CGPA < 1.5), withdrawal, extra-year, spillover. Warnings before probation. |
| F-065 [P0] | Late/make-up rules | Make-up tests with a fee and difficulty penalty (honest route). **No exam cheating or "sorting" mechanics are copied from competitors.** |
| F-066 [P1] | Study groups and handouts | Join or form study groups (NPC or friends), buy handouts and past questions from the bookshop with real effects on prep. |
| F-067 [P1] | SIWES / industrial training | A dedicated term with a placement choice and logbook mini-activities. |
| F-068 [P1] | Final-year project | Pick a topic and supervisor, multi-week progress, defence. |
| F-069 [P1] | NYSC arc | After graduation: call-up, camp, posting and a service year with its own story. Ends the main campaign. |
| F-070 [P2] | Postgraduate track | Optional: MSc/PhD for long-term players. |

### 4.5 Economy

| ID | Feature | Spec / AC |
|---|---|---|
| F-080 [P0] | Income sources | Allowance (exists), part-time jobs (shop assistant, tutor, POS agent, laundry, canteen help), gigs (freelance, braiding, repairs), campus businesses (snacks, printing). Each has hours, pay, energy cost and skill needs. |
| F-081 [P0] | Expenses | Tuition and acceptance fees (exists), hostel rent, food, data and airtime, transport, clothes, handouts, events. A meaningful monthly budget. |
| F-082 [P0] | Bank and mobile money | Bank account, transfers to/from "Mum", savings goal, airtime/data purchase. Tracks balance history. |
| F-083 [P0] | "Sapa" mechanics | Running out of money has consequences and recovery paths (borrow from friends, small jobs), never a dead-end soft-lock. |
| F-084 [P1] | Loans and debt | Friend loans, student loans, interest, repayment, credit reputation. |
| F-085 [P1] | Businesses | Upgradeable stalls with stock, pricing and daily income. |
| F-086 [P1] | Scholarships | Merit and need-based awards with eligibility tied to CGPA and activity. |
| F-087 [P1] | Economic balance | Economy tuned so a diligent player can graduate comfortably, a careless one struggles, and money never becomes meaningless. Tracked by telemetry (Section 7). |

### 4.6 Housing and daily life

| ID | Feature | Spec / AC |
|---|---|---|
| F-100 [P0] | Hostel life | Allocated room (exists) with 2 to 6 roommates (NPCs) who have schedules and habits; room tasks (cleaning, laundry, cooking), curfew, inspections. |
| F-101 [P0] | Personal space | Own bed and locker; small decoration slots. |
| F-102 [P1] | Off-campus housing | Rent a lodge: higher cost, more freedom; landlords, light/water issues. |
| F-103 [P1] | Cooking | Buy foodstuff, cook, save money, risk of burning food. |
| F-104 [P1] | Decorating | Place furniture and posters bought from shops; showcase rooms to friends. |
| F-105 [P1] | Utilities | NEPA power cuts (mitigate with generators or power banks), water scarcity, data bundles. All driven by simulated conditions, **not random timers**. |

### 4.7 Social

| ID | Feature | Spec / AC |
|---|---|---|
| F-120 [P0] | NPC friendships | Every named NPC has a relationship meter built from conversations, gifts, shared activities and favours. |
| F-121 [P0] | Conversation system | Choice-based dialogue with outcomes (exists) extended with tone choices (funny, serious, flirty), relationship-gated options and consequences. |
| F-122 [P0] | Phone | In-game phone with messages, contacts, calendar, bank, camera/photos, map and social feed. |
| F-123 [P1] | Romance | Crushes, dates, relationships, breakups; opt-in, tasteful, age-appropriate. |
| F-124 [P1] | Clubs and societies | Join debate, drama, press, tech, entrepreneurship, religious groups. Activities, ranks and events. |
| F-125 [P1] | Student union politics | Campaign, election and in-office decisions. |
| F-126 [P1] | Parties and events | Hostel nights, concerts, owambe, matches, religious programmes with attendance rewards. |
| F-127 [P1] | Reputation | Academic, social and street reputation shape NPC reactions. |
| F-128 [P2] | Rivalries and pranks | Department vs department competitions. |

### 4.8 NPCs and AI

| ID | Feature | Spec / AC |
|---|---|---|
| F-140 [P0] | NPC schedules | NPCs have routines (lecturer teaches, vendor sells, student wanders, porter at desk) tied to the simulated time. |
| F-141 [P0] | Reactive dialogue | Lines depend on the player's state: grades, attendance, hunger, money, relationship, season. Large variation (≥ 30 lines per NPC archetype) to avoid repetition. |
| F-142 [P0] | Staff and vendors | Registrar, bursar, nurse, librarian, canteen vendors, shopkeepers, porters, security, lecturers (exist partly). |
| F-143 [P0] | Ambient crowd | 20 to 40 wandering students per campus (budgeted), reacting to events. |
| F-144 [P2] | AI-driven NPCs | Optional LLM-powered conversations for key characters via a secured backend (see Section 5.6), cost-capped, with scripted fallback. Not required for launch. |

### 4.9 Events and campus life

| ID | Feature | Spec / AC |
|---|---|---|
| F-160 [P0] | Condition-driven events | An event engine triggered by game state and calendar (not timers): lecturers' strike (ASUU), NEPA outage, rain, harmattan, results release, exam malpractice crackdown, fee increase protest, matriculation, convocation. Each has setup, choices and consequences. |
| F-161 [P0] | Alerts and notifications | Reinstate alerts (currently off) as a clean notification centre: non-blocking toasts for minor info, an inbox for important notices. Players can mute categories. |
| F-162 [P1] | Random micro-stories | Short chance encounters (borrow a pen, lost ID card, free food) with choices. |
| F-163 [P1] | Seasonal events | Resumption week, Christmas break, Independence Day, Valentine's, sports week. |

### 4.10 Progression and meta

| ID | Feature | Spec / AC |
|---|---|---|
| F-180 [P0] | Achievements | 80+ achievements across academics, money, social and exploration. |
| F-181 [P0] | Daily and weekly goals | Rotating objectives with small rewards (cosmetics, naira, tokens). |
| F-182 [P0] | Titles and badges | "Dean's List", "Hustler", "Library Rat", shown on profile. |
| F-183 [P1] | Seasons / chapters | Content chapters every 6 to 8 weeks with themed events and rewards. |
| F-184 [P1] | Leaderboards | Weekly: highest CGPA, richest, most social. Opt-in, per-campus and global. |
| F-185 [P1] | Collections | Outfits, posters, snacks, campus photo spots. |

### 4.11 Multiplayer and community [phase 3, launch-optional]

| ID | Feature | Spec / AC |
|---|---|---|
| F-200 [P1] | Friends list | Add friends by code or username; see them online. |
| F-201 [P1] | Shared campus instances | Players on the same campus share a world instance (capped at 30 to 60 players per instance) to see and chat with each other. NPC world stays single-player consistent. |
| F-202 [P1] | Chat | Text chat with profanity filter, mute, block and report. |
| F-203 [P2] | Study groups with real players | Co-op studying for bonuses. |
| F-204 [P2] | Trading and gifting | Limited, anti-exploit trading of cosmetics. |
| F-205 [P2] | Guilds ("hostel houses") | Group activities and competitions. |

### 4.12 Monetisation (fair and optional)

| ID | Feature | Spec / AC |
|---|---|---|
| F-220 [P1] | Cosmetic shop | Outfits, hair, room items, phone themes via premium currency. No stat advantages. |
| F-221 [P1] | Premium pass | Monthly/semester pass: extra cosmetic tracks, bigger room slots, cloud save slots. |
| F-222 [P1] | Rewarded ads | Opt-in ads for small bonuses (never blocking, never during exams). |
| F-223 [P1] | Local payments | Paystack/Flutterwave, card, bank transfer and USSD; prices in naira; low price tiers (e.g. ₦200 to ₦2,000). |
| F-224 [P0] | Ethics rules | No paid grades, no pay-to-skip exams, no loot boxes. Clear spending limits and a parental note. |

### 4.13 UI/UX

| ID | Feature | Spec / AC |
|---|---|---|
| F-240 [P0] | Mobile-first HUD | Thumb-reachable controls, resizable joystick, one-tap interact, safe-area aware. AC: usable one-handed on a 360 px wide screen. |
| F-241 [P0] | Readable text and signs | Replace oversized floating signs with compact, distance-faded labels; minimum 14 px text; high-contrast mode. |
| F-242 [P0] | Portal, map and inventory | Polished screens: portal (exists), map, inventory, phone, relationships, achievements. |
| F-243 [P0] | Accessibility | Colour-blind friendly cues, scalable text, reduced-motion, screen-reader labels on menus, no information conveyed by colour alone. |
| F-244 [P0] | Localisation | English with Pidgin flavour at launch; all strings externalised so Yoruba/Hausa/Igbo can follow. [P1] |
| F-245 [P0] | Loading and offline | Fast first load (< 5 MB initial), progress bar, PWA install, graceful offline play for single-player. |

### 4.14 Audio and art

| ID | Feature | Spec / AC |
|---|---|---|
| F-260 [P0] | Soundtrack and SFX | Afrobeats-inspired loops per area/time, UI sounds, footsteps, ambience (crowd, generators, rain). Licensed or commissioned only. |
| F-261 [P0] | Character animation | Idle, walk, run, sit, talk, study, eat, sleep, dance. Skeletal glTF. |
| F-262 [P0] | Art direction guide | One style sheet covering palette, proportions, materials, UI style. Owner-approved before mass production. |
| F-263 [P1] | VFX | Rain, dust (harmattan), generator smoke, sparkles for rewards. |

---

## 5. Technical architecture

### 5.1 Client
- **Stack:** three.js, TypeScript (migrate from JavaScript for safety), Vite. Keep the module boundaries already in `src/`.
- **State:** a single typed game state + event bus; systems (needs, academics, economy, NPCs, events) are pure update functions over state for testability. Deterministic RNG with a saved seed for reproducible tests.
- **Rendering budgets (low-end Android target):** ≤ 150 draw calls, ≤ 250k triangles in view, ≤ 150 MB GPU memory, 30 fps floor (60 target). Instancing for trees/props, baked lighting where possible, LOD, frustum culling, texture atlases, KTX2 textures, Draco/meshopt compressed glTF.
- **Streaming:** campuses and interiors load on demand; initial download < 5 MB.
- **Offline/PWA:** service worker caches shell and assets; single-player works offline and syncs when online.
- **Wrapping:** optional Capacitor builds for Play Store later [P2].

### 5.2 Backend (needed for accounts, cloud save, online features)
- **API:** Node.js (TypeScript) on a managed platform (e.g. Cloudflare Workers/Fly.io/Render), REST/JSON, versioned.
- **Data:** PostgreSQL (accounts, saves as versioned JSON, purchases), Redis (sessions, rate limits, leaderboards).
- **Auth:** email magic link and Google; short-lived tokens, refresh rotation.
- **Realtime (phase 3):** WebSockets for shared campus instances and chat, with server-authoritative checks on economy-affecting actions.
- **Anti-cheat:** the client is untrusted. Server validates saves (plausibility checks on money/CGPA changes), rate-limits, and flags anomalies. Single-player progress is allowed to be client-driven, but anything shown on leaderboards or traded is server-verified.
- **Content pipeline:** game content (courses, questions, dialogue, events, items) lives in versioned data files with a schema and validation, so designers can add content without code changes.

### 5.3 Tooling and quality
- **CI/CD:** GitHub Actions: lint, type-check, unit tests, build, Playwright end-to-end on every pull request; preview deploys; one-click rollback.
- **Tests:** unit tests for systems (academics, economy, admissions, saves/migrations); e2e smoke tests (new game → results → clearance → first exam); performance budget checks.
- **Observability:** error tracking (Sentry-style), structured logs, uptime checks.
- **Feature flags** and remote config for safe rollouts and balance tuning.

### 5.4 Analytics and KPIs
Event tracking (privacy-respecting, consented): funnel (start → tutorial → admission → first lecture → first exam), session length, D1/D7/D30 retention, crash rate, FPS bands by device, economy sinks/sources, difficulty (fail rates per course).
**Launch targets:** D1 ≥ 35%, D7 ≥ 12%, D30 ≥ 5%; crash-free sessions ≥ 99%; median load < 6 s on 4G.

### 5.5 Security and privacy
- Nigeria Data Protection Act (NDPA 2023) compliant: lawful basis, consent, data minimisation, deletion on request, breach process.
- Children: design for 15+ audiences; age gate, no data sale, safer defaults for under-18s.
- Secrets never ship to the browser; payment data handled only by the payment provider; dependency scanning; CSP and rate limiting.

### 5.6 Optional AI NPCs
Only through the backend (never expose API keys), cost caps per player, moderation, a persona sheet per NPC and a scripted fallback. Models and pricing change, so decide with current numbers. Not required for launch.

---

## 6. Content production plan

| Content | Launch quantity | Notes |
|---|---|---|
| Campuses | 3 | Reviewed layouts, final art |
| Courses | 9 launch degrees × all levels | Catalogue + question banks (Section 4.4) |
| Quiz questions | ≥ 6,000 | Subject reviewers, difficulty tagging |
| NPCs (named) | 60+ across campuses | Personalities, schedules, relationship arcs |
| Dialogue lines | 6,000+ | Pidgin-reviewed by native speakers |
| Events | 80+ | Condition-driven with choices |
| Jobs/gigs | 20+ | Mini-activities |
| Items | 300+ | Clothes, furniture, food, tech |
| Achievements | 80+ | |
| Music | 12 to 20 loops + stingers | Licensed/commissioned |

---

## 7. Roadmap

| Phase | Goal | Duration (est.) | Key deliverables | Exit criteria |
|---|---|---|---|---|
| **0. Hardening** | Make the prototype a solid base | 2 to 3 weeks | TypeScript migration of core, data-driven content files, save versioning, test suite + CI, error tracking, fix known UX issues (signs, mobile layout), performance baseline | Green CI; saves migrate; 30 fps on a reference low-end phone |
| **1. Vertical slice ("Alpha")** | One campus fully polished through year 1 | 6 to 8 weeks | Final art for 1 campus, character creator, tutorial, jobs + bank, lecturers + ambient NPCs, event engine + notifications, audio, daily goals | 20 external playtesters finish year 1; ≥ 70% say they'd play again |
| **2. Content-complete single player** | Full game on 3 campuses | 10 to 12 weeks | All years, curriculum and questions at scale, social + clubs + romance, housing, off-campus, SIWES/project/NYSC, achievements | A full 4-year run is playable and balanced; economy and grading tuned from data |
| **3. Online** | Accounts and community | 8 to 10 weeks | Backend, cloud save, friends, shared instances, chat + moderation, leaderboards, shop + payments | Soak test at 1,000 concurrent; moderation tools proven |
| **4. Launch and live ops** | Public release | 4 to 6 weeks, then ongoing | Closed beta → open beta → launch, marketing site, support, analytics dashboards, first seasonal chapter | KPIs in Section 5.4 hit during beta; crash-free ≥ 99% |

Post-launch: new campuses, new seasons every 6 to 8 weeks, polytechnic track, Android wrapper, AI NPC experiments.

---

## 8. Risks and mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Scope too large for the team | Delays | Strict phase gates; cut P1/P2 first; content is data-driven so volume doesn't mean code |
| Art quality perceived as amateur | Low retention | Hire/commission a consistent art direction early; vertical slice approval |
| Low-end device performance | Players churn | Budgets enforced in CI; Low graphics preset; test on real phones |
| Competitors ship similar ideas | Market share | Differentiate on the aspirant-to-graduate story and content depth; don't copy their mechanics |
| Real university names/logos | Legal complaint | Use names and layouts as reference only; seek written permission for logos/crests; build a fallback fictional-name option |
| Moderation issues in multiplayer | Brand harm | Launch single-player first; add chat only with filters, reports and a moderation team |
| Server cost growth | Margin | Cost caps, caching, efficient save payloads, tiered monetisation |
| Content errors (wrong facts in questions) | Credibility | Subject reviewer sign-off; in-game "report a question" button |

---

## 9. Legal and compliance checklist
- **Trademarks:** real university names, logos and crests need permission; until then use generic or altered branding where required.
- **Music, fonts, 3D assets:** only licensed or commissioned content; keep a license register.
- **Privacy policy, terms and refund policy** before any account or payment feature goes live.
- **NDPA 2023** registration/obligations as required; data deletion flow.
- **Age rating and parental guidance**, no gambling mechanics.

---

## 10. Decisions needed from the owner

1. **Team and budget:** who builds art, audio and QA, and what monthly budget exists for hosting and tools?
2. **Real names vs fictional:** keep real university names (needs permission for logos) or switch to inspired fictional schools for safety?
3. **Online ambition:** single-player at launch with online later (recommended), or online from day one?
4. **Monetisation:** which of the options in 4.12 do you want, and are rewarded ads acceptable?
5. **AI NPCs:** park for now (recommended) or fund a small prototype?
6. **Art direction:** will you supply the 3D assets you mentioned, or should we commission a stylised set?
7. **Launch markets:** Nigeria-first only, or diaspora and other African markets too (affects payments and languages)?

---

## 11. Immediate next steps (Phase 0, first two weeks)
1. Move content (courses, dialogues, NPCs, events, items) into validated data files.
2. Add save schema versioning and unit tests for admissions, academics and migrations.
3. Convert the core modules to TypeScript; add CI.
4. Fix the mobile UX issues listed in Section 2 (compact signs, layout safe areas).
5. Add error tracking and a performance harness; record a baseline on a real mid-range Android phone.
6. Produce the art direction brief and asset list for the vertical slice.
