import type { MetadataRoute } from "next";

// PWA — permite instalar o sistema como app no celular/desktop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERP Pessoal · inova labs",
    short_name: "ERP Pessoal",
    description: "Seu negócio inteiro em um só lugar — com IA em cada detalhe.",
    start_url: "/hoje",
    display: "standalone",
    background_color: "#0A1A33",
    theme_color: "#0A1A33",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
