import { describe, it, expect, beforeEach, vi } from 'vitest';

// a tiny in-memory localStorage
function installStorage({ failWrites = false } = {}) {
  const data = new Map();
  globalThis.localStorage = {
    getItem: k => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => { if (failWrites) throw new Error('QuotaExceededError'); data.set(k, String(v)); },
    removeItem: k => data.delete(k)
  };
  return data;
}

const base = { campusId: 'ui', name: 'Tunde', money: 1234, needs: {}, minutes: 600, day: 5 };

describe('saving and loading', () => {
  let save;
  beforeEach(async () => {
    vi.resetModules();
    installStorage();
    save = await import('../src/save.js');
  });

  it('round-trips a save', () => {
    expect(save.writeSave(base)).toBe(true);
    const loaded = save.loadSave();
    expect(loaded.money).toBe(1234);
    expect(loaded.v).toBe(save.SCHEMA_VERSION);
  });

  it('reports failure when storage is full', async () => {
    installStorage({ failWrites: true });
    vi.resetModules();
    const s = await import('../src/save.js');
    expect(s.writeSave(base)).toBe(false);
  });

  it('recovers from a damaged main save using the backup', async () => {
    const data = installStorage();
    vi.resetModules();
    const s = await import('../src/save.js');
    s.writeSave({ ...base, money: 100 });
    // force a backup of that first save by writing again after the throttle window
    vi.useFakeTimers(); vi.setSystemTime(Date.now() + 120_000);
    s.writeSave({ ...base, money: 200 });
    vi.useRealTimers();
    expect(data.get('campuslife.save.backup')).toBeTruthy();
    data.set('campuslife.save.v1', '{this is not json');          // corrupt the main save
    const loaded = s.loadSave();
    expect(loaded).not.toBeNull();
    expect(loaded.money).toBe(100);                               // the backup held the previous save
    expect(s.lastLoadNote).toBe('damaged');
    expect(JSON.parse(data.get('campuslife.save.v1')).money).toBe(100);   // main save is repaired
  });

  it('returns null when there is no usable save at all', async () => {
    const data = installStorage();
    vi.resetModules();
    const s = await import('../src/save.js');
    expect(s.loadSave()).toBeNull();
    data.set('campuslife.save.v1', 'garbage');
    expect(s.loadSave()).toBeNull();
  });

  it('clearSave removes the save and the backup', async () => {
    const data = installStorage();
    vi.resetModules();
    const s = await import('../src/save.js');
    s.writeSave(base);
    data.set('campuslife.save.backup', 'x');
    s.clearSave();
    expect(data.size).toBe(0);
  });
});

describe('export and import codes', () => {
  it('round-trips, including accents and emoji', async () => {
    vi.resetModules();
    const { exportCode, parseCode } = await import('../src/save.js');
    const original = { ...base, name: 'Tunde ✨ Adé', meta: { savings: 5000 } };
    const code = exportCode(original);
    expect(code.startsWith('CL1:')).toBe(true);
    const r = parseCode(code);
    expect(r.ok).toBe(true);
    expect(r.save.name).toBe('Tunde ✨ Adé');
    expect(r.save.meta.savings).toBe(5000);
  });

  it('tolerates whitespace and line breaks from copying', async () => {
    vi.resetModules();
    const { exportCode, parseCode } = await import('../src/save.js');
    const code = exportCode(base);
    const wrapped = code.replace(/(.{40})/g, '$1\n  ');
    expect(parseCode(wrapped).ok).toBe(true);
  });

  it('rejects wrong, cut-off and tampered codes', async () => {
    vi.resetModules();
    const { exportCode, parseCode } = await import('../src/save.js');
    const code = exportCode(base);
    expect(parseCode('hello').ok).toBe(false);
    expect(parseCode(code.slice(0, code.length - 10)).ok).toBe(false);
    const tampered = code.slice(0, code.length - 3) + (code.endsWith('AAA') ? 'BBB' : 'AAA');
    expect(parseCode(tampered).ok).toBe(false);
    expect(parseCode('').ok).toBe(false);
    expect(parseCode(null).ok).toBe(false);
  });

  it('rejects a save from a newer game version', async () => {
    vi.resetModules();
    const { exportCode, parseCode, SCHEMA_VERSION } = await import('../src/save.js');
    const code = exportCode({ ...base });
    // build a code with a higher version number
    const body = btoa(unescape(encodeURIComponent(JSON.stringify({ ...base, v: SCHEMA_VERSION + 5 }))));
    let h = 2166136261; for (let i = 0; i < body.length; i++) { h ^= body.charCodeAt(i); h = Math.imul(h, 16777619); }
    const future = `CL1:${(h >>> 0).toString(36)}:${body}`;
    expect(parseCode(future).ok).toBe(false);
    expect(parseCode(code).ok).toBe(true);
  });
});
