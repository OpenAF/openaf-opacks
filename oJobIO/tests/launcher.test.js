// Run with: node tests/launcher.test.js
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(__dirname + '/../launcher.js', 'utf8');
function harness(options = {}) {
  const calls = { writes: [], runs: [], saved: [], closed: 0, reads: [], raw: 0 };
  const keys = [...(options.keys || [])], choices = [...(options.choices || [])], answers = [...(options.answers || [])];
  const ui = { ansi: options.ansi !== false, size: () => ({ width: options.width || 100, height: 24 }),
    raw: fn => { calls.raw++; return fn(); }, read() {}, close: () => calls.closed++,
    write: s => calls.writes.push(String(s)) };
  const job = options.job || { help: { text: 'Current description', expects: [] }, todo: ['Test'], jobs: [] };
  const context = {
    askConsole: () => ui,
    askKey: () => { assert.ok(keys.length, 'unexpected key read'); return keys.shift(); },
    askChoose: (p, values) => { assert.ok(choices.length, 'unexpected choice: ' + p); return choices.shift(); },
    askChooseMultiple: () => ['1', '3'],
    ask: () => { assert.ok(answers.length, 'unexpected argument prompt'); return answers.shift(); },
    ow: { loadFormat() {}, format: { string: { ansiClip: (s, w) => s.slice(0, w), ansiPad: (s, w) => s.padEnd(w) } },
      oJob: { output: r => calls.output = r } },
    ansiColor: (style, s) => s,
    io: { fileExists: () => !!options.state, readFileJSON: file => {
      calls.reads.push(file); if (file.endsWith('launcher-state.json')) return options.state; return job;
    }, readFileYAML: file => { calls.reads.push(file); return job; },
    writeFileJSON: (file, value) => calls.saved.push(JSON.parse(JSON.stringify(value))) },
    $rest: () => ({ get: id => { calls.reads.push(id); if (options.fetchError) throw Error('offline'); return job; } }),
    oJobRun: (j, args) => { calls.runs.push({ job: j, args }); if (options.runError) throw Error('job failed'); return 'result'; },
    now: () => 0, isDef: v => v !== undefined && v !== null,
    java: { lang: { System: { getProperty: () => options.os || 'Mac OS X' } } }
  };
  if (options.missing) delete context[options.missing];
  const launcher = vm.runInNewContext(source, context);
  const cfg = { name: 'test.io', home: '/fake', ids: options.ids || ['https://test.io/hello/world.yaml'],
    globalPath: '/global', catalog: options.catalog || [], args: options.args || {} };
  return { calls, run: () => launcher(cfg), keys };
}
let h = harness({ missing: 'askKey' }); assert.equal(h.run(), false); assert.equal(h.calls.closed, 0);
h = harness({ args: { ui: 'legacy' } }); assert.equal(h.run(), false); assert.equal(h.calls.raw, 0);
h = harness({ ansi: false }); assert.equal(h.run(), false); assert.equal(h.calls.closed, 1);
h = harness({ keys: ['ctrl-c'] }); assert.equal(h.run(), true); assert.equal(h.calls.runs.length, 0); assert.equal(h.calls.closed, 1);
h = harness({ keys: ['enter'], choices: [0, 0], args: { ui: 'auto', init: {}, supplied: 'keep' } });
assert.equal(h.run(), true); assert.equal(h.calls.runs.length, 1); assert.equal(h.calls.runs[0].args.supplied, 'keep');
assert.equal('ui' in h.calls.runs[0].args, false); assert.equal(h.calls.closed, 1);
assert.equal(h.calls.saved[0].recent[0], 'https://test.io/hello/world.yaml');
// Description-only matching and full path identity survive a narrow display and identical prefixes.
h = harness({ width: 24, keys: [...'needle', 'enter'], choices: [0, 0],
  ids: ['https://test.io/very/long/shared/a.yaml', 'https://test.io/very/long/shared/b.yaml'],
  catalog: [{ id: 'https://test.io/very/long/shared/b.yaml', description: 'needle description' }] });
