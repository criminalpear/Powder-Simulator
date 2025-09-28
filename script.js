// S-Tier upgraded Quantum Sand simulator
// Built as an enhancement of the user's original project.
// Author: Upgraded by assistant

const canvas = document.getElementById('canvas');
const mini = document.getElementById('mini');
const ctx = canvas.getContext('2d', {alpha:false});
const miniCtx = mini.getContext('2d');
const controls = {
  material: document.getElementById('material'),
  brushSize: document.getElementById('brushSize'),
  brushSizeValue: document.getElementById('brushSizeValue'),
  brushShape: document.getElementById('brushShape'),
  simSpeed: document.getElementById('simSpeed'),
  simSpeedValue: document.getElementById('simSpeedValue'),
  gravity: document.getElementById('gravity'),
  gravityValue: document.getElementById('gravityValue'),
  wind: document.getElementById('wind'),
  windValue: document.getElementById('windValue'),
  pause: document.getElementById('pause'),
  clear: document.getElementById('clear'),
  undo: document.getElementById('undo'),
  redo: document.getElementById('redo'),
  save: document.getElementById('save'),
  load: document.getElementById('load'),
  loadFile: document.getElementById('loadFile'),
  exportImage: document.getElementById('exportImage'),
  addCustom: document.getElementById('addCustom'),
  customName: document.getElementById('customName'),
  customColor: document.getElementById('customColor'),
  customDensity: document.getElementById('customDensity'),
  customFlow: document.getElementById('customFlow'),
  customFlammable: document.getElementById('customFlammable'),
  fps: document.getElementById('fps'),
  particleCount: document.getElementById('particleCount'),
  avgTemp: document.getElementById('avgTemp'),
  heatmap: document.getElementById('heatmap'),
  showMini: document.getElementById('showMini'),
  slowMo: document.getElementById('slowMo'),
  symmetry: document.getElementById('symmetry'),
  presetVolcano: document.getElementById('presetVolcano'),
  presetRain: document.getElementById('presetRain'),
  presetForest: document.getElementById('presetForest'),
};

// Resolution settings (smaller grid for performance but visually crisp)
const WIDTH = 640;
const HEIGHT = 420;
const CELL_SIZE = 1;
canvas.width = WIDTH * CELL_SIZE;
canvas.height = HEIGHT * CELL_SIZE;
mini.width = WIDTH;
mini.height = HEIGHT;

let MATERIALS = {
  EMPTY: 0,
  SAND: 1,
  WATER: 2,
  STONE: 3,
  FIRE: 4,
  PLANT: 5,
  BURNING_PLANT: 6,
  OIL: 7,
  ACID: 8,
  SMOKE: 9,
  LAVA: 10,
  ICE: 11,
  GUNPOWDER: 12,
};
let nextMaterialId = 13;

let MATERIAL_DEFS = [
  { id: MATERIALS.SAND, name: 'Sand', color: '#f4a460', props: { density: 1, flow: 'powder' } },
  { id: MATERIALS.WATER, name: 'Water', color: '#4169e1', props: { density: 0.5, flow: 'liquid', extinguishes: true } },
  { id: MATERIALS.STONE, name: 'Stone', color: '#808080', props: { density: Infinity, flow: 'static' } },
  { id: MATERIALS.FIRE, name: 'Fire', color: '#ff4500', props: { density: -1, flow: 'gas_up', burns: true } },
  { id: MATERIALS.PLANT, name: 'Plant', color: '#228b22', props: { density: 0.8, flow: 'static', flammable: true, grows: true } },
  { id: MATERIALS.BURNING_PLANT, name: 'Burning Plant', color: '#ff8c00', props: { density: 0.8, flow: 'static', burns: true } },
  { id: MATERIALS.OIL, name: 'Oil', color: '#4b0082', props: { density: 0.4, flow: 'liquid', flammable: true } },
  { id: MATERIALS.ACID, name: 'Acid', color: '#32cd32', props: { density: 0.6, flow: 'liquid', dissolves: ['STONE'] } },
  { id: MATERIALS.SMOKE, name: 'Smoke', color: '#a9a9a9', props: { density: -0.5, flow: 'gas_up' } },
  { id: MATERIALS.LAVA, name: 'Lava', color: '#ff4500', props: { density: 1.2, flow: 'slow_liquid', burns: true, melts: true } },
  { id: MATERIALS.ICE, name: 'Ice', color: '#add8e6', props: { density: 0.9, flow: 'static', freezes: true } },
  { id: MATERIALS.GUNPOWDER, name: 'Gunpowder', color: '#4a4a4a', props: { density: 1, flow: 'powder', flammable: true, explodes: true } },
];

