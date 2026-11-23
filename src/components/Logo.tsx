"use client";

import { useEffect, useState } from "react";

/**
 * Espaço do logotipo da Dibral.
 * Coloque o arquivo em public/logo-dibral.svg (ou troque a extensão abaixo
 * para .png). Enquanto o arquivo não existir, aparece só o nome em texto.
 */
export default function Logo({ height = 40 }: { height?: number }) {
  // null = ainda verificando; false = arquivo não existe
  const [existe, setExiste] = useState<boolean | null>(null);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setExiste(true);
    img.onerror = () => setExiste(false);
    img.src = "/logo-dibral.svg";
  }, []);

  if (existe !== true) {
    return (
      <div className="leading-none">
        <span className="font-display block text-[30px] font-bold tracking-tight">Dibral</span>
        <span className="block text-[12.5px] font-semibold mt-1 text-ink-3">Gestão de chopp</span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-dibral.svg"
      alt="Dibral"
      style={{ height, width: "auto", maxWidth: "100%" }}
    />
  );
}
