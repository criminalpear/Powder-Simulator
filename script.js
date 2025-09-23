// script.js
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d', { alpha: false }); // For performance
const materialSelect = document.getElementById('material');
const brushSizeInput = document.getElementById('brushSize');
const simSpeedInput = document.getElementById('simSpeed');
const gravityInput = document.getElementById('gravity');
const clearBtn = document.getElementById('clear');
const pauseBtn = document.getElementById('pause');
const saveBtn = document.getElementById('save');
const loadBtn = document.getElementById('load');
const loadFileInput = document.getElementById('loadFile');
const exportImageBtn = document.getElementById('exportImage');
const fullscreenBtn = document.getElementById('fullscreen');
const customColorInput = document.getElementById('customColor');
const addCustomBtn = document.getElementById('addCustom');

// Grid settings - Higher res for realism (800x600 cells, but rendered at 1px for detail)
const WIDTH = 800;
const HEIGHT = 600;
const CELL_SIZE = 1;
canvas.width = WIDTH * CELL_SIZE;
canvas.height = HEIGHT * CELL_SIZE;

// Materials (dynamic for customs)
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
    // Customs will be added as 11+
};

let nextMaterialId = 11;

// Colors (dynamic)
let COLORS = {
    [MATERIALS.EMPTY]: '#ffffff',
    [MATERIALS.SAND]: '#f4a460',
    [MATERIALS.WATER]: '#4169e1',
    [MATERIALS.STONE]: '#808080',
    [MATERIALS.FIRE]: '#ff4500',
    [MATERIALS.PLANT]: '#228b22',
    [MATERIALS.BURNING_PLANT]: '#ff8c00',
    [MATERIALS.OIL]: '#4b0082',
    [MATERIALS.ACID]: '#32cd32',
    [MATERIALS.SMOKE]: '#a9a9a9',
    [MATERIALS.LAVA]: '#ff0000',
};

// Properties for each material (for customizable behavior)
let MATERIAL_PROPS = {
    [MATERIALS.SAND]: { density: 1, flow: 'powder', flammable: false },
    [MATERIALS.WATER]: { density: 0.5, flow: 'liquid', flammable: false, extinguishes: true },
    [MATERIALS.STONE]: { density: Infinity, flow: 'static', flammable: false },
    [MATERIALS.FIRE]: { density: -1, flow: 'gas_up', flammable: false, burns: true },
    [MATERIALS.PLANT]: { density: 0.8, flow: 'static', flammable: true, grows: true },
    [MATERIALS.BURNING_PLANT]: { density: 0.8, flow: 'static', flammable: false, burns: true },
    [MATERIALS.OIL]: { density: 0.4, flow: 'liquid', flammable: true },
    [MATERIALS.ACID]: { density: 0.6, flow: 'liquid', flammable: false, dissolves: ['STONE'] },
    [MATERIALS.SMOKE]: { density: -0.5, flow: 'gas_up', flammable: false },
    [MATERIALS.LAVA]: { density: 1.2, flow: 'slow_liquid', flammable: false, melts: true, burns: true },
};

let grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(MATERIALS.EMPTY));
let isPaused = false;
let mouseDown = false;
let currentMaterial = MATERIALS.SAND;
let brushSize = 5;
let simSpeed = 50; // ms per frame
let gravity = 1; // Multiplier
let lastUpdate = 0;

// Update controls
materialSelect.addEventListener('change', () => {
    const val = materialSelect.value;
    currentMaterial = val === 'erase' ? 'erase' : MATERIALS[val.toUpperCase()] || MATERIALS.SAND;
});

brushSizeInput.addEventListener('input', () => { brushSize = parseInt(brushSizeInput.value); });
simSpeedInput.addEventListener('input', () => { simSpeed = parseInt(simSpeedInput.value); });
gravityInput.addEventListener('input', () => { gravity = parseFloat(gravityInput.value); });

clearBtn.addEventListener('click', () => {
    grid = Array.from({ length: HEIGHT }, () => Array(WIDTH).fill(MATERIALS.EMPTY));
});

