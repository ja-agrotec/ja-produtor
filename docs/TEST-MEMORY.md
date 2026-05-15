# 🧪 JA Agro — Memória de Testes e Documentação de QA

> Documento vivo de QA. Use como referência inicial para qualquer nova bateria de testes manuais/automatizados do sistema JA Agro.
>
> **Última atualização:** 2026-05-15
> **Versão do app validada:** main @ commit fix25
> **Autor da bateria:** QA automatizado (Claude) + Alan Jader (PO/ADMIN)

---

## 1. Escopo e Ambiente

| Item | Valor |
|---|---|
| URL App | https://alanjader.github.io/ja-agro/admin.html |
| Repositório | https://github.com/alanjader/ja-agro |
| Backend | Supabase project `zpgabskeunywcgtojcrg` (ja-agenda) |
| Usuário ADMIN | Alan Jader |
| Fazenda padrão | Fazenda Águas Claras |
| Browser alvo | Chrome desktop (1568x653 viewport mínimo testado) |
| Estratégia de deploy | Commit direto em `main` (pré-produção) → GitHub Pages |
| Cache-buster | Querystring `?cb=fixNN` para forçar reload pós-deploy |

---

## 2. Módulos Cobertos (22/22)

**Operacionais:** Home/Dashboard, Safras, Plantio, Lançamentos, Estoque, Aplicações, Colheita, Vendas (Grãos), Exportação, Qualidades, Despesas Fixas, Manutenção, Funcionários, Frota, Insumos, Cadastros, Certificação, Clientes, Fornecedores, Relatórios, Usuários, Configurações.

**Prioridade ALTA** (sempre testar primeiro em qualquer regressão): Vendas, Exportação, Qualidades, Lançamentos, Estoque.

---

## 3. Histórico de Bugs Corrigidos (15 total)

### 3.1 Severidade ALTA

| # | Título | Causa raiz | Fix (commit) |
|---|---|---|---|
| 22 | Modal de edição de Lançamentos não pré-populava qtd/custo | Lógica usava apenas `l.maquina` para decidir o tipo; ignorava `l.unidade` (h/ha/d). Input `type=number` com atributo `value="..."` não popula via innerHTML no Chrome | Detectar modo via `l.unidade`; setar variáveis usaHA/usaDia + display wrappers; `setTimeout` forçando `el.value = el.getAttribute('value')`; flag `skipClear` em `_lanc_onCatChange` durante setup de edição (commits 0baf45a + c126d30 + skipClear) |
| 23 | Edição de Despesas Fixas não selecionava a categoria salva | Select tinha `<option>Texto</option>` sem `value`; comparação era case-sensitive; categorias do banco (Arrendamento, Tributos, Certificação) não existiam no array CATEGORIAS | Expandiu CATEGORIAS, adicionou `value="..."`, match case-insensitive (`matchExato`), opção `custom` para valores fora da lista |

### 3.2 Severidade MÉDIA

| # | Título | Causa raiz | Fix |
|---|---|---|---|
| 13 | KPIs de Vendas não reagiam aos filtros | KPIs eram renderizados uma única vez via template string; filtros só re-renderizavam a tabela | Adicionados IDs nos spans (vgKpiContratadoBox, vgKpiContratosBox, vgKpiEntregueBox, vgKpiEntregasBox, vgKpiSaldoBox, vgKpiPercBox, vgKpiReceitaBox, vgKpiPmBox); função `window._vgRecalcKpis(vendasF)` chamada de `_vgFiltrar` e `_vgLimparFiltros` |
| 14 | KPI "Área Total" em Safras gerava ambiguidade com Home | Mesmo rótulo para conceitos diferentes (área plantada nas safras vs área cadastrada das fazendas) | Renomeado para "Área Plantada" + subtítulo "(soma das safras)" |
| 15 | Lista de Usuários mostrava 1, Home mostrava 2 | Query filtrava `.neq('role','admin')` ocultando o próprio admin | Remoção do filtro |

### 3.3 Severidade BAIXA

| # | Título | Causa raiz | Fix |
|---|---|---|---|
| 21 | Topbar mantinha botões do módulo anterior ao navegar | `loadModule` em admin.html não limpava `#topbarActions` antes de chamar o módulo destino | Adicionado `topbarActions.innerHTML = ''` no início de loadModule |
| 25 | Caracteres corrompidos em Certificação (`âœ…`, `â€º`) | Bytes UTF-8 quebrados (3 bytes interpretados como Latin-1) | Replace via `String.fromCharCode` para `✅` (U+2705), `›` (U+203A), `‹` (U+2039) |
| 1-12 | Bugs históricos das sessões anteriores | Variados (filtros, máscaras, validações, KPIs, navegação) | 7 commits aplicados na sessão 1 |

---

## 4. Falsos Positivos / Decisões de Produto

| # | Suspeita | Conclusão |
|---|---|---|
| 18 | "Status entregue sem data_entrega" | A data fica em `entregas_graos.data_entrega` por entrega individual, não em `vendas_graos`. Comportamento correto. |
| 19 | Modal de Qtd com default vazio | `placeholder="0"` é UX intencional para o usuário digitar o valor. |
| 24 | KPIs de área inconsistentes entre telas | Cada KPI representa um conceito diferente (área das fazendas vs área das safras vs área plantada). Intencional. |

---

## 5. Padrões de Validação (Playbook)

