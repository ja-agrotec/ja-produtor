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
  title: "JA Agrotec · Módulo Produtor",
  description: "Gestão completa da propriedade rural — parte do ecossistema JA Agrotec.",
  applicationName: "JA Agrotec Produtor",
  appleWebApp: {
    capable: true,
    title: "JA Agrotec Produtor",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
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
      <body>
        <AuthProvider>
          {children}
          <Toaster richColors position="top-right" theme="light" />
        </AuthProvider>
      </body>
    </html>
  );
}
