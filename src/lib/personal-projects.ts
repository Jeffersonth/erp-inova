export type PersonalStep = { id: string; titulo: string; prazo: string; concluida: boolean };
export type PersonalNote = { id: string; texto: string; concluida: boolean };
export type PersonalProject = {
  id: string;
  titulo: string;
  categoria: "Aplicativo" | "Site" | "Outro";
  prazo: string | null;
  notas: PersonalNote[];
  etapas: PersonalStep[];
};
