 // admin-certificação.js - Módulo de Certificação de Fazenda
// JA Agro Intelligence v1.0

var AdminCertificação = AdminCertificação || (() => {

  const CHECKLISTS = {
    organico: {
      nome: 'Orgânico (MAPA)',
      icon: '🌱',
      itens: [
        { id: 'org_01', categoria: 'Solo', descricao: 'Análise de solo realizada nos últimos 12 meses' },
        { id: 'org_02', categoria: 'Solo', descricao: 'Plano de manejo orgânico documentado' },
        { id: 'org_03', categoria: 'Insumos', descricao: 'Todos os insumos utilizados são permitidos pela IN 46/2011' },
        { id: 'org_04', categoria: 'Insumos', descricao: 'Registros de compra de insumos disponíveis' },
        { id: 'org_05', categoria: 'Rastreabilidade', descricao: 'Registros de plantio e colheita documentados' },
        { id: 'org_06', categoria: 'Rastreabilidade', descricao: 'Separação física de produtos orgânicos e convencionais' },
        { id: 'org_07', categoria: 'Água', descricao: 'Análise de qualidade da água de irrigação' },
        { id: 'org_08', categoria: 'Água', descricao: 'Proteção de mananciais e nascentes' },
        { id: 'org_09', categoria: 'Social', descricao: 'Cumprimento da legislação trabalhista' },
        { id: 'org_10', categoria: 'Social', descricao: 'Ausência de trabalho infantil ou forçado' },
        { id: 'org_11', categoria: 'Ambiental', descricao: 'Reserva Legal demarcada e preservada' },
        { id: 'org_12', categoria: 'Ambiental', descricao: 'Área de Preservação Permanente respeitada' },
        { id: 'org_13', categoria: 'Conversão', descricao: 'Período de conversão de 12-36 meses cumprido' },
        { id: 'org_14', categoria: 'Conversão', descricao: 'Certificadora OCS/OPACs cadastrada no MAPA' },
      ]
    },
    globalgap: {
      nome: 'GlobalG.A.P.',
      icon: '🌍',
      itens: [
        { id: 'ggap_01', categoria: 'Rastreabilidade', descricao: 'Sistema de rastreabilidade implementado (farm-to-fork)' },
        { id: 'ggap_02', categoria: 'Rastreabilidade', descricao: 'Registros de produção arquivados por no mínimo 2 anos' },
        { id: 'ggap_03', categoria: 'Agroquímicos', descricao: 'Somente produtos registrados e autorizados utilizados' },
        { id: 'ggap_04', categoria: 'Agroquímicos', descricao: 'Operadores de aplicação treinados e certificados' },
        { id: 'ggap_05', categoria: 'Agroquímicos', descricao: 'Equipamentos de proteção individual disponíveis e em uso' },
        { id: 'ggap_06', categoria: 'Agroquímicos', descricao: 'Carências respeitadas conforme bula' },
        { id: 'ggap_07', categoria: 'Água', descricao: 'Análise microbiológica da água de irrigação' },
        { id: 'ggap_08', categoria: 'Água', descricao: 'Plano de gestão de água documentado' },
        { id: 'ggap_09', categoria: 'Solo', descricao: 'Plano de fertilização baseado em análise de solo' },
        { id: 'ggap_10', categoria: 'Solo', descricao: 'Erosão controlada e documentada' },
        { id: 'ggap_11', categoria: 'Colheita', descricao: 'Higiene na colheita e pós-colheita documentada' },
        { id: 'ggap_12', categoria: 'Colheita', descricao: 'Equipamentos de colheita limpos e calibrados' },
        { id: 'ggap_13', categoria: 'Ambiental', descricao: 'Avaliação de impacto ambiental realizada' },
        { id: 'ggap_14', categoria: 'Ambiental', descricao: 'Resíduos de embalagens descartados corretamente' },
        { id: 'ggap_15', categoria: 'Social', descricao: 'Política de saúde e segurança do trabalhador' },
        { id: 'ggap_16', categoria: 'Social', descricao: 'Treinamentos de segurança registrados' },
      ]
    },
    rainforest: {
      nome: 'Rainforest Alliance',
      icon: '🐸',
      itens: [
        { id: 'ra_01', categoria: 'Biodiversidade', descricao: 'Mapeamento de áreas de conservação na propriedade' },
        { id: 'ra_02', categoria: 'Biodiversidade', descricao: 'Programa de restauração de habitats naturais' },
        { id: 'ra_03', categoria: 'Clima', descricao: 'Inventário de emissões de GEE realizado' },
        { id: 'ra_04', categoria: 'Clima', descricao: 'Plano de mitigação de mudanças climáticas' },
        { id: 'ra_05', categoria: 'Solo', descricao: 'Práticas de conservação do solo implementadas' },
        { id: 'ra_06', categoria: 'Água', descricao: 'Plano de gestão hídrica com metas de redução' },
        { id: 'ra_07', categoria: 'Agroquímicos', descricao: 'Lista de pesticidas HHP identificada e gerenciada' },
        { id: 'ra_08', categoria: 'Agroquímicos', descricao: 'Programa de MIP (Manejo Integrado de Pragas)' },
        { id: 'ra_09', categoria: 'Social', descricao: 'Salário justo e benefícios documentados' },
        { id: 'ra_10', categoria: 'Social', descricao: 'Mecanismo de reclamação disponível para trabalhadores' },
        { id: 'ra_11', categoria: 'Social', descricao: 'Política de não discriminação implementada' },
        { id: 'ra_12', categoria: 'Social', descricao: 'Trabalho infantil e forçado prevenido ativamente' },
        { id: 'ra_13', categoria: 'Comunidade', descricao: 'Engajamento com comunidades locais documentado' },
        { id: 'ra_14', categoria: 'Gestão', descricao: 'Sistema de gestão da fazenda documentado' },
        { id: 'ra_15', categoria: 'Gestão', descricao: 'Auditoria interna anual realizada' },
      ]
    }
  };

  let supabase = null;
  let currentFazendaId = null;
  let currentCertType = null;

  function getSupabase() {
    if (supabase) return supabase;
    // Use the global 'sb' declared in config.js (const sb = supabase.createClient(...))
    supabase = (typeof sb !== 'undefined' ? sb : null);
    return supabase;
  }

  async function runMigrations() {
    const sb = getSupabase();
    if (!sb) return;
    try {
      const sqls = [
        'ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS certificada boolean DEFAULT false',
        'ALTER TABLE fazendas ADD COLUMN IF NOT EXISTS tipo_certificacao text',
        'ALTER TABLE talhoes ADD COLUMN IF NOT EXISTS segue_certificação boolean DEFAULT true',
        'ALTER TABLE insumos ADD COLUMN IF NOT EXISTS certificação_permitida boolean DEFAULT true',
      ];
      for (const sql of sqls) {
        await sb.rpc('exec_sql', { sql }).catch(() => {});
      }
    } catch(e) {}
  }

  async function loadFazendas() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from('fazendas').select('id, nome, certificada, tipo_certificacao').order('nome');
    return data || [];
  }

  async function updateFazendaCert(fazendaId, certificada, tipoCert) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sem conexão');
    const { error } = await sb.from('fazendas').update({ certificada, tipo_certificacao: tipoCert || null }).eq('id', fazendaId);
    if (error) throw error;
  }

  async function loadTalhoesFazenda(fazendaId) {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from('talhoes').select('id, nome, segue_certificação').eq('fazenda_id', fazendaId).order('nome');
    return data || [];
  }

  async function updateTalhaoFlag(talhaoId, segue) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sem conexão');
    const { error } = await sb.from('talhoes').update({ segue_certificação: segue }).eq('id', talhaoId);
    if (error) throw error;
  }

  async function loadChecklistFazenda(fazendaId, tipo) {
    const sb = getSupabase();
    if (!sb) return {};
    const { data } = await sb.from('certificação_checklists').select('*').eq('fazenda_id', fazendaId).eq('tipo_certificacao', tipo);
    const map = {};
    (data || []).forEach(r => { map[r.item_id] = r; });
    return map;
  }

  async function saveChecklistItem(fazendaId, tipo, itemId, status, obs) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sem conexão');
    const payload = {
      fazenda_id: fazendaId, tipo_certificacao: tipo, item_id: itemId,
      status, observacao: obs || null,
      auditado_em: new Date().toISOString(), updated_at: new Date().toISOString()
    };
    const { error } = await sb.from('certificação_checklists').upsert(payload, { onConflict: 'fazenda_id,tipo_certificacao,item_id' });
    if (error) throw error;
  }

  async function loadInsumos() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from('insumos').select('id, nome, categoria, certificação_permitida').order('nome');
    return data || [];
  }

  async function updateInsumoFlag(insumoId, permitido) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sem conexão');
    const { error } = await sb.from('insumos').update({ certificação_permitida: permitido }).eq('id', insumoId);
    if (error) throw error;
  }

  function statusBadge(st) {
    const map = {
      pendente: '<span class="cert-badge cert-pendente">Pendente</span>',
      conforme: '<span class="cert-badge cert-conforme">Conforme</span>',
      nao_conforme: '<span class="cert-badge cert-nao-conforme">Não Conforme</span>',
      nao_aplicavel: '<span class="cert-badge cert-na">N/A</span>'
    };
    return map[st] || map.pendente;
  }

  function calcProgress(items, checklist) {
    const total = items.length;
    const conforme = items.filter(it => checklist[it.id] && checklist[it.id].status === 'conforme').length;
    const ok = total ? Math.round((conforme / total) * 100) : 0;
    return { total, conforme, ok };
  }

  const CSS = `<style id="cert-styles">
.cert-container{padding:24px;max-width:900px;margin:0 auto}
.cert-header{margin-bottom:28px}
.cert-header h2{font-size:1.6rem;font-weight:700;color:#1a3a1a;margin:0}
.cert-header p{color:#6b7280;margin:4px 0 0}
.cert-fazenda-grid{display:flex;flex-direction:column;gap:12px}
.cert-fazenda-card{display:flex;align-items:center;gap:16px;padding:16px 20px;background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;cursor:pointer;transition:all .2s}
.cert-fazenda-card:hover{border-color:#16a34a;box-shadow:0 4px 16px rgba(22,163,74,.1);transform:translateY(-1px)}
.cert-fazenda-card.is-cert{border-color:#16a34a;background:#f0fdf4}
.cert-fazenda-icon{font-size:2rem;min-width:40px;text-align:center}
.cert-fazenda-info{flex:1}
.cert-fazenda-nome{font-weight:600;color:#1a3a1a;font-size:1rem}
.cert-tag{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.78rem;font-weight:600}
.cert-tag.cert-active{background:#dcfce7;color:#16a34a}
.cert-tag.cert-none{background:#f3f4f6;color:#6b7280}
.cert-fazenda-arrow{font-size:1.5rem;color:#9ca3af}
.cert-empty{text-align:center;padding:60px 20px;color:#9ca3af}
.cert-empty span{font-size:3rem;display:block;margin-bottom:12px}
.cert-type-header{display:flex;align-items:center;gap:16px;margin-bottom:24px}
.cert-back-btn{background:none;border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 16px;cursor:pointer;color:#374151;font-size:.9rem;transition:all .2s}
.cert-back-btn:hover{border-color:#16a34a;color:#16a34a}
.cert-farm-title{font-size:1.4rem;font-weight:700;color:#1a3a1a;margin:0}
.cert-config-section{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px}
.cert-config-section h4{margin:0 0 16px;font-size:1rem;color:#374151}
.cert-config-row{display:flex;align-items:center;justify-content:space-between}
.cert-toggle-label{display:flex;align-items:center;gap:12px;cursor:pointer}
.cert-toggle{width:44px;height:24px;background:#d1d5db;border-radius:12px;position:relative;transition:background .2s;cursor:pointer}
.cert-toggle::after{content:'';position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:left .2s;box-shadow:0 1px 4px rgba(0,0,0,.2)}
.cert-toggle.active{background:#16a34a}
.cert-toggle.active::after{left:23px}
.cert-type-select{margin-top:16px}
.cert-type-select label{font-size:.9rem;color:#374151;font-weight:500;display:block;margin-bottom:10px}
.cert-type-options{display:flex;gap:12px;flex-wrap:wrap}
.cert-type-option{display:flex;align-items:center;gap:8px;padding:10px 18px;border:2px solid #e5e7eb;border-radius:10px;cursor:pointer;transition:all .2s;font-size:.9rem}
.cert-type-option:hover{border-color:#16a34a}
.cert-type-option.selected{border-color:#16a34a;background:#f0fdf4;color:#16a34a;font-weight:600}
.hidden{display:none!important}
.cert-section{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px}
.cert-section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:12px}
.cert-section-header h4{margin:0;font-size:1rem;color:#1a3a1a}
.cert-progress-info{display:flex;align-items:center;gap:10px;font-size:.85rem;color:#6b7280}
.cert-progress-bar{width:120px;height:8px;background:#e5e7eb;border-radius:4px;overflow:hidden}
.cert-progress-fill{height:100%;background:linear-gradient(90deg,#16a34a,#22c55e);transition:width .5s}
.cert-categoria{margin-bottom:16px}
.cert-cat-title{font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.08em;color:#16a34a;margin-bottom:8px;padding:4px 10px;background:#f0fdf4;border-radius:6px;display:inline-block}
.cert-item{padding:12px;border:1px solid #f3f4f6;border-radius:8px;margin-bottom:8px;transition:border-color .2s}
.cert-item:hover{border-color:#d1d5db}
.cert-item-desc{font-size:.9rem;color:#374151;margin-bottom:8px}
.cert-item-controls{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.cert-status-select{border:1.5px solid #e5e7eb;border-radius:6px;padding:4px 8px;font-size:.85rem;color:#374151;cursor:pointer}
.cert-badge{display:inline-block;padding:2px 8px;border-radius:12px;font-size:.75rem;font-weight:600}
.cert-pendente{background:#fef9c3;color:#92400e}
.cert-conforme{background:#dcfce7;color:#16a34a}
.cert-nao-conforme{background:#fee2e2;color:#dc2626}
.cert-na{background:#f3f4f6;color:#6b7280}
.cert-obs-input{width:100%;border:1px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:.85rem;color:#374151;margin-top:4px;box-sizing:border-box}
.cert-talhoes-list,.cert-insumos-list{display:flex;flex-direction:column;gap:10px}
.cert-talhao-row,.cert-insumo-row{display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#f9fafb;border-radius:8px}
.cert-talhao-nome,.cert-insumo-nome{font-weight:500;color:#374151}
.cert-insumo-cat{font-size:.78rem;color:#9ca3af;margin-left:8px}
.cert-hint{font-size:.85rem;color:#6b7280;margin:-8px 0 12px}
</style>`;

  let _fazendaData = null;

  async function render(container) {
    if (!document.getElementById('cert-styles')) document.head.insertAdjacentHTML('beforeend', CSS);
    await runMigrations();
    const fazendasHtml = await renderFazendaSelector();
    container.innerHTML = `
    <div class="cert-container">
      <div class="cert-header">
        <h2>🏅 Certificação de Fazenda</h2>
        <p>Gerencie certificações, checklists de auditoria e conformidade de insumos</p>
      </div>
      <div id="cert-main">${fazendasHtml}</div>
    </div>`;
  }

  async function renderFazendaSelector() {
    const fazendas = await loadFazendas();
    if (!fazendas.length) return '<div class="cert-empty"><span>🏡</span><p>Nenhuma fazenda cadastrada.<br>Cadastre uma fazenda primeiro.</p></div>';
    return `<div class="cert-fazenda-grid">${fazendas.map(f => `
      <div class="cert-fazenda-card ${f.certificada ? 'is-cert' : ''}" onclick="AdminCertificação.openFazenda('${f.id}')">
        <div class="cert-fazenda-icon">${f.certificada ? (CHECKLISTS[f.tipo_certificacao]?.icon || '✅') : '🏡'}</div>
        <div class="cert-fazenda-info">
          <div class="cert-fazenda-nome">${f.nome}</div>
          <div class="cert-fazenda-status">${f.certificada
            ? `<span class="cert-tag cert-active">${CHECKLISTS[f.tipo_certificacao]?.nome || f.tipo_certificacao}</span>`
            : '<span class="cert-tag cert-none">Sem certificação</span>'}</div>
        </div>
        <div class="cert-fazenda-arrow">›</div>
      </div>
    `).join('')}</div>`;
  }

  function renderCertTypeSelector(fazenda) {
    return `
    <div class="cert-type-header">
      <button class="cert-back-btn" onclick="AdminCertificação.backToList()">‹ Fazendas</button>
      <h3 class="cert-farm-title">${fazenda.nome}</h3>
    </div>
    <div class="cert-config-section">
      <h4>Status de Certificação</h4>
      <div class="cert-config-row">
        <label class="cert-toggle-label">
          <span>Fazenda Certificada</span>
          <div class="cert-toggle ${fazenda.certificada ? 'active' : ''}" onclick="AdminCertificação.toggleCertificada()" id="cert-toggle-fazenda"></div>
        </label>
      </div>
      <div class="cert-type-select ${fazenda.certificada ? '' : 'hidden'}" id="cert-type-select">
        <label>Tipo de Certificação</label>
        <div class="cert-type-options">
          ${Object.entries(CHECKLISTS).map(([k, v]) => `
            <div class="cert-type-option ${fazenda.tipo_certificacao === k ? 'selected' : ''}" onclick="AdminCertificação.selectTipo('${k}')">
              <span>${v.icon}</span><span>${v.nome}</span>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div id="cert-checklist-section"></div>
    <div id="cert-talhoes-section"></div>
    <div id="cert-insumos-section"></div>`;
  }

  async function renderChecklist(fazendaId, tipo) {
    const cl = CHECKLISTS[tipo];
    if (!cl) return '';
    const checklist = await loadChecklistFazenda(fazendaId, tipo);
    const { total, conforme, ok } = calcProgress(cl.itens, checklist);
    const byCategoria = {};
    cl.itens.forEach(it => { if (!byCategoria[it.categoria]) byCategoria[it.categoria] = []; byCategoria[it.categoria].push(it); });
    return `
    <div class="cert-section">
      <div class="cert-section-header">
        <h4>${cl.icon} Checklist ${cl.nome}</h4>
        <div class="cert-progress-info">
          <div class="cert-progress-bar"><div class="cert-progress-fill" style="width:${ok}%"></div></div>
          <span>${conforme}/${total} conformes (${ok}%)</span>
        </div>
      </div>
      ${Object.entries(byCategoria).map(([cat, itens]) => `
        <div class="cert-categoria">
          <div class="cert-cat-title">${cat}</div>
          ${itens.map(it => {
            const saved = checklist[it.id];
            const st = saved?.status || 'pendente';
            return `<div class="cert-item" id="item-${it.id}">
              <div class="cert-item-desc">${it.descricao}</div>
              <div class="cert-item-controls">
                <select class="cert-status-select" onchange="AdminCertificação.updateItem('${it.id}', this.value, document.getElementById('obs-${it.id}')?.value||'')">
                  <option value="pendente" ${st==='pendente'?'selected':''}>Pendente</option>
                  <option value="conforme" ${st==='conforme'?'selected':''}>Conforme</option>
                  <option value="nao_conforme" ${st==='nao_conforme'?'selected':''}>Não Conforme</option>
                  <option value="nao_aplicavel" ${st==='nao_aplicavel'?'selected':''}>N/A</option>
                </select>
                ${statusBadge(st)}
              </div>
              <input class="cert-obs-input" id="obs-${it.id}" placeholder="Observação..." value="${saved?.observacao||''}" onblur="AdminCertificação.updateItem('${it.id}', document.querySelector('#item-${it.id} select').value, this.value)">
            </div>`;
          }).join('')}
        </div>
      `).join('')}
    </div>`;
  }

  async function renderTalhoes(fazendaId) {
    const talhoes = await loadTalhoesFazenda(fazendaId);
    if (!talhoes.length) return '';
    return `
    <div class="cert-section">
      <div class="cert-section-header"><h4>🗺️ Talhões — Conformidade</h4></div>
      <div class="cert-talhoes-list">
        ${talhoes.map(t => {
          const segue = t.segue_certificação !== false;
          return `<div class="cert-talhao-row">
            <span class="cert-talhao-nome">${t.nome}</span>
            <label class="cert-toggle-label">
              <span style="font-size:.85rem;color:${segue?'#16a34a':'#dc2626'}">${segue?'Segue certificação':'Isento'}</span>
              <div class="cert-toggle ${segue?'active':''}" onclick="AdminCertificação.toggleTalhao('${t.id}',this)"></div>
            </label>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  async function renderInsumos() {
    const insumos = await loadInsumos();
    if (!insumos.length) return '';
    return `
    <div class="cert-section">
      <div class="cert-section-header"><h4>🌿 Insumos — Compatibilidade</h4></div>
      <p class="cert-hint">Marque os insumos permitidos para uso em talhões certificados.</p>
      <div class="cert-insumos-list">
        ${insumos.map(i => {
          const perm = i.certificação_permitida !== false;
          return `<div class="cert-insumo-row">
            <div>
              <span class="cert-insumo-nome">${i.nome}</span>
              <span class="cert-insumo-cat">${i.categoria||''}</span>
            </div>
            <label class="cert-toggle-label">
              <span style="font-size:.85rem;color:${perm?'#16a34a':'#dc2626'}">${perm?'Permitido':'Proibido'}</span>
              <div class="cert-toggle ${perm?'active':''}" onclick="AdminCertificação.toggleInsumo('${i.id}',this)"></div>
            </label>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  async function openFazenda(fazendaId) {
    currentFazendaId = fazendaId;
    const sb = getSupabase();
    const { data } = await sb.from('fazendas').select('id,nome,certificada,tipo_certificacao').eq('id', fazendaId).single();
    _fazendaData = data;
    const main = document.getElementById('cert-main');
    main.innerHTML = renderCertTypeSelector(data);
    if (data.certificada && data.tipo_certificacao) {
      currentCertType = data.tipo_certificacao;
      await refreshChecklist();
      await refreshTalhoes();
      await refreshInsumos();
    }
  }

  async function backToList() {
    currentFazendaId = null;
    currentCertType = null;
    _fazendaData = null;
    const html = await renderFazendaSelector();
    const el = document.getElementById('cert-main');
    if (el) el.innerHTML = html;
  }

  async function toggleCertificada() {
    if (!_fazendaData) return;
    _fazendaData.certificada = !_fazendaData.certificada;
    const toggle = document.getElementById('cert-toggle-fazenda');
    if (toggle) toggle.classList.toggle('active', _fazendaData.certificada);
    const typeSelect = document.getElementById('cert-type-select');
    if (typeSelect) typeSelect.classList.toggle('hidden', !_fazendaData.certificada);
    await updateFazendaCert(_fazendaData.id, _fazendaData.certificada, _fazendaData.tipo_certificacao);
    if (!_fazendaData.certificada) {
      ['cert-checklist-section','cert-talhoes-section','cert-insumos-section'].forEach(id => {
        const el = document.getElementById(id); if (el) el.innerHTML = '';
      });
    }
  }

  async function selectTipo(tipo) {
    if (!_fazendaData) return;
    _fazendaData.tipo_certificacao = tipo;
    currentCertType = tipo;
    document.querySelectorAll('.cert-type-option').forEach(el => {
      el.classList.toggle('selected', el.querySelector('span:last-child')?.textContent === CHECKLISTS[tipo]?.nome);
    });
    await updateFazendaCert(_fazendaData.id, true, tipo);
    await refreshChecklist();
    await refreshTalhoes();
    await refreshInsumos();
  }

  async function refreshChecklist() {
    const sec = document.getElementById('cert-checklist-section');
    if (!sec || !currentCertType) return;
    sec.innerHTML = await renderChecklist(currentFazendaId, currentCertType);
  }

  async function refreshTalhoes() {
    const sec = document.getElementById('cert-talhoes-section');
    if (!sec) return;
    sec.innerHTML = await renderTalhoes(currentFazendaId);
  }

  async function refreshInsumos() {
    const sec = document.getElementById('cert-insumos-section');
    if (!sec) return;
    sec.innerHTML = await renderInsumos();
  }

  async function updateItem(itemId, status, obs) {
    if (!currentFazendaId || !currentCertType) return;
    await saveChecklistItem(currentFazendaId, currentCertType, itemId, status, obs);
    const badgeEl = document.querySelector(`#item-${itemId} .cert-badge`);
    if (badgeEl) badgeEl.outerHTML = statusBadge(status);
    const fill = document.querySelector('.cert-progress-fill');
    const info = document.querySelector('.cert-progress-info span');
    if (fill && info) {
      const cl = CHECKLISTS[currentCertType];
      const saved = await loadChecklistFazenda(currentFazendaId, currentCertType);
      const { total, conforme, ok } = calcProgress(cl.itens, saved);
      fill.style.width = ok + '%';
      info.textContent = `${conforme}/${total} conformes (${ok}%)`;
    }
  }

  async function toggleTalhao(talhaoId, el) {
    const active = el.classList.toggle('active');
    const label = el.previousElementSibling;
    if (label) { label.style.color = active ? '#16a34a' : '#dc2626'; label.textContent = active ? 'Segue certificação' : 'Isento'; }
    await updateTalhaoFlag(talhaoId, active);
  }

  async function toggleInsumo(insumoId, el) {
    const active = el.classList.toggle('active');
    const label = el.previousElementSibling;
    if (label) { label.style.color = active ? '#16a34a' : '#dc2626'; label.textContent = active ? 'Permitido' : 'Proibido'; }
    await updateInsumoFlag(insumoId, active);
  }

  return { render, openFazenda, backToList, toggleCertificada, selectTipo, updateItem, toggleTalhao, toggleInsumo };
})();

window.AdminCertificação = AdminCertificação;
window.AdminCertificacao = AdminCertificação;
