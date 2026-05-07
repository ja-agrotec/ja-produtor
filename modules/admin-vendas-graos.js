window.module_vendas_graos = async function() {
  var c = document.getElementById("mainContent");
  if (!c) return;
  c.innerHTML = "<div style=\"padding:16px\"><p>Carregando...</p></div>";

  var fRes = await sb.from("fazendas").select("id,nome").eq("ativo",true).order("nome");
  var fazendas = (fRes.data || []);
  var sRes = await sb.from("safras").select("id,nome,cultura,ano_agricola,fazenda_id,status").order("criado_em",{ascending:false});
  var safras = (sRes.data || []);
  var vRes = await sb.from("vendas_graos").select("*,fazendas(nome),safras(nome,cultura)").order("criado_em",{ascending:false});
  var vendas = (vRes.data || []);
  var eRes = await sb.from("entregas_graos").select("*,vendas_graos(cultura,tipo_contrato),talhoes(nome)");
  var entregas = (eRes.data || []);

  window._vgAllVendas = vendas;
  window._vgAllEntregas = entregas;
  window._vgFazendas = fazendas;
  window._vgSafras = safras;

  var totalContratado = vendas.reduce(function(a,v){ return a + parseFloat(v.quantidade_sc||0); },0);
  var totalEntregue = entregas.reduce(function(a,e){ return a + parseFloat(e.quantidade_sc||0); },0);
  var totalReceita = vendas.reduce(function(a,v){ return a + (parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0)); },0);
  var precoMedio = totalContratado > 0 ? (totalReceita/totalContratado) : 0;
  var saldoEntregar = totalContratado - totalEntregue;

  var fazOpts = fazendas.map(function(f){ return "<option value=\"" + f.id + "\">" + f.nome + "</option>"; }).join("");
  var safOpts = safras.map(function(s){ return "<option value=\"" + s.id + "\">" + s.nome + " (" + s.cultura + " " + s.ano_agricola + ")</option>"; }).join("");

  function fmtSc(n){ return parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:0,maximumFractionDigits:1}); }
  function fmtBrl(n){ return "R$ " + parseFloat(n||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}); }
  function fmtDate(d){ if(!d) return ""; var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

  window._vgFmtSc = fmtSc;
  window._vgFmtBrl = fmtBrl;
  window._vgFmtDate = fmtDate;

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
  html += "<div id=\"vgFormPanel\" style=\"display:none;background:#fff;border-radius:12px;padding:20px;box-shadow:0 2px 8px rgba(0,0,0,0.1);margin-bottom:20px\">";
  html += "<h3 style=\"margin:0 0 16px;font-size:16px\">&#128196; Novo Contrato de Venda</h3>";
  html += "<div style=\"display:grid;grid-template-columns:repeat(3,1fr);gap:12px\">";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Fazenda *</label><select id=\"vgFazenda\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione...</option>" + fazOpts + "</select></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Safra *</label><select id=\"vgSafra\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione...</option>" + safOpts + "</select></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Cultura *</label><input id=\"vgCultura\" type=\"text\" placeholder=\"Soja, Milho...\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Tipo Contrato</label><select id=\"vgTipoContrato\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"disponivel\">Disponivel</option><option value=\"forward\">Forward (Prazo)</option><option value=\"troca\">Troca (Barter)</option><option value=\"fixacao\">Fixacao</option><option value=\"cbot\">CBOT (Bolsa)</option></select></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Qtd Sacas *</label><input id=\"vgQtdSc\" type=\"number\" min=\"0\" step=\"0.001\" placeholder=\"0\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Preco/Saca (R$)</label><input id=\"vgPrecoSc\" type=\"number\" min=\"0\" step=\"0.01\" placeholder=\"0.00\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Contrato</label><input id=\"vgDataContrato\" type=\"date\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Entrega</label><input id=\"vgDataEntrega\" type=\"date\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Comprador</label><input id=\"vgComprador\" type=\"text\" placeholder=\"Nome da trading...\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Numero Contrato</label><input id=\"vgNumContrato\" type=\"text\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
  html += "</div>";
  html += "<div style=\"margin-top:12px;display:flex;gap:8px\"><button onclick=\"window._vgSalvar();\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-weight:600\">Salvar Contrato</button><button onclick=\"window._vgHideForm();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:10px 24px;cursor:pointer\">Cancelar</button></div>";
  html += "</div>";
  html += "<div style=\"background:#fff;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,0.08);margin-bottom:20px\">";
  html += "<div style=\"padding:14px 16px;border-bottom:1px solid #f0f0f0;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-end\">";
  html += "<div style=\"flex:1;min-width:160px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Fazenda</label><select id=\"fFaz\" onchange=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px\"><option value=\"\">Todas</option>" + fazOpts + "</select></div>";
  html += "<div style=\"flex:1;min-width:160px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Safra</label><select id=\"fSaf\" onchange=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px\"><option value=\"\">Todas</option>" + safOpts + "</select></div>";
  html += "<div style=\"flex:1;min-width:130px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Status</label><select id=\"fSts\" onchange=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px\"><option value=\"\">Todos</option><option value=\"aberto\">Aberto</option><option value=\"parcialmente_entregue\">Parcialmente entregue</option><option value=\"entregue\">Entregue</option><option value=\"cancelado\">Cancelado</option></select></div>";
  html += "<div style=\"flex:1;min-width:130px\"><label style=\"font-size:11px;color:#888;display:block;margin-bottom:3px\">Comprador</label><input id=\"fComp\" type=\"text\" placeholder=\"Buscar...\" oninput=\"window._vgFiltrar();\" style=\"width:100%;padding:6px 8px;border:1px solid #ddd;border-radius:6px;font-size:12px;box-sizing:border-box\"></div>";
  html += "<div style=\"flex:0 0 auto\"><button onclick=\"window._vgLimparFiltros();\" style=\"background:#f5f5f5;color:#555;border:1px solid #ddd;border-radius:6px;padding:6px 14px;cursor:pointer;font-size:12px\">Limpar</button></div>";
  html += "</div>";
  html += "<div id=\"vgTabelaContratos\"></div>";
  html += "</div>";
  html += "</div>";

  c.innerHTML = "<div style=\"padding:16px\">" + html + "</div>";

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
    t += "<th style=\"padding:10px 12px;text-align:left;color:#555;font-weight:600;border-bottom:1px solid #eee\">Safra</th>";
    t += "<th style=\"padding:10px 12px;text-align:left;color:#555;font-weight:600;border-bottom:1px solid #eee\">Tipo</th>";
    t += "<th style=\"padding:10px 12px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee\">Qtd (sc)</th>";
    t += "<th style=\"padding:10px 12px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee\">Preco/sc</th>";
    t += "<th style=\"padding:10px 12px;text-align:right;color:#555;font-weight:600;border-bottom:1px solid #eee\">Total</th>";
    t += "<th style=\"padding:10px 12px;text-align:center;color:#555;font-weight:600;border-bottom:1px solid #eee\">Status</th>";
    t += "<th style=\"padding:10px 12px;text-align:center;color:#555;font-weight:600;border-bottom:1px solid #eee\">Acoes</th>";
    t += "</tr></thead><tbody>";
    lista.forEach(function(v) {
      var scParts = (statusColors[v.status]||"#f5f5f5|#666").split("|");
      var bg = scParts[0]; var fg = scParts[1];
      var total = parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0);
      var fzNome = v.fazendas ? v.fazendas.nome : "";
      var sfNome = v.safras ? v.safras.nome : "";
      var entVenda = allEntregas.filter(function(e){ return e.venda_id===v.id; });
      var entQtd = entVenda.reduce(function(a,e){ return a+parseFloat(e.quantidade_sc||0); },0);
      t += "<tr style=\"border-bottom:1px solid #f9f9f9;\">";
      t += "<td style=\"padding:10px 12px\">" + fzNome + "</td>";
      t += "<td style=\"padding:10px 12px\">" + sfNome + "</td>";
      t += "<td style=\"padding:10px 12px\">" + v.tipo_contrato + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:right\">" + sc(v.quantidade_sc) + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:right\">" + br(v.preco_saca) + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:right;font-weight:600\">" + br(total) + "</td>";
      t += "<td style=\"padding:10px 12px;text-align:center\"><span style=\"background:" + bg + ";color:" + fg + ";padding:3px 8px;border-radius:20px;font-size:11px;font-weight:600\">" + v.status + "</span></td>";
      t += "<td style=\"padding:8px 12px;text-align:center;white-space:nowrap\">";
      t += "<button onclick=\"window._vgVerContrato('" + v.id + "');\" style=\"background:#546e7a;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;margin:0 2px\">&#128065; Ver</button>";
      t += "<button onclick=\"window._vgEditarContrato('" + v.id + "');\" style=\"background:#f57c00;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;margin:0 2px\">&#9998; Editar</button>";
      t += "<button onclick=\"window._vgEntrega('" + v.id + "','" + sc(v.quantidade_sc-entQtd) + "');\" style=\"background:#1565c0;color:#fff;border:none;border-radius:4px;padding:4px 8px;cursor:pointer;font-size:11px;margin:0 2px\">+ Entrega</button>";
      t += "</td></tr>";
      if (entVenda.length > 0) {
        entVenda.forEach(function(e){
          var dt = window._vgFmtDate;
          t += "<tr style=\"background:#f0f7ff;border-bottom:1px solid #e8f0fe\">";
          t += "<td colspan=\"2\" style=\"padding:6px 12px 6px 32px;font-size:12px;color:#1565c0\">&#8627; Entrega: " + dt(e.data_entrega) + (e.talhoes ? " - Talhao: " + e.talhoes.nome : "") + "</td>";
          t += "<td style=\"font-size:12px;color:#1565c0;padding:6px 12px\">" + (e.nota_fiscal||"") + "</td>";
          t += "<td style=\"text-align:right;font-size:12px;color:#1565c0;padding:6px 12px\">" + sc(e.quantidade_sc) + " sc</td>";
          t += "<td colspan=\"4\"></td>";
          t += "</tr>";
        });
      }
    });
    t += "</tbody></table></div></div>";
    t += "<div style=\"padding:8px 16px;font-size:11px;color:#999;border-top:1px solid #f0f0f0\">" + lista.length + " contrato(s) exibido(s)</div>";
    cont.innerHTML = t;
  };

  window._vgFiltrar = function() {
    var fFaz = document.getElementById("fFaz") ? document.getElementById("fFaz").value : "";
    var fSaf = document.getElementById("fSaf") ? document.getElementById("fSaf").value : "";
    var fSts = document.getElementById("fSts") ? document.getElementById("fSts").value : "";
    var fComp = document.getElementById("fComp") ? document.getElementById("fComp").value.toLowerCase() : "";
    var all = window._vgAllVendas || [];
    var lista = all.filter(function(v) {
      if (fFaz && v.fazenda_id !== fFaz) return false;
      if (fSaf && v.safra_id !== fSaf) return false;
      if (fSts && v.status !== fSts) return false;
      if (fComp && (!v.comprador || v.comprador.toLowerCase().indexOf(fComp) === -1)) return false;
      return true;
    });
    window._vgRenderTabela(lista);
  };

  window._vgLimparFiltros = function() {
    var ids = ["fFaz","fSaf","fSts","fComp"];
    ids.forEach(function(id){ var el = document.getElementById(id); if(el) el.value = ""; });
    window._vgFiltrar();
  };

  window._vgRenderTabela(vendas);

  window._vgVerContrato = function(id) {
    var all = window._vgAllVendas || [];
    var v = null;
    for (var i=0; i<all.length; i++) { if (all[i].id === id) { v = all[i]; break; } }
    if (!v) { alert("Contrato nao encontrado"); return; }
    var allEntregas = window._vgAllEntregas || [];
    var entVenda = allEntregas.filter(function(e){ return e.venda_id===id; });
    var sc = window._vgFmtSc; var br = window._vgFmtBrl; var dt = window._vgFmtDate;
    var fzNome = v.fazendas ? v.fazendas.nome : (v.fazenda_id||"");
    var sfNome = v.safras ? v.safras.nome : (v.safra_id||"");
    var total = parseFloat(v.quantidade_sc||0)*parseFloat(v.preco_saca||0);
    var entQtd = entVenda.reduce(function(a,e){ return a+parseFloat(e.quantidade_sc||0); },0);
    var saldo = parseFloat(v.quantidade_sc||0) - entQtd;
    function row(lbl,val) { return "<tr><td style=\"padding:7px 10px;font-size:12px;color:#888;width:140px;vertical-align:top\">" + lbl + "</td><td style=\"padding:7px 10px;font-size:13px;font-weight:500\">" + val + "</td></tr>"; }
    var statusColors = {aberto:"#e8f5e9|#2d7d32",parcialmente_entregue:"#fff3e0|#e65100",entregue:"#e3f2fd|#1565c0",cancelado:"#fce4ec|#c62828"};
    var scp = (statusColors[v.status]||"#f5f5f5|#666").split("|");
    var badgeHtml = "<span style=\"background:" + scp[0] + ";color:" + scp[1] + ";padding:3px 10px;border-radius:20px;font-size:12px;font-weight:600\">" + v.status + "</span>";
    var entHtml = "";
    if (entVenda.length === 0) {
      entHtml = "<p style=\"color:#999;font-size:12px;margin:0\">Nenhuma entrega registrada</p>";
    } else {
      entHtml = "<table style=\"width:100%;font-size:12px;border-collapse:collapse\">";
      entHtml += "<thead><tr style=\"background:#f8f9fa\"><th style=\"padding:6px 8px;text-align:left;color:#666\">Data</th><th style=\"padding:6px 8px;text-align:left;color:#666\">Talhao</th><th style=\"padding:6px 8px;text-align:right;color:#666\">Qtd sc</th><th style=\"padding:6px 8px;text-align:left;color:#666\">NF</th></tr></thead><tbody>";
      entVenda.forEach(function(e){
        entHtml += "<tr style=\"border-bottom:1px solid #f0f0f0\"><td style=\"padding:5px 8px\">" + dt(e.data_entrega) + "</td><td style=\"padding:5px 8px\">" + (e.talhoes?e.talhoes.nome:"-") + "</td><td style=\"padding:5px 8px;text-align:right\">" + sc(e.quantidade_sc) + "</td><td style=\"padding:5px 8px\">" + (e.nota_fiscal||"-") + "</td></tr>";
      });
      entHtml += "</tbody></table>";
    }
    var m = document.createElement("div");
    m.id = "vgModal";
    m.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";
    var inner = "<div style=\"background:#fff;border-radius:16px;padding:28px;width:600px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)\">";
    inner += "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px\">";
    inner += "<h3 style=\"margin:0;font-size:17px\">&#128196; Detalhe do Contrato</h3>";
    inner += "<button onclick=\"document.getElementById('vgModal').remove();\" style=\"background:none;border:none;font-size:20px;cursor:pointer;color:#999\">&#10005;</button>";
    inner += "</div>";
    inner += "<table style=\"width:100%;border-collapse:collapse;margin-bottom:16px;background:#fafafa;border-radius:8px;overflow:hidden\">";
    inner += row("Fazenda", fzNome);
    inner += row("Safra", sfNome);
    inner += row("Cultura", v.cultura||"-");
    inner += row("Tipo Contrato", v.tipo_contrato||"-");
    inner += row("N° Contrato", v.numero_contrato||"-");
    inner += row("Comprador", v.comprador||"-");
    inner += row("Qtd Contratada", sc(v.quantidade_sc) + " sc");
    inner += row("Preco/Saca", br(v.preco_saca));
    inner += row("Total", br(total));
    inner += row("Qtd Entregue", sc(entQtd) + " sc");
    inner += row("Saldo", sc(saldo) + " sc");
    inner += row("Data Contrato", dt(v.data_contrato));
    inner += row("Data Entrega Prev.", dt(v.data_entrega));
    inner += row("Status", badgeHtml);
    inner += "</table>";
    inner += "<h4 style=\"margin:0 0 10px;font-size:13px;color:#555\">Entregas (" + entVenda.length + ")</h4>";
    inner += entHtml;
    inner += "<div style=\"margin-top:18px;display:flex;gap:8px\">";
    inner += "<button onclick=\"document.getElementById('vgModal').remove(); window._vgEditarContrato('" + id + "');\" style=\"background:#f57c00;color:#fff;border:none;border-radius:8px;padding:9px 20px;cursor:pointer;font-size:13px;font-weight:600\">&#9998; Editar</button>";
    inner += "<button onclick=\"document.getElementById('vgModal').remove();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:9px 20px;cursor:pointer\">Fechar</button>";
    inner += "</div>";
    inner += "</div>";
    m.innerHTML = inner;
    document.body.appendChild(m);
  };

  window._vgEditarContrato = function(id) {
    var all = window._vgAllVendas || [];
    var v = null;
    for (var i=0; i<all.length; i++) { if (all[i].id === id) { v = all[i]; break; } }
    if (!v) { alert("Contrato nao encontrado"); return; }
    var fazendas = window._vgFazendas || [];
    var safras = window._vgSafras || [];
    var fazOpts = fazendas.map(function(f){ return "<option value=\"" + f.id + "\"" + (v.fazenda_id===f.id?" selected\"\"":"") + ">" + f.nome + "</option>"; }).join("");
    var safOpts = safras.map(function(s){ return "<option value=\"" + s.id + "\"" + (v.safra_id===s.id?" selected\"\"":"") + ">" + s.nome + " (" + s.cultura + " " + s.ano_agricola + ")</option>"; }).join("");
    function selTipo(val) { return "<select id=\"evTipo\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"disponivel\"" + (val==="disponivel"?" selected\"\"":"") + ">Disponivel</option><option value=\"forward\"" + (val==="forward"?" selected\"\"":"") + ">Forward (Prazo)</option><option value=\"troca\"" + (val==="troca"?" selected\"\"":"") + ">Troca (Barter)</option><option value=\"fixacao\"" + (val==="fixacao"?" selected\"\"":"") + ">Fixacao</option><option value=\"cbot\"" + (val==="cbot"?" selected\"\"":"") + ">CBOT (Bolsa)</option></select>"; }
    function selStatus(val) { return "<select id=\"evStatus\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"aberto\"" + (val==="aberto"?" selected\"\"":"") + ">Aberto</option><option value=\"parcialmente_entregue\"" + (val==="parcialmente_entregue"?" selected\"\"":"") + ">Parcialmente entregue</option><option value=\"entregue\"" + (val==="entregue"?" selected\"\"":"") + ">Entregue</option><option value=\"cancelado\"" + (val==="cancelado"?" selected\"\"":"") + ">Cancelado</option></select>"; }
    function inp(id, val, type) { return "<input id=\"" + id + "\" type=\"" + (type||"text") + "\" value=\"" + (val||"") + "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\">" ; }
    var m = document.createElement("div");
    m.id = "vgModal";
    m.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";
    var inner = "<div style=\"background:#fff;border-radius:16px;padding:28px;width:620px;max-width:95vw;max-height:90vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,0.2)\">";
    inner += "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:16px\">";
    inner += "<h3 style=\"margin:0;font-size:17px\">&#9998; Editar Contrato</h3>";
    inner += "<button onclick=\"document.getElementById('vgModal').remove();\" style=\"background:none;border:none;font-size:20px;cursor:pointer;color:#999\">&#10005;</button>";
    inner += "</div>";
    inner += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Fazenda *</label><select id=\"evFaz\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione...</option>" + fazOpts + "</select></div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Safra</label><select id=\"evSaf\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione...</option>" + safOpts + "</select></div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Cultura *</label>" + inp("evCult", v.cultura) + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Tipo Contrato</label>" + selTipo(v.tipo_contrato) + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Qtd Sacas *</label>" + inp("evQtd", v.quantidade_sc, "number") + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Preco/Saca (R$)</label>" + inp("evPreco", v.preco_saca, "number") + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Contrato</label>" + inp("evDtC", v.data_contrato, "date") + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data Entrega Prev.</label>" + inp("evDtE", v.data_entrega, "date") + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Comprador</label>" + inp("evComp", v.comprador) + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">N° Contrato</label>" + inp("evNum", v.numero_contrato) + "</div>";
    inner += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Status</label>" + selStatus(v.status) + "</div>";
    inner += "</div>";
    inner += "<div style=\"margin-top:18px;display:flex;gap:8px\">";
    inner += "<button onclick=\"window._vgSalvarEdicao('" + id + "');\" style=\"background:#2d7d32;color:#fff;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-weight:600\">Salvar Alteracoes</button>";
    inner += "<button onclick=\"document.getElementById('vgModal').remove();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:10px 24px;cursor:pointer\">Cancelar</button>";
    inner += "</div>";
    inner += "</div>";
    m.innerHTML = inner;
    document.body.appendChild(m);    document.getElementById("evFaz").value = v.fazenda_id;
    document.getElementById("evSaf").value = v.safra_id;

  };

  window._vgSalvarEdicao = async function(id) {
    var fazId = document.getElementById("evFaz").value;
    var safId = document.getElementById("evSaf").value;
    var cultura = document.getElementById("evCult").value;
    var tipo = document.getElementById("evTipo").value;
    var qtd = parseFloat(document.getElementById("evQtd").value);
    var preco = parseFloat(document.getElementById("evPreco").value) || 0;
    var dtC = document.getElementById("evDtC").value;
    var dtE = document.getElementById("evDtE").value;
    var comprador = document.getElementById("evComp").value;
    var numC = document.getElementById("evNum").value;
    var status = document.getElementById("evStatus").value;
    if (!fazId || !cultura || !qtd) { alert("Fazenda, cultura e quantidade sao obrigatorios"); return; }
    var payload = { fazenda_id:fazId, safra_id:safId||null, cultura:cultura, tipo_contrato:tipo, quantidade_sc:qtd, preco_saca:preco, data_contrato:dtC||null, data_entrega:dtE||null, comprador:comprador||null, numero_contrato:numC||null, status:status };
    var upd = await sb.from("vendas_graos").update(payload).eq("id",id);
    if (upd.error) { alert("Erro ao salvar: " + upd.error.message); return; }
    document.getElementById("vgModal").remove();
    window.module_vendas_graos();
  };

  window._vgEntrega = async function(vendaId, saldoDisp) {
    var tRes = await sb.from("talhoes").select("id,nome").eq("ativo",true);
    var tals = (tRes.data || []);
    var talOpts = tals.map(function(t){ return "<option value=\"" + t.id + "\">" + t.nome + "</option>"; }).join("");
    var modal = document.createElement("div");
    modal.id = "vgModal";
    modal.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center;";
    modal.innerHTML = "<div style=\"background:#fff;border-radius:16px;padding:28px;width:480px;max-width:95vw;box-shadow:0 8px 32px rgba(0,0,0,0.2)\">";
    modal.innerHTML += "<h3 style=\"margin:0 0 16px;font-size:17px\">&#128666; Registrar Entrega</h3>";
    modal.innerHTML += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:12px\">";
    modal.innerHTML += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Data *</label><input id=\"eData\" type=\"date\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
    modal.innerHTML += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Qtd Sacas *</label><input id=\"eQtd\" type=\"number\" min=\"0\" step=\"0.001\" max=\"" + saldoDisp + "\" value=\"" + saldoDisp + "\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
    modal.innerHTML += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Talhao</label><select id=\"eTalhao\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Sem talhao</option>" + talOpts + "</select></div>";
    modal.innerHTML += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Nota Fiscal</label><input id=\"eNF\" type=\"text\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
    modal.innerHTML += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Peso Bruto (kg)</label><input id=\"ePeso\" type=\"number\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
    modal.innerHTML += "<div><label style=\"font-size:12px;color:#555;display:block;margin-bottom:4px\">Umidade (%)</label><input id=\"eUmidade\" type=\"number\" step=\"0.1\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"></div>";
    modal.innerHTML += "</div>";
    modal.innerHTML += "<div style=\"margin-top:16px;display:flex;gap:8px\">";
    modal.innerHTML += "<button onclick=\"window._vgSalvarEntrega('" + vendaId + "');\" style=\"background:#1565c0;color:#fff;border:none;border-radius:8px;padding:10px 24px;cursor:pointer;font-weight:600\">Confirmar Entrega</button>";
    modal.innerHTML += "<button onclick=\"document.getElementById('vgModal').remove();\" style=\"background:#eee;color:#333;border:none;border-radius:8px;padding:10px 24px;cursor:pointer\">Cancelar</button>";
    modal.innerHTML += "</div></div>";
    document.body.appendChild(modal);
  };

  window._vgSalvarEntrega = async function(vendaId) {
    var data = document.getElementById("eData").value;
    var qtd = parseFloat(document.getElementById("eQtd").value);
    var talhaoId = document.getElementById("eTalhao").value || null;
    var nf = document.getElementById("eNF").value;
    var peso = parseFloat(document.getElementById("ePeso").value) || null;
    var umid = parseFloat(document.getElementById("eUmidade").value) || null;
    if (!data || !qtd) { alert("Data e quantidade sao obrigatorios"); return; }
    var vRes = await sb.from("vendas_graos").select("fazenda_id,quantidade_sc").eq("id",vendaId).single();
    var payload = { venda_id:vendaId, fazenda_id:vRes.data.fazenda_id, talhao_id:talhaoId, data_entrega:data, quantidade_sc:qtd, nota_fiscal:nf||null, peso_bruto_kg:peso, umidade_pct:umid };
    var ins = await sb.from("entregas_graos").insert(payload);
    if (ins.error) { alert("Erro: " + ins.error.message); return; }
    var eSum = await sb.from("entregas_graos").select("quantidade_sc").eq("venda_id",vendaId);
    var totalE = (eSum.data||[]).reduce(function(a,e){ return a+parseFloat(e.quantidade_sc||0); },0);
    var newStatus = totalE >= parseFloat(vRes.data.quantidade_sc) ? "entregue" : "parcialmente_entregue";
    await sb.from("vendas_graos").update({status:newStatus}).eq("id",vendaId);
    document.getElementById("vgModal").remove();
    window.module_vendas_graos();
  };

  window._vgShowForm = function() { document.getElementById("vgFormPanel").style.display="block"; };
  window._vgHideForm = function() { document.getElementById("vgFormPanel").style.display="none"; };

  window._vgSalvar = async function() {
    var fazId = document.getElementById("vgFazenda").value;
    var safId = document.getElementById("vgSafra").value;
    var cultura = document.getElementById("vgCultura").value;
    var tipo = document.getElementById("vgTipoContrato").value;
    var qtd = parseFloat(document.getElementById("vgQtdSc").value);
    var preco = parseFloat(document.getElementById("vgPrecoSc").value);
    var dtC = document.getElementById("vgDataContrato").value;
    var dtE = document.getElementById("vgDataEntrega").value;
    var comprador = document.getElementById("vgComprador").value;
    var numC = document.getElementById("vgNumContrato").value;
    if (!fazId || !cultura || !qtd) { alert("Fazenda, cultura e quantidade sao obrigatorios"); return; }
    var payload = { fazenda_id:fazId, safra_id:safId||null, cultura:cultura, tipo_contrato:tipo, quantidade_sc:qtd, preco_saca:preco||0, data_contrato:dtC||null, data_entrega:dtE||null, comprador:comprador||null, numero_contrato:numC||null };
    var ins = await sb.from("vendas_graos").insert(payload);
    if (ins.error) { alert("Erro: " + ins.error.message); return; }
    window.module_vendas_graos();
  };

}; // end module_vendas_graos
window.module_vendas_graos();
