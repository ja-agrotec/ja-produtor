# 🌐 Ecossistema JA Agrotec

> Arquitetura técnica do conjunto de aplicações que compõem o JA Agrotec.

## Visão Geral

O **JA Agrotec** é um ecossistema de **três aplicações independentes** que se integram via APIs para cobrir toda a cadeia do agronegócio:

```
┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
│   🌾 PRODUTOR    │◄────►│  🏛️ COOPERATIVA  │◄────►│   📅 AGENDA      │
│                  │      │                  │      │                  │
│ Gestão da        │      │ Gestão           │      │ Programação      │
│ propriedade      │      │ cooperativista   │      │ operacional      │
└──────────────────┘      └──────────────────┘      └──────────────────┘
        │                         │                         │
        ▼                         ▼                         ▼
   Supabase #1               Supabase #2               Supabase #3
   (ja-agro)                 (ja-coop)                 (ja-agenda)
```

## Princípios de Arquitetura

1. **Repositórios separados** — cada módulo tem seu próprio repositório no GitHub
2. **Projetos Supabase separados** — cada módulo tem seu próprio banco, auth e storage
3. **Integração via API** — comunicação entre módulos via endpoints públicos com autenticação
4. **Identidade visual unificada** — paleta verde (`#7CB342`) e tipografia compartilhadas
5. **Stack uniforme** — HTML + JS vanilla + Supabase em todos os módulos

## Módulos

### 🌾 Produtor
- **Repo:** github.com/alanjader/ja-agro
- **URL:** https://alanjader.github.io/ja-agro/
- **Supabase:** ja-agro (projeto atual)
- **Status:** ✅ Em produção, v1.1.0
- **Função:** Gestão completa da propriedade rural (safras, talhões, lançamentos, estoque, vendas, qualidade, certificação)

### 🏛️ Cooperativa
- **Repo:** *a criar* (sugestão: github.com/alanjader/ja-agrotec-cooperativa)
- **Supabase:** *a criar* (projeto separado)
- **Status:** 🚧 Em desenvolvimento
- **Função:** Recebimento de produção dos cooperados, classificação, armazenagem, comercialização agregada, prestação de contas
- **Integrações:** Recebe entregas do Produtor, envia retornos financeiros

### 📅 Agenda
- **Repo:** *a criar* (sugestão: github.com/alanjader/ja-agrotec-agenda)
- **Supabase:** *a criar* (projeto separado)
- **Status:** 🚧 Em desenvolvimento
- **Função:** Calendário operacional, manutenções preventivas, logística, calendário fitossanitário com alertas
- **Integrações:** Consulta safras do Produtor para programar atividades

## Pontos de Integração (futuros)

| Origem | Destino | O que é compartilhado |
|---|---|---|
| Produtor → Cooperativa | Entrega de grãos | Contrato, qtd, qualidade, fazenda, motorista |
| Cooperativa → Produtor | Liquidação | Preço final, descontos, prestação de contas |
| Produtor → Agenda | Plano de safra | Datas previstas de aplicação, colheita |
| Agenda → Produtor | Alertas | Janela ideal de aplicação, prazos críticos |

## Padrões Compartilhados

### Tema visual
```css
:root {
  --dark:  #1A2E1A;   /* Verde escuro (textos, headers) */
  --green: #7CB342;   /* Verde primário (botões, KPIs) */
  --green-lt: #A5D6A7; /* Verde claro (badges, hovers) */
  --bg:    #f4f7f2;   /* Background geral */
}
```

### Autenticação
Cada módulo tem seu próprio Supabase Auth. Para usuário ter acesso aos três módulos, precisa de cadastro em cada um (com mesmo email). Futuramente: SSO unificado.

### Tabelas de integração
Quando a integração for implementada, sugere-se uma tabela `integracoes` em cada projeto Supabase com:
```sql
id, modulo_origem, modulo_destino, payload (jsonb), status, criado_em, sincronizado_em
```

## Roadmap

| Trimestre | Marco |
|---|---|
| **Q2 2026** | ✅ Produtor v1.1.0 (atual) — rebranding + estrutura ecossistema |
| **Q3 2026** | 🚧 Cooperativa v1.0 — MVP de recebimento |
| **Q4 2026** | 🚧 Agenda v1.0 — MVP de calendário |
| **Q1 2027** | 🔮 Integração Produtor ↔ Cooperativa (entregas reais) |
| **Q2 2027** | 🔮 SSO unificado entre módulos |

## Decisões Arquiteturais

### Por que projetos Supabase separados?
- **Isolamento de dados:** cada cliente cooperativa tem seu próprio espaço; cada produtor tem o seu
- **Permissões granulares:** RLS específico por módulo, sem complicar com unions
- **Escalabilidade:** crescimento independente; um módulo lento não afeta os outros
- **Faturamento:** custos do Supabase atribuídos por módulo

### Por que sem framework?
- **Performance:** carga inicial < 200KB; carrega em conexões rurais lentas
- **Manutenção:** zero dependências quebrando, zero build steps
- **Curva de aprendizado:** qualquer dev web entende HTML + JS sem framework
- **Compatibilidade:** funciona em tablets antigos usados no campo

### Por que GitHub Pages (com possibilidade Vercel)?
- **Custo zero** para serving estático
- **Deploy automático** ao fazer push em main
- **Migração Vercel** trivial (sem build step), pré-configurada via `vercel.json`

---

_Documento vivo. Atualizado em maio/2026._
