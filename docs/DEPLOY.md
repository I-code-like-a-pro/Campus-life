# Putting Campus Life online for reviewers

Campus Life is a **static website**: `npm run build` produces a `dist` folder of plain files, and any static host can serve it. There is no server, database or secret key to protect. Each reviewer's save stays in their own browser.

Platform dashboards change their wording from time to time. If a label below does not match what you see, look for the same idea (build command, output folder, environment variables). Check each service's current free-plan terms before relying on it.

## 1. Before you start

1. **A GitHub account** (free) at github.com.
2. In this project folder, the repository is already created and the first commit is made. You only need to connect it to GitHub:
   - On GitHub click **New repository**, name it `campus-life`, leave it **empty** (no README), and create it.
   - Then run, replacing `YOUR-NAME`:
     ```bash
     git remote add origin https://github.com/YOUR-NAME/campus-life.git
     git push -u origin main
     ```
   GitHub may ask you to sign in the first time. Do that yourself in the browser or with GitHub's own sign-in prompt.
3. Keep the repository **Private** if you only want to share the *game link*, not the code. The hosts below can deploy private repositories.

## 2. Pick a host

All three read `package.json` and run `npm run build`. Config files for each are already in the project.

### Vercel (simplest)
1. Sign in at vercel.com with GitHub.
2. **Add New > Project**, pick `campus-life`.
3. It should detect **Vite** automatically. Build command `npm run build`, output directory `dist` (already set by `vercel.json`).
4. Click **Deploy**. You get a link like `campus-life-xxxx.vercel.app`.
5. The free "Hobby" plan is meant for non-commercial use.

### Render
1. Sign in at render.com with GitHub.
2. **New + > Blueprint**, choose the repository (it reads `render.yaml`), or **New + > Static Site** and enter: build command `npm ci && npm run build`, publish directory `dist`.
3. Make sure it is a **Static Site**. (A free *Web Service* goes to sleep when idle; a static site does not.)
4. You get a link like `campus-life.onrender.com`.

### Railway
Railway is built for servers, so it is not the best fit for a static site, and its free allowance is limited. It becomes a good choice later, when the game needs a backend and database.
1. Sign in at railway.com with GitHub, **New Project > Deploy from GitHub repo**.
2. It reads `railway.json`: it builds the site and serves it with `vite preview` on the port Railway provides.
3. In the service's **Settings > Networking**, click **Generate Domain** to get a public link.

### Netlify (drag and drop, no repository needed)
1. Run `npm run build` on your computer.
2. Open app.netlify.com/drop and drag the `dist` folder onto the page.
3. You get a link immediately. To keep it permanently, claim the site with a Netlify account.

## 3. Add the feedback button (2 minutes)

Without any setup the in-game **Send feedback** button (menu `☰`) lets reviewers **copy an anonymous report** (game version, device, where they are in the game, recent errors, no name or money) to paste into a message. To collect ideas in one place:

1. **Create a Google Form** (forms.google.com) with questions such as:
   - What did you enjoy most?
   - What was confusing or broken? (long answer)
   - Which feature should we build next? (multiple choice: jobs, social life, more campuses, better graphics, other)
   - How likely are you to recommend this game? (1 to 5)
   - Your phone model (optional)
2. Click **Send > link** and copy the link.
3. In your host's dashboard, add an **environment variable** named `VITE_FEEDBACK_URL` with that link. Optionally add `VITE_FEEDBACK_EMAIL` with your email address. Also set `VITE_CONTACT_EMAIL` so your address appears on the privacy policy, terms and About pages.
4. **Redeploy.** These values are baked in when the site is built, so a new deploy is needed after changing them.

## 4. Check it works (5 minutes)

On a real phone, open the link and confirm:
- [ ] The start screen loads and shows the "early preview" note.
- [ ] You can create a character, fill the JAMB form and reach the home neighbourhood.
- [ ] The joystick moves you, and **Talk** and **Enter** appear near people and buildings.
- [ ] The 📱 phone opens, and ☰ then **Send feedback** works.
- [ ] Sound starts after your first tap.
- [ ] Reloading the page offers **Continue** with your progress.

## 5. Updating the game

Whenever the code changes, commit and push to GitHub. Vercel and Render redeploy automatically within a minute or two, and reviewers get the new version when they reload. (The site uses a service worker for offline play; if a reviewer is stuck on an old version, a hard refresh fixes it.)

## 6. Sharing with reviewers

A short message that works:

> I am building a Nigerian campus-life game that starts when you are waiting for your JAMB result and follows you through admission, clearance, lectures, exams and graduation. It is an **early preview** (art and content are placeholder). Please play for 10 to 15 minutes on your phone, then tap ☰ then **Send feedback** and tell me what you liked, what confused you and what you would add: [your link]

## 7. Things to know

- **Saves are per browser.** Nothing is shared between players; clearing browser data clears progress. A reviewer can use **New game** in the ☰ menu to start again.
- **Privacy.** Usage data is **off by default** and nothing leaves the player's device unless they opt in and you set `VITE_TELEMETRY_URL`. The feedback report never contains the player's name or money.
- **Real university names.** UNILAG, UI and OAU appear by name (no logos). That is fine for a small private review, but get permission before promoting the game publicly (see the legal section of `GAME_SPEC.md`).
- **Cost.** Static hosting is free or nearly free at review-scale traffic on all of the options above.

## 8. Troubleshooting

| Problem | Fix |
|---|---|
| Blank page after deploy | Check the host is serving the `dist` folder and running `npm run build` (not `npm run dev`) |
| Build fails on the host | Make sure the host uses Node 20 or newer (set `NODE_VERSION=22` if it asks) |
| Feedback button shows only "Copy report" | `VITE_FEEDBACK_URL` or `VITE_FEEDBACK_EMAIL` was not set before the last build; set it and redeploy |
| Old version keeps appearing | Hard refresh, or close and reopen the tab; the service worker updates on the next load |
| No sound | Browsers allow audio only after a tap; tap anywhere once. Check Settings in the phone |
| Reviewer lost progress | Their browser data was cleared, or they used a private window. Saves live in local browser storage |
