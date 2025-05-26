// — Elementos DOM —
const video   = document.getElementById('video');
const ascii   = document.getElementById('ascii');
const startBt = document.getElementById('start');
const resRng  = document.getElementById('res');
const greenBt = document.getElementById('green');
const snapBt  = document.getElementById('snap');
const fontSelector = document.getElementById('fontSelector');
const charSetSelector = document.getElementById('charSetSelector');

// — Constantes y estado —
const CHARS_DEFAULT = "@#S%?*+;:,. ";
const CHARS_DENSE = "$@B%8&WM#*oahkbdpqwmZO0QLCJUYXzcvunxrjft/\\|()1{}[]?-_+~<>i!lI;:,\"^'. ";
const CHARS_BLOCKS = "█▓▒░ ";
let currentAsciiChars = CHARS_DEFAULT;
let w = parseInt(resRng.value,10);
let h = Math.round(w*9/16);
let green = false;

// — Detectar móvil/iOS —
const isIOS    = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isMobile = /Mobi|Android/i.test(navigator.userAgent);

// — Pide cámara y espera a playing() —
async function initCamera(){
  try{
    const stream=await navigator.mediaDevices.getUserMedia({video:{aspectRatio:16/9}});
    video.srcObject=stream;
    await new Promise(res=>{
      const onPlay=()=>{video.removeEventListener('playing',onPlay);res();};
      video.addEventListener('playing',onPlay);
      video.play().catch(res);
    });
    ascii.style.display='block';
    if(startBt)startBt.style.display='none';
    updateFont();
    loopASCII();
  }catch(err){alert("Error al acceder a cámara:\n"+err);}
}

// — Bucle ASCII —
function loopASCII(){
  const canvas=document.createElement('canvas');
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  canvas.width=w;canvas.height=h;

  const render=()=>{
    ctx.save();ctx.translate(w,0);ctx.scale(-1,1);
    ctx.drawImage(video,0,0,w,h);ctx.restore();

    const pix=ctx.getImageData(0,0,w,h).data;
    let out='';for(let i=0;i<pix.length;i+=4){
      const g=(pix[i]+pix[i+1]+pix[i+2])/3;
      out+=currentAsciiChars[Math.floor(g/255*(currentAsciiChars.length-1))];
      if(((i/4)+1)%w===0)out+='\n';
    }
    ascii.textContent=out;
    requestAnimationFrame(render);
  };
  render();
}

// — Mantener ancho visual —
function updateFont(){
  const containerW = document.getElementById('asciiWrapper').clientWidth;
  const desiredFs = containerW / w; // How small chars would be to fit
  const minFs = 4;  // Minimum legible font size for pixel fonts
  const maxFs = 18; // Max font size (can be adjusted)
  
  let fs = Math.max(minFs, desiredFs); // Ensure font is at least minFs
  fs = Math.min(fs, maxFs);           // But not larger than maxFs

  // If desiredFs is very small (high w), and we've clamped it up to minFs,
  // the text might overflow. We should consider if we want to allow
  // horizontal scrolling for the <pre> element in such cases,
  // or if the current `overflow:hidden` on `asciiWrapper` is preferred.
  // For now, let's stick to the font adjustment.

  ascii.style.fontSize = fs + 'px';
  ascii.style.lineHeight = fs + 'px'; // Keep line height tight for ASCII
}

// — Eventos UI —
resRng.addEventListener('input',()=>{w=parseInt(resRng.value,10);h=Math.round(w*9/16);updateFont();});
greenBt.addEventListener('click',()=>{green=!green;ascii.style.color=green?'#0f0':'#fff';greenBt.textContent=green?'White Mode':'Green Mode';});
snapBt.addEventListener('click',async()=>{await navigator.clipboard.writeText(ascii.textContent);snapBt.textContent="✓ Copied!";setTimeout(()=>snapBt.textContent="Copy Snapshot",1000);});
fontSelector.addEventListener('change', () => {
  const selectedFont = fontSelector.value;
  if (selectedFont === "Press Start 2P") {
    document.body.style.fontFamily = "var(--font-pixel)";
    ascii.style.fontFamily = "var(--font-pixel)";
  } else { // DotGothic16
    document.body.style.fontFamily = "var(--font)";
    ascii.style.fontFamily = "var(--font)";
  }
  updateFont(); // Recalculate font size for ASCII art
});

charSetSelector.addEventListener('change', (event) => {
  const selectedSet = event.target.value;
  switch (selectedSet) {
    case 'dense':
      currentAsciiChars = CHARS_DENSE;
      break;
    case 'blocks':
      currentAsciiChars = CHARS_BLOCKS;
      break;
    default: // 'default'
      currentAsciiChars = CHARS_DEFAULT;
      break;
  }
  // The loopASCII function will automatically pick up the new char set
});

// — Arranque —
if(isIOS||isMobile){startBt.style.display='block';startBt.addEventListener('click',initCamera);}
else{window.addEventListener('load',initCamera);}
