// ============================================================
// JA AGROTEC · Modulo Produtor — Troubleshooting
// admin-sobre-troubleshooting.js
// ============================================================
window['module_sobre-troubleshooting'] = function() {
  const mc = document.getElementById('mainContent');
  if (!mc) return;
  mc.innerHTML =
    '<div class="page-header topbar-content">' +
      '<div class="topbar-title"><span>🛠️ Troubleshooting</span></div>' +
    '</div>' +
    '<div class="card" style="padding:24px;max-width:980px;margin:0 auto">' +
            '<h1 style="color:var(--green);margin-bottom:8px">🛠️ Troubleshooting</h1>' +
            '<p style="color:var(--muted);margin-bottom:20px">Soluções para problemas comuns</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">A tela está em branco ou desatualizada</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Aperte <kbd>Ctrl + F5</kbd> (ou <kbd>Cmd + Shift + R</kbd> no Mac) para forçar recarga sem cache. ' +
              'Se persistir, faça logout e login novamente.' +
            '</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Aparece "Fila Offline" com pendências</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Significa que existem registros feitos offline que ainda não foram sincronizados. ' +
              'Vá em <b>Configurações → Fila Offline</b> e clique em <b>Sincronizar Tudo</b> com internet ativa.' +
            '</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Não consigo editar um lançamento</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Verifique se a safra está aberta (Encerramento de Safra não permite edição retroativa). ' +
              'Apenas usuários ADMIN podem editar registros de safras fechadas.' +
            '</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">KPIs não batem com a listagem</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Limpe os filtros (botão <b>Limpar</b>). Os KPIs sempre refletem o conjunto filtrado, ' +
              'então um filtro ativo pode reduzir os totais aparentes.' +
            '</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Erro de login ou sessão expirada</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Limpe cookies do navegador para o domínio do sistema e refaça login. ' +
              'Se persistir, contate o administrador da propriedade para verificar seu acesso.' +
            '</p>' +
            '<h2 style="margin-top:20px;color:var(--dark)">Caracteres aparecem como "?" ou "â"</h2>' +
            '<p style="line-height:1.7;margin-top:8px">' +
              'Bug de codificação UTF-8 já corrigido em maio/2026. Atualize a página com Ctrl+F5.' +
            '</p>' +
            '<div style="margin-top:24px;padding:16px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:8px">' +
              '<b>⚠️ Não resolveu?</b> Contate o suporte do ecossistema JA Agrotec com print da tela e descrição do passo onde ocorreu o problema.' +
            '</div>' +
    '</div>';
};
