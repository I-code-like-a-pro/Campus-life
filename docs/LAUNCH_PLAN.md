# Launch plan: the final three weeks

Last updated 1 November 2026, from the git history and [STUDENT_LIFE_SCOPE.md](STUDENT_LIFE_SCOPE.md) / [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md).

**Owner decisions in force:** free public launch, no ads, no payments · real university names (UNILAG, UI, OAU) with a disclaimer and no logos or crests · the game ends at graduation (no NYSC) · standard English only (no Pidgin) · phone first · public host not chosen yet (Vercel suggested) · backend undecided (see [BACKEND_OPTIONS.md](BACKEND_OPTIONS.md)).

**Launch definition.** Anyone can open a link on a phone and play a polished single-player game from JAMB result to graduation, with progress that is safe (local saves, export/import codes, and cloud save only if the backend lands), acceptable speed on a mid-range Android phone, and a way to send feedback.

## What is done (from the git log)
- **Core game:** JAMB, admission, 7 home towns, distance-based travel to campus (bus or flight, road events), clearance, hostel, lectures, exams, jobs, economy, needs, health and sickness, social life, clubs, campus events, football, map and wayfinding, bedtime, ASUU strike.
- **Content:** named courses and exam questions for 100 to 400 level in all 9 departments (banks keyed by level); standard English throughout.
- **Ending:** graduation, convocation, "your story" summary, share card, First Class achievement, probation and withdrawal ending.
- **Safety and quality:** versioned saves (schema v3) with rolling backup, repair, export/import codes; balance simulator and regression tests; QA checklist; instanced rendering (worst case 87 draw calls).
- **Platform:** About, privacy and terms pages; opt-in telemetry stub; service worker; mobile-first UI pass (44px targets, landscape, 320px width); deploy configs for Vercel, Netlify, Render and Railway.
- **Launch docs (this group):** backend memo, marketing kit, release checklist, landing page.

## What is not done
- Measurement on real phones (frame rate, memory, heat) and the manual items in [QA_CHECKLIST.md](QA_CHECKLIST.md).
- Subject-expert review of exam questions; a read of all dialogue by the owner or a reviewer.
- Host, domain and HTTPS chosen and live; contact email and feedback form created.
- Backend decision; if yes, accounts and cloud save.
- Real screenshots, share image and short trailer.
- Legal read-through of the privacy policy, terms and disclaimer, ideally by a lawyer who knows the Nigeria Data Protection Act (NDPA).
- Closed beta with real students.
- 3D assets from the owner (not a launch blocker; the game ships with the current look).

## Week A (1 to 7 Nov): decide, host, start the beta
| Task | Owner | Done when |
|---|---|---|
| Choose host and domain; create the hosting account (Vercel suggested) | Owner | A preview URL works over HTTPS |
| Decide backend: yes, later or never (memo recommends ship without it, add Supabase cloud save as release 1.1) | Owner | Written decision |
| Create the feedback form and a contact email; set `VITE_FEEDBACK_URL`, `VITE_CONTACT_EMAIL` | Owner | Both appear in a deployed build |
| Recruit 20 to 50 closed-beta testers (students, mostly Android) | Owner | List with phone models |
| Real-phone performance pass on 3 phones (one low-end) | Owner tests, developer fixes | Median 30 fps or better on the low-end phone, or the Low graphics preset gets there |
| Run the full QA checklist and fix soft-locks | Developer | No known soft-lock |
| Send questions to subject reviewers | Owner | Reviewers have the list |

## Week B (8 to 14 Nov): closed beta and content freeze
| Task | Owner | Done when |
|---|---|---|
| Closed beta live on the real host (unlisted link) | Owner | Testers playing; exit criteria tracked in [RELEASE_CHECKLIST.md](RELEASE_CHECKLIST.md) |
| Triage feedback daily; fix top crashes and confusing moments | Developer | Top 10 issues closed |
| Apply reviewer corrections to questions and dialogue | Developer | Reviewer sign-off recorded |
| If backend = yes: cloud save behind a flag | Developer | Two-device sync works in staging |
| Take real screenshots, a 20 to 30 second clip and a share image; fill the landing page placeholders | Owner captures, developer places | Landing page has no placeholders |
| Lawyer reads privacy, terms, disclaimer | Owner | Comments back |
| Start teasers per [MARKETING_KIT.md](MARKETING_KIT.md) | Owner | First posts out |

## Week C (15 to 21 Nov): freeze, rehearse, launch
| Task | Owner | Done when |
|---|---|---|
| Feature freeze (bug fixes only); bump service worker cache | Developer | Release candidate tagged |
| Pass the beta exit criteria | Both | All numbers met, or the date moves |
| Launch rehearsal: production deploy, rollback drill, error endpoint test | Developer | Checklist items ticked |
| Public launch and ambassador push | Owner | Live link shared |
| Watch feedback for 72 hours; hotfixes only | Both | Daily issue note |

## Risks
| Risk | Likelihood | Plan |
|---|---|---|
| Real-phone performance worse than desktop numbers suggest | Medium | Low preset by default on weak devices; cut effects; test in week A, not later |
| Backend adds bugs or privacy work late | Medium | It is optional. Launch local-first with export/import; add cloud save after launch |
| Beta recruits fewer than 20 people | Medium | Use ambassadors and class groups early; lower the numbers only with the owner's agreement |
| Quiz errors or dialogue that offends | Medium | Reviewer sign-off; in-game feedback; quick content patch path |
| A university objects to its name | Low | Disclaimer present, no logos; be ready to switch to fictional names through data in one deploy |
| Data protection complaint | Low | Opt-in telemetry only, no personal data collected, legal read, live contact address |
| Owner time (testing, recruiting, reviewers) is the real bottleneck | High | Fixed weekly asks above; developer works on what does not need the owner |
| Asset delivery slips | Medium | Not a blocker; the pipeline is ready |
| Host free-tier limits or terms | Low to medium | A static site is cheap; check terms; a second host config (Netlify) already exists |
