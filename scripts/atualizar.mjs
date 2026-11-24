// Busca os dados públicos do Cartola e salva em data/liga.json.
// Roda no GitHub Actions (Node 20+). Não usa login nem token.
import { readFile, writeFile } from 'node:fs/promises';

const API = 'https://api.cartola.globo.com';
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; cartoleiros-brothers)',
  'Accept': 'application/json',
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(path, tentativas = 3) {
  for (let i = 1; i <= tentativas; i++) {
    try {
      const res = await fetch(API + path, { headers: HEADERS });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.json();
    } catch (e) {
      if (i === tentativas) {
        console.warn(`Falhou ${path}: ${e.message}`);
        return null;
      }
      await sleep(1500 * i);
    }
  }
  return null;
}

const config = JSON.parse(await readFile('times.json', 'utf8'));
let anterior = { times: [] };
try { anterior = JSON.parse(await readFile('data/liga.json', 'utf8')); } catch {}

const status = await get('/mercado/status');
if (!status) {
  console.error('Não consegui ler /mercado/status. Mantendo os dados antigos.');
  process.exit(1);
}

const temporada = status.temporada ?? null;
// Reset cached teams and scores when Cartola starts a new season.
if (temporada && anterior.temporada && temporada !== anterior.temporada) {
  console.log(`Nova temporada ${temporada}; limpando cache da temporada ${anterior.temporada} e resolvendo times novamente.`);
  anterior = { times: [] };
}
const rodada = status.rodada_atual;
const st = status.status_mercado; // 1 = aberto, 2 = fechado (rodada em andamento)
let ultimaFechada = rodada;
let rodadaParcial = null;
if (st === 1) ultimaFechada = rodada - 1;
else if (st === 2 && status.bola_rolando === true) { ultimaFechada = rodada - 1; rodadaParcial = rodada; }
console.log(`Rodada atual: ${rodada} | status do mercado: ${st} | rodadas fechadas: 1 a ${ultimaFechada}`);

async function resolver(cfg) {
  if (cfg.slug) return { slug: cfg.slug };
  const busca = await get('/times?q=' + encodeURIComponent(cfg.time));
  if (!Array.isArray(busca) || busca.length === 0) return null;
  const norm = (s) => String(s).trim().toLowerCase();
  const exato = busca.find((t) => norm(t.nome) === norm(cfg.time));
  const escolhido = exato || busca[0];
  if (!exato) {
    console.warn(`"${cfg.time}": sem nome exato. Candidatos:`);
    busca.slice(0, 5).forEach((t) => console.warn(`   - ${t.nome} (slug: ${t.slug}, cartoleiro: ${t.nome_cartola})`));
    console.warn(`   Usando "${escolhido.slug}". Se estiver errado, coloque o "slug" certo no times.json.`);
  }
  return { slug: escolhido.slug, id: escolhido.time_id, escudo: escolhido.url_escudo_png };
}

const resultado = [];
for (const cfg of config.times) {
  const velho = anterior.times.find((t) => t.dono === cfg.dono && t.busca === cfg.time) || null;
  const info = velho && velho.slug ? { slug: velho.slug, id: velho.id, escudo: velho.escudo } : await resolver(cfg);
  if (!info) {
    console.warn(`Time não encontrado: ${cfg.time}`);
    continue;
  }
  const time = {
    dono: cfg.dono,
    busca: cfg.time,
    nome: velho?.nome || cfg.time,
    slug: info.slug,
    id: info.id ?? velho?.id ?? null,
    escudo: info.escudo ?? velho?.escudo ?? null,
    pontos: { ...(velho?.pontos || {}) },
    parcial: null,
  };

  // Só coleta rodada fechada quando o número da rodada avançou desde a execução anterior.
  // Evita consultas a rodadas antigas nesta temporada; na temporada nova, o cache reinicia.
  const r = ultimaFechada;
  const rodadaAvancou = !anterior.rodadaAtual || rodada > anterior.rodadaAtual;
  if (rodadaAvancou && r >= 1 && time.pontos[r] == null) {
    let d = await get(`/time/slug/${time.slug}/${r}`);
    await sleep(400);
    // Fallback server-side proxy when the official historical endpoint returns no data.
    if ((!d || typeof d.pontos !== 'number') && time.id) {
      try {
        const proxy = await fetch(`https://api.kartolafc.com.br/time/id/${time.id}/${r}`, { headers: HEADERS });
        if (proxy.ok) d = await proxy.json();
      } catch {}
      await sleep(250);
    }
    if (d?.time?.nome) time.nome = d.time.nome;
    if (d?.time?.url_escudo_png) time.escudo = d.time.url_escudo_png;
    time.pontos[r] = typeof d?.pontos === 'number' ? d.pontos : null;
  }

  if (rodadaParcial) {
    // Calculate team partials from official player scores, matching roster IDs.
    const [roster, playerScores] = await Promise.all([
      get(`/time/slug/${time.slug}/${rodadaParcial}`),
      get('/atletas/pontuados'),
    ]);
    const rosterPlayers = roster?.atletas;
    const scorePlayers = playerScores?.atletas;
    if (Array.isArray(rosterPlayers) && scorePlayers && typeof scorePlayers === 'object') {
      const ids = rosterPlayers.map(p => Number(p.atleta_id ?? p.id)).filter(Number.isFinite);
      const matched = ids.map(id => scorePlayers[String(id)]).filter(p => p && typeof p.pontuacao === 'number');
      if (ids.length && matched.length) {
        time.parcial = matched.reduce((sum, p) => sum + p.pontuacao, 0);
        console.log(`Parcial oficial calculada: ${time.nome} — ${matched.length}/${ids.length} atletas, ${time.parcial} pts`);
      } else {
        console.warn(`Roster/parciais sem correspondência para ${time.nome}; não atribuindo zero`);
      }
    } else {
      console.warn(`Formato de elenco/parciais não reconhecido para ${time.nome}`);
      console.log('Campos elenco:', roster ? Object.keys(roster) : 'sem resposta', 'Campos pontuados:', playerScores ? Object.keys(playerScores) : 'sem resposta');
    }
  }
  resultado.push(time);
  console.log(`OK: ${time.nome} (${time.dono})`);
}

if (resultado.length === 0) {
  console.error('Nenhum time encontrado. Confira o times.json.');
  process.exit(1);
}

await writeFile(
  'data/liga.json',
  JSON.stringify({
    atualizadoEm: new Date().toISOString(),
    liga: config.liga,
    temporada: status.temporada ?? null,
    rodadaAtual: rodada,
    rodadaParcial,
    times: resultado,
  }, null, 2),
);
console.log('data/liga.json atualizado.');
