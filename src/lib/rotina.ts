export type RotinaItem = { id: string; tipo: "rotina" | "refeicao"; titulo: string; horario: string; dias: number[]; descricao: string; ordem: number };
export type RotinaInput = Omit<RotinaItem,"id" | "ordem">;
export const DIAS_SEMANA = ["Dom","Seg","Ter","Qua","Qui","Sex","Sáb"];
export const rotinaHorarioValido = (value: unknown): value is string => typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
export function rotinaInputValido(input: RotinaInput) {
  return Boolean(input && ["rotina","refeicao"].includes(input.tipo) && typeof input.titulo === "string" && input.titulo.trim().length > 0 && input.titulo.trim().length <= 150 && rotinaHorarioValido(input.horario) && typeof input.descricao === "string" && input.descricao.length <= 10000 && Array.isArray(input.dias) && input.dias.length > 0 && input.dias.length <= 7 && new Set(input.dias).size === input.dias.length && input.dias.every(d=>Number.isInteger(d)&&d>=0&&d<=6));
}
export function rotinaHorarioOrdem(time: string) {
  const [hour,minute] = time.split(":").map(Number);
  return (hour < 4 ? hour + 24 : hour) * 60 + minute;
}
