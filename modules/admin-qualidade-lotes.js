window.module_qualidade_lotes = async function() {
  var cont = document.getElementById("mainContent");
  if (!cont) return;
  cont.innerHTML = "<div style=\"padding:20px;text-align:center;color:#888\">Carregando Qualidade de Lotes...</div>";
  var fRes = await sb.from("fazendas").select("id,nome").eq("ativo",true).order("nome");
  var sRes = await sb.from("safras").select("id,nome,cultura,ano_agricola,fazenda_id").order("nome");
  var tRes = await sb.from("talhoes").select("id,nome,fazenda_id").order("nome");
  var aRes = await sb.from("qualidade_registro").select("*,fazendas(nome),safras(nome,cultura,ano_agricola)").order("data_registro",{ascending:false});
  var fazendas = fRes.data || [];
  var safras   = sRes.data || [];
  var talhoes  = tRes.data || [];
  var análises = aRes.error ? [] : (aRes.data || []);
  function getMeta(a, key) { var d=a.dados_qualidade||{}; return d["_"+key]||""; }
  function fmtDate(d) { if(!d) return ""; var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
  var cultMap = {cafe:"Cafe",soja:"Soja",milho:"Milho",cana:"Cana"};
  var culturaParams = {
    cafe: [
      {k:"umidade",l:"Umidade (%)",tipo:"number",un:"%",alertaAcima:12},
      {k:"peneira",l:"Peneira",tipo:"text",un:"",alertaAcima:0},
      {k:"bebida",l:"Prova de Bebida (pts)",tipo:"number",un:"pts",alertaAbaixo:80},
      {k:"defeitos",l:"Defeitos (d/300g)",tipo:"number",un:"d",alertaAcima:360},
      {k:"tipo",l:"Tipo",tipo:"text",un:"",alertaAcima:0},
      {k:"catacao",l:"Catacao (%)",tipo:"number",un:"%",alertaAcima:5},
      {k:"impureza",l:"Impurezas (%)",tipo:"number",un:"%",alertaAcima:1},
      {k:"sensorial",l:"Pontuacao Sensorial",tipo:"number",un:"pts",alertaAbaixo:80},
      {k:"classificacao",l:"Classificacao",tipo:"text",un:"",alertaAcima:0},
      {k:"obs_tecnica",l:"Obs. Tecnicas",tipo:"textarea",un:"",alertaAcima:0}
    ],
    soja: [
      {k:"umidade",l:"Umidade (%)",tipo:"number",un:"%",alertaAcima:14},
      {k:"impureza",l:"Impurezas (%)",tipo:"number",un:"%",alertaAcima:1},
      {k:"avariados",l:"Grãos Avariados (%)",tipo:"number",un:"%",alertaAcima:8},
      {k:"quebrados",l:"Grãos Quebrados (%)",tipo:"number",un:"%",alertaAcima:30},
      {k:"verdes",l:"Grãos Verdes (%)",tipo:"number",un:"%",alertaAcima:8},
      {k:"ardidos",l:"Ardidos (%)",tipo:"number",un:"%",alertaAcima:1},
      {k:"proteina",l:"Proteina (%)",tipo:"number",un:"%",alertaAbaixo:36},
      {k:"oleo",l:"Oleo (%)",tipo:"number",un:"%",alertaAbaixo:18},
      {k:"classificacao",l:"Classificacao",tipo:"text",un:"",alertaAcima:0}
    ],
    milho: [
      {k:"umidade",l:"Umidade (%)",tipo:"number",un:"%",alertaAcima:14},
      {k:"impureza",l:"Impurezas (%)",tipo:"number",un:"%",alertaAcima:1},
      {k:"ardidos",l:"Grãos Ardidos (%)",tipo:"number",un:"%",alertaAcima:6},
      {k:"quebrados",l:"Grãos Quebrados (%)",tipo:"number",un:"%",alertaAcima:6},
      {k:"carunchados",l:"Grãos Carunchados (%)",tipo:"number",un:"%",alertaAcima:2},
      {k:"micotoxinas",l:"Micotoxinas (ppb)",tipo:"number",un:"ppb",alertaAcima:500},
      {k:"ph",l:"Peso Hectolitrico (kg)",tipo:"number",un:"kg",alertaAbaixo:72},
      {k:"classificacao",l:"Classificacao",tipo:"text",un:"",alertaAcima:0}
    ],
    cana: [
      {k:"atr",l:"ATR (kg/t)",tipo:"number",un:"kg/t",alertaAbaixo:120},
      {k:"brix",l:"Brix (%)",tipo:"number",un:"%",alertaAbaixo:16},
      {k:"pol",l:"Pol (%)",tipo:"number",un:"%",alertaAbaixo:14},
      {k:"pureza",l:"Pureza (%)",tipo:"number",un:"%",alertaAbaixo:85},
      {k:"fibra",l:"Fibra (%)",tipo:"number",un:"%",alertaAcima:14},
      {k:"imp_vegetal",l:"Impureza Vegetal (%)",tipo:"number",un:"%",alertaAcima:5},
      {k:"imp_mineral",l:"Impureza Mineral (%)",tipo:"number",un:"%",alertaAcima:1},
      {k:"ton_cana",l:"Tonelada de Cana (t)",tipo:"number",un:"t",alertaAcima:0},
      {k:"qual_ind",l:"Qualidade Industrial",tipo:"text",un:"",alertaAcima:0}
    ]
  };
  var tiposAnálise = ["Recebimento","Armazenagem","Pre-Venda","Venda","Entrega","Beneficiamento","Auditoria","Produção"];
  var culturaLabel = {cafe:"Cafe",soja:"Soja",milho:"Milho",cana:"Cana-de-Acucar"};
  var culturaIcon  = {cafe:"&#9749;",soja:"&#127807;",milho:"&#127806;",cana:"&#127803;"};
  var estado = {modo:"lista",análise:null,filtroFaz:"",filtroSaf:"",filtroCult:"",filtroTipo:"",comparando:[]};
  function render() {
    if(estado.modo==="lista") renderLista();
    else if(estado.modo==="form") renderForm(estado.análise);
    else if(estado.modo==="detalhe") renderDetalhe(estado.análise);
    else if(estado.modo==="comparar") renderComparar();
  }
  function buildOptFaz(sel) {
    return fazendas.map(function(f){
      return "<option value=\""+f.id+"\"" +(sel===f.id?" selected":"") +">"+f.nome+"</option>";
    }).join("");
  }
  function buildOptSaf(fazId, sel) {
    var list = fazId ? safras.filter(function(s){return s.fazenda_id===fazId;}) : safras;
    return list.map(function(s){
      return "<option value=\""+s.id+"\"" +(sel===s.id?" selected":"") +">"+s.nome+" ("+s.ano_agricola+")</option>";
    }).join("");
  }
  function buildOptTal(fazId, sel) {
    var list = fazId ? talhoes.filter(function(t){return t.fazenda_id===fazId;}) : talhoes;
    return list.map(function(t){
      return "<option value=\""+t.id+"\"" +(sel===t.id?" selected":"") +">"+t.nome+"</option>";
    }).join("");
  }
  function getCultFromSafra(safId) {
    var s = safras.find(function(x){return x.id===safId;});
    return s ? s.cultura : "";
  }
  function buildParamFields(cult, dadosQ) {
    var params = culturaParams[cult] || [];
    return params.map(function(p){
      var val = dadosQ[p.k]!==undefined ? dadosQ[p.k] : "";
      var inp = p.tipo==="textarea"
        ? "<textarea id=\"qp_"+p.k+"\" rows=\"2\" style=\"width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px\">"+val+"</textarea>"
        : "<input type=\""+p.tipo+"\" id=\"qp_"+p.k+"\" value=\""+val+"\"" +(p.tipo==="number"?" step=\"0.01\"":"") +" style=\"width:100%;padding:6px;border:1px solid #ddd;border-radius:4px;font-size:13px\">";
      return "<div style=\"margin-bottom:10px\">"
        +"<label style=\"display:block;font-size:11px;color:#555;margin-bottom:3px;font-weight:600\">"+p.l+"</label>"
        +inp+"</div>";
    }).join("");
  }
  function renderLista() {
    var filtered = análises.filter(function(a) {
      if(estado.filtroFaz&&a.fazenda_id!==estado.filtroFaz) return false;
      if(estado.filtroSaf&&a.safra_id!==estado.filtroSaf) return false;
      if(estado.filtroCult&&a.cultura!==estado.filtroCult) return false;
      if(estado.filtroTipo&&getMeta(a,"tipo_análise")!==estado.filtroTipo) return false;
      return true;
    });
    var optFaz="<option value=\"\">Todas Fazendas</option>"+buildOptFaz("");
    var optSaf="<option value=\"\">Todas Safras</option>"+buildOptSaf("","");
    var optCult="<option value=\"\">Todas Culturas</option><option value=\"cafe\">Cafe</option><option value=\"soja\">Soja</option><option value=\"milho\">Milho</option><option value=\"cana\">Cana</option>";
    var optTipo="<option value=\"\">Todos Tipos</option>"+tiposAnálise.map(function(t){return "<option value=\""+t+"\">"+t+"</option>";}).join("");
    var rows = filtered.length===0
      ? "<tr><td colspan=\"8\" style=\"text-align:center;color:#888;padding:30px\">Nenhuma análise. Clique em Nova Análise.</td></tr>"
      : filtered.map(function(a){
          var cult=a.cultura||"";
          var fNome=a.fazendas?a.fazendas.nome:"-";
          var sNome=a.safras?a.safras.nome:"-";
          var tipoAn=getMeta(a,"tipo_análise")||"-";
          var resp=getMeta(a,"responsavel")||"-";
          var isRef=getMeta(a,"referencia_lote")===true||getMeta(a,"referencia_lote")==="true";
          var badge=isRef?" <span style=\"background:#7CB342;color:#fff;border-radius:4px;padding:1px 5px;font-size:10px\">REF</span>":"";
          var cb="<input type=\"checkbox\" "+(estado.comparando.indexOf(a.id)!==-1?"checked":"")+" onchange=\"window._qlToggleComp('"+a.id+"')\"> ";
          return "<tr>"
            +"<td style=\"padding:8px 6px\">"+cb+"</td>"
            +"<td style=\"padding:8px 6px\">"+(culturaIcon[cult]||"")+" "+(culturaLabel[cult]||cult)+badge+"</td>"
            +"<td style=\"padding:8px 6px\">"+fNome+"</td>"
            +"<td style=\"padding:8px 6px\">"+sNome+"</td>"
            +"<td style=\"padding:8px 6px\">"+tipoAn+"</td>"
            +"<td style=\"padding:8px 6px\">"+fmtDate(a.data_registro)+"</td>"
            +"<td style=\"padding:8px 6px\">"+resp+"</td>"
            +"<td style=\"padding:8px 6px;white-space:nowrap\"><button onclick=\"window._qlVer('"+a.id+"')\">Ver</button> <button onclick=\"window._qlDel('"+a.id+"')\">&#128465;</button></td>"
            +"</tr>";
        }).join("");
    cont.innerHTML="<div style=\"padding:20px\">"
      +"<div style=\"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px\">"
        +"<div><h2 style=\"margin:0;color:#1A2E1A;font-size:22px\">&#128203; Qualidade de Lotes</h2>"
        +"<p style=\"margin:4px 0 0;color:#666;font-size:13px\">Análise e acompanhe qualidade por lote | Cafe - Soja - Milho - Cana</p></div>"
        +"<div style=\"display:flex;gap:8px\">"
          +"<button onclick=\"window._qlComparar()\" style=\"background:#1976D2;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px\">&#128201; Comparar</button>"
          +"<button onclick=\"window._qlNovo()\" style=\"background:#7CB342;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer;font-size:13px\">+ Nova Análise</button>"
        +"</div></div>"
      +"<div style=\"display:flex;gap:8px;flex-wrap:wrap;background:#f5f5f5;padding:12px;border-radius:8px;margin-bottom:16px\">"
        +"<select id=\"flFaz\" onchange=\"window._qlFiltro()\" style=\"padding:6px;border:1px solid #ddd;border-radius:4px\"><option value=\"\">Todas Fazendas</option>"+buildOptFaz("")+"</select>"
        +"<select id=\"flSaf\" onchange=\"window._qlFiltro()\" style=\"padding:6px;border:1px solid #ddd;border-radius:4px\"><option value=\"\">Todas Safras</option>"+buildOptSaf("","")+"</select>"
        +"<select id=\"flCult\" onchange=\"window._qlFiltro()\" style=\"padding:6px;border:1px solid #ddd;border-radius:4px\">"+optCult+"</select>"
        +"<select id=\"flTipo\" onchange=\"window._qlFiltro()\" style=\"padding:6px;border:1px solid #ddd;border-radius:4px\">"+optTipo+"</select>"
        +"<span style=\"padding:6px;color:#888;font-size:12px\">"+filtered.length+" registro(s)</span>"
      +"</div>"
      +"<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\">"
        +"<thead><tr style=\"background:#1A2E1A;color:#fff\">"
          +"<th style=\"padding:10px 6px;text-align:left;width:30px\">&#10003;</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Cultura</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Fazenda</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Safra</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Tipo</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Data</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Responsavel</th>"
          +"<th style=\"padding:10px 6px;text-align:left\">Acoes</th>"
        +"</tr></thead><tbody>"+rows+"</tbody></table></div></div>";
    var sf=document.getElementById("flFaz"); if(sf&&estado.filtroFaz)sf.value=estado.filtroFaz;
    var ss=document.getElementById("flSaf"); if(ss&&estado.filtroSaf)ss.value=estado.filtroSaf;
    var sc=document.getElementById("flCult"); if(sc&&estado.filtroCult)sc.value=estado.filtroCult;
    var st=document.getElementById("flTipo"); if(st&&estado.filtroTipo)st.value=estado.filtroTipo;
  }
  function renderForm(a) {
    a = a || {};
    var cultAtual = a.cultura || "cafe";
    var dadosQ = a.dados_qualidade || {};
    var fazId = a.fazenda_id || "";
    var safId = a.safra_id || "";
    var talId = dadosQ["_talhao_id"] || "";
    var tipoAnSel = dadosQ["_tipo_análise"] || "";
    var optTipoF = tiposAnálise.map(function(t){return "<option value=\""+t+"\"" +(tipoAnSel===t?" selected":"") +">"+t+"</option>";}).join("");
    var pf = buildParamFields(cultAtual, dadosQ);
    var isRef = dadosQ["_referencia_lote"]===true||dadosQ["_referencia_lote"]==="true";
    // Cultura label para exibicao
    var cultLabel = culturaLabel[cultAtual] || cultAtual;
    var cultIcon  = culturaIcon[cultAtual] || "";

    cont.innerHTML = "<div style=\"max-width:900px;margin:0 auto;padding:20px\">"
      +"<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:20px\">"
        +"<button onclick=\"window._qlVoltar()\" style=\"background:#eee;border:none;padding:8px 14px;border-radius:6px;cursor:pointer\">&#8592; Voltar</button>"
        +"<h2 style=\"margin:0;color:#1A2E1A\">"+(a.id?"Editar":"Nova")+" Análise de Qualidade</h2>"
      +"</div>"
      +"<div style=\"background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:24px\">"
        +"<h3 style=\"margin:0 0 14px;color:#1A2E1A;border-bottom:2px solid #7CB342;padding-bottom:6px\">Identificacao</h3>"
        +"<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:18px\">"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Fazenda *</label>"
            +"<select id=\"fFaz\" onchange=\"window._qlMudaFazenda()\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"><option value=\"\">Selecione a fazenda...</option>"+buildOptFaz(fazId)+"</select></div>"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Safra</label>"
            +"<select id=\"fSaf\" onchange=\"window._qlMudaSafra()\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"><option value=\"\">Selecione a safra...</option>"+buildOptSaf(fazId,safId)+"</select></div>"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Talhao</label>"
            +"<select id=\"fTal\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"><option value=\"\">Selecione o talhao...</option>"+buildOptTal(fazId,talId)+"</select></div>"
          +"<div id=\"culturaDisplay\">"
            +"<label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Cultura *</label>"
            +"<div id=\"culturaBox\" style=\"padding:8px;border:1px solid #ddd;border-radius:4px;background:#f9f9f9;font-size:14px\">"+( cultAtual ? cultIcon+" "+cultLabel : "<span style=\"color:#999\">Selecione a safra para preencher</span>") +"</div>"
            +"<input type=\"hidden\" id=\"fCult\" value=\""+cultAtual+"\">"
          +"</div>"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Tipo de Análise *</label>"
            +"<select id=\"fTipo\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"><option value=\"\">Selecione...</option>"+optTipoF+"</select></div>"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Data da Análise *</label>"
            +"<input type=\"date\" id=\"fData\" value=\"" +(a.data_registro||"")+ "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"></div>"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Responsavel / Laboratorio</label>"
            +"<input type=\"text\" id=\"fResp\" value=\"" +(dadosQ["_responsavel"]||"")+ "\" placeholder=\"Nome ou laboratorio\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"></div>"
          +"<div><label style=\"display:block;font-size:11px;color:#555;font-weight:600;margin-bottom:3px\">Lote / Referencia</label>"
            +"<input type=\"text\" id=\"fLote\" value=\"" +(dadosQ["_lote_ref"]||"")+ "\" placeholder=\"Ex: L-2024-001\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px\"></div>"
          +"<div style=\"display:flex;align-items:center;gap:8px;padding-top:18px\">"
            +"<input type=\"checkbox\" id=\"fRef\"" +(isRef?" checked":"")+">"
            +"<label for=\"fRef\" style=\"font-size:13px;cursor:pointer\">Análise de referencia do lote</label>"
          +"</div>"
        +"</div>"
        +"<h3 style=\"margin:0 0 14px;color:#1A2E1A;border-bottom:2px solid #7CB342;padding-bottom:6px\">Parametros de Qualidade <span id=\"cultTag\" style=\"font-size:13px;font-weight:400;color:#7CB342\">"+(cultAtual?cultIcon+" "+cultLabel:"")+"</span></h3>"
        +"<div id=\"paramArea\" style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:16px\">" + (cultAtual?pf:"<p style=\"color:#999;grid-column:1/-1\">Selecione a safra para ver os parametros.</p>") + "</div>"
        +"<h3 style=\"margin:14px 0 10px;color:#1A2E1A;border-bottom:2px solid #7CB342;padding-bottom:6px\">Observacoes</h3>"
        +"<textarea id=\"fObs\" rows=\"3\" placeholder=\"Observacoes gerais...\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:4px;font-size:13px\">"+(a.observacoes||"")+"</textarea>"
        +"<div style=\"display:flex;gap:8px;justify-content:flex-end;margin-top:16px\">"
          +"<button onclick=\"window._qlVoltar()\" style=\"background:#eee;border:none;padding:10px 20px;border-radius:6px;cursor:pointer\">Cancelar</button>"
          +"<button onclick=\"window._qlSalvar()\" style=\"background:#7CB342;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-weight:600\">Salvar Análise</button>"
        +"</div>"
      +"</div></div>";
  }
  function renderDetalhe(a){
    if(!a){estado.modo="lista";render();return;}
    var cult=a.cultura||"cafe";
    var params=culturaParams[cult]||[];
    var dadosQ=a.dados_qualidade||{};
    var fNome=a.fazendas?a.fazendas.nome:"-";
    var sNome=a.safras?a.safras.nome:"-";
    var tipoAn=dadosQ["_tipo_análise"]||"-";
    var resp=dadosQ["_responsavel"]||"-";
    var loteRef=dadosQ["_lote_ref"]||"-";
    var isRef=dadosQ["_referencia_lote"]===true||dadosQ["_referencia_lote"]==="true";
    var alertas=[];
    var paramRows=params.map(function(p){
      var val=dadosQ[p.k];
      if(val===undefined||val===null||val==="") return "";
      var ah="";
      if(p.tipo==="number"){
        var v=parseFloat(val);
        if(!isNaN(v)){
          if(p.alertaAcima&&p.alertaAcima>0&&v>p.alertaAcima){ah="<span style=\"color:#e53935;font-size:10px\"> &#9888; Acima</span>";alertas.push(p.l+": "+v+" "+p.un+" (max:"+p.alertaAcima+")");}
          else if(p.alertaAbaixo&&p.alertaAbaixo>0&&v<p.alertaAbaixo){ah="<span style=\"color:#e53935;font-size:10px\"> &#9888; Abaixo</span>";alertas.push(p.l+": "+v+" "+p.un+" (min:"+p.alertaAbaixo+")");}
        }
      }
      return "<div style=\"background:#f9f9f9;border-radius:6px;padding:10px\">"
        +"<div style=\"font-size:11px;color:#888\">"+p.l+"</div>"
        +"<div style=\"font-size:17px;font-weight:700;color:#1A2E1A\">"+val+(p.un?" <small style=\"font-size:11px;font-weight:400\">"+p.un+"</small>":"")+ah+"</div>"
        +"</div>";
    }).join("");
    var alertaBlock=alertas.length>0
      ?"<div style=\"background:#fff3e0;border-left:4px solid #e53935;padding:12px;border-radius:6px;margin-bottom:14px\"><strong style=\"color:#e53935\">&#9888; Alertas</strong><ul style=\"margin:4px 0 0;padding-left:18px\"><li>"+alertas.join("</li><li>")+"</li></ul></div>"
      :"<div style=\"background:#e8f5e9;border-left:4px solid #7CB342;padding:10px;border-radius:6px;margin-bottom:14px\"><strong style=\"color:#388E3C\">&#10003; Todos os parametros dentro do padrao</strong></div>";
    var refBadge=isRef?" <span style=\"background:#7CB342;color:#fff;border-radius:4px;padding:2px 7px;font-size:11px\">REFERENCIA</span>":"";
    cont.innerHTML="<div style=\"max-width:900px;margin:0 auto;padding:20px\">"
      +"<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:18px\">"
        +"<button onclick=\"window._qlVoltar()\" style=\"background:#eee;border:none;padding:8px 14px;border-radius:6px;cursor:pointer\">&#8592; Voltar</button>"
        +"<h2 style=\"margin:0;color:#1A2E1A\">"+(culturaIcon[cult]||"")+" Análise de "+(culturaLabel[cult]||cult)+refBadge+"</h2>"
        +"<button onclick=\"window._qlEditar()\" style=\"background:#1976D2;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;margin-left:auto\">&#9998; Editar</button>"
      +"</div>"
      +"<div style=\"background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:24px\">"
        +"<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px\">"
          +"<div><small style=\"color:#888\">Fazenda</small><br><strong>"+fNome+"</strong></div>"
          +"<div><small style=\"color:#888\">Safra</small><br><strong>"+sNome+"</strong></div>"
          +"<div><small style=\"color:#888\">Tipo</small><br><strong>"+tipoAn+"</strong></div>"
          +"<div><small style=\"color:#888\">Data</small><br><strong>"+fmtDate(a.data_registro)+"</strong></div>"
          +"<div><small style=\"color:#888\">Responsavel</small><br><strong>"+resp+"</strong></div>"
          +"<div><small style=\"color:#888\">Lote/Ref</small><br><strong>"+loteRef+"</strong></div>"
        +"</div>"
        +alertaBlock
        +"<h3 style=\"margin:0 0 12px;color:#1A2E1A;border-bottom:2px solid #7CB342;padding-bottom:6px\">Parametros</h3>"
        +"<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px\">"+paramRows+"</div>"
        +(a.observacoes?"<div style=\"background:#f5f5f5;border-radius:6px;padding:12px\"><small style=\"color:#888\">Observacoes</small><p style=\"margin:4px 0 0\">"+a.observacoes+"</p></div>":"")
      +"</div></div>";
  }
  function renderComparar(){
    var sel=análises.filter(function(a){return estado.comparando.indexOf(a.id)!==-1;});
    if(sel.length<2){alert("Selecione pelo menos 2 análises.");estado.modo="lista";render();return;}
    var cult=sel[0].cultura||"cafe";
    var params=culturaParams[cult]||[];
    var hCols=sel.map(function(a){return "<th style=\"padding:8px;background:#1A2E1A;color:#fff\">"+fmtDate(a.data_registro)+"<br><small>"+(getMeta(a,"tipo_análise")||"")+"</small></th>";}).join("");
    var rows=params.map(function(p){
      var vals=sel.map(function(a){return(a.dados_qualidade||{})[p.k];});
      if(!vals.some(function(v){return v!==undefined&&v!=="";})) return "";
      return "<tr><td style=\"padding:8px;font-weight:600;background:#f5f5f5\">"+p.l+"</td>"
        +vals.map(function(v){return "<td style=\"padding:8px;text-align:center\">"+(v!==undefined&&v!==""?v+" "+p.un.trim():"-")+"</td>";}).join("")+"</tr>";
    }).join("");
    cont.innerHTML="<div style=\"max-width:1000px;margin:0 auto;padding:20px\">"
      +"<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:18px\">"
        +"<button onclick=\"window._qlVoltar()\" style=\"background:#eee;border:none;padding:8px 14px;border-radius:6px;cursor:pointer\">&#8592; Voltar</button>"
        +"<h2 style=\"margin:0;color:#1A2E1A\">&#128201; Comparativo de Análises</h2>"
      +"</div>"
      +"<div style=\"background:#fff;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,.1);padding:24px\">"
        +"<div style=\"overflow-x:auto\"><table style=\"width:100%;border-collapse:collapse;font-size:13px\">"
          +"<thead><tr><th style=\"padding:8px;background:#1A2E1A;color:#fff;text-align:left\">Parametro</th>"+hCols+"</tr></thead>"
          +"<tbody>"+rows+"</tbody></table></div>"
      +"</div></div>";
  }
  window._qlNovo=function(){estado.modo="form";estado.análise=null;renderForm(null);};
  window._qlVoltar=function(){estado.modo="lista";render();};
  window._qlEditar=function(){estado.modo="form";renderForm(estado.análise);};
  window._qlFiltro=function(){
    var sf=document.getElementById("flFaz");estado.filtroFaz=sf?sf.value:"";
    var ss=document.getElementById("flSaf");estado.filtroSaf=ss?ss.value:"";
    var sc=document.getElementById("flCult");estado.filtroCult=sc?sc.value:"";
    var st=document.getElementById("flTipo");estado.filtroTipo=st?st.value:"";
    renderLista();
  };
  window._qlVer=function(id){
    var a=análises.find(function(x){return x.id===id;});
    if(!a) return;
    estado.análise=a;estado.modo="detalhe";renderDetalhe(a);
  };
  window._qlToggleComp=function(id){
    var i=estado.comparando.indexOf(id);
    if(i===-1) estado.comparando.push(id); else estado.comparando.splice(i,1);
  };
  window._qlComparar=function(){
    if(estado.comparando.length<2){alert("Selecione pelo menos 2 análises.");return;}
    estado.modo="comparar";renderComparar();
  };
  // CASCADE: ao mudar fazenda -> filtra safras e talhoes
  window._qlMudaFazenda=function(){
    var fazEl=document.getElementById("fFaz");
    var fazId=fazEl?fazEl.value:"";
    // Atualiza safras filtradas por fazenda
    var safEl=document.getElementById("fSaf");
    if(safEl){
      safEl.innerHTML="<option value=\"\">Selecione a safra...</option>"+buildOptSaf(fazId,"");
    }
    // Atualiza talhoes filtrados por fazenda
    var talEl=document.getElementById("fTal");
    if(talEl){
      talEl.innerHTML="<option value=\"\">Selecione o talhao...</option>"+buildOptTal(fazId,"");
    }
    // Limpa cultura (depende da safra)
    var cultEl=document.getElementById("fCult");
    if(cultEl) cultEl.value="";
    var cultBox=document.getElementById("culturaBox");
    if(cultBox) cultBox.innerHTML="<span style=\"color:#999\">Selecione a safra para preencher</span>";
    var cultTag=document.getElementById("cultTag");
    if(cultTag) cultTag.innerHTML="";
    // Limpa parametros
    var paramArea=document.getElementById("paramArea");
    if(paramArea) paramArea.innerHTML="<p style=\"color:#999;grid-column:1/-1\">Selecione a safra para ver os parametros.</p>";
  };
  // CASCADE: ao mudar safra -> preenche cultura automaticamente
  window._qlMudaSafra=function(){
    var safEl=document.getElementById("fSaf");
    var safId=safEl?safEl.value:"";
    var cult=getCultFromSafra(safId);
    // Atualiza campo oculto de cultura
    var cultEl=document.getElementById("fCult");
    if(cultEl) cultEl.value=cult;
    // Atualiza display de cultura
    var icon=culturaIcon[cult]||"";
    var lbl=culturaLabel[cult]||cult||"Não identificado";
    var cultBox=document.getElementById("culturaBox");
    if(cultBox) cultBox.innerHTML = cult ? icon+" "+lbl : "<span style=\"color:#999\">Não identificado na safra</span>";
    var cultTag=document.getElementById("cultTag");
    if(cultTag) cultTag.innerHTML=cult?icon+" "+lbl:"";
    // Atualiza campos de parametros
    var paramArea=document.getElementById("paramArea");
    if(paramArea){
      if(cult) { paramArea.innerHTML=buildParamFields(cult,{}); }
      else { paramArea.innerHTML="<p style=\"color:#999;grid-column:1/-1\">A safra selecionada nao tem cultura definida.</p>"; }
    }
  };
  window._qlSalvar=async function(){
    var cult=(document.getElementById("fCult")||{}).value||"";
    var fazId=(document.getElementById("fFaz")||{}).value||null;
    var safId=(document.getElementById("fSaf")||{}).value||null;
    var talId=(document.getElementById("fTal")||{}).value||null;
    var tipoAn=(document.getElementById("fTipo")||{}).value||null;
    var data=(document.getElementById("fData")||{}).value||null;
    var resp=(document.getElementById("fResp")||{}).value||null;
    var loteR=(document.getElementById("fLote")||{}).value||null;
    var isRef=(document.getElementById("fRef")||{}).checked||false;
    var obs=(document.getElementById("fObs")||{}).value||null;
    if(!cult||!fazId||!data||!tipoAn){alert("Preencha: Fazenda, Tipo de Análise e Data. A Cultura e preenchida automaticamente pela Safra.");return;}
    var params=culturaParams[cult]||[];
    var dadosQ={};
    params.forEach(function(p){
      var el=document.getElementById("qp_"+p.k);
      if(el&&el.value!=="") dadosQ[p.k]=p.tipo==="number"?parseFloat(el.value):el.value;
    });
    dadosQ["_tipo_análise"]=tipoAn;
    dadosQ["_responsavel"]=resp;
    dadosQ["_lote_ref"]=loteR;
    dadosQ["_referencia_lote"]=isRef;
    if(talId) dadosQ["_talhao_id"]=talId;
    var payload={cultura:cult,fazenda_id:fazId,safra_id:safId||null,data_registro:data,dados_qualidade:dadosQ,observacoes:obs};
    var res;
    if(estado.análise&&estado.análise.id){
      res=await sb.from("qualidade_registro").update(payload).eq("id",estado.análise.id);
    } else {
      res=await sb.from("qualidade_registro").insert(payload);
    }
    if(res.error){alert("Erro: "+res.error.message);return;}
    var aRes2=await sb.from("qualidade_registro").select("*,fazendas(nome),safras(nome,cultura,ano_agricola)").order("data_registro",{ascending:false});
    análises=aRes2.error?[]:(aRes2.data||[]);
    estado.modo="lista";estado.análise=null;render();
  };
  window._qlDel=async function(id){
    if(!confirm("Excluir esta análise?")) return;
    var res=await sb.from("qualidade_registro").delete().eq("id",id);
    if(res.error){alert("Erro: "+res.error.message);return;}
    análises=análises.filter(function(a){return a.id!==id;});
    render();
  };
  render();
};
window.module_qualidade_lotes();
