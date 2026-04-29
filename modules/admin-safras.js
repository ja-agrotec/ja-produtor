// ============================================================
// JA AGRO — Admin Module: Safras
// admin-safras.js | Schema: data_plantio, data_colheita
// ============================================================
window.module_safras = async function() {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtDate = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '--';

  let _safras = [], _fazendas = [], _search = '', _filtroStatus = '';

  async function render() {
    setLoading('mainContent');
    try {
      const [{ data: fazendas, error: e1 }, { data: safras, error: e2 }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('safras').select('*, fazendas(nome)').order('data_plantio', { ascending: false })
      ]);
      if(e1) throw e1;
      if(e2) throw e2;
      _safras = safras || [];
      _fazendas = fazendas || [];
      renderUI();
    } catch(e) {
      document.getElementById('mainContent').innerHTML =
        '<div class="empty-state"><p style="color:var(--danger)">Erro ao carregar safras: '+esc(e.message)+'</p></div>';
    }
  }

  function renderUI() {
    const stats = calcStats();
    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>Safras</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="filtroStatus" onchange="window._safras_setStatus(this.value)" style="width:150px">'+
      '<option value="">Todos status</option>'+
      '<option value="planejamento"'+((_filtroStatus==='planejamento')?' selected':'')+'>Planejamento</option>'+
      '<option value="em_andamento"'+((_filtroStatus==='em_andamento')?' selected':'')+'>Em andamento</option>'+
      '<option value="encerrada"'+((_filtroStatus==='encerrada')?' selected':'')+'>Encerrada</option>'+
      '</select>'+
      '<input class="search-input" id="srchSaf" placeholder="Buscar safra..." value="'+esc(_search)+'" oninput="window._safras_search(this.value)" style="width:200px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._safras_nova()">+ Nova Safra</button>'+
      '</div></div>'+
      '<div class="stat-row" style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card green"><div class="stat-card-val">'+stats.total+'</div><div class="stat-card-lbl">Safras</div></div>'+
      '<div class="stat-card blue"><div class="stat-card-val">'+stats.emAndamento+'</div><div class="stat-card-lbl">Em Andamento</div></div>'+
      '<div class="stat-card orange"><div class="stat-card-val">'+stats.planejamento+'</div><div class="stat-card-lbl">Planejamento</div></div>'+
      '</div>'+
      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Nome / Cultura</th><th>Fazenda</th><th>Plantio - Colheita</th><th>Area (ha)</th><th>Status</th><th>Acoes</th>'+
      '</tr></thead><tbody id="safrasBody">'+
      renderRows()+
      '</tbody></table></div>';
  }

  function calcStats() {
    const vis = filtrados();
    return {
      total: vis.length,
      emAndamento: vis.filter(function(s){ return s.status==='em_andamento'; }).length,
      planejamento: vis.filter(function(s){ return s.status==='planejamento'; }).length
    };
  }

  function filtrados() {
    return _safras.filter(function(s) {
      const ok1 = !_filtroStatus || s.status === _filtroStatus;
      const ok2 = !_search || (s.nome||'').toLowerCase().includes(_search.toLowerCase())
                           || (s.cultura||'').toLowerCase().includes(_search.toLowerCase());
      return ok1 && ok2;
    });
  }

  function statusBadge(s) {
    if(s==='em_andamento') return '<span class="badge badge-green">Em andamento</span>';
    if(s==='encerrada') return '<span class="badge" style="background:#e9ecef">Encerrada</span>';
    return '<span class="badge badge-blue">Planejamento</span>';
  }

  function renderRows() {
    const vis = filtrados();
    if(!vis.length) return '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:32px">'+
      (_search||_filtroStatus ? 'Nenhuma safra encontrada' : 'Nenhuma safra cadastrada')+'</td></tr>';
    return vis.map(function(s) {
      return '<tr>'+
      '<td><strong>'+esc(s.nome)+'</strong><br><small style="color:var(--muted)">'+esc(s.cultura||'')+'</small></td>'+
      '<td>'+esc((s.fazendas&&s.fazendas.nome)||'--')+'</td>'+
      '<td style="font-size:13px">'+fmtDate(s.data_plantio)+' - '+fmtDate(s.data_colheita)+'</td>'+
      '<td>'+(s.area_ha ? s.area_ha+' ha' : '--')+'</td>'+
      '<td>'+statusBadge(s.status)+'</td>'+
      '<td>'+
      '<button class="btn-icon" onclick="window._safras_edit(this)" data-id="'+s.id+'">Editar</button> '+
      '<button class="btn-icon" onclick="window._safras_del(this)" data-id="'+s.id+'" data-nome="'+esc(s.nome)+'">Excluir</button>'+
      '</td></tr>';
    }).join('');
  }

  window._safras_nova = function() { abrirForm(null); };
  window._safras_edit = function(btn) { var id = btn.dataset.id; abrirForm(_safras.find(function(s){return s.id===id;})); };
  window._safras_search = function(v) { _search = v; document.getElementById('safrasBody').innerHTML = renderRows(); };
  window._safras_setStatus = function(v) { _filtroStatus = v; renderUI(); };

  function abrirForm(s) {
    const isNovo = !s;
    const fazOpts = _fazendas.map(function(f){
      return '<option value="'+f.id+'"'+(s&&s.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';
    }).join('');
    const culturas = ['Soja','Milho','Cafe','Feijao','Algodao','Trigo','Cana','Arroz','Sorgo'];
    const cultOpts = culturas.map(function(c){
      return '<option value="'+c+'"'+(s&&s.cultura===c?' selected':'')+'>'+c+'</option>';
    }).join('');

    showModal(isNovo ? '+ Nova Safra' : 'Editar Safra',
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field" style="grid-column:1/-1"><label>Nome da Safra *</label>'+
      '<input id="saf_nome" value="'+esc(s&&s.nome||'')+'" placeholder="Ex: Safra Soja 2025/26"/></div>'+
      '<div class="form-field"><label>Fazenda *</label>'+
      '<select id="saf_fazenda"><option value="">Selecione...</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Cultura *</label>'+
      '<select id="saf_cultura"><option value="">Selecione...</option>'+cultOpts+'</select></div>'+
      '<div class="form-field"><label>Data de Plantio</label>'+
      '<input id="saf_plantio" type="date" value="'+(s&&s.data_plantio||'')+'"/></div>'+
      '<div class="form-field"><label>Data de Colheita Prevista</label>'+
      '<input id="saf_colheita" type="date" value="'+(s&&s.data_colheita||'')+'"/></div>'+
      '<div class="form-field"><label>Area (ha)</label>'+
      '<input id="saf_area" type="number" step="0.01" min="0" value="'+(s&&s.area_ha||'')+'"/></div>'+
      '<div class="form-field"><label>Status</label>'+
      '<select id="saf_status">'+
      '<option value="planejamento"'+(s&&s.status==='planejamento'?' selected':(!s?' selected':''))+'>Planejamento</option>'+
      '<option value="em_andamento"'+(s&&s.status==='em_andamento'?' selected':'')+'>Em andamento</option>'+
      '<option value="encerrada"'+(s&&s.status==='encerrada'?' selected':'')+'>Encerrada</option>'+
      '</select></div>'+
      '<div class="form-field" style="grid-column:1/-1"><label>Observacoes</label>'+
      '<textarea id="saf_obs" rows="2" style="width:100%;resize:vertical;padding:8px;border:1px solid var(--brd);border-radius:var(--r)">'+esc(s&&s.observacoes||'')+'</textarea></div>'+
      '</div>',
      async function() {
        const nome    = document.getElementById('saf_nome').value.trim();
        const fazId   = document.getElementById('saf_fazenda').value;
        const cultura = document.getElementById('saf_cultura').value;
        const plantio = document.getElementById('saf_plantio').value || null;
        const colheita = document.getElementById('saf_colheita').value || null;
        const area    = parseFloat(document.getElementById('saf_area').value) || null;
        const status  = document.getElementById('saf_status').value;
        const obs     = document.getElementById('saf_obs').value.trim() || null;

        if(!nome) { toast('Informe o nome da safra','bad'); return; }
        if(!fazId) { toast('Selecione a fazenda','bad'); return; }
        if(!cultura) { toast('Selecione a cultura','bad'); return; }

        const payload = { nome, fazenda_id: fazId, cultura, data_plantio: plantio, data_colheita: colheita, area_ha: area, status, observacoes: obs };
        const { error } = isNovo
          ? await sb.from('safras').insert(payload)
          : await sb.from('safras').update(payload).eq('id', s.id);
        if(error) { toast('Erro: '+error.message,'bad'); return; }
        toast(isNovo ? 'Safra cadastrada!' : 'Safra atualizada!','ok');
        closeModal(); render();
      }
    );
    setTimeout(function(){ var el = document.getElementById('saf_nome'); if(el) el.focus(); }, 100);
  }

  window._safras_del = function(btn) {
    var id = btn.dataset.id;
    var nome = btn.dataset.nome;
    showConfirm('Excluir safra <strong>'+esc(nome)+'</strong>?',
      async function() {
        const { error } = await sb.from('safras').delete().eq('id', id);
        if(error) { toast('Erro: '+error.message,'bad'); return; }
        toast('Safra removida','ok'); render();
      }
    );
  };

  render();
};
