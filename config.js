// ============================================================
// JA AGROTEC · Módulo Produtor — Configuração Central
// config.js
// ============================================================
// ⚠️  ATENÇÃO: Este arquivo contém chaves sensíveis.
//     - Adicione config.js ao .gitignore se o repositório
//       for público.
//     - Nunca compartilhe este arquivo com terceiros.
// ============================================================

const JA = {

  // ── VERSÃO ──────────────────────────────────
  versao: '1.1.0',
  nome:    'JA Agrotec · Módulo Produtor',
  ecossistema: 'JA Agrotec',
  modulo:  'produtor',

  // ── SUPABASE ────────────────────────────────
  supabase: {
    url: 'https://gohoqgctcqltorfeohom.supabase.co',
    key: 'sb_publishable_IIGhKrHztb4-JvhN1lKG5A_eqJe3evt',
  },

  // ── URLS DO SISTEMA (GitHub Pages) ──────────
  urls: {
    base:       'https://alanjader.github.io/ja-agro',
    login:      'https://alanjader.github.io/ja-agro/index.html',
    admin:      'https://alanjader.github.io/ja-agro/admin.html',
    dashboard:  'https://alanjader.github.io/ja-agro/dashboard.html',
    campo:      'https://alanjader.github.io/ja-agro/campo.html',
    resetSenha: 'https://alanjader.github.io/ja-agro/reset-senha.html',
  },

  // ── EDGE FUNCTIONS ───────────────────────────
  functions: {
    base:         'https://gohoqgctcqltorfeohom.supabase.co/functions/v1',
    criarUsuario: 'https://gohoqgctcqltorfeohom.supabase.co/functions/v1/criar-usuario',
    // Novas Edge Functions serão adicionadas aqui:
    // exportarExcel: '...supabase.co/functions/v1/exportar-excel',
    // enviarEmail:   '...supabase.co/functions/v1/enviar-email',
  },

  // ── CONFIGURAÇÕES DO APP ─────────────────────
  app: {
    itensPorPagina: 12,
    toastDuracao:   3500,
    debounceMs:     350,
    culturasPadrao: ['CAFÉ', 'MILHO', 'SOJA', 'CANA', 'OUTRAS'],
    unidadesPadrao: ['KG', 'L', 'SC', 'T', 'UN', 'CX', 'G', 'ML'],
    estadosBrasil:  ['AC','AL','AP','AM','BA','CE','DF','ES','GO',
                     'MA','MT','MS','MG','PA','PB','PR','PE','PI',
                     'RJ','RN','RS','RO','RR','SC','SP','SE','TO'],
  },

};

// ── CLIENTE SUPABASE (global) ──────────────────
const sb = supabase.createClient(JA.supabase.url, JA.supabase.key, {
  auth: {
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: true,
  }
});
