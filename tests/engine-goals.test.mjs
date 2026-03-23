/**
 * Docker Explorer — Comprehensive Unit Tests
 *
 * Covers:
 *  - DockerEngine: all commands, output format, error handling, state mutations
 *  - LevelManager: goal evaluation (all types), advance, edge cases
 *
 * No external test framework required — uses Node.js built-in assert.
 * Run with:  npm test
 */

import assert from 'node:assert/strict';
import { DockerEngine as DockerEngineClass } from '../src/engine/DockerEngine.js';
import { evaluateGoal } from '../src/levels/LevelManager.js';
import LevelManager from '../src/levels/LevelManager.js';

// ─── Tiny test runner ──────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures = [];

function test(name, fn) {
  try {
    fn();
    passed++;
    process.stdout.write(`  ✓ ${name}\n`);
  } catch (err) {
    failed++;
    failures.push({ name, message: err.message });
    process.stdout.write(`  ✗ ${name}\n    → ${err.message}\n`);
  }
}

function section(title) {
  process.stdout.write(`\n── ${title} ${'─'.repeat(Math.max(0, 55 - title.length))}\n`);
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

function freshEngine() {
  const e = new DockerEngineClass();
  e.reset();
  return e;
}

function runGoal(goal, engine) {
  return evaluateGoal(goal, engine.getSnapshot(), engine.getHistory());
}

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 1 — DockerEngine: docker images
// ══════════════════════════════════════════════════════════════════════════════
section('docker images');

test('lists seeded images by default (ubuntu + alpine)', () => {
  const e = freshEngine();
  const out = e.execute('docker images');
  assert.match(out, /ubuntu/);
  assert.match(out, /alpine/);
});

test('output includes REPOSITORY header', () => {
  const e = freshEngine();
  const out = e.execute('docker images');
  assert.match(out, /REPOSITORY/);
});

test('built image appears in docker images', () => {
  const e = freshEngine();
  e.execute('docker build -t myapp .');
  const out = e.execute('docker images');
  assert.match(out, /myapp/);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 2 — DockerEngine: docker run
// ══════════════════════════════════════════════════════════════════════════════
section('docker run');

test('run ubuntu creates a container with status Up', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const snap = e.getSnapshot();
  assert.equal(snap.containers.length, 1);
  assert.equal(snap.containers[0].imageName, 'ubuntu');
  assert.equal(snap.containers[0].status, 'Up');
});

test('container IDs are deterministic (ctr-1, ctr-2 …)', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker run alpine');
  const snap = e.getSnapshot();
  assert.equal(snap.containers[0].id, 'ctr-1');
  assert.equal(snap.containers[1].id, 'ctr-2');
});

test('determinism: IDs reset after engine.reset()', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.reset();
  e.execute('docker run ubuntu');
  assert.equal(e.getSnapshot().containers[0].id, 'ctr-1');
});

test('--name flag sets custom container name', () => {
  const e = freshEngine();
  e.execute('docker run --name webserver ubuntu');
  assert.equal(e.getSnapshot().containers[0].name, 'webserver');
});

test('default name is <image>_<id> when no --name given', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  assert.equal(e.getSnapshot().containers[0].name, 'ubuntu_ctr-1');
});

test('run with unknown image returns error message', () => {
  const e = freshEngine();
  const out = e.execute('docker run doesnotexist');
  assert.match(out, /Unable to find image/);
});

test('container is added to bridge network by default', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const snap = e.getSnapshot();
  const bridge = snap.networks.find(n => n.name === 'bridge');
  assert.ok(bridge, 'bridge network should exist');
  assert.ok(snap.containers[0].networkIds.includes(bridge.id));
});

test('--network flag puts container on named network', () => {
  const e = freshEngine();
  e.execute('docker run --network mynet ubuntu');
  const snap = e.getSnapshot();
  const mynet = snap.networks.find(n => n.name === 'mynet');
  assert.ok(mynet, 'mynet should be auto-created');
  assert.ok(snap.containers[0].networkIds.includes(mynet.id));
});

test('-v flag mounts a volume to container', () => {
  const e = freshEngine();
  e.execute('docker run -v myvol:/data ubuntu');
  const container = e.getSnapshot().containers[0];
  assert.equal(container.mounts.length, 1);
  assert.equal(container.mounts[0].volumeName, 'myvol');
  assert.equal(container.mounts[0].containerPath, '/data');
});

