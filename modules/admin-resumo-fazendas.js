window["module_resumo-fazendas"] = async function(){
  const el = document.getElementById("mainContent");
  if(!el) return;

  function esc(s){ return s==null?"":String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fmtBRL(v){ return "R$ "+(v||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:0}); }
  function fmt(v,d){ return (v||0).toLocaleString("pt-BR",{minimumFractionDigits:d||0,maximumFractionDigits:d||0}); }

  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt-s)">⏳ Compilando panorama das fazendas...</div>';

  const [rFaz, rTal, rSaf, rLan, rVen, rIns, rMaq] = await Promise.all([
    sb.from("fazendas").select("id,nome,cidade,estado,area_total_ha,ativo,certificada").eq("ativo",true).order("nome"),
    sb.from("talhoes").select("id,fazenda_id,area_ha").eq("ativo",true),
    sb.from("safras").select("id,fazenda_id,status,cultura,area_ha,producao_sc"),
    sb.from("lancamentos").select("fazenda_id,tipo,custo_total"),
    sb.from("vendas_graos").select("fazenda_id,quantidade_sc,preco_saca"),
    sb.from("insumos").select("fazenda_id,estoque_atual,estoque_minimo").eq("ativo",true),
    sb.from("maquinas").select("fazenda_id,horimetro_atual,proxima_manutencao_h").eq("ativo",true)
  ]);

  const fazendas = rFaz.data||[];
  const talhoes = rTal.data||[];
  const safras = rSaf.data||[];
  const lan = rLan.data||[];
  const ven = rVen.data||[];
  const ins = rIns.data||[];
  const maq = rMaq.data||[];

  const dados = fazendas.map(f=>{
    const tals = talhoes.filter(t=>t.fazenda_id===f.id);
    const safsAt = safras.filter(s=>s.fazenda_id===f.id && (s.status==="aberta"||s.status==="ativa"));
    const safsAll = safras.filter(s=>s.fazenda_id===f.id);
    const desp = lan.filter(l=>l.fazenda_id===f.id && l.tipo==="despesa").reduce((s,l)=>s+(l.custo_total||0),0);
    const rec  = lan.filter(l=>l.fazenda_id===f.id && l.tipo==="receita").reduce((s,l)=>s+(l.custo_total||0),0);
    const recVen = ven.filter(v=>v.fazenda_id===f.id).reduce((s,v)=>s+(v.quantidade_sc||0)*(v.preco_saca||0),0);
    const recTotal = rec + recVen;
    const margem = recTotal - desp;
    const roi = desp>0 ? (margem/desp)*100 : 0;
    const insCrit = ins.filter(i=>i.fazenda_id===f.id && (i.estoque_minimo||0)>0 && (i.estoque_atual||0)<=i.estoque_minimo).length;
    const maqAlert = maq.filter(m=>m.fazenda_id===f.id && m.proxima_manutencao_h && m.horimetro_atual && m.horimetro_atual>=m.proxima_manutencao_h).length;
    const areaPlant = safsAt.reduce((s,x)=>s+(x.area_ha||0),0);
    return {
      fazenda: f, talhoes: tals.length, safrasAtivas: safsAt.length, safrasTotal: safsAll.length,
      areaTalhoes: tals.reduce((s,t)=>s+(t.area_ha||0),0),
      areaPlantada: areaPlant, despesa: desp, receita: recTotal, margem: margem, roi: roi,
      alertas: insCrit + maqAlert,
      culturas: [...new Set(safsAt.map(s=>s.cultura).filter(Boolean))]
    };
  });

  dados.sort((a,b)=>b.margem - a.margem);

  const totFaz = dados.length;
  const totArea = dados.reduce((s,d)=>s+(d.fazenda.area_total_ha||0),0);
  const totRec = dados.reduce((s,d)=>s+d.receita,0);
  const totDesp = dados.reduce((s,d)=>s+d.despesa,0);
  const totMargem = totRec - totDesp;
  const totRoi = totDesp>0 ? (totMargem/totDesp)*100 : 0;

  const cards = dados.map((d,idx)=>{
    const rank = idx+1;
    const cor = d.margem>0 ? "#16a34a" : d.margem<0 ? "#dc2626" : "#6b7280";
    const corBg = d.margem>0 ? "#f0fdf4" : d.margem<0 ? "#fef2f2" : "#f9fafb";
    const medalha = rank===1?"🥇":rank===2?"🥈":rank===3?"🥉":"#"+rank;
    const culturasTxt = d.culturas.length ? d.culturas.join(", ") : "Sem safras ativas";
    return (
      '<div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:18px;display:flex;flex-direction:column;gap:10px;box-shadow:0 1px 3px rgba(0,0,0,.05)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between">'+
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:20px">'+medalha+'</span>'+
        '<div><div style="font-size:15px;font-weight:700;color:#111827">'+esc(d.fazenda.nome)+'</div>'+
        '<div style="font-size:11px;color:#6b7280">'+esc(d.fazenda.cidade||"")+(d.fazenda.estado?" / "+esc(d.fazenda.estado):"")+(d.fazenda.certificada?' · 🏅 Certificada':'')+'</div></div></div>'+
        (d.alertas>0?'<span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:3px 8px;border-radius:99px">⚠ '+d.alertas+'</span>':'')+
      '</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">'+
        '<div style="background:#f9fafb;padding:8px;border-radius:8px"><div style="color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase">Área</div><div style="font-weight:700;color:#111827">'+fmt(d.fazenda.area_total_ha||d.areaTalhoes,0)+' ha</div></div>'+
        '<div style="background:#f9fafb;padding:8px;border-radius:8px"><div style="color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase">Talhões</div><div style="font-weight:700;color:#111827">'+d.talhoes+'</div></div>'+
        '<div style="background:#f9fafb;padding:8px;border-radius:8px"><div style="color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase">Safras</div><div style="font-weight:700;color:#111827">'+d.safrasAtivas+' ativas / '+d.safrasTotal+'</div></div>'+
        '<div style="background:#f9fafb;padding:8px;border-radius:8px"><div style="color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase">Área Plantada</div><div style="font-weight:700;color:#111827">'+fmt(d.areaPlantada,0)+' ha</div></div>'+
      '</div>'+
      '<div style="font-size:11px;color:#6b7280;background:#fafafa;padding:6px 8px;border-radius:6px;border:1px dashed #e5e7eb"><strong>Culturas:</strong> '+esc(culturasTxt)+'</div>'+
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">'+
        '<div><div style="color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase">Receita</div><div style="font-weight:700;color:#16a34a">'+fmtBRL(d.receita)+'</div></div>'+
        '<div><div style="color:#6b7280;font-size:10px;font-weight:600;text-transform:uppercase">Despesa</div><div style="font-weight:700;color:#dc2626">'+fmtBRL(d.despesa)+'</div></div>'+
      '</div>'+
      '<div style="background:'+corBg+';padding:10px;border-radius:8px;display:flex;justify-content:space-between;align-items:center">'+
        '<div><div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase">Margem</div><div style="font-size:16px;font-weight:700;color:'+cor+'">'+fmtBRL(d.margem)+'</div></div>'+
        '<div style="text-align:right"><div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase">ROI</div><div style="font-size:16px;font-weight:700;color:'+cor+'">'+fmt(d.roi,1)+'%</div></div>'+
      '</div>'+
      '<button onclick="sessionStorage.setItem(\'homeFazSel\',\''+d.fazenda.id+'\');loadModule(\'home\',document.querySelector(\'[data-module=home]\'))" style="background:#16a34a;color:#fff;border:none;border-radius:8px;padding:8px;font-size:12px;font-weight:700;cursor:pointer">Ver Home da Fazenda →</button>'+
      '</div>'
    );
  }).join("");

  el.innerHTML =
    '<div style="padding:24px;max-width:1400px">'+
    '<div style="margin-bottom:20px"><h2 style="margin:0;color:var(--txt)">📍 Resumo das Fazendas</h2>'+
    '<p style="margin:4px 0 0;color:var(--txt-s);font-size:14px">Panorama operacional comparativo · ranking por margem</p></div>'+
    '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:14px;margin-bottom:24px">'+
      '<div class="stat-card" style="border-left:4px solid #16a34a"><div class="stat-value" style="color:#16a34a">'+totFaz+'</div><div class="stat-label">Fazendas Ativas</div></div>'+
      '<div class="stat-card" style="border-left:4px solid #2563eb"><div class="stat-value" style="color:#2563eb">'+fmt(totArea,0)+'</div><div class="stat-label">Área Total (ha)</div></div>'+
      '<div class="stat-card" style="border-left:4px solid #22c55e"><div class="stat-value" style="color:#22c55e;font-size:18px">'+fmtBRL(totRec)+'</div><div class="stat-label">Receita Total</div></div>'+
      '<div class="stat-card" style="border-left:4px solid #ef4444"><div class="stat-value" style="color:#ef4444;font-size:18px">'+fmtBRL(totDesp)+'</div><div class="stat-label">Despesa Total</div></div>'+
      '<div class="stat-card" style="border-left:4px solid '+(totMargem>=0?"#16a34a":"#dc2626")+'"><div class="stat-value" style="color:'+(totMargem>=0?"#16a34a":"#dc2626")+';font-size:18px">'+fmtBRL(totMargem)+'</div><div class="stat-label">Margem · ROI '+fmt(totRoi,1)+'%</div></div>'+
    '</div>'+
    (cards ? '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(340px,1fr));gap:16px">'+cards+'</div>' : '<div style="padding:48px;text-align:center;color:var(--txt-s);background:#fff;border-radius:12px;border:1px solid #e5e7eb">Nenhuma fazenda ativa cadastrada</div>')+
    '</div>';
};
