export const metadata = { title: "Politica de Privacidade · JA Agrotec" };

const ATUALIZACAO = "10 de junho de 2026";

export default function PrivacidadePage() {
  return (
    <article className="prose-legal">
      <h1>Politica de Privacidade</h1>
      <p className="text-sm" style={{ color: "var(--muted)" }}>
        Ultima atualizacao: {ATUALIZACAO}
      </p>

      <p>
        Esta Politica explica como a <b>JA Agrotec</b> coleta, usa, armazena e
        protege seus dados ao utilizar o <b>Modulo Produtor</b> (a &quot;Plataforma&quot;).
        Estamos em conformidade com a Lei Geral de Protecao de Dados (Lei
        13.709/2018 - <b>LGPD</b>).
      </p>

      <h2>1. Quem somos (Controlador)</h2>
      <p>
        Para fins da LGPD, o Controlador dos dados pessoais coletados pela
        Plataforma e <b>JA Agrotec</b>, contato:{" "}
        <a href="mailto:contato@ja-agrotec.com.br">contato@ja-agrotec.com.br</a>.
      </p>

      <h2>2. Quais dados coletamos</h2>
      <h3>2.1 Dados de cadastro</h3>
      <ul>
        <li>Nome completo</li>
        <li>E-mail</li>
        <li>Senha (armazenada com criptografia bcrypt - nunca vemos em texto puro)</li>
        <li>Telefone (opcional)</li>
        <li>Cargo / funcao (opcional)</li>
      </ul>

      <h3>2.2 Dados operacionais inseridos pelo usuario</h3>
      <ul>
        <li>Cadastro de fazendas (nome, cidade, area, CNPJ/CPF, certificacoes)</li>
        <li>Talhoes, safras, lancamentos financeiros</li>
        <li>Estoque de insumos, vendas de graos</li>
        <li>Documentos digitalizados (uploads)</li>
        <li>Analises de solo, registros de qualidade</li>
      </ul>

      <h3>2.3 Dados tecnicos coletados automaticamente</h3>
      <ul>
        <li>Endereco IP de acesso</li>
        <li>Tipo de dispositivo, navegador e sistema operacional</li>
        <li>Data e hora de login e de acoes relevantes</li>
        <li>Localizacao aproximada da fazenda (cidade selecionada para clima)</li>
      </ul>

      <h2>3. Como usamos os dados</h2>
      <ul>
        <li>
          <b>Operar a Plataforma:</b> exibir suas informacoes, gerar relatorios,
          calcular indicadores.
        </li>
        <li>
          <b>Autenticacao e seguranca:</b> validar acesso, prevenir fraudes.
        </li>
        <li>
          <b>Suporte tecnico:</b> diagnosticar problemas e responder duvidas.
        </li>
        <li>
          <b>Melhoria do produto:</b> analise agregada e anonimizada de uso, sem
          identificar usuario individual.
        </li>
        <li>
          <b>Comunicacao operacional:</b> avisos de manutencao, mudancas de
          servico, recuperacao de senha.
        </li>
      </ul>
      <p>
        <b>NAO usamos seus dados para:</b> publicidade direcionada, venda a
        terceiros, treinamento de modelos de IA com seus dados identificaveis.
      </p>

      <h2>4. Base legal (LGPD)</h2>
      <p>O tratamento e fundamentado em uma ou mais das seguintes bases:</p>
      <ul>
        <li>
          <b>Execucao de contrato</b> (Art. 7, V) - para prestar o servico
          contratado.
        </li>
        <li>
          <b>Cumprimento de obrigacao legal</b> (Art. 7, II) - reter dados
          fiscais quando exigido.
        </li>
        <li>
          <b>Consentimento</b> (Art. 7, I) - para comunicacoes nao essenciais
          (opt-in).
        </li>
        <li>
          <b>Legitimo interesse</b> (Art. 7, IX) - melhoria do produto via
          analise agregada anonima.
        </li>
      </ul>

      <h2>5. Compartilhamento com terceiros</h2>
      <p>
        Compartilhamos dados apenas com prestadores que viabilizam o servico,
        sob contrato de confidencialidade e protecao:
      </p>
      <ul>
        <li>
          <b>Supabase</b> (Banco de dados Postgres e autenticacao) - servidores
          AWS regiao South America (sa-east-1, Sao Paulo).
        </li>
        <li>
          <b>Vercel</b> (Hospedagem da aplicacao) - infraestrutura serverless
          globalmente distribuida.
        </li>
        <li>
          <b>Anthropic (Claude)</b> (IA Operacional) - snapshot agregado e
          anonimizado de metricas da fazenda enviado apenas no momento da
          analise. NAO enviamos identificacao do usuario nem do CNPJ.
        </li>
        <li>
          <b>Open-Meteo</b> (previsao climatica) - recebe apenas coordenadas
          da cidade, nunca o usuario.
        </li>
        <li>
          <b>Yahoo Finance, BCB</b> (cotacoes) - consultas publicas, sem dados
          do usuario.
        </li>
      </ul>

      <h2>6. Tempo de armazenamento</h2>
      <ul>
        <li>
          <b>Conta ativa:</b> dados mantidos enquanto a conta estiver em uso.
        </li>
        <li>
          <b>Apos encerramento:</b> 60 dias para recuperacao, depois exclusao
          definitiva.
        </li>
        <li>
          <b>Dados fiscais e contabeis:</b> conforme legislacao (geralmente 5
          anos).
        </li>
        <li>
          <b>Logs tecnicos:</b> 90 dias.
        </li>
      </ul>

      <h2>7. Seus direitos (LGPD)</h2>
      <p>Voce pode, a qualquer tempo, solicitar:</p>
      <ul>
        <li>Confirmacao da existencia de tratamento.</li>
        <li>Acesso aos seus dados.</li>
        <li>Correcao de dados incompletos, inexatos ou desatualizados.</li>
        <li>
          Anonimizacao, bloqueio ou eliminacao de dados desnecessarios ou
          excessivos.
        </li>
        <li>Portabilidade dos dados a outro fornecedor.</li>
        <li>Eliminacao dos dados pessoais tratados com base no consentimento.</li>
        <li>Informacao sobre entidades com as quais compartilhamos seus dados.</li>
        <li>Revogacao do consentimento.</li>
      </ul>
      <p>
        Para exercer qualquer desses direitos, envie e-mail para{" "}
        <a href="mailto:contato@ja-agrotec.com.br">contato@ja-agrotec.com.br</a>{" "}
        com o assunto &quot;LGPD - [seu pedido]&quot;. Respondemos em ate 15 dias.
      </p>

      <h2>8. Seguranca</h2>
      <ul>
        <li>Conexoes criptografadas (HTTPS/TLS) em todas as comunicacoes.</li>
        <li>Senhas armazenadas com hash bcrypt.</li>
        <li>
          Row-Level Security (RLS) no banco - usuarios so leem dados da propria
          fazenda.
        </li>
        <li>Backups automaticos diarios pelo provedor de infraestrutura.</li>
        <li>Acesso administrativo restrito e auditado.</li>
      </ul>

      <h2>9. Cookies e armazenamento local</h2>
      <p>Usamos apenas cookies e localStorage essenciais para:</p>
      <ul>
        <li>Manter voce logado (token de sessao).</li>
        <li>Lembrar fazenda selecionada e preferencias da interface.</li>
        <li>Fila offline de lancamentos pendentes de sincronizacao.</li>
      </ul>
      <p>NAO usamos cookies de rastreamento de terceiros ou publicidade.</p>

      <h2>10. Criancas e adolescentes</h2>
      <p>
        A Plataforma e destinada a maiores de 18 anos. Nao coletamos dados de
        menores intencionalmente.
      </p>

      <h2>11. Encarregado de Protecao de Dados (DPO)</h2>
      <p>
        Contato:{" "}
        <a href="mailto:contato@ja-agrotec.com.br">contato@ja-agrotec.com.br</a>
        {" "}- assunto &quot;DPO&quot;.
      </p>

      <h2>12. Alteracoes nesta Politica</h2>
      <p>
        Esta Politica pode ser atualizada. A versao vigente fica em{" "}
        <code>/privacidade</code>. Mudancas relevantes serao notificadas.
      </p>

      <hr />
      <p className="text-xs" style={{ color: "var(--dim)" }}>
        Esta e uma versao base. Recomenda-se revisao por advogado especializado
        em LGPD antes da abertura comercial publica.
      </p>
    </article>
  );
}
