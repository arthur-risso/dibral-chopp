"use client";

import { useEffect } from "react";
import { IconFechar } from "@/components/icons";

export default function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="modal"
        style={wide ? { maxWidth: 680 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-head">
          <h2>{title}</h2>
          <button onClick={onClose} aria-label="Fechar" className="icon-btn">
            <IconFechar />
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
