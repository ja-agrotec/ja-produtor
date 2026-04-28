// ============================================================
// JA AGRO — Admin Module: Fila Offline
// admin-offline.js
// ============================================================
window.module_offline = async function() {
  const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtDH = d => d ? new Date(d).toLocaleString('pt-BR') : '—';

  async function render() {
    setLoading('mainContent');
    try {
      const { data, error } = await sb.from('lancamentos_offline')
        .select('*, usuarios(nome)')
        .order('criado_em', { ascending:false })
        .limit(100);
      if(error) throw error;
      renderUI(data||[]);
    } catch(e) {
      document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p style="color:var(--danger)">Erro: '+esc(e.message)+'</p></div>';
    }
  }

  function renderUI(items) {
    const pendentes    = items.filter(i=>i.status==='pendente');
    const sincronizados = items.filter(i=>i.status==='sincronizado');
    const erros        = items.filter(i=>i.status==='erro');

    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>🔄 Fila Offline</span></div>'+
      '<div style="display:flex;gap:8px">'+
      '<button class="topbar-btn btn-primary" onclick="window._off_sincronizar()">⚡ Sincronizar Pendentes</button>'+
      '<button class="topbar-btn" onclick="window._off_limpar()">🗑️ Limpar Sincronizados</button>'+
      '</div></div>'+

      '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card orange"><div class="stat-card-val">'+pendentes.length+'</div><div class="stat-card-lbl">Pendentes</div></div>'+
      '<div class="stat-card green"><div class="stat-card-val">'+sincronizados.length+'</div><div class="stat-card-lbl">Sincronizados</div></div>'+
      '<div class="stat-card" style="border-top-color:var(--danger)"><div class="stat-card-val" style="color:var(--danger)">'+erros.length+'</div><div class="stat-card-lbl">Com Erro</div></div>'+
      '</div>'+

      (pendentes.length ? '<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:8px;padding:12px 16px;margin:16px 20px 0;font-size:13px">'+
      '⚠️ <strong>'+pendentes.length+' lançamento(s)</strong> aguardando sincronização. Clique em "Sincronizar Pendentes" quando estiver com internet.</div>' : '')+

      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Criado em</th><th>Usuário</th><th>Status</th><th>Tentativas</th><th>Erro</th><th>Payload</th><th>Ações</th>'+
      '</tr></thead><tbody>'+
      (items.length ? items.map(i=>{
        const payload = typeof i.payload === 'object' ? i.payload : JSON.parse(i.payload||'{}');
        const statusCor = { pendente:'badge-yellow', sincronizado:'badge-green', erro:'badge-red' };
        return '<tr>'+
          '<td>'+fmtDH(i.criado_em)+'</td>'+
          '<td>'+esc(i.usuarios?.nome||'—')+'</td>'+
          '<td><span class="badge '+esc(statusCor[i.status]||'')+'">'+esc(i.status)+'</span></td>'+
          '<td style="text-align:center">'+esc(i.tentativas||0)+'</td>'+
          '<td style="color:var(--danger);font-size:12px">'+esc(i.erro_msg||'—')+'</td>'+
          '<td><small style="color:var(--muted)">'+esc(JSON.stringify(payload).substring(0,60))+'...</small></td>'+
          '<td>'+
          (i.status==='pendente'?'<button class="btn-icon" title="Tentar agora" onclick="window._off_tentar(''+i.id+'')">⚡</button> ':'')+
          '<button class="btn-icon" title="Excluir" onclick="window._off_excluir(''+i.id+'')">🗑️</button>'+
          '</td></tr>';
      }).join('') : '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">✅ Fila vazia — sem lançamentos offline</td></tr>')+
      '</tbody></table></div>';

    // Atualiza badge no menu
    try{
      const badge = document.getElementById('badgeOffline');
      if(badge){ badge.textContent=pendentes.length; badge.style.display=pendentes.length>0?'':'none'; }
    }catch(e){}
  }

  window._off_sincronizar = async function(){
    const { data: pendentes } = await sb.from('lancamentos_offline').select('*').eq('status','pendente');
    if(!pendentes||!pendentes.length){ toast('Nenhum pendente','ok'); return; }
    toast('Sincronizando '+pendentes.length+' registro(s)...','ok');
    let ok=0, fail=0;
    for(const item of pendentes){
      try{
        const payload = typeof item.payload==='object' ? item.payload : JSON.parse(item.payload);
        const { error } = await sb.from('lancamentos').insert({ ...payload, status:'confirmado' });
        if(error) throw error;
        await sb.from('lancamentos_offline').update({ status:'sincronizado', sincronizado_em:new Date().toISOString() }).eq('id',item.id);
        ok++;
      }catch(e){
        await sb.from('lancamentos_offline').update({ status:'erro', erro_msg:e.message, tentativas:(item.tentativas||0)+1 }).eq('id',item.id);
        fail++;
      }
    }
    toast(ok+' sincronizado(s)'+(fail?' | '+fail+' com erro':''),'ok');
    render();
  };

  window._off_tentar = async function(id){
    const { data:item } = await sb.from('lancamentos_offline').select('*').eq('id',id).single();
    if(!item){ toast('Registro não encontrado','bad'); return; }
    try{
      const payload = typeof item.payload==='object' ? item.payload : JSON.parse(item.payload);
      const { error } = await sb.from('lancamentos').insert({ ...payload, status:'confirmado' });
      if(error) throw error;
      await sb.from('lancamentos_offline').update({ status:'sincronizado', sincronizado_em:new Date().toISOString() }).eq('id',id);
      toast('Sincronizado com sucesso!','ok');
    }catch(e){
      await sb.from('lancamentos_offline').update({ status:'erro', erro_msg:e.message, tentativas:(item.tentativas||0)+1 }).eq('id',id);
      toast('Erro: '+e.message,'bad');
    }
    render();
  };

  window._off_excluir = function(id){
    showConfirm('Excluir este registro da fila?',
      async function(){
        await sb.from('lancamentos_offline').delete().eq('id',id);
        toast('Removido da fila','ok'); render();
      }
    );
  };

  window._off_limpar = function(){
    showConfirm('Limpar todos os registros já sincronizados?',
      async function(){
        await sb.from('lancamentos_offline').delete().eq('status','sincronizado');
        toast('Registros limpos','ok'); render();
      }
    );
  };

  render();
};
