"use client";

// Guia do usuario: por onde comecar, cada modulo explicado,
// FAQ e troubleshooting. Pagina unica com navegacao por ancora
// pra ficar facil de imprimir/compartilhar.

import { useState } from "react";
import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";

type Secao = {
  id: string;
  titulo: string;
  icone: string;
};

const SECOES: Secao[] = [
  { id: "comecar", titulo: "Por onde comecar", icone: "🚀" },
  { id: "fluxo", titulo: "Fluxo completo", icone: "🔄" },
  { id: "fazendas", titulo: "Fazendas", icone: "🏞️" },
  { id: "talhoes", titulo: "Talhoes", icone: "📐" },
  { id: "safras", titulo: "Safras", icone: "🌱" },
  { id: "lancamentos", titulo: "Lancamentos", icone: "📋" },
  { id: "insumos", titulo: "Insumos e estoque", icone: "📦" },
  { id: "vendas", titulo: "Vendas de graos", icone: "💵" },
  { id: "maquinas", titulo: "Maquinas", icone: "🚜" },
  { id: "qualidade", titulo: "Qualidade e certificacao", icone: "🏅" },
  { id: "fechamento", titulo: "Fechamento de safra", icone: "📈" },
  { id: "ia", titulo: "IA Operacional", icone: "🤖" },
  { id: "cotacoes", titulo: "Cotacoes em tempo real", icone: "💹" },
  { id: "offline", titulo: "App de campo offline", icone: "📱" },
  { id: "instalar-pwa", titulo: "Como instalar no celular", icone: "⬇️" },
  { id: "faq", titulo: "Perguntas frequentes", icone: "❓" },
  { id: "troubleshooting", titulo: "Resolvendo problemas", icone: "🛠️" },
];

