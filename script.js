const video = document.getElementById('video');
const ascii = document.getElementById('ascii');
const startBt = document.getElementById('start');
const resLowBt = document.getElementById('resLow');
const resMedBt = document.getElementById('resMed');
const resHighBt = document.getElementById('resHigh');
const greenBt = document.getElementById('green');
const snapBt = document.getElementById('snap');

const CHARS = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^`'. ";

const RES_LOW = 50;
const RES_MED = 90;
const RES_HIGH = 160;

// Base resolution used to calculate the font size. Using the medium
// resolution as our reference allows us to keep the perceived size
// of the ASCII art consistent across different resolutions. When
// switching resolutions the ASCII art will be scaled relative to
// this base.
const BASE_WIDTH = RES_MED;
const BASE_HEIGHT = Math.round(BASE_WIDTH * 9 / 16);

let w = RES_MED;
let h = Math.round(w * 9 / 16);
let green = true;
let canvasWidth = w;
let canvasHeight = h;

/*
 * Always require a user gesture to start the camera.
 * On many mobile browsers (especially iOS/Safari) camera access
 * will fail unless it is triggered by a user interaction. Previously
 * we attempted to auto‑detect mobile devices and automatically
 * initialise the camera on desktop, but this caused confusion when
 * the user agent string did not match expectations or the Start
 * button wasn't visible. To simplify the behaviour, we now always
 * expose the START button and only initialise the camera when
 * the user clicks it. This approach avoids relying on user‑agent
 * detection and ensures consistent behaviour across platforms.
 */
startBt.classList.add('visible');
startBt.addEventListener('click', initCamera);

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
    // If the resolution has changed, resize the canvas on the fly. Without
    // this check the canvas retains its original dimensions, causing the
    // ASCII art to shrink or grow when switching resolutions. By
    // synchronizing the canvas size with `canvasWidth`/`canvasHeight` each
    // frame we ensure the sampled video matches the desired resolution.
    if (canvas.width !== canvasWidth || canvas.height !== canvasHeight) {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
    }

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
  // Reserve a small margin inside the wrapper so the art doesn't
  // touch the edges on mobile devices. We use 0.9 multiplier to
  // provide breathing room.
  // Use the majority of the available width/height for the ASCII art.
  // Slightly reduce the dimensions (95%) to prevent the art touching
  // the very edges of the viewport which can look cramped on small
  // devices.
  const wrapperWidth = wrapper.clientWidth * 0.95;
  const wrapperHeight = wrapper.clientHeight * 0.95;

  // Approximate width-to-height ratio of characters in the VT323
  // font. This is used to convert character counts into pixel
  // dimensions.
  const charAspectRatio = 0.6;

  // Calculate font size based on the **current** resolution rather than a
  // fixed base. We divide the available width by the number of
  // characters in a row (canvasWidth) and the character aspect ratio
  // to determine how wide each character can be. Similarly we divide
  // the available height by the number of rows (canvasHeight). Taking
  // the minimum of these values ensures the ASCII art fits within
  // both dimensions without overflowing.
  const fontSizeByWidth = wrapperWidth / (canvasWidth * charAspectRatio);
  const fontSizeByHeight = wrapperHeight / canvasHeight;

  let fontSize = Math.min(fontSizeByWidth, fontSizeByHeight);
  // Prevent the font size from becoming too small or too large.
  // On mobile devices we allow the font to grow larger to fill the
  // available space. A cap of 60px avoids excessively large text on
  // desktop screens.
  fontSize = Math.max(4, Math.min(fontSize, 60));

  ascii.style.fontSize = fontSize + 'px';
  ascii.style.lineHeight = fontSize + 'px';

  // No additional scaling is required. By basing the font size on
  // canvasWidth and canvasHeight we ensure the ASCII art maintains
  // consistent physical dimensions across resolutions. We only
  // translate the element to centre it within the wrapper.
  ascii.style.transform = 'translate(-50%, -50%)';
}

function setResolution(width) {
  w = width;
  h = Math.round(w * 9 / 16);
  canvasWidth = w;
  canvasHeight = h;
  updateAsciiSize();

  resLowBt.classList.remove('active');
  resMedBt.classList.remove('active');
  resHighBt.classList.remove('active');

  if (width === RES_LOW) resLowBt.classList.add('active');
  else if (width === RES_MED) resMedBt.classList.add('active');
  else if (width === RES_HIGH) resHighBt.classList.add('active');
}

resLowBt.addEventListener('click', () => setResolution(RES_LOW));
resMedBt.addEventListener('click', () => setResolution(RES_MED));
resHighBt.addEventListener('click', () => setResolution(RES_HIGH));

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
