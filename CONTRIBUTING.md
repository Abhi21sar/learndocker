# Contributing to Docker Explorer

Thank you for your interest in contributing! Docker Explorer is an open-source, browser-based Docker learning simulator — contributions of all kinds are welcome: new levels, new commands, bug fixes, documentation, and design improvements.

---

## Table of Contents

- [Quick Start](#quick-start)
  - [Option A — With Docker (recommended)](#option-a--with-docker-recommended)
  - [Option B — Without Docker](#option-b--without-docker)
- [Project Structure](#project-structure)
- [How to Contribute](#how-to-contribute)
  - [Add a New Tutorial Level](#add-a-new-tutorial-level)
  - [Add a New Docker Command](#add-a-new-docker-command)
  - [Fix a Bug](#fix-a-bug)
- [Running Tests](#running-tests)
- [Pull Request Checklist](#pull-request-checklist)
- [Commit Style](#commit-style)

---

## Quick Start

### Option A — With Docker (recommended)

**No Node.js installation required!**

```bash
# 1. Clone the repo
git clone https://github.com/Abhi21sar/learndocker.git
cd learndocker

# 2. Start the dev server with hot-reload
docker compose up app

# 3. Open http://localhost:5173
```

Changes to files in `src/` are reflected instantly thanks to Vite's Hot Module Replacement (HMR).

To preview the production build:

```bash
docker compose up app-prod
# Open http://localhost:8080
```

To build the production Docker image standalone:

```bash
docker build -t docker-explorer .
docker run -p 8080:80 docker-explorer
```

### Option B — Without Docker

**Requires Node.js ≥ 20 and npm ≥ 10.**

```bash
git clone https://github.com/Abhi21sar/learndocker.git
cd learndocker
npm install
npm run dev       # → http://localhost:5173
```

---

## Project Structure

```
src/
├── engine/DockerEngine.js    ← Add new docker commands here
├── levels/LevelManager.js    ← Add new goal types here
├── levels/tutorial.json      ← Add new levels here
└── components/
    ├── Terminal.jsx           ← Terminal UI (xterm.js)
    └── Visualization.jsx      ← Visual state diagram
tests/
└── engine-goals.test.mjs     ← Add tests for new goals here
```

---

## How to Contribute

### Add a New Tutorial Level

1. Open `src/levels/tutorial.json`
2. Append a new level object:

```json
{
  "id": "lvl-7",
  "title": "Your Level Title",
  "description": "Explain the Docker concept being taught.",
  "objective": "Tell the user exactly what command to type.",
  "goal": {
    "type": "container_exists",
    "image": "alpine"
  }
}
```

**Supported goal types:**

| `type` | Required fields | Description |
|---|---|---|
| `container_exists` | `image`, optional: `name`, `status`, `network` | A container from this image exists |
| `command_history` | `command` | An exact command was typed |
| `network_connected` | `network`, optional: `container_image` | A container is on a named network |
| `volume_mounted` | `volume`, `mount_path`, optional: `container_image` | A volume is mounted at a path |
| `compose_started` | _(none)_ | `docker compose up` was run |
| `image_exists` | `image` | An image with this name exists |
| `image_has_layers` | `image`, `min_layers` | Image has at least N layers |

3. Add a test in `tests/engine-goals.test.mjs` verifying the goal evaluates correctly.

---

### Add a New Docker Command

1. Open `src/engine/DockerEngine.js`
2. Add a `case` in the `execute()` switch:

```js
case 'inspect':
  return this.inspectContainer(args);
```

3. Implement the method on the `DockerEngine` class:

```js
inspectContainer(args) {
  const container = this._findContainerByIdOrName(args[0]);
  if (!container) return `Error: No such container: ${args[0]}`;
  return JSON.stringify(container, null, 2);
}
```

4. Add a test in `tests/engine-goals.test.mjs`.

---

### Fix a Bug

1. Open an issue first describing the bug (or comment on an existing one)
2. Fork → branch → fix → test → PR

---

## Running Tests

```bash
npm test
# Expected: "All Docker simulator goal tests passed."
```

Tests use Node.js built-in `assert` — no external test framework needed.

---

## Pull Request Checklist

Before submitting a PR, make sure:

- [ ] `npm test` passes with no errors
- [ ] New levels have a corresponding test in `tests/`
- [ ] New commands are documented in the PR description
- [ ] You haven't committed `node_modules/`, `dist/`, or `.env` files

---

## Commit Style

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add docker exec command simulation
fix: correct volume mount path matching
docs: improve level 3 objective description
test: add volume_mounted goal test
chore: update dependencies
```

---

Thank you for making Docker learning better for everyone! 🐳
