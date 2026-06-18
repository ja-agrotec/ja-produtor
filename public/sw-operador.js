// Service Worker do app Operador.
// v9: pre-cache mais agressivo + fallback robusto pra assets faltando.

const CACHE = "ja-operador-v9";

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
      // Tambem fetch+parse /operador pra ja popular chunks JS/CSS no install.
      try {
        const r = await fetch("/operador");
        if (r.ok) {
          await c.put("/operador", r.clone());
          await precachearAssetsDoHtml(r.clone());
        }
      } catch {
        /* offline durante install: SHELL ja basico foi salvo */
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
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

// Parsea o HTML e baixa+cacheia /_next/static referenciados
async function precachearAssetsDoHtml(response) {
  try {
    const text = await response.text();
    const regex = /(?:src|href)=["']([^"']*\/_next\/[^"']+)["']/g;
    const urls = new Set();
    let match;
    while ((match = regex.exec(text)) !== null) {
      let u = match[1];
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
          const existente = await cache.match(u);
          if (existente) return;
          const res = await fetch(u);
          if (res.ok) await cache.put(u, res);
        } catch { /* tenta de novo na proxima nav */ }
      }),
    );
  } catch { /* ignore */ }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // Cross-origin: passa direto
  if (url.origin !== self.location.origin) return;

  // API routes: sem cache
  if (url.pathname.startsWith("/api/")) return;

  // NAVEGACAO (HTML): network-first com cache fallback robusto
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(request, clone)).catch(() => {});
            if (url.pathname.startsWith("/operador")) {
              const clone2 = res.clone();
              caches.open(CACHE).then((c) => c.put("/operador", clone2)).catch(() => {});
              const clone3 = res.clone();
              precachearAssetsDoHtml(clone3);
            }
          }
          return res;
        })
        .catch(async () => {
          const exata = await caches.match(request);
          if (exata) return exata;
          // Sempre cai pro shell /operador (que tem que existir em cache)
          const shell = await caches.match("/operador");
          if (shell) return shell;
          return new Response(
            '<!DOCTYPE html><html lang="pt-BR"><meta charset="utf-8"><title>Sem conexao</title><body style="font-family:system-ui;text-align:center;padding:40px;background:#f7faf3"><h1>📡 Sem conexao</h1><p>Conecte a internet pra carregar pela 1a vez.</p></body></html>',
            { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 },
          );
        }),
    );
    return;
  }

  // ASSETS IMUTAVEIS: cache-first, MAS com fallback robusto.
  // Se asset MISS no cache E rede falha, retorna resposta vazia
  // SUCESSO (200) em vez de erro - evita quebrar app inteiro por
  // causa de 1 chunk lazy que nunca foi acessado.
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
          .catch(async () => {
            // Tenta de novo no cache (race possivel) e cai pra resposta vazia
            const r = await caches.match(request);
            if (r) return r;
            // Resposta vazia com Content-Type adequado evita app quebrar
            const ct = url.pathname.endsWith(".css")
              ? "text/css"
              : url.pathname.endsWith(".js")
                ? "application/javascript"
                : "application/octet-stream";
            return new Response("", { status: 200, headers: { "Content-Type": ct } });
          });
      }),
    );
    return;
  }

  // OUTROS GETs: network-first com cache fallback
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
