// Quantum Infinite — Fixed Build (Cleaned script.js)
// Ensures base materials always registered and unlocked by default
// Optional proxy support (prefilled with your Vercel endpoint)

const DEFAULT_PROXY = "https://v0-api-route-generation.vercel.app/api/generate";

// DOM elements
const canvas = document.getElementById('canvas');
const mini = document.getElementById('mini');
const ctx = canvas.getContext('2d');
const miniCtx = mini.getContext('2d');

const WIDTH = 420, HEIGHT = 260;
canvas.width = WIDTH; canvas.height = HEIGHT;
mini.width = WIDTH; mini.height = HEIGHT;

const materialSelect = document.getElementById('material');
const brush = document.getElementById('brushSize');
const brushVal = document.getElementById('brushVal');
const brushShape = document.getElementById('brushShape');
const pauseBtn = document.getElementById('pause');
const clearBtn = document.getElementById('clear');
const presetSeed = document.getElementById('preset-seed');
const fpsEl = document.getElementById('fps');
const countEl = document.getElementById('count');

const tabSim = document.getElementById('tab-sim');
const tabEncy = document.getElementById('tab-ency');
const tabSettings = document.getElementById('tab-settings');
const panelSim = document.getElementById('panel-sim');
const panelEncy = document.getElementById('panel-ency');
const panelSettings = document.getElementById('panel-settings');

const proxyUrlInput = document.getElementById('proxyUrl');
const useProxyChk = document.getElementById('useProxy');
const exportBtn = document.getElementById('export-save');
const importBtn = document.getElementById('import-save');
const fileInput = document.getElementById('fileInput');

// -----------------------------
// Base materials & registration
// -----------------------------
const BASE_MATERIALS = [
  {id:'empty', name:'Empty', color:'#000000', flow:'empty', density:0, flammable:false, conductive:false, description:'Empty space.'},
  {id:'sand',  name:'Sand',  color:'#f4a460', flow:'powder', density:1, flammable:false, conductive:false, description:'Fine granular rock.'},
  {id:'water', name:'Water', color:'#4aa3ff', flow:'liquid', density:0.8, flammable:false, conductive:false, description:'H2O liquid.'},
  {id:'fire',  name:'Fire',  color:'#ff5a00', flow:'gas', density:-1, flammable:false, conductive:false, description:'Hot combusting gas.'},
  {id:'stone', name:'Stone', color:'#8b8b8b', flow:'static', density:5, flammable:false, conductive:false, description:'Solid rock.'},
  {id:'plant', name:'Plant', color:'#2fa84f', flow:'static', density:0.5, flammable:true, conductive:false, description:'Living vegetation.'},
  {id:'oil',   name:'Oil',   color:'#2b0b3a', flow:'liquid', density:0.6, flammable:true, conductive:false, description:'Flammable liquid.'},
  {id:'metal', name:'Metal', color:'#c0c0c8', flow:'static', density:7.8, flammable:false, conductive:true, description:'Conductive metal.'}
];

let MATERIALS = {};
let MATERIAL_ORDER = [];

function registerMaterial(mat){
  if(!mat || !mat.id) return;
  if(MATERIALS[mat.id]) return;
  MATERIALS[mat.id] = mat;
  MATERIAL_ORDER.push(mat.id);
  updateMaterialSelect();
  addToEncyclopedia(mat);
}

function initBaseMaterials(){
  BASE_MATERIALS.forEach(m => registerMaterial(m));
}

// -----------------------------
// Unlocked materials persistence
// -----------------------------
function loadUnlocked(){
  try{
    const raw = localStorage.getItem('qi_unlocked');
    if(!raw){
      const seed = BASE_MATERIALS.map(m=>m.id).filter(id=>id!=='empty');
      localStorage.setItem('qi_unlocked', JSON.stringify(seed));
      return new Set(seed);
    }
    const parsed = JSON.parse(raw);
    if(!Array.isArray(parsed) || parsed.length === 0){
      const seed = BASE_MATERIALS.map(m=>m.id).filter(id=>id!=='empty');
      localStorage.setItem('qi_unlocked', JSON.stringify(seed));
      return new Set(seed);
    }
    return new Set(parsed);
  }catch(e){
    const seed = BASE_MATERIALS.map(m=>m.id).filter(id=>id!=='empty');
    localStorage.setItem('qi_unlocked', JSON.stringify(seed));
    return new Set(seed);
  }
}
let UNLOCKED = loadUnlocked();
function persistUnlocked(){ localStorage.setItem('qi_unlocked', JSON.stringify(Array.from(UNLOCKED))); }