export default function GuiaPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Guia do JA Agrotec"
        icone="📖"
        subtitulo="Tudo o que voce precisa pra usar bem o sistema"
      />

      {/* Indice navegavel */}
      <div className="card">
        <h3 className="mb-3">Sumario</h3>
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}
        >
          {SECOES.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              className="flex items-center gap-2 p-2 rounded hover:bg-ja-green-bg text-sm"
              style={{ color: "var(--text)" }}
            >
              <span style={{ fontSize: 18 }}>{s.icone}</span>
              <span>{s.titulo}</span>
            </a>
          ))}
        </div>
      </div>

      {/* Secoes */}
      <Comecar />
      <Fluxo />
      <Modulo
        id="fazendas"
        icone="🏞️"
        titulo="Fazendas"
        descricao="Sua propriedade rural. Tudo no sistema fica vinculado a uma fazenda."
        comoUsar={[
          "Acesse Fazendas > + Nova Fazenda no menu lateral.",
          "Informe nome, cidade, estado e area total.",
          "Outros campos (proprietario, CNPJ, certificacao) sao opcionais e podem ser preenchidos depois.",
          "Quantas voce pode cadastrar depende do seu plano: Pequeno=1, Medio=3, Grande=8, Ilimitado=sem limite.",
        ]}
        atalho="/fazendas"
      />
      <Modulo
        id="talhoes"
        icone="📐"
        titulo="Talhoes"
        descricao="Areas de plantio dentro da fazenda. Cada talhao tem uma cultura, um tamanho e pode ter irrigacao."
        comoUsar={[
          "Talhoes > + Novo Talhao.",
          "Selecione a fazenda, de um nome (ex: 'Talhao Norte' ou 'TA-Cafe Arabica'), informe a area em hectares.",
          "Defina a cultura atual (cafe, soja, milho, etc) - isso vira a referencia padrao quando voce lancar despesas ou criar safra desse talhao.",
          "Marque 'Irrigado' se aplica - aparece no card resumo da fazenda.",
        ]}
        atalho="/talhoes"
      />
      <Modulo
        id="safras"
        icone="🌱"
        titulo="Safras"
        descricao="Agrupador do ciclo produtivo. Toda despesa e receita do mesmo plantio fica linkada a uma safra."
        comoUsar={[
          "Safras > + Nova Safra.",
          "Nome (ex: 'Safra Cafe 2026'), cultura, ano agricola e fazenda.",
          "Data de plantio e data de colheita prevista - usadas pra calcular meses da safra (rateio de depreciacao e despesas fixas).",
          "Area em hectares - usada nos calculos por hectare (produtividade, custo/ha).",
          "Status: planejamento -> aberta -> encerrada (no Fechamento) -> cancelada.",
        ]}
        atalho="/safras"
      />
      <Modulo
        id="lancamentos"
        icone="📋"
        titulo="Lancamentos"
        descricao="Cada despesa ou receita vai aqui. E a base de tudo: custo da safra, decremento de estoque, indicadores."
        comoUsar={[
          "Atividades > + Novo Lancamento.",
          "Escolha Tipo: Despesa ou Receita.",
          "Categoria: aparecem so as relevantes pro tipo escolhido. Algumas categorias (defensivos, fertilizantes, sementes) pedem que voce selecione tambem o Insumo.",
          "Selecione fazenda, safra e talhao - o sistema filtra opcoes validas em cada dropdown.",
          "Para despesa com insumo: ao salvar, o estoque do insumo cai automaticamente pela quantidade informada.",
        ]}
        atalho="/lancamentos"
      />
      <Modulo
        id="insumos"
        icone="📦"
        titulo="Insumos e estoque"
        descricao="Defensivos, fertilizantes, sementes, etc. O estoque atualiza sozinho quando voce lanca despesa."
        comoUsar={[
          "Meus Insumos > + Novo Insumo.",
          "Nome, categoria, unidade (KG, L, SC, etc), fazenda dona, preco unitario, estoque atual.",
          "Estoque minimo: quando o atual cai abaixo, aparece em Alertas e dispara recomendacao na IA.",
          "Lancamentos com insumo decremento estoque - voce nao precisa controlar manualmente.",
        ]}
        atalho="/insumos"
      />
      <Modulo
        id="vendas"
        icone="💵"
        titulo="Vendas de graos"
        descricao="Contratos de venda com comprador, quantidade, preco, status de entrega."
        comoUsar={[
          "Contratos & Vendas > + Nova Venda.",
          "Selecione fazenda (filtra safras disponiveis) e safra (autopreenche cultura).",
          "Tipo do contrato: disponivel, forward, troca, fixacao, CBOT, exportacao.",
          "Quantidade em sacas, preco por saca em R$.",
          "Status: aberto -> parcialmente entregue -> entregue. Use Entregas para registrar cada caminhao.",
        ]}
        atalho="/vendas-graos"
      />
      <Modulo
        id="maquinas"
        icone="🚜"
        titulo="Maquinas e equipamentos"
        descricao="Tratores, colheitadeiras, pulverizadores, veiculos. Suportam depreciacao linha-reta no Fechamento."
        comoUsar={[
          "Maquinas > + Nova Maquina.",
          "Nome, tipo, fabricante, modelo, ano, placa, numero de serie, horimetro atual.",
          "Bloco opcional 'Depreciacao': valor de aquisicao, vida util em anos, valor residual. Quando preenchido, entra como custo no Fechamento da Safra.",
          "Manutencoes: clique em 'Registrar Manutencao' em cada maquina - preventiva/corretiva/revisao, com data, horimetro e custo.",
        ]}
        atalho="/maquinas"
      />
      <Modulo
        id="qualidade"
        icone="🏅"
        titulo="Qualidade e certificacao"
        descricao="Registros de qualidade por lote, analises de solo, checklists de certificacao."
        comoUsar={[
          "Qualidade de Lotes: parametros por cultura (umidade, impureza, ardidos pra cafe; PH e teor pra soja, etc).",
          "Analise de Solo: registre laudos com PH, materia organica, macro e micronutrientes - serve pra plano de adubacao.",
          "Certificacao: checklists com itens individuais (organico, GlobalGAP, Rainforest). Cada item vira uma linha de status: pendente, ok, nao conforme, nao aplicavel.",
        ]}
        atalho="/qualidade-lotes"
      />
      <Modulo
        id="fechamento"
        icone="📈"
        titulo="Fechamento de safra"
        descricao="Encerra o ciclo, calcula custo real (lancamentos + depreciacao + despesas fixas rateadas), ROI, custo/ha e custo/saca. Gera PDF."
        comoUsar={[
          "Encerramento Safra > Novo Fechamento.",
          "Selecione a safra aberta - o sistema mostra o calculo automatico baseado em lancamentos linkados.",
          "Informe a producao em sacas. Receita autopreenche (soma de receitas lancadas) mas pode ser sobrescrita.",
          "O card de calculo mostra a decomposicao: Lancamentos + Depreciacao + Despesas fixas = Custo total.",
          "Ao confirmar, a safra vai pra status 'encerrada' e voce pode baixar o PDF na aba Lista de Fechamentos.",
        ]}
        atalho="/fechamento-safra"
      />
      <Modulo
        id="ia"
        icone="🤖"
        titulo="IA Operacional"
        descricao="Analise automatica dos seus dados via Claude AI. Sugere oportunidades, identifica riscos e prioriza acoes."
        comoUsar={[
          "Inicio > IA Operacional. Selecione a fazenda (ou 'Todas') e o periodo.",
          "A IA olha lancamentos, safras, vendas, insumos e talhoes; devolve 3 listas: Oportunidades, Riscos, Acoes prioritarias.",
          "Cada item tem prioridade (alta/media/baixa) e link pro modulo relevante.",
          "Se a IA estiver indisponivel, o sistema cai automaticamente pra heuristicas locais (regras hardcoded). Badge no topo indica qual fonte foi usada.",
        ]}
        atalho="/ia-operacional"
      />
      <Modulo
        id="cotacoes"
        icone="💹"
        titulo="Cotacoes em tempo real"
        descricao="Precos intraday da CBOT/ICE convertidos pra R$/saca via USD/BRL."
        comoUsar={[
          "Aparecem no card 'Cotacoes' da home, uma linha por cultura da fazenda.",
          "Mostra preco estimado em R$/saca (60kg) + variacao do dia + badge de idade do dado.",
          "Botoes laterais: 'CEPEA' abre o preco fisico oficial; 'Tempo real' abre o grafico TradingView pra confirmacao.",
          "Importante: nossa cotacao e baseada em futuros internacionais x dolar. Nao inclui o basis brasileiro (premio/desconto regional). Pra preco de venda exato, use CEPEA fisico.",
        ]}
        atalho="/home"
      />
      <Modulo
        id="offline"
        icone="📱"
        titulo="App de campo offline (PWA do Operador)"
        descricao="Operadores cadastrados como role='operador' acessam /operador - PWA offline-first pra registrar lancamentos no campo sem internet. Pode ser instalada na tela inicial do celular como app nativo."
        comoUsar={[
          "Voce (admin) cadastra o operador em Membros da Fazenda > + Novo Membro > role 'Operador'.",
          "Repassa pro operador: email + senha + link da plataforma.",
          "Operador entra em produtor.ja-agrotec.com.br pelo navegador do celular.",
          "Apos login, ele e levado direto pro /operador (sem onboarding).",
          "Aparece banner amarelo no topo: 'Instale o app no celular' com botao Instalar.",
          "No Android: 1 toque no botao Instalar instala a PWA.",
          "No iPhone (Safari): banner mostra instrucoes - tocar em Compartilhar > Adicionar a Tela de Inicio.",
          "Depois de instalado, abre direto pelo icone da tela inicial.",
        ]}
        atalho={null}
      />

      <section id="instalar-pwa" className="card">
        <h2 className="flex items-center gap-2" style={{ marginBottom: 6 }}>
          <span>⬇️</span> Como instalar o app do Operador no celular
        </h2>
        <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
          Apos o primeiro login do operador, o sistema oferece automaticamente
          a instalacao. Mas se o banner foi dispensado ou nao aparece, abaixo
          o passo-a-passo manual.
        </p>

        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
          {/* Android */}
          <div className="rounded-ja p-3" style={{ background: "var(--green-bg)" }}>
            <div className="font-semibold text-sm mb-2" style={{ color: "var(--text)" }}>
              🤖 Android (Chrome, Edge, Samsung Internet)
            </div>
            <ol className="text-sm space-y-1" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
              <li>Abra produtor.ja-agrotec.com.br no Chrome do celular.</li>
              <li>Faca login com email e senha do operador.</li>
              <li>No banner amarelo do topo, toque em <b>Instalar</b>.</li>
              <li>Confirme no popup do navegador.</li>
              <li>Aparece o icone na tela inicial.</li>
            </ol>
            <div className="text-xs mt-2" style={{ color: "var(--dim)" }}>
              Sem banner? Menu do navegador (...) &gt; <b>Instalar aplicativo</b> ou <b>Adicionar a tela inicial</b>.
            </div>
          </div>

          {/* iPhone */}
          <div className="rounded-ja p-3" style={{ background: "var(--green-bg)" }}>
            <div className="font-semibold text-sm mb-2" style={{ color: "var(--text)" }}>
              🍎 iPhone / iPad (Safari)
            </div>
            <ol className="text-sm space-y-1" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
              <li>Abra produtor.ja-agrotec.com.br no <b>Safari</b> (nao Chrome).</li>
              <li>Faca login com email e senha do operador.</li>
              <li>Toque no icone <b>Compartilhar</b> ⬆️ na barra inferior.</li>
              <li>Role e toque em <b>Adicionar a Tela de Inicio</b>.</li>
              <li>Toque em <b>Adicionar</b> no canto superior direito.</li>
            </ol>
            <div className="text-xs mt-2" style={{ color: "var(--dim)" }}>
              No iPhone, PWA so funciona pelo Safari (limitacao da Apple).
            </div>
          </div>

          {/* Desktop */}
          <div className="rounded-ja p-3" style={{ background: "var(--green-bg)" }}>
            <div className="font-semibold text-sm mb-2" style={{ color: "var(--text)" }}>
              💻 Computador (Chrome, Edge)
            </div>
            <ol className="text-sm space-y-1" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
              <li>Abra produtor.ja-agrotec.com.br.</li>
              <li>Faca login.</li>
              <li>Icone de instalacao aparece na barra de endereco (direita).</li>
              <li>Clique no icone e em <b>Instalar</b>.</li>
            </ol>
            <div className="text-xs mt-2" style={{ color: "var(--dim)" }}>
              Mesmo no desktop, o PWA salva lancamentos offline em caso de queda de internet.
            </div>
          </div>
        </div>

        <div
          className="mt-4 p-3 rounded text-xs"
          style={{ background: "#fff8e1", border: "1px solid #ffe082", color: "#5d4037" }}
        >
          <b>Importante</b>: o primeiro acesso precisa de internet pra baixar
          o cache de referencias (fazenda, talhoes, categorias, insumos).
          Depois disso, o operador pode lancar despesas mesmo sem sinal -
          a fila local sincroniza automaticamente quando voltar online.
        </div>
      </section>

      <FAQ />
      <Troubleshooting />

      <div className="card text-center text-sm" style={{ color: "var(--muted)" }}>
        Nao achou o que procurava?{" "}
        <a href="mailto:contato@ja-agrotec.com.br" style={{ color: "var(--green)" }}>
          contato@ja-agrotec.com.br
        </a>
      </div>
    </div>
  );
}

