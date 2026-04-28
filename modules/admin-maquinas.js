// ============================================================
// JA AGRO — Admin Module: Máquinas
// admin-maquinas.js
// ============================================================
window.module_maquinas = async function() {
  const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmt  = n => n!=null ? Number(n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1}) : '—';
  const fmtR = n => n!=null ? 'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—';

  let _maquinas=[], _fazendas=[], _search='', _statusFiltro='', _fazFiltro='';

  const STATUS = { ativo:'✅ Ativo', manutencao:'🔧 Em Manutenção', inativo:'❌ Inativo' };
  const STATUS_COR = { ativo:'badge-green', manutencao:'badge-yellow', inativo:'badge-red' };
  const TIPOS = ['Trator','Colheitadeira','Plantadeira','Pulverizador','Caminhão','Veículo','Implemento','Outro'];

  async function render() {
    setLoading('mainContent');
    try {
      const [{ data: fazendas }, { data: maquinas, error }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('maquinas').select('*, fazendas(nome)').eq('ativo',true).order('fazendas(nome)').order('nome')
      ]);
      if(error) throw error;
      _maquinas = maquinas||[];
      _fazendas = fazendas||[];
      renderUI();
    } catch(e) {
      document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p style="color:var(--danger)">Erro: '+esc(e.message)+'</p></div>';
    }
  }

  function renderUI() {
    const stats = calcStats();
    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>🚜 Máquinas</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="fazFiltroM" onchange="window._maq_setFaz(this.value)" style="width:155px">'+
      '<option value="">Todas fazendas</option>'+
      _fazendas.map(f=>'<option value="'+f.id+'"'+(f.id===_fazFiltro?' selected':'')+'>'+esc(f.nome)+'</option>').join('')+
      '</select>'+
      '<select class="search-input" id="statusFiltroM" onchange="window._maq_setStatus(this.value)" style="width:155px">'+
      '<option value="">Todos status</option>'+
      Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'"'+(k===_statusFiltro?' selected':'')+'>'+v+'</option>').join('')+
      '</select>'+
      '<input class="search-input" placeholder="🔍 Buscar máquina..." value="'+esc(_search)+'" oninput="window._maq_search(this.value)" style="width:190px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._maq_novo()">+ Nova Máquina</button>'+
      '</div></div>'+

      '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card green"><div class="stat-card-val">'+stats.ativas+'</div><div class="stat-card-lbl">Ativas</div></div>'+
      '<div class="stat-card orange"><div class="stat-card-val">'+stats.manutencao+'</div><div class="stat-card-lbl">Em Manutenção</div></div>'+
      '<div class="stat-card purple"><div class="stat-card-val">'+stats.semManutencao+'</div><div class="stat-card-lbl">Manutenção Vencida</div></div>'+
      '</div>'+

      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Nome / Modelo</th><th>Tipo</th><th>Fazenda</th><th>Horímetro</th><th>KM</th><th>Próx. Manut.</th><th>Status</th><th>Ações</th>'+
      '</tr></thead><tbody id="maquinasBody">'+renderRows()+'</tbody></table></div>';
  }

  function calcStats() {
    const vis = filtrados();
    return {
      ativas: vis.filter(m=>m.status==='ativo').length,
      manutencao: vis.filter(m=>m.status==='manutencao').length,
      semManutencao: vis.filter(m=>m.status==='ativo' && m.proxima_manutencao_h && m.horimetro_atual >= m.proxima_manutencao_h).length
    };
  }

  function filtrados() {
    return _maquinas.filter(m=>{
      const ok1 = !_fazFiltro || m.fazenda_id===_fazFiltro;
      const ok2 = !_statusFiltro || m.status===_statusFiltro;
      const ok3 = !_search || (m.nome||'').toLowerCase().includes(_search.toLowerCase())
                           || (m.marca||'').toLowerCase().includes(_search.toLowerCase())
                           || (m.modelo||'').toLowerCase().includes(_search.toLowerCase());
      return ok1&&ok2&&ok3;
    });
  }

  function renderRows() {
    const vis = filtrados();
    if(!vis.length) return '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px">📋 Nenhuma máquina encontrada</td></tr>';
    return vis.map(m=>{
      const manutVencida = m.proxima_manutencao_h && m.horimetro_atual >= m.proxima_manutencao_h;
      return '<tr>'+
        '<td><strong>'+esc(m.nome)+'</strong>'+(m.marca||m.modelo?'<br><small style="color:var(--muted)">'+esc([m.marca,m.modelo,m.ano].filter(Boolean).join(' '))+'</small>':'')+'</td>'+
        '<td>'+esc(m.tipo||'—')+'</td>'+
        '<td style="color:var(--muted)">'+esc(m.fazendas?.nome||'—')+'</td>'+
        '<td>'+fmt(m.horimetro_atual)+' h</td>'+
        '<td>'+fmt(m.km_atual)+' km</td>'+
        '<td>'+(manutVencida ? '<span class="badge badge-red">⚠️ '+fmt(m.proxima_manutencao_h)+' h</span>' : (m.proxima_manutencao_h ? fmt(m.proxima_manutencao_h)+' h' : '—'))+'</td>'+
        '<td><span class="badge '+esc(STATUS_COR[m.status]||'')+'">'+esc(STATUS[m.status]||m.status)+'</span></td>'+
        '<td>'+
        '<button class="btn-icon" title="Editar" onclick="window._maq_edit(''+m.id+'')">✏️</button> '+
        '<button class="btn-icon" title="Registrar Manutenção" onclick="window._maq_manut(''+m.id+'',''+esc(m.nome)+'')">🔧</button>'+
        '</td></tr>';
    }).join('');
  }

  window._maq_search = v=>{ _search=v; document.getElementById('maquinasBody').innerHTML=renderRows(); };
  window._maq_setFaz = v=>{ _fazFiltro=v; renderUI(); };
  window._maq_setStatus = v=>{ _statusFiltro=v; renderUI(); };
  window._maq_novo   = ()=>abrirForm(null);
  window._maq_edit   = id=>abrirForm(_maquinas.find(m=>m.id===id));

  function abrirForm(m) {
    const isNovo = !m;
    const fazOpts = _fazendas.map(f=>'<option value="'+f.id+'"'+(m?.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>').join('');
    const tipoOpts = TIPOS.map(t=>'<option value="'+t+'"'+(m?.tipo===t?' selected':'')+'>'+t+'</option>').join('');
    const statusOpts = Object.entries(STATUS).map(([k,v])=>'<option value="'+k+'"'+(m?.status===k||(!m&&k==='ativo')?' selected':'')+'>'+v+'</option>').join('');

    showModal(isNovo?'+ Nova Máquina':'Editar Máquina',
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field" style="grid-column:1/-1"><label>Nome/Identificação *</label>'+
      '<input id="maq_nome" value="'+esc(m?.nome||'')+'" placeholder="Ex: Trator John Deere 6110J"/></div>'+
      '<div class="form-field"><label>Fazenda</label>'+
      '<select id="maq_faz"><option value="">Sem fazenda específica</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Tipo</label>'+
      '<select id="maq_tipo"><option value="">Selecione...</option>'+tipoOpts+'</select></div>'+
      '<div class="form-field"><label>Marca</label>'+
      '<input id="maq_marca" value="'+esc(m?.marca||'')+'" placeholder="Ex: John Deere"/></div>'+
      '<div class="form-field"><label>Modelo</label>'+
      '<input id="maq_modelo" value="'+esc(m?.modelo||'')+'" placeholder="Ex: 6110J"/></div>'+
      '<div class="form-field"><label>Ano</label>'+
      '<input id="maq_ano" type="number" min="1950" max="2030" value="'+esc(m?.ano||'')+'"/></div>'+
      '<div class="form-field"><label>Placa</label>'+
      '<input id="maq_placa" value="'+esc(m?.placa||'')+'"/></div>'+
      '<div class="form-field"><label>Horímetro Atual (h)</label>'+
      '<input id="maq_hora" type="number" step="0.1" min="0" value="'+esc(m?.horimetro_atual||0)+'"/></div>'+
      '<div class="form-field"><label>KM Atual</label>'+
      '<input id="maq_km" type="number" step="0.1" min="0" value="'+esc(m?.km_atual||0)+'"/></div>'+
      '<div class="form-field"><label>Próx. Manut. (h)</label>'+
      '<input id="maq_proxh" type="number" step="0.1" min="0" value="'+esc(m?.proxima_manutencao_h||'')+'"/></div>'+
      '<div class="form-field"><label>Status</label>'+
      '<select id="maq_status">'+statusOpts+'</select></div>'+
      '<div class="form-field" style="grid-column:1/-1"><label>Observações</label>'+
      '<textarea id="maq_obs" rows="2" style="width:100%;resize:vertical;padding:8px 12px;border:1px solid var(--brd);border-radius:var(--r);font-family:var(--f)">'+esc(m?.observacoes||'')+'</textarea></div>'+
      '</div>',
      async function(){
        const nome  = document.getElementById('maq_nome').value.trim();
        if(!nome){ toast('Informe o nome','bad'); return; }
        const payload={
          nome,
          fazenda_id: document.getElementById('maq_faz').value||null,
          tipo:       document.getElementById('maq_tipo').value||null,
          marca:      document.getElementById('maq_marca').value.trim()||null,
          modelo:     document.getElementById('maq_modelo').value.trim()||null,
          ano:        parseInt(document.getElementById('maq_ano').value)||null,
          placa:      document.getElementById('maq_placa').value.trim()||null,
          horimetro_atual: parseFloat(document.getElementById('maq_hora').value)||0,
          km_atual:   parseFloat(document.getElementById('maq_km').value)||0,
          proxima_manutencao_h: parseFloat(document.getElementById('maq_proxh').value)||null,
          status:     document.getElementById('maq_status').value,
          observacoes: document.getElementById('maq_obs').value.trim()||null
        };
        const { error } = isNovo
          ? await sb.from('maquinas').insert({ ...payload, ativo:true })
          : await sb.from('maquinas').update(payload).eq('id',m.id);
        if(error){ toast('Erro: '+error.message,'bad'); return; }
        toast(isNovo?'Máquina cadastrada!':'Máquina atualizada!','ok');
        closeModal(); render();
      }
    );
    setTimeout(()=>document.getElementById('maq_nome')?.focus(),100);
  }

  window._maq_manut = function(id, nome) {
    showModal('🔧 Registrar Manutenção — '+esc(nome),
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field"><label>Tipo *</label>'+
      '<select id="mn_tipo"><option value="preventiva">Preventiva</option><option value="corretiva">Corretiva</option><option value="revisao">Revisão</option></select></div>'+
      '<div class="form-field"><label>Data *</label>'+
      '<input id="mn_data" type="date" value="'+new Date().toISOString().split("T")[0]+'"/></div>'+
      '<div class="form-field"><label>Horímetro</label>'+
      '<input id="mn_hora" type="number" step="0.1" min="0"/></div>'+
      '<div class="form-field"><label>Custo (R$)</label>'+
      '<input id="mn_custo" type="number" step="0.01" min="0"/></div>'+
      '<div class="form-field" style="grid-column:1/-1"><label>Descrição *</label>'+
      '<input id="mn_desc" placeholder="Descreva o serviço realizado..."/></div>'+
      '<div class="form-field"><label>Oficina</label>'+
      '<input id="mn_oficina"/></div>'+
      '<div class="form-field"><label>Próximo Serviço (h)</label>'+
      '<input id="mn_proxh" type="number" step="1" min="0" placeholder="Ex: 250"/></div>'+
      '</div>',
      async function(){
        const tipo  = document.getElementById('mn_tipo').value;
        const data  = document.getElementById('mn_data').value;
        const hora  = parseFloat(document.getElementById('mn_hora').value)||null;
        const custo = parseFloat(document.getElementById('mn_custo').value)||null;
        const desc  = document.getElementById('mn_desc').value.trim();
        const ofic  = document.getElementById('mn_oficina').value.trim()||null;
        const proxH = parseFloat(document.getElementById('mn_proxh').value)||null;
        if(!desc){ toast('Informe a descrição','bad'); return; }
        const maqPayload = {};
        if(hora) maqPayload.horimetro_atual = hora;
        if(proxH) maqPayload.proxima_manutencao_h = proxH + (hora||0);
        if(tipo==='manutencao') maqPayload.status = 'ativo';
        const [r1] = await Promise.all([
          sb.from('manutencoes').insert({ maquina_id:id, tipo, data, horimetro:hora, descricao:desc, custo, oficina:ofic, proximo_h:proxH }),
          Object.keys(maqPayload).length ? sb.from('maquinas').update(maqPayload).eq('id',id) : Promise.resolve()
        ]);
        if(r1.error){ toast('Erro: '+r1.error.message,'bad'); return; }
        toast('Manutenção registrada!','ok'); closeModal(); render();
      }
    );
    setTimeout(()=>document.getElementById('mn_desc')?.focus(),100);
  };

  render();
};