// -----------------------------
// Encyclopedia UI
// -----------------------------
const encyList = document.getElementById('ency-list');
function addToEncyclopedia(mat){
  if(!mat || !mat.id) return;
  if(document.getElementById('ency-'+mat.id)) return;
  const node = document.createElement('div');
  node.className = 'ency-item';
  node.id = 'ency-' + mat.id;
  const unlockedBadge = UNLOCKED.has(mat.id) ? '<small style="color:#9ff">Unlocked</small>' : '<small style="color:#777">Locked</small>';
  node.innerHTML = `<div class="swatch" style="background:${mat.color}"></div><div class="meta"><strong>${mat.name}</strong><div>${mat.description || mat.name}</div>${unlockedBadge}</div>`;
  encyList.appendChild(node);
}
function populateEncyclopedia(){
  encyList.innerHTML = '';
  Object.values(MATERIALS).forEach(m => addToEncyclopedia(m));
}

// -----------------------------
// Material select UI
// -----------------------------
function updateMaterialSelect(){
  if(!materialSelect) return;
  materialSelect.innerHTML = '';
  MATERIAL_ORDER.forEach(id => {
    const opt = document.createElement('option');
    opt.value = id;
    opt.textContent = MATERIALS[id].name;
    materialSelect.appendChild(opt);
  });
  if(!MATERIALS[currentMaterial]) currentMaterial = 'sand';
  materialSelect.value = currentMaterial;
}
if(materialSelect){
  materialSelect.addEventListener('change', ()=> currentMaterial = materialSelect.value);
}

// -----------------------------
// Simulation state
// -----------------------------
let grid = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty'));
let temp = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill(20));
let paused = false;
let mouseDown = false;
let currentMaterial = 'sand';
let brushSize = Number(brush ? brush.value : 6);
let brushShapeVal = brushShape ? brushShape.value : 'circle';

if(brush) brush.addEventListener('input', ()=>{ brushSize = Number(brush.value); if(brushVal) brushVal.textContent = brush.value;});
if(brushShape) brushShape.addEventListener('change', ()=> brushShapeVal = brushShape.value);

if(canvas){
  canvas.addEventListener('mousedown', e=>{ mouseDown = true; paint(e); });
  window.addEventListener('mouseup', ()=> mouseDown = false);
  canvas.addEventListener('mousemove', e=>{ if(mouseDown) paint(e); });
}

function paint(e){
  const r = canvas.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) * (WIDTH / r.width));
  const y = Math.floor((e.clientY - r.top) * (HEIGHT / r.height));
  placeBrush(x,y,currentMaterial);
}

