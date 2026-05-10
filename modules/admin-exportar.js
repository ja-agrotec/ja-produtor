// ============================================================
// JA AGRO — Admin Module: Exportar
// admin-exportar.js
// ============================================================
window.module_exportar = async function() {
  const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtR = n => n!=null ? Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '';
  const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '';

  let _fazendas = [];

  async function render() {
    const { data: faz } = await sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome');
    _fazendas = faz||[];
    const fazOpts = _fazendas.map(f=>'<option value="'+f.id+'">'+esc(f.nome)+'</option>').join('');
    const hoje = new Date().toISOString().split('T')[0];
    const mIni = new Date(new Date().getFullYear(),0,1).toISOString().split('T')[0];

    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>📤 Exportar Dados</span></div></div>'+

      '<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;padding:20px">'+

      // Card: Lançamentos CSV
      '<div class="stat-card" style="padding:20px;cursor:default">'+
      '<div style="font-size:32px;margin-bottom:8px">📋</div>'+
      '<h3 style="margin:0 0 8px;font-size:16px">Lançamentos</h3>'+
      '<p style="color:var(--muted);font-size:13px;margin:0 0 16px">Exporte receitas e despesas em CSV para Excel ou Google Sheets</p>'+
      '<div class="form-field"><label>Fazenda</label>'+
      '<select id="exp_faz_lan"><option value="">Todas</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Período</label>'+
      '<div style="display:flex;gap:8px"><input type="date" id="exp_ini_lan" value="'+mIni+'" style="flex:1"/><input type="date" id="exp_fim_lan" value="'+hoje+'" style="flex:1"/></div></div>'+
      '<button class="topbar-btn btn-primary" style="width:100%;margin-top:8px" onclick="window._exp_lancamentos()">⬇️ Exportar CSV</button>'+
      '</div>'+

      // Card: Safras
      '<div class="stat-card" style="padding:20px;cursor:default">'+
      '<div style="font-size:32px;margin-bottom:8px">📅</div>'+
      '<h3 style="margin:0 0 8px;font-size:16px">Safras</h3>'+
      '<p style="color:var(--muted);font-size:13px;margin:0 0 16px">Resultado financeiro de todas as safras com custos e receitas</p>'+
      '<div class="form-field"><label>Fazenda</label>'+
      '<select id="exp_faz_saf"><option value="">Todas</option>'+fazOpts+'</select></div>'+
      '<button class="topbar-btn btn-primary" style="width:100%;margin-top:8px" onclick="window._exp_safras()">⬇️ Exportar CSV</button>'+
      '</div>'+

      // Card: Insumos
      '<div class="stat-card" style="padding:20px;cursor:default">'+
      '<div style="font-size:32px;margin-bottom:8px">🧪</div>'+
      '<h3 style="margin:0 0 8px;font-size:16px">Estoque de Insumos</h3>'+
      '<p style="color:var(--muted);font-size:13px;margin:0 0 16px">Posição atual do estoque com valor e alertas de mínimo</p>'+
      '<div class="form-field"><label>Fazenda</label>'+
      '<select id="exp_faz_ins"><option value="">Todas</option>'+fazOpts+'</select></div>'+
      '<button class="topbar-btn btn-primary" style="width:100%;margin-top:8px" onclick="window._exp_insumos()">⬇️ Exportar CSV</button>'+
      '</div>'+

      // Card: Relatório Executivo
      '<div class="stat-card" style="padding:20px;cursor:default">'+
      '<div style="font-size:32px;margin-bottom:8px">📊</div>'+
      '<h3 style="margin:0 0 8px;font-size:16px">Relatório Executivo</h3>'+
      '<p style="color:var(--muted);font-size:13px;margin:0 0 16px">Resumo consolidado por fazenda: KPIs, safras e financeiro</p>'+
      '<button class="topbar-btn btn-primary" style="width:100%;margin-top:8px" onclick="window._exp_executivo()">⬇️ Exportar CSV</button>'+
      '</div>'
      + '<div style="background:var(--dark2,#152615);border:1px solid rgba(255,255,255,.08);border-radius:12px;padding:24px">' 
      + '<div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">' 
      + '<span style="font-size:32px">📁</span>' 
      + '<div><h3 style="margin:0;font-size:16px;font-weight:700">Documentos e Anexos</h3>' 
      + '<p style="margin:4px 0 0;font-size:12px;color:#888">Inventário de documentos vinculados</p></div></div>' 
      + '<button class="topbar-btn btn-primary" style="width:100%;margin-top:8px" onclick="loadModule(\'documentos\',document.querySelector(\'[data-module=\\\'documentos\\\']\')||{})">📁 Abrir Módulo Documentos</button>' 
      + '<button class="topbar-btn btn-primary" style="width:100%;margin-top:8px;background:rgba(124,179,66,.15);color:#7cb342;border:1px solid rgba(124,179,66,.3)" onclick="window._expDocumentos&&window._expDocumentos()">⬇️ Exportar Inventário CSV</button>' 
      + '</div>'+
      '</div>';
  }

  // ── HELPER CSV ───────────────────────────────────────────
  

  // ── Exportar inventário de documentos ──
  window._expDocumentos = async function() {
    try {
      const { data } = await sb.from('documentos').select('*').order('created_at', { ascending: false });
      const rows = data || [];
      const headers = ['ID','Nome Arquivo','Tipo','Modulo Origem','Entidade','Descricao','URL','Tamanho','Destaque','Versao','Criado em'];
      const csv = [headers, ...rows.map(r => [
        r.id, r.nome_arquivo, r.tipo_documento, r.modulo_origem,
        r.entidade_descricao, r.descricao, r.url_arquivo,
        r.tamanho_bytes, r.destaque, r.versao, r.created_at
      ].map(v => '"' + String(v||'').replace(/"/g,'""') + '"').join(','))].join('\n');
      baixar('inventario_documentos.csv', csv);
    } catch(e) { alert('Erro ao exportar: ' + e.message); }
  };

  function baixarCSV(nome, cabecalho, linhas) {
    const BOM = '\uFEFF'; // BOM para Excel reconhecer UTF-8
    const csv = BOM + [cabecalho, ...linhas].join('\n');
    const blob = new Blob([csv], { type:'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = nome+'.csv'; a.click();
    URL.revokeObjectURL(url);
    toast('Arquivo exportado com sucesso!','ok');
  }

  function csvVal(v) {
    const s = String(v??'');
    return s.includes(',') || s.includes('"') || s.includes('\n') ? '"'+s.replace(/"/g,'""')+'"' : s;
  }

  // ── EXPORTAR LANÇAMENTOS ─────────────────────────────────
  window._exp_lancamentos = async function() {
    toast('Preparando exportação...','ok');
    const fazId = document.getElementById('exp_faz_lan').value;
    const ini   = document.getElementById('exp_ini_lan').value;
    const fim   = document.getElementById('exp_fim_lan').value;
    let q = sb.from('lancamentos')
      .select('data_lancamento, fazendas(nome), safras(nome), talhoes(nome), categorias_lancamento(nome), tipo, descricao, quantidade, unidade, custo_unitario, custo_total, nota_fiscal, operadores(nome), maquinas(nome), status')
      .neq('status','cancelado')
      .order('data_lancamento');
    if(fazId) q = q.eq('fazenda_id',fazId);
    if(ini)   q = q.gte('data_lancamento',ini);
    if(fim)   q = q.lte('data_lancamento',fim);
    const { data, error } = await q;
    if(error){ toast('Erro: '+error.message,'bad'); return; }
    const cab = 'Data,Fazenda,Safra,Talhão,Categoria,Tipo,Descrição,Quantidade,Unidade,Custo Unitário,Custo Total,Nota Fiscal,Operador,Máquina,Status';
    const lin = (data||[]).map(l=>[
      csvVal(fmtD(l.data_lancamento)),
      csvVal(l.fazendas?.nome||''),
      csvVal(l.safras?.nome||''),
      csvVal(l.talhoes?.nome||''),
      csvVal(l.categorias_lancamento?.nome||''),
      csvVal(l.tipo),
      csvVal(l.descricao||''),
      csvVal(fmtR(l.quantidade)),
      csvVal(l.unidade||''),
      csvVal(fmtR(l.custo_unitario)),
      csvVal(fmtR(l.custo_total)),
      csvVal(l.nota_fiscal||''),
      csvVal(l.operadores?.nome||''),
      csvVal(l.maquinas?.nome||''),
      csvVal(l.status)
    ].join(','));
    baixarCSV('lancamentos_'+ini+'_'+fim, cab, lin);
  };

  // ── EXPORTAR SAFRAS ──────────────────────────────────────
  window._exp_safras = async function() {
    toast('Preparando exportação...','ok');
    const fazId = document.getElementById('exp_faz_saf').value;
    let q = sb.from('safras').select('nome, fazendas(nome), cultura, ano_agricola, data_plantio, data_colheita, area_ha, produção_sc, produtividade_sc_ha, custo_total, receita_total, status').order('nome');
    if(fazId) q = q.eq('fazenda_id',fazId);
    const { data, error } = await q;
    if(error){ toast('Erro: '+error.message,'bad'); return; }
    const cab = 'Safra,Fazenda,Cultura,Ano Agrícola,Plantio,Colheita,Área (ha),Produção (sc),Produtividade (sc/ha),Custo Total,Receita Total,Resultado,Status';
    const lin = (data||[]).map(s=>[
      csvVal(s.nome),
      csvVal(s.fazendas?.nome||''),
      csvVal(s.cultura),
      csvVal(s.ano_agricola||''),
      csvVal(fmtD(s.data_plantio)),
      csvVal(fmtD(s.data_colheita)),
      csvVal(fmtR(s.area_ha)),
      csvVal(fmtR(s.produção_sc)),
      csvVal(fmtR(s.produtividade_sc_ha)),
      csvVal(fmtR(s.custo_total)),
      csvVal(fmtR(s.receita_total)),
      csvVal(fmtR((s.receita_total||0)-(s.custo_total||0))),
      csvVal(s.status)
    ].join(','));
    baixarCSV('safras', cab, lin);
  };

  // ── EXPORTAR INSUMOS ─────────────────────────────────────
  window._exp_insumos = async function() {
    toast('Preparando exportação...','ok');
    const fazId = document.getElementById('exp_faz_ins').value;
    let q = sb.from('insumos').select('nome, fazendas(nome), categoria, unidade, principio_ativo, fabricante, estoque_atual, estoque_minimo, preco_unitario').eq('ativo',true).order('nome');
    if(fazId) q = q.eq('fazenda_id',fazId);
    const { data, error } = await q;
    if(error){ toast('Erro: '+error.message,'bad'); return; }
    const cab = 'Insumo,Fazenda,Categoria,Unidade,Princípio Ativo,Fabricante,Estoque Atual,Estoque Mínimo,Preço Unit.,Valor Total,Status Estoque';
    const lin = (data||[]).map(i=>{
      const baixo = (i.estoque_atual||0)<=(i.estoque_minimo||0);
      return [
        csvVal(i.nome),
        csvVal(i.fazendas?.nome||''),
        csvVal(i.categoria||''),
        csvVal(i.unidade),
        csvVal(i.principio_ativo||''),
        csvVal(i.fabricante||''),
        csvVal(fmtR(i.estoque_atual)),
        csvVal(fmtR(i.estoque_minimo)),
        csvVal(fmtR(i.preco_unitario)),
        csvVal(fmtR((i.estoque_atual||0)*(i.preco_unitario||0))),
        csvVal(baixo?'CRÍTICO':'OK')
      ].join(',');
    });
    baixarCSV('estoque_insumos', cab, lin);
  };

  // ── RELATÓRIO EXECUTIVO ──────────────────────────────────
  window._exp_executivo = async function() {
    toast('Preparando relatório...','ok');
    const { data: faz } = await sb.from('vw_dashboard').select('*');
    if(!faz){ toast('Erro ao gerar relatório','bad'); return; }
    const cab = 'Fazenda,Talhões Ativos,Safras Abertas,Total Lançamentos,Total Despesas,Total Receitas,Resultado,Insumos Críticos,Máquinas Ativas';
    const lin = (faz||[]).map(f=>[
      csvVal(f.fazenda_nome),
      csvVal(f.total_talhoes||0),
      csvVal(f.safras_abertas||0),
      csvVal(f.total_lancamentos||0),
      csvVal(fmtR(f.total_despesas)),
      csvVal(fmtR(f.total_receitas)),
      csvVal(fmtR((f.total_receitas||0)-(f.total_despesas||0))),
      csvVal(f.insumos_baixo_estoque||0),
      csvVal(f.maquinas_ativas||0)
    ].join(','));
    baixarCSV('relatorio_executivo_'+new Date().toISOString().split('T')[0], cab, lin);
  };

  render();
};
