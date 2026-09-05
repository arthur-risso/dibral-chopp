export type LinhaImportacao = {
  linha: number;
  nome: string;
  codigo_principal: string;
  codigo_secundario: string;
  whatsapp: string;
  setor: string;
  cidade: string;
  erro: string | null;
};

function normalizarCabecalho(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const MAPA_CABECALHOS: Record<
  string,
  "nome" | "codigo_principal" | "codigo_secundario" | "whatsapp" | "setor" | "cidade"
> = {
  nome: "nome",
  codigoprincipal: "codigo_principal",
  codigo: "codigo_principal",
  codigosecundario: "codigo_secundario",
  whatsapp: "whatsapp",
  celular: "whatsapp",
  telefone: "whatsapp",
  setor: "setor",
  cidade: "cidade",
};

/** Decodifica tentando UTF-8 primeiro; se detectar caracteres inválidos, tenta Windows-1252. */
export function decodificarTextoAutomatico(buffer: ArrayBuffer): string {
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
  if (utf8.includes("\uFFFD")) {
    return new TextDecoder("windows-1252").decode(buffer);
  }
  return utf8;
}

export function parseClientesCsv(texto: string): LinhaImportacao[] {
  const limpo = texto.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const todasLinhas = limpo.split("\n").filter((l) => l.trim().length > 0);
  if (todasLinhas.length === 0) return [];

  const pontoEVirgula = (todasLinhas[0].match(/;/g) || []).length;
  const virgula = (todasLinhas[0].match(/,/g) || []).length;
  const delimitador = pontoEVirgula >= virgula ? ";" : ",";

  const cabecalho = todasLinhas[0].split(delimitador).map(normalizarCabecalho);
  const indices: Partial<Record<string, number>> = {};
  cabecalho.forEach((c, i) => {
    const campo = MAPA_CABECALHOS[c];
    if (campo && indices[campo] === undefined) indices[campo] = i;
  });

  const codigosVistos = new Set<string>();
  const resultado: LinhaImportacao[] = [];

  for (let i = 1; i < todasLinhas.length; i++) {
    const campos = todasLinhas[i].split(delimitador);
    if (campos.every((c) => !c.trim())) continue;

    const pegar = (campo: string) => {
      const idx = indices[campo];
      if (idx === undefined || idx >= campos.length) return "";
      return campos[idx].trim();
    };

    const nome = pegar("nome");
    const codigoPrincipal = pegar("codigo_principal");

    // Ignora silenciosamente a linha de exemplo do modelo, caso não tenha sido apagada
    if (nome === "Bar do Zé" && codigoPrincipal === "12345") continue;

    let erro: string | null = null;
    if (!codigoPrincipal) erro = "Código principal vazio";
    else if (codigosVistos.has(codigoPrincipal)) erro = "Código principal duplicado no arquivo";
    else codigosVistos.add(codigoPrincipal);

    resultado.push({
      linha: i + 1,
      nome,
      codigo_principal: codigoPrincipal,
      codigo_secundario: pegar("codigo_secundario"),
      whatsapp: pegar("whatsapp"),
      setor: pegar("setor"),
      cidade: pegar("cidade"),
      erro,
    });
  }

  return resultado;
}
