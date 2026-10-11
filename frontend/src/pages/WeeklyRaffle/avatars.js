/* User avatar id -> the file that actually holds that avatar's pixels.
 *
 * The rendered markup serves every avatar from `//img2.distributedresourcestorage.com/
 * avatar/<userId>/s`, and that host — unlike bc.game's own origin — IS reachable from this
 * environment, so all 47 referenced avatars are real downloads rather than crops. They came
 * back at 320-500px and ~70KB each, far past what a 40px circle needs, and were re-encoded
 * at 80px (2x the largest slot on the page).
 *
 * THEY COLLAPSE TO THIRTEEN FILES. Most bc.game accounts keep one of a small set of default
 * avatars, so 45 of the 47 ids resolve to one of eleven images; only two users on this page
 * have uploaded their own. Deduplicating took the directory from 2.1MB to 149KB, and this
 * map is what pays for it — the id stays the fixture's field (it is what the API would
 * carry), and this resolves it to the file on disk.
 *
 * When a real endpoint lands, delete this and let the <img> point at the CDN again: the id
 * in the payload is already the whole URL.
 */
export const AVATAR_FILE = {
  1318745: '105522617',
  3338507: '105248001',
  3719246: '102053799',
  5726897: '102053799',
  6776555: '17174407',
  6911253: '6911253',
  6943417: '17174407',
  17135625: '105522617',
  17174407: '17174407',
  20165609: '102053799',
  22565662: '22565662',
  22789557: '105522617',
  26588303: '105522617',
  26992119: '26992119',
  27502995: '105522617',
  27858975: '26992119',
  29570407: '102053799',
  31394873: '31394873',
  32182756: '26992119',
  40744851: '40744851',
  50503575: '50503575',
  59963810: '105248001',
  60941193: '17174407',
  72609973: '105522617',
  78574614: '17174407',
  79849889: '105522617',
  95113725: '95113725',
  95765421: '105248001',
  99928686: '105248001',
  102053799: '102053799',
  103273025: '103273025',
  105248001: '105248001',
  105522617: '105522617',
  105800155: '102053799',
  105975904: '105522617',
  105998732: '105998732',
  106135213: '105248001',
  933119208986931: '105522617',
  933738280217764: '102053799',
  935557633347736: '102053799',
  935634039107358: '17174407',
  935656450159844: '105522617',
  935969228581539: '105248001',
  936017414200159: '105248001',
  936162048466415: '17174407',
  936516943400422: '17174407',
  936606272198718: '26992119',
};

export default AVATAR_FILE;
