// Preserva o calendário, atualiza resultados a partir dos dados coletados e calcula a classificação.
import { readFile, writeFile } from 'node:fs/promises';
const sitePath='docs/data.json';
const site=JSON.parse(await readFile(sitePath,'utf8'));
const league=JSON.parse(await readFile('data/liga.json','utf8'));
const teamData=(league.times||[]).map(t=>({id:Number(t.id),name:t.nome,owner:t.dono,slug:t.slug,points:t.pontos||{},partial:t.parcial}));
if(teamData.length!==20 || teamData.some(t=>!Number.isFinite(t.id))) throw new Error('H2H exige 20 times com IDs');
const nameById=Object.fromEntries(teamData.map(t=>[String(t.id),t.name]));
let competition=site.pointsCompetition;
const validExisting=competition && Object.keys(competition.rounds||{}).length===38 &&
 Object.values(competition.rounds).every(fs=>Array.isArray(fs)&&fs.length===10);
if(!validExisting){
 const fixed=teamData[0]; let rotating=teamData.slice(1); const first=[];
 for(let r=0;r<19;r++){
  const slots=[fixed,...rotating], matches=[];
  for(let i=0;i<10;i++){
   let a=slots[i],b=slots[19-i];
   if(r%2){[a,b]=[b,a]}
   matches.push({homeId:a.id,awayId:b.id,homeScore:null,awayScore:null,homePts:null,awayPts:null});
  }
  first.push(matches); rotating=[rotating.at(-1),...rotating.slice(0,-1)];
 }
 const rounds={}; first.forEach((fs,i)=>rounds[String(i+1)]=fs);
 first.forEach((fs,i)=>rounds[String(i+20)]=fs.map(m=>({homeId:m.awayId,awayId:m.homeId,homeScore:null,awayScore:null,homePts:null,awayPts:null})));
 competition={rounds,teams:nameById,standings:[]};
}
competition.teams=nameById;
const teamById=new Map(teamData.map(t=>[t.id,t]));
for(let r=1;r<=38;r++){
 for(const m of competition.rounds[String(r)]||[]){
  const home=teamById.get(Number(m.homeId)),away=teamById.get(Number(m.awayId));
  if(!home||!away) throw new Error('Fixture com ID de time desconhecido');
  let hs=home.points[String(r)]??null,as=away.points[String(r)]??null;
  if(league.rodadaParcial===r){hs=home.partial??null;as=away.partial??null;}
  m.homeScore=hs;m.awayScore=as;
  if(hs===null||as===null){m.homePts=null;m.awayPts=null;}
  else if(hs>as){m.homePts=3;m.awayPts=0;}
  else if(hs<as){m.homePts=0;m.awayPts=3;}
  else {m.homePts=1;m.awayPts=1;}
 }
}
const stats=new Map(teamData.map(t=>[t.id,{name:t.name,points:0,wins:0,draws:0,losses:0,sg:0,played:0}]));
for(const matches of Object.values(competition.rounds)) for(const m of matches){
 if(m.homeScore===null||m.awayScore===null) continue;
 const h=stats.get(Number(m.homeId)),a=stats.get(Number(m.awayId));
 h.played++;a.played++;h.sg+=m.homeScore-m.awayScore;a.sg+=m.awayScore-m.homeScore;
 h.points+=m.homePts;a.points+=m.awayPts;
 if(m.homePts===3){h.wins++;a.losses++} else if(m.awayPts===3){a.wins++;h.losses++} else {h.draws++;a.draws++}
}
competition.standings=[...stats.values()].map(s=>({name:s.name,points:s.points,wins:s.wins,draws:s.draws,losses:s.losses,sg:s.sg,played:s.played})).sort((a,b)=>b.points-a.points||b.wins-a.wins||b.sg-a.sg);
site.pointsCompetition=competition;
site.updatedAt=league.atualizadoEm||new Date().toISOString();
await writeFile(sitePath,JSON.stringify(site,null,2)+'\\n');
console.log('H2H atualizado: calendário preservado, resultados e classificação recalculados.');
