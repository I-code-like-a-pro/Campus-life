/*
 * Home towns for the aspirant phase, and travelling from there to the university.
 * Distances are rough road distances in km (game estimates, not survey data).
 */

export const TOWNS = [
  { id: 'lagos',      name: 'Lagos',         emoji: '🌆', blurb: 'Busy, loud and never asleep.',            km: { unilag: 15,  ui: 130, oau: 200 } },
  { id: 'ibadan',     name: 'Ibadan',        emoji: '🏘️', blurb: 'The big brown-roofed city.',              km: { unilag: 130, ui: 8,   oau: 90 } },
  { id: 'ife',        name: 'Ile-Ife',       emoji: '🏛️', blurb: 'An ancient town with a lively campus.',   km: { unilag: 200, ui: 90,  oau: 5 } },
  { id: 'uyo',        name: 'Uyo',           emoji: '🌴', blurb: 'Quiet, clean and green in Akwa Ibom.',    km: { unilag: 780, ui: 700, oau: 640 } },
  { id: 'abuja',      name: 'Abuja',         emoji: '🏙️', blurb: 'The capital, with wide roads and hills.', km: { unilag: 760, ui: 640, oau: 580 } },
  { id: 'portharcourt', name: 'Port Harcourt', emoji: '🛢️',          blurb: 'The Garden City by the delta.',           km: { unilag: 620, ui: 560, oau: 480 } },
  { id: 'kano',       name: 'Kano',          emoji: '🕌', blurb: 'The old trading city of the north.',      km: { unilag: 1050, ui: 900, oau: 800 } }
];

export const townOf = id => TOWNS.find(t => t.id === id) || TOWNS[0];
export const distanceKm = (townId, uni) => townOf(townId).km[uni] ?? 100;

const roundTo = (n, step) => Math.round(n / step) * step;

/** The ways to get there. Short trips only have a bus or keke, long ones also have a flight. */
export function travelOptions(townId, uni) {
  const km = distanceKm(townId, uni);
  const busHours = 1 + km / 65;                         // average road speed with stops
  const options = [{
    mode: 'bus', emoji: '🚌', label: km <= 30 ? 'Keke and bus' : 'Interstate bus',
    fare: roundTo(1000 + km * 30, 100), minutes: Math.round(busHours * 60)
  }];
  if (km >= 400) options.push({ mode: 'flight', emoji: '✈️', label: 'Flight', fare: roundTo(45000 + km * 20, 500), minutes: 5 * 60 });
  return options;
}

/** Mum's gift on admission: enough for the cheapest trip plus registration money. */
export function giftFor(townId, uni, base = 10000) {
  const bus = travelOptions(townId, uni)[0].fare;
  return Math.max(base, roundTo(bus + 7000, 500));
}

const ROAD_EVENTS = [
  { text: 'The bus broke down for an hour. You waited by the roadside.', fx: { stress: 6, energy: -4 } },
  { text: 'A police checkpoint stopped the bus. You showed your admission letter and went on.', fx: { stress: 3 } },
  { text: 'You bought roasted corn and groundnuts from a roadside seller.', fx: { hunger: 18, fun: 3 }, cost: 400 },
  { text: 'Heavy traffic. Everyone argued about politics until it cleared.', fx: { stress: 4, fun: 4 } },
  { text: 'You slept most of the way with your bag on your lap.', fx: { energy: 10 } },
  { text: 'A friendly passenger shared her puff-puff. You talked about school all the way.', fx: { hunger: 10, fun: 8 } }
];

/** One road event chosen by `roll` (0 to 1). Flights have none. */
export function roadEvent(mode, roll) {
  if (mode === 'flight') return { text: 'The flight was smooth. You watched the clouds and practised your introduction.', fx: { stress: -4, fun: 4 } };
  return ROAD_EVENTS[Math.min(ROAD_EVENTS.length - 1, Math.floor(roll * ROAD_EVENTS.length))];
}

export const durationText = minutes => {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return h ? `${h} hour${h > 1 ? 's' : ''}${m >= 15 ? ` ${m} min` : ''}` : `${m} min`;
};
