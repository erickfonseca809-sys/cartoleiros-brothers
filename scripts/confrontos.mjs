// Gera calendário de pontos corridos (20 times, ida e volta) e integra ao site.
import { readFile, writeFile } from 'node:fs/promises';

const path = 'docs/data.json';
const data = JSON.parse(await readFile(path, 'utf8'));
const teams = (data.teams || []).filter(t => Number.isInteger(Number(t.id))).map(t => ({
  id: Number(t.id), name: t.name, owner: t.owner
}));
if (teams.length !== 20) throw new Error(`Esperados 20 times com ID; encontrados ${teams.length}`);

const fixed = teams[0];
let rotating = teams.slice(1);
const firstLeg = [];
for (let round = 0; round < 19; round++) {
  const slots = [fixed, ...rotating];
  const fixtures = [];
  for (let i = 0; i < 10; i++) {
    const a = slots[i], b = slots[19 - i];
    // Alterna mando para evitar viés de calendário.
    const home = round % 2 === 0 ? a : b;
    const away = round % 2 === 0 ? b : a;
    fixtures.push({ homeId: home.id, awayId: away.id, homeScore: null, awayScore: null, homePts: null, awayPts: null });
  }
  firstLeg.push(fixtures);
  rotating = [rotating.at(-1), ...rotating.slice(0, -1)];
}
const rounds = {};
firstLeg.forEach((fixtures, i) => { rounds[String(i + 1)] = fixtures; });
firstLeg.forEach((fixtures, i) => {
  rounds[String(i + 20)] = fixtures.map(m => ({
    homeId: m.awayId, awayId: m.homeId, homeScore: null, awayScore: null, homePts: null, awayPts: null
  }));
});
const pointsCompetition = {
  rounds,
  teams: Object.fromEntries(teams.map(t => [String(t.id), t.name])),
  standings: []
};
data.pointsCompetition = pointsCompetition;
data.updatedAt = new Date().toISOString();
data.source = (data.source || 'Cartola') + ' • calendário H2H gerado';
await writeFile(path, JSON.stringify(data, null, 2) + '\n');
console.log('Calendário H2H gerado: 38 rodadas, 10 confrontos por rodada, 20 times.');
