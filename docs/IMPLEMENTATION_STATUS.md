# Implementation status

Companion to [GAME_SPEC.md](GAME_SPEC.md). Last updated after the second pass (map and travel, health, hostel life, social life).

**Legend:** ✅ done · 🟡 partly done (what exists and what is missing is noted) · ⬜ not started · 🔒 blocked on something outside the code (an owner decision, assets, a backend, or a third party)

**Honest summary.** The client-side game is now much deeper and has a real quality foundation (versioned saves, 98 automated tests, CI,
progression, jobs, a condition-driven world, a living campus). The things that turn it into a *launched online product* are not built yet:
a backend (accounts, cloud save, multiplayer, payments), final art/audio, large-scale content (thousands of questions, 60+ NPCs), real-device
performance testing and legal sign-off. Those are listed as 🔒 below, with what each one needs.

## Quality gates

| Item | Status | Notes |
|---|---|---|
| Save versioning and migrations (F-004) | ✅ | `src/save.js`, schema v2, v1 saves upgrade automatically, tested |
| Automated tests | ✅ | 98 unit tests (admissions, academics, saves, needs, progression, events, content, dialogue, pathfinding, health, housing, social) |
| CI | 🟡 | `.github/workflows/ci.yml` runs tests and build; it has not run on GitHub yet because the project is not in a repository |
| End-to-end tests | ⬜ | Needs Playwright and a stable headless setup |
| Error tracking | 🟡 | Errors are logged locally (last 20); sending is opt-in and needs an endpoint (`VITE_TELEMETRY_URL`) |
| Analytics and KPIs | 🟡 | Consent-based event tracking exists; no dashboard or endpoint yet |
| TypeScript migration | ⬜ | Large mechanical change; best done as its own pass with the tests as a safety net |
| Performance baseline on a real phone | ⬜ | Not measured. Bundle is 206 KB gzipped. Draw-call and FPS budgets in the spec are unverified |
| Content in data files | 🟡 | Courses, questions, campuses, actions, achievements are already data; dialogue is still code |

## 4.1 Accounts, onboarding and saves
| ID | Status | Notes |
|---|---|---|
| F-001 Guest play | ✅ | No signup; saves locally |
| F-002 Account upgrade | 🔒 | Needs a backend and an auth provider |
| F-003 Cloud save | 🔒 | Needs a backend |
| F-004 Save versioning | ✅ | See above |
| F-005 Interactive tutorial | 🟡 | 11 contextual hints that appear once when relevant, switchable in settings. No scripted intro sequence yet |
| F-006 Character creator | 🔒 | Needs the final 3D character set; placeholder human in use |
| F-007 Settings | 🟡 | Sound, music, vibration, graphics quality, text size, left-handed layout, reduced motion, hints, analytics consent. Language selection not built |
| F-008 Player profile | ⬜ | |

## 4.2 Character, needs, wellbeing
| ID | Status | Notes |
|---|---|---|
| F-020 Needs | 🟡 | Five need bars plus a sickness status. No separate social need |
| F-021 Mood and status effects | 🟡 | Mood display; being sick, exhausted or stressed removes a quiz hint. Sickness is a visible status. No hungover or inspired states |
| F-022 Traits and aspirations | ⬜ | |
| F-023 Health system | ✅ | Malaria (rainy season), catarrh (harmattan) and typhoid, with a daily deterministic risk shaped by hygiene, hunger, sleep and stress; a Health Centre (and a Chemist at home) with doctor, pharmacy and nurse; mosquito net; sickness drains energy, blocks jobs and weakens exams. Three illnesses only, no hospital stays |
| F-024 Skills | ⬜ | |

## 4.3 World and campuses
| ID | Status | Notes |
|---|---|---|
| F-040 Three launch campuses | 🟡 | Three named campuses with their own buildings and features. Layouts share a template and are not verified maps |
| F-041 Final art pass | 🔒 | Needs the art set |
| F-042 Interiors | 🟡 | Hostel, home, canteen, library, lecture hall, cyber cafe, Business Centre, Health Centre. Missing: bank, bookshop, chapel/mosque |
| F-043 Wayfinding | ✅ | Guide marker, corner minimap (toggle in settings), full map screen, tap a building or spot to walk there automatically (A* pathfinding), or ride |
| F-044 Day/night, weather, seasons | ✅ | Harmattan (hazy) in semester 1, rainy season with afternoon showers in semester 2, all derived from the calendar |
| F-045 Off-campus world | ⬜ | |
| F-046 Transport | 🟡 | Keke and okada with fares and travel time (okada has a small scare chance), plus the bus to school. No campus shuttle |
| F-047 More campuses | ⬜ | |