function Comecar() {
  return (
    <section id="comecar" className="card">
      <h2 className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span>🚀</span> Por onde comecar
      </h2>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>
        Voce acabou de criar a conta. Se ainda nao passou pelo onboarding,
        ele dispara automaticamente na sua primeira entrada. Caminho recomendado
        de uso real:
      </p>
      <ol className="space-y-2 text-sm" style={{ marginLeft: 18, listStyleType: "decimal" }}>
        <li><b>Cadastre sua fazenda</b> (caso ainda nao tenha feito no onboarding) - <Link href="/fazendas" style={{ color: "var(--green)" }}>Fazendas</Link></li>
        <li><b>Divida em talhoes</b> - cada area de plantio com cultura atual - <Link href="/talhoes" style={{ color: "var(--green)" }}>Talhoes</Link></li>
        <li><b>Crie uma safra</b> - vincula plantio, cultura, periodo - <Link href="/safras" style={{ color: "var(--green)" }}>Safras</Link></li>
        <li><b>Cadastre seus insumos</b> com estoque atual e minimo - <Link href="/insumos" style={{ color: "var(--green)" }}>Insumos</Link></li>
        <li><b>Lance despesas e receitas</b> ao longo do ciclo - <Link href="/lancamentos" style={{ color: "var(--green)" }}>Atividades</Link></li>
        <li><b>Registre vendas</b> conforme fechar contratos - <Link href="/vendas-graos" style={{ color: "var(--green)" }}>Vendas</Link></li>
        <li><b>Acompanhe</b> pelo dashboard e IA Operacional - <Link href="/home" style={{ color: "var(--green)" }}>Home</Link></li>
        <li><b>Feche a safra</b> ao fim do ciclo pra apurar ROI e gerar PDF - <Link href="/fechamento-safra" style={{ color: "var(--green)" }}>Fechamento</Link></li>
      </ol>
    </section>
  );
}

