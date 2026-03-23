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
      case 'build':
        return this.buildImage(args);
      case 'push':
        return this.pushImage(args);
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
    // Supported options (MVP):
    // - --name <name>
    // - --network <networkName>
    // - -v <volumeName>:<containerPath>
    let containerName = null;
    let requestedNetwork = null;
    const mounts = [];
    let imageName = null;
    let ports = '80/tcp';
    let isDetached = false;

    for (let i = 0; i < args.length; i++) {
      const a = args[i];
      if (a === '--name') {
        containerName = args[i + 1];
        i++;
        continue;
      }
      if (a === '--network') {
        requestedNetwork = args[i + 1];
        i++;
        continue;
      }
      if (a === '-v') {
        const spec = args[i + 1] || '';
        const [volName, mountPath] = spec.split(':');
        if (volName && mountPath) mounts.push({ volumeName: volName, containerPath: mountPath });
        i++;
        continue;
      }
      if (a === '-p' || a === '--publish') {
        ports = args[i + 1];
        i++;
        continue;
      }
      if (a === '-d' || a === '--detach') {
        isDetached = true;
        continue;
      }
      if (!a.startsWith('-') && !imageName) {
        imageName = a;
      }
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
      networkIds: [],
      mounts: [] // { volumeId, volumeName, containerPath }
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
    // Minimal parsing:
    // - docker build -t <name> .
    // - docker build <name>
    let tag = null;
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '-t' || args[i] === '--tag') {
        tag = args[i + 1];
        i++;
        continue;
      }
    }

    if (!tag) return 'Simulated build: Error (missing image name/tag)';

    const contextToken = args[args.length - 1] || '.';
    const id = `img-${this._nextImageSeq++}`;

    // Deterministic "layer creation" based on the context token.
    const base = contextToken.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'context';
    const layers = [`${tag}-base`, `${base}-layer-1`, `${base}-layer-2`, `${base}-cmd`];

    const imageObj = { id, name: tag, layers, tag: 'latest' };
    const existingIdx = this.images.findIndex((img) => img.name === tag);
    if (existingIdx >= 0) this.images[existingIdx] = imageObj;
    else this.images.push(imageObj);

    this.notify();
    return `Simulated build: Success (Created image '${tag}' with ${layers.length} layers)`;
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