let grid = Array.from({ length: HEIGHT }, () => new Uint16Array(WIDTH).fill(MATERIALS.EMPTY));
let temperature = Array.from({ length: HEIGHT }, () => new Float32Array(WIDTH).fill(20));
let isPaused = false;
let mouseDown = false;
let currentMaterial = MATERIALS.SAND;
let brushSize = parseInt(controls.brushSize.value);
let brushShape = controls.brushShape.value;
let simSpeed = parseInt(controls.simSpeed.value);
let gravity = parseFloat(controls.gravity.value);
let wind = parseFloat(controls.wind.value);
let undoStack = [];
let redoStack = [];
let lastUpdate = 0;
let frameCount = 0;
let lastFpsTime = performance.now();
let lastMouseX = null, lastMouseY = null;
let cursor = document.getElementById('cursor');

function initMaterialSelect() {
  controls.material.innerHTML = '';
  for (let i = 0; i < MATERIAL_DEFS.length; i++) {
    const opt = document.createElement('option');
    opt.value = MATERIAL_DEFS[i].id;
    opt.textContent = MATERIAL_DEFS[i].name;
    controls.material.appendChild(opt);
  }
  // Common quick slots
  const divider = document.createElement('option');
  divider.disabled = true;
  divider.textContent = '──────────';
  controls.material.appendChild(divider);
  const erase = document.createElement('option');
  erase.value = 'erase';
  erase.textContent = 'Erase';
  controls.material.appendChild(erase);
}
initMaterialSelect();

// Controls binding
controls.material.addEventListener('change', () => {
  currentMaterial = controls.material.value === 'erase' ? 'erase' : Number(controls.material.value);
});
controls.brushSize.addEventListener('input', () => {
  brushSize = Number(controls.brushSize.value);
  controls.brushSizeValue.value = brushSize;
  cursor.style.width = (brushSize*2+1) + 'px';
  cursor.style.height = (brushSize*2+1) + 'px';
});
controls.brushShape.addEventListener('change', () => brushShape = controls.brushShape.value);
controls.simSpeed.addEventListener('input', () => simSpeed = Number(controls.simSpeed.value));
controls.simSpeedValue.addEventListener('input', (e)=> simSpeed = Number(e.target.value));
controls.gravity.addEventListener('input', () => gravity = Number(controls.gravity.value));
controls.wind.addEventListener('input', () => wind = Number(controls.wind.value));
controls.pause.addEventListener('click', () => { isPaused = !isPaused; controls.pause.textContent = isPaused ? 'Resume' : 'Pause'; });
controls.clear.addEventListener('click', () => { saveState(); clearGrid(); });
controls.undo.addEventListener('click', () => undo());
controls.redo.addEventListener('click', () => redo());
controls.save.addEventListener('click', saveToFile);
controls.load.addEventListener('click', () => controls.loadFile.click());
controls.loadFile.addEventListener('change', loadFromFile);
controls.exportImage.addEventListener('click', exportPNG);
controls.addCustom.addEventListener('click', addCustomMaterial);
controls.presetVolcano.addEventListener('click', presetVolcano);
controls.presetRain.addEventListener('click', presetRain);
controls.presetForest.addEventListener('click', presetForest);

canvas.addEventListener('mousedown', (e) => { mouseDown = true; saveState(); handleMouse(e); });
window.addEventListener('mouseup', () => { mouseDown = false; lastMouseX = null; lastMouseY = null; });
canvas.addEventListener('mouseleave', () => { mouseDown = false; lastMouseX = null; lastMouseY = null; });
canvas.addEventListener('mousemove', handleMouse);
window.addEventListener('keydown', handleKeys);