## 4.4 Academics
| ID | Status | Notes |
|---|---|---|
| F-060 Full curriculum | 🟡 | Real course lists for 100 level; higher levels use generated codes |
| F-061 Question banks | 🟡 | 15 questions per department and 10 general studies. Target is at least 60 per course tag per level, written and reviewed by subject experts |
| F-062 Lecturers as NPCs | 🟡 | A lecturer in every lecture hall who gives a hint once a day and reacts to your attendance. No distinct personalities or schedules |
| F-063 Assessment variety | ⬜ | Multiple choice only |
| F-064 Academic standing | 🟡 | Warning and probation notices; no withdrawal or extra year |
| F-065 Make-up rules | ⬜ | |
| F-066 Study groups and handouts | 🟡 | Handouts at the Business Centre raise preparation. No study groups |
| F-067 SIWES, F-068 Final project, F-069 NYSC, F-070 Postgraduate | ⬜ | |
| ASUU strike (event) | ✅ | Decided per semester, announced the evening before, suspends Thursday and Friday lectures without hurting attendance |

## 4.5 Economy
| ID | Status | Notes |
|---|---|---|
| F-080 Income sources | 🟡 | Shop help, canteen serving, library shelving, printing desk, POS agent, freelance gig, all with daily limits and energy cost. No businesses |
| F-081 Expenses | 🟡 | Fees, food, fares, handouts. No rent, data, airtime or clothes |
| F-082 Bank and mobile money | 🟡 | Savings, withdrawals, ledger, Mum's transfers. No airtime or transfers to friends |
| F-083 "Sapa" mechanics | 🟡 | Mum's gift every 3 days, jobs, a Sapa Survivor achievement |
| F-084 Loans | 🟡 | Friends can lend ₦2,000, repaid within a week through the bills screen; late repayment costs the friendship. No student loans or interest |
| F-085 Businesses, F-086 Scholarships | ⬜ | |
| F-087 Economic balance | ⬜ | Needs real play data |

## 4.6 Housing and daily life
| ID | Status | Notes |
|---|---|---|
| F-100 Hostel life | 🟡 | Allocated hostel, a roommate with a daily schedule, hostel dues each semester with reminders and a late fee. No chores, curfew or multiple roommates |
| F-101 Personal space | 🟡 | Your own decorated corner of the room (see F-104). No locker |
| F-102 Off-campus housing | ⬜ | |
| F-103 Cooking | ✅ | Buy foodstuff at markets, cook in the kitchenette (about a 15% chance of burning it), cheaper than eating out |
| F-104 Decorating | 🟡 | Poster, plant and fairy lights appear in the room and help you rest. Three fixed items |
| F-105 Utilities | 🟡 | NEPA outages driven by the calendar, blocking phone, browsing, printers and freelance work. No water or generators |

## 4.7 Social
| ID | Status | Notes |
|---|---|---|
| F-120 NPC friendships | ✅ | Five levels from Stranger to Best friend, growing through daily chats, tones, gifts, study sessions and events; a Friends list in the phone |
| F-121 Conversation system | ✅ | Choice-based, with three tones that each personality likes or dislikes, gifts, and favours that unlock with friendship (study together, lecture notes, loans) |
| F-122 Phone | 🟡 | Student portal, map, my room and bills, bank, friends, clubs, messages, goals and achievements, settings. No camera, contacts or social feed |
| F-123 Romance | ⬜ | Not built |
| F-124 Clubs and societies | 🟡 | Five clubs (debate, drama, tech, enterprise, football), join up to two, weekly evening meetings with effects. No ranks or club events |
| F-125 Student union politics | ⬜ | |
| F-126 Parties and events | 🟡 | Hostel night (Fri), inter-hostel match (Sat) and Sunday fellowship, each on a fixed day and time. Attending warms nearby people to you |
| F-127 Reputation, F-128 Rivalries | ⬜ | |

