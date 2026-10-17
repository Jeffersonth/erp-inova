export type PersonalStep = { id: string; titulo: string; prazo: string; concluida: boolean };
export type PersonalProject = {
  id: string;
  titulo: string;
  categoria: "Aplicativo" | "Site" | "Outro";
  prazo: string | null;
  anotacoes: string;
  etapas: PersonalStep[];
};
