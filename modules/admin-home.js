/* admin-home.js - Home Premium v3.0 */
window.module_home = async function() {
  var c = document.getElementById("mainContent");
  var esc = function(s) { return String(s||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); };
  var fmtR = function(v) { return new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(v||0); };
  var fmtN = function(v) { return new Intl.NumberFormat("pt-BR").format(v||0); };
  if (typeof setTopbar==="function") setTopbar("Home","Vision geral inteligente da operacao");
  if (typeof setLoading==="function") setLoading("mainContent");
  if (typeof sb==="undefined"||!sb) { c.innerHTML="<div style=\"padding:40px;text-align:center;color:#dc2626\">Conexao nao disponivel</div>"; return; }
  try {
    var r = await Promise.all([
      sb.from("fazendas").select("*",{count:"exact",head:true}),
      sb.from("usuarios").select("*",{count:"exact",head:true}),
      sb.from("talhoes").select("*",{count:"exact",head:true}),
      sb.from("fazendas").select("id,nome,cidade,estado,certificada,tipo_certificacao").eq("ativo",true).order("nome"),
      sb.from("safras").select("id,nome,cultura,area_total,status,data_inicio,data_fim_prevista,fazenda_id,fazendas(nome,cidade,estado)").eq("status","aberta").limit(10),
      sb.from("lancamentos").select("id,tipo,despesa,descricao,data_lancamento,fazenda_id,fazendas(nome)").order("data_lancamento",{ascending:false}).limit(8),
      sb.from("insumos").select("id,nome,categoria,estoque_atual,estoque_minimo,unidade").eq("ativo",true),
      sb.from("talhoes").select("id,nome,area,fazenda_id").eq("ativo",true)
    ]);
    var totalFaz=r[0].count||0, totalUsu=r[1].count||0, totalTal=r[2].count||0;
    var fazendas=r[3].data||[], safrasAb=r[4].data||[], ultLanc=r[5].data||[];
    var insumos=r[6].data||[], talhoesTd=r[7].data||[];
    var insBaixos=insumos.filter(function(i){return (i.estoque_minimo||0)>0&&(i.estoque_atual||0)<(i.estoque_minimo||0);});
    var totalPend=insBaixos.length;
    var totalDesp=ultLanc.filter(function(l){return l.tipo==="despesa";}).reduce(function(s,l){return s+(l.despesa||0);},0);
    var totalRec=ultLanc.filter(function(l){return l.tipo==="receita";}).reduce(function(s,l){return s+(l.despesa||0);},0);
    var hora=new Date().getHours();
    var saud=hora<12?"Bom dia":hora<18?"Boa tarde":"Boa noite";
    var uNome=(typeof window._jaUser!=="undefined"&&window._jaUser)?window._jaUser.nome:"Produtor";
    var fazPrinc=(safrasAb.length>0&&safrasAb[0].fazendas)?safrasAb[0].fazendas:(fazendas.length>0?fazendas[0]:null);
    var cidadeClima=fazPrinc?(fazPrinc.cidade||fazPrinc.nome||"Brasil"):"Brasil";
    var climaHtml="<span style=\"color:#9ca3af;font-size:0.85rem\">Carregando clima...</span>";
    try {
      var wResp=await fetch("https://wttr.in/"+encodeURIComponent(cidadeClima)+"?format=j1");
      if (wResp.ok) {
        var wData=await wResp.json();
        var cur=wData.current_condition[0];
        var wCode=parseInt(cur.weatherCode);
        var wIcon=wCode>=395?"&#x26C8;":wCode>=302?"&#x1F327;":wCode>=263?"&#x1F326;":wCode>=116?"&#x26C5;":"&#x2600;";
        var wPt=(cur.lang_pt?cur.lang_pt[0].value:cur.weatherDesc[0].value);
        climaHtml="<div style=\"display:flex;align-items:center;gap:10px\">";
        climaHtml+="<span style=\"font-size:2rem\">"+ wIcon +"</span>";
        climaHtml+="<div><div style=\"font-size:1.6rem;font-weight:700;color:#fff\">"+cur.temp_C+"&deg;C</div>";
        climaHtml+="<div style=\"font-size:0.75rem;color:#bbf7d0\">"+esc(wPt)+"</div></div>";
        climaHtml+="<div style=\"border-left:1px solid rgba(255,255,255,0.3);padding-left:10px;font-size:0.75rem;color:#bbf7d0;line-height:1.8\">";
        climaHtml+="&#x1F4A7; "+cur.humidity+"% &nbsp;&#x1F32C; "+cur.windspeedKmph+" km/h</div></div>";
        climaHtml+="<div style=\"font-size:0.7rem;color:#86efac;margin-top:4px\">&#x1F4CD; "+esc(cidadeClima)+"</div>";
      }
    } catch(we) { climaHtml="<span style=\"color:#86efac;font-size:0.8rem\">Clima indisponivel</span>"; }
    var dicas=[
      {e:"&#x1F331;",t:"Lembre-se: solo saudavel e a base de tudo. Ja fez sua analise este semestre?"},
      {e:"&#x1F41B;",t:"Se voce viu a praga, ela ja se instalou. Monitoramento frequente e o segredo!"},
      {e:"&#x1F327;",t:"Chuva na dose certa e presente. Chuva demais e problema. Drene com sabedoria!"},
      {e:"&#x1F33F;",t:"Rotacao de culturas nao e opcional, e estrategia. Seu solo agradece."},
      {e:"&#x1F9EA;",t:"pH fora do ideal e igual a dinheiro jogado fora em fertilizante. Corrija o solo primeiro!"},
      {e:"&#x1F4C5;",t:"Janela de plantio e como voo: perdeu, espera o proximo - que pode custar caro."},
      {e:"&#x1F4A7;",t:"Irrigacao de madrugada: menos evaporacao, mais eficiencia. A lavoura prefere acordar molhada."},
      {e:"&#x1F33E;",t:"Populacao de plantas ideal e ciencia, nao chute. Densidade certa = produtividade maxima."},
      {e:"&#x1F91D;",t:"Assistencia tecnica nao e custo, e investimento. Um bom agronomo paga mais do que cobra."},
      {e:"&#x1F4CA;",t:"Dados valem ouro. Quem nao registra, nao sabe o que aconteceu - e repete os erros."}
    ];
    var dica=dicas[new Date().getDate()%dicas.length];
    var rAgro=[], rGer=[], rFin=[];
    var temSafra=safrasAb.length>0;
    var diasInicio=0;
    if(temSafra&&safrasAb[0].data_inicio){diasInicio=Math.floor((new Date()-new Date(safrasAb[0].data_inicio))/(86400000));}
    var cultPrinc=temSafra?(safrasAb[0].cultura||safrasAb[0].nome||"safra atual"):"safra";
    if(temSafra){
      if(diasInicio>90)rAgro.push({p:"alta",i:"&#x1F33F;",t:"Avaliacao de desenvolvimento",d:"Safra de "+esc(cultPrinc)+" com "+diasInicio+" dias. Verifique estagio fenologico e ajuste nutricao de cobertura."});
      else rAgro.push({p:"media",i:"&#x1F331;",t:"Monitoramento inicial da safra",d:"Safra em fase inicial ("+diasInicio+" dias). Realize monitoramento de pragas a cada 7 dias. Priorize estabelecimento do estande."});
    } else { rAgro.push({p:"baixa",i:"&#x1F4CB;",t:"Sem safras em andamento",d:"Nenhuma safra ativa. Ideal para planejamento: analise de solo, escolha de cultivares e cronograma de insumos."}); }
    if(insBaixos.length>0){
      var nIns=insBaixos.slice(0,2).map(function(i){return i.nome;}).join(", ");
      rAgro.push({p:"alta",i:"&#x26A0;&#xFE0F;",t:"Reposicao urgente de insumos",d:"Estoque critico: "+esc(nIns)+(insBaixos.length>2?" e mais "+(insBaixos.length-2):"")+ ". Providencie reposicao antes do proximo ciclo."});
    } else if(insumos.length>0){rAgro.push({p:"baixa",i:"&#x2705;",t:"Estoque de insumos adequado",d:"Todos os insumos monitorados estao acima do minimo. Revise previsao de consumo para proximas 4 semanas."});}
    if(rAgro.length<3)rAgro.push({p:"media",i:"&#x1F9EA;",t:"Analise de solo recomendada",d:"Recomenda-se analise de solo a cada 2 anos. Verifique se os talhoes ativos possuem laudos atualizados."});
    var fazSemSafra=fazendas.filter(function(f){return!safrasAb.some(function(s){return s.fazenda_id===f.id;});});
    if(fazSemSafra.length>0){rGer.push({p:"media",i:"&#x1F3E1;",t:"Fazendas sem safra ativa",d:fazSemSafra.length+" fazenda(s) sem safra: "+esc(fazSemSafra.slice(0,2).map(function(f){return f.nome;}).join(", "))+". Avalie ociosidade."});}
    var temCert=fazendas.some(function(f){return f.certificada;});
    if(temCert){rGer.push({p:"alta",i:"&#x1F3C5;",t:"Conformidade de certificacao",d:"Fazendas certificadas identificadas. Realize auditoria interna antes do proximo ciclo de auditoria externa."});}
    else{rGer.push({p:"baixa",i:"&#x1F4CB;",t:"Certificacao pode agregar valor",d:"Nenhuma fazenda certificada. Programas como Organico MAPA podem aumentar o valor do produto em ate 30%."});}
    if(ultLanc.length>0){
      if(totalRec<totalDesp){rFin.push({p:"alta",i:"&#x1F4C9;",t:"Saldo negativo nos lancamentos",d:"Despesas ("+fmtR(totalDesp)+") superiores as receitas ("+fmtR(totalRec)+"). Revise o fluxo de caixa urgentemente."});}
      else{rFin.push({p:"baixa",i:"&#x1F4C8;",t:"Fluxo positivo recente",d:"Receitas ("+fmtR(totalRec)+") superiores as despesas ("+fmtR(totalDesp)+"). Mantenha o controle e reinvista estrategicamente."});}
    } else{rFin.push({p:"media",i:"&#x1F4CA;",t:"Sem registros financeiros recentes",d:"Inicie o registro de despesas e receitas para obter analise de rentabilidade por safra."});}
    var propCrit=insumos.length>0?insBaixos.length/insumos.length:0;
    if(propCrit>0.3){rFin.push({p:"alta",i:"&#x1F4B0;",t:"Alto custo de reposicao previsto",d:Math.round(propCrit*100)+"% dos insumos abaixo do minimo. Compras emergenciais sao mais caras. Negocie com antecedencia."});}
    else{rFin.push({p:"baixa",i:"&#x1F4A1;",t:"Planejamento de compras",d:"Realize cotacoes com 60-90 dias de antecedencia para insumos da proxima safra. Reduz custo medio em 10-20%."});}
    function kpi(icon,lbl,val,sub,cor){
      var o="<div style=\"background:#fff;border-radius:12px;padding:16px 20px;border:1.5px solid #e5e7eb;position:relative;overflow:hidden\">";
      o+="<div style=\"position:absolute;top:0;left:0;width:4px;height:100%;background:#"+cor+";\"></div>";
      o+="<div style=\"font-size:1.5rem;line-height:1;margin-bottom:6px\">"+icon+"</div>";
      o+="<div style=\"font-size:1.7rem;font-weight:700;color:#1a3a1a\">"+val+"</div>";
      o+="<div style=\"font-size:0.68rem;font-weight:700;letter-spacing:1px;color:#"+cor+";margin-top:2px\">"+lbl+"</div>";
      o+="<div style=\"font-size:0.74rem;color:#9ca3af;margin-top:2px\">"+sub+"</div>";
      o+="</div>";
      return o;
    }
    function semCard(ins){
      var pct=(ins.estoque_minimo||0)>0?(ins.estoque_atual||0)/(ins.estoque_minimo||1):1;
      var cor=pct<=0?"#dc2626":pct<1?"#d97706":"#16a34a";
      var ico=pct<=0?"&#x1F534;":pct<1?"&#x1F7E1;":"&#x1F7E2;";
      var lbl=pct<=0?"Critico":pct<1?"Baixo":"OK";
      var o="<div style=\"display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#f9fafb;border-radius:8px;margin-bottom:5px\">";
      o+="<div style=\"display:flex;align-items:center;justify-content:space-between;padding:7px 10px;background:#f9fafb;border-radius:8px;margin-bottom:5px\">";
      o+="<span style=\"font-size:0.82rem;color:#374151\">"+ico+" "+esc(ins.nome)+"</span>";
      o+="<span style=\"font-size:0.7rem;font-weight:600;color:#fff;background:"+cor+";padding:2px 8px;border-radius:10px\">"+lbl+"</span>";
      o+="</div>";
      return o;
    }
    function rcCard(r){
      var c=r.p==="alta"?"#dc2626":r.p==="media"?"#d97706":"#16a34a";
      var bg=r.p==="alta"?"#fef2f2":r.p==="media"?"#fffbeb":"#f0fdf4";
      var o="";
      o+="<div style=\"background:"+bg+";border:1px solid "+c+"33;border-left:3px solid "+c+";border-radius:8px;padding:11px 13px;margin-bottom:9px\">";
      o+="<div style=\"font-size:0.83rem;font-weight:600;color:#1a3a1a;margin-bottom:3px\">"+r.i+" "+esc(r.t)+"</div>";
      o+="<div style=\"font-size:0.78rem;color:#6b7280;line-height:1.5\">"+r.d+"</div>";
      o+="</div>";
      return o;
    }
    function sfCard(sf){
      var diasFim=sf.data_fim_prevista?Math.floor((new Date(sf.data_fim_prevista)-new Date())/(86400000)):null;
      var sc=diasFim!==null&&diasFim<30?"#dc2626":diasFim!==null&&diasFim<60?"#d97706":"#16a34a";
      var sl=diasFim!==null&&diasFim<30?"Atencao":diasFim!==null&&diasFim<60?"Alerta":"Normal";
      var o="";
      o+="<div style=\"padding:10px 0;border-bottom:1px solid #f3f4f6\">";
      o+="<div style=\"display:flex;justify-content:space-between;align-items:flex-start\">";
      o+="<div><div style=\"font-weight:600;color:#374151;font-size:0.88rem\">&#x1F33E; "+esc(sf.nome)+"</div>";
      o+="<div style=\"font-size:0.76rem;color:#9ca3af\">"+esc((sf.fazendas&&sf.fazendas.nome)||"")+(sf.cultura?" &middot; "+esc(sf.cultura):"")+(sf.area_total?" &middot; "+fmtN(sf.area_total)+"ha":"")+"</div></div>";
      o+="<span style=\"font-size:0.7rem;font-weight:600;color:#fff;background:"+sc+";padding:3px 9px;border-radius:10px\">"+sl+"</span>";
      o+="</div></div>";
      return o;
    }
    function fazCard(f){
      var temSf=safrasAb.some(function(s){return s.fazenda_id===f.id;});
      var talFaz=talhoesTd.filter(function(t){return t.fazenda_id===f.id;});
      var aFaz=talFaz.reduce(function(s,t){return s+(t.area||0);},0);
      var o="";
      o+="<div style=\"display:flex;align-items:center;justify-content:space-between;padding:9px 0;border-bottom:1px solid #f3f4f6\">";
      o+="<div style=\"display:flex;align-items:center;gap:9px\">";
      o+="<div style=\"width:34px;height:34px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:1rem\">&#x1F3E1;</div>";
      o+="<div><div style=\"font-weight:600;color:#374151;font-size:0.86rem\">"+esc(f.nome)+"</div>";
      o+="<div style=\"font-size:0.73rem;color:#9ca3af\">"+(f.cidade||"")+(f.estado?" - "+f.estado:"")+(aFaz>0?" &middot; "+fmtN(aFaz)+"ha":"")+"</div></div></div>";
      o+="<div style=\"display:flex;gap:5px;align-items:center\">";
      if(f.certificada)o+="<span style=\"font-size:0.66rem;background:#fef3c7;color:#92400e;padding:2px 6px;border-radius:5px;font-weight:600\">&#x1F3C5; Cert.</span>";
      o+="<span style=\"font-size:0.7rem;font-weight:600;padding:3px 8px;border-radius:10px;"+(temSf?"background:#dcfce7;color:#16a34a":"background:#f3f4f6;color:#9ca3af")+"\">"+( temSf?"Em safra":"Inativa")+"</span>";
      o+="</div></div>";
      return o;
    }
    var html="";
    html+="<div style=\"padding:20px 24px;max-width:1300px;margin:0 auto\">";
    var dtStr=new Date().toLocaleDateString("pt-BR",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
    html+="<div style=\"background:linear-gradient(135deg,#1a3a1a,#2d5a2d 60%,#3d7a3d);border-radius:16px;padding:22px 26px;margin-bottom:22px;display:grid;grid-template-columns:1fr auto;gap:20px;align-items:center\">";
    html+="<div><div style=\"font-size:0.75rem;color:#86efac;letter-spacing:1px;text-transform:uppercase;margin-bottom:5px\">&#x1F33F; JA Agro Intelligence</div>";
    html+="<h2 style=\"margin:0 0 3px;font-size:1.5rem;color:#fff;font-weight:700\">"+saud+", "+esc(uNome)+"! &#x1F44B;</h2>";
    html+="<div style=\"font-size:0.82rem;color:#bbf7d0\">"+dtStr+"</div></div>";
    html+="<div style=\"background:rgba(255,255,255,0.1);border-radius:12px;padding:14px 18px;min-width:200px\">"+climaHtml+"</div>";
    html+="</div>";
    html+="<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:13px;margin-bottom:22px\">";
    html+=kpi("&#x1F3E1;","FAZENDAS",totalFaz,"Ativas no sistema","2563eb");
    html+=kpi("&#x1F464;","USUARIOS",totalUsu,"Produtores e equipe","7c3aed");
    html+=kpi("&#x1F5FA;","TALHOES",totalTal,"Total cadastrado","d97706");
    html+=kpi("&#x1F33E;","SAFRAS ABERTAS",safrasAb.length,"Em andamento","16a34a");
    html+=kpi("&#x26A0;","PENDENCIAS",totalPend,"Insumos abaixo do minimo",totalPend>0?"dc2626":"16a34a");
    html+="</div>";
    html+="<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;margin-bottom:18px\">";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:14px\">";
    html+="<h3 style=\"margin:0;font-size:0.95rem;color:#1a3a1a;font-weight:700\">&#x1F33F; Saude das Safras</h3>";
    html+="<button onclick=\"loadModule('safras',document.querySelector('[data-module=safras]'));\" style=\"background:none;border:none;color:#16a34a;cursor:pointer;font-size:0.78rem;font-weight:600\">Ver todas &#x2192;</button></div>";
    if(safrasAb.length===0){html+="<p style=\"color:#9ca3af;text-align:center;padding:18px 0;font-size:0.88rem\">Nenhuma safra em andamento</p>";
    }else{safrasAb.forEach(function(sf){html+=sfCard(sf);});}
    html+="</div>";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:14px\">";
    html+="<h3 style=\"margin:0;font-size:0.95rem;color:#1a3a1a;font-weight:700\">&#x1F9EA; Semaforo de Estoque</h3>";
    html+="<button onclick=\"loadModule('insumos',document.querySelector('[data-module=insumos]'));\" style=\"background:none;border:none;color:#16a34a;cursor:pointer;font-size:0.78rem;font-weight:600\">Ver todos &#x2192;</button></div>";
    var insComMin=insumos.filter(function(i){return (i.estoque_minimo||0)>0;});
    if(insComMin.length===0){html+="<p style=\"color:#9ca3af;text-align:center;padding:18px 0;font-size:0.88rem\">Configure estoque minimo nos insumos</p>";
    }else{insComMin.slice(0,6).forEach(function(ins){html+=semCard(ins);});}
    html+="</div>";
    html+="</div>";
    html+="<div style=\"background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:1.5px solid #86efac;border-radius:12px;padding:16px 20px;margin-bottom:18px;display:flex;align-items:flex-start;gap:14px\">";
    html+="<div style=\"background:#16a34a;color:#fff;border-radius:50%;width:40px;height:40px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;flex-shrink:0\">&#x1F468;&#x200D;&#x1F33E;</div>";
    html+="<div><div style=\"font-size:0.72rem;font-weight:700;color:#16a34a;letter-spacing:1px;text-transform:uppercase;margin-bottom:3px\">&#x1F4A1; Dica do Agronomo</div>";
    html+="<div style=\"font-size:0.92rem;color:#1a3a1a;line-height:1.6\">"+dica.e+" "+dica.t+"</div></div></div>";
    html+="<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:18px;margin-bottom:18px\">";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<h3 style=\"margin:0 0 12px;font-size:0.9rem;color:#1a3a1a;font-weight:700\"><span style=\"background:#dcfce7;color:#16a34a;padding:2px 7px;border-radius:5px;font-size:0.65rem;font-weight:700;margin-right:6px\">IA</span>&#x1F33F; Agronomicas</h3>";
    rAgro.slice(0,3).forEach(function(r){html+=rcCard(r);});
    html+="</div>";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<h3 style=\"margin:0 0 12px;font-size:0.9rem;color:#1a3a1a;font-weight:700\"><span style=\"background:#ede9fe;color:#7c3aed;padding:2px 7px;border-radius:5px;font-size:0.65rem;font-weight:700;margin-right:6px\">IA</span>&#x1F4CB; Gerenciais</h3>";
    rGer.slice(0,2).forEach(function(r){html+=rcCard(r);});
    html+="</div>";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<h3 style=\"margin:0 0 12px;font-size:0.9rem;color:#1a3a1a;font-weight:700\"><span style=\"background:#fef3c7;color:#d97706;padding:2px 7px;border-radius:5px;font-size:0.65rem;font-weight:700;margin-right:6px\">IA</span>&#x1F4B0; Financeiras</h3>";
    rFin.slice(0,2).forEach(function(r){html+=rcCard(r);});
    html+="</div>";
    html+="</div>";
    html+="<div style=\"display:grid;grid-template-columns:repeat(auto-fit,minmax(360px,1fr));gap:18px;margin-bottom:18px\">";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:14px\">";
    html+="<h3 style=\"margin:0;font-size:0.95rem;color:#1a3a1a;font-weight:700\">&#x1F3E1; Resumo das Fazendas</h3>";
    html+="<button onclick=\"loadModule('fazendas',document.querySelector('[data-module=fazendas]'));\" style=\"background:none;border:none;color:#16a34a;cursor:pointer;font-size:0.78rem;font-weight:600\">Ver todas &#x2192;</button></div>";
    if(fazendas.length===0){html+="<p style=\"color:#9ca3af;text-align:center;padding:18px 0;font-size:0.88rem\">Nenhuma fazenda cadastrada</p>";
    }else{fazendas.slice(0,5).forEach(function(f){html+=fazCard(f);});}
    html+="</div>";
    html+="<div style=\"background:#fff;border-radius:12px;border:1.5px solid #e5e7eb;padding:18px\">";
    html+="<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:14px\">";
    html+="<h3 style=\"margin:0;font-size:0.95rem;color:#1a3a1a;font-weight:700\">&#x1F4CB; Ultimos Lancamentos</h3>";
    html+="<button onclick=\"loadModule('lancamentos',document.querySelector('[data-module=lancamentos]'));\" style=\"background:none;border:none;color:#16a34a;cursor:pointer;font-size:0.78rem;font-weight:600\">Ver todos &#x2192;</button></div>";
    if(ultLanc.length===0){html+="<p style=\"color:#9ca3af;text-align:center;padding:18px 0;font-size:0.88rem\">Nenhum lancamento ainda</p>";
    }else{
      ultLanc.slice(0,6).forEach(function(l){
        var isD=l.tipo==="despesa";
        var dFmt=l.data_lancamento?new Date(l.data_lancamento+"T00:00:00").toLocaleDateString("pt-BR"):"";
        html+="<div style=\"display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f3f4f6\">";
        html+="<div style=\"display:flex;align-items:center;gap:7px\">";
        html+="<div style=\"width:26px;height:26px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.7rem;font-weight:700;"+(isD?"background:#fee2e2;color:#dc2626":"background:#dcfce7;color:#16a34a")+"\">"+(isD?"D":"R")+"</div>";
        html+="<div><div style=\"font-size:0.82rem;font-weight:500;color:#374151\">"+esc(l.descricao||"")+"</div>";
        html+="<div style=\"font-size:0.71rem;color:#9ca3af\">"+dFmt+(l.fazendas?" &middot; "+esc(l.fazendas.nome):"")+"</div></div></div>";
        html+="<div style=\"font-weight:600;font-size:0.83rem;color:"+(isD?"#dc2626":"#16a34a")+"\">"+(isD?"-":"+")+fmtR(l.despesa||0)+"</div></div>";
      });
    }
    html+="</div>";
    html+="</div>";
    html+="<div style=\"background:linear-gradient(135deg,#f8fafc,#f0fdf4);border:1.5px solid #e5e7eb;border-radius:12px;padding:16px 20px;margin-bottom:8px\">";
    html+="<h3 style=\"margin:0 0 12px;font-size:0.9rem;color:#1a3a1a;font-weight:700\">&#x26A1; Acoes Rapidas</h3>";
    html+="<div style=\"display:flex;flex-wrap:wrap;gap:9px\">";
    html+="<button onclick=\"loadModule('lancamentos',document.querySelector('[data-module=lancamentos]'));\" style=\"background:#16a34a;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.83rem;font-weight:600\">+ Novo Lancamento</button>";
    html+="<button onclick=\"loadModule('safras',document.querySelector('[data-module=safras]'));\" style=\"background:#fff;color:#1a3a1a;border:1.5px solid #e5e7eb;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.83rem\">&#x1F33E; Safras</button>";
    html+="<button onclick=\"loadModule('insumos',document.querySelector('[data-module=insumos]'));\" style=\"background:#fff;color:#1a3a1a;border:1.5px solid #e5e7eb;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.83rem\">&#x1F9EA; Insumos</button>";
    html+="<button onclick=\"loadModule('dashboard',document.querySelector('[data-module=dashboard]'));\" style=\"background:#fff;color:#1a3a1a;border:1.5px solid #e5e7eb;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.83rem\">&#x1F4CA; Dashboard</button>";
    html+="<button onclick=\"loadModule('certificacao',document.querySelector('[data-module=certificacao]'));\" style=\"background:#fff;color:#1a3a1a;border:1.5px solid #e5e7eb;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:0.83rem\">&#x1F3C5; Certificacao</button>";
    html+="</div></div>";
    html+="<div style=\"text-align:center;padding:12px 0 2px;font-size:0.7rem;color:#d1d5db\">&#x23F1; Atualizado em "+new Date().toLocaleTimeString("pt-BR")+" &middot; JA Agro Intelligence v1.0</div>";
    html+="</div>";
    c.innerHTML=html;
  } catch(e) {
    c.innerHTML="<div style=\"padding:40px;text-align:center;color:#dc2626\">Erro ao carregar Home: "+String(e.message).replace(/</g,"&lt;")+"</div>";
  }
};
window.AdminHome = window.module_home;
