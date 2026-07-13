import type { NotaInput } from "./grades.types.js";

export function calcularPromedioPonderado(notas: NotaInput[]): number {
  if (notas.length === 0) return 0;
  let suma = 0;
  for (const n of notas) {
    suma += n.valor * (n.peso / 100);
  }
  return suma;
}

export function sumaDePesos(notas: NotaInput[]): number {
  return notas.reduce((sum, n) => sum + n.peso, 0);
}
