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
