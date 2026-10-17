import type { MetadataRoute } from "next";

// PWA — permite instalar o sistema como app no celular/desktop.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ERP Pessoal · Jefferson Thales",
    short_name: "ERP Pessoal",
    description: "Seus projetos, clientes, finanças e compromissos em um só lugar.",
    start_url: "/hoje",
    display: "standalone",
    background_color: "#140D24",
    theme_color: "#140D24",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
