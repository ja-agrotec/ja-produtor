// ============================================================
// JA AGRO â Admin Module: Insumos (Híbrido Multi-Fazenda)
// admin-insumos.js
// ============================================================
window.module_insumos = async function() {
    var c = document.getElementById('mainContent');
    if (!c) return;
    c.innerHTML = '<div style="padding:20px;text-align:center;color:#888">Carregando insumos...</div>';

    var _insumos = [], _fazendas = [], _fazFiltro = 'todas', _busca = '';
    var _movIdx = -1, _transfIdx = -1, _formIdx = -1;

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
                  c.innerHTML = '<div style="color:red;padding:20px">Erro: ' + e.message + '</div>';
          }
    }

    function kpi(label, val, color) {
          return '<div style="background:#fff;border-radius:10px;padding:16px 20px;min-width:120px;box-shadow:0 1px 4px rgba(0,0,0,.08)">'
            + '<div style="font-size:28px;font-weight:700;color:' + color + '">' + val + '</div>'
            + '<div style="font-size:12px;color:#888;margin-top:2px">' + label + '</div></div>';
    }

    function calcStats(lista) {
          return {
                  total: lista.length,
                  baixo: lista.filter(function(i) { return i.estoque_minimo && i.estoque_atual <= i.estoque_minimo; }).length,
                  global: lista.filter(function(i) { return !i.fazenda_id; }).length,
                  comFaz: lista.filter(function(i) { return !!i.fazenda_id; }).length
          };
    }

    function filtrados() {
          return _insumos.filter(function(ins) {
                  var matchFaz = _fazFiltro === 'todas' || (_fazFiltro === 'global' && !ins.fazenda_id) || ins.fazenda_id === _fazFiltro;
                  var matchBusca = !_busca || ins.nome.toLowerCase().includes(_busca.toLowerCase());
                  return matchFaz && matchBusca;
          });
    }

    function renderRows(lista) {
          if (!lista.length) return '<tr><td colspan="7" style="text-align:center;padding:32px;color:#888">Nenhum insumo encontrado</td></tr>';
          return lista.map(function(ins, i) {
                  var faz = ins.fazenda_id ? (_fazendas.find(function(f) { return f.id === ins.fazenda_id; }) || {}).nome || 'Desconhecida' : null;
                  var fazBadge = ins.fazenda_id
                    ? '<span style="background:#e8f5e9;color:#2e7d32;border-radius:12px;padding:2px 8px;font-size:11px">' + faz + '</span>'
                            : '<span style="background:#e3f2fd;color:#1565c0;border-radius:12px;padding:2px 8px;font-size:11px">â Global</span>';
                  var estoqueOk = !ins.estoque_minimo || ins.estoque_atual > ins.estoque_minimo;
                  var estStyle = estoqueOk ? 'color:#2e7d32;font-weight:600' : 'color:#e65100;font-weight:700';
                  var estoqueIcon = !estoqueOk ? 'â  ' : '';
                  return '<tr>'
                    + '<td><strong>' + ins.nome + '</strong>' + (ins.fabricante ? '<br><small style="color:#888">' + ins.fabricante + '</small>' : '') + '</td>'
                    + '<td><span style="background:#f1f8e9;color:#558b2f;border-radius:8px;padding:2px 8px;font-size:11px">' + (ins.categoria || '-') + '</span></td>'
                    + '<td>' + fazBadge + '</td>'
                    + '<td style="' + estStyle + '">' + estoqueIcon + (ins.estoque_atual || 0).toLocaleString('pt-BR') + ' ' + (ins.unidade || '') + '</td>'
                    + '<td>' + (ins.estoque_minimo ? ins.estoque_minimo + ' ' + (ins.unidade || '') : '-') + '</td>'
                    + '<td>' + (ins.preco_unitario ? 'R$ ' + Number(ins.preco_unitario).toFixed(2) : '-') + '</td>'
                    + '<td>'
                    + '<button onclick="window._ins_movimentar(' + i + ')" style="background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;margin-right:4px;font-size:12px">Â± Estoque</button>'
                    + '<button onclick="window._ins_transferir(' + i + ')" style="background:#1565c0;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;margin-right:4px;font-size:12px">â Transf.</button>'
                    + '<button onclick="window._ins_abrirForm(' + i + ')" style="background:#f57c00;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;margin-right:4px;font-size:12px">Editar</button>'
                    + '<button onclick="window._ins_excluir(' + i + ')" style="background:#c62828;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px">Excluir</button>'
                    + '</td></tr>';
          }).join('');
    }

    function renderUI() {
          var lista = filtrados();
          var s = calcStats(_insumos);
          var fazOptions = '<option value="todas">ðï¸ Todas as Fazendas</option>'
            + '<option value="global">â Todas as Fazendas</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (_fazFiltro === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');

      c.innerHTML = '<div style="padding:20px">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">'
            + '<h2 style="margin:0;font-size:20px">Insumos</h2>'
            + '<div style="display:flex;gap:10px;align-items:center">'
            + '<select id="ins_faz_filter" onchange="window._ins_setFaz(this.value)" style="padding:8px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px">' + fazOptions + '</select>'
            + '<input id="ins_busca" type="text" placeholder="Buscar insumo..." value="' + _busca + '" oninput="window._ins_setBusca(this.value)" style="padding:8px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px">'
            + '<button onclick="window._ins_abrirForm(-1)" style="background:#2e7d32;color:#fff;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600">+ Novo Insumo</button>'
            + '</div></div>'
            + '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">'
            + kpi('TOTAL INSUMOS', s.total, '#1565c0')
            + kpi('ESTOQUE BAIXO', s.baixo, s.baixo > 0 ? '#e65100' : '#2e7d32')
            + kpi('GLOBAL (SEM FAZENDA)', s.global, '#6a1b9a')
            + kpi('COM FAZENDA', s.comFaz, '#2e7d32')
            + '</div>'
            + '<div style="overflow-x:auto;background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.08)">'
            + '<table style="width:100%;border-collapse:collapse">'
            + '<thead><tr style="background:#f5f5f5">'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">NOME</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">TIPO</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">FAZENDA</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">ESTOQUE</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">EST. MÍN</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">PREÇO (R$)</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">AÇÃES</th>'
            + '</tr></thead>'
            + '<tbody>' + renderRows(lista) + '</tbody>'
            + '</table></div></div>';

      var sel = document.getElementById('ins_faz_filter');
          if (sel) sel.value = _fazFiltro;
    }

    // ---- Ações globais ----
    window._ins_setFaz = function(v) { _fazFiltro = v; renderUI(); };
    window._ins_setBusca = function(v) { _busca = v; renderUI(); };

    // ---- MOVIMENTAÇÃO DE ESTOQUE ----
    window._ins_movimentar = function(idx) {
          _movIdx = idx;
          var ins = _insumos[idx];
          if (!ins) return;
          var fazOptions = '<option value="">Global</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (ins.fazenda_id === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');
          var modal = document.createElement('div');
          modal.id = 'ins_modal_mov';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
          modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;width:380px;max-width:95vw">'
            + '<h3 style="margin:0 0 16px">Â± Movimentação de Estoque</h3>'
            + '<p style="margin:0 0 12px;color:#555"><strong>' + ins.nome + '</strong> â Estoque atual: ' + (ins.estoque_atual || 0) + ' ' + (ins.unidade || '') + '</p>'
            + '<label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Tipo</label>'
            + '<select id="ins_mov_tipo" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">'
            + '<option value="entrada">Entrada (+)</option>'
            + '<option value="saida">Saída (â)</option>'
            + '<option value="ajuste">Ajuste (definir quantidade exata)</option>'
            + '</select>'
            + '<label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Quantidade (' + (ins.unidade || 'un') + ')</label>'
            + '<input id="ins_mov_qtd" type="number" min="0" step="0.01" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box" placeholder="0">'
            + '<label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Observação (opcional)</label>'
            + '<input id="ins_mov_obs" type="text" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:16px;box-sizing:border-box" placeholder="Ex: compra NF 1234">'
            + '<div style="display:flex;gap:10px;justify-content:flex-end">'
            + '<button onclick="window._ins_closeMov()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Cancelar</button>'
            + '<button onclick="window._ins_doMov()" style="padding:8px 16px;background:#2e7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Confirmar</button>'
            + '</div></div>';
          document.body.appendChild(modal);
    };

    window._ins_closeMov = function() {
          var m = document.getElementById('ins_modal_mov');
          if (m) m.remove();
    };

    window._ins_doMov = async function() {
          var ins = _insumos[_movIdx];
          if (!ins) return;
          var tipo = document.getElementById('ins_mov_tipo').value;
          var qtd = parseFloat(document.getElementById('ins_mov_qtd').value);
          if (!qtd || qtd <= 0) { alert('Informe uma quantidade válida.'); return; }
          var novoEstoque = ins.estoque_atual || 0;
          if (tipo === 'entrada') novoEstoque += qtd;
          else if (tipo === 'saida') novoEstoque = Math.max(0, novoEstoque - qtd);
          else novoEstoque = qtd;
          var btn = document.querySelector('#ins_modal_mov button:last-child');
          if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
          var r = await sb.from('insumos').update({ estoque_atual: novoEstoque }).eq('id', ins.id);
          if (r.error) { alert('Erro: ' + r.error.message); if (btn) { btn.disabled = false; btn.textContent = 'Confirmar'; } return; }
          window._ins_closeMov();
          await render();
    };

    // ---- TRANSFERÊNCIA ----
    window._ins_transferir = function(idx) {
          _transfIdx = idx;
          var ins = _insumos[idx];
          if (!ins) return;
          var fazOptions = '<option value="">-- Global --</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '">' + f.nome + '</option>'; }).join('');
          var modal = document.createElement('div');
          modal.id = 'ins_modal_transf';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
          modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;width:400px;max-width:95vw">'
            + '<h3 style="margin:0 0 16px">â Transferir Insumo</h3>'
            + '<p style="margin:0 0 12px;color:#555"><strong>' + ins.nome + '</strong> â Estoque: ' + (ins.estoque_atual || 0) + ' ' + (ins.unidade || '') + '</p>'
            + '<p style="margin:0 0 12px;color:#777;font-size:13px">Origem: ' + (ins.fazenda_id ? (_fazendas.find(function(f){return f.id===ins.fazenda_id;})||{}).nome : 'Global') + '</p>'
            + '<label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Destino</label>'
            + '<select id="ins_transf_dest" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + fazOptions + '</select>'
            + '<label style="display:block;margin-bottom:8px;font-size:13px;font-weight:600">Quantidade a transferir (' + (ins.unidade || 'un') + ')</label>'
            + '<input id="ins_transf_qtd" type="number" min="0" step="0.01" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:16px;box-sizing:border-box" placeholder="0">'
            + '<div style="display:flex;gap:10px;justify-content:flex-end">'
            + '<button onclick="window._ins_closeTransf()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Cancelar</button>'
            + '<button onclick="window._ins_doTransf()" style="padding:8px 16px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Transferir</button>'
            + '</div></div>';
          document.body.appendChild(modal);
    };

    window._ins_closeTransf = function() {
          var m = document.getElementById('ins_modal_transf');
          if (m) m.remove();
    };

    window._ins_doTransf = async function() {
          var ins = _insumos[_transfIdx];
          if (!ins) return;
          var dest = document.getElementById('ins_transf_dest').value || null;
          var qtd = parseFloat(document.getElementById('ins_transf_qtd').value);
          if (!qtd || qtd <= 0) { alert('Informe uma quantidade válida.'); return; }
          if ((ins.estoque_atual || 0) < qtd) { alert('Estoque insuficiente para transferir.'); return; }
          var btn = document.querySelector('#ins_modal_transf button:last-child');
          if (btn) { btn.disabled = true; btn.textContent = 'Transferindo...'; }
          var novoEstOrig = (ins.estoque_atual || 0) - qtd;
          var r1 = await sb.from('insumos').update({ estoque_atual: novoEstOrig }).eq('id', ins.id);
          if (r1.error) { alert('Erro ao debitar origem: ' + r1.error.message); if (btn) { btn.disabled = false; btn.textContent = 'Transferir'; } return; }
          var insExist = _insumos.find(function(x) { return x.nome === ins.nome && x.fazenda_id === dest; });
          if (insExist) {
                  await sb.from('insumos').update({ estoque_atual: (insExist.estoque_atual || 0) + qtd }).eq('id', insExist.id);
          } else {
                  var novo = Object.assign({}, ins);
                  delete novo.id; delete novo.criado_em; delete novo.atualizado_em;
                  novo.fazenda_id = dest;
                  novo.estoque_atual = qtd;
                  await sb.from('insumos').insert(novo);
          }
          window._ins_closeTransf();
          await render();
    };

    // ---- FORMULÁRIO (novo/editar) ----
    window._ins_abrirForm = function(idx) {
          _formIdx = idx;
          var ins = idx >= 0 ? _insumos[idx] : null;
          var cats = ['Fertilizante','Defensivo','herbicida','fungicida','inseticida','Semente','corretivo','Combustível','outro'];
          var catOpts = cats.map(function(c) { return '<option value="' + c + '"' + (ins && ins.categoria === c ? ' selected' : '') + '>' + c + '</option>'; }).join('');
          var fazOpts = '<option value="">Todas as Fazendas</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (ins && ins.fazenda_id === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');
          var modal = document.createElement('div');
          modal.id = 'ins_modal_form';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto';
          modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;width:480px;max-width:95vw;margin:auto">'
            + '<h3 style="margin:0 0 20px">' + (ins ? 'Editar Insumo' : 'Novo Insumo') + '</h3>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Nome *</label>'
            + '<input id="ins_f_nome" type="text" value="' + (ins ? ins.nome : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Categoria</label>'
            + '<select id="ins_f_cat" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + catOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Fabricante</label>'
            + '<input id="ins_f_fab" type="text" value="' + (ins ? ins.fabricante || '' : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Unidade (kg, L, sc, t...)</label>'
            + '<input id="ins_f_un" type="text" value="' + (ins ? ins.unidade || '' : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Estoque Atual</label>'
            + '<input id="ins_f_est" type="number" min="0" step="0.01" value="' + (ins ? ins.estoque_atual || 0 : 0) + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Estoque Mínimo</label>'
            + '<input id="ins_f_min" type="number" min="0" step="0.01" value="' + (ins ? ins.estoque_minimo || 0 : 0) + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Preço Unitário (R$)</label>'
            + '<input id="ins_f_preco" type="number" min="0" step="0.01" value="' + (ins ? ins.preco_unitario || 0 : 0) + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Fazenda</label>'
            + '<select id="ins_f_faz" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:20px">' + fazOpts + '</select>'
            + '<div style="display:flex;gap:10px;justify-content:flex-end">'
            + '<button onclick="window._ins_closeForm()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Cancelar</button>'
            + '<button onclick="window._ins_doForm()" style="padding:8px 16px;background:#2e7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Salvar</button>'
            + '</div></div>';
          document.body.appendChild(modal);
    };

    window._ins_closeForm = function() {
          var m = document.getElementById('ins_modal_form');
          if (m) m.remove();
    };

    window._ins_doForm = async function() {
          var ins = _formIdx >= 0 ? _insumos[_formIdx] : null;
          var nome = document.getElementById('ins_f_nome').value.trim();
          if (!nome) { alert('Informe o nome do insumo.'); return; }
          var payload = {
                  nome: nome,
                  categoria: document.getElementById('ins_f_cat').value,
                  fabricante: document.getElementById('ins_f_fab').value.trim() || null,
                  unidade: document.getElementById('ins_f_un').value.trim() || null,
                  estoque_atual: parseFloat(document.getElementById('ins_f_est').value) || 0,
                  estoque_minimo: parseFloat(document.getElementById('ins_f_min').value) || null,
                  preco_unitario: parseFloat(document.getElementById('ins_f_preco').value) || null,
                  fazenda_id: document.getElementById('ins_f_faz').value || null,
                  ativo: true
          };
          var btn = document.querySelector('#ins_modal_form button:last-child');
          if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
          var r;
          if (ins) {
                  r = await sb.from('insumos').update(payload).eq('id', ins.id);
          } else {
                  r = await sb.from('insumos').insert(payload);
          }
          if (r.error) { alert('Erro: ' + r.error.message); if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; } return; }
          window._ins_closeForm();
          await render();
    };

    // ---- EXCLUIR ----
    window._ins_excluir = async function(idx) {
          var ins = _insumos[idx];
          if (!ins) return;
          if (!confirm('Excluir ' + ins.nome + '?')) return;
          var r = await sb.from('insumos').update({ ativo: false }).eq('id', ins.id);
          if (r.error) { alert('Erro: ' + r.error.message); return; }
          await render();
    };

    await render();
};