function Fluxo() {
  const fluxos = [
    { de: "Cadastrar fazenda", para: "Talhoes" },
    { de: "Talhoes", para: "Safra" },
    { de: "Safra + Insumos", para: "Lancamentos" },
    { de: "Colheita", para: "Vendas" },
    { de: "Fim do ciclo", para: "Fechamento" },
  ];
  return (
    <section id="fluxo" className="card">
      <h2 className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span>🔄</span> Fluxo completo de uma safra
      </h2>
      <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        {fluxos.map((f, i) => (
          <div key={i} className="text-center">
            <div className="rounded-ja p-3" style={{ background: "var(--green-bg)" }}>
              <div className="text-xs" style={{ color: "var(--dim)" }}>Etapa {i + 1}</div>
              <div className="font-semibold mt-1 text-sm">{f.de}</div>
              <div className="text-xs mt-1" style={{ color: "var(--muted)" }}>→ {f.para}</div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Modulo({
  id, icone, titulo, descricao, comoUsar, atalho,
}: {
  id: string;
  icone: string;
  titulo: string;
  descricao: string;
  comoUsar: string[];
  atalho: string | null;
}) {
  return (
    <section id={id} className="card">
      <h2 className="flex items-center gap-2" style={{ marginBottom: 6 }}>
        <span>{icone}</span> {titulo}
        {atalho && (
          <Link
            href={atalho}
            style={{ color: "var(--green)", fontSize: 12, marginLeft: "auto", fontWeight: 400 }}
          >
            Abrir →
          </Link>
        )}
      </h2>
      <p className="text-sm mb-3" style={{ color: "var(--muted)" }}>{descricao}</p>
      <div className="text-sm font-semibold mb-1" style={{ color: "var(--dark)" }}>Como usar</div>
      <ul className="text-sm space-y-1" style={{ marginLeft: 18, listStyleType: "disc", color: "var(--text)" }}>
        {comoUsar.map((p, i) => <li key={i}>{p}</li>)}
      </ul>
    </section>
  );
}

function FAQ() {
  const itens = [
    {
      q: "Esqueci minha senha. Como recupero?",
      a: "Na tela de login, clique em 'Esqueci minha senha', informe o email e voce recebe um link pra definir uma nova. O link vale 1 hora.",
    },
    {
      q: "Por que nao consigo cadastrar mais uma fazenda?",
      a: "Seu plano tem limite. O badge no topo da pagina Fazendas mostra quantas voce ja usou. Para upgrade, entre em contato pelo email contato@ja-agrotec.com.br.",
    },
    {
      q: "O estoque do insumo nao bate. Por que?",
      a: "Estoque cai automaticamente quando voce lanca despesa com insumo_id + quantidade + tipo='despesa'. Se voce reembolsou ou nao consumiu, ajuste manualmente em Meus Insumos > editar > Estoque atual.",
    },
    {
      q: "Como funciona o calculo de ROI no Fechamento?",
      a: "ROI = (Receita - Custo) / Custo x 100. Custo soma 3 fontes: lancamentos de despesa, depreciacao das maquinas da fazenda (linha reta x meses da safra) e despesas fixas rateadas (valor mensal x meses).",
    },
    {
      q: "Posso usar offline?",
      a: "Sim. O modulo /operador e PWA com fila offline. Operadores criam lancamentos sem internet e o sistema sincroniza ao voltar online. Admins (gestao) precisam de internet pra carregar dados.",
    },
    {
      q: "As cotacoes sao oficiais?",
      a: "Nao. Sao estimativas baseadas em futuros CBOT/ICE x USD/BRL, intraday. Pra preco de venda real, sempre confirme com CEPEA fisico ou seu corretor. Use os botoes CEPEA/Tempo Real no card.",
    },
    {
      q: "Operador pode ver dados financeiros?",
      a: "Nao. Operador so acessa /operador (app de campo de lancamentos). Para visualizacao sem edicao, use o papel 'Visualizador'.",
    },
    {
      q: "Como adiciono um colega de trabalho?",
      a: "Configuracoes > Membros da Fazenda > + Novo Membro. Defina nome, email, papel (gerente, operador ou visualizador), e senha inicial. O membro fica vinculado a sua fazenda.",
    },
    {
      q: "O sistema funciona offline?",
      a: "Apenas o /operador (app de campo). Os modulos administrativos exigem internet pra ler/escrever no banco.",
    },
    {
      q: "Meus dados ficam seguros?",
      a: "Conexao HTTPS, senhas com hash bcrypt, Row-Level Security no banco (cada cliente so ve sua fazenda), backups diarios. Detalhes na Politica de Privacidade.",
    },
  ];
  return (
    <section id="faq" className="card">
      <h2 className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span>❓</span> Perguntas frequentes
      </h2>
      <div className="space-y-3">
        {itens.map((it, i) => (
          <details key={i} className="rounded-ja p-3" style={{ background: "var(--green-bg)" }}>
            <summary className="cursor-pointer font-semibold text-sm" style={{ color: "var(--text)" }}>
              {it.q}
            </summary>
            <p className="text-sm mt-2" style={{ color: "var(--muted)" }}>{it.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Troubleshooting() {
  const problemas = [
    {
      titulo: "A tela ficou em branco ou deu erro",
      passos: [
        "Recarregue a pagina (F5 ou puxe pra baixo no celular).",
        "Tente sair e entrar de novo no sistema.",
        "Se persistir, anote a mensagem de erro (em vermelho ou no canto), o navegador usado e a hora. Mande pro suporte por email.",
      ],
    },
    {
      titulo: "Salvei um lancamento mas nao aparece na lista",
      passos: [
        "Confira o filtro de fazenda no topo. Talvez ele esteja em uma fazenda diferente.",
        "Confira o filtro de periodo, se houver. Lancamentos fora do periodo nao aparecem.",
        "Se acabou de salvar, recarregue a pagina.",
      ],
    },
    {
      titulo: "Botao 'Nova fazenda' esta desabilitado",
      passos: [
        "Voce atingiu o limite do plano. O texto cinza no botao mostra o motivo.",
        "Para aumentar limite, entre em contato pelo email pra fazer upgrade.",
      ],
    },
    {
      titulo: "Operador nao consegue entrar",
      passos: [
        "Confira em Membros da Fazenda se a conta esta marcada como Ativa.",
        "Verifique se o papel e 'operador' - outros papeis nao acessam /operador.",
        "Use o botao 'Reset senha' do admin pra disparar email de redefinicao.",
      ],
    },
    {
      titulo: "Cotacoes nao aparecem ou estao zeradas",
      passos: [
        "Cotacoes dependem de API externa - se ela cair, o card fica vazio temporariamente.",
        "Verifique se sua fazenda tem safras cadastradas com cultura - sem cultura nao tem oque cotar.",
        "Tente recarregar. Se persistir, use os botoes CEPEA/Tempo real pra consulta direta.",
      ],
    },
    {
      titulo: "PDF do Fechamento nao baixa",
      passos: [
        "Verifique se o navegador esta bloqueando download (icone na barra de URL).",
        "Tente em outro navegador (Chrome ou Edge).",
        "Se for celular, abra o sistema no desktop pra exportar PDF (mobile tem limitacoes).",
      ],
    },
    {
      titulo: "IA Operacional caiu em 'Heuristica local'",
      passos: [
        "A IA real (Claude) pode estar com instabilidade temporaria - o sistema cai automaticamente pro modo heuristico (regras locais), sem perda de funcionalidade.",
        "Tente recarregar a pagina em alguns minutos.",
        "Se persistir, mande email pra avisar.",
      ],
    },
  ];
  return (
    <section id="troubleshooting" className="card">
      <h2 className="flex items-center gap-2" style={{ marginBottom: 12 }}>
        <span>🛠️</span> Resolvendo problemas
      </h2>
      <div className="space-y-3">
        {problemas.map((p, i) => (
          <details key={i} className="rounded-ja p-3" style={{ background: "var(--green-bg)" }}>
            <summary className="cursor-pointer font-semibold text-sm" style={{ color: "var(--text)" }}>
              {p.titulo}
            </summary>
            <ol className="text-sm mt-2 space-y-1" style={{ marginLeft: 18, listStyleType: "decimal", color: "var(--muted)" }}>
              {p.passos.map((s, j) => <li key={j}>{s}</li>)}
            </ol>
          </details>
        ))}
      </div>
    </section>
  );
}
