/*
 * Home towns for the aspirant phase, and travelling from there to the university.
 * Distances are rough road distances in km (game estimates, not survey data).
 */

import { PACKS, PACK_ORDER } from './packs/index.js';

/** Road distance in km from a home town to each university, read from the university packs. */
const kmFor = town => Object.fromEntries(PACK_ORDER.map(u => [u, PACKS[u].travel[town]]));

export const TOWNS = [
  { id: 'lagos',      name: 'Lagos',         emoji: '🌆', blurb: 'Busy, loud and never asleep.',            km: kmFor('lagos') },
  { id: 'ibadan',     name: 'Ibadan',        emoji: '🏘️', blurb: 'The big brown-roofed city.',              km: kmFor('ibadan') },
  { id: 'ife',        name: 'Ile-Ife',       emoji: '🏛️', blurb: 'An ancient town with a lively campus.',   km: kmFor('ife') },
  { id: 'uyo',        name: 'Uyo',           emoji: '🌴', blurb: 'Quiet, clean and green in Akwa Ibom.',    km: kmFor('uyo') },
  { id: 'abuja',      name: 'Abuja',         emoji: '🏙️', blurb: 'The capital, with wide roads and hills.', km: kmFor('abuja') },
  { id: 'portharcourt', name: 'Port Harcourt', emoji: '🛢️',          blurb: 'The Garden City by the delta.',           km: kmFor('portharcourt') },
  { id: 'kano',       name: 'Kano',          emoji: '🕌', blurb: 'The old trading city of the north.',      km: kmFor('kano') }
];

/*
 * Local flavour. `places` are landmarks or favourite spots; `gist` are short, light-hearted lines
 * a neighbour might say about the town (food, transport, weather). Kept kind and factual.
 */
const FLAVOUR = {
  lagos: {
    places: ['the Third Mainland Bridge', 'Tarkwa Bay beach', 'the Lekki Conservation Centre'],
    gist: ['Yellow danfo buses in Lagos have conductors who announce every stop at full volume.', 'The Third Mainland Bridge is one of the longest bridges in Africa. Traffic on it is a test of patience.', 'In Lagos, "I am on my way" can mean you have not left the house yet.']
  },
  ibadan: {
    places: ['Cocoa House', 'Bower\'s Tower on Oke Are hill', 'Dugbe market'],
    gist: ['From Bower\'s Tower you can see Ibadan\'s rusty brown rooftops spread out like a blanket.', 'Amala and gbegiri in Ibadan is a Sunday tradition in many homes.', 'Cocoa House was one of the first skyscrapers in Africa.']
  },
  ife: {
    places: ['the Oranmiyan Staff', 'the Ife Museum with its ancient bronze heads', 'the Ooni\'s palace'],
    gist: ['Ile-Ife is famous for its ancient bronze and terracotta heads, some made more than 600 years ago.', 'Many Yoruba people trace their origin story to Ile-Ife.', 'Ife is a university town. Half the people on the road have a textbook in their hands.']
  },
  uyo: {
    places: ['Ibom Plaza', 'the Godswill Akpabio Stadium', 'Ibom Air at the airport'],
    gist: ['Uyo is known for being clean and calm, and for its afang and edikang ikong soups.', 'Ibom Air is a homegrown airline based in Uyo, and the town is proud of it.', 'The rain in Uyo arrives early and stays for a long visit.']
  },
  abuja: {
    places: ['Aso Rock', 'Millennium Park', 'the National Mosque and the National Christian Centre'],
    gist: ['Abuja has wide, well-planned roads. Getting lost on them is still possible.', 'Zuma Rock, the big rock beside the road to Abuja, is a landmark everyone photographs.', 'During harmattan, Abuja mornings are dry and surprisingly cool.']
  },
  portharcourt: {
    places: ['the Isaac Boro Park', 'Pleasure Park', 'the Port Harcourt waterfront'],
    gist: ['Port Harcourt is called the Garden City, and its pepper soup and roasted fish are famous.', 'When it rains in Port Harcourt, it really rains. Umbrellas are a basic need there.', 'Port Harcourt is the centre of the oil industry in the Niger Delta.']
  },
  kano: {
    places: ['the Kurmi Market', 'the Kofar Mata dye pits', 'Dala Hill'],
    gist: ['Kano\'s Kurmi Market is one of the oldest markets in West Africa.', 'Kano is known for kilishi, tuwo and a very hot afternoon sun.', 'The Kofar Mata dye pits have been colouring cloth in Kano for centuries.']
  }
};
TOWNS.forEach(t => Object.assign(t, FLAVOUR[t.id]));

/** A flavour line for a town. `roll` is 0 to 1 (use Math.random()). */
export const townGist = (id, roll = Math.random()) => {
  const g = townOf(id).gist;
  return g[Math.min(g.length - 1, Math.floor(roll * g.length))];
};
/** A favourite local place, as a phrase such as "the Third Mainland Bridge". */
export const townPlace = (id, roll = Math.random()) => {
  const p = townOf(id).places;
  return p[Math.min(p.length - 1, Math.floor(roll * p.length))];
};

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
