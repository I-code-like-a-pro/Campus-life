// Academic scenes for the scene engine (scenes.js): a first lab practical and the briefing for the group project.
// The full, repeatable versions run every semester from the lecture hall and library (see academic-life.js).
// Windows are for the first semester, like the other story scenes.

import { isLabCourse, labSteps } from './academic-life.js';

const labCourse = a => (a?.courses || []).find(c => isLabCourse(c.code));

export const ACADEMIC_SCENES = [
  {
    id: 'firstLab', emoji: '🧪', title: 'First lab practical', short: 'First lab practical',
    venue: 'class', minutes: 120, fx: { energy: -6, hunger: -5 },
    windows: a => (labCourse(a) ? [{ day: a.startDay + 2, from: 13, to: 16 }] : []),
    done: a => !labCourse(a),
    crowd: [
      { id: 'demo', name: 'Lab demonstrator', role: 'Demonstrator', emoji: '🥼', dx: 0, dz: -3, shirt: 0xecf0f1, skin: 0x5a3a26, dialogue: 'student' }
    ],
    beats: ctx => {
      const code = (ctx.courses.map(l => l.split(':')[0]).find(isLabCourse)) || 'PHY 101';
      const steps = labSteps(code);
      return [
        { title: '🧪 First practical', lines: ['The demonstrator hands out lab sheets and reminds everyone that safety comes before speed.'] },
        ...steps.map(s => ({
          title: `🧪 ${s.title}`, lines: s.lines,
          choices: s.choices.map(ch => ({ label: ch.label, text: ch.text, fx: ch.good ? { stress: -1 } : { stress: 2 }, prep: ch.good ? 2 : 0 }))
        }))
      ];
    }
  },
  {
    id: 'groupBrief', emoji: '👥', title: 'Group project briefing', short: 'Group project briefing',
    venue: 'class', minutes: 45, fx: { stress: 1 },
    windows: a => [{ day: a.startDay + 1, from: 14, to: 17 }],
    crowd: [
      { id: 'lec', name: 'Course lecturer', role: 'Lecturer', emoji: '👨‍🏫', dx: 0, dz: -3, shirt: 0x34495e, skin: 0x5a3a26, dialogue: 'student' }
    ],
    beats: () => [
      { title: '👥 Group project', lines: ['The lecturer announces a group assignment for one of your courses.', 'You may pick two teammates and decide how much to contribute. The marks depend on both.'] },
      {
        title: '🧭 Your plan', lines: ['A coursemate asks how you plan to handle it.'],
        choices: [
          { label: 'Choose reliable teammates', text: 'Dependable people may not be the fastest, but they show up. Good plan.', fx: { stress: -2 } },
          { label: 'Choose the cleverest teammates', text: 'Clever teammates are a gamble if they are always busy.', fx: {} },
          { label: 'Plan to copy an old project', text: 'Copying is risky. The lecturer checks. A warning goes on your record if you are caught.', fx: { stress: 2 } }
        ]
      },
      { title: '📚 Where to work', lines: ['Group work happens at the library. Choose your teammates there when you are ready.'] }
    ]
  }
];
