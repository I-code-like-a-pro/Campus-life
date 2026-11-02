import { formatTime } from './daynight.js';
import { NEEDS, mood, naira } from './needs.js';
import { t } from './i18n.js';

const $ = id => document.getElementById(id);

export function createHud() {
  const log = [];
  let bannerTimer = null, toastTimer = null;

  // need bars
  const bars = {};
  const needsEl = $('needs');
  needsEl.replaceChildren(...NEEDS.map(n => {
    const row = document.createElement('div');
    row.className = 'need';
    row.title = n.label;
    const icon = document.createElement('i'); icon.textContent = n.icon;
    const track = document.createElement('b');
    const fill = document.createElement('u');
    track.append(fill);
    row.append(icon, track);
    bars[n.key] = { row, fill, bad: !!n.bad };
    return row;
  }));

  $('logbtn').addEventListener('click', () => { $('menu').classList.remove('open'); $('log').classList.toggle('open'); });
  $('menubtn').addEventListener('click', () => { $('log').classList.remove('open'); $('menu').classList.toggle('open'); });

  function banner(icon, title, msg, stamp) {
    $('bt').textContent = `${icon} ${title}`;
    $('bm').textContent = msg;
    $('banner').classList.add('show');
    clearTimeout(bannerTimer);
    bannerTimer = setTimeout(() => $('banner').classList.remove('show'), 4200);

    log.unshift({ stamp, icon, title });
    log.length = Math.min(log.length, 12);
    $('loglist').replaceChildren(...log.map(item => {
      const row = document.createElement('div');
      const s = document.createElement('small');
      s.textContent = item.stamp;
      row.append(s, `${item.icon} ${item.title}`);
      return row;
    }));
  }

  function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // action panel: rebuilt only when the place changes, buttons are enabled/disabled each frame
  let panelKey = null, panelButtons = [];
  function setPlace(place, actions, note, onAct) {
    const key = place ? `${place.name}|${actions.map(a => a.id + a.label).join(',')}|${note || ''}` : null;
    if (key === panelKey) return;
    panelKey = key;
    panelButtons = [];
    const panel = $('panel');
    if (!place) { panel.classList.remove('show'); return; }
    $('ptitle').textContent = `${place.emoji} ${place.name}`;
    $('pnote').textContent = note || '';
    $('pnote').hidden = !note;
    $('acts').replaceChildren(...actions.map(a => {
      const b = document.createElement('button');
      const label = document.createElement('span'); label.textContent = a.label;
      b.append(label);
      if (a.cost) { const c = document.createElement('small'); c.textContent = naira(a.cost); b.append(c); }
      if (a.pay) { const c = document.createElement('small'); c.className = 'pay'; c.textContent = `+${naira(a.pay)}`; b.append(c); }
      b.addEventListener('click', () => onAct(a));
      panelButtons.push({ b, a });
      return b;
    }));
    panel.classList.add('show');
  }
  function refreshButtons(canDo) {
    for (const { b, a } of panelButtons) b.disabled = !canDo(a);
  }

  function update({ minutes, day, weatherIcon, blackoutAmount, needs, money, goal, weekday, status }) {
    const hour = minutes / 60;
    $('status').hidden = !status;
    if (status) $('status').textContent = status;
    $('goal').hidden = !goal;
    if (goal) $('goal').textContent = goal;
    $('time').textContent = formatTime(minutes);
    $('day').textContent = weekday ? `${t('hud.day', { n: day })} · ${weekday}` : t('hud.day', { n: day });
    $('sun').textContent = hour >= 6 && hour < 18 ? '🌞' : '🌙';
    $('weather').textContent = weatherIcon;
    $('dark').style.opacity = blackoutAmount.toFixed(2);
    $('money').textContent = naira(money);
    $('mood').textContent = mood(needs).icon;
    $('mood').title = mood(needs).label;
    for (const n of NEEDS) {
      const bar = bars[n.key];
      const v = needs[n.key];
      const goodness = bar.bad ? 100 - v : v;
      bar.fill.style.width = `${v.toFixed(0)}%`;
      bar.row.classList.toggle('low', goodness < 25);
      bar.row.classList.toggle('mid', goodness >= 25 && goodness < 50);
    }
  }

  return { banner, toast, update, setPlace, refreshButtons };
}
