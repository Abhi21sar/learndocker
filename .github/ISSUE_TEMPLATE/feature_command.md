---
name: "New Docker Command / Level"
about: Suggest a new Docker command for the simulator or a new interactive level
title: "[FEATURE] "
labels: enhancement, new-command
assignees: ''
---

**Command Name**
e.g. `docker exec` or `docker logs`

**What does this command do?**
A clear and concise description of the command based on the official Docker documentation.

**How should it be simulated?**
Describe how the visualizer and engine should simulate this. E.g. "When running `docker exec`, we should pretend to open an interactive sh session inside a running container."

**Are there flags that need to be supported?**
- [ ] `-it` (Interactive TTY)
- [ ] `-d` (Detached)
- [ ] `--name`

**Suggested Level Scenario (Optional)**
If this is for a new level in `tutorial.json`, describe the challenge for the user.
