// ============================================================
// JA AGRO — Admin Module: Fila Offline
// admin-offline.js
// ============================================================
window.module_offline = async function() {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtDate = d => d ? new Date(d).toLocaleString('pt-BR') : '--';

  const STORE_KEY = 'ja_agro_offline_queue';

  function getQueue() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY) || '[]'); } catch(e) { return []; }
  }

  function saveQueue(q) {
    localStorage.setItem(STORE_KEY, JSON.stringify(q));
  }

  function render() {
    const queue = getQueue();
    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>Fila Offline</span></div>'+
      '<div style="display:flex;gap:8px">'+
      (queue.length > 0 ? '<button class="topbar-btn btn-primary" onclick="window._offline_syncAll()">Sincronizar Tudo ('+queue.length+')</button>' : '')+
      '<button class="topbar-btn" onclick="window._offline_render()" style="background:var(--dark2);color:#fff">Atualizar</button>'+
      '</div></div>'+
      '<div class="stat-row" style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card '+(queue.length>0?'orange':'green')+'"><div class="stat-card-val">'+queue.length+'</div><div class="stat-card-lbl">Pendentes</div></div>'+
      '<div class="stat-card blue"><div class="stat-card-val">'+(navigator.onLine ? 'Online' : 'Offline')+'</div><div class="stat-card-lbl">Conexao</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:16px 20px">'+
      (queue.length === 0 ?
        '<div class="empty-state" style="padding:48px;text-align:center"><div style="font-size:48px">OK</div>'+
        '<p style="color:var(--muted);margin-top:8px">Nenhum lancamento pendente de sincronização</p></div>' :
        '<table class="data-table"><thead><tr>'+
        '<th>#</th><th>Data</th><th>Tipo</th><th>Descricao</th><th>Valor (R$)</th><th>Status</th><th>Acoes</th>'+
        '</tr></thead><tbody>'+
        queue.map(function(item, idx) {
          return '<tr>'+
          '<td>'+(idx+1)+'</td>'+
          '<td>'+fmtDate(item.criado_em)+'</td>'+
          '<td><span class="badge '+(item.tipo==='receita'?'badge-green':'')+'">'+esc(item.tipo||'--')+'</span></td>'+
          '<td>'+esc(item.descricao||item.categoria||'--')+'</td>'+
          '<td>'+esc(String(item.valor||'--'))+'</td>'+
          '<td><span class="badge" style="background:#fef3c7;color:#92400e">'+(item.status||'pendente')+'</span></td>'+
          '<td>'+
          '<button class="btn-icon" onclick="window._offline_sync('+idx+')" title="Sincronizar este item">Sync</button> '+
          '<button class="btn-icon" onclick="window._offline_remove('+idx+')" title="Remover da fila">Remover</button>'+
          '</td></tr>';
        }).join('')+
        '</tbody></table>'
      )+
      '</div>';
  }

  window._offline_render = function() { render(); };

  window._offline_syncAll = async function() {
    if(!navigator.onLine) { toast('Sem conexao com a internet','bad'); return; }
    const queue = getQueue();
    if(!queue.length) { toast('Nenhum item pendente','ok'); return; }

    var ok = 0, erros = 0;
    for(var i = 0; i < queue.length; i++) {
      try {
        const item = queue[i];
        const payload = Object.assign({}, item);
        delete payload.criado_em;
        delete payload.status;
        const { error } = await sb.from('lancamentos').insert({ ...payload, ativo: true });
        if(error) throw error;
        ok++;
      } catch(e) {
        erros++;
        queue[i].status = 'erro: ' + e.message;
      }
    }
    // Remover os que foram sincronizados com sucesso
    var novosErros = queue.filter(function(item) { return item.status && item.status.startsWith('erro'); });
    saveQueue(novosErros);
    toast(ok + ' sincronizados' + (erros ? ', ' + erros + ' com erro' : ''), erros ? 'bad' : 'ok');
    render();
  };

  window._offline_sync = async function(idx) {
    if(!navigator.onLine) { toast('Sem conexao com a internet','bad'); return; }
    const queue = getQueue();
    const item = queue[idx];
    if(!item) return;
    try {
      const payload = Object.assign({}, item);
      delete payload.criado_em;
      delete payload.status;
      const { error } = await sb.from('lancamentos').insert({ ...payload, ativo: true });
      if(error) throw error;
      queue.splice(idx, 1);
      saveQueue(queue);
      toast('Sincronizado com sucesso!','ok');
      render();
    } catch(e) {
      queue[idx].status = 'erro: ' + e.message;
      saveQueue(queue);
      toast('Erro: '+e.message,'bad');
      render();
    }
  };

  window._offline_remove = function(idx) {
    showConfirm('Remover este item da fila offline?',
      function() {
        const queue = getQueue();
        queue.splice(idx, 1);
        saveQueue(queue);
        toast('Item removido da fila','ok');
        render();
      }
    );
  };

  // Funcao utilitaria para adicionar lancamento na fila offline
  window.addToOfflineQueue = function(lancamento) {
    const queue = getQueue();
    queue.push(Object.assign({}, lancamento, {
      criado_em: new Date().toISOString(),
      status: 'pendente'
    }));
    saveQueue(queue);
    // Atualizar badge no menu
    var badge = document.querySelector('[data-module="offline"] .badge-count, [data-module="offline"] span[style*="badge"]');
    if(!badge) {
      var navItem = document.querySelector('[data-module="offline"]');
      if(navItem) navItem.setAttribute('data-count', queue.length);
    }
  };

  render();
};
