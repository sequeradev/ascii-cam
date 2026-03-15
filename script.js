const video = document.getElementById('video');
const ascii = document.getElementById('ascii');
const startBt = document.getElementById('start');
const resLowBt = document.getElementById('resLow');
const resMedBt = document.getElementById('resMed');
const resHighBt = document.getElementById('resHigh');
const greenBt = document.getElementById('green');
const snapBt = document.getElementById('snap');
const brightnessInput = document.getElementById('brightness');
const contrastInput = document.getElementById('contrast');
const brightnessValue = document.getElementById('brightnessValue');
const contrastValue = document.getElementById('contrastValue');
const asciiViewport = document.getElementById('asciiViewport');
const exportCanvas = document.getElementById('exportCanvas');

const CHARS = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";
const CHAR_ASPECT_RATIO = 0.58;
const ASCII_PADDING = 0.88;

const RES_LOW = 50;
const RES_MED = 90;
const RES_HIGH = 160;

let canvasWidth = RES_MED;
let canvasHeight = Math.round(canvasWidth * 9 / 16);
let green = true;
let brightness = 0;
let contrast = 0;
let matrixRainActive = false;
let raindrops = [];
let animationFrameId = null;
let resizeTimeout = null;
let scanlinePos = 0;
let scanlineDirection = 1;
let scanlineFrameId = null;

const renderCanvas = document.createElement('canvas');
const renderContext = renderCanvas.getContext('2d');
const exportContext = exportCanvas.getContext('2d');

startBt.classList.add('visible');
startBt.addEventListener('click', initCamera);

resLowBt.addEventListener('click', () => setResolution(RES_LOW));
resMedBt.addEventListener('click', () => setResolution(RES_MED));
resHighBt.addEventListener('click', () => setResolution(RES_HIGH));

greenBt.addEventListener('click', () => {
  green = !green;
  syncAsciiTone();
});

snapBt.addEventListener('click', () => {
  try {
    exportAsciiPng();
    flashButtonLabel(snapBt, 'SAVED!');
  } catch (err) {
    alert("Save failed: " + err.message);
  }
});

asciiViewport.addEventListener('click', toggleAsciiFullscreen);
asciiViewport.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    toggleAsciiFullscreen();
  }
});

brightnessInput.addEventListener('input', (event) => {
  brightness = Number(event.target.value);
  brightnessValue.textContent = brightness;
});

contrastInput.addEventListener('input', (event) => {
  contrast = Number(event.target.value);
  contrastValue.textContent = contrast;
});

window.addEventListener('resize', scheduleResizeUpdate);
document.addEventListener('fullscreenchange', handleFullscreenChange);
document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

if (typeof ResizeObserver !== 'undefined') {
  const resizeObserver = new ResizeObserver(() => scheduleResizeUpdate());
  resizeObserver.observe(asciiViewport);
}

setInterval(() => {
  if (ascii.classList.contains('active') && Math.random() > 0.7) {
    triggerGlitch();
  }
}, 3000);

async function initCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: 'user'
      }
    });

    video.srcObject = stream;

    await new Promise((resolve) => {
      const onLoaded = () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        resolve();
      };

      video.addEventListener('loadedmetadata', onLoaded);
      video.play().catch(resolve);
    });

    if (video.readyState < 2) {
      await new Promise((resolve) => {
        video.addEventListener('playing', resolve, { once: true });
      });
    }

    ascii.classList.add('active');
    startBt.classList.remove('visible');
    startBt.style.display = 'none';
    syncCanvasResolution();
    updateAsciiSize();
    loopASCII();

    if (!scanlineFrameId) {
      scanlineFrameId = requestAnimationFrame(animateScanline);
    }
  } catch (err) {
    alert("Camera access error:\n" + err.message);
  }
}

function loopASCII() {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }

  const render = () => {
    if (video.readyState < 2) {
      animationFrameId = requestAnimationFrame(render);
      return;
    }

    if (renderCanvas.width !== canvasWidth || renderCanvas.height !== canvasHeight) {
      syncCanvasResolution();
    }

    renderContext.save();
    renderContext.clearRect(0, 0, canvasWidth, canvasHeight);
    renderContext.translate(canvasWidth, 0);
    renderContext.scale(-1, 1);
    renderContext.drawImage(video, 0, 0, canvasWidth, canvasHeight);
    renderContext.restore();

    const pix = renderContext.getImageData(0, 0, canvasWidth, canvasHeight).data;
    let out = '';

    for (let i = 0; i < pix.length; i += 4) {
      const mappedBrightness = getAdjustedBrightness(pix[i], pix[i + 1], pix[i + 2]);
      const charIndex = Math.floor((mappedBrightness / 255) * (CHARS.length - 1));
      out += CHARS[charIndex];
      if (((i / 4) + 1) % canvasWidth === 0) {
        out += '\n';
      }
    }

    ascii.textContent = out;
    applyMatrixEffect();
    animationFrameId = requestAnimationFrame(render);
  };

  render();
}

