// admin-analise-solo.js - Módulo de Análise de Solo (Premium)
// JA Agro Intelligence v1.0 - Módulo pago separado

const AdminAnaliseSolo = (() => {

  // Parâmetros típicos de análise de solo
  const PARAMETROS = {
    macronutrientes: [
      { key: 'ph', nome: 'pH (CaCl2)', unidade: '', min: 5.5, max: 6.5, ideal: '5.5 - 6.5' },
      { key: 'mo', nome: 'M.O. (g/dm³)', unidade: 'g/dm³', min: 20, max: 40, ideal: '> 25' },
      { key: 'p', nome: 'Fósforo - P (mg/dm³)', unidade: 'mg/dm³', min: 12, max: 60, ideal: '> 15' },
      { key: 'k', nome: 'Potássio - K (mmolc/dm³)', unidade: 'mmolc/dm³', min: 1.5, max: 5, ideal: '> 2' },
      { key: 'ca', nome: 'Cálcio - Ca (mmolc/dm³)', unidade: 'mmolc/dm³', min: 15, max: 45, ideal: '> 20' },
      { key: 'mg', nome: 'Magnésio - Mg (mmolc/dm³)', unidade: 'mmolc/dm³', min: 5, max: 15, ideal: '> 8' },
      { key: 's', nome: 'Enxofre - S (mg/dm³)', unidade: 'mg/dm³', min: 5, max: 20, ideal: '> 10' },
    ],
    micronutrientes: [
      { key: 'b', nome: 'Boro - B (mg/dm³)', unidade: 'mg/dm³', min: 0.2, max: 2, ideal: '> 0.5' },
      { key: 'cu', nome: 'Cobre - Cu (mg/dm³)', unidade: 'mg/dm³', min: 0.3, max: 5, ideal: '> 0.8' },
      { key: 'fe', nome: 'Ferro - Fe (mg/dm³)', unidade: 'mg/dm³', min: 5, max: 80, ideal: '> 12' },
      { key: 'mn', nome: 'Manganês - Mn (mg/dm³)', unidade: 'mg/dm³', min: 1.5, max: 15, ideal: '> 4' },
      { key: 'zn', nome: 'Zinco - Zn (mg/dm³)', unidade: 'mg/dm³', min: 0.6, max: 10, ideal: '> 1.2' },
    ],
    fisicos: [
      { key: 'argila', nome: 'Argila (%)', unidade: '%', min: 20, max: 70, ideal: '20 - 60' },
      { key: 'areia', nome: 'Areia (%)', unidade: '%', min: 10, max: 70, ideal: '–' },
      { key: 'silte', nome: 'Silte (%)', unidade: '%', min: 5, max: 40, ideal: '–' },
      { key: 'ctc', nome: 'CTC (mmolc/dm³)', unidade: 'mmolc/dm³', min: 40, max: 150, ideal: '> 60' },
      { key: 'sat_base', nome: 'Saturação por Bases V% (%)', unidade: '%', min: 50, max: 80, ideal: '60 - 70' },
    ]
  };

  let supabase = null;
  let currentView = 'list'; // list | form | detail
  let editingId = null;

  function getSupabase() {
    if (supabase) return supabase;
    supabase = window.sb;  // Global supabase client from config.js
    return supabase;
  }

  async function runMigrations() {
    const sb = getSupabase();
    if (!sb) return;
    try {
      await sb.rpc('exec_sql', { sql: `CREATE TABLE IF NOT EXISTS analise_solo (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        fazenda_id uuid REFERENCES fazendas(id) ON DELETE CASCADE,
        talhao_id uuid REFERENCES talhoes(id) ON DELETE SET NULL,
        data_coleta date NOT NULL,
        laboratorio text,
        numero_amostra text,
        profundidade text DEFAULT '0-20',
        cultura_referencia text,
        resultados jsonb DEFAULT '{}',
        recomendacoes text,
        status text DEFAULT 'pendente' CHECK (status IN ('pendente','aprovada','reprovada')),
        observacoes text,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      )` }).catch(() => {});
    } catch(e) {}
  }

  async function loadFazendas() {
    const sb = getSupabase();
    if (!sb) return [];
    const { data } = await sb.from('fazendas').select('id, nome').order('nome');
    return data || [];
  }

  async function loadTalhoes(fazendaId) {
    const sb = getSupabase();
    if (!sb) return [];
    if (!fazendaId) return [];
    const { data } = await sb.from('talhoes').select('id, nome').eq('fazenda_id', fazendaId).order('nome');
    return data || [];
  }

  async function loadAnalises(filters = {}) {
    const sb = getSupabase();
    if (!sb) return [];
    let q = sb.from('analise_solo').select(`
      *,
      fazendas (nome),
      talhoes (nome)
    `).order('data_coleta', { ascending: false });
    if (filters.fazendaId) q = q.eq('fazenda_id', filters.fazendaId);
    if (filters.status) q = q.eq('status', filters.status);
    const { data } = await q;
    return data || [];
  }

  async function saveAnalise(payload) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sem conexão');
    if (editingId) {
      const { error } = await sb.from('analise_solo').update({ ...payload, updated_at: new Date().toISOString() }).eq('id', editingId);
      if (error) throw error;
    } else {
      const { error } = await sb.from('analise_solo').insert(payload);
      if (error) throw error;
    }
  }

  async function deleteAnalise(id) {
    const sb = getSupabase();
    if (!sb) throw new Error('Sem conexão');
    const { error } = await sb.from('analise_solo').delete().eq('id', id);
    if (error) throw error;
  }


  function statusBadge(status) {
    const map = {
      pendente: '<span class="solo-badge solo-pendente">Pendente</span>',
      aprovada: '<span class="solo-badge solo-aprovada">Aprovada</span>',
      reprovada: '<span class="solo-badge solo-reprovada">Reprovada</span>'
    };
    return map[status] || map.pendente;
  }

  function paramStatus(key, value) {
    const allParams = [...PARAMETROS.macronutrientes, ...PARAMETROS.micronutrientes, ...PARAMETROS.fisicos];
    const p = allParams.find(x => x.key === key);
    if (!p || value === null || value === undefined || value === '') return 'sem-dado';
    const v = parseFloat(value);
    if (isNaN(v)) return 'sem-dado';
    if (v < p.min) return 'baixo';
    if (v > p.max) return 'alto';
    return 'ideal';
  }

  function paramStatusLabel(st) {
    return { 'ideal': '✅ Ideal', 'baixo': '⚠️ Baixo', 'alto': '⚠️ Alto', 'sem-dado': '—' }[st] || '—';
  }

  function paramStatusColor(st) {
    return { 'ideal': '#16a34a', 'baixo': '#d97706', 'alto': '#dc2626', 'sem-dado': '#9ca3af' }[st] || '#9ca3af';
  }

  const CSS = `<style id="solo-styles">
.solo-container{padding:24px;max-width:1000px;margin:0 auto}
.solo-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:28px;flex-wrap:wrap;gap:16px}
.solo-header-left h2{font-size:1.6rem;font-weight:700;color:#1a3a1a;margin:0}
.solo-header-left p{color:#6b7280;margin:4px 0 0;font-size:.9rem}
.solo-premium-badge{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:linear-gradient(135deg,#7c3aed,#a855f7);color:#fff;border-radius:20px;font-size:.78rem;font-weight:600;margin-top:8px}
.solo-btn{padding:10px 20px;border-radius:8px;border:none;cursor:pointer;font-size:.9rem;font-weight:600;transition:all .2s}
.solo-btn-primary{background:#16a34a;color:#fff}
.solo-btn-primary:hover{background:#15803d;transform:translateY(-1px)}
.solo-btn-secondary{background:#f3f4f6;color:#374151;border:1.5px solid #e5e7eb}
.solo-btn-secondary:hover{border-color:#16a34a;color:#16a34a}
.solo-btn-danger{background:#fee2e2;color:#dc2626}
.solo-btn-danger:hover{background:#dc2626;color:#fff}
.solo-filters{display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap}
.solo-filter-select{border:1.5px solid #e5e7eb;border-radius:8px;padding:8px 12px;font-size:.9rem;color:#374151;min-width:160px}
.solo-grid{display:flex;flex-direction:column;gap:14px}
.solo-card{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px;transition:all .2s;cursor:pointer}
.solo-card:hover{border-color:#16a34a;box-shadow:0 4px 16px rgba(22,163,74,.1)}
.solo-card-header{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:12px}
.solo-card-title{font-weight:700;color:#1a3a1a;font-size:1rem}
.solo-card-sub{font-size:.85rem;color:#6b7280;margin-top:3px}
.solo-card-meta{display:flex;gap:16px;flex-wrap:wrap;font-size:.85rem;color:#6b7280}
.solo-card-meta span{display:flex;align-items:center;gap:5px}
.solo-card-actions{display:flex;gap:8px;margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6}
.solo-badge{display:inline-block;padding:3px 10px;border-radius:12px;font-size:.75rem;font-weight:600}
.solo-pendente{background:#fef9c3;color:#92400e}
.solo-aprovada{background:#dcfce7;color:#16a34a}
.solo-reprovada{background:#fee2e2;color:#dc2626}
.solo-empty{text-align:center;padding:60px 20px;color:#9ca3af;background:#fff;border-radius:12px;border:1.5px dashed #e5e7eb}
.solo-empty span{font-size:3rem;display:block;margin-bottom:12px}
.solo-form-card{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:24px}
.solo-form-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.solo-form-group{display:flex;flex-direction:column;gap:6px}
.solo-form-group.full{grid-column:1/-1}
.solo-form-group label{font-size:.85rem;font-weight:600;color:#374151}
.solo-form-group label span.req{color:#dc2626}
.solo-form-input{border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-size:.9rem;color:#374151;transition:border-color .2s}
.solo-form-input:focus{border-color:#16a34a;outline:none}
.solo-form-textarea{border:1.5px solid #e5e7eb;border-radius:8px;padding:9px 12px;font-size:.9rem;color:#374151;min-height:80px;resize:vertical}
.solo-form-textarea:focus{border-color:#16a34a;outline:none}
.solo-section-title{font-size:1rem;font-weight:700;color:#1a3a1a;margin:24px 0 16px;padding-bottom:8px;border-bottom:2px solid #f0fdf4;display:flex;align-items:center;gap:8px}
.solo-params-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px}
.solo-param-item{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:12px}
.solo-param-name{font-size:.8rem;font-weight:600;color:#374151;margin-bottom:6px}
.solo-param-ideal{font-size:.75rem;color:#9ca3af;margin-bottom:6px}
.solo-param-input-row{display:flex;align-items:center;gap:8px}
.solo-param-input{border:1.5px solid #e5e7eb;border-radius:6px;padding:6px 10px;font-size:.9rem;color:#374151;width:100%;transition:border-color .2s}
.solo-param-input:focus{border-color:#16a34a;outline:none}
.solo-param-status{font-size:.75rem;font-weight:600;margin-top:5px}
.solo-form-actions{display:flex;gap:12px;margin-top:24px;justify-content:flex-end}
.solo-detail-section{background:#fff;border:1.5px solid #e5e7eb;border-radius:12px;padding:20px;margin-bottom:20px}
.solo-result-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f3f4f6}
.solo-result-row:last-child{border:none}
.solo-result-name{font-size:.9rem;color:#374151}
.solo-result-value{font-weight:600;color:#1a3a1a}
.solo-result-status{font-size:.78rem;font-weight:600;padding:2px 8px;border-radius:10px}
.solo-result-ideal{background:#dcfce7;color:#16a34a}
.solo-result-baixo{background:#fef9c3;color:#92400e}
.solo-result-alto{background:#fee2e2;color:#dc2626}
.solo-chart-bar{height:10px;background:#e5e7eb;border-radius:5px;overflow:hidden;margin-top:4px}
.solo-chart-fill{height:100%;border-radius:5px;transition:width .5s}
</style>`;

  async function render(container) {
    if (!document.getElementById('solo-styles')) document.head.insertAdjacentHTML('beforeend', CSS);
    await runMigrations();
    editingId = null;
    currentView = 'list';
    await renderList(container);
  }

  async function renderList(container) {
    const fazendas = await loadFazendas();
    const analises = await loadAnalises();
    const fazOpts = fazendas.map(f => `<option value="${f.id}">${f.nome}</option>`).join('');
    container.innerHTML = `
    <div class="solo-container">
      <div class="solo-header">
        <div class="solo-header-left">
          <h2>🧪 Análise de Solo</h2>
          <p>Registro e acompanhamento de análises laboratoriais</p>
          <div class="solo-premium-badge">⭐ Módulo Premium</div>
        </div>
        <button class="solo-btn solo-btn-primary" onclick="AdminAnaliseSolo.showForm()">+ Nova Análise</button>
      </div>
      <div class="solo-filters">
        <select class="solo-filter-select" id="solo-filter-fazenda" onchange="AdminAnaliseSolo.applyFilters()">
          <option value="">Todas as fazendas</option>
          ${fazOpts}
        </select>
        <select class="solo-filter-select" id="solo-filter-status" onchange="AdminAnaliseSolo.applyFilters()">
          <option value="">Todos os status</option>
          <option value="pendente">Pendente</option>
          <option value="aprovada">Aprovada</option>
          <option value="reprovada">Reprovada</option>
        </select>
      </div>
      <div class="solo-grid" id="solo-grid">
        ${renderAnaliseCards(analises)}
      </div>
    </div>`;
  }

  function renderAnaliseCards(analises) {
    if (!analises.length) return '<div class="solo-empty"><span>🧪</span><p>Nenhuma análise cadastrada ainda.<br>Clique em <b>+ Nova Análise</b> para começar.</p></div>';
    return analises.map(a => {
      const res = a.resultados || {};
      const paramCount = Object.keys(res).filter(k => res[k] !== null && res[k] !== '').length;
      return `
      <div class="solo-card">
        <div class="solo-card-header">
          <div>
            <div class="solo-card-title">📍 ${a.fazendas?.nome || '–'} ${a.talhoes ? '— ' + a.talhoes.nome : ''}</div>
            <div class="solo-card-sub">Coleta: ${a.data_coleta} ${a.laboratorio ? '| Lab: ' + a.laboratorio : ''} ${a.numero_amostra ? '| Amostra: ' + a.numero_amostra : ''}</div>
          </div>
          ${statusBadge(a.status)}
        </div>
        <div class="solo-card-meta">
          <span>📐 Profundidade: ${a.profundidade || '0-20'} cm</span>
          ${a.cultura_referencia ? '<span>🌱 Cultura: ' + a.cultura_referencia + '</span>' : ''}
          <span>🔬 ${paramCount} parâmetros registrados</span>
        </div>
        <div class="solo-card-actions">
          <button class="solo-btn solo-btn-secondary" onclick="AdminAnaliseSolo.viewDetail('${a.id}')">Ver Detalhes</button>
          <button class="solo-btn solo-btn-secondary" onclick="AdminAnaliseSolo.editAnalise('${a.id}')">Editar</button>
          <button class="solo-btn solo-btn-danger" onclick="AdminAnaliseSolo.confirmDelete('${a.id}')">Excluir</button>
        </div>
      </div>`;
    }).join('');
  }

  async function showForm(analise) {
    const container = document.querySelector('.solo-container') || document.getElementById('module-content');
    const fazendas = await loadFazendas();
    const fazOpts = fazendas.map(f => `<option value="${f.id}" ${analise?.fazenda_id===f.id?'selected':''}>${f.nome}</option>`).join('');
    const res = analise?.resultados || {};
    const profOpts = ['0-20','20-40','0-40','0-10','10-20'].map(p => `<option ${(analise?.profundidade||'0-20')===p?'selected':''}>${p}</option>`).join('');

    function paramSection(titulo, params) {
      return `<div class="solo-section-title">${titulo}</div>
      <div class="solo-params-grid">
        ${params.map(p => {
          const v = res[p.key] !== undefined ? res[p.key] : '';
          const st = paramStatus(p.key, v);
          return `<div class="solo-param-item">
            <div class="solo-param-name">${p.nome}</div>
            <div class="solo-param-ideal">Ideal: ${p.ideal}</div>
            <div class="solo-param-input-row">
              <input type="number" step="0.01" class="solo-param-input" id="param_${p.key}" value="${v}" placeholder="–" oninput="AdminAnaliseSolo.updateParamStatus('${p.key}',this.value)">
            </div>
            <div class="solo-param-status" id="pstatus_${p.key}" style="color:${paramStatusColor(st)}">${paramStatusLabel(st)}</div>
          </div>`;
        }).join('')}
      </div>`;
    }

    container.innerHTML = `
    <div class="solo-container">
      <div class="solo-header">
        <div class="solo-header-left">
          <h2>${analise ? '✏️ Editar Análise' : '🧪 Nova Análise de Solo'}</h2>
          <p>Preencha os dados da amostra e resultados laboratoriais</p>
        </div>
        <button class="solo-btn solo-btn-secondary" onclick="AdminAnaliseSolo.backToList()">‹ Voltar</button>
      </div>
      <div class="solo-form-card">
        <div class="solo-form-grid">
          <div class="solo-form-group">
            <label>Fazenda <span class="req">*</span></label>
            <select class="solo-form-input" id="solo_fazenda" onchange="AdminAnaliseSolo.loadTalhoesSelect(this.value)">
              <option value="">Selecionar...</option>
              ${fazOpts}
            </select>
          </div>
          <div class="solo-form-group">
            <label>Talhão</label>
            <select class="solo-form-input" id="solo_talhao">
              <option value="">Todos / Geral</option>
            </select>
          </div>
          <div class="solo-form-group">
            <label>Data de Coleta <span class="req">*</span></label>
            <input type="date" class="solo-form-input" id="solo_data" value="${analise?.data_coleta||''}">
          </div>
          <div class="solo-form-group">
            <label>Profundidade (cm)</label>
            <select class="solo-form-input" id="solo_prof">
              ${profOpts}
            </select>
          </div>
          <div class="solo-form-group">
            <label>Laboratório</label>
            <input type="text" class="solo-form-input" id="solo_lab" value="${analise?.laboratorio||''}" placeholder="Nome do laboratório">
          </div>
          <div class="solo-form-group">
            <label>Número da Amostra</label>
            <input type="text" class="solo-form-input" id="solo_amostra" value="${analise?.numero_amostra||''}" placeholder="Ex: 2024-001">
          </div>
          <div class="solo-form-group">
            <label>Cultura de Referência</label>
            <input type="text" class="solo-form-input" id="solo_cultura" value="${analise?.cultura_referencia||''}" placeholder="Ex: Soja, Milho, Café...">
          </div>
          <div class="solo-form-group">
            <label>Status</label>
            <select class="solo-form-input" id="solo_status">
              <option value="pendente" ${(!analise||analise.status==='pendente')?'selected':''}>Pendente</option>
              <option value="aprovada" ${analise?.status==='aprovada'?'selected':''}>Aprovada</option>
              <option value="reprovada" ${analise?.status==='reprovada'?'selected':''}>Reprovada</option>
            </select>
          </div>
          <div class="solo-form-group full">
            <label>Recomendações / Interpretação</label>
            <textarea class="solo-form-textarea" id="solo_recomendacoes" placeholder="Observações sobre a análise, recomendações de calagem, adubação...">${analise?.recomendacoes||''}</textarea>
          </div>
          <div class="solo-form-group full">
            <label>Observações Internas</label>
            <textarea class="solo-form-textarea" id="solo_observacoes" placeholder="Notas internas...">${analise?.observacoes||''}</textarea>
          </div>
        </div>
        ${paramSection('📊 Macronutrientes & pH', PARAMETROS.macronutrientes)}
        ${paramSection('🔬 Micronutrientes', PARAMETROS.micronutrientes)}
        ${paramSection('🏔️ Atributos Físicos', PARAMETROS.fisicos)}
        <div class="solo-form-actions">
          <button class="solo-btn solo-btn-secondary" onclick="AdminAnaliseSolo.backToList()">Cancelar</button>
          <button class="solo-btn solo-btn-primary" onclick="AdminAnaliseSolo.submitForm()">💾 Salvar Análise</button>
        </div>
      </div>
    </div>`;
    if (analise?.fazenda_id) await loadTalhoesSelect(analise.fazenda_id, analise.talhao_id);
  }

  async function loadTalhoesSelect(fazendaId, selectedId) {
    const talhoes = await loadTalhoes(fazendaId);
    const sel = document.getElementById('solo_talhao');
    if (!sel) return;
    sel.innerHTML = '<option value="">Todos / Geral</option>' + talhoes.map(t => `<option value="${t.id}" ${t.id===selectedId?'selected':''}>${t.nome}</option>`).join('');
  }

  function updateParamStatus(key, value) {
    const st = paramStatus(key, value);
    const el = document.getElementById(`pstatus_${key}`);
    if (el) { el.textContent = paramStatusLabel(st); el.style.color = paramStatusColor(st); }
  }

  async function submitForm() {
    const fazId = document.getElementById('solo_fazenda')?.value;
    const data = document.getElementById('solo_data')?.value;
    if (!fazId || !data) { alert('Fazenda e Data de Coleta são obrigatórios.'); return; }
    const resultados = {};
    const allParams = [...PARAMETROS.macronutrientes, ...PARAMETROS.micronutrientes, ...PARAMETROS.fisicos];
    allParams.forEach(p => {
      const v = document.getElementById(`param_${p.key}`)?.value;
      if (v !== null && v !== undefined && v !== '') resultados[p.key] = parseFloat(v);
    });
    const payload = {
      fazenda_id: fazId,
      talhao_id: document.getElementById('solo_talhao')?.value || null,
      data_coleta: data,
      profundidade: document.getElementById('solo_prof')?.value || '0-20',
      laboratorio: document.getElementById('solo_lab')?.value || null,
      numero_amostra: document.getElementById('solo_amostra')?.value || null,
      cultura_referencia: document.getElementById('solo_cultura')?.value || null,
      status: document.getElementById('solo_status')?.value || 'pendente',
      recomendacoes: document.getElementById('solo_recomendacoes')?.value || null,
      observacoes: document.getElementById('solo_observacoes')?.value || null,
      resultados
    };
    try {
      await saveAnalise(payload);
      await backToList();
    } catch(e) { alert('Erro ao salvar: ' + e.message); }
  }

  async function editAnalise(id) {
    const sb = getSupabase();
    editingId = id;
    const { data } = await sb.from('analise_solo').select('*').eq('id', id).single();
    if (data) await showForm(data);
  }

  async function viewDetail(id) {
    const sb = getSupabase();
    const { data: a } = await sb.from('analise_solo').select(`*, fazendas(nome), talhoes(nome)`).eq('id', id).single();
    if (!a) return;
    const container = document.querySelector('.solo-container') || document.getElementById('module-content');
    const res = a.resultados || {};
    const allParams = [...PARAMETROS.macronutrientes, ...PARAMETROS.micronutrientes, ...PARAMETROS.fisicos];

    function paramRows(params) {
      return params.filter(p => res[p.key] !== undefined && res[p.key] !== null && res[p.key] !== '').map(p => {
        const v = res[p.key];
        const st = paramStatus(p.key, v);
        const pct = Math.min(100, Math.max(0, ((v - 0) / (p.max * 1.5)) * 100));
        const color = paramStatusColor(st);
        const stClass = `solo-result-${st === 'sem-dado' ? 'ideal' : st}`;
        return `<div class="solo-result-row">
          <span class="solo-result-name">${p.nome}</span>
          <div style="flex:1;margin:0 16px">
            <div class="solo-chart-bar"><div class="solo-chart-fill" style="width:${pct}%;background:${color}"></div></div>
          </div>
          <span class="solo-result-value">${v} ${p.unidade}</span>
          <span class="solo-result-status ${stClass}" style="margin-left:8px">${paramStatusLabel(st)}</span>
        </div>`;
      }).join('') || '<p style="color:#9ca3af;font-size:.85rem">Nenhum dado registrado</p>';
    }

    container.innerHTML = `
    <div class="solo-container">
      <div class="solo-header">
        <div class="solo-header-left">
          <h2>🔍 Detalhes da Análise</h2>
          <p>${a.fazendas?.nome} ${a.talhoes ? '— ' + a.talhoes.nome : ''} | Coleta: ${a.data_coleta}</p>
        </div>
        <div style="display:flex;gap:10px">
          <button class="solo-btn solo-btn-secondary" onclick="AdminAnaliseSolo.editAnalise('${a.id}')">Editar</button>
          <button class="solo-btn solo-btn-secondary" onclick="AdminAnaliseSolo.backToList()">‹ Voltar</button>
        </div>
      </div>
      <div class="solo-detail-section">
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:16px">
          <div><b>Laboratório</b><div>${a.laboratorio||'–'}</div></div>
          <div><b>Amostra</b><div>${a.numero_amostra||'–'}</div></div>
          <div><b>Profundidade</b><div>${a.profundidade||'0-20'} cm</div></div>
          <div><b>Cultura</b><div>${a.cultura_referencia||'–'}</div></div>
          <div><b>Status</b><div>${statusBadge(a.status)}</div></div>
        </div>
        ${a.recomendacoes ? `<div style="background:#f0fdf4;border-radius:8px;padding:12px;margin-top:8px"><b>💡 Recomendações:</b><p style="margin:6px 0 0;color:#374151;font-size:.9rem">${a.recomendacoes}</p></div>` : ''}
      </div>
      <div class="solo-detail-section">
        <div class="solo-section-title">📊 Macronutrientes & pH</div>
        ${paramRows(PARAMETROS.macronutrientes)}
        <div class="solo-section-title" style="margin-top:20px">🔬 Micronutrientes</div>
        ${paramRows(PARAMETROS.micronutrientes)}
        <div class="solo-section-title" style="margin-top:20px">🏔️ Atributos Físicos</div>
        ${paramRows(PARAMETROS.fisicos)}
      </div>
    </div>`;
  }

  async function confirmDelete(id) {
    if (!confirm('Confirma a exclusão desta análise? Esta ação não pode ser desfeita.')) return;
    await deleteAnalise(id);
    await backToList();
  }

  async function backToList() {
    editingId = null;
    currentView = 'list';
    const container = document.querySelector('.solo-container') || document.getElementById('module-content');
    await renderList(container);
  }

  async function applyFilters() {
    const fazendaId = document.getElementById('solo-filter-fazenda')?.value;
    const status = document.getElementById('solo-filter-status')?.value;
    const analises = await loadAnalises({ fazendaId, status });
    const grid = document.getElementById('solo-grid');
    if (grid) grid.innerHTML = renderAnaliseCards(analises);
  }

  return { render, showForm, backToList, loadTalhoesSelect, updateParamStatus, submitForm, editAnalise, viewDetail, confirmDelete, applyFilters };
})();

window.AdminAnaliseSolo = AdminAnaliseSolo;
