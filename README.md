# 🐳 Docker Explorer

> **Learn Docker interactively — right in your browser.**
> No Docker daemon. No cloud account. Just open the page and start typing.

Like [learngitbranching.js.org](https://learngitbranching.js.org/) does for Git, **Docker Explorer** teaches core Docker concepts through a hands-on, gamified terminal with a real-time visual state diagram.

[![Deploy to GitHub Pages](https://github.com/Abhi21sar/learndocker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Abhi21sar/learndocker/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](./CONTRIBUTING.md)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev)

---

## 🌐 Live Demo

**[https://Abhi21sar.github.io/learndocker](https://Abhi21sar.github.io/learndocker)**

---

## ✨ Features

| Feature | Description |
|---|---|
| **Interactive Terminal** | xterm.js-powered terminal with real Docker-like command parsing |
| **Docker Simulator Engine** | Pure-JS state machine — images, containers, networks, volumes |
| **6 Tutorial Levels** | Progressive challenges from `docker run` → `docker compose up` |
| **Live Visualization** | Animated image layer stacks, network graph, and container cards |
| **Zero Dependencies** | No Docker daemon, no backend, runs entirely in the browser |
| **GitHub Pages Deploy** | Auto CI/CD via GitHub Actions on every push to `main` |

---

## 🚀 Run with Docker

**The fastest way to run or contribute — no Node.js required on your machine.**

```bash
# Clone
git clone https://github.com/Abhi21sar/learndocker.git
cd learndocker

# Dev mode — hot-reload on http://localhost:5173
docker compose up app

# Production preview — nginx on http://localhost:8080
docker compose up app-prod
```

Or build and run the production image directly:

```bash
docker build -t docker-explorer .
docker run -p 8080:80 docker-explorer
```

---

## 💻 Run without Docker

**Requires Node.js ≥ 20.**

```bash
git clone https://github.com/Abhi21sar/learndocker.git
cd learndocker
npm install
npm run dev       # → http://localhost:5173
```

---

## 🗂️ Project Structure

```
learndocker/
├── Dockerfile               # Multi-stage: Node build → nginx serve
├── docker-compose.yml       # dev (HMR :5173) + prod (nginx :8080)
├── .dockerignore
│
├── src/
│   ├── engine/
│   │   └── DockerEngine.js  # Core Docker state simulator
│   ├── levels/
│   │   ├── LevelManager.js  # Goal evaluation engine
│   │   └── tutorial.json    # Level definitions
│   ├── components/
│   │   ├── Terminal.jsx     # xterm.js terminal emulator
│   │   └── Visualization.jsx# Animated state diagram
│   ├── App.jsx              # Root component
│   └── main.jsx
│
├── tests/
│   └── engine-goals.test.mjs# Node.js unit tests (no framework needed)
├── scripts/
│   └── build.mjs            # Custom Vite build script
└── .github/workflows/
    └── deploy.yml           # GitHub Actions → GitHub Pages
```

---

## 🏗️ Architecture

```
User types command
      │
      ▼
Terminal.jsx (xterm.js)
      │  execute(cmd)
      ▼
DockerEngine.js ──onStateChange()──▶ Visualization.jsx
      │
      │  getSnapshot() + getHistory()
      ▼
LevelManager.js ──► Level badge in App.jsx
```

---

## 📚 Tutorial Levels

| # | Title | Objective | Goal Type |
|---|---|---|---|
| 1 | Welcome to Docker | `docker run ubuntu` | `container_exists` |
| 2 | Listing Containers | `docker ps` | `command_history` |
| 3 | Networks | Create network + connect container | `network_connected` |
| 4 | Volumes | Mount a volume to `/data` | `volume_mounted` |
| 5 | Compose | `docker compose up` | `compose_started` |
| 6 | Build | `docker build -t myapp .` | `image_has_layers` |

---

## 🛠️ Supported Commands

```bash
docker run [--name <n>] [--network <net>] [-v <vol>:<path>] <image>
docker ps
docker stop <id-or-name>
docker rm <id-or-name>
docker images
docker build -t <name> [context]
docker network create <name>
docker network connect <network> <container>
docker volume create <name>
docker compose up
```

---

## 🧪 Tests

```bash
npm test
# → All Docker simulator goal tests passed.
```

Tests run directly with Node.js — no test framework required.

---

## 🤝 Contributing

Contributions are welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for a full guide including:

- How to run locally with or without Docker
- How to add a new tutorial level
- How to add a new Docker command
- PR checklist and commit style

**Quick start:**

```bash
git clone https://github.com/Abhi21sar/learndocker.git
cd learndocker
docker compose up app    # or: npm install && npm run dev
```

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing.

---

## ⚙️ Configuration

| Variable | Default | Description |
|---|---|---|
| `VITE_BASE` | `/` | Base URL path (set to `/<repo>/` for GitHub Pages) |

---

## 🚢 Deployment

Auto-deploys to GitHub Pages on every push to `main` via `.github/workflows/deploy.yml`.

Manual deploy:
```bash
VITE_BASE=/learndocker/ npm run build
# Upload dist/ to any static host
```

---

## 🧱 Tech Stack

| Technology | Role |
|---|---|
| React 19 + Vite 8 (SWC) | UI and build tooling |
| xterm.js | Browser terminal emulator |
| Framer Motion | Animations |
| Lucide React | Icons |
| TypeScript (type-check only) | Static analysis |
| nginx Alpine | Production static file server |

---

## 📄 License

MIT © [Abhishek S](https://github.com/Abhi21sar) — see [LICENSE](./LICENSE).

---

<p align="center">Made with ❤️ to make Docker approachable for everyone.</p>