// Mouse handling and placing
function handleMouse(e) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const clientX = e.clientX - rect.left;
  const clientY = e.clientY - rect.top;
  const cx = Math.floor(clientX * scaleX);
  const cy = Math.floor(clientY * scaleY);

  cursor.style.left = (e.clientX) + 'px';
  cursor.style.top = (e.clientY) + 'px';

  if (!mouseDown) return;

  if (lastMouseX === null || lastMouseY === null) {
    placeAt(cx,cy);
  } else {
    const dx = cx - lastMouseX;
    const dy = cy - lastMouseY;
    const steps = Math.max(Math.abs(dx), Math.abs(dy), 1);
    for (let i=0;i<=steps;i++){
      const ix = Math.round(lastMouseX + (dx*i)/steps);
      const iy = Math.round(lastMouseY + (dy*i)/steps);
      placeAt(ix,iy);
      if (controls.symmetry.checked) {
        placeAt(WIDTH-1-ix, iy);
      }
    }
  }
  lastMouseX = cx; lastMouseY = cy;
}

function placeAt(x,y) {
  const shapeFns = {
    circle: (dx, dy) => dx*dx + dy*dy <= brushSize*brushSize,
    square: (dx, dy) => Math.abs(dx) <= brushSize && Math.abs(dy) <= brushSize,
    diamond: (dx, dy) => Math.abs(dx) + Math.abs(dy) <= brushSize,
  };
  const shapeFn = shapeFns[brushShape] || shapeFns.circle;
  for (let dy=-brushSize; dy<=brushSize; dy++){
    for (let dx=-brushSize; dx<=brushSize; dx++){
      const nx = x+dx, ny = y+dy;
      if (nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT) continue;
      if (!shapeFn(dx,dy)) continue;
      grid[ny][nx] = (currentMaterial==='erase') ? MATERIALS.EMPTY : currentMaterial;
      temperature[ny][nx] = (grid[ny][nx]===MATERIALS.FIRE||grid[ny][nx]===MATERIALS.LAVA) ? 1000 : 20;
    }
  }
}

// state helpers
function saveState(){
  const snapshot = grid.map(row => new Uint16Array(row));
  undoStack.push(snapshot);
  if (undoStack.length>80) undoStack.shift();
  redoStack = [];
}
function undo(){
  if (!undoStack.length) return;
  redoStack.push(grid.map(r=>new Uint16Array(r)));
  grid = undoStack.pop().map(r=>new Uint16Array(r));
}
function redo(){
  if (!redoStack.length) return;
  undoStack.push(grid.map(r=>new Uint16Array(r)));
  grid = redoStack.pop().map(r=>new Uint16Array(r));
}
function clearGrid(){
  grid = Array.from({length:HEIGHT}, ()=> new Uint16Array(WIDTH).fill(MATERIALS.EMPTY));
  temperature = Array.from({length:HEIGHT}, ()=> new Float32Array(WIDTH).fill(20));
}

