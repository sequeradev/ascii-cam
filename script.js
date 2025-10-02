const video = document.getElementById('video');
const ascii = document.getElementById('ascii');
const startBt = document.getElementById('start');
const resRng = document.getElementById('res');
const resValue = document.getElementById('resValue');
const greenBt = document.getElementById('green');
const snapBt = document.getElementById('snap');

const CHARS = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

let w = parseInt(resRng.value, 10);
let h = Math.round(w * 9 / 16);
let green = true;
let canvasWidth = w;
let canvasHeight = h;

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

if (isIOS || isMobile) {
  startBt.classList.add('visible');
  startBt.addEventListener('click', initCamera);
} else {
  window.addEventListener('load', initCamera);
}

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user',
        aspectRatio: 16/9
      }
    });
    video.srcObject = stream;

    await new Promise(resolve => {
      const onPlay = () => {
        video.removeEventListener('playing', onPlay);
        resolve();
      };
      video.addEventListener('playing', onPlay);
      video.play().catch(resolve);
    });

    ascii.classList.add('active');
    ascii.style.display = 'block';
    startBt.style.display = 'none';
    updateAsciiSize();
    loopASCII();
    setTimeout(() => animateScanline(), 500);
  } catch (err) {
    alert("Camera access error:\n" + err.message);
  }
}

function loopASCII() {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const render = () => {
    ctx.save();
    ctx.translate(canvasWidth, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);
    ctx.restore();

    const pix = ctx.getImageData(0, 0, canvasWidth, canvasHeight).data;
    let out = '';

    for (let i = 0; i < pix.length; i += 4) {
      const brightness = (pix[i] + pix[i + 1] + pix[i + 2]) / 3;
      const charIndex = Math.floor((brightness / 255) * (CHARS.length - 1));
      out += CHARS[charIndex];
      if (((i / 4) + 1) % canvasWidth === 0) out += '\n';
    }

    ascii.textContent = out;
    applyMatrixEffect();
    requestAnimationFrame(render);
  };

  render();
}

function updateAsciiSize() {
  const wrapper = document.getElementById('asciiWrapper');
  const wrapperWidth = wrapper.clientWidth * 0.9;
  const wrapperHeight = wrapper.clientHeight * 0.9;

  const charAspectRatio = 0.6;

  const fontSizeByWidth = wrapperWidth / (canvasWidth * charAspectRatio);
  const fontSizeByHeight = wrapperHeight / canvasHeight;

  let fontSize = Math.min(fontSizeByWidth, fontSizeByHeight);
  fontSize = Math.max(1, Math.min(fontSize, 30));

  ascii.style.fontSize = fontSize + 'px';
  ascii.style.lineHeight = fontSize + 'px';
  ascii.style.width = 'auto';
  ascii.style.height = 'auto';
  ascii.style.margin = '0';
  ascii.style.display = 'block';
  ascii.style.textAlign = 'center';
}

resRng.addEventListener('input', () => {
  w = parseInt(resRng.value, 10);
  h = Math.round(w * 9 / 16);
  canvasWidth = w;
  canvasHeight = h;
  resValue.textContent = w;
  updateAsciiSize();
});

greenBt.addEventListener('click', () => {
  green = !green;
  if (green) {
    ascii.style.color = '#00ff00';
    greenBt.textContent = 'WHITE';
  } else {
    ascii.style.color = '#ffffff';
    greenBt.textContent = 'MATRIX';
  }
});

snapBt.addEventListener('click', async () => {
  const asciiText = ascii.textContent;

  const formattedText = '```\n' + asciiText + '\n```';

  try {
    await navigator.clipboard.writeText(formattedText);
    const originalText = snapBt.textContent;
    snapBt.textContent = "COPIED!";
    setTimeout(() => {
      snapBt.textContent = originalText;
    }, 1500);
  } catch (err) {
    try {
      await navigator.clipboard.writeText(asciiText);
      const originalText = snapBt.textContent;
      snapBt.textContent = "COPIED!";
      setTimeout(() => {
        snapBt.textContent = originalText;
      }, 1500);
    } catch (err2) {
      alert("Copy failed: " + err2.message);
    }
  }
});

let matrixRainActive = false;
let raindrops = [];

function applyMatrixEffect() {
  if (!matrixRainActive) return;

  const lines = ascii.textContent.split('\n');
  if (lines.length < 2) return;

  if (raindrops.length === 0 || Math.random() > 0.7) {
    const col = Math.floor(Math.random() * canvasWidth);
    raindrops.push({ col, row: 0, length: Math.floor(Math.random() * 10) + 5 });
  }

  raindrops = raindrops.filter(drop => drop.row < canvasHeight + drop.length);
  raindrops.forEach(drop => drop.row++);
}

let scanlinePos = 0;
let scanlineDirection = 1;

function animateScanline() {
  if (!ascii.style.display || ascii.style.display === 'none') return;

  scanlinePos += scanlineDirection * 2;

  if (scanlinePos >= 100) scanlineDirection = -1;
  if (scanlinePos <= 0) scanlineDirection = 1;

  ascii.style.backgroundImage = `linear-gradient(180deg, transparent ${scanlinePos}%, rgba(0,255,0,0.03) ${scanlinePos + 1}%, transparent ${scanlinePos + 2}%)`;

  requestAnimationFrame(animateScanline);
}

window.addEventListener('resize', () => {
  if (ascii.style.display !== 'none') {
    updateAsciiSize();
  }
});

function triggerGlitch() {
  ascii.style.animation = 'flicker-text 0.15s infinite, glitch 0.3s';
  setTimeout(() => {
    ascii.style.animation = 'flicker-text 0.15s infinite';
  }, 300);
}

setInterval(() => {
  if (ascii.classList.contains('active') && Math.random() > 0.7) {
    triggerGlitch();
  }
}, 3000);

setTimeout(() => {
  if (ascii.style.display !== 'none') {
    animateScanline();
  }
}, 1000);
