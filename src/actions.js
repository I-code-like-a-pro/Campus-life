// What you can do at each building type.
// cost: naira spent, pay: naira earned, minutes: game minutes that pass, fx: need changes,
// needs: minimum requirements. `sleep` actions restore energy, so normal need decay is skipped while they run.

const HOSTEL = [
  { id: 'sleep', label: '😴 Sleep (8 hrs)', minutes: 480, sleep: true, fx: { energy: 85, stress: -15, hunger: -22, hygiene: -8 }, msg: 'You slept well. New day, fresh start.' },
  { id: 'nap', label: '😪 Power nap (1 hr)', minutes: 60, sleep: true, fx: { energy: 16, stress: -2, hunger: -3 }, msg: 'A short nap. You feel a bit sharper.' },
  { id: 'bathe', label: '🚿 Bathe', minutes: 15, fx: { hygiene: 65, stress: -3 }, msg: 'Fresh and clean!' },
  { id: 'cook', label: '🍳 Cook a meal (uses 1 foodstuff)', minutes: 45, needsPantry: 1, fx: { hunger: 48, fun: 5, stress: -2 }, msg: 'You cooked a proper meal and saved money.' },
  { id: 'phone', label: '📱 Scroll TikTok', minutes: 60, needsPower: true, fx: { fun: 22, energy: -4, stress: -4 }, msg: 'One hour gone. Nice videos!' },
  { id: 'freelance', label: '💻 Freelance gig (3 hrs)', pay: 6000, minutes: 180, needsPower: true, limit: 1, needs: { energy: 25 },
    fx: { energy: -18, fun: -10, stress: 6, hunger: -8 }, msg: 'Gig delivered. Client paid on time, for once!' }
];