test('multiple containers can run without conflict', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker run alpine');
  e.execute('docker run ubuntu');
  assert.equal(e.getSnapshot().containers.length, 3);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 3 — DockerEngine: docker ps
// ══════════════════════════════════════════════════════════════════════════════
section('docker ps');

test('docker ps with no containers returns header only', () => {
  const e = freshEngine();
  const out = e.execute('docker ps');
  assert.match(out, /CONTAINER ID/);
  assert.doesNotMatch(out, /ctr-/);
});

test('docker ps shows running containers', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const out = e.execute('docker ps');
  assert.match(out, /ctr-1/);
  assert.match(out, /ubuntu/);
});

test('docker ps records command in history', () => {
  const e = freshEngine();
  e.execute('docker ps');
  assert.ok(e.getHistory().includes('docker ps'));
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 4 — DockerEngine: docker stop
// ══════════════════════════════════════════════════════════════════════════════
section('docker stop');

test('stop by container id changes status to Exited', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker stop ctr-1');
  assert.equal(e.getSnapshot().containers[0].status, 'Exited');
});

test('stop by container name also works', () => {
  const e = freshEngine();
  e.execute('docker run --name mybox ubuntu');
  e.execute('docker stop mybox');
  assert.equal(e.getSnapshot().containers[0].status, 'Exited');
});

test('stop non-existent container returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker stop ghost');
  assert.match(out, /No such container/);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 5 — DockerEngine: docker rm
// ══════════════════════════════════════════════════════════════════════════════
section('docker rm');

test('rm by id removes container from state', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker rm ctr-1');
  assert.equal(e.getSnapshot().containers.length, 0);
});

test('rm by name also removes container', () => {
  const e = freshEngine();
  e.execute('docker run --name mybox ubuntu');
  e.execute('docker rm mybox');
  assert.equal(e.getSnapshot().containers.length, 0);
});

test('rm also detaches container from its network', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const bridgeBefore = e.getSnapshot().networks.find(n => n.name === 'bridge');
  assert.ok(bridgeBefore.connectedContainerIds.includes('ctr-1'));

  e.execute('docker rm ctr-1');
  const bridgeAfter = e.getSnapshot().networks.find(n => n.name === 'bridge');
  assert.equal(bridgeAfter.connectedContainerIds.length, 0);
});

test('rm non-existent container returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker rm ghost');
  assert.match(out, /No such container/);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 6 — DockerEngine: docker build
// ══════════════════════════════════════════════════════════════════════════════
section('docker build');

test('build -t creates a new image', () => {
  const e = freshEngine();
  e.execute('docker build -t myapp .');
  const snap = e.getSnapshot();
  assert.ok(snap.images.find(i => i.name === 'myapp'), 'myapp image should exist');
});

test('built image has at least 3 layers', () => {
  const e = freshEngine();
  e.execute('docker build -t myapp .');
  const img = e.getSnapshot().images.find(i => i.name === 'myapp');
  assert.ok(img.layers.length >= 3);
});

test('building same name twice replaces the image (not duplicates)', () => {
  const e = freshEngine();
  e.execute('docker build -t myapp .');
  e.execute('docker build -t myapp .');
  const myapps = e.getSnapshot().images.filter(i => i.name === 'myapp');
  assert.equal(myapps.length, 1);
});

test('build without -t returns an error message', () => {
  const e = freshEngine();
  const out = e.execute('docker build .');
  assert.match(out, /missing image name/i);
});

test('--tag alias works same as -t', () => {
  const e = freshEngine();
  e.execute('docker build --tag myapp2 .');
  assert.ok(e.getSnapshot().images.find(i => i.name === 'myapp2'));
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 7 — DockerEngine: docker network
// ══════════════════════════════════════════════════════════════════════════════
section('docker network');

test('network create adds a new network', () => {
  const e = freshEngine();
  e.execute('docker network create mynet');
  assert.ok(e.getSnapshot().networks.find(n => n.name === 'mynet'));
});

test('network create is idempotent (same name returns existing)', () => {
  const e = freshEngine();
  e.execute('docker network create mynet');
  e.execute('docker network create mynet');
  const nets = e.getSnapshot().networks.filter(n => n.name === 'mynet');
  assert.equal(nets.length, 1);
});

test('network create without name returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker network create');
  assert.match(out, /missing network name/i);
});

test('network connect attaches container to network', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker network create mynet');
  e.execute('docker network connect mynet ctr-1');
  const mynet = e.getSnapshot().networks.find(n => n.name === 'mynet');
  assert.ok(mynet.connectedContainerIds.includes('ctr-1'));
});

