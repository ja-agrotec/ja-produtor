// ============================================================
// JA AGRO – Admin Module: Maquinas (Compartilhamento Multi-Fazenda)
// admin-maquinas.js
// ============================================================
window.module_maquinas = async function() {
    var c = document.getElementById('mainContent');
    if (!c) return;
    c.innerHTML = '<div style="padding:20px;text-align:center;color:#888">Carregando maquinas...</div>';

    var _maquinas = [], _fazendas = [], _operadores = [];
    var _fazFiltro = 'todas', _busca = '';
    var _aptIdx = -1, _moverIdx = -1, _formIdx = -1;

    async function render() {
          try {
                  var [macRes, fazRes, opRes] = await Promise.all([
                            sb.from('maquinas').select('*').eq('ativo', true).order('nome'),
                            sb.from('fazendas').select('id,nome').eq('ativo', true).order('nome'),
                            sb.from('operadores').select('id,nome,fazenda_id').eq('ativo', true).order('nome')
                          ]);
                  if (macRes.error) throw macRes.error;
                  _maquinas = macRes.data || [];
                  _fazendas = fazRes.data || [];
                  _operadores = opRes.data || [];
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

    function getFazNome(id) {
          if (!id) return null;
          var f = _fazendas.find(function(x) { return x.id === id; });
          return f ? f.nome : 'Desconhecida';
    }

    function getStatusBadge(status) {
          var map = {
                  'ativo': { bg: '#e8f5e9', color: '#2e7d32', label: 'Disponivel' },
                  'inativo': { bg: '#f5f5f5', color: '#757575', label: 'Inativo' },
                  'manutencao': { bg: '#fff3e0', color: '#e65100', label: 'Manutencao' },
                  'disponivel': { bg: '#e8f5e9', color: '#2e7d32', label: 'Disponivel' },
                  'operacao': { bg: '#e3f2fd', color: '#1565c0', label: 'Em Operacao' }
          };
          var s = map[status] || { bg: '#f5f5f5', color: '#555', label: status || '-' };
          return '<span style="background:' + s.bg + ';color:' + s.color + ';border-radius:12px;padding:2px 8px;font-size:11px">' + s.label + '</span>';
    }

    function filtrados() {
          return _maquinas.filter(function(m) {
                  var matchFaz = _fazFiltro === 'todas' || m.fazenda_id === _fazFiltro;
                  var matchBusca = !_busca || m.nome.toLowerCase().includes(_busca.toLowerCase()) || (m.tipo || '').toLowerCase().includes(_busca.toLowerCase());
                  return matchFaz && matchBusca;
          });
    }

    function renderRows(lista) {
          if (!lista.length) return '<tr><td colspan="7" style="text-align:center;padding:32px;color:#888">Nenhuma maquina encontrada</td></tr>';
          return lista.map(function(m, i) {
                  var fazNome = getFazNome(m.fazenda_id);
                  var fazBadge = fazNome
                    ? '<span style="background:#e8f5e9;color:#2e7d32;border-radius:12px;padding:2px 8px;font-size:11px">' + fazNome + '</span>'
                            : '<span style="background:#f5f5f5;color:#757575;border-radius:12px;padding:2px 8px;font-size:11px">Sem fazenda</span>';
                  var horimetro = m.horimetro_atual ? m.horimetro_atual.toLocaleString('pt-BR') + ' h' : (m.km_atual ? m.km_atual.toLocaleString('pt-BR') + ' km' : '-');
                  return '<tr style="border-bottom:1px solid #f0f0f0">'
                    + '<td style="padding:12px 16px"><strong>' + m.nome + '</strong><br><small style="color:#888">' + (m.tipo || '') + ' ' + (m.ano || '') + '</small></td>'
                    + '<td style="padding:12px 16px"><span style="background:#f5f5f5;color:#555;border-radius:8px;padding:2px 8px;font-size:11px">' + (m.marca || '-') + ' ' + (m.modelo || '') + '</span></td>'
                    + '<td style="padding:12px 16px">' + fazBadge + '</td>'
                    + '<td style="padding:12px 16px">' + getStatusBadge(m.status) + '</td>'
                    + '<td style="padding:12px 16px;color:#555">' + horimetro + '</td>'
                    + '<td style="padding:12px 16px;color:#555">' + (m.custo_hora ? 'R$ ' + Number(m.custo_hora).toFixed(2) + '/h' : '-') + '</td>'
                    + '<td style="padding:12px 16px">'
                    + '<button onclick="window._mac_apontamento(' + i + ')" style="background:#2e7d32;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;margin-right:4px;font-size:12px">Uso</button>'
                    + '<button onclick="window._mac_mover(' + i + ')" style="background:#1565c0;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;margin-right:4px;font-size:12px">Mover</button>'
                    + '<button onclick="window._mac_abrirForm(' + i + ')" style="background:#f57c00;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;margin-right:4px;font-size:12px">Editar</button>'
                    + '<button onclick="window._mac_excluir(' + i + ')" style="background:#c62828;color:#fff;border:none;border-radius:6px;padding:4px 8px;cursor:pointer;font-size:12px">Excluir</button>'
                    + '</td></tr>';
          }).join('');
    }

    function renderUI() {
          var lista = filtrados();
          var total = _maquinas.length;
          var emManut = _maquinas.filter(function(m) { return m.status === 'manutencao'; }).length;
          var ativos = _maquinas.filter(function(m) { return m.status === 'ativo' || m.status === 'disponivel'; }).length;

      var fazOptions = '<option value="todas">Todas as Fazendas</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (_fazFiltro === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');

      c.innerHTML = '<div style="padding:20px">'
            + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;flex-wrap:wrap;gap:10px">'
            + '<h2 style="margin:0;font-size:20px">Maquinas</h2>'
            + '<div style="display:flex;gap:10px;align-items:center">'
            + '<select id="mac_faz_filter" onchange="window._mac_setFaz(this.value)" style="padding:8px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px">' + fazOptions + '</select>'
            + '<input id="mac_busca" type="text" placeholder="Buscar maquina..." value="' + _busca + '" oninput="window._mac_setBusca(this.value)" style="padding:8px 12px;border:1px solid #ccc;border-radius:8px;font-size:14px">'
            + '<button onclick="window._mac_abrirForm(-1)" style="background:#2e7d32;color:#fff;border:none;border-radius:8px;padding:10px 18px;cursor:pointer;font-size:14px;font-weight:600">+ Nova Maquina</button>'
            + '</div></div>'
            + '<div style="display:flex;gap:12px;margin-bottom:20px;flex-wrap:wrap">'
            + kpi('TOTAL', total, '#1565c0')
            + kpi('DISPONIVEIS', ativos, '#2e7d32')
            + kpi('MANUTENCAO', emManut, emManut > 0 ? '#e65100' : '#2e7d32')
            + '</div>'
            + '<div style="overflow-x:auto;background:#fff;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,.08)">'
            + '<table style="width:100%;border-collapse:collapse">'
            + '<thead><tr style="background:#f5f5f5">'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">NOME / TIPO</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">MARCA / MODELO</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">FAZENDA</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">STATUS</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">HORIMETRO</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">CUSTO/HORA</th>'
            + '<th style="padding:12px 16px;text-align:left;font-size:12px;color:#555;font-weight:600;border-bottom:1px solid #eee">ACOES</th>'
            + '</tr></thead>'
            + '<tbody>' + renderRows(lista) + '</tbody>'
            + '</table></div></div>';

      var sel = document.getElementById('mac_faz_filter');
          if (sel) sel.value = _fazFiltro;
    }

    window._mac_setFaz = function(v) { _fazFiltro = v; renderUI(); };
    window._mac_setBusca = function(v) { _busca = v; renderUI(); };

    // ---- APONTAMENTO DE USO ----
    window._mac_apontamento = function(idx) {
          _aptIdx = idx;
          var m = _maquinas[idx];
          if (!m) return;
          var fazOpts = _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (m.fazenda_id === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');
          var opOpts = '<option value="">-- Selecionar operador --</option>'
            + _operadores.map(function(o) { return '<option value="' + o.id + '">' + o.nome + '</option>'; }).join('');
          var modal = document.createElement('div');
          modal.id = 'mac_modal_apt';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
          modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;width:420px;max-width:95vw">'
            + '<h3 style="margin:0 0 16px">Registrar Uso de Maquina</h3>'
            + '<p style="margin:0 0 12px;color:#555"><strong>' + m.nome + '</strong></p>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Fazenda onde foi usada</label>'
            + '<select id="mac_apt_faz" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + fazOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Operador</label>'
            + '<select id="mac_apt_op" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + opOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Horas trabalhadas</label>'
            + '<input id="mac_apt_h" type="number" min="0" step="0.1" placeholder="0.0" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Horimetro final (h)</label>'
            + '<input id="mac_apt_hor" type="number" min="0" step="1" value="' + (m.horimetro_atual || 0) + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Atividade realizada</label>'
            + '<input id="mac_apt_atv" type="text" placeholder="Ex: Plantio talhao A" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:16px;box-sizing:border-box">'
            + '<div style="display:flex;gap:10px;justify-content:flex-end">'
            + '<button onclick="window._mac_closeApt()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Cancelar</button>'
            + '<button onclick="window._mac_doApt()" style="padding:8px 16px;background:#2e7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Registrar</button>'
            + '</div></div>';
          document.body.appendChild(modal);
    };

    window._mac_closeApt = function() {
          var m = document.getElementById('mac_modal_apt');
          if (m) m.remove();
    };

    window._mac_doApt = async function() {
          var mac = _maquinas[_aptIdx];
          if (!mac) return;
          var novoHor = parseFloat(document.getElementById('mac_apt_hor').value);
          if (!novoHor) { alert('Informe o horimetro final.'); return; }
          var btn = document.querySelector('#mac_modal_apt button:last-child');
          if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
          var r = await sb.from('maquinas').update({ horimetro_atual: novoHor }).eq('id', mac.id);
          if (r.error) { alert('Erro: ' + r.error.message); if (btn) { btn.disabled = false; btn.textContent = 'Registrar'; } return; }
          window._mac_closeApt();
          await render();
    };

    // ---- MOVER MAQUINA ----
    window._mac_mover = function(idx) {
          _moverIdx = idx;
          var m = _maquinas[idx];
          if (!m) return;
          var fazOpts = '<option value="">Sem fazenda</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (m.fazenda_id === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');
          var modal = document.createElement('div');
          modal.id = 'mac_modal_desl';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center';
          modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;width:380px;max-width:95vw">'
            + '<h3 style="margin:0 0 16px">Mover Maquina</h3>'
            + '<p style="margin:0 0 12px;color:#555"><strong>' + m.nome + '</strong></p>'
            + '<p style="margin:0 0 12px;color:#777;font-size:13px">Local atual: ' + (getFazNome(m.fazenda_id) || 'Sem fazenda') + '</p>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Mover para</label>'
            + '<select id="mac_desl_dest" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:16px">' + fazOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Observacao</label>'
            + '<input id="mac_desl_obs" type="text" placeholder="Ex: Para colheita fazenda vizinha" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:16px;box-sizing:border-box">'
            + '<div style="display:flex;gap:10px;justify-content:flex-end">'
            + '<button onclick="window._mac_closeDesl()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Cancelar</button>'
            + '<button onclick="window._mac_doDesl()" style="padding:8px 16px;background:#1565c0;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Mover</button>'
            + '</div></div>';
          document.body.appendChild(modal);
    };

    window._mac_closeDesl = function() {
          var m = document.getElementById('mac_modal_desl');
          if (m) m.remove();
    };

    window._mac_doDesl = async function() {
          var mac = _maquinas[_moverIdx];
          if (!mac) return;
          var dest = document.getElementById('mac_desl_dest').value || null;
          var obs = document.getElementById('mac_desl_obs').value.trim();
          var btn = document.querySelector('#mac_modal_desl button:last-child');
          if (btn) { btn.disabled = true; btn.textContent = 'Movendo...'; }
          var payload = { fazenda_id: dest };
          if (obs) payload.observacoes = obs;
          var r = await sb.from('maquinas').update(payload).eq('id', mac.id);
          if (r.error) { alert('Erro: ' + r.error.message); if (btn) { btn.disabled = false; btn.textContent = 'Mover'; } return; }
          window._mac_closeDesl();
          await render();
    };

    // ---- FORMULARIO ----
    window._mac_abrirForm = function(idx) {
          _formIdx = idx;
          var m = idx >= 0 ? _maquinas[idx] : null;
          var tipos = ['trator','colheitadeira','plantadeira','pulverizador','veiculo','implemento','outro'];
          var tipoOpts = tipos.map(function(t) { return '<option value="' + t + '"' + (m && m.tipo === t ? ' selected' : '') + '>' + t + '</option>'; }).join('');
          var statOpts = [['ativo','Disponivel'],['manutencao','Em Manutencao'],['inativo','Inativo']].map(function(s) {
                  return '<option value="' + s[0] + '"' + (m && m.status === s[0] ? ' selected' : '') + '>' + s[1] + '</option>';
          }).join('');
          var fazOpts = '<option value="">Sem fazenda</option>'
            + _fazendas.map(function(f) { return '<option value="' + f.id + '"' + (m && m.fazenda_id === f.id ? ' selected' : '') + '>' + f.nome + '</option>'; }).join('');
          var modal = document.createElement('div');
          modal.id = 'mac_modal_form';
          modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:9999;display:flex;align-items:center;justify-content:center;overflow-y:auto';
          modal.innerHTML = '<div style="background:#fff;border-radius:12px;padding:28px;width:480px;max-width:95vw;margin:auto">'
            + '<h3 style="margin:0 0 20px">' + (m ? 'Editar Maquina' : 'Nova Maquina') + '</h3>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Nome *</label>'
            + '<input id="mac_f_nome" type="text" value="' + (m ? m.nome : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Tipo</label>'
            + '<select id="mac_f_tipo" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + tipoOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Marca</label>'
            + '<input id="mac_f_marca" type="text" value="' + (m ? m.marca || '' : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Modelo</label>'
            + '<input id="mac_f_modelo" type="text" value="' + (m ? m.modelo || '' : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Ano</label>'
            + '<input id="mac_f_ano" type="number" value="' + (m ? m.ano || '' : '') + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Horimetro atual (h)</label>'
            + '<input id="mac_f_hor" type="number" min="0" value="' + (m ? m.horimetro_atual || 0 : 0) + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Custo por hora (R$)</label>'
            + '<input id="mac_f_custo" type="number" min="0" step="0.01" value="' + (m ? m.custo_hora || 0 : 0) + '" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px;box-sizing:border-box">'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Status</label>'
            + '<select id="mac_f_stat" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + statOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Fazenda</label>'
            + '<select id="mac_f_faz" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:12px">' + fazOpts + '</select>'
            + '<label style="display:block;margin-bottom:6px;font-size:13px;font-weight:600">Observacoes</label>'
            + '<textarea id="mac_f_obs" rows="2" style="width:100%;padding:8px;border:1px solid #ccc;border-radius:6px;margin-bottom:20px;box-sizing:border-box">' + (m ? m.observacoes || '' : '') + '</textarea>'
            + '<div style="display:flex;gap:10px;justify-content:flex-end">'
            + '<button onclick="window._mac_closeForm()" style="padding:8px 16px;border:1px solid #ccc;border-radius:6px;cursor:pointer;background:#fff">Cancelar</button>'
            + '<button onclick="window._mac_doForm()" style="padding:8px 16px;background:#2e7d32;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600">Salvar</button>'
            + '</div></div>';
          document.body.appendChild(modal);
    };

    window._mac_closeForm = function() {
          var m = document.getElementById('mac_modal_form');
          if (m) m.remove();
    };

    window._mac_doForm = async function() {
          var mac = _formIdx >= 0 ? _maquinas[_formIdx] : null;
          var nome = document.getElementById('mac_f_nome').value.trim();
          if (!nome) { alert('Informe o nome da maquina.'); return; }
          var payload = {
                  nome: nome,
                  tipo: document.getElementById('mac_f_tipo').value,
                  marca: document.getElementById('mac_f_marca').value.trim() || null,
                  modelo: document.getElementById('mac_f_modelo').value.trim() || null,
                  ano: parseInt(document.getElementById('mac_f_ano').value) || null,
                  horimetro_atual: parseFloat(document.getElementById('mac_f_hor').value) || 0,
                  custo_hora: parseFloat(document.getElementById('mac_f_custo').value) || null,
                  status: document.getElementById('mac_f_stat').value,
                  fazenda_id: document.getElementById('mac_f_faz').value || null,
                  observacoes: document.getElementById('mac_f_obs').value.trim() || null,
                  ativo: true
          };
          var btn = document.querySelector('#mac_modal_form button:last-child');
          if (btn) { btn.disabled = true; btn.textContent = 'Salvando...'; }
          var r;
          if (mac) {
                  r = await sb.from('maquinas').update(payload).eq('id', mac.id);
          } else {
                  r = await sb.from('maquinas').insert(payload);
          }
          if (r.error) { alert('Erro: ' + r.error.message); if (btn) { btn.disabled = false; btn.textContent = 'Salvar'; } return; }
          window._mac_closeForm();
          await render();
    };

    // ---- EXCLUIR ----
    window._mac_excluir = async function(idx) {
          var mac = _maquinas[idx];
          if (!mac) return;
          if (!confirm('Excluir ' + mac.nome + '?')) return;
          var r = await sb.from('maquinas').update({ ativo: false }).eq('id', mac.id);
          if (r.error) { alert('Erro: ' + r.error.message); return; }
          await render();
    };

    await render();
};
