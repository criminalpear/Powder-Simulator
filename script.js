// Quantum Infinite — complete client-side prototype
document.addEventListener('DOMContentLoaded', ()=>{

  // --- DOM references ---
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

  // --- State ---
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

  // --- Brush events ---
  brush.addEventListener('input', ()=>{ brushSize = Number(brush.value); brushVal.textContent = brush.value });
  brushShape.addEventListener('change', ()=> brushShapeVal = brushShape.value);

  // --- Tab switching ---
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

  // --- Materials ---
  let MATERIALS = {};
  let MATERIAL_ORDER = [];

  function registerMaterial(mat){
    if(MATERIALS[mat.id]) return;
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

  // base materials
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

  // unlocked
  let UNLOCKED = new Set(JSON.parse(localStorage.getItem('qi_unlocked') || '["sand","water","fire","stone","plant","oil","metal"]'));
  function persistUnlocked(){ localStorage.setItem('qi_unlocked', JSON.stringify(Array.from(UNLOCKED))); }

  // --- Encyclopedia ---
  function addToEncyclopedia(mat){
    const item = document.createElement('div');
    item.className = 'ency-item';
    item.id = 'ency-'+mat.id;
    item.innerHTML = `<div class="swatch" style="background:${mat.color}"></div><div class="meta"><strong>${mat.name}</strong><div>${mat.description||mat.name}</div></div>`;
    encyList.appendChild(item);
  }
  Object.values(MATERIALS).forEach(m=> addToEncyclopedia(m));

  // --- Painting ---
  canvas.addEventListener('mousedown', e=>{ mouseDown=true; paint(e); });
  window.addEventListener('mouseup', ()=> mouseDown=false);
  canvas.addEventListener('mousemove', e=>{ if(mouseDown) paint(e); });

  function paint(e){
    const r = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) * (WIDTH / r.width));
    const y = Math.floor((e.clientY - r.top) * (HEIGHT / r.height));
    placeBrush(x,y,currentMaterial);
  }

  function placeBrush(cx,cy,id){
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
        const mid = MATERIALS[id] ? id : 'empty';
        grid[ny][nx] = mid;
        temp[ny][nx] = (mid==='fire')?800:20;
      }
    }
  }

  // --- Simulation ---
  const CONTACT = {};
  function update(){
    const newGrid = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty'));
    const newTemp = Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill(20));
    for(let y=0;y<HEIGHT;y++){
      for(let x=0;x<WIDTH;x++){
        newGrid[y][x] = grid[y][x];
        newTemp[y][x] = temp[y][x];
      }
    }
    for(let y=HEIGHT-2;y>=0;y--){
      for(let x=0;x<WIDTH;x++){
        const id = grid[y][x];
        const mat = MATERIALS[id];
        if(!mat) continue;
        if(mat.flow==='powder'){
          if(grid[y+1][x]==='empty'){ newGrid[y+1][x]=id; newGrid[y][x]='empty'; newTemp[y+1][x]=temp[y][x]; newTemp[y][x]=20; }
          else { const dir = Math.random()<0.5?-1:1; if(x+dir>=0 && x+dir<WIDTH && grid[y+1][x+dir]==='empty'){ newGrid[y+1][x+dir]=id; newGrid[y][x]='empty'; } }
        } else if(mat.flow==='liquid'){
          if(grid[y+1][x]==='empty'){ newGrid[y+1][x]=id; newGrid[y][x]='empty'; }
          else { const left=x-1,right=x+1; if(left>=0&&grid[y][left]==='empty'){ newGrid[y][left]=id; newGrid[y][x]='empty'; } else if(right<WIDTH&&grid[y][right]==='empty'){ newGrid[y][right]=id; newGrid[y][x]='empty'; } }
        } else if(mat.flow==='gas'){
          if(y>0 && grid[y-1][x]==='empty'){ newGrid[y-1][x]=id; newGrid[y][x]='empty'; }
        }
        newTemp[y][x] = (temp[y][x] + (temp[y+1]?temp[y+1][x]:20))/2;
      }
    }
    grid = newGrid;
    temp = newTemp;
    detectMixes();
  }

  function detectMixes(){
    for(let y=0;y<HEIGHT;y++){
      for(let x=0;x<WIDTH;x++){
        const a = grid[y][x];
        if(a==='empty') continue;
        const neighbors = [[1,0],[-1,0],[0,1],[0,-1]];
        for(const [dx,dy] of neighbors){
          const nx=x+dx, ny=y+dy;
          if(nx<0||nx>=WIDTH||ny<0||ny>=HEIGHT) continue;
          const b = grid[ny][nx];
          if(b==='empty'||a===b) continue;
          const pair = [a,b].sort().join('+');
          const key = `${x},${y},${pair}`;
          CONTACT[key] = (CONTACT[key]||0)+1;
          if(CONTACT[key]>=12){ attemptMixWithOptionalProxy(a,b,x,y); CONTACT[key]=0; }
        }
      }
    }
  }

  // --- Mixing ---
  const explicitRecipes = {
    'fire+water': {result:'steam', create:{id:'steam', name:'Steam', color:'#dfe9ff', flow:'gas', density:-0.1, description:'Hot water vapor.'}},
    'sand+water': {result:'mud', create:{id:'mud', name:'Mud', color:'#6b4f2b', flow:'liquid', density:1.2, description:'Wet soil.'}},
    'water+oil': {result:'emulsion', create:{id:'emulsion', name:'Emulsion', color:'#6f5070', flow:'liquid', density:0.7, description:'Mixed liquid.'}}
  };

