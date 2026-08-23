const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const appSource = fs.readFileSync('app.js', 'utf8');
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

console.log('Logo candidate regression test passed.');
