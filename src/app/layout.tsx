import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dibral · Gestão de Chopp",
  description: "Gestão de reservas, estoque e compras de chopp da Dibral",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full">
      <body className="min-h-full bg-bg text-text">{children}</body>
    </html>
  );
}