// interactions & helpers from original, made a bit faster and safer
function updateGrid(){
  const newGrid = grid.map(row => new Uint16Array(row));
  const newTemp = temperature.map(row => new Float32Array(row));
  for (let y=HEIGHT-1;y>=0;y--){
    const startX = Math.random()<0.5?0:WIDTH-1;
    const step = startX===0?1:-1;
    for (let x=startX; x>=0 && x<WIDTH; x+=step){
      const cell = grid[y][x];
      if (cell===MATERIALS.EMPTY) continue;
      const def = MATERIAL_DEFS.find(m=>m.id===cell) || MATERIAL_DEFS[0];
      const props = def.props;

      // powder/liquid movement
      if (['powder','liquid','slow_liquid'].includes(props.flow)){
        const speed = (props.flow==='slow_liquid') ? (Math.random()<0.08?1:0) : 1;
        for (let s=0; s<Math.max(1, Math.floor(speed*gravity)); s++){
          if (y+1<HEIGHT){
            const below = grid[y+1][x];
            const belowDef = MATERIAL_DEFS.find(m=>m.id===below);
            if (below===MATERIALS.EMPTY || (belowDef && belowDef.props.density>props.density && props.flow==='liquid')){
              newGrid[y+1][x] = cell;
              newGrid[y][x] = below || MATERIALS.EMPTY;
              newTemp[y+1][x] = temperature[y][x];
              newTemp[y][x] = 20;
              break;
            }
            const windDir = wind>0?1:-1;
            const windX = x + windDir;
            if (Math.abs(wind) > Math.random() && windX>=0 && windX<WIDTH && grid[y+1][windX]===MATERIALS.EMPTY){
              newGrid[y+1][windX] = cell;
              newGrid[y][x] = MATERIALS.EMPTY;
              newTemp[y+1][windX] = temperature[y][x];
              newTemp[y][x] = 20;
              break;
            }
          }
        }
        if (props.flow==='liquid' && Math.random()<0.45){
          const side = Math.random()<0.5?-1:1;
          const nx = x+side;
          if (nx>=0 && nx<WIDTH && grid[y][nx]===MATERIALS.EMPTY){
            newGrid[y][nx] = cell;
            newGrid[y][x] = MATERIALS.EMPTY;
            newTemp[y][nx] = temperature[y][x];
            newTemp[y][x] = 20;
          }
        }
      } else if (props.flow === 'gas_up'){
        if (y-1>=0 && grid[y-1][x]===MATERIALS.EMPTY && Math.random()<0.85){
          newGrid[y-1][x] = cell;
          newGrid[y][x] = MATERIALS.EMPTY;
          newTemp[y-1][x] = temperature[y][x];
          newTemp[y][x] = 20;
        } else if (Math.random()<0.04){
          newGrid[y][x] = MATERIALS.EMPTY;
          newTemp[y][x] = 20;
        }
      }

      // interactions (burn, extinguish, dissolve, explode)
      const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
      for (let [dx,dy] of dirs){
        const nx = x+dx, ny = y+dy;
        if (nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT) continue;
        const neighbor = grid[ny][nx];
        const neighborDef = MATERIAL_DEFS.find(m=>m.id===neighbor);

        if (props.burns && neighborDef?.props?.flammable){
          newGrid[ny][nx] = neighbor===MATERIALS.PLANT ? MATERIALS.BURNING_PLANT : MATERIALS.FIRE;
          newTemp[ny][nx] = 1000;
        }
        if (props.extinguishes && [MATERIALS.FIRE, MATERIALS.BURNING_PLANT].includes(neighbor)){
          newGrid[ny][nx] = Math.random()<0.5 ? MATERIALS.SMOKE : MATERIALS.EMPTY;
          newTemp[ny][nx] = 20;
          if (Math.random()<0.25) newGrid[y][x] = MATERIALS.EMPTY;
        }
        if (props.dissolves && props.dissolves.includes(Object.keys(MATERIALS).find(k=>MATERIALS[k]===neighbor))){
          newGrid[ny][nx] = MATERIALS.EMPTY;
        }
        if (props.melts && neighbor!==MATERIALS.EMPTY && Math.random()<0.06){
          newGrid[ny][nx] = MATERIALS.LAVA;
          newTemp[ny][nx] = 1200;
        }
        if (props.freezes && neighbor===MATERIALS.WATER){
          newGrid[ny][nx] = MATERIALS.ICE;
          newTemp[ny][nx] = -10;
        }
        if (props.explodes && neighbor===MATERIALS.FIRE && Math.random()<0.25){
          for (let dy2=-3; dy2<=3; dy2++){
            for (let dx2=-3; dx2<=3; dx2++){
              const ex = x+dx2, ey = y+dy2;
              if (ex>=0 && ex<WIDTH && ey>=0 && ey<HEIGHT && Math.random()<0.6){
                newGrid[ey][ex] = Math.random()<0.7 ? MATERIALS.FIRE : MATERIALS.SMOKE;
                newTemp[ey][ex] = 1000;
              }
            }
          }
          newGrid[y][x] = MATERIALS.SMOKE;
          newTemp[y][x] = 1000;
        }
      }

      if (props.grows && y-1>=0 && grid[y-1][x]===MATERIALS.EMPTY && hasNearby(x,y,MATERIALS.WATER) && Math.random()<0.008){
        newGrid[y-1][x] = MATERIALS.PLANT;
        newTemp[y-1][x] = 20;
      }
      if (cell===MATERIALS.BURNING_PLANT && Math.random()<0.12){
        newGrid[y][x] = Math.random()<0.7 ? MATERIALS.FIRE : MATERIALS.SMOKE;
      }

      // temperature diffusion (simpler and faster)
      let t = temperature[y][x];
      let count = 1;
      for (let [dx,dy] of dirs){
        const nx = x+dx, ny = y+dy;
        if (nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT) continue;
        t += temperature[ny][nx];
        count++;
      }
      newTemp[y][x] = t/count;
    }
  }
  grid = newGrid;
  temperature = newTemp;
}

