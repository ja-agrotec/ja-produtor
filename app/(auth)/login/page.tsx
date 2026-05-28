"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const supabase = getSupabase();
    const res = await supabase.auth.signInWithPassword({ email, password: senha });
    if (res.error) {
      const msg = (res.error.message || "").toLowerCase();
      if (msg.includes("banned") || msg.includes("user is disabled")) {
        toast.error("Sua conta está inativada. Fale com o administrador.");
      } else {
        toast.error("E-mail ou senha incorretos.");
      }
      setLoading(false);
    } else {
      // Detecta role pra redirecionar. Se for operador, vai pra PWA Operador.
      try {
        const sb = supabase;
        const { data: user } = await sb.auth.getUser();
        const authId = user?.user?.id;
        if (authId) {
          const r = await sb
            .from("usuarios")
            .select("role")
            .eq("auth_id", authId)
            .maybeSingle();
          const role = r.data?.role;
          toast.success("Bem-vindo de volta!");
          router.push(role === "operador" ? "/operador" : "/home");
          return;
        }
      } catch {
        /* fallback abaixo */
      }
      toast.success("Bem-vindo de volta!");
      router.push("/home");
    }
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
            JA Agrotec
          </h1>
          <p className="text-caps mt-1">Módulo Produtor</p>
        </div>

        <p className="text-center text-sm mb-6" style={{ color: "var(--muted)" }}>
          Entre com seu e-mail e senha para acessar.
        </p>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="label">E-mail</label>
            <input
              id="login-email"
              type="email"
              autoComplete="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="login-senha" className="label">Senha</label>
            <input
              id="login-senha"
              type="password"
              autoComplete="current-password"
              required
              className="input"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
            />
          </div>
          <button disabled={loading} className="btn-primary w-full justify-center">
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--dim)" }}>
          Acesso restrito. Solicite seu usuário ao administrador da fazenda.
        </p>
      </div>
    </main>
  );
}
