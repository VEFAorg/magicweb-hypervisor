// src/planes/classifier.js
// MagicWeb v3.2 Dual-Plane Workload Classifier

export function classifyWorkload(files = []) {
  const paths = files.map(f => (typeof f === "string" ? f : f.path || "").toLowerCase());

  // 1. WASI Component Plane
  const hasWasm = paths.some(p => p.endsWith(".wasm"));
  const hasWit = paths.some(p => p.includes("wit/") || p.endsWith(".wit"));
  const hasCargoToml = paths.some(p => p.endsWith("cargo.toml"));

  if (hasWasm || hasWit || (hasCargoToml && paths.some(p => p.endsWith(".rs")))) {
    return {
      plane: "wasi",
      runtime: "wasm",
      reason: hasWit ? "WASI 0.3 WIT IDL Interface" : hasWasm ? "Native WebAssembly Bytecode" : "Rust WASI Component"
    };
  }

  // 2. Linux Plane (PHP)
  if (paths.some(p => p.endsWith("composer.json") || p.endsWith(".php"))) {
    return {
      plane: "linux",
      runtime: "php",
      reason: "PHP 8.3 OPcache Container"
    };
  }

  // 3. Linux Plane (Python)
  if (paths.some(p => p.endsWith("pyproject.toml") || p.endsWith("requirements.txt") || p.endsWith(".py"))) {
    return {
      plane: "linux",
      runtime: "python",
      reason: "Python 3.12 Virtualenv / ASGI Engine"
    };
  }

  // 4. Linux Plane (Node.js / JavaScript)
  if (paths.some(p => p.endsWith("package.json") || p.endsWith(".js") || p.endsWith(".ts") || p.endsWith(".mjs"))) {
    return {
      plane: "linux",
      runtime: "node",
      reason: "Node.js ESM / Express Runtime"
    };
  }

  // 5. Static Web
  if (paths.some(p => p.endsWith("index.html") || p.endsWith(".html"))) {
    return {
      plane: "linux",
      runtime: "static",
      reason: "Static Web Frontend"
    };
  }

  return {
    plane: "wasi",
    runtime: "wasm",
    reason: "Default Polyglot WASI Sandbox"
  };
}
