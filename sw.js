// MagicWeb v3.1 Virtual Service Worker Gateway
// Intercepts /service/:port/* and routes directly to the in-browser microservice virtual HTTP router

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Intercept requests directed to /service/:port/*
  const match = url.pathname.match(/^\/service\/(\d+)(\/.*)?$/);
  if (!match) return;

  const port = match[1];
  const subPath = match[2] || "/";

  event.respondWith(
    (async () => {
      // Ask clients (main page) to dispatch virtual HTTP request to the deployed microservice
      const allClients = await self.clients.matchAll();
      if (allClients.length === 0) {
        return new Response(`Virtual Service on port :${port} is starting... Refresh in a moment.`, {
          status: 503,
          headers: { "Content-Type": "text/html" }
        });
      }

      return new Promise((resolve) => {
        const messageChannel = new MessageChannel();
        messageChannel.port1.onmessage = (e) => {
          const resData = e.data;
          if (resData.error) {
            resolve(new Response(`Error: ${resData.error}`, { status: 500, headers: { "Content-Type": "text/plain" } }));
          } else {
            resolve(new Response(resData.body, {
              status: resData.status || 200,
              headers: resData.headers || { "Content-Type": "text/html; charset=utf-8" }
            }));
          }
        };

        // Forward request to the hypervisor main thread
        allClients[0].postMessage({
          type: "VIRTUAL_HTTP_REQ",
          port: parseInt(port, 10),
          method: event.request.method,
          path: subPath,
          url: event.request.url
        }, [messageChannel.port2]);

        // 3 second fallback timeout
        setTimeout(() => {
          resolve(new Response(`Virtual port :${port} is deployed in MagicWeb, but took longer than 3s to respond.`, {
            status: 504,
            headers: { "Content-Type": "text/plain" }
          }));
        }, 3000);
      });
    })()
  );
});
