import { create } from 'zustand';
import dockerEngine from '../engine/DockerEngine';

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
    }
  };
});
