const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('app.js', 'utf8');
const stylesSource = fs.readFileSync('styles.css', 'utf8');
const start = appSource.indexOf('function getCandidateLogos');
const end = appSource.indexOf('\n\n  // Global Image Fallback', start);

assert.notEqual(start, -1, 'getCandidateLogos should exist in app.js');
assert.notEqual(end, -1, 'getCandidateLogos should end before the fallback handler');

const getCandidateLogos = vm.runInNewContext(`(${appSource.slice(start, end).trim()})`);
const candidates = getCandidateLogos('https://github.com/example/mod');

assert.ok(
  candidates.includes('https://raw.githubusercontent.com/example/mod/main/LOGO.png'),
  'logo lookup should include an uppercase LOGO.png root path'
);

assert.match(
  stylesSource,
  /\.mod-thumbnail-frame \{[\s\S]*?aspect-ratio:\s*1018\s*\/\s*744;/,
  'thumbnail frame should preserve the supplied 1018:744 aspect ratio'
);
assert.match(
  stylesSource,
  /\.mod-thumbnail-img \{[\s\S]*?object-fit:\s*contain;/,
  'thumbnail images should be contained instead of cropped'
);

assert.match(
  stylesSource,
  /\[data-theme="pokedex"\]\s+\.tab-pill\.active\s*\{[\s\S]*?background:\s*var\(--poke-blue\);[\s\S]*?color:\s*var\(--text-inverse\);/,
  'dark-theme active tabs should use readable contrasting colors'
);

console.log('Logo candidate regression test passed.');
