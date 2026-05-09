window.module_home = async function() {
  var c = document.getElementById("mainContent");
  if (!c) return;
  c.innerHTML = "<div style=\"padding:20px;text-align:center;color:#888\">Carregando inteligência da operação...</div>";

  // Helper functions
  function fmtBrl(n) { return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtSc(n) { return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}); }
  function fmtPct(n) { return parseFloat(n||0).toFixed(1) + "%"; }
  function fmtDate(d) { if(!d) return ""; var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }
  function navTo(mod) { var el=document.querySelector("[data-module=\""+mod+"\"]"); if(el) el.click(); }

  // Greeting
  var h = new Date().getHours();
  var greet = h<12 ? "Bom dia" : h<18 ? "Boa tarde" : "Boa noite";
  var emoji = h<12 ? "&#128161;" : h<18 ? "&#9728;&#65039;" : "&#127769;";
  var hoje = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long",year:"numeric"});

  // Load all data in parallel
  var [fazRes, usrRes, talRes, safRes, lancRes, insRes, fechRes, vendRes] = await Promise.all([
    sb.from("fazendas").select("id,nome,cidade,estado,area_total_ha,certificada").eq("ativo",true).order("nome"),
    sb.from("usuarios").select("id").eq("ativo",true),
    sb.from("talhoes").select("id,nome,area_ha,fazenda_id").eq("ativo",true),
    sb.from("safras").select("id,nome,cultura,ano_agricola,status,fazenda_id,produção_sc,produtividade_sc_ha,custo_total,receita_total").order("criado_em",{ascending:false}),
    sb.from("lancamentos").select("id,tipo,custo_total,data_lancamento,descricao,status").eq("status","confirmado").order("data_lancamento",{ascending:false}).limit(8),
    sb.from("insumos").select("id,nome,estoque_atual,estoque_minimo").eq("ativo",true),
    sb.from("fechamento_safra").select("*,safras(nome,cultura,ano_agricola),fazendas(nome)").order("criado_em",{ascending:false}).limit(5),
    sb.from("vendas_grãos").select("id,quantidade_sc,preco_saca,status,cultura,safra_id,fazenda_id").order("criado_em",{ascending:false}).limit(20)
  ]);

  var fazendas = (fazRes.data || []);
  var usuarios = (usrRes.data || []);
  var talhoes = (talRes.data || []);
  var safras = (safRes.data || []);
  var lancs = (lancRes.data || []);
  var insumos = (insRes.data || []);
  var fechamentos = (fechRes.data || []);
  var vendas = (vendRes.data || []);

  // Fazenda selecionada (persistida em sessionStorage)
  var _homeFazSel = sessionStorage.getItem('homeFazSel') || 'todas';
  var _homeFazObj = fazendas.find(function(f){ return f.id === _homeFazSel; }) || null;
  window._homeChangeFaz = function(val){
    sessionStorage.setItem('homeFazSel', val);
    window.module_home();
  };

  // Filtrar dados pela fazenda selecionada
  if(_homeFazSel && _homeFazSel !== 'todas'){
    safras = safras.filter(function(s){ return s.fazenda_id === _homeFazSel; });
    lancs = lancs.filter(function(l){ return l.fazenda_id === _homeFazSel; });
    fechamentos = fechamentos.filter(function(f){ return f.fazenda_id === _homeFazSel; });
    vendas = vendas.filter(function(v){ return v.fazenda_id === _homeFazSel; });
  }

  // Compute KPIs
  var safrasAbertas = safras.filter(function(s){ return s.status==="aberta"; });
  var insBaixos = insumos.filter(function(i){ return parseFloat(i.estoque_atual||0) < parseFloat(i.estoque_minimo||0); });
  var totalDesp = lancs.filter(function(l){ return l.tipo==="despesa"; }).reduce(function(a,l){ return a+parseFloat(l.custo_total||0); },0);
  var totalRec = lancs.filter(function(l){ return l.tipo==="receita"; }).reduce(function(a,l){ return a+parseFloat(l.custo_total||0); },0);

  // Fechamento KPIs
  var ultimoFech = fechamentos[0] || null;
  var roiUlt = 0;
  if (ultimoFech && parseFloat(ultimoFech.custo_total||0) > 0) {
    roiUlt = ((parseFloat(ultimoFech.receita_vendas||0) - parseFloat(ultimoFech.custo_total||0)) / parseFloat(ultimoFech.custo_total||0)) * 100;
  }

  // Vendas KPIs
  var totalContratado = vendas.reduce(function(a,v){ return a+parseFloat(v.quantidade_sc||0); },0);
  var vendaAberta = vendas.filter(function(v){ return v.status==="aberto"||v.status==="parcialmente_entregue"; }).length;
  var receitaVendas = vendas.reduce(function(a,v){ return a+parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0); },0);

  // Dicas do agronomo
  var dicas = [
    "&#127807; Monitoramento frequente de pragas reduz custos de controle em ate 40%.",
    "&#128167; Análise de solo a cada 2 anos garante adubação mais precisa e econômica.",
    "&#127775; Semeadura na epoca correta pode aumentar a produtividade em 15-20%.",
    "&#9748; A irrigacao suplementar no periodo critico valoriza 5 sc/ha em media.",
    "&#128300; Variedades resistentes reduzem custo de fungicidas em ate 30%.",
    "&#127822; Integrar lavoura-pecuaria-floresta aumenta resiliencia do sistema.",
    "&#128209; Registro detalhado de lancamentos permite identificar gargalos de custo.",
    "&#9881; Manutencao preventiva de maquinas reduz paradas em ate 60% no plantio."
  ];
  var dica = dicas[new Date().getDate() % dicas.length];

  // Weather â Open-Meteo (gratuito, sem API key)
  var climaHtml = "<div style=\"color:#ccc;font-size:12px;padding:8px\">Carregando clima...</div>";
  var _fazCidade = _homeFazObj ? (_homeFazObj.cidade||"") + (_homeFazObj.estado ? ","+_homeFazObj.estado : "") : (fazendas[0] ? (fazendas[0].cidade||"") + (fazendas[0].estado ? ","+fazendas[0].estado : "") : "");
  try {
    var geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name="+encodeURIComponent(_fazCidade||"Patrocinio,MG")+"&count=1&language=pt&format=json";
    var geoResp = await fetch(geoUrl);
    var geoData = await geoResp.json();
    var lat = geoData.results && geoData.results[0] ? geoData.results[0].latitude : -18.94;
    var lon = geoData.results && geoData.results[0] ? geoData.results[0].longitude : -46.99;
    var meteoUrl = "https://api.open-meteo.com/v1/forecast?latitude="+lat+"&longitude="+lon+"&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max&current_weather=true&timezone=America%2FSao_Paulo&forecast_days=4";
    var meteoResp = await fetch(meteoUrl);
    var meteoData = await meteoResp.json();
    var wCur = meteoData.current_weather||{};
    var wDaily = meteoData.daily||{};
    function _wIcon(code){
      if(code===0) return "âï¸";
      if(code<=2) return "ð¤ï¸";
      if(code<=3) return "âï¸";
      if(code<=48) return "ð«ï¸";
      if(code<=57) return "ð§ï¸";
      if(code<=67) return "ð§ï¸";
      if(code<=77) return "âï¸";
      if(code<=82) return "ð¦ï¸";
      if(code<=86) return "âï¸";
      if(code<=99) return "âï¸";
      return "ð¡ï¸";
    }
    var dayNames = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
    var forecastHtml = "";
    for(var _d=1; _d<=3; _d++){
      if(!wDaily.time || !wDaily.time[_d]) break;
      var _dt = new Date(wDaily.time[_d]+"T12:00:00");
      var _dn = dayNames[_dt.getDay()];
      var _ic = _wIcon(wDaily.weathercode[_d]);
      var _mx = Math.round(wDaily.temperature_2m_max[_d]);
      var _mn = Math.round(wDaily.temperature_2m_min[_d]);
      var _rain = wDaily.precipitation_sum[_d]||0;
      forecastHtml += "<div style=\"display:flex;flex-direction:column;align-items:center;background:rgba(255,255,255,0.1);border-radius:8px;padding:6px 10px;min-width:60px\">"
        + "<span style=\"font-size:11px;opacity:0.85\">"+_dn+"</span>"
        + "<span style=\"font-size:22px;margin:2px 0\">"+_ic+"</span>"
        + "<span style=\"font-size:12px;font-weight:600\">"+_mx+"Â°/"+_mn+"Â°</span>"
        + "<span style=\"font-size:10px;opacity:0.75\">"+_rain.toFixed(0)+"mm</span>"
        + "</div>";
    }
    var curIcon = _wIcon(wCur.weathercode||0);
    var curTemp = Math.round(wCur.temperature||0);
    var curWind = Math.round(wCur.windspeed||0);
    var cidadeLabel = (geoData.results && geoData.results[0]) ? geoData.results[0].name : _fazCidade;
    climaHtml = "<div style=\"display:flex;flex-direction:column;gap:6px;align-items:flex-end\">"
      + "<div style=\"display:flex;align-items:center;gap:10px\">"
      + "<div style=\"font-size:42px\">"+curIcon+"</div>"
      + "<div><div style=\"font-size:36px;font-weight:700;line-height:1\">"+curTemp+"Â°C</div>"
      + "<div style=\"font-size:12px;opacity:0.85\">"+cidadeLabel+" Â· ð¨ "+curWind+" km/h</div></div>"
      + "</div>"
      + "<div style=\"display:flex;gap:6px;margin-top:4px\">"+forecastHtml+"</div>"
      + "</div>";
  } catch(e) { climaHtml = "<div style=\"color:#ccc;font-size:12px\">Clima indisponível</div>"; }

