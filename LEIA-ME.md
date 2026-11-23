# Cartoleiros Brothers

Site da liga no GitHub Pages. Um robô (GitHub Actions) busca os dados públicos
dos times no Cartola e salva em `data/liga.json`; o `index.html` só lê esse arquivo.

- `times.json` → lista dos times da liga (edite aqui)
- `scripts/atualizar.mjs` → busca os dados
- `.github/workflows/atualizar.yml` → roda o script a cada 3 horas
- `index.html` → o site
