import { readFile } from 'node:fs/promises';

const data = JSON.parse(await readFile('data/liga.json', 'utf8'));
const errors = [];
if (!data.liga) errors.push('Nome da liga ausente');
if (!Number.isInteger(data.rodadaAtual)) errors.push('Rodada atual inválida');
if (!Array.isArray(data.times) || data.times.length === 0) errors.push('Lista de times vazia');
for (const t of data.times || []) {
  if (!t.dono || !t.busca || !t.slug) errors.push('Time com identificação incompleta: ' + (t.busca || '(sem nome)'));
  if (!t.pontos || typeof t.pontos !== 'object') errors.push('Histórico de pontos ausente: ' + (t.busca || t.dono));
}
if (errors.length) {
  console.error('Validação falhou:');
  errors.forEach(e => console.error('- ' + e));
  process.exit(1);
}
const nulos = (data.times || []).reduce((sum, t) => sum + Object.values(t.pontos || {}).filter(v => v === null).length, 0);
console.log('Validação estrutural OK:', data.times.length, 'times, rodada', data.rodadaAtual);
if (nulos) console.warn('Aviso: existem', nulos, 'pontuações nulas no histórico; revisar integração com API.');

const site = JSON.parse(await readFile('docs/data.json', 'utf8'));
const comp = site.pointsCompetition || {};
const rounds = comp.rounds || {};
const errorsH2H = [];
if (Object.keys(rounds).length !== 38) errorsH2H.push('Calendário deve conter 38 rodadas');
const teamIds = Object.keys(comp.teams || {});
if (teamIds.length !== 20) errorsH2H.push('Calendário deve conter 20 times');
for (let r = 1; r <= 38; r++) {
  const fixtures = rounds[String(r)] || [];
  if (fixtures.length !== 10) errorsH2H.push('Rodada ' + r + ' deve conter 10 confrontos');
  const appearances = fixtures.flatMap(m => [String(m.homeId), String(m.awayId)]);
  if (new Set(appearances).size !== 20) errorsH2H.push('Rodada ' + r + ' não contém todos os times uma única vez');
}
const pairCounts = new Map();
for (const fixtures of Object.values(rounds)) for (const m of fixtures) {
  const pair = [String(m.homeId), String(m.awayId)].sort().join(':');
  pairCounts.set(pair, (pairCounts.get(pair) || 0) + 1);
}
if (pairCounts.size !== 190 || [...pairCounts.values()].some(n => n !== 2))
  errorsH2H.push('Cada par de times deve se enfrentar exatamente duas vezes');
if (errorsH2H.length) {
  console.error('Validação H2H falhou:');
  errorsH2H.forEach(e => console.error('- ' + e));
  process.exit(1);
}
console.log('Validação H2H OK: 38 rodadas, 380 partidas, 190 pares ida e volta.');
