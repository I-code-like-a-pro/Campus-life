// Prints a bot's first days hour by hour to see where energy goes. Run: node tools/debug-energy.js [profile]
const profile = process.argv[2] || 'diligent';
const { simulate } = await import('./balance.js');
const r = simulate({ profile, seed: 3, semesters: 1 });
console.log('faints:', r.faints, 'jobs:', r.jobsDone, 'sickDays:', r.sickDays, 'cgpa:', r.cgpa?.toFixed(2));
for (const e of r.trace.filter(t => t.day >= 3 && t.day <= 6)) console.log(`d${e.day} ${String(e.hour).padStart(4)}h  ${e.sleep ? 'SLEEP' : 'act  '} m=${String(e.m).padStart(3)} fx=${String(e.fx ?? 0).padStart(4)}  energy=${e.energy}`);
