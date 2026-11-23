import { readFile, writeFile } from 'node:fs/promises';

const league = JSON.parse(await readFile('data/liga.json', 'utf8'));
const current = JSON.parse(await readFile('docs/data.json', 'utf8'));
const oldH2H = current.pointsCompetition || null;
// IDs dos times são mantidos pelo coletor em data/liga.json.
const teams = (league.times || []).map(t => {
  const id = Number(t.id);
  if (!Number.isFinite(id)) throw new Error('ID ausente para '+t.nome);
  const points = t.pontos || {};
  const closedRounds = Object.entries(points).filter(([r,v])=>Number(r)<(league.rodadaParcial || (league.rodadaAtual+1)) && v!==null);
  const calculatedTotal = closedRounds.reduce((sum,[r,v])=>sum+Number(v),0);
  const oldTeam = (current.teams || []).find(old => Number(old.id) === id);
  // If API history is entirely missing, keep the last known website total instead of wiping it.
  const total = closedRounds.length ? calculatedTotal : Number(oldTeam?.total || 0);
  const partial = league.rodadaParcial ? (t.parcial ?? oldTeam?.live?.points ?? null) : null;
  return {
    id, name: t.nome, owner: t.dono, total, roundScores: points,
    totalWithLive: total + (partial || 0),
    roundsCount: closedRounds.length,
    missingRounds: Object.entries(points).filter(([r,v])=>Number(r)<=league.rodadaAtual && v===null).map(([r])=>Number(r)),
    live: { points: partial, playersCounted: null, playersMissing: null, isPartial: partial !== null, error: null }
  };
});
if (teams.length !== 20) throw new Error('Integração esperava 20 times, recebeu '+teams.length);
const mappedH2H = oldH2H && Object.keys(oldH2H.rounds || {}).length===38 ? oldH2H : null;
const next = {
  ...current,
  season: league.temporada,
  currentRound: league.rodadaAtual,
  marketStatus: null,
  ballRolling: null,
  updatedAt: league.atualizadoEm,
  source: 'API pública do Cartola • GitHub Actions',
  teams,
  ...(mappedH2H ? {pointsCompetition:mappedH2H} : {})
};
await writeFile('docs/data.json', JSON.stringify(next,null,2)+'\\n');
console.log('Dados da liga integrados em docs/data.json');
