const base = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "square" as const,
  strokeLinejoin: "miter" as const,
  "aria-hidden": true,
};

export function IconPainel() {
  return (
    <svg {...base}>
      <rect x="3.5" y="3.5" width="7" height="9" />
      <rect x="13.5" y="3.5" width="7" height="5" />
      <rect x="13.5" y="11.5" width="7" height="9" />
      <rect x="3.5" y="15.5" width="7" height="5" />
    </svg>
  );
}
export function IconReservas() {
  return (
    <svg {...base}>
      <rect x="3.5" y="3.5" width="17" height="17" />
      <path d="M3.5 9.5h17M3.5 15h17M9.5 3.5v17M15 3.5v17" />
    </svg>
  );
}
export function IconClientes() {
  return (
    <svg {...base}>
      <circle cx="9" cy="8" r="3.4" />
      <path d="M3 20c0-3.6 2.6-6 6-6s6 2.4 6 6" />
      <path d="M16 5.2a3.4 3.4 0 0 1 0 5.6M18.5 14.5c1.6.9 2.5 2.7 2.5 5.5" />
    </svg>
  );
}
export function IconEstoque() {
  return (
    <svg {...base}>
      <path d="M7 3.5h10l-1 3.5h2.5v13.5h-13V7H8Z" />
      <path d="M5.5 12h13" />
    </svg>
  );
}
export function IconSugestao() {
  return (
    <svg {...base}>
      <path d="M3 17l5.5-5.5 4 3L21 6" />
      <path d="M15 6h6v6" />
    </svg>
  );
}
export function IconFechamento() {
  return (
    <svg {...base}>
      <path d="M6 3.5h8l4 4v13H6Z" />
      <path d="M9 13.5l2.2 2.2L15.5 11" />
    </svg>
  );
}
export function IconSair() {
  return (
    <svg {...base}>
      <path d="M10 20.5H4.5v-17H10M15 7l5 5-5 5M20 12H9" />
    </svg>
  );
}
export function IconBusca() {
  return (
    <svg {...base} width={17} height={17}>
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L21 21" />
    </svg>
  );
}
export function IconEsq() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}
export function IconDir() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}
export function IconFechar() {
  return (
    <svg {...base}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
export function IconEditar() {
  return (
    <svg {...base} width={17} height={17}>
      <path d="M4 20h4L19.5 8.5l-4-4L4 16Z" />
      <path d="M13 7l4 4" />
    </svg>
  );
}
export function IconPower() {
  return (
    <svg {...base} width={17} height={17}>
      <path d="M12 3v8" />
      <path d="M17.7 6.8a8 8 0 1 1-11.4 0" />
    </svg>
  );
}
export function IconLixeira() {
  return (
    <svg {...base} width={17} height={17}>
      <path d="M4 7h16M9.5 7V3.5h5V7M6.5 7l1 13.5h9l1-13.5" />
    </svg>
  );
}
export function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.6}>
      <path d="M4.5 12.5l5 5L19.5 7" />
    </svg>
  );
}
export function IconRelogio({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.4}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}
export function IconX({ size = 16 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size} strokeWidth={2.6}>
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
export function IconSeta() {
  return (
    <svg {...base} width={16} height={16}>
      <path d="M4 12h16M14 6l6 6-6 6" />
    </svg>
  );
}
export function IconMenu() {
  return (
    <svg {...base}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
