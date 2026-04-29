// ============================================================
// JA AGRO — Admin Module: Talhões
// admin-talhoes.js
// ============================================================
window.module_talhoes = async function() {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmt = n => n != null ? Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}) : '--';

  let _talhoes = [], _fazendas = [], _search = '', _fazFiltro = '';

  // -- RENDER PRINCIPAL --
  async function render() {
    setLoading('mainContent');
    try {
      const [{ data: fazendas }, { data: talhoes, error }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('talhoes').select('*, fazendas(nome)', { count: 'exact' }).eq('ativo',true).order('nome')
      ]);
      if(error) throw error;
      _talhoes = talhoes || [];
      _fazendas = fazendas || [];
      renderUI();
    } catch(e) {
      document.getElementById('mainContent').innerHTML =
        '<div class="empty-state"><p style="color:var(--danger)">Erro ao carregar talhoes: '+esc(e.message)+'</p></div>';
    }
  }

  function renderUI() {
    const stats = calcStats();
    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>&#127807; Talhoes</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="fazFiltro" onchange="window._talhoes_setFaz(this.value)" style="width:180px">'+
      '<option value="">Todas as fazendas</option>'+
      _fazendas.map(f=>'<option value="'+f.id+'"'+(f.id===_fazFiltro?' selected':'')+'>'+esc(f.nome)+'</option>').join('')+
      '</select>'+
      '<input class="search-input" id="srchTal" placeholder="Buscar talhao..." value="'+esc(_search)+'" oninput="window._talhoes_search(this.value)" style="width:200px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._talhoes_novo()">+ Novo Talhao</button>'+
      '</div></div>'+
      '<div class="stat-row" style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card green"><div class="stat-card-val">'+stats.total+'</div><div class="stat-card-lbl">Talhoes Ativos</div></div>'+
      '<div class="stat-card blue"><div class="stat-card-val">'+fmt(stats.areaTotal)+' ha</div><div class="stat-card-lbl">Area Total</div></div>'+
      '<div class="stat-card purple"><div class="stat-card-val">'+stats.irrigados+'</div><div class="stat-card-lbl">Irrigados</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Nome</th><th>Fazenda</th><th>Area (ha)</th><th>Cultura Atual</th><th>Solo</th><th>Irrigado</th><th>Acoes</th>'+
      '</tr></thead><tbody id="talhoesBody">'+
      renderRows()+
      '</tbody></table></div>';
  }

  function calcStats() {
    const vis = filtrados();
    return {
      total: vis.length,
      areaTotal: vis.reduce((s,t) => s + (t.area_ha||0), 0),
      irrigados: vis.filter(t => t.irrigado).length
    };
  }

  function filtrados() {
    return _talhoes.filter(t => {
      const ok1 = !_fazFiltro || t.fazenda_id === _fazFiltro;
      const ok2 = !_search || (t.nome||'').toLowerCase().includes(_search.toLowerCase())
                          || (t.cultura_atual||'').toLowerCase().includes(_search.toLowerCase());
      return ok1 && ok2;
    });
  }

  function renderRows() {
    const vis = filtrados();
    if(!vis.length) return '<tr><td colspan="7" style="text-align:center;color:var(--muted);padding:32px">'+
      (_search||_fazFiltro ? 'Nenhum talhao encontrado' : 'Nenhum talhao cadastrado')+'</td></tr>';
    return vis.map(function(t) {
      return '<tr>'+
      '<td><strong>'+esc(t.nome)+'</strong></td>'+
      '<td style="color:var(--muted)">'+esc((t.fazendas&&t.fazendas.nome)||'--')+'</td>'+
      '<td>'+fmt(t.area_ha)+' ha</td>'+
      '<td>'+esc(t.cultura_atual||'--')+'</td>'+
      '<td style="color:var(--muted)">'+esc(t.solo||'--')+'</td>'+
      '<td>'+(t.irrigado ? '<span class="badge badge-green">Sim</span>' : '<span class="badge">Nao</span>')+'</td>'+
      '<td>'+
      '<button class="btn-icon" title="Editar" onclick="window._talhoes_edit(this)" data-id="'+t.id+'">Editar</button> '+
      '<button class="btn-icon" title="Excluir" onclick="window._talhoes_del(this)" data-id="'+t.id+'" data-nome="'+esc(t.nome)+'">Excluir</button>'+
      '</td></tr>';
    }).join('');
  }

  window._talhoes_novo = function() { abrirForm(null); };
  window._talhoes_edit = function(btn) { var id = btn.dataset.id; abrirForm(_talhoes.find(function(t){return t.id===id;})); };
  window._talhoes_search = function(v) { _search = v; document.getElementById('talhoesBody').innerHTML = renderRows(); };
  window._talhoes_setFaz = function(v) { _fazFiltro = v; renderUI(); };

  function abrirForm(t) {
    const isNovo = !t;
    const fazOpts = _fazendas.map(function(f){
      return '<option value="'+f.id+'"'+(t&&t.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';
    }).join('');
    const culturas = ['','Soja','Milho','Cafe','Feijao','Algodao','Trigo','Cana','Arroz','Sorgo','Girassol'];
    const cultOpts = culturas.map(function(c){
      return '<option value="'+c+'"'+(t&&t.cultura_atual===c?' selected':'')+'>'+( c||'Nenhuma')+'</option>';
    }).join('');

    showModal(isNovo ? '+ Novo Talhao' : 'Editar Talhao',
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field" style="grid-column:1/-1"><label>Nome do Talhao *</label>'+
      '<input id="tal_nome" value="'+esc(t&&t.nome||'')+'" placeholder="Ex: Talhao 1 - Norte"/></div>'+
      '<div class="form-field"><label>Fazenda *</label>'+
      '<select id="tal_fazenda"><option value="">Selecione...</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Area (ha)</label>'+
      '<input id="tal_area" type="number" step="0.01" min="0" value="'+esc(t&&t.area_ha||'')+'" placeholder="0,00"/></div>'+
      '<div class="form-field"><label>Cultura Atual</label>'+
      '<select id="tal_cultura">'+cultOpts+'</select></div>'+
      '<div class="form-field"><label>Tipo de Solo</label>'+
      '<select id="tal_solo">'+
      ['','Argiloso','Arenoso','Franco','Siltoso','Franco-Argiloso','Franco-Arenoso'].map(function(s){
        return '<option value="'+s+'"'+(t&&t.solo===s?' selected':'')+'>'+( s||'Selecione...')+'</option>';
      }).join('')+
      '</select></div>'+
      '<div class="form-field" style="display:flex;align-items:center;gap:8px;padding-top:22px">'+
      '<input type="checkbox" id="tal_irrigado" '+(t&&t.irrigado?'checked':'')+' style="width:16px;height:16px"/>'+
      '<label for="tal_irrigado" style="font-size:14px;cursor:pointer">Irrigado</label></div>'+
      '<div class="form-field" style="grid-column:1/-1"><label>Observacoes</label>'+
      '<textarea id="tal_obs" rows="2" style="width:100%;resize:vertical;padding:8px 12px;border:1px solid var(--brd);border-radius:var(--r);font-family:var(--f)">'+esc(t&&t.observacoes||'')+'</textarea></div>'+
      '</div>',
      async function() {
        const nome      = document.getElementById('tal_nome').value.trim();
        const fazId     = document.getElementById('tal_fazenda').value;
        const area      = parseFloat(document.getElementById('tal_area').value) || null;
        const cultura   = document.getElementById('tal_cultura').value || null;
        const solo      = document.getElementById('tal_solo').value || null;
        const irrigado  = document.getElementById('tal_irrigado').checked;
        const obs       = document.getElementById('tal_obs').value.trim() || null;

        if(!nome) { toast('Informe o nome do talhao','bad'); return; }
        if(!fazId) { toast('Selecione a fazenda','bad'); return; }

        const payload = { nome, fazenda_id: fazId, area_ha: area, cultura_atual: cultura, solo, irrigado, observacoes: obs };
        const { error } = isNovo
          ? await sb.from('talhoes').insert({ ...payload, ativo: true })
          : await sb.from('talhoes').update(payload).eq('id', t.id);
        if(error) { toast('Erro: '+error.message,'bad'); return; }
        toast(isNovo ? 'Talhao cadastrado!' : 'Talhao atualizado!','ok');
        closeModal(); render();
      }
    );
    setTimeout(function(){ var el = document.getElementById('tal_nome'); if(el) el.focus(); }, 100);
  }

  window._talhoes_del = function(btn) {
    var id = btn.dataset.id;
    var nome = btn.dataset.nome;
    showConfirm('Excluir talhao <strong>'+esc(nome)+'</strong>?<br><small>Esta acao nao pode ser desfeita.</small>',
      async function() {
        const { error } = await sb.from('talhoes').update({ ativo: false }).eq('id', id);
        if(error) { toast('Erro: '+error.message,'bad'); return; }
        toast('Talhao removido','ok'); render();
      }
    );
  };

  render();
};
