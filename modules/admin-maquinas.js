// ============================================================
// JA AGRO — Admin Module: Maquinas
// admin-maquinas.js
// ============================================================
window.module_maquinas = async function() {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmt = n => n != null ? Number(n).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:0}) : '--';

  let _maquinas = [], _fazendas = [], _search = '', _filtroFaz = '';

  async function render() {
    setLoading('mainContent');
    try {
      const [{ data: fazendas }, { data: maquinas, error }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('maquinas').select('*, fazendas(nome)').eq('ativo',true).order('nome')
      ]);
      if(error) throw error;
      _maquinas = maquinas || [];
      _fazendas = fazendas || [];
      renderUI();
    } catch(e) {
      document.getElementById('mainContent').innerHTML =
        '<div class="empty-state"><p style="color:var(--danger)">Erro ao carregar maquinas: '+esc(e.message)+'</p></div>';
    }
  }

  function renderUI() {
    const stats = calcStats();
    const fazOpts = '<option value="">Todas as fazendas</option>'+_fazendas.map(function(f){
      return '<option value="'+f.id+'"'+(_filtroFaz===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';
    }).join('');

    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>Maquinas</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="filtroFaz" onchange="window._maquinas_setFaz(this.value)" style="width:180px">'+fazOpts+'</select>'+
      '<input class="search-input" id="srchMaq" placeholder="Buscar maquina..." value="'+esc(_search)+'" oninput="window._maquinas_search(this.value)" style="width:200px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._maquinas_nova()">+ Nova Maquina</button>'+
      '</div></div>'+
      '<div class="stat-row" style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card green"><div class="stat-card-val">'+stats.total+'</div><div class="stat-card-lbl">Total Maquinas</div></div>'+
      '<div class="stat-card blue"><div class="stat-card-val">'+stats.tratores+'</div><div class="stat-card-lbl">Tratores</div></div>'+
      '<div class="stat-card purple"><div class="stat-card-val">'+stats.outros+'</div><div class="stat-card-lbl">Outros</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Nome / Modelo</th><th>Tipo</th><th>Fazenda</th><th>Horimetro (h)</th><th>Prox. Manut.</th><th>Acoes</th>'+
      '</tr></thead><tbody id="maquinasBody">'+
      renderRows()+
      '</tbody></table></div>';
  }

  function calcStats() {
    const vis = filtrados();
    return {
      total: vis.length,
      tratores: vis.filter(function(m){ return m.tipo==='trator'; }).length,
      outros: vis.filter(function(m){ return m.tipo!=='trator'; }).length
    };
  }

  function filtrados() {
    return _maquinas.filter(function(m) {
      const ok1 = !_filtroFaz || m.fazenda_id === _filtroFaz;
      const ok2 = !_search || (m.nome||'').toLowerCase().includes(_search.toLowerCase())
                           || (m.modelo||'').toLowerCase().includes(_search.toLowerCase());
      return ok1 && ok2;
    });
  }

  function renderRows() {
    const vis = filtrados();
    if(!vis.length) return '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">Nenhuma maquina encontrada</td></tr>';
    return vis.map(function(m) {
      return '<tr>'+
      '<td><strong>'+esc(m.nome)+'</strong><br><small style="color:var(--muted)">'+esc(m.modelo||'')+'</small></td>'+
      '<td><span class="badge">'+esc(m.tipo||'--')+'</span></td>'+
      '<td>'+esc((m.fazendas&&m.fazendas.nome)||'--')+'</td>'+
      '<td>'+fmt(m.horimetro_atual)+' h</td>'+
      '<td>'+(m.proxima_manutencao_h ? fmt(m.proxima_manutencao_h)+' h' : '--')+'</td>'+
      '<td>'+
      '<button class="btn-icon" onclick="window._maquinas_edit(this)" data-id="'+m.id+'">Editar</button> '+
      '<button class="btn-icon" onclick="window._maquinas_del(this)" data-id="'+m.id+'" data-nome="'+esc(m.nome)+'">Excluir</button>'+
      '</td></tr>';
    }).join('');
  }

  window._maquinas_nova = function() { abrirForm(null); };
  window._maquinas_edit = function(btn) { var id = btn.dataset.id; abrirForm(_maquinas.find(function(m){return m.id===id;})); };
  window._maquinas_search = function(v) { _search = v; document.getElementById('maquinasBody').innerHTML = renderRows(); };
  window._maquinas_setFaz = function(v) { _filtroFaz = v; renderUI(); };

  function abrirForm(m) {
    const isNovo = !m;
    const fazOpts = _fazendas.map(function(f){
      return '<option value="'+f.id+'"'+(m&&m.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';
    }).join('');
    const tipos = ['trator','colheitadeira','pulverizador','plantadeira','caminhao','outro'];
    const tipoOpts = tipos.map(function(t){
      return '<option value="'+t+'"'+(m&&m.tipo===t?' selected':'')+'>'+t+'</option>';
    }).join('');

    showModal(isNovo ? '+ Nova Maquina' : 'Editar Maquina',
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field"><label>Nome *</label>'+
      '<input id="maq_nome" value="'+esc(m&&m.nome||'')+'" placeholder="Ex: Trator John Deere 5078E"/></div>'+
      '<div class="form-field"><label>Modelo</label>'+
      '<input id="maq_modelo" value="'+esc(m&&m.modelo||'')+'" placeholder="Ex: 5078E"/></div>'+
      '<div class="form-field"><label>Tipo *</label>'+
      '<select id="maq_tipo"><option value="">Selecione...</option>'+tipoOpts+'</select></div>'+
      '<div class="form-field"><label>Fazenda *</label>'+
      '<select id="maq_fazenda"><option value="">Selecione...</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Ano de Fabricacao</label>'+
      '<input id="maq_ano" type="number" min="1990" max="2030" value="'+(m&&m.ano||'')+'" placeholder="2020"/></div>'+
      '<div class="form-field"><label>Horimetro Atual (h)</label>'+
      '<input id="maq_hor" type="number" min="0" value="'+(m&&m.horimetro_atual||0)+'"/></div>'+
      '<div class="form-field"><label>Proxima Manutencao (h)</label>'+
      '<input id="maq_prox" type="number" min="0" value="'+(m&&m.proxima_manutencao_h||'')+'" placeholder="Ex: 250"/></div>'+
      '<div class="form-field"><label>Placa</label>'+
      '<input id="maq_placa" value="'+esc(m&&m.placa||'')+'" placeholder="Ex: AAA-0000"/></div>'+
      '</div>',
      async function() {
        const nome   = document.getElementById('maq_nome').value.trim();
        const modelo = document.getElementById('maq_modelo').value.trim() || null;
        const tipo   = document.getElementById('maq_tipo').value;
        const fazId  = document.getElementById('maq_fazenda').value;
        const ano    = parseInt(document.getElementById('maq_ano').value) || null;
        const hor    = parseFloat(document.getElementById('maq_hor').value) || 0;
        const prox   = parseFloat(document.getElementById('maq_prox').value) || null;
        const placa  = document.getElementById('maq_placa').value.trim() || null;

        if(!nome) { toast('Informe o nome da maquina','bad'); return; }
        if(!tipo) { toast('Selecione o tipo','bad'); return; }
        if(!fazId) { toast('Selecione a fazenda','bad'); return; }

        const payload = { nome, modelo, tipo, fazenda_id: fazId, ano: ano, horimetro_atual: hor, proxima_manutencao_h: prox, placa };
        const { error } = isNovo
          ? await sb.from('maquinas').insert({ ...payload, ativo: true })
          : await sb.from('maquinas').update(payload).eq('id', m.id);
        if(error) { toast('Erro: '+error.message,'bad'); return; }
        toast(isNovo ? 'Maquina cadastrada!' : 'Maquina atualizada!','ok');
        closeModal(); render();
      }
    );
    setTimeout(function(){ var el = document.getElementById('maq_nome'); if(el) el.focus(); }, 100);
  }

  window._maquinas_del = function(btn) {
    var id = btn.dataset.id;
    var nome = btn.dataset.nome;
    showConfirm('Excluir maquina <strong>'+esc(nome)+'</strong>?',
      async function() {
        const { error } = await sb.from('maquinas').update({ ativo: false }).eq('id', id);
        if(error) { toast('Erro: '+error.message,'bad'); return; }
        toast('Maquina removida','ok'); render();
      }
    );
  };

  render();
};