// helpers
function hasNearby(x,y,type){
  const dirs = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
  for (let [dx,dy] of dirs){
    const nx = x+dx, ny = y+dy;
    if (nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT) continue;
    if (grid[ny][nx]===type) return true;
  }
  return false;
}

// rendering with optional heatmap overlay
function render(){
  const id = ctx.createImageData(WIDTH, HEIGHT);
  const d = id.data;
  let nonEmpty = 0;
  let tempSum = 0;
  for (let y=0;y<HEIGHT;y++){
    for (let x=0;x<WIDTH;x++){
      const idx = (y*WIDTH+x)*4;
      const cell = grid[y][x];
      const def = MATERIAL_DEFS.find(m=>m.id===cell);
      let color = def ? hexToRgb(def.color) : {r:255,g:255,b:255};
      if (cell===MATERIALS.FIRE || cell===MATERIALS.LAVA){
        color.r = Math.min(255, color.r + Math.floor(temperature[y][x]/60));
        color.g = Math.min(255, color.g + Math.floor(temperature[y][x]/180));
      }
      if (controls.heatmap.checked){
        // show temperature as tint
        const t = Math.max(-50, Math.min(1200, temperature[y][x]));
        const heat = Math.floor(255 * (t/600));
        color = {r: Math.max(0, Math.min(255, heat)), g: 0, b: Math.max(0,255-heat)};
      }
      d[idx] = color.r; d[idx+1] = color.g; d[idx+2] = color.b; d[idx+3] = 255;
      if (cell !== MATERIALS.EMPTY) { nonEmpty++; tempSum += temperature[y][x]; }
    }
  }
  ctx.putImageData(id, 0, 0);

  if (controls.showMini.checked) {
    miniCtx.clearRect(0,0,mini.width,mini.height);
    miniCtx.drawImage(canvas, 0,0, mini.width, mini.height);
  } else {
    miniCtx.clearRect(0,0,mini.width,mini.height);
  }

  controls.particleCount.textContent = nonEmpty.toString();
  controls.avgTemp.textContent = (tempSum/(nonEmpty||1)).toFixed(1);
}

// utility
function hexToRgb(hex){
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? { r: parseInt(result[1],16), g: parseInt(result[2],16), b: parseInt(result[3],16) } : {r:255,g:255,b:255};
}

