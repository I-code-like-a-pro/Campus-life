# People and community

Everything here is suitable for teenagers: nothing sexual, no pressure, no harassment. Pure rules are in `src/people.js` (tested in `tests/people.test.js`); dialogue is in `src/peopledialogues.js` (tested in `tests/peopledialogues.test.js`). State is `state.meta.people`, created by `newPeople()` and repaired by `ensurePeople()`. Old saves get the key from the meta merge in `src/save.js`, so the schema version did not change.

Time units: story arcs count days since the first roommate story began; weekly limits use `Math.floor(day / 7)`.

## Roommate stories
The roommate (name from `roommateNameFor(hostel)`) has four arcs, offered one at a time in order, at most one a day: borrowing without asking, an untidy room, exam stress and a birthday. Each has 2 to 3 choices that change friendship and a mood from -3 to +3. Some choices cost a little money or time. Arcs appear as the first option in the roommate's menu. Declining ("Not now") does not use up the arc.

## Mentors
Ask Seun (the senior at the gate) after a couple of chats ("Will you be my mentor?", 4 friendship points). Once a week "My weekly tip" gives a tip and +3% preparation to your weakest course; about four weeks in ten he also shares notes (+7%). You can stop mentoring any time.

## Study groups
Invite a coursemate who is at least an acquaintance (8 points) from the student menu. Up to three members, remembered by name (shown in the phone's Friends list). One group session a week, from any member or the librarian: +6%, +8% or +10% preparation for one, two or three members (never more than 10%), 90 minutes, small friendship gains.

## The friendly rival
A coursemate (name picked from your name and course) stands in lecture halls. After your CA test, and again at results, a phone message compares scores in a kind way. You can ask about the CA, results, or revise together once a week (+3%). The rival's scores come from the game, always close to yours. Lines never insult.

## Club storylines
The clubs coordinator (Miss Chioma, main auditorium) tells three short chapters for each club you joined (for example the inter-hall debate). A chapter needs one more club meeting than the last, and two days between chapters. Choices add small effects; the finale depends on your choices, and even the lowest ending is encouraging.

## Friendship events
Friends (25 points or more, or 8 for moving help) may offer: a cultural night invitation (Thursday onward), a birthday surprise (each friend's birthday comes every 28 days) and help moving into the hostel (first two days of a semester). All are optional and each has a free way to say no.

## Chapel and Mosque
A Campus Chapel and a Campus Mosque stand on the west side of all three campuses. Walk-in, open 6:00 to 22:00.
- Chapel: Sunday service 8:00 to 10:00, midweek service Wednesday 17:00.
- Mosque: Friday prayers 13:00 to 15:00, evening prayer every day at 18:00.
- **Quiet reflection** (20 minutes, twice a day, stress -10) is open to anyone at the quiet spot. Attending a service lowers stress too.
- The chaplain and the imam talk about service times, calm you when stressed, and welcome people of every faith.

## Crushes and dates (optional, off by default)
Settings: "Crushes and dates (light, age-appropriate)". When on, a friend (25 points) may extend three small invitations, at least two days apart: walk to the library together (carrying each other's bags is the only contact), share a snack, go to the cultural night as friends. Each can be declined with no penalty ("Not today, thanks"), and "Let us just stay friends" ends the storyline kindly. One person at a time.

## AI personas
`src/ainpc.js` has personas for the chaplain, imam, clubs coordinator and rival, and updated ones for the roommate and Seun. The AI only talks; the game decides outcomes.

## Main.js hooks
Search for `// group people` in `src/main.js` (imports, `ALL_DIALOGUES`, the talk-context helpers, faith panel actions, rival news on CA and results, debug handle).
