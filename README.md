# Cartoleiros Brothers

Projeto de dados e site da liga Cartoleiros Brothers.

## Coleta automática
O workflow do GitHub Actions consulta a API pública do Cartola a cada **3 horas** (e pode ser executado manualmente em Actions). O coletor atual grava em `data/liga.json`; o workflow valida a estrutura do arquivo antes de salvar alterações.

## Estado da integração
A página em `docs/index.html` ainda consome `docs/data.json`. A coleta atual grava em `data/liga.json`, portanto os dois formatos/caminhos ainda precisam ser integrados antes de afirmar que o site publicado recebe os dados automáticos.

## Primeira publicação do GitHub Pages
Em **Settings → Pages**, selecione GitHub Actions como fonte, se necessário.
