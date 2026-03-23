# 🐳 Docker Explorer

> **The Immersive Docker Simulator — Learn by doing, right in your browser.**
> No Docker daemon. No cloud account. Just open the page and start typing.

Inspired by [learngitbranching.js.org](https://learngitbranching.js.org/), **Docker Explorer** demystifies container orchestration through a tight loop of imperative terminal input and declarative graphical output.

[![Deploy to GitHub Pages](https://github.com/Abhi21sar/learndocker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Abhi21sar/learndocker/actions/workflows/deploy.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node Version](https://img.shields.io/badge/node-%3E%3D20-green)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)

---

## 🌐 Live Demo

**[https://Abhi21sar.github.io/learndocker](https://Abhi21sar.github.io/learndocker)**

---

## ✨ "Elite" Simulator Features

| Feature | Technical Implementation | UX Benefit |
|---|---|---|
| **Predictive Terminal** | Xterm.js + **Ghost Text** | Reduces syntax errors via gray suggestions |
| **Contextual Autocomplete** | State-aware **Tab completion** | Suggests real container/image names as you type |
| **Advanced Topology** | **React Flow** with animated edges | Visualizes network isolation & connectivity metaphors |
| **State Sync** | **Zustand** immutable store | 100% deterministic visual-logic synchronization |
| **Target vs. Current** | Ghosted goal state overlay | Clear visual roadmap to solve complex exercises |
| **Gamified Pedagogy** | **XP System** + **Git Golf** | Rewards efficiency & mastery of the CLI |

---

## 🏗️ Technical Architecture

Docker Explorer is a 100% client-side application. It utilizes a sophisticated state-driven architecture to simulate a containerized environment:

```mermaid
graph TD
    A[User Terminal Input] -->|Lexer/Parser| B(Zustand Store)
    B -->|Immutable State Update| C{Visual Mesh}
    C -->|React Flow| D[Topology Graph]
    C -->|CSS Blocks| E[Image Layer Stacks]
    B -->|Goal Validation| F[Level Manager]
    F -->|XP & Badges| G[User Progress]
```

- **Input processing:** Xterm.js handles the terminal frontend, while a custom lexer provides real-time syntax highlighting.
- **State Management:** **Zustand** acts as the single source of truth, managing the virtualized Docker Engine state (containers, networks, images, volumes).
- **Visualization:** **React Flow** renders the dynamic mesh of container networks, while **Framer Motion** handles fluid transitions.

---

## 📚 Interactive Curriculum (8 Levels)

Master Docker through progressive challenges:

1.  **Welcome to Docker:** `docker run ubuntu` basics.
2.  **Containerizing Apps:** Understanding image build layers.
3.  **Running Detached:** Port mapping and naming.
4.  **Updating Apps:** Stopping and removing resources.
5.  **Sharing:** Pushing to the simulated registry.
6.  **Persistence:** Mounting Docker Volumes for data durability.
7.  **Networking:** Service discovery via bridge networks.
8.  **Orchestration:** `docker compose up` for multi-container apps.

---

## 🚀 Getting Started

### Run with Docker (Recommended)
```bash
docker compose up app
```
Visit `http://localhost:5173`.

### Run Locally
```bash
npm install
npm run dev
```

---

## 🛠️ Supported Commands

The simulator supports a core subset of the Docker CLI:
- `docker run`, `ps`, `stop`, `rm`, `images`
- `docker build`, `pull`, `push`, `tag`
- `docker network create/connect`
- `docker volume create`
- `docker pull`, `docker rmi`
- `docker inspect`, `docker logs`, `docker stats`
- `docker scout` — CVE scanning simulation
- `docker init` — project scaffolding simulation
- `docker compose up/down/watch`

---

## 🔒 Security Module

The simulator teaches **Shift-Left security** practices:

| Practice | Command | Impact |
|---|---|---|
| **Non-root execution** | `docker run --user 1000 ubuntu` | Limits exploit blast radius |
| **CVE scanning** | `docker scout ubuntu` | Catches vulnerabilities before push |
| **Image pinning** | `docker build --target production .` | Ensures reproducible, minimal builds |
| **Network isolation** | `docker network create app-net` | DNS-based service discovery, not open bridge |

Container cards in the topology visualizer show 🟢/🔴 security badges based on the user the container runs as. Network edges are **green** (isolated) or **red** (default bridge, no isolation).

---

## 🗺️ Portfolio Project Roadmap

After completing the 12 simulator levels, tackle these real-world projects:

| Level | Project | Stack |
|---|---|---|
| **Beginner** | Containerize a static Nginx site | HTML/CSS, Nginx, Dockerfile |
| **Intermediate** | Full-stack app with hot-reloading | Node.js/React, MongoDB, Bind Mounts, Compose |
| **Advanced** | CI/CD pipeline with security gates | GitHub Actions, Trivy, Docker Hub, Multi-stage |
| **Production** | Monitoring stack with observability | Prometheus, Grafana, cAdvisor, Node Exporter |
| **Expert** | Microservices with service discovery | Spring Boot, Redis, Consul, API Gateway |

> 💡 **The Smallest Image Challenge:** Reduce a standard Node.js image from 900MB to under 50MB using multi-stage builds and Alpine base images.

---

## 🧱 Tech Stack

- **Framework:** React 19 + Vite 8
- **State:** Zustand (Redux-like immutable state)
- **Visualization:** @xyflow/react (React Flow) with isolation-aware edge coloring
- **Terminal:** Xterm.js + Addons (Fit, WebLinks) + Ghost Text + Tab Autocomplete
- **Animations:** Framer Motion
- **Icons:** Lucide React

---

## 📄 License

MIT © [Abhishek Gurjar](https://github.com/Abhi21sar) — see [LICENSE](./LICENSE).

<p align="center">Made with ❤️ to make Docker approachable for everyone.</p>
