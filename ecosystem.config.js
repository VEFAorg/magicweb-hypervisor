/**
 * BrowserPod In-Browser Linux/WASM PM2 Mesh Ecosystem Configuration
 * 
 * Optimized for Web Worker process isolation, OPFS mounted paths (/workspace),
 * and virtual loopback networking across polyglot microservices.
 */

module.exports = {
  apps: [
    // -------------------------------------------------------------
    // Service 1: Mesh Frontend (Web UI / SPA Portal)
    // -------------------------------------------------------------
    {
      name: "mesh-frontend",
      cwd: "/workspace/frontend",
      script: "npm",
      args: "run start",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "256M",
      out_file: "/workspace/logs/mesh-frontend.log",
      error_file: "/workspace/logs/mesh-frontend.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        AUTH_API_URL: "http://localhost:4001",
        DATA_API_URL: "http://localhost:8000",
        DATABASE_URL: "postgresql://localhost:5432/mesh-datastore",
        WASM_POD_MESH: "enabled"
      }
    },

    // -------------------------------------------------------------
    // Service 2: Authentication Engine (Node.js / Express Backend)
    // -------------------------------------------------------------
    {
      name: "service-auth",
      cwd: "/workspace/auth-engine",
      script: "server.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "128M",
      out_file: "/workspace/logs/service-auth.log",
      error_file: "/workspace/logs/service-auth.log",
      merge_logs: true,
      env: {
        NODE_ENV: "production",
        PORT: 4001,
        DATABASE_URL: "postgresql://localhost:5432/mesh-datastore",
        WASM_POD_MESH: "enabled"
      }
    },

    // -------------------------------------------------------------
    // Service 3: Analytics Engine (Python / FastAPI Microservice)
    // -------------------------------------------------------------
    {
      name: "service-analytics",
      cwd: "/workspace/analytics-engine",
      script: "python3",
      args: "-m uvicorn main:app --host 127.0.0.1 --port 8000",
      interpreter: "none",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "192M",
      out_file: "/workspace/logs/service-analytics.log",
      error_file: "/workspace/logs/service-analytics.log",
      merge_logs: true,
      env: {
        PYTHONUNBUFFERED: "1",
        PORT: 8000,
        DATABASE_URL: "postgresql://localhost:5432/mesh-datastore",
        WASM_POD_MESH: "enabled"
      }
    }
  ]
};
