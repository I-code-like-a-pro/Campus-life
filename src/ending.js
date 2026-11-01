import { degreeClass } from './academics.js';

/*
 * The ending of the game: graduation (or, for a player whose results stay too low, withdrawal), the "your story" summary
 * and a shareable image card.
 */

const HONOURS = {
  'First Class': 'You graduate with First Class honours, the highest honour a university gives. Your name goes on the wall.',
  'Second Class Upper': 'You graduate with Second Class Upper honours. Employers and graduate schools will notice.',
  'Second Class Lower': 'You graduate with Second Class Lower honours. A solid degree and a story worth telling.',
  'Third Class': 'You graduate with a Third Class degree. It was not easy, but you finished.',
  'Pass': 'You graduate with a Pass degree. You made it to the end, and that counts.',
  'Below pass level': 'You completed the programme, but your results are below pass level.'
};

export const honoursText = cgpa => HONOURS[degreeClass(cgpa)] || HONOURS['Pass'];

/** Everything the "your story" screen and share card show. */
export function buildStory({ state, campus, course, day, achievements = 0 }) {
  const a = state.academic;
  const c = state.meta.counters || {};
  const history = a.history || [];
  const withdrawn = !!a.withdrawn;
  const cgpa = a.cgpa ?? 0;
  const best = history.reduce((m, h) => (!m || h.gpa > m.gpa ? h : m), null);
  const worst = history.reduce((m, h) => (!m || h.gpa < m.gpa ? h : m), null);
  const lines = [
    `${course} at ${campus}`,
    `${history.length} semester${history.length === 1 ? '' : 's'} over ${day} days`,
    best ? `Best semester: ${best.year}00 Level, Semester ${best.term} (GPA ${best.gpa.toFixed(2)})` : null,
    worst && history.length > 1 ? `Toughest semester: ${worst.year}00 Level, Semester ${worst.term} (GPA ${worst.gpa.toFixed(2)})` : null,
    c.gradeA ? `${c.gradeA} A grade${c.gradeA === 1 ? '' : 's'}` : null,
    c.carryPassed ? `${c.carryPassed} carryover${c.carryPassed === 1 ? '' : 's'} cleared` : null,
    c.friendsMade ? `${c.friendsMade} friend${c.friendsMade === 1 ? '' : 's'} made` : null,
    c.footballMatches ? `${c.footballMatches} football match${c.footballMatches === 1 ? '' : 'es'} played` : null,
    achievements ? `${achievements} achievements unlocked` : null
  ].filter(Boolean);
  return {
    name: state.name, campus, course, withdrawn, cgpa,
    degree: withdrawn ? 'Withdrawn' : degreeClass(cgpa),
    title: withdrawn ? 'Withdrawn from the university' : 'Graduated',
    semesters: history.length, days: day, lines
  };
}

/* ------------------------------------ share card ------------------------------------ */

const THEMES = {
  'First Class': ['#3a2a00', '#c99a1a'],
  'Second Class Upper': ['#0b3b2a', '#17a673'],
  'Second Class Lower': ['#0c2e55', '#2f7fd0'],
  'Third Class': ['#3a1d5c', '#8e5bd0'],
  'Pass': ['#2a3340', '#6b7a8d'],
  'Withdrawn': ['#2b1b1b', '#8a4a4a']
};

/** Draws a 1080x1350 image of the player's result. Returns the canvas. */
export function drawShareCard(story, origin = '') {
  const cv = document.createElement('canvas');
  cv.width = 1080; cv.height = 1350;
  const g = cv.getContext('2d');
  const [dark, light] = THEMES[story.degree] || THEMES['Pass'];
  const bg = g.createLinearGradient(0, 0, 0, 1350);
  bg.addColorStop(0, dark); bg.addColorStop(1, light);
  g.fillStyle = bg; g.fillRect(0, 0, 1080, 1350);
  g.fillStyle = 'rgba(255,255,255,0.08)';
  g.beginPath(); g.arc(900, 250, 320, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(150, 1150, 260, 0, Math.PI * 2); g.fill();

  g.textAlign = 'center'; g.fillStyle = '#fff';
  g.font = '700 54px system-ui, sans-serif'; g.fillText('CAMPUS LIFE', 540, 120);
  g.font = '170px system-ui, sans-serif'; g.fillText(story.withdrawn ? '📄' : '🎓', 540, 360);
  g.font = '600 52px system-ui, sans-serif'; g.fillText(story.title, 540, 450);
  g.font = '800 88px system-ui, sans-serif'; fitText(g, story.name, 540, 570, 940, 88);
  g.font = '500 44px system-ui, sans-serif'; fitText(g, story.course, 540, 650, 940, 44);
  g.fillStyle = 'rgba(255,255,255,0.8)'; fitText(g, story.campus, 540, 710, 940, 40);

  g.fillStyle = 'rgba(0,0,0,0.28)'; roundRect(g, 140, 790, 800, 300, 40); g.fill();
  g.fillStyle = '#fff'; g.font = '600 40px system-ui, sans-serif';
  g.fillText(story.withdrawn ? 'FINAL CGPA' : 'CGPA', 540, 860);
  g.font = '800 150px system-ui, sans-serif'; g.fillText(story.cgpa.toFixed(2), 540, 990);
  g.font = '700 56px system-ui, sans-serif'; g.fillText(story.degree, 540, 1060);

  g.fillStyle = 'rgba(255,255,255,0.85)'; g.font = '500 38px system-ui, sans-serif';
  g.fillText(`${story.semesters} semesters · ${story.days} days`, 540, 1175);
  g.font = '600 40px system-ui, sans-serif';
  g.fillText('Play free: ' + (origin ? origin.replace(/^https?:\/\//, '') : 'Campus Life'), 540, 1270);
  return cv;
}

function fitText(g, text, x, y, maxWidth, size) {
  let s = size;
  const family = g.font.replace(/^.*?px\s*/, '');
  const weight = g.font.split(' ')[0];
  while (s > 20 && (g.font = `${weight} ${s}px ${family}`, g.measureText(text).width > maxWidth)) s -= 2;
  g.fillText(text, x, y);
}

function roundRect(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}

/** Shares the card with the phone's share sheet when possible, otherwise downloads the image. Returns 'shared' | 'saved' | 'cancelled'. */
export async function shareCard(story) {
  const cv = drawShareCard(story, location.origin);
  const blob = await new Promise(res => cv.toBlob(res, 'image/png'));
  if (!blob) return 'cancelled';
  const file = new File([blob], 'campus-life-result.png', { type: 'image/png' });
  const text = story.withdrawn
    ? `I played Campus Life and my university story ended early. Can you do better? ${location.origin}`
    : `I graduated with a ${story.degree} (CGPA ${story.cgpa.toFixed(2)}) in Campus Life! ${location.origin}`;
  try {
    if (navigator.canShare?.({ files: [file] })) { await navigator.share({ files: [file], text }); return 'shared'; }
  } catch (err) {
    if (err && err.name === 'AbortError') return 'cancelled';
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = 'campus-life-result.png';
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'saved';
}