function placeBrush(cx,cy,id){
  const shapeFns = {
    circle:(dx,dy)=> dx*dx + dy*dy <= brushSize*brushSize,
    square:(dx,dy)=> Math.abs(dx) <= brushSize && Math.abs(dy) <= brushSize,
    diamond:(dx,dy)=> Math.abs(dx) + Math.abs(dy) <= brushSize
  };
  const fn = shapeFns[brushShapeVal] || shapeFns.circle;
  for(let dy=-brushSize; dy<=brushSize; dy++){
    for(let dx=-brushSize; dx<=brushSize; dx++){
      const nx = cx + dx, ny = cy + dy;
      if(nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
      if(!fn(dx,dy)) continue;
      const mid = MATERIALS[id] ? id : 'empty';
      grid[ny][nx] = mid;
      temp[ny][nx] = (mid === 'fire') ? 800 : 20;
    }
  }
}

// -----------------------------
// Physics update
// -----------------------------
function update(){
  const newGrid = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty'));
  const newTemp = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill(20));
  for(let y=0;y<HEIGHT;y++){
    for(let x=0;x<WIDTH;x++){
      newGrid[y][x] = grid[y][x];
      newTemp[y][x] = temp[y][x];
    }
  }
  for(let y=HEIGHT-2; y>=0; y--){
    for(let x=0; x<WIDTH; x++){
      const id = grid[y][x];
      const mat = MATERIALS[id];
      if(!mat) continue;
      if(mat.flow === 'powder'){
        if(grid[y+1][x] === 'empty'){
          newGrid[y+1][x] = id; newGrid[y][x] = 'empty';
          newTemp[y+1][x] = temp[y][x]; newTemp[y][x] = 20;
        } else {
          const dir = Math.random() < 0.5 ? -1 : 1;
          if(x+dir >= 0 && x+dir < WIDTH && grid[y+1][x+dir] === 'empty'){
            newGrid[y+1][x+dir] = id; newGrid[y][x] = 'empty';
          }
        }
      } else if(mat.flow === 'liquid'){
        if(grid[y+1][x] === 'empty'){
          newGrid[y+1][x] = id; newGrid[y][x] = 'empty';
        } else {
          const left = x-1, right = x+1;
          if(left >= 0 && grid[y][left] === 'empty'){ newGrid[y][left] = id; newGrid[y][x] = 'empty'; }
          else if(right < WIDTH && grid[y][right] === 'empty'){ newGrid[y][right] = id; newGrid[y][x] = 'empty'; }
        }
      } else if(mat.flow === 'gas'){
        if(y > 0 && grid[y-1][x] === 'empty'){ newGrid[y-1][x] = id; newGrid[y][x] = 'empty'; }
      }
      newTemp[y][x] = (temp[y][x] + (temp[y+1] ? temp[y+1][x] : 20)) / 2;
    }
  }
  grid = newGrid;
  temp = newTemp;
  detectMixes();
}

