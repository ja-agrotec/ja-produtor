window.AdminQualidade = {
  render: async function(cont) {
    if (!cont) return;
    var sb = window.sb;
    cont.innerHTML = "<div style=\"padding:20px;text-align:center;color:#888\">Carregando qualidade...</div>";

    var fRes = await sb.from("fazendas").select("id,nome").eq("ativo",true).order("nome");
    var sRes = await sb.from("safras").select("id,nome,cultura,ano_agricola,fazenda_id").order("nome");
    var qRes = await sb.from("qualidade_registro").select("*,fazendas(nome),safras(nome,cultura,ano_agricola)").order("data_registro",{ascending:false});

    var fazendas = fRes.data || [];
    var safras = sRes.data || [];
    var registros = (qRes.error) ? [] : (qRes.data || []);

    function fmtDate(d) { if(!d) return ""; var p=d.split("-"); return p[2]+"/"+p[1]+"/"+p[0]; }

    var culturaFields = {
      cafe:  [{k:"bebida",l:"Prova de Bebida (pts)"},{k:"umidade",l:"Umidade (%)"},{k:"peneira",l:"Peneira"},{k:"defeitos",l:"Defeitos"},{k:"rendimento",l:"Rendimento"}],
      soja:  [{k:"umidade",l:"Umidade (%)"},{k:"impureza",l:"Impurezas (%)"},{k:"proteina",l:"Proteina (%)"},{k:"oleo",l:"Oleo (%)"},{k:"germinacao",l:"Germinacao (%)"}],
      milho: [{k:"umidade",l:"Umidade (%)"},{k:"impureza",l:"Impurezas (%)"},{k:"ardido",l:"Ardidos+Brotados (%)"}],
      cana:  [{k:"brix",l:"BRIX (%)"},{k:"pol",l:"POL (%)"},{k:"pza",l:"PZA"},{k:"fibra",l:"Fibra (%)"}]
    };

    window._qualFiltros = window._qualFiltros || {faz:"",cult:"",safra:""};

    function renderQualidade() {
      var f = window._qualFiltros || {};
      var filtered = registros;
      if (f.faz) filtered = filtered.filter(function(r){ return r.fazenda_id === f.faz; });
      if (f.cult) filtered = filtered.filter(function(r){ return r.cultura === f.cult; });
      if (f.safra) filtered = filtered.filter(function(r){ return r.safra_id === f.safra; });
      var html = "";
      // Header
      html += "<div style=\"padding:20px 24px;background:#fff;border-bottom:1px solid #eee;display:flex;align-items:center;justify-content:space-between\">";
      html += "<div><h2 style=\"margin:0;font-size:22px;color:#1a2e1a;font-weight:700\">&#127942; Qualidade</h2>";
      html += "<p style=\"margin:2px 0 0;color:#666;font-size:13px\">Registros de qualidade por cultura e safra</p></div>";
      html += "<button onclick=\"window._qualShowForm()\" style=\"background:#1a2e1a;color:#fff;border:none;border-radius:8px;padding:10px 18px;font-size:14px;font-weight:600;cursor:pointer\">+ Novo Registro</button>";
      html += "</div>";
      // Filters
      html += "<div style=\"padding:14px 24px;background:#f9f9f9;border-bottom:1px solid #eee;display:flex;gap:12px;flex-wrap:wrap\">";
      html += "<select id=\"qualFazFilter\" onchange=\"window._qualFilter()\" style=\"padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px\"><option value=\"\">Todas as fazendas</option>";
      fazendas.forEach(function(fz){ var sel=(f.faz===fz.id)?" selected":""; html += "<option value=\""+fz.id+"\""+sel+">"+fz.nome+"</option>"; });
      html += "</select>";
      html += "<select id=\"qualCultFilter\" onchange=\"window._qualFilter()\" style=\"padding:7px 12px;border:1px solid #ddd;border-radius:6px;font-size:13px\"><option value=\"\">Todas as culturas</option>";
      [{v:"cafe",n:"Cafe"},{v:"soja",n:"Soja"},{v:"milho",n:"Milho"},{v:"cana",n:"Cana"}].forEach(function(c){ var sel=(f.cult===c.v)?" selected":""; html += "<option value=\""+c.v+"\""+sel+">"+c.n+"</option>"; });
      html += "</select></div>";
      // Content
      html += "<div style=\"padding:20px 24px\">";
      if (filtered.length === 0) {
        html += "<div style=\"text-align:center;padding:60px;color:#bbb\"><div style=\"font-size:48px;margin-bottom:16px\">&#127942;</div>";
        html += "<div style=\"font-size:16px;font-weight:600;color:#999\">Nenhum registro de qualidade</div>";
        html += "<div style=\"font-size:13px;color:#bbb;margin-top:8px\">Clique em + Novo Registro para comecar</div></div>";
      } else {
        var byCultura = {};
        filtered.forEach(function(r){ var c=r.cultura||"outros"; if(!byCultura[c]) byCultura[c]=[]; byCultura[c].push(r); });
        var cultColors = {cafe:"#4e342e",soja:"#2d7d32",milho:"#f9a825",cana:"#1565c0",outros:"#9e9e9e"};
        var cultIcons = {cafe:"&#9749;",soja:"&#127807;",milho:"&#127805;",cana:"&#127802;",outros:"&#127757;"};
        var cultNames = {cafe:"Cafe",soja:"Soja",milho:"Milho",cana:"Cana",outros:"Outros"};
        Object.keys(byCultura).forEach(function(cult){
          var recs=byCultura[cult]; var col=cultColors[cult]||"#9e9e9e"; var icon=cultIcons[cult]||"&#127757;";
          html += "<div style=\"margin-bottom:24px\">";
          html += "<div style=\"display:flex;align-items:center;gap:10px;margin-bottom:12px;padding-bottom:8px;border-bottom:2px solid "+col+"\"><span style=\"font-size:20px\">"+icon+"</span>";
          html += "<h3 style=\"margin:0;font-size:16px;font-weight:700;color:"+col+"\">"+( cultNames[cult]||cult )+"</h3>";
          html += "<span style=\"background:"+col+"20;color:"+col+";font-size:11px;padding:2px 8px;border-radius:10px;font-weight:600\">"+recs.length+" registro(s)</span></div>";
          html += "<div style=\"display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px\">";
          recs.forEach(function(r){
            var safNome=r.safras?r.safras.nome:"-"; var fazNome=r.fazendas?r.fazendas.nome:"-";
            var dados=r.dados_qualidade||{};
            html += "<div style=\"background:#fff;border-radius:10px;padding:16px;box-shadow:0 1px 4px rgba(0,0,0,0.08);border-left:3px solid "+col+"\">"; 
            html += "<div style=\"display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px\">";
            html += "<div><div style=\"font-size:13px;font-weight:600;color:#333\">"+safNome+"</div>";
            html += "<div style=\"font-size:11px;color:#888;margin-top:2px\">"+fazNome+" &bull; "+fmtDate(r.data_registro)+"</div></div>";
            html += "<button onclick=\"window._qualDelete('"+r.id+"')\" style=\"background:none;border:none;cursor:pointer;color:#ccc;font-size:18px;padding:0\">&times;</button></div>";
            html += "<div style=\"display:grid;grid-template-columns:1fr 1fr;gap:6px\">";
            var fields=culturaFields[cult]||[];
            fields.forEach(function(fd){ var val=dados[fd.k]; if(val!==undefined&&val!==null&&val!=="") { html += "<div style=\"background:#f9f9f9;border-radius:6px;padding:8px\"><div style=\"font-size:10px;color:#888;font-weight:600;text-transform:uppercase\">"+fd.l+"</div><div style=\"font-size:15px;font-weight:700;color:"+col+"\">"+val+"</div></div>"; } });
            if(r.observacoes) { html += "<div style=\"grid-column:1/-1;font-size:11px;color:#666;font-style:italic;background:#f9f9f9;border-radius:6px;padding:8px\">"+r.observacoes+"</div>"; }
            html += "</div></div>";
          });
          html += "</div></div>";
        });
      }
      html += "</div>";
      cont.innerHTML = html;
    }

    window._qualFilter = function() {
      var faz = document.getElementById("qualFazFilter");
      var cult = document.getElementById("qualCultFilter");
      window._qualFiltros = { faz: faz ? faz.value : "", cult: cult ? cult.value : "", safra: "" };
      renderQualidade();
    };

    window._qualShowForm = function(cultDefault) {
      var cultOpts = [{v:"cafe",n:"Cafe"},{v:"soja",n:"Soja"},{v:"milho",n:"Milho"},{v:"cana",n:"Cana"}];
      var safOpts = safras.map(function(s){ return "<option value=\""+s.id+"\">"+s.nome+" ("+( s.cultura||"" )+" "+( s.ano_agricola||"" )+")</option>"; }).join("");
      var cultSel = cultDefault || "cafe";

      var fields = culturaFields[cultSel] || [];
      var fieldsHTML = "";
      fields.forEach(function(fd){
        fieldsHTML += "<div style=\"margin-bottom:12px\">";
        fieldsHTML += "<label style=\"display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px\">"+fd.l+"</label>";
        fieldsHTML += "<input type=\"number\" step=\"0.01\" id=\"qualFld_"+fd.k+"\" placeholder=\"Valor...\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"/>";
        fieldsHTML += "</div>";
      });

      var modal = document.createElement("div");
      modal.id = "qualModal";
      modal.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:9999;display:flex;align-items:center;justify-content:center";
      modal.innerHTML = "<div style=\"background:#fff;border-radius:12px;padding:28px;width:480px;max-width:95%;max-height:90vh;overflow-y:auto\">";

      var cultOptsHTML = cultOpts.map(function(c){ return "<option value=\""+c.v+"\""+( c.v===cultSel?" selected":"" )+">"+c.n+"</option>"; }).join("");

      modal.innerHTML = "<div style=\"background:#fff;border-radius:12px;padding:28px;width:480px;max-width:95%;max-height:90vh;overflow-y:auto\">"
        + "<div style=\"display:flex;justify-content:space-between;align-items:center;margin-bottom:20px\">"
        + "<h3 style=\"margin:0;font-size:18px;color:#1a2e1a\">+ Novo Registro de Qualidade</h3>"
        + "<button onclick=\"document.getElementById('qualModal').remove()\" style=\"background:none;border:none;font-size:22px;cursor:pointer;color:#999\">&times;</button>"
        + "</div>"
        + "<div style=\"margin-bottom:12px\"><label style=\"display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px\">Safra *</label>"
        + "<select id=\"qualSafraId\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\"><option value=\"\">Selecione...</option>"+safOpts+"</select></div>"
        + "<div style=\"margin-bottom:12px\"><label style=\"display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px\">Cultura *</label>"
        + "<select id=\"qualCultSel\" onchange=\"window._qualCultChange()\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\">"+cultOptsHTML+"</select></div>"
        + "<div id=\"qualDynFields\">"+fieldsHTML+"</div>"
        + "<div style=\"margin-bottom:12px\"><label style=\"display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px\">Data do Registro *</label>"
        + "<input type=\"date\" id=\"qualDataReg\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px\" value=\"2026-05-06\"/></div>"
        + "<div style=\"margin-bottom:20px\"><label style=\"display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px\">Observacoes</label>"
        + "<textarea id=\"qualObs\" rows=\"2\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box;resize:vertical\"></textarea></div>"
        + "<div style=\"display:flex;gap:10px;justify-content:flex-end\">"
        + "<button onclick=\"document.getElementById('qualModal').remove()\" style=\"padding:10px 20px;border:1px solid #ddd;border-radius:8px;cursor:pointer;background:#fff\">Cancelar</button>"
        + "<button onclick=\"window._qualSave()\" style=\"padding:10px 20px;background:#1a2e1a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:600\">Salvar</button>"
        + "</div></div>";
      document.body.appendChild(modal);
    };

    window._qualCultChange = function() {
      var cult = document.getElementById("qualCultSel").value;
      var fields = culturaFields[cult] || [];
      var html = "";
      fields.forEach(function(fd){
        html += "<div style=\"margin-bottom:12px\"><label style=\"display:block;font-size:12px;font-weight:600;color:#333;margin-bottom:4px\">"+fd.l+"</label>";
        html += "<input type=\"number\" step=\"0.01\" id=\"qualFld_"+fd.k+"\" placeholder=\"Valor...\" style=\"width:100%;padding:8px;border:1px solid #ddd;border-radius:6px;box-sizing:border-box\"/></div>";
      });
      document.getElementById("qualDynFields").innerHTML = html;
    };

    window._qualSave = async function() {
      var safraId = document.getElementById("qualSafraId").value;
      var cult = document.getElementById("qualCultSel").value;
      var dataReg = document.getElementById("qualDataReg").value;
      var obs = document.getElementById("qualObs").value;
      if (!safraId || !dataReg) { alert("Safra e data sao obrigatorios"); return; }
      var safra = safras.find(function(s){ return s.id === safraId; });
      var fazId = safra ? safra.fazenda_id : null;
      var dadosQ = {};
      var fields = culturaFields[cult] || [];
      fields.forEach(function(fd){ var el=document.getElementById("qualFld_"+fd.k); if(el&&el.value!=="") dadosQ[fd.k]=parseFloat(el.value); });
      var btn = document.querySelector("#qualModal button[onclick*=qualSave]");
      if(btn) btn.textContent = "Salvando...";
      var res = await sb.from("qualidade_registro").insert({
        fazenda_id: fazId,
        safra_id: safraId,
        cultura: cult,
        data_registro: dataReg,
        dados_qualidade: dadosQ,
        observacoes: obs || null
      });
      if (res.error) { alert("Erro ao salvar: " + res.error.message); if(btn) btn.textContent="Salvar"; return; }
      // Reload
      var modal = document.getElementById("qualModal");
      if(modal) modal.remove();
      var qRes2 = await sb.from("qualidade_registro").select("*,fazendas(nome),safras(nome,cultura,ano_agricola)").order("data_registro",{ascending:false});
      registros = (qRes2.error) ? registros : (qRes2.data || []);
      renderQualidade();
    };

    window._qualDelete = async function(id) {
      if (!confirm("Excluir este registro de qualidade?")) return;
      await sb.from("qualidade_registro").delete().eq("id", id);
      registros = registros.filter(function(r){ return r.id !== id; });
      renderQualidade();
    };

    renderQualidade();
  }
};
