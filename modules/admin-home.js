// admin-home.js - Módulo Home v2.0
// JA Agro Intelligence

(function() {

  function esc(s) {
    return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') : '';
  }

  function fmtMoeda(v) {
    return new Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'}).format(v||0);
  }

  async function render(container) {
    if (typeof setTopbar === 'function') setTopbar('Home', 'Saúde da safra e indicadores');
    if (typeof setLoading === 'function') setLoading('mainContent');

    const sb = window.supabaseClient || (window._supabase);
    if (!sb) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626">Conexão não disponível</div>';
      return;
    }

    try {
      const [
        { count: totalFazendas },
        { count: totalUsuarios },
        { count: totalTalhoes },
        { data: safrasAbertas },
        { data: ultimosLancamentos },
        { data: insumosBaixos }
      ] = await Promise.all([
        sb.from('fazendas').select('*', {count:'exact',head:true}),
        sb.from('usuarios').select('*', {count:'exact',head:true}),
        sb.from('talhoes').select('*', {count:'exact',head:true}),
        sb.from('safras').select('id,nome,cultura,area_total,fazendas(nome)').eq('status','aberta').limit(5),
        sb.from('lancamentos').select('id,tipo,valor,descricao,data,categorias_lancamento(nome)').order('data',{ascending:false}).limit(5),
        sb.from('insumos').select('id,nome,estoque_atual,estoque_minimo').lt('estoque_atual', sb.raw('estoque_minimo')).limit(5)
      ]);

      const totalPendencias = (insumosBaixos||[]).length;

      container.innerHTML = `
      <div style="padding:24px;max-width:1200px;margin:0 auto">
        <!-- KPIs -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:28px">
          ${kpiCard('🏡','Fazendas',totalFazendas||0,'Ativas no sistema','#2563eb')}
          ${kpiCard('👤','Usuários',totalUsuarios||0,'Produtores e equipe','#7c3aed')}
          ${kpiCard('🗺️','Talhões',totalTalhoes||0,'Total cadastrado','#d97706')}
          ${kpiCard('🌱','Safras Abertas',(safrasAbertas||[]).length,'Em andamento','#16a34a')}
          ${kpiCard('⚠️','Pendências',totalPendencias,'Insumos abaixo do mínimo', totalPendencias > 0 ? '#dc2626' : '#16a34a')}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
          <!-- Safras abertas -->
          <div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <h3 style="margin:0;font-size:1rem;color:#1a3a1a;font-weight:700">🌱 Safras Abertas</h3>
              <button onclick="loadModule('safras',document.querySelector('[data-module=safras]'))" style="background:none;border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.8rem;color:#6b7280">Ver todas</button>
            </div>
            ${(safrasAbertas||[]).length === 0
              ? '<p style="color:#9ca3af;font-size:.9rem;text-align:center;padding:20px 0">Nenhuma safra em aberto</p>'
              : (safrasAbertas||[]).map(s => `
                <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-weight:600;color:#374151;font-size:.9rem">${esc(s.nome)}</div>
                    <div style="font-size:.8rem;color:#9ca3af">${esc(s.fazendas?.nome||'')} · ${esc(s.cultura||'')}</div>
                  </div>
                  <span style="font-size:.8rem;color:#16a34a;font-weight:600">${(s.area_total||0).toFixed(1)} ha</span>
                </div>
              `).join('')
            }
          </div>

          <!-- Últimos lançamentos -->
          <div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px">
            <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
              <h3 style="margin:0;font-size:1rem;color:#1a3a1a;font-weight:700">📋 Últimos Lançamentos</h3>
              <button onclick="loadModule('lancamentos',document.querySelector('[data-module=lancamentos]'))" style="background:none;border:1px solid #e5e7eb;border-radius:6px;padding:4px 10px;cursor:pointer;font-size:.8rem;color:#6b7280">Ver todos</button>
            </div>
            ${(ultimosLancamentos||[]).length === 0
              ? '<p style="color:#9ca3af;font-size:.9rem;text-align:center;padding:20px 0">Nenhum lançamento ainda</p>'
              : (ultimosLancamentos||[]).map(l => `
                <div style="padding:10px 0;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-weight:600;color:#374151;font-size:.9rem">${esc(l.descricao||l.categorias_lancamento?.nome||'Lançamento')}</div>
                    <div style="font-size:.8rem;color:#9ca3af">${esc(l.data||'')}</div>
                  </div>
                  <span style="font-size:.85rem;font-weight:600;color:${l.tipo==='receita'?'#16a34a':'#dc2626'}">${l.tipo==='receita'?'+':'-'} ${fmtMoeda(l.valor)}</span>
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- Pendências -->
        ${(insumosBaixos||[]).length > 0 ? `
        <div style="background:#fff;border:1.5px solid #fee2e2;border-radius:12px;padding:20px">
          <h3 style="margin:0 0 16px;font-size:1rem;color:#dc2626;font-weight:700">⚠️ Insumos Abaixo do Estoque Mínimo</h3>
          ${(insumosBaixos||[]).map(i => `
            <div style="padding:8px 0;display:flex;justify-content:space-between;border-bottom:1px solid #fee2e2">
              <span style="color:#374151;font-size:.9rem">${esc(i.nome)}</span>
              <span style="color:#dc2626;font-weight:600;font-size:.85rem">Atual: ${i.estoque_atual||0} / Mín: ${i.estoque_minimo||0}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <!-- Ações rápidas -->
        <div style="background:#f0fdf4;border:1.5px solid #bbf7d0;border-radius:12px;padding:20px;margin-top:20px">
          <h3 style="margin:0 0 14px;font-size:.95rem;color:#16a34a;font-weight:700">⚡ Ações Rápidas</h3>
          <div style="display:flex;gap:10px;flex-wrap:wrap">
            <button onclick="loadModule('lancamentos',document.querySelector('[data-module=lancamentos]'))" style="padding:8px 16px;background:#16a34a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.85rem;font-weight:600">+ Novo Lançamento</button>
            <button onclick="loadModule('dashboard',document.querySelector('[data-module=dashboard]'))" style="padding:8px 16px;background:#fff;color:#374151;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:.85rem">📊 Dashboard</button>
            <button onclick="loadModule('safras',document.querySelector('[data-module=safras]'))" style="padding:8px 16px;background:#fff;color:#374151;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:.85rem">🌱 Safras</button>
            <button onclick="loadModule('insumos',document.querySelector('[data-module=insumos]'))" style="padding:8px 16px;background:#fff;color:#374151;border:1.5px solid #e5e7eb;border-radius:8px;cursor:pointer;font-size:.85rem">🌿 Insumos</button>
          </div>
        </div>
      </div>`;
    } catch(e) {
      container.innerHTML = '<div style="padding:40px;text-align:center;color:#dc2626">Erro ao carregar Home: ' + e.message + '</div>';
    }
  }

  function kpiCard(icon, label, value, sub, color) {
    return `<div style="background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px;border-top:3px solid ${color}">
      <div style="font-size:1.8rem;margin-bottom:8px">${icon}</div>
      <div style="font-size:2rem;font-weight:700;color:#1a3a1a">${value}</div>
      <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:${color};margin:4px 0 2px">${label}</div>
      <div style="font-size:.8rem;color:#9ca3af">${sub}</div>
    </div>`;
  }

  window.module_home = function() { render(document.getElementById('mainContent')); };
  window.AdminHome = { render };

})();
