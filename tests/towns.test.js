import { describe, it, expect } from 'vitest';
import { TOWNS, distanceKm, travelOptions, giftFor, roadEvent, durationText, townGist, townPlace } from '../src/towns.js';

import { homeGist } from '../src/dialogues.js';
import { hometownLines } from '../src/worlddialogues.js';

const UNIS = ['unilag', 'ui', 'oau'];

describe('home towns and travel', () => {
  it('has a distance to every university from every town', () => {
    expect(TOWNS.length).toBeGreaterThanOrEqual(7);
    for (const t of TOWNS) for (const u of UNIS) expect(distanceKm(t.id, u), `${t.id}-${u}`).toBeGreaterThan(0);
  });

  it('is cheap and quick for a local trip, dear and long for a far one', () => {
    const near = travelOptions('lagos', 'unilag'), far = travelOptions('kano', 'unilag');
    expect(near).toHaveLength(1);                        // no flight for a short trip
    expect(near[0].fare).toBeLessThan(3000);
    expect(near[0].minutes).toBeLessThan(120);
    expect(far.map(o => o.mode)).toEqual(['bus', 'flight']);
    expect(far[0].fare).toBeGreaterThan(25000);
    expect(far[0].minutes).toBeGreaterThan(12 * 60);
    expect(far[1].minutes).toBeLessThan(far[0].minutes); // flying is faster
    expect(far[1].fare).toBeGreaterThan(far[0].fare);
  });

  it('fares rise with distance', () => {
    const f = (town, uni) => travelOptions(town, uni)[0].fare;
    expect(f('ibadan', 'unilag')).toBeGreaterThan(f('lagos', 'unilag'));
    expect(f('uyo', 'unilag')).toBeGreaterThan(f('ibadan', 'unilag'));
  });

  it("Mum's gift always covers the bus fare", () => {
    for (const t of TOWNS) for (const u of UNIS) {
      expect(giftFor(t.id, u)).toBeGreaterThanOrEqual(travelOptions(t.id, u)[0].fare);
      expect(giftFor(t.id, u)).toBeGreaterThanOrEqual(10000);
    }
  });

  it('has road events for buses and a calm flight', () => {
    expect(roadEvent('bus', 0.0).text.length).toBeGreaterThan(10);
    expect(roadEvent('bus', 0.999).text.length).toBeGreaterThan(10);
    expect(roadEvent('flight', 0.5).text).toMatch(/flight/i);
  });

  it('gives every town local places and gist, free of Pidgin', () => {
    const banned = /\b(dey|wahala|abeg|oga|sef|pikin|na)\b/i;
    for (const t of TOWNS) {
      expect(t.places?.length, t.id).toBeGreaterThanOrEqual(2);
      expect(t.gist?.length, t.id).toBeGreaterThanOrEqual(2);
      for (const line of [...t.places, ...t.gist]) {
        expect(line.length, t.id).toBeGreaterThan(5);
        expect(banned.test(line), line).toBe(false);
      }
      expect(t.gist).toContain(townGist(t.id, 0));
      expect(t.places).toContain(townPlace(t.id, 0.99));
    }
  });

  it('home dialogue mentions the home town', () => {
    for (const t of TOWNS) {
      const c = { state: { hometown: t.id } };
      expect(homeGist(c)).toMatch(/Do you remember/);
      expect(hometownLines(c)[0]).toContain(t.name);
    }
    expect(hometownLines({ state: {} })).toEqual([]);
  });

  it('reads durations naturally', () => {
    expect(durationText(45)).toBe('45 min');
    expect(durationText(120)).toBe('2 hours');
    expect(durationText(13 * 60 + 30)).toBe('13 hours 30 min');
  });
});
