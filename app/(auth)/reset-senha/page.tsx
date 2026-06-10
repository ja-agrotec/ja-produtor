"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function ResetSenhaPage() {
  const router = useRouter();
  const [senha, setSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [loading, setLoading] = useState(false);
  const [pronto, setPronto] = useState(false);
  const [erroLink, setErroLink] = useState<string | null>(null);

  useEffect(() => {
    // Quando o user clica no link do email, o Supabase joga tokens no
    // fragment da URL e dispara PASSWORD_RECOVERY no auth state.
    const sb = getSupabase();
    const sub = sb.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setPronto(true);
    });
    // Verifica se ja temos sessao valida (caso o evento tenha sido perdido)
    sb.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    // Fallback: se em 3s nao confirmou, mostra aviso
    const t = setTimeout(() => {
      if (!pronto) setErroLink("Link invalido ou expirado. Solicite um novo.");
    }, 3000);
    return () => {
      sub.data.subscription.unsubscribe();
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (senha.length < 8) {
      toast.error("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    if (senha !== confirmar) {
      toast.error("As senhas nao conferem.");
      return;
    }
    setLoading(true);
    const sb = getSupabase();
    const r = await sb.auth.updateUser({ password: senha });
    setLoading(false);
    if (r.error) {
      toast.error("Nao foi possivel atualizar a senha. Solicite novo link.");
      return;
    }
    toast.success("Senha atualizada! Redirecionando...");
    setTimeout(() => router.push("/home"), 800);
  }

  return (
    <main
      className="min-h-screen flex items-center justify-center p-6"
      style={{ background: "linear-gradient(135deg, #1A2E1A 0%, #2d4a2d 100%)" }}
    >
      <div className="card w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="relative overflow-hidden rounded-2xl bg-white mb-3" style={{ width: 96, height: 96 }}>
            <img
              src="/logo-ja-agrotec.png"
              alt="JA Agrotec"
              className="absolute inset-0 w-full h-full object-cover scale-[1.6]"
            />
          </div>
          <h1 className="font-display text-2xl text-center" style={{ color: "var(--dark)" }}>
            Definir nova senha
          </h1>
        </div>

        {erroLink && !pronto ? (
          <div className="space-y-4">
            <div
              className="text-sm p-4 rounded"
              style={{ background: "#fff3cd", color: "#664d03" }}
            >
              ⚠️ {erroLink}
            </div>
            <Link href="/esqueci-senha" className="btn-primary w-full justify-center">
              Solicitar novo link
            </Link>
          </div>
        ) : !pronto ? (
          <p className="text-center text-sm" style={{ color: "var(--muted)" }}>
            Validando link...
          </p>
        ) : (
          <>
            <p className="text-center text-sm mb-6" style={{ color: "var(--muted)" }}>
              Escolha uma senha com pelo menos 8 caracteres.
            </p>
            <form onSubmit={salvar} className="space-y-4">
              <div>
                <label htmlFor="senha" className="label">Nova senha</label>
                <input
                  id="senha"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="input"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="confirmar" className="label">Confirmar senha</label>
                <input
                  id="confirmar"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="input"
                  value={confirmar}
                  onChange={(e) => setConfirmar(e.target.value)}
                />
              </div>
              <button disabled={loading} className="btn-primary w-full justify-center">
                {loading ? "Salvando..." : "Salvar nova senha"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