h.run(); assert.equal(h.calls.reads[0], 'https://test.io/very/long/shared/b.yaml');
// A fetch failure never executes; the browser remains usable.
h = harness({ keys: ['enter', 'ctrl-c'], fetchError: true }); h.run(); assert.equal(h.calls.runs.length, 0);
// Required prompts retry, supplied values survive blank input, secrets are masked everywhere.
h = harness({ keys: ['enter'], choices: [0, 0], answers: ['', 'needed', 'private-value', ''],
  args: { existing: 'retained' }, job: { todo: [], help: { expects: [
    { name: 'required', mandatory: true }, { name: 'password', secret: true }, { name: 'existing' }
  ] } } });
h.run(); assert.equal(h.calls.runs[0].args.required, 'needed'); assert.equal(h.calls.runs[0].args.password, 'private-value');
assert.equal(h.calls.runs[0].args.existing, 'retained'); assert.ok(!h.calls.writes.join('\n').includes('private-value'));
assert.ok(!JSON.stringify(h.calls.saved).includes('private-value'));
// Legacy Help job, choices, multiple choices, and local path resolution.
h = harness({ keys: ['enter'], choices: [0, 2, 0], ids: ['_global/tool.yml'], job: { jobs: [
  { name: 'Help', help: { expects: [{ name: 'choice', options: ['a', 'b'] }, { name: 'many', moptions: ['x', 'y', 'z'] }] } }
] } });
h.run(); assert.equal(h.calls.reads[0], '/global/tool.yml'); assert.equal(h.calls.runs[0].args.choice, 'b'); assert.equal(h.calls.runs[0].args.many, 'x,z');
// Back and declined confirmation cannot execute.
h = harness({ keys: ['enter'], choices: [0, 3] }); h.run(); assert.equal(h.calls.runs.length, 0);
h = harness({ keys: ['enter', 'ctrl-c'], choices: [2] }); h.run(); assert.equal(h.calls.runs.length, 0);
// Favorites toggle without retaining arguments, and unavailable entries can be removed.
h = harness({ keys: ['enter', 'ctrl-c'], choices: [1, 2] }); h.run(); assert.equal(h.calls.saved[0].favorites.length, 1);
h = harness({ keys: ['tab', 'enter', 'ctrl-c'], choices: [2, 0], state: { version: 1, favorites: ['gone'], recent: ['gone'] } });
h.run(); assert.equal(h.calls.saved[0].favorites.length, 0); assert.equal(h.calls.saved[0].recent.length, 0);
// Failed execution is propagated after closing the UI, without a retry or fallback.
h = harness({ keys: ['enter'], choices: [0, 0], runError: true }); assert.throws(h.run, /job failed/);
assert.equal(h.calls.runs.length, 1); assert.equal(h.calls.closed, 1);
// Optional choice omission and edit/keep use the original argument identities.
h = harness({ keys: ['enter'], choices: [0, 0, 0], job: { todo: [], help: { expects: [{ name: 'optional', options: ['x', 'y'] }] } } });
h.run(); assert.equal('optional' in h.calls.runs[0].args, false);
h = harness({ keys: ['enter'], choices: [0, 0, 0], args: { choice: 'y' }, job: { todo: [], help: { expects: [{ name: 'choice', options: ['x', 'y'] }] } } });
h.run(); assert.equal(h.calls.runs[0].args.choice, 'y');
// Multi-word matching, empty results, Unicode deletion and corrupted state remain recoverable.
h = harness({ keys: [...'no match', 'esc', '😀', 'backspace', 'enter'], choices: [0, 0], state: { version: 99 } });
h.run(); assert.equal(h.calls.runs.length, 1); assert.ok(h.calls.writes.some(s => s.includes('No matching jobs')));
console.log('launcher behavior checks passed');
