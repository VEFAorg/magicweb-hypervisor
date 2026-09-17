// src/core/process_manager.js
// MagicWeb v3.2 Web Worker Process Pool & Port Router

export class ProcessManager {
  constructor() {
    this.processes = new Map(); // port -> { worker, repo, port, startedAt, requests }
    this.pendingRequests = new Map(); // reqId -> { resolve, timer }
    this.nextReqId = 1;
  }

  spawnProcess(repo) {
    // If process on this port already exists, terminate first
    this.killProcess(repo.port);

    // Create worker instance
    // Note: Use Blob or direct script URL
    const worker = new Worker("src/core/process_worker.js");

    const proc = {
      port: repo.port,
      alias: repo.alias,
      plane: repo.plane,
      runtime: repo.runtime,
      worker: worker,
      startedAt: Date.now(),
      status: "running",
      requests: 0
    };

    worker.onmessage = (e) => {
      const { type, reqId, status, headers, body } = e.data;
      if (type === "HTTP_RES" && this.pendingRequests.has(reqId)) {
        const { resolve, timer } = this.pendingRequests.get(reqId);
        clearTimeout(timer);
        this.pendingRequests.delete(reqId);
        resolve({ status, headers, body });
      }
    };

    worker.onerror = (err) => {
      console.error(`[Process Error :${repo.port}]`, err);
    };

    // Initialize worker with repo files and configuration
    worker.postMessage({
      type: "INIT_SERVICE",
      payload: {
        alias: repo.alias,
        port: repo.port,
        plane: repo.plane,
        runtime: repo.runtime,
        files: repo.files || []
      }
    });

    this.processes.set(repo.port, proc);
    return proc;
  }

  killProcess(port) {
    if (this.processes.has(port)) {
      const proc = this.processes.get(port);
      proc.worker.terminate();
      proc.status = "stopped";
      this.processes.delete(port);
    }
  }

  killAll() {
    for (const [port, proc] of this.processes.entries()) {
      proc.worker.terminate();
    }
    this.processes.clear();
  }

  /**
   * Dispatches a virtual HTTP request to the designated port's Web Worker
   */
  async dispatchVirtualHttp(port, method, path, headers = {}, body = "") {
    const proc = this.processes.get(port);
    if (!proc) {
      return {
        status: 404,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error: "Service Not Running (404)",
          detail: `No microservice process is mounted on virtual port :${port}.`
        })
      };
    }

    const reqId = this.nextReqId++;
    proc.requests++;

    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        if (this.pendingRequests.has(reqId)) {
          this.pendingRequests.delete(reqId);
          resolve({
            status: 504,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: "Gateway Timeout (504)", port })
          });
        }
      }, 4000);

      this.pendingRequests.set(reqId, { resolve, timer });

      proc.worker.postMessage({
        type: "HTTP_REQ",
        payload: { reqId, method, path, headers, body }
      });
    });
  }

  listProcesses() {
    return Array.from(this.processes.values()).map(p => ({
      port: p.port,
      alias: p.alias,
      plane: p.plane,
      runtime: p.runtime,
      status: p.status,
      uptimeSeconds: Math.floor((Date.now() - p.startedAt) / 1000),
      requests: p.requests
    }));
  }
}