test('network connect with non-existent container returns error', () => {
  const e = freshEngine();
  e.execute('docker network create mynet');
  const out = e.execute('docker network connect mynet ghost');
  assert.match(out, /No such container/);
});

test('unsupported network subcommand returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker network ls');
  assert.match(out, /not supported/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 8 — DockerEngine: docker volume
// ══════════════════════════════════════════════════════════════════════════════
section('docker volume');

test('volume create adds a new volume', () => {
  const e = freshEngine();
  e.execute('docker volume create myvol');
  assert.ok(e.getSnapshot().volumes.find(v => v.name === 'myvol'));
});

test('volume create is idempotent', () => {
  const e = freshEngine();
  e.execute('docker volume create myvol');
  e.execute('docker volume create myvol');
  const vols = e.getSnapshot().volumes.filter(v => v.name === 'myvol');
  assert.equal(vols.length, 1);
});

test('volume create without name returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker volume create');
  assert.match(out, /missing volume name/i);
});

test('unsupported volume subcommand returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker volume ls');
  assert.match(out, /not supported/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 9 — DockerEngine: docker compose
// ══════════════════════════════════════════════════════════════════════════════
section('docker compose');

test('compose up creates two containers', () => {
  const e = freshEngine();
  e.execute('docker compose up');
  const snap = e.getSnapshot();
  assert.equal(snap.containers.length, 2);
  assert.ok(snap.containers.find(c => c.name === 'compose_web_1'));
  assert.ok(snap.containers.find(c => c.name === 'compose_db_1'));
});

test('compose up creates compose-net network', () => {
  const e = freshEngine();
  e.execute('docker compose up');
  assert.ok(e.getSnapshot().networks.find(n => n.name === 'compose-net'));
});

test('compose up creates compose-vol volume', () => {
  const e = freshEngine();
  e.execute('docker compose up');
  assert.ok(e.getSnapshot().volumes.find(v => v.name === 'compose-vol'));
});

test('compose up is a no-op when already running', () => {
  const e = freshEngine();
  e.execute('docker compose up');
  const out = e.execute('docker compose up');
  assert.match(out, /already running/i);
  assert.equal(e.getSnapshot().containers.length, 2);
});

test('unsupported compose subcommand returns error', () => {
  const e = freshEngine();
  const out = e.execute('docker compose down');
  assert.match(out, /not supported/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 10 — DockerEngine: unknown commands & edge cases
// ══════════════════════════════════════════════════════════════════════════════
section('unknown commands & edge cases');

test('non-docker command returns unknown command message', () => {
  const e = freshEngine();
  const out = e.execute('ls -la');
  assert.match(out, /Unknown command/i);
});

test('unknown docker subcommand returns helpful message', () => {
  const e = freshEngine();
  const out = e.execute('docker exec mybox sh');
  assert.match(out, /not a docker command/i);
});

test('empty string returns empty output', () => {
  const e = freshEngine();
  const out = e.execute('');
  assert.equal(out, '');
});

test('whitespace-only input returns empty output', () => {
  const e = freshEngine();
  const out = e.execute('   ');
  assert.equal(out, '');
});

test('getHistory returns executed commands in order', () => {
  const e = freshEngine();
  e.execute('docker images');
  e.execute('docker ps');
  e.execute('docker run ubuntu');
  const history = e.getHistory();
  assert.deepEqual(history, ['docker images', 'docker ps', 'docker run ubuntu']);
});

test('getSnapshot returns a deep clone (mutations do not affect engine)', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const snap = e.getSnapshot();
  snap.containers[0].status = 'MUTATED';
  assert.equal(e.getSnapshot().containers[0].status, 'Up');
});

test('reset clears all containers volumes and networks except bridge', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker network create mynet');
  e.execute('docker volume create myvol');
  e.reset();
  const snap = e.getSnapshot();
  assert.equal(snap.containers.length, 0);
  assert.equal(snap.volumes.length, 0);
  assert.equal(snap.networks.length, 1); // only bridge
  assert.equal(snap.networks[0].name, 'bridge');
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 11 — evaluateGoal: all goal types
// ══════════════════════════════════════════════════════════════════════════════
section('evaluateGoal — container_exists');

test('container_exists: true when image matches', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  assert.equal(runGoal({ type: 'container_exists', image: 'ubuntu' }, e), true);
});

test('container_exists: false when no container', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'container_exists', image: 'ubuntu' }, e), false);
});

test('container_exists: matches by name', () => {
  const e = freshEngine();
  e.execute('docker run --name webserver ubuntu');
  assert.equal(runGoal({ type: 'container_exists', name: 'webserver' }, e), true);
});

