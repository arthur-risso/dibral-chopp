export function brandColor(nome: string, marca: string): string {
  if (nome.toLowerCase().includes("black")) return "var(--brand-black)";
  switch (marca) {
    case "Antarctica":
      return "var(--brand-antarctica)";
    case "Brahma":
      return "var(--brand-brahma)";
    case "Stella Artois":
      return "var(--brand-stella)";
    case "Colorado":
      return "var(--brand-colorado)";
    default:
      return "var(--amber)";
  }
}