// -----------------------------
// Mixing system
// -----------------------------
const CONTACT = {};
function detectMixes(){
  for(let y=0; y<HEIGHT; y++){
    for(let x=0; x<WIDTH; x++){
      const a = grid[y][x];
      if(a === 'empty') continue;
      const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
      for(const [dx,dy] of neighbors){
        const nx = x+dx, ny = y+dy;
        if(nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
        const b = grid[ny][nx];
        if(b === 'empty' || a === b) continue;
        const pair = [a,b].sort().join('+');
        const key = `${x},${y},${pair}`;
        CONTACT[key] = (CONTACT[key] || 0) + 1;
        if(CONTACT[key] >= 12){
          attemptMixWithOptionalProxy(a,b,x,y);
          CONTACT[key] = 0;
        }
      }
    }
  }
}

// deterministic material generator
function cyrb53(str, seed=0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}
function blendColor(colors){
  let r=0,g=0,b=0;
  colors.forEach(c=>{
    const hex = c.replace('#','');
    r += parseInt(hex.substring(0,2),16);
    g += parseInt(hex.substring(2,4),16);
    b += parseInt(hex.substring(4,6),16);
  });
  r = Math.floor(r/colors.length); g = Math.floor(g/colors.length); b = Math.floor(b/colors.length);
  return '#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join('');
}
function pickFlow(parents){
  if(parents.some(p=>p.flow==='liquid')) return 'liquid';
  if(parents.some(p=>p.flow==='powder')) return 'powder';
  if(parents.some(p=>p.flow==='gas')) return 'gas';
  return 'static';
}
function generateId(name, seed){
  return name.toLowerCase().replace(/[^a-z0-9]+/g,'_') + '_' + (seed % 100000);
}
function deterministicMaterialFrom(parents){
  const seed = parents.map(p=>p.id).sort().join('|');
  const h = Math.abs(cyrb53(seed)) % 100000;
  const name = parents.map(p=>p.name.substring(0,3)).join('') + (h % 100);
  const color = blendColor(parents.map(p=>p.color));
  const flow = pickFlow(parents);
  const id = generateId(name, h);
  return {
    id,
    name: name[0].toUpperCase() + name.slice(1),
    color,
    flow,
    density: Math.max(0.05, parents.reduce((s,p)=>s + (p.density || 1), 0) / parents.length * (1 + (h % 11 - 5)/50)),
    flammable: parents.some(p=>p.flammable),
    conductive: parents.some(p=>p.conductive),
    description: `A ${flow} material formed from ${parents.map(p=>p.name).join(', ')}.`,
    source: 'deterministic'
  };
}

// explicit recipes
const explicitRecipes = {
  'fire+water': {result:'steam', create:{id:'steam', name:'Steam', color:'#dfe9ff', flow:'gas', density:-0.1, description:'Hot water vapor.'}},
  'sand+water': {result:'mud', create:{id:'mud', name:'Mud', color:'#6b4f2b', flow:'liquid', density:1.2, description:'Wet soil.'}},
  'water+oil': {result:'emulsion', create:{id:'emulsion', name:'Emulsion', color:'#6f5070', flow:'liquid', density:0.7, description:'Mixed liquid.'}}
};

function attemptMix(a,b,x,y){
  const key = [a,b].sort().join('+');
  if(explicitRecipes[key]){
    const r = explicitRecipes[key].create;
    if(!MATERIALS[r.id]) registerMaterial(r);
    createResultAt(r.id, x, y);
    discoverMaterial(r.id);
    return;
  }
  const parents = [MATERIALS[a], MATERIALS[b]].filter(Boolean);
  if(parents.length < 2) return;
  const newMat = deterministicMaterialFrom(parents);
  if(!MATERIALS[newMat.id]) registerMaterial(newMat);
  createResultAt(newMat.id, x, y);
  discoverMaterial(newMat.id);
}

function createResultAt(id,x,y){
  if(x < 0 || x >= WIDTH || y < 0 || y >= HEIGHT) return;
  grid[y][x] = id;
  temp[y][x] = (MATERIALS[id] && MATERIALS[id].flow === 'gas') ? 300 : 20;
}

function discoverMaterial(id){
  if(UNLOCKED.has(id)) return;
  UNLOCKED.add(id);
  persistUnlocked();
  const node = document.getElementById('ency-'+id);
  if(node) node.style.boxShadow = '0 4px 18px rgba(79,70,229,0.3)';
}

// -----------------------------
// Proxy integration
// -----------------------------
async function requestMaterialFromProxy(parents){
  const url = proxyUrlInput.value || DEFAULT_PROXY;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parents })
  });
  if(!res.ok) throw new Error('Proxy error ' + res.status);
  const data = await res.json();
  if(!data.id || !data.name || !/^#[0-9a-fA-F]{6}$/.test(data.color || '#000000')) throw new Error('Invalid material from proxy');
  return data;
}

async function attemptMixWithOptionalProxy(a,b,x,y){
  const parents = [MATERIALS[a], MATERIALS[b]].filter(Boolean).map(p=>({id:p.id,name:p.name,color:p.color,flow:p.flow}));
  if(useProxyChk && useProxyChk.checked && (proxyUrlInput && (proxyUrlInput.value || DEFAULT_PROXY))){
    try{
      const mat = await requestMaterialFromProxy(parents);
      if(!MATERIALS[mat.id]) registerMaterial(mat);
      createResultAt(mat.id, x, y);
      discoverMaterial(mat.id);
      return;
    }catch(err){
      console.warn('Proxy failed, falling back deterministic:', err.message);
    }
  }
  attemptMix(a,b,x,y);
}

// -----------------------------
// UI buttons
// -----------------------------
if(presetSeed) presetSeed.addEventListener('click', ()=>{
  clearGrid();
  for(let y=HEIGHT-30; y<HEIGHT-5; y++){
    for(let x=Math.floor(WIDTH/2)-40; x<Math.floor(WIDTH/2)+40; x++){
      if(Math.random() < 0.6) grid[y][x] = 'sand';
    }
  }
  for(let i=0;i<200;i++){
    grid[3][Math.floor(Math.random()*WIDTH)] = 'water';
  }
});
if(clearBtn) clearBtn.addEventListener('click', ()=> clearGrid());
if(pauseBtn) pauseBtn.addEventListener('click', ()=> { paused = !paused; pauseBtn.textContent = paused ? 'Resume' : 'Pause'; });

