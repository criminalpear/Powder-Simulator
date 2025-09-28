// Quantum Infinite — full client-only prototype with fixes
window.addEventListener('DOMContentLoaded', () => {
  // --- DOM elements ---
  const canvas = document.getElementById('canvas');
  const mini = document.getElementById('mini');
  const ctx = canvas.getContext('2d');
  const miniCtx = mini.getContext('2d');
  const WIDTH = 420, HEIGHT = 260;
  canvas.width = mini.width = WIDTH;
  canvas.height = mini.height = HEIGHT;

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

  const encyList = document.getElementById('ency-list');

  // --- state ---
  let grid = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill('empty'));
  let temp = Array.from({ length: HEIGHT }, () => new Array(WIDTH).fill(20));
  let paused = false;
  let mouseDown = false;
  let currentMaterial = 'sand';
  let brushSize = Number(brush.value);
  let brushShapeVal = brushShape.value;
  let frame = 0, frames = 0, lastFps = performance.now();
  let MATERIALS = {}, MATERIAL_ORDER = [];

  // --- helpers ---
  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return { r: parseInt(h.slice(0, 2), 16), g: parseInt(h.slice(2, 4), 16), b: parseInt(h.slice(4, 6), 16) };
  }

  function cyrb53(str, seed = 0) {
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

  function blendColor(colors) {
    let r = 0, g = 0, b = 0;
    colors.forEach(c => {
      const hex = c.replace('#', '');
      r += parseInt(hex.substring(0, 2), 16);
      g += parseInt(hex.substring(2, 4), 16);
      b += parseInt(hex.substring(4, 6), 16);
    });
    r = Math.floor(r / colors.length);
    g = Math.floor(g / colors.length);
    b = Math.floor(b / colors.length);
    return '#' + [r, g, b].map(n => n.toString(16).padStart(2, '0')).join('');
  }

  function pickFlow(parents) {
    if (parents.some(p => p.flow === 'liquid')) return 'liquid';
    if (parents.some(p => p.flow === 'powder')) return 'powder';
    if (parents.some(p => p.flow === 'gas')) return 'gas';
    return 'static';
  }

  function generateId(name, seed) {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_' + (seed % 100000);
  }

  function deterministicMaterialFrom(parents) {
    const seed = parents.map(p => p.id).sort().join('|');
    const h = Math.abs(cyrb53(seed)) % 100000;
    const name = parents.map(p => p.name.substring(0, 3)).join('') + (h % 100);
    const color = blendColor(parents.map(p => p.color));
    const flow = pickFlow(parents);
    const id = generateId(name, h);
    return {
      id, name: name[0].toUpperCase() + name.slice(1),
      color, flow,
      density: Math.max(0.05, parents.reduce((s, p) => s + (p.density || 1), 0) / parents.length * (1 + (h % 11 - 5) / 50)),
      flammable: parents.some(p => p.flammable),
      conductive: parents.some(p => p.conductive),
      description: `A ${flow} material formed from ${parents.map(p => p.name).join(', ')}.`,
      source: 'deterministic'
    };
  }

  // --- material registration ---
  function addToEncyclopedia(mat) {
    const item = document.createElement('div');
    item.className = 'ency-item';
    item.id = 'ency-' + mat.id;
    item.innerHTML = `<div class="swatch" style="background:${mat.color}"></div><div class="meta"><strong>${mat.name}</strong><div>${mat.description||mat.name}</div></div>`;
    encyList.appendChild(item);
  }

  function registerMaterial(mat) {
    if (MATERIALS[mat.id]) return;
    MATERIALS[mat.id] = mat;
    MATERIAL_ORDER.push(mat.id);
    updateMaterialSelect();
    addToEncyclopedia(mat);
  }

  function updateMaterialSelect() {
    materialSelect.innerHTML = '';
    MATERIAL_ORDER.forEach(id => {
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = MATERIALS[id].name;
      materialSelect.appendChild(opt);
    });
    materialSelect.value = currentMaterial;
  }

  const baseMats = [
    {id:'empty', name:'Empty', color:'#000000', flow:'empty', density:0, flammable:false, conductive:false, description:'Empty space.'},
    {id:'sand', name:'Sand', color:'#f4a460', flow:'powder', density:1, flammable:false, conductive:false, description:'Fine granular rock.'},
    {id:'water', name:'Water', color:'#4aa3ff', flow:'liquid', density:0.8, flammable:false, conductive:false, description:'H2O liquid.'},
    {id:'fire', name:'Fire', color:'#ff5a00', flow:'gas', density:-1, flammable:false, conductive:false, description:'Hot combusting gas.'},
    {id:'stone', name:'Stone', color:'#8b8b8b', flow:'static', density:5, flammable:false, conductive:false, description:'Solid rock.'},
    {id:'plant', name:'Plant', color:'#2fa84f', flow:'static', density:0.5, flammable:true, conductive:false, description:'Living vegetation.'},
    {id:'oil', name:'Oil', color:'#2b0b3a', flow:'liquid', density:0.6, flammable:true, conductive:false, description:'Flammable liquid.'},
    {id:'metal', name:'Metal', color:'#c0c0c8', flow:'static', density:7.8, flammable:false, conductive:true, description:'Conductive metal.'}
  ];
  baseMats.forEach(registerMaterial);

  // unlocked materials
  let UNLOCKED = new Set(JSON.parse(localStorage.getItem('qi_unlocked') || '["sand","water","fire","stone","plant","oil","metal"]'));
  function persistUnlocked(){ localStorage.setItem('qi_unlocked', JSON.stringify(Array.from(UNLOCKED))); }

  // --- rest: painting, simulation, proxy, rendering, etc. ---
  brush.addEventListener('input', ()=>{ brushSize = Number(brush.value); brushVal.textContent = brush.value });
  brushShape.addEventListener('change', ()=> brushShapeVal = brushShape.value);

  canvas.addEventListener('mousedown', e => { mouseDown = true; paint(e); });
  canvas.addEventListener('mousemove', e => { if(mouseDown) paint(e); });
  window.addEventListener('mouseup', ()=> mouseDown = false);

  function paint(e){
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) * (WIDTH / r.width));
    const y = Math.floor((e.clientY - r.top) * (HEIGHT / r.height));
    placeBrush(x, y, currentMaterial);
  }

  function placeBrush(cx, cy, id){
    const shapeFns = {
      circle:(dx,dy)=> dx*dx+dy*dy <= brushSize*brushSize,
      square:(dx,dy)=> Math.abs(dx)<=brushSize && Math.abs(dy)<=brushSize,
      diamond:(dx,dy)=> Math.abs(dx)+Math.abs(dy) <= brushSize
    };
    const fn = shapeFns[brushShapeVal] || shapeFns.circle;
    for(let dy=-brushSize; dy<=brushSize; dy++){
      for(let dx=-brushSize; dx<=brushSize; dx++){
        const nx = cx+dx, ny = cy+dy;
        if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT) continue;
        if(!fn(dx,dy)) continue;
        grid[ny][nx] = MATERIALS[id] ? id : 'empty';
        temp[ny][nx] = (id==='fire')?800:20;
      }
    }
  }

  // ... continue simulation, update, render, tick loop, proxy mix, export/import ...

});
