import Link from "next/link";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      <header
        className="px-6 py-3 border-b flex items-center justify-between"
        style={{ background: "white", borderColor: "var(--brd)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <div className="relative overflow-hidden rounded-lg bg-white" style={{ width: 32, height: 32 }}>
            <img
              src="/logo-ja-agrotec.png"
              alt="JA Agrotec"
              className="absolute inset-0 w-full h-full object-cover scale-[1.6]"
            />
          </div>
          <span className="font-display font-semibold">JA Agrotec</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href="/termos" style={{ color: "var(--muted)" }}>Termos</Link>
          <Link href="/privacidade" style={{ color: "var(--muted)" }}>Privacidade</Link>
          <Link href="/login" style={{ color: "var(--green)" }}>Entrar</Link>
        </nav>
      </header>
      <main className="max-w-3xl mx-auto px-6 py-10">{children}</main>
      <footer className="text-center py-6 text-xs" style={{ color: "var(--dim)" }}>
        © {new Date().getFullYear()} JA Agrotec ·{" "}
        <a href="mailto:contato@ja-agrotec.com.br" style={{ color: "var(--green)" }}>
          contato@ja-agrotec.com.br
        </a>
      </footer>
    </div>
  );
}
