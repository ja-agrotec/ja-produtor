// ============================================================
// JA AGROTEC · Modulo Produtor — Ecossistema
// admin-sobre-ecossistema.js
// ============================================================
window['module_sobre-ecossistema'] = function() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  mc.innerHTML =
    '<div class="page-header topbar-content">' +
      '<div class="topbar-title"><span>🌐 Ecossistema</span></div>' +
    '</div>' +
    '<div class="card" style="padding:24px;max-width:980px;margin:0 auto">' +
            '<h1 style="color:var(--green);margin-bottom:8px">🌐 Ecossistema JA Agrotec</h1>' +
            '<p style="color:var(--muted);margin-bottom:20px">Três módulos integrados para o agronegócio</p>' +
            '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px;margin-top:20px">' +
              '<div style="border:2px solid var(--green);border-radius:12px;padding:20px;background:var(--green-bg)">' +
                '<h2 style="color:var(--green);margin-bottom:8px">🌾 Produtor</h2>' +
                '<p style="font-size:13px;color:var(--muted);margin-bottom:12px"><b>Você está aqui</b></p>' +
                '<p style="line-height:1.6;font-size:14px">Gestão completa da propriedade rural. Safras, talhões, lançamentos, estoque, vendas, qualidade e certificações.</p>' +
              '</div>' +
              '<div style="border:1px solid var(--brd);border-radius:12px;padding:20px">' +
                '<h2 style="color:var(--dark);margin-bottom:8px">🏛️ Cooperativa</h2>' +
                '<p style="font-size:13px;color:var(--muted);margin-bottom:12px"><i>Em desenvolvimento</i></p>' +
                '<p style="line-height:1.6;font-size:14px">Gestão cooperativista. Recebimento de produção, classificação, armazenagem, comercialização agregada e prestação de contas aos cooperados.</p>' +
              '</div>' +
              '<div style="border:1px solid var(--brd);border-radius:12px;padding:20px">' +
                '<h2 style="color:var(--dark);margin-bottom:8px">📅 Agenda</h2>' +
                '<p style="font-size:13px;color:var(--muted);margin-bottom:12px"><i>Em desenvolvimento</i></p>' +
                '<p style="line-height:1.6;font-size:14px">Programação operacional integrada. Agenda de campo, manutenções, logística, calendário fitossanitário com alertas inteligentes.</p>' +
              '</div>' +
            '</div>' +
            '<h2 style="margin-top:32px;color:var(--dark)">Arquitetura</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Cada módulo é uma aplicação web independente com seu próprio projeto Supabase ' +
              '(Postgres + Auth + Storage). A integração entre módulos será feita via APIs e ' +
              'tabelas de sincronização específicas (ex: entregas Produtor → Cooperativa).' +
            '</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Repositórios</h2>' +
            '<ul style="margin:8px 0 0 24px;line-height:1.9">' +
              '<li><b>Produtor:</b> github.com/alanjader/ja-agro (atual)</li>' +
              '<li><b>Cooperativa:</b> a definir</li>' +
              '<li><b>Agenda:</b> a definir</li>' +
            '</ul>' +
    '</div>';
};
