import { ProspeccaoCnpj } from "@/components/prospeccao-cnpj";

export default function ProspeccaoPage() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h1 className="text-[17px] font-extrabold tracking-[-0.01em] text-ink">Prospecção por CNPJ</h1>
        <span className="text-[11.5px] text-mut">consulte uma empresa e vire um lead em 1 clique</span>
      </div>
      <ProspeccaoCnpj />
    </div>
  );
}
