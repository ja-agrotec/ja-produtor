// Landing publica em / — retorna 200 OK (sem redirect) pra:
//   1. Google Search Console verificar a meta tag (rejeita em 307)
//   2. Googlebot indexar o sistema
//   3. Visitante novo entender o que e o JA-Produtor antes de logar
//
// Usuario que ja conhece clica no CTA e vai pra /home (que se nao
// autenticado redireciona pra /login).

import Link from "next/link";

export const metadata = {
  title: "JA-Produtor · Gestão da propriedade rural com app offline e IA",
};

export default function RootPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-amber-50 flex items-center justify-center p-6">
      <div className="max-w-3xl text-center">
        <div className="inline-flex items-center gap-3 mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-600 to-emerald-800 text-white flex items-center justify-center text-3xl shadow-xl">
            🌾
          </div>
          <div className="text-left">
            <div className="text-3xl font-bold text-gray-900 tracking-tight">JA-Produtor</div>
            <div className="text-xs uppercase tracking-[0.2em] text-emerald-700 font-semibold">
              JA-Agrotec
            </div>
          </div>
        </div>

        <div className="inline-block bg-emerald-600 text-white px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-6 shadow">
          ⚡ Inédito no mercado · Em produção
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-5">
          O único agro com app de campo{" "}
          <span className="text-emerald-700 italic">100% offline</span>.
        </h1>

        <p className="text-lg sm:text-xl text-gray-700 leading-relaxed mb-10 max-w-2xl mx-auto">
          Nenhum outro sistema agronômico tem app de campo realmente offline. O JA-Produtor sim.
          Operador lança no celular sem sinal, sincroniza ao voltar.{" "}
          <strong>Gestão de safras, ROI real, IA Claude</strong> que analisa seus dados.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10 max-w-2xl mx-auto">
          <Feature emoji="📵" label="App offline real" />
          <Feature emoji="🔔" label="Aviso em tempo real" />
          <Feature emoji="🧠" label="IA Claude" />
          <Feature emoji="💰" label="ROI por safra" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/home"
            className="inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-8 py-4 rounded-xl shadow-lg transition"
          >
            Acessar o sistema →
          </Link>
          <a
            href="https://ja-agrotec.com.br/solucoes/ja-produtor"
            className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-900 border-2 border-gray-300 font-semibold px-8 py-4 rounded-xl transition"
          >
            Saber mais
          </a>
        </div>

        <p className="text-xs text-gray-500 mt-10">
          Pra produtores rurais, cooperados e integrados em regiões com sinal instável
        </p>
      </div>
    </main>
  );
}

function Feature({ emoji, label }: { emoji: string; label: string }) {
  return (
    <div className="bg-white/80 backdrop-blur-sm border border-emerald-100 rounded-xl p-4 text-center shadow-sm">
      <div className="text-2xl mb-1">{emoji}</div>
      <div className="text-xs font-semibold text-gray-700">{label}</div>
    </div>
  );
}
