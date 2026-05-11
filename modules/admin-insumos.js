window.module_insumos = async function(){
  const el = document.getElementById('mainContent');
  if(!el) return;
  let _ins=[],_fazs=[],_precs={},_filtFaz='',_filtBusca='',_filtCult='',_filtCat='';
  const esc=v=>v?String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'):'';
  const fmt=v=>(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
  const today=()=>new Date().toISOString().slice(0,10);
  function toast(m,t){const d=document.createElement('div');d.style.cssText='position:fixed;bottom:20px;right:20px;padding:12px 20px;border-radius:10px;color:#fff;font-size:14px;font-weight:600;z-index:9999;background:'+(t!=='bad'?'#065f46':'#dc2626');d.textContent=m;document.body.appendChild(d);setTimeout(()=>d.remove(),3500);}
  const CATS=[{v:'fertilizante',l:'Fertilizante',e:'F'},{v:'herbicida',l:'Herbicida',e:'H'},{v:'fungicida',l:'Fungicida',e:'FG'},{v:'inseticida',l:'Inseticida',e:'I'},{v:'acaricida',l:'Acaricida',e:'AC'},{v:'nematicida',l:'Nematicida',e:'N'},{v:'corretivo',l:'Corretivo',e:'C'},{v:'adjuvante',l:'Adjuvante',e:'AJ'},{v:'bioestimulante',l:'Bioestimulante',e:'B'},{v:'inoculante',l:'Inoculante',e:'IN'},{v:'semente',l:'Semente',e:'S'},{v:'fungicida_bio',l:'Fungicida Bio',e:'FB'},{v:'outros',l:'Outros',e:'O'}];
  const CULTS=[{v:'soja',l:'Soja'},{v:'milho',l:'Milho'},{v:'cafe',l:'Cafe'},{v:'cana',l:'Cana'},{v:'arroz',l:'Arroz'},{v:'feijao',l:'Feijao'},{v:'algodao',l:'Algodao'},{v:'trigo',l:'Trigo'},{v:'pastagem',l:'Pastagem'}];
  const MODOS=['Foliar','Solo','Tratamento de Semente','Fertirrigacao','Drench','Incorporacao'];
  const FORMS=['Suspensao Concentrada (SC)','Emulsao (EC)','Po Molhavel (WP)','Granulo (GR)','Solucao Concentrada (SL)','Pasta','Graos','Liquido','Outro'];
  const TOXES=['I - Extremamente toxico','II - Altamente toxico','III - Mediamente toxico','IV - Pouco toxico'];
  const CAT_MERC=[
    {n:'Roundup Original DI',cat:'herbicida',pa:'Glifosato',fab:'Bayer',un:'L',pr:28.5,dose:'2-4 L/ha',cult:['soja','milho','cana'],modo:'Foliar',form:'SL',tox:'III'},
    {n:'Priaxor',cat:'fungicida',pa:'Fluxapiroxade+Piraclostrobina',fab:'BASF',un:'L',pr:320,dose:'0.3 L/ha',cult:['soja'],modo:'Foliar',form:'SC',tox:'III'},
    {n:'Fox Xpro',cat:'fungicida',pa:'Bixafeno+Protioconazol',fab:'Bayer',un:'L',pr:380,dose:'0.4 L/ha',cult:['soja'],modo:'Foliar',form:'SC',tox:'IV'},
    {n:'Nativo',cat:'fungicida',pa:'Trifloxistrobina+Tebuconazol',fab:'Bayer',un:'L',pr:280,dose:'0.5 L/ha',cult:['soja','milho'],modo:'Foliar',form:'SC',tox:'III'},
    {n:'Engeo Pleno',cat:'inseticida',pa:'Tiametoxam+Lambda-cialotrina',fab:'Syngenta',un:'L',pr:165,dose:'0.3 L/ha',cult:['soja'],modo:'Foliar',form:'SC',tox:'II'},
    {n:'Connect',cat:'inseticida',pa:'Beta-ciflutrina+Imidacloprido',fab:'Bayer',un:'L',pr:145,dose:'0.75 L/ha',cult:['soja','milho'],modo:'Foliar',form:'SC',tox:'II'},
    {n:'Verdict R',cat:'herbicida',pa:'Haloxifope-P-metilico',fab:'Corteva',un:'L',pr:185,dose:'0.5-1 L/ha',cult:['soja'],modo:'Foliar',form:'EC',tox:'III'},
    {n:'Lumax',cat:'herbicida',pa:'S-metolacloro+Atrazina',fab:'Syngenta',un:'L',pr:145,dose:'3 L/ha',cult:['milho'],modo:'Foliar',form:'SC',tox:'III'},
    {n:'Atrazina Nortox',cat:'herbicida',pa:'Atrazina',fab:'Nortox',un:'L',pr:22,dose:'3-6 L/ha',cult:['milho','cana'],modo:'Foliar',form:'SC',tox:'IV'},
    {n:'Score 250 EC',cat:'fungicida',pa:'Difenoconazol',fab:'Syngenta',un:'L',pr:185,dose:'0.5 L/ha',cult:['cafe','soja'],modo:'Foliar',form:'EC',tox:'III'},
    {n:'Velpar K WG',cat:'herbicida',pa:'Hexazinona+Diurom',fab:'UPL',un:'kg',pr:125,dose:'3 kg/ha',cult:['cana'],modo:'Foliar',form:'WG',tox:'III'},
    {n:'Fipronil Nufarm',cat:'inseticida',pa:'Fipronil',fab:'Nufarm',un:'L',pr:210,dose:'0.5-1 L/ha',cult:['cana','milho'],modo:'Foliar',form:'SC',tox:'II'},
    {n:'Ureia 46%',cat:'fertilizante',pa:'N 46%',fab:'Varios',un:'sc 50kg',pr:142,dose:'150-300 kg/ha',cult:['soja','milho','cafe','cana'],modo:'Solo',form:'Granulado',tox:''},
    {n:'KCl 60%',cat:'fertilizante',pa:'K2O 60%',fab:'Varios',un:'sc 50kg',pr:155,dose:'100-200 kg/ha',cult:['soja','milho','cafe'],modo:'Solo',form:'Granulado',tox:''},
    {n:'Nitragin Gelfix',cat:'inoculante',pa:'Bradyrhizobium japonicum',fab:'Stoller',un:'dose',pr:18,dose:'100-200mL/50kg',cult:['soja'],modo:'Tratamento de Semente',form:'Liquido',tox:''},
    {n:'Trichodermil SC',cat:'fungicida_bio',pa:'Trichoderma harzianum',fab:'Koppert',un:'L',pr:195,dose:'0.5-1 L/ha',cult:['soja','milho','cafe','cana'],modo:'Solo',form:'SC',tox:''},
    {n:'Karate Zeon',cat:'inseticida',pa:'Lambda-cialotrina',fab:'Syngenta',un:'L',pr:95,dose:'0.2 L/ha',cult:['milho','soja','cafe'],modo:'Foliar',form:'CS',tox:'III'},
    {n:'Piraclostrobina WG',cat:'fungicida',pa:'Piraclostrobina',fab:'BASF',un:'kg',pr:450,dose:'0.2 kg/ha',cult:['cafe'],modo:'Foliar',form:'WG',tox:'III'},
    {n:'Semente Soja M5917 IPRO',cat:'semente',pa:'',fab:'Monsoy',un:'sc 40kg',pr:280,dose:'50-60 kg/ha',cult:['soja'],modo:'',form:'',tox:''},
    {n:'Semente Milho 2B688 PW',cat:'semente',pa:'',fab:'Dow',un:'sc 60k',pr:320,dose:'60k pl/ha',cult:['milho'],modo:'',form:'',tox:''},
    {n:'Semente Cafe Catuai Vermelho',cat:'semente',pa:'',fab:'EMBRAPA',un:'kg',pr:45,dose:'5-6 kg/ha',cult:['cafe'],modo:'',form:'',tox:''},
    {n:'MAP 11-52-0',cat:'fertilizante',pa:'N 11% P2O5 52%',fab:'Varios',un:'sc 50kg',pr:285,dose:'150-250 kg/ha',cult:['soja','milho','cafe'],modo:'Solo',form:'Granulado',tox:''},
  ];

  async function loadData(){
    const [{data:ins,error:e1},{data:faz},{data:prec}] = await Promise.all([
      sb.from('insumos').select('id,nome,categoria,tipo,unidade,principio_ativo,fabricante,registro_mapa,estoque_atual,estoque_minimo,preco_unitario,fazenda_id,ativo,certificacao_permitida,culturas,modo_aplicacao,dose_recomendada,periodo_aplicacao,formulacao,classe_toxicologica,observacoes,global').eq('ativo',true).order('nome'),
      sb.from('fazendas').select('id,nome').eq('ativo',true).order('nome'),
      sb.from('insumo_precos').select('id,insumo_id,preco,fornecedor,data_referencia,notas').order('data_referencia',{ascending:false}),
    ]);
    _ins=ins||[]; _fazs=faz||[];
    _precs={};
    (prec||[]).forEach(p=>{if(!_precs[p.insumo_id])_precs[p.insumo_id]=[];_precs[p.insumo_id].push(p);});
    render();
  }

  function filtrados(){
    return _ins.filter(i=>{
      if(_filtFaz && i.fazenda_id!==_filtFaz) return false;
      if(_filtCat && i.categoria!==_filtCat) return false;
      if(_filtCult && !(i.culturas||[]).includes(_filtCult)) return false;
      if(_filtBusca){const q=_filtBusca.toLowerCase();if(!((i.nome||'')+' '+(i.fabricante||'')+' '+(i.principio_ativo||'')+' '+(i.categoria||'')).toLowerCase().includes(q))return false;}
      return true;
    });
  }

  function render(){
    const lista=filtrados();
    const baixo=_ins.filter(i=>(i.estoque_atual||0)<(i.estoque_minimo||0));
    const catOpts=CATS.map(c=>'<option value="'+c.v+'"'+(_filtCat===c.v?' selected':'')+'>'+c.e+' '+c.l+'</option>').join('');
    const cultOpts=CULTS.map(c=>'<option value="'+c.v+'"'+(_filtCult===c.v?' selected':'')+'>\uD83C\uDF3E '+c.l+'</option>').join('');
    const fazOpts=_fazs.map(f=>'<option value="'+f.id+'"'+(_filtFaz===f.id?' selected':'')+'>'+esc(f.nome)+'</option>').join('');
    el.innerHTML=`
<div style="padding:24px;max-width:1400px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="margin:0;font-size:22px;color:#1a3a2a">\uD83E\uDDEA Insumos</h2>
      <p style="margin:4px 0 0;color:#6b7280;font-size:13px">Cadastro e controle de produtos agr\u00EDcolas</p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button onclick="window._ins_importarMercado()" style="background:#059669;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">\uD83C\uDF10 Buscar no Mercado</button>
      <button onclick="window._ins_abrirForm(-1)" style="background:#065f46;color:#fff;border:none;padding:9px 16px;border-radius:8px;cursor:pointer;font-size:13px;font-weight:600">+ Novo Insumo</button>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px">
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#065f46">${_ins.length}</div><div style="font-size:12px;color:#6b7280">TOTAL INSUMOS</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#dc2626">${baixo.length}</div><div style="font-size:12px;color:#6b7280">ESTOQUE BAIXO</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#7c3aed">${lista.length}</div><div style="font-size:12px;color:#6b7280">FILTRADOS</div></div>
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center"><div style="font-size:28px;font-weight:700;color:#2563eb">${_ins.filter(i=>!i.fazenda_id).length}</div><div style="font-size:12px;color:#6b7280">GLOBAIS</div></div>
  </div>
  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:16px;display:flex;gap:10px;flex-wrap:wrap">
    <input placeholder="\uD83D\uDD0D Buscar nome, fabricante, princ\u00EDpio ativo..." value="${esc(_filtBusca)}" oninput="window._ins_setBusca(this.value)" style="flex:1;min-width:180px;padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px">
    <select onchange="window._ins_setFaz(this.value)" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Todas as Fazendas</option>${fazOpts}</select>
    <select onchange="window._ins_setCat(this.value)" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Todas as Categorias</option>${catOpts}</select>
    <select onchange="window._ins_setCultura(this.value)" style="padding:8px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Todas as Culturas</option>${cultOpts}</select>
  </div>
  <div id="ins_lista">${renderCards(lista)}</div>
</div>`;
  }

  function renderCards(lista){
    if(!lista.length) return '<div style="text-align:center;padding:40px;color:#9ca3af;font-size:15px">Nenhum insumo encontrado.</div>';
    return lista.map(i=>{
      const faz=_fazs.find(f=>f.id===i.fazenda_id);
      const hist=_precs[i.id]||[];
      const baixo=(i.estoque_atual||0)<(i.estoque_minimo||0);
      const cat=CATS.find(c=>c.v===i.categoria)||{e:'??',l:i.categoria||'?'};
      const cultTags=(i.culturas||[]).map(cv=>{const ci=CULTS.find(c=>c.v===cv);return ci?'<span style="background:#f0fdf4;color:#065f46;padding:2px 7px;border-radius:12px;font-size:11px;font-weight:600">'+ci.l+'</span>':''}).join(' ');
      return `
<div style="background:#fff;border:1px solid ${baixo?'#fca5a5':'#e5e7eb'};border-radius:12px;padding:16px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start">
  <div style="min-width:44px;height:44px;background:${baixo?'#fef2f2':'#f0fdf4'};border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#065f46">${cat.e}</div>
  <div style="flex:1;min-width:0">
    <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
      <span style="font-weight:700;font-size:15px;color:#1a3a2a">${esc(i.nome)}</span>
      <span style="background:#e0e7ff;color:#3730a3;padding:2px 8px;border-radius:12px;font-size:11px">${esc(cat.l)}</span>
      ${i.certificacao_permitida?'<span style="background:#fef9c3;color:#854d0e;padding:2px 8px;border-radius:12px;font-size:11px">Org.</span>':''} 
      ${baixo?'<span style="background:#fee2e2;color:#dc2626;padding:2px 8px;border-radius:12px;font-size:11px;font-weight:600">\u26A0\uFE0F Estoque Baixo</span>':''} 
    </div>
    ${i.principio_ativo?'<div style="font-size:12px;color:#6b7280;margin-top:3px">PA: <b>'+esc(i.principio_ativo)+'</b></div>':''} 
    ${i.fabricante?'<div style="font-size:12px;color:#6b7280">Fab: <b>'+esc(i.fabricante)+'</b></div>':''} 
    ${cultTags?'<div style="margin-top:5px;display:flex;gap:4px;flex-wrap:wrap">'+cultTags+'</div>':''} 
    ${i.dose_recomendada?'<div style="font-size:12px;color:#374151;margin-top:4px">Dose: <b>'+esc(i.dose_recomendada)+'</b>'+(i.modo_aplicacao?' | '+esc(i.modo_aplicacao):'')+'</div>':''} 
  </div>
  <div style="text-align:right;min-width:110px">
    <div style="font-size:18px;font-weight:700;color:${baixo?'#dc2626':'#065f46'}">${(i.estoque_atual||0).toLocaleString('pt-BR')} ${esc(i.unidade||'un')}</div>
    <div style="font-size:11px;color:#9ca3af">Min: ${(i.estoque_minimo||0).toLocaleString('pt-BR')} ${esc(i.unidade||'un')}</div>
    <div style="font-size:14px;font-weight:600;color:#065f46;margin-top:4px">${fmt(i.preco_unitario||0)}/${esc(i.unidade||'un')}</div>
    ${faz?'<div style="font-size:11px;color:#6b7280;margin-top:2px">\uD83D\uDCCD '+esc(faz.nome)+'</div>':'<div style="font-size:11px;color:#6b7280;margin-top:2px">\uD83C\uDF10 Global</div>'} 
    ${hist.length>1?'<div style="font-size:10px;color:#9ca3af">'+hist.length+' precos</div>':''} 
  </div>
  <div style="display:flex;flex-direction:column;gap:5px;min-width:75px">
    <button onclick="window._ins_abrirForm('${i.id}')" style="background:#065f46;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">Editar</button>
    <button onclick="window._ins_movimentar('${i.id}')" style="background:#2563eb;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">Estoque</button>
    <button onclick="window._ins_verHistorico('${i.id}')" style="background:#7c3aed;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">Precos</button>
    <button onclick="window._ins_excluir('${i.id}')" style="background:#dc2626;color:#fff;border:none;padding:6px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">Excluir</button>
  </div>
</div>`;
    }).join('');
  }

  window._ins_abrirForm = async function(id){
    const isNovo=id===-1;
    let ins=isNovo?null:_ins.find(i=>i.id===id);
    let hist=isNovo?[]:(_precs[id]||[]);
    const fazOpts=_fazs.map(f=>'<option value="'+f.id+'"'+(!isNovo&&ins&&f.id===ins.fazenda_id?' selected':'')+'>'+esc(f.nome)+'</option>').join('');
    const catOpts=CATS.map(c=>'<option value="'+c.v+'"'+(!isNovo&&ins&&c.v===ins.categoria?' selected':'')+'>'+c.e+' '+c.l+'</option>').join('');
    const modoOpts=MODOS.map(m=>'<option value="'+m+'"'+(!isNovo&&ins&&m===ins.modo_aplicacao?' selected':'')+'>'+m+'</option>').join('');
    const formOpts=FORMS.map(f=>'<option value="'+f+'"'+(!isNovo&&ins&&f===ins.formulacao?' selected':'')+'>'+f+'</option>').join('');
    const toxOpts=TOXES.map(t=>'<option value="'+t+'"'+(!isNovo&&ins&&t===ins.classe_toxicologica?' selected':'')+'>'+t+'</option>').join('');
    const cultChecks=CULTS.map(c=>{const ck=(!isNovo&&(ins?.culturas||[]).includes(c.v))?' checked':'';return '<label style="display:flex;align-items:center;gap:5px;padding:5px 9px;border:1px solid #e5e7eb;border-radius:7px;cursor:pointer;background:'+(ck?' #f0fdf4':'#fff')+'"><input type="checkbox" name="ins_cult" value="'+c.v+'"'+ck+'> '+c.l+'</label>';}).join('');
    const histRows=hist.length?hist.map(p=>'<tr><td style="padding:6px 10px">'+p.data_referencia+'</td><td style="padding:6px 10px;font-weight:600;color:#065f46">'+fmt(p.preco)+'</td><td style="padding:6px 10px">'+esc(p.fornecedor||'-')+'</td><td style="padding:6px 10px;font-size:12px;color:#6b7280">'+esc(p.notas||'-')+'</td></tr>').join(''):'<tr><td colspan="4" style="text-align:center;padding:16px;color:#9ca3af">Sem historico</td></tr>';
    const m=document.createElement('div');
    m.id='insModal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
    m.innerHTML=`
<div style="background:#fff;border-radius:16px;width:100%;max-width:780px;margin-top:20px;overflow:hidden">
  <div style="background:linear-gradient(135deg,#065f46,#047857);padding:18px 24px;display:flex;justify-content:space-between;align-items:center">
    <h3 style="color:#fff;margin:0;font-size:17px">${isNovo?'+ Novo Insumo':'Editar Insumo'}</h3>
    <button onclick="window._ins_closeForm()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:30px;height:30px;border-radius:50%;cursor:pointer;font-size:17px">x</button>
  </div>
  <div style="display:flex;border-bottom:2px solid #e5e7eb">
    <button id="insTab1" onclick="window._ins_switchTab(1)" style="padding:11px 18px;border:none;background:transparent;cursor:pointer;font-weight:600;color:#065f46;border-bottom:2px solid #065f46;margin-bottom:-2px;font-size:13px">Informacoes</button>
    <button id="insTab2" onclick="window._ins_switchTab(2)" style="padding:11px 18px;border:none;background:transparent;cursor:pointer;color:#6b7280;font-size:13px">Agronomico</button>
    <button id="insTab3" onclick="window._ins_switchTab(3)" style="padding:11px 18px;border:none;background:transparent;cursor:pointer;color:#6b7280;font-size:13px">Historico Precos</button>
    <button id="insTab4" onclick="window._ins_switchTab(4)" style="padding:11px 18px;border:none;background:transparent;cursor:pointer;color:#6b7280;font-size:13px">Estoque</button>
  </div>
  <div id="insFormBody" style="padding:20px">
    <!-- Panel 1: Basic -->
    <div id="insPanel1">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="grid-column:1/-1"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Nome do Produto *</label><input id="ins_f_nome" value="${esc(ins?.nome||'')}" placeholder="Ex: Roundup Original DI" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Categoria *</label><select id="ins_f_cat" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Selecione...</option>${catOpts}</select></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Fabricante</label><input id="ins_f_fab" value="${esc(ins?.fabricante||'')}" placeholder="Bayer, Syngenta..." style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Registro MAPA</label><input id="ins_f_mapa" value="${esc(ins?.registro_mapa||'')}" placeholder="BR-12345" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Unidade *</label><select id="ins_f_un" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Sel...</option>${['L','mL','kg','g','t','sc 50kg','sc 40kg','sc 60kg','un','dose','ha','caixa'].map(u=>'<option value="'+u+'"'+(!isNovo&&ins?.unidade===u?' selected':'')+'>'+u+'</option>').join('')}</select></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Fazenda (vazio = Global)</label><select id="ins_f_faz" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">\uD83C\uDF10 Global</option>${fazOpts}</select></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">\uD83D\uDCB0 Preco Unitario (R$) *</label><input id="ins_f_preco" type="number" step="0.01" min="0" value="${ins?.preco_unitario||0}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box"><div style="font-size:11px;color:#6b7280;margin-top:2px">Sera registrado no historico</div></div>
        <div style="display:flex;align-items:center"><label style="display:flex;align-items:center;gap:8px;cursor:pointer;padding:10px;background:#fef9c3;border-radius:8px;border:1px solid #fde68a;width:100%"><input type="checkbox" id="ins_f_cert" ${!isNovo&&ins?.certificacao_permitida?' checked':''} style="accent-color:#065f46;width:16px;height:16px"><div><div style="font-size:13px;font-weight:600;color:#854d0e">\uD83C\uDF3F Certificacao Organica</div><div style="font-size:11px;color:#92400e">Permitido em talhoes com cert.</div></div></label></div>
      </div>
    </div>
    <!-- Panel 2: Agronomic -->
    <div id="insPanel2" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div style="grid-column:1/-1"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Principio Ativo</label><input id="ins_f_pa" value="${esc(ins?.principio_ativo||'')}" placeholder="Ex: Glifosato, Piraclostrobina+Fluxapiroxade" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Modo de Aplicacao</label><select id="ins_f_modo" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Sel...</option>${modoOpts}</select></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Formulacao</label><select id="ins_f_form" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Sel...</option>${formOpts}</select></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Dose Recomendada</label><input id="ins_f_dose" value="${esc(ins?.dose_recomendada||'')}" placeholder="Ex: 2-4 L/ha" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Periodo de Aplicacao</label><input id="ins_f_periodo" value="${esc(ins?.periodo_aplicacao||'')}" placeholder="Ex: Pre-emergencia, V4-V6" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Classe Toxicologica</label><select id="ins_f_tox" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px"><option value="">Sel...</option>${toxOpts}</select></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Intervalo Seguranca (dias)</label><input id="ins_f_is" type="number" min="0" value="${ins?.intervalo_seguranca||''}" placeholder="7" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box"></div>
        <div style="grid-column:1/-1"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:8px">Culturas Indicadas</label><div style="display:flex;flex-wrap:wrap;gap:7px">${cultChecks}</div></div>
        <div style="grid-column:1/-1"><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Observacoes Tecnicas</label><textarea id="ins_f_obs" rows="2" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:13px;box-sizing:border-box;resize:vertical">${esc(ins?.observacoes||'')}</textarea></div>
      </div>
    </div>
    <!-- Panel 3: Price History -->
    <div id="insPanel3" style="display:none">
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f0fdf4"><th style="padding:9px 10px;text-align:left;font-size:11px;color:#065f46">Data</th><th style="padding:9px 10px;text-align:left;font-size:11px;color:#065f46">Preco</th><th style="padding:9px 10px;text-align:left;font-size:11px;color:#065f46">Fornecedor</th><th style="padding:9px 10px;text-align:left;font-size:11px;color:#065f46">Notas</th></tr></thead><tbody>${histRows}</tbody></table></div>
      ${!isNovo?`<div style="margin-top:14px;padding:14px;background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px"><div style="font-weight:600;font-size:13px;margin-bottom:10px">+ Registrar novo preco</div><div style="display:flex;gap:10px;flex-wrap:wrap"><input id="ins_ph_preco" type="number" step="0.01" placeholder="Preco R$" style="flex:1;min-width:90px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><input id="ins_ph_forn" placeholder="Fornecedor" style="flex:2;min-width:110px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><input id="ins_ph_data" type="date" value="${today()}" style="padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><input id="ins_ph_notas" placeholder="Notas" style="flex:3;min-width:130px;padding:8px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><button onclick="window._ins_addPreco('${id}')" style="background:#7c3aed;color:#fff;border:none;padding:8px 14px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Adicionar</button></div></div>`:"<div style='padding:16px;text-align:center;color:#9ca3af;font-size:13px'>Salve o insumo primeiro</div>"}
    </div>
    <!-- Panel 4: Stock -->
    <div id="insPanel4" style="display:none">
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Estoque Atual (${esc(ins?.unidade||'un')})</label><input id="ins_f_est" type="number" step="0.01" min="0" value="${ins?.estoque_atual||0}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box"></div>
        <div><label style="font-size:12px;font-weight:600;color:#374151;display:block;margin-bottom:4px">Estoque Minimo (${esc(ins?.unidade||'un')})</label><input id="ins_f_min" type="number" step="0.01" min="0" value="${ins?.estoque_minimo||0}" style="width:100%;padding:9px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box"></div>
      </div>
    </div>
  </div>
  <div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;background:#f9fafb">
    <button onclick="window._ins_closeForm()" style="background:#fff;border:1px solid #d1d5db;color:#374151;padding:9px 18px;border-radius:8px;cursor:pointer;font-size:13px">Cancelar</button>
    <button onclick="window._ins_doForm('${isNovo?'-1':id}')" style="background:#065f46;color:#fff;border:none;padding:9px 22px;border-radius:8px;cursor:pointer;font-size:14px;font-weight:600">Salvar Insumo</button>
  </div>
</div>`;
    document.body.appendChild(m);
  };

  window._ins_switchTab=function(n){[1,2,3,4].forEach(i=>{const p=document.getElementById('insPanel'+i),t=document.getElementById('insTab'+i);if(p)p.style.display=i===n?'':' none';if(t){t.style.fontWeight=i===n?'600':'400';t.style.color=i===n?'#065f46':'#6b7280';t.style.borderBottom=i===n?'2px solid #065f46':'none';}});};
  window._ins_closeForm=function(){const m=document.getElementById('insModal');if(m)m.remove();};

  window._ins_doForm=async function(id){
    const isNovo=id==='-1'||id===-1;
    const nome=document.getElementById('ins_f_nome')?.value?.trim();
    const cat=document.getElementById('ins_f_cat')?.value;
    const un=document.getElementById('ins_f_un')?.value;
    const preco=parseFloat(document.getElementById('ins_f_preco')?.value||0);
    if(!nome){toast('Informe o nome','bad');return;}
    if(!cat){toast('Selecione a categoria','bad');return;}
    if(!un){toast('Selecione a unidade','bad');return;}
    const cults=Array.from(document.querySelectorAll('input[name="ins_cult"]:checked')).map(c=>c.value);
    const payload={
      nome, categoria:cat, fabricante:document.getElementById('ins_f_fab')?.value?.trim()||null,
      registro_mapa:document.getElementById('ins_f_mapa')?.value?.trim()||null,
      unidade:un, fazenda_id:document.getElementById('ins_f_faz')?.value||null,
      preco_unitario:preco, certificacao_permitida:document.getElementById('ins_f_cert')?.checked||false,
      principio_ativo:document.getElementById('ins_f_pa')?.value?.trim()||null,
      modo_aplicacao:document.getElementById('ins_f_modo')?.value||null,
      formulacao:document.getElementById('ins_f_form')?.value||null,
      dose_recomendada:document.getElementById('ins_f_dose')?.value?.trim()||null,
      periodo_aplicacao:document.getElementById('ins_f_periodo')?.value?.trim()||null,
      classe_toxicologica:document.getElementById('ins_f_tox')?.value||null,
      intervalo_seguranca:parseInt(document.getElementById('ins_f_is')?.value||0)||null,
      culturas:cults.length?cults:null,
      observacoes:document.getElementById('ins_f_obs')?.value?.trim()||null,
      estoque_atual:parseFloat(document.getElementById('ins_f_est')?.value||0),
      estoque_minimo:parseFloat(document.getElementById('ins_f_min')?.value||0),
      global:!document.getElementById('ins_f_faz')?.value,
      atualizado_em:new Date().toISOString(),
    };
    let savedId=id;
    if(isNovo){
      payload.ativo=true;
      const {data,error}=await sb.from('insumos').insert([payload]).select('id').single();
      if(error){toast('Erro: '+error.message,'bad');return;}
      savedId=data.id;
    } else {
      const {error}=await sb.from('insumos').update(payload).eq('id',id);
      if(error){toast('Erro: '+error.message,'bad');return;}
    }
    if(preco>0&&savedId){
      const oldPreco=_precs[savedId]?.[0]?.preco;
      if(oldPreco!==preco){
        await sb.from('insumo_precos').insert([{insumo_id:savedId,preco,fornecedor:document.getElementById('ins_f_fab')?.value?.trim()||null,data_referencia:today(),notas:isNovo?'Cadastro inicial':'Preco atualizado'}]);
      }
    }
    toast(isNovo?'Insumo cadastrado!':'Insumo atualizado!');
    window._ins_closeForm();
    await loadData();
  };

  window._ins_verHistorico=function(id){
    const hist=_precs[id]||[];
    const ins=_ins.find(i=>i.id===id);
    if(!ins)return;
    const rows=hist.length?hist.map(p=>'<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:9px 11px">'+p.data_referencia+'</td><td style="padding:9px 11px;font-weight:700;color:#065f46">'+fmt(p.preco)+'</td><td style="padding:9px 11px">'+esc(p.fornecedor||'-')+'</td><td style="padding:9px 11px;font-size:12px;color:#6b7280">'+esc(p.notas||'-')+'</td></tr>').join(''):'<tr><td colspan="4" style="text-align:center;padding:20px;color:#9ca3af">Sem historico</td></tr>';
    const m=document.createElement('div');
    m.id='insHistModal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
    m.innerHTML=`<div style="background:#fff;border-radius:14px;width:100%;max-width:620px;overflow:hidden"><div style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:18px 22px;display:flex;justify-content:space-between;align-items:center"><div><h3 style="color:#fff;margin:0;font-size:15px">Historico de Precos</h3><p style="color:#c4b5fd;margin:3px 0 0;font-size:12px">${esc(ins.nome)} / ${esc(ins.unidade||'un')}</p></div><button onclick="document.getElementById('insHistModal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer">x</button></div><div style="padding:14px;max-height:350px;overflow-y:auto"><table style="width:100%;border-collapse:collapse"><thead><tr style="background:#f5f3ff"><th style="padding:9px 11px;text-align:left;font-size:11px;color:#6d28d9">Data</th><th style="padding:9px 11px;text-align:left;font-size:11px;color:#6d28d9">Preco</th><th style="padding:9px 11px;text-align:left;font-size:11px;color:#6d28d9">Fornecedor</th><th style="padding:9px 11px;text-align:left;font-size:11px;color:#6d28d9">Notas</th></tr></thead><tbody>${rows}</tbody></table></div><div style="padding:14px;border-top:1px solid #e5e7eb;background:#faf5ff"><div style="font-size:13px;font-weight:600;margin-bottom:10px">+ Registrar preco</div><div style="display:flex;gap:9px;flex-wrap:wrap"><input id="hp_preco" type="number" step="0.01" placeholder="Preco R$" style="flex:1;min-width:90px;padding:7px 9px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><input id="hp_forn" placeholder="Fornecedor" style="flex:2;min-width:110px;padding:7px 9px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><input id="hp_data" type="date" value="${today()}" style="padding:7px 9px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><input id="hp_nota" placeholder="Notas" style="flex:3;min-width:130px;padding:7px 9px;border:1px solid #d1d5db;border-radius:6px;font-size:13px"><button onclick="window._ins_addPreco('${id}')" style="background:#7c3aed;color:#fff;border:none;padding:7px 13px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600">+ Add</button></div></div></div>`;
    document.body.appendChild(m);
  };

  window._ins_addPreco=async function(insId){
    const pEl=document.getElementById('ins_ph_preco')||document.getElementById('hp_preco');
    const fEl=document.getElementById('ins_ph_forn')||document.getElementById('hp_forn');
    const dEl=document.getElementById('ins_ph_data')||document.getElementById('hp_data');
    const nEl=document.getElementById('ins_ph_notas')||document.getElementById('hp_nota');
    const preco=parseFloat(pEl?.value||0);
    if(!preco||preco<=0){toast('Preco invalido','bad');return;}
    if(!insId){toast('Salve o insumo primeiro','bad');return;}
    const {error}=await sb.from('insumo_precos').insert([{insumo_id:insId,preco,fornecedor:fEl?.value?.trim()||null,data_referencia:dEl?.value||today(),notas:nEl?.value?.trim()||null}]);
    if(error){toast('Erro: '+error.message,'bad');return;}
    await sb.from('insumos').update({preco_unitario:preco}).eq('id',insId);
    toast('Preco registrado!');
    document.getElementById('insHistModal')?.remove();
    await loadData();
  };

  window._ins_movimentar=function(id){
    const ins=_ins.find(i=>i.id===id);
    if(!ins)return;
    const m=document.createElement('div');
    m.id='insMovModal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;display:flex;align-items:center;justify-content:center;padding:20px';
    m.dataset.tipo='entrada';
    m.innerHTML=`<div style="background:#fff;border-radius:14px;width:100%;max-width:400px;overflow:hidden"><div style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:18px 22px;display:flex;justify-content:space-between;align-items:center"><div><h3 style="color:#fff;margin:0;font-size:15px">Movimentacao de Estoque</h3><p style="color:#bfdbfe;margin:3px 0 0;font-size:12px">${esc(ins.nome)} | Atual: ${ins.estoque_atual} ${esc(ins.unidade||'un')}</p></div><button onclick="document.getElementById('insMovModal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer">x</button></div><div style="padding:20px"><div style="display:flex;gap:9px;margin-bottom:14px"><button onclick="window._ins_movTipo('entrada')" id="mov_btn_ent" style="flex:1;padding:11px;border:2px solid #2563eb;background:#eff6ff;color:#2563eb;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px">+ Entrada</button><button onclick="window._ins_movTipo('saida')" id="mov_btn_sai" style="flex:1;padding:11px;border:2px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:8px;cursor:pointer;font-size:14px">- Saida</button></div><label style="font-size:13px;font-weight:600;display:block;margin-bottom:5px">Quantidade (${esc(ins.unidade||'un')}) *</label><input id="ins_mov_qtd" type="number" step="0.01" min="0" placeholder="0" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;box-sizing:border-box;margin-bottom:12px"><label style="font-size:13px;font-weight:600;display:block;margin-bottom:5px">Observacao</label><input id="ins_mov_obs" placeholder="Ex: Compra NF 1234" style="width:100%;padding:10px 12px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;box-sizing:border-box"></div><div style="padding:14px 20px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between"><button onclick="document.getElementById('insMovModal').remove()" style="background:#fff;border:1px solid #d1d5db;color:#374151;padding:9px 18px;border-radius:8px;cursor:pointer">Cancelar</button><button onclick="window._ins_doMov('${id}')" style="background:#2563eb;color:#fff;border:none;padding:9px 20px;border-radius:8px;cursor:pointer;font-weight:600">Confirmar</button></div></div>`;
    document.body.appendChild(m);
  };

  window._ins_movTipo=function(tipo){
    document.getElementById('insMovModal').dataset.tipo=tipo;
    const e=document.getElementById('mov_btn_ent'),s=document.getElementById('mov_btn_sai');
    if(tipo==='entrada'){e.style.cssText='flex:1;padding:11px;border:2px solid #2563eb;background:#eff6ff;color:#2563eb;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px';s.style.cssText='flex:1;padding:11px;border:2px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:8px;cursor:pointer;font-size:14px';}
    else{s.style.cssText='flex:1;padding:11px;border:2px solid #dc2626;background:#fef2f2;color:#dc2626;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px';e.style.cssText='flex:1;padding:11px;border:2px solid #e5e7eb;background:#fff;color:#6b7280;border-radius:8px;cursor:pointer;font-size:14px';}
  };

  window._ins_doMov=async function(id){
    const m=document.getElementById('insMovModal');
    const tipo=m?.dataset?.tipo||'entrada';
    const qtd=parseFloat(document.getElementById('ins_mov_qtd')?.value||0);
    if(!qtd||qtd<=0){toast('Quantidade invalida','bad');return;}
    const ins=_ins.find(i=>i.id===id);
    if(!ins){toast('Insumo nao encontrado','bad');return;}
    const novoEst=(ins.estoque_atual||0)+(tipo==='entrada'?qtd:-qtd);
    if(novoEst<0){toast('Estoque insuficiente','bad');return;}
    const {error}=await sb.from('insumos').update({estoque_atual:novoEst,atualizado_em:new Date().toISOString()}).eq('id',id);
    if(error){toast('Erro: '+error.message,'bad');return;}
    toast((tipo==='entrada'?'Entrada':'Saida')+' de '+qtd+' '+ins.unidade+' registrada!');
    m.remove();
    await loadData();
  };

  window._ins_importarMercado=function(){
    const m=document.createElement('div');
    m.id='insMercModal';
    m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1000;overflow-y:auto;display:flex;align-items:flex-start;justify-content:center;padding:20px';
    const cultTabs=['','soja','milho','cafe','cana','arroz'].map(cv=>{const ci=CULTS.find(c=>c.v===cv);const isAll=cv==='';return '<button onclick="window._ins_filterMerc(\"'+cv+'\")" data-cult="'+cv+'" style="padding:7px 13px;border-radius:18px;border:1px solid '+(isAll?'#065f46':'#e5e7eb')+';background:'+(isAll?'#065f46':'#fff')+';color:'+(isAll?'#fff':'#374151')+';cursor:pointer;font-size:12px">'+(isAll?'Todos':ci?.l||cv)+'</button>';}).join('');
    m.innerHTML='<div style="background:#fff;border-radius:14px;width:100%;max-width:850px;margin-top:20px;overflow:hidden"><div style="background:linear-gradient(135deg,#059669,#047857);padding:18px 22px;display:flex;justify-content:space-between;align-items:center"><div><h3 style="color:#fff;margin:0;font-size:17px">Buscar no Mercado</h3><p style="color:#a7f3d0;margin:4px 0 0;font-size:13px">Insumos para Soja, Milho, Cafe e Cana</p></div><button onclick="document.getElementById('insMercModal').remove()" style="background:rgba(255,255,255,.2);border:none;color:#fff;width:28px;height:28px;border-radius:50%;cursor:pointer">x</button></div><div style="padding:12px 20px;border-bottom:1px solid #e5e7eb;display:flex;gap:7px;flex-wrap:wrap">'+cultTabs+'</div><div id="merc_cards" style="padding:16px 20px;max-height:500px;overflow-y:auto">'+renderMercado('')+'</div></div>';
    document.body.appendChild(m);
  };

  function renderMercado(cultFilt){
    const lista=cultFilt?CAT_MERC.filter(p=>(p.cult||[]).includes(cultFilt)):CAT_MERC;
    if(!lista.length)return '<div style="text-align:center;padding:30px;color:#9ca3af">Nenhum produto</div>';
    return lista.map(p=>{
      const cat=CATS.find(c=>c.v===p.cat)||{e:'?',l:p.cat};
      const already=_ins.some(i=>i.nome.toLowerCase()===p.n.toLowerCase());
      const cultTags=(p.cult||[]).map(cv=>{const ci=CULTS.find(c=>c.v===cv);return ci?'<span style="background:#f0fdf4;color:#065f46;padding:1px 7px;border-radius:10px;font-size:11px">'+ci.l+'</span>':''}).join(' ');
      const importBtn=already?'<div style="font-size:11px;color:#059669;font-weight:600;margin-top:5px">Cadastrado</div>':'<button onclick="window._ins_importarProd(this.dataset.prod)" data-prod="'+esc(JSON.stringify(p))+'" style="margin-top:5px;background:#059669;color:#fff;border:none;padding:5px 10px;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600">+ Importar</button>';
      return '<div style="display:flex;align-items:center;gap:11px;padding:11px;border:1px solid '+(already?'#bbf7d0':'#e5e7eb')+';border-radius:10px;margin-bottom:8px;background:'+(already?'#f0fdf4':'#fff')+'"><div style="font-size:20px;min-width:32px;text-align:center">'+cat.e+'</div><div style="flex:1;min-width:0"><div style="font-weight:600;font-size:13px">'+esc(p.n)+'</div><div style="font-size:12px;color:#6b7280">'+esc(p.fab)+' '+(p.pa?'|'+esc(p.pa):'')+'</div><div style="margin-top:3px;display:flex;gap:4px;flex-wrap:wrap">'+cultTags+'</div><div style="font-size:11px;margin-top:2px">Dose: '+esc(p.dose||'?')+' | '+esc(p.form)+' | '+esc(p.un)+'</div></div><div style="text-align:right;min-width:90px"><div style="font-size:14px;font-weight:700;color:#065f46">R$ '+(p.pr||0).toLocaleString('pt-BR',{minimumFractionDigits:2})+'</div><div style="font-size:10px;color:#9ca3af">ref./'+esc(p.un)+'</div>'+ importBtn +'</div></div>';
    }).join('');
  }

  window._ins_filterMerc=function(cult){
    document.getElementById('merc_cards').innerHTML=renderMercado(cult);
    document.querySelectorAll('[data-cult]').forEach(b=>{const a=b.dataset.cult===cult;b.style.background=a?'#065f46':'#fff';b.style.color=a?'#fff':'#374151';b.style.border=a?'1px solid #065f46':'1px solid #e5e7eb';});
  };

  window._ins_importarProd=async function(prodStr){
    let p; try{p=JSON.parse(prodStr);}catch(e){toast('Erro ao importar','bad');return;}
    const payload={nome:p.n,categoria:p.cat,tipo:p.cat,fabricante:p.fab||null,unidade:p.un||'un',preco_unitario:p.pr||0,principio_ativo:p.pa||null,modo_aplicacao:p.modo||null,formulacao:p.form||null,dose_recomendada:p.dose||null,culturas:p.cult||null,estoque_atual:0,estoque_minimo:0,ativo:true,global:true};
    const {data,error}=await sb.from('insumos').insert([payload]).select('id').single();
    if(error){toast('Erro: '+error.message,'bad');return;}
    if(p.pr&&data?.id) await sb.from('insumo_precos').insert([{insumo_id:data.id,preco:p.pr,data_referencia:today(),notas:'Preco de referencia de mercado'}]);
    toast('"'+p.n+'" importado!');
    await loadData();
    document.getElementById('insMercModal')?.remove();
    window._ins_importarMercado();
  };

  window._ins_excluir=async function(id){
    if(!confirm('Excluir este insumo?'))return;
    const {error}=await sb.from('insumos').update({ativo:false}).eq('id',id);
    if(error){toast('Erro: '+error.message,'bad');return;}
    toast('Insumo removido!');
    await loadData();
  };

  window._ins_setFaz=function(v){_filtFaz=v;render();};
  window._ins_setBusca=function(v){_filtBusca=v;render();};
  window._ins_setCat=function(v){_filtCat=v;render();};
  window._ins_setCultura=function(v){_filtCult=v;render();};

  el.innerHTML='<div style="display:flex;align-items:center;justify-content:center;height:200px;color:#6b7280">Carregando insumos...</div>';
  await loadData();
};
