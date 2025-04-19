// — Constantes & elementos —
const video    = document.getElementById('video');
const ascii    = document.getElementById('ascii');
const startBtn = document.getElementById('start');
const resRng   = document.getElementById('res');
const greenBtn = document.getElementById('green');
const snapBtn  = document.getElementById('snap');

const CHARSET = "@#S%?*+;:,. ";

let sampleW = parseInt(resRng.value, 10);
let sampleH = Math.round(sampleW * 9 / 16);
let greenMode = false;

// — Función para arrancar la cámara (en user gesture) —
async function startCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: { aspectRatio: 16/9 } });
    video.srcObject = stream;
    video.style.display = 'none';        // ocultamos video
    startBtn.style.display = 'none';     // quitamos el botón
    ascii.style.display = 'block';       // mostramos el ASCII
    loop();                              // arrancamos bucle
  } catch (err) {
    alert("No se pudo acceder a la cámara:\n" + err);
  }
}

// — Bucle principal de dibujo —
function loop() {
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width  = sampleW;
  canvas.height = sampleH;

  // efecto espejo fijo
  ctx.save();
  ctx.translate(sampleW, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, sampleW, sampleH);
  ctx.restore();

  const data = ctx.getImageData(0, 0, sampleW, sampleH).data;
  let out = '';
  for (let i = 0; i < data.length; i += 4) {
    const avg = (data[i] + data[i+1] + data[i+2]) / 3;
    out += CHARSET[Math.floor(avg / 255 * (CHARSET.length - 1))];
    if ((i/4 + 1) % sampleW === 0) out += '\n';
  }
  ascii.textContent = out;
  requestAnimationFrame(loop);
}

// — Control de resolución sin cambiar área visual —
resRng.addEventListener('input', () => {
  sampleW = parseInt(resRng.value,10);
  sampleH = Math.round(sampleW * 9 / 16);
  // calcular font-size para mantener constante ancho visual ~ sampleW*charWidth
  const charWidth = sampleW * 0.6; // aproximado
  const fontSize = (window.innerWidth * 0.9) / charWidth; 
  ascii.style.fontSize   = fontSize + 'px';
  ascii.style.lineHeight = fontSize + 'px';
});

// — Modo Matrix verde/blanco —
greenBtn.addEventListener('click', () => {
  greenMode = !greenMode;
  ascii.style.color = greenMode ? '#0f0' : '#fff';
  greenBtn.textContent = greenMode ? 'White Mode' : 'Green Mode';
});

// — Copiar snapshot —
snapBtn.addEventListener('click', async () => {
  await navigator.clipboard.writeText(ascii.textContent);
  snapBtn.textContent = "✓ Copied!";
  setTimeout(() => snapBtn.textContent = "Copy Snapshot", 1000);
});

// — Evento de click para iniciar cámara —
startBtn.addEventListener('click', startCamera);