// main loop
let lastTime = performance.now();
function loop(ts){
  frameCount++;
  const now = performance.now();
  if (now - lastFpsTime >= 1000){
    controls.fps.textContent = frameCount.toString();
    frameCount = 0; lastFpsTime = now;
  }
  const msSince = ts - lastUpdate;
  const speed = controls.slowMo.checked ? simSpeed*3 : simSpeed;
  if (!isPaused && msSince > speed) {
    updateGrid();
    lastUpdate = ts;
  }
  render();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// keyboard shortcuts
function handleKeys(e){
  if (e.code === 'Space'){ e.preventDefault(); isPaused = !isPaused; controls.pause.textContent = isPaused ? 'Resume' : 'Pause'; }
  if (e.key === 'z' || e.key === 'Z') undo();
  if (e.key === 'y' || e.key === 'Y') redo();
  if (e.key === 'c' || e.key === 'C') { saveState(); clearGrid(); }
  if (/[1-9]/.test(e.key)){
    const idx = Number(e.key)-1;
    if (MATERIAL_DEFS[idx]) {
      controls.material.value = MATERIAL_DEFS[idx].id;
      currentMaterial = MATERIAL_DEFS[idx].id;
    }
  }
}

// save/load/export
function saveToFile(){
  const payload = { grid: grid.map(r=>Array.from(r)), temperature: temperature.map(r=>Array.from(r)), materials: MATERIAL_DEFS };
  const blob = new Blob([JSON.stringify(payload)], {type:'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a'); a.href = url; a.download = 'quantum_s_tier_save.json'; a.click();
}
function loadFromFile(e){
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      if (data.grid) {
        grid = data.grid.map(r=>new Uint16Array(r));
        temperature = data.temperature.map(r=>new Float32Array(r));
      }
      if (data.materials) {
        MATERIAL_DEFS = data.materials;
        initMaterialSelect();
      }
    } catch (err){
      alert('Failed to load file: '+err.message);
    }
  };
  reader.readAsText(file);
}
function exportPNG(){
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a'); a.href = url; a.download = 'quantum_s_tier.png'; a.click();
}

// presets
function presetVolcano(){
  saveState();
  clearGrid();
  // create mountain
  for (let y=HEIGHT-120;y<HEIGHT-20;y++){
    const radius = Math.max(2, (HEIGHT - y)/2.2);
    const cx = Math.floor(WIDTH/2);
    for (let x=cx-Math.floor(radius); x<=cx+Math.floor(radius); x++){
      if (Math.random() < 0.9) grid[y][x] = MATERIALS.STONE;
    }
  }
  // spawn lava fountain
  const topX = Math.floor(WIDTH/2);
  for (let y=HEIGHT-200;y<HEIGHT-180;y++){
    grid[y][topX] = MATERIALS.LAVA;
  }
}
function presetRain(){
  saveState();
  clearGrid();
  // spawn water at top randomly
  for (let x=0;x<WIDTH;x+=3){
    grid[2][x] = MATERIALS.WATER;
  }
}
function presetForest(){
  saveState();
  clearGrid();
  // dirt base
  for (let x=0;x<WIDTH;x++){
    if (Math.random()<0.6) grid[HEIGHT-8][x] = MATERIALS.STONE;
  }
  // plant clusters
  for (let i=0;i<300;i++){
    const x = Math.floor(Math.random()*WIDTH);
    const y = HEIGHT - Math.floor(Math.random()*40) - 10;
    if (grid[y][x] === MATERIALS.EMPTY) grid[y][x] = MATERIALS.PLANT;
  }
}

// add custom material
function addCustomMaterial(){
  const name = controls.customName.value || ('Custom'+nextMaterialId);
  const id = nextMaterialId++;
  const color = controls.customColor.value;
  const density = Number(controls.customDensity.value) || 1;
  const flow = document.getElementById('customFlow').value;
  const flammable = document.getElementById('customFlammable').checked;
  MATERIALS[name.toUpperCase()] = id;
  const def = { id, name, color, props: { density, flow, flammable } };
  MATERIAL_DEFS.push(def);
  initMaterialSelect();
}

// start with a small demo
(function seedDemo(){
  clearGrid();
  // sand pile and some water
  for (let y=HEIGHT-40;y<HEIGHT-10;y++){
    for (let x=WIDTH/2-30; x<WIDTH/2+30; x++){
      if (Math.random() < 0.6) grid[y][x] = MATERIALS.SAND;
    }
  }
  for (let i=0;i<200;i++){
    const x = Math.floor(Math.random()*WIDTH);
    grid[3][x] = MATERIALS.WATER;
  }
})();

// make sure UI default values sync
controls.brushSizeValue.value = brushSize;
controls.simSpeedValue.value = simSpeed;
controls.gravityValue.value = gravity;
controls.windValue.value = wind;
