"use client";

import { useState } from "react";

/** Seletor de arquivo com textos em português (o do navegador usa o idioma dele). */
export default function FilePicker({
  inputRef,
  onChange,
  accept = ".csv",
  label,
  className = "",
}: {
  inputRef?: React.RefObject<HTMLInputElement | null>;
  onChange: (file: File | null) => void;
  accept?: string;
  label: string;
  className?: string;
}) {
  const [nome, setNome] = useState<string | null>(null);

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <label className="btn" style={{ cursor: "pointer" }}>
        Escolher arquivo
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          aria-label={label}
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setNome(f ? f.name : null);
            onChange(f);
          }}
        />
      </label>
      <span className="text-ink-2 truncate" style={{ maxWidth: 360 }}>
        {nome || "Nenhum arquivo escolhido"}
      </span>
    </div>
  );
}
