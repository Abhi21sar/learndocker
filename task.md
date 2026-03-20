# Docker Learning Platform - Task Checklist

This file tracks the phases of implementation aligned with `implementation_plan.md`.

## Phase 1: Engine state & API (Model)
- Expand `src/engine/DockerEngine.js` to include:
  - `networks`
  - `volumes`
  - richer `images` structure with layers
  - container mounts (volume -> path)
- Add engine APIs:
  - `getSnapshot()`
  - `getHistory()`
  - `reset()` (for tests and deterministic behavior)

## Phase 2: Command dispatcher (Execution)
- Refactor `DockerEngine.execute()` to route commands through a dispatcher.
- Implement the MVP command subset:
  - `docker build`
  - `docker run` (+ options)
  - `docker ps`, `docker images`
  - `docker stop`, `docker rm`
  - `docker network create`, `docker network connect`
  - `docker volume create`
  - `docker compose up` (simulated multi-container orchestration)

## Phase 3: Level system (Progression)
- Implement `src/levels/LevelManager.js` (or similar) to:
  - load `src/levels/tutorial.json`
  - check goal types against engine snapshots + command history:
    - `container_exists`
    - `command_history`
    - `network_connected`
    - `volume_mounted`
    - `compose_started`
- Wire level checking into the CLI after each command.

## Phase 4: UI wiring
- Update `src/App.jsx` to display:
  - current level title/objective
  - success state and “next level” control
- Update `src/components/Terminal.jsx` to print level completion feedback.

## Phase 5: Visualization upgrades
- Update `src/components/Visualization.jsx` to:
  - render image layers vertically
  - render container network memberships and mounts
  - add network/connection indicators

## Phase 6: Tests & determinism
- Add lightweight JS tests for:
  - command parsing/execution
  - goal evaluation logic
- Make engine IDs deterministic to avoid flaky goal checks.

