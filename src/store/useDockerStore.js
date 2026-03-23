import { create } from 'zustand';
import dockerEngine from '../engine/DockerEngine';
import levels from '../levels/tutorial.json';

export const useDockerStore = create((set, get) => {
  // Bind the engine's state changes to Zustand so React components
  // automatically re-render when the engine state mutates.
  dockerEngine.setStateChangeHandler((newState) => {
    set({ ...newState });
  });

  return {
    ...dockerEngine.getSnapshot(),
    xp: 0,
    lvlIndex: 0,
    commandCount: 0,
    execute: (command) => {
      const output = dockerEngine.execute(command);
      set((state) => ({ commandCount: state.commandCount + 1 }));
      return output;
    },
    addXP: (amount) => set((state) => ({ xp: state.xp + amount })),
    setLevelIndex: (index) => set({ lvlIndex: index, commandCount: 0 }),
    getHistory: () => {
      return dockerEngine.getHistory();
    },
    reset: () => {
      dockerEngine.reset();
      set({ ...dockerEngine.getSnapshot(), xp: 0, lvlIndex: 0, commandCount: 0 });
    },
    getGoalState: () => {
      const level = levels[get().lvlIndex];
      if (!level || !level.goal) return { containers: [], networks: [], images: [] };
      
      const goal = level.goal;
      const state = { containers: [], networks: [], images: [] };
      
      if (goal.type === 'container_exists') {
        state.containers.push({ id: 'goal-c1', name: goal.name || 'target-container', image: goal.image, status: 'Up' });
      } else if (goal.type === 'image_has_layers') {
        state.images.push({ id: 'goal-i1', name: goal.image, layers: Array(goal.min_layers).fill('layer') });
      } else if (goal.type === 'network_connected') {
        state.networks.push({ id: 'goal-n1', name: goal.network });
        state.containers.push({ id: 'goal-c1', name: 'target-node', image: goal.container_image, status: 'Up', networks: [goal.network] });
      } else if (goal.type === 'volume_mounted') {
        state.containers.push({ id: 'goal-c1', name: 'target-node', image: 'ubuntu', status: 'Up', volumes: [{ name: goal.volume, path: goal.mount_path }] });
      }
      return state;
    }
  };
});