function attemptMix(a, b, x, y) {
  const key = [a, b].sort().join('+');
  
  // First, check explicit recipes
  if (explicitRecipes[key]) {
    const r = explicitRecipes[key].create;
    if (!MATERIALS[r.id]) registerMaterial(r);
    createResultAt(r.id, x, y);
    discoverMaterial(r.id);
    return;
  }

  // Prevent duplicate materials: check if deterministic material already exists
  const parents = [MATERIALS[a], MATERIALS[b]].filter(Boolean);
  if (parents.length < 2) return;

  // Deterministic ID for this combination
  const seedString = parents.map(p => p.id).sort().join('|');
  const h = Math.abs(cyrb53(seedString)) % 100000;
  const name = parents.map(p => p.name.substring(0,3)).join('') + (h % 100);
  const id = generateId(name, h);

  // If it already exists, use the existing one
  let newMat;
  if (MATERIALS[id]) {
    newMat = MATERIALS[id];
  } else {
    const color = blendColor(parents.map(p => p.color));
    const flow = pickFlow(parents);
    newMat = {
      id,
      name: name[0].toUpperCase() + name.slice(1),
      color,
      flow,
      density: Math.max(0.05, parents.reduce((s, p) => s + (p.density || 1), 0) / parents.length * (1 + (h % 11 - 5)/50)),
      flammable: parents.some(p => p.flammable),
      conductive: parents.some(p => p.conductive),
      description: `A ${flow} material formed from ${parents.map(p => p.name).join(', ')}.`,
      source: 'deterministic'
    };
    registerMaterial(newMat);
  }

  createResultAt(newMat.id, x, y);
  discoverMaterial(newMat.id);
}


  function createResultAt(id,x,y){ if(x<0||x>=WIDTH||y<0||y>=HEIGHT) return; grid[y][x]=id; temp[y][x]=(MATERIALS[id]&&MATERIALS[id].flow==='gas')?300:20; }
  function discoverMaterial(id){ if(UNLOCKED.has(id)) return; UNLOCKED.add(id); persistUnlocked(); const node=document.getElementById('ency-'+id); if(node) node.style.boxShadow='0 4px 18px rgba(79,70,229,0.3)'; }

  function cyrb53(str,seed=0){ let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed; for(let i=0;i<str.length;i++){ const ch=str.charCodeAt(i); h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677); } h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909); return 4294967296*(2097151&h2)+(h1>>>0); }
  function blendColor(colors){ let r=0,g=0,b=0; colors.forEach(c=>{const hex=c.replace('#',''); r+=parseInt(hex.substring(0,2),16); g+=parseInt(hex.substring(2,4),16); b+=parseInt(hex.substring(4,6),16);}); r=Math.floor(r/colors.length); g=Math.floor(g/colors.length); b=Math.floor(b/colors.length); return '#'+[r,g,b].map(n=>n.toString(16).padStart(2,'0')).join(''); }
  function pickFlow(parents){ if(parents.some(p=>p.flow==='liquid')) return 'liquid'; if(parents.some(p=>p.flow==='powder')) return 'powder'; if(parents.some(p=>p.flow==='gas')) return 'gas'; return 'static'; }
  function generateId(name,seed){ return name.toLowerCase().replace(/[^a-z0-9]+/g,'_')+'_'+(seed%100000); }
  function deterministicMaterialFrom(parents){ const seed=parents.map(p=>p.id).sort().join('|'); const h=Math.abs(cyrb53(seed))%100000; const name=parents.map(p=>p.name.substring(0,3)).join('')+(h%100); const color=blendColor(parents.map(p=>p.color)); const flow=pickFlow(parents); const id=generateId(name,h); return { id,name:name[0].toUpperCase()+name.slice(1), color, flow, density:Math.max(0.05,parents.reduce((s,p)=>s+(p.density||1),0)/parents.length*(1+(h%11-5)/50)), flammable:parents.some(p=>p.flammable), conductive:parents.some(p=>p.conductive), description:`A ${flow} material formed from ${parents.map(p=>p.name).join(', ')}.`, source:'deterministic' }; }

  async function requestMaterialFromProxy(parents){
    const url=proxyUrlInput.value; if(!url) throw new Error('Proxy URL not set');
    const res = await fetch(url,{method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({parents})});
    if(!res.ok) throw new Error('Proxy error '+res.status);
    const data=await res.json();
    if(!data.id||!data.name||!/^#[0-9a-fA-F]{6}$/.test(data.color||'#000000')) throw new Error('Invalid material from proxy');
    return data;
  }

  async function attemptMixWithOptionalProxy(a,b,x,y){
    if(useProxyChk.checked&&proxyUrlInput.value){
      try{
        const parents=[MATERIALS[a],MATERIALS[b]].filter(Boolean).map(p=>({id:p.id,name:p.name,color:p.color,flow:p.flow}));
        const mat = await requestMaterialFromProxy(parents);
        if(!MATERIALS[mat.id]) registerMaterial(mat);
        createResultAt(mat.id,x,y); discoverMaterial(mat.id); return;
      }catch(err){ console.warn('Proxy failed, falling back deterministic:', err.message); }
    }
    attemptMix(a,b,x,y);
  }

  // --- Canvas rendering ---
  function hexToRgb(hex){ const h=hex.replace('#',''); return {r:parseInt(h.slice(0,2),16),g:parseInt(h.slice(2,4),16),b:parseInt(h.slice(4,6),16)}; }
  function render(){
    const img = ctx.createImageData(WIDTH,HEIGHT); const d=img.data; let particles=0;
    for(let y=0;y<HEIGHT;y++){ for(let x=0;x<WIDTH;x++){ const i=(y*WIDTH+x)*4; const id=grid[y][x]||'empty'; const mat=MATERIALS[id]||MATERIALS['empty']; const col=hexToRgb(mat.color||'#000000'); d[i]=col.r; d[i+1]=col.g; d[i+2]=col.b; d[i+3]=255; if(id!=='empty') particles++; } }
    ctx.putImageData(img,0,0); miniCtx.clearRect(0,0,mini.width,mini.height); miniCtx.drawImage(canvas,0,0,mini.width,mini.height);
    countEl.textContent=particles;
  }

  // --- Main loop ---
  function loop(){
    const now = performance.now(); frames++;
    if(now-lastFps>=1000){ fpsEl.textContent = frames; frames=0; lastFps=now; }
    if(!paused){ update(); render(); }
    requestAnimationFrame(loop);
  }

  // --- Buttons ---
  pauseBtn.onclick=()=> paused=!paused; pauseBtn.textContent=paused?'Resume':'Pause';
  clearBtn.onclick=()=>{ grid=Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty')); temp=Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill(20)); render(); };
  presetSeed.onclick=()=>{ grid=Array.from({length:HEIGHT}, ()=> new Array(WIDTH).fill('empty')); render(); }; // could randomize
  exportBtn.onclick=()=>{ const data={grid,temp,unlocked:Array.from(UNLOCKED)}; const blob=new Blob([JSON.stringify(data)],{type:'application/json'}); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='qi_save.json'; a.click(); };
  importBtn.onclick=()=>{ fileInput.click(); };
  fileInput.onchange=(e)=>{ const f=e.target.files[0]; const reader=new FileReader(); reader.onload=(ev)=>{ try{ const d=JSON.parse(ev.target.result); if(d.grid) grid=d.grid; if(d.temp) temp=d.temp; if(d.unlocked){ UNLOCKED=new Set(d.unlocked); persistUnlocked(); } render(); }catch(err){alert('Invalid file');} }; reader.readAsText(f); };

  // --- Init ---
  setActiveTab('sim');
  render();
  loop();

});
