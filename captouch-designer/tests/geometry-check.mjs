// Geometry regression check for index.html.
// Extracts the DOM-free <script id="geo"> block from the page and runs build()
// over a set of parameter cases, checking that every electrode polygon:
//   - has only finite coordinates
//   - does not self-intersect
//   - keeps at least the requested clearance from every other channel
// Usage: node tests/geometry-check.mjs [path/to/index.html]
// Exits non-zero on any failure.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const htmlPath = process.argv[2] || resolve(here, '..', 'index.html');
const html = readFileSync(htmlPath, 'utf8');
const m = html.match(/<script id="geo">([\s\S]*?)<\/script>/);
if (!m) { console.error('No <script id="geo"> block found in ' + htmlPath); process.exit(2); }
const { build } = new Function(m[1] + '\nreturn { build };')();

// Same defaults as DEF in the page (geometry-relevant keys only).
const base = { type: 'linear', n: 3, tines: 7, overlap: 90, clr: 0.3, tip: 0.4,
  L: 60, W: 12, ends: 'split', split: 'last', pad: 1,
  aRo: 30, aRi: 18, aCenter: 0, sweep: 120, wRo: 20, wRi: 10, rot: 0 };

const cases = [
  {}, { ends: 'separate', n: 4 }, { split: 'first' }, { tines: 9, overlap: 95, clr: 0.2 },
  { tines: 2 }, { tines: 15, W: 8 }, { n: 8, L: 120 }, { clr: 1, tip: 2 }, { pad: 0 },
  { type: 'arc' }, { type: 'arc', ends: 'separate', n: 5, sweep: 240 }, { type: 'arc', sweep: 300, aCenter: 90 },
  { type: 'wheel' }, { type: 'wheel', n: 4 }, { type: 'wheel', n: 8, wRo: 40, wRi: 25 },
  { type: 'wheel', tines: 3, overlap: 90, clr: 0.5, tip: 0.1 }, { type: 'wheel', tines: 15, wRo: 15, wRi: 8 },
  { type: 'wheel', rot: 45, overlap: 30 },
];

function orient(p, q, r) { return Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])); }
function crosses(a, b, c, d) { return orient(a, b, c) * orient(a, b, d) < 0 && orient(c, d, a) * orient(c, d, b) < 0; }
function selfIntersections(pts) {
  let count = 0; const n = pts.length;
  for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) {
    if (i === 0 && j === n - 1) continue;
    if (crosses(pts[i], pts[(i + 1) % n], pts[j], pts[(j + 1) % n])) count++;
  }
  return count;
}
function pointSegDist(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
  let t = L ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L : 0; t = Math.max(0, Math.min(1, t));
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy);
}
function gap(P, Q) {
  let g = Infinity;
  for (const p of P) for (let i = 0; i < Q.length; i++) g = Math.min(g, pointSegDist(p, Q[i], Q[(i + 1) % Q.length]));
  return g;
}

let failed = 0;
for (const cs of cases) {
  const p = { ...base, ...cs };
  const g = build(p);
  const problems = [];
  let minGap = Infinity, sx = 0;
  for (const pg of g.polys) {
    if (pg.pts.some(q => !Number.isFinite(q[0]) || !Number.isFinite(q[1]))) problems.push('non-finite point');
    sx += selfIntersections(pg.pts);
  }
  for (let i = 0; i < g.polys.length; i++) for (let j = i + 1; j < g.polys.length; j++) {
    if (g.polys[i].ch === g.polys[j].ch) continue;
    minGap = Math.min(minGap, gap(g.polys[i].pts, g.polys[j].pts), gap(g.polys[j].pts, g.polys[i].pts));
  }
  if (sx) problems.push(sx + ' self-intersection(s)');
  if (minGap < p.clr - 1e-3) problems.push('gap ' + minGap.toFixed(4) + ' < clearance ' + p.clr);
  const label = JSON.stringify(cs);
  if (problems.length) { failed++; console.log('FAIL', label, problems.join('; ')); }
  else console.log('ok  ', label, 'polys=' + g.polys.length, 'minGap=' + minGap.toFixed(4), g.warn.length ? 'warn=' + g.warn : '');
}
console.log(failed ? `${failed} case(s) failed` : `all ${cases.length} cases passed`);
process.exit(failed ? 1 : 0);
