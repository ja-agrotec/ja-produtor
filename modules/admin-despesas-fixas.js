// ============================================================
// JA AGRO - Admin Module: Despesas Fixas
// admin-despesas-fixas.js
// ============================================================
window.module_despesas_fixas = async function() {
  const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtBR = n => 'R$ '+(parseFloat(n||0)).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});

  const CATEGORIAS = ['Internet','Telefone','Energia','Agua','Contador','Funcionario Fixo','Aluguel','Seguro','Software/Sistema','Imposto','Manutencao Predial','Arrendamento','Tributos','Certificacao','Outros'];
  const PERIODICIDADES = [
    {v:'mensal', l:'Mensal', meses:1},
    {v:'bimestral', l:'Bimestral', meses:2},
    {v:'trimestral', l:'Trimestral', meses:3},
    {v:'semestral', l:'Semestral', meses:6},
    {v:'anual', l:'Anual', meses:12}
  ];

  let _itens = [], _fazendas = [], _filtroFaz = '', _search = '';

  async function render() {
    if (typeof setLoading==='function') setLoading('mainContent');
    try {
      const [{ data: fazendas }, { data: itens, error }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('despesas_fixas').select('*, fazendas(nome)').order('nome')
      ]);
      if(error) throw error;
      _itens = itens || [];
      _fazendas = fazendas || [];
      renderUI();
    } catch(e) {
      document.getElementById('mainContent').innerHTML =
        '<div class="empty-state"><p style="color:var(--danger)">Erro: '+esc(e.message)+'</p></div>';
    }
  }

  function filtrados() {
    return _itens.filter(function(o) {
      const ok1 = !_filtroFaz || o.fazenda_id === _filtroFaz;
      const ok2 = !_search || (o.nome||'').toLowerCase().includes(_search.toLowerCase())
                           || (o.categoria||'').toLowerCase().includes(_search.toLowerCase());
      return ok1 && ok2;
    });
  }

  function valorMensalNorm(item) {
    var p = PERIODICIDADES.find(function(x){return x.v===item.periodicidade;}) || PERIODICIDADES[0];
    return parseFloat(item.valor_mensal||0) / p.meses;
  }

  function renderUI() {
    const fazOpts = '<option value="">Todas as fazendas</option>'+_fazendas.map(function(f){
      return '<option value="'+f.id+'"'+(_filtroFaz===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';
    }).join('');
    const vis = filtrados();
    var totalMensal = vis.reduce(function(a,b){ return a + (b.ativo!==false ? valorMensalNorm(b) : 0); },0);
    var totalAnual = totalMensal * 12;

    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>Despesas Fixas</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="filtroFazDF" onchange="window._df_setFaz(this.value)" style="width:200px">'+fazOpts+'</select>'+
      '<input class="search-input" id="srchDF" placeholder="Buscar..." value="'+esc(_search)+'" oninput="window._df_search(this.value)" style="width:200px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._df_novo()">+ Nova Despesa Fixa</button>'+
      '</div></div>'+
      '<div class="stat-row" style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card green"><div class="stat-card-val">'+vis.length+'</div><div class="stat-card-lbl">Itens</div></div>'+
      '<div class="stat-card"><div class="stat-card-val" style="font-size:18px">'+fmtBR(totalMensal)+'</div><div class="stat-card-lbl">Total/mes (equivalente)</div></div>'+
      '<div class="stat-card"><div class="stat-card-val" style="font-size:18px">'+fmtBR(totalAnual)+'</div><div class="stat-card-lbl">Total/ano</div></div>'+
      '</div>'+
      '<div style="margin:8px 20px;padding:10px 14px;background:var(--info-lt);border-radius:8px;color:var(--info);font-size:12px">Essas despesas sao rateadas automaticamente nas safras abertas pelo periodo de duracao (data_plantio - data_colheita) e pela area (ha) de cada talhao.</div>'+
      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Nome</th><th>Categoria</th><th>Fazenda</th><th>Valor</th><th>Periodo</th><th>Equiv/mes</th><th>Status</th><th>Acoes</th>'+
      '</tr></thead><tbody>'+ renderRows() +'</tbody></table></div>';
  }

  function renderRows() {
    const vis = filtrados();
    if(!vis.length) return '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px">Nenhuma despesa fixa cadastrada</td></tr>';
    return vis.map(function(o) {
      var per = PERIODICIDADES.find(function(x){return x.v===o.periodicidade;}) || PERIODICIDADES[0];
      var equivMes = valorMensalNorm(o);
      return '<tr>'+
      '<td><strong>'+esc(o.nome)+'</strong></td>'+
      '<td><span class="badge">'+esc(o.categoria||'--')+'</span></td>'+
      '<td>'+esc((o.fazendas&&o.fazendas.nome)||'Todas')+'</td>'+
      '<td>'+fmtBR(o.valor_mensal)+'</td>'+
      '<td>'+esc(per.l)+'</td>'+
      '<td>'+fmtBR(equivMes)+'</td>'+
      '<td>'+(o.ativo!==false?'<span class="badge badge-green">Ativo</span>':'<span class="badge">Inativo</span>')+'</td>'+
      '<td>'+
      '<button class="btn-icon" onclick="window._df_edit(this)" data-id="'+o.id+'">Editar</button> '+
      '<button class="btn-icon" onclick="window._df_del(this)" data-id="'+o.id+'" data-nome="'+esc(o.nome)+'">Excluir</button>'+
      '</td></tr>';
    }).join('');
  }

  function abrirForm(item) {
    var isNovo = !item;
    item = item || { nome:'', categoria:'Internet', fazenda_id:'', valor_mensal:0, periodicidade:'mensal', data_inicio:new Date().toISOString().substring(0,10), data_fim:'', descricao:'', ativo:true };
    var fazOpts = '<option value="">(Todas as fazendas)</option>'+_fazendas.map(function(f){
      return '<option value="'+f.id+'"'+(item.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';
    }).join('');
    var catAtual = (item.categoria||'').toString();
    var catNorm = catAtual.toLowerCase();
    var matchExato = CATEGORIAS.find(function(c){ return c.toLowerCase()===catNorm; });
    var catOpts = CATEGORIAS.map(function(c){
      var sel = (matchExato && matchExato===c) ? ' selected' : '';
      return '<option value="'+esc(c)+'"'+sel+'>'+esc(c)+'</option>';
    }).join('');
    if(!matchExato && catAtual){
      catOpts = '<option value="'+esc(catAtual)+'" selected>'+esc(catAtual)+' (atual)</option>'+catOpts;
    }
    var perOpts = PERIODICIDADES.map(function(p){ return '<option value="'+p.v+'"'+(item.periodicidade===p.v?' selected':'')+'>'+esc(p.l)+'</option>'; }).join('');

    var html = '<div class="modal-overlay" id="dfModal" style="position:fixed;inset:0;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;z-index:1000">'+
      '<div style="background:#fff;border-radius:12px;padding:24px;width:560px;max-width:95vw;max-height:90vh;overflow:auto">'+
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0">'+(isNovo?'+ Nova':'Editar')+' Despesa Fixa</h3>'+
      '<button onclick="document.getElementById(\'dfModal\').remove()" style="background:none;border:0;font-size:24px;cursor:pointer">x</button></div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div style="grid-column:span 2"><label>Nome *</label><input id="dfNome" class="form-input" value="'+esc(item.nome)+'"/></div>'+
      '<div><label>Categoria</label><select id="dfCat" class="form-input">'+catOpts+'</select></div>'+
      '<div><label>Fazenda</label><select id="dfFaz" class="form-input">'+fazOpts+'</select></div>'+
      '<div><label>Valor (R$) *</label><input id="dfVal" type="number" step="0.01" class="form-input" value="'+(item.valor_mensal||0)+'"/></div>'+
      '<div><label>Periodicidade</label><select id="dfPer" class="form-input">'+perOpts+'</select></div>'+
      '<div><label>Inicio</label><input id="dfDi" type="date" class="form-input" value="'+(item.data_inicio||'')+'"/></div>'+
      '<div><label>Fim (opcional)</label><input id="dfDf" type="date" class="form-input" value="'+(item.data_fim||'')+'"/></div>'+
      '<div style="grid-column:span 2"><label>Descricao</label><textarea id="dfDesc" class="form-input" rows="2">'+esc(item.descricao||'')+'</textarea></div>'+
      '<div style="grid-column:span 2"><label><input id="dfAtivo" type="checkbox" '+(item.ativo!==false?'checked':'')+'/> Ativo (incluir nos calculos de safra)</label></div>'+
      '</div>'+
      '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:20px">'+
      '<button class="topbar-btn" onclick="document.getElementById(\'dfModal\').remove()">Cancelar</button>'+
      '<button class="topbar-btn btn-primary" onclick="window._df_save(\''+(item.id||'')+'\')">Salvar</button>'+
      '</div></div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
  }

  window._df_setFaz = function(v) { _filtroFaz = v; renderUI(); };
  window._df_search = function(v) { _search = v; renderUI(); };
  window._df_novo = function() { abrirForm(null); };
  window._df_edit = function(btn) { var id = btn.dataset.id; abrirForm(_itens.find(function(o){return o.id===id;})); };

  window._df_save = async function(id) {
    var nome = document.getElementById('dfNome').value.trim();
    if (!nome) { alert('Nome obrigatorio'); return; }
    var valor = parseFloat(document.getElementById('dfVal').value||0);
    if (!(valor>0)) { alert('Valor deve ser maior que zero'); return; }
    var payload = {
      nome: nome,
      categoria: document.getElementById('dfCat').value,
      fazenda_id: document.getElementById('dfFaz').value || null,
      valor_mensal: valor,
      periodicidade: document.getElementById('dfPer').value,
      data_inicio: document.getElementById('dfDi').value || new Date().toISOString().substring(0,10),
      data_fim: document.getElementById('dfDf').value || null,
      descricao: document.getElementById('dfDesc').value,
      ativo: document.getElementById('dfAtivo').checked,
      atualizado_em: new Date().toISOString()
    };
    try {
      if (id) {
        var r1 = await sb.from('despesas_fixas').update(payload).eq('id', id);
        if (r1.error) throw r1.error;
      } else {
        var r2 = await sb.from('despesas_fixas').insert(payload);
        if (r2.error) throw r2.error;
      }
      document.getElementById('dfModal').remove();
      await render();
    } catch(e) { alert('Erro: '+e.message); }
  };

  window._df_del = async function(btn) {
    var id = btn.dataset.id; var nome = btn.dataset.nome;
    if (!confirm('Excluir despesa fixa "'+nome+'"?')) return;
    try {
      var r = await sb.from('despesas_fixas').delete().eq('id', id);
      if (r.error) throw r.error;
      await render();
    } catch(e) { alert('Erro: '+e.message); }
  };

  await render();
};
