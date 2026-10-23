import { describe, it, expect } from 'vitest';
import { migrate, newMeta, SCHEMA_VERSION } from '../src/save.js';

const v1 = { campusId: 'ui', name: 'Tunde', money: 5000, needs: {}, minutes: 600, day: 3 };

describe('save migration', () => {
  it('upgrades an unversioned (v1) save to the current schema', () => {
    const s = migrate(v1);
    expect(s.v).toBe(SCHEMA_VERSION);
    expect(s.meta).toEqual(newMeta());
    expect(s.money).toBe(5000);
  });
  it('does not mutate its input', () => {
    const copy = JSON.parse(JSON.stringify(v1));
    migrate(v1);
    expect(v1).toEqual(copy);
  });
  it('keeps existing meta and fills missing keys', () => {
    const s = migrate({ ...v1, v: SCHEMA_VERSION, meta: { savings: 900 } });
    expect(s.meta.savings).toBe(900);
    expect(s.meta.inbox).toEqual([]);
  });
  it('rejects unusable data and saves from a newer build', () => {
    expect(migrate(null)).toBeNull();
    expect(migrate({})).toBeNull();
    expect(migrate({ ...v1, v: SCHEMA_VERSION + 1 })).toBeNull();
  });
});
