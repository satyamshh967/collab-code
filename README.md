# collab-code 💻⚡

> **Real-Time Collaborative Code Editor & Sandboxed Execution Platform.**

[![React](https://img.shields.io/badge/Frontend-React_%2B_Monaco-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![Socket.io](https://img.shields.io/badge/Real--Time-Socket.io-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_%2B_Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Sandboxed_Runner-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)

---

## 📖 Overview

`collab-code` is a multi-user real-time collaborative development environment. It empowers remote developers to pair-program simultaneously with live cursor tracking, conflict-free document sync, and safe multi-language code execution inside isolated Docker containers.

---

## ✨ Features

- **👥 Real-Time Multi-Cursor Collaboration:** Full live typing synchronization and visual cursor presence powered by **Socket.io**.
- **💻 Monaco Code Editor:** The same industry-standard code editor engine powering VS Code, supporting syntax highlighting and auto-formatting.
- **🐳 Sandboxed Code Execution Service:** Microservice (`execution-service/`) that executes untrusted code (Python, JavaScript, Java) in isolated, resource-constrained Docker containers.
- **🌐 Room-Based Sessions:** Unique shareable room URLs allowing developers to spin up pair-programming spaces on demand.

---

## 🏗️ Architecture

```text
┌─────────────────┐       WebSocket       ┌──────────────────┐
│  React Client   │ ◄───────────────────► │  Socket Server   │
│ (Monaco Editor) │                       │  (Sync Engine)   │
└─────────────────┘                       └────────┬─────────┘
                                                   │ HTTP / RPC
                                                   ▼
                                          ┌──────────────────┐
                                          │ Execution Engine │
                                          │ (Docker Sandbox) │
                                          └──────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js (v18+)**
- **Docker** (for secure code execution runner)

### Running the Services
```bash
# Clone repository
git clone https://github.com/satyamshh967/collab-code.git
cd collab-code

# 1. Start Socket & API Server
cd server
npm install
npm run dev

# 2. Start Execution Service
cd ../execution-service
npm install
npm run dev

# 3. Start Frontend Client
cd ../client
npm install
npm run dev
```

---

## 👤 Author
- **Satyam Sharma** - [@satyamshh967](https://github.com/satyamshh967)