var html = "";
  // HERO BANNER
  var _saudacao = (function(){
    var h = new Date().getHours();
    if(h < 12) return "Bom dia";
    if(h < 18) return "Boa tarde";
    return "Boa noite";
  })();
  var _nomeFazExib = _homeFazObj ? _homeFazObj.nome : (fazendas.length === 1 ? fazendas[0].nome : null);
  var _saudMsg = _nomeFazExib
    ? _saudacao + ", Produtor! Bem-vindo à <strong>" + _nomeFazExib + "</strong>"
    : _saudacao + ", Produtor!";
  var _fazSelectOpts = "<option value=\"todas\"" + (_homeFazSel==="todas"?" selected":"") + ">ðï¸ Todas as Fazendas</option>"
    + fazendas.map(function(f){ return "<option value=\""+f.id+"\"" + (f.id===_homeFazSel?" selected":"") + ">"+f.nome+"</option>"; }).join("");

  html += "<div style=\"background:linear-gradient(135deg,#1a4b1a 0%,#2d7d32 60%,#1565c0 100%);border-radius:12px;padding:24px 28px;color:#fff;display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;\">"
  html += "<div style=\"flex:1;min-width:220px\">"
  html += "<div style=\"margin-bottom:10px\">"
    + "<select onchange=\"window._homeChangeFaz(this.value)\" style=\"background:#1b4332;border:2px solid rgba(255,255,255,0.6);color:#fff;border-radius:8px;padding:5px 14px;font-size:13px;cursor:pointer;outline:none;min-width:220px\">"
    + _fazSelectOpts
    + "</select></div>"
  html += "<div style=\"font-size:clamp(20px,3vw,28px);font-weight:700\">" + _saudMsg + " ð¾</div>"
  html += "</div>"
  html += climaHtml
  html += "</div>"

