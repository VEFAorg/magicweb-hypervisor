// src/gateway/sw.js
// MagicWeb v3.2 Transparent Service Worker Loopback Gateway
// Intercepts /service/:port/* and routes directly to the in-memory process pool

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Match /service/:port or /service/:port/*
  const match = url.pathname.match(/^\/service\/(\d+)(\/.*)?$/);
  if (!match) return;

  const port = parseInt(match[1], 10);
  const subPath = match[2] || "/";

  event.respondWith(
    (async () => {
      const allClients = await self.clients.matchAll();
      if (allClients.length === 0) {
        return new Response(
          `<!DOCTYPE html><html><body style="background:#080c14;color:#f8fafc;font-family:sans-serif;padding:2rem;">
            <h2>Service on Port :${port} Initializing...</h2>
            <p style="color:#94a3b8;">MagicWeb hypervisor is mounting this service. Please refresh in a moment.</p>
          </body></html>`,
          { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }

      // Read request body if present
      let bodyText = "";
      if (["POST", "PUT", "PATCH"].includes(event.request.method)) {
        try {
          bodyText = await event.request.text();
        } catch (_) {}
      }

      // Extract headers
      const headers = {};
      for (const [k, v] of event.request.headers.entries()) {
        headers[k] = v;
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = (e) => {
          const res = e.data;
          if (res.error) {
            resolve(new Response(`Error: ${res.error}`, { status: 500, headers: { "Content-Type": "text/plain" } }));
          } else {
            resolve(new Response(res.body, {
              status: res.status || 200,
              headers: res.headers || { "Content-Type": "application/json; charset=utf-8" }
            }));
          }
        };

        // Forward virtual HTTP packet to main thread dispatcher
        allClients[0].postMessage({
          type: "VIRTUAL_HTTP_REQ",
          port: port,
          method: event.request.method,
          path: subPath,
          url: event.request.url,
          headers: headers,
          body: bodyText
        }, [messageChannel.port2]);

        // Timeout fallback
        setTimeout(() => {
          resolve(new Response(
            JSON.stringify({
              error: "Gateway Timeout (504)",
              detail: `Virtual port :${port} did not respond within 4000ms. Check process worker status.`
            }),
            { status: 504, headers: { "Content-Type": "application/json" } }
          ));
        }, 4000);
      });
    })()
  );
});
