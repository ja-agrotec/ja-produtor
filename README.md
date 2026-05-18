# JA Agrotec · Módulo Produtor

> Sistema de gestão da propriedade rural, parte do **ecossistema JA Agrotec**.

[![Live](https://img.shields.io/badge/live-GitHub%20Pages-7CB342)](https://alanjader.github.io/ja-agro/) [![Versão](https://img.shields.io/badge/versão-1.1.0-7CB342)]() [![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20JS%20%2B%20Supabase-1A2E1A)]()

## Sobre

Este é o **Módulo Produtor** do ecossistema **JA Agrotec**, uma plataforma digital integrada para o agronegócio composta por três aplicações que se conectam entre si:

| Módulo | Status | Descrição |
|---|---|---|
| 🌾 **Produtor** | ✅ Em produção (este repo) | Gestão da propriedade rural — safras, talhões, lançamentos, estoque, vendas |
| 🏛️ **Cooperativa** | 🚧 Em desenvolvimento | Gestão cooperativista — recebimento, classificação, comercialização |
| 📅 **Agenda** | 🚧 Em desenvolvimento | Programação operacional — calendário, manutenções, logística |

## Funcionalidades

22 módulos operacionais cobrindo todo o ciclo da propriedade rural:

- **Produção:** Safras, Talhões, Lançamentos (atividades), Qualidade de Lotes
- **Estoque:** Insumos com movimentação automática a partir das aplicações
- **Comercial:** Vendas de Grãos, Exportação, Despesas Fixas
- **Operacional:** Máquinas, Operadores, Manutenções, Fila Offline
- **Análise:** Painel Analítico, Resumo de Fazendas, IA Operacional
- **Documentos:** Certificações, Análise de Solo, Documentos
- **Configuração:** Usuários, Fazendas
- **Sobre:** Ajuda, História, Troubleshooting, Ecossistema, Changelog

## Stack

- **Front-end:** HTML5 + JavaScript vanilla (sem framework, sem build)
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **PWA:** manifest.json com tema visual, modo standalone
- **Deploy:** GitHub Pages (atual) ou Vercel (compatível, ver `vercel.json`)

## Deploy

### GitHub Pages (atual)
Push em `main` deploya automaticamente em https://alanjader.github.io/ja-agro/

### Vercel
1. Importe o repo em https://vercel.com/new
2. Framework Preset: **Other**
3. Build Command: *(vazio)*
4. Output Directory: `./`
5. Deploy

`vercel.json` já está pré-configurado com headers de segurança e cache control.

### Variáveis sensíveis
As chaves do Supabase em `config.js` são a `anon key` (segura para front, protegida por RLS). Nunca commite a `service_role key`.

## Documentação

- [`docs/TEST-MEMORY.md`](docs/TEST-MEMORY.md) — Playbook de QA, 15 bugs corrigidos, 53+ cenários de regressão
- [`docs/ECOSSISTEMA.md`](docs/ECOSSISTEMA.md) — Arquitetura do ecossistema JA Agrotec
- [`CHANGELOG.md`](CHANGELOG.md) — Histórico de versões

## Versão

**v1.1.0** — Maio 2026
- Rebranding completo: JA Agro Intelligence → JA Agrotec · Módulo Produtor
- Estrutura preparada para ecossistema (Produtor, Cooperativa, Agenda)
- Novo menu **Sobre** com Ajuda, História, Troubleshooting, Ecossistema, Changelog
- PWA com manifest.json
- 15 bugs corrigidos via QA estruturado

## Licença

Proprietária. © 2026 JA Agrotec. Todos os direitos reservados.
