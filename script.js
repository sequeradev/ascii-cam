// —— Constantes generales ——
const TARGET_WIDTH_PX = 960;          // Anchura visual constante (~pantalla)
const CHARSET = "@#S%?*+;:,. ";
const video   = document.getElementById('video');
const ascii   = document.getElementById('ascii');
const resRng  = document.getElementById('res');
const greenBtn= document.getElementById('green');
const snapBtn = document.getElementById('snap');

let sampleW = parseInt(resRng.value,10);
let sampleH = Math.round(sampleW * 9 / 16);
let greenMode = false;

// 1) Acceso a cámara (16:9)
navigator.mediaDevices.getUserMedia({video:{aspectRatio:16/9}})
  .then(s=>video.srcObject=s)
  .catch(err=>alert("No se pudo acceder a la cámara:\n"+err));

// 2) Cambiar resolución real sin variar tamaño visible
resRng.addEventListener('input', ()=>{
  sampleW = parseInt(resRng.value,10);
  sampleH = Math.round(sampleW * 9 / 16);

  // calculamos tamaño de letra para ocupar siempre el mismo ancho
  // charWidth ≈ fontSize * 0.6 → fontSize = TARGET / (sampleW*0.6)
  const fontSize = (TARGET_WIDTH_PX / (sampleW * 0.6));
  ascii.style.fontSize   = fontSize + 'px';
  ascii.style.lineHeight = fontSize + 'px';
});

// 3) Snapshot al portapapeles
snapBtn.addEventListener('click', async ()=>{
  await navigator.clipboard.writeText(ascii.textContent);
  snapBtn.textContent="✓ Copied!";
  setTimeout(()=>snapBtn.textContent="Copy Snapshot",1000);
});

// 4) Modo verde Matrix
greenBtn.addEventListener('click',()=>{
  greenMode = !greenMode;
  ascii.style.color = greenMode ? '#0f0' : '#fff';
  greenBtn.textContent = greenMode ? 'White Mode' : 'Green Mode';
});

video.addEventListener('playing', ()=>{
  const canvas = document.createElement('canvas');
  const ctx    = canvas.getContext('2d',{willReadFrequently:true});

  function loop(){
    canvas.width  = sampleW;
    canvas.height = sampleH;

    // espejo fijo
    ctx.save();
    ctx.translate(sampleW,0);
    ctx.scale(-1,1);
    ctx.drawImage(video,0,0,sampleW,sampleH);
    ctx.restore();

    const data = ctx.getImageData(0,0,sampleW,sampleH).data;
    let out='';
    for(let i=0;i<data.length;i+=4){
      const avg=(data[i]+data[i+1]+data[i+2])/3;
      out+=CHARSET[Math.floor(avg/255*(CHARSET.length-1))];
      if((i/4+1)%sampleW===0) out+='\n';
    }
    ascii.textContent = out;
    requestAnimationFrame(loop);
  }
  loop();
});
