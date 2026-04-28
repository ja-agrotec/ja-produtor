// ============================================================
// JA AGRO — Admin Module: Lançamentos
// admin-lancamentos.js
// ============================================================
window.module_lancamentos = async function() {
  const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtR = n => n!=null ? 'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—';
  const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '—';

  let _lan=[], _fazendas=[], _safras=[], _talhoes=[], _categorias=[], _operadores=[], _maquinas=[];
  let _search='', _fazFiltro='', _safFiltro='', _tipoFiltro='', _catFiltro='';
  let _dtIni='', _dtFim='';
  const PG = 25; let _pag=1;

  async function render() {
    setLoading('mainContent');
    try {
      const now = new Date(); const mIni = new Date(now.getFullYear(),now.getMonth(),1);
      _dtIni = _dtIni || mIni.toISOString().split('T')[0];
      _dtFim = _dtFim || now.toISOString().split('T')[0];
      const [{ data: faz }, { data: saf }, { data: tal }, { data: cat }, { data: ops }, { data: maq }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('safras').select('id,nome,fazenda_id').order('nome'),
        sb.from('talhoes').select('id,nome,fazenda_id').eq('ativo',true).order('nome'),
        sb.from('categorias_lancamento').select('id,nome,tipo').eq('ativo',true).order('nome'),
        sb.from('operadores').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('maquinas').select('id,nome').eq('ativo',true).order('nome')
      ]);
      _fazendas=faz||[]; _safras=saf||[]; _talhoes=tal||[]; _categorias=cat||[]; _operadores=ops||[]; _maquinas=maq||[];
      await carregarLancamentos();
    } catch(e) {
      document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p style="color:var(--danger)">Erro: '+esc(e.message)+'</p></div>';
    }
  }

  async function carregarLancamentos() {
    let q = sb.from('lancamentos')
      .select('*, fazendas(nome), safras(nome), talhoes(nome), categorias_lancamento(nome,tipo), operadores(nome), maquinas(nome)', { count:'exact' })
      .neq('status','cancelado')
      .order('data_lancamento',{ascending:false})
      .order('criado_em',{ascending:false});
    if(_fazFiltro)  q = q.eq('fazenda_id',_fazFiltro);
    if(_safFiltro)  q = q.eq('safra_id',_safFiltro);
    if(_catFiltro)  q = q.eq('categoria_id',_catFiltro);
    if(_tipoFiltro) q = q.eq('tipo',_tipoFiltro);
    if(_dtIni) q = q.gte('data_lancamento',_dtIni);
    if(_dtFim) q = q.lte('data_lancamento',_dtFim);
    const { data, error } = await q.range((_pag-1)*PG, _pag*PG-1);
    if(error) throw error;
    _lan = data||[];
    renderUI();
  }

  function totais() {
    const dep = _lan.filter(l=>l.tipo==='despesa').reduce((s,l)=>s+(l.custo_total||0),0);
    const rec = _lan.filter(l=>l.tipo==='receita').reduce((s,l)=>s+(l.custo_total||0),0);
    return { dep, rec, saldo: rec-dep };
  }

  function renderUI() {
    const t = totais();
    const saldoCor = t.saldo>=0 ? 'var(--success)' : 'var(--danger)';
    const fazOpts = _fazendas.map(f=>'<option value="'+f.id+'"'+(f.id===_fazFiltro?' selected':'')+'>'+esc(f.nome)+'</option>').join('');
    const safOpts = _safras.filter(s=>!_fazFiltro||s.fazenda_id===_fazFiltro).map(s=>'<option value="'+s.id+'"'+(s.id===_safFiltro?' selected':'')+'>'+esc(s.nome)+'</option>').join('');
    const catOpts = _categorias.map(c=>'<option value="'+c.id+'"'+(c.id===_catFiltro?' selected':'')+'>'+esc(c.nome)+'</option>').join('');

    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>📋 Lançamentos</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="fazFiltroL" onchange="window._lan_setFaz(this.value)" style="width:145px">'+
      '<option value="">Todas fazendas</option>'+fazOpts+'</select>'+
      '<select class="search-input" id="safFiltroL" onchange="window._lan_setSaf(this.value)" style="width:145px">'+
      '<option value="">Todas safras</option>'+safOpts+'</select>'+
      '<select class="search-input" id="tipoFiltro" onchange="window._lan_setTipo(this.value)" style="width:120px">'+
      '<option value="">Tipo</option><option value="despesa"'+(''===_tipoFiltro||_tipoFiltro==='despesa'?(_tipoFiltro==='despesa'?' selected':''):'')+'> Despesa</option>'+
      '<option value="receita"'+(_tipoFiltro==='receita'?' selected':'')+'>💰 Receita</option></select>'+
      '<select class="search-input" id="catFiltroL" onchange="window._lan_setCat(this.value)" style="width:145px">'+
      '<option value="">Categoria</option>'+catOpts+'</select>'+
      '<input type="date" class="search-input" id="dtIni" value="'+_dtIni+'" onchange="window._lan_setDt()" style="width:130px"/>'+
      '<input type="date" class="search-input" id="dtFim" value="'+_dtFim+'" onchange="window._lan_setDt()" style="width:130px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._lan_novo()">+ Lançamento</button>'+
      '</div></div>'+

      '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card orange"><div class="stat-card-val">'+fmtR(t.dep)+'</div><div class="stat-card-lbl">Total Despesas</div></div>'+
      '<div class="stat-card green"><div class="stat-card-val">'+fmtR(t.rec)+'</div><div class="stat-card-lbl">Total Receitas</div></div>'+
      '<div class="stat-card" style="border-top-color:'+(t.saldo>=0?'var(--success)':'var(--danger)')+'">'+
      '<div class="stat-card-val" style="color:'+saldoCor+'">'+fmtR(t.saldo)+'</div>'+
      '<div class="stat-card-lbl">Resultado</div></div>'+
      '<div class="stat-card blue"><div class="stat-card-val">'+_lan.length+'</div><div class="stat-card-lbl">Registros</div></div>'+
      '</div>'+

      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Data</th><th>Fazenda</th><th>Safra</th><th>Talhão</th><th>Categoria</th><th>Tipo</th><th>Descrição</th><th>Valor</th><th>Ações</th>'+
      '</tr></thead><tbody id="lancBody">'+renderRows()+'</tbody></table>'+
      '</div>';
  }

  function renderRows() {
    if(!_lan.length) return '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:32px">📋 Nenhum lançamento no período</td></tr>';
    return _lan.map(l=>{
      const isDes = l.tipo==='despesa';
      return '<tr>'+
        '<td>'+fmtD(l.data_lancamento)+'</td>'+
        '<td style="color:var(--muted)">'+esc(l.fazendas?.nome||'—')+'</td>'+
        '<td style="color:var(--muted)">'+esc(l.safras?.nome||'—')+'</td>'+
        '<td style="color:var(--muted)">'+esc(l.talhoes?.nome||'—')+'</td>'+
        '<td><span class="badge">'+esc(l.categorias_lancamento?.nome||'—')+'</span></td>'+
        '<td>'+(isDes?'<span class="badge badge-red">💸 Despesa</span>':'<span class="badge badge-green">💰 Receita</span>')+'</td>'+
        '<td>'+esc(l.descricao||'—')+'</td>'+
        '<td><strong style="color:'+(isDes?'var(--danger)':'var(--success)')+'">'+fmtR(l.custo_total)+'</strong></td>'+
        '<td>'+
        '<button class="btn-icon" onclick="window._lan_edit(''+l.id+'')">✏️</button> '+
        '<button class="btn-icon" onclick="window._lan_cancel(''+l.id+'',''+fmtR(l.custo_total)+'')">🗑️</button>'+
        '</td></tr>';
    }).join('');
  }

  window._lan_setFaz   = v=>{ _fazFiltro=v; _pag=1; carregarLancamentos(); };
  window._lan_setSaf   = v=>{ _safFiltro=v; _pag=1; carregarLancamentos(); };
  window._lan_setTipo  = v=>{ _tipoFiltro=v; _pag=1; carregarLancamentos(); };
  window._lan_setCat   = v=>{ _catFiltro=v; _pag=1; carregarLancamentos(); };
  window._lan_setDt    = ()=>{ _dtIni=document.getElementById('dtIni').value; _dtFim=document.getElementById('dtFim').value; _pag=1; carregarLancamentos(); };
  window._lan_novo     = ()=>abrirForm(null);
  window._lan_edit     = id=>abrirForm(_lan.find(l=>l.id===id));

  function abrirForm(l) {
    const isNovo = !l;
    const fazOpts = _fazendas.map(f=>'<option value="'+f.id+'"'+(l?.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>').join('');
    const safOpts = _safras.map(s=>'<option value="'+s.id+'"'+(l?.safra_id===s.id?' selected':'')+'>'+esc(s.nome)+'</option>').join('');
    const talOpts = _talhoes.map(t=>'<option value="'+t.id+'"'+(l?.talhao_id===t.id?' selected':'')+'>'+esc(t.nome)+'</option>').join('');
    const catDes  = _categorias.filter(c=>c.tipo==='despesa').map(c=>'<option value="'+c.id+'"'+(l?.categoria_id===c.id?' selected':'')+'>'+esc(c.nome)+'</option>').join('');
    const catRec  = _categorias.filter(c=>c.tipo==='receita').map(c=>'<option value="'+c.id+'"'+(l?.categoria_id===c.id?' selected':'')+'>'+esc(c.nome)+'</option>').join('');
    const opOpts  = _operadores.map(o=>'<option value="'+o.id+'"'+(l?.operador_id===o.id?' selected':'')+'>'+esc(o.nome)+'</option>').join('');
    const maqOpts = _maquinas.map(m=>'<option value="'+m.id+'"'+(l?.maquina_id===m.id?' selected':'')+'>'+esc(m.nome)+'</option>').join('');
    const today   = new Date().toISOString().split('T')[0];

    showModal(isNovo?'+ Novo Lançamento':'Editar Lançamento',
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field"><label>Tipo *</label>'+
      '<select id="ln_tipo" onchange="window._lan_changeTipo()">'+
      '<option value="despesa"'+(l?.tipo==='despesa'||!l?' selected':'')+'>💸 Despesa</option>'+
      '<option value="receita"'+(l?.tipo==='receita'?' selected':'')+'>💰 Receita</option></select></div>'+
      '<div class="form-field"><label>Data *</label>'+
      '<input id="ln_data" type="date" value="'+esc(l?.data_lancamento||today)+'"/></div>'+
      '<div class="form-field"><label>Fazenda *</label>'+
      '<select id="ln_faz"><option value="">Selecione...</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Safra</label>'+
      '<select id="ln_saf"><option value="">Nenhuma</option>'+safOpts+'</select></div>'+
      '<div class="form-field"><label>Talhão</label>'+
      '<select id="ln_tal"><option value="">Nenhum</option>'+talOpts+'</select></div>'+
      '<div class="form-field"><label>Categoria *</label>'+
      '<select id="ln_cat"><option value="">Selecione...</option>'+
      '<optgroup label="Despesas">'+catDes+'</optgroup>'+
      '<optgroup label="Receitas">'+catRec+'</optgroup></select></div>'+
      '<div class="form-field" style="grid-column:1/-1"><label>Descrição</label>'+
      '<input id="ln_desc" value="'+esc(l?.descricao||'')+'" placeholder="Descreva o lançamento..."/></div>'+
      '<div class="form-field"><label>Quantidade</label>'+
      '<input id="ln_qtd" type="number" step="0.001" min="0" value="'+esc(l?.quantidade||'')+'" oninput="window._lan_calcTotal()"/></div>'+
      '<div class="form-field"><label>Custo Unitário (R$)</label>'+
      '<input id="ln_cunit" type="number" step="0.0001" min="0" value="'+esc(l?.custo_unitario||'')+'" oninput="window._lan_calcTotal()"/></div>'+
      '<div class="form-field"><label>Custo Total (R$) *</label>'+
      '<input id="ln_total" type="number" step="0.01" min="0" value="'+esc(l?.custo_total||'')+'"/></div>'+
      '<div class="form-field"><label>Nota Fiscal</label>'+
      '<input id="ln_nf" value="'+esc(l?.nota_fiscal||'')+'"/></div>'+
      '<div class="form-field"><label>Operador</label>'+
      '<select id="ln_op"><option value="">Nenhum</option>'+opOpts+'</select></div>'+
      '<div class="form-field"><label>Máquina</label>'+
      '<select id="ln_maq"><option value="">Nenhuma</option>'+maqOpts+'</select></div>'+
      '<div class="form-field" style="grid-column:1/-1"><label>Observações</label>'+
      '<textarea id="ln_obs" rows="2" style="width:100%;resize:vertical;padding:8px 12px;border:1px solid var(--brd);border-radius:var(--r);font-family:var(--f)">'+esc(l?.observacoes||'')+'</textarea></div>'+
      '</div>',
      async function(){
        const fazId  = document.getElementById('ln_faz').value;
        const catId  = document.getElementById('ln_cat').value;
        const total  = parseFloat(document.getElementById('ln_total').value);
        const tipo   = document.getElementById('ln_tipo').value;
        const data   = document.getElementById('ln_data').value;
        if(!fazId){ toast('Selecione a fazenda','bad'); return; }
        if(!catId){ toast('Selecione a categoria','bad'); return; }
        if(!total){ toast('Informe o valor total','bad'); return; }
        if(!data){ toast('Informe a data','bad'); return; }
        const payload={
          tipo, data_lancamento:data, fazenda_id:fazId,
          safra_id:   document.getElementById('ln_saf').value||null,
          talhao_id:  document.getElementById('ln_tal').value||null,
          categoria_id: catId,
          descricao:  document.getElementById('ln_desc').value.trim()||null,
          quantidade: parseFloat(document.getElementById('ln_qtd').value)||null,
          custo_unitario: parseFloat(document.getElementById('ln_cunit').value)||null,
          custo_total: total,
          nota_fiscal: document.getElementById('ln_nf').value.trim()||null,
          operador_id: document.getElementById('ln_op').value||null,
          maquina_id:  document.getElementById('ln_maq').value||null,
          observacoes: document.getElementById('ln_obs').value.trim()||null,
          status: 'confirmado'
        };
        const { error } = isNovo
          ? await sb.from('lancamentos').insert(payload)
          : await sb.from('lancamentos').update(payload).eq('id',l.id);
        if(error){ toast('Erro: '+error.message,'bad'); return; }
        toast(isNovo?'Lançamento registrado!':'Lançamento atualizado!','ok');
        closeModal(); carregarLancamentos();
      }
    );
    setTimeout(()=>document.getElementById('ln_faz')?.focus(),100);
  }

  window._lan_calcTotal = function(){
    const qtd = parseFloat(document.getElementById('ln_qtd')?.value)||0;
    const cu  = parseFloat(document.getElementById('ln_cunit')?.value)||0;
    if(qtd&&cu) document.getElementById('ln_total').value = (qtd*cu).toFixed(2);
  };

  window._lan_cancel = function(id, val){
    showConfirm('Cancelar lançamento de <strong>'+val+'</strong>?<br><small>O lançamento ficará como cancelado.</small>',
      async function(){
        const { error } = await sb.from('lancamentos').update({ status:'cancelado' }).eq('id',id);
        if(error){ toast('Erro: '+error.message,'bad'); return; }
        toast('Lançamento cancelado','ok'); carregarLancamentos();
      }
    );
  };

  render();
};
