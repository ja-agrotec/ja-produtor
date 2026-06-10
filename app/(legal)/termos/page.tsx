export const metadata = { title: "Termos de Uso · JA Agrotec" };

const ATUALIZACAO = "10 de junho de 2026";

export default function TermosPage() {
  return (
    <article className="prose-legal">
      <h1>Termos de Uso</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Ultima atualizacao: {ATUALIZACAO}
      </p>

      <p>
        Estes Termos de Uso regulam o acesso e a utilizacao da plataforma{" "}
        <b>JA Agrotec - Modulo Produtor</b> (a &quot;Plataforma&quot;), oferecida por JA
        Agrotec (&quot;nos&quot;, &quot;nosso&quot;). Ao criar uma conta ou utilizar a Plataforma, voce
        declara ter lido, entendido e concorda integralmente com estes Termos e com
        a nossa <a href="/privacidade">Politica de Privacidade</a>.
      </p>

      <h2>1. Sobre o servico</h2>
      <p>
        A Plataforma e um software de gestao agropecuaria entregue como
        servico (SaaS) acessivel via navegador web e aplicativo PWA (Progressive
        Web App). Permite cadastro de fazendas, talhoes, safras, lancamentos
        financeiros, controle de estoque de insumos, vendas de graos, qualidade,
        certificacoes, documentos e geracao de relatorios.
      </p>
      <p>
        A Plataforma esta em estado de <b>BETA</b>. Funcionalidades podem mudar,
        ser adicionadas ou removidas sem aviso previo. Recomendamos exportar os
        dados periodicamente.
      </p>

      <h2>2. Cadastro e conta</h2>
      <ul>
        <li>O usuario fornece informacoes verdadeiras e atualizadas ao criar a conta.</li>
        <li>O usuario e responsavel por manter a confidencialidade de sua senha.</li>
        <li>O usuario notifica imediatamente qualquer uso nao autorizado da conta.</li>
        <li>Reservamos o direito de suspender contas que descumpram estes Termos.</li>
      </ul>

      <h2>3. Uso aceitavel</h2>
      <p>O usuario concorda em NAO:</p>
      <ul>
        <li>Usar a Plataforma para qualquer finalidade ilegal ou nao autorizada.</li>
        <li>Tentar acessar contas de outros usuarios.</li>
        <li>Fazer engenharia reversa, descompilar ou tentar extrair codigo-fonte.</li>
        <li>Usar bots ou automacoes que sobrecarreguem a Plataforma.</li>
        <li>Inserir conteudo malicioso, vulgar, ofensivo ou que viole direitos de terceiros.</li>
      </ul>

      <h2>4. Dados do usuario</h2>
      <p>
        Todos os dados inseridos na Plataforma (cadastros de fazendas, lancamentos,
        documentos, etc.) <b>permanecem de propriedade do usuario</b>. Atuamos
        somente como operadores tecnicos para armazenar e processar essas
        informacoes em nome do usuario.
      </p>
      <p>
        O tratamento de dados pessoais segue a{" "}
        <a href="/privacidade">Politica de Privacidade</a>, em conformidade com a
        Lei Geral de Protecao de Dados (Lei 13.709/2018 - LGPD).
      </p>

      <h2>5. Disponibilidade e SLAs</h2>
      <p>
        A Plataforma e fornecida no formato <b>&quot;como esta&quot;</b>, sem garantia
        formal de disponibilidade ininterrupta. Buscamos manter uptime alto, mas
        nao oferecemos SLA contratual nesta fase BETA. Manutencoes programadas
        podem ocorrer sem aviso previo.
      </p>

      <h2>6. Limitacao de responsabilidade</h2>
      <p>
        A Plataforma e ferramenta de apoio a gestao. As <b>decisoes operacionais,
        financeiras e tecnicas</b> sobre a propriedade rural sao de inteira
        responsabilidade do usuario.
      </p>
      <p>
        Recomendacoes geradas pela IA Operacional, cotacoes de mercado e
        previsoes climaticas exibidas sao informacoes <b>indicativas</b>, baseadas
        em fontes externas, e podem conter atrasos ou erros. NAO substituem
        consulta a agronomo, contador, corretor ou meteorologista profissional.
      </p>
      <p>
        Nao nos responsabilizamos por prejuizos decorrentes de:
      </p>
      <ul>
        <li>Decisoes tomadas com base em informacoes da Plataforma.</li>
        <li>Indisponibilidade temporaria do servico.</li>
        <li>Perda de dados causada por terceiros (provedores de infraestrutura).</li>
        <li>Uso inadequado da Plataforma.</li>
      </ul>

      <h2>7. Propriedade intelectual</h2>
      <p>
        O codigo-fonte, design, marca, logotipos e demais elementos da Plataforma
        sao de propriedade de JA Agrotec. O usuario recebe apenas licenca de uso
        nao exclusiva, intransferivel e revogavel, durante o periodo de assinatura
        ou utilizacao.
      </p>

      <h2>8. Modificacao destes Termos</h2>
      <p>
        Podemos atualizar estes Termos a qualquer tempo. A versao vigente sempre
        estara disponivel em <code>/termos</code>. Mudancas relevantes serao
        notificadas por e-mail ou via aviso na Plataforma.
      </p>

      <h2>9. Encerramento</h2>
      <p>
        O usuario pode encerrar a conta a qualquer momento entrando em contato com{" "}
        <a href="mailto:contato@ja-agrotec.com.br">contato@ja-agrotec.com.br</a>.
        Apos encerramento, os dados sao mantidos por 60 dias para eventual
        recuperacao e depois excluidos definitivamente, salvo exigencia legal
        em contrario.
      </p>

      <h2>10. Lei aplicavel e foro</h2>
      <p>
        Estes Termos sao regidos pelas leis da Republica Federativa do Brasil.
        Fica eleito o foro da comarca do domicilio do usuario para dirimir
        eventuais controversias, salvo disposicao legal em sentido diverso.
      </p>

      <h2>11. Contato</h2>
      <p>
        Duvidas, sugestoes ou denuncias:{" "}
        <a href="mailto:contato@ja-agrotec.com.br">contato@ja-agrotec.com.br</a>.
      </p>

      <hr />
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        Esta e uma versao base destes Termos. Recomenda-se revisao por advogado
        especializado antes da abertura comercial publica.
      </p>
    </article>
  );
}
