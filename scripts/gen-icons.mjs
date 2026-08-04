// Gera os PNGs de marca da Zelo (prédio branco no azul) a partir do símbolo em SVG.
// Ferramenta de build — rode com: npm i sharp --no-save && node scripts/gen-icons.mjs
import sharp from 'sharp';

const BLUE = '#12568F';
// Prédio da marca (mesmo desenho do wordmark). viewBox 24x56; janelas/porta são
// recortes (fill-rule evenodd) — aparecem com a cor do fundo atrás.
const PATH =
  'M4 9 A3 3 0 0 1 7 6 H17 A3 3 0 0 1 20 9 V56 H4 Z ' +
  'M8 14 h3.2 v4 h-3.2 Z M12.8 14 h3.2 v4 h-3.2 Z ' +
  'M8 24 h3.2 v4 h-3.2 Z M12.8 24 h3.2 v4 h-3.2 Z ' +
  'M8 34 h3.2 v4 h-3.2 Z M12.8 34 h3.2 v4 h-3.2 Z ' +
  'M9.6 46 h4.8 v10 h-4.8 Z';
const VB_W = 24;
const VB_H = 56;

function svg({ size, bg, buildingH, fill = '#ffffff' }) {
  const s = buildingH / VB_H;
  const bw = VB_W * s;
  const tx = (size - bw) / 2;
  const ty = (size - buildingH) / 2;
  const bgRect = bg ? `<rect width="${size}" height="${size}" fill="${bg}"/>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${bgRect}<g transform="translate(${tx} ${ty}) scale(${s})"><path fill="${fill}" fill-rule="evenodd" d="${PATH}"/></g></svg>`;
}

const dir = 'assets/images';
const jobs = [
  // Ícone principal do app: prédio branco no azul (o SO arredonda as bordas).
  { name: 'icon.png', opt: { size: 1024, bg: BLUE, buildingH: 560 } },
  // Favicon web.
  { name: 'favicon.png', opt: { size: 196, bg: BLUE, buildingH: 108 } },
  // Splash: só o prédio (transparente) sobre o fundo azul da splash (app.json).
  { name: 'splash-icon.png', opt: { size: 512, bg: null, buildingH: 360 } },
  // Ícone adaptativo Android — camada da frente (dentro da zona segura).
  { name: 'android-icon-foreground.png', opt: { size: 1024, bg: null, buildingH: 460 } },
  // Camada monocromática (temas do Android): silhueta com recortes.
  { name: 'android-icon-monochrome.png', opt: { size: 1024, bg: null, buildingH: 460 } },
];

for (const j of jobs) {
  await sharp(Buffer.from(svg(j.opt))).png().toFile(`${dir}/${j.name}`);
  console.log('gerado:', j.name);
}

// Camada de fundo do ícone adaptativo: azul sólido.
await sharp({ create: { width: 1024, height: 1024, channels: 4, background: BLUE } })
  .png()
  .toFile(`${dir}/android-icon-background.png`);
console.log('gerado: android-icon-background.png');
