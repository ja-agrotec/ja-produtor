"use client";
import { useState } from "react";
import Link from "next/link";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviado, setEnviado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const sb = getSupabase();
    const r = await sb.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-senha`,
    });
    setLoading(false);
    if (r.error) {
      toast.error("Nao foi possivel enviar o email. Tente novamente.");
      return;
    }
    setEnviado(true);
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
            Recuperar senha
          </h1>
        </div>

        {enviado ? (
          <div className="space-y-4">
            <div
              className="text-sm p-4 rounded"
              style={{ background: "var(--green-bg)", color: "var(--text)" }}
            >
              ✉️ Enviamos um link de recuperacao para <b>{email}</b>. Verifique sua
              caixa de entrada e o spam. O link expira em 1 hora.
            </div>
            <Link href="/login" className="btn-primary w-full justify-center">
              Voltar para o login
            </Link>
          </div>
        ) : (
          <>
            <p className="text-center text-sm mb-6" style={{ color: "var(--muted)" }}>
              Informe seu e-mail cadastrado. Enviaremos um link para voce definir uma nova senha.
            </p>
            <form onSubmit={enviar} className="space-y-4">
              <div>
                <label htmlFor="email" className="label">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <button disabled={loading || !email} className="btn-primary w-full justify-center">
                {loading ? "Enviando..." : "Enviar link de recuperacao"}
              </button>
            </form>
            <p className="text-center text-sm mt-6">
              <Link href="/login" style={{ color: "var(--green)" }}>
                ← Voltar para o login
              </Link>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
