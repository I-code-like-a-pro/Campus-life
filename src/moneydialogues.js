import { converse } from './dialogues.js';
import { TEXTBOOK, STATIONERY, MUM_TRANSFER, MUM_WEEKLY_LIMIT, money as naira } from './money.js';

/** Dialogues for the bookshop owner and the bank teller (group money). */
export async function bookseller(c, npc) {
  await converse(c, npc, 'Welcome to the bookshop! Textbooks, notebooks and pens. A good book is cheaper than a repeated course.', () => [
    { label: '📚 What do the textbooks do?', run: () => `A textbook costs ${naira(TEXTBOOK.price)} and adds ${TEXTBOOK.boost} points of preparation to one course. You can buy one per course each semester, and ${TEXTBOOK.perDay} a day at most.` },
    { label: '✏️ And the stationery pack?', run: () => `${naira(STATIONERY.price)} for notebooks, pens and highlighters. It helps every course a little, once a semester.` },
    { label: '🧑🏾‍🏫 Is there work?', run: () => 'Yes. Juniors need help with their courses. Sit at the tutoring table: it pays ₦3,000 for 2 hours, once a day.' }
  ]);
}

export async function teller(c, npc) {
  await converse(c, npc, 'Good day. You can use the ATM at the wall to save money or take it out. Savings are safe here.', () => [
    { label: '💾 Why save?', run: () => 'Savings do not get spent by accident. Keep something aside for school fees, which fall due early in each semester.' },
    { label: '📞 Can my mother send money?', run: () => `Yes. At the ATM you can ask for ${naira(MUM_TRANSFER)}, up to ${MUM_WEEKLY_LIMIT} times a week. Do not rely on it.` },
    { label: '🎓 What about school fees?', run: () => 'Pay them at the Bursary counter in the Registry or from your phone. If you are short, you can pay half and be cleared for exams.' }
  ]);
}

export const MONEY_DIALOGUES = { bookseller, teller };
