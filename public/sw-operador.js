// Service Worker do app Operador.
// Permite abrir /operador offline servindo o shell HTML/JS/CSS do cache.
//
// Estrategia:
//   - install: pre-cacheia shell + assets essenciais
//   - activate: limpa caches antigos
//   - fetch:
//       /operador*  -> network-first com fallback pro cache (atualizacao
//                      automatica online, offline volta pro cache)
//       _next/static/*, /logo* -> cache-first (assets imutaveis)
//       /api/*, supabase.co -> sem intervencao (network passa direto;
//                              app trata erros via fila offline ja existente)

const CACHE = "ja-operador-v4";
const SHELL = [
  "/operador",
  "/operador/manifest.json",
  "/logo-ja-agrotec.png",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (c) => {
      // Cada add separado pra que um 404 nao derrube tudo
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
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cross-origin (Supabase, Anthropic, fontes externas): passa direto
  if (url.origin !== self.location.origin) return;

  // API routes: nunca cacheia. Se offline e app tentar bater, falha
  // limpa - a fila offline (lib/offline.ts) trata o INSERT.
  if (url.pathname.startsWith("/api/")) return;

  // Navegacao do shell /operador: network-first com fallback ao cache
  const isNavOperador =
    url.pathname === "/operador" ||
    url.pathname.startsWith("/operador/") ||
    request.mode === "navigate";

  if (isNavOperador) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Cache successful navigations pra usar offline
          if (res.ok && url.pathname.startsWith("/operador")) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put("/operador", clone)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match("/operador").then(
            (m) =>
              m ||
              new Response(
                "<h1>App offline</h1><p>Sem conexao no primeiro acesso. Conecte e tente de novo.</p>",
                { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
              ),
          ),
        ),
    );
    return;
  }

  // Assets estaticos _next/static/* (com hash, imutaveis) e logo: cache-first
  const isAssetEstatico =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/logo");

  if (isAssetEstatico) {
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

  // Resto (outras rotas /home, /admin, etc): network-first, fallback cache.
  // Nao essa rotas nao deveriam ser atingidas pelo SW do operador,
  // mas garante comportamento previsivel.
  event.respondWith(
    fetch(request).catch(() =>
      caches.match(request).then((m) => m || new Response("offline", { status: 503 })),
    ),
  );
});
