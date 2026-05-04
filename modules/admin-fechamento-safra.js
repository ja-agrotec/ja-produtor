window.module_fechamento_safra = async function() {
  var c = document.getElementById("mainContent");
  if (!c) return;
  c.innerHTML = "<div style=\"padding:16px\"><p>Carregando dados...</p></div>";

  // Load all needed data
  var safRes = await sb.from("safras").select("*,fazendas(id,nome,cidade,estado)").order("criado_em",{ascending:false});
  var safras = (safRes.data || []);

  var fechRes = await sb.from("fechamento_safra").select("*,safras(nome,cultura),fazendas(nome)").order("criado_em",{ascending:false});
  var fechamentos = (fechRes.data || []);

  function fmtBrl(n) { return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtSc(n) { return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}); }
  function fmtHa(n) { return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) + " ha"; }
  function fmtPct(n) { return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}) + "%"; }
  function fmtDate(d) { if(!d) return ""; var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

  function badge(s,bg,fg) { return "<span style=\"background:"+bg+";color:"+fg+";padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;white-space:nowrap\">"+s+"</span>"; }
  function statusBadge(st) {
    if(st==="rascunho") return badge(st,"#fff3e0","#e65100");
    if(st==="confirmado") return badge(st,"#e8f5e9","#2d7d32");
    return badge(st,"#f5f5f5","#666");
  }

  var safOpts = safras.map(function(s) {
    var fzNome = s.fazendas ? s.fazendas.nome : "";
    return "<option value=\""+s.id+"\">"+s.nome+" - "+fzNome+" ("+s.cultura+" "+s.ano_agricola+")</option>";
  }).join("");

  var html = "";
  html += "<div style=\"max-width:1200px;margin:0 auto;padding:8px 0\">"
  // Header
  html += "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:20px\">"
  html += "<div><h2 style=\"margin:0;font-size:22px;color:#1a2e1a\">&#128200; Fechamento de Safra</h2>"
  html += "<p style=\"margin:2px 0 0;color:#666;font-size:13px\">Consolida custo, producao, depreciacoes e resultado financeiro</p></div>"
  html += "<button onclick=\"window._fsNovoFechamento();\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600\">+ Novo Fechamento</button>"
  html += "</div>"

  // List of existing fechamentos
  if (fechamentos.length === 0) {
    html += "<div style=\"background:#fff;border-radius:12px;padding:48px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
    html += "<div style=\"font-size:48px;margin-bottom:12px\">&#128200;</div>"
    html += "<h3 style=\"margin:0 0 8px;color:#333\">Nenhum fechamento realizado ainda</h3>"
    html += "<p style=\"color:#888;margin:0 0 20px\">Feche uma safra para ver relatorios consolidados</p>"
    html += "<button onclick=\"window._fsNovoFechamento();\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-size:14px;font-weight:600\">Iniciar Fechamento</button>"
    html += "</div>"
  } else {
    html += "<div style=\"display:grid;gap:14px;margin-bottom:24px\">"
    fechamentos.forEach(function(f) {
      var sfNome = f.safras ? f.safras.nome : "";
      var fzNome = f.fazendas ? f.fazendas.nome : "";
      var saldo = parseFloat(f.resultado_liquido||0);
      var saldoCor = saldo >= 0 ? "#2d7d32" : "#c62828";
      html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
      html += "<div style=\"padding:16px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #f5f5f5\">"
      html += "<div>"
      html += "<div style=\"font-size:16px;font-weight:600;color:#1a2e1a\">"+sfNome+"</div>"
      html += "<div style=\"font-size:12px;color:#666;margin-top:2px\">"+fzNome+" &bull; "+fmtDate(f.data_fechamento)+" &bull; "+f.tipo_fechamento+"</div>"
      html += "</div>"
      html += "<div style=\"display:flex;align-items:center;gap:12px\">"
      html += statusBadge(f.status)
      html += "<button onclick=\"window._fsVerDetalhe('"+f.id+"');\" style=\"background:#1565c0;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px\"">Ver</button>"
      html += "</div></div>"
      // KPI summary row
      html += "<div style=\"padding:12px 16px;display:grid;grid-template-columns:repeat(6,1fr);gap:10px\">"
      html += "<div style=\"text-align:center\"><div style=\"font-size:11px;color:#888\">Area</div><div style=\"font-size:14px;font-weight:600\">"+fmtHa(f.area_total_ha)+"</div></div>"
      html += "<div style=\"text-align:center\"><div style=\"font-size:11px;color:#888\">Producao</div><div style=\"font-size:14px;font-weight:600\">"+fmtSc(f.producao_total_sc)+" sc</div></div>"
      html += "<div style=\"text-align:center\"><div style=\"font-size:11px;color:#888\">Produtividade</div><div style=\"font-size:14px;font-weight:600\">"+fmtSc(f.produtividade_sc_ha)+" sc/ha</div></div>"
      html += "<div style=\"text-align:center\"><div style=\"font-size:11px;color:#888\">Custo Total</div><div style=\"font-size:14px;font-weight:600\">"+fmtBrl(f.custo_total)+"</div></div>"
      html += "<div style=\"text-align:center\"><div style=\"font-size:11px;color:#888\">Receita</div><div style=\"font-size:14px;font-weight:600\">"+fmtBrl(f.receita_vendas)+"</div></div>"
      html += "<div style=\"text-align:center\"><div style=\"font-size:11px;color:#888\">Resultado</div><div style=\"font-size:14px;font-weight:700;color:"+saldoCor+"\">"+fmtBrl(saldo)+"</div></div>"
      html += "</div>"
      html += "</div>"
    });
    html += "</div>"
  }
  html += "</div>"

  c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";

  // =============================================
  // WIZARD: Novo Fechamento
  // =============================================
  window._fsNovoFechamento = function() {
    var modal = document.createElement("div");
    modal.id = "fsModal";
    modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:flex-start;justify-content:center;overflow-y:auto;padding:20px;";
    modal.innerHTML = "<div style=\"background:#fff;border-radius:16px;padding:28px;width:680px;max-width:95vw;margin:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)\">"
      +"<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:20px\">"
      +"<h2 style=\"margin:0;font-size:18px\">&#128200; Iniciar Fechamento de Safra</h2>"
      +"<button onclick=\"document.getElementById('fsModal').remove();\" style=\"background:none;border:none;font-size:20px;cursor:pointer;color:#666\">&#10005;</button>"
      +"</div>"
      +"<div style=\"margin-bottom:16px\">"
      +"<label style=\"font-size:13px;color:#555;font-weight:600;display:block;margin-bottom:6px\">Selecionar Safra *</label>"
      +"<select id=\"fsSafraId\" onchange=\"window._fsLoadTalhoes(this.value);\" style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px\"><option value=\"\">Selecione a safra...</option>"+safOpts+"</select>"
      +"</div>"
      +"<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px\">"
      +"<div>"
      +"<label style=\"font-size:13px;color:#555;font-weight:600;display:block;margin-bottom:6px\">Tipo de Fechamento</label>"
      +"<div style=\"display:flex;gap:12px\">"
      +"<label style=\"display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px\"><input type=\"radio\" name=\"fsTipo\" value=\"parcial\" checked> Parcial (alguns talh&otilde;es)</label>"
      +"<label style=\"display:flex;align-items:center;gap:6px;cursor:pointer;font-size:14px\"><input type=\"radio\" name=\"fsTipo\" value=\"total\"> Total (safra inteira)</label>"
      +"</div></div>"
      +"<div>"
      +"<label style=\"font-size:13px;color:#555;font-weight:600;display:block;margin-bottom:6px\">Data de Fechamento</label>"
      +"<input id=\"fsDataFech\" type=\"date\" style=\"width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;box-sizing:border-box\" value=\""+new Date().toISOString().substring(0,10)+"\">"
      +"</div></div>"
      +"<div id=\"fsTalhoesWrap\" style=\"display:none;margin-bottom:16px\">"
      +"<label style=\"font-size:13px;color:#555;font-weight:600;display:block;margin-bottom:8px\">Selecionar Talh&otilde;es para Fechar</label>"
      +"<div id=\"fsTalhoesList\"></div>"
      +"</div>"
      +"<div style=\"display:flex;gap:8px;margin-top:20px\">"
      +"<button onclick=\"window._fsProcessar();\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-size:14px;font-weight:600\">&#9654; Calcular e Gerar Fechamento</button>"
      +"<button onclick=\"document.getElementById('fsModal').remove();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:12px 24px;cursor:pointer;font-size:14px\">Cancelar</button>"
      +"</div>"
      +"</div>";
    document.body.appendChild(modal);
  };

  window._fsLoadTalhoes = async function(safraId) {
    if (!safraId) { document.getElementById("fsTalhoesWrap").style.display="none"; return; }
    var safra = safras.find(function(s){ return s.id===safraId; });
    if (!safra) return;
    // Load talhoes of the same fazenda
    var tRes = await sb.from("talhoes").select("id,nome,area_ha").eq("fazenda_id",safra.fazenda_id).eq("ativo",true);
    var tals = (tRes.data || []);
    var listHtml = "";
    tals.forEach(function(t) {
      listHtml += "<label style=\"display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9f9f9;border-radius:6px;margin-bottom:6px;cursor:pointer;font-size:13px\">"
      listHtml += "<input type=\"checkbox\" class=\"fsTalhaoChk\" value=\""+t.id+"\" data-area=\""+t.area_ha+"\" data-nome=\""+t.nome+"\" checked>"
      listHtml += "<span>"+t.nome+"</span>"
      listHtml += "<span style=\"color:#888;font-size:12px;margin-left:auto\">"+parseFloat(t.area_ha||0).toFixed(2)+" ha</span>"
      listHtml += "<span style=\"margin-left:8px;font-size:12px;color:#555\"">Produz: <input type=\"number\" class=\"fsTalhaoProducao\" data-id=\""+t.id+"\" min=\"0\" step=\"0.1\" placeholder=\"0\" style=\"width:80px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right\"> sc</span>"
      listHtml += "</label>"
    });
    document.getElementById("fsTalhoesList").innerHTML = listHtml || "<p style=\"color:#888\">Nenhum talhao encontrado para esta fazenda.</p>";
    document.getElementById("fsTalhoesWrap").style.display = "block";
    // Store talhoes reference
    window._fsTalhoes = tals;
    window._fsSafra = safra;
  };

  window._fsProcessar = async function() {
    var safraId = document.getElementById("fsSafraId").value;
    var dataFech = document.getElementById("fsDataFech").value;
    var tipoFech = document.querySelector("input[name=fsTipo]:checked").value;
    if (!safraId) { alert("Selecione a safra!"); return; }
    var safra = window._fsSafra || safras.find(function(s){ return s.id===safraId; });
    var fazendaId = safra.fazenda_id;

    // Get selected talhoes with producao
    var chks = document.querySelectorAll(".fsTalhaoChk:checked");
    var talhoesFechar = Array.from(chks).map(function(ck){
      var prodInput = document.querySelector(".fsTalhaoProducao[data-id=\""+ck.value+"\"]");
      return { id:ck.value, nome:ck.dataset.nome, area_ha:parseFloat(ck.dataset.area||0), producao_sc:parseFloat((prodInput&&prodInput.value)||0) };
    });
    if (talhoesFechar.length===0) { alert("Selecione pelo menos um talhao!"); return; }

    // Show calculating UI
    document.getElementById("fsModal").querySelector("div").innerHTML += "<div id=\"fsCalcMsg\" style=\"margin-top:12px;padding:12px;background:#e8f5e9;border-radius:8px;color:#2d7d32;font-size:13px\">Calculando... aguarde...</div>";

    // =============================================
    // STEP 1: Load all lancamentos for this safra
    // =============================================
    var lancRes = await sb.from("lancamentos").select("*").eq("safra_id",safraId).eq("status","confirmado");
    var lancs = (lancRes.data || []);

    // Separate by talhao
    var lancByTalhao = {};
    var lancSemTalhao = [];
    var talhaoIds = talhoesFechar.map(function(t){ return t.id; });
    lancs.forEach(function(l){
      if (l.talhao_id && talhaoIds.indexOf(l.talhao_id) >= 0) {
        if (!lancByTalhao[l.talhao_id]) lancByTalhao[l.talhao_id] = [];
        lancByTalhao[l.talhao_id].push(l);
      } else if (!l.talhao_id) {
        lancSemTalhao.push(l);
      }
    });

    // =============================================
    // STEP 2: Load depreciacao_ativos for fazenda
    // =============================================
    var depRes = await sb.from("depreciacao_ativos").select("*").eq("fazenda_id",fazendaId).eq("ativo",true);
    var depAtivos = (depRes.data || []);

    // Also load maquinas with valor_aquisicao
    var maqRes = await sb.from("maquinas").select("id,nome,tipo,valor_aquisicao,ano_aquisicao,vida_util_anos,valor_residual").eq("fazenda_id",fazendaId).eq("ativo",true);
    var maquinas = (maqRes.data || []);
    // Add maquinas as depreciacao sources if valor_aquisicao set
    maquinas.forEach(function(m){
      if (parseFloat(m.valor_aquisicao||0) > 0) {
        var alreadyReg = depAtivos.find(function(d){ return d.maquina_id===m.id; });
        if (!alreadyReg) {
          depAtivos.push({ id:m.id, nome_ativo:m.nome, tipo_ativo:"maquina", valor_aquisicao:m.valor_aquisicao, vida_util_anos:m.vida_util_anos||10, valor_residual:m.valor_residual||0, metodo:"linear", ano_aquisicao:m.ano_aquisicao });
        }
      }
    });

    // =============================================
    // STEP 3: Calculate depreciation per year
    // =============================================
    var anoAtual = new Date().getFullYear();
    var totalDepreciacaoAnual = 0;
    depAtivos.forEach(function(d){
      var vAq = parseFloat(d.valor_aquisicao||0);
      var vRes = parseFloat(d.valor_residual||0);
      var vida = parseInt(d.vida_util_anos||10);
      var anoAq = parseInt(d.ano_aquisicao||anoAtual);
      var idadeAnos = anoAtual - anoAq;
      if (idadeAnos >= vida) {
        d._depAnual = 0; // fully depreciated
      } else {
        d._depAnual = (vAq - vRes) / vida; // linear
      }
      totalDepreciacaoAnual += d._depAnual;
    });
    // Depreciation for this safra cycle (assume 1 year = 1 safra cycle)
    var areaTotal = talhoesFechar.reduce(function(a,t){ return a+t.area_ha; },0);
    var depPorHa = areaTotal > 0 ? totalDepreciacaoAnual / areaTotal : 0;

    // =============================================
    // STEP 4: Cost breakdown per talhao
    // =============================================
    // Distribute lancamentos sem talhao proportionally by area
    var custoSemTalhao = {insumos:0,mao_obra:0,maquinas:0,outros:0};
    lancSemTalhao.forEach(function(l){
      if (l.tipo==="despesa") {
        var v = parseFloat(l.custo_total||0);
        var desc = (l.descricao||"").toLowerCase();
        if (l.insumo_id) custoSemTalhao.insumos += v;
        else if (l.operador_id) custoSemTalhao.mao_obra += v;
        else if (l.maquina_id) custoSemTalhao.maquinas += v;
        else custoSemTalhao.outros += v;
      }
    });

    // =============================================
    // STEP 5: Load receita from vendas_graos
    // =============================================
    var vendRes = await sb.from("vendas_graos").select("*,entregas_graos(talhao_id,quantidade_sc,preco_saca)").eq("safra_id",safraId);
    var vendas = (vendRes.data || []);
    var receitaTotal = 0;
    vendas.forEach(function(v){
      var entQtd = (v.entregas_graos||[]).reduce(function(a,e){ return a+parseFloat(e.quantidade_sc||0); },0);
      var qtdVendida = Math.min(parseFloat(v.quantidade_sc||0), entQtd || parseFloat(v.quantidade_sc||0));
      receitaTotal += qtdVendida * parseFloat(v.preco_saca||0);
    });

    // =============================================
    // STEP 6: Build per-talhao results
    // =============================================
    var talResults = talhoesFechar.map(function(t) {
      var lancsTal = lancByTalhao[t.id] || [];
      var cInsumos=0,cMaoObra=0,cMaquinas=0,cOutros=0;
      lancsTal.forEach(function(l){
        if (l.tipo==="despesa") {
          var v = parseFloat(l.custo_total||0);
          if (l.insumo_id) cInsumos += v;
          else if (l.operador_id) cMaoObra += v;
          else if (l.maquina_id) cMaquinas += v;
          else cOutros += v;
        }
      });
      // Add proportional share of lancamentos sem talhao
      var propArea = areaTotal > 0 ? (t.area_ha / areaTotal) : 0;
      cInsumos += custoSemTalhao.insumos * propArea;
      cMaoObra += custoSemTalhao.mao_obra * propArea;
      cMaquinas += custoSemTalhao.maquinas * propArea;
      cOutros += custoSemTalhao.outros * propArea;
      // Depreciation for this talhao
      var cDep = depPorHa * t.area_ha;
      var cTotal = cInsumos + cMaoObra + cMaquinas + cDep + cOutros;
      var producaoSc = t.producao_sc;
      var prodSc_ha = t.area_ha > 0 ? producaoSc/t.area_ha : 0;
      var custoSc = producaoSc > 0 ? cTotal/producaoSc : 0;
      var custoHa = t.area_ha > 0 ? cTotal/t.area_ha : 0;
      // Proportional revenue
      var recProp = areaTotal > 0 ? receitaTotal*(t.area_ha/areaTotal) : 0;
      return { talhao_id:t.id, nome:t.nome, area_ha:t.area_ha, producao_sc:producaoSc, produtividade_sc_ha:prodSc_ha, custo_insumos:cInsumos, custo_mao_obra:cMaoObra, custo_maquinas:cMaquinas, custo_depreciacao:cDep, custo_outros:cOutros, custo_total:cTotal, custo_sc:custoSc, custo_ha:custoHa, receita_proporcional:recProp, resultado_liquido:recProp-cTotal };
    });

    // Aggregate totals
    var totProd = talResults.reduce(function(a,t){ return a+t.producao_sc; },0);
    var totCusto = talResults.reduce(function(a,t){ return a+t.custo_total; },0);
    var totArea = talResults.reduce(function(a,t){ return a+t.area_ha; },0);
    var totDep = talResults.reduce(function(a,t){ return a+t.custo_depreciacao; },0);
    var totInsumos = talResults.reduce(function(a,t){ return a+t.custo_insumos; },0);
    var totMaoObra = talResults.reduce(function(a,t){ return a+t.custo_mao_obra; },0);
    var totMaquinas = talResults.reduce(function(a,t){ return a+t.custo_maquinas; },0);
    var totOutros = talResults.reduce(function(a,t){ return a+t.custo_outros; },0);
    var prodMedia = totArea > 0 ? totProd/totArea : 0;
    var custoScGeral = totProd > 0 ? totCusto/totProd : 0;
    var custoHaGeral = totArea > 0 ? totCusto/totArea : 0;
    var resultadoLiquido = receitaTotal - totCusto;
    var margemPct = receitaTotal > 0 ? (resultadoLiquido/receitaTotal)*100 : 0;

    // =============================================
    // STEP 7: Save fechamento_safra record
    // =============================================
    var fechPayload = { safra_id:safraId, fazenda_id:fazendaId, tipo_fechamento:tipoFech, data_fechamento:dataFech, status:"rascunho", area_total_ha:totArea, producao_total_sc:totProd, produtividade_sc_ha:prodMedia, custo_insumos:totInsumos, custo_mao_obra:totMaoObra, custo_maquinas:totMaquinas, custo_depreciacao:totDep, custo_outros:totOutros, custo_total:totCusto, custo_sc:custoScGeral, custo_ha:custoHaGeral, receita_vendas:receitaTotal, resultado_liquido:resultadoLiquido, margem_pct:margemPct };
    var insF = await sb.from("fechamento_safra").insert(fechPayload).select().single();
    if (insF.error) { alert("Erro ao salvar: "+insF.error.message); return; }
    var fechId = insF.data.id;

    // Save per-talhao records
    for (var ti=0; ti<talResults.length; ti++) {
      var tr = talResults[ti];
      var tPayload = { fechamento_id:fechId, talhao_id:tr.talhao_id, safra_id:safraId, area_ha:tr.area_ha, producao_sc:tr.producao_sc, produtividade_sc_ha:tr.produtividade_sc_ha, custo_insumos:tr.custo_insumos, custo_mao_obra:tr.custo_mao_obra, custo_maquinas:tr.custo_maquinas, custo_depreciacao:tr.custo_depreciacao, custo_outros:tr.custo_outros, custo_total:tr.custo_total, custo_sc:tr.custo_sc, custo_ha:tr.custo_ha, receita_proporcional:tr.receita_proporcional, resultado_liquido:tr.resultado_liquido, status_talhao:"fechado_parcial" };
      await sb.from("fechamento_talhao").insert(tPayload);
    }

    // Close modal and show result
    document.getElementById("fsModal").remove();
    window._fsShowResultado(fechId, safra, talResults, { totProd:totProd, totCusto:totCusto, totArea:totArea, totDep:totDep, totInsumos:totInsumos, totMaoObra:totMaoObra, totMaquinas:totMaquinas, totOutros:totOutros, prodMedia:prodMedia, custoScGeral:custoScGeral, custoHaGeral:custoHaGeral, receitaTotal:receitaTotal, resultadoLiquido:resultadoLiquido, margemPct:margemPct, depAtivos:depAtivos });
  };

  window._fsShowResultado = function(fechId, safra, talResults, tot) {
    var saldoCor = tot.resultadoLiquido >= 0 ? "#2d7d32" : "#c62828";
    var saldoBg = tot.resultadoLiquido >= 0 ? "#e8f5e9" : "#fce4ec";
    var html = "";
    html += "<div style=\"max-width:1200px;margin:0 auto;padding:8px 0\">"
    html += "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:20px\">"
    html += "<button onclick=\"window.module_fechamento_safra();\" style=\"background:none;border:none;cursor:pointer;font-size:16px;color:#666\">&larr;</button>"
    html += "<div><h2 style=\"margin:0;font-size:22px;color:#1a2e1a\">&#128200; Fechamento: "+(safra.nome||"")+"</h2>"
    html += "<p style=\"margin:2px 0 0;color:#666;font-size:13px\">"+(safra.cultura||"")+" "+safra.ano_agricola+" &bull; Gerado em "+new Date().toLocaleDateString("pt-BR")+"</p></div>"
    html += "</div>"

    // Big result card
    html += "<div style=\"background:"+saldoBg+";border:2px solid "+saldoCor+";border-radius:16px;padding:20px 24px;margin-bottom:20px;display:flex;align-items:center;justify-content:space-between\">"
    html += "<div><div style=\"font-size:13px;color:"+saldoCor+";font-weight:600;text-transform:uppercase;letter-spacing:0.5px\">Resultado Liquido da Safra</div>"
    html += "<div style=\"font-size:36px;font-weight:800;color:"+saldoCor+"\">"+fmtBrl(tot.resultadoLiquido)+"</div>"
    html += "<div style=\"font-size:13px;color:"+saldoCor+"\">Margem: "+fmtPct(tot.margemPct)+"</div></div>"
    html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;text-align:right\">"
    html += "<div style=\"font-size:12px;color:#555\">Receita Total</div><div style=\"font-size:14px;font-weight:600;color:#2d7d32\">"+fmtBrl(tot.receitaTotal)+"</div>"
    html += "<div style=\"font-size:12px;color:#555\">Custo Total</div><div style=\"font-size:14px;font-weight:600;color:#c62828\">"+fmtBrl(tot.totCusto)+"</div>"
    html += "</div>"
    html += "</div>"

    // 6-KPI row
    html += "<div style=\"display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:20px\">"
    html += "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid #2d7d32;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center\">"
    html += "<div style=\"font-size:11px;color:#888\">Area Total</div><div style=\"font-size:16px;font-weight:700\">"+fmtHa(tot.totArea)+"</div></div>"
    html += "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid #1565c0;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center\">"
    html += "<div style=\"font-size:11px;color:#888\">Producao</div><div style=\"font-size:16px;font-weight:700\">"+fmtSc(tot.totProd)+" sc</div></div>"
    html += "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid #7b1fa2;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center\">"
    html += "<div style=\"font-size:11px;color:#888\">Produtividade</div><div style=\"font-size:16px;font-weight:700\">"+fmtSc(tot.prodMedia)+" sc/ha</div></div>"
    html += "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid #e65100;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center\">"
    html += "<div style=\"font-size:11px;color:#888\">Custo/sc</div><div style=\"font-size:16px;font-weight:700\">"+fmtBrl(tot.custoScGeral)+"</div></div>"
    html += "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid #e65100;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center\">"
    html += "<div style=\"font-size:11px;color:#888\">Custo/ha</div><div style=\"font-size:16px;font-weight:700\">"+fmtBrl(tot.custoHaGeral)+"</div></div>"
    html += "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid #795548;box-shadow:0 1px 4px rgba(0,0,0,0.06);text-align:center\">"
    html += "<div style=\"font-size:11px;color:#888\">Depreciacoes</div><div style=\"font-size:16px;font-weight:700\">"+fmtBrl(tot.totDep)+"</div></div>"
    html += "</div>"

    // Cost breakdown
    html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"
    // Pie-like bar breakdown
    html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
    html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#128202; Composicao dos Custos</h3>"
    var custoCats = [{n:"Insumos",v:tot.totInsumos,c:"#2d7d32"},{n:"Mao de Obra",v:tot.totMaoObra,c:"#1565c0"},{n:"Maquinas",v:tot.totMaquinas,c:"#e65100"},{n:"Depreciacoes",v:tot.totDep,c:"#795548"},{n:"Outros",v:tot.totOutros,c:"#9e9e9e"}];
    custoCats.forEach(function(cat){
      var pct = tot.totCusto > 0 ? (cat.v/tot.totCusto)*100 : 0;
      html += "<div style=\"margin-bottom:10px\">"
      html += "<div style=\"display:flex;justify-content:space-between;margin-bottom:3px\">"
      html += "<span style=\"font-size:12px;color:#555\">"+cat.n+"</span>"
      html += "<span style=\"font-size:12px;font-weight:600\">"+fmtBrl(cat.v)+" ("+pct.toFixed(1)+"%)&#34;</span>"
      html += "</div>"
      html += "<div style=\"background:#f0f0f0;border-radius:4px;height:8px\">"
      html += "<div style=\"background:"+cat.c+";height:8px;border-radius:4px;width:"+pct.toFixed(1)+"%\"></div>"
      html += "</div></div>"
    });
    html += "</div>"

    // Depreciation assets table
    html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
    html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#128736; Depreciacoes de Ativos</h3>"
    if (tot.depAtivos.length === 0) {
    html += "<p style=\"color:#888;font-size:13px\">Nenhum ativo cadastrado. <a href=\"#\" onclick=\"window._fsGotoAtivos();\" style=\"color:#2d7d32\">Cadastrar agora</a></p>"
    } else {
    html += "<table style=\"width:100%;border-collapse:collapse;font-size:12px\">"
    html += "<thead><tr style=\"background:#f8f9fa\"><th style=\"padding:6px 8px;text-align:left;border-bottom:1px solid #eee\">Ativo</th><th style=\"padding:6px 8px;text-align:left;border-bottom:1px solid #eee\">Tipo</th><th style=\"padding:6px 8px;text-align:right;border-bottom:1px solid #eee\">Val.Aq</th><th style=\"padding:6px 8px;text-align:right;border-bottom:1px solid #eee\">Vida</th><th style=\"padding:6px 8px;text-align:right;border-bottom:1px solid #eee\">Dep.Anual</th></tr></thead><tbody>"
    tot.depAtivos.forEach(function(d){
      html += "<tr style=\"border-bottom:1px solid #f9f9f9\">"
      html += "<td style=\"padding:6px 8px\">"+d.nome_ativo+"</td>"
      html += "<td style=\"padding:6px 8px;color:#888\">"+d.tipo_ativo+"</td>"
      html += "<td style=\"padding:6px 8px;text-align:right\">"+fmtBrl(d.valor_aquisicao)+"</td>"
      html += "<td style=\"padding:6px 8px;text-align:right;color:#888\">"+d.vida_util_anos+" anos</td>"
      html += "<td style=\"padding:6px 8px;text-align:right;font-weight:600;color:#795548\">"+fmtBrl(d._depAnual||0)+"</td>"
      html += "</tr>"
    });
    html += "</tbody></table>"
    }
    html += "</div>"
    html += "</div>"

    // Per-talhao table
    html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden;margin-bottom:20px\">"
    html += "<div style=\"padding:16px;border-bottom:1px solid #f5f5f5\"><h3 style=\"margin:0;font-size:14px\">&#127947; Resultado por Talhao</h3></div>"
    html += "<table style=\"width:100%;border-collapse:collapse;font-size:13px\">"
    html += "<thead><tr style=\"background:#f8f9fa\">"
    html += "<th style=\"padding:10px 12px;text-align:left;border-bottom:1px solid #eee;color:#555;font-weight:600\">Talhao</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Area</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Producao</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Produt.</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Custo Total</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Custo/sc</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Custo/ha</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Dep.</th>"
    html += "<th style=\"padding:10px 12px;text-align:right;border-bottom:1px solid #eee;color:#555;font-weight:600\">Resultado</th>"
    html += "</tr></thead><tbody>"
    talResults.forEach(function(tr){
      var resCor = tr.resultado_liquido >= 0 ? "#2d7d32" : "#c62828";
      html += "<tr style=\"border-bottom:1px solid #f9f9f9\">"
      html += "<td style=\"padding:10px 12px;font-weight:600\">"+tr.nome+"</td>"
      html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtHa(tr.area_ha)+"</td>"
      html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtSc(tr.producao_sc)+" sc</td>"
      html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtSc(tr.produtividade_sc_ha)+" sc/ha</td>"
      html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtBrl(tr.custo_total)+"</td>"
      html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtBrl(tr.custo_sc)+"</td>"
      html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtBrl(tr.custo_ha)+"</td>"
      html += "<td style=\"padding:10px 12px;text-align:right;color:#795548\">"+fmtBrl(tr.custo_depreciacao)+"</td>"
      html += "<td style=\"padding:10px 12px;text-align:right;font-weight:700;color:"+resCor+"\">"+fmtBrl(tr.resultado_liquido)+"</td>"
      html += "</tr>"
    });
    // Totals row
    html += "<tr style=\"background:#f8f9fa;font-weight:700;border-top:2px solid #eee\">"
    html += "<td style=\"padding:10px 12px\">TOTAL</td>"
    html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtHa(tot.totArea)+"</td>"
    html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtSc(tot.totProd)+" sc</td>"
    html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtSc(tot.prodMedia)+" sc/ha</td>"
    html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtBrl(tot.totCusto)+"</td>"
    html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtBrl(tot.custoScGeral)+"</td>"
    html += "<td style=\"padding:10px 12px;text-align:right\">"+fmtBrl(tot.custoHaGeral)+"</td>"
    html += "<td style=\"padding:10px 12px;text-align:right;color:#795548\">"+fmtBrl(tot.totDep)+"</td>"
    html += "<td style=\"padding:10px 12px;text-align:right;color:"+(tot.resultadoLiquido>=0?"#2d7d32":"#c62828")+"\">"+fmtBrl(tot.resultadoLiquido)+"</td>"
    html += "</tr>"
    html += "</tbody></table></div>"

    // IA Analysis block
    var iaRecs = [];
    if (tot.prodMedia < 50) iaRecs.push({icon:"&#128308;",cat:"Produtividade Critica",msg:"Produtividade de "+fmtSc(tot.prodMedia)+" sc/ha esta abaixo da media regional. Rever manejo de solo, adubacao e variedade utilizada."});
    else if (tot.prodMedia < 65) iaRecs.push({icon:"&#128993;",cat:"Produtividade Moderada",msg:"Produtividade de "+fmtSc(tot.prodMedia)+" sc/ha. Ha espaco para melhoria com ajuste de populacao e fertilidade."});
    else iaRecs.push({icon:"&#128994;",cat:"Boa Produtividade",msg:"Produtividade de "+fmtSc(tot.prodMedia)+" sc/ha esta dentro ou acima da media regional. Mantenha as praticas."});
    if (tot.totCusto > tot.receitaTotal) iaRecs.push({icon:"&#128308;",cat:"Prejuizo no Ciclo",msg:"Custo ("+fmtBrl(tot.totCusto)+") superou a receita ("+fmtBrl(tot.receitaTotal)+"). Revisar contratos e reducao de custos variaveis."});
    else if (tot.margemPct < 15) iaRecs.push({icon:"&#128993;",cat:"Margem Apertada",msg:"Margem de "+fmtPct(tot.margemPct)+" esta abaixo dos 15% de seguranca. Revisar preco de venda ou reducao de custo."});
    else iaRecs.push({icon:"&#128994;",cat:"Resultado Positivo",msg:"Margem de "+fmtPct(tot.margemPct)+" indica resultado saudavel. Considere hedge parcial na proxima safra para proteger margens."});
    if (tot.totDep > tot.totCusto * 0.2) iaRecs.push({icon:"&#128993;",cat:"Depreciacoes Elevadas",msg:"Depreciacoes representam "+((tot.totDep/tot.totCusto)*100).toFixed(1)+"% do custo. Avalie renovacao parcial de maquinario ou terceirizacao de servicos."});
    else if (tot.totDep === 0) iaRecs.push({icon:"&#128310;",cat:"Cadastrar Ativos",msg:"Nenhum ativo cadastrado para depreciacao. Cadastre maquinas com valor de aquisicao para calculo mais preciso do custo real."});
    if (tot.totInsumos/tot.totCusto > 0.6) iaRecs.push({icon:"&#128993;",cat:"Insumos Alto",msg:"Insumos representam "+((tot.totInsumos/tot.totCusto)*100).toFixed(1)+"% do custo. Avalie compra antecipada, permuta ou producao propria de inoculante."});

    html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:20px\">"
    html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#129302; Analise Inteligente (IA)</h3>"
    html += "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px\">"
    iaRecs.forEach(function(r){
      html += "<div style=\"background:#f8f9fa;border-radius:10px;padding:14px;border-left:3px solid #2d7d32\">"
      html += "<div style=\"font-size:18px;margin-bottom:6px\">"+r.icon+"</div>"
      html += "<div style=\"font-size:12px;font-weight:700;color:#333;margin-bottom:4px\">"+r.cat+"</div>"
      html += "<div style=\"font-size:12px;color:#555;line-height:1.5\">"+r.msg+"</div>"
      html += "</div>"
    });
    html += "</div>"
    html += "</div>"

    // Action buttons
    html += "<div style=\"display:flex;gap:10px;margin-bottom:20px\">"
    html += "<button onclick=\"window._fsConfirmar('"+fechId+"');\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-size:14px;font-weight:600\">&#10003; Confirmar Fechamento</button>"
    html += "<button onclick=\"window.print();\" style=\"background:#1565c0;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-size:14px;font-weight:600\">&#128424; Imprimir Relatorio</button>"
    html += "<button onclick=\"window.module_fechamento_safra();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:12px 24px;cursor:pointer;font-size:14px\">Voltar</button>"
    html += "</div>"

    html += "</div>"
    c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";
  };

  // Confirm fechamento
  window._fsConfirmar = async function(fechId) {
    var res = await sb.from("fechamento_safra").update({status:"confirmado"}).eq("id",fechId);
    if (res.error) { alert("Erro: "+res.error.message); return; }
    alert("Fechamento confirmado com sucesso!");
    window.module_fechamento_safra();
  };

  // View existing fechamento detail
  window._fsVerDetalhe = async function(fechId) {
    var fRes = await sb.from("fechamento_safra").select("*,safras(*),fazendas(nome)").eq("id",fechId).single();
    if (fRes.error || !fRes.data) { alert("Erro ao carregar fechamento"); return; }
    var fech = fRes.data;
    var talRes = await sb.from("fechamento_talhao").select("*,talhoes(nome)").eq("fechamento_id",fechId);
    var talRows = (talRes.data || []).map(function(t){
      return { talhao_id:t.talhao_id, nome:(t.talhoes?t.talhoes.nome:""), area_ha:t.area_ha, producao_sc:t.producao_sc, produtividade_sc_ha:t.produtividade_sc_ha, custo_insumos:t.custo_insumos, custo_mao_obra:t.custo_mao_obra, custo_maquinas:t.custo_maquinas, custo_depreciacao:t.custo_depreciacao, custo_outros:t.custo_outros, custo_total:t.custo_total, custo_sc:t.custo_sc, custo_ha:t.custo_ha, receita_proporcional:t.receita_proporcional, resultado_liquido:t.resultado_liquido };
    });
    var safra = fech.safras || {};
    var depAtivosFake = [];
    var totals = { totProd:fech.producao_total_sc, totCusto:fech.custo_total, totArea:fech.area_total_ha, totDep:fech.custo_depreciacao, totInsumos:fech.custo_insumos, totMaoObra:fech.custo_mao_obra, totMaquinas:fech.custo_maquinas, totOutros:fech.custo_outros, prodMedia:fech.produtividade_sc_ha, custoScGeral:fech.custo_sc, custoHaGeral:fech.custo_ha, receitaTotal:fech.receita_vendas, resultadoLiquido:fech.resultado_liquido, margemPct:fech.margem_pct, depAtivos:depAtivosFake };
    window._fsShowResultado(fechId, safra, talRows, totals);
  };

  window._fsGotoAtivos = function() {
    alert("Em breve: modulo de Cadastro de Ativos para depreciacao.");
  };

}; // end module_fechamento_safra
window.module_fechamento_safra();
