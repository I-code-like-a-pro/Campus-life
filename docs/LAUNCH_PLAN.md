# Launch plan: four weeks to a public release

**Decisions (from the owner):** free public launch, no ads and no payments · real university names kept with a clear disclaimer · 3D assets will be supplied by the owner, so until then the focus is gameplay, content, balance and stability · a small backend (accounts and cloud save) is wanted if it fits.

**Launch definition.** Anyone can open a link on a phone and play a polished single-player game from JAMB results to graduation, with progress that is safe (export and import, and cloud save if the backend lands), fast on mid-range Android, and with a way to send feedback.

**Out of scope for launch** (planned for after): shared multiplayer worlds, live chat, trading, payments and ads, romance, off-campus housing, new campuses beyond the three.

## Week 1: stability, speed and safety nets
| # | Task | Done when |
|---|---|---|
| 1.1 | Measure and cut rendering cost (draw calls, triangles) with instancing and merged static geometry | Draw calls under 150 on every campus; frame rate measured on a real phone |
| 1.2 | Save safety: export and import a save code, storage-full handling, corrupted-save recovery, backup of the last good save | A player can move progress between devices and never loses a save to a bug |
| 1.3 | Legal pages in the game: disclaimer (fan-made, not affiliated), privacy policy, terms, credits | Reachable from the menu and the start screen |
| 1.4 | Economy and difficulty balance using a bot that plays full semesters | A careful player passes comfortably, a careless one struggles, nobody is stuck broke |
| 1.5 | Bug sweep: soft-locks, edge cases (sleeping through exams, results while indoors, retake loops) | A written list of tested scenarios all pass |

## Week 2: content and gameplay depth
| # | Task | Done when |
|---|---|---|
| 2.1 | Questions: at least 40 per department and 20 general studies, reviewed for accuracy; year 2 and above use harder, separate questions | No question repeats within a semester; reviewers have checked the facts |
| 2.2 | More achievements (to 80), weekly challenges and titles | Players always have a next goal |
| 2.3 | More events and dialogue: protests, matriculation, convocation, more gist, lecturer personalities | At least 30 lines per NPC type; each campus feels distinct |
| 2.4 | Onboarding polish: scripted first 3 minutes, clearer goal line, better first-run hints | New testers finish clearance without asking for help |
| 2.5 | Decision on the backend (host, provider) | Chosen and an account created by you |

## Week 3: backend (if chosen) and polish
| # | Task | Done when |
|---|---|---|
| 3.1 | Accounts and cloud save (email or Google), conflict handling, save validation | Sign in on two devices and continue seamlessly |
| 3.2 | Asset pipeline for your 3D models, ready to drop in | Replacing a placeholder with a model is a one-line change |
| 3.3 | Cross-browser and device testing: Chrome and Samsung Internet on Android, Safari on iPhone, low-end phones | No blocking bugs on the target devices |
| 3.4 | Accessibility and language pass: Pidgin and English review, colour contrast, text sizes | Reviewed by native speakers |

## Week 4: release
| # | Task | Done when |
|---|---|---|
| 4.1 | Closed beta with 20 to 50 people, fix the top issues | Crash-free sessions above 99%; no soft-locks reported |
| 4.2 | Hosting, domain, HTTPS, caching, uptime check, analytics (opt-in), error reports | Site live on your domain |
| 4.3 | Landing page, share image, screenshots, short trailer, app-install prompt | Ready to post |
| 4.4 | Launch, then watch feedback and fix quickly | Launch day checklist complete |

## What I need from you, and when
- **By the end of week 1:** a few real phones to test on, and your first testers.
- **By the end of week 2:** the backend decision and account; the first 3D assets (even a character and one building) so integration can be tested.
- **Subject and Pidgin reviewers:** someone to check quiz questions and dialogue.
- **Domain name** if you want one (optional, a free host link works).

## Risks
| Risk | Plan |
|---|---|
| Asset delivery slips | The game ships with the current look; assets can be added after launch because the pipeline will be ready |
| Phone performance | Measured every week; a Low graphics preset is already in the settings |
| Backend adds bugs | It is optional: launch without it, and add it as an update if it is not solid by the end of week 3 |
| Real university names | Disclaimer in the game; no logos; switch to fictional names quickly if anyone objects |
| Quiz mistakes | Reviewer sign-off and an in-game "report a question" option |
