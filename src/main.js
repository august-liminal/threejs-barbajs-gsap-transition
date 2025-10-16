import './styles/style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
// import barba from '@barba/core';
import gsap from 'gsap';


// const animationLeave = () => {
//     let tl = gsap.timeline();    
//     tl.to(".window", {
//         height: "100vh",
//         width: "100vw",
//         duration: 1000
//     });
//     tl.to(".tagline", {
//         opacity: 0,
//         duration: 500
//     });
//     return tl;
// }

// const animationEnter = () => {
//     let tl = gsap.timeline();
//     tl.from("#unlock-module", {
//         opacity: 0
//     })
// }

// barba.init({
//   transitions: [{
//       name: 'landing→unlock',
//       sync: true,
//       from: { namespace: ['landing'] },
//       to:   { namespace: ['unlock'] },
//       async leave() {
//         animationLeave()     
        
//       },
//       async enter() {
//         // optional: any setup code after the new page is ready
//       }
//     }]
// });

// ================================================================
// ====================== LANDING PAGE LAYOUT =====================
// ================================================================

let gridDimension, gridSize, cellSize, x, y, deltaW, deltaH;

function landing(){
    if (!location.pathname.endsWith('/landing')) return;    
    //===== DECLARATIONS
    // Grid dimension in pixel
    gridDimension = Math.max(window.innerHeight, window.innerWidth)
    document.documentElement.style.setProperty('--grid-dimension', `${gridDimension}px`)
    // Calculate difference between viewport and grid dimension
    deltaW = Math.abs(window.innerWidth - gridDimension);
    deltaH = Math.abs(window.innerHeight - gridDimension);    
    // Calculate tagline-dependent variables
    let taglineFontsize, copyrightFontsize, taglineWidth;
    if (document.querySelector('.tagline')) {
        const t = document.querySelector('.tagline');
        // Measure zize of tagline
        taglineWidth = t.getBoundingClientRect().width;
        // remove line-height inline style if exist
        t?.style.lineHeight && t.style.removeProperty('line-height');
        //Set minCellSize to be half of font size
        const minCellSize = 0.5 * parseFloat(getComputedStyle(t).fontSize);
        // Largest number of cells in grid, minimum 20
        gridSize = Math.max(Math.floor(gridDimension / minCellSize / 4) * 4, 12)
        //Calculate actual possible cell size
        cellSize = gridDimension / gridSize
        document.documentElement.style.setProperty('--cell-size', `${cellSize}px`)
        //Set tagline actual line height as 2x cell size
        t.style.setProperty('line-height', `${cellSize * 2}px`);
        //===== SHAPE
        // X being tagline width starting from viewport edge or 25% side whichever greater, round up to nearest cell
        x = Math.ceil(Math.max(gridDimension * 0.25, deltaW / 2 + taglineWidth) / cellSize) * cellSize;
        // Y at least 3 cells away from viewport edge and never project diagonally into the vertical edge of screen, round up to nearest cell
        y = Math.ceil(Math.min(deltaH / 2 + 2 * cellSize, gridDimension - x) / cellSize) * cellSize;
        //===== Text Layout
        taglineFontsize = parseFloat(getComputedStyle(document.querySelector('.tagline')).fontSize)
        copyrightFontsize = parseFloat(getComputedStyle(document.querySelector('.copyright-text')).fontSize)
        const textHorizontalOffset = window.innerWidth < gridDimension ? deltaW / 2 : 0        
        const taglineOffset = y - cellSize * 0.26;
        const copyrightOffset = y - cellSize * 0.8;
        document.querySelector('.tagline').style.right = textHorizontalOffset + 'px';
        document.querySelector('.tagline').style.bottom = taglineOffset + 'px';
        document.querySelector('.copyright-text').style.left = textHorizontalOffset + 'px';
        document.querySelector('.copyright-text').style.top = copyrightOffset + 'px'; 
    }   

    

    //===== Injecting point values into CSS
    document.documentElement.style.setProperty('--x', `${x}px`);
    document.documentElement.style.setProperty('--y', `${y}px`);
    
    //===== Creating outline as SVG
    // Declaring points
    const pts = [
    { x: 0, y: y },
    { x: x, y: y },
    { x: x + y, y: 0 },
    { x: gridDimension, y: 0 },
    { x: gridDimension, y: gridDimension - y },
    { x: gridDimension - x, y: gridDimension - y },
    { x: gridDimension - x - y, y: gridDimension },
    { x: 0, y: gridDimension },
    ];

    // Creating SVG
    const svg = document.createElementNS('http://www.w3.org/2000/svg','svg')
    svg.setAttribute('id', 'outline');
    svg.setAttribute('width',  gridDimension);
    svg.setAttribute('height', gridDimension);
    svg.setAttribute('viewBox', `0 0 ${gridDimension} ${gridDimension}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    
    // Create polyline
    const poly = document.createElementNS('http://www.w3.org/2000/svg', 'polyline');
    poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    poly.setAttribute('fill', 'none');
    poly.setAttribute('stroke', 'currentColor');
    poly.setAttribute('stroke-width', '1');
    poly.setAttribute('vector-effect', 'non-scaling-stroke');

    //Appending into DOM
    document.querySelector('#outline')?.remove();
    svg.appendChild(poly);
    document.querySelector('.grid-viewport').appendChild(svg);
        
    
    //=============== THREEJS
    // Canvas
    const canvas = document.querySelector('.webgl');

    // Scene
    const scene = new THREE.Scene()
    let object;

    //Keep track of the mouse position to animate the scene
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
    camera.position.set(0,0,0);
    scene.add(camera);

    // GLTF Loader
    const loader = new GLTFLoader();
    const modelURL = new URL('./cloud.glb', import.meta.url);
    //Load the file
    loader.load(
    modelURL.href,
    function (gltf) {
        //If the file is loaded, add it to the scene
        object = gltf.scene;
        const material = new THREE.PointsMaterial({
            size: 3,
            color: 0xffffff,
            transparent: true,
            opacity: 0.7,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        object.traverse((child) => {
            if (child.isPoints) {
                // child.material = material;
                // child.material.size = 3; // increase this value to make points bigger
                // child.material.color.set('#ffffff');
            }
        });
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        object.position.sub(center);
        object.position.z = 1;
        scene.add(object);
    },
    function (error) {
        //If there is an error, log it
        console.error(error);
    }
    );

    //Instantiate a new renderer and set its size
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    })
    renderer.setSize(size.width, size.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))     

    //Render the scene
    function animate() {
        requestAnimationFrame(animate);
        //Here we could add some code to update the scene, adding some automatic movement
        //Make the scene move
        if (object) {
            object.rotation.y = ((mouseX / window.innerWidth) * 20 - 10) * Math.PI / 180;
            object.rotation.x = ((mouseY / window.innerHeight) * 20 - 10) * Math.PI / 180;
        }
        renderer.render(scene, camera);
    }

    //Resize event listener to resize the window and the camera
    window.addEventListener("resize", function () {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    });

    //Mouse position listener
    let lastMouseUpdate = 0;
    const MOUSE_UPDATE_INTERVAL = 16; // ~60fps, adjust as needed

    document.addEventListener('mousemove', (e) => {
        const now = Date.now();
        if (now - lastMouseUpdate > MOUSE_UPDATE_INTERVAL) {
            mouseX = e.clientX;
            mouseY = e.clientY;
            lastMouseUpdate = now;
        }
    }, { passive: true });

    //Start the 3D rendering
    animate();

    // Resize Event Listener
    window.addEventListener('resize', () => {
        // Update Size
        size.width = window.innerWidth,
        size.height = window.innerHeight,

        // Update camera
        camera.aspect = size.width / size.height,
        camera.updateProjectionMatrix(),

        // Update renderer
        renderer.setSize(size.width, size.height),
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.5))        
    })    
    
    window.addEventListener('resize', landing);
    document.documentElement.style.visibility = 'visible';

    window.addEventListener('load',       updateLanding);
    window.addEventListener('mousemove',  updateLanding, { passive: true });
    window.addEventListener('touchstart', updateLanding, { passive: true });
    window.addEventListener('touchmove',  updateLanding, { passive: true });
}

//===== Landing page window resizing & flickering effect

function updateLanding(e) {
    if (!location.pathname.endsWith('/landing')) return;
    const windowBox = document.querySelector('.window');

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // --- Get mouse/touch pos relative to viewport center ---
    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const p = e?.touches?.[0] || e || { clientX: innerWidth, clientY: 0 };
    const pos = { x: p.clientX - innerWidth / 2, y: p.clientY - innerHeight / 2 };



    // --- Multiplier for effect (safe & bounded 0..1) ---
    const EPS = 0.0001;
    const ax = Math.abs(pos.x), ay = Math.abs(pos.y);
    const ratio = (ax < ay) ? ax / Math.max(ay, EPS) : ay / Math.max(ax, EPS);
    const multiplier = Math.min(1, ratio);
    document.documentElement.style.setProperty('--e', String(multiplier));


    // --- Size in cells ---
    const windowW = clamp(Math.round(Math.abs(pos.x) / cellSize) * 2, 2, gridSize - 2);
    const windowH = clamp(Math.round(Math.abs(pos.y) / cellSize) * 2, 2, gridSize - 2 * (y / cellSize) - 4);

    // Passing value
    windowBox.style.inset = (window.innerHeight < gridDimension ? deltaH / 2 + 'px' : '0') + ' ' +     (window.innerWidth < gridDimension ? deltaW / 2 + 'px' : '0');
    windowBox.style.setProperty('--w', windowW);
    windowBox.style.setProperty('--h', windowH);


    // Drawing Entrance
    const entrance = document.querySelector('#entrance') || document.querySelector('.grid-container').appendChild(Object.assign(document.createElement('a'), { id: 'entrance' }));
    Object.assign(entrance.style,{position:'absolute', zIndex: '999', top: '50%', left: '50%', transform:'translate(-50%,-50%)', width: windowW * cellSize + 'px', height: windowH * cellSize + 'px', border: '1px solid #fff', transition: 'background 0.2s ease-out, box-shadow 0.2s ease-out'});
    if(windowH == 2 && windowW == 2) {
        Object.assign(entrance.style,{background:'#fff', boxShadow: '0 0 2rem #fff'});
        entrance.setAttribute('href','/unlock');          
        document.documentElement.style.setProperty('--e', '1');      
    } else {
        Object.assign(entrance.style,{background:'transparent', boxShadow: 'none'});
        entrance.removeAttribute('href');
    }
}

// ================================================================
// ========================== UNLOCK PAGE =========================
// ================================================================

let unlockInit = false;

function unlock() {
  if (!location.pathname.endsWith('/unlock') || unlockInit) return;
  unlockInit = true;

  // ---- CONSTANTS
  const ENTRY_PAGE     = '/landing';
  const PROTECTED_PAGE = '/space';
  const API_URL        = 'https://liminal-webflow-auth.vercel.app/api/validate-code';

  // ---- ELEMENTS
  const t            = document.querySelector('#unlock-title');
  const unlockModule = document.querySelector('#unlock-module');
  const inner        = document.querySelector('#unlock-module-inner');
  const container    = unlockModule?.parentNode;

  if (!t || !unlockModule || !container) return; // basic guard

  // ---- TYPOGRAPHY / GRID SIZING
  if (t?.style.lineHeight) t.style.removeProperty('line-height');

  const mincellSize = 0.5 * parseFloat(getComputedStyle(t).fontSize);
  const dimensionH  = Math.max(12, Math.floor(window.innerHeight / mincellSize));
  const dimensionW  = Math.max(12, Math.floor(window.innerWidth  / mincellSize / 2) * 2);
  const cellSize    = window.innerHeight / dimensionH;

  inner?.style.setProperty('--cell-size', `${cellSize}px`);
  t.style.lineHeight = (cellSize * 2) + 'px';

  const innerH = dimensionH - 8;
  const innerW = dimensionW - 2;
  const total  = innerH * innerW;

  // ---- LINES: clear previous then place fresh
  container.querySelectorAll('.line-solid, .line-dashed').forEach(n => n.remove());

  const paddingY = (window.innerHeight - innerH * cellSize) / 2;
  const paddingX = (window.innerWidth  - innerW * cellSize) / 2;
  container.style.padding = `${paddingY}px ${paddingX}px`;

  // verticals
  container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical',  style: `left:${paddingX - 8}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical',  style: `left:${paddingX}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `left:${Math.round(window.innerWidth / 2 - cellSize * 4)}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `right:${Math.round(window.innerWidth / 2 - cellSize * 4)}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical',  style: `right:${paddingX}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical',  style: `right:${paddingX - 8}px;` }));
  // horizontals
  container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal',  style: `top:${paddingY}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-horizontal', style: `top:${window.innerHeight / 2 - cellSize}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-horizontal', style: `bottom:${window.innerHeight / 2 - cellSize}px;` }));
  container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal',  style: `bottom:${paddingY}px;` }));

  // ---- GRID SETUP
  document.querySelector('.code')?.style && (document.querySelector('.code').style.top = (innerH / 2 - 1) * cellSize + 'px');

  unlockModule.style.display = 'grid';
  unlockModule.style.gridTemplateColumns = `repeat(${innerW}, ${cellSize}px)`;
  unlockModule.style.gap    = '0';
  unlockModule.style.width  = (innerW * cellSize) + 'px';
  unlockModule.style.height = (innerH * cellSize) + 'px';

  // clear previous cells if re-running
  unlockModule.querySelectorAll('.cell').forEach(el => el.remove());

  const frag  = document.createDocumentFragment();
  const cells = new Array(total);
  for (let i = 0; i < total; i++) {
    const cell = document.createElement('div');
    cell.className         = 'cell';
    cell.textContent       = '•';
    cell.style.width       = cellSize + 'px';
    cell.style.height      = cellSize + 'px';
    cell.style.lineHeight  = `${cellSize}px`;
    cell.style.textAlign   = 'center';
    cell.style.userSelect  = 'none';
    cell.style.pointerEvents = 'none';
    cell.style.willChange  = 'transform';
    frag.appendChild(cell);
    cells[i] = cell;
  }
  unlockModule.appendChild(frag);

  // =============== TEXT MATRIX (single mode) ===============
  
  const RAMP = Array.from(" .:-=+*#%@");
  const MIN_SCALE = 0.1, MAX_SCALE = 3;
  const RIPPLE_DECAY = 0.01;
  const POINTER_SIGMA_FACTOR = 0.25;
  const NOISE_SCALE = 3.0;

  // centers & jitter
  const centersX = new Float32Array(total);
  const centersY = new Float32Array(total);
  const jitter   = new Float32Array(total);
  const lastChar = new Int16Array(total); lastChar.fill(-1);

  for (let j = 0; j < innerH; j++) {
    for (let i = 0; i < innerW; i++) {
      const idx = j * innerW + i;
      centersX[idx] = (i + 0.5) * cellSize;
      centersY[idx] = (j + 0.5) * cellSize;
      const h = (((i * 374761393 + j * 668265263) >>> 0) * 2.3283064365386963e-10) - 0.5;
      jitter[idx] = h * 0.03;
    }
  }

  // module rect / pointer
  let modRect = unlockModule.getBoundingClientRect();
  const ro = new ResizeObserver(() => { modRect = unlockModule.getBoundingClientRect(); });
  ro.observe(unlockModule);
  addEventListener('scroll', () => { modRect = unlockModule.getBoundingClientRect(); }, { passive: true });

  let mx = modRect.width / 2, my = modRect.height / 2;
  let vx = 0, vy = 0, lastX = mx, lastY = my;

  function onPointer(e) {
    const p = e.touches ? e.touches[0] : e;
    const x = p.clientX - modRect.left;
    const y = p.clientY - modRect.top;
    vx = 0.7 * vx + 0.3 * (x - lastX);
    vy = 0.7 * vy + 0.3 * (y - lastY);
    mx = x; my = y; lastX = x; lastY = y;
  }
  unlockModule.addEventListener('pointermove', onPointer, { passive: true });
  unlockModule.addEventListener('touchmove',  onPointer, { passive: true });

  // helpers
  const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
  const mix = (a,b,t) => a + (b - a) * t;
  function noise2(x, y, t){
    return (Math.sin(1.7*x + 1.3*y + 0.9*t) * 0.6 +
            Math.sin(2.1*x - 0.8*y + 1.7*t) * 0.4) * 0.5 + 0.5;
  }

  function makeField(modW, modH) {
    const invW = 1 / modW, invH = 1 / modH;
    const minSide = Math.min(modW, modH);
    const sigma = Math.max(80, minSide * POINTER_SIGMA_FACTOR);
    const inv2Sig2 = 1 / (2 * sigma * sigma);

    return function field(x, y, t) {
      const xn = x * invW, yn = y * invH;
      const dx = x - mx,   dy = y - my;
      const dist = Math.hypot(dx, dy);

      const ang   = Math.atan2(dy, dx);
      const swirl = Math.sin(ang * 3.0 + t * 1.5) * Math.exp(-dist * 0.008) * 0.5 + 0.5;
      const Noise = noise2(xn * NOISE_SCALE, yn * NOISE_SCALE, t * 0.5);
      const Cursor= Math.exp(-(dx*dx + dy*dy) * inv2Sig2);

      return clamp01( swirl * 0.5 + Noise * 0.3 + Cursor * 0.2 );
    };
  }

  let start = performance.now();
  let running = true;

  const io = new IntersectionObserver((entries) => {
    running = entries.some(e => e.isIntersecting);
  }, { root: null, threshold: 0.01 });
  io.observe(unlockModule);

  function renderFrame(tSec, staticOnce) {
    const modW = modRect.width  || (innerW * cellSize);
    const modH = modRect.height || (innerH * cellSize);
    const field = makeField(modW, modH);

    for (let idx = 0; idx < total; idx++) {
      let F = field(centersX[idx], centersY[idx], tSec) + jitter[idx];
      F = clamp01(F);

      const ci = (F * (RAMP.length - 1)) | 0;
      if (ci !== lastChar[idx]) {
        cells[idx].textContent = RAMP[ci];
        lastChar[idx] = ci;
      }
      const s = mix(MIN_SCALE, MAX_SCALE, F);
      cells[idx].style.transform = `scale(${s})`;
    }
    if (staticOnce) return;
  }

  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');
  function tick() {
    if (reduce?.matches) { renderFrame(0, true); return; }
    if (!running) { requestAnimationFrame(tick); return; }
    const t = (performance.now() - start) / 1000;
    renderFrame(t, false);
    requestAnimationFrame(tick);
  }
  if (reduce?.matches) renderFrame(0, true); else tick();

  // ---- DISSOLVE 
  function dissolveTextMatrix({ from = 'center', duration = 700, spread = 400, easing = 'cubic-bezier(0.16,1,0.3,1)' } = {}) {
    const rect = unlockModule.getBoundingClientRect();
    let ox, oy;
    if (Array.isArray(from)) [ox, oy] = from; else { ox = rect.width / 2; oy = rect.height / 2; }

    unlockModule.classList.add('is-dissolving');
    unlockModule.style.pointerEvents = 'none';

    const diag = Math.hypot(rect.width, rect.height) || 1;
    let done = 0;

    return new Promise((resolve) => {
      // schedule in chunks to reduce main-thread spike
      const CHUNK = 500;
      const startAnim = (startIdx) => {
        const end = Math.min(startIdx + CHUNK, total);
        for (let idx = startIdx; idx < end; idx++) {
          const j = (idx / innerW) | 0, i = idx % innerW;
          const cx = (i + 0.5) * cellSize;
          const cy = (j + 0.5) * cellSize;
          const dx = cx - ox, dy = cy - oy;
          const dist = Math.hypot(dx, dy);
          const h = (((i * 374761393 + j * 668265263) >>> 0) * 2.3283064365386963e-10) - 0.5;

          const delay = Math.max(0, (dist / diag) * spread + h * 90);

          const anim = cells[idx].animate(
            [{ opacity: 1 }, { opacity: 0 }],
            { duration, delay, easing, fill: 'forwards' }
          );
          anim.onfinish = () => { if (++done === total) resolve(); };
        }
        if (end < total) requestAnimationFrame(() => startAnim(end));
      };
      startAnim(0);
    });
  }

  // ===================== VALIDATION ========================
  
  document.getElementById('submit-btn')?.addEventListener('click', validateCode);

  const inputs = document.querySelectorAll('.digit');
  inputs.forEach((input, i) => {
    input.addEventListener('input', () => { if (input.value && i < inputs.length - 1) inputs[i + 1].focus(); });
    input.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus(); });
  });

  async function validateCode() {
    const code    = Array.from(document.querySelectorAll('.digit')).map(i => i.value).join('');
    const button  = document.getElementById('submit-btn');
    const message = document.getElementById('message');

    if (!code || code.length !== 4) {
      message.innerHTML = '<span style="color:red;">Please enter a 4-digit code</span>';
      return;
    }

    button.textContent = 'Validating';
    button.disabled = true;
    message.innerHTML = '';

    // fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({ code }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error('HTTP ' + response.status);
      const result = await response.json();

      if (result.valid) {
        // UI + session
        button.style.opacity = '0';
        sessionStorage.setItem('userName',    result.name);
        sessionStorage.setItem('sessionToken', result.token);
        sessionStorage.setItem('accessTime',   Date.now());

        message.innerHTML = `<span style="color:green;">Welcome ${result.name}! Redirecting...</span>`;

        // Start dissolve but don't block navigation on it
        const MAX_WAIT = 900;
        Promise.race([
          dissolveTextMatrix({ duration: 700, spread: 400 }),
          new Promise(r => setTimeout(r, MAX_WAIT))
        ]).then(() => location.replace(PROTECTED_PAGE));
      } else {
        message.innerHTML = '<span style="color:red;">Invalid code. Try again.</span>';
      }
    } catch (err) {
      clearTimeout(timeoutId);
      message.innerHTML = '<span style="color:red;">Connection error. Try again.</span>';
    } finally {
      button.textContent = 'Enter';
      button.disabled = false;
    }
  }

  // Show page
  document.documentElement.style.visibility = 'visible';
}


