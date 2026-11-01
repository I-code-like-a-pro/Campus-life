import { describe, it, expect } from 'vitest';
import { TOWNS, distanceKm, travelOptions, giftFor, roadEvent, durationText } from '../src/towns.js';

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

  it('reads durations naturally', () => {
    expect(durationText(45)).toBe('45 min');
    expect(durationText(120)).toBe('2 hours');
    expect(durationText(13 * 60 + 30)).toBe('13 hours 30 min');
  });
});