test('container_exists: status filter works', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker stop ctr-1');
  assert.equal(runGoal({ type: 'container_exists', image: 'ubuntu', status: 'Exited' }, e), true);
  assert.equal(runGoal({ type: 'container_exists', image: 'ubuntu', status: 'Up' }, e), false);
});

test('container_exists: network filter works', () => {
  const e = freshEngine();
  e.execute('docker run --network mynet ubuntu');
  assert.equal(runGoal({ type: 'container_exists', image: 'ubuntu', network: 'mynet' }, e), true);
  assert.equal(runGoal({ type: 'container_exists', image: 'ubuntu', network: 'othernet' }, e), false);
});

section('evaluateGoal — command_history');

test('command_history: true when exact command was run', () => {
  const e = freshEngine();
  e.execute('docker ps');
  assert.equal(runGoal({ type: 'command_history', command: 'docker ps' }, e), true);
});

test('command_history: false when command not run', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'command_history', command: 'docker ps' }, e), false);
});

test('command_history: case-sensitive exact match', () => {
  const e = freshEngine();
  e.execute('docker ps');
  assert.equal(runGoal({ type: 'command_history', command: 'Docker PS' }, e), false);
});

test('command_history: empty command always returns false', () => {
  const e = freshEngine();
  e.execute('docker ps');
  assert.equal(runGoal({ type: 'command_history', command: '' }, e), false);
});

section('evaluateGoal — network_connected');

test('network_connected: true after explicit connect', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  e.execute('docker network create mynet');
  e.execute('docker network connect mynet ctr-1');
  assert.equal(runGoal({ type: 'network_connected', network: 'mynet', container_image: 'ubuntu' }, e), true);
});

test('network_connected: false when network does not exist', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  assert.equal(runGoal({ type: 'network_connected', network: 'nonexist' }, e), false);
});

test('network_connected: true when container started with --network', () => {
  const e = freshEngine();
  e.execute('docker run --network mynet ubuntu');
  assert.equal(runGoal({ type: 'network_connected', network: 'mynet' }, e), true);
});

section('evaluateGoal — volume_mounted');

test('volume_mounted: true after docker run -v', () => {
  const e = freshEngine();
  e.execute('docker run -v myvol:/data ubuntu');
  assert.equal(runGoal({ type: 'volume_mounted', volume: 'myvol', mount_path: '/data', container_image: 'ubuntu' }, e), true);
});

test('volume_mounted: false when wrong mount path', () => {
  const e = freshEngine();
  e.execute('docker run -v myvol:/data ubuntu');
  assert.equal(runGoal({ type: 'volume_mounted', volume: 'myvol', mount_path: '/wrong', container_image: 'ubuntu' }, e), false);
});

test('volume_mounted: false when volume not mounted', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  assert.equal(runGoal({ type: 'volume_mounted', volume: 'myvol', mount_path: '/data' }, e), false);
});

test('volume_mounted: false when missing required fields', () => {
  const e = freshEngine();
  e.execute('docker run -v myvol:/data ubuntu');
  assert.equal(runGoal({ type: 'volume_mounted', volume: 'myvol' }, e), false); // no mount_path
});

section('evaluateGoal — compose_started');

test('compose_started: true after docker compose up', () => {
  const e = freshEngine();
  e.execute('docker compose up');
  assert.equal(runGoal({ type: 'compose_started' }, e), true);
});

test('compose_started: false before docker compose up', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'compose_started' }, e), false);
});

section('evaluateGoal — image_exists');

test('image_exists: true for seeded ubuntu', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'image_exists', image: 'ubuntu' }, e), true);
});

test('image_exists: true after docker build', () => {
  const e = freshEngine();
  e.execute('docker build -t myapp .');
  assert.equal(runGoal({ type: 'image_exists', image: 'myapp' }, e), true);
});

test('image_exists: false for non-existent image', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'image_exists', image: 'doesnotexist' }, e), false);
});

test('image_exists: false when image field missing from goal', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'image_exists' }, e), false);
});

section('evaluateGoal — image_has_layers');

test('image_has_layers: true when min_layers met', () => {
  const e = freshEngine();
  e.execute('docker build -t myapp .');
  assert.equal(runGoal({ type: 'image_has_layers', image: 'myapp', min_layers: 3 }, e), true);
});

test('image_has_layers: false when image missing', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'image_has_layers', image: 'ghost', min_layers: 1 }, e), false);
});

