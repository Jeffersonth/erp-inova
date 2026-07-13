// Etapas padrão de um projeto novo — compartilhado entre o dialog de novo
// projeto e a conversão de lead em cliente (módulo Leads).
export const DEFAULT_ETAPAS = [
  { nome: "A fazer", ordem: 0, final: false },
  { nome: "Em andamento", ordem: 1, final: false },
  { nome: "Revisão", ordem: 2, final: false },
  { nome: "Concluído", ordem: 3, final: true },
];
