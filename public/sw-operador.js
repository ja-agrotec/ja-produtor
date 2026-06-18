// Service Worker do app Operador.
// Estrategia network-first com cache fallback - resolve os 2 lados:
//   - Online: sempre pega HTML/JS fresco da rede (sem shell congelado)
//   - Offline: serve do cache (app abre normalmente, lancamentos vao
//     pra fila, sync quando voltar)

const CACHE = "ja-operador-v8";

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

// Parsea o HTML retornado e baixa+cacheia todos os _next/static/*
// referenciados (scripts + stylesheets + preload). Sem isso, abrir
// offline carrega o HTML mas falha em todos os chunks JS que o user
// ainda nao havia acessado online.
async function precachearAssetsDoHtml(response) {
  try {
    const text = await response.text();
    // Captura src/href que apontam pra /_next/ (com ou sem origin)
    const regex = /(?:src|href)=["']([^"']*\/_next\/[^"']+)["']/g;
    const urls = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
      let u = match[1];
      // Normaliza pra path absoluto same-origin
      if (u.startsWith("http")) {
        try {
          const parsed = new URL(u);
          if (parsed.origin !== self.location.origin) continue;
          u = parsed.pathname + parsed.search;
        } catch {
          continue;
        }
      }
      urls.add(u);
    }
    if (urls.size === 0) return;
    const cache = await caches.open(CACHE);
    await Promise.all(
      Array.from(urls).map(async (u) => {
        try {
          // So baixa se nao tem ainda (cache-first)
          const existente = await cache.match(u);
          if (existente) return;
          const res = await fetch(u);
          if (res.ok) await cache.put(u, res);
        } catch {
          // Falha silenciosa - tenta de novo em proxima navegacao
        }
      }),
    );
  } catch {
    /* ignore */
  }
}

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
              // PRE-CACHE dos chunks JS/CSS referenciados pelo HTML.
              // Garante que abrir offline funciona sem precisar
              // do user ter navegado por todas as telas antes.
              const clone3 = res.clone();
              precachearAssetsDoHtml(clone3);
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
          .catch(() => caches.match(request));
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
