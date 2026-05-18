# Design System — JA Agrotec · Módulo Produtor

> Prompt-fonte e referência visual do ecossistema **JA Agrotec** (módulos: Produtor, Cooperativa, Agenda).
> Cole este arquivo (ou o bloco de prompt abaixo) em qualquer IA (Claude, ChatGPT, Cursor, Lovable, v0, Figma AI, etc.) para gerar telas e componentes consistentes com a identidade.

---

## Prompt pronto para uso

```markdown
# Design System — JA Agrotec · Módulo Produtor

Você está gerando interface/código para o ecossistema **JA Agrotec** (módulos: Produtor, Cooperativa, Agenda).
Use **estritamente** a paleta, tokens e regras abaixo. Não invente cores.

## 1. Conceito visual
Identidade agro-tech "premium": verde escuro profundo + acentos verde-limão vibrante.
Sensação: confiável, técnica, orgânica, alto contraste, **dark headers + light content**.
Inspiração: dashboards SaaS modernos com toque rural (Linear + John Deere).

## 2. Tokens de cor (CSS variables — fonte de verdade)

```css
:root {
  /* Brand greens */
  --dark:      #1A2E1A;   /* verde-floresta — sidebar, topo, textos principais */
  --dark2:     #152615;   /* verde quase-preto — gradientes profundos */
  --green:     #7CB342;   /* verde-limão — cor primária de ação, logo "JA" */
  --green2:    #8BC34A;   /* verde-folha — hover, segundo plano de ação */
  --green-lt:  #A5D6A7;   /* verde claro — highlights, badges suaves */
  --green-dim: #4A5A4A;   /* verde acinzentado — labels secundárias na sidebar */
  --green-bg:  #f0f7eb;   /* verde quase-branco — fundo de seções destacadas */

  /* Neutros */
  --text:      #1A2E1A;
  --muted:     #5A7560;
  --dim:       #8fa892;
  --brd:       #dde8da;
  --bg:        #f4f7f2;
  --white:     #ffffff;

  /* Status */
  --danger:    #e53935;   --danger-lt: #fdf3f3;
  --warn:      #f57c00;   --warn-lt:   #fff8f0;
  --info:      #1565c0;   --info-lt:   #e8f0fe;
  --success:   #2e7d32;   --success-lt:#f0f7f0;

  /* Layout & form */
  --sidebar-w: 240px;
  --topbar-h:  60px;
  --r:         10px;
  --r-lg:      14px;
  --shadow:    0 2px 12px rgba(26,46,26,.08);
  --shadow-lg: 0 4px 24px rgba(26,46,26,.12);

  /* Tipografia */
  --f:  'Plus Jakarta Sans', sans-serif;
  --f2: 'Rajdhani', sans-serif;
}
```

## 3. Gradientes-assinatura

```css
/* Sidebar e hero principal */
background: linear-gradient(180deg, #1A2E1A 0%, #152615 100%);

/* Banner "Bom dia, Produtor" (com clima) */
background: linear-gradient(135deg, #1A2E1A 0%, #2d4a2d 100%);

/* Botão primário */
background: linear-gradient(135deg, #7CB342 0%, #8BC34A 100%);
```

## 4. Regras de aplicação

- **Sidebar**: fundo `--dark` → `--dark2`, texto `--white`, item ativo com barra lateral `--green`.
- **Logo "JA"**: badge `--green` em fundo escuro, ou `--dark` em fundo claro.
- **Cards KPI**: fundo `--white`, borda `--brd`, número grande em `--f2` (Rajdhani) na cor da categoria, **barra de acento inferior de 3px** colorida (verde/laranja/vermelho/azul/roxo).
- **Tabelas**: header em `--green-bg`, linhas zebradas com `--white` e `#fafcf8`, hover `--green-lt` a 30%.
- **Botões**:
  - Primário: gradiente verde-limão, texto `--white`.
  - Secundário: outline `--green`, texto `--green`.
  - Destrutivo: `--danger` sólido.
- **Inputs**: borda `--brd`, focus ring `--green` (2px), radius `--r`.
- **Badges/chips de status**: fundo `--{cor}-lt`, texto `--{cor}`, sem borda.
- **Sombras**: usar somente `--shadow` (cards) e `--shadow-lg` (modais/dropdowns).

## 5. Tipografia

- Família principal: **Plus Jakarta Sans** (300, 400, 500, 600, 700).
- Família de destaque (números, títulos de KPI, sigla "JA AGROTEC"): **Rajdhani** (500, 600, 700).
- Tamanhos: H1 28px / H2 22px / H3 18px / body 14px / small 12px.
- Letra-espaçamento `0.5px` em CAPS (subtítulos da sidebar tipo "VISÃO GERAL").

## 6. Iconografia & emojis

- Ícones em linha (stroke 1.5–2px), cor herdada do contexto.
- Emojis temáticos permitidos em títulos de seção (🌾 🚜 🌱 📊 💧 ☁️).
- Bandeira/clima no topo: ícones outline coloridos suaves.

## 7. Não fazer

- ❌ Não usar verde puro `#00FF00`, verde-água, teal ou esmeralda.
- ❌ Não usar fundo preto puro `#000`.
- ❌ Não usar gradientes coloridos (rosa, roxo, etc.) — somente verdes.
- ❌ Não usar bordas de 2px+; manter 1px com `--brd`.
- ❌ Não usar radius > 16px; o design é geométrico-suave, não "pill".

## 8. Tom de voz nos textos

PT-BR, direto, próximo do produtor rural mas técnico quando necessário.
Exemplos: "Bom dia, Produtor!", "Visão geral da fazenda", "Estoque crítico", "Em andamento".

---

**Tarefa:** [DESCREVA AQUI O QUE VOCÊ QUER GERAR — ex.: "uma tela de cadastro de talhão", "um componente de card de safra", "um e-mail transacional de confirmação de venda"].

Gere respeitando 100% os tokens acima.
```

---

## Notas internas

- Fonte de verdade dos tokens: `admin.html` e `index.html` (bloco `:root`).
- Ao adicionar nova cor, atualizar **primeiro** este arquivo e depois o CSS.
- Cooperativa e Agenda devem **herdar a mesma paleta** — muda apenas o subtítulo do módulo na sidebar.