pauseBtn.addEventListener('click', () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? 'Resume' : 'Pause';
});

saveBtn.addEventListener('click', () => {
    const data = JSON.stringify(grid);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sim_save.json';
    a.click();
});

loadBtn.addEventListener('click', () => loadFileInput.click());
loadFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
            grid = JSON.parse(ev.target.result);
        };
        reader.readAsText(file);
    }
});

exportImageBtn.addEventListener('click', () => {
    const url = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simulation.png';
    a.click();
});

fullscreenBtn.addEventListener('click', () => {
    if (!document.fullscreenElement) {
        canvas.requestFullscreen();
    } else {
        document.exitFullscreen();
    }
});

addCustomBtn.addEventListener('click', () => {
    const color = customColorInput.value;
    const id = nextMaterialId++;
    MATERIALS[`CUSTOM_${id}`] = id;
    COLORS[id] = color;
    MATERIAL_PROPS[id] = { density: 1, flow: 'powder', flammable: Math.random() > 0.5 }; // Random props for fun
    const option = document.createElement('option');
    option.value = `custom_${id}`;
    option.textContent = `Custom ${id - 10}`;
    materialSelect.appendChild(option);
});

// Mouse events
canvas.addEventListener('mousedown', () => { mouseDown = true; });
canvas.addEventListener('mouseup', () => { mouseDown = false; });
canvas.addEventListener('mouseleave', () => { mouseDown = false; });
canvas.addEventListener('mousemove', placeMaterial);

function placeMaterial(e) {
    if (!mouseDown) return;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / CELL_SIZE);
    const y = Math.floor((e.clientY - rect.top) / CELL_SIZE);

    for (let dy = -brushSize; dy <= brushSize; dy++) {
        for (let dx = -brushSize; dx <= brushSize; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT && (dx*dx + dy*dy <= brushSize*brushSize)) {
                grid[ny][nx] = currentMaterial === 'erase' ? MATERIALS.EMPTY : currentMaterial;
            }
        }
    }
}

