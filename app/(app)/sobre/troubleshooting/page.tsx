import PageHeader from "@/components/ui/PageHeader";

export const metadata = {
  title: "Troubleshooting — JA Agrotec",
};

type Problema = { p: string; r: string };

const PROBLEMAS: Problema[] = [
  {
    p: "A tela está em branco ou desatualizada",
    r: "Aperte Ctrl + F5 (ou Cmd + Shift + R no Mac) para forçar recarga sem cache. Se persistir, faça logout e login novamente.",
  },
  {
    p: "Aparece \"Fila Offline\" com pendências",
    r: "Significa que existem registros feitos offline que ainda não foram sincronizados. Vá em Administração → Fila Offline e clique em \"Sincronizar tudo\" com internet ativa.",
  },
  {
    p: "Sincronização falhou — itens com erro na fila",
    r: "Abra a Fila Offline, veja o detalhe do erro (passe o mouse no badge \"Erro\") e tente \"Reenviar\" individual. Erros comuns: campos obrigatórios faltantes, fazenda excluída, IDs inválidos. Em último caso, remova o item e refaça o lançamento.",
  },
  {
    p: "Não consigo editar um lançamento antigo",
    r: "Verifique se a safra está aberta. O módulo de Encerramento de Safra não permite edição retroativa. Apenas usuários ADMIN podem editar registros de safras fechadas.",
  },
  {
    p: "Esqueci minha senha / como faço reset?",
    r: "Na tela de login use \"Esqueci minha senha\". Se sua conta não tiver email válido cadastrado, peça ao admin da propriedade para regenerar sua senha (Administração → Usuários → Reset senha).",
  },
  {
    p: "Como limpar o cache do navegador?",
    r: "Chrome/Edge: Ctrl + Shift + Delete → marque \"Imagens e arquivos em cache\" → Limpar. Em PWAs instalados, desinstale e reinstale o app pelo navegador. Importante: limpar cache não apaga dados — eles estão no Supabase.",
  },
  {
    p: "KPIs não batem com a listagem",
    r: "Limpe os filtros (botão \"Limpar\"). Os KPIs sempre refletem o conjunto filtrado, então um filtro ativo pode reduzir os totais aparentes.",
  },
  {
    p: "Erro de login ou sessão expirada",
    r: "Limpe cookies do navegador para o domínio do sistema e refaça login. Se persistir, contate o administrador da propriedade para verificar seu acesso.",
  },
  {
    p: "Caracteres aparecem como \"?\" ou \"â\"",
    r: "Bug de codificação UTF-8 já corrigido. Atualize a página com Ctrl + F5 para baixar a versão mais recente.",
  },
  {
    p: "Não consigo instalar como PWA no celular",
    r: "Use Chrome (Android) ou Safari (iOS). Acesse o site, abra o menu do navegador e procure \"Instalar app\" ou \"Adicionar à tela de início\". Em alguns casos o navegador exige visitar a página algumas vezes antes de oferecer.",
  },
];

export default function TroubleshootingPage() {
  return (
    <div className="space-y-4">
      <PageHeader
        titulo="Troubleshooting"
        icone="🛠️"
        subtitulo="Soluções para problemas comuns"
      />

      <div className="card" style={{ maxWidth: 980, margin: "0 auto" }}>
        <div>
          {PROBLEMAS.map((p, i) => (
            <details
              key={i}
              style={{
                border: "1px solid var(--brd, #e5e7eb)",
                borderRadius: 8,
                padding: "12px 16px",
                marginBottom: 8,
                background: "#fff",
              }}
            >
              <summary
                style={{
                  cursor: "pointer",
                  fontWeight: 600,
                  listStyle: "none",
                }}
              >
                🔧 {p.p}
              </summary>
              <p style={{ marginTop: 10, lineHeight: 1.7 }}>{p.r}</p>
            </details>
          ))}
        </div>

        <div
          style={{
            marginTop: 24,
            padding: 16,
            background: "#fff3cd",
            borderLeft: "4px solid #ffc107",
            borderRadius: 8,
          }}
        >
          <b>⚠️ Não resolveu?</b> Contate o suporte do ecossistema JA Agrotec
          com print da tela e descrição do passo onde ocorreu o problema.
        </div>
      </div>
    </div>
  );
}
