import assert from 'node:assert/strict';
import { DockerEngine as DockerEngineClass } from '../src/engine/DockerEngine.js';
import { evaluateGoal } from '../src/levels/LevelManager.js';

function runGoal(goal, engine) {
  const snapshot = engine.getSnapshot();
  const history = engine.getHistory();
  return evaluateGoal(goal, snapshot, history);
}

function testDeterministicContainerIds() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker run ubuntu');
  let snapshot = engine.getSnapshot();
  assert.equal(snapshot.containers.length, 1);
  assert.equal(snapshot.containers[0].id, 'ctr-1');
  assert.equal(snapshot.containers[0].name, 'ubuntu_ctr-1');
  assert.equal(snapshot.containers[0].networkIds.length > 0, true);

  engine.reset();
  engine.execute('docker run ubuntu');
  snapshot = engine.getSnapshot();
  assert.equal(snapshot.containers[0].id, 'ctr-1');
  assert.equal(snapshot.containers[0].name, 'ubuntu_ctr-1');
}

function testContainerExistsGoal() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker run ubuntu');
  assert.equal(
    runGoal({ type: 'container_exists', image: 'ubuntu' }, engine),
    true
  );
}

function testCommandHistoryGoal() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker ps');
  assert.equal(
    runGoal({ type: 'command_history', command: 'docker ps' }, engine),
    true
  );
}

function testNetworkConnectedGoal() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker run ubuntu');
  engine.execute('docker network create mynet');
  engine.execute('docker network connect mynet ctr-1');

  assert.equal(
    runGoal(
      { type: 'network_connected', network: 'mynet', container_image: 'ubuntu' },
      engine
    ),
    true
  );
}

function testVolumeMountedGoal() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker run -v myvol:/data ubuntu');

  assert.equal(
    runGoal(
      { type: 'volume_mounted', volume: 'myvol', mount_path: '/data', container_image: 'ubuntu' },
      engine
    ),
    true
  );
}

function testComposeStartedGoal() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker compose up');

  assert.equal(
    runGoal({ type: 'compose_started' }, engine),
    true
  );
}

function testBuildLayersGoal() {
  const engine = new DockerEngineClass();
  engine.reset();
  engine.execute('docker build -t myapp .');

  assert.equal(
    runGoal({ type: 'image_has_layers', image: 'myapp', min_layers: 3 }, engine),
    true
  );
}

const tests = [
  testDeterministicContainerIds,
  testContainerExistsGoal,
  testCommandHistoryGoal,
  testNetworkConnectedGoal,
  testVolumeMountedGoal,
  testComposeStartedGoal,
  testBuildLayersGoal
];

for (const t of tests) {
  t();
}

console.log('All Docker simulator goal tests passed.');

