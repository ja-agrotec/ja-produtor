window["module_ia-operacional"] = async function(){
  const el = document.getElementById("mainContent");
  if(!el) return;

  function esc(s){ return s==null?"":String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fmtBRL(v){ return "R$ "+(v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmt(v,d){ return (v||0).toLocaleString("pt-BR",{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }

  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt-s)">🤖 IA analisando sua operação...</div>';

  let fazFiltro = "";
  try { var f = sessionStorage.getItem("homeFazSel"); if(f && f!=="todas") fazFiltro = f; } catch(e){}

  let qLanc = sb.from("lancamentos").select("fazenda_id,tipo,custo_total,data_lancamento,categoria_id,insumo_id");
  let qSaf = sb.from("safras").select("id,nome,fazenda_id,status,cultura,area_ha,producao_sc,produtividade_sc_ha,custo_total,receita_total,data_plantio,data_colheita");
  let qFech = sb.from("fechamento_safra").select("safra_id,fazenda_id,custo_sc,produtividade_sc_ha,margem_pct,status").eq("status","confirmado");
  let qVen = sb.from("vendas_graos").select("fazenda_id,cultura,preco_saca,data_contrato,status").order("data_contrato",{ascending:false}).limit(50);
  let qIns = sb.from("insumos").select("nome,estoque_atual,estoque_minimo,preco_unitario,fazenda_id,categoria").eq("ativo",true);
  let qTal = sb.from("talhoes").select("id,fazenda_id,cultura_atual,area_ha,producao_sc,safra_id").eq("ativo",true);

  if(fazFiltro){
    qLanc = qLanc.eq("fazenda_id",fazFiltro);
    qSaf = qSaf.eq("fazenda_id",fazFiltro);
    qFech = qFech.eq("fazenda_id",fazFiltro);
    qVen = qVen.eq("fazenda_id",fazFiltro);
    qIns = qIns.eq("fazenda_id",fazFiltro);
    qTal = qTal.eq("fazenda_id",fazFiltro);
  }

  const [rL,rS,rF,rV,rI,rT,rFaz] = await Promise.all([qLanc,qSaf,qFech,qVen,qIns,qTal,sb.from("fazendas").select("id,nome").eq("ativo",true)]);
  const lan = rL.data||[], saf = rS.data||[], fec = rF.data||[], ven = rV.data||[], ins = rI.data||[], tal = rT.data||[];
  const fazMap = {}; (rFaz.data||[]).forEach(f=>fazMap[f.id]=f.nome);

  const benchProd = {Soja:60,Milho:170,Cafe:30,Cana:1500,Algodao:280,Algodão:280,Trigo:55,Arroz:120};
  const benchCustoSc = {Soja:90,Milho:35,Cafe:480,Cana:65,Algodao:135,Algodão:135,Trigo:55,Arroz:48};

  const oportunidades = [];
  const talSemCult = tal.filter(t=>!t.cultura_atual);
  if(talSemCult.length){
    const areaOciosa = talSemCult.reduce((s,t)=>s+(t.area_ha||0),0);
    oportunidades.push({ icon:"🌱", titulo: talSemCult.length+" talhão(ões) sem cultura definida", desc: "Total de "+fmt(areaOciosa,0)+" ha potencialmente ociosos. Considere planejar novo plantio.", acao: "talhoes" });
  }
  const venPorCult = {};
  ven.forEach(v=>{ if(!v.cultura) return; if(!venPorCult[v.cultura]) venPorCult[v.cultura]=[]; venPorCult[v.cultura].push(v.preco_saca||0); });
  Object.keys(venPorCult).forEach(c=>{
    const prices = venPorCult[c].filter(p=>p>0);
    if(prices.length<3) return;
    const last = prices[0];
    const avg = prices.reduce((s,p)=>s+p,0)/prices.length;
    if(last > avg*1.05){
      oportunidades.push({ icon:"📈", titulo: "Preço de "+c+" em alta", desc: "Último contrato "+fmtBRL(last)+"/sc · média histórica "+fmtBRL(avg)+" (+"+fmt(((last/avg-1)*100),1)+"%)", acao: "vendas-graos" });
    }
  });
  saf.forEach(s=>{
    if(s.produtividade_sc_ha && benchProd[s.cultura] && s.produtividade_sc_ha > benchProd[s.cultura]*1.1){
      oportunidades.push({ icon:"🏆", titulo: "Safra "+s.nome+" com produtividade excepcional", desc: "Produtividade "+fmt(s.produtividade_sc_ha,1)+" sc/ha vs benchmark "+benchProd[s.cultura]+" sc/ha (+"+fmt(((s.produtividade_sc_ha/benchProd[s.cultura]-1)*100),1)+"%)", acao: "safras" });
    }
  });

  const riscos = [];
  const insZero = ins.filter(i=>(i.estoque_atual||0)<=0 && (i.estoque_minimo||0)>0);
  if(insZero.length){
    riscos.push({ icon:"⚠️", titulo: insZero.length+" insumo(s) zerado(s) no estoque", desc: "Itens críticos sem estoque: "+insZero.slice(0,3).map(i=>i.nome).join(", ")+(insZero.length>3?"...":""), acao: "insumos" });
  }
  fec.forEach(f=>{
    const safra = saf.find(s=>s.id===f.safra_id);
    if(!safra||!benchCustoSc[safra.cultura]) return;
    if(f.custo_sc > benchCustoSc[safra.cultura]*1.2){
      riscos.push({ icon:"💸", titulo: "Custo elevado em "+safra.nome, desc: "Custo/sc "+fmtBRL(f.custo_sc)+" vs benchmark "+fmtBRL(benchCustoSc[safra.cultura])+" (+"+fmt(((f.custo_sc/benchCustoSc[safra.cultura]-1)*100),1)+"%)", acao: "fechamento-safra" });
    }
  });
  saf.forEach(s=>{
    if(s.produtividade_sc_ha && benchProd[s.cultura] && s.produtividade_sc_ha < benchProd[s.cultura]*0.85){
      riscos.push({ icon:"📉", titulo: "Produtividade baixa em "+s.nome, desc: "Produtividade "+fmt(s.produtividade_sc_ha,1)+" sc/ha vs benchmark "+benchProd[s.cultura]+" sc/ha ("+fmt(((s.produtividade_sc_ha/benchProd[s.cultura]-1)*100),1)+"%)", acao: "safras" });
    }
  });
  const totDesp = lan.filter(l=>l.tipo==="despesa").reduce((s,l)=>s+(l.custo_total||0),0);
  if(totDesp>0){
    const lanIns = lan.filter(l=>l.tipo==="despesa"&&l.insumo_id);
    const totIns = lanIns.reduce((s,l)=>s+(l.custo_total||0),0);
    if(totDesp>0 && (totIns/totDesp)>0.6){
      riscos.push({ icon:"📊", titulo: "Alta concentração em insumos", desc: "Insumos representam "+fmt((totIns/totDesp*100),1)+"% das despesas. Considere revisar contratos com fornecedores.", acao: "insumos" });
    }
  }

  const tendencias = [];
  const today = new Date();
  const m0 = today.getFullYear()+"-"+String(today.getMonth()+1).padStart(2,"0");
  const prev = new Date(today.getFullYear(), today.getMonth()-1, 1);
  const m1 = prev.getFullYear()+"-"+String(prev.getMonth()+1).padStart(2,"0");
  const desp0 = lan.filter(l=>l.tipo==="despesa"&&(l.data_lancamento||"").startsWith(m0)).reduce((s,l)=>s+(l.custo_total||0),0);
  const desp1 = lan.filter(l=>l.tipo==="despesa"&&(l.data_lancamento||"").startsWith(m1)).reduce((s,l)=>s+(l.custo_total||0),0);
  if(desp1>0){
    const delta = ((desp0/desp1)-1)*100;
    tendencias.push({ icon: delta>0?"📈":"📉", titulo: "Despesas do mês: "+(delta>0?"+":"")+fmt(delta,1)+"% vs mês anterior", desc: "Mês atual: "+fmtBRL(desp0)+" · Mês anterior: "+fmtBRL(desp1), acao: "lancamentos" });
  }
  const culturaArea = {};
  tal.forEach(t=>{ if(t.cultura_atual){ culturaArea[t.cultura_atual]=(culturaArea[t.cultura_atual]||0)+(t.area_ha||0); } });
  const cultRank = Object.entries(culturaArea).sort((a,b)=>b[1]-a[1]);
  if(cultRank.length){
    tendencias.push({ icon:"🌾", titulo: "Cultura dominante: "+cultRank[0][0], desc: fmt(cultRank[0][1],0)+" ha plantados ("+fmt((cultRank[0][1]/cultRank.reduce((s,c)=>s+c[1],0)*100),1)+"% da área cultivada)", acao: "talhoes" });
  }

  const acoes = [];
  if(insZero.length) acoes.push({prio:1, txt:"Repor "+insZero.length+" insumo(s) zerado(s) urgentemente", mod:"insumos"});
  if(talSemCult.length) acoes.push({prio:2, txt:"Definir cultura para "+talSemCult.length+" talhão(ões) ocioso(s)", mod:"talhoes"});
  const safPend = saf.filter(s=>{ const dt = s.data_colheita?new Date(s.data_colheita):null; return dt && dt<=today && (s.status==="aberta"||s.status==="ativa"); });
  if(safPend.length) acoes.push({prio:1, txt:"Fechar "+safPend.length+" safra(s) já colhida(s)", mod:"fechamento-safra"});
  const safSemVen = saf.filter(s=>(s.status==="aberta"||s.status==="ativa")&&!ven.find(v=>v.fazenda_id===s.fazenda_id));
  if(safSemVen.length>0) acoes.push({prio:3, txt:"Registrar contratos de venda para safras abertas", mod:"vendas-graos"});

  acoes.sort((a,b)=>a.prio-b.prio);

  function renderList(items, color, emptyMsg){
    if(!items.length) return '<div style="padding:24px;text-align:center;color:#6b7280;font-size:13px">'+emptyMsg+'</div>';
    return items.map(it=>(
      '<div style="display:flex;gap:12px;padding:12px;border-bottom:1px solid #f3f4f6;align-items:flex-start">'+
      '<div style="font-size:22px;flex-shrink:0">'+it.icon+'</div>'+
      '<div style="flex:1"><div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:3px">'+esc(it.titulo)+'</div>'+
      '<div style="font-size:12px;color:#4b5563;line-height:1.5">'+esc(it.desc)+'</div></div>'+
      '<a href="javascript:void(0)" onclick="loadModule(\''+it.acao+'\',document.querySelector(\'[data-module=\\\''+it.acao+'\\\']\'))" style="font-size:11px;color:'+color+';font-weight:700;text-decoration:none;flex-shrink:0">→</a>'+
      '</div>'
    )).join("");
  }

  const acoesHtml = acoes.length ? acoes.map((a,i)=>(
    '<div style="display:flex;gap:12px;align-items:center;padding:12px;background:'+(a.prio===1?"#fef2f2":a.prio===2?"#fefce8":"#f0fdf4")+';border-radius:10px;margin-bottom:8px">'+
    '<div style="width:28px;height:28px;border-radius:50%;background:'+(a.prio===1?"#dc2626":a.prio===2?"#d97706":"#16a34a")+';color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:13px;flex-shrink:0">'+(i+1)+'</div>'+
    '<div style="flex:1;font-size:13px;color:#111827;font-weight:600">'+esc(a.txt)+'</div>'+
    '<a href="javascript:void(0)" onclick="loadModule(\''+a.mod+'\',document.querySelector(\'[data-module=\\\''+a.mod+'\\\']\'))" style="font-size:11px;color:#16a34a;font-weight:700;text-decoration:none">Resolver →</a>'+
    '</div>'
  )).join("") : '<div style="padding:24px;text-align:center;color:#6b7280;font-size:13px">✅ Nenhuma ação prioritária pendente. Operação rodando bem!</div>';

  el.innerHTML =
    '<div style="padding:24px;max-width:1280px">'+
    '<div style="margin-bottom:20px"><h2 style="margin:0;color:var(--txt)">🤖 IA Operacional</h2>'+
    '<p style="margin:4px 0 0;color:var(--txt-s);font-size:14px">Recomendações inteligentes baseadas em dados da operação'+(fazFiltro?' · '+(fazMap[fazFiltro]||""):"")+'</p></div>'+
    '<div style="background:linear-gradient(135deg,#16a34a 0%,#22c55e 100%);color:#fff;border-radius:16px;padding:24px;margin-bottom:24px">'+
      '<div style="display:flex;align-items:center;gap:14px"><div style="font-size:42px">🧠</div>'+
      '<div><div style="font-size:13px;opacity:.85;text-transform:uppercase;letter-spacing:1px;font-weight:600">Diagnóstico geral</div>'+
      '<div style="font-size:20px;font-weight:800;margin-top:4px">'+oportunidades.length+' oportunidades · '+riscos.length+' riscos · '+acoes.length+' ações prioritárias</div></div></div>'+
    '</div>'+
    '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin-bottom:18px">'+
      '<h3 style="margin:0 0 12px;font-size:15px;color:#dc2626">🎯 Próximas Ações Priorizadas</h3>'+acoesHtml+'</div>'+
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:18px">'+
      '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px">'+
        '<h3 style="margin:0 0 6px;font-size:15px;color:#16a34a">💡 Oportunidades</h3>'+
        '<p style="margin:0 0 10px;font-size:11px;color:#6b7280">Ações que podem gerar valor</p>'+
        renderList(oportunidades,"#16a34a","Nenhuma oportunidade identificada agora.")+
      '</div>'+
      '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px">'+
        '<h3 style="margin:0 0 6px;font-size:15px;color:#dc2626">⚠️ Riscos</h3>'+
        '<p style="margin:0 0 10px;font-size:11px;color:#6b7280">Pontos que merecem atenção</p>'+
        renderList(riscos,"#dc2626","Nenhum risco detectado.")+
      '</div>'+
    '</div>'+
    '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px">'+
      '<h3 style="margin:0 0 6px;font-size:15px;color:#2563eb">📊 Tendências</h3>'+
      '<p style="margin:0 0 10px;font-size:11px;color:#6b7280">Comparativos e movimentos da operação</p>'+
      renderList(tendencias,"#2563eb","Sem dados suficientes para tendências.")+
    '</div>'+
    '</div>';
};
