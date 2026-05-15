// ============================================================
// JA AGRO — Admin Module: Usuários
// modules/admin-usuarios.js
// ============================================================

// URL vem do config.js
var EDGE_CRIAR_USUARIO = JA.functions.criarUsuario;

window.module_usuarios = async function() {
  setTopbar('Usuários', 'Gestão de acessos',
    '<button class="topbar-btn btn-primary" onclick="novoUsuario()">+ Novo Usuário</button>'
  );
  await renderUsuarios();
};

var _usrPage=0,_usrLimit=12,_usrSearch='',_usrTotal=0,_fazendas=[];

async function carregarFazendas() {
  if (_fazendas.length > 0) return _fazendas;
  var { data } = await sb.from('fazendas').select('id, nome').eq('ativo', true).order('nome');
  _fazendas = data || [];
  return _fazendas;
}

async function renderUsuarios() {
  setLoading('mainContent');
  try {
    var query = sb.from('usuarios')
      .select('*, fazendas(nome)', { count: 'exact' })
      .order('nome');
    if (_usrSearch) query = query.or('nome.ilike.%' + _usrSearch + '%,email.ilike.%' + _usrSearch + '%');
    query = query.range(_usrPage * _usrLimit, (_usrPage + 1) * _usrLimit - 1);
    var { data, count, error } = await query;
    if (error) throw error;
    _usrTotal = count || 0;

    var html = '<div class="table-wrap">';
    html += '<div class="table-header">';
    html += '<div class="table-title">Usuários <span style="font-size:12px;color:var(--muted);font-weight:500">(' + _usrTotal + ' no total)</span></div>';
    html += '<input class="search-input" type="text" placeholder="Buscar nome ou e-mail..." value="' + esc(_usrSearch) + '" oninput="usrSearch(this.value)" id="usrSearchInput"/>';
    html += '</div>';

    if (!data || data.length === 0) {
      html += '<div class="table-empty">' + (_usrSearch
        ? '🔍 Nenhum usuário encontrado para "<strong>' + esc(_usrSearch) + '</strong>"'
        : '👤 Nenhum usuário cadastrado ainda.<br><br><button class="topbar-btn btn-primary" onclick="novoUsuario()">+ Criar primeiro usuário</button>') + '</div>';
    } else {
      html += '<table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Fazenda</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
      data.forEach(function(u) {
        var roleBadge = {produtor:'<span class="badge badge-green">Produtor</span>',gerente:'<span class="badge badge-info">Gerente</span>',operador:'<span class="badge badge-gray">Operador</span>'}[u.role] || '<span class="badge badge-gray">'+esc(u.role)+'</span>';
        var av = (u.nome||u.email||'U')[0].toUpperCase();
        var avHtml = '<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,var(--green),#2196F3);display:inline-flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;color:#fff;flex-shrink:0;margin-right:10px">'+av+'</div>';
        html += '<tr>'
          +'<td><div style="display:flex;align-items:center">'+avHtml+'<strong>'+esc(u.nome)+'</strong></div></td>'
          +'<td style="color:var(--muted);font-size:12px">'+esc(u.email)+'</td>'
          +'<td>'+roleBadge+'</td>'
          +'<td>'+esc(u.fazendas?.nome||'—')+'</td>'
          +'<td>'+(u.ativo?'<span class="badge badge-green">Ativo</span>':'<span class="badge badge-red">Inativo</span>')+'</td>'
          +'<td><div class="td-actions">'
          +'<button class="action-btn" onclick="editarUsuario(\''+u.id+'\')">Editar</button>'
          +'<button class="action-btn" onclick="resetSenha(\''+esc(u.email)+'\')">Reset senha</button>'
          +(u.ativo
            ?'<button class="action-btn danger" onclick="toggleUsuario(\''+u.id+'\',false,\''+esc(u.nome)+'\')">Desativar</button>'
            :'<button class="action-btn" onclick="toggleUsuario(\''+u.id+'\',true,\''+esc(u.nome)+'\')">Ativar</button>')
          +'</div></td></tr>';
      });
      html += '</tbody></table>';
      var tp = Math.ceil(_usrTotal/_usrLimit);
      if (tp > 1) {
        html += '<div class="pagination"><span>Mostrando '+(_usrPage*_usrLimit+1)+'–'+Math.min((_usrPage+1)*_usrLimit,_usrTotal)+' de '+_usrTotal+'</span><div class="pagination-btns">';
        html += '<button class="page-btn" onclick="usrPagina('+(_usrPage-1)+')" '+(_usrPage===0?'disabled':'')+'>← Anterior</button>';
        for(var p=0;p<tp;p++) html+='<button class="page-btn '+(p===_usrPage?'active':'')+'" onclick="usrPagina('+p+')">'+(p+1)+'</button>';
        html += '<button class="page-btn" onclick="usrPagina('+(_usrPage+1)+')" '+(_usrPage>=tp-1?'disabled':'')+'>Próxima →</button></div></div>';
      }
    }
    html += '</div>';
    html += '<div style="margin-top:16px;padding:14px 20px;background:var(--white);border:1px solid var(--brd);border-radius:var(--r-lg);display:flex;gap:24px;flex-wrap:wrap;align-items:center">'
      +'<div style="font-size:12px;font-weight:700;color:var(--muted)">Perfis:</div>'
      +'<div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px"><span class="badge badge-green">Produtor</span>Dashboard + app de campo</div>'
      +'<div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px"><span class="badge badge-info">Gerente</span>Dashboard somente leitura</div>'
      +'<div style="font-size:12px;color:var(--muted);display:flex;align-items:center;gap:6px"><span class="badge badge-gray">Operador</span>Somente app de campo</div>'
      +'</div>';
    document.getElementById('mainContent').innerHTML = html;
    if (_usrSearch) { var inp=document.getElementById('usrSearchInput'); if(inp){inp.focus();inp.setSelectionRange(inp.value.length,inp.value.length);} }
  } catch(e) {
    document.getElementById('mainContent').innerHTML='<div class="page-loading"><div style="font-size:48px">⚠️</div><div class="loading-text">Erro: '+e.message+'</div></div>';
  }
}

