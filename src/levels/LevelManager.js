/**
 * LevelManager
 * Checks whether the player's current command sequence satisfies the active level goal.
 */

export function evaluateGoal(goal, snapshot, history) {
  if (!goal || !goal.type) return false;

  const containers = snapshot?.containers || [];
  const networks = snapshot?.networks || [];
  const volumes = snapshot?.volumes || [];

  const findNetworkIdByName = (name) => networks.find((n) => n.name === name)?.id || null;
  const findVolumeIdByName = (name) => volumes.find((v) => v.name === name)?.id || null;

  switch (goal.type) {
    case 'container_exists': {
      const image = goal.image;
      const name = goal.container_name || goal.name;
      const status = goal.status;
      const networkName = goal.network;

      const networkId = networkName ? findNetworkIdByName(networkName) : null;
      if (networkName && !networkId) return false;

      return containers.some((c) => {
        if (image && c.imageName !== image) return false;
        if (name && c.name !== name) return false;
        if (status && c.status !== status) return false;
        if (networkId && !c.networkIds.includes(networkId)) return false;
        return true;
      });
    }

    case 'command_history': {
      const expected = (goal.command || '').trim();
      if (!expected) return false;
      const historyList = history || snapshot?.history || [];
      // Exact match on trimmed strings keeps this deterministic and easy for learners.
      return historyList.some((cmd) => cmd.trim() === expected);
    }

    case 'network_connected': {
      const networkName = goal.network;
      const containerImage = goal.container_image || goal.image;
      const containerName = goal.container_name || goal.name;
      if (!networkName) return false;

      const networkId = findNetworkIdByName(networkName);
      if (!networkId) return false;

      return containers.some((c) => {
        if (containerImage && c.imageName !== containerImage) return false;
        if (containerName && c.name !== containerName) return false;
        return c.networkIds.includes(networkId);
      });
    }

    case 'volume_mounted': {
      const volumeName = goal.volume;
      const mountPath = goal.mount_path || goal.path;
      const containerImage = goal.container_image || goal.image;
      const containerName = goal.container_name || goal.name;
      if (!volumeName || !mountPath) return false;

      // Accept either by name (preferred) or by id if provided.
      const volumeId = goal.volume_id ? goal.volume_id : findVolumeIdByName(volumeName);

      return containers.some((c) => {
        if (containerImage && c.imageName !== containerImage) return false;
        if (containerName && c.name !== containerName) return false;

        return (c.mounts || []).some((m) => {
          const matchesVolume =
            (volumeId && m.volumeId === volumeId) ||
            (m.volumeName && m.volumeName === volumeName) ||
            (!volumeId && m.volumeName === volumeName);
          return matchesVolume && m.containerPath === mountPath;
        });
      });
    }

    case 'compose_started': {
      const compose = snapshot?.compose;
      if (!compose?.active) return false;
      const names = new Set((snapshot?.containers || []).map((c) => c.name));
      // Basic sanity checks for the simulated topology.
      return names.has('compose_web_1') && names.has('compose_db_1');
    }

    case 'image_exists': {
      const imageName = goal.image;
      if (!imageName) return false;
      return (snapshot?.images || []).some((img) => img.name === imageName);
    }

    case 'image_has_layers': {
      const imageName = goal.image;
      const minCount = goal.min_layers || goal.minLayers || 0;
      if (!imageName) return false;
      const img = (snapshot?.images || []).find((i) => i.name === imageName);
      if (!img) return false;
      return (img.layers || []).length >= minCount;
    }

    default:
      return false;
  }
}

export default class LevelManager {
  constructor(levels = []) {
    this.levels = levels;
    this.currentIndex = 0;
    this.completedLevelIds = new Set();
  }

  getCurrentIndex() {
    return this.currentIndex;
  }

  getCurrentLevel() {
    return this.levels[this.currentIndex] || null;
  }

  isLastLevel() {
    return this.currentIndex >= this.levels.length - 1;
  }

  checkCurrentLevel(snapshot, history = []) {
    const level = this.getCurrentLevel();
    if (!level) return { done: true, message: 'All levels complete!' };

    const alreadyCompleted = this.completedLevelIds.has(level.id);

    const goalSatisfied = evaluateGoal(level.goal, snapshot, history);
    const done = alreadyCompleted || goalSatisfied;
    if (!done) return { done: false, message: '', justCompleted: false };

    const justCompleted = !alreadyCompleted && goalSatisfied;
    if (justCompleted) this.completedLevelIds.add(level.id);

    return {
      done: true,
      message: justCompleted ? `Level complete: ${level.title}` : '',
      justCompleted
    };
  }

  advance() {
    if (!this.isLastLevel()) {
      this.currentIndex++;
    }
    return this.getCurrentLevel();
  }
}