test('image_has_layers: true for seeded image with layers', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'image_has_layers', image: 'ubuntu', min_layers: 2 }, e), true);
});

section('evaluateGoal — edge cases');

test('null/undefined goal returns false', () => {
  const e = freshEngine();
  assert.equal(evaluateGoal(null, e.getSnapshot(), e.getHistory()), false);
  assert.equal(evaluateGoal(undefined, e.getSnapshot(), e.getHistory()), false);
});

test('unknown goal type returns false', () => {
  const e = freshEngine();
  assert.equal(runGoal({ type: 'does_not_exist' }, e), false);
});

test('goal with no type returns false', () => {
  const e = freshEngine();
  assert.equal(runGoal({}, e), false);
});

// ══════════════════════════════════════════════════════════════════════════════
// SECTION 12 — LevelManager
// ══════════════════════════════════════════════════════════════════════════════
section('LevelManager');

const sampleLevels = [
  {
    id: 'lvl-1',
    title: 'Level 1',
    objective: 'Run ubuntu',
    goal: { type: 'container_exists', image: 'ubuntu' }
  },
  {
    id: 'lvl-2',
    title: 'Level 2',
    objective: 'Run ps',
    goal: { type: 'command_history', command: 'docker ps' }
  },
  {
    id: 'lvl-3',
    title: 'Level 3',
    objective: 'Build myapp',
    goal: { type: 'image_has_layers', image: 'myapp', min_layers: 3 }
  }
];

test('LevelManager starts at index 0', () => {
  const lm = new LevelManager(sampleLevels);
  assert.equal(lm.getCurrentIndex(), 0);
});

test('getCurrentLevel returns first level', () => {
  const lm = new LevelManager(sampleLevels);
  assert.equal(lm.getCurrentLevel().id, 'lvl-1');
});

test('isLastLevel is false when not on last level', () => {
  const lm = new LevelManager(sampleLevels);
  assert.equal(lm.isLastLevel(), false);
});

test('isLastLevel is true on last level', () => {
  const lm = new LevelManager(sampleLevels);
  lm.advance();
  lm.advance();
  assert.equal(lm.isLastLevel(), true);
});

test('advance moves to next level', () => {
  const lm = new LevelManager(sampleLevels);
  lm.advance();
  assert.equal(lm.getCurrentLevel().id, 'lvl-2');
});

test('advance does not go past last level', () => {
  const lm = new LevelManager(sampleLevels);
  lm.advance();
  lm.advance();
  lm.advance(); // already at last
  assert.equal(lm.getCurrentIndex(), 2);
});

test('checkCurrentLevel returns done:false when goal not met', () => {
  const e = freshEngine();
  const lm = new LevelManager(sampleLevels);
  const result = lm.checkCurrentLevel(e.getSnapshot(), e.getHistory());
  assert.equal(result.done, false);
});

test('checkCurrentLevel returns done:true + justCompleted when goal first met', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const lm = new LevelManager(sampleLevels);
  const result = lm.checkCurrentLevel(e.getSnapshot(), e.getHistory());
  assert.equal(result.done, true);
  assert.equal(result.justCompleted, true);
  assert.match(result.message, /Level complete/i);
});

test('checkCurrentLevel second call: done but justCompleted is false', () => {
  const e = freshEngine();
  e.execute('docker run ubuntu');
  const lm = new LevelManager(sampleLevels);
  lm.checkCurrentLevel(e.getSnapshot(), e.getHistory()); // first call marks complete
  const result = lm.checkCurrentLevel(e.getSnapshot(), e.getHistory()); // second call
  assert.equal(result.done, true);
  assert.equal(result.justCompleted, false);
  assert.equal(result.message, '');
});

test('checkCurrentLevel with empty levels returns all complete', () => {
  const lm = new LevelManager([]);
  const result = lm.checkCurrentLevel({}, []);
  assert.equal(result.done, true);
  assert.match(result.message, /All levels complete/i);
});

// ══════════════════════════════════════════════════════════════════════════════
// Results
// ══════════════════════════════════════════════════════════════════════════════

process.stdout.write('\n' + '═'.repeat(60) + '\n');
process.stdout.write(`  ${passed + failed} tests  ·  ${passed} passed  ·  ${failed} failed\n`);

if (failures.length > 0) {
  process.stdout.write('\nFailed tests:\n');
  failures.forEach(f => process.stdout.write(`  ✗ ${f.name}\n    ${f.message}\n`));
  process.exit(1);
} else {
  process.stdout.write('  All Docker Explorer tests passed. ✓\n');
}
