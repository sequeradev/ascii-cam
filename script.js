// — Elementos DOM —
const video   = document.getElementById('video');
const ascii   = document.getElementById('ascii');
const startBt = document.getElementById('start');
const resRng  = document.getElementById('res');
const greenBt = document.getElementById('green');
const snapBt  = document.getElementById('snap');

// — Constantes y estado —
const CHARS = "@#S%?*+;:,. ";
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
      out+=CHARS[Math.floor(g/255*(CHARS.length-1))];
      if(((i/4)+1)%w===0)out+='\n';
    }
    ascii.textContent=out;
    requestAnimationFrame(render);
  };
  render();
}

// — Mantener ancho visual —
function updateFont(){
  const containerW=document.getElementById('asciiWrapper').clientWidth;
  const fs=Math.min(containerW/w,14);      // máx 14 px
  ascii.style.fontSize=fs+'px';
  ascii.style.lineHeight=fs+'px';
}

// — Eventos UI —
resRng.addEventListener('input',()=>{w=parseInt(resRng.value,10);h=Math.round(w*9/16);updateFont();});
greenBt.addEventListener('click',()=>{green=!green;ascii.style.color=green?'#0f0':'#fff';greenBt.textContent=green?'White Mode':'Green Mode';});
snapBt.addEventListener('click',async()=>{await navigator.clipboard.writeText(ascii.textContent);snapBt.textContent="✓ Copied!";setTimeout(()=>snapBt.textContent="Copy Snapshot",1000);});

// — Arranque —
if(isIOS||isMobile){startBt.style.display='block';startBt.addEventListener('click',initCamera);}
else{window.addEventListener('load',initCamera);}
