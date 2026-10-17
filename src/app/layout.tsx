import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ERP Pessoal · Jefferson Thales",
  applicationName: "ERP Pessoal",
  description: "Seus projetos, clientes, finanças e compromissos em um só lugar.",
  icons: {
    icon: [{ url: "/brand/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: { capable: true, title: "ERP Pessoal", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#140D24" };

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
