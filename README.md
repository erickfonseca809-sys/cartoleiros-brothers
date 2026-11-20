# Cartoleiros Brothers

Site da liga com classificação acumulada e parciais da rodada.

O workflow **Atualizar e publicar Cartoleiros Brothers** consulta a API pública do Cartola a cada 30 minutos, atualiza `docs/data.json` e publica o site pelo GitHub Pages.

Para a primeira publicação, abra **Settings → Pages** e selecione **GitHub Actions** como fonte. Depois execute o workflow manualmente em **Actions**.
