// Service Worker do app Operador.
// Estrategia network-first com cache fallback - resolve os 2 lados:
//   - Online: sempre pega HTML/JS fresco da rede (sem shell congelado)
//   - Offline: serve do cache (app abre normalmente, lancamentos vao
//     pra fila, sync quando voltar)

const CACHE = "ja-operador-v7";

// Pre-cacheia no install pra primeira instalacao ja deixar tudo pronto
// pra modo offline. Se algum item falhar, segue (instalacao nao
// quebra por causa de 1 asset).
const SHELL = [
  "/operador",
  "/operador/manifest.json",
  "/manifest.webmanifest",
  "/logo-ja-agrotec.png",
  "/icon-192.png",
  "/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const c = await caches.open(CACHE);
      await Promise.all(
        SHELL.map((u) =>
          c.add(u).catch((e) => console.warn("[sw] falhou cache:", u, e?.message || e)),
        ),
      );
      // Skip waiting pra ativar imediatamente
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Limpa versoes antigas
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

  // Cross-origin (Supabase, fontes): passa direto, SW nao interfere
  if (url.origin !== self.location.origin) return;

  // API routes: sem cache. App ja tem fila offline pra estes
  if (url.pathname.startsWith("/api/")) return;

  // ESTRATEGIA 1: Navegacao (HTML) - network-first, cache fallback.
  // Online sempre pega versao nova; offline serve cache. Pre-cache
  // do install garante que /operador funciona offline mesmo na 1a vez.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // Sucesso na rede: atualiza cache
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
            // Atualiza tb /operador como entrada padrao do shell offline
            if (url.pathname.startsWith("/operador")) {
              const clone2 = res.clone();
              caches.open(CACHE).then((c) => c.put("/operador", clone2)).catch(() => {});
            }
          }
          return res;
        })
        .catch(async () => {
          // Sem rede: serve cache. Tenta a URL exata primeiro, depois
          // /operador (shell), depois pagina inline minima.
          const exata = await caches.match(request);
          if (exata) return exata;
          const shell = await caches.match("/operador");
          if (shell) return shell;
          return new Response(
            '<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>Sem conexao</title><body style="font-family:system-ui;text-align:center;padding:40px;background:#f7faf3"><h1>📡 Sem conexao</h1><p>Conecte a internet pra carregar a tela pela 1a vez.</p></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          );
        }),
    );
    return;
  }

  // ESTRATEGIA 2: Assets imutaveis (_next/static/* com hash, icons,
  // logo): cache-first. Quando MISS, fetch e salva pra proxima vez.
  // Isso garante que assets que o user precisa offline VAO
  // estar no cache uma vez que ele visitou online.
  const isAssetImutavel =
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.startsWith("/icon-") ||
    url.pathname.startsWith("/logo");

  if (isAssetImutavel) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request)
          .then((res) => {
            if (res.ok) {
              const clone = res.clone();
              caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
            }
            return res;
          })
          .catch(() => caches.match(request) as Promise<Response>);
      }),
    );
    return;
  }

  // ESTRATEGIA 3: manifest + outros GETs same-origin: network-first
  // com cache fallback.
  event.respondWith(
    fetch(request)
      .then((res) => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(request).then((m) => m || new Response("offline", { status: 503 }))),
  );
});