export const ACTIONS = {
  hostel: HOSTEL,
  home: [
    ...HOSTEL,
    { id: 'momfood', label: '🍲 Mum\'s jollof', minutes: 20, fx: { hunger: 50, fun: 5, stress: -3 }, msg: 'Mama cooked! Free food, no complaints.' }
  ],
  canteen: [
    { id: 'jollof', label: '🍛 Jollof & chicken', cost: 3000, minutes: 20, fx: { hunger: 55, fun: 5 }, msg: 'The jollof is delicious!' },
    { id: 'pie', label: '🥧 Meat pie', cost: 900, minutes: 5, fx: { hunger: 18 }, msg: 'A quick bite on the go.' },
    { id: 'zobo', label: '🥤 Zobo drink', cost: 300, minutes: 5, fx: { hunger: 5, fun: 4, stress: -2 }, msg: 'Chilled zobo. Refreshing!' },
    { id: 'canteenjob', label: '🍽️ Serve food (2 hrs)', pay: 2500, minutes: 120, limit: 2, needs: { energy: 20 },
      fx: { energy: -14, fun: -6, hunger: -6, hygiene: -6, stress: 3 }, msg: 'You served a long queue. The madam paid you.' }
  ],
  cafe: [
    { id: 'browse', label: '🖥️ Browse & chill', cost: 200, minutes: 60, needsPower: true, fx: { fun: 15, energy: -3, stress: -3 }, msg: 'One hour of browsing. Network was okay.' }
    // the results action is added by main.js when results are out
  ],
  shop: [
    { id: 'snack', label: '🍪 Buy snacks', cost: 500, minutes: 5, fx: { hunger: 14, fun: 3 }, msg: 'Biscuits and sweets. Just enough to get by.' },
    { id: 'foodstuff', label: '🥘 Foodstuff (4 meals)', cost: 3000, minutes: 15, msg: 'You bought rice, tomatoes and ingredients for four meals.' },
    { id: 'decor-poster', label: '🖼️ Room poster', cost: 1500, minutes: 5, decor: 'poster', msg: 'A poster for your room. Instant personality!' },
    { id: 'decor-plant', label: '🪴 Potted plant', cost: 2000, minutes: 5, decor: 'plant', msg: 'A little green plant for your room.' },
    { id: 'decor-lights', label: '✨ Fairy lights', cost: 3000, minutes: 5, decor: 'lights', msg: 'Fairy lights for your room. Cozy.' },
    { id: 'buynet', label: '🦟 Mosquito net', cost: 2500, minutes: 5, msg: 'You hung a mosquito net. Malaria will think twice.' },
    { id: 'shopwork', label: '🧾 Help at the shop (2 hrs)', pay: 2000, minutes: 120, limit: 2, fx: { energy: -12, fun: -5, hunger: -6, stress: 2 }, needs: { energy: 20 }, msg: 'The shop owner paid you for the help.' }
  ],
  field: [
    { id: 'jog', label: '🏃 Go for a jog', minutes: 40, fx: { fun: 8, energy: -10, hygiene: -8, stress: -12 }, needs: { energy: 12 }, msg: 'Fresh air cleared your head.' }
  ],
  clinic: [
    { id: 'consult', label: '🩺 See the doctor', cost: 2000, minutes: 45, msg: 'The doctor examined you.' },
    { id: 'drugs', label: '💊 Buy prescribed drugs', cost: 2500, minutes: 15, msg: 'You took your medicine. You feel much better.' },
    { id: 'paracetamol', label: '💊 Paracetamol', cost: 500, minutes: 5, fx: { energy: 8, stress: -3 }, msg: 'The ache eases for now.' }
  ],
  biz: [
    { id: 'print', label: '🖨️ Run the printing desk (2 hrs)', pay: 3000, minutes: 120, limit: 2, needsPower: true, needs: { energy: 20 },
      fx: { energy: -12, fun: -8, stress: 4, hunger: -5 }, msg: 'Printed 200 pages of handouts. Ink everywhere!' },
    { id: 'pos', label: '💳 POS agent shift (3 hrs)', pay: 4500, minutes: 180, limit: 1, needs: { energy: 25 },
      fx: { energy: -16, fun: -8, stress: 7, hunger: -7 }, msg: 'Withdrawals all day. Your commission is in.' },
    { id: 'handouts', label: '📖 Buy handouts', cost: 1500, minutes: 10, needsAcademic: true, msg: 'Handouts and past questions bought. Your preparation improved.' },
    { id: 'handoutcopy', label: '📄 Buy a course handout (₦300)', needsAcademic: true }   // group academic
  ],
  lecture: [],
  library: [
    { id: 'shelve', label: '📚 Shelve books (2 hrs)', pay: 2000, minutes: 120, limit: 2, needs: { energy: 20 },
      fx: { energy: -10, fun: -6, stress: 2, hunger: -5 }, msg: 'The shelves look neat. The librarian pays a little money.' },
    { id: 'libassist', label: '🗂️ Library assistant desk (3 hrs)', pay: 3500, minutes: 180, limit: 1, needs: { energy: 25 },
      fx: { energy: -13, fun: -7, stress: 3, hunger: -7 }, msg: 'You stamped returns and answered questions all afternoon. The library paid your stipend.' }
  ],
  auditorium: [],
  registry: [
    { id: 'payfees', label: '💳 Pay school fees', money: 'fees', minutes: 0 }
  ],
  books: [
    { id: 'textbooks', label: '📚 Browse textbooks', money: 'textbooks', minutes: 0, needsAcademic: true },
    { id: 'stationery', label: '✏️ Stationery pack', cost: 1500, money: 'stationery', minutes: 0, needsAcademic: true },
    { id: 'tutor', label: '🧑🏾‍🏫 Tutor juniors (2 hrs)', pay: 3000, minutes: 120, limit: 1, needsAcademic: true, needs: { energy: 20 },
      fx: { energy: -12, fun: -4, stress: 4, hunger: -6 }, msg: 'You explained the same topic four times. The juniors paid you and said thank you.' }
  ],
  bank: [
    { id: 'atm', label: '🏧 Use the ATM', money: 'atm', minutes: 0 }
  ]
};

export const COMING_SOON = {
  lecture: 'Lectures and timetables arrive in the next stage.',
  library: 'Studying and assignments arrive in the next stage.',
  auditorium: 'Clubs and Sunday fellowship meet here. Check your phone for club times.',
  park: 'Talk to the conductor to travel to school once you have admission.'
};