var _usrST;
window.usrSearch=function(v){_usrSearch=v;_usrPage=0;clearTimeout(_usrST);_usrST=setTimeout(renderUsuarios,350);};
window.usrPagina=function(p){_usrPage=p;renderUsuarios();};

async function usuarioFormHtml(u,isNovo) {
  u=u||{};
  var faz=await carregarFazendas();
  var fo='<option value="">Selecione a fazenda</option>';
  faz.forEach(function(f){fo+='<option value="'+f.id+'"'+(u.fazenda_id===f.id?' selected':'')+'>'+esc(f.nome)+'</option>';});
  var h='<div class="form-grid">';
  h+='<div class="form-field"><label>Nome completo <span class="req">*</span></label><input type="text" id="usr_nome" value="'+esc(u.nome||'')+'" placeholder="Ex: João da Silva" maxlength="100"/></div>';
  h+='<div class="form-field"><label>E-mail <span class="req">*</span>'+(isNovo?'':' <span style="font-size:10px;color:var(--muted)">(não pode ser alterado)</span>')+'</label><input type="email" id="usr_email" value="'+esc(u.email||'')+'" placeholder="email@exemplo.com"'+(isNovo?'':' readonly style="opacity:.6;cursor:not-allowed"')+'/></div>';
  if(isNovo){
    h+='<div class="form-field"><label>Senha inicial <span class="req">*</span></label>'
      +'<div style="position:relative"><input type="password" id="usr_senha" placeholder="Mínimo 8 caracteres" style="padding-right:48px"/>'
      +'<button type="button" onclick="toggleUsrSenha()" style="position:absolute;right:12px;top:50%;transform:translateY(-50%);background:none;border:none;cursor:pointer;color:var(--dim);font-size:16px">👁</button></div>'
      +'<div class="form-hint">O usuário poderá trocar a senha depois</div></div>';
  }
  h+='<div class="form-grid c2">';
  h+='<div class="form-field"><label>Perfil <span class="req">*</span></label><select id="usr_role">'
    +'<option value="produtor"'+(u.role==='produtor'||!u.role?' selected':'')+'>Produtor — dashboard + campo</option>'
    +'<option value="gerente"'+(u.role==='gerente'?' selected':'')+'>Gerente — dashboard (leitura)</option>'
    +'<option value="operador"'+(u.role==='operador'?' selected':'')+'>Operador — só app de campo</option>'
    +'</select></div>';
  h+='<div class="form-field"><label>Fazenda <span class="req">*</span></label><select id="usr_fazenda">'+fo+'</select></div>';
  h+='</div></div>';
  return h;
}

window.toggleUsrSenha=function(){var i=document.getElementById('usr_senha');if(i)i.type=i.type==='password'?'text':'password';};

