import unilag from './unilag.js';
import ui from './ui.js';
import oau from './oau.js';

/*
 * Every university the game knows. To add one: write a pack (see schema.js), import it here and add it to PACKS and PACK_ORDER.
 * The rest of the game (campuses, cut-offs, fees, travel distances) reads from these packs, never from its own copy.
 */
export const PACKS = { unilag, ui, oau };
export const PACK_ORDER = ['unilag', 'ui', 'oau'];
export const packOf = id => PACKS[id] || null;
/** The faculties of a university with the programmes in each, or null when its pack has no faculty structure yet. */
export const facultiesOf = id => PACKS[id]?.faculties || null;
