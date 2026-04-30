// ============================================================
// JA AGRO — Module: Home (Visão Geral Operacional)
// admin-home.js | v2.0 UX Profissional
// ============================================================
(function(){
'use strict';
window.module_home = async function(){
  if(typeof setTopbar === 'function') setTopbar('Home', 'Visão geral operacional');
  setLoading('mainContent');
  try {
    var [r1,r2,r3,r4,r5,r6,r7] = await Promise.all([
      sb.from('fazendas').select('id,nome,area_total_ha,certificada').eq('ativo',true),
      sb.from('safras').select('id,nome,cultura,status,area_ha,data_plantio,data_colheita,fazendas(nome)').order('data_plantio',{ascending:false}),
      sb.from('talhoes').select('id,nome,area_ha').eq('ativo',true),
      sb.from('insumos').select('id,nome,categoria,estoque_atual,estoque_minimo,unidade').eq('ativo',true),
      sb.from('maquinas').select('id,nome,tipo,horimetro_atual,proxima_manutencao_h').eq('ativo',true),
      sb.from('operadores').select('id,nome,funcao').eq('ativo',true),
      sb.from('lancamentos').select('id,tipo,custo_total,data_lancamento,descricao,categorias_lancamento(nome)').order('data_lancamento',{ascending:false}).limit(10)
    ]);
    var fazendas=r1.data||[], safras=r2.data||[], talhoes=r3.data||[];
    var insumos=r4.data||[], maquinas=r5.data||[], operadores=r6.data||[], lancamentos=r7.data||[];
    var today=new Date();
    var safrasAbertas=safras.filter(s=>s.status==='aberta');
    var safrasPlan=safras.filter(s=>s.status==='planejamento');
    var totalHa=talhoes.reduce((a,t)=>a+(t.area_ha||0),0);
    var insAbaixo=insumos.filter(i=>i.estoque_atual!==null&&i.estoque_minimo!==null&&parseFloat(i.estoque_atual)<=parseFloat(i.estoque_minimo));
    var maqManut=maquinas.filter(m=>m.proxima_manutencao_h&&m.horimetro_atual&&parseFloat(m.horimetro_atual)>=(parseFloat(m.proxima_manutencao_h)-50));
    var cutoff=new Date();cutoff.setDate(cutoff.getDate()-30);
    var cutoffStr=cutoff.toISOString().slice(0,10);
    var despesas30=lancamentos.filter(l=>l.tipo==='despesa'&&l.data_lancamento>=cutoffStr).reduce((a,l)=>a+(l.custo_total||0),0);
    var receitas30=lancamentos.filter(l=>l.tipo==='receita'&&l.data_lancamento>=cutoffStr).reduce((a,l)=>a+(l.custo_total||0),0);
    var pendencias=[];
    if(insAbaixo.length>0) pendencias.push({ico:'⚠️',msg:insAbaixo.length+' insumo(s) abaixo do estoque mínimo',link:'insumos',cor:'#f59e0b'});
    if(maqManut.length>0) pendencias.push({ico:'🔧',msg:maqManut.length+' máquina(s) com manutenção pendente',link:'maquinas',cor:'#ef4444'});
feat: atualiza Home com KPIs operacionais, safras, pendencias e financeiro 30d    function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'--';}
    function pct(s){if(!s.data_plantio||!s.data_colheita)return -1;var i=new Date(s.data_plantio).getTime(),f=new Date(s.data_colheita).getTime(),n=Date.now();if(n<i)return 0;if(n>f)return 100;return Math.round((n-i)/(f-i)*100);}
    var html='<style>.home-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:20px}.kpi{background:#fff;border-radius:10px;padding:16px;border:1px solid #e5e7eb;border-left:4px solid}.kv{font-size:26px;font-weight:800;line-height:1;margin:4px 0}.kl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.5px;font-weight:700}.ks{font-size:11px;color:#9ca3af;margin-top:2px}.home-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.hcard{background:#fff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden}.hcard-h{padding:14px 16px;border-bottom:1px solid #f3f4f6;display:flex;align-items:center;justify-content:space-between}.hcard-t{font-size:13px;font-weight:700;color:#1a2e1a}.hcard-b{padding:14px 16px}.sitem{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f9fafb}.sitem:last-child{border-bottom:none}.pitem{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;margin-bottom:6px;cursor:pointer;transition:opacity .15s}.pitem:hover{opacity:.85}.litem{display:flex;align-items:center;justify-content:space-between;padding:7px 0;border-bottom:1px solid #f9fafb}.litem:last-child{border-bottom:none}@media(max-width:800px){.home-grid{grid-template-columns:1fr}.home-kpi{grid-template-columns:repeat(2,1fr)}}</style>';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><div style="font-size:20px;font-weight:800;color:#1a2e1a">🌱 Visão Geral</div><div style="font-size:12px;color:#6b7280">'+today.toLocaleDateString('pt-BR',{weekday:'long',year:'numeric',month:'long',day:'numeric'})+'</div></div><div style="display:flex;gap:8px"><button class="btn btn-outline" onclick="loadModule('dashboard',document.querySelector('[data-module=dashboard]'))">📊 Dashboard</button><button class="btn btn-primary" onclick="loadModule('lancamentos',document.querySelector('[data-module=lancamentos]'))">+ Lançamento</button></div></div>';
    html+='<div class="home-kpi"><div class="kpi" style="border-color:#15803d"><div style="font-size:20px">🏡</div><div class="kv" style="color:#15803d">'+fazendas.length+'</div><div class="kl">Fazendas</div><div class="ks">'+totalHa.toLocaleString('pt-BR')+' ha gerenciados</div></div><div class="kpi" style="border-color:#3b82f6"><div style="font-size:20px">🌾</div><div class="kv" style="color:#3b82f6">'+safrasAbertas.length+'</div><div class="kl">Safras Abertas</div><div class="ks">'+safrasPlan.length+' em planejamento</div></div><div class="kpi" style="border-color:'+(insAbaixo.length>0?'#f59e0b':'#10b981')+'"><div style="font-size:20px">'+(insAbaixo.length>0?'⚠️':'✅')+'</div><div class="kv" style="color:'+(insAbaixo.length>0?'#f59e0b':'#10b981')+'">'+insumos.length+'</div><div class="kl">Insumos</div><div class="ks">'+insAbaixo.length+' abaixo do mínimo</div></div><div class="kpi" style="border-color:#8b5cf6"><div style="font-size:20px">💰</div><div class="kv" style="color:#8b5cf6">R$'+(despesas30/1000).toFixed(1)+'k</div><div class="kl">Despesas (30d)</div><div class="ks">R$'+(receitas30/1000).toFixed(1)+'k receitas</div></div><div class="kpi" style="border-color:#ec4899"><div style="font-size:20px">👷</div><div class="kv" style="color:#ec4899">'+operadores.length+'</div><div class="kl">Operadores</div><div class="ks">Equipe ativa</div></div></div>';
    html+='<div class="home-grid"><div class="hcard"><div class="hcard-h"><div class="hcard-t">🌱 Safras em Andamento</div><span style="font-size:12px;color:#15803d;cursor:pointer" onclick="loadModule('safras',document.querySelector('[data-module=safras]'))">Ver todas →</span></div><div class="hcard-b">';
    var safrasList=[...safrasAbertas,...safrasPlan].slice(0,4);
    if(safrasList.length===0) html+='<div style="text-align:center;color:#9ca3af;padding:20px;font-size:13px">Nenhuma safra ativa</div>';
    else safrasList.forEach(function(s){var p=pct(s),cor=s.status==='aberta'?'#15803d':'#3b82f6';html+='<div class="sitem"><div style="width:8px;height:8px;border-radius:50%;background:'+cor+'"></div><div style="flex:1"><div style="font-size:13px;font-weight:600;color:#1a2e1a">'+esc(s.nome)+'</div><div style="font-size:11px;color:#9ca3af">'+esc(s.fazendas&&s.fazendas.nome)+' • '+esc(s.cultura)+'</div>'+(p>=0&&s.status==='aberta'?'<div style="background:#f3f4f6;border-radius:3px;height:4px;margin-top:4px"><div style="background:#15803d;width:'+p+'%;height:4px;border-radius:3px"></div></div>':'')+'</div><span style="font-size:10px;padding:2px 6px;border-radius:12px;background:'+(s.status==='aberta'?'#dcfce7':'#dbeafe')+';color:'+(s.status==='aberta'?'#166534':'#1e40af')+';font-weight:700">'+(s.status==='aberta'?'Aberta':'Plan.')+'</span></div>';});
    html+='</div></div><div class="hcard"><div class="hcard-h"><div class="hcard-t">🔔 Pendências ('+pendencias.length+')</div></div><div class="hcard-b">';
    if(pendencias.length===0) html+='<div style="text-align:center;color:#10b981;padding:20px;font-size:13px">✅ Tudo em ordem!</div>';
    else pendencias.forEach(function(p){html+='<div class="pitem" style="background:'+p.cor+'18;border:1px solid '+p.cor+'33" onclick="loadModule(''+p.link+'',document.querySelector('[data-module='+p.link+']'))"><span style="font-size:18px">'+p.ico+'</span><span style="font-size:13px;font-weight:500;color:#374151">'+p.msg+'</span><span style="margin-left:auto;font-size:12px;color:'+p.cor+';font-weight:700">Ver →</span></div>';});
    html+='</div></div></div>';
    html+='<div class="hcard"><div class="hcard-h"><div class="hcard-t">💳 Resumo Financeiro — Últimos 30 dias</div><span style="font-size:12px;color:#15803d;cursor:pointer" onclick="loadModule('lancamentos',document.querySelector('[data-module=lancamentos]'))">Ver todos →</span></div><div class="hcard-b"><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px"><div style="background:#fef2f2;border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#ef4444">R$ '+despesas30.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div style="font-size:11px;font-weight:700;color:#ef4444;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Despesas</div></div><div style="background:#f0fdf4;border-radius:8px;padding:12px;text-align:center"><div style="font-size:20px;font-weight:800;color:#15803d">R$ '+receitas30.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div style="font-size:11px;font-weight:700;color:#15803d;text-transform:uppercase;letter-spacing:.5px;margin-top:2px">Receitas</div></div></div>';
    if(lancamentos.length===0) html+='<div style="text-align:center;color:#9ca3af;padding:16px">Nenhum lançamento encontrado</div>';
    else lancamentos.slice(0,5).forEach(function(l){html+='<div class="litem"><div><div style="font-size:13px;font-weight:500;color:#374151">'+esc(l.descricao)+'</div><div style="font-size:11px;color:#9ca3af">'+esc(l.categorias_lancamento&&l.categorias_lancamento.nome)+' • '+(l.data_lancamento||'')+'</div></div><div style="font-size:13px;font-weight:700;color:'+(l.tipo==='receita'?'#15803d':'#ef4444')+'">'+(l.tipo==='receita'?'+':'-')+'R$ '+(l.custo_total||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div></div>';});
    html+='</div></div>';
    document.getElementById('mainContent').innerHTML=html;
  }catch(e){document.getElementById('mainContent').innerHTML='<div style="padding:40px;text-align:center;color:#ef4444"><div style="font-size:48px;margin-bottom:12px">⚠️</div><div>Erro ao carregar Home: '+e.message+'</div></div>';}
};
window.module_home();
})();
