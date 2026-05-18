// ============================================================
// JA AGROTEC · Modulo Produtor — Ajuda
// admin-sobre-ajuda.js
// ============================================================
window['module_sobre-ajuda'] = function() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  mc.innerHTML =
    '<div class="page-header topbar-content">' +
      '<div class="topbar-title"><span>❓ Ajuda</span></div>' +
    '</div>' +
    '<div class="card" style="padding:24px;max-width:980px;margin:0 auto">' +
            '<h1 style="color:var(--green);margin-bottom:8px">❓ Ajuda — Guia rápido</h1>' +
            '<p style="color:var(--muted);margin-bottom:20px">Como usar o JA Agrotec · Módulo Produtor no dia-a-dia</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Primeiros passos</h2>' +
            '<ol style="margin:8px 0 0 24px;line-height:1.9">' +
              '<li><b>Cadastre suas fazendas</b> em Cadastros → Fazendas (área total, localização).</li>' +
              '<li><b>Crie os talhões</b> em Produção → Campo → Talhões (subdivisão de cada fazenda).</li>' +
              '<li><b>Abra uma safra</b> em Produção → Safras (cultura, época, área plantada).</li>' +
              '<li><b>Cadastre insumos</b> em Estoque → Meus Insumos antes de registrar aplicações.</li>' +
              '<li><b>Registre atividades</b> em Produção → Atividades (mão-de-obra, máquinas, aplicações).</li>' +
              '<li><b>Lance vendas</b> em Vendas de Grãos → Novo contrato.</li>' +
            '</ol>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Atalhos úteis</h2>' +
            '<ul style="margin:8px 0 0 24px;line-height:1.9">' +
              '<li>🔍 Use a busca do menu lateral para encontrar qualquer módulo rapidamente.</li>' +
              '<li>📅 Toda tela com filtro de data salva a última seleção.</li>' +
              '<li>🔄 O ícone Fila Offline mostra quantos registros estão aguardando sincronização.</li>' +
              '<li>📊 A Home traz indicadores rápidos da propriedade no topo.</li>' +
            '</ul>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Tipos de lançamento</h2>' +
            '<ul style="margin:8px 0 0 24px;line-height:1.9">' +
              '<li><b>Por hora</b>: máquinas (custo/hora × horas trabalhadas)</li>' +
              '<li><b>Por hectare</b>: aplicações e mão-de-obra (custo/ha × ha)</li>' +
              '<li><b>Por diária</b>: trabalho avulso (custo/dia × dias)</li>' +
            '</ul>' +
            '<div style="margin-top:24px;padding:16px;background:var(--green-bg);border-left:4px solid var(--green);border-radius:8px">' +
              '<b>💡 Dica:</b> Não conseguiu resolver? Veja o submenu <b>Troubleshooting</b> para problemas comuns.' +
            '</div>' +
    '</div>';
};
