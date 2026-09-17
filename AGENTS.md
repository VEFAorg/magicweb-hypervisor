# AGENTS.md — Autonomous Agent Collaboration & Operational Guide

> **Standard Specification for Autonomous Coding Agents, Copilots, and LLM Orchestrators (2026 Edition)**  
> *Project*: MagicWeb Hypervisor (`v3.2.0`)  
> *Organization*: VEFA™ (Virtual Environment Fellowship of America - [www.VEFA.club](https://www.vefa.club))  
> *Runtime Model*: Dual-Plane WebAssembly (WASI 0.3) + Isolated Web Worker Microservice Mesh

---

## 🤖 Purpose & Scope

This document provides machine-readable instructions, architectural invariants, security boundaries, and validation workflows for autonomous agents (e.g., Antigravity, Devin, Cursor, Claude Code, GitHub Copilot SWE) interacting with this codebase.

When operating in this repository, **all agents must adhere to the rules specified herein without exception**.

---

## 🏛️ System Architecture Invariants

1. **The Zero-Mock Invariant**:
   - Never inject synthetic latency (`setTimeout` mock timers) or simulated JSON payloads for microservice responses.
   - All HTTP traffic dispatched to virtual ports (`:3000`, `:3001`, etc.) must route through real isolated execution contexts:
     - **Web Worker Process Pool** (`src/core/process_worker.js`)
     - **WebAssembly Linear Memory Runtime** (`WebAssembly.Memory`)
     - **Transparent Service Worker Loopback Gateway** (`src/gateway/sw.js`)
2. **Dual-Plane Classification**:
   - Workloads must be classified by file inspection (`src/planes/classifier.js`):
     - `wasi`: Rust crates, `.wasm` bytecode, WIT IDL interfaces (`wit/*.wit`).
     - `linux`: Node.js (`package.json`), PHP 8.3 (`composer.json`), Python (`pyproject.toml`).
     - `static`: HTML/CSS/Client JS frontends.
3. **Cross-Origin Isolation (COOP / COEP)**:
   - All server entrypoints (`serve.js`, native desktop runtimes) must deliver:
     - `Cross-Origin-Opener-Policy: same-origin`
     - `Cross-Origin-Embedder-Policy: credentialless`
     - `Cross-Origin-Resource-Policy: cross-origin`
   - This unlocks hardware `SharedArrayBuffer` atomics and high-performance WebWorker threads.
4. **Vector Storage Ceiling**:
   - Code chunk embeddings must be persisted in **IndexedDB** (`magicweb_v32_datastore`), never in `localStorage` (which fails at the 5MB quota).

---

## 📂 Codebase Navigation & Key Files

| File / Directory | Description | Agent Responsibility |
| :--- | :--- | :--- |
| `index.html` | Primary Single-Page Hypervisor UI & Dashboard | Maintain clean ESM imports; do not bloat with inline scripts. |
| `src/core/process_manager.js` | Process Pool & Port Router | Manages Worker lifecycles and virtual HTTP request dispatching. |
| `src/core/process_worker.js` | Dedicated Web Worker Process Runner | Real runtime execution loop for microservice code. |
| `src/gateway/sw.js` | Service Worker Network Gateway | Intercepts `/service/:port/*` calls from iframes and popups. |
| `src/ai/embeddings.js` | 384-D L2-Normalized Semantic Engine | Sub-word token projection, semantic clustering, and cosine similarity. |
| `src/storage/indexeddb.js` | Multi-GB IndexedDB Datastore | Transactional storage for workspaces, chunks, and metrics. |
| `src/planes/classifier.js` | Dual-Plane Workload Classifier | Deterministic classification rules based on repository trees. |
| `desktop/main.go` | Native Desktop Application Runtime | Standalone chromeless window runner with embedded assets. |
| `tests/runner.js` | Automated Contract Test Suite | Verification harness (`npm test`) enforcing mathematical correctness. |
| `distro/` | Release Binaries & Multi-Platform Archives | Packaged distributions for Windows, Linux, macOS, and portable web. |

---

## 🧪 Verification & Testing Protocols

Before committing or concluding any agentic task, run the automated validation suite:

```bash
npm test
```

### Passing Acceptance Criteria:
- `Vectors must be strictly 384 dimensions and L2-normalized`: **PASS**
- `Semantically related functions must exhibit high cosine similarity`: **PASS**
- `Code chunker splits code across line boundaries within length limits`: **PASS**
- `Correctly classifies Rust WASI 0.3 component with WIT IDL`: **PASS**
- `Correctly classifies PHP Slim application to Linux Plane`: **PASS**
- `Correctly classifies Node.js Express application to Linux Plane`: **PASS**

---

## 🛡️ Security & Boundary Guidelines

- **No Remote Credential Leaks**: Never hardcode GitHub Personal Access Tokens (PATs) or LLM API keys. Users configure keys locally via the browser UI, stored exclusively in client-side storage.
- **Worker Sandboxing**: Code evaluated inside Web Workers must not access outer DOM elements without explicit MessagePort authorization.
- **Git Hygiene**: Ignore all `.exe`, build caches, logs, and `desktop/embedded_web/` directories in `.gitignore`.

---

## 🤝 Community & Governance

- **Maintainer**: VEFA Engineering Team ([www.VEFA.club](https://www.vefa.club))
- **License**: MIT
- **Issue Tracker**: Use `.github/ISSUE_TEMPLATE/` for structured defect and enhancement tracking.
