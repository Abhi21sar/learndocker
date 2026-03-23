/**
 * DockerEngine Simulator
 * Simulates Docker state transitions for learning purposes.
 */

export class DockerEngine {
  constructor() {
    this.onStateChange = null;

    // Deterministic counters for stable goal checking and tests.
    this._nextContainerSeq = 1;
    this._nextImageSeq = 3;
    this._nextNetworkSeq = 1;
    this._nextVolumeSeq = 1;

    this.reset();
  }

  reset() {
    // Seed default images so early levels work immediately.
    this.images = [
      { id: 'img-1', name: 'ubuntu', layers: ['ubuntu-base', 'apt-update', 'default-cmd'], tag: 'latest' },
      { id: 'img-2', name: 'alpine', layers: ['alpine-base', 'apk-update', 'default-cmd'], tag: 'latest' }
    ];

    // Default network like Docker's implicit `bridge`.
    this.networks = [{ id: 'net-1', name: 'bridge', connectedContainerIds: [] }];
    this.volumes = [];

    this.containers = [];

    // Command history for level goals.
    this.history = [];

    // Compose state (simulated).
    this._compose = { active: false, createdContainerIds: [] };

    // Reset counters.
    this._nextContainerSeq = 1;
    this._nextImageSeq = 3;
    this._nextNetworkSeq = 2; // net-1 is used by bridge
    this._nextVolumeSeq = 1;
    return this.getSnapshot();
  }

  setStateChangeHandler(handler) {
    this.onStateChange = handler;
  }

  notify() {
    if (!this.onStateChange) return;
    this.onStateChange({
      images: [...this.images],
      containers: [...this.containers],
      networks: [...this.networks],
      volumes: [...this.volumes],
      history: [...this.history],
      compose: { ...this._compose }
    });
  }

  getHistory() {
    return [...this.history];
  }

  getSnapshot() {
    // Clone for safe consumption by the level checker.
    return JSON.parse(
      JSON.stringify({
        images: this.images,
        containers: this.containers,
        networks: this.networks,
        volumes: this.volumes,
        compose: this._compose
      })
    );
  }

  _tokenize(commandStr) {
    return commandStr.trim().split(/\s+/);
  }

  _findImage(imageName) {
    return this.images.find((img) => img.name === imageName);
  }

  _findContainerByIdOrName(idOrName) {
    return this.containers.find((c) => c.id === idOrName || c.name === idOrName);
  }

  _ensureVolume(volumeName) {
    let vol = this.volumes.find((v) => v.name === volumeName);
    if (!vol) {
      const id = `vol-${this._nextVolumeSeq++}`;
      vol = { id, name: volumeName };
      this.volumes.push(vol);
    }
    return vol;
  }

  _ensureNetwork(networkName) {
    let net = this.networks.find((n) => n.name === networkName);
    if (!net) {
      const id = `net-${this._nextNetworkSeq++}`;
      net = { id, name: networkName, connectedContainerIds: [] };
      this.networks.push(net);
    }
    return net;
  }

  _connectContainerToNetwork(container, network) {
    if (!container.networkIds.includes(network.id)) container.networkIds.push(network.id);
    if (!network.connectedContainerIds.includes(container.id)) network.connectedContainerIds.push(container.id);
  }

  execute(commandStr) {
    const trimmed = commandStr.trim();
    if (!trimmed) return '';

    const parts = this._tokenize(trimmed);
    if (parts[0] !== 'docker') return `Unknown command: ${parts[0]}`;

    const subCommand = parts[1];
    const args = parts.slice(2);

    this.history.push(trimmed);

    switch (subCommand) {
      case 'run':
        return this.runContainer(args);
      case 'ps':
        return this.listContainers(args);
      case 'images':
        return this.listImages();
      case 'stop':
        return this.stopContainer(args);
      case 'rm':
        return this.removeContainer(args);
      case 'rmi':
        return this.removeImage(args);
      case 'build':
        return this.buildImage(args);
      case 'push':
        return this.pushImage(args);
      case 'pull':
        return this.pullImage(args);
      case 'inspect':
        return this.inspectResource(args);
      case 'logs':
        return this.logsContainer(args);
      case 'stats':
        return this.statsContainers();
      case 'scout':
        return this.scoutImage(args);
      case 'init':
        return this.dockerInit();
      case 'network':
        return this.networkCommands(args);
      case 'volume':
        return this.volumeCommands(args);
      case 'compose':
        return this.composeCommands(args);
      default:
        return `docker: '${subCommand}' is not a docker command.`;
    }
  }