## 4.8 NPCs and AI
| ID | Status | Notes |
|---|---|---|
| F-140 NPC schedules | 🟡 | Staff, lecturers and roommates are only at their posts during working hours. Wandering students stroll, but nobody travels between places on a routine |
| F-141 Reactive dialogue | 🟡 | Lines react to weather, power, strike, needs, money and the exam calendar; 20 gist lines with no back-to-back repeats. Target is at least 30 per archetype |
| F-142 Staff and vendors | 🟡 | Gate guards, desk officers, lecturers, librarian, canteen owner, Business Centre manager, roommate |
| F-143 Ambient crowd | ✅ | 4 to 12 wandering students depending on graphics quality, built from a cheap 4-mesh model |
| F-144 AI-driven NPCs | ⬜ | Parked by the owner pending credits |

## 4.9 Events and campus life
| ID | Status | Notes |
|---|---|---|
| F-160 Condition-driven events | 🟡 | NEPA, rain, harmattan, ASUU strike, CA and exam reminders, results. No protests, matriculation or convocation |
| F-161 Notifications | ✅ | Non-blocking toasts, an inbox (60 messages) and an unread badge on the phone |
| F-162 Micro-stories, F-163 Seasonal events | ⬜ | |

## 4.10 Progression and meta
| ID | Status | Notes |
|---|---|---|
| F-180 Achievements | 🟡 | 47 of the 80 targeted |
| F-181 Daily and weekly goals | 🟡 | Three daily goals from 10 templates with naira rewards; real-time login streak. No weekly challenges |
| F-182 Titles, F-183 Chapters, F-185 Collections | ⬜ | |
| F-184 Leaderboards | 🔒 | Needs a backend |

## 4.11 to 4.12 Multiplayer and monetisation
| Item | Status | Notes |
|---|---|---|
| F-200 to F-205 Multiplayer | 🔒 | Needs the backend, moderation tooling and a hosting decision |
| F-220 to F-223 Monetisation | 🔒 | Needs owner decisions (spec section 10) and a payment provider account |
| F-224 Ethics rules | ✅ | Design rule observed so far: nothing buys grades |

## 4.13 UI and UX
| ID | Status | Notes |
|---|---|---|
| F-240 Mobile-first HUD | 🟡 | Phone layout with a resizable text scale and handedness option; not yet tested on real devices |
| F-241 Readable text and signs | ✅ | Smaller labels that fade with distance. High-contrast mode not built |
| F-242 Portal, map, inventory | 🟡 | Portal and phone apps exist; map and inventory do not |
| F-243 Accessibility | 🟡 | Text size, reduced motion, focus outlines. No screen-reader support for the 3D scene, no colour-blind mode |
| F-244 Localisation | ⬜ | Strings are inline in the code |
| F-245 Loading and offline | 🟡 | 193 KB gzipped bundle, installable manifest and a service worker. Not tested offline on a device |

## 4.14 Audio and art
| ID | Status | Notes |
|---|---|---|
| F-260 Soundtrack and SFX | 🟡 | Generated sound effects, a looping placeholder Afrobeats-style beat and phone vibration. Licensed or commissioned music is still needed |
| F-261 Character animation | 🟡 | Walk swing only |
| F-262 Art direction guide | ⬜ | |
| F-263 VFX | 🟡 | Rain, haze and blackout overlay |

## Added in the second pass (map, health, hostel life, social life)
- **New buildings** on every campus: Health Centre, Campus Market. A Chemist in the home neighbourhood.
- **Save format** is now version 3, and version 1 and 2 saves upgrade automatically.
- **New tests** cover pathfinding and fares, illness rules, bills, cooking, decorations, working hours and the social rules.
- **Not included from these areas:** romance, off-campus housing, laundry and chores, curfew, and NPCs that follow routines between places. Staff can be absent at night while some of their counters (for example the canteen or the printing desk) still work.

## What each blocked item needs from the owner
1. **Backend items (accounts, cloud save, multiplayer, leaderboards, payments):** a decision on hosting and budget, then a dedicated build phase (spec Phase 3).
2. **Art and animation:** the 3D asset set, or a budget to commission one. The code already loads `.glb` characters from `public/assets/models/`.
3. **Large content (questions, NPCs, dialogue, events):** subject-matter reviewers and native Pidgin reviewers; the pipelines to add content are in place.
4. **Legal:** permission for real university logos, a privacy policy and terms before accounts or payments launch.
5. **Real-device testing:** a mid-range Android phone to measure frame rate and load time against the spec budgets.