window.novoUsuario=async function(){
  var formHtml=await usuarioFormHtml(null,true);
  openModal('Novo Usuário',formHtml,async function(){
    var nome=document.getElementById('usr_nome').value.trim();
    var email=document.getElementById('usr_email').value.trim();
    var senha=document.getElementById('usr_senha').value;
    var role=document.getElementById('usr_role').value;
    var fazendaId=document.getElementById('usr_fazenda').value;
    var erros=[];
    if(!nome)erros.push('usr_nome');
    if(!email)erros.push('usr_email');
    if(!senha||senha.length<8)erros.push('usr_senha');
    if(!fazendaId)erros.push('usr_fazenda');
    erros.forEach(function(id){var el=document.getElementById(id);if(el)el.classList.add('err');});
    if(erros.length){toast('Preencha todos os campos obrigatórios','bad');return;}
    var btn=document.getElementById('modalSaveBtn');
    btn.disabled=true;btn.textContent='Criando...';
    try{
      var{data:{session}}=await sb.auth.getSession();
      if(!session)throw new Error('Sessão expirada. Faça login novamente.');
      var res=await fetch(EDGE_CRIAR_USUARIO,{
        method:'POST',
        headers:{'Content-Type':'application/json','Authorization':'Bearer '+session.access_token},
        body:JSON.stringify({email,senha,nome,role,fazenda_id:fazendaId}),
      });
      var json=await res.json();
      if(!json.ok)throw new Error(json.error||'Erro ao criar usuário');
      closeModal();_fazendas=[];
      toast('Usuário criado com sucesso!','ok');
      await renderUsuarios();
    }catch(e){
      var msg=e.message||'Erro ao criar usuário.';
      if(msg.includes('already registered'))msg='Este e-mail já está cadastrado.';
      else if(msg.includes('password'))msg='A senha deve ter pelo menos 8 caracteres.';
      toast(msg,'bad');btn.disabled=false;btn.textContent='Salvar';
    }
  });
};

window.editarUsuario=async function(id){
  try{
    var{data,error}=await sb.from('usuarios').select('*').eq('id',id).single();
    if(error)throw error;
    var formHtml=await usuarioFormHtml(data,false);
    openModal('Editar Usuário',formHtml,async function(){
      var nome=document.getElementById('usr_nome').value.trim();
      var role=document.getElementById('usr_role').value;
      var fazendaId=document.getElementById('usr_fazenda').value;
      if(!nome){document.getElementById('usr_nome').classList.add('err');toast('Informe o nome','bad');return;}
      if(!fazendaId){document.getElementById('usr_fazenda').classList.add('err');toast('Selecione a fazenda','bad');return;}
      var btn=document.getElementById('modalSaveBtn');btn.disabled=true;btn.textContent='Salvando...';
      try{
        var{error:err}=await sb.from('usuarios').update({nome,role,fazenda_id:fazendaId}).eq('id',id);
        if(err)throw err;
        closeModal();_fazendas=[];toast('Usuário atualizado!','ok');await renderUsuarios();
      }catch(e2){toast('Erro: '+e2.message,'bad');btn.disabled=false;btn.textContent='Salvar';}
    });
  }catch(e){toast('Erro ao carregar: '+e.message,'bad');}
};

window.resetSenha=async function(email){
  var ok=await confirm2('Enviar reset de senha?','Um link será enviado para <strong>'+esc(email)+'</strong>.','🔑');
  if(!ok)return;
  try{
    var{error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:JA.urls.resetSenha});
    if(error)throw error;
    toast('E-mail de reset enviado!','ok');
  }catch(e){toast('Erro: '+e.message,'bad');}
};

window.toggleUsuario=async function(id,ativar,nome){
  var ok=await confirm2((ativar?'Ativar':'Desativar')+' usuário?',
    (ativar?'O usuário <strong>'+esc(nome)+'</strong> poderá voltar a acessar o sistema.':'O usuário <strong>'+esc(nome)+'</strong> não conseguirá mais fazer login.'),
    ativar?'✅':'⚠️');
  if(!ok)return;
  try{
    var{error}=await sb.from('usuarios').update({ativo:ativar}).eq('id',id);
    if(error)throw error;
    toast('Usuário '+(ativar?'ativado':'desativado')+'!','ok');await renderUsuarios();
  }catch(e){toast('Erro: '+e.message,'bad');}
};

function esc(str){if(!str)return '';return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
