window.module_vendas_graos = async function() {
  var c = document.getElementById("mainContent");
  if (!c) return;
  c.innerHTML = "<div style=\"padding:16px\"><p>Carregando...</p></div>";

  var fRes = await sb.from("fazendas").select("id,nome,certificada,tipo_certificacao").eq("ativo",true).order("nome");
  var fazendas = (fRes.data || []);
  var sRes = await sb.from("safras").select("id,nome,cultura,ano_agricola,fazenda_id,status").order("criado_em",{ascending:false});
  var safras = (sRes.data || []);
  var vRes = await sb.from("vendas_graos").select("*,fazendas(nome,certificada,tipo_certificacao),safras(nome,cultura)").order("criado_em",{ascending:false});
  var vendas = (vRes.data || []);
  var eRes = await sb.from("entregas_graos").select("*,vendas_graos(cultura,tipo_contrato),talhoes(nome)");
  var entregas = (eRes.data || []);
  var qRes = await sb.from("qualidade_registro").select("id,fazenda_id,safra_id,cultura,data_registro,fazendas(nome)").order("data_registro",{ascending:false});
  var qualidades = (qRes.data || []);

  window._vgAllVendas = vendas;
  window._vgAllEntregas = entregas;
  window._vgFazendas = fazendas;
  window._vgSafras = safras;
  window._vgQualidades = qualidades;

  var totalContratado = vendas.reduce(function(a,v){ return a + parseFloat(v.quantidade_sc||0); },0);
  var totalEntregue = entregas.reduce(function(a,e){ return a + parseFloat(e.quantidade_sc||0); },0);
  var totalReceita = vendas.reduce(function(a,v){ return a + (parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0)); },0);
  var precoMedio = totalContratado > 0 ? (totalReceita/totalContratado) : 0;
  var saldoEntregar = totalContratado - totalEntregue;

  var fazOpts = fazendas.map(function(f){ return "<option value=\"" + f.id + "\">" + f.nome + (f.certificada?" ✓":"") + "</option>"; }).join("");

  function fmtSc(n){ return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:1}); }
  function fmtBrl(n){ return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtDate(d){ if(!d) return ""; var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

  window._vgFmtSc = fmtSc;
  window._vgFmtBrl = fmtBrl;
  window._vgFmtDate = fmtDate;

  // Cascata: ao mudar fazenda, filtra safras e preenche cultura
  window._vgMudaFazenda = function() {
    var fazId = document.getElementById("vgFazenda").value;
    var safSel = document.getElementById("vgSafra");
    if (!safSel) return;
    var allSafras = window._vgSafras || [];
    var filtered = fazId ? allSafras.filter(function(s){ return s.fazenda_id === fazId; }) : allSafras;
    safSel.innerHTML = "<option value=\"\">Selecione...</option>" + filtered.map(function(s){
      return "<option value=\"" + s.id + "\">" + s.nome + " (" + s.cultura + " " + s.ano_agricola + ")</option>";
    }).join("");
    document.getElementById("vgCultura").value = "";
    // Filtrar qualidades por fazenda
    window._vgAtualizaQualidades(fazId, "");
  };

  window._vgMudaSafra = function() {
    var safId = document.getElementById("vgSafra").value;
    var allSafras = window._vgSafras || [];
    var s = allSafras.find(function(x){ return x.id === safId; });
    if (s) {
      document.getElementById("vgCultura").value = s.cultura;
      var fazId = document.getElementById("vgFazenda").value;
      window._vgAtualizaQualidades(fazId, safId);
    }
  };

  window._vgAtualizaQualidades = function(fazId, safId) {
    var sel = document.getElementById("vgQualidadeRef");
    if (!sel) return;
    var all = window._vgQualidades || [];
    var filtered = all.filter(function(q){
      if (fazId && q.fazenda_id !== fazId) return false;
      if (safId && q.safra_id !== safId) return false;
      return true;
    });
    sel.innerHTML = "<option value=\"\">Nenhuma / Selecionar depois</option>" + filtered.map(function(q){
      return "<option value=\"" + q.id + "\">" + fmtDate(q.data_registro) + " - " + (q.fazendas?q.fazendas.nome:"") + " - " + q.cultura + "</option>";
    }).join("");
  };


  var html = "";
  html += "<div style=\"max-width:1200px;margin:0 auto;padding:8px 0\">";
  html += "<div style=\"display:flex;align-items:center;justify-content:space-between;margin-bottom:20px\">";
  html += "<div><h2 style=\"margin:0;font-size:22px;color:#1a2e1a\">&#127807; Vendas</h2>";
  html += "<p style=\"margin:2px 0 0;color:#666;font-size:13px\">Contratos, entregas parciais e receita</p></div>";
  html += "<button onclick=\"window._vgShowForm();\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:10px 20px;cursor:pointer;font-size:13px;font-weight:600\">+ Novo Contrato</button>";
  html += "</div>";
  html += "<div style=\"display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px\">";
  html += "<div style=\"background:#fff;border-radius:12px;padding:16px;border-left:4px solid #2d7d32;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<div style=\"font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px\">Contratado</div>";
  html += "<div style=\"font-size:24px;font-weight:700;color:#2d7d32;margin:4px 0\">" + fmtSc(totalContratado) + " sc</div>";
  html += "<div style=\"font-size:11px;color:#888\">" + vendas.length + " contrato(s)</div></div>";
  html += "<div style=\"background:#fff;border-radius:12px;padding:16px;border-left:4px solid #1565c0;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<div style=\"font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px\">Entregue</div>";
  html += "<div style=\"font-size:24px;font-weight:700;color:#1565c0;margin:4px 0\">" + fmtSc(totalEntregue) + " sc</div>";
  html += "<div style=\"font-size:11px;color:#888\">" + entregas.length + " entrega(s)</div></div>";
  html += "<div style=\"background:#fff;border-radius:12px;padding:16px;border-left:4px solid #e65100;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<div style=\"font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px\">Saldo a Entregar</div>";
  html += "<div style=\"font-size:24px;font-weight:700;color:#e65100;margin:4px 0\">" + fmtSc(saldoEntregar) + " sc</div>";
  html += "<div style=\"font-size:11px;color:#888\">" + (totalContratado>0?Math.round((totalEntregue/totalContratado)*100):0) + "% entregue</div></div>";
  html += "<div style=\"background:#fff;border-radius:12px;padding:16px;border-left:4px solid #7b1fa2;box-shadow:0 1px 4px rgba(0,0,0,0.08)\">";
  html += "<div style=\"font-size:11px;text-transform:uppercase;color:#888;letter-spacing:0.5px\">Receita Total</div>";
  html += "<div style=\"font-size:24px;font-weight:700;color:#7b1fa2;margin:4px 0\">" + fmtBrl(totalReceita) + "</div>";
  html += "<div style=\"font-size:11px;color:#888\">Pm: " + fmtBrl(precoMedio) + "/sc</div></div>";
  html += "</div>";

  // ---- FORMULÁRIO NOVO CONTRATO ----
  html += "<div id=\"vgFormPanel\" style=\"display:none;background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-bottom:20px\">";
  html += "<h3 style=\"margin:0 0 16px;font-size:16px\">&#128196; Novo Contrato de Venda</h3>";
  html += "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:12px\">";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Fazenda *</label><select id=\"vgFazenda\" onchange=\"window._vgMudaFazenda();\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione...</option>" + fazOpts + "</select></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Safra *</label><select id=\"vgSafra\" onchange=\"window._vgMudaSafra();\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione a fazenda primeiro...</option></select></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Cultura</label><input id=\"vgCultura\" type=\"text\" readonly placeholder=\"Auto apos selecionar safra\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;background:#f9f9f9\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Tipo Contrato *</label><select id=\"vgTipoContrato\" onchange=\"window._vgCheckExportacao();\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"disponivel\">Disponivel</option><option value=\"forward\">Forward (Prazo)</option><option value=\"troca\">Troca (Barter)</option><option value=\"fixacao\">Fixacao</option><option value=\"cbot\">CBOT (Bolsa)</option><option value=\"exportacao\">Exportacao</option></select></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Qtd Sacas *</label><input id=\"vgQtdSc\" type=\"number\" min=\"0\" step=\"0.001\" placeholder=\"0\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Preco/Saca (R$)</label><input id=\"vgPrecoSc\" type=\"number\" min=\"0\" step=\"0.01\" placeholder=\"0.00\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Contrato</label><input id=\"vgDataContrato\" type=\"date\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Entrega</label><input id=\"vgDataEntrega\" type=\"date\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Comprador</label><input id=\"vgComprador\" type=\"text\" placeholder=\"Nome da trading/exportadora...\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Numero Contrato</label><input id=\"vgNumContrato\" type=\"text\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div style=\"grid-column:1/-1\"><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Analise de Qualidade Vinculada</label><select id=\"vgQualidadeRef\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Nenhuma / Selecionar depois</option></select></div>";
  html += "</div>";
  html += "<div id=\"vgExportacaoPanel\" style=\"display:none;margin-top:16px;background:#fff8e1;border:1px solid #f9a825;border-radius:10px;padding:16px\">";
  html += "<div style=\"display:flex;align-items:center;gap:8px;margin-bottom:12px\">";
  html += "<span style=\"font-size:20px\">&#9992;</span>";
  html += "<h4 style=\"margin:0;font-size:15px;color:#e65100\">Checklist de Exportacao</h4>";
  html += "<span style=\"font-size:12px;color:#888;margin-left:auto\">Obrigatorio para tipo Exportacao</span></div>";
  html += "<div id=\"vgExportacaoChecklist\"></div>";
  html += "</div>";
  html += "<div style=\"margin-top:12px;display:flex;gap:8px\"><button onclick=\"window._vgSalvar();\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-weight:600\">Salvar Contrato</button><button onclick=\"window._vgHideForm();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:10px 24px;cursor:pointer\">Cancelar</button></div>";
  html += "</div>";

  // ---- FILTROS E TABELA ----
  var fazOptsFilter = "<option value=\"\">Todas</option>" + fazendas.map(function(f){ return "<option value=\"" + f.id + "\">" + f.nome + "</option>"; }).join("");
  var safOptsFilter = "<option value=\"\">Todas</option>" + safras.map(function(s){ return "<option value=\"" + s.id + "\">" + s.nome + " (" + s.cultura + " " + s.ano_agricola + ")</option>"; }).join("");
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:20px\">";
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end\">";
  html += "<div style=\"flex:1;min-width:160px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Fazenda</label><select id=\"fFaz\" onchange=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px\">" + fazOptsFilter + "</select></div>";
  html += "<div style=\"flex:1;min-width:160px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Safra</label><select id=\"fSaf\" onchange=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px\">" + safOptsFilter + "</select></div>";
  html += "<div style=\"flex:1;min-width:130px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Status</label><select id=\"fSts\" onchange=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px\"><option value=\"\">Todos</option><option value=\"aberto\">Aberto</option><option value=\"parcialmente_entregue\">Parcialmente entregue</option><option value=\"entregue\">Entregue</option><option value=\"cancelado\">Cancelado</option></select></div>";
  html += "<div style=\"flex:1;min-width:130px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Comprador</label><input id=\"fComp\" type=\"text\" placeholder=\"Buscar...\" oninput=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;box-sizing:border-box\"></div>";
  html += "<div style=\"flex:0 0 auto\"><button onclick=\"window._vgLimparFiltros();\" style=\"background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px\">Limpar</button></div>";
  html += "</div>";
  html += "<div id=\"vgTabelaContratos\"></div>";
  html += "</div>";
  html += "</div>";

  c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";

  // ---- RENDERIZAR TABELA ----
  window._vgRenderTabela = function(lista) {
    var cont = document.getElementById("vgTabelaContratos");
    if (!cont) return;
    var allEntregas = window._vgAllEntregas || [];
    var sc = window._vgFmtSc; var br = window._vgFmtBrl;
    if (lista.length === 0) {
      cont.innerHTML = "<div style=\"padding:40px;text-align:center;color:#999\">Nenhum contrato encontrado</div>";
      return;
    }
    var statusColors = {aberto:"#e8f5e9|#2d7d32",parcialmente_entregue:"#fff3e0|#e65100",entregue:"#e3f2fd|#1565c0",cancelado:"#fce4ec|#c62828"};
    var t = "";
    t += "<div style=\"overflow-x:auto\"><div style=\"max-height:420px;overflow-y:auto\">";
    t += "<table style=\"width:100%;border-collapse:collapse;font-size:13px\">";
    t += "<thead style=\"position:sticky;top:0;z-index:2\"><tr style=\"background:#f8f9fa\">";
    t += "<th style=\"padding:10px 12px;text-align:left;color:#555;font-weight:600;border-bottom:1px solid #eee\">Fazenda</th>";
    t += "<th style=\"padding:10px 12px;text-align:left;color:#555;font-weight:600;border-bottom:1px solid #eee\">Safra / Cert</th>";
    t += "<th style=\"padding:10px 12px;text-align:left;color:#555;font-weight:600;border-bottom:1px solid #eee\">Tipo</th>";
    t += "<th style=\"padding:10px 12px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee\">Qtd (sc)</th>";
    t += "<th style=\"padding:10px 12px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee\">Preco/sc</th>";
    t += "<th style=\"padding:10px 12px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee\">Total</th>";
    t += "<th style=\"padding:10px 12px;text-align:center;color:#555;font-weight:600;border-bottom:1px solid #eee\">Status</th>";
    t += "<th style=\"padding:10px 12px;text-align:center;color:#555;font-weight:600;border-bottom:1px solid #eee\">Qualidade</th>";
    t += "<th style=\"padding:10px 12px;text-align:center;color:#555;font-weight:600;border-bottom:1px solid #eee\">Acoes</th>";
    t += "</tr></thead><tbody>";
    lista.forEach(function(v) {
      var scParts = (statusColors[v.status]||"#f5f5f5|#666").split("|");
      var bg = scParts[0]; var fg = scParts[1];
      var total = parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0);
      var fzNome = v.fazendas ? v.fazendas.nome : "";
      var sfNome = v.safras ? v.safras.nome : "";
      var certBadge = "";
      if (v.fazendas && v.fazendas.certificada && v.fazendas.tipo_certificacao) {
        var certColors = {organico:"#4caf50",globalgap:"#1565c0",rainforest:"#2e7d32"};
        var certColor = certColors[v.fazendas.tipo_certificacao] || "#888";
        certBadge = " <span style=\"display:inline-block;background:" + certColor + ";color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;vertical-align:middle\">" + v.fazendas.tipo_certificacao.toUpperCase() + "</span>";
      }
      var exportBadge = v.tipo_contrato === "exportacao" ? " <span style=\"display:inline-block;background:#e65100;color:#fff;font-size:9px;padding:1px 5px;border-radius:8px;vertical-align:middle\">&#9992; EXP</span>" : "";
      var qualIcon = v.qualidade_registro_id ? "<span title=\"Qualidade vinculada\" style=\"color:#2d7d32;font-size:14px\">&#10003;</span>" : "<span title=\"Sem qualidade vinculada\" style=\"color:#ccc;font-size:14px\">&#8212;</span>";
      t += "<tr style=\"border-bottom:1px solid #f5f5f5;cursor:pointer\" onmouseenter=\"this.style.background='#f9f9f9'\" onmouseleave=\"this.style.background=''\">"; 
      t += "<td style=\"padding:10px 12px\">" + fzNome + certBadge + "</td>";
      t += "<td style=\"padding:10px 12px;color:#555\">" + sfNome + "</td>";
      t += "<td style=\"padding:10px 12px\">" + (v.tipo_contrato||"") + exportBadge + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:right;font-weight:600\">" + sc(v.quantidade_sc) + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:right\">" + br(v.preco_saca) + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:right;font-weight:600\">" + br(total) + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:center\"><span style=\"background:" + bg + ";color:" + fg + ";padding:3px 8px;border-radius:10px;font-size:11px;font-weight:600\">" + (v.status||"") + "</span></td>";
      t += "<td style=\"padding:10px 12px;text-align:center\">" + qualIcon + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:center\"><button onclick=\"window._vgVerContrato('" + v.id + "');\" style=\"background:none;border:none;cursor:pointer;color:#1565c0;font-size:12px;padding:2px 6px\">Ver</button> <button onclick=\"window._vgEditarContrato('" + v.id + "');\" style=\"background:none;border:none;cursor:pointer;color:#2d7d32;font-size:12px;padding:2px 6px\">Editar</button> <button onclick=\"window._vgEntrega('" + v.id + "');\" style=\"background:none;border:none;cursor:pointer;color:#e65100;font-size:12px;padding:2px 6px\">Entrega</button></td>";
      t += "</tr>";
    });
    t += "</tbody></table></div></div>";
    cont.innerHTML = t;
  };

  window._vgFiltrar = function() {
    var fFaz = (document.getElementById("fFaz")||{}).value||"";
    var fSaf = (document.getElementById("fSaf")||{}).value||"";
    var fSts = (document.getElementById("fSts")||{}).value||"";
    var fComp = ((document.getElementById("fComp")||{}).value||"").toLowerCase();
    var all = window._vgAllVendas || [];
    var filtered = all.filter(function(v) {
      if (fFaz && v.fazenda_id !== fFaz) return false;
      if (fSaf && v.safra_id !== fSaf) return false;
      if (fSts && v.status !== fSts) return false;
      if (fComp && !(v.comprador||"").toLowerCase().includes(fComp)) return false;
      return true;
    });
    window._vgRenderTabela(filtered);
  };

  window._vgLimparFiltros = function() {
    ["fFaz","fSaf","fSts","fComp"].forEach(function(id){ var e=document.getElementById(id); if(e) e.value=""; });
    window._vgRenderTabela(window._vgAllVendas||[]);
  };

  // ---- CHECKLIST EXPORTACAO ----
  window._vgCheckExportacao = function() {
    var tipo = (document.getElementById("vgTipoContrato")||{}).value||"";
    var panel = document.getElementById("vgExportacaoPanel");
    if (!panel) return;
    if (tipo === "exportacao") {
      panel.style.display = "block";
      window._vgRenderChecklistExportacao();
    } else {
      panel.style.display = "none";
    }
  };

  window._vgExportacaoItens = [
    { cat:"Documentacao Fiscal", itens:[
      { id:"exp_nfe", texto:"NF-e de venda emitida (DANFE + XML arquivado)", ref:"Art. 1 do Ajuste SINIEF 07/05 — obrigatorio para saida de mercadorias" },
      { id:"exp_nfe_exp", texto:"NF-e de Exportacao emitida com CFOP 7.101 / 7.102", ref:"RICMS — CFOP Grupo 7 (Vendas para Exterior)" },
      { id:"exp_re", texto:"Registro de Exportacao (RE) no SISCOMEX aberto e vinculado a NF-e", ref:"IN RFB 1702/2017 e IN SECEX 14/2020" },
      { id:"exp_due", texto:"Declaracao Unica de Exportacao (DUE) registrada e averbada no Portal Siscomex", ref:"IN RFB 1702/2017 — substitui DSE/DDE" },
      { id:"exp_di", texto:"Despacho aduaneiro concluido (averbacao do embarque na DUE)", ref:"Instrucao Normativa RFB 1702/2017 Art. 49" },
      { id:"exp_contrato_cambio", texto:"Contrato de cambio registrado no SISBACEN (para contratos superiores a USD 50.000)", ref:"Res. BACEN 3568/2008 e Circular 3691/2013" }
    ]},
    { cat:"Documentacao Sanitaria e Fitossanitaria", itens:[
      { id:"exp_cif", texto:"Certificado de Inspecao Fitossanitaria (CIF) emitido pelo MAPA", ref:"Lei 10.711/2003 e Instrucao Normativa MAPA 59/2019" },
      { id:"exp_cts", texto:"Certificado de Tratamento Sanitario (se exigido pelo pais importador)", ref:"Regulamento CE 2072/2020 e normas equivalentes por pais" },
      { id:"exp_ppp", texto:"Permissao de Transito de Vegetais (PTV) ou Permissao Previa de Importacao do pais destino recebida", ref:"IN MAPA 36/2006 — transito internacional" },
      { id:"exp_laudo_qual", texto:"Laudo de Qualidade do lote emitido por laboratorio credenciado (MAPA ou INMETRO)", ref:"Lei 9.972/2000 — Classificacao de Graos e IN MAPA 60/2011" },
      { id:"exp_residuos", texto:"Analise de residuos de agrotoxicos — laudo com limites dentro do MRL exigido pelo pais importador", ref:"Regulamento (CE) 396/2005 — MRL europeu; US EPA para EUA" },
      { id:"exp_aflatoxina", texto:"Laudo de micotoxinas (aflatoxinas, fumonisinas, DON) dentro dos limites do pais importador", ref:"Regulamento (CE) 1881/2006 para UE; FDA para EUA" }
    ]},
    { cat:"Certificacoes e Rastreabilidade", itens:[
      { id:"exp_cert_org", texto:"Certificado organico valido (se produto certificado) — emitido por certificadora credenciada MAPA/IFOAM", ref:"IN MAPA 46/2011 e Lei 10.831/2003" },
      { id:"exp_rastreab", texto:"Rastreabilidade completa do lote documentada (fazenda → armazem → embarque)", ref:"GlobalG.A.P. e Reg. UE 178/2002 (principio farm-to-fork)" },
      { id:"exp_cpr", texto:"CPR (Cedula de Produto Rural) quitada ou com anuencia do credor financiador (se financiado)", ref:"Lei 8.929/1994 — CPR; resolucao BACEN sobre gravame" },
      { id:"exp_car", texto:"CAR (Cadastro Ambiental Rural) da fazenda de origem ativo e regularizado no SICAR", ref:"Lei 12.651/2012 Art. 29 (Codigo Florestal)" }
    ]},
    { cat:"Logistica e Armazenagem", itens:[
      { id:"exp_warrant", texto:"Warrant ou CDA/WA emitido pelo armazem credenciado (MAPA) se produto em deposito", ref:"Lei 11.076/2004 — CDAs e WAs" },
      { id:"exp_conhec_emb", texto:"Conhecimento de Embarque (Bill of Lading ou AWB) emitido apos averbacao da DUE", ref:"Convencao de Hamburgo e INCOTERMS 2020" },
      { id:"exp_bl", texto:"BL/AWB com descricao de mercadoria conforme NCM declarado", ref:"NCM 1201.10.00 (soja), 1005.90.10 (milho), 0901.11.00 (cafe)" },
      { id:"exp_seguro", texto:"Apolice de seguro de transporte internacional emitida (CIF/CIP) ou confirmada pelo importador (FOB/FCA)", ref:"INCOTERMS 2020 — obrigacoes por modalidade" }
    ]},
    { cat:"Obrigacoes Tributarias e Aduaneiras", itens:[
      { id:"exp_imunidade_icms", texto:"Imunidade de ICMS aplicada corretamente na NF-e de exportacao (CF 88 Art. 155 § 2 X a)", ref:"Constituicao Federal Art. 155 § 2 inc. X alinea a" },
      { id:"exp_drawback", texto:"Drawback ou Ex-tarifario registrado se houve importacao de insumos vinculados (quando aplicavel)", ref:"Portaria SECEX 23/2011 e Dec. 6.759/2009 Regulamento Aduaneiro" },
      { id:"exp_pis_cofins", texto:"PIS/COFINS sobre exportacao — aliquota zero confirmada ou ressarcimento de creditos solicitado", ref:"Lei 10.833/2003 Art. 5 e Lei 10.637/2002 Art. 5" },
      { id:"exp_rof", texto:"ROF (Registro de Operacoes Financeiras) no BACEN se houver adiantamento sobre cambio (ACC/ACE)", ref:"Circular BACEN 3691/2013 e Lei 4.131/1962" }
    ]}
  ];

  window._vgRenderChecklistExportacao = function(dadosSalvos) {
    var div = document.getElementById("vgExportacaoChecklist");
    if (!div) return;
    var saved = dadosSalvos || {};
    var html2 = "";
    window._vgExportacaoItens.forEach(function(cat) {
      html2 += "<div style=\"margin-bottom:14px\">";
      html2 += "<div style=\"font-size:12px;font-weight:700;color:#e65100;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px;padding-bottom:4px;border-bottom:1px solid #ffd54f\">" + cat.cat + "</div>";
      cat.itens.forEach(function(item) {
        var checked = saved[item.id] ? "checked" : "";
        html2 += "<label style=\"display:flex;align-items:flex-start;gap:8px;margin-bottom:6px;cursor:pointer;padding:6px 8px;border-radius:6px;transition:background 0.1s\" onmouseenter=\"this.style.background='#fff3cd'\" onmouseleave=\"this.style.background=''\"><input type=\"checkbox\" id=\"chk_" + item.id + "\" " + checked + " style=\"margin-top:2px;width:14px;height:14px;flex-shrink:0\"><div><div style=\"font-size:13px;color:#333\">" + item.texto + "</div><div style=\"font-size:10px;color:#999;margin-top:2px\">Base legal: " + item.ref + "</div></div></label>";
      });
      html2 += "</div>";
    });
    var total = window._vgExportacaoItens.reduce(function(a,c){ return a + c.itens.length; }, 0);
    var done = Object.values(saved).filter(Boolean).length;
    html2 += "<div style=\"margin-top:12px;padding:10px 14px;background:#fff;border-radius:8px;border:1px solid #ffd54f;display:flex;align-items:center;gap:10px\">";
    html2 += "<div style=\"flex:1;background:#eee;border-radius:999px;height:8px\"><div style=\"background:#2d7d32;height:100%;border-radius:999px;width:" + Math.round((done/total)*100) + "%\"></div></div>";
    html2 += "<span style=\"font-size:12px;font-weight:700;color:#2d7d32\">" + done + "/" + total + " itens</span></div>";
    div.innerHTML = html2;
  };

  // Coletar dados do checklist exportacao
  window._vgColetarChecklist = function() {
    var result = {};
    window._vgExportacaoItens.forEach(function(cat) {
      cat.itens.forEach(function(item) {
        var el = document.getElementById("chk_" + item.id);
        result[item.id] = el ? el.checked : false;
      });
    });
    return result;
  };

  // ---- VER CONTRATO ----
  window._vgVerContrato = function(id) {
    var v = (window._vgAllVendas||[]).find(function(x){ return x.id===id; });
    if (!v) return;
    var sc = window._vgFmtSc; var br = window._vgFmtBrl; var dt = window._vgFmtDate;
    var total = parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0);
    var certInfo = "";
    if (v.fazendas && v.fazendas.certificada && v.fazendas.tipo_certificacao) {
      certInfo = "<span style=\"background:#4caf50;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;margin-left:6px\">" + v.fazendas.tipo_certificacao.toUpperCase() + "</span>";
    }
    var exportSection = "";
    if (v.tipo_contrato === "exportacao" && v.checklist_exportacao) {
      var cl = v.checklist_exportacao;
      var totalItens = window._vgExportacaoItens.reduce(function(a,c){ return a + c.itens.length; }, 0);
      var doneItens = Object.values(cl).filter(Boolean).length;
      exportSection = "<div style=\"background:#fff8e1;border:1px solid #ffd54f;border-radius:10px;padding:14px;margin-top:12px\">";
      exportSection += "<div style=\"font-weight:700;color:#e65100;margin-bottom:10px\">&#9992; Checklist de Exportacao — " + doneItens + "/" + totalItens + " itens concluidos</div>";
      window._vgExportacaoItens.forEach(function(cat) {
        exportSection += "<div style=\"font-size:11px;font-weight:700;color:#888;margin:8px 0 4px\">" + cat.cat + "</div>";
        cat.itens.forEach(function(item) {
          var ok = cl[item.id];
          exportSection += "<div style=\"display:flex;align-items:center;gap:6px;margin-bottom:3px\"><span style=\"color:" + (ok?"#2d7d32":"#ccc") + ";font-size:14px\">" + (ok?"&#10003;":"&#9675;") + "</span><span style=\"font-size:12px;color:" + (ok?"#333":"#999") + "\">" + item.texto + "</span></div>";
        });
      });
      exportSection += "</div>";
    }
    var row = function(l,v2){ return "<tr><td style=\"padding:6px 10px;font-size:12px;color:#888;font-weight:600;white-space:nowrap\">" + l + "</td><td style=\"padding:6px 10px;font-size:13px;color:#333\">" + v2 + "</td></tr>"; };
    var modal = document.createElement("div");
    modal.id = "vgModalVer";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto";
    modal.innerHTML = "<div style=\"background:#fff;border-radius:14px;padding:24px;width:680px;max-width:95vw;max-height:85vh;overflow-y:auto\">"
      + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px\">"
      + "<h3 style=\"margin:0;font-size:16px\">Contrato: " + (v.numero_contrato||"S/N") + certInfo + "</h3>"
      + "<button onclick=\"document.getElementById('vgModalVer').remove();\" style=\"background:none;border:none;font-size:20px;cursor:pointer;color:#666\">&times;</button></div>"
      + "<table style=\"width:100%;border-collapse:collapse\">"
      + row("Fazenda", v.fazendas?v.fazendas.nome:"")
      + row("Safra", v.safras?v.safras.nome:"")
      + row("Cultura", v.cultura||"")
      + row("Tipo", v.tipo_contrato||"")
      + row("Comprador", v.comprador||"")
      + row("Qtd Sacas", sc(v.quantidade_sc) + " sc")
      + row("Preco/Saca", br(v.preco_saca))
      + row("Total", br(total))
      + row("Data Contrato", dt(v.data_contrato))
      + row("Data Entrega", dt(v.data_entrega))
      + row("Status", v.status||"")
      + row("Qualidade Vinculada", v.qualidade_registro_id ? "&#10003; Vinculada (ID: " + v.qualidade_registro_id.slice(0,8) + "...)" : "&#8212; Nao vinculada")
      + "</table>"
      + exportSection
      + "<div style=\"margin-top:16px;text-align:right\">"
      + "<button onclick=\"document.getElementById('vgModalVer').remove();\" style=\"background:#eee;border:none;border-radius:8px;padding:8px 20px;cursor:pointer\">Fechar</button></div>"
      + "</div>";
    document.body.appendChild(modal);
  };

  // ---- EDITAR CONTRATO ----
  window._vgEditarContrato = function(id) {
    var v = (window._vgAllVendas||[]).find(function(x){ return x.id===id; });
    if (!v) return;
    var allSafras = window._vgSafras || [];
    var safByFaz = allSafras.filter(function(s){ return s.fazenda_id===v.fazenda_id; });
    var safOpts2 = safByFaz.map(function(s){ return "<option value=\"" + s.id + "\"" + (s.id===v.safra_id?" selected":"") + ">" + s.nome + " (" + s.cultura + " " + s.ano_agricola + ")</option>"; }).join("");
    var allFaz = window._vgFazendas || [];
    var fazOpts2 = allFaz.map(function(f){ return "<option value=\"" + f.id + "\"" + (f.id===v.fazenda_id?" selected":"") + ">" + f.nome + "</option>"; }).join("");
    var allQ = window._vgQualidades || [];
    var qFiltered = allQ.filter(function(q){ return q.fazenda_id===v.fazenda_id; });
    var qOpts = "<option value=\"\">Nenhuma</option>" + qFiltered.map(function(q){ return "<option value=\"" + q.id + "\"" + (q.id===v.qualidade_registro_id?" selected":"") + ">" + (q.data_registro||"").split("-").reverse().join("/") + " - " + q.cultura + "</option>"; }).join("");
    var tipoOptions = ["disponivel","forward","troca","fixacao","cbot","exportacao"].map(function(t){ return "<option value=\"" + t + "\"" + (t===v.tipo_contrato?" selected":"") + ">" + t.charAt(0).toUpperCase() + t.slice(1) + "</option>"; }).join("");
    var statusOptions = ["aberto","parcialmente_entregue","entregue","cancelado"].map(function(s){ return "<option value=\"" + s + "\"" + (s===v.status?" selected":"") + ">" + s + "</option>"; }).join("");
    
    // Monta secao de exportacao se aplicavel
    var exportHTML = "";
    if (v.tipo_contrato === "exportacao") {
      exportHTML = "<div id=\"vgEditExportPanel\" style=\"background:#fff8e1;border:1px solid #ffd54f;border-radius:10px;padding:16px;margin-top:12px\">";
      exportHTML += "<div style=\"font-weight:700;color:#e65100;margin-bottom:10px\">&#9992; Checklist de Exportacao</div>";
      exportHTML += "<div id=\"vgEditChecklistContainer\"></div></div>";
    } else {
      exportHTML = "<div id=\"vgEditExportPanel\" style=\"display:none\"><div id=\"vgEditChecklistContainer\"></div></div>";
    }
    
    var modal = document.createElement("div");
    modal.id = "vgModalEditar";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:flex-start;justify-content:center;padding-top:40px;overflow-y:auto";
    modal.innerHTML = "<div style=\"background:#fff;border-radius:14px;padding:24px;width:700px;max-width:95vw;max-height:85vh;overflow-y:auto\">"
      + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px\">"
      + "<h3 style=\"margin:0;font-size:16px\">Editar Contrato</h3>"
      + "<button onclick=\"document.getElementById('vgModalEditar').remove();\" style=\"background:none;border:none;font-size:20px;cursor:pointer;color:#666\">&times;</button></div>"
      + "<div style=\"display:grid;grid-template-columns:repeat(2,1fr);gap:12px\">"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Fazenda</label><select id=\"evFaz\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\"></option>" + fazOpts2 + "</select></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Safra</label><select id=\"evSaf\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\"></option>" + safOpts2 + "</select></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Tipo Contrato</label><select id=\"evTipo\" onchange=\"window._vgCheckExportacaoEdit();\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\">" + tipoOptions + "</select></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Qtd Sacas</label><input id=\"evQtd\" type=\"number\" value=\"" + (v.quantidade_sc||"") + "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Preco/Saca (R$)</label><input id=\"evPreco\" type=\"number\" value=\"" + (v.preco_saca||"") + "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Comprador</label><input id=\"evComp\" type=\"text\" value=\"" + (v.comprador||"") + "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Status</label><select id=\"evSts\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\">" + statusOptions + "</select></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Numero Contrato</label><input id=\"evNum\" type=\"text\" value=\"" + (v.numero_contrato||"") + "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div style=\"grid-column:1/-1\"><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Analise de Qualidade Vinculada</label><select id=\"evQual\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\">" + qOpts + "</select></div>"
      + "</div>"
      + exportHTML
      + "<div style=\"margin-top:16px;display:flex;gap:8px;justify-content:flex-end\">"
      + "<button onclick=\"window._vgSalvarEdicao('" + id + "');\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-weight:600\">Salvar</button>"
      + "<button onclick=\"document.getElementById('vgModalEditar').remove();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:10px 24px;cursor:pointer\">Cancelar</button></div>"
      + "</div>";
    document.body.appendChild(modal);
    document.getElementById("evFaz").value = v.fazenda_id;
    document.getElementById("evSaf").value = v.safra_id;
    // Renderizar checklist se exportacao
    if (v.tipo_contrato === "exportacao") {
      setTimeout(function(){
        var cont2 = document.getElementById("vgEditChecklistContainer");
        if (cont2) {
          var saved = v.checklist_exportacao || {};
          var html3 = "";
          window._vgExportacaoItens.forEach(function(cat) {
            html3 += "<div style=\"margin-bottom:12px\"><div style=\"font-size:11px;font-weight:700;color:#e65100;text-transform:uppercase;margin-bottom:6px\">" + cat.cat + "</div>";
            cat.itens.forEach(function(item) {
              var chk = saved[item.id] ? "checked" : "";
              html3 += "<label style=\"display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;cursor:pointer\"><input type=\"checkbox\" id=\"echk_" + item.id + "\" " + chk + " style=\"margin-top:2px;width:14px;height:14px;flex-shrink:0\"><div><div style=\"font-size:12px;color:#333\">" + item.texto + "</div><div style=\"font-size:10px;color:#999\">" + item.ref + "</div></div></label>";
            });
            html3 += "</div>";
          });
          cont2.innerHTML = html3;
        }
      }, 100);
    }
  };

  window._vgCheckExportacaoEdit = function() {
    var tipo = (document.getElementById("evTipo")||{}).value||"";
    var panel = document.getElementById("vgEditExportPanel");
    if (!panel) return;
    if (tipo === "exportacao") {
      panel.style.display = "block";
      var cont2 = document.getElementById("vgEditChecklistContainer");
      if (cont2 && !cont2.innerHTML) {
        var html3 = "";
        window._vgExportacaoItens.forEach(function(cat) {
          html3 += "<div style=\"margin-bottom:12px\"><div style=\"font-size:11px;font-weight:700;color:#e65100;text-transform:uppercase;margin-bottom:6px\">" + cat.cat + "</div>";
          cat.itens.forEach(function(item) {
            html3 += "<label style=\"display:flex;align-items:flex-start;gap:8px;margin-bottom:4px;cursor:pointer\"><input type=\"checkbox\" id=\"echk_" + item.id + "\" style=\"margin-top:2px;width:14px;height:14px;flex-shrink:0\"><div><div style=\"font-size:12px;color:#333\">" + item.texto + "</div><div style=\"font-size:10px;color:#999\">" + item.ref + "</div></div></label>";
          });
          html3 += "</div>";
        });
        cont2.innerHTML = html3;
      }
    } else {
      panel.style.display = "none";
    }
  };

  window._vgColetarChecklistEdit = function() {
    var result = {};
    window._vgExportacaoItens.forEach(function(cat) {
      cat.itens.forEach(function(item) {
        var el = document.getElementById("echk_" + item.id);
        result[item.id] = el ? el.checked : false;
      });
    });
    return result;
  };

  // ---- SALVAR EDICAO ----
  window._vgSalvarEdicao = async function(id) {
    var faz = (document.getElementById("evFaz")||{}).value||"";
    var saf = (document.getElementById("evSaf")||{}).value||"";
    var tipo = (document.getElementById("evTipo")||{}).value||"";
    var qtd = (document.getElementById("evQtd")||{}).value||"";
    var preco = (document.getElementById("evPreco")||{}).value||"";
    var comp = (document.getElementById("evComp")||{}).value||"";
    var sts = (document.getElementById("evSts")||{}).value||"";
    var num = (document.getElementById("evNum")||{}).value||"";
    var qualId = (document.getElementById("evQual")||{}).value||null;
    var payload = {
      fazenda_id: faz||null,
      safra_id: saf||null,
      tipo_contrato: tipo,
      quantidade_sc: parseFloat(qtd)||0,
      preco_saca: parseFloat(preco)||0,
      comprador: comp,
      status: sts,
      numero_contrato: num,
      qualidade_registro_id: qualId||null
    };
    if (tipo === "exportacao") {
      payload.checklist_exportacao = window._vgColetarChecklistEdit();
    }
    try {
      var res = await sb.from("vendas_graos").update(payload).eq("id", id);
      if (res.error) throw res.error;
      document.getElementById("vgModalEditar").remove();
      await window.module_vendas_graos();
    } catch(e) {
      alert("Erro ao salvar: " + e.message);
    }
  };

  // ---- REGISTRAR ENTREGA ----
  window._vgEntrega = function(id) {
    var v = (window._vgAllVendas||[]).find(function(x){ return x.id===id; });
    if (!v) return;
    var allEntregas = window._vgAllEntregas || [];
    var totalEntregue = allEntregas.filter(function(e){ return e.venda_id===id; }).reduce(function(a,e){ return a + parseFloat(e.quantidade_sc||0); }, 0);
    var saldo = parseFloat(v.quantidade_sc||0) - totalEntregue;
    var modal = document.createElement("div");
    modal.id = "vgModalEntrega";
    modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:1000;display:flex;align-items:center;justify-content:center";
    modal.innerHTML = "<div style=\"background:#fff;border-radius:14px;padding:24px;width:500px;max-width:95vw\">"
      + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px\">"
      + "<h3 style=\"margin:0;font-size:16px\">Registrar Entrega</h3>"
      + "<button onclick=\"document.getElementById('vgModalEntrega').remove();\" style=\"background:none;border:none;font-size:20px;cursor:pointer;color:#666\">&times;</button></div>"
      + "<p style=\"font-size:13px;color:#888;margin:0 0 14px\">Contrato: <strong>" + (v.numero_contrato||"S/N") + "</strong> &mdash; Saldo a entregar: <strong>" + window._vgFmtSc(saldo) + " sc</strong></p>"
      + "<div style=\"display:grid;gap:10px\">"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Qtd Sacas *</label><input id=\"egQtd\" type=\"number\" min=\"0.001\" step=\"0.001\" max=\"" + saldo + "\" placeholder=\"0\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Entrega *</label><input id=\"egData\" type=\"date\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Numero Nota Fiscal</label><input id=\"egNF\" type=\"text\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>"
      + "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Observacoes</label><textarea id=\"egObs\" rows=\"2\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></textarea></div>"
      + "</div>"
      + "<div style=\"margin-top:16px;display:flex;gap:8px;justify-content:flex-end\">"
      + "<button onclick=\"window._vgSalvarEntrega('" + id + "');\" style=\"background:#e65100;color:#fff;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-weight:600\">Salvar Entrega</button>"
      + "<button onclick=\"document.getElementById('vgModalEntrega').remove();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:10px 24px;cursor:pointer\">Cancelar</button></div>"
      + "</div>";
    document.body.appendChild(modal);
  };

  window._vgSalvarEntrega = async function(vendaId) {
    var qtd = parseFloat((document.getElementById("egQtd")||{}).value||0);
    var data = (document.getElementById("egData")||{}).value||"";
    var nf = (document.getElementById("egNF")||{}).value||"";
    var obs = (document.getElementById("egObs")||{}).value||"";
    if (!qtd || qtd <= 0) { alert("Informe a quantidade de sacas."); return; }
    if (!data) { alert("Informe a data de entrega."); return; }
    try {
      var res = await sb.from("entregas_graos").insert({ venda_id: vendaId, quantidade_sc: qtd, data_entrega: data, nota_fiscal: nf, observacoes: obs });
      if (res.error) throw res.error;
      // Atualizar status do contrato
      var v = (window._vgAllVendas||[]).find(function(x){ return x.id===vendaId; });
      var allEnt = window._vgAllEntregas || [];
      var totalEnt = allEnt.filter(function(e){ return e.venda_id===vendaId; }).reduce(function(a,e){ return a+parseFloat(e.quantidade_sc||0); },0) + qtd;
      var qtdContrato = parseFloat((v||{}).quantidade_sc||0);
      var newStatus = totalEnt >= qtdContrato ? "entregue" : "parcialmente_entregue";
      await sb.from("vendas_graos").update({ status: newStatus }).eq("id", vendaId);
      document.getElementById("vgModalEntrega").remove();
      await window.module_vendas_graos();
    } catch(e) {
      alert("Erro ao salvar entrega: " + e.message);
    }
  };

  // ---- SHOW/HIDE FORM ----
  window._vgShowForm = function() {
    var p = document.getElementById("vgFormPanel");
    if (p) { p.style.display = "block"; p.scrollIntoView({behavior:"smooth"}); }
  };
  window._vgHideForm = function() {
    var p = document.getElementById("vgFormPanel");
    if (p) p.style.display = "none";
  };

  // ---- SALVAR NOVO CONTRATO ----
  window._vgSalvar = async function() {
    var fazId = (document.getElementById("vgFazenda")||{}).value||"";
    var safId = (document.getElementById("vgSafra")||{}).value||"";
    var cultura = (document.getElementById("vgCultura")||{}).value||"";
    var tipo = (document.getElementById("vgTipoContrato")||{}).value||"disponivel";
    var qtd = parseFloat((document.getElementById("vgQtdSc")||{}).value||0);
    var preco = parseFloat((document.getElementById("vgPrecoSc")||{}).value||0);
    var dataC = (document.getElementById("vgDataContrato")||{}).value||null;
    var dataE = (document.getElementById("vgDataEntrega")||{}).value||null;
    var comp = (document.getElementById("vgComprador")||{}).value||"";
    var num = (document.getElementById("vgNumContrato")||{}).value||"";
    var qualId = (document.getElementById("vgQualidadeRef")||{}).value||null;
    if (!fazId) { alert("Selecione a fazenda."); return; }
    if (!safId) { alert("Selecione a safra."); return; }
    if (!qtd || qtd <= 0) { alert("Informe a quantidade de sacas."); return; }
    var payload = {
      fazenda_id: fazId,
      safra_id: safId,
      cultura: cultura,
      tipo_contrato: tipo,
      quantidade_sc: qtd,
      preco_saca: preco,
      data_contrato: dataC,
      data_entrega: dataE,
      comprador: comp,
      numero_contrato: num,
      status: "aberto",
      qualidade_registro_id: qualId||null
    };
    if (tipo === "exportacao") {
      payload.checklist_exportacao = window._vgColetarChecklist();
    }
    try {
      var res = await sb.from("vendas_graos").insert(payload);
      if (res.error) throw res.error;
      window._vgHideForm();
      await window.module_vendas_graos();
    } catch(e) {
      alert("Erro ao salvar: " + e.message);
    }
  };

  // Inicializar tabela
  window._vgRenderTabela(vendas);
};