// 5 KPI CARDS
  html += "<div style=\"display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:20px\">"
  function kpiCard(label, val, sub, color) {
    return "<div style=\"background:#fff;border-radius:12px;padding:16px 14px;border-left:4px solid "+color+";box-shadow:0 1px 4px rgba(0,0,0,0.07)\">"
      +"<div style=\"font-size:10px;text-transform:uppercase;letter-spacing:0.5px;color:#888\">"+label+"</div>"
      +"<div style=\"font-size:24px;font-weight:800;color:"+color+";margin:4px 0\">"+val+"</div>"
      +"<div style=\"font-size:11px;color:#999\">"+sub+"</div>"
      +"</div>";
  }
  html += kpiCard("Fazendas", fazendas.length, "Ativas no sistema", "#2d7d32");
  html += kpiCard("Usuarios", usuarios.length, "Produtores e equipe", "#1565c0");
  html += kpiCard("Talhoes", talhoes.length, "Total cadastrados", "#e65100");
  html += kpiCard("Safras Abertas", safrasAbertas.length, "Em andamento", "#7b1fa2");
  html += kpiCard("Estoque Critico", insBaixos.length, "Insumos abaixo minimo", insBaixos.length>0?"#c62828":"#2d7d32");
  html += "</div>"

  // ROW 2: ROI CARD (full width) + Vendas Card
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // ROI CARD
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center\">"
  html += "<h3 style=\"margin:0;font-size:14px;color:#333\">&#128200; Fechamentos de Safra</h3>"
  html += "<a href=\"#\" onclick=\"event.preventDefault();document.querySelector('[data-module=fechamento-safra]').click();\" style=\"font-size:12px;color:#2d7d32;text-decoration:none\">Ver todos &rarr;</a>"
  html += "</div>"
  if (fechamentos.length === 0) {
    html += "<div style=\"padding:32px;text-align:center;color:#bbb\">"
    html += "<div style=\"font-size:32px;margin-bottom:8px\">&#128200;</div>"
    html += "<div style=\"font-size:13px\">Nenhum fechamento realizado</div>"
    html += "<button onclick=\"document.querySelector('[data-module=fechamento-safra]').click();\" style=\"margin-top:12px;background:#2d7d32;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px\">Iniciar Fechamento</button>"
    html += "</div>"
  } else {
    // Last fechamento ROI highlight
    var roiCor = roiUlt >= 0 ? "#2d7d32" : "#c62828";
    var roiBg = roiUlt >= 0 ? "#e8f5e9" : "#fce4ec";
    html += "<div style=\"padding:12px 16px;background:"+roiBg+";border-bottom:1px solid #f5f5f5;display:flex;align-items:center;gap:16px\">"
    html += "<div style=\"flex:1\">"
    html += "<div style=\"font-size:10px;color:#888;text-transform:uppercase;letter-spacing:0.5px\">Ultimo Fechamento ROI</div>"
    html += "<div style=\"font-size:28px;font-weight:900;color:"+roiCor+"\">"+fmtPct(roiUlt)+"</div>"
    html += "<div style=\"font-size:11px;color:#888\">"+(ultimoFech.safras?ultimoFech.safras.nome:"-")+" &bull; "+(ultimoFech.fazendas?ultimoFech.fazendas.nome:"-")+"</div>"
    html += "</div>"
    html += "<div style=\"text-align:right;min-width:120px\">"
    html += "<div style=\"font-size:11px;color:#888\">Resultado</div>"
    html += "<div style=\"font-size:16px;font-weight:700;color:"+roiCor+"\">"+fmtBrl(ultimoFech.resultado_liquido)+"</div>"
    html += "<div style=\"font-size:11px;color:#888;margin-top:4px\">Prod: "+fmtSc(ultimoFech.produtividade_sc_ha)+" sc/ha</div>"
    html += "</div>"
    html += "</div>"
    // List of recent fechamentos
    fechamentos.slice(0,4).forEach(function(f){
      var saldo = parseFloat(f.resultado_liquido||0);
      var roi = parseFloat(f.custo_total||0)>0 ? ((parseFloat(f.receita_vendas||0)-parseFloat(f.custo_total||0))/parseFloat(f.custo_total||0)*100) : 0;
      var cor = saldo >= 0 ? "#2d7d32" : "#c62828";
      var sfNome = f.safras ? f.safras.nome : "-";
      var fzNome = f.fazendas ? f.fazendas.nome : "-";
      html += "<div style=\"padding:10px 16px;border-bottom:1px solid #f9f9f9;display:flex;justify-content:space-between;align-items:center\">"
      html += "<div>"
      html += "<div style=\"font-size:13px;font-weight:600;color:#333\">"+sfNome+"</div>"
      html += "<div style=\"font-size:11px;color:#888\">"+fzNome+" &bull; "+fmtDate(f.data_fechamento)+"</div>"
      html += "</div>"
      html += "<div style=\"text-align:right\">"
      html += "<div style=\"font-size:13px;font-weight:700;color:"+cor+"\">ROI: "+roi.toFixed(1)+"%</div>"
      html += "<div style=\"font-size:11px;color:#888\">"+fmtBrl(saldo)+"</div>"
      html += "</div>"
      html += "</div>"
    });
  }
  html += "</div>"

  // VENDAS CARD
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center\">"
  html += "<h3 style=\"margin:0;font-size:14px;color:#333\">&#127807; Vendas</h3>"
  html += "<a href=\"#\" onclick=\"event.preventDefault();document.querySelector('[data-module=vendas-grãos]').click();\" style=\"font-size:12px;color:#2d7d32;text-decoration:none\">Gerenciar &rarr;</a>"
  html += "</div>"
  if (vendas.length === 0) {
    html += "<div style=\"padding:32px;text-align:center;color:#bbb\">"
    html += "<div style=\"font-size:32px;margin-bottom:8px\">&#127807;</div>"
    html += "<div style=\"font-size:13px\">Nenhum contrato de venda</div>"
    html += "<button onclick=\"document.querySelector('[data-module=vendas-grãos]').click();\" style=\"margin-top:12px;background:#1565c0;color:#fff;border:none;border-radius:6px;padding:8px 16px;cursor:pointer;font-size:12px\">Cadastrar Venda</button>"
    html += "</div>"
  } else {
    // Summary bar
    html += "<div style=\"padding:12px 16px;background:#e3f2fd;border-bottom:1px solid #f5f5f5\">"
    html += "<div style=\"display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center\">"
    html += "<div><div style=\"font-size:10px;color:#888\">Contratos</div><div style=\"font-size:20px;font-weight:700;color:#1565c0\">"+vendas.length+"</div></div>"
    html += "<div><div style=\"font-size:10px;color:#888\">Contratado</div><div style=\"font-size:18px;font-weight:700;color:#2d7d32\">"+fmtSc(totalContratado)+" sc</div></div>"
    html += "<div><div style=\"font-size:10px;color:#888\">Receita Contratada</div><div style=\"font-size:14px;font-weight:700;color:#7b1fa2\">"+fmtBrl(receitaVendas)+"</div></div>"
    html += "</div>"
    html += "</div>"
    // Contracts list
    var statusMap = {aberto:"#fff3e0|#e65100|Aberto",parcialmente_entregue:"#e3f2fd|#1565c0|Em Entrega",entregue:"#e8f5e9|#2d7d32|Entregue",cancelado:"#fce4ec|#c62828|Cancelado"};
    vendas.slice(0,5).forEach(function(v){
      var sm = (statusMap[v.status]||"#f5f5f5|#666|Pendente").split("|");
      html += "<div style=\"padding:10px 16px;border-bottom:1px solid #f9f9f9;display:flex;justify-content:space-between;align-items:center\">"
      html += "<div><div style=\"font-size:13px;font-weight:600\">"+v.cultura+"</div>"
      html += "<div style=\"font-size:11px;color:#888\">"+fmtSc(v.quantidade_sc)+" sc &bull; "+fmtBrl(v.preco_saca)+"/sc</div></div>"
      html += "<span style=\"background:"+sm[0]+";color:"+sm[1]+";padding:3px 8px;border-radius:12px;font-size:11px;font-weight:600;white-space:nowrap\">"+sm[2]+"</span>"
      html += "</div>"
    });
    if (vendaAberta > 0) {
      html += "<div style=\"padding:8px 16px;background:#fff8e1;font-size:12px;color:#e65100\">&#9888; "+vendaAberta+" contrato(s) com saldo a entregar</div>"
    }
  }
  html += "</div>"
  html += "</div>"

  // ROW 3: Saúde Safras + Semáforo Estoque
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // SAUDE DAS SAFRAS
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f5f5f5\"><h3 style=\"margin:0;font-size:14px;color:#333\">&#127807; Saúde das Safras</h3></div>"
  if (safrasAbertas.length === 0) {
    html += "<div style=\"padding:24px;text-align:center;color:#bbb;font-size:13px\">Nenhuma safra em andamento</div>"
  } else {
    safrasAbertas.forEach(function(s) {
      var fz = fazendas.find(function(f){ return f.id===s.fazenda_id; });
      var prodSc = parseFloat(s.produtividade_sc_ha||0);
      var saúdeCor = prodSc>60?"#2d7d32":prodSc>45?"#e65100":"#c62828";
      var saúdeIcon = prodSc>60?"&#128994;":prodSc>45?"&#128993;":"&#128308;";
      html += "<div style=\"padding:12px 16px;border-bottom:1px solid #f9f9f9\">"
      html += "<div style=\"display:flex;justify-content:space-between;align-items:center\">"
      html += "<div><div style=\"font-size:13px;font-weight:600\">"+s.nome+"</div>"
      html += "<div style=\"font-size:11px;color:#888\">"+s.cultura+" "+s.ano_agricola+(fz?" &bull; "+fz.nome:"")+"</div></div>"
      html += "<span style=\"font-size:18px\">"+saúdeIcon+"</span>"
      html += "</div>"
      html += "</div>"
    });
  }
  html += "</div>"

  // SEMAFORO ESTOQUE
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f5f5f5\"><h3 style=\"margin:0;font-size:14px;color:#333\">&#128994; Semáforo de Estoque</h3></div>"
  insumos.slice(0,6).forEach(function(ins){
    var atual = parseFloat(ins.estoque_atual||0);
    var min = parseFloat(ins.estoque_minimo||0);
    var ok = atual >= min;
    var pct = min > 0 ? Math.min(100, (atual/min)*100) : 100;
    var semCor = ok ? "#2d7d32" : "#c62828";
    var semIcon = ok ? "&#128994;" : "&#128308;";
    html += "<div style=\"padding:10px 16px;border-bottom:1px solid #f9f9f9\">"
    html += "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:4px\">"
    html += "<span style=\"font-size:12px;color:#444;font-weight:500\">"+semIcon+" "+ins.nome+"</span>"
    html += "<span style=\"font-size:11px;color:"+semCor+";font-weight:600\">"+atual+" / "+min+"</span>"
    html += "</div>"
    html += "<div style=\"background:#f0f0f0;border-radius:3px;height:5px\"><div style=\"background:"+semCor+";height:5px;border-radius:3px;width:"+pct.toFixed(0)+"%\"></div></div>"
    html += "</div>"
  });
  html += "</div>"
  html += "</div>"

  // ROW 4: DICA DO AGRONOMO + AÇÕES RÁPIDAS
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // DICA DO AGRONOMO
  html += "<div style=\"background:linear-gradient(135deg,#e8f5e9,#f1f8e9);border-radius:12px;padding:20px;box-shadow:0 1px 4px rgba(0,0,0,0.06)\">"
  html += "<div style=\"font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#2d7d32;font-weight:700;margin-bottom:8px\">&#127807; Dica do Agronomo</div>"
  html += "<div style=\"font-size:14px;color:#2d7d32;font-weight:600;line-height:1.5\">"+dica+"</div>"
  html += "</div>"

  // AÇÕES RÁPIDAS
  html += "<div style=\"background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.07)\">"
  html += "<div style=\"font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:12px\">&#9889; Ações Rápidas</div>"
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:8px\">"
  var acoes = [
    {label:"+ Lancamento",mod:"lancamentos",bg:"#2d7d32"},
    {label:"Nova Venda",mod:"vendas-grãos",bg:"#1565c0"},
    {label:"Fechar Safra",mod:"fechamento-safra",bg:"#7b1fa2"},
    {label:"Dashboard",mod:"dashboard",bg:"#e65100"},
    {label:"Insumos",mod:"insumos",bg:"#795548"},
    {label:"Certificacao",mod:"certificacao",bg:"#00897b"}
  ];
  acoes.forEach(function(a){
    html += "<button onclick=\"document.querySelector('[data-module="+a.mod+"]').click();\" style=\"background:"+a.bg+";color:#fff;border:none;border-radius:8px;padding:10px;cursor:pointer;font-size:12px;font-weight:600\">"+a.label+"</button>"
  });
  html += "</div></div>"
  html += "</div>"

  // ROW 5: IA RECOMMENDATIONS
  html += "<div style=\"background:#fff;border-radius:12px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.07);margin-bottom:20px\">"
  html += "<div style=\"font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#888;font-weight:700;margin-bottom:14px\">&#129302; Inteligencia Agronomica</div>"
  html += "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:12px\">"

  // IA Agronomica
  var iaAgro = [];
  if (safrasAbertas.length === 0) iaAgro.push("Nenhuma safra ativa. Cadastre uma safra para recomendacoes personalizadas.");
  else iaAgro.push("Safra "+safrasAbertas[0].nome+" em andamento. Monitore pragas e doencas semanalmente.");
  if (insBaixos.length > 0) iaAgro.push(insBaixos.length+" insumo(s) abaixo do minimo. Reabastecer com urgencia para nao comprometer o ciclo.");
  else iaAgro.push("Estoque de insumos adequado. Bom momento para planejar compras da proxima safra.");

  // IA Gerencial
  var iaGer = [];
  if (ultimoFech) { iaGer.push("Ultimo fechamento: ROI de "+fmtPct(roiUlt)+". "+(roiUlt>=15?"Resultado excelente!":roiUlt>=0?"Margem apertada, revisar custos.":"Resultado negativo. Acoes corretivas necessarias.")); }
  else iaGer.push("Realize o primeiro Fechamento de Safra para obter análise gerencial completa com ROI e margens.");
  iaGer.push(fazendas.length+" fazenda(s) ativa(s). "+fazendas.filter(function(f){ return f.certificada; }).length+" com certificacao organica/sustentavel.");

  // IA Financeira
  var iaFin = [];
  if (vendaAberta > 0) iaFin.push(vendaAberta+" contrato(s) com saldo a entregar. Acompanhe prazo de entrega para evitar multas.");
  else if (vendas.length > 0) iaFin.push("Todos contratos de venda entregues. Receita de "+fmtBrl(receitaVendas)+" contratada.");
  else iaFin.push("Sem contratos de venda cadastrados. Cadastre vendas para rastrear receita e fluxo de caixa.");
  iaFin.push("Lancamentos recentes: "+lancs.length+" registros. Mantenha lancamentos atualizados para fechamento preciso.");

  function iaCard(emoji, titulo, msgs, cor) {
    var o = "<div style=\"background:#f8f9fa;border-radius:10px;padding:14px;border-left:3px solid "+cor+"\">";
    o += "<div style=\"font-size:18px;margin-bottom:6px\">"+emoji+"</div>";
    o += "<div style=\"font-size:11px;font-weight:700;color:#333;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px\">"+titulo+"</div>";
    msgs.forEach(function(m){ o += "<div style=\"font-size:12px;color:#555;margin-bottom:6px;line-height:1.4\">"+m+"</div>"; });
    o += "</div>";
    return o;
  }
  html += iaCard("&#127807;","Agronomica",iaAgro,"#2d7d32");
  html += iaCard("&#128200;","Gerencial",iaGer,"#1565c0");
  html += iaCard("&#128176;","Financeira",iaFin,"#7b1fa2");
  html += "</div></div>"

  // ROW 6: RESUMO FAZENDAS + ULTIMOS LANCAMENTOS
  html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px\">"

  // FAZENDAS
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f5f5f5\"><h3 style=\"margin:0;font-size:14px;color:#333\">&#127968; Minhas Fazendas</h3></div>"
  fazendas.slice(0,5).forEach(function(f){
    html += "<div style=\"padding:10px 16px;border-bottom:1px solid #f9f9f9;display:flex;justify-content:space-between;align-items:center\">"
    html += "<div><div style=\"font-size:13px;font-weight:600;color:#333\">"+f.nome+(f.certificada?" &#127985;":"")+"</div>"
    html += "<div style=\"font-size:11px;color:#888\">"+(f.cidade||"")+","+(f.estado||"")+" &bull; "+(f.area_total_ha||0)+" ha</div></div>"
    html += "<span style=\"font-size:18px\">&#127968;</span>"
    html += "</div>"
  });
  html += "</div>"

  // ULTIMOS LANCAMENTOS
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);overflow:hidden\">"
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f5f5f5;display:flex;justify-content:space-between;align-items:center\">"
  html += "<h3 style=\"margin:0;font-size:14px;color:#333\">&#128203; Ultimos Lancamentos</h3>"
  html += "<a href=\"#\" onclick=\"event.preventDefault();document.querySelector('[data-module=lancamentos]').click();\" style=\"font-size:12px;color:#2d7d32;text-decoration:none\">Ver todos &rarr;</a>"
  html += "</div>"
  if (lancs.length === 0) {
    html += "<div style=\"padding:24px;text-align:center;color:#bbb;font-size:13px\">Nenhum lancamento recente</div>"
  } else {
    lancs.forEach(function(l){
      var isDespesa = l.tipo === "despesa";
      var cor = isDespesa ? "#c62828" : "#2d7d32";
      html += "<div style=\"padding:8px 16px;border-bottom:1px solid #f9f9f9;display:flex;justify-content:space-between;align-items:center\">"
      html += "<div><div style=\"font-size:12px;font-weight:500;color:#333\">"+( l.descricao||l.tipo )+"</div>"
      html += "<div style=\"font-size:11px;color:#888\">"+fmtDate(l.data_lancamento)+"</div></div>"
      html += "<div style=\"font-size:13px;font-weight:600;color:"+cor+"\">"+( isDespesa?"-":"+" )+fmtBrl(l.custo_total)+"</div>"
      html += "</div>"
    });
  }
  html += "</div>"
  html += "</div>"

  // FOOTER
  var ts = new Date().toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit"});
  html += "<div style=\"text-align:center;padding:12px;color:#bbb;font-size:11px;margin-bottom:8px\">"
  html += "&#9201; Atualizado em "+ts+" &bull; JA Agro Intelligence v2.0"
  html += "</div>"

  html += "</div>"

  c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";
};
window.module_home();
