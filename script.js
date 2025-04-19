// — elementos del DOM —
const video   = document.getElementById('video');
const ascii   = document.getElementById('ascii');
const startBt = document.getElementById('start');
const resRng  = document.getElementById('res');
const greenBt = document.getElementById('green');
const snapBt  = document.getElementById('snap');

// — constantes —
const CHARS = "@#S%?*+;:,. ";

// — estado inicial —
let w = parseInt(resRng.value, 10);
let h = Math.round(w * 9 / 16);
let green = false;

// — detección iOS para el botón —
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);

// — función de init que pide permisos y espera a play() —
async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { aspectRatio: 16/9 }
    });
    video.srcObject = stream;
    // Espera a que empiece realmente a reproducirse:
    await new Promise(resolve => {
      const check = () => {
        if (video.readyState >= 2) {
          video.removeEventListener('playing', check);
          return resolve();
        }
      };
      video.addEventListener('playing', check);
      video.play().catch(resolve);
    });

    // Muestra ASCII, oculta botón y arranca loop
    ascii.style.display = 'block';
    startBt.style.display = 'none';
    updateFont();
    loopASCII();
  } catch (err) {
    alert("No se pudo acceder a la cámara:\n" + err);
  }
}

// — bucle ASCII separado —
function loopASCII() {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width  = w;
  canvas.height = h;

  function frame() {
    // espejo
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    // lectura píxeles
    const data = ctx.getImageData(0, 0, w, h).data;
    let out = '';
    for (let i = 0; i < data.length; i += 4) {
      const avg = (data[i] + data[i+1] + data[i+2]) / 3;
      out += CHARS[Math.floor(avg / 255 * (CHARS.length - 1))];
      if (((i/4)+1) % w === 0) out += '\n';
    }
    ascii.textContent = out;
    requestAnimationFrame(frame);
  }

  frame();
}

// — recalcular font-size para mantener ancho visual —
function updateFont() {
  const charWidth = w * 0.6;
  const targetW   = Math.min(window.innerWidth * 0.9, 960);
  const fs        = targetW / charWidth;
  ascii.style.fontSize   = fs + 'px';
  ascii.style.lineHeight = fs + 'px';
}

// — manejadores de controles —
resRng.addEventListener('input', () => {
  w = parseInt(resRng.value, 10);
  h = Math.round(w * 9 / 16);
  updateFont();
});

greenBt.addEventListener('click', () => {
  green = !green;
  ascii.style.color = green ? '#0f0' : '#fff';
  greenBt.textContent = green ? 'White Mode' : 'Green Mode';
});

snapBt.addEventListener('click', async () => {
  await navigator.clipboard.writeText(ascii.textContent);
  snapBt.textContent = "✓ Copied!";
  setTimeout(() => snapBt.textContent = "Copy Snapshot", 1000);
});

// — arranque automático vs botón —
if (isIOS) {
  startBt.addEventListener('click', initCamera);
} else {
  window.addEventListener('load', initCamera);
}