  runContainer(args) {
    let containerName = null;
    let requestedNetwork = null;
    const mounts = [];
    let imageName = null;
    let ports = '80/tcp';
    let isDetached = false;
    let userId = null; // for --user flag (security hardening)

    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--name') { containerName = args[i + 1]; i++; continue; }
      if (a === '--network') { requestedNetwork = args[i + 1]; i++; continue; }
      if (a === '-v') {
        const spec = args[i + 1] || '';
        const [volName, mountPath] = spec.split(':');
        if (volName && mountPath) mounts.push({ volumeName: volName, containerPath: mountPath });
        i++; continue;
      }
      if (a === '-p' || a === '--publish') { ports = args[i + 1]; i++; continue; }
      if (a === '-d' || a === '--detach') { isDetached = true; continue; }
      if (a === '--user') { userId = args[i + 1]; i++; continue; }
      if (!a.startsWith('-') && !imageName) { imageName = a; }
    }

    const image = imageName ? this._findImage(imageName) : null;
    if (!image) return `Unable to find image '${imageName || '(none)'}' locally`;

    const id = `ctr-${this._nextContainerSeq++}`;
    const newContainer = {
      id,
      name: containerName || `${image.name}_${id}`,
      imageId: image.id,
      imageName: image.name,
      status: 'Up',
      ports: ports,
      isDetached: isDetached,
      userId: userId || 'root',
      networkIds: [],
      mounts: []
    };

    const network = requestedNetwork ? this._ensureNetwork(requestedNetwork) : this._ensureNetwork('bridge');
    this._connectContainerToNetwork(newContainer, network);

    mounts.forEach((m) => {
      const vol = this._ensureVolume(m.volumeName);
      newContainer.mounts.push({
        volumeId: vol.id,
        volumeName: vol.name,
        containerPath: m.containerPath
      });
    });