// ================================================================
// =========================== MAIN PAGE ==========================
// ================================================================

function space() {
    if (!location.pathname.endsWith('/space')) return;
    document.getElementById('logout-btn')?.addEventListener('click', logout);
    // SET URLS HERE
    const ENTRY_PAGE = './landing';
    const PROTECTED_PAGE = './space';

    // Protect this page
    (function() {
    const userName = sessionStorage.userName;
    const sessionToken = sessionStorage.getItem('sessionToken');
    const accessTime = parseInt(sessionStorage.getItem('accessTime'));
    
    const validDuration = 2 * 60 * 60 * 1000; // 2 hours
    
    // Check if session is valid
    if (!userName || !sessionToken || !accessTime || (Date.now() - accessTime) > validDuration) {
        // Invalid session - redirect to entry page using variable
        sessionStorage.clear();
        window.location.replace(ENTRY_PAGE);
        return;
    }

    // Logo
    document.querySelector('#logo-svg').setAttribute('fill', 'white');
    
    // Append user's name into span
    document.querySelector('#user-name').textContent = sessionStorage.getItem('userName') || '';
    })();    

    function logout() {
    sessionStorage.clear();
    window.location.href = ENTRY_PAGE; 
    }

    // Scroll cue
    const host=document.querySelector('#welcome .scroll-cue');
    const easeCirc = 'cubic-bezier(0,0.55,0.45,1)';
    
    function animateCueInner(cueInner) {
      // Animation sequence:
      // 0-0.75s: transform-origin 50% 0%, scale 0% -> 100%
      // 0.75s: instant switch to transform-origin 50% 100%, scale 100%
      // 0.75-1.5s: transform-origin 50% 100%, scale 100% -> 0%
      return cueInner.animate([
        { transformOrigin: '50% 0%', transform: 'scaleY(0)', offset: 0 },        // 0s
        { transformOrigin: '50% 0%', transform: 'scaleY(1)', offset: 0.75 },      // 0.75s
        { transformOrigin: '50% 100%', transform: 'scaleY(1)', offset: 0.8 },    // 0.75s (instant)
        { transformOrigin: '50% 100%', transform: 'scaleY(0)', offset: 1 }       // 1.5s
      ], {
        duration: 3000, // Total duration
        easing: easeCirc
      });
    }

    async function runCueAnimation() {
        const scrollCue = document.querySelector('#welcome .scroll-cue');        
        while (true) {
            // Create and append a new cueInner
            const cueInner = document.createElement('div');
            cueInner.className = 'inner';
            scrollCue.appendChild(cueInner);
            
            // Start the animation
            const animation = animateCueInner(cueInner);
            
            // Remove element after animation completes
            setTimeout(() => {
            cueInner.remove();
            }, 3000);
            
            // Wait 1.0s before starting next
            await new Promise(resolve => setTimeout(resolve, 2100));
        }
    }

    runCueAnimation();
    

    
    // =============== THREEJS ===============

    // Canvas
    const canvas = document.querySelector('#space');

    // Scene
    const scene = new THREE.Scene()
    let object;
    const BLOOM_SCENE = 1;
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_SCENE);

    // 🎛️ BLOOM KNOBS - Adjust these values!
    const params = {
        threshold: 0.5,      // 🎛️ 0-1: Lower = more objects bloom
        strength: 0.3,     // 🎛️ 0-3: Bloom intensity
        radius: 0.3,       // 🎛️ 0-1: Bloom spread
        exposure: 2        // 🎛️ 0.1-2: Overall brightness
    };

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 1000);
    camera.position.set(-180, 0, 0);
    scene.add(camera);

    // Lighting
    const light = new THREE.AmbientLight(0xffffff, 1);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    scene.add(directionalLight);

    // GLTF Loader
    const loader = new GLTFLoader();   
    
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uColor: { value: new THREE.Color(0xffffff) },
            // tweak this size constant as needed
            uSize: { value: 200.0 },
            cameraNear: { value: camera.near },
            cameraFar: { value: camera.far }
        },
        vertexShader: `
            uniform float uSize;
            uniform float cameraNear;
            uniform float cameraFar;
            varying float vDepth;

            void main() {
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                vDepth = -mvPosition.z;

                // You can experiment with scaling formula
                // Here: point size falls off with depth
                float size = uSize * (1.2 / vDepth);
                gl_PointSize = size;

                gl_Position = projectionMatrix * mvPosition;
            }
        `,
        fragmentShader: `
        uniform vec3 uColor;
        varying float vDepth;

        void main() {
            // compute distance from center of point
            vec2 uv = gl_PointCoord.xy - vec2(0.5);
            float dist = length(uv);

            // discard fragments outside radius
            if (dist > 0.5) {
            discard;
            }

            // simple shading: fade by distance from center
            float t = 1.0 - smoothstep(0.4, 0.5, dist);
            vec3 color = uColor * t;

            gl_FragColor = vec4(color, t);
        }
        `,
        transparent: true,
        depthWrite: false
    });

    const modelURL = new URL('./cloud.glb', import.meta.url);
    loader.load(
        modelURL.href,
        function (gltf) {
            object = gltf.scene; 
            object.scale.set(1, 1, 1);            
            
            gltf.scene.traverse((object) => {
                if (object.isPoints) {
                    const geometry = object.geometry;
                    object.material.dispose();             
                    object.material = shaderMaterial;
                    const newPoints = new THREE.Points(geometry, shaderMaterial);
                    newPoints.position.copy(object.position);
                    newPoints.rotation.copy(object.rotation);
                    newPoints.scale.copy(object.scale);

                    // replace in scene
                    object.parent.add(newPoints);
                    object.parent.remove(object);
                }
            });  
            
            const boundingBox = new THREE.Box3().setFromObject(object);
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            
            object.position.set(-center.x, -center.y, -center.z);
            
            const group = new THREE.Group();
            group.add(object);
            scene.add(group);
            
            object = group;
        },
        function (xhr) {
            console.log((xhr.loaded / xhr.total * 100) + '% loaded');
        },
        function (error) {
            console.error('An error occurred loading the GLB:', error);
        }
    );

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    })
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.toneMappingExposure = params.exposure;
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    renderer.toneMapping = THREE.ReinhardToneMapping;

    // Render passes
    const renderScene = new RenderPass(scene, camera);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        params.strength,  // strength
        params.radius,    // radius
        params.threshold  // threshold
    );

    const bloomComposer = new EffectComposer(renderer);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    // Shader to mix bloom with scene
    const mixPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D baseTexture;
                uniform sampler2D bloomTexture;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = texture2D(baseTexture, vUv) + vec4(1.0) * texture2D(bloomTexture, vUv);
                }
            `,
            defines: {}
        }), 'baseTexture'
    );
    mixPass.needsSwap = true;

    const outputPass = new OutputPass();

    const finalComposer = new EffectComposer(renderer);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(mixPass);
    finalComposer.addPass(outputPass);

    // 🎛️ ROTATION SPEED
    const rotationSpeed = 0.0006; // Adjust rotation speed

    // Animation loop
    function animate() {
        requestAnimationFrame(animate);
        
        if (object) {
            object.rotation.y += rotationSpeed;
        }
        
        // 🎛️ USE COMPOSERS INSTEAD OF DIRECT RENDER
        scene.traverse(darkenNonBloomed);
        bloomComposer.render();
        scene.traverse(restoreMaterial);
        finalComposer.render();
    }

    // Helper to isolate bloom objects
    const materials = {};
    function darkenNonBloomed(obj) {
        if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
            materials[obj.uuid] = obj.material;
            obj.material = new THREE.MeshBasicMaterial({ color: 'black' });
        }
    }

    function restoreMaterial(obj) {
        if (materials[obj.uuid]) {
            obj.material = materials[obj.uuid];
            delete materials[obj.uuid];
        }
    }

    animate();

    // Resize Event Listener
    window.addEventListener('resize', () => {
        size.width = window.innerWidth;
        size.height = window.innerHeight;

        camera.aspect = size.width / size.height;
        camera.updateProjectionMatrix();

        renderer.setSize(size.width, size.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        
        bloomComposer.setSize(size.width, size.height);
        finalComposer.setSize(size.width, size.height);
    });

    document.documentElement.style.visibility = 'visible';
}

// ================================================================
// ========================= EVENT LISTENER =======================
// ================================================================
window.addEventListener('DOMContentLoaded', () => {
  landing();
  updateLanding();
  unlock();
  space();
});

