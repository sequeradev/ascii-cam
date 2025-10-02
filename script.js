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

    ascii.style.display = 'block';
    startBt.style.display = 'none';
    updateAsciiSize();
    loopASCII();
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
    requestAnimationFrame(render);
  };

  render();
}

function updateAsciiSize() {
  const wrapper = document.getElementById('asciiWrapper');
  const availableWidth = wrapper.clientWidth;
  const availableHeight = wrapper.clientHeight;

  const charWidth = availableWidth / canvasWidth;
  const charHeight = availableHeight / canvasHeight;

  const fontSize = Math.min(charWidth, charHeight);
  const clampedSize = Math.max(4, Math.min(fontSize, 20));

  ascii.style.fontSize = clampedSize + 'px';
  ascii.style.lineHeight = clampedSize + 'px';
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

window.addEventListener('resize', () => {
  if (ascii.style.display !== 'none') {
    updateAsciiSize();
  }
});
