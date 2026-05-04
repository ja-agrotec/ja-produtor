window.module_lancamentos = async function() {
  const el = document.getElementById("mainContent");
  if(!el) return;

  let _fazendas=[], _safras=[], _talhoes=[], _operadores=[], _insumos=[], _maquinas=[], _lancamentos=[];
  let _filtFaz="", _filtSafra="", _filtTipo="", _filtBusca="";

  function esc(v){ return v ? String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;") : ""; }
  function fmt(v){ return (v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}); }
  function fmtN(v,d){ return (v||0).toLocaleString("pt-BR",{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }
  function today(){ return new Date().toISOString().slice(0,10); }

  async function loadData(){
    const [fa,sa,ta,op,ins,maq,lan] = await Promise.all([
      sb.from("fazendas").select("id,nome").order("nome"),
      sb.from("safras").select("id,nome,fazenda_id,status").order("nome"),
      sb.from("talhoes").select("id,nome,fazenda_id,certificacao_id").order("nome"),
      sb.from("operadores").select("id,nome,fazenda_id").order("nome"),
      sb.from("insumos").select("id,nome,unidade,preco_unitario,certificacao_permitida").order("nome"),
      sb.from("maquinas").select("id,nome,fazenda_id,tipo,custo_hora,horimetro_atual").order("nome"),
      sb.from("lancamentos").select("*").order("data_lancamento",{ascending:false}).limit(300)
    ]);
    _fazendas  = fa.data||[];
    _safras    = sa.data||[];
    _talhoes   = ta.data||[];
    _operadores= op.data||[];
    _insumos   = ins.data||[];
    _maquinas  = maq.data||[];
    _lancamentos= lan.data||[];
  }

  function calcStats(){
    const items = filtrados();
    const totalDespesas = items.filter(function(i){return i.tipo==="despesa";}).reduce(function(s,i){return s+(i.custo_total||0);},0);
    const totalReceitas = items.filter(function(i){return i.tipo==="receita";}).reduce(function(s,i){return s+(i.custo_total||0);},0);
    const totalMaq = items.filter(function(i){return i.maquina_id;}).reduce(function(s,i){return s+(i.custo_total||0);},0);
    const totalHoras = items.filter(function(i){return i.maquina_id&&i.unidade==="h";}).reduce(function(s,i){return s+(i.quantidade||0);},0);
    return {totalDespesas:totalDespesas, totalReceitas:totalReceitas, totalMaq:totalMaq, totalHoras:totalHoras, qtd:items.length};
  }

  function filtrados(){
    return _lancamentos.filter(function(l){
      if(_filtFaz && l.fazenda_id!==_filtFaz) return false;
      if(_filtSafra && l.safra_id!==_filtSafra) return false;
      if(_filtTipo && l.tipo!==_filtTipo) return false;
      if(_filtBusca){
        const q=_filtBusca.toLowerCase();
        const desc=(l.descricao||"").toLowerCase();
        const nf=(l.nota_fiscal||"").toLowerCase();
        if(!desc.includes(q)&&!nf.includes(q)) return false;
      }
      return true;
    });
  }

  window._lanc_setFaz = function(v){
    _filtFaz=v; _filtSafra="";
    var safSel = document.getElementById("filtSafraLanc");
    if(safSel){
      var filtered = v ? _safras.filter(function(s){return s.fazenda_id===v;}) : _safras;
      safSel.innerHTML = "<option value=\"\">Todas safras</option>" + filtered.map(function(s){return "<option value=\""+s.id+"\">"+esc(s.nome)+"</option>";}).join("");
    }
    renderRows();
  };
  window._lanc_setSafra = function(v){ _filtSafra=v; renderRows(); };
  window._lanc_setTipo  = function(v){ _filtTipo=v; renderRows(); };
  window._lanc_setBusca = function(v){ _filtBusca=v; renderRows(); };

  function renderUI(){
    const st = calcStats();
    const fazOpts = "<option value=\"\">Todas fazendas</option>" + _fazendas.map(function(f){ return "<option value=\""+f.id+"\">"+esc(f.nome)+"</option>"; }).join("");
    const safraOpts = "<option value=\"\">Todas safras</option>" + _safras.map(function(s){ return "<option value=\""+s.id+"\">"+esc(s.nome)+"</option>"; }).join("");
    el.innerHTML =
      "<div style=\"padding:24px;max-width:1200px\">"+
      "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:20px\">"+
      "<div><h2 style=\"margin:0;color:var(--txt)\">\uD83D\uDCCB Lan\u00E7amentos</h2>"+
      "<p style=\"margin:4px 0 0;color:var(--txt-s);font-size:14px\">Registro de custos, receitas e opera\u00E7\u00F5es</p></div>"+
      "<button class=\"btn-primary\" onclick=\"window._lanc_abrirForm(null)\">+ Novo Lan\u00E7amento</button></div>"+
      "<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px\">"+
      "<div class=\"stat-card\" style=\"border-left:4px solid #ef4444\"><div class=\"stat-value\" style=\"color:#ef4444\">"+fmt(st.totalDespesas)+"</div><div class=\"stat-label\">Total Despesas</div></div>"+
      "<div class=\"stat-card\" style=\"border-left:4px solid #22c55e\"><div class=\"stat-value\" style=\"color:#22c55e\">"+fmt(st.totalReceitas)+"</div><div class=\"stat-label\">Total Receitas</div></div>"+
      "<div class=\"stat-card\" style=\"border-left:4px solid #f59e0b\"><div class=\"stat-value\" style=\"color:#f59e0b\">"+fmt(st.totalMaq)+"</div>"+
      "<div class=\"stat-label\">Custo Maquin\u00E1rio"+(st.totalHoras>0?" &#183; "+fmtN(st.totalHoras,1)+"h":"")+"</div></div>"+
      "<div class=\"stat-card\" style=\"border-left:4px solid #6366f1\"><div class=\"stat-value\">"+st.qtd+"</div><div class=\"stat-label\">Lan\u00E7amentos</div></div>"+
      "</div>"+
      "<div style=\"display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap;align-items:center\">"+
      "<select class=\"search-input\" id=\"filtFazLanc\" onchange=\"window._lanc_setFaz(this.value)\" style=\"width:160px\">"+fazOpts+"</select>"+
      "<select class=\"search-input\" id=\"filtSafraLanc\" onchange=\"window._lanc_setSafra(this.value)\" style=\"width:160px\">"+safraOpts+"</select>"+
      "<select class=\"search-input\" onchange=\"window._lanc_setTipo(this.value)\" style=\"width:130px\">"+
      "<option value=\"\">Todos tipos</option><option value=\"despesa\">Despesa</option><option value=\"receita\">Receita</option></select>"+
      "<input class=\"search-input\" placeholder=\"\uD83D\uDD0D Buscar descri\u00E7\u00E3o / NF...\" oninput=\"window._lanc_setBusca(this.value)\" style=\"flex:1;min-width:180px\"/>"+
      "</div>"+
      "<div style=\"background:var(--card);border-radius:12px;overflow:hidden;box-shadow:var(--shadow)\">"+
      "<table style=\"width:100%;border-collapse:collapse\">"+
      "<thead><tr style=\"background:var(--bg)\">"+
      "<th style=\"padding:12px 16px;text-align:left;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">Data</th>"+
      "<th style=\"padding:12px 16px;text-align:left;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">Tipo</th>"+
      "<th style=\"padding:12px 16px;text-align:left;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">Descri\u00E7\u00E3o</th>"+
      "<th style=\"padding:12px 16px;text-align:left;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">Fazenda / Talh\u00E3o</th>"+
      "<th style=\"padding:12px 16px;text-align:left;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">M\u00E1quina / Horas</th>"+
      "<th style=\"padding:12px 16px;text-align:right;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">Valor</th>"+
      "<th style=\"padding:12px 16px;text-align:center;font-size:12px;color:var(--txt-s);font-weight:600;text-transform:uppercase\">A\u00E7\u00F5es</th>"+
      "</tr></thead><tbody id=\"lanc-tbody\"></tbody></table></div></div>";
    renderRows();
  }

  function renderRows(){
    const tbody = document.getElementById("lanc-tbody");
    if(!tbody) return;
    const items = filtrados();
    if(!items.length){
      tbody.innerHTML = "<tr><td colspan=\"7\" style=\"text-align:center;padding:40px;color:var(--txt-s)\">Nenhum lan\u00E7amento encontrado</td></tr>";
      return;
    }
    tbody.innerHTML = items.map(function(l){
      var faz = _fazendas.find(function(f){return f.id===l.fazenda_id;});
      var tal = _talhoes.find(function(t){return t.id===l.talhao_id;});
      var maq = _maquinas.find(function(m){return m.id===l.maquina_id;});
      var ins = _insumos.find(function(i){return i.id===l.insumo_id;});
      var cor = l.tipo==="despesa" ? "#ef4444" : "#22c55e";
      var badge = l.tipo==="despesa"
        ? "<span style=\"background:#fef2f2;color:#ef4444;padding:2px 8px;border-radius:9px;font-size:11px;font-weight:600\">Despesa</span>"
        : "<span style=\"background:#f0fdf4;color:#22c55e;padding:2px 8px;border-radius:9px;font-size:11px;font-weight:600\">Receita</span>";
      var dataFmt = l.data_lancamento ? l.data_lancamento.substring(0,10) : "-";
      var horasInfo = (maq && l.unidade==="h" && l.quantidade)
        ? "<div style=\"font-size:11px;color:#f59e0b\">"+fmtN(l.quantidade,1)+" h</div>" : "";
      var maqInfo = maq
        ? ("<div style=\"font-size:12px;color:var(--txt)\">"+esc(maq.nome)+"</div>"+horasInfo)
        : "<span style=\"color:var(--txt-s);font-size:12px\">-</span>";
      var insTag = ins ? "<br><span style=\"font-size:11px;color:var(--txt-s)\">Insumo: "+esc(ins.nome)+"</span>" : "";
      var nfTag = l.nota_fiscal ? "<br><span style=\"font-size:11px;color:var(--txt-s)\">NF: "+esc(l.nota_fiscal)+"</span>" : "";
      var descInfo = esc(l.descricao||"-")+insTag+nfTag;
      var fazNome = esc(faz?faz.nome:"");
      var talTag = tal ? "<br><span style=\"font-size:11px\">&nbsp;"+esc(tal.nome)+"</span>" : "";
      return "<tr style=\"border-top:1px solid var(--brd)\">"+
        "<td style=\"padding:12px 16px;font-size:13px;color:var(--txt-s)\">"+dataFmt+"</td>"+
        "<td style=\"padding:12px 16px\">"+badge+"</td>"+
        "<td style=\"padding:12px 16px;font-size:13px;max-width:250px\">"+descInfo+"</td>"+
        "<td style=\"padding:12px 16px;font-size:13px;color:var(--txt-s)\">"+fazNome+talTag+"</td>"+
        "<td style=\"padding:12px 16px\">"+maqInfo+"</td>"+
        "<td style=\"padding:12px 16px;text-align:right;font-weight:700;color:"+cor+";font-size:14px\">"+fmt(l.custo_total)+"</td>"+
        "<td style=\"padding:12px 16px;text-align:center\">"+
        "<button onclick=\"window._lanc_abrirForm(JSON.parse(decodeURIComponent(this.dataset.rec)))\" data-rec=\""+encodeURIComponent(JSON.stringify(l))+"\" style=\"background:none;border:1px solid var(--brd);border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;margin-right:4px\">\u270F\uFE0F</button>"+
        "<button data-id=\""+l.id+"\" onclick=\"window._lanc_del(this)\" style=\"background:none;border:1px solid #fca5a5;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:12px;color:#ef4444\">\uD83D\uDDD1</button>"+
        "</td></tr>";
    }).join("");
  }

  window._lanc_abrirForm = function(l){
    const isNovo = !l;
    const tipoAtual = l ? l.tipo : "despesa";
    const temMaq = !!(l && l.maquina_id);
    const horasVal = (temMaq && l.unidade==="h") ? (l.quantidade||"") : "";
    const maqDisplay = temMaq ? "block" : "none";
    const fazAtual = l ? l.fazenda_id : "";

    // Build option lists - filter by fazenda if editing
    const fazOpts = _fazendas.map(function(f){
      return "<option value=\""+f.id+"\""+((l&&l.fazenda_id===f.id)?" selected":"")+">"+esc(f.nome)+"</option>";
    }).join("");
    const safsDoFaz = fazAtual ? _safras.filter(function(s){return s.fazenda_id===fazAtual;}) : _safras;
    const safraOpts = safsDoFaz.map(function(s){
      return "<option value=\""+s.id+"\""+((l&&l.safra_id===s.id)?" selected":"")+">"+esc(s.nome)+"</option>";
    }).join("");
    const talsDoFaz = fazAtual ? _talhoes.filter(function(t){return t.fazenda_id===fazAtual;}) : _talhoes;
    const talhaoOpts = talsDoFaz.map(function(t){
      return "<option value=\""+t.id+"\""+((l&&l.talhao_id===t.id)?" selected":"")+">"+esc(t.nome)+"</option>";
    }).join("");
    const opsDoFaz = fazAtual ? _operadores.filter(function(o){return o.fazenda_id===fazAtual;}) : _operadores;
    const opOpts = opsDoFaz.map(function(o){
      return "<option value=\""+o.id+"\""+((l&&l.operador_id===o.id)?" selected":"")+">"+esc(o.nome)+"</option>";
    }).join("");
    const maqsDoFaz = fazAtual ? _maquinas.filter(function(m){return m.fazenda_id===fazAtual;}) : _maquinas;
    const maqOpts = maqsDoFaz.map(function(m){
      return "<option value=\""+m.id+"\" data-custo=\""+( m.custo_hora||0)+"\""+((l&&l.maquina_id===m.id)?" selected":"")+">"+esc(m.nome)+"</option>";
    }).join("");
    const insumoOpts = _buildInsumoOpts(_insumos, false);
    const unidades = ["kg","L","g","mL","sc","un","cx","t","h","d"];
    const unidOpts = unidades.map(function(u){
      var sel = (l&&!l.maquina_id&&l.unidade===u) ? " selected" : "";
      return "<option value=\""+u+"\""+sel+">"+u+"</option>";
    }).join("");

    showModal(isNovo ? "+ Novo Lan\u00E7amento" : "Editar Lan\u00E7amento",
      "<div class=\"form-grid\" style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">"+
      "<div class=\"form-field\"><label>Tipo *</label>"+
      "<select id=\"lanc_tipo\" onchange=\"window._lanc_onTipoChange(this.value)\">"+
      "<option value=\"despesa\""+((tipoAtual==="despesa")?" selected":"")+">Despesa</option>"+
      "<option value=\"receita\""+((tipoAtual==="receita")?" selected":"")+">Receita</option>"+
      "</select></div>"+
      "<div class=\"form-field\"><label>Data *</label>"+
      "<input id=\"lanc_data\" type=\"date\" value=\""+((l&&l.data_lancamento)?l.data_lancamento.substring(0,10):today())+"\"/></div>"+
      "<div class=\"form-field\"><label>Fazenda *</label>"+
      "<select id=\"lanc_faz\" onchange=\"window._lanc_onFazForm(this.value)\"><option value=\"\">Selecione...</option>"+fazOpts+"</select></div>"+
      "<div class=\"form-field\"><label>Safra</label>"+
      "<select id=\"lanc_safra\"><option value=\"\">Nenhuma</option>"+safraOpts+"</select></div>"+
      "<div class=\"form-field\"><label>Talh\u00E3o</label>"+
      "<select id=\"lanc_talhao\" onchange=\"window._lanc_onTalhaoChange(this.value)\"><option value=\"\">Nenhum</option>"+talhaoOpts+"</select></div>"+
      "<div class=\"form-field\"><label>Operador</label>"+
      "<select id=\"lanc_op\"><option value=\"\">Nenhum</option>"+opOpts+"</select></div>"+
      "<div class=\"form-field\" id=\"lanc_insumo_wrap\"><label>Insumo</label>"+
      "<div id=\"lanc_cert_warn\" style=\"display:none;margin-bottom:6px;padding:6px 10px;background:#fef3c7;border:1px solid #f59e0b;border-radius:6px;font-size:11px;color:#92400e\">&#9888; Certifica\u00E7\u00E3o ativa: apenas insumos permitidos</div>"+
      "<select id=\"lanc_insumo\" onchange=\"window._lanc_onInsumoChange(this.value)\"><option value=\"\">Nenhum</option>"+insumoOpts+"</select></div>"+
      "<div class=\"form-field\"><label>M\u00E1quina</label>"+
      "<select id=\"lanc_maq\" onchange=\"window._lanc_onMaqChange(this.value)\"><option value=\"\">Nenhuma</option>"+maqOpts+"</select></div>"+
      // HORAS TRABALHADAS - dynamic field, shown when machine selected
      "<div class=\"form-field\" id=\"lanc_horas_wrap\" style=\"display:"+maqDisplay+";grid-column:span 2;background:#fffbeb;border:1px solid #f59e0b;border-radius:8px;padding:12px;margin-bottom:4px\">"+
      "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">"+
      "<div><label style=\"color:#92400e;font-weight:600\">\u23F1\uFE0F Horas Trabalhadas *</label>"+
      "<input id=\"lanc_horas\" type=\"number\" step=\"0.5\" min=\"0\" placeholder=\"Ex: 4.5\" value=\""+horasVal+"\" oninput=\"window._lanc_calcCustoMaq()\"/></div>"+
      "<div><label style=\"color:#92400e;font-weight:600\">R$/Hora (custo da m\u00E1quina)</label>"+
      "<input id=\"lanc_custo_hora\" type=\"number\" step=\"0.01\" min=\"0\" placeholder=\"Ex: 180.00\" oninput=\"window._lanc_calcCustoMaq()\"/>"+
      "<small style=\"color:#92400e;font-size:11px\">Preencha para calcular custo total automaticamente</small></div>"+
      "</div></div>"+
      // Quantidade + Unidade (hidden when machine selected, uses horas instead)
      "<div class=\"form-field\" id=\"lanc_qtd_wrap\" style=\"display:"+(temMaq?"none":"block")+"\"><label>Quantidade</label>"+
      "<input id=\"lanc_qtd\" type=\"number\" step=\"0.01\" min=\"0\" value=\""+((l&&!l.maquina_id&&l.quantidade)||"")+"\"/></div>"+
      "<div class=\"form-field\" id=\"lanc_unid_wrap\" style=\"display:"+(temMaq?"none":"block")+"\"><label>Unidade</label>"+
      "<select id=\"lanc_unid\"><option value=\"\">Selecione...</option>"+unidOpts+"</select></div>"+
      "<div class=\"form-field\"><label>Custo Total (R$) *</label>"+
      "<input id=\"lanc_custo\" type=\"number\" step=\"0.01\" min=\"0\" value=\""+((l&&l.custo_total)||"")+"\"/></div>"+
      "<div class=\"form-field\"><label>Nota Fiscal</label>"+
      "<input id=\"lanc_nf\" value=\""+esc((l&&l.nota_fiscal)||"")+"\"/></div>"+
      "<div class=\"form-field\" style=\"grid-column:1/-1\"><label>Descri\u00E7\u00E3o *</label>"+
      "<input id=\"lanc_desc\" value=\""+esc((l&&l.descricao)||"")+"\"/></div>"+
      "<div class=\"form-field\" style=\"grid-column:1/-1\"><label>Observa\u00E7\u00F5es</label>"+
      "<textarea id=\"lanc_obs\" rows=\"2\" style=\"width:100%;resize:vertical;padding:8px;border:1px solid var(--brd);border-radius:var(--r)\">"+esc((l&&l.observacoes)||"")+"</textarea></div>"+
      "</div>",
      async function(){
        const tipo   = document.getElementById("lanc_tipo").value;
        const data   = document.getElementById("lanc_data").value;
        const fazId  = document.getElementById("lanc_faz").value;
        const safId  = document.getElementById("lanc_safra").value || null;
        const talId  = document.getElementById("lanc_talhao").value || null;
        const opId   = document.getElementById("lanc_op").value || null;
        const insId  = document.getElementById("lanc_insumo").value || null;
        const maqId  = document.getElementById("lanc_maq").value || null;
        const nf     = document.getElementById("lanc_nf").value.trim() || null;
        const desc   = document.getElementById("lanc_desc").value.trim();
        const obs    = document.getElementById("lanc_obs").value.trim() || null;
        const custo  = parseFloat(document.getElementById("lanc_custo").value);
        // If machine selected: horas = quantidade, unidade = h
        var qtd, unid;
        if(maqId){
          qtd = parseFloat(document.getElementById("lanc_horas").value) || null;
          unid = "h";
        } else {
          qtd = parseFloat(document.getElementById("lanc_qtd").value) || null;
          unid = document.getElementById("lanc_unid").value || null;
        }
        if(!data) { toast("Informe a data","bad"); return; }
        if(!custo || custo <= 0) { toast("Informe o custo total","bad"); return; }
        if(!fazId) { toast("Selecione a fazenda","bad"); return; }
        if(!desc)  { toast("Informe a descri\u00E7\u00E3o","bad"); return; }
        if(maqId && (!qtd || qtd <= 0)) { toast("Informe as horas trabalhadas","bad"); return; }
        const payload = { tipo: tipo, data_lancamento: data, fazenda_id: fazId, safra_id: safId,
          talhao_id: talId, operador_id: opId, insumo_id: insId, maquina_id: maqId,
          quantidade: qtd, unidade: unid, custo_total: custo,
          nota_fiscal: nf, descricao: desc, observacoes: obs };
        const { error } = isNovo
          ? await sb.from("lancamentos").insert(payload)
          : await sb.from("lancamentos").update(payload).eq("id", l.id);
        if(error) { toast("Erro: "+error.message,"bad"); return; }
        toast(isNovo ? "Lan\u00E7amento registrado!" : "Lan\u00E7amento atualizado!","ok");
        closeModal(); render();
      }
    );
    setTimeout(function(){ var e=document.getElementById("lanc_desc"); if(e) e.focus(); }, 100);
  };

  // When machine selected: show horas section
  window._lanc_onMaqChange = function(maqId){
    var hw  = document.getElementById("lanc_horas_wrap");
    var qw  = document.getElementById("lanc_qtd_wrap");
    var uw  = document.getElementById("lanc_unid_wrap");
    if(!hw) return;
    if(!maqId){
      hw.style.display="none"; qw.style.display="block"; uw.style.display="block";
      return;
    }
    hw.style.display="block"; qw.style.display="none"; uw.style.display="none";
    // Auto-fill custo/hora from machine data attribute
    var maqSel2 = document.getElementById("lanc_maq");
    var selOpt = maqSel2 && maqSel2.querySelector("option[value=\""+maqId+"\"]");
    if(selOpt) {
      var custoMaq = selOpt.getAttribute("data-custo");
      if(custoMaq && parseFloat(custoMaq) > 0) {
        var chIn = document.getElementById("lanc_custo_hora");
        if(chIn) chIn.value = custoMaq;
      }
    }
    // Set tipo to despesa
    var ts = document.getElementById("lanc_tipo"); if(ts) ts.value="despesa";
    // Focus horas field
    setTimeout(function(){ var h=document.getElementById("lanc_horas"); if(h) h.focus(); }, 50);
  };

  // Auto-calculate custo total from horas * custo_hora
  window._lanc_calcCustoMaq = function(){
    var horas  = parseFloat(document.getElementById("lanc_horas").value) || 0;
    var custoH = parseFloat(document.getElementById("lanc_custo_hora").value) || 0;
    if(horas > 0 && custoH > 0){
      var custoInput = document.getElementById("lanc_custo");
      if(custoInput) custoInput.value = (horas * custoH).toFixed(2);
    }
  };

  // Auto-fill insumo unit + calculate cost
  window._lanc_onInsumoChange = function(insId){
    if(!insId) return;
    var ins = _insumos.find(function(i){return i.id===insId;});
    if(!ins) return;
    var unidSel = document.getElementById("lanc_unid");
    if(unidSel && ins.unidade) unidSel.value = ins.unidade;
    var qtdInput = document.getElementById("lanc_qtd");
    var custoInput = document.getElementById("lanc_custo");
    var qtd = qtdInput ? parseFloat(qtdInput.value) : 0;
    if(qtd > 0 && ins.preco_unitario > 0 && custoInput)
      custoInput.value = (qtd * ins.preco_unitario).toFixed(2);
  };

  // Filter form dropdowns when fazenda changes
  window._lanc_onFazForm = function(fazId){
    var safSel=document.getElementById("lanc_safra");
    var talSel=document.getElementById("lanc_talhao");
    var opSel =document.getElementById("lanc_op");
    var maqSel=document.getElementById("lanc_maq");
    if(safSel){
      var safs = fazId ? _safras.filter(function(s){return s.fazenda_id===fazId;}) : _safras;
      safSel.innerHTML = "<option value=\"\">Nenhuma</option>"+safs.map(function(s){return "<option value=\""+s.id+"\">"+esc(s.nome)+"</option>";}).join("");
      var abertos = safs.filter(function(s){return s.status==="aberta";});
      if(abertos.length===1) safSel.value = abertos[0].id;
    }
    if(talSel){
      var tals = fazId ? _talhoes.filter(function(t){return t.fazenda_id===fazId;}) : _talhoes;
      talSel.innerHTML = "<option value=\"\">Nenhum</option>"+tals.map(function(t){return "<option value=\""+t.id+"\">"+esc(t.nome)+"</option>";}).join("");
    }
    if(opSel){
      var ops = fazId ? _operadores.filter(function(o){return o.fazenda_id===fazId;}) : _operadores;
      opSel.innerHTML = "<option value=\"\">Nenhum</option>"+ops.map(function(o){return "<option value=\""+o.id+"\">"+esc(o.nome)+"</option>";}).join("");
    }
    if(maqSel){
      var maqs = fazId ? _maquinas.filter(function(m){return m.fazenda_id===fazId;}) : _maquinas;
      maqSel.innerHTML = "<option value=\"\">Nenhuma</option>"+maqs.map(function(m){return "<option value=\""+m.id+"\" data-custo=\""+( m.custo_hora||0)+"\">"+ esc(m.nome)+"</option>";}).join("");
    }
  };

  window._lanc_onTalhaoChange = function(talId){
    var tal = _talhoes.find(function(t){return t.id===talId;});
    var filterCert = !!(tal && tal.certificacao_id);
    var warn = document.getElementById("lanc_cert_warn");
    if(warn) warn.style.display = filterCert ? "block" : "none";
    var insSel = document.getElementById("lanc_insumo");
    if(insSel) insSel.innerHTML = "<option value=\"\">Nenhum</option>"+_buildInsumoOpts(_insumos, filterCert);
  };

  window._lanc_onTipoChange = function(tipo){
    if(tipo==="receita"){
      var ms=document.getElementById("lanc_maq"); if(ms) ms.value="";
      var hw=document.getElementById("lanc_horas_wrap"); if(hw) hw.style.display="none";
      var qw=document.getElementById("lanc_qtd_wrap"); if(qw) qw.style.display="block";
      var uw=document.getElementById("lanc_unid_wrap"); if(uw) uw.style.display="block";
    }
  };

  window._lanc_del = function(btn){
    var id = btn.dataset.id;
    showConfirm("Excluir este lan\u00E7amento?",
      async function(){
        const { error } = await sb.from("lancamentos").delete().eq("id", id);
        if(error) { toast("Erro: "+error.message,"bad"); return; }
        toast("Lan\u00E7amento removido","ok"); render();
      }
    );
  };

  function _buildInsumoOpts(insumos, filterCert){
    return insumos
      .filter(function(i){ return !filterCert || i.certificacao_permitida !== false; })
      .map(function(i){ return "<option value=\""+i.id+"\">"+esc(i.nome)+"</option>"; })
      .join("");
  }

  async function render(){
    el.innerHTML = "<div style=\"padding:40px;text-align:center;color:var(--txt-s)\">\u23F3 Carregando...</div>";
    await loadData();
    renderUI();
  }

  await render();
};
