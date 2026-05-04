window.module_dashboard = async function() {
  var c = document.getElementById("mainContent");
  if (!c) return;
  c.innerHTML = "<div style=\"padding:20px;text-align:center;color:#888\">Carregando dashboard...</div>";

  // Load Chart.js if not already loaded
  if (!window.Chart) {
    await new Promise(function(resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js";
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  // Load data in parallel
  var [fazRes, lancRes, safRes, talRes, insRes, fechRes, vendRes] = await Promise.all([
    sb.from("fazendas").select("id,nome,area_total_ha").eq("ativo",true).order("nome"),
    sb.from("lancamentos").select("id,tipo,custo_total,data_lancamento,descricao,insumo_id,operador_id,maquina_id,categoria_id,safra_id").eq("status","confirmado").order("data_lancamento",{ascending:true}).limit(500),
    sb.from("safras").select("*").order("ano_agricola",{ascending:false}).limit(20),
    sb.from("talhoes").select("id,nome,area_ha,fazenda_id").eq("ativo",true),
    sb.from("insumos").select("id,nome,estoque_atual,estoque_minimo,preco_unitario").eq("ativo",true),
    sb.from("fechamento_safra").select("*,safras(nome,cultura,ano_agricola),fazendas(nome)").order("criado_em",{ascending:false}).limit(10),
    sb.from("vendas_graos").select("*").order("criado_em",{ascending:false}).limit(50)
  ]);

  var fazendas = (fazRes.data || []);
  var lancs = (lancRes.data || []);
  var safras = (safRes.data || []);
  var talhoes = (talRes.data || []);
  var insumos = (insRes.data || []);
  var fechamentos = (fechRes.data || []);
  var vendas = (vendRes.data || []);

  // Helper functions
  function fmtBrl(n) { return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtSc(n) { return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}); }
  function fmtPct(n) { return parseFloat(n||0).toFixed(1) + "%"; }

  // AGGREGATIONS
  // 1. Despesas por categoria (last 12 months)
  var despesas = lancs.filter(function(l){ return l.tipo==="despesa"; });
  var catTotals = { Insumos:0, MaoDeObra:0, Maquinas:0, Outros:0 };
  despesas.forEach(function(l){
    var v = parseFloat(l.custo_total||0);
    if (l.insumo_id) catTotals.Insumos += v;
    else if (l.operador_id) catTotals.MaoDeObra += v;
    else if (l.maquina_id) catTotals.Maquinas += v;
    else catTotals.Outros += v;
  });

  // 2. Lancamentos por mes (last 12 months)
  var byMonth = {};
  lancs.forEach(function(l){
    if (!l.data_lancamento) return;
    var parts = l.data_lancamento.split("-");
    var key = parts[0]+"-"+parts[1];
    if (!byMonth[key]) byMonth[key] = {desp:0,rec:0};
    if (l.tipo==="despesa") byMonth[key].desp += parseFloat(l.custo_total||0);
    else byMonth[key].rec += parseFloat(l.custo_total||0);
  });
  var monthKeys = Object.keys(byMonth).sort().slice(-12);
  var monthLabels = monthKeys.map(function(k){ var p=k.split("-"); var ms=["","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"]; return ms[parseInt(p[1])]+"/"+p[0].substring(2); });
  var monthDesp = monthKeys.map(function(k){ return byMonth[k].desp; });
  var monthRec = monthKeys.map(function(k){ return byMonth[k].rec; });

  // 3. Produtividade por talhao (from fechamentos)
  var talProd = {};
  fechamentos.forEach(function(f) {
    if (!f.fechamento_talhao) return;
  });
  // Use safras data for produtividade
  var safrasProd = safras.filter(function(s){ return parseFloat(s.produtividade_sc_ha||0) > 0; }).slice(0,8);

  // 4. ROI por fechamento
  var fechComRoi = fechamentos.filter(function(f){ return parseFloat(f.custo_total||0) > 0; }).slice(0,6);
  var fechLabels = fechComRoi.map(function(f){ return f.safras ? f.safras.nome.substring(0,12) : "-"; });
  var fechRoi = fechComRoi.map(function(f){ return parseFloat(f.custo_total||0)>0?((parseFloat(f.receita_vendas||0)-parseFloat(f.custo_total||0))/parseFloat(f.custo_total||0)*100):0; });
  var fechMargem = fechComRoi.map(function(f){ return parseFloat(f.margem_pct||0); });

  // 5. KPI totals
  var totalDesp = despesas.reduce(function(a,l){ return a+parseFloat(l.custo_total||0); },0);
  var totalRec = lancs.filter(function(l){ return l.tipo==="receita"; }).reduce(function(a,l){ return a+parseFloat(l.custo_total||0); },0);
  var totalVendas = vendas.reduce(function(a,v){ return a+parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0); },0);
  var totalSacas = vendas.reduce(function(a,v){ return a+parseFloat(v.quantidade_sc||0); },0);
  var ultimoFech = fechamentos[0];
  var roiGeral = ultimoFech && parseFloat(ultimoFech.custo_total||0)>0 ? ((parseFloat(ultimoFech.receita_vendas||0)-parseFloat(ultimoFech.custo_total||0))/parseFloat(ultimoFech.custo_total||0)*100) : null;

  // RENDER HTML
  var html = "";
  html += "<div style=\"max-width:1280px;margin:0 auto;padding:0\">"

  // Header
  html += "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:20px\">"
  html += "<div><h2 style=\"margin:0;font-size:22px;color:#1a2e1a\">&#128200; Dashboard Gerencial</h2>"
  html += "<p style=\"margin:4px 0 0;color:#888;font-size:13px\">Analise completa da operacao agricola em tempo real</p></div>"
  html += "<div style=\"font-size:12px;color:#bbb\">Atualizado: "+new Date().toLocaleTimeString("pt-BR")+"</div>"
  html += "</div>"

  // 6 KPI CARDS
  html += "<div style=\"display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin-bottom:20px\">"
  function kpi(label,val,sub,color,arrow){
    return "<div style=\"background:#fff;border-radius:10px;padding:14px;border-top:3px solid "+color+";box-shadow:0 1px 4px rgba(0,0,0,0.07);text-align:center\">"
      +"<div style=\"font-size:10px;text-transform:uppercase;color:#888;letter-spacing:0.5px\">"+label+"</div>"
      +"<div style=\"font-size:20px;font-weight:800;color:"+color+";margin:4px 0\">"+(arrow||"")+val+"</div>"
      +"<div style=\"font-size:11px;color:#999\">"+sub+"</div></div>";
  }
  html += kpi("Fazendas",fazendas.length,"Ativas","#2d7d32","&#127968; ");
  html += kpi("Lancamentos",lancs.length,"Confirmados","#1565c0","&#128196; ");
  html += kpi("Custo Total",fmtBrl(totalDesp),"Despesas","#c62828","");
  html += kpi("Receita Vendas",fmtBrl(totalVendas),"Contratos","#2d7d32","");
  html += kpi("Sacas Vendidas",fmtSc(totalSacas)+" sc","Contratos","#7b1fa2","&#127807; ");
  if (roiGeral !== null) { html += kpi("ROI Ultimo Fech.",fmtPct(roiGeral),"Retorno sobre Inv.",roiGeral>=0?"#2d7d32":"#c62828",""); }
  else { html += kpi("ROI","Sem dados","Realize fechamento","#9e9e9e",""); }
  html += "</div>"

  // ROW 1: 2 charts side by side
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // Chart 1: Custos por Categoria (Doughnut)
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
  html += "<h3 style=\"margin:0 0 16px;font-size:14px;color:#333\">&#128202; Composicao de Custos</h3>"
  html += "<div style=\"display:flex;align-items:center;gap:20px\">"
  html += "<div style=\"flex:1;max-width:200px;margin:0 auto\"><canvas id=\"chartDoughnut\" height=\"200\"></canvas></div>"
  // Legend
  html += "<div style=\"flex:1\">"
  var catEntries = [{n:"Insumos",v:catTotals.Insumos,c:"#2d7d32"},{n:"Mao de Obra",v:catTotals.MaoDeObra,c:"#1565c0"},{n:"Maquinas",v:catTotals.Maquinas,c:"#e65100"},{n:"Outros",v:catTotals.Outros,c:"#9e9e9e"}];
  var totCat = catEntries.reduce(function(a,e){ return a+e.v; },0);
  catEntries.forEach(function(e){
    var pct = totCat>0?((e.v/totCat)*100).toFixed(1):0;
    html += "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:8px\">"
    html += "<div style=\"width:12px;height:12px;border-radius:2px;background:"+e.c+";flex-shrink:0\"></div>"
    html += "<div style=\"flex:1;font-size:12px;color:#555\">"+e.n+"</div>"
    html += "<div style=\"font-size:12px;font-weight:600;color:#333\">"+pct+"%</div>"
    html += "</div>"
  });
  html += "<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid #eee;font-size:12px;font-weight:700;color:#333\">Total: "+fmtBrl(totCat)+"</div>"
  html += "</div>"
  html += "</div></div>"

  // Chart 2: Lancamentos por Mes (Bar)
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
  html += "<h3 style=\"margin:0 0 16px;font-size:14px;color:#333\">&#128197; Lancamentos por Mes</h3>"
  if (monthKeys.length === 0) {
    html += "<div style=\"height:200px;display:flex;align-items:center;justify-content:center;color:#bbb;font-size:13px\">Nenhum lancamento registrado</div>"
  } else {
    html += "<canvas id=\"chartBar\" height=\"200\"></canvas>"
  }
  html += "</div>"
  html += "</div>"

  // ROW 2: ROI por Fechamento + Safras Comparison
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // Chart 3: ROI por Fechamento (Bar horizontal)
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
  html += "<h3 style=\"margin:0 0 16px;font-size:14px;color:#333\">&#127919; ROI por Fechamento (%)</h3>"
  if (fechComRoi.length === 0) {
    html += "<div style=\"height:200px;display:flex;align-items:center;justify-content:center;color:#bbb;text-align:center;font-size:13px\">Realize fechamentos para ver o ROI historico</div>"
  } else {
    html += "<canvas id=\"chartRoi\" height=\"180\"></canvas>"
  }
  html += "</div>"

  // Chart 4: Receita vs Custo por Safra
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
  html += "<h3 style=\"margin:0 0 16px;font-size:14px;color:#333\">&#9878; Receita vs Custo por Safra</h3>"
  var safrasComDados = fechamentos.filter(function(f){ return parseFloat(f.custo_total||0)>0; }).slice(0,6);
  if (safrasComDados.length === 0) {
    html += "<div style=\"height:200px;display:flex;align-items:center;justify-content:center;color:#bbb;text-align:center;font-size:13px\">Sem fechamentos para comparar</div>"
  } else {
    html += "<canvas id=\"chartCompar\" height=\"180\"></canvas>"
  }
  html += "</div>"
  html += "</div>"

  // ROW 3: Estoque de Insumos + Safras Table
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // Insumos Estoque Bar Chart
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
  html += "<h3 style=\"margin:0 0 16px;font-size:14px;color:#333\">&#128994; Estoque de Insumos</h3>"
  insumos.slice(0,8).forEach(function(ins){
    var atual = parseFloat(ins.estoque_atual||0);
    var min = parseFloat(ins.estoque_minimo||0);
    var pct = min>0?Math.min(100,Math.round((atual/min)*100)):100;
    var cor = atual>=min?"#2d7d32":atual>0?"#e65100":"#c62828";
    html += "<div style=\"margin-bottom:12px\">"
    html += "<div style=\"display:flex;justify-content:space-between;margin-bottom:4px\">"
    html += "<span style=\"font-size:12px;color:#444\">"+ins.nome+"</span>"
    html += "<span style=\"font-size:11px;color:"+cor+";font-weight:600\">"+atual+" / "+min+"</span>"
    html += "</div>"
    html += "<div style=\"background:#f0f0f0;border-radius:4px;height:8px\"><div style=\"background:"+cor+";height:8px;border-radius:4px;width:"+pct+"%\"></div></div>"
    html += "</div>"
  });
  html += "</div>"

  // Safras Table
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">"
  html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#127807; Safras Cadastradas</h3>"
  if (safras.length === 0) {
    html += "<div style=\"color:#bbb;font-size:13px;text-align:center;padding:32px\">Nenhuma safra cadastrada</div>"
  } else {
    html += "<table style=\"width:100%;border-collapse:collapse;font-size:12px\">"
    html += "<thead><tr style=\"background:#f8f9fa\"><th style=\"padding:8px;text-align:left;border-bottom:1px solid #eee;color:#555\">Safra</th><th style=\"padding:8px;text-align:left;border-bottom:1px solid #eee;color:#555\">Cultura</th><th style=\"padding:8px;text-align:right;border-bottom:1px solid #eee;color:#555\">Prod. sc/ha</th><th style=\"padding:8px;text-align:center;border-bottom:1px solid #eee;color:#555\">Status</th></tr></thead><tbody>"
    safras.slice(0,8).forEach(function(s){
      var stCor = s.status==="aberto"?"#2d7d32":s.status==="encerrado"?"#1565c0":"#9e9e9e";
      html += "<tr style=\"border-bottom:1px solid #f9f9f9\">"
      html += "<td style=\"padding:8px;font-weight:600\">"+s.nome+"</td>"
      html += "<td style=\"padding:8px;color:#666\">"+s.cultura+" "+s.ano_agricola+"</td>"
      html += "<td style=\"padding:8px;text-align:right\">"+fmtSc(s.produtividade_sc_ha||0)+"</td>"
      html += "<td style=\"padding:8px;text-align:center\"><span style=\"background:"+stCor+"20;color:"+stCor+";padding:2px 8px;border-radius:10px;font-size:10px;font-weight:600\">"+s.status+"</span></td>"
      html += "</tr>"
    });
    html += "</tbody></table>"
  }
  html += "</div>"
  html += "</div>"

  html += "</div>"

  // RENDER
  c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";

  // Destroy any existing Chart instances
  function safeChart(id) {
    var existing = Chart.getChart(id);
    if (existing) existing.destroy();
    return document.getElementById(id);
  }

  // CHART 1: Doughnut - Custos por Categoria
  var ctxD = safeChart("chartDoughnut");
  if (ctxD) {
    new Chart(ctxD, {
      type: "doughnut",
      data: {
        labels: ["Insumos","Mao de Obra","Maquinas","Outros"],
        datasets: [{ data: [catTotals.Insumos,catTotals.MaoDeObra,catTotals.Maquinas,catTotals.Outros], backgroundColor: ["#2d7d32","#1565c0","#e65100","#9e9e9e"], borderWidth: 0, hoverOffset: 8 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx){ return ctx.label+": R$ "+parseFloat(ctx.raw||0).toLocaleString("pt-BR",{minimumFractionDigits:2}); } } } }, cutout: "65%" }
    });
  }

  // CHART 2: Bar - Lancamentos por Mes
  var ctxB = safeChart("chartBar");
  if (ctxB) {
    new Chart(ctxB, {
      type: "bar",
      data: {
        labels: monthLabels,
        datasets: [
          { label: "Despesas", data: monthDesp, backgroundColor: "rgba(198,40,40,0.7)", borderRadius: 4 },
          { label: "Receitas", data: monthRec, backgroundColor: "rgba(45,125,50,0.7)", borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label+": "+fmtBrl(ctx.raw||0); } } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#f5f5f5" }, ticks: { callback: function(v){ return "R$"+Math.round(v/1000)+"k"; } } } } }
    });
  }

  // CHART 3: ROI por Fechamento (horizontal bar)
  var ctxR = safeChart("chartRoi");
  if (ctxR && fechComRoi.length > 0) {
    var roiColors = fechRoi.map(function(v){ return v>=0?"rgba(45,125,50,0.75)":"rgba(198,40,40,0.75)"; });
    new Chart(ctxR, {
      type: "bar",
      data: {
        labels: fechLabels,
        datasets: [{ label: "ROI %", data: fechRoi, backgroundColor: roiColors, borderRadius: 4 }]
      },
      options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: function(ctx){ return "ROI: "+ctx.raw.toFixed(1)+"%"; } } } }, scales: { x: { grid: { color: "#f5f5f5" }, ticks: { callback: function(v){ return v+"%"; } } }, y: { grid: { display: false } } } }
    });
  }

  // CHART 4: Receita vs Custo (grouped bar)
  var ctxC = safeChart("chartCompar");
  if (ctxC && safrasComDados.length > 0) {
    var compLabels = safrasComDados.map(function(f){ return f.safras?f.safras.nome.substring(0,10):"-"; });
    var compReceita = safrasComDados.map(function(f){ return parseFloat(f.receita_vendas||0); });
    var compCusto = safrasComDados.map(function(f){ return parseFloat(f.custo_total||0); });
    new Chart(ctxC, {
      type: "bar",
      data: {
        labels: compLabels,
        datasets: [
          { label: "Receita", data: compReceita, backgroundColor: "rgba(45,125,50,0.75)", borderRadius: 4 },
          { label: "Custo Total", data: compCusto, backgroundColor: "rgba(198,40,40,0.75)", borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "top", labels: { font: { size: 11 } } }, tooltip: { callbacks: { label: function(ctx){ return ctx.dataset.label+": "+fmtBrl(ctx.raw||0); } } } }, scales: { x: { grid: { display: false } }, y: { grid: { color: "#f5f5f5" }, ticks: { callback: function(v){ return "R$"+Math.round(v/1000)+"k"; } } } } }
    });
  }

}; // end module_dashboard
window.module_dashboard();
