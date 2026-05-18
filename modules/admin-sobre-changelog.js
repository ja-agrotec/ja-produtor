// ============================================================
// JA AGROTEC · Modulo Produtor — Changelog
// admin-sobre-changelog.js
// ============================================================
window.module_sobre_changelog = function() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  mc.innerHTML =
    '<div class="page-header topbar-content">' +
      '<div class="topbar-title"><span>📝 Changelog</span></div>' +
    '</div>' +
    '<div class="card" style="padding:24px;max-width:980px;margin:0 auto">' +
            '<h1 style="color:var(--green);margin-bottom:8px">📝 Changelog</h1>' +
            '<p style="color:var(--muted);margin-bottom:20px">Histórico de versões e atualizações</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">v1.1.0 — Maio 2026</h2>' +
            '<p style="font-size:14px;color:var(--muted);margin-bottom:8px"><b>Rebranding + 15 bugs corrigidos</b></p>' +
            '<ul style="margin:8px 0 0 24px;line-height:1.8">' +
              '<li>🎨 Rebrand: JA Agro Intelligence → <b>JA Agrotec · Módulo Produtor</b></li>' +
              '<li>🌐 Estrutura preparada para ecossistema (Produtor, Cooperativa, Agenda)</li>' +
              '<li>ℹ️ Novo menu <b>Sobre</b> com Ajuda, História, Troubleshooting, Ecossistema</li>' +
              '<li>📱 PWA: adicionado manifest.json com tema visual</li>' +
              '<li>🐛 Correção: edição de Lançamentos pré-popula qtd e custo (#22)</li>' +
              '<li>🐛 Correção: edição de Despesas Fixas seleciona categoria salva (#23)</li>' +
              '<li>🐛 Correção: KPIs de Vendas reagem aos filtros (#13)</li>' +
              '<li>🐛 Correção: KPI "Área Plantada" com subtítulo claro (#14)</li>' +
              '<li>🐛 Correção: contagem de Usuários consistente com Home (#15)</li>' +
              '<li>🐛 Correção: topbar limpa entre módulos (#21)</li>' +
              '<li>🐛 Correção: ícones UTF-8 em Certificação (#25)</li>' +
            '</ul>' +
            '<h2 style="margin-top:24px;color:var(--dark)">v1.0.0 — Abril 2026</h2>' +
            '<p style="font-size:14px;color:var(--muted);margin-bottom:8px"><b>Lançamento inicial</b></p>' +
            '<ul style="margin:8px 0 0 24px;line-height:1.8">' +
              '<li>🚀 Primeira versão pública sob o nome "JA Agro Intelligence"</li>' +
              '<li>📦 22 módulos operacionais: Safras, Talhões, Lançamentos, Estoque, Vendas, Qualidade, Certificação...</li>' +
              '<li>🔄 Modo offline com fila de sincronização</li>' +
              '<li>👥 Autenticação Supabase + perfis Admin/Operador</li>' +
              '<li>📊 Dashboard analítico com KPIs em tempo real</li>' +
            '</ul>' +
    '</div>';
};
