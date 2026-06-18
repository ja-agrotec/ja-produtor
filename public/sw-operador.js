// Service Worker do app Operador.
// Permite abrir /operador offline servindo o shell HTML/JS/CSS do cache.
//
// IMPORTANTE: NAO cacheia HTML/navigation. Cache HTML pode "congelar"
// versao antiga apos deploy novo. Sempre busca da rede; SO cai pra
// cache (fallback) quando offline.
// Cache-first apenas pra assets imutaveis (_next/static/* com hash).

const CACHE = "ja-operador-v6";
const SHELL = [
  "/operador/manifest.json",
  "/logo-ja-agrotec.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      await Promise.all(
        SHELL.map((u) =>
          c.add(u).catch((e) => console.warn("[sw] falhou cache:", u, e?.message || e)),
        ),
      );
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpa TODAS as versoes antigas
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cross-origin (Supabase, Anthropic, fontes externas): passa direto
  if (url.origin !== self.location.origin) return;

  // API routes: nunca cacheia. App ja tem fila offline pra isso.
  if (url.pathname.startsWith("/api/")) return;

  // Navegacao (HTML): SEMPRE busca da rede. Cache aqui causa stale
  // shell apos deploy. Quando offline, cai pro cache de assets que
  // ja estao la (manifest, icon) e o app abre sem JS recente.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(
        () =>
          new Response(
            '<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;text-align:center;padding:40px"><h1>📡 Sem conexao</h1><p>Conecte a internet pra recarregar. Lancamentos salvos vao sincronizar sozinhos quando voltar.</p></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          ),
      ),
    );
    return;
  }

  // Assets _next/static/* (hash imutavel) e /icon-* /logo: cache-first
  const isAssetImutavel =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.startsWith("/logo");

  if (isAssetImutavel) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        });
      }),
    );
    return;
  }

  // manifest.json: network-first com fallback cache
  if (url.pathname.endsWith("manifest.json") || url.pathname.endsWith("manifest.webmanifest")) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(request) as Promise<Response>),
    );
    return;
  }

  // Resto: network-first com fallback cache
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((m) => m || new Response("offline", { status: 503 })),
    ),
  );
});