function clearGrid(){
  grid = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty'));
  temp = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill(20));
}

// -----------------------------
// Rendering
// -----------------------------
function render(){
  const img = ctx.createImageData(WIDTH, HEIGHT);
  const d = img.data;
  let particles = 0;
  for(let y=0; y<HEIGHT; y++){
    for(let x=0; x<WIDTH; x++){
      const i = (y*WIDTH + x) * 4;
      const id = grid[y][x] || 'empty';
      const mat = MATERIALS[id] || MATERIALS['empty'];
      const col = hexToRgb(mat.color || '#000000');
      d[i]   = col.r;
      d[i+1] = col.g;
      d[i+2] = col.b;
      d[i+3] = 255;
      if(id !== 'empty') particles++;
    }
  }
  ctx.putImageData(img, 0, 0);
  miniCtx.clearRect(0,0,mini.width,mini.height);
  miniCtx.drawImage(canvas, 0, 0, mini.width, mini.height);
  if(countEl) countEl.textContent = particles;
}

function hexToRgb(hex){
  const h = (hex || '#000000').replace('#','');
  return {
    r: parseInt(h.slice(0,2),16) || 0,
    g: parseInt(h.slice(2,4),16) || 0,
    b: parseInt(h.slice(4,6),16) || 0
  };
}

// -----------------------------
// Main loop
// -----------------------------
let frames = 0, lastFps = performance.now();
function tick(){
  frames++;
  const now = performance.now();
  if(now - lastFps >= 1000){
    if(fpsEl) fpsEl.textContent = frames;
    frames = 0;
    lastFps = now;
  }
  if(!paused) update();
  render();
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);

// -----------------------------
// Save/Load & Settings
// -----------------------------
if(exportBtn){
  exportBtn.addEventListener('click', ()=>{
    const payload = { unlocked: Array.from(UNLOCKED), materials: MATERIALS };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'qi_save.json';
    a.click();
  });
}
if(importBtn){
  importBtn.addEventListener('click', ()=> fileInput.click());
}
if(fileInput){
  fileInput.addEventListener('change', (e)=>{
    const f = e.target.files[0];
    if(!f) return;
    const r = new FileReader();
    r.onload = ()=>{
      try{
        const data = JSON.parse(r.result);
        if(data.unlocked){ UNLOCKED = new Set(data.unlocked); persistUnlocked(); populateEncyclopedia(); }
        if(data.materials){ Object.values(data.materials).forEach(m => { if(m && m.id) registerMaterial(m); }); }
      }catch(err){ alert('Failed to import: ' + (err.message || err)); }
    };
    r.readAsText(f);
  });
}

// settings persistence
proxyUrlInput.value = localStorage.getItem('qi_proxy') || DEFAULT_PROXY;
useProxyChk.checked = (localStorage.getItem('qi_use_proxy') === 'true');
proxyUrlInput.addEventListener('change', ()=> localStorage.setItem('qi_proxy', proxyUrlInput.value));
useProxyChk.addEventListener('change', ()=> localStorage.setItem('qi_use_proxy', useProxyChk.checked));

// tab switching
if(tabSim && tabEncy && tabSettings){
  tabSim.addEventListener('click', ()=> setActiveTab('sim'));
  tabEncy.addEventListener('click', ()=> setActiveTab('ency'));
  tabSettings.addEventListener('click', ()=> setActiveTab('settings'));
}
function setActiveTab(t){
  tabSim.classList.toggle('active', t === 'sim');
  tabEncy.classList.toggle('active', t === 'ency');
  tabSettings.classList.toggle('active', t === 'settings');
  panelSim.classList.toggle('hidden', t !== 'sim');
  panelEncy.classList.toggle('hidden', t !== 'ency');
  panelSettings.classList.toggle('hidden', t !== 'settings');
}

// -----------------------------
// Init
// -----------------------------
initBaseMaterials();
populateEncyclopedia();
updateMaterialSelect();
