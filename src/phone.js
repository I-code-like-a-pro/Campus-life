import { showModal } from './modal.js';
import { settings, setSetting } from './settings.js';
import { ACHIEVEMENTS } from './meta.js';
import { naira } from './needs.js';
import { DECOR, owed } from './housing.js';
import { exportCode, parseCode } from './save.js';
import { levelOf, CLUBS, clubSchedule, joinClub, leaveClub, MAX_CLUBS, CLUB_DUES, clubById } from './social.js';

const SAVE_STEP = 5000;
const MUM_GIFT = 3000;
const MUM_COOLDOWN_DAYS = 3;

const onOff = v => (v ? 'On' : 'Off');
const QUALITY = ['low', 'medium', 'high'];
const TEXT_SIZES = [0.9, 1, 1.15, 1.3];
const next = (list, v) => list[(list.indexOf(v) + 1) % list.length];

/**
 * The phone: one hub for the student portal, bank, messages, goals and settings (spec F-122, F-007, F-082).
 * deps: { state, meta, academics, day(), give(n), spend(n) -> boolean, onSettingsChanged() }
 */
export function createPhone({ state, meta, academics, day, give, spend, onSettingsChanged, onOpenMap = () => {}, payBill = () => 'Not available.', getSnapshot = () => ({}), applyImportedSave = () => {} }) {
  const back = [{ label: '← Back', value: 'b' }];

  async function bank() {
    for (;;) {
      const m = state.meta;
      const ledger = meta.ledgerList().slice(0, 8).map(e => `D${e.day} · ${e.amount >= 0 ? '+' : '−'}${naira(Math.abs(e.amount))} · ${e.text}`);
      const mumWait = Math.max(0, (m.counters.mumDay ?? -99) + MUM_COOLDOWN_DAYS - day());
      const pick = await showModal({
        title: '🏦 Bank',
        lines: [`Balance: ${naira(state.money)}`, `Savings: ${naira(m.savings)}`, ledger.length ? 'Recent activity:' : 'No activity yet.', ...ledger],
        buttons: [
          { label: `💾 Move ${naira(SAVE_STEP)} to savings`, value: 'save' },
          { label: `💸 Withdraw ${naira(SAVE_STEP)} from savings`, value: 'out' },
          { label: mumWait ? `📞 Ask Mum for money (in ${mumWait} day${mumWait > 1 ? 's' : ''})` : `📞 Ask Mum for money (${naira(MUM_GIFT)})`, value: 'mum' },
          { label: '← Back', value: 'b', secondary: true }
        ]
      });
      if (pick === 'b') return;
      if (pick === 'save') {
        if (spend(SAVE_STEP, { silent: true })) { m.savings += SAVE_STEP; meta.ledger('Moved to savings', -SAVE_STEP, { count: false }); meta.trackMax('savingsPeak', m.savings); }
        else await showModal({ title: '🏦 Bank', lines: ['You do not have enough in your account.'], buttons: back });
      } else if (pick === 'out') {
        if (m.savings >= SAVE_STEP) { m.savings -= SAVE_STEP; give(SAVE_STEP); meta.ledger('Withdrew from savings', SAVE_STEP, { count: false }); }
        else await showModal({ title: '🏦 Bank', lines: ['Not enough in savings.'], buttons: back });
      } else if (pick === 'mum') {
        if (mumWait) await showModal({ title: '📞 Mum', lines: [`"My pikin, I just sent you something. Manage it, we go talk again in ${mumWait} day${mumWait > 1 ? 's' : ''}."`], buttons: back });
        else {
          m.counters.mumDay = day();
          give(MUM_GIFT);
          meta.ledger('Mum sent money', MUM_GIFT, { count: false });
          await showModal({ title: '📞 Mum', lines: [`"Ah ah, again? Okay, I have sent ${naira(MUM_GIFT)}. Spend it well o!"`], buttons: back });
        }
      }
    }
  }

  async function friendsApp() {
    const list = Object.values(state.meta.relations).filter(r => r.points > 0).sort((a, b) => b.points - a.points);
    await showModal({
      title: '👥 Friends',
      lines: list.length
        ? list.slice(0, 25).map(r => `${levelOf(r.points).icon} ${r.name}: ${levelOf(r.points).name} (${r.points} points)`)
        : ['You have not made any friends yet. Chat with people and tap "Spend time together".'],
      buttons: back
    });
  }

  async function clubsApp() {
    for (;;) {
      const joined = state.meta.clubs;
      const pick = await showModal({
        title: '🎪 Clubs',
        lines: [`Join up to ${MAX_CLUBS} clubs (₦${CLUB_DUES} dues each). Meetings are in the evening.`, ...CLUBS.map(c => `${c.icon} ${c.name}: ${clubSchedule(c)}${joined.includes(c.id) ? ' ✅' : ''}`)],
        buttons: [...CLUBS.map(c => ({ label: joined.includes(c.id) ? `Leave ${c.name}` : `Join ${c.name}`, value: c.id })), { label: '← Back', value: 'b', secondary: true }]
      });
      if (pick === 'b') return;
      let msg;
      if (joined.includes(pick)) { leaveClub(joined, pick); msg = `You left the ${clubById(pick).name}.`; }
      else if (joined.length >= MAX_CLUBS) msg = `You can join at most ${MAX_CLUBS} clubs. Leave one first.`;
      else if (!spend(CLUB_DUES)) msg = `Dues are ₦${CLUB_DUES}. You do not have enough.`;
      else { joinClub(joined, pick); meta.ledger('Club dues', -CLUB_DUES); meta.track('clubsJoined'); msg = `Welcome to the ${clubById(pick).name}! Meetings: ${clubSchedule(clubById(pick))}.`; }
      await showModal({ title: '🎪 Clubs', lines: [msg], buttons: back });
    }
  }

  async function roomApp() {
    for (;;) {
      const m = state.meta;
      const unpaid = m.bills.filter(b => !b.paid);
      const decor = Object.keys(m.room).map(k => `${DECOR[k].icon} ${DECOR[k].name}`);
      const pick = await showModal({
        title: '🏠 My room and bills',
        lines: [
          state.hostel ? `Hostel: ${state.hostel}` : 'You have not been allocated a room yet.',
          `🍲 Pantry: ${m.pantry} meal${m.pantry === 1 ? '' : 's'} of foodstuff (cook in your room's kitchenette)`,
          decor.length ? `Room: ${decor.join(', ')}` : 'Room: no decorations yet. The market sells posters, plants and fairy lights.',
          unpaid.length ? 'Unpaid bills:' : 'No unpaid bills. 🎉',
          ...unpaid.map(b => `• ${b.label}: ${naira(owed(b))}, due Day ${b.due}${b.late ? ' (late fee added)' : ''}`)
        ],
        buttons: [...unpaid.map(b => ({ label: `💳 Pay: ${b.label} (${naira(owed(b))})`, value: b.id })), { label: '← Back', value: 'b', secondary: true }]
      });
      if (pick === 'b') return;
      await showModal({ title: '💳 Payment', lines: [payBill(pick)], buttons: back });
    }
  }

  async function messages() {
    const items = meta.inbox().slice(0, 20);
    meta.markAllRead();
    await showModal({
      title: '💬 Messages',
      lines: items.length ? items.map(n => `${n.icon} D${n.day} · ${n.title}${n.text ? ': ' + n.text : ''}`) : ['No messages yet.'],
      buttons: back
    });
  }

  async function goals() {
    const gl = meta.goals();
    const ach = meta.achievements();
    const done = ach.filter(a => a.unlockedDay != null).length;
    const s = meta.streak();
    await showModal({
      title: '🏆 Goals and achievements',
      lines: [
        `🔥 Login streak: ${s.count} day${s.count === 1 ? '' : 's'}`,
        "Today's goals:",
        ...gl.map(g => `${g.done ? '✅' : '⬜'} ${g.text} (${Math.min(g.n, meta.count(g.c) - g.base)}/${g.n}) · +${naira(g.reward)}`),
        `Achievements: ${done}/${ach.length}`,
        ...ach.map(a => `${a.unlockedDay != null ? a.icon : '🔒'} ${a.name}: ${a.text}`)
      ],
      buttons: back
    });
  }

  /** Shows the save code with options to copy it or download it as a file. */
  async function exportSaveScreen() {
    const code = exportCode(getSnapshot());
    for (;;) {
      const pick = await showModal({
        title: '💾 Your save code',
        lines: [
          'This code is your whole game. Keep a copy somewhere safe. On any device, open Settings and choose Import a save to continue.',
          `${code.slice(0, 90)}… (${code.length.toLocaleString('en-NG')} characters)`
        ],
        buttons: [
          { label: '📋 Copy the code', value: 'copy' },
          { label: '⬇️ Download as a file', value: 'file' },
          { label: '← Back', value: 'b', secondary: true }
        ]
      });
      if (pick === 'b') return;
      if (pick === 'copy') {
        let ok = false;
        try { await navigator.clipboard.writeText(code); ok = true; } catch { /* blocked */ }
        await showModal({ title: ok ? '📋 Copied!' : '📋 Could not copy', lines: [ok ? 'The code is on your clipboard. Paste it into a note or message to keep it.' : 'Copying is blocked here. Use Download as a file instead.'], buttons: back });
      } else {
        try {
          const url = URL.createObjectURL(new Blob([code], { type: 'text/plain' }));
          const a = document.createElement('a');
          a.href = url; a.download = `campus-life-save-day${day()}.txt`;
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        } catch { /* ignore */ }
      }
    }
  }

  async function importSaveScreen() {
    const code = window.prompt('Paste your save code here:');
    if (!code) return;
    const r = parseCode(code);
    if (!r.ok) { await showModal({ title: '📥 Import failed', lines: [r.message], buttons: back }); return; }
    const pick = await showModal({
      title: '📥 Import this save?',
      lines: [`${r.save.name} · day ${r.save.day}`, 'This replaces the game currently on this device. Your current save is kept as a backup only until the next autosave, so export it first if you want to keep it.'],
      buttons: [{ label: 'Replace my game with this save', value: 'yes' }, { label: 'Cancel', value: 'no', secondary: true }]
    });
    if (pick === 'yes') applyImportedSave(r.save);
  }

  async function settingsMenu() {
    for (;;) {
      const pick = await showModal({
        title: '⚙️ Settings',
        lines: ['Tap an option to change it.'],
        buttons: [
          { label: `🔊 Sound effects: ${onOff(settings.sound)}`, value: 'sound' },
          { label: `🎵 Music: ${onOff(settings.music)}`, value: 'music' },
          { label: `📳 Vibration: ${onOff(settings.vibration)}`, value: 'vibration' },
          { label: `🖼️ Graphics: ${settings.quality}`, value: 'quality' },
          { label: `🔤 Text size: ${Math.round(settings.textSize * 100)}%`, value: 'textSize' },
          { label: `✋ Joystick on the ${settings.leftHanded ? 'right' : 'left'}`, value: 'leftHanded' },
          { label: `🐢 Reduced motion: ${onOff(settings.reducedMotion)}`, value: 'reducedMotion' },
          { label: `💡 Tutorial hints: ${onOff(settings.hints)}`, value: 'hints' },
          { label: `🗺️ Minimap: ${onOff(settings.minimap)}`, value: 'minimap' },
          { label: `📊 Share anonymous usage data: ${onOff(settings.analytics)}`, value: 'analytics' },
          { label: '💾 Export my save', value: 'export' },
          { label: '📥 Import a save', value: 'import' },
          { label: '← Back', value: 'b', secondary: true }
        ]
      });
      if (pick === 'b') return;
      if (pick === 'export') { await exportSaveScreen(); continue; }
      if (pick === 'import') { await importSaveScreen(); continue; }
      const v = settings[pick];
      setSetting(pick, pick === 'quality' ? next(QUALITY, v) : pick === 'textSize' ? next(TEXT_SIZES, v) : !v);
      onSettingsChanged();
    }
  }

  async function open() {
    for (;;) {
      const u = meta.unread();
      const buttons = [
        ...(state.academic ? [{ label: '🎓 Student portal', value: 'portal' }] : []),
        { label: '🗺️ Map and travel', value: 'map' },
        ...(state.hostel || state.meta.bills.length ? [{ label: '🏠 My room and bills', value: 'room' }] : []),
        { label: '🏦 Bank', value: 'bank' },
        { label: '👥 Friends', value: 'friends' },
        ...(state.academic ? [{ label: '🎪 Clubs', value: 'clubs' }] : []),
        { label: `💬 Messages${u ? ` (${u} new)` : ''}`, value: 'messages' },
        { label: '🏆 Goals and achievements', value: 'goals' },
        { label: '⚙️ Settings', value: 'settings' },
        { label: 'Close', value: 'x', secondary: true }
      ];
      const pick = await showModal({ title: '📱 Phone', lines: [`${state.name} · ${naira(state.money)}`], buttons });
      if (pick === 'x') return;
      if (pick === 'map') { onOpenMap(); return; }
      if (pick === 'portal') await academics.openPortal();
      else if (pick === 'room') await roomApp();
      else if (pick === 'bank') await bank();
      else if (pick === 'friends') await friendsApp();
      else if (pick === 'clubs') await clubsApp();
      else if (pick === 'messages') await messages();
      else if (pick === 'goals') await goals();
      else if (pick === 'settings') await settingsMenu();
    }
  }

  return { open };
}

export { ACHIEVEMENTS };
