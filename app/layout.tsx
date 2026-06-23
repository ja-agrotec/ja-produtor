import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Rajdhani } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-jakarta",
  display: "swap",
});

const rajdhani = Rajdhani({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-rajdhani",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://produtor.ja-agrotec.com.br"),
  // Manifest explicito (Route Handler em app/manifest.webmanifest/route.ts).
  // /operador sobrescreve via metadata.manifest do seu proprio layout.
  manifest: "/manifest.webmanifest",
  title: {
    default: "JA-Produtor · Gestão da propriedade rural com app offline e IA",
    template: "%s · JA-Produtor",
  },
  description:
    "O único sistema agronômico do mercado com app de campo 100% offline. Lança no celular sem internet, sincroniza ao voltar. IA Claude que sugere ações, cotações intraday CBOT × USD/BRL, fechamento de safra com ROI real. Pra produtores rurais, cooperados e integrados.",
  applicationName: "JA-Produtor",
  authors: [{ name: "JA-Agrotec" }],
  creator: "JA-Agrotec",
  publisher: "JA-Agrotec",
  keywords: [
    "gestão fazenda",
    "app offline agro",
    "gestão propriedade rural",
    "safra ROI",
    "cotação grãos CBOT",
    "fechamento safra",
    "IA agronegócio",
    "sistema produtor rural",
    "controle de estoque insumos",
    "venda de grãos",
    "talhões safras",
    "agricultura digital",
    "sistema cooperado",
    "PWA agro offline",
    "fazenda inteligente",
  ],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: "hF3g2pM34A39210y-RyzUuilSjGbxMVl7QV6fiEZ4p8",
  },
  openGraph: {
    title: "JA-Produtor · O único agro 100% offline do mercado",
    description:
      "App de campo que funciona sem internet. Operador lança no celular, sincroniza ao voltar. IA, cotações, ROI real.",
    type: "website",
    locale: "pt_BR",
    siteName: "JA-Produtor",
    url: "https://produtor.ja-agrotec.com.br",
  },
  twitter: {
    card: "summary_large_image",
    title: "JA-Produtor · Gestão rural com app offline + IA",
    description: "O único agro 100% offline. Sem internet, opera; ao voltar, sincroniza.",
  },
  appleWebApp: {
    capable: true,
    title: "JA-Produtor",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

const jsonLdSoftware = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "JA-Produtor",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, iOS, Android (PWA)",
  "url": "https://produtor.ja-agrotec.com.br",
  "description":
    "Plataforma de gestão da propriedade rural — talhões, safras, estoque de insumos, vendas de grãos, ROI real, IA operacional e o único app de campo 100% offline do mercado.",
  "featureList": [
    "App de campo offline (PWA)",
    "Gestão de safras com ROI real",
    "IA Claude pra análise operacional",
    "Cotações CBOT intraday",
    "Controle de estoque automático",
    "Multi-usuário com hierarquia",
  ],
  "publisher": { "@type": "Organization", "name": "JA-Agrotec" },
  "inLanguage": "pt-BR",
};

const jsonLdOrganization = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "JA-Agrotec",
  "url": "https://ja-agrotec.com.br",
  "logo": "https://ja-agrotec.com.br/logos/ja-agrotec.png",
  "sameAs": ["https://wa.me/5511964585171"],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: "#7CB342",
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${jakarta.variable} ${rajdhani.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftware) }}
        />
      </head>
      <body>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" theme="light" />
        </AuthProvider>
      </body>
    </html>
  );
}
