// A tiny seeded random generator (mulberry32) so every scene draws the
// same stars, windows and blossoms on both panels, every run, every load.
// The two pictures differ only where a difference says so, never by chance.

export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// A number in [min, max) from the generator.
export function range(rng, min, max) {
  return min + rng() * (max - min);
}

// One item of an array, picked by the generator.
export function pick(rng, items) {
  return items[Math.floor(rng() * items.length)];
}
