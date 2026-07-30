// Categorização automática de lançamentos importados, por memória de escolhas.
// A ideia: normalizar a descrição (tirando acento, números de documento e
// pontuação) para que "EQUATORIAL ENERGIA - PGTO 12345" e
// "EQUATORIAL ENERGIA PGTO 98765" gerem a mesma chave e caiam na mesma regra.

export type CategoryRule = { pattern: string; categoria: string };

/**
 * Reduz a descrição a uma chave estável: sem acentos, maiúscula, sem números
 * (documentos/PIX/valores) e sem pontuação, espaços colapsados.
 */
export function normalizeDescricao(desc: string): string {
  return desc
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove acentos (marcas combinantes)
    .toUpperCase()
    .replace(/\d+/g, " ") // remove números (doc, PIX, valores)
    .replace(/[^A-Z ]/g, " ") // mantém só letras e espaço
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Sugere a categoria para uma descrição, dadas as regras aprendidas.
 * Primeiro tenta correspondência exata da chave normalizada; depois, a regra
 * cujo padrão esteja contido na descrição (a mais específica/longa vence).
 */
export function suggestCategory(
  descricao: string,
  rules: CategoryRule[],
): string | null {
  const norm = normalizeDescricao(descricao);
  if (!norm) return null;

  const exact = rules.find((r) => r.pattern === norm);
  if (exact) return exact.categoria;

  let best: string | null = null;
  let bestLen = 0;
  for (const r of rules) {
    if (r.pattern && norm.includes(r.pattern) && r.pattern.length > bestLen) {
      best = r.categoria;
      bestLen = r.pattern.length;
    }
  }
  return best;
}
