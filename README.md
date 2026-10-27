# collab-code 💻⚡

> **Enterprise Distributed Real-Time Collaborative Coding Platform with CRDTs, Redis Horizontal Scaling & Sandboxed Asynchronous Execution**

[![React](https://img.shields.io/badge/Frontend-React_%2B_Monaco-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![CRDT](https://img.shields.io/badge/CRDT-Yjs_%2B_y--monaco-e11d48?style=flat-square)](https://yjs.dev/)
[![Socket.io](https://img.shields.io/badge/Real--Time-Socket.io_%2B_Redis-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![Queue](https://img.shields.io/badge/Queue-BullMQ_%2B_Redis-dc2626?style=flat-square&logo=redis&logoColor=white)](https://bullmq.io/)
[![Backend](https://img.shields.io/badge/Backend-Node.js_%2B_Express-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Sandboxed_Runner-Docker-2496ED?style=flat-square&logo=docker&logoColor=white)](https://docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🏛️ System Architecture

```text
+--------------------------------------------------------------------------------------------------------+
|                                              CLIENT TIER                                               |
|                                                                                                        |
|   +------------------------------------+             +---------------------------------------------+   |
|   |         Monaco Code Editor         |             |              React UI Engine                |   |
|   |  - Syntax highlighting & formatting|             |  - Chat & room management                   |   |
|   |  - Live cursor & selection badges  |             |  - Version history / snapshot restore       |   |
|   +-----------------+------------------+             |  - Real-time streaming output terminal      |   |
|                     | (y-monaco binding)             +----------------------+----------------------+   |
|                     v                                                       |                          |
|   +------------------------------------+                                    |                          |
|   |      Yjs CRDT Document Engine      |                                    |                          |
|   |  - Deterministic peer convergence  |                                    |                          |
|   |  - Shared awareness & presence     |                                    |                          |
|   +-----------------+------------------+                                    |                          |
+---------------------|-------------------------------------------------------|--------------------------+
                      |                                                       |
        WebSocket (CRDT Sync Protocol)                         WebSocket / HTTP (REST & Signaling)
        ws://host:3001/yjs/<roomId>                            http://host:3001/api & Socket.io
                      |                                                       |
                      v                                                       v
+--------------------------------------------------------------------------------------------------------+
|                                         SERVER SIGNALING TIER                                          |
|                                                                                                        |
|   +------------------------------------+             +---------------------------------------------+   |
|   |         Yjs WebSocket Server       |             |          Node.js Express + Socket.IO        |   |
|   |  - Handles sync step 1 & 2         |             |  - REST APIs (/api/rooms, /api/execute)     |   |
|   |  - Heartbeat & connection lifecycle|             |  - Horizontal scaling via @socket.io/redis  |   |
|   |  - Document state persistence      |             |  - Room grace periods & auto-cleanup        |   |
|   +-----------------+------------------+             +----------------------+----------------------+   |
+---------------------|-------------------------------------------------------|--------------------------+
                      |                                                       |
                      |                                                       |
                      +-------------------+               +-------------------+
                                          |               |
                                          v               v
+--------------------------------------------------------------------------------------------------------+
|                                           STATE & QUEUE TIER                                           |
|                                                                                                        |
|   +------------------------------------------------------------------------------------------------+   |
|   |                                          Redis 7 Cluster                                       |   |
|   |  - Socket.io Pub/Sub adapter (horizontal cross-instance broadcast)                             |   |
|   |  - BullMQ durable 'code-execution' priority queue                                              |   |
|   |  - Document binary state persistence (yjs:doc:<roomId>)                                        |   |
|   |  - Real-time job event streaming channels (execution:events:<jobId>)                           |   |
|   +-----------------------------------------------+------------------------------------------------+   |
+---------------------------------------------------|----------------------------------------------------+
                                                    |
                                      (Job consumer / BullMQ Worker)
                                                    |
                                                    v
+--------------------------------------------------------------------------------------------------------+
|                                       ASYNC EXECUTION SERVICE TIER                                     |
|                                                                                                        |
|   +------------------------------------------------------------------------------------------------+   |
|   |                               BullMQ Multi-Threaded Worker Pool                                |   |
|   |  - Concurrency: 5 parallel workers per node                                                    |   |
|   |  - Non-blocking job processing with real-time stdout/stderr streaming                          |   |
|   |  - Security policy validation (AST keyword & injection scanner)                               |   |
|   +-----------------------------------------------+------------------------------------------------+   |
|                                                   |                                                    |
|                                (Spawns isolated sandbox container)                                     |
|                                                   v                                                    |
|   +------------------------------------------------------------------------------------------------+   |
|   |                                Docker Sandbox Container Isolation                              |   |
|   |  - Memory Cap:        --memory=128m --memory-swap=128m (strictly 0 swap space)                 |   |
|   |  - CPU Quota:         --cpus=0.5 (CpuQuota: 50000, CpuPeriod: 100000)                          |   |
|   |  - Hard Timeout:      5000ms strictly enforced (SIGKILL container termination)                 |   |
|   |  - Network Isolation: --network=none (no egress/ingress traffic)                               |   |
|   |  - Buffer Cap:        512 KB maximum stdout/stderr limit (anti-memory exhaustion)              |   |
|   |                                                                                                |   |
|   |       [ Python Runner ]             [ Node.js Runner ]             [ OpenJDK 17 Runner ]       |   |
|   +------------------------------------------------------------------------------------------------+   |
+--------------------------------------------------------------------------------------------------------+
```

---

## 🚀 Key Architectural Upgrades

### 1. Conflict-Free Collaborative Editing (CRDTs via Yjs)
- **Mathematical Convergence**: Replaced naive string broadcasting with **Yjs CRDTs**, guaranteeing eventual consistency across all concurrent keystrokes and network latencies without central locks.
- **Monaco Binding**: Utilizes `y-monaco` to translate CRDT operations directly into Monaco text model delta decorations.
- **Shared Awareness**: Real-time cursor coordinates, active multi-line text selections, and color-coded username pills rendered smoothly.
- **Document Persistence**: Document updates are periodically persisted to Redis (`yjs:doc:<roomId>`), preserving room state across client disconnects, page reloads, and container restarts.

### 2. Horizontal WebSocket Scaling
- **Redis Adapter**: Seamlessly integrates `@socket.io/redis-adapter` with dual Redis pub/sub connections, enabling rooms to scale across an arbitrary number of Node.js cluster nodes.
- **Resilient Connection Handling**: Exponential backoff reconnects, active 15s heartbeat pings, and automatic room re-hydration upon network recovery.
- **Room Lifecycle Management**: Includes a 5-minute grace period when all peers disconnect before tearing down room resources, preventing premature cleanup during quick refreshes.

### 3. Hardened Asynchronous Code Execution Service
- **Decoupled Job Queue**: Execution requests (`POST /api/execute`) enqueue jobs into a **BullMQ** queue backed by Redis, returning an immediate `{ jobId, status: 'queued' }` within 15ms.
- **Real-Time Log Streaming**: Chunks from stdout and stderr are published over Redis channels and streamed back to the client via WebSockets.
- **Strict Container Sandbox Security**:
  * **Memory Limit**: `--memory=128m --memory-swap=128m` (zero swap allowed).
  * **CPU Allocation**: `--cpus=0.5` (50% of 1 core max).
  * **Strict Timeout**: 5 seconds maximum execution time with immediate `SIGKILL` termination.
  * **Network Isolation**: `--network=none` to completely block outbound requests or reverse shells.
  * **Buffer Limit**: 512 KB cap on stdout/stderr to prevent memory exhaustion attacks.
  * **Safe Development Fallback**: Built-in isolated process sandbox when the Docker daemon is unavailable.

---

## 🛠️ Step-by-Step Setup

### Option A: Complete Docker Compose Setup (Recommended)

1. **Clone the repository**:
   ```bash
   git clone https://github.com/satyamshh967/collab-code.git
   cd collab-code
   ```

2. **Build the language runner sandbox images**:
   ```bash
   docker build -t collab-python-runner ./docker/python
   docker build -t collab-java-runner ./docker/java
   docker build -t collab-node-runner ./docker/node
   ```

3. **Start the multi-service stack with Docker Compose**:
   ```bash
   docker compose -f docker/docker-compose.yml up --build
   ```

4. **Access the application**:
   - Web Client: [http://localhost:3000](http://localhost:3000)
   - Signaling & Yjs Server: [http://localhost:3001](http://localhost:3001)
   - Execution Microservice: [http://localhost:3002](http://localhost:3002)
   - Redis Service: `localhost:6379`

---

### Option B: Local Development Setup

#### Prerequisites
- Node.js 18+
- Redis (optional — services automatically fall back to resilient in-memory mode if Redis is offline)

1. **Install dependencies**:
   ```bash
   # Server
   cd server && npm install && cd ..

   # Client
   cd client && npm install && cd ..

   # Execution Service
   cd execution-service && npm install && cd ..
   ```

2. **Start the services**:
   ```bash
   # Terminal 1: Signaling Server + Yjs CRDT Hub (Port 3001)
   cd server && npm run dev

   # Terminal 2: React Web Client (Port 3000)
   cd client && npm start

   # Terminal 3: BullMQ Execution Service (Port 3002)
   cd execution-service && npm run dev
   ```

---

## 🧪 Integration Testing & Verification

The repository contains an automated test suite verifying CRDT convergence, queue lifecycles, and container sandbox security:

```bash
# Run all integration tests
npm test
```

### Targeted Test Commands:
```bash
# 1. Verify CRDT typing convergence & awareness propagation
npm run test:crdt

# 2. Verify BullMQ asynchronous queue job lifecycle
npm run test:queue

# 3. Verify sandbox confinement (5s infinite loop kill, 512KB buffer cap, security rules)
npm run test:sandbox
```

---

## 📡 API Reference

### Execution Service
- `POST /api/execute`: Enqueue an execution job.
  ```json
  {
    "code": "console.log('Hello World');",
    "language": "javascript",
    "roomId": "room-123",
    "stdin": ""
  }
  ```
  **Response (202 Accepted)**:
  ```json
  {
    "jobId": "job-abc-123",
    "status": "queued",
    "message": "Code execution job queued successfully"
  }
  ```

- `GET /api/execute/status/:jobId`: Poll job execution status and output.
  ```json
  {
    "jobId": "job-abc-123",
    "status": "completed",
    "output": "Hello World\n",
    "error": "",
    "exitCode": 0,
    "executionTime": 42
  }
  ```

---

## 📜 License
MIT License
