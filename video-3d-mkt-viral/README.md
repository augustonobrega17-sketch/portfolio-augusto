# Vídeo 3D: temas virais de marketing

Reel vertical (1080x1920, 28 s) animado em 3D: **`gancho-flopou-3d.mp4`**.
Roteiro, ganchos testados e legenda em [`ROTEIRO.md`](ROTEIRO.md).

## Como foi feito

- `scene.html` + `scene.js`: cena Three.js com bloom. Cada quadro é função do tempo
  (`window.renderAt(t)`), então o render é determinístico.
- `music.py`: trilha eletrônica gerada com numpy, sincronizada com os cortes.
- `render.mjs`: abre a cena no Chromium headless (Playwright), captura os 840 quadros
  e monta o MP4 com ffmpeg + a trilha.

## Rodar de novo

```bash
npm install
python3 music.py                       # gera trilha.wav
NODE_PATH=$(npm root -g) node render.mjs   # gera gancho-flopou-3d.mp4
node render.mjs --stills 0.5,8,26      # só alguns quadros (prévia)
```

Prévia ao vivo no navegador: sirva a pasta e abra `scene.html?play`.
Para mudar textos e tempos, edite `scene.html` (cartelas `data-in`/`data-out`) e
`CUTS` em `scene.js` e `music.py`.