// Generalized update logic based on props
function updateGrid() {
    const newGrid = grid.map(row => row.slice());

    for (let y = HEIGHT - 1; y >= 0; y--) {
        for (let x = 0; x < WIDTH; x++) {
            const cell = grid[y][x];
            if (cell === MATERIALS.EMPTY) continue;
            const props = MATERIAL_PROPS[cell] || { density: 1, flow: 'powder' };

            // Falling/moving based on flow and density
            if (props.flow === 'powder' || props.flow === 'liquid' || props.flow === 'slow_liquid') {
                const speed = props.flow === 'slow_liquid' ? (Math.random() < 0.1 ? 1 : 0) : 1;
                for (let i = 0; i < speed * gravity; i++) {
                    if (y + 1 < HEIGHT) {
                        const below = grid[y + 1][x];
                        if (below === MATERIALS.EMPTY || (MATERIAL_PROPS[below]?.density > props.density && props.flow === 'liquid')) {
                            newGrid[y + 1][x] = cell;
                            newGrid[y][x] = below || MATERIALS.EMPTY;
                            break;
                        } else if (Math.random() > 0.5 && x - 1 >= 0 && grid[y + 1][x - 1] === MATERIALS.EMPTY) {
                            newGrid[y + 1][x - 1] = cell;
                            newGrid[y][x] = MATERIALS.EMPTY;
                            break;
                        } else if (x + 1 < WIDTH && grid[y + 1][x + 1] === MATERIALS.EMPTY) {
                            newGrid[y + 1][x + 1] = cell;
                            newGrid[y][x] = MATERIALS.EMPTY;
                            break;
                        }
                    }
                }
                // Sideways spread for liquids
                if (props.flow === 'liquid' && Math.random() < 0.5) {
                    if (x - 1 >= 0 && grid[y][x - 1] === MATERIALS.EMPTY) {
                        newGrid[y][x - 1] = cell;
                        newGrid[y][x] = MATERIALS.EMPTY;
                    } else if (x + 1 < WIDTH && grid[y][x + 1] === MATERIALS.EMPTY) {
                        newGrid[y][x + 1] = cell;
                        newGrid[y][x] = MATERIALS.EMPTY;
                    }
                }
            } else if (props.flow === 'gas_up') {
                // Rise for gases/fire/smoke
                if (y - 1 >= 0 && grid[y - 1][x] === MATERIALS.EMPTY && Math.random() < 0.8) {
                    newGrid[y - 1][x] = cell;
                    newGrid[y][x] = MATERIALS.EMPTY;
                } else if (Math.random() < 0.05) {
                    newGrid[y][x] = MATERIALS.EMPTY; // Dissipate
                }
            }

            // Interactions
            const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
            for (let [dx, dy] of directions) {
                const nx = x + dx;
                const ny = y + dy;
                if (nx < 0 || nx >= WIDTH || ny < 0 || ny >= HEIGHT) continue;
                const neighbor = grid[ny][nx];

                // Fire burns flammables
                if (props.burns && MATERIAL_PROPS[neighbor]?.flammable) {
                    if (neighbor === MATERIALS.PLANT) {
                        newGrid[ny][nx] = MATERIALS.BURNING_PLANT;
                    } else {
                        newGrid[ny][nx] = MATERIALS.FIRE;
                    }
                }

                // Water extinguishes fire
                if (props.extinguishes && (neighbor === MATERIALS.FIRE || neighbor === MATERIALS.BURNING_PLANT)) {
                    newGrid[ny][nx] = Math.random() < 0.5 ? MATERIALS.SMOKE : MATERIALS.EMPTY;
                    if (Math.random() < 0.2) newGrid[y][x] = MATERIALS.EMPTY; // Evaporate
                }

                // Acid dissolves
                if (props.dissolves && props.dissolves.includes(Object.keys(MATERIALS).find(key => MATERIALS[key] === neighbor))) {
                    newGrid[ny][nx] = MATERIALS.EMPTY;
                    if (Math.random() < 0.1) newGrid[y][x] = MATERIALS.EMPTY; // Corrode self
                }

                // Lava melts
                if (props.melts && neighbor !== MATERIALS.EMPTY && Math.random() < 0.05) {
                    newGrid[ny][nx] = MATERIALS.LAVA;
                }
            }

            // Plant growth
            if (props.grows && y - 1 >= 0 && grid[y - 1][x] === MATERIALS.EMPTY && hasNearby(x, y, MATERIALS.WATER) && Math.random() < 0.005) {
                newGrid[y - 1][x] = MATERIALS.PLANT;
            }

            // Burning plant to fire/smoke
            if (cell === MATERIALS.BURNING_PLANT && Math.random() < 0.1) {
                newGrid[y][x] = Math.random() < 0.7 ? MATERIALS.FIRE : MATERIALS.SMOKE;
            }
        }
    }

    grid = newGrid;
}

function hasNearby(x, y, type) {
    const directions = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];
    return directions.some(([dx, dy]) => {
        const nx = x + dx, ny = y + dy;
        return nx >= 0 && nx < WIDTH && ny >= 0 && ny < HEIGHT && grid[ny][nx] === type;
    });
}

function render() {
    const imageData = ctx.createImageData(WIDTH, HEIGHT);
    const data = imageData.data;
    for (let y = 0; y < HEIGHT; y++) {
        for (let x = 0; x < WIDTH; x++) {
            const idx = (y * WIDTH + x) * 4;
            const cell = grid[y][x];
            const color = hexToRgb(COLORS[cell] || '#ffffff');
            data[idx] = color.r;
            data[idx + 1] = color.g;
            data[idx + 2] = color.b;
            data[idx + 3] = 255;
        }
    }
    ctx.putImageData(imageData, 0, 0);
}

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : { r: 255, g: 255, b: 255 };
}

// Main loop with variable speed
function loop(timestamp) {
    if (timestamp - lastUpdate > simSpeed) {
        if (!isPaused) updateGrid();
        lastUpdate = timestamp;
    }
    render();
    requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
