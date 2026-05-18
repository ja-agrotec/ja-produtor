// ============================================================
// JA AGROTEC · Modulo Produtor — Sobre o Sistema
// admin-sobre.js
// ============================================================
window.module_sobre = function() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  mc.innerHTML =
    '<div class="page-header topbar-content">' +
      '<div class="topbar-title"><span>🌾 Sobre o JA Agrotec</span></div>' +
    '</div>' +
    '<div class="card" style="padding:24px;max-width:980px;margin:0 auto">' +
      '<h1 style="color:var(--green);margin-bottom:8px">JA Agrotec · Módulo Produtor</h1>' +
      '<p style="color:var(--muted);margin-bottom:20px">Versão ' + (window.JA?.versao || '1.1.0') + ' · Maio 2026</p>' +
      '<h2 style="margin-top:24px;color:var(--dark)">O que é o JA Agrotec?</h2>' +
      '<p style="line-height:1.7;margin-top:8px">' +
        'O <b>JA Agrotec</b> é um <b>ecossistema digital integrado</b> para o agronegócio, ' +
        'composto por três aplicações que se conectam entre si para cobrir toda a cadeia produtiva rural: ' +
      '</p>' +
      '<ul style="margin:16px 0 16px 24px;line-height:1.9">' +
        '<li><b>🌾 Módulo Produtor</b> (este sistema) — Gestão completa da propriedade rural: safras, talhões, lançamentos, estoque de insumos, vendas, qualidades e certificações.</li>' +
        '<li><b>🏛️ Módulo Cooperativa</b> — Gestão cooperativista: recebimento de produção, classificação, comercialização agregada e prestação de contas aos cooperados.</li>' +
        '<li><b>📅 Módulo Agenda</b> — Programação operacional integrada: agenda de campo, manutenções, logística, calendário fitossanitário.</li>' +
      '</ul>' +
      '<h2 style="margin-top:24px;color:var(--dark)">Sobre o Módulo Produtor</h2>' +
      '<p style="line-height:1.7;margin-top:8px">' +
        'Este módulo foi desenhado para <b>pequenos e médios produtores</b> gerenciarem a operação ' +
        'de forma simples, com foco em decisões baseadas em dados. Oferece:' +
      '</p>' +
      '<ul style="margin:16px 0 16px 24px;line-height:1.9">' +
        '<li>Cadastro de fazendas, talhões e safras com cálculo automático de área</li>' +
        '<li>Lançamento de atividades (mão-de-obra, insumos, máquinas) por hora/hectare/diária</li>' +
        '<li>Estoque de insumos com movimentação automática a partir das aplicações</li>' +
        '<li>Vendas de grãos com controle de contratos, entregas e saldo</li>' +
        '<li>Qualidade de lotes (umidade, impureza, ardidos)</li>' +
        '<li>Certificações e documentos digitais</li>' +
        '<li>Modo offline para uso no campo sem internet</li>' +
      '</ul>' +
      '<h2 style="margin-top:24px;color:var(--dark)">Tecnologia</h2>' +
      '<p style="line-height:1.7;margin-top:8px">' +
        'HTML5 + JavaScript vanilla + Supabase (Postgres + Auth + Storage). PWA com modo offline. ' +
        'Cada módulo do ecossistema usa seu próprio projeto Supabase, com integrações via API.' +
      '</p>' +
      '<div style="margin-top:32px;padding:16px;background:var(--green-bg);border-left:4px solid var(--green);border-radius:8px">' +
        '<b>💡 Dica:</b> Use o menu lateral <b>Sobre</b> para acessar ajuda, histórico de versões, troubleshooting e detalhes do ecossistema.' +
      '</div>' +
    '</div>';
};
