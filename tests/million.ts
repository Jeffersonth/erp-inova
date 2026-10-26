import assert from "node:assert/strict";
import {toCents,journeySummary,monthEnd,MILLION,type JourneyGain,type JourneyGoal} from "../src/lib/million";
const today="2026-10-26";
const gain=(id:string,amount:number,date:string):JourneyGain=>({id,titulo:id,valor_centavos:String(amount),data:date,origem:"Trabalho",notas:""});
const goal:JourneyGoal={id:"marco",titulo:"Primeiros 20 mil",alvo_centavos:2000000,tipo:"marco",mes:null,prazo:null,concluido_em:null};
assert.equal(toCents("10000.01"),1000001);
assert.equal(toCents("10000,01"),1000001);
assert.equal(toCents("0.01"),1);
for(const value of ["-1","0","NaN","1.005","1e6","10.000,00",null])assert.equal(toCents(value),null);
const empty=journeySummary([], [goal],today);
assert.equal(empty.total,0);assert.equal(empty.monthly.alvo_centavos,1000000);assert.equal(empty.monthly.current,0);
const gains=[gain("a",1000000,"2026-09-05"),gain("b",500000,"2026-10-01"),gain("c",500000,"2026-10-20"),gain("future",9999999,"2026-10-30")];
const summary=journeySummary(gains,[goal],today);
assert.equal(summary.total,2000000);assert.equal(summary.monthly.current,1000000);assert.equal(summary.monthly.completed,"2026-10-20");
assert.equal(summary.achieved.find(g=>g.id==="marco")?.completed,"2026-10-20");
assert.equal(summary.achieved.filter(g=>g.tipo==="mensal").length,2); // Setembro continua no histórico.
const corrected=journeySummary(gains.filter(g=>g.id!=="c"),[goal],today);
assert.equal(corrected.achieved.some(g=>g.id==="marco"),false); // Correções recalculam a conquista automática.
const manual=journeySummary([],[{...goal,concluido_em:"2026-09-01"}],today);
assert.equal(manual.total,0);assert.equal(manual.achieved.length,1);assert.equal(manual.achieved[0].manual,true);
const monthly:JourneyGoal={...goal,id:"monthly-custom",tipo:"mensal",mes:"2026-10-01",titulo:"Meta ajustada",alvo_centavos:1500000};
assert.equal(journeySummary(gains,[goal,monthly],today).monthly.alvo_centavos,1500000);
assert.equal(journeySummary([gain("old",50000,"2026-08-01")],[],today).expired.length,1);
assert.equal(journeySummary([gain("m",MILLION+1,today)],[],today).percent,100);
assert.equal(monthEnd("2024-02-01"),"2024-02-29");
assert.equal(journeySummary([],[],"2027-01-01").series[0].month,"2026-08");
assert.equal(summary.series.at(-1)?.value,1000000);
console.log("PASS: centavos, metas mensais atuais/passadas, marcos, conclusão manual sem ganho fictício, correções, virada de ano e progresso acima de um milhão.");
