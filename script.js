// Quantum Infinite — client-only prototype
// Deterministic infinite material generator + mixing + encyclopedia + optional proxy URL

window.addEventListener('DOMContentLoaded', ()=>{
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

  const encyList = document.getElementById('ency-list');

  let grid = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty'));
  let temp = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill(20));
  let paused = false;
  let mouseDown = false;
  let currentMaterial = 'sand';
  let brushSize = Number(brush.value);
  let brushShapeVal = brushShape.value;
  let frame = 0;
  let lastFps = performance.now();
  let frames = 0;

  brush.addEventListener('input', ()=>{brushSize = Number(brush.value); brushVal.textContent = brush.value});
  brushShape.addEventListener('change', ()=> brushShapeVal = brushShape.value);

  // tabs
  tabSim.onclick = ()=>{ setActiveTab('sim'); }
  tabEncy.onclick = ()=>{ setActiveTab('ency'); }
  tabSettings.onclick = ()=>{ setActiveTab('settings'); }
  function setActiveTab(t){
    tabSim.classList.toggle('active', t==='sim');
    tabEncy.classList.toggle('active', t==='ency');
    tabSettings.classList.toggle('active', t==='settings');
    panelSim.classList.toggle('hidden', t!=='sim');
    panelEncy.classList.toggle('hidden', t!=='ency');
    panelSettings.classList.toggle('hidden', t!=='settings');
  }

  // base materials
  let MATERIALS = {};
  let MATERIAL_ORDER = []; // array of ids in select order

  function addToEncyclopedia(mat){
    const item = document.createElement('div');
    item.className = 'ency-item';
    item.id = 'ency-'+mat.id;
    item.innerHTML = `<div class="swatch" style="background:${mat.color}"></div><div class="meta"><strong>${mat.name}</strong><div>${mat.description||mat.name}</div></div>`;
    encyList.appendChild(item);
  }

  function registerMaterial(mat){
    if (MATERIALS[mat.id]) return;
    MATERIALS[mat.id] = mat;
    MATERIAL_ORDER.push(mat.id);
    updateMaterialSelect();
    addToEncyclopedia(mat);
  }

  function updateMaterialSelect(){
    materialSelect.innerHTML = '';
    MATERIAL_ORDER.forEach(id=>{
      const opt = document.createElement('option');
      opt.value = id;
      opt.textContent = MATERIALS[id].name;
      materialSelect.appendChild(opt);
    });
    materialSelect.value = currentMaterial;
  }
  materialSelect.addEventListener('change', ()=> currentMaterial = materialSelect.value);

  // initial base set
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

  // unlocked set (persisted)
  let UNLOCKED = new Set(JSON.parse(localStorage.getItem('qi_unlocked') || '["sand","water","fire","stone","plant","oil","metal"]'));
  function persistUnlocked(){ localStorage.setItem('qi_unlocked', JSON.stringify(Array.from(UNLOCKED))); }

  // --- rest of your JS (simulation, rendering, proxy, mixing, etc.) ---
});
