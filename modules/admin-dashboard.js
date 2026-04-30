// JA AGRO — Module: Dashboard (Gráficos e KPIs)
// admin-dashboard.js | Chart.js v1.0
(function(){
'use strict';
var _charts = [];
function destroyCharts(){_charts.forEach(function(c){try{c.destroy();}catch(e){}});_charts=[];}

window.module_dashboard = async function(){
  destroyCharts();
  if(typeof setTopbar==='function') setTopbar('Dashboard','Indicadores analíticos por safra e cultura');
  setLoading('mainContent');
  try {
    var [r1,r2,r3,r4] = await Promise.all([
      sb.from('fazendas').select('id,nome,area_total_ha').eq('ativo',true),
      sb.from('safras').select('id,nome,cultura,status,area_ha,fazenda_id,fazendas(nome)').order('nome'),
      sb.from('lancamentos').select('id,tipo,custo_total,data_lancamento,fazenda_id,safra_id,categorias_lancamento(nome,tipo)').order('data_lancamento'),
      sb.from('talhoes').select('id,nome,area_ha,fazenda_id').eq('ativo',true)
    ]);
    var fazendas=r1.data||[], safras=r2.data||[], lancamentos=r3.data||[], talhoes=r4.data||[];
    
    var totalDespesas=lancamentos.filter(l=>l.tipo==='despesa').reduce((a,l)=>a+(l.custo_total||0),0);
    var totalReceitas=lancamentos.filter(l=>l.tipo==='receita').reduce((a,l)=>a+(l.custo_total||0),0);
    var resultado=totalReceitas-totalDespesas;
    var totalArea=talhoes.reduce((a,t)=>a+(t.area_ha||0),0);
    var custoHa=totalArea>0?totalDespesas/totalArea:0;
    
    var html='<style>.dash-kpi{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:14px;margin-bottom:20px}.dkpi{background:#fff;border-radius:10px;padding:18px;border:1px solid #e5e7eb;border-top:3px solid}.dkv{font-size:26px;font-weight:900;line-height:1;margin:6px 0 4px}.dkl{font-size:11px;color:#6b7280;text-transform:uppercase;letter-spacing:.6px;font-weight:700}.dks{font-size:12px;color:#9ca3af;margin-top:2px}.chart-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}.ccard{background:#fff;border-radius:10px;border:1px solid #e5e7eb;padding:18px}.ctitle{font-size:13px;font-weight:700;color:#1a2e1a;margin-bottom:14px}.cwrap{position:relative;height:220px}.dash-table{width:100%;border-collapse:collapse;font-size:13px}.dash-table th{background:#f9fafb;color:#6b7280;font-weight:700;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:10px 14px;text-align:left;border-bottom:1px solid #e5e7eb}.dash-table td{padding:10px 14px;border-bottom:1px solid #f9fafb;color:#374151}.dash-table tr:hover td{background:#fafaf8}@media(max-width:800px){.chart-row{grid-template-columns:1fr}}</style>';
    html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px"><div><div style="font-size:20px;font-weight:800;color:#1a2e1a">📊 Dashboard Analítico</div><div style="font-size:12px;color:#6b7280">Indicadores de desempenho por fazenda, safra e cultura</div></div><button class="btn btn-outline" onclick="window.module_dashboard()">🔄 Atualizar</button></div>';
    html+='<div class="dash-kpi"><div class="dkpi" style="border-color:#15803d"><div class="dkl">Receitas Total</div><div class="dkv" style="color:#15803d">R$ '+totalReceitas.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div class="dks">Todo o período</div></div><div class="dkpi" style="border-color:#ef4444"><div class="dkl">Despesas Total</div><div class="dkv" style="color:#ef4444">R$ '+totalDespesas.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div class="dks">Todo o período</div></div><div class="dkpi" style="border-color:'+(resultado>=0?'#15803d':'#ef4444')+'"><div class="dkl">Resultado</div><div class="dkv" style="color:'+(resultado>=0?'#15803d':'#ef4444')+'">'+(resultado>=0?'+':'')+'R$ '+resultado.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div class="dks">Receitas - Despesas</div></div><div class="dkpi" style="border-color:#3b82f6"><div class="dkl">Custo/ha</div><div class="dkv" style="color:#3b82f6">R$ '+custoHa.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div class="dks">Área total: '+totalArea+'ha</div></div></div>';
    html+='<div class="chart-row"><div class="ccard"><div class="ctitle">📅 Despesas x Receitas por Mês</div><div class="cwrap"><canvas id="chartMensal"></canvas></div></div><div class="ccard"><div class="ctitle">🏷️ Despesas por Categoria</div><div class="cwrap"><canvas id="chartCat"></canvas></div></div></div>';
    html+='<div class="chart-row"><div class="ccard"><div class="ctitle">🌾 Custo por Cultura</div><div class="cwrap"><canvas id="chartCult"></canvas></div></div><div class="ccard"><div class="ctitle">🏡 Custo por Fazenda</div><div class="cwrap"><canvas id="chartFaz"></canvas></div></div></div>';
    
    // Safras table
    html+='<div style="background:#fff;border-radius:10px;border:1px solid #e5e7eb;overflow:hidden;margin-bottom:16px"><div style="padding:14px 16px;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#1a2e1a">📋 Ranking Safras — Custo por Hectare</div><table class="dash-table"><thead><tr><th>Safra</th><th>Fazenda</th><th>Cultura</th><th>Área</th><th>Status</th><th>Custo Total</th><th>R$/ha</th></tr></thead><tbody>';
    if(safras.length===0) html+='<tr><td colspan="7" style="text-align:center;color:#9ca3af;padding:20px">Nenhuma safra</td></tr>';
    else safras.forEach(function(s){
      var cs=lancamentos.filter(l=>l.safra_id===s.id&&l.tipo==='despesa').reduce((a,l)=>a+(l.custo_total||0),0);
      var cpha=s.area_ha&&s.area_ha>0?cs/s.area_ha:0;
      var badge=s.status==='aberta'?'background:#dcfce7;color:#166534':s.status==='planejamento'?'background:#dbeafe;color:#1e40af':'background:#f3f4f6;color:#6b7280';
      var label=s.status==='aberta'?'Aberta':s.status==='planejamento'?'Planejamento':'Encerrada';
      html+='<tr><td style="font-weight:600">'+esc(s.nome)+'</td><td>'+esc(s.fazendas&&s.fazendas.nome||'--')+'</td><td>'+esc(s.cultura||'--')+'</td><td>'+( s.area_ha||0)+' ha</td><td><span style="font-size:11px;padding:2px 8px;border-radius:12px;font-weight:700;'+badge+'">'+label+'</span></td><td>R$ '+cs.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</td><td style="font-weight:700;color:#15803d">R$ '+cpha.toLocaleString('pt-BR',{minimumFractionDigits:2})+'</td></tr>';
    });
    html+='</tbody></table></div>';
    document.getElementById('mainContent').innerHTML=html;
    
    // Load Chart.js
    function esc(s){return s?String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'):'--';}
    if(typeof Chart==='undefined'){
      var sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js';
      sc.onload=drawCharts;document.head.appendChild(sc);
    } else drawCharts();
    
    function drawCharts(){
      var COLORS=['#15803d','#3b82f6','#f59e0b','#8b5cf6','#ef4444','#10b981','#f97316','#06b6d4'];
      // Monthly
      var meses={};
      lancamentos.forEach(function(l){var m=(l.data_lancamento||'').slice(0,7);if(!m)return;meses[m]=meses[m]||{d:0,r:0};if(l.tipo==='despesa')meses[m].d+=l.custo_total||0;else meses[m].r+=l.custo_total||0;});
      var ms=Object.keys(meses).sort();
      if(ms.length>0&&document.getElementById('chartMensal')){
        _charts.push(new Chart(document.getElementById('chartMensal'),{type:'bar',data:{labels:ms.map(function(m){var p=m.split('-');return p[1]+'/'+p[0];}),datasets:[{label:'Despesas',data:ms.map(function(m){return meses[m].d;}),backgroundColor:'#ef444499',borderColor:'#ef4444',borderWidth:1.5,borderRadius:4},{label:'Receitas',data:ms.map(function(m){return meses[m].r;}),backgroundColor:'#15803d99',borderColor:'#15803d',borderWidth:1.5,borderRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{y:{beginAtZero:true,ticks:{callback:function(v){return 'R$'+v.toLocaleString('pt-BR');}}}}}});
      }
      // Category pie
      var catMap={};
      lancamentos.filter(function(l){return l.tipo==='despesa';}).forEach(function(l){var c=l.categorias_lancamento&&l.categorias_lancamento.nome||'Outros';catMap[c]=(catMap[c]||0)+(l.custo_total||0);});
      var catL=Object.keys(catMap);
      if(catL.length>0&&document.getElementById('chartCat')){
        _charts.push(new Chart(document.getElementById('chartCat'),{type:'doughnut',data:{labels:catL,datasets:[{data:catL.map(function(k){return catMap[k];}),backgroundColor:COLORS.slice(0,catL.length),borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'right',labels:{font:{size:11}}}}}}));
      }
      // Culture
      var cultMap={};
      safras.forEach(function(s){if(!s.cultura)return;var c=lancamentos.filter(function(l){return l.safra_id===s.id&&l.tipo==='despesa';}).reduce(function(a,l){return a+(l.custo_total||0);},0);cultMap[s.cultura]=(cultMap[s.cultura]||0)+c;});
      var cultL=Object.keys(cultMap);
      if(cultL.length>0&&document.getElementById('chartCult')){
        _charts.push(new Chart(document.getElementById('chartCult'),{type:'bar',data:{labels:cultL,datasets:[{label:'Custo (R$)',data:cultL.map(function(k){return cultMap[k];}),backgroundColor:COLORS.slice(0,cultL.length).map(function(c){return c+'bb';}),borderColor:COLORS.slice(0,cultL.length),borderWidth:2,borderRadius:6}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{callback:function(v){return 'R$'+v.toLocaleString('pt-BR');}}}}}}));
      }
      // Fazenda
      var fazMap={};
      fazendas.forEach(function(f){fazMap[f.id]={nome:f.nome,custo:0};});
      lancamentos.filter(function(l){return l.tipo==='despesa';}).forEach(function(l){if(l.fazenda_id&&fazMap[l.fazenda_id])fazMap[l.fazenda_id].custo+=l.custo_total||0;});
      var fl=Object.values(fazMap).filter(function(f){return f.custo>0;});
      if(fl.length>0&&document.getElementById('chartFaz')){
        _charts.push(new Chart(document.getElementById('chartFaz'),{type:'bar',data:{labels:fl.map(function(f){return f.nome;}),datasets:[{label:'Custo (R$)',data:fl.map(function(f){return f.custo;}),backgroundColor:COLORS.slice(0,fl.length).map(function(c){return c+'bb';}),borderColor:COLORS.slice(0,fl.length),borderWidth:2,borderRadius:6,indexAxis:'y'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{beginAtZero:true,ticks:{callback:function(v){return 'R$'+v.toLocaleString('pt-BR');}}}}},indexAxis:'y'}));
      }
    }
  }catch(e){document.getElementById('mainContent').innerHTML='<div style="padding:40px;text-align:center;color:#ef4444">Erro: '+e.message+'</div>';}
};
window.module_dashboard();
})();