### 5.1 Workflow para corrigir bug

1. Reproduzir manualmente no app com `?cb=novoTimestamp`.
2. Identificar o módulo e o arquivo JS (`/modules/admin-<modulo>.js`).
3. Buscar fonte atualizada via `fetch('https://raw.githubusercontent.com/alanjader/ja-agro/main/modules/...')`.
4. Construir patch como string em `window.__patched`.
5. Abrir GitHub editor em `/edit/main/modules/<arquivo>`.
6. Aplicar via CodeMirror 6: `document.querySelector('.cm-content').cmView.view.dispatch({changes:{from:0,to:view.state.doc.length,insert:src}})`.
7. Commit direto em `main` (autorizado, pré-produção).
8. Aguardar 15-20s para deploy do GitHub Pages.
9. Re-navegar com novo cache-buster e validar via DOM inspection + contagem.

### 5.2 Truques úteis aprendidos

- **Clipboard bloqueado no GitHub origin** → usar `fetch` direto do raw.githubusercontent.com.
- **CodeMirror trunca paste via Ctrl+V** → sempre usar `view.dispatch` com `from:0, to:state.doc.length`.
- **`<input type="number" value="...">` insere atributo mas `.value` continua vazio** → forçar via JS em `setTimeout(()=>el.value=el.getAttribute('value'), 0)`.
- **Modal de commit às vezes precisa 2 cliques** em `(1463,134)`.
- **Sempre limpar `#topbarActions`** antes de carregar um novo módulo.

---

## 6. Biblioteca de Cenários de Regressão (53+)

> Reusar em toda nova bateria. Marcar OK/NOK por cenário.

### 6.1 Vendas (Grãos) — 12 cenários
1. Listar todas as vendas → contar registros e validar KPIs.
2. Filtrar por status = aberto → recálculo dos 8 KPIs.
3. Filtrar por status = entregue → recálculo.
4. Filtrar por status = cancelado → recálculo.
5. Filtrar por fazenda → recálculo.
6. Limpar filtros → KPIs voltam ao total.
7. Criar nova venda com qtd parcial.
8. Editar venda existente preservando todos os campos.
9. Validar receita = quantidade × preço.
10. Validar saldo = contratado − entregue.
11. Validar % entregue.
12. Validar PM (preço médio).

### 6.2 Exportação — 6 cenários
1. Listar contratos de exportação.
2. Filtrar por cliente internacional.
3. Validar conversão de moeda (USD/BRL).
4. Inserção parcial: criar contrato sem entrega.
5. Atualizar status de embarque.
6. Cancelar contrato e verificar reflexo nos KPIs.

### 6.3 Qualidades — 5 cenários
1. Lançar análise de qualidade (umidade, impureza, ardidos).
2. Vincular qualidade a entrega de grãos.
3. Editar análise mantendo vínculo.
4. Excluir análise e validar que entrega não quebra.
5. Filtrar análises por safra.

### 6.4 Lançamentos — 8 cenários
1. Criar lançamento com máquina (custo/hora × horas).
2. Criar lançamento com mão-de-obra por hectare (custo/ha × ha).
3. Criar lançamento com diária (custo/dia × dias).
4. Editar lançamento existente → modal deve pré-popular qtd e custo corretamente.
5. Trocar categoria durante edição (skipClear deve preservar valores).
6. Validar total = qtd × custo.
7. Excluir lançamento.
8. Filtrar por safra e categoria.

### 6.5 Estoque — 6 cenários
1. Entrada de insumo.
2. Saída de insumo (consumo).
3. Saldo atualizado em tempo real.
4. Movimentação vinculada a aplicação.
5. Reversão de saída (estorno).
6. Filtrar por insumo e período.

### 6.6 Safras / Plantio / Colheita / Aplicações — 8 cenários
1. Criar safra com área.
2. Vincular plantio à safra.
3. KPI "Área Plantada" = soma das safras.
4. Lançar aplicação consumindo insumo do estoque.
5. Registrar colheita gerando entrada em vendas.
6. Editar safra recalcula KPIs.
7. Excluir plantio sem quebrar safra.
8. Validar reflexo no dashboard.

### 6.7 Cadastros base — 8 cenários
1. CRUD Clientes.
2. CRUD Fornecedores.
3. CRUD Insumos.
4. CRUD Funcionários.
5. CRUD Frota.
6. CRUD Despesas Fixas → categoria pré-populada na edição.
7. CRUD Certificação → ícones ✅ renderizando.
8. Usuários: contagem bate com Home.

---

## 7. Como Acionar Nova Bateria

Quando o usuário pedir uma nova rodada de testes:

1. Ler este documento na íntegra.
2. Executar a seção 6 (53+ cenários) marcando OK/NOK.
3. Para cada NOK: seguir o playbook da seção 5.1.
4. Atualizar este documento adicionando novos bugs em 3.x e novos cenários em 6.x.
5. Entregar relatório final consolidado com tabela de commits e resultados.

---

## 8. Histórico de Sessões

| Sessão | Commits | Bugs corrigidos | Cenários | Resultado |
|---|---|---|---|---|
| 1 | 7 | #1-12 (parcial) | ~30 | Bugs remanescentes catalogados |
| 2 | 8 | #13, #14, #15, #21, #22, #23, #25 | 53+ | **Zero bugs pendentes** |

---

_Fim do documento._
