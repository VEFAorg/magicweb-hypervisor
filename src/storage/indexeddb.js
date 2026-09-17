// src/storage/indexeddb.js
// MagicWeb v3.2 Multi-Gigabyte IndexedDB Datastore

export class IndexedDBDatastore {
  constructor(dbName = "magicweb_v32_datastore", version = 1) {
    this.dbName = dbName;
    this.version = version;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("workspaces")) {
          db.createObjectStore("workspaces", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("chunks")) {
          db.createObjectStore("chunks", { keyPath: "id" });
        }
        if (!db.objectStoreNames.contains("metrics")) {
          db.createObjectStore("metrics", { keyPath: "id" });
        }
      };
      req.onsuccess = () => {
        this.db = req.result;
        resolve(this.db);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveWorkspace(workspace, chunks = []) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["workspaces", "chunks"], "readwrite");
      tx.objectStore("workspaces").put(workspace);
      const chunkStore = tx.objectStore("chunks");
      for (const chunk of chunks) {
        chunkStore.put(chunk);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async loadAll() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["workspaces", "chunks"], "readonly");
      const wReq = tx.objectStore("workspaces").getAll();
      const cReq = tx.objectStore("chunks").getAll();
      tx.oncomplete = () => {
        resolve({ workspaces: wReq.result || [], chunks: cReq.result || [] });
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  async deleteWorkspace(workspaceId) {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["workspaces", "chunks"], "readwrite");
      tx.objectStore("workspaces").delete(workspaceId);
      const chunkStore = tx.objectStore("chunks");
      const req = chunkStore.openCursor();
      req.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
          if (cursor.value.workspaceId === workspaceId) {
            cursor.delete();
          }
          cursor.continue();
        }
      };
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async clearAll() {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(["workspaces", "chunks", "metrics"], "readwrite");
      tx.objectStore("workspaces").clear();
      tx.objectStore("chunks").clear();
      tx.objectStore("metrics").clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