function updateAsciiSize() {
  const rect = asciiViewport.getBoundingClientRect();
  const viewportWidth = rect.width * ASCII_PADDING;
  const viewportHeight = rect.height * ASCII_PADDING;
  const fontSizeByWidth = viewportWidth / (canvasWidth * CHAR_ASPECT_RATIO);
  const fontSizeByHeight = viewportHeight / canvasHeight;
  let fontSize = Math.min(fontSizeByWidth, fontSizeByHeight);

  fontSize = Math.max(4, Math.min(fontSize, 60));

  ascii.style.fontSize = fontSize + 'px';
  ascii.style.lineHeight = fontSize + 'px';
  ascii.style.width = `${canvasWidth}ch`;
  ascii.style.height = `${canvasHeight}em`;
}

function setResolution(width) {
  canvasWidth = width;
  canvasHeight = Math.round(width * 9 / 16);
  syncCanvasResolution();
  updateAsciiSize();

  resLowBt.classList.remove('active');
  resMedBt.classList.remove('active');
  resHighBt.classList.remove('active');

  if (width === RES_LOW) {
    resLowBt.classList.add('active');
  } else if (width === RES_MED) {
    resMedBt.classList.add('active');
  } else if (width === RES_HIGH) {
    resHighBt.classList.add('active');
  }
}

function applyMatrixEffect() {
  if (!matrixRainActive) return;

  const lines = ascii.textContent.split('\n');
  if (lines.length < 2) return;

  if (raindrops.length === 0 || Math.random() > 0.7) {
    const col = Math.floor(Math.random() * canvasWidth);
    raindrops.push({ col, row: 0, length: Math.floor(Math.random() * 10) + 5 });
  }

  raindrops = raindrops.filter((drop) => drop.row < canvasHeight + drop.length);
  raindrops.forEach((drop) => drop.row++);
}

function animateScanline() {
  if (!ascii.classList.contains('active')) {
    scanlineFrameId = null;
    return;
  }

  scanlinePos += scanlineDirection * 2;

  if (scanlinePos >= 100) scanlineDirection = -1;
  if (scanlinePos <= 0) scanlineDirection = 1;

  ascii.style.backgroundImage = `linear-gradient(180deg, transparent ${scanlinePos}%, rgba(0,255,0,0.03) ${scanlinePos + 1}%, transparent ${scanlinePos + 2}%)`;
  scanlineFrameId = requestAnimationFrame(animateScanline);
}

function scheduleResizeUpdate() {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    if (ascii.classList.contains('active')) {
      updateAsciiSize();
    }
  }, 60);
}

function triggerGlitch() {
  ascii.style.animation = 'flicker-text 0.15s infinite, glitch 0.3s';
  setTimeout(() => {
    ascii.style.animation = 'flicker-text 0.18s infinite';
  }, 300);
}

function syncCanvasResolution() {
  renderCanvas.width = canvasWidth;
  renderCanvas.height = canvasHeight;
}

function syncAsciiTone() {
  ascii.style.color = green ? '#00ff00' : '#ffffff';
  greenBt.textContent = green ? 'WHITE' : 'MATRIX';
}

async function toggleAsciiFullscreen() {
  if (!ascii.classList.contains('active')) return;

  try {
    if (getFullscreenElement()) {
      await exitFullscreen();
      return;
    }

    if (asciiViewport.requestFullscreen) {
      await asciiViewport.requestFullscreen();
    } else if (asciiViewport.webkitRequestFullscreen) {
      asciiViewport.webkitRequestFullscreen();
    }
  } catch (error) {
    console.error('Fullscreen error:', error);
  }
}

function handleFullscreenChange() {
  const isFullscreen = Boolean(getFullscreenElement());
  document.body.classList.toggle('is-fullscreen', isFullscreen);
  asciiViewport.title = isFullscreen ? 'Click to exit fullscreen' : 'Click to toggle fullscreen';
  scheduleResizeUpdate();
}

function getFullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement;
}

function exitFullscreen() {
  if (document.exitFullscreen) {
    return document.exitFullscreen();
  }

  if (document.webkitExitFullscreen) {
    document.webkitExitFullscreen();
  }

  return Promise.resolve();
}

function getAdjustedBrightness(red, greenChannel, blue) {
  const base = (red + greenChannel + blue) / 3;
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const contrasted = contrastFactor * (base - 128) + 128;
  return clamp(contrasted + brightness, 0, 255);
}

function exportAsciiPng() {
  const fontSize = parseFloat(ascii.style.fontSize) || 12;
  const width = Math.ceil(canvasWidth * fontSize * CHAR_ASPECT_RATIO) + 48;
  const height = Math.ceil(canvasHeight * fontSize) + 48;

  exportCanvas.width = width;
  exportCanvas.height = height;

  exportContext.fillStyle = '#000000';
  exportContext.fillRect(0, 0, width, height);
  exportContext.fillStyle = green ? '#00ff00' : '#ffffff';
  exportContext.font = `${fontSize}px VT323, monospace`;
  exportContext.textBaseline = 'top';
  exportContext.shadowColor = exportContext.fillStyle;
  exportContext.shadowBlur = 6;

  const lines = ascii.textContent.split('\n');
  lines.forEach((line, index) => {
    exportContext.fillText(line, 24, 24 + index * fontSize);
  });

  const link = document.createElement('a');
  link.href = exportCanvas.toDataURL('image/png');
  link.download = `ascii-cam-${Date.now()}.png`;
  link.click();
}

function flashButtonLabel(button, label) {
  const originalText = button.textContent;
  button.textContent = label;
  setTimeout(() => {
    button.textContent = originalText;
  }, 1500);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

syncCanvasResolution();
syncAsciiTone();
