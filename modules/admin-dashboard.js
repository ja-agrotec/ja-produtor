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

  
  // ROW 1: Charts 2-column compact
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">";
  // Chart 1: Doughnut Custos
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 12px;font-size:14px;color:#333\">&#128202; Composicao de Custos</h3>";
  html += "<div style=\"height:280px;position:relative\">";
  if (totalDesp === 0) {
    html += "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;color:#bbb;font-size:14px\">Sem lancamentos registrados</div>";
  } else {
    html += "<div style=\"display:flex;align-items:center;gap:16px;height:100%\">";
    html += "<div style=\"flex:0 0 180px\"><canvas id=\"chartDoughnut\" height=\"180\"></canvas></div>";
    html += "<div style=\"flex:1\">";
    var catEntries = [{n:"Insumos",v:catTotals.Insumos,c:"#2d7d32"},{n:"Mao de Obra",v:catTotals["Mao de Obra"],c:"#1565c0"},{n:"Maquinas",v:catTotals.Maquinas,c:"#e65100"},{n:"Outros",v:catTotals.Outros,c:"#9e9e9e"}];
    catEntries.forEach(function(e){
      var pct = totalDesp > 0 ? (e.v / totalDesp * 100).toFixed(1) : 0;
      html += "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:10px\">";
      html += "<div style=\"width:12px;height:12px;border-radius:2px;background:"+e.c+";flex-shrink:0\"></div>";
      html += "<div style=\"flex:1;font-size:12px;color:#555\">"+e.n+"</div>";
      html += "<div style=\"font-size:12px;font-weight:600;color:#333\">"+pct+"%</div>";
      html += "</div>";
    });
    html += "<div style=\"margin-top:8px;padding-top:8px;border-top:1px solid #eee;font-size:12px;color:#666\">Total: "+fmtBrl(totalDesp)+"</div>";
    html += "</div></div>";
  }
  html += "</div></div>";
  // Chart 2: Bar Lancamentos
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 12px;font-size:14px;color:#333\">&#128197; Lancamentos por Mes</h3>";
  html += "<div style=\"display:flex;gap:12px;margin-bottom:12px;flex-wrap:wrap\">";
  html += "<span style=\"display:flex;align-items:center;gap:4px;font-size:11px;color:#555\"><span style=\"width:10px;height:10px;background:#c62828;border-radius:2px;display:inline-block\"></span>Despesas</span>";
  html += "<span style=\"display:flex;align-items:center;gap:4px;font-size:11px;color:#555\"><span style=\"width:10px;height:10px;background:#2d7d32;border-radius:2px;display:inline-block\"></span>Receitas</span>";
  html += "</div>";
  html += "<div style=\"height:220px;position:relative\">";
  if (monthKeys.length === 0) {
    html += "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;color:#bbb;font-size:14px\">Sem lancamento registrado</div>";
  } else {
    html += "<canvas id=\"chartBar\" height=\"200\"></canvas>";
  }
  html += "</div></div>";
  html += "</div>";

  // ROW 2: ROI + Comparativo
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">";
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 12px;font-size:14px;color:#333\">&#128200; ROI por Safra</h3>";
  html += "<div style=\"height:220px;position:relative\">";
  if (!fechamentos || fechamentos.length === 0) {
    html += "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;color:#bbb;font-size:14px\">Sem fechamentos para comparar</div>";
  } else {
    html += "<canvas id=\"chartRoi\" height=\"180\"></canvas>";
  }
  html += "</div></div>";
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 12px;font-size:14px;color:#333\">&#127981; Custo por Fazenda</h3>";
  html += "<div style=\"height:220px;position:relative\">";
  if (fazendas.length === 0) {
    html += "<div style=\"display:flex;align-items:center;justify-content:center;height:100%;color:#bbb;font-size:14px\">Sem fazendas para comparar</div>";
  } else {
    html += "<canvas id=\"chartCompar\" height=\"180\"></canvas>";
  }
  html += "</div></div>";
  html += "</div>";

  // ROW 3: Top Insumos + Safras Performance table
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">";
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#127807; Top Insumos por Custo</h3>";
  var insByInsumo = {};
  lancs.filter(function(l){return l.tipo==="despesa" && l.insumo_id;}).forEach(function(l){
    var nome = l.insumos ? l.insumos.nome : l.insumo_id;
    insByInsumo[nome] = (insByInsumo[nome]||0) + parseFloat(l.custo_total||0);
  });
  var topInsumos = Object.keys(insByInsumo).map(function(k){return {n:k,v:insByInsumo[k]};}).sort(function(a,b){return b.v-a.v;}).slice(0,5);
  if (topInsumos.length === 0) {
    html += "<div style=\"color:#bbb;font-size:13px;text-align:center;padding:20px\">Sem dados de insumos</div>";
  } else {
    topInsumos.forEach(function(ins,i){
      var pct = totalDesp > 0 ? (ins.v / totalDesp * 100).toFixed(1) : 0;
      html += "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:10px\">";
      html += "<div style=\"width:20px;height:20px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;font-size:10px;color:#2d7d32;font-weight:700\">"+(i+1)+"</div>";
      html += "<div style=\"flex:1\">";
      html += "<div style=\"font-size:12px;color:#333;font-weight:500\">"+ins.n+"</div>";
      html += "<div style=\"height:4px;background:#eee;border-radius:2px;margin-top:3px\">";
      html += "<div style=\"height:4px;background:#2d7d32;border-radius:2px;width:"+Math.min(pct,100)+"%\"></div></div>";
      html += "</div>";
      html += "<div style=\"font-size:11px;color:#666;white-space:nowrap\">"+fmtBrl(ins.v)+"</div>";
      html += "</div>";
    });
  }
  html += "</div>";
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#127758; Performance por Safra</h3>";
  if (!safras || safras.length === 0) {
    html += "<div style=\"color:#bbb;font-size:13px;text-align:center;padding:20px\">Sem safras cadastradas</div>";
  } else {
    html += "<table style=\"width:100%;border-collapse:collapse;font-size:12px\">";
    html += "<thead><tr style=\"border-bottom:2px solid #eee\">";
    html += "<th style=\"text-align:left;padding:4px 6px;color:#666;font-weight:600\">Safra</th>";
    html += "<th style=\"text-align:center;padding:4px 6px;color:#666;font-weight:600\">Cultura</th>";
    html += "<th style=\"text-align:right;padding:4px 6px;color:#666;font-weight:600\">Status</th>";
    html += "</tr></thead><tbody>";
    safras.slice(0,6).forEach(function(s){
      var statusColor = s.status==="aberta"?"#2d7d32":s.status==="planejamento"?"#e65100":"#555";
      html += "<tr style=\"border-bottom:1px solid #f5f5f5\">";
      html += "<td style=\"padding:6px;color:#333;font-size:11px\">"+s.nome+"</td>";
      html += "<td style=\"padding:6px;text-align:center;color:#555;font-size:11px\">"+(s.cultura||"-")+"</td>";
      html += "<td style=\"padding:6px;text-align:right\"><span style=\"background:"+statusColor+"20;color:"+statusColor+";font-size:10px;padding:2px 6px;border-radius:10px;font-weight:600\">"+s.status+"</span></td>";
      html += "</tr>";
    });
    html += "</tbody></table>";
  }
  html += "</div>";
  html += "</div>";

  // ROW 4: Vendas por Cultura + Resumo Geral
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">";
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#127807; Vendas por Cultura</h3>";
  var vendasPorCultura = {};
  vendas.forEach(function(v){
    var cult = v.cultura || "outros";
    if (!vendasPorCultura[cult]) vendasPorCultura[cult] = {sc:0, val:0, qtd:0};
    vendasPorCultura[cult].sc += parseFloat(v.quantidade_sc||0);
    vendasPorCultura[cult].val += parseFloat(v.quantidade_sc||0) * parseFloat(v.preco_saca||0);
    vendasPorCultura[cult].qtd += 1;
  });
  var cultColors = {soja:"#2d7d32",milho:"#f9a825",cafe:"#4e342e",cana:"#1565c0",outros:"#9e9e9e"};
  if (Object.keys(vendasPorCultura).length === 0) {
    html += "<div style=\"color:#bbb;font-size:13px;text-align:center;padding:20px\">Sem vendas registradas</div>";
  } else {
    Object.keys(vendasPorCultura).forEach(function(cult){
      var d = vendasPorCultura[cult];
      var col = cultColors[cult] || "#9e9e9e";
      html += "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:12px;padding:10px;background:#f9f9f9;border-radius:8px;border-left:3px solid "+col+"\">"
;      html += "<div style=\"flex:1\">";
      html += "<div style=\"font-size:13px;font-weight:600;color:#333;text-transform:capitalize\">"+cult+"</div>";
      html += "<div style=\"font-size:11px;color:#666\">"+fmtSc(d.sc)+" sc &bull; "+d.qtd+" contrato(s)</div>";
      html += "</div>";
      html += "<div style=\"font-size:13px;font-weight:700;color:"+col+"\">"+fmtBrl(d.val)+"</div>";
      html += "</div>";
    });
  }
  html += "</div>";
  html += "<div style=\"background:#fff;border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<h3 style=\"margin:0 0 14px;font-size:14px;color:#333\">&#9888;&#65039; Alertas do Sistema</h3>";
  var alertas = [];
  if (insumos.filter(function(i){return parseFloat(i.estoque_atual||0)<parseFloat(i.estoque_minimo||0);}).length > 0) alertas.push({icon:"&#128994;",txt:"Estoque critico: "+insumos.filter(function(i){return parseFloat(i.estoque_atual||0)<parseFloat(i.estoque_minimo||0);}).length+" insumo(s) abaixo do minimo",cor:"#e65100"});
  var vencendoCount = vendas.filter(function(v){if(!v.data_entrega)return false;var d=new Date(v.data_entrega);var hoje=new Date();var diff=(d-hoje)/86400000;return diff>=0&&diff<=30&&v.status!=="entregue";}).length;
  if (vencendoCount > 0) alertas.push({icon:"&#128336;",txt:"Contratos vencendo em 30 dias: "+vencendoCount,cor:"#f9a825"});
  if (safras.filter(function(s){return s.status==="aberta";}).length === 0) alertas.push({icon:"&#128200;",txt:"Nenhuma safra aberta no momento",cor:"#1565c0"});
  if (alertas.length === 0) {
    html += "<div style=\"display:flex;align-items:center;gap:10px;padding:16px;background:#e8f5e9;border-radius:8px;color:#2d7d32;font-size:13px\">&#9989; Sem alertas - sistema operando normalmente</div>";
  } else {
    alertas.forEach(function(a){
      html += "<div style=\"display:flex;align-items:flex-start;gap:10px;padding:10px 12px;background:"+a.cor+"15;border-radius:8px;border-left:3px solid "+a.cor+";margin-bottom:8px\">";
      html += "<span style=\"font-size:16px\">"+a.icon+"</span>";
      html += "<span style=\"font-size:12px;color:#333\">"+a.txt+"</span>";
      html += "</div>";
    });
  }
  html += "</div>";
  html += "</div>";
  c.innerHTML = html;

  // Chart initialization
  function safeChart(id) {
    var el = document.getElementById(id);
    if (!el) return null;
    return el.getContext ? el.getContext("2d") : null;
  }

  var ctxD = safeChart("chartDoughnut");
  if (ctxD) {
    new Chart(ctxD, {
      type: "doughnut",
      data: {
        labels: ["Insumos","Mao de Obra","Maquinas","Outros"],
        datasets: [{ data: [catTotals.Insumos, catTotals["Mao de Obra"], catTotals.Maquinas, catTotals.Outros], backgroundColor: ["#2d7d32","#1565c0","#e65100","#9e9e9e"], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, cutout: "70%" }
    });
  }

  var ctxB = safeChart("chartBar");
  if (ctxB && monthLabels.length > 0) {
    new Chart(ctxB, {
      type: "bar",
      data: {
        labels: monthLabels,
        datasets: [
          { label: "Despesas", data: monthDesp, backgroundColor: "rgba(198,40,40,0.7)", borderRadius: 4 },
          { label: "Receitas", data: monthRec, backgroundColor: "rgba(45,125,50,0.7)", borderRadius: 4 }
        ]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, ticks: { callback: function(v){ return "R$"+(v/1000).toFixed(0)+"k"; }, font: { size: 10 } } } } }
    });
  }

}; // end module_dashboard
window.module_dashboard();
