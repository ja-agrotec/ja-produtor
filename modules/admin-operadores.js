// ============================================================
// JA AGRO — Admin Module: Operadores
// admin-operadores.js
// ============================================================
window.module_operadores = async function() {
  const esc  = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const fmtR = n => n!=null ? 'R$ '+Number(n).toLocaleString('pt-BR',{minimumFractionDigits:2}) : '—';
  const fmtD = d => d ? new Date(d+'T00:00:00').toLocaleDateString('pt-BR') : '—';

  let _ops=[], _fazendas=[], _search='', _fazFiltro='';

  async function render() {
    setLoading('mainContent');
    try {
      const [{ data: fazendas }, { data: ops, error }] = await Promise.all([
        sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
        sb.from('operadores').select('*, fazendas(nome)').eq('ativo',true).order('nome')
      ]);
      if(error) throw error;
      _ops = ops||[];
      _fazendas = fazendas||[];
      renderUI();
    } catch(e) {
      document.getElementById('mainContent').innerHTML = '<div class="empty-state"><p style="color:var(--danger)">Erro: '+esc(e.message)+'</p></div>';
    }
  }

  function renderUI() {
    document.getElementById('mainContent').innerHTML =
      '<div class="page-header topbar-content">'+
      '<div class="topbar-title"><span>👷 Operadores</span></div>'+
      '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">'+
      '<select class="search-input" id="fazFiltroO" onchange="window._op_setFaz(this.value)" style="width:160px">'+
      '<option value="">Todas fazendas</option>'+
      _fazendas.map(f=>'<option value="'+f.id+'"'+(f.id===_fazFiltro?' selected':'')+'>'+esc(f.nome)+'</option>').join('')+
      '</select>'+
      '<input class="search-input" placeholder="🔍 Buscar operador..." value="'+esc(_search)+'" oninput="window._op_search(this.value)" style="width:200px"/>'+
      '<button class="topbar-btn btn-primary" onclick="window._op_novo()">+ Novo Operador</button>'+
      '</div></div>'+

      '<div style="display:flex;gap:12px;flex-wrap:wrap;padding:16px 20px 0">'+
      '<div class="stat-card green"><div class="stat-card-val">'+filtrados().length+'</div><div class="stat-card-lbl">Operadores Ativos</div></div>'+
      '<div class="stat-card blue"><div class="stat-card-val">'+filtrados().filter(o=>o.cnh).length+'</div><div class="stat-card-lbl">Com CNH</div></div>'+
      '</div>'+

      '<div class="table-wrap" style="margin:16px 20px">'+
      '<table class="data-table"><thead><tr>'+
      '<th>Nome</th><th>Fazenda</th><th>Função</th><th>CNH</th><th>Telefone</th><th>Admissão</th><th>Salário</th><th>Ações</th>'+
      '</tr></thead><tbody id="operadoresBody">'+renderRows()+'</tbody></table></div>';
  }

  function filtrados() {
    return _ops.filter(o=>{
      const ok1 = !_fazFiltro || o.fazenda_id===_fazFiltro;
      const ok2 = !_search || (o.nome||'').toLowerCase().includes(_search.toLowerCase())
                           || (o.funcao||'').toLowerCase().includes(_search.toLowerCase())
                           || (o.cpf||'').includes(_search);
      return ok1&&ok2;
    });
  }

  function renderRows() {
    const vis = filtrados();
    if(!vis.length) return '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:32px">👷 Nenhum operador encontrado</td></tr>';
    return vis.map(o=>
      '<tr>'+
      '<td><strong>'+esc(o.nome)+'</strong>'+(o.cpf?'<br><small style="color:var(--muted)">CPF: '+esc(o.cpf)+'</small>':'')+'</td>'+
      '<td style="color:var(--muted)">'+esc(o.fazendas?.nome||'—')+'</td>'+
      '<td>'+esc(o.funcao||'—')+'</td>'+
      '<td>'+(o.cnh?'<span class="badge badge-green">'+esc(o.categoria_cnh||'')+'</span>':'<span class="badge">Não</span>')+'</td>'+
      '<td>'+esc(o.telefone||'—')+'</td>'+
      '<td>'+fmtD(o.data_admissao)+'</td>'+
      '<td>'+fmtR(o.salario)+'</td>'+
      '<td>'+
      '<button class="btn-icon" onclick="window._op_edit(''+o.id+'')">✏️</button> '+
      '<button class="btn-icon" onclick="window._op_del(''+o.id+'',''+esc(o.nome)+'')">🗑️</button>'+
      '</td></tr>'
    ).join('');
  }

  window._op_search = v=>{ _search=v; document.getElementById('operadoresBody').innerHTML=renderRows(); };
  window._op_setFaz = v=>{ _fazFiltro=v; renderUI(); };
  window._op_novo   = ()=>abrirForm(null);
  window._op_edit   = id=>abrirForm(_ops.find(o=>o.id===id));

  function abrirForm(op) {
    const isNovo = !op;
    const fazOpts = _fazendas.map(f=>'<option value="'+f.id+'"'+(op?.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>').join('');
    showModal(isNovo?'+ Novo Operador':'Editar Operador',
      '<div class="form-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px">'+
      '<div class="form-field" style="grid-column:1/-1"><label>Nome Completo *</label>'+
      '<input id="op_nome" value="'+esc(op?.nome||'')+'" placeholder="Nome do operador"/></div>'+
      '<div class="form-field"><label>Fazenda</label>'+
      '<select id="op_faz"><option value="">Sem fazenda específica</option>'+fazOpts+'</select></div>'+
      '<div class="form-field"><label>Função / Cargo</label>'+
      '<input id="op_func" value="'+esc(op?.funcao||'')+'" placeholder="Ex: Operador de Trator"/></div>'+
      '<div class="form-field"><label>CPF</label>'+
      '<input id="op_cpf" value="'+esc(op?.cpf||'')+'" placeholder="000.000.000-00"/></div>'+
      '<div class="form-field"><label>Telefone</label>'+
      '<input id="op_tel" value="'+esc(op?.telefone||'')+'" placeholder="(00) 00000-0000"/></div>'+
      '<div class="form-field"><label>CNH</label>'+
      '<input id="op_cnh" value="'+esc(op?.cnh||'')+'" placeholder="Número da CNH"/></div>'+
      '<div class="form-field"><label>Categoria CNH</label>'+
      '<select id="op_catcnh">'+
      ['','A','B','C','D','E','AB','AC'].map(c=>'<option value="'+c+'"'+(op?.categoria_cnh===c?' selected':'')+'>'+( c||'Nenhuma')+'</option>').join('')+
      '</select></div>'+
      '<div class="form-field"><label>Data Admissão</label>'+
      '<input id="op_admissao" type="date" value="'+esc(op?.data_admissao||'')+'"/></div>'+
      '<div class="form-field"><label>Salário (R$)</label>'+
      '<input id="op_sal" type="number" step="0.01" min="0" value="'+esc(op?.salario||'')+'"/></div>'+
      '</div>',
      async function(){
        const nome = document.getElementById('op_nome').value.trim();
        if(!nome){ toast('Informe o nome','bad'); return; }
        const payload={
          nome,
          fazenda_id:   document.getElementById('op_faz').value||null,
          funcao:       document.getElementById('op_func').value.trim()||null,
          cpf:          document.getElementById('op_cpf').value.trim()||null,
          telefone:     document.getElementById('op_tel').value.trim()||null,
          cnh:          document.getElementById('op_cnh').value.trim()||null,
          categoria_cnh: document.getElementById('op_catcnh').value||null,
          data_admissao: document.getElementById('op_admissao').value||null,
          salario:      parseFloat(document.getElementById('op_sal').value)||null
        };
        const { error } = isNovo
          ? await sb.from('operadores').insert({ ...payload, ativo:true })
          : await sb.from('operadores').update(payload).eq('id',op.id);
        if(error){ toast('Erro: '+error.message,'bad'); return; }
        toast(isNovo?'Operador cadastrado!':'Operador atualizado!','ok');
        closeModal(); render();
      }
    );
    setTimeout(()=>document.getElementById('op_nome')?.focus(),100);
  }

  window._op_del = function(id,nome){
    showConfirm('Excluir operador <strong>'+esc(nome)+'</strong>?',
      async function(){
        const { error } = await sb.from('operadores').update({ ativo:false }).eq('id',id);
        if(error){ toast('Erro: '+error.message,'bad'); return; }
        toast('Operador removido','ok'); render();
      }
    );
  };

  render();
};