    this.containers.push(newContainer);
    this.notify();
    return `Started container ${id}`;
  }

  listContainers() {
    if (this.containers.length === 0) {
      return 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES';
    }

    let output = 'CONTAINER ID   IMAGE     COMMAND   CREATED   STATUS    PORTS     NAMES\n';
    this.containers.forEach((c) => {
      output += `${c.id}       ${c.imageName}   "sh"      1s ago    ${c.status}        ${c.ports}    ${c.name}\n`;
    });
    return output;
  }

  listImages() {
    let output = 'REPOSITORY   TAG       IMAGE ID       CREATED       SIZE\n';
    this.images.forEach((img) => {
      output += `${img.name.padEnd(12)} ${img.tag.padEnd(9)} ${img.id.padEnd(14)} 2 days ago   5MB\n`;
    });
    return output;
  }

  buildImage(args) {
    let tag = null;
    let target = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-t' || args[i] === '--tag') { tag = args[i + 1]; i++; continue; }
      if (args[i] === '--target') { target = args[i + 1]; i++; continue; }
    }

    if (!tag) return 'Simulated build: Error (missing image name/tag)';

    const contextToken = args[args.length - 1] || '.';
    const id = `img-${this._nextImageSeq++}`;
    const base = contextToken.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'context';

    // Multi-stage: fewer layers when a --target is specified (optimized build)
    const layers = target
      ? [`${tag}-runtime`, `${tag}-${target}-optimized`]
      : [`${tag}-base`, `${base}-layer-1`, `${base}-layer-2`, `${base}-cmd`];

    const imageObj = { id, name: tag, layers, tag: 'latest', target: target || null };
    const existingIdx = this.images.findIndex((img) => img.name === tag);
    if (existingIdx >= 0) this.images[existingIdx] = imageObj;
    else this.images.push(imageObj);

    this.notify();
    const stageMsg = target ? ` [multi-stage --target ${target}]` : '';
    return `Simulated build: Success (Created image '${tag}'${stageMsg} with ${layers.length} layers)`;
  }

  pullImage(args) {
    const imageName = args[0];
    if (!imageName) return 'docker pull: requires image name';
    if (this._findImage(imageName)) return `${imageName}: Image already up to date`;
    const id = `img-${this._nextImageSeq++}`;
    const image = { id, name: imageName, layers: [`${imageName}-layer-1`, `${imageName}-layer-2`], tag: 'latest' };
    this.images.push(image);
    this.notify();
    return `Pulling from library/${imageName}\nStatus: Downloaded newer image for ${imageName}:latest`;
  }

  removeImage(args) {
    const imageName = args[0];
    if (!imageName) return 'docker rmi: requires image name';
    const idx = this.images.findIndex(img => img.name === imageName || img.id === imageName);
    if (idx === -1) return `Error: No such image: ${imageName}`;
    const inUse = this.containers.some(c => c.imageName === imageName);
    if (inUse) return `Error: image ${imageName} is used by a running container. Stop and remove it first.`;
    this.images.splice(idx, 1);
    this.notify();
    return `Untagged: ${imageName}:latest\nDeleted: sha256:simulated`;
  }

  inspectResource(args) {
    const target = args[0];
    if (!target) return 'docker inspect: requires a container or image name';
    const container = this._findContainerByIdOrName(target);
    if (container) {
      return JSON.stringify([{
        Id: container.id,
        Name: `/${container.name}`,
        State: { Status: container.status === 'Up' ? 'running' : 'exited', Running: container.status === 'Up' },
        Image: container.imageName,
        NetworkSettings: { Networks: Object.fromEntries(container.networkIds.map(n => [n, { IPAddress: '172.17.0.2' }])) },
        Mounts: container.mounts,
        Config: { User: container.userId || 'root' }
      }], null, 2);
    }
    const image = this._findImage(target);
    if (image) {
      return JSON.stringify([{ Id: image.id, RepoTags: [`${image.name}:${image.tag}`], Layers: image.layers }], null, 2);
    }
    return `Error: No such container or image: ${target}`;
  }

  logsContainer(args) {
    const target = args[0];
    if (!target) return 'docker logs: requires container name';
    const container = this._findContainerByIdOrName(target);
    if (!container) return `Error: No such container: ${target}`;
    return [
      `[2026-03-24T01:00:00Z] ${container.imageName} started on port ${container.ports}`,
      `[2026-03-24T01:00:01Z] Listening for connections...`,
      `[2026-03-24T01:00:02Z] Health check: OK`,
    ].join('\n');
  }

  statsContainers() {
    if (this.containers.length === 0) return 'No running containers.';
    let out = 'CONTAINER ID   NAME               CPU %   MEM USAGE / LIMIT   NET I/O\n';
    this.containers.filter(c => c.status === 'Up').forEach((c, i) => {
      const cpu = (Math.random() * 2 + 0.1).toFixed(2);
      const mem = (Math.random() * 200 + 50).toFixed(0);
      out += `${c.id}   ${c.name.padEnd(18)} ${cpu}%   ${mem}MiB / 2GiB       0B / 0B\n`;
    });
    return out;
  }

  scoutImage(args) {
    const imageName = args[args.length - 1];
    if (!imageName) return 'docker scout: requires image name';
    const image = this._findImage(imageName);
    if (!image) return `Error: image not found locally: ${imageName}. Run 'docker pull ${imageName}' first.`;
    return [
      `✓  Analyzed image: ${imageName}:${image.tag}`,
      `   Layers: ${image.layers.length}`,
      ``,
      `   Vulnerabilities:`,
      `   ✗  2 Critical  (CVE-2024-1234, CVE-2024-5678)`,
      `   ⚠  5 High      (various base image CVEs)`,
      `   ℹ  12 Medium`,
      ``,
      `   Recommendations:`,
      `   ▸  Pin base image: ${imageName}@sha256:abc123def456`,
      `   ▸  Use 'docker build --no-cache' to rebuild clean`,
      `   ▸  Run as non-root: add USER 1000 to your Dockerfile`,
    ].join('\n');
  }

  dockerInit() {
    return [
      `✓  Created: Dockerfile (Node.js 20 Alpine — multi-stage)`,
      `✓  Created: compose.yaml (web + db services)`,
      `✓  Created: .dockerignore (node_modules, .git, dist)`,
      ``,
      `Next steps:`,
      `  1. Edit compose.yaml to configure your services`,
      `  2. Run 'docker compose up' to start the stack`,
      `  3. Add 'watch:' rules to enable live file sync with 'docker compose watch'`,
    ].join('\n');
  }

  pushImage(args) {
    const imageName = args[0];
    if (!imageName) return 'docker push: missing image name';
    const image = this._findImage(imageName);
    if (!image) return `An image does not exist locally with the tag: ${imageName}`;

    return `The push refers to repository [docker.io/library/${imageName}]\n` +
           `${image.layers.map(l => `${l}: Pushed`).join('\n')}\n` +
           `latest: digest: sha256:dummydigest size: 1024`;
  }

  networkCommands(args) {
    const action = args[0];
    const rest = args.slice(1);

    if (action === 'create') {
      const name = rest[0];
      if (!name) return 'docker network: missing network name';
      const net = this._ensureNetwork(name);
      this.notify();
      return `network '${net.name}' created`;
    }

    if (action === 'connect') {
      const networkName = rest[0];
      const containerIdOrName = rest[1];
      if (!networkName || !containerIdOrName) {
        return 'docker network connect: usage: docker network connect <network> <container>';
      }
      const net = this._ensureNetwork(networkName);
      const container = this._findContainerByIdOrName(containerIdOrName);
      if (!container) return `Error: No such container: ${containerIdOrName}`;
      this._connectContainerToNetwork(container, net);
      this.notify();
      return `Connected ${container.id} to network '${net.name}'`;
    }

    return `docker network: '${action}' is not supported in simulator`;
  }

  volumeCommands(args) {
    const action = args[0];
    const rest = args.slice(1);

    if (action === 'create') {
      const name = rest[0];
      if (!name) return 'docker volume: missing volume name';
      this._ensureVolume(name);
      this.notify();
      return `volume '${name}' created`;
    }

    return `docker volume: '${action}' is not supported in simulator`;
  }

  composeCommands(args) {
    const action = args[0];
    if (action !== 'up') return `docker compose: '${action || ''}' is not supported in simulator`;

    const composeNetwork = this._ensureNetwork('compose-net');
    const composeVolume = this._ensureVolume('compose-vol');

    if (this._compose.active) return 'Compose is already running in simulator (no-op).';

    const webImg = this._findImage('ubuntu') || this.images[0];
    const dbImg = this._findImage('alpine') || this.images[1];

    const webCtrId = `ctr-${this._nextContainerSeq++}`;
    const dbCtrId = `ctr-${this._nextContainerSeq++}`;

    const webContainer = {
      id: webCtrId,
      name: 'compose_web_1',
      imageId: webImg.id,
      imageName: webImg.name,
      status: 'Up',
      ports: '80/tcp',
      networkIds: [],
      mounts: [
        { volumeId: composeVolume.id, volumeName: composeVolume.name, containerPath: '/data' }
      ]
    };

    const dbContainer = {
      id: dbCtrId,
      name: 'compose_db_1',
      imageId: dbImg.id,
      imageName: dbImg.name,
      status: 'Up',
      ports: '5432/tcp',
      networkIds: [],
      mounts: []
    };

    this._connectContainerToNetwork(webContainer, composeNetwork);
    this._connectContainerToNetwork(dbContainer, composeNetwork);

    this.containers.push(webContainer, dbContainer);
    this._compose = { active: true, createdContainerIds: [webCtrId, dbCtrId] };
    this.notify();

    return 'Compose: started services compose_web_1 and compose_db_1';
  }

  stopContainer(args) {
    const id = args[0];
    const container = this._findContainerByIdOrName(id);
    if (!container) return `Error: No such container: ${id}`;

    container.status = 'Exited';
    this.notify();
    return id;
  }

  removeContainer(args) {
    const id = args[0];
    const toRemove = this._findContainerByIdOrName(id);
    const initialLength = this.containers.length;

    this.containers = this.containers.filter((c) => c.id !== id && c.name !== id);
    if (toRemove) {
      this.networks.forEach((n) => {
        n.connectedContainerIds = n.connectedContainerIds.filter((cid) => cid !== toRemove.id);
      });
    }

    if (this.containers.length < initialLength) {
      this.notify();
      return id;
    }
    return `Error: No such container: ${id}`;
  }
}

export default new DockerEngine();
