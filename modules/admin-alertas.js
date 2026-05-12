window.module_alertas = async function(){
  const el = document.getElementById("mainContent");
  if(!el) return;

  function esc(s){ return s==null?"":String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
  function fmt(v){ return (v||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }

  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--txt-s)">⏳ Analisando situação operacional...</div>';

  let fazFiltro = "";
  try { var f = sessionStorage.getItem("homeFazSel"); if(f && f!=="todas") fazFiltro = f; } catch(e){}

  const today = new Date(); today.setHours(0,0,0,0);

  let qIns = sb.from("insumos").select("id,nome,estoque_atual,estoque_minimo,fazenda_id,unidade").eq("ativo",true);
  let qMaq = sb.from("maquinas").select("id,nome,fazenda_id,horimetro_atual,proxima_manutencao_h,status").eq("ativo",true);
  let qSaf = sb.from("safras").select("id,nome,fazenda_id,status,data_colheita,cultura,area_ha");
  let qFech = sb.from("fechamento_safra").select("id,safra_id,fazenda_id,status,data_fechamento");
  let qVendas = sb.from("vendas_graos").select("id,safra_id,fazenda_id,quantidade_sc,status");
  let qOff = sb.from("lancamentos_offline").select("id,fazenda_id,status",{count:"exact",head:false}).eq("status","pendente");
  let qFaz = sb.from("fazendas").select("id,nome").eq("ativo",true);

  if(fazFiltro){
    qIns = qIns.eq("fazenda_id", fazFiltro);
    qMaq = qMaq.eq("fazenda_id", fazFiltro);
    qSaf = qSaf.eq("fazenda_id", fazFiltro);
    qFech = qFech.eq("fazenda_id", fazFiltro);
    qVendas = qVendas.eq("fazenda_id", fazFiltro);
    qOff = qOff.eq("fazenda_id", fazFiltro);
  }

  const [rIns, rMaq, rSaf, rFech, rVend, rOff, rFaz] = await Promise.all([qIns, qMaq, qSaf, qFech, qVendas, qOff, qFaz]);
  const insumos = rIns.data||[];
  const maquinas = rMaq.data||[];
  const safras = rSaf.data||[];
  const fechamentos = rFech.data||[];
  const vendas = rVend.data||[];
  const fazendas = rFaz.data||[];
  const offCount = rOff.count||0;
  const fazMap = {}; fazendas.forEach(f=>fazMap[f.id]=f.nome);

  const alertas = [];

  insumos.forEach(i=>{
    if((i.estoque_minimo||0)>0 && (i.estoque_atual||0) <= i.estoque_minimo){
      alertas.push({
        sev: (i.estoque_atual||0)<=0 ? "alta" : "media",
        cat: "Estoque",
        icon: "📦",
        titulo: i.estoque_atual<=0 ? "Insumo zerado: "+i.nome : "Insumo abaixo do mínimo: "+i.nome,
        descricao: "Estoque atual: "+fmt(i.estoque_atual)+" "+(i.unidade||"")+" · Mínimo: "+fmt(i.estoque_minimo)+" "+(i.unidade||""),
        fazenda: fazMap[i.fazenda_id]||"-",
        modulo: "insumos"
      });
    }
  });

  maquinas.forEach(m=>{
    if(m.proxima_manutencao_h && m.horimetro_atual && m.horimetro_atual >= m.proxima_manutencao_h){
      alertas.push({
        sev: "alta",
        cat: "Máquinas",
        icon: "🔧",
        titulo: "Manutenção vencida: "+m.nome,
        descricao: "Horímetro atual: "+fmt(m.horimetro_atual)+"h ultrapassou prevista: "+fmt(m.proxima_manutencao_h)+"h",
        fazenda: fazMap[m.fazenda_id]||"-",
        modulo: "maquinas"
      });
    } else if(m.proxima_manutencao_h && m.horimetro_atual && (m.proxima_manutencao_h - m.horimetro_atual) <= 50){
      alertas.push({
        sev: "media",
        cat: "Máquinas",
        icon: "🔧",
        titulo: "Manutenção próxima: "+m.nome,
        descricao: "Faltam "+fmt(m.proxima_manutencao_h - m.horimetro_atual)+"h para a próxima manutenção",
        fazenda: fazMap[m.fazenda_id]||"-",
        modulo: "maquinas"
      });
    }
  });

  if(offCount>0){
    alertas.push({
      sev: "media",
      cat: "Sincronização",
      icon: "🔄",
      titulo: offCount+" lançamento(s) aguardando sincronização",
      descricao: "Lançamentos offline pendentes de envio ao servidor",
      fazenda: fazFiltro ? (fazMap[fazFiltro]||"-") : "Todas",
      modulo: "offline"
    });
  }

  const fechBySaf = {}; fechamentos.forEach(f=>{ if(!fechBySaf[f.safra_id]||f.status==="confirmado") fechBySaf[f.safra_id]=f.status; });
  safras.forEach(s=>{
    const dt = s.data_colheita ? new Date(s.data_colheita) : null;
    if(dt && dt <= today && (s.status==="aberta"||s.status==="ativa") && fechBySaf[s.id]!=="confirmado"){
      alertas.push({
        sev: "media",
        cat: "Safras",
        icon: "📈",
        titulo: "Safra colhida sem fechamento: "+s.nome,
        descricao: "Cultura "+(s.cultura||"-")+" · Colheita prevista em "+s.data_colheita,
        fazenda: fazMap[s.fazenda_id]||"-",
        modulo: "fechamento-safra"
      });
    }
  });

  const vendaPorSafra = {}; vendas.forEach(v=>{ vendaPorSafra[v.safra_id] = (vendaPorSafra[v.safra_id]||0)+1; });
  safras.forEach(s=>{
    if((s.status==="aberta"||s.status==="ativa") && !vendaPorSafra[s.id] && (s.area_ha||0)>0){
      alertas.push({
        sev: "baixa",
        cat: "Vendas",
        icon: "🌾",
        titulo: "Safra sem contrato de venda: "+s.nome,
        descricao: "Considere registrar contratos para garantir preço da produção de "+(s.cultura||"-"),
        fazenda: fazMap[s.fazenda_id]||"-",
        modulo: "vendas-graos"
      });
    }
  });

  const sevOrder = {alta:0, media:1, baixa:2};
  alertas.sort((a,b)=>sevOrder[a.sev]-sevOrder[b.sev]);

  const totAlta = alertas.filter(a=>a.sev==="alta").length;
  const totMedia = alertas.filter(a=>a.sev==="media").length;
  const totBaixa = alertas.filter(a=>a.sev==="baixa").length;
  const total = alertas.length;

  function sevBadge(sev){
    if(sev==="alta") return '<span style="background:#fee2e2;color:#dc2626;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;text-transform:uppercase;letter-spacing:.5px">Crítico</span>';
    if(sev==="media") return '<span style="background:#fef3c7;color:#d97706;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;text-transform:uppercase;letter-spacing:.5px">Atenção</span>';
    return '<span style="background:#dbeafe;color:#2563eb;font-size:10px;font-weight:700;padding:2px 8px;border-radius:99px;text-transform:uppercase;letter-spacing:.5px">Info</span>';
  }
  function sevBorder(sev){ return sev==="alta"?"#dc2626":sev==="media"?"#d97706":"#2563eb"; }

  let cardsHtml = "";
  if(!alertas.length){
    cardsHtml = '<div style="grid-column:1/-1;background:linear-gradient(135deg,#f0fdf4 0%,#dcfce7 100%);border:1px solid #86efac;border-radius:14px;padding:48px;text-align:center;color:#166534"><div style="font-size:48px;margin-bottom:12px">✅</div><div style="font-size:18px;font-weight:700">Tudo em ordem!</div><div style="font-size:13px;margin-top:6px;color:#15803d">Nenhum alerta operacional no momento.</div></div>';
  } else {
    cardsHtml = alertas.map(a=>(
      '<div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid '+sevBorder(a.sev)+';border-radius:12px;padding:16px;display:flex;flex-direction:column;gap:8px;box-shadow:0 1px 2px rgba(0,0,0,.04)">'+
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px">'+
        '<div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">'+a.icon+'</span><span style="font-size:11px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px">'+esc(a.cat)+'</span></div>'+
        sevBadge(a.sev)+
      '</div>'+
      '<div style="font-size:14px;font-weight:700;color:#111827;line-height:1.3">'+esc(a.titulo)+'</div>'+
      '<div style="font-size:12.5px;color:#4b5563;line-height:1.5">'+esc(a.descricao)+'</div>'+
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-top:4px;padding-top:8px;border-top:1px solid #f3f4f6">'+
        '<span style="font-size:11px;color:#6b7280">🏡 '+esc(a.fazenda)+'</span>'+
        '<a href="javascript:void(0)" onclick="loadModule(\''+a.modulo+'\',document.querySelector(\'[data-module=\\\''+a.modulo+'\\\']\'))" style="font-size:11px;color:#16a34a;font-weight:700;text-decoration:none">Resolver →</a>'+
      '</div></div>'
    )).join("");
  }

  el.innerHTML =
    '<div style="padding:24px;max-width:1280px">'+
    '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:12px">'+
      '<div><h2 style="margin:0;color:var(--txt)">🔔 Central de Alertas</h2>'+
      '<p style="margin:4px 0 0;color:var(--txt-s);font-size:14px">Pendências operacionais consolidadas'+(fazFiltro?' · Filtrado por '+(fazMap[fazFiltro]||""):"")+'</p></div>'+
      '<button class="topbar-btn btn-ghost" onclick="loadModule(\'alertas\',document.querySelector(\'[data-module=alertas]\'))" style="padding:8px 14px">🔄 Atualizar</button>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:22px">'+
      '<div class="stat-card" style="border-left:4px solid #dc2626"><div class="stat-value" style="color:#dc2626">'+totAlta+'</div><div class="stat-label">Críticos</div></div>'+
      '<div class="stat-card" style="border-left:4px solid #d97706"><div class="stat-value" style="color:#d97706">'+totMedia+'</div><div class="stat-label">Atenção</div></div>'+
      '<div class="stat-card" style="border-left:4px solid #2563eb"><div class="stat-value" style="color:#2563eb">'+totBaixa+'</div><div class="stat-label">Informativos</div></div>'+
      '<div class="stat-card" style="border-left:4px solid #16a34a"><div class="stat-value" style="color:#16a34a">'+total+'</div><div class="stat-label">Total</div></div>'+
    '</div>'+
    '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:14px">'+cardsHtml+'</div>'+
    '</div>';
};
