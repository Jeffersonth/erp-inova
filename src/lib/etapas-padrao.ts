// Etapas padrão de um projeto novo — compartilhado entre o dialog de novo
// projeto e a conversão de lead em cliente (módulo Leads).
export const DEFAULT_ETAPAS = [
  { nome: "Captação de Informações", ordem: 0, final: false },
  { nome: "Desenvolvimento do Projeto", ordem: 1, final: false },
  { nome: "Correções e Atualizações", ordem: 2, final: false },
  { nome: "Revisão", ordem: 3, final: false },
  { nome: "Conclusão", ordem: 4, final: true },
];
