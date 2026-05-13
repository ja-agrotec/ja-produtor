window.module_fechamento_safra = async function(){
  var root = document.getElementById("mainContent") || document.getElementById("moduleArea") || document.getElementById("conteudo") || document.querySelector(".main-content") || document.body;
  if(typeof sb === "undefined"){ root.innerHTML = "<p style=padding:20px>Conexao com banco de dados nao inicializada.</p>"; return; }

  function fmtBrl(n){ return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtBrlK(n){ var v=parseFloat(n||0); if(Math.abs(v)>=1e6) return "R$ "+(v/1e6).toFixed(2)+"M"; if(Math.abs(v)>=1e3) return "R$ "+(v/1e3).toFixed(1)+"k"; return fmtBrl(v); }
  function fmtSc(n){ return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:1}); }
  function fmtHa(n){ return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}) + " ha"; }
  function fmtPct(n){ return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:1,maximumFractionDigits:1}) + "%"; }
  function fmtDate(d){ if(!d) return "-"; try{ return new Date(d).toLocaleDateString("pt-BR"); }catch(e){ return d; } }
  function esc(s){ return String(s||"").replace(/[&<>"']/g,function(c){return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c];}); }
  function statusBadge(st){
    var cfg = {confirmado:["#1e7e34","#d4edda","Confirmado"], rascunho:["#856404","#fff3cd","Rascunho"], pendente:["#856404","#fff3cd","Pendente"], cancelado:["#721c24","#f8d7da","Cancelado"]};
    var c = cfg[st] || ["#444","#eee", st||"-"];
    return "<span style='background:"+c[1]+";color:"+c[0]+";padding:3px 10px;border-radius:12px;font-size:12px;font-weight:600;'>"+c[2]+"</span>";
  }
  function medal(i){ return i===0?"&#129351;":i===1?"&#129352;":i===2?"&#129353;":"#"+(i+1); }
  function trend(real, ref, inverso){
    if(!ref || isNaN(ref)) return "";
    var diff = ((real-ref)/ref)*100;
    var ok = inverso ? diff<0 : diff>0;
    var sign = diff>=0?"+":"";
    var color = ok?"#28a745":"#dc3545";
    return "<span style='color:"+color+";font-size:11px;font-weight:600;margin-left:6px;'>"+sign+diff.toFixed(1)+"%</span>";
  }
  var BENCH = {Soja:{custoSc:90,prod:60,margem:25}, Milho:{custoSc:35,prod:170,margem:20}, Cafe:{custoSc:600,prod:30,margem:30}, Cana:{custoSc:60,prod:80,margem:18}, Algodao:{custoSc:300,prod:280,margem:22}, Trigo:{custoSc:45,prod:55,margem:18}, Sorgo:{custoSc:30,prod:90,margem:15}, Feijao:{custoSc:120,prod:30,margem:20}, Arroz:{custoSc:50,prod:120,margem:15}};

    async function ensureChart(){
    if(window.Chart) return true;
    return new Promise(function(res){
      var s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      s.onload = function(){ res(true); };
      s.onerror = function(){ res(false); };
      document.head.appendChild(s);
    });
  }
  await ensureChart();
  root.innerHTML = '<div style="padding:8px 16px 60px;max-width:1280px;margin:0 auto;"><div id="fsTabs" style="display:flex;gap:6px;border-bottom:2px solid #e0e0e0;margin-bottom:18px;flex-wrap:wrap;"></div><div id="fsContent">Carregando...</div></div>';

  var TABS = [
    {id:"visao", label:"&#128202; Visao Geral"},
    {id:"lista", label:"&#128203; Lista Detalhada"},
    {id:"comp",  label:"&#127942; Comparativo"},
    {id:"novo",  label:"&#10133; Novo Fechamento"}
  ];
  var activeTab = "visao";
  function renderTabs(){
    var el = document.getElementById("fsTabs");
    el.innerHTML = TABS.map(function(t){
      var act = t.id===activeTab;
      return "<button data-tab='"+t.id+"' style='padding:10px 18px;border:none;background:"+(act?"#1e7e34":"transparent")+";color:"+(act?"#fff":"#444")+";border-radius:8px 8px 0 0;font-weight:600;cursor:pointer;font-size:14px;transition:all .15s;'>"+t.label+"</button>";
    }).join("");
    Array.from(el.querySelectorAll("button")).forEach(function(b){
      b.addEventListener("click", function(){ activeTab = b.getAttribute("data-tab"); renderTabs(); renderContent(); });
    });
  }

  var DATA = null;
  async function loadData(){
    var fazFilter = sessionStorage.getItem("homeFazSel");
    var q = sb.from("fechamento_safra").select("*,safras(id,nome,cultura,ano_agricola,fazenda_id,data_plantio,data_colheita,fazendas(nome)),fechamento_talhao(id,talhao_id,area_ha,producao_sc,produtividade_sc_ha,custo_total,custo_sc,resultado_liquido,status_talhao,talhoes(nome))").order("data_fechamento",{ascending:false});
    if(fazFilter && fazFilter!=="all" && fazFilter!=="todas" && fazFilter.length>=10){ q = q.eq("fazenda_id", fazFilter); }
    var r = await q;
    var fechs = r.data || [];
    var vendasR = await sb.from("vendas_graos").select("safra_id,quantidade_sc,preco_saca,cultura,status").in("status",["confirmado","entregue","faturado"]).limit(2000);
    var fazsR = await sb.from("fazendas").select("id,nome");
    return { fechs: fechs, vendas: vendasR.data||[], fazendas: fazsR.data||[], err: r.error };
  }

  function renderVisao(){
    var c = document.getElementById("fsContent");
    if(!DATA){ c.innerHTML = "Carregando..."; return; }
    var fechs = DATA.fechs;
    if(!fechs.length){
      c.innerHTML = '<div style="background:#fff;padding:60px 30px;border-radius:12px;text-align:center;box-shadow:0 2px 8px rgba(0,0,0,.06);"><div style="font-size:64px;">&#128202;</div><h2 style="color:#444;margin:12px 0;">Nenhum fechamento de safra ainda</h2><p style="color:#888;">Inicie o primeiro fechamento na aba "Novo Fechamento" para apurar resultados e gerar relatorios.</p></div>';
      return;
    }
    var totReceita=0, totCusto=0, totInsumos=0, totMaoObra=0, totMaqs=0, totDep=0, totOutros=0, totArea=0, totProd=0, somaMargem=0, confs=0, rasc=0;
    fechs.forEach(function(f){
      totReceita+=parseFloat(f.receita_vendas||0);
      totCusto+=parseFloat(f.custo_total||0);
      totInsumos+=parseFloat(f.custo_insumos||0);
      totMaoObra+=parseFloat(f.custo_mao_obra||0);
      totMaqs+=parseFloat(f.custo_maquinas||0);
      totDep+=parseFloat(f.custo_depreciacao||0);
      totOutros+=parseFloat(f.custo_outros||0);
      totArea+=parseFloat(f.area_total_ha||0);
      totProd+=parseFloat(f.producao_total_sc||0);
      somaMargem+=parseFloat(f.margem_pct||0);
      if(f.status==="confirmado") confs++; else rasc++;
    });
    var margemMedia = fechs.length ? (somaMargem/fechs.length) : 0;
    var resultLiq = totReceita - totCusto;
    var roi = totCusto ? (resultLiq/totCusto)*100 : 0;
    var ordMargem = fechs.slice().sort(function(a,b){ return parseFloat(b.margem_pct||0) - parseFloat(a.margem_pct||0); });
    var melhor = ordMargem[0];
    var pior = ordMargem[ordMargem.length-1];

    var html = "";
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-bottom:18px;">';
    var kpis = [
      {l:"Fechamentos", v:fechs.length+"", sub: confs+" confirmados"+(rasc?" / "+rasc+" rascunho":""), cor:"#1e7e34"},
      {l:"Receita Total", v:fmtBrlK(totReceita), sub:"em vendas", cor:"#2e7d32"},
      {l:"Custo Total", v:fmtBrlK(totCusto), sub:fmtBrl(totCusto/(totArea||1))+"/ha medio", cor:"#c0392b"},
      {l:"Resultado", v:fmtBrlK(resultLiq), sub:(resultLiq>=0?"Lucro":"Prejuizo"), cor:resultLiq>=0?"#1565c0":"#c0392b"},
      {l:"Margem Media", v:fmtPct(margemMedia), sub:"ROI "+fmtPct(roi), cor:"#7b1fa2"},
      {l:"Area Apurada", v:fmtHa(totArea), sub:fmtSc(totProd)+" sc", cor:"#37474f"}
    ];
    kpis.forEach(function(k){
      html += '<div style="background:#fff;border-left:4px solid '+k.cor+';padding:14px 16px;border-radius:8px;box-shadow:0 2px 6px rgba(0,0,0,.05);">'
        +'<div style="font-size:12px;color:#666;text-transform:uppercase;letter-spacing:.5px;">'+k.l+'</div>'
        +'<div style="font-size:22px;font-weight:700;color:'+k.cor+';margin:4px 0;">'+k.v+'</div>'
        +'<div style="font-size:11px;color:#888;">'+k.sub+'</div></div>';
    });
    html += '</div>';

    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:14px;margin-bottom:18px;">';
    html += '<div style="background:#fff;padding:16px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.05);"><h4 style="margin:0 0 10px;color:#333;">&#128200; Composicao de Custos</h4><canvas id="fsChartCustos" height="220"></canvas></div>';
    html += '<div style="background:#fff;padding:16px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.05);"><h4 style="margin:0 0 10px;color:#333;">&#127806; Receita por Cultura</h4><canvas id="fsChartCulturas" height="220"></canvas></div>';
    html += '<div style="background:#fff;padding:16px;border-radius:10px;box-shadow:0 2px 6px rgba(0,0,0,.05);"><h4 style="margin:0 0 10px;color:#333;">&#128202; Margem por Fechamento</h4><canvas id="fsChartMargem" height="220"></canvas></div>';
    html += '</div>';

    if(melhor && pior && melhor!==pior){
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:18px;">';
      html += '<div style="background:linear-gradient(135deg,#e8f5e9,#c8e6c9);padding:16px;border-radius:10px;border-left:4px solid #1e7e34;">'
        +'<div style="font-size:11px;color:#1e7e34;font-weight:700;letter-spacing:.5px;">&#127942; MELHOR DESEMPENHO</div>'
        +'<div style="font-size:17px;font-weight:700;color:#1b5e20;margin:6px 0;">'+esc(melhor.safras&&melhor.safras.nome||"-")+'</div>'
        +'<div style="font-size:13px;color:#2e7d32;">Margem '+fmtPct(melhor.margem_pct)+' &middot; '+esc(melhor.safras&&melhor.safras.fazendas&&melhor.safras.fazendas.nome||"-")+'</div></div>';
      html += '<div style="background:linear-gradient(135deg,#ffebee,#ffcdd2);padding:16px;border-radius:10px;border-left:4px solid #c62828;">'
        +'<div style="font-size:11px;color:#c62828;font-weight:700;letter-spacing:.5px;">&#9888; ATENCAO REQUERIDA</div>'
        +'<div style="font-size:17px;font-weight:700;color:#b71c1c;margin:6px 0;">'+esc(pior.safras&&pior.safras.nome||"-")+'</div>'
        +'<div style="font-size:13px;color:#c62828;">Margem '+fmtPct(pior.margem_pct)+' &middot; '+esc(pior.safras&&pior.safras.fazendas&&pior.safras.fazendas.nome||"-")+'</div></div>';
      html += '</div>';
    }

    c.innerHTML = html;

    setTimeout(function(){
      try{
        var Chart = window.Chart;
        if(!Chart) return;
        var ctx1 = document.getElementById("fsChartCustos");
        if(ctx1) new Chart(ctx1, {type:"doughnut", data:{labels:["Insumos","Mao de Obra","Maquinas","Depreciacao","Outros"], datasets:[{data:[totInsumos,totMaoObra,totMaqs,totDep,totOutros], backgroundColor:["#1e7e34","#1565c0","#ef6c00","#6a1b9a","#546e7a"]}]}, options:{plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:11}}}}, responsive:true, maintainAspectRatio:false}});
        var rc = {};
        fechs.forEach(function(f){ var k = f.safras&&f.safras.cultura||"Outros"; rc[k]=(rc[k]||0)+parseFloat(f.receita_vendas||0); });
        var lbs = Object.keys(rc); var vls = lbs.map(function(k){return rc[k];});
        var ctx2 = document.getElementById("fsChartCulturas");
        if(ctx2) new Chart(ctx2,{type:"bar", data:{labels:lbs, datasets:[{label:"Receita", data:vls, backgroundColor:"#2e7d32"}]}, options:{plugins:{legend:{display:false}}, scales:{y:{ticks:{callback:function(v){return fmtBrlK(v);}}}}, responsive:true, maintainAspectRatio:false}});
        var sorted = fechs.slice().sort(function(a,b){ return new Date(a.data_fechamento) - new Date(b.data_fechamento); });
        var lbs3 = sorted.map(function(f){ return (f.safras&&f.safras.nome||"-").slice(0,18); });
        var vls3 = sorted.map(function(f){ return parseFloat(f.margem_pct||0); });
        var ctx3 = document.getElementById("fsChartMargem");
        if(ctx3) new Chart(ctx3,{type:"line", data:{labels:lbs3, datasets:[{label:"Margem %", data:vls3, borderColor:"#7b1fa2", backgroundColor:"rgba(123,31,162,.15)", fill:true, tension:.3}]}, options:{plugins:{legend:{display:false}}, scales:{y:{ticks:{callback:function(v){return v+"%";}}}}, responsive:true, maintainAspectRatio:false}});
      }catch(e){ console.error("Chart err", e); }
    }, 50);
  }

  var listFilters = { fazenda:"", cultura:"", ano:"", status:"", busca:"" };
  function renderLista(){
    var c = document.getElementById("fsContent");
    if(!DATA){ c.innerHTML = "Carregando..."; return; }
    var fechs = DATA.fechs.slice();
    var culturas = Array.from(new Set(fechs.map(function(f){return f.safras&&f.safras.cultura;}).filter(Boolean))).sort();
    var anos = Array.from(new Set(fechs.map(function(f){return f.safras&&f.safras.ano_agricola;}).filter(Boolean))).sort().reverse();
    var fazs = DATA.fazendas.slice().sort(function(a,b){return (a.nome||"").localeCompare(b.nome||"");});
    fechs = fechs.filter(function(f){
      if(listFilters.fazenda && f.fazenda_id!==listFilters.fazenda) return false;
      if(listFilters.cultura && (f.safras&&f.safras.cultura)!==listFilters.cultura) return false;
      if(listFilters.ano && (f.safras&&f.safras.ano_agricola)!==listFilters.ano) return false;
      if(listFilters.status && f.status!==listFilters.status) return false;
      if(listFilters.busca){
        var q = listFilters.busca.toLowerCase();
        var nm = ((f.safras&&f.safras.nome)||"")+" "+((f.safras&&f.safras.fazendas&&f.safras.fazendas.nome)||"")+" "+(f.safras&&f.safras.cultura||"");
        if(nm.toLowerCase().indexOf(q)<0) return false;
      }
      return true;
    });

    var html = '<div style="background:#fff;padding:14px;border-radius:10px;margin-bottom:14px;box-shadow:0 2px 6px rgba(0,0,0,.05);display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;align-items:end;">';
    html += '<div><label style="font-size:11px;color:#666;font-weight:600;">FAZENDA</label><select id="fsfFaz" style="width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:6px;"><option value="">Todas</option>'+fazs.map(function(f){return "<option value=\""+f.id+"\""+(listFilters.fazenda===f.id?" selected":"")+">"+esc(f.nome)+"</option>";}).join("")+'</select></div>';
    html += '<div><label style="font-size:11px;color:#666;font-weight:600;">CULTURA</label><select id="fsfCult" style="width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:6px;"><option value="">Todas</option>'+culturas.map(function(c){return "<option value=\""+c+"\""+(listFilters.cultura===c?" selected":"")+">"+esc(c)+"</option>";}).join("")+'</select></div>';
    html += '<div><label style="font-size:11px;color:#666;font-weight:600;">ANO AGRICOLA</label><select id="fsfAno" style="width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:6px;"><option value="">Todos</option>'+anos.map(function(a){return "<option value=\""+a+"\""+(listFilters.ano===a?" selected":"")+">"+esc(a)+"</option>";}).join("")+'</select></div>';
    html += '<div><label style="font-size:11px;color:#666;font-weight:600;">STATUS</label><select id="fsfStatus" style="width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:6px;"><option value="">Todos</option><option value="confirmado"'+(listFilters.status==="confirmado"?" selected":"")+'>Confirmado</option><option value="rascunho"'+(listFilters.status==="rascunho"?" selected":"")+'>Rascunho</option></select></div>';
    html += '<div><label style="font-size:11px;color:#666;font-weight:600;">BUSCAR</label><input id="fsfBusca" type="text" placeholder="safra, fazenda..." value="'+esc(listFilters.busca)+'" style="width:100%;padding:7px 10px;border:1px solid #ccc;border-radius:6px;"></div>';
    html += '<div><button id="fsfClear" style="width:100%;padding:8px;background:#eee;border:none;border-radius:6px;cursor:pointer;font-weight:600;">Limpar</button></div>';
    html += '<div><button id="fsfExport" style="width:100%;padding:8px;background:#1e7e34;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;">&#128190; Exportar CSV</button></div>';
    html += '</div>';

    html += '<div style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.05);">';
    html += '<div style="padding:10px 16px;background:#f5f5f5;font-size:13px;color:#444;font-weight:600;">'+fechs.length+' fechamento(s) encontrado(s)</div>';
    if(!fechs.length){
      html += '<div style="padding:40px;text-align:center;color:#888;">Nenhum fechamento corresponde aos filtros.</div>';
    } else {
      html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead style="background:#fafafa;"><tr>';
      ["Safra","Fazenda","Cultura","Data","Area","Producao","Produt.","Custo Total","Custo/sc","Receita","Resultado","Margem","Status",""].forEach(function(h){
        html += '<th style="text-align:left;padding:10px 8px;font-size:12px;color:#555;border-bottom:2px solid #e0e0e0;white-space:nowrap;">'+h+'</th>';
      });
      html += '</tr></thead><tbody>';
      fechs.forEach(function(f){
        var nm = f.safras&&f.safras.nome||"-";
        var fz = f.safras&&f.safras.fazendas&&f.safras.fazendas.nome||"-";
        var cu = f.safras&&f.safras.cultura||"-";
        var res = parseFloat(f.resultado_liquido||0);
        var resColor = res>=0?"#2e7d32":"#c62828";
        html += '<tr style="border-bottom:1px solid #eee;cursor:pointer;" data-id="'+f.id+'" class="fs-row">';
        html += '<td style="padding:10px 8px;font-weight:600;">'+esc(nm)+'</td>';
        html += '<td style="padding:10px 8px;color:#666;">'+esc(fz)+'</td>';
        html += '<td style="padding:10px 8px;">'+esc(cu)+'</td>';
        html += '<td style="padding:10px 8px;color:#666;white-space:nowrap;">'+fmtDate(f.data_fechamento)+'</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;">'+fmtHa(f.area_total_ha)+'</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;">'+fmtSc(f.producao_total_sc)+' sc</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;">'+fmtSc(f.produtividade_sc_ha)+' sc/ha</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;color:#c62828;">'+fmtBrlK(f.custo_total)+'</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;">'+fmtBrl(f.custo_sc)+'</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;color:#2e7d32;">'+fmtBrlK(f.receita_vendas)+'</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;color:'+resColor+';font-weight:600;">'+fmtBrlK(res)+'</td>';
        html += '<td style="padding:10px 8px;white-space:nowrap;font-weight:700;color:'+resColor+';">'+fmtPct(f.margem_pct)+'</td>';
        html += '<td style="padding:10px 8px;">'+statusBadge(f.status)+'</td>';
        html += '<td style="padding:10px 8px;"><button class="fs-detail" data-id="'+f.id+'" style="padding:5px 10px;background:#1565c0;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:12px;">Detalhar</button></td>';
        html += '</tr>';
      });
      html += '</tbody></table></div>';
    }
    html += '</div>';
    c.innerHTML = html;

    document.getElementById("fsfFaz").addEventListener("change", function(){ listFilters.fazenda = this.value; renderLista(); });
    document.getElementById("fsfCult").addEventListener("change", function(){ listFilters.cultura = this.value; renderLista(); });
    document.getElementById("fsfAno").addEventListener("change", function(){ listFilters.ano = this.value; renderLista(); });
    document.getElementById("fsfStatus").addEventListener("change", function(){ listFilters.status = this.value; renderLista(); });
    var bs = document.getElementById("fsfBusca"); var to;
    bs.addEventListener("input", function(){ clearTimeout(to); to=setTimeout(function(){ listFilters.busca=bs.value; renderLista(); },250); });
    document.getElementById("fsfClear").addEventListener("click", function(){ listFilters={fazenda:"",cultura:"",ano:"",status:"",busca:""}; renderLista(); });
    document.getElementById("fsfExport").addEventListener("click", function(){ exportCSV(fechs); });
    Array.from(document.querySelectorAll(".fs-row,.fs-detail")).forEach(function(el){
      el.addEventListener("click", function(e){ e.stopPropagation(); openDetail(el.getAttribute("data-id")); });
    });
  }

  function exportCSV(fechs){
    var rows = [["Safra","Fazenda","Cultura","Ano","Data","Area_ha","Producao_sc","Produtividade_sc_ha","Custo_Insumos","Custo_MaoObra","Custo_Maquinas","Custo_Depreciacao","Custo_Outros","Custo_Total","Custo_sc","Custo_ha","Receita","Resultado","Margem_pct","Status"]];
    fechs.forEach(function(f){
      rows.push([
        (f.safras&&f.safras.nome)||"",
        (f.safras&&f.safras.fazendas&&f.safras.fazendas.nome)||"",
        (f.safras&&f.safras.cultura)||"",
        (f.safras&&f.safras.ano_agricola)||"",
        f.data_fechamento||"",
        f.area_total_ha||0, f.producao_total_sc||0, f.produtividade_sc_ha||0,
        f.custo_insumos||0, f.custo_mao_obra||0, f.custo_maquinas||0, f.custo_depreciacao||0, f.custo_outros||0,
        f.custo_total||0, f.custo_sc||0, f.custo_ha||0, f.receita_vendas||0, f.resultado_liquido||0, f.margem_pct||0,
        f.status||""
      ]);
    });
    var csv = rows.map(function(r){ return r.map(function(v){ var s=String(v==null?"":v); if(s.indexOf(",")>=0||s.indexOf(";")>=0||s.indexOf("\"")>=0) s='"'+s.replace(/"/g,'""')+'"'; return s; }).join(";"); }).join("\n");
    var blob = new Blob(["\ufeff"+csv], {type:"text/csv;charset=utf-8"});
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a"); a.href=url; a.download="fechamentos_safra.csv"; a.click(); URL.revokeObjectURL(url);
  }

  function openDetail(id){
    var f = DATA.fechs.find(function(x){return x.id===id;});
    if(!f) return;
    var bench = BENCH[f.safras&&f.safras.cultura] || null;
    var totC = parseFloat(f.custo_total||0);
    var pInsum = totC ? (parseFloat(f.custo_insumos||0)/totC)*100 : 0;
    var pMao = totC ? (parseFloat(f.custo_mao_obra||0)/totC)*100 : 0;
    var pMaq = totC ? (parseFloat(f.custo_maquinas||0)/totC)*100 : 0;
    var pDep = totC ? (parseFloat(f.custo_depreciacao||0)/totC)*100 : 0;
    var pOut = totC ? (parseFloat(f.custo_outros||0)/totC)*100 : 0;
    var res = parseFloat(f.resultado_liquido||0);
    var roi = totC ? (res/totC)*100 : 0;

    var recs = [];
    if(bench){
      if(parseFloat(f.produtividade_sc_ha||0) < bench.prod*0.7) recs.push({i:"&#9888;", c:"#c62828", t:"Produtividade Critica", d:"A produtividade ("+fmtSc(f.produtividade_sc_ha)+" sc/ha) esta "+((1-parseFloat(f.produtividade_sc_ha||0)/bench.prod)*100).toFixed(0)+"% abaixo do benchmark ("+bench.prod+" sc/ha) para "+f.safras.cultura+"."});
      else if(parseFloat(f.produtividade_sc_ha||0) >= bench.prod*1.1) recs.push({i:"&#127942;", c:"#1e7e34", t:"Produtividade Excelente", d:"A safra superou o benchmark em "+(((parseFloat(f.produtividade_sc_ha||0)/bench.prod)-1)*100).toFixed(0)+"%. Bom trabalho!"});
      if(parseFloat(f.custo_sc||0) > bench.custoSc*1.15) recs.push({i:"&#128176;", c:"#ef6c00", t:"Custo por Saca Elevado", d:"Custo/sc ("+fmtBrl(f.custo_sc)+") esta "+(((parseFloat(f.custo_sc||0)/bench.custoSc)-1)*100).toFixed(0)+"% acima do esperado ("+fmtBrl(bench.custoSc)+"). Revisar insumos e operacoes."});
      if(parseFloat(f.margem_pct||0) < bench.margem*0.7) recs.push({i:"&#128201;", c:"#c62828", t:"Margem Apertada", d:"Margem de "+fmtPct(f.margem_pct)+" abaixo do esperado ("+bench.margem+"%). Reavaliar precificacao e custos."});
    }
    if(pInsum > 60) recs.push({i:"&#128230;", c:"#ef6c00", t:"Custo de Insumos Alto", d:"Insumos representam "+pInsum.toFixed(1)+"% do custo total. Considerar negociacao com fornecedores ou alternativas."});
    if(res < 0) recs.push({i:"&#128557;", c:"#c62828", t:"Resultado Negativo", d:"Esta safra apresentou prejuizo de "+fmtBrl(Math.abs(res))+". Revisar todo o plano operacional."});
    if(recs.length===0) recs.push({i:"&#9989;", c:"#1e7e34", t:"Tudo dentro do esperado", d:"Os indicadores estao alinhados com os benchmarks da cultura."});

    var talhoes = (f.fechamento_talhao||[]).slice().sort(function(a,b){ return parseFloat(b.produtividade_sc_ha||0) - parseFloat(a.produtividade_sc_ha||0); });

    var html = '<div id="fsModal" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;overflow-y:auto;padding:20px;">';
    html += '<div style="max-width:1100px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 10px 40px rgba(0,0,0,.3);">';
    html += '<div style="padding:18px 24px;background:linear-gradient(135deg,#1e7e34,#2e7d32);color:#fff;display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px;">';
    html += '<div><div style="font-size:11px;opacity:.85;letter-spacing:.5px;">RELATORIO DE FECHAMENTO</div><h2 style="margin:4px 0;font-size:22px;">'+esc(f.safras&&f.safras.nome||"-")+'</h2><div style="font-size:13px;opacity:.95;">'+esc(f.safras&&f.safras.fazendas&&f.safras.fazendas.nome||"-")+' &middot; '+esc(f.safras&&f.safras.cultura||"-")+' &middot; '+fmtDate(f.data_fechamento)+' &middot; '+statusBadge(f.status)+'</div></div>';
    html += '<div style="display:flex;gap:8px;"><button id="fsPrint" style="padding:8px 14px;background:#fff;color:#1e7e34;border:none;border-radius:6px;font-weight:700;cursor:pointer;">&#128196; Baixar PDF</button><button id="fsClose" style="padding:8px 14px;background:rgba(255,255,255,.2);color:#fff;border:1px solid #fff;border-radius:6px;font-weight:700;cursor:pointer;">Fechar &times;</button></div>';
    html += '</div>';

    html += '<div id="fsPrintArea" style="padding:24px;">';
    html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;margin-bottom:18px;">';
    var kpis2 = [
      {l:"Area",v:fmtHa(f.area_total_ha),c:"#37474f"},
      {l:"Producao",v:fmtSc(f.producao_total_sc)+" sc",c:"#1565c0"},
      {l:"Produtividade",v:fmtSc(f.produtividade_sc_ha)+" sc/ha",c:"#1565c0",b:bench?trend(f.produtividade_sc_ha,bench.prod):""},
      {l:"Custo Total",v:fmtBrlK(f.custo_total),c:"#c62828"},
      {l:"Custo/sc",v:fmtBrl(f.custo_sc),c:"#c62828",b:bench?trend(f.custo_sc,bench.custoSc,true):""},
      {l:"Custo/ha",v:fmtBrl(f.custo_ha),c:"#c62828"},
      {l:"Receita",v:fmtBrlK(f.receita_vendas),c:"#2e7d32"},
      {l:"Resultado",v:fmtBrlK(res),c:res>=0?"#2e7d32":"#c62828"},
      {l:"Margem",v:fmtPct(f.margem_pct),c:"#7b1fa2",b:bench?trend(f.margem_pct,bench.margem):""},
      {l:"ROI",v:fmtPct(roi),c:"#7b1fa2"}
    ];
    kpis2.forEach(function(k){
      html += '<div style="background:#f8f9fa;padding:10px 12px;border-radius:8px;border-left:3px solid '+k.c+';"><div style="font-size:10px;color:#777;text-transform:uppercase;letter-spacing:.5px;">'+k.l+'</div><div style="font-size:16px;font-weight:700;color:'+k.c+';">'+k.v+(k.b||"")+'</div></div>';
    });
    html += '</div>';

    html += '<div style="background:#fafafa;padding:16px;border-radius:10px;margin-bottom:16px;">';
    html += '<h3 style="margin:0 0 12px;color:#333;font-size:16px;">&#128202; Composicao dos Custos</h3>';
    html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;">';
    html += '<div><canvas id="fsModalChart" height="200"></canvas></div>';
    html += '<div>';
    [
      {l:"Insumos",v:f.custo_insumos,p:pInsum,c:"#1e7e34"},
      {l:"Mao de Obra",v:f.custo_mao_obra,p:pMao,c:"#1565c0"},
      {l:"Maquinas",v:f.custo_maquinas,p:pMaq,c:"#ef6c00"},
      {l:"Depreciacao",v:f.custo_depreciacao,p:pDep,c:"#6a1b9a"},
      {l:"Outros",v:f.custo_outros,p:pOut,c:"#546e7a"}
    ].forEach(function(r){
      html += '<div style="margin:8px 0;"><div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;"><span style="color:'+r.c+';font-weight:600;">'+r.l+'</span><span style="font-weight:700;">'+fmtBrl(r.v)+' &middot; '+r.p.toFixed(1)+'%</span></div><div style="background:#e0e0e0;border-radius:4px;height:8px;overflow:hidden;"><div style="background:'+r.c+';height:100%;width:'+Math.min(100,r.p)+'%;"></div></div></div>';
    });
    html += '</div></div></div>';

    if(talhoes.length){
      html += '<div style="background:#fff;border:1px solid #e8e8e8;border-radius:10px;margin-bottom:16px;overflow:hidden;">';
      html += '<div style="padding:12px 16px;background:#f5f5f5;font-weight:700;color:#333;">&#127947; Resultado por Talhao ('+talhoes.length+')</div>';
      html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#fafafa;">';
      ["#","Talhao","Area","Producao","Produt.","Custo Total","Custo/sc","Receita","Resultado","Status"].forEach(function(h){ html += '<th style="text-align:left;padding:9px 8px;font-size:12px;color:#555;border-bottom:1px solid #e0e0e0;">'+h+'</th>'; });
      html += '</tr></thead><tbody>';
      talhoes.forEach(function(t,i){
        var resT = parseFloat(t.resultado_liquido||0);
        html += '<tr style="border-bottom:1px solid #f0f0f0;">';
        html += '<td style="padding:8px;color:#888;">'+medal(i)+'</td>';
        html += '<td style="padding:8px;font-weight:600;">'+esc(t.talhoes&&t.talhoes.nome||"-")+'</td>';
        html += '<td style="padding:8px;white-space:nowrap;">'+fmtHa(t.area_ha)+'</td>';
        html += '<td style="padding:8px;white-space:nowrap;">'+fmtSc(t.producao_sc)+' sc</td>';
        html += '<td style="padding:8px;white-space:nowrap;">'+fmtSc(t.produtividade_sc_ha)+'</td>';
        html += '<td style="padding:8px;white-space:nowrap;color:#c62828;">'+fmtBrlK(t.custo_total)+'</td>';
        html += '<td style="padding:8px;white-space:nowrap;">'+fmtBrl(t.custo_sc)+'</td>';
        html += '<td style="padding:8px;white-space:nowrap;color:#2e7d32;">'+fmtBrlK(t.receita_proporcional)+'</td>';
        html += '<td style="padding:8px;white-space:nowrap;font-weight:700;color:'+(resT>=0?"#2e7d32":"#c62828")+';">'+fmtBrlK(resT)+'</td>';
        html += '<td style="padding:8px;">'+statusBadge(t.status_talhao)+'</td>';
        html += '</tr>';
      });
      html += '</tbody></table></div></div>';
    }

    var vendasSafra = (DATA.vendas||[]).filter(function(v){ return v.safra_id===f.safra_id; });
    if(vendasSafra.length){
      var totQt=0, totVal=0;
      vendasSafra.forEach(function(v){ var q=parseFloat(v.quantidade_sc||0); var p=parseFloat(v.preco_saca||0); totQt+=q; totVal+=q*p; });
      var precoMedio = totQt? totVal/totQt : 0;
      html += '<div style="background:#fff;border:1px solid #e8e8e8;border-radius:10px;margin-bottom:16px;padding:16px;">';
      html += '<h3 style="margin:0 0 10px;font-size:16px;color:#333;">&#128176; Vendas Vinculadas a Safra</h3>';
      html += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;"><div><div style="font-size:11px;color:#666;">CONTRATOS</div><div style="font-size:18px;font-weight:700;color:#1565c0;">'+vendasSafra.length+'</div></div>';
      html += '<div><div style="font-size:11px;color:#666;">QUANT. VENDIDA</div><div style="font-size:18px;font-weight:700;color:#1565c0;">'+fmtSc(totQt)+' sc</div></div>';
      html += '<div><div style="font-size:11px;color:#666;">PRECO MEDIO</div><div style="font-size:18px;font-weight:700;color:#1565c0;">'+fmtBrl(precoMedio)+'</div></div>';
      html += '<div><div style="font-size:11px;color:#666;">RECEITA APURADA</div><div style="font-size:18px;font-weight:700;color:#2e7d32;">'+fmtBrlK(totVal)+'</div></div></div>';
      html += '</div>';
    }

    html += '<div style="background:linear-gradient(135deg,#fafafa,#f0f4f8);border:1px solid #e0e0e0;border-radius:10px;padding:16px;margin-bottom:16px;">';
    html += '<h3 style="margin:0 0 12px;font-size:16px;color:#333;">&#129302; Analise Inteligente</h3>';
    recs.forEach(function(r){
      html += '<div style="background:#fff;padding:11px 14px;border-radius:8px;margin-bottom:8px;border-left:4px solid '+r.c+';"><div style="font-weight:700;color:'+r.c+';font-size:14px;">'+r.i+' '+r.t+'</div><div style="font-size:13px;color:#555;margin-top:3px;">'+r.d+'</div></div>';
    });
    html += '</div>';

    if(f.observacoes){
      html += '<div style="background:#fffde7;border-left:4px solid #fbc02d;padding:12px 14px;border-radius:6px;margin-bottom:16px;"><div style="font-size:11px;color:#f57f17;font-weight:700;letter-spacing:.5px;">OBSERVACOES</div><div style="font-size:13px;color:#444;margin-top:4px;white-space:pre-wrap;">'+esc(f.observacoes)+'</div></div>';
    }

    html += '<div style="text-align:center;color:#aaa;font-size:11px;margin-top:14px;">Gerado por JA Agro Intelligence em '+new Date().toLocaleString("pt-BR")+'</div>';
    html += '</div></div></div>';

    var wrap = document.createElement("div"); wrap.innerHTML = html;
    document.body.appendChild(wrap.firstChild);

    document.getElementById("fsClose").addEventListener("click", function(){ var m=document.getElementById("fsModal"); if(m) m.remove(); });
    document.getElementById("fsModal").addEventListener("click", function(e){ if(e.target.id==="fsModal") e.target.remove(); });
    document.getElementById("fsPrint").addEventListener("click", function(){ if(typeof window._fsGerarPdf==="function"){ window._fsGerarPdf(f.id); } else { alert("Funcao de PDF nao disponivel."); } });

    setTimeout(function(){
      try{
        var Chart = window.Chart;
        var ctx = document.getElementById("fsModalChart");
        if(ctx && Chart) new Chart(ctx,{type:"doughnut",data:{labels:["Insumos","Mao Obra","Maquinas","Depreciacao","Outros"],datasets:[{data:[f.custo_insumos||0,f.custo_mao_obra||0,f.custo_maquinas||0,f.custo_depreciacao||0,f.custo_outros||0],backgroundColor:["#1e7e34","#1565c0","#ef6c00","#6a1b9a","#546e7a"]}]},options:{plugins:{legend:{position:"bottom",labels:{boxWidth:10,font:{size:10}}}},responsive:true,maintainAspectRatio:false}});
      }catch(e){}
    }, 80);
  }

  var compMode = "margem";
  function renderComp(){
    var c = document.getElementById("fsContent");
    if(!DATA){ c.innerHTML = "Carregando..."; return; }
    var fechs = DATA.fechs.filter(function(f){return f.status==="confirmado"||f.status==="rascunho";});
    if(!fechs.length){ c.innerHTML = '<div style="background:#fff;padding:40px;border-radius:10px;text-align:center;color:#888;">Sem dados para comparar.</div>'; return; }

    var fields = {
      margem: {label:"Margem (%)", getter:function(f){return parseFloat(f.margem_pct||0);}, inverso:false, fmt:fmtPct},
      custoSc:{label:"Custo / Saca", getter:function(f){return parseFloat(f.custo_sc||0);}, inverso:true,  fmt:fmtBrl},
      prod:   {label:"Produtividade", getter:function(f){return parseFloat(f.produtividade_sc_ha||0);}, inverso:false, fmt:function(v){return fmtSc(v)+" sc/ha";}},
      roi:    {label:"ROI (%)", getter:function(f){var c=parseFloat(f.custo_total||0); return c?(parseFloat(f.resultado_liquido||0)/c)*100:0;}, inverso:false, fmt:fmtPct}
    };
    var modes = [["margem","Margem %"],["custoSc","Custo/Saca"],["prod","Produtividade"],["roi","ROI"]];

    var sortField = fields[compMode];
    var sorted = fechs.slice().sort(function(a,b){
      var va = sortField.getter(a), vb = sortField.getter(b);
      return sortField.inverso ? va-vb : vb-va;
    });

    var byCult = {};
    fechs.forEach(function(f){
      var k = f.safras&&f.safras.cultura||"Outros";
      if(!byCult[k]) byCult[k] = {n:0, custoSc:0, prod:0, margem:0, roi:0, area:0, receita:0, custo:0};
      byCult[k].n++;
      byCult[k].custoSc += parseFloat(f.custo_sc||0);
      byCult[k].prod += parseFloat(f.produtividade_sc_ha||0);
      byCult[k].margem += parseFloat(f.margem_pct||0);
      var rc = parseFloat(f.custo_total||0); byCult[k].roi += rc?(parseFloat(f.resultado_liquido||0)/rc)*100:0;
      byCult[k].area += parseFloat(f.area_total_ha||0);
      byCult[k].receita += parseFloat(f.receita_vendas||0);
      byCult[k].custo += parseFloat(f.custo_total||0);
    });

    var html = '';
    html += '<div style="background:#fff;padding:14px;border-radius:10px;margin-bottom:14px;box-shadow:0 2px 6px rgba(0,0,0,.05);"><div style="font-size:12px;color:#666;font-weight:600;margin-bottom:8px;">RANKING POR:</div>';
    modes.forEach(function(m){
      var act = compMode===m[0];
      html += '<button data-mode="'+m[0]+'" class="fsCompBtn" style="margin-right:6px;margin-bottom:4px;padding:8px 14px;background:'+(act?"#1e7e34":"#eee")+';color:'+(act?"#fff":"#444")+';border:none;border-radius:6px;font-weight:600;cursor:pointer;">'+m[1]+'</button>';
    });
    html += '</div>';

    html += '<div style="background:#fff;border-radius:10px;padding:14px;margin-bottom:14px;box-shadow:0 2px 6px rgba(0,0,0,.05);">';
    html += '<h3 style="margin:0 0 12px;font-size:16px;color:#333;">&#127942; Ranking - '+sortField.label+'</h3>';
    html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#fafafa;">';
    ["#","Safra","Fazenda","Cultura",sortField.label,"vs. Benchmark","Margem","Custo/sc","Produt.","Detalhe"].forEach(function(h){ html += '<th style="text-align:left;padding:9px 8px;color:#555;font-size:12px;border-bottom:1px solid #e0e0e0;">'+h+'</th>'; });
    html += '</tr></thead><tbody>';
    sorted.forEach(function(f,i){
      var val = sortField.getter(f);
      var bench = BENCH[f.safras&&f.safras.cultura];
      var bRef = bench ? (compMode==="margem"?bench.margem:compMode==="custoSc"?bench.custoSc:compMode==="prod"?bench.prod:bench.margem) : null;
      var bDisp = bRef ? trend(val, bRef, sortField.inverso) : '<span style="color:#aaa;">-</span>';
      html += '<tr style="border-bottom:1px solid #f0f0f0;">';
      html += '<td style="padding:9px 8px;font-size:16px;">'+medal(i)+'</td>';
      html += '<td style="padding:9px 8px;font-weight:600;">'+esc(f.safras&&f.safras.nome||"-")+'</td>';
      html += '<td style="padding:9px 8px;color:#666;">'+esc(f.safras&&f.safras.fazendas&&f.safras.fazendas.nome||"-")+'</td>';
      html += '<td style="padding:9px 8px;">'+esc(f.safras&&f.safras.cultura||"-")+'</td>';
      html += '<td style="padding:9px 8px;font-weight:700;color:#1e7e34;">'+sortField.fmt(val)+'</td>';
      html += '<td style="padding:9px 8px;">'+bDisp+'</td>';
      html += '<td style="padding:9px 8px;">'+fmtPct(f.margem_pct)+'</td>';
      html += '<td style="padding:9px 8px;">'+fmtBrl(f.custo_sc)+'</td>';
      html += '<td style="padding:9px 8px;">'+fmtSc(f.produtividade_sc_ha)+' sc/ha</td>';
      html += '<td style="padding:9px 8px;"><button class="fs-detail" data-id="'+f.id+'" style="padding:4px 10px;background:#1565c0;color:#fff;border:none;border-radius:5px;cursor:pointer;font-size:11px;">Ver</button></td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    html += '<div style="background:#fff;border-radius:10px;padding:14px;box-shadow:0 2px 6px rgba(0,0,0,.05);">';
    html += '<h3 style="margin:0 0 12px;font-size:16px;color:#333;">&#127806; Performance Media por Cultura</h3>';
    html += '<div style="overflow-x:auto;"><table style="width:100%;border-collapse:collapse;font-size:13px;"><thead><tr style="background:#fafafa;">';
    ["Cultura","Safras","Area Total","Receita","Custo","Margem Media","Custo/sc Medio","Produt. Media","vs. Benchmark"].forEach(function(h){ html += '<th style="text-align:left;padding:9px 8px;color:#555;font-size:12px;border-bottom:1px solid #e0e0e0;">'+h+'</th>'; });
    html += '</tr></thead><tbody>';
    Object.keys(byCult).sort().forEach(function(k){
      var d = byCult[k]; var b = BENCH[k];
      var mProd = d.prod/d.n, mMar = d.margem/d.n, mCs = d.custoSc/d.n;
      html += '<tr style="border-bottom:1px solid #f0f0f0;">';
      html += '<td style="padding:9px 8px;font-weight:700;color:#1e7e34;">'+esc(k)+'</td>';
      html += '<td style="padding:9px 8px;">'+d.n+'</td>';
      html += '<td style="padding:9px 8px;">'+fmtHa(d.area)+'</td>';
      html += '<td style="padding:9px 8px;color:#2e7d32;">'+fmtBrlK(d.receita)+'</td>';
      html += '<td style="padding:9px 8px;color:#c62828;">'+fmtBrlK(d.custo)+'</td>';
      html += '<td style="padding:9px 8px;font-weight:600;">'+fmtPct(mMar)+(b?trend(mMar,b.margem):"")+'</td>';
      html += '<td style="padding:9px 8px;">'+fmtBrl(mCs)+(b?trend(mCs,b.custoSc,true):"")+'</td>';
      html += '<td style="padding:9px 8px;">'+fmtSc(mProd)+' sc/ha'+(b?trend(mProd,b.prod):"")+'</td>';
      html += '<td style="padding:9px 8px;font-size:11px;color:#666;">'+(b?"Ref: "+b.prod+" sc/ha &middot; "+fmtBrl(b.custoSc)+"/sc":"-")+'</td>';
      html += '</tr>';
    });
    html += '</tbody></table></div></div>';

    c.innerHTML = html;
    Array.from(document.querySelectorAll(".fsCompBtn")).forEach(function(b){ b.addEventListener("click", function(){ compMode=b.getAttribute("data-mode"); renderComp(); }); });
    Array.from(document.querySelectorAll(".fs-detail")).forEach(function(el){ el.addEventListener("click", function(e){ e.stopPropagation(); openDetail(el.getAttribute("data-id")); }); });
  }

  function renderNovo(){
    var c = document.getElementById("fsContent");
    c.innerHTML = '<div style="background:#fff;padding:30px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);max-width:780px;margin:0 auto;text-align:center;">'
      +'<div style="font-size:56px;">&#10133;</div>'
      +'<h2 style="margin:12px 0 4px;color:#1e7e34;">Iniciar Novo Fechamento de Safra</h2>'
      +'<p style="color:#666;font-size:14px;margin:6px 0 22px;">Selecione uma safra, escolha os talhoes, confirme os custos apurados e gere o relatorio consolidado.</p>'
      +'<button id="fsStartLegacy" style="padding:14px 32px;background:#1e7e34;color:#fff;border:none;border-radius:8px;font-weight:700;font-size:15px;cursor:pointer;box-shadow:0 4px 12px rgba(30,126,52,.3);">Iniciar Fechamento &rarr;</button>'
      +'<p style="margin-top:18px;font-size:12px;color:#888;">O fluxo de criacao guiara voce em 4 etapas: Safra &rarr; Talhoes &rarr; Custos &rarr; Confirmacao</p>'
      +'</div>';
    document.getElementById("fsStartLegacy").addEventListener("click", function(){
      if(typeof window._legacyFechamentoCreate === "function"){
        window._legacyFechamentoCreate();
      } else {
        alert("Fluxo de criacao indisponivel no momento. Atualize a pagina e tente novamente.");
      }
    });
  }

  function renderContent(){
    if(activeTab==="visao") renderVisao();
    else if(activeTab==="lista") renderLista();
    else if(activeTab==="comp") renderComp();
    else if(activeTab==="novo") renderNovo();
  }
  window._fsRenderContent = renderContent;

  renderTabs();
  document.getElementById("fsContent").innerHTML = '<div style="padding:40px;text-align:center;color:#888;">Carregando fechamentos...</div>';
  try {
    DATA = await loadData();
    if(DATA.err){ document.getElementById("fsContent").innerHTML = '<div style="background:#ffebee;padding:20px;border-radius:8px;color:#c62828;">Erro ao carregar: '+esc(DATA.err.message||"")+'</div>'; return; }
    renderContent();
  } catch(e){
    document.getElementById("fsContent").innerHTML = '<div style="background:#ffebee;padding:20px;border-radius:8px;color:#c62828;">Erro inesperado: '+esc(e.message||"")+'</div>';
    console.error(e);
  }
};


// ===== LEGACY CREATE FLOW (preserved from previous version) =====
window._legacyFechamentoCreate = async function() {
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

  var safOpts = safras.filter(function(s){return (s.status||"").toLowerCase()==="aberta";}).map(function(s) {
    var fzNome = s.fazendas ? s.fazendas.nome : "";
    return "<option value=\""+s.id+"\">"+s.nome+" - "+fzNome+" ("+(s.cultura||"")+" "+(s.ano_agricola||"")+")</option>";
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
      html += "<button onclick=\"window._fsVerDetalhe('"+f.id+"');\" style=\"background:#1565c0;color:#fff;border:none;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px\">Ver</button>"
          if(f.status==="rascunho") html += " <button onclick=\"window._fsExcluirRascunho('"+f.id+"')\" style=\"background:none;border:1px solid #ef4444;color:#ef4444;border-radius:6px;padding:5px 12px;cursor:pointer;font-size:12px;margin-left:6px\">\uD83D\uDDD1 Excluir Rascunho</button>";
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
    // Load talhoes of the same fazenda (filtrando os ja fechados)
    var tRes = await sb.from("talhoes").select("id,nome,area_ha").eq("fazenda_id",safra.fazenda_id).eq("ativo",true);
    var tals = (tRes.data || []);
    var ftRes = await sb.from("fechamento_talhao").select("talhao_id,status_talhao").eq("safra_id",safraId);
    var fechadosIds = {};
    (ftRes.data||[]).forEach(function(ft){ if(ft.status_talhao && /fechado/i.test(ft.status_talhao)) fechadosIds[ft.talhao_id]=ft.status_talhao; });
    var totalAntes = tals.length;
    tals = tals.filter(function(t){ return !fechadosIds[t.id]; });
    if(totalAntes>tals.length){
      var avisoHtml = "<div style=\"background:#fff3e0;border-left:3px solid #f57c00;padding:8px 12px;border-radius:6px;margin-bottom:10px;font-size:12px;color:#e65100\">&#9888; " + (totalAntes-tals.length) + " talhao(oes) ja fechado(s) nao aparece(m) na lista.</div>";
      var holder = document.getElementById("fsTalhaoList"); if(holder) holder.insertAdjacentHTML("beforebegin", avisoHtml);
    }
    var listHtml = "";
    tals.forEach(function(t) {
      listHtml += "<label style=\"display:flex;align-items:center;gap:8px;padding:8px 12px;background:#f9f9f9;border-radius:6px;margin-bottom:6px;cursor:pointer;font-size:13px\">"
      listHtml += "<input type=\"checkbox\" class=\"fsTalhaoChk\" value=\""+t.id+"\" data-area=\""+t.area_ha+"\" data-nome=\""+t.nome+"\" checked>"
      listHtml += "<span>"+t.nome+"</span>"
      listHtml += "<span style=\"color:#888;font-size:12px;margin-left:auto\">"+parseFloat(t.area_ha||0).toFixed(2)+" ha</span>"
      listHtml += "<span style=\"margin-left:8px;font-size:12px;color:#555\">Produz: <input type=\"number\" class=\"fsTalhaoProducao\" data-id=\""+t.id+"\" min=\"0\" step=\"0.1\" placeholder=\"0\" style=\"width:80px;padding:4px;border:1px solid #ddd;border-radius:4px;text-align:right\"> sc</span>"
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
    // STEP 3.5: Load despesas_fixas and prorate by safra duration
    // =============================================
    var dfRes = await sb.from("despesas_fixas").select("*").eq("ativo",true);
    var dfList = (dfRes.data || []).filter(function(d){
      return !d.fazenda_id || d.fazenda_id === fazendaId;
    });
    // Compute safra duration in months (data_plantio -> data_colheita)
    var dtP = safra.data_plantio ? new Date(safra.data_plantio) : null;
    var dtC = safra.data_colheita ? new Date(safra.data_colheita) : null;
    var mesesSafra = 0;
    if (dtP && dtC && dtC > dtP) {
      mesesSafra = (dtC - dtP) / (1000*60*60*24*30.4375);
    }
    // Periodicidade -> meses
    var perMeses = {mensal:1,bimestral:2,trimestral:3,semestral:6,anual:12};
    var totalDespesasFixas = 0;
    dfList.forEach(function(d){
      var pm = perMeses[d.periodicidade] || 1;
      var equivMensal = parseFloat(d.valor_mensal||0) / pm;
      totalDespesasFixas += equivMensal * mesesSafra;
    });

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
    // Add despesas fixas prorated to outros (will be split by talhao area below)
    custoSemTalhao.outros += totalDespesasFixas;

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
    var roi = totCusto > 0 ? ((receitaTotal - totCusto) / totCusto) * 100 : 0;

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
    window._fsShowResultado(fechId, safra, talResults, { totProd:totProd, totCusto:totCusto, totArea:totArea, totDep:totDep, totInsumos:totInsumos, totMaoObra:totMaoObra, totMaquinas:totMaquinas, totOutros:totOutros, prodMedia:prodMedia, custoScGeral:custoScGeral, custoHaGeral:custoHaGeral, receitaTotal:receitaTotal, resultadoLiquido:resultadoLiquido, margemPct:margemPct, roi:roi, depAtivos:depAtivos });
  };

  window._fsShowResultado = function(fechId, safra, talResults, tot) {
    var saldoCor = tot.resultadoLiquido >= 0 ? "#2d7d32" : "#c62828";
    var saldoBg = tot.resultadoLiquido >= 0 ? "#e8f5e9" : "#fce4ec";
    var html = "";
    html += "<div style=\"max-width:1200px;margin:0 auto;padding:8px 0\">"
    html += "<div style=\"display:flex;align-items:center;gap:12px;margin-bottom:20px\">"
    html += "<button onclick=\"window._legacyFechamentoCreate();\" style=\"background:none;border:none;cursor:pointer;font-size:16px;color:#666\">&larr;</button>"
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
    html += "<div style=\"font-size:12px;color:" + (tot.roi>=0?"rgba(45,125,50,0.8)":"rgba(198,40,40,0.8)") + "\">ROI</div><div style=\"font-size:18px;font-weight:800;color:"+(tot.roi>=0?"#2d7d32":"#c62828")+"\">"+(typeof tot.roi!=="undefined"?tot.roi.toFixed(1):"-")+"%</div>"
    html += "</div>"

    // IA RESUMO DA SAFRA (placeholder - preenchido async apos render)
    html += "<div id=\"fsIaResumo\" style=\"background:linear-gradient(135deg,#0d2a0d,#1a4b1a);border-radius:14px;padding:18px 22px;margin-bottom:20px;color:#fff;box-shadow:0 2px 10px rgba(0,0,0,0.15)\">"
    html += "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:10px\"><div style=\"font-size:22px\">&#129302;</div><div><div style=\"font-size:11px;text-transform:uppercase;letter-spacing:1.5px;color:#9ec87a;font-weight:700\">IA &middot; Resumo da Safra</div><div style=\"font-size:14px;color:#cfe6c0\">Analisando dados...</div></div></div>"
    html += "<div id=\"fsIaContent\" style=\"font-size:13px;color:#e0eed5;line-height:1.55\">Aguarde, processando comparativos e recomendacoes...</div>"
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

    // Documentos placeholder (sera preenchido async abaixo)
    html += "<div id=\"fsDocsHolder\" style=\"margin-bottom:16px\"></div>"
    
    // Action buttons (Confirmar fica por ultimo)
    html += "<div style=\"display:flex;gap:10px;margin-bottom:20px\">"
    html += "<button onclick=\"window._legacyFechamentoCreate();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:12px 24px;cursor:pointer;font-size:14px\">&larr; Voltar</button>"
    html += "<button onclick=\"window._fsGerarPdf('"+fechId+"');\" style=\"background:#1565c0;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-size:14px;font-weight:600\">&#128196; Baixar PDF</button>"
    html += "<div style=\"flex:1\"></div>"
    html += "<button onclick=\"window._fsConfirmar('"+fechId+"');\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:12px 28px;cursor:pointer;font-size:14px;font-weight:700;box-shadow:0 2px 6px rgba(45,125,50,.3)\">&#10003; Confirmar Fechamento</button>"
    html += "</div>"

    html += "</div>"
    c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";

    // --- IA RESUMO DA SAFRA (heuristic) ---
    (async function(){
      try {
        var iaEl = document.getElementById("fsIaContent");
        if (!iaEl) return;
        var cultura = (safra && safra.cultura) || "";
        var histRes = await sb.from("fechamento_safra").select("custo_sc,produtividade_sc_ha,margem_pct,resultado_liquido,safras(cultura,ano_agricola)").eq("status","confirmado").limit(50);
        var hist = (histRes.data || []).filter(function(h){ return h.safras && h.safras.cultura===cultura; });
        var avgCustoSc = hist.length ? hist.reduce(function(a,h){ return a+parseFloat(h.custo_sc||0); },0)/hist.length : 0;
        var avgProd = hist.length ? hist.reduce(function(a,h){ return a+parseFloat(h.produtividade_sc_ha||0); },0)/hist.length : 0;
        var avgMargem = hist.length ? hist.reduce(function(a,h){ return a+parseFloat(h.margem_pct||0); },0)/hist.length : 0;
        var benchProd = {Soja:60,Milho:170,Cafe:30,Cana:1500,Algodao:280,Trigo:55,Arroz:120};
        var benchCustoSc = {Soja:90,Milho:35,Cafe:600,Cana:60,Algodao:150,Trigo:80,Arroz:55};
        var bP = benchProd[cultura] || avgProd;
        var bC = benchCustoSc[cultura] || avgCustoSc;
        var cats = [{n:"Insumos",v:tot.totInsumos},{n:"Mao de Obra",v:tot.totMaoObra},{n:"Maquinas",v:tot.totMaquinas},{n:"Depreciacoes",v:tot.totDep},{n:"Outros",v:tot.totOutros}];
        cats.sort(function(a,b){return b.v-a.v;});
        var maior = cats[0];
        var maiorPct = tot.totCusto>0 ? (maior.v/tot.totCusto)*100 : 0;
        function score(){
          var s = 0;
          if (tot.margemPct >= 25) s+=2; else if (tot.margemPct >= 10) s+=1; else if (tot.margemPct < 0) s-=2;
          if (bP>0) { if (tot.prodMedia >= bP*1.05) s+=2; else if (tot.prodMedia >= bP*0.9) s+=1; else if (tot.prodMedia < bP*0.7) s-=2; }
          if (bC>0) { if (tot.custoScGeral <= bC*0.9) s+=2; else if (tot.custoScGeral <= bC*1.1) s+=1; else if (tot.custoScGeral > bC*1.3) s-=2; }
          return s;
        }
        var sc = score();
        var veredito = sc>=4?{txt:"Safra excelente",cor:"#7ed957",emoji:"&#127881;"}:sc>=2?{txt:"Safra positiva",cor:"#9ec87a",emoji:"&#128077;"}:sc>=0?{txt:"Safra na media",cor:"#ffc107",emoji:"&#128528;"}:{txt:"Safra abaixo do esperado",cor:"#ef5350",emoji:"&#9888;"};
        function cmp(real, ref, inverso){
          if (!ref) return {txt:"sem referencia",cor:"#999"};
          var diff = ((real-ref)/ref)*100;
          var bom = inverso ? diff<=0 : diff>=0;
          var cor = Math.abs(diff)<5 ? "#ffc107" : (bom ? "#7ed957" : "#ef5350");
          var sinal = diff>=0?"+":"";
          return {txt: sinal+diff.toFixed(1)+"%", cor: cor};
        }
        var cmpCustoSc = cmp(tot.custoScGeral, bC, true);
        var cmpProd = cmp(tot.prodMedia, bP, false);
        var cmpMargem = cmp(tot.margemPct, avgMargem, false);
        var recs = [];
        if (maiorPct > 45) recs.push("O grupo de custo \""+maior.n+"\" representa "+maiorPct.toFixed(0)+"% do total - revise contratos, negocie volumes e busque alternativas para reduzir essa categoria.");
        if (bP && tot.prodMedia < bP*0.85) recs.push("Produtividade ("+tot.prodMedia.toFixed(1)+" sc/ha) esta abaixo do benchmark da cultura ("+bP+" sc/ha). Avalie manejo de solo, espacamento, populacao e janela de plantio.");
        if (bC && tot.custoScGeral > bC*1.2) recs.push("Custo por saca ("+tot.custoScGeral.toFixed(2)+") esta acima do benchmark ("+bC+"). Identifique talhoes menos eficientes e considere reduzir area ou mudar cultura.");
        if (tot.margemPct < 10) recs.push("Margem apertada ("+tot.margemPct.toFixed(1)+"%). Avalie vendas antecipadas (hedge) e renegociacao de insumos para a proxima safra.");
        if (tot.totDep/Math.max(tot.totCusto,1) > 0.18) recs.push("Depreciacao consome "+((tot.totDep/tot.totCusto)*100).toFixed(0)+"% do custo. Revise frota de maquinas e considere terceirizar operacoes de baixa utilizacao.");
        if (hist.length>=2) {
          var ultHist = hist[0];
          if (parseFloat(ultHist.custo_sc||0) > 0 && tot.custoScGeral > parseFloat(ultHist.custo_sc)*1.15) recs.push("Custo/sc subiu "+(((tot.custoScGeral/parseFloat(ultHist.custo_sc))-1)*100).toFixed(0)+"% vs safra anterior ("+(ultHist.safras.ano_agricola||"")+"). Investigue causas: insumos, perdas, area.");
        }
        if (recs.length===0) recs.push("Indicadores dentro do esperado. Mantenha o padrao de gestao e considere expandir area produtiva nessa cultura.");
        var sortTal = talResults.slice().sort(function(a,b){return b.produtividade_sc_ha-a.produtividade_sc_ha;});
        var melhor = sortTal[0];
        var pior = sortTal[sortTal.length-1];
        var html2 = "";
        html2 += "<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:14px\">"
          + "<div style=\"background:rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px\"><div style=\"font-size:10px;color:#9ec87a;text-transform:uppercase;letter-spacing:1px\">Veredito</div><div style=\"font-size:16px;font-weight:700;color:"+veredito.cor+"\">"+veredito.emoji+" "+veredito.txt+"</div></div>"
          + "<div style=\"background:rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px\"><div style=\"font-size:10px;color:#9ec87a;text-transform:uppercase;letter-spacing:1px\">Produtividade vs bench</div><div style=\"font-size:16px;font-weight:700;color:"+cmpProd.cor+"\">"+cmpProd.txt+"</div><div style=\"font-size:10px;color:#9ec87a\">bench "+cultura+": "+bP+" sc/ha</div></div>"
          + "<div style=\"background:rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px\"><div style=\"font-size:10px;color:#9ec87a;text-transform:uppercase;letter-spacing:1px\">Custo/sc vs bench</div><div style=\"font-size:16px;font-weight:700;color:"+cmpCustoSc.cor+"\">"+cmpCustoSc.txt+"</div><div style=\"font-size:10px;color:#9ec87a\">bench: R$ "+bC+"</div></div>"
          + "<div style=\"background:rgba(255,255,255,0.08);border-radius:8px;padding:10px 12px\"><div style=\"font-size:10px;color:#9ec87a;text-transform:uppercase;letter-spacing:1px\">Margem vs media</div><div style=\"font-size:16px;font-weight:700;color:"+cmpMargem.cor+"\">"+cmpMargem.txt+"</div><div style=\"font-size:10px;color:#9ec87a\">media historica: "+avgMargem.toFixed(1)+"%</div></div>"
          + "</div>";
        html2 += "<div style=\"margin-bottom:12px;font-size:13px;line-height:1.55\">"
          + "<strong style=\"color:#9ec87a\">Diagnostico:</strong> "
          + "Principal grupo de custo: <strong>"+maior.n+"</strong> ("+maiorPct.toFixed(1)+"% do total). "
          + (melhor && pior && melhor.talhao_id!==pior.talhao_id ? "Melhor talhao: <strong>"+melhor.nome+"</strong> ("+melhor.produtividade_sc_ha.toFixed(1)+" sc/ha). Pior: <strong>"+pior.nome+"</strong> ("+pior.produtividade_sc_ha.toFixed(1)+" sc/ha). " : "")
          + "Base de comparacao: "+hist.length+" fechamento(s) anteriores de "+(cultura||"-")+"."
          + "</div>";
        html2 += "<div style=\"background:rgba(255,255,255,0.08);border-radius:8px;padding:12px 14px\">"
          + "<div style=\"font-size:11px;color:#9ec87a;text-transform:uppercase;letter-spacing:1px;font-weight:700;margin-bottom:8px\">&#128161; Recomendacoes</div>";
        recs.forEach(function(r){ html2 += "<div style=\"font-size:12px;color:#e0eed5;margin-bottom:6px;padding-left:14px;position:relative\"><span style=\"position:absolute;left:0;color:#7ed957\">&bull;</span>"+r+"</div>"; });
        html2 += "</div>";
        iaEl.innerHTML = html2;
      } catch(e) { var ie=document.getElementById("fsIaContent"); if(ie) ie.innerHTML = "<span style=\"color:#ef5350\">Nao foi possivel gerar resumo de IA: "+e.message+"</span>"; }
    })();

    // --- Documentos vinculados a este fechamento ---
    (async () => {
      try {
        const { data: _dList } = await sb.from('documentos')
          .select('*').eq('modulo_origem', 'fechamento')
          .eq('entidade_id', fechId).order('created_at', { ascending: false });
        const _docs = _dList || [];
        const _tIco = { NOTA_FISCAL: '🧾', CONTRATO: '📝', LAUDO_LABORATORIAL: '🔬', RELATORIO_TECNICO: '📊', OUTROS: '📎' };
        let _dHtml = '<div style="margin-top:16px;border-top:1px solid rgba(0,0,0,.15);padding-top:14px">';
        _dHtml += '<div style="font-size:11px;font-weight:700;color:rgba(45,125,50,.8);text-transform:uppercase;letter-spacing:1px;margin-bottom:10px">📁 Documentos do Fechamento</div>';
        if (!_docs.length) {
          _dHtml += '<div style="font-size:12px;color:#888;font-style:italic;margin-bottom:10px">Nenhum documento anexado a este fechamento.</div>';
        } else {
          _docs.forEach(d => {
            const ico = _tIco[d.tipo_documento] || '📎';
            _dHtml += '<div style="display:flex;align-items:center;gap:8px;background:rgba(0,0,0,.05);border-radius:6px;padding:7px 10px;margin-bottom:4px">';
            _dHtml += '<span style="font-size:18px">' + ico + '</span>';
            _dHtml += '<div style="flex:1"><div style="font-size:12px;font-weight:600">' + (d.nome_arquivo || '').replace(/</g, '&lt;') + '</div>';
            _dHtml += '<div style="font-size:11px;color:#666">' + (d.descricao || '') + '</div></div>';
            if (d.url_arquivo) _dHtml += '<a href="' + d.url_arquivo + '" target="_blank" rel="noopener" style="font-size:11px;color:#2d7d32">🔗 Abrir</a>';
            _dHtml += '</div>';
          });
        }
        const _safLbl = safra ? ((safra.cultura || '') + ' ' + (safra.ano_agricola || '')).trim() : fechId.slice(0,8);
        _dHtml += '<button onclick="if(window.AdminDocumentos){window.AdminDocumentos.abrirUpload(\'fechamento\',\'' + fechId + '\',\'Fechamento: ' + ' + _safLbl + ' + '\')}" style="margin-top:8px;background:rgba(45,125,50,.15);border:1px solid rgba(45,125,50,.3);color:#2d7d32;border-radius:6px;padding:6px 14px;font-size:12px;cursor:pointer;font-weight:600">📁 + Anexar Documento</button>';
        _dHtml += '</div>';
        var _holder=document.getElementById('fsDocsHolder'); if(_holder){_holder.innerHTML=_dHtml;} else if(c){c.insertAdjacentHTML('beforeend', _dHtml);}
      } catch(_e) { console.warn('Docs fechamento:', _e); }
    })();
  };

  // Confirm fechamento - atualiza fechamento, talhoes e safra
  window._fsConfirmar = async function(fechId) {
    if(!confirm("Confirmar este fechamento? Apos confirmacao, os talhoes selecionados serao bloqueados para novos lancamentos.")) return;
    var btn = event && event.target; if(btn){ btn.disabled=true; btn.innerText="Confirmando..."; }
    var fRes = await sb.from("fechamento_safra").select("*,fechamento_talhao(id,talhao_id)").eq("id",fechId).single();
    if(fRes.error){ alert("Erro: "+fRes.error.message); return; }
    var fech = fRes.data;
    var tipoFech = fech.tipo_fechamento || "parcial";
    var statusTalhao = tipoFech==="total" ? "fechado_total" : "fechado_parcial";
    var r1 = await sb.from("fechamento_safra").update({status:"confirmado"}).eq("id",fechId);
    if(r1.error){ alert("Erro: "+r1.error.message); return; }
    var r2 = await sb.from("fechamento_talhao").update({status_talhao:statusTalhao}).eq("fechamento_id",fechId);
    if(r2.error){ console.warn("status_talhao:",r2.error.message); }
    if(tipoFech==="total"){
      var r3 = await sb.from("safras").update({status:"encerrada"}).eq("id",fech.safra_id);
      if(r3.error){ console.warn("safra status:",r3.error.message); }
    }
    alert("Fechamento confirmado com sucesso!\n\n" + (tipoFech==="total" ? "Safra ENCERRADA. Nenhum lancamento adicional sera permitido." : "Talhoes marcados como FECHADO_PARCIAL. Esses talhoes nao aceitam mais lancamentos."));
    if(typeof window.module_fechamento_safra==="function") window.module_fechamento_safra();
// removed auto-call

  window._fsEnsurePdf = async function(){
    if(window.jspdf && window.jspdf.jsPDF) return true;
    await new Promise((res,rej)=>{var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    await new Promise((res,rej)=>{var s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.0/jspdf.plugin.autotable.min.js";s.onload=res;s.onerror=rej;document.head.appendChild(s);});
    return !!(window.jspdf && window.jspdf.jsPDF);
  };
  
  window._fsGerarPdf = async function(fechId){
    try {
      var btn = event && event.target; var oldT=""; if(btn){ btn.disabled=true; oldT=btn.innerText; btn.innerText="Gerando PDF..."; }
      await window._fsEnsurePdf();
      var fRes = await sb.from("fechamento_safra").select("*,safras(nome,cultura,ano_agricola,data_plantio,data_colheita),fazendas(nome,cidade,estado),fechamento_talhao(*,talhoes(nome))").eq("id",fechId).single();
      if(fRes.error) throw fRes.error;
      var f = fRes.data;
      var vRes = await sb.from("vendas_graos").select("*").eq("safra_id",f.safra_id).in("status",["confirmado","entregue","faturado"]);
      var vendas = vRes.data || [];
      
      var jsPDF = window.jspdf.jsPDF;
      var doc = new jsPDF({orientation:"portrait",unit:"mm",format:"a4"});
      var W = doc.internal.pageSize.getWidth();
      var H = doc.internal.pageSize.getHeight();
      var MARGIN = 14;
      var y = MARGIN;
      
      doc.setFillColor(45,125,50);
      doc.rect(0,0,W,32,"F");
      doc.setTextColor(255,255,255);
      doc.setFont("helvetica","bold");
      doc.setFontSize(18);
      doc.text("RELATORIO DE FECHAMENTO DE SAFRA", MARGIN, 14);
      doc.setFontSize(10);
      doc.setFont("helvetica","normal");
      doc.text("JA Agro Intelligence - Sistema de Gestao Agricola", MARGIN, 21);
      doc.text("Emitido em: " + new Date().toLocaleString("pt-BR"), MARGIN, 27);
      y = 40;
      
      doc.setTextColor(30,30,30);
      doc.setFont("helvetica","bold"); doc.setFontSize(13);
      doc.text((f.safras && f.safras.nome) || "Safra", MARGIN, y); y+=6;
      doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(100,100,100);
      doc.text((((f.safras && f.safras.cultura) || "") + " " + ((f.safras && f.safras.ano_agricola) || "")).trim(), MARGIN, y); y+=5;
      doc.text(((f.fazendas && f.fazendas.nome) || "") + " - " + ((f.fazendas && f.fazendas.cidade) || "") + "/" + ((f.fazendas && f.fazendas.estado) || ""), MARGIN, y); y+=5;
      doc.text("Tipo: " + (f.tipo_fechamento==="total"?"Total (safra inteira)":"Parcial (alguns talhoes)") + " | Data: " + new Date(f.data_fechamento).toLocaleDateString("pt-BR") + " | Status: " + (f.status||"-").toUpperCase(), MARGIN, y);
      y += 10;
      
      var fmtBR = function(n){return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});};
      var fmtN = function(n,d){return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:d||0,maximumFractionDigits:d||1});};
      var kpis = [
        ["Area Total", fmtN(f.area_total_ha,2) + " ha"],
        ["Producao", fmtN(f.producao_total_sc,1) + " sc"],
        ["Produtividade", fmtN(f.produtividade_sc_ha,1) + " sc/ha"],
        ["Custo Total", fmtBR(f.custo_total)],
        ["Custo/sc", fmtBR(f.custo_sc)],
        ["Custo/ha", fmtBR(f.custo_ha)],
        ["Receita", fmtBR(f.receita_vendas)],
        ["Resultado", fmtBR(f.resultado_liquido)],
        ["Margem", fmtN(f.margem_pct,1) + " %"]
      ];
      var cardW = (W - 2*MARGIN - 16)/3, cardH = 18;
      kpis.forEach(function(kp,i){
        var col = i%3, row = Math.floor(i/3);
        var x = MARGIN + col*(cardW+8);
        var cy = y + row*(cardH+4);
        doc.setFillColor(245,248,245); doc.setDrawColor(45,125,50);
        doc.roundedRect(x,cy,cardW,cardH,2,2,"FD");
        doc.setTextColor(100,100,100); doc.setFont("helvetica","normal"); doc.setFontSize(8);
        doc.text(kp[0].toUpperCase(), x+3, cy+5);
        doc.setTextColor(45,125,50); doc.setFont("helvetica","bold"); doc.setFontSize(11);
        doc.text(kp[1], x+3, cy+13);
      });
      y += Math.ceil(kpis.length/3)*(cardH+4) + 6;
      
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(30,30,30);
      doc.text("DETALHAMENTO DE CUSTOS", MARGIN, y); y+=2;
      doc.autoTable({
        startY: y+2,
        head: [["Categoria","Valor (R$)","% do total"]],
        body: [
          ["Insumos", fmtBR(f.custo_insumos), fmtN(f.custo_total?(f.custo_insumos/f.custo_total*100):0,1)+"%"],
          ["Mao de Obra", fmtBR(f.custo_mao_obra), fmtN(f.custo_total?(f.custo_mao_obra/f.custo_total*100):0,1)+"%"],
          ["Maquinas", fmtBR(f.custo_maquinas), fmtN(f.custo_total?(f.custo_maquinas/f.custo_total*100):0,1)+"%"],
          ["Depreciacao", fmtBR(f.custo_depreciacao), fmtN(f.custo_total?(f.custo_depreciacao/f.custo_total*100):0,1)+"%"],
          ["Outros", fmtBR(f.custo_outros), fmtN(f.custo_total?(f.custo_outros/f.custo_total*100):0,1)+"%"]
        ],
        foot: [["TOTAL", fmtBR(f.custo_total), "100,0%"]],
        theme:"grid",
        headStyles:{fillColor:[45,125,50],textColor:255,fontStyle:"bold",fontSize:9},
        footStyles:{fillColor:[230,240,230],textColor:[30,30,30],fontStyle:"bold"},
        styles:{fontSize:9,cellPadding:2},
        margin:{left:MARGIN,right:MARGIN}
      });
      y = doc.lastAutoTable.finalY + 8;
      
      if(y > H-50){ doc.addPage(); y = MARGIN; }
      doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(30,30,30);
      doc.text("DETALHAMENTO POR TALHAO", MARGIN, y);
      var talhoes = (f.fechamento_talhao || []).map(function(t){
        return [
          (t.talhoes && t.talhoes.nome) || "-",
          fmtN(t.area_ha,2),
          fmtN(t.producao_sc,1),
          fmtN(t.produtividade_sc_ha,1),
          fmtBR(t.custo_total),
          fmtBR(t.custo_sc),
          fmtBR(t.receita_proporcional),
          fmtBR(t.resultado_liquido),
          (t.status_talhao||"-").toUpperCase()
        ];
      });
      doc.autoTable({
        startY: y+2,
        head: [["Talhao","Area (ha)","Producao (sc)","Prod (sc/ha)","Custo Total","Custo/sc","Receita","Resultado","Status"]],
        body: talhoes,
        theme:"grid",
        headStyles:{fillColor:[45,125,50],textColor:255,fontStyle:"bold",fontSize:8},
        styles:{fontSize:8,cellPadding:1.5},
        margin:{left:MARGIN,right:MARGIN}
      });
      y = doc.lastAutoTable.finalY + 8;
      
      if(vendas.length){
        if(y > H-50){ doc.addPage(); y = MARGIN; }
        doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.setTextColor(30,30,30);
        doc.text("VENDAS DA SAFRA", MARGIN, y);
        doc.autoTable({
          startY: y+2,
          head: [["Data","Cultura","Quantidade (sc)","Preco (R$/sc)","Total (R$)","Status"]],
          body: vendas.map(function(v){return [
            v.data_venda?new Date(v.data_venda).toLocaleDateString("pt-BR"):"-",
            v.cultura||"-",
            fmtN(v.quantidade_sc,1),
            fmtBR(v.preco_saca),
            fmtBR((v.quantidade_sc||0)*(v.preco_saca||0)),
            (v.status||"-").toUpperCase()
          ];}),
          theme:"striped",
          headStyles:{fillColor:[45,125,50],textColor:255,fontStyle:"bold",fontSize:8},
          styles:{fontSize:8,cellPadding:1.5},
          margin:{left:MARGIN,right:MARGIN}
        });
        y = doc.lastAutoTable.finalY + 8;
      }
      
      if(f.observacoes){
        if(y > H-30){ doc.addPage(); y = MARGIN; }
        doc.setFont("helvetica","bold"); doc.setFontSize(11);
        doc.text("OBSERVACOES", MARGIN, y); y+=5;
        doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.setTextColor(60,60,60);
        var obsLines = doc.splitTextToSize(f.observacoes, W-2*MARGIN);
        doc.text(obsLines, MARGIN, y);
        y += obsLines.length*4 + 6;
      }
      
      var pages = doc.internal.getNumberOfPages();
      for(var p=1; p<=pages; p++){
        doc.setPage(p);
        doc.setDrawColor(45,125,50);
        doc.setLineWidth(0.3);
        doc.line(MARGIN, H-12, W-MARGIN, H-12);
        doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.setTextColor(120,120,120);
        doc.text("JA Agro Intelligence - Relatorio gerado automaticamente", MARGIN, H-7);
        doc.text("Pagina " + p + " de " + pages, W-MARGIN, H-7, {align:"right"});
      }
      
      var safeNome = ((f.safras && f.safras.nome) || "Fechamento").replace(/[^a-zA-Z0-9_-]/g,"_");
      var fname = "Fechamento_" + safeNome + "_" + new Date().toISOString().slice(0,10) + ".pdf";
      doc.save(fname);
      
      if(btn){ btn.disabled=false; btn.innerText=oldT; }
    } catch(e){
      console.error("PDF error:",e);
      alert("Erro ao gerar PDF: " + e.message);
    }
  };


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
    var totals = { totProd:fech.producao_total_sc, totCusto:fech.custo_total, totArea:fech.area_total_ha, totDep:fech.custo_depreciacao, totInsumos:fech.custo_insumos, totMaoObra:fech.custo_mao_obra, totMaquinas:fech.custo_maquinas, totOutros:fech.custo_outros, prodMedia:fech.produtividade_sc_ha, custoScGeral:fech.custo_sc, custoHaGeral:fech.custo_ha, receitaTotal:fech.receita_vendas, resultadoLiquido:fech.resultado_liquido, margemPct:fech.margem_pct, roi:(parseFloat(fech.custo_total||0)>0?((parseFloat(fech.receita_vendas||0)-parseFloat(fech.custo_total||0))/parseFloat(fech.custo_total||0)*100):0), depAtivos:depAtivosFake };
    window._fsShowResultado(fechId, safra, talRows, totals);
  };

  window._fsGotoAtivos = function() {
    alert("Em breve: modulo de Cadastro de Ativos para depreciacao.");
  };

  window._fsExcluirRascunho = async function(id){
    if(!confirm("Excluir este rascunho de fechamento? Esta a\u00E7\u00E3o n\u00E3o pode ser desfeita.")) return;
    var { error } = await sb.from("fechamento_talhao").delete().eq("fechamento_id", id);
    if(error && error.code !== "PGRST116") { alert("Erro ao excluir detalhes: "+error.message); return; }
    var { error: err2 } = await sb.from("fechamento_safra").delete().eq("id", id);
    if(err2) { alert("Erro ao excluir fechamento: "+err2.message); return; }
    toast("Rascunho exclu\u00EDdo com sucesso","ok");
// removed auto-call
  };

}; // end module_fechamento_safra
// removed auto-call
