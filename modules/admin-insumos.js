// ============================================================
// JA AGRO — Admin Module: Insumos (Híbrido Multi-Fazenda)
// admin-insumos.js
// ============================================================
window.module_insumos = async function() {
  var c = document.getElementById('mainContent');
  if (!c) return;
  c.innerHTML = '<div style="padding:20px;text-align:center;color:#888">Carregando insumos...</div>';

  var sb = window._sb || window.sb;
  if (!sb) { c.innerHTML='<div style="padding:20px;color:red">Supabase não inicializado.</div>'; return; }

  var _insumos = [], _fazendas = [], _fazFiltro = 'todas', _busca = '';

  async function render() {
    try {
      var [insRes, fazRes] = await Promise.all([
        sb.from('insumos').select('*').eq('ativo', true).order('nome'),
        sb.from('fazendas').select('id,nome').eq('ativo', true).order('nome')
      ]);
      if (insRes.error) throw insRes.error;
      _insumos = insRes.data || [];
      _fazendas = fazRes.data || [];
      renderUI();
    } catch(e) {
      c.innerHTML = '<div style="padding:20px;color:red">Erro: '+e.message+'</div>';
    }
  }

  function kpi(val, label, color, icon) {
    return '<div style="background:#fff;border:1px solid #e0e0e0;border-radius:8px;padding:10px 16px;min-width:110px">'
      + '<div style="font-size:20px;font-weight:700;color:'+color+'">'+(icon||'')+val+'</div>'
      + '<div style="font-size:11px;color:#888;text-transform:uppercase;margin-top:2px">'+label+'</div>'
      + '</div>';
  }

  function calcStats() {
    var lista = filtrados();
    var baixo = lista.filter(function(i){ return i.estoque_minimo && i.estoque_atual <= i.estoque_minimo; }).length;
    var semFaz = lista.filter(function(i){ return !i.fazenda_id; }).length;
    return { total: lista.length, baixo: baixo, semFazenda: semFaz, porFazenda: lista.length - semFaz };
  }

  function filtrados() {
    return _insumos.filter(function(i) {
      var okFaz = _fazFiltro === 'todas' || i.fazenda_id === _fazFiltro || (!i.fazenda_id && _fazFiltro === 'global');
      var okBusca = !_busca || (i.nome||'').toLowerCase().includes(_busca.toLowerCase()) || (i.categoria||'').toLowerCase().includes(_busca.toLowerCase());
      return okFaz && okBusca;
    });
  }

  function renderRows() {
    var lista = filtrados();
    if (!lista.length) return '<tr><td colspan="7" style="padding:24px;text-align:center;color:#aaa">Nenhum insumo encontrado.</td></tr>';
    return lista.map(function(ins) {
      var faz = _fazendas.find(function(f){ return f.id === ins.fazenda_id; });
      var fazBadge = faz
        ? '<span style="background:#e8f5e9;color:#2d7d32;border-radius:4px;padding:2px 7px;font-size:11px">'+faz.nome+'</span>'
        : '<span style="background:#f3e5f5;color:#7b1fa2;border-radius:4px;padding:2px 7px;font-size:11px">🌐 Global</span>';
      var baixo = ins.estoque_minimo && parseFloat(ins.estoque_atual) <= parseFloat(ins.estoque_minimo);
      var estCor = baixo ? '#c62828' : '#2d7d32';
      var idQ = JSON.stringify(ins.id);
      return '<tr style="border-bottom:1px solid #f0f0f0">'
        + '<td style="padding:10px"><strong>'+ins.nome+'</strong>'+(ins.fabricante?'<br><span style="color:#aaa;font-size:11px">'+ins.fabricante+'</span>':'')+'</td>'
        + '<td style="padding:10px"><span style="background:#e3f2fd;color:#1565c0;border-radius:4px;padding:2px 7px;font-size:11px;font-weight:600">'+(ins.categoria||'—')+'</span></td>'
        + '<td style="padding:10px">'+fazBadge+'</td>'
        + '<td style="padding:10px;text-align:right;font-weight:700;color:'+estCor+'">'+(baixo?'⚠️ ':'')+parseFloat(ins.estoque_atual||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+' '+(ins.unidade||'')+'</td>'
        + '<td style="padding:10px;text-align:right;color:#999">'+(ins.estoque_minimo||'—')+(ins.estoque_minimo?' '+ins.unidade:'')+'</td>'
        + '<td style="padding:10px;text-align:right">R$ '+parseFloat(ins.preco_unitario||0).toFixed(2)+'</td>'
        + '<td style="padding:10px;text-align:center;white-space:nowrap">'
        + '<button onclick="window._ins_movimentar('+idQ+')" title="Entrada/Saída de Estoque" style="background:#1565c0;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;margin:1px">± Estoque</button> '
        + '<button onclick="window._ins_transferir('+idQ+')" title="Transferir para outra Fazenda" style="background:#e65100;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;margin:1px">↔ Transf.</button> '
        + '<button onclick="window._ins_abrirForm('+idQ+')" style="background:#555;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;margin:1px">Editar</button> '
        + '<button onclick="window._ins_excluir('+idQ+')" style="background:#c62828;color:#fff;border:none;border-radius:4px;padding:4px 8px;font-size:11px;cursor:pointer;margin:1px">Excluir</button>'
        + '</td></tr>';
    }).join('');
  }

  function renderUI() {
    var stats = calcStats();
    var fazOpts = '<option value="todas">🏘️ Todas as Fazendas</option><option value="global">🌐 Global (sem fazenda)</option>'
      + _fazendas.map(function(f){ return '<option value="'+f.id+'"'+(f.id===_fazFiltro?' selected':'')+'>'+f.nome+'</option>'; }).join('');

    c.innerHTML = '<div style="padding:16px 20px 8px">'
      + '<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">'
      + '<span style="font-weight:700;font-size:15px;color:#333">Insumos</span>'
      + '<select id="ins_fazFiltro" onchange="window._ins_setFaz(this.value)" style="border:1px solid #ccc;border-radius:6px;padding:4px 10px;font-size:13px;background:#fff">'+fazOpts+'</select>'
      + '<input id="ins_busca" type="text" placeholder="Buscar insumo..." value="'+_busca+'" oninput="window._ins_setBusca(this.value)" style="border:1px solid #ccc;border-radius:6px;padding:5px 10px;font-size:13px;min-width:180px">'
      + '<button onclick="window._ins_abrirForm(null)" style="margin-left:auto;background:#2d7d32;color:#fff;border:none;border-radius:6px;padding:7px 16px;font-size:13px;cursor:pointer;font-weight:600">+ Novo Insumo</button>'
      + '</div>'
      + '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">'
      + kpi(stats.total,'Total Insumos','#1565c0')
      + kpi(stats.baixo,'Estoque Baixo','#c62828',stats.baixo>0?'⚠️ ':'')
      + kpi(stats.semFazenda,'Global (sem fazenda)','#7b1fa2')
      + kpi(stats.porFazenda,'Com Fazenda','#2d7d32')
      + '</div>'
      + '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:13px">'
      + '<thead><tr style="background:#f5f5f5;border-bottom:2px solid #e0e0e0">'
      + '<th style="padding:8px 10px;text-align:left;color:#555;font-weight:600">NOME</th>'
      + '<th style="padding:8px 10px;text-align:left;color:#555;font-weight:600">TIPO</th>'
      + '<th style="padding:8px 10px;text-align:left;color:#555;font-weight:600">FAZENDA</th>'
      + '<th style="padding:8px 10px;text-align:right;color:#555;font-weight:600">ESTOQUE</th>'
      + '<th style="padding:8px 10px;text-align:right;color:#555;font-weight:600">EST. MÍN</th>'
      + '<th style="padding:8px 10px;text-align:right;color:#555;font-weight:600">PREÇO (R$)</th>'
      + '<th style="padding:8px 10px;text-align:center;color:#555;font-weight:600">AÇÕES</th>'
      + '</tr></thead>'
      + '<tbody id="ins_tbody">'+renderRows()+'</tbody>'
      + '</table></div></div>';
  }

  window._ins_setFaz = function(v) { _fazFiltro = v; var tb=document.getElementById('ins_tbody'); if(tb) tb.innerHTML=renderRows(); };
  window._ins_setBusca = function(v) { _busca = v; var tb=document.getElementById('ins_tbody'); if(tb) tb.innerHTML=renderRows(); };

  // MOVIMENTAÇÃO DE ESTOQUE
  window._ins_movimentar = function(insId) {
    var ins = _insumos.find(function(i){ return i.id===insId; });
    if (!ins) return;
    var faz = _fazendas.find(function(f){ return f.id===ins.fazenda_id; });
    var fazOpts = '<option value="">— Global (sem fazenda) —</option>'
      + _fazendas.map(function(f){ return '<option value="'+f.id+'"'+(f.id===ins.fazenda_id?' selected':'')+'>'+f.nome+'</option>'; }).join('');
    var old = document.getElementById('ins_modal_mov'); if(old) old.remove();
    var modal = document.createElement('div');
    modal.id = 'ins_modal_mov';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = '<div style="background:#fff;border-radius:10px;padding:24px;width:360px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
      + '<h3 style="margin:0 0 6px;font-size:15px;color:#1565c0">± Movimentar Estoque</h3>'
      + '<p style="font-size:13px;font-weight:600;margin:0 0 4px">'+ins.nome+'</p>'
      + '<p style="font-size:12px;color:#666;margin:0 0 14px">Estoque atual: <strong>'+parseFloat(ins.estoque_atual||0).toFixed(2)+' '+(ins.unidade||'')+'</strong>'+(faz?' • '+faz.nome:' • 🌐 Global')+'</p>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Tipo de Movimentação</label>'
      + '<select id="mov_tipo" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px">'
      + '<option value="entrada">📥 Entrada (Compra / Recebimento)</option>'
      + '<option value="saida">📤 Saída (Consumo / Aplicação)</option>'
      + '<option value="ajuste">🔧 Ajuste de Inventário (define valor absoluto)</option>'
      + '</select></div>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Quantidade ('+ins.unidade+')</label>'
      + '<input id="mov_qtd" type="number" min="0" step="0.01" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px;box-sizing:border-box"></div>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Fazenda do Estoque</label>'
      + '<select id="mov_fazenda" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px">'+fazOpts+'</select></div>'
      + '<div style="margin-bottom:14px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Motivo / Observação</label>'
      + '<input id="mov_motivo" type="text" placeholder="Ex: Compra NF 1234, Aplicação talhão T-01..." style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px;box-sizing:border-box"></div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button onclick="window._ins_closeMov()" style="border:1px solid #ccc;background:#fff;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer">Cancelar</button>'
      + '<button onclick="window._ins_doMov()" style="background:#1565c0;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600">Confirmar</button>'
      + '</div></div>';
    document.body.appendChild(modal);
  };

  window._ins_doMov = async function() {
    var tipo = document.getElementById('mov_tipo').value;
    var qtd = parseFloat(document.getElementById('mov_qtd').value) || 0;
    var novFazId = document.getElementById('mov_fazenda').value || null;
    if (qtd <= 0) { alert('Informe uma quantidade válida.'); return; }
    var ins = _insumos.find(function(i){ return i.id===_movId; });
    var novoEst = parseFloat(ins.estoque_atual||0);
    if (tipo==='entrada') novoEst += qtd;
    else if (tipo==='saida') novoEst = Math.max(0, novoEst - qtd);
    else novoEst = qtd;
    var upd = { estoque_atual: novoEst, fazenda_id: novFazId, atualizado_em: new Date().toISOString() };
    var {error} = await sb.from('insumos').update(upd).eq('id', _movId);
    if (error) { alert('Erro: '+error.message); return; }
    document.getElementById('ins_modal_mov').remove();
    await render();
  };

  // TRANSFERÊNCIA ENTRE FAZENDAS
  window._ins_transferir = function(insId) {
    var ins = _insumos.find(function(i){ return i.id===insId; });
    if (!ins) return;
    var fazOrigem = _fazendas.find(function(f){ return f.id===ins.fazenda_id; });
    var destOpts = _fazendas.filter(function(f){ return f.id!==ins.fazenda_id; })
      .map(function(f){ return '<option value="'+f.id+'">'+f.nome+'</option>'; }).join('');
    if (!destOpts) { alert('Não há outras fazendas disponíveis.'); return; }
    var old = document.getElementById('ins_modal_transf'); if(old) old.remove();
    var modal = document.createElement('div');
    modal.id = 'ins_modal_transf';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center';
    modal.innerHTML = '<div style="background:#fff;border-radius:10px;padding:24px;width:380px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
      + '<h3 style="margin:0 0 4px;font-size:15px;color:#e65100">↔ Transferir Insumo entre Fazendas</h3>'
      + '<p style="font-size:13px;font-weight:600;margin:0 0 12px">'+ins.nome+'</p>'
      + '<div style="background:#fff8e1;border:1px solid #ffe082;border-radius:6px;padding:10px 12px;margin-bottom:14px;font-size:12px">'
      + '📍 <strong>Origem:</strong> '+(fazOrigem?fazOrigem.nome:'🌐 Global')+'&nbsp;&nbsp;|&nbsp;&nbsp;Estoque disponível: <strong>'+parseFloat(ins.estoque_atual||0).toFixed(2)+' '+(ins.unidade||'')+'</strong></div>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Fazenda Destino</label>'
      + '<select id="transf_dest" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px">'+destOpts+'</select></div>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Quantidade a Transferir ('+ins.unidade+')</label>'
      + '<input id="transf_qtd" type="number" min="0.01" step="0.01" max="'+ins.estoque_atual+'" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px;box-sizing:border-box"></div>'
      + '<div style="margin-bottom:14px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Observação (opcional)</label>'
      + '<input id="transf_obs" type="text" placeholder="Ex: Abastecimento safra verão..." style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px;box-sizing:border-box"></div>'
      + '<p style="font-size:11px;color:#888;margin:0 0 12px">A transferência reduz o estoque da origem e aumenta (ou cria) na fazenda destino.</p>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button onclick="window._ins_closeTransf()" style="border:1px solid #ccc;background:#fff;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer">Cancelar</button>'
      + '<button onclick="window._ins_doTransf()" style="background:#e65100;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600">Transferir →</button>'
      + '</div></div>';
    _transfId = insId;
    document.body.appendChild(modal);
  };

  window._ins_doTransf = async function() {
    var qtd = parseFloat(document.getElementById('transf_qtd').value)||0;
    var destId = document.getElementById('transf_dest').value;
    if (qtd<=0){ alert('Informe uma quantidade válida.'); return; }
    var ins = _insumos.find(function(i){ return i.id===_transfId; });
    if (qtd>parseFloat(ins.estoque_atual||0)){ alert('Quantidade maior que o estoque disponível ('+ins.estoque_atual+' '+ins.unidade+').'); return; }
    var insDestino = _insumos.find(function(i){ return i.nome===ins.nome && i.fazenda_id===destId && i.ativo; });
    try {
      if (insDestino) {
        await sb.from('insumos').update({ estoque_atual: parseFloat(insDestino.estoque_atual||0)+qtd, atualizado_em: new Date().toISOString() }).eq('id', insDestino.id);
      } else {
        await sb.from('insumos').insert([{ nome:ins.nome, categoria:ins.categoria, unidade:ins.unidade, principio_ativo:ins.principio_ativo, fabricante:ins.fabricante, registro_mapa:ins.registro_mapa, estoque_atual:qtd, estoque_minimo:ins.estoque_minimo, preco_unitario:ins.preco_unitario, fazenda_id:destId, ativo:true }]);
      }
      await sb.from('insumos').update({ estoque_atual: parseFloat(ins.estoque_atual||0)-qtd, atualizado_em: new Date().toISOString() }).eq('id', _transfId);
      document.getElementById('ins_modal_transf').remove();
      await render();
    } catch(e){ alert('Erro: '+e.message); }
  };

  // FORM NOVO/EDITAR
  window._ins_abrirForm = function(insId) {
    var ins = insId ? _insumos.find(function(i){ return i.id===insId; }) : null;
    var v = ins||{};
    var fazOpts = '<option value="">— Global (Todas as Fazendas) —</option>'
      + _fazendas.map(function(f){ return '<option value="'+f.id+'"'+(f.id===v.fazenda_id?' selected':'')+'>'+f.nome+'</option>'; }).join('');
    var cats = ['FERTILIZANTE','DEFENSIVO','HERBICIDA','INSETICIDA','FUNGICIDA','SEMENTE','COMBUSTÍVEL','LUBRIFICANTE','OUTRO'];
    var unds = ['kg','L','sc','t','unid','cx','gl','m³'];
    var old = document.getElementById('ins_modal_form'); if(old) old.remove();
    var modal = document.createElement('div');
    modal.id = 'ins_modal_form';
    modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px';
    modal.innerHTML = '<div style="background:#fff;border-radius:10px;padding:24px;width:440px;max-width:100%;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)">'
      + '<h3 style="margin:0 0 16px;font-size:15px;color:#333">'+(ins?'Editar':'Novo')+' Insumo</h3>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Nome *</label><input id="ins_nome" type="text" value="'+(v.nome||'')+'" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px;box-sizing:border-box"></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
      + '<div><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Categoria</label><select id="ins_cat" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px">'+cats.map(function(cat){ return '<option value="'+cat+'"'+(cat===v.categoria?' selected':'')+'>'+cat+'</option>'; }).join('')+'</select></div>'
      + '<div><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Unidade</label><select id="ins_und" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px">'+unds.map(function(u){ return '<option value="'+u+'"'+(u===v.unidade?' selected':'')+'>'+u+'</option>'; }).join('')+'</select></div>'
      + '</div>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">🏘️ Fazenda (estoque pertence a)</label><select id="ins_faz" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px">'+fazOpts+'</select><p style="font-size:11px;color:#888;margin:3px 0 0">Vazio = Global (visível em todas as fazendas)</p></div>'
      + '<div style="margin-bottom:10px"><label style="font-size:12px;color:#555;display:block;margin-bottom:4px">Fabricante</label><input id="ins_fab" type="text" value="'+(v.fabricante||'')+'" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:7px 10px;font-size:13px;box-sizing:border-box"></div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:16px">'
      + '<div><label style="font-size:11px;color:#555;display:block;margin-bottom:3px">Estoque Atual</label><input id="ins_est" type="number" min="0" step="0.01" value="'+(v.estoque_atual||0)+'" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:6px 8px;font-size:13px;box-sizing:border-box"></div>'
      + '<div><label style="font-size:11px;color:#555;display:block;margin-bottom:3px">Estoque Mín.</label><input id="ins_estmin" type="number" min="0" step="0.01" value="'+(v.estoque_minimo||'')+'" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:6px 8px;font-size:13px;box-sizing:border-box"></div>'
      + '<div><label style="font-size:11px;color:#555;display:block;margin-bottom:3px">Preço (R$)</label><input id="ins_preco" type="number" min="0" step="0.01" value="'+(v.preco_unitario||'')+'" style="width:100%;border:1px solid #ccc;border-radius:6px;padding:6px 8px;font-size:13px;box-sizing:border-box"></div>'
      + '</div>'
      + '<div style="display:flex;gap:8px;justify-content:flex-end">'
      + '<button onclick="window._ins_closeForm()" style="border:1px solid #ccc;background:#fff;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer">Cancelar</button>'
      + '<button onclick="window._ins_doForm()" style="background:#2d7d32;color:#fff;border:none;border-radius:6px;padding:8px 16px;font-size:13px;cursor:pointer;font-weight:600">Salvar</button>'
      + '</div></div>';
    _formId = insId;
    document.body.appendChild(modal);
  };

  window._ins_doForm = async function() {
    var dados = {
      nome: (document.getElementById('ins_nome').value||'').trim(),
      categoria: document.getElementById('ins_cat').value,
      unidade: document.getElementById('ins_und').value,
      fazenda_id: document.getElementById('ins_faz').value || null,
      fabricante: document.getElementById('ins_fab').value.trim() || null,
      estoque_atual: parseFloat(document.getElementById('ins_est').value)||0,
      estoque_minimo: parseFloat(document.getElementById('ins_estmin').value)||null,
      preco_unitario: parseFloat(document.getElementById('ins_preco').value)||null,
      ativo: true, atualizado_em: new Date().toISOString()
    };
    if (!dados.nome){ alert('Informe o nome do insumo.'); return; }
    var {error} = _formId
      ? await sb.from('insumos').update(dados).eq('id', _formId)
      : await sb.from('insumos').insert([dados]);
    if (error){ alert('Erro: '+error.message); return; }
    document.getElementById('ins_modal_form').remove();
    await render();
  };

  window._ins_excluir = async function(insId) {
    if (!confirm('Excluir este insumo? Esta ação não pode ser desfeita.')) return;
    var {error} = await sb.from('insumos').update({ativo:false,atualizado_em:new Date().toISOString()}).eq('id',insId);
    if (error){ alert('Erro: '+error.message); return; }
    await render();
  };

  await render();
};
