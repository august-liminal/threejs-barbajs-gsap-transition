//==========================
//IMPORT
//==========================

// Three core (CDN)
import * as THREE from 'https://esm.sh/three@0.180.0';

// Three add-ons (same CDN + shared dependency)
import { GLTFLoader } from 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js?deps=three@0.180.0';
import { EffectComposer } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js?deps=three@0.180.0';
import { RenderPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/RenderPass.js?deps=three@0.180.0';
import { ShaderPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/ShaderPass.js?deps=three@0.180.0';
import { UnrealBloomPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js?deps=three@0.180.0';
import { OutputPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/OutputPass.js?deps=three@0.180.0';
import { RoomEnvironment } from 'https://esm.sh/three@0.180.0/examples/jsm/environments/RoomEnvironment.js?deps=three@0.180.0';
import { CSS2DRenderer, CSS2DObject } from 'https://esm.sh/three@0.180.0/examples/jsm/renderers/CSS2DRenderer.js?deps=three@0.180.0';

// GSAP
import { gsap } from 'https://esm.sh/gsap@3.13.0?target=es2020';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.13.0/ScrollTrigger?target=es2020&external=gsap';
gsap.registerPlugin(ScrollTrigger);

// Barba
import barba from 'https://esm.sh/@barba/core@2.9.7?target=es2020';



// Initialize barba
barba.init({
    preventRunning: true,
    transitions: [{
        name: 'universal',
        sync: true,

        async once({ next }) {
            pin(next.container);
            gsap.set(next.container, { zIndex: 1 });

            const ns = next.container.dataset.barbaNamespace;
            Page[ns]?.build?.();
            await nextFrame();

            // try once → else enter → else default
            await (Page[ns]?.once?.({ next })
                ?? Page[ns]?.enter?.({ next })
                ?? defaultEnter({ next }));

            unpin(next.container);
        },

        leave(data) {
            pin(data.current.container);
            gsap.set(data.current.container, { zIndex: 2 });
            const ns = data.current.container.dataset.barbaNamespace;
            return (Page[ns]?.leave?.(data)) ?? defaultLeave(data);
        },

        async enter(data) {
            pin(data.next.container);
            gsap.set(data.next.container, { zIndex: 1 });

            const ns = data.next.container.dataset.barbaNamespace;
            Page[ns]?.build?.();

            await nextFrame();
            await ((Page[ns]?.enter?.(data)) ?? defaultEnter(data));

            unpin(data.next.container);
        }
    }]
});

// Animation pause/resume helper    
let spaceRenderer = null;
let spaceTick = null;
let isRunning = false;

function startThree() {
    if (spaceRenderer && spaceTick && !isRunning) {
        spaceRenderer.setAnimationLoop(spaceTick);
        isRunning = true;
    }
}
function stopThree() {
    if (spaceRenderer && isRunning) {
        spaceRenderer.setAnimationLoop(null);
        isRunning = false;
    }
}


// ================================================================
// ====================== LANDING PAGE LAYOUT =====================
// ================================================================


let gridDimension, gridSize, cellSize, x, y, deltaW, deltaH;

function landing() {
    if (!location.pathname.endsWith('/landing') || landingInit) return;

    function landingLayout() {
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
        document.querySelector('#grid-bg').style.setProperty('--x', `${x}px`);
        document.querySelector('#grid-bg').style.setProperty('--y', `${y}px`);

        // Loader
        document.querySelector('.grid-container')?.appendChild(
            Object.assign(document.createElement('div'), { className: 'loader-glow' })
        );
        document.querySelector('.grid-bg')?.appendChild(
            Object.assign(document.createElement('div'), { className: 'loader' })
        );

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
        const NS = 'http://www.w3.org/2000/svg';
        let svg = document.getElementById('outline');
        let poly;

        if (!svg) {
            svg = document.createElementNS(NS, 'svg');
            svg.id = 'outline';

            poly = document.createElementNS(NS, 'polyline');
            poly.setAttribute('fill', 'none');
            poly.setAttribute('stroke', 'currentColor');
            poly.setAttribute('stroke-width', '1');
            poly.setAttribute('vector-effect', 'non-scaling-stroke');
            svg.appendChild(poly);

            document.querySelector('.grid-viewport')?.appendChild(svg);
        } else {
            poly = svg.querySelector('polyline');
        }

        svg.setAttribute('width', gridDimension);
        svg.setAttribute('height', gridDimension);
        svg.setAttribute('viewBox', `0 0 ${gridDimension} ${gridDimension}`);
        svg.setAttribute('preserveAspectRatio', 'none');

        poly.setAttribute('points', pts.map(p => `${p.x},${p.y}`).join(' '));
    }

    landingLayout();




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
    camera.position.set(0, 0, 0);
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
        }, null,
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
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    //Render the scene
    function animate() {
        requestAnimationFrame(animate);
        //Here we could add some code to update the scene, adding some automatic movement
        //Make the scene move
        if (object) {
            object.rotation.y = ((mouseX / window.innerWidth) * 20 - 20) * Math.PI / 180;
            object.rotation.x = ((mouseY / window.innerHeight) * 20 - 20) * Math.PI / 180;
        }
        renderer.render(scene, camera);
    }

    //Start the 3D rendering
    animate();

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
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
    })

    document.documentElement.style.visibility = 'visible';

    landingInit = true;

    window.addEventListener('load', updateLanding);
    window.addEventListener('mousemove', updateLanding, { passive: true });
    window.addEventListener('touchstart', updateLanding, { passive: true });
    window.addEventListener('touchmove', updateLanding, { passive: true });

    window.addEventListener('resize', () => { landingLayout(); });
}

//===== Landing page window resizing & flickering effect

function updateLanding(e) {
    if (!location.pathname.endsWith('/landing')) return;
    const windowBox = document.querySelector('.window');

    const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

    // --- Get mouse/touch pos relative to viewport center ---
    const p = e?.touches?.[0] || e || { clientX: innerWidth, clientY: 0 };
    const pos = { x: p.clientX - innerWidth / 2, y: p.clientY - innerHeight / 2 };

    // --- Multiplier for effect (safe & bounded 0..1) ---
    const EPS = 0.0001;
    const ax = Math.abs(pos.x), ay = Math.abs(pos.y);
    const ratio = (ax < ay) ? ax / Math.max(ay, EPS) : ay / Math.max(ax, EPS);
    const multiplier = Math.min(1, ratio);
    document.documentElement.style.setProperty('--e', String(multiplier));


    // --- Size in cells ---
    let windowW, windowH;
    const rawW = Math.round(Math.abs(pos.x) / cellSize) * 2;
    const rawH = Math.round(Math.abs(pos.y) / cellSize) * 2;
    windowW = clamp(Math.max(2, rawW), 2, gridSize - 2);
    windowH = clamp(Math.max(2, rawH), 2, gridSize - 2 * (y / cellSize) - 4);

    if (!Number.isFinite(windowW)) windowW = Math.floor(Math.min(window.innerHeight, window.innerWidth) / cellSize / 2) * 2;
    if (!Number.isFinite(windowH)) windowH = Math.floor(Math.min(window.innerHeight, window.innerWidth) / cellSize / 2) * 2;

    // Drawing Entrance
    const entrance = document.querySelector('#entrance') || document.querySelector('.grid-container').appendChild(Object.assign(document.createElement('a'), { id: 'entrance' }));
    entrance.style.setProperty('--entrance-w', windowW);
    entrance.style.setProperty('--entrance-h', windowH);
    //Object.assign(entrance.style,{position:'absolute', zIndex: '999', top: '50%', left: '50%', transform:'translate(-50%,-50%)', width: windowW * cellSize + 'px', height: windowH * cellSize + 'px', border: '1px solid #fff', transition: 'background 0.2s ease-out, box-shadow 0.2s ease-out'});
    if (windowH == 2 && windowW == 2) {
        Object.assign(entrance.style, { background: '#fff', boxShadow: '0 0 2rem #fff' });
        entrance.setAttribute('href', '/unlock');
        document.documentElement.style.setProperty('--e', '1');
    } else {
        Object.assign(entrance.style, { background: 'transparent', boxShadow: 'none' });
        entrance.removeAttribute('href');
    }

    // Drawing Entrance Inner
    windowBox.style.inset = (window.innerHeight < gridDimension ? deltaH / 2 + 'px' : '0') + ' ' + (window.innerWidth < gridDimension ? deltaW / 2 + 'px' : '0');
    if (windowW) windowBox.style.setProperty('--w', windowW);
    if (windowH) windowBox.style.setProperty('--h', windowH);
}

// ================================================================
// ========================== UNLOCK PAGE =========================
// ================================================================

function unlock() {
    if (!location.pathname.endsWith('/unlock') || unlockInit) return;

    // ---- CONSTANTS
    const ENTRY_PAGE = '/landing';
    const PROTECTED_PAGE = '/space';
    const API_URL = 'https://liminal-webflow-auth.vercel.app/api/validate-code';
    let paddingX, paddingY;

    // ---- ELEMENTS
    const t = document.querySelector('#unlock-title');
    const unlockModule = document.querySelector('#unlock-module');
    const inner = document.querySelector('#unlock-module-inner');
    const container = unlockModule?.parentNode;


    // ----- GRID SETUP

    unlockModule.style.display = 'grid';
    unlockModule.style.gap = '0';

    // ---- TYPOGRAPHY / GRID SIZING
    if (t?.style.lineHeight) t.style.removeProperty('line-height');

    const mincellSize = 0.5 * parseFloat(getComputedStyle(t).fontSize);
    let dimensionH, dimensionW, cellSize, innerH, innerW, cells, total, codeOffsetX, codeOffsetY, moduleOffsetX, moduleOffsetY;
    let centersX, centersY, jitter, lastChar;

    function unlockGrid() {
        unlockModule.querySelectorAll('.cell').forEach(el => el.remove()); // clear previous cells if re-running    
        dimensionH = Math.max(12, Math.floor(window.innerHeight / mincellSize / 2) * 2);
        dimensionW = Math.max(12, Math.floor(window.innerWidth / mincellSize / 2) * 2);
        cellSize = window.innerHeight / dimensionH;

        inner?.style.setProperty('--cell-size', `${cellSize}px`);
        t.style.lineHeight = (cellSize * 2) + 'px';

        innerH = dimensionH - 8;
        innerW = dimensionW - 4;
        total = innerH * innerW;

        // ---- GRID CALCULATION
        document.querySelector('.code')?.style && (document.querySelector('.code').style.top = (innerH / 2 - 1) * cellSize + 'px');


        unlockModule.style.gridTemplateColumns = `repeat(${innerW}, ${cellSize}px)`;

        unlockModule.style.width = (innerW * cellSize) + 'px';
        unlockModule.style.height = (innerH * cellSize) + 'px';

        cells = new Array(total);
        const frag = document.createDocumentFragment();
        for (let i = 0; i < total; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = '•';
            frag.appendChild(cell);
            cells[i] = cell;
        }
        unlockModule.appendChild(frag);

        paddingY = (window.innerHeight - innerH * cellSize) / 2;
        paddingX = (window.innerWidth - innerW * cellSize) / 2;
        container.style.padding = `${paddingY}px ${paddingX}px`;

        codeOffsetX = window.innerWidth / 2 - document.querySelector('.code').clientWidth / 2;
        codeOffsetY = window.innerHeight / 2 - document.querySelector('.code').clientHeight / 2;
        moduleOffsetX = window.innerWidth / 2 - document.querySelector('#unlock-module').clientWidth / 2;
        moduleOffsetY = window.innerHeight / 2 - document.querySelector('#unlock-module').clientHeight / 2

        if (unlockInit) {
            // ---- LINES: clear previous then place fresh
            container.querySelectorAll('.line-solid, .line-dashed').forEach(n => n.remove());

            // verticals
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `left:${moduleOffsetX - 8}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `left:${moduleOffsetX}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `left:${codeOffsetX}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `right:${codeOffsetX}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `right:${moduleOffsetX}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `right:${moduleOffsetX - 8}px;` }));
            // horizontals
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal', style: `top:${moduleOffsetY}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-horizontal', style: `top:${codeOffsetY}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-horizontal', style: `bottom:${codeOffsetY}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal', style: `bottom:${paddingY}px;` }));
        }

        initMatrixBuffers();

    }
    unlockGrid()

    // verticals
    container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `left:${moduleOffsetX - 8}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `left:${moduleOffsetX}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `left:${codeOffsetX}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `right:${codeOffsetX}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `right:${moduleOffsetX}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `right:${moduleOffsetX - 8}px;` }));
    // horizontals
    container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal', style: `top:${moduleOffsetY}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-horizontal', style: `top:${codeOffsetY}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-horizontal', style: `bottom:${codeOffsetY}px;` }));
    container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal', style: `bottom:${paddingY}px;` }));

    function initMatrixBuffers() {
        centersX = new Float32Array(total);
        centersY = new Float32Array(total);
        jitter = new Float32Array(total);
        lastChar = new Int16Array(total);
        lastChar.fill(-1);

        for (let j = 0; j < innerH; j++) {
            for (let i = 0; i < innerW; i++) {
                const idx = j * innerW + i;
                centersX[idx] = (i + 0.5) * cellSize;
                centersY[idx] = (j + 0.5) * cellSize;
                const h = (((i * 374761393 + j * 668265263) >>> 0) * 2.3283064365386963e-10) - 0.5;
                jitter[idx] = h * 0.03;
            }
        }
    }

    // =============== TEXT MATRIX (single mode) ===============

    const RAMP = Array.from(" .:-=+*#%@");
    const MIN_SCALE = 0.1, MAX_SCALE = 3;
    const RIPPLE_DECAY = 0.01;
    const POINTER_SIGMA_FACTOR = 0.25;
    const NOISE_SCALE = 3.0;
    let wrongTimer = null;
    let matrixBlocked = false;

    // centers & jitter
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
    unlockModule.addEventListener('touchmove', onPointer, { passive: true });

    // helpers
    const clamp01 = v => v < 0 ? 0 : v > 1 ? 1 : v;
    const mix = (a, b, t) => a + (b - a) * t;
    function noise2(x, y, t) {
        return (Math.sin(1.7 * x + 1.3 * y + 0.9 * t) * 0.6 +
            Math.sin(2.1 * x - 0.8 * y + 1.7 * t) * 0.4) * 0.5 + 0.5;
    }

    function makeField(modW, modH) {
        const invW = 1 / modW, invH = 1 / modH;
        const minSide = Math.min(modW, modH);
        const sigma = Math.max(80, minSide * POINTER_SIGMA_FACTOR);
        const inv2Sig2 = 1 / (2 * sigma * sigma);

        return function field(x, y, t) {
            const xn = x * invW, yn = y * invH;
            const dx = x - mx, dy = y - my;
            const dist = Math.hypot(dx, dy);

            const ang = Math.atan2(dy, dx);
            const swirl = Math.sin(ang * 3.0 + t * 1.5) * Math.exp(-dist * 0.008) * 0.5 + 0.5;
            const Noise = noise2(xn * NOISE_SCALE, yn * NOISE_SCALE, t * 0.5);
            const Cursor = Math.exp(-(dx * dx + dy * dy) * inv2Sig2);

            return clamp01(swirl * 0.5 + Noise * 0.3 + Cursor * 0.2);
        };
    }

    let matrixStart = performance.now();
    let running = true;
    let matrixRAF = null;
    let matrixActive = false;

    const io = new IntersectionObserver((entries) => {
        running = entries.some(e => e.isIntersecting);
    }, { root: null, threshold: 0.01 });
    io.observe(unlockModule);

    function renderFrame(tSec, staticOnce) {
        if (matrixBlocked) return;

        const modW = modRect.width || (innerW * cellSize);
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
        if (!matrixActive) { matrixRAF = null; return; }
        if (reduce?.matches) {
            renderFrame(0, true);
            matrixRAF = null;
            return;
        }
        if (!running) {
            matrixRAF = requestAnimationFrame(tick);
            return;
        }
        const t = (performance.now() - matrixStart) / 1000;
        renderFrame(t, false);
        matrixRAF = requestAnimationFrame(tick);
    }

    function startMatrix() {
        if (matrixActive) return;
        matrixActive = true;
        matrixStart = performance.now();
        matrixRAF = requestAnimationFrame(tick);
    }

    function stopMatrix() {
        if (!matrixActive) return;
        matrixActive = false;
        if (matrixRAF) {
            cancelAnimationFrame(matrixRAF);
            matrixRAF = null;
        }
    }

    function updateMatrix() {
        modRect = unlockModule.getBoundingClientRect();
        mx = modRect.width / 2;
        my = modRect.height / 2;
        lastX = mx;
        lastY = my;
        if (!matrixActive || reduce?.matches) {
            renderFrame(0, true);
        }
    }

    renderFrame(0, true);
    textMatrixControl = {
        start: startMatrix,
        stop: stopMatrix,
        update: updateMatrix,
        dissolve: dissolveTextMatrix
    };
    updateMatrix();


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
        const code = Array.from(document.querySelectorAll('.digit')).map(i => i.value).join('');
        const button = document.getElementById('submit-btn');
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
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            if (!response.ok) throw new Error('HTTP ' + response.status);
            const result = await response.json();

            if (result.valid) { // ============== VALID CODE ANIMATIONS
                // Session
                localStorage.setItem('userName', result.user_name);
                localStorage.setItem('userGreeting', result.user_greeting);
                localStorage.setItem('userMessage', result.user_message);
                localStorage.setItem('sessionToken', result.token);
                localStorage.setItem('accessTime', Date.now());

                // UI
                button.style.opacity = '0';

                document.querySelectorAll('.line-vertical, .line-horizontal').forEach(el => { el.style.transition = 'transform 0.3s ease-out'; });
                document.querySelectorAll('.line-vertical, .line-horizontal').forEach(el => { el.style.transform = 'scale(0)'; });

                (function scaleDigitsOut() {
                    const digits = document.querySelectorAll('.code .digit');
                    digits.forEach((digit, i) => {
                        digit.animate(
                            [
                                { transform: 'scale(1)', opacity: 1 },
                                { transform: 'scale(0)', opacity: 0 }
                            ],
                            { duration: 300, delay: i * 50, easing: 'cubic-bezier(0.5, 0, 0.5, 1)', fill: 'forwards' }
                        );
                    });
                })();

                document.querySelectorAll('.text-line').forEach(el => { el.style.opacity = '0'; });
                message.innerHTML = `<span class="welcome">${result.user_greeting}. Redirecting...</span>`;

                //Set state management. Only uncomment after states are done
                //if(!localStorage.getItem(code)) {
                localStorage.setItem('userId', code);
                localStorage.setItem(code, 0);
                //}

                // Start dissolve but don't block navigation on it
                const MAX_WAIT = 900;
                Promise.race([
                    textMatrixControl?.dissolve?.({ duration: 700, spread: 400 }) ?? Promise.resolve(),
                    new Promise(r => setTimeout(r, MAX_WAIT))
                ]).then(() => barba.go(PROTECTED_PAGE));
            } else {
                message.innerHTML = '<span class="warning-message">Invalid code. Try again.</span>';
                console.log('Wrong code');

                // Immediately run wrong-input feedback
                (() => {
                    const duration = 200;
                    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');

                    // --- Block the matrix render temporarily ---
                    matrixBlocked = true;
                    if (wrongTimer) clearTimeout(wrongTimer);

                    // --- Turn every cell into 'X' ---
                    for (let i = 0; i < total; i++) {
                        cells[i].textContent = 'X';
                        lastChar[i] = -2; // mark as dirty
                    }

                    // --- Quick shake animation ---
                    if (!reduce?.matches) {
                        unlockModule.animate(
                            [
                                { transform: 'translateX(0)' },
                                { transform: 'translateX(-8px)' },
                                { transform: 'translateX(8px)' },
                                { transform: 'translateX(-6px)' },
                                { transform: 'translateX(6px)' },
                                { transform: 'translateX(-3px)' },
                                { transform: 'translateX(3px)' },
                                { transform: 'translateX(0)' }
                            ],
                            { duration, easing: 'linear' }
                        );
                    }

                    // --- Restore matrix after 200ms ---
                    wrongTimer = setTimeout(() => {
                        matrixBlocked = false;
                        wrongTimer = null;
                        lastChar.fill(-1); // force next render refresh
                    }, duration);
                })();
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
    unlockInit = true;
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            unlockGrid();
            textMatrixControl?.update();
        }, 50);
    });
}


// ================================================================
// =========================== MAIN PAGE ==========================
// ================================================================

function space() {
    // =================== CHECKS AND PROTECTIONS ===================
    if (!location.pathname.endsWith('/space') || spaceInit || !localStorage.getItem('userId')) return;

    const key = localStorage.getItem('userId');

    // Protection from parachuting
    (function () {
        const validDuration = 3600000 * 24; // 24 hours

        const sessionToken = localStorage.getItem('sessionToken');
        const accessTime = parseInt(localStorage.getItem('accessTime'));

        // Check if session is valid
        if (!(sessionToken && accessTime && (Date.now() - accessTime) < validDuration)) {
            // Invalid session - redirect to landing
            logout();
            return;
        }
    })();

    // Logout function
    function logout() { localStorage.clear(); barba.go('/landing'); }
    document.getElementById('logout-btn')?.addEventListener('click', logout);

    // ============================= THREEJS ==============================

    // Canvas
    const canvas = document.querySelector('#space');

    // Scene
    const scene = new THREE.Scene()
    let object;
    const BLOOM_SCENE = 1;
    const bloomLayer = new THREE.Layers();
    bloomLayer.set(BLOOM_SCENE);
    scene.fog = new THREE.FogExp2(0x000000, 0.006); // tweak color/density

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(60, size.width / size.height, 0.5, 500);
    camera.position.set(-250, 0, 0);
    scene.add(camera);

    // GLTF Loader
    const loader = new GLTFLoader();

    // Points shader  ✅ crisp disc + bright core
    const shaderMaterial = new THREE.ShaderMaterial({
        fog: true,
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.fog,
            {
                uColor: { value: new THREE.Color(0xffffff) },
                uSize: { value: 200.0 }
            }
        ]),
        vertexShader: `
        #include <fog_pars_vertex>
        uniform float uSize;

        void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            float d = max(1.0, -mvPosition.z);
            float sized = clamp(uSize * (1.2 / d), 1.0, 300.0);
            gl_PointSize = sized;
            gl_Position = projectionMatrix * mvPosition;
            #include <fog_vertex>
        }
    `,
        fragmentShader: `
        #include <fog_pars_fragment>
        uniform vec3 uColor;

        void main() {
            vec2 uv = gl_PointCoord - 0.5;
            float r = length(uv);

            float edge = smoothstep(0.49, 0.5, r);
            if (edge >= 1.0) discard;

            float core = 1.0 - smoothstep(0.00, 0.18, r);
            float ring = 1.0 - smoothstep(0.30, 0.49, r);

            vec3 glow = mix(uColor * 0.9, vec3(1.0), core * 0.85);
            float alpha = max(core * 0.9, ring * 0.6) * (1.0 - edge);

            gl_FragColor = vec4(glow, alpha);
            #include <fog_fragment>
        }
    `
    });

    // ========================= MENU CUBES
    let labelRenderer;
    const cubeLabels = [];
    const labelOffset = new THREE.Vector3();
    const labelWorld = new THREE.Vector3();

    const connectorMaterial = new THREE.LineDashedMaterial({
        color: 0xffffff,
        scale: 1,
        dashSize: 1,
        gapSize: 0.5,
    });

    const cubeGeometry = new THREE.BoxGeometry(4, 4, 4);
    cubeGeometry.computeBoundingSphere();
    const cubeBaseRadius = cubeGeometry.boundingSphere?.radius ?? 2;
    const cubeWorldScale = new THREE.Vector3();
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });

    const cubeThesis = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubeWhat = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubeUs = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubePortfolio = new THREE.Mesh(cubeGeometry, cubeMaterial);

    // Raycaster for Interactions
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickableCubes = [cubeThesis, cubeWhat, cubeUs, cubePortfolio];

    // Labels
    const attachLabel = (cube, id, text, offset, anchor = [0, 1]) => {
        const div = Object.assign(document.createElement('div'), { className: 'label', id: id, textContent: text });
        const label = new CSS2DObject(div);
        label.center.set(...anchor);
        scene.add(label);

        if (id === 'menuThesis') {
            div.addEventListener('click', (event) => {
                event.stopPropagation();
                focusOnCube(cubeThesis, thesis);
            });
        }
        if (id === 'menuWhat') {
            div.addEventListener('click', (event) => {
                event.stopPropagation();
                focusOnCube(cubeWhat, what);
            });
        }
        if (id === 'menuUs') {
            div.addEventListener('click', (event) => {
                event.stopPropagation();
                focusOnCube(cubeUs, us);
            });
        }
        if (id === 'menuPortfolio') {
            div.addEventListener('click', (event) => {
                event.stopPropagation();
                focusOnCube(cubePortfolio, portfolio);
            });
        }

        const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
        const line = new THREE.Line(geometry, connectorMaterial);
        cube.add(line);

        cubeLabels.push({
            cube,
            label,
            element: div,
            id,
            line,
            positions: geometry.attributes.position,
            offset: new THREE.Vector3().fromArray(offset)
        });
    };

    attachLabel(cubeThesis, 'menuThesis', 'Our Thesis', [8, 6, 0], [0, 1]);
    attachLabel(cubeWhat, 'menuWhat', 'What We Are (Not)', [8, -6, 0], [0, 0]);
    attachLabel(cubeUs, 'menuUs', 'About Us', [-8, 6, 0], [1, 1]);
    attachLabel(cubePortfolio, 'menuPortfolio', 'Our Portfolio', [-8, -6, 0], [1, 0]);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.id = 'label-container';
    labelRenderer.domElement.style.position = 'absolute';
    labelRenderer.domElement.style.top = '0px';
    document.querySelector('#menu-container').appendChild(labelRenderer.domElement);


    // ===== POINT CLOUD MODEL

    const modelURL = new URL('./cloud.glb', import.meta.url);
    loader.load(
        modelURL.href,
        function (gltf) {
            // Build a clean root with Points using the shared shader
            const root = new THREE.Group();
            gltf.scene.traverse((n) => {
                if (n.isPoints) {
                    const geo = n.geometry.clone();
                    const pts = new THREE.Points(geo, shaderMaterial);
                    pts.position.copy(n.position);
                    pts.rotation.copy(n.rotation);
                    pts.scale.copy(n.scale);
                    root.add(pts);

                    n.material?.dispose?.(); // free original
                }
            });

            // Center once
            const boundingBox = new THREE.Box3().setFromObject(root);
            const center = new THREE.Vector3();
            boundingBox.getCenter(center);
            root.position.sub(center);

            // Wrap in a group for rotation
            object = new THREE.Group();
            object.add(root);

            cubeThesis.position.set(35, 25, -15);
            cubeWhat.position.set(5, 1, 5);
            cubeUs.position.set(-45, 35, 45);
            cubePortfolio.position.set(-45, -25, -35);

            object.add(cubeThesis, cubeWhat, cubeUs, cubePortfolio);
            scene.add(object);
        },
        null,
        function (error) {
            console.error('An error occurred loading the GLB:', error);
        }
    );

    //scene.add(new THREE.AxesHelper(30));

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        alpha: true,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance',
        failIfMajorPerformanceCaveat: true
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;


    // after the renderer/canvas are created
    canvas.addEventListener('click', (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(clickableCubes, false)[0];

        if (hit?.object === cubeThesis) {
            focusOnCube(cubeThesis, thesis);
        }
        if (hit?.object === cubeWhat) {
            focusOnCube(cubeWhat, what);
        }
        if (hit?.object === cubeUs) {
            focusOnCube(cubeUs, us);
        }
        if (hit?.object === cubePortfolio) {
            focusOnCube(cubePortfolio, portfolio);
        }
    });

    canvas.addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hit = raycaster.intersectObjects(clickableCubes, false)[0];

        canvas.classList.toggle('cursor-pointer', !!hit);
    });

    // 🎛️ BLOOM KNOBS - Adjust these values!
    const params = {
        threshold: 0.1,      // 🎛️ 0-1: Lower = more objects bloom
        strength: 0.3,     // 🎛️ 0-3: Bloom intensity
        radius: 0.3,       // 🎛️ 0-1: Bloom spread
        exposure: 2        // 🎛️ 0.1-2: Overall brightness
    };
    renderer.toneMappingExposure = 1.35; // see bloom params below
    renderer.setSize(size.width, size.height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));

    // Render passes
    const renderScene = new RenderPass(scene, camera);

    // Half-res bloom composer
    const bloomComposer = new EffectComposer(renderer);
    const halfW = Math.max(256, size.width >> 1);
    const halfH = Math.max(256, size.height >> 1);
    bloomComposer.renderToScreen = false;
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(halfW, halfH), params.strength, params.radius, params.threshold);
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

    // Shader to mix bloom with scene
    const mixPass = new ShaderPass(
        new THREE.ShaderMaterial({
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture },
                bloomGain: { value: 0.7 }
            },
            vertexShader: `
        varying vec2 vUv;
        void main(){ vUv=uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }
        `,
            fragmentShader: `
        uniform sampler2D baseTexture, bloomTexture;
        uniform float bloomGain;
        varying vec2 vUv;
        void main(){
            vec4 base  = texture2D(baseTexture,  vUv);
            vec4 bloom = texture2D(bloomTexture, vUv) * bloomGain;
            gl_FragColor = min(base + bloom, 1.0);
        }
        `
        }),
        'baseTexture'
    );
    mixPass.needsSwap = true;

    const outputPass = new OutputPass();

    const finalComposer = new EffectComposer(renderer);
    finalComposer.setSize(size.width, size.height);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(mixPass);
    finalComposer.addPass(outputPass);

    // 🎛️ ROTATION SPEED
    const rotationSpeed = 0.0004; // Adjust rotation speed

    // Animation loop
    const clock = new THREE.Clock();
    let ROT_SPEED = 1.8; // deg/sec (tweak)

    let rotateThreeModel = true;

    function tick() {
        const dt = clock.getDelta();
        if (object && rotateThreeModel) {
            object.rotation.y += (ROT_SPEED * Math.PI / 180) * dt;
        }
        cubeLabels.forEach(({ cube, label, line, positions, offset }) => {
            cube.getWorldPosition(labelOffset);
            labelWorld.copy(labelOffset).add(offset);
            label.position.copy(labelWorld);

            const startLocal = cube.worldToLocal(labelOffset.clone());
            const endLocal = cube.worldToLocal(labelWorld.clone());

            positions.setXYZ(0, startLocal.x, startLocal.y, startLocal.z);
            positions.setXYZ(1, endLocal.x, endLocal.y, endLocal.z);
            positions.needsUpdate = true;
            line.computeLineDistances();
        });
        bloomComposer.render();
        finalComposer.render();
        labelRenderer?.render(scene, camera);
    }

    spaceRenderer = renderer;
    spaceTick = tick;

    // Focus on Cube on Click
    let focusTween = null;
    let fovTween = null;
    const focusTarget = new THREE.Vector3();
    const approachDir = new THREE.Vector3();
    const cameraDestination = new THREE.Vector3();
    const faceCenter = new THREE.Vector3();
    const targetQuaternion = new THREE.Quaternion();
    const lookMatrix = new THREE.Matrix4();
    const cubeQuaternion = new THREE.Quaternion();
    const lookPadding = 4;
    const defaultFov = camera.fov;
    const focusFov = 0.1;

    function focusOnCube(cube, onComplete) {
        cube.getWorldPosition(focusTarget);
        cube.getWorldScale(cubeWorldScale);

        const radius = cubeBaseRadius * Math.max(cubeWorldScale.x, cubeWorldScale.y, cubeWorldScale.z) + lookPadding;
        approachDir.copy(camera.position).sub(focusTarget);
        if (approachDir.lengthSq() === 0) {
            approachDir.set(0, 0, 1);
        } else {
            approachDir.normalize();
        }

        cameraDestination.copy(focusTarget).addScaledVector(approachDir, radius);
        faceCenter.copy(focusTarget).addScaledVector(approachDir, cubeBaseRadius);

        lookMatrix.lookAt(cameraDestination, faceCenter, camera.up);
        targetQuaternion.setFromRotationMatrix(lookMatrix);

        focusTween?.kill();
        focusTween = gsap.timeline({
            defaults: { duration: 1.2, ease: 'power2.inOut' },
            onComplete() {
                focusTween = null;
                onComplete?.();
                stopThree();
            }
        });
        focusTween.to(camera.position, {
            x: cameraDestination.x,
            y: cameraDestination.y,
            z: cameraDestination.z
        }, 0);
        focusTween.to(camera.quaternion, {
            x: targetQuaternion.x,
            y: targetQuaternion.y,
            z: targetQuaternion.z,
            w: targetQuaternion.w,
            onUpdate: () => {
                camera.quaternion.normalize();
                camera.updateMatrixWorld();
            }
        }, 0);

        fovTween?.kill();
        fovTween = gsap.to(camera, {
            duration: 1.2,
            ease: 'power2.inOut',
            fov: focusFov,
            onUpdate: () => camera.updateProjectionMatrix()
        });
    }

    //renderer.setAnimationLoop(tick);
    //isRunning = true;

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
    spaceInit = true;

    // =========================== WELCOME & MENU ==========================

    if (localStorage.getItem(key) == 0) {
        // Creating scroller
        const scroller = Object.assign(document.createElement('div'), {
            className: 'scroller'
        });
        document.querySelector('#menu').setAttribute('hidden', '');        

        // Caching Constants

        const logoFill = document.querySelector('#logo-fill');
        const scrollHint = document.querySelector('.scroll-hint')

        return new Promise((resolve) => {
            const root = document.querySelector('[data-barba="container"][data-barba-namespace="space"]');
            if (!root) {
                resolve();
                return;
            }

            const userGreeting = localStorage.getItem('userGreeting');
            const userMessage = localStorage.getItem('userMessage');
            const message = root.querySelector('#user_message');
            const greeting = root.querySelector('#user_greeting');

            message.textContent = '';
            greeting.textContent = '';

            // --- Create Message Block with Character Elements
            {
                let chars = '01';
                let charIndex = 0;
                const message = document.getElementById('user_message');
                message.textContent = '';

                let word = null;
                const fragment = document.createDocumentFragment();

                const makeWord = () => {
                    const span = document.createElement('span');
                    span.className = 'coded-word';
                    fragment.appendChild(span);
                    return span;
                };

                for (const ch of userMessage) {
                    if (ch === '\n') {
                        word = null;
                        fragment.appendChild(document.createElement('br'));
                        continue;
                    }
                    if (ch === ' ') {
                        word = null;
                        fragment.appendChild(document.createTextNode(' '));
                        continue;
                    }

                    if (!word) word = makeWord();

                    const wrap = document.createElement('span');
                    wrap.className = 'coded-char';  // NO 'animate' class yet
                    wrap.style.setProperty('--char-index', charIndex);

                    const encoded = document.createElement('i');
                    encoded.className = 'encoded';
                    encoded.textContent = chars[(Math.random() * chars.length) | 0];

                    const decoded = document.createElement('i');
                    decoded.className = 'decoded';
                    decoded.textContent = ch;

                    wrap.appendChild(encoded);
                    wrap.appendChild(decoded);
                    word.appendChild(wrap);

                    charIndex++;
                }

                message.appendChild(fragment);
                document.querySelector('#user_message').setAttribute('style', '--char-count:' + userMessage.length);
            }

            // Build Cue Animation

            const host = document.querySelector('#welcome .scroll-cue-container');

            const GROW = 1.6;
            const OVERLAP = 1;
            const SPACING = 0.45;

            host._cueLoops?.forEach(({ tl, cue }) => {
                tl.kill();
                cue.remove();
            });

            host._cueLoops = [0, (2 * GROW) - OVERLAP * SPACING].map((offset) => {
                const cue = host.appendChild(Object.assign(document.createElement('div'), { className: 'cue' }));

                const tlCue = gsap.timeline({
                    paused: true,
                    repeat: -1,
                    delay: offset,                     // reapplies each repeat
                    defaults: { ease: 'power2.inOut' }
                })
                    .set(cue, { top: '0%', bottom: '100%' })
                    .to(cue, { bottom: '0%', duration: GROW })
                    .to(cue, { top: '100%', duration: GROW }, `>-${OVERLAP}`)
                    .set(cue, { top: '0%', bottom: '100%' });

                return { cue, tl: tlCue };
            });

            const tl = gsap.timeline({
                defaults: { ease: 'power2.out' },
                onComplete: () => {
                    resolve();
                }
            });

            // Logo fades in
            tl.from(logoFill, {
                scale: 0,
                duration: 1
            }, '+=0.5');

            // --- Typewriter: GREETING
            {
                let last = 0;
                let acc = '';
                const total = userGreeting.length;

                tl.to({ value: 0 }, {
                    value: total,
                    duration: Math.max(0.2, total * 0.1),
                    ease: 'none',
                    onUpdate: function () {
                        const i = Math.floor(this.targets()[0].value);
                        if (i > last) {
                            acc += userGreeting.slice(last, i);
                            if (greeting) greeting.textContent = acc + (i < total ? '_' : '');
                            last = i;
                        }
                    },
                    onComplete: () => { if (greeting) greeting.textContent = userGreeting; }
                });
            }

            // --- Decode Reveal: MESSAGE

            tl.add(() => {
                renderer.setAnimationLoop(tick);
                isRunning = true;
            }, '>');
            tl.to('#user_message .coded-char', {
                className: 'coded-char animated',
                stagger: 0.003,
                duration: userMessage.length * 0.043
            }, '>')

            // Cue Animation

            tl.add(() => { host._cueLoops?.forEach(({ tl }) => tl.play()) }, '>-9');

            tl.from(scrollHint, {
                autoAlpha: 0, duration: 0.5
            }, '>1');
            tl.add(() => menuLayoutThree(localStorage.getItem(key)), '>');
            tl.from(root.querySelector('#space'), {
                autoAlpha: 0, duration: 3
            }, '<-1');

            // After intro timeline completes, set up scroll trigger for menu
            tl.add(() => { // Append Scroller
                document.body.appendChild(scroller);
                appendSegments(2);
                window.scrollTo(0, 0);
                scroller.scrollTop = 0;
                ScrollTrigger.refresh();
            }, '<-3')

            // TIMELINE
            tl.add(() => {
                const menu = root.querySelector('#menu');
                menu.removeAttribute('hidden');
                const items = root.querySelectorAll('.menu-item');
                gsap.set(items, { autoAlpha: 0, yPercent: 100 });


                const scrubTl = gsap.timeline({
                    defaults: { ease: 'power2.out' },
                    scrollTrigger: {
                        trigger: '#segment-2',
                        scroller,
                        start: 'top bottom',
                        end: 'top top',
                        scrub: true,
                        invalidateOnRefresh: true,

                        onLeave(self) {
                            if (scrubTl.data === 'done') return;
                            scrubTl.data = 'done';

                            const welcome = document.querySelector('#welcome');
                            const scrollerEl = document.querySelector('.scroller');
                            self.kill(false);

                            gsap.timeline().add(() => { welcome?.remove(); scrollerEl?.remove(); ScrollTrigger.refresh(); });
                            localStorage.setItem(localStorage.getItem('userId'), 1);
                        }

                    }
                });
                scrubTl.to('#welcome', { autoAlpha: 0, duration: 1 }, 0)
                scrubTl.to(logoFill, { scale: 0, duration: 1 }, 0)
                scrubTl.to({}, { duration: 0.6 })
                scrubTl.to(items, {
                    yPercent: 0, autoAlpha: 1, duration: 1, ease: "power2.out"
                }, '>');
                scrubTl.to(camera.position, {
                    x: 0, y: 0, z: 150, duration: 5, ease: 'power4.inOut'
                }, 0);
                scrubTl.to(camera.rotation, {
                    x: THREE.MathUtils.degToRad(10), duration: 3, ease: 'power4.inOut', onUpdate: () => camera.updateProjectionMatrix()
                }, 0);
            }, '<');
        })
    }

    else {        
        const root = document.querySelector('[data-barba="container"][data-barba-namespace="space"]');
        if (!root) return;

        root.querySelector('#welcome').remove();

        const menu = root.querySelector('#menu');
        const items = root.querySelectorAll('.menu-item');


        menu?.removeAttribute('hidden');
        gsap.set(camera.position, { x: 0, y: 0, z: 150 });
        gsap.set(camera.rotation, {
            x: THREE.MathUtils.degToRad(10),
            onUpdate: () => camera.updateProjectionMatrix()
        });

        gsap.set(items, { autoAlpha: 0, yPercent: 100 });

        const tl = gsap.timeline({
            defaults: { ease: 'power2.out' }
        });

        gsap.set(root.querySelector('#logo-holder'), { autoAlpha: 0 })

        tl.add(() => startThree(), 0);
        tl.to(items, {
            yPercent: 0,
            autoAlpha: 1,
            duration: 1,
            stagger: 0.2,
            ease: "power2.out"
        }, 0);
        tl.add(() => menuLayoutThree(localStorage.getItem(key)), 0);
        tl.from(root.querySelector('#menu-container'), {
            autoAlpha: 0, duration: 1
        }, 0.5);

    };

    // ================================ OUR THESIS ===================================

    function thesis() {
        if (localStorage.getItem(key) < 1) return; // Guard

        // THREE JS FUNCTION
        function createThesisScene(canvas) {
            const params = {
                threshold: 0.0,
                strength: 1.6,
                radius: 1.0,
                exposure: 1.0
            };

            const scene = new THREE.Scene();
            const aspect = canvas.clientWidth / Math.max(1, canvas.clientHeight);
            const camera = new THREE.PerspectiveCamera(
                30,
                aspect,
                0.1,
                200
            );
            camera.position.set(-3, 0, 8);
            camera.layers.enable(1);

            const renderer = new THREE.WebGLRenderer({
                canvas,
                alpha: true,
                antialias: true
            });
            renderer.physicallyCorrectLights = true;
            renderer.toneMapping = THREE.NeutralToneMapping;
            renderer.toneMappingExposure = Math.pow(params.exposure, 4.0);
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
            renderer.setClearColor(0x000000, 0);

            const pmremGenerator = new THREE.PMREMGenerator(renderer);
            const envRT = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
            scene.environment = envRT.texture;

            const BLOOM_SCENE = 1;
            const bloomLayer = new THREE.Layers();
            bloomLayer.set(BLOOM_SCENE);

            const materials = {};
            const darkMaterial = new THREE.MeshBasicMaterial({ color: 0x000000 });

            function darkenNonBloomed(obj) {
                if (obj.isMesh && bloomLayer.test(obj.layers) === false) {
                    materials[obj.uuid] = obj.material;
                    obj.material = darkMaterial;
                }
            }

            function restoreMaterial(obj) {
                if (materials[obj.uuid]) {
                    obj.material = materials[obj.uuid];
                    delete materials[obj.uuid];
                }
            }

            const coreGeometry = new THREE.SphereGeometry(1.5, 64, 64);
            const coreMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0x000000),
                metalness: 0.5,
                roughness: 0.9,
                emissive: new THREE.Color(0x222222),
                emissiveIntensity: 1.2
            });
            const core = new THREE.Mesh(coreGeometry, coreMaterial);
            core.layers.enable(BLOOM_SCENE);
            scene.add(core);

            const orbLight = new THREE.PointLight(0xffffff, 20, 30, 2);
            orbLight.position.set(0, 0, 0);
            orbLight.castShadow = true;
            orbLight.shadow.mapSize.set(1024, 1024);
            orbLight.shadow.bias = -0.0005;
            core.add(orbLight);

            const pointLight = new THREE.PointLight(0xffffff, 2000, 0, 2)
            pointLight.position.set(-5, -16, 2);
            scene.add(pointLight);

            const orangeLight = new THREE.PointLight(0xFF8B07, 500, 0, 3)
            orangeLight.position.set(0, 0, -4);
            scene.add(orangeLight);

            const shellMaterial = new THREE.MeshStandardMaterial({
                color: 0x333333,
                roughness: 1,
                metalness: 1
            });
            const leftShell = new THREE.Mesh(new THREE.SphereGeometry(12, 80, 80), shellMaterial.clone());
            leftShell.position.set(-30, 0, -4);
            scene.add(leftShell);
            const rightShell = new THREE.Mesh(new THREE.SphereGeometry(12, 80, 80), shellMaterial.clone());
            rightShell.position.set(30, 0, -4);
            scene.add(rightShell);

            const renderScene = new RenderPass(scene, camera);

            const bloomRenderTarget = new THREE.WebGLRenderTarget(
                canvas.clientWidth,
                canvas.clientHeight,
                { type: THREE.HalfFloatType }
            );
            const bloomComposer = new EffectComposer(renderer, bloomRenderTarget);
            const bloomPass = new UnrealBloomPass(
                new THREE.Vector2(canvas.clientWidth, canvas.clientHeight),
                params.strength,
                params.radius,
                params.threshold
            );
            bloomComposer.renderToScreen = false;
            bloomComposer.addPass(renderScene);
            bloomComposer.addPass(bloomPass);

            const mixPass = new ShaderPass(
                new THREE.ShaderMaterial({
                    uniforms: {
                        baseTexture: { value: null },
                        bloomTexture: { value: bloomComposer.renderTarget2.texture },
                        bloomStrength: { value: params.strength }
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
            vec4 base = texture2D(baseTexture, vUv);
            vec4 bloom = texture2D(bloomTexture, vUv);
            gl_FragColor = base + bloom;
          }
        `
                }),
                'baseTexture'
            );
            mixPass.needsSwap = true;

            const finalRenderTarget = new THREE.WebGLRenderTarget(
                canvas.clientWidth,
                canvas.clientHeight,
                { type: THREE.HalfFloatType, samples: 4 }
            );
            const finalComposer = new EffectComposer(renderer, finalRenderTarget);
            finalComposer.addPass(renderScene);
            finalComposer.addPass(mixPass);
            finalComposer.addPass(new OutputPass());

            const clock = new THREE.Clock();
            let running = false;

            function resize() {
                const width = canvas.clientWidth;
                const height = Math.max(1, canvas.clientHeight);
                renderer.setSize(width, height, false);
                const aspect = width / height;
                camera.aspect = aspect;
                camera.updateProjectionMatrix();
                bloomComposer.setSize(width, height);
                finalComposer.setSize(width, height);
            }

            window.addEventListener('resize', resize);
            resize();

            function renderFrame() {
                scene.traverse(darkenNonBloomed);
                bloomComposer.render();
                scene.traverse(restoreMaterial);
                finalComposer.render();
            }

            function start() {
                if (running) return;
                running = true;
                clock.start();
                renderer.setAnimationLoop(renderLoop);
            }

            function stop() {
                if (!running) return;
                running = false;
                renderer.setAnimationLoop(null);
            }

            function renderLoop() {
                if (!running) return;
                renderFrame();
            }

            return {
                start,
                stop,
                camera,
                scene,
                renderer,
                objects: { core, leftShell, rightShell, orangeLight },
                dispose() {
                    stop();
                    window.removeEventListener('resize', resize);
                    renderer.dispose();
                    bloomRenderTarget.dispose();
                    finalRenderTarget.dispose();
                    coreGeometry.dispose();
                    [leftShell, rightShell].forEach(mesh => mesh.geometry.dispose());
                    coreMaterial.dispose();
                    shellMaterial.dispose();
                    mixPass.material.dispose();
                    bloomPass.dispose?.();
                    scene.environment = null;
                    envRT.dispose();
                    pmremGenerator.dispose();
                }
            };

        }

        // PAGE
        const page = document.querySelector('#page-thesis');

        // SVGs
        const guidesContainer = Object.assign(document.createElement('div'), {
            className: 'guides-container'
        });

        guidesContainer.innerHTML = `
            <svg class="guide" id="circle-1" width="100%" height="100%" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="0" stroke="white" stroke-dasharray="12 12" vector-effect="non-scaling-stroke"/>
            </svg>
            <svg class="guide" id="circle-2" width="100%" height="100%" viewBox="0 0 300 300" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="0" stroke="white" stroke-dasharray="12 12" vector-effect="non-scaling-stroke"/>
            </svg>
            <i class="guide" id="line"></i>
        `;

        page.appendChild(guidesContainer);
        //

        const btn = page.querySelector('.backBtn');
        btn.textContent = localStorage.getItem(key) == 1 ? 'Continue' : 'Back';

        const thesisCanvas = Object.assign(document.createElement('canvas'), { id: 'thesis-canvas' });
        document.body.appendChild(thesisCanvas);

        const thesis3D = canvas ? createThesisScene(thesisCanvas) : null;

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');

        //creating scroller
        const scroller = Object.assign(document.createElement('div'), {
            className: 'scroller'
        });

        // ============================== TIMELINE

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        // Set initial states
        tl.set('#thesis-title', { fontSize: '8rem', xPercent: 100, autoAlpha: 0, bottom: '2em' });
        tl.set('#page-thesis .section>*', { visibility: 'hidden' });
        tl.set('#circle-1 circle', { autoAlpha: 0 })

        // Definition timeline
        tl.from('#page-thesis', {
            autoAlpha: 0, duration: 1
        }, '<');
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
        }, '<');        
        tl.set('#thesis-section-1 *', { visibility: 'visible' })
        tl.set('#page-thesis #line', { 'transform-origin': '0% 50%' })

        if (localStorage.getItem(key) < 2) {
            {   // Typewriter for "liminal"
                const txt = document.querySelector('#liminal-title');
                if (txt) {
                    const full = txt.textContent;
                    const proxy = { index: 0 };

                    txt.textContent = '';

                    tl.to(proxy, {
                        index: full.length,
                        duration: Math.max(0.2, full.length * 0.08),
                        ease: 'none',
                        onUpdate() {
                            const i = Math.floor(proxy.index);
                            txt.textContent = full.slice(0, i) + (i < full.length ? '_' : '');
                        },
                        onComplete() {
                            txt.textContent = full;
                        }
                    }, '>');
                }
            }
            {   // Typewriter for phonetics
                const txt = document.querySelector('#liminal-phonetic');
                if (txt) {
                    const full = txt.innerHTML;
                    const proxy = { index: 0 };

                    txt.innerHTML = '';

                    tl.to(proxy, {
                        index: full.length,
                        duration: Math.max(0.2, full.length * 0.05),
                        ease: 'none',
                        onUpdate() {
                            const i = Math.floor(proxy.index);
                            txt.innerHTML = full.slice(0, i) + (i < full.length ? '_' : '');
                        },
                        onComplete() {
                            txt.innerHTML = full;
                        }
                    }, '>');
                }
            }
            const defDur = document.querySelector('#liminal-def').textContent.length * 0.05;
            {   // Typewriter for definition
                const txt = document.querySelector('#liminal-def');
                if (txt) {
                    const full = txt.textContent;
                    const proxy = { index: 0 };

                    txt.textContent = '';

                    tl.to(proxy, {
                        index: full.length,
                        duration: defDur,
                        ease: 'none',
                        onUpdate() {
                            const i = Math.floor(proxy.index);
                            txt.textContent = full.slice(0, i) + (i < full.length ? '_' : '');
                        },
                        onComplete() {
                            txt.textContent = full;
                        }
                    }, '+=1');
                }
            }
            tl.from('#page-thesis #line', {
                scaleX: 0, duration: defDur, ease: 'none'
            }, '<');

            tl.from('#liminal-desc', {
                autoAlpha: 0,
                duration: 0.5
            }, '+=1');
            tl.from('.scroll-hint', {
                autoAlpha: 0,
                duration: 0.5
            }, '+=0.5');
        }
        else {
            tl.set(['#liminal-title', '#liminal-phonetic', '#liminal-def', '#liminal-desc', '.scroll-hint'], { autoAlpha: 0 });
            tl.to('#liminal-title', {
                autoAlpha: 1, duration: 0.5
            });
            tl.to('#liminal-phonetic', {
                autoAlpha: 1, duration: 0.5
            }, '-=0.2');
            tl.to('#liminal-def', {
                autoAlpha: 1, duration: 0.5
            }, '-=0.2');
            tl.fromTo('#page-thesis #line', {
                scaleX: 0
            }, { scaleX: 1, duration: 1 }, '<');
            tl.to('#liminal-desc', {
                autoAlpha: 1, duration: 0.5
            }, '-=0.2');
            tl.to('.scroll-hint', {
                autoAlpha: 1, duration: 0.5
            }, '-=0.2');
        }

        tl.add(() => { thesis3D?.start(); }, '>-2');
        tl.from('canvas#thesis-canvas', {
            autoAlpha: 0, duration: 2
        }, '<');
        tl.add(() => { // Append Scroller
            document.body.appendChild(scroller);
            appendSegments(5);
            window.scrollTo(0, 0);
            scroller.scrollTop = 0;
            ScrollTrigger.refresh();
        }, '>')

        // ========== SCROLL TRIGGER

        const cam = thesis3D?.camera;
        const leftShell = thesis3D?.objects?.leftShell;
        const rightShell = thesis3D?.objects?.rightShell;
        const orangeLight = thesis3D?.objects?.orangeLight;

        tl.add(() => { // Our Core Belief timeline       

            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-2',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#page-thesis #line', {
                autoAlpha: 0, duration: 0.1
            }, 0)
            segmentTl.to('#liminal-title', {
                xPercent: -100, autoAlpha: 0
            }, 0);
            segmentTl.to('#liminal-phonetic', {
                xPercent: -100, autoAlpha: 0
            }, '-=0.5');
            segmentTl.to('#liminal-def', {
                xPercent: -100, autoAlpha: 0
            }, '-=0.5');
            segmentTl.to('#liminal-desc', {
                xPercent: -100, autoAlpha: 0
            }, '-=0.5');
            segmentTl.to('#thesis-title', {
                xPercent: 0, autoAlpha: 1
            }, '-=0.5');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(45),
                    ease: 'none',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: 2, y: 2, z: 25,
                    ease: 'none',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
                segmentTl.to(leftShell.position, {
                    x: -13.5, z: 0,
                    ease: 'none'
                }, '<');
                segmentTl.to(rightShell.position, {
                    x: 13.5, z: 0,
                    ease: 'none'
                }, '<');
            }
        });

        tl.add(() => { // Who > What timeline            
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-3',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#thesis-title', {
                fontSize: '2rem', top: '4rem', bottom: 'unset'
            }, 0);
            segmentTl.to('#who-what', {
                xPercent: 0, autoAlpha: 1
            }, '+=0.2');
            segmentTl.to('#who-what-content', {
                autoAlpha: 1
            }, '>');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(235),
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: 5, y: 7, z: 35,
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
                segmentTl.to(leftShell.position, {
                    x: 0, z: -30,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(rightShell.position, {
                    x: 0, z: -60,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight.position, {
                    x: -12, y: -17, z: -30,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight, {
                    intensity: 4000,
                    ease: 'power2.out'
                }, '<');
            }
        });

        tl.add(() => { // Unlocked Potential timeline            
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-4',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#who-what', {
                xPercent: -100, autoAlpha: 0
            }, 0);
            segmentTl.to('#who-what-content', {
                xPercent: -100, autoAlpha: 0
            }, 0);
            segmentTl.to('#unlock-potential', {
                autoAlpha: 1
            }, 0);
            segmentTl.to('#unlock-potential-content', {
                autoAlpha: 1
            }, 0);
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(415),
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: -0.5, y: 0.9, z: 4.5,
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
                segmentTl.to(leftShell.position, {
                    x: 0, z: -200,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(rightShell.position, {
                    x: 0, z: -200,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight, {
                    intensity: 0,
                    ease: 'power2.out'
                }, '<');
            }
        });

        tl.add(() => { // Domains timeline            
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-5',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#unlock-potential', {
                autoAlpha: 0
            });
            segmentTl.to('#unlock-potential-content', {
                autoAlpha: 0
            });
            segmentTl.fromTo('#whitespaces', {
                yPercent: -50, autoAlpha: 0
            }, {
                yPercent: 0, autoAlpha: 1
            });
            segmentTl.fromTo('#whitespaces-content', {
                autoAlpha: 0
            }, {
                autoAlpha: 1, delay: 1
            });
            segmentTl.to('.scroll-hint', {
                autoAlpha: 0
            }, '<');
            segmentTl.to({}, { duration: 5, ease: 'none' }, '>');
            segmentTl.fromTo('.backBtn', {
                autoAlpha: 0, bottom: '2em'
            }, {
                autoAlpha: 1
            }, '>');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(460),
                    ease: 'power4.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: -4, y: 10, z: 40,
                    ease: 'power4.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
            }
        });

        tl.add(() => {
            btn?.addEventListener('click', (e) => back(1, e, thesis3D), { once: true });
        });
    };

    // ============================ WHAT WE ARE

    function what() {
        if (localStorage.getItem(key) < 2) return;
        const page = document.querySelector('#page-what');

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');

        const btn = page.querySelector('.backBtn');
        btn.textContent = localStorage.getItem(key) == 2 ? 'Continue' : 'Back';

        //creating scroller
        const scroller = Object.assign(document.createElement('div'), {
            className: 'scroller'
        });

        // ============================== TIMELINE

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        // Set initial states
        gsap.set('#what-title', { fontSize: '8rem', top: '50%', yPercent: 500, autoAlpha: 0 });
        gsap.set('.section>*', { visibility: 'hidden' });

        // Definition timeline        
        tl.from('#page-what', {
            autoAlpha: 0, duration: 1
        }, '<');
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
            // onComplete: swapScene(); // add your replacement logic here when ready
        }, '<');
        tl.to('#what-title', {
            yPercent: 0, autoAlpha: 1, duration: 1
        }, 0)
        tl.to('.scroll-hint', {
            autoAlpha: 1, duration: 0.5
        }, '>0.2');

        tl.add(() => { // Append Scroller
            document.body.appendChild(scroller);
            appendSegments(5);
            window.scrollTo(0, 0);
            scroller.scrollTop = 0;
            ScrollTrigger.refresh();
        })

        tl.add(() => { // VC timeline
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-2',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#what-title', {
                fontSize: '2rem', top: '4rem'
            }, 0);
            segmentTl.to('#vc', {
                autoAlpha: 1
            }, '>');
            segmentTl.to('#vc-def', {
                autoAlpha: 1
            }, '>');
            segmentTl.to('#vc-content', {
                autoAlpha: 1
            }, '>');
        });
        tl.add(() => { // VS timeline
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-3',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#vc', {
                autoAlpha: 0, xPercent: 10
            });
            segmentTl.fromTo('#vs', {
                autoAlpha: 0, xPercent: -10
            }, {
                autoAlpha: 1, xPercent: 0
            }, '>');
            segmentTl.to('#vc-def', {
                autoAlpha: 0, xPercent: 10
            }, '<');
            segmentTl.fromTo('#vs-def', {
                autoAlpha: 0, xPercent: -10
            }, {
                autoAlpha: 1, xPercent: 0
            }, '>');
            segmentTl.to('#vc-content', {
                autoAlpha: 0, xPercent: 10
            }, '<');
            segmentTl.fromTo('#vs-content', {
                autoAlpha: 0, xPercent: -10
            }, {
                autoAlpha: 1, xPercent: 0
            }, '>');
        });
        tl.add(() => { // Accelerator timeline
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-4',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#vs', {
                autoAlpha: 0, xPercent: 10
            });
            segmentTl.fromTo('#acc', {
                autoAlpha: 0, xPercent: -10
            }, {
                autoAlpha: 1, xPercent: 0
            }, '>');
            segmentTl.to('#vs-def', {
                autoAlpha: 0, xPercent: 10
            }, '<');
            segmentTl.fromTo('#acc-def', {
                autoAlpha: 0, xPercent: -10
            }, {
                autoAlpha: 1, xPercent: 0
            }, '>');
            segmentTl.to('#vs-content', {
                autoAlpha: 0, xPercent: 10
            }, '<');
            segmentTl.fromTo('#acc-content', {
                autoAlpha: 0, xPercent: -10
            }, {
                autoAlpha: 1, xPercent: 0
            }, '>');
        });
        tl.add(() => { // We Are Liminal timeline
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-5',
                    scroller,
                    start: 'top bottom',
                    end: 'top top',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('.scroll-hint', {
                autoAlpha: 0, xPercent: -10, duration: 0.01
            });
            segmentTl.to('#what-title', {
                autoAlpha: 0, xPercent: -10, duration: 0.01
            });
            segmentTl.to('#acc', {
                autoAlpha: 0, xPercent: -10, duration: 0.5
            }, '<');
            segmentTl.to('#acc-def', {
                autoAlpha: 0, xPercent: -10, duration: 0.5
            }, '<');
            segmentTl.to('#acc-content', {
                autoAlpha: 0, xPercent: -10, duration: 0.5
            }, '<');
            segmentTl.add(gsap.to({}, { duration: 2 }, '>'));
            segmentTl.fromTo('#we-are-liminal', {
                autoAlpha: 0, scale: 0
            }, {
                autoAlpha: 1, scale: 1, duration: 0.5
            }, '-=0.5');
            segmentTl.fromTo('#we-are-liminal-content', {
                autoAlpha: 0
            }, {
                autoAlpha: 1
            }, '>');
            segmentTl.fromTo('.backBtn', {
                autoAlpha: 0
            }, {
                autoAlpha: 1
            }, '+=1');
        });
        tl.add(() => {
            btn?.addEventListener('click', (e) => back(2, e), { once: true });
        });

    };

    // =============================== PROFILE

    function us() {
        if (localStorage.getItem(key) < 3) return;
        const page = document.querySelector('#page-profile');

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');

        const btn = page.querySelector('.backBtn');
        btn.textContent = localStorage.getItem(key) == 3 ? 'Continue' : 'Back';

        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        gsap.set('#page-profile', { '--pseudo-opacity': 0 });

        // TIMELINE
        
        tl.from('#page-profile', {
            autoAlpha: 0, duration: 1
        }, '<');
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
        }, '<');

        tl.from('#page-profile>i:nth-child(1)', {
            scaleX: 0, duration: 0.5
        }, '>');
        tl.from('#page-profile>i:nth-child(2)', {
            scaleY: 0, duration: 0.5
        }, '>');
        tl.from('#page-profile>i:nth-child(3)', {
            scaleX: 0, duration: 0.5
        }, '<');
        tl.from('#page-profile>i:nth-child(4)', {
            scaleY: 0, duration: 0.5
        }, '<');
        tl.to('#page-profile', {
            '--pseudo-opacity': 1, duration: 0.5
        }, '>');
        tl.from('#profile-name', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '-=0.5');
        tl.from('#profile-title', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '>');
        tl.from('#profile-desc', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '-=0.25');
        tl.from('#profile-toggle', {
            autoAlpha: 0, duration: 0.2
        }, '-=0.25');
        tl.from('#profile-toggle a', {
            autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'bounce.out'
        }, '-=0.25');
        tl.fromTo('.backBtn', {
            autoAlpha: 0
        }, {
            autoAlpha: 1, duration: 0.5
        }, '+=0.5');

        tl.add(() => {
            btn?.addEventListener('click', (e) => back(3, e), { once: true });
        });

    };

    // ===================== PORTFOLIO

    function portfolio() {
        if (localStorage.getItem(key) < 4) return;
        const page = document.querySelector('#page-portfolio');

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');
        const btn = page.querySelector('.backBtn');

        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        // TIMELINE
        
        tl.from('#page-portfolio', {
            autoAlpha: 0, duration: 1
        }, '<');
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
            // onComplete: swapScene(); // add your replacement logic here when ready
        }, '<');

        tl.from('#page-portfolio>i:nth-child(1)', {
            scaleX: 0, duration: 0.5
        }, '>');
        tl.from('#page-portfolio>i:nth-child(2)', {
            scaleY: 0, duration: 0.5
        }, '>');
        tl.from('#page-portfolio>i:nth-child(3)', {
            scaleY: 0, duration: 0.5
        }, '<');
        tl.from('#portfolio-toggle', {
            autoAlpha: 0, duration: 0.2
        }, '-=0.25');
        tl.from('#portfolio-toggle a', {
            autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'bounce.out'
        }, '-=0.25');
        tl.from('#portfolio-name', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '-=0.5');
        tl.from('#portfolio-desc', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '-=0.25');
        tl.from('.backBtn', {
            autoAlpha: 0, duration: 0.5
        }, '+=0.5');

        tl.add(() => {
            btn?.addEventListener('click', (e) => back(4, e), { once: true });
        });
    };

    // ========== HELPERS

    // Appending Scroll Segment
    function appendSegments(number) {
        const scroller = document.querySelector('.scroller');
        for (let i = 0; i < number; i++)
            scroller.appendChild(Object.assign(document.createElement('div'), {
                className: 'segment', id: `segment-${i + 1}`
            }));
    }

    // Back Button
    function back(ref, e, threeInstance) {
        const page = e.currentTarget.closest('.page');
        const scroller = document.querySelector('.scroller')

        const userId = localStorage.getItem('userId');
        const key = userId;
        const value = Number(localStorage.getItem(key)) || 0;

        if (value === ref) menuLayoutThree(value + 1);
        const lastMenuItem = menu?.querySelector('.menu-item:last-child');

        const instanceCanvas = threeInstance?.renderer?.domElement ?? (threeInstance instanceof HTMLCanvasElement ? threeInstance : null);

        gsap.killTweensOf(camera.position);
        gsap.killTweensOf(camera.quaternion);
        fovTween?.kill();

        gsap.set(camera.position, { x: 0, y: 0, z: 150 });
        gsap.set(camera.rotation, {
            x: THREE.MathUtils.degToRad(10),
            y: 0,
            z: 0,
            onUpdate: () => camera.updateProjectionMatrix()
        });
        camera.fov = defaultFov;
        camera.updateProjectionMatrix();

        const tl = gsap.timeline({
            defaults: { ease: 'power2.out' },
            onComplete() {
                ScrollTrigger.getAll().forEach(st => {
                    const scrollEl = st.scroller || st.vars?.scroller || ScrollTrigger.defaultScroller || window;
                    if (scrollEl === scroller || scroller?.contains(st.trigger)) st.kill();
                });
                gsap.killTweensOf(page);
                gsap.killTweensOf(page.querySelectorAll('*'));
                gsap.set(page.querySelectorAll('*'), { clearProps: 'all' });
                gsap.set(page, { clearProps: 'all' });
                page.hidden = true;
                menu.style.position = '';
                scroller?.remove();
                window.scrollTo(0, 0);
                threeInstance?.stop?.();
                threeInstance?.dispose?.();
                instanceCanvas?.remove?.();

                if (value === ref) { localStorage.setItem(key, value + 1) };
            }
        });

        tl.to(page, {
            autoAlpha: 0, duration: 1
        }, 0);
        if (instanceCanvas) {
            tl.to(instanceCanvas, {
                autoAlpha: 0, duration: 1
            }, '<');
        }
        if (value === ref && lastMenuItem) {
            tl.fromTo(lastMenuItem, {
                opacity: 0, yPercent: 20
            }, {
                opacity: 1, yPercent: 0, duration: 0.6
            }, '>');
        }
        tl.add(() => {
            startThree();
        }, '>')
        tl.to('#space', {
            autoAlpha: 1, duration: 1
        }, '>');

        document.querySelector('.guides-container')?.remove();
    };

    // Conditional Menu
    // function menuLayout(state) {
    //     const menu = document.querySelector('#menu');

    //     // HTML Menu for backup
    //     menu.innerHTML = `
    //         <div class="menu-item" id="menu-thesis">${state < 2 ? 'Start Here' : 'Our Thesis'}</div>
    //         ${state >= 2 ? '<div class="menu-item" id="menu-what">What We Are (Not)</div>' : ''}
    //         ${state >= 3 ? '<div class="menu-item" id="menu-us">About Us</div>' : ''}
    //         ${state >= 4 ? '<div class="menu-item" id="menu-portfolio">Our Portfolio</div>' : ''}`;

    //     document.querySelector('#menu-thesis')?.addEventListener('click', thesis);
    //     document.querySelector('#menu-what')?.addEventListener('click', what);
    //     document.querySelector('#menu-us')?.addEventListener('click', us);
    //     document.querySelector('#menu-portfolio')?.addEventListener('click', portfolio);
    // }

    function menuLayoutThree(state) {
        const getLabel = (id) => cubeLabels.find(entry => entry.id === id)?.element;

        const menuPortfolio = getLabel('menuPortfolio');
        const menuUs = getLabel('menuUs');
        const menuWhat = getLabel('menuWhat');
        const menuThesis = getLabel('menuThesis');

        menuPortfolio?.removeAttribute('hidden');
        menuUs?.removeAttribute('hidden');
        menuWhat?.removeAttribute('hidden');
        menuThesis && (menuThesis.textContent = 'Our Thesis');

        cubeThesis.visible = true;
        cubeWhat.visible = true;
        cubeUs.visible = true;
        cubePortfolio.visible = true;

        if (state < 4) {
            menuPortfolio?.setAttribute('hidden', '');
            cubePortfolio.visible = false;
        }
        if (state < 3) {
            menuUs?.setAttribute('hidden', '');
            cubeUs.visible = false;
        }
        if (state < 2) {
            menuWhat?.setAttribute('hidden', '');
            cubeWhat.visible = false;
            menuThesis && (menuThesis.textContent = 'Start Here');
        }
    }
}


// -----------------------------------------------------
// ANIMATION HELPERS
// -----------------------------------------------------
let landingInit = false, unlockInit = false, spaceInit = false;
let textMatrixControl = null;
const nextFrame = () => new Promise(r => requestAnimationFrame(r));
const pin = el => gsap.set(el, { position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'hidden' });
const unpin = el => gsap.set(el, { clearProps: 'position,inset,width,height,overflow,zIndex' });

// default fallback anims
const defaultLeave = ({ current }) => gsap.to(current.container, { autoAlpha: 0, duration: 0.3, ease: 'power1.out' });
const defaultEnter = ({ next }) => gsap.fromTo(next.container, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: 'power1.out' });


// -----------------------------------------------------
// PAGE TRANSITION ANIMATION TIMELINE
// -----------------------------------------------------


const Page = {
    landing: { // LANDING PAGE ---------------------------
        build: () => { landing(); updateLanding(); },
        // -------------------------------------------------
        once: ({ next }) => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.set(next.container.querySelector('#entrance'), { scaleX: 0, scaleY: 0 });
            tl.set(next.container.querySelector('.window'), { scaleX: 0, scaleY: 0 });
            tl.set(next.container.querySelector('.grid-viewport'), { scale: 0.1 }, 0);
            tl.set(next.container.querySelector('.grid-bg'), {
                '--pt1': '0% 25%',
                '--pt2': '25% 25%',
                '--pt3': '50% 0%',
                '--pt4': '100% 0%',
                '--pt5': '100% 75%',
                '--pt6': '75% 75%',
                '--pt7': '50% 100%',
                '--pt8': '0% 100%'
            }, 0);
            tl.add(() => {
                next.container.querySelector('.loader')?.classList.add('is-active');
                next.container.querySelector('.loader-glow')?.classList.add('is-active');// CSS animation lives on .loader.is-active
            }, '>1');
            tl.to({}, { duration: 2.5 });
            tl.to(next.container.querySelector('.loader'), {
                width: '100%', '--thickness': '25%', ease: 'expo.in', duration: 0.5
            }, '>');
            tl.to(next.container.querySelector('.loader-glow'), {
                '--thickness': '0%', autoAlpha: 0, ease: 'expo.in', duration: 0.5
            }, '<');
            const gridBg = next.container.querySelector('.grid-bg');
            tl.to(gridBg, {
                clipPath: () => {
                    const styles = getComputedStyle(gridBg);

                    const xPx = parseFloat(styles.getPropertyValue('--x')) || 0;
                    const yPx = parseFloat(styles.getPropertyValue('--y')) || 0;

                    const baseW = gridBg.offsetWidth;   // unscaled width
                    const baseH = gridBg.offsetHeight;  // unscaled height

                    const x = (xPx / baseW) * 100;
                    const y = (yPx / baseH) * 100;
                    const toPoints = [
                        [0, y],
                        [x, y],
                        [x + y, 0],
                        [100, 0],
                        [100, 100 - y],
                        [100 - x, 100 - y],
                        [100 - x - y, 100],
                        [0, 100]
                    ];
                    return `polygon(${toPoints.map(([px, py]) => `${px}% ${py}%`).join(',')})`;
                },
                duration: 1,
                ease: 'expo.in'
            }, '>1');
            tl.to(next.container.querySelector('.loader'), {
                '--thickness': '100%', duration: 1, ease: 'power2.in'
            }, '<');
            tl.to(next.container.querySelector('.grid-viewport'), {
                scale: 1, duration: 1, ease: 'power4.in'
            }, '<');
            tl.to(next.container.querySelector('.loader'), {
                autoAlpha: 0, duration: 1
            }, '>-0.1');
            tl.from(next.container.querySelector('#outline'), {
                autoAlpha: 0, duration: 1
            }, '<');
            tl.to(next.container.querySelector('.window'), {
                scaleX: 1, scaleY: 0.001, duration: 0.5
            }, '>');
            tl.to(next.container.querySelector('#entrance'), {
                scaleX: 1, scaleY: 0.001, duration: 0.5
            }, '<');
            tl.to(next.container.querySelector('.window'), {
                scaleY: 1, duration: 0.2
            }, '>');
            tl.to(next.container.querySelector('#entrance'), {
                scaleY: 1, duration: 0.2
            }, '<');
            tl.from(next.container.querySelector('.tagline'), {
                autoAlpha: 0, duration: 1, ease: 'bounce.out'
            }, '>');
            tl.from(next.container.querySelector('.copyright-text'), {
                autoAlpha: 0, duration: 1, ease: 'bounce.out'
            }, '>');
            return tl;
        },
        // -------------------------------------------------
        enter: ({ next }) => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.from(next.container, {
                scale: 1.5, autoAlpha: 0, duration: 0.5
            }, 0);
            return tl;
        },
        // -------------------------------------------------
        leave: ({ current }) => {
            landingInit = false;
            const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });
            tl.to(current.container.querySelectorAll('#entrance, .window'), {
                width: '100vw', height: '100vh', backgroundColor: '#0000', borderColor: '#fff', boxShadow: 'none', duration: 0.5
            }, 0);
            tl.to(current.container.querySelectorAll('#entrance'), {
                borderColor: 'transparent', duration: 0.5
            }, '>');
            tl.to(current.container.querySelectorAll('.tagline, .copyright-text, #outline, #grid-bg'),
                { autoAlpha: 0, duration: 0.5 }, 0);
            tl.to(current.container.querySelector('canvas'), { autoAlpha: 0, duration: 0.4 }, 0);
            return tl;
        }
    },

    unlock: { // UNLOCK PAGE -----------------------------
        build: () => { unlock(); },
        // -------------------------------------------------
        enter: ({ next }) => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.from(next.container.querySelectorAll('.line-vertical'), {
                autoAlpha: 0, left: '50%', duration: 0.4
            }, 0);
            tl.from(next.container.querySelectorAll('.line-horizontal'), {
                autoAlpha: 0, top: '50%', duration: 0.4
            }, '<');
            tl.from(next.container.querySelector('.code'), {
                autoAlpha: 0, duration: 0.3
            }, 0.5);
            tl.from(next.container.querySelector('.button-wrapper'), {
                autoAlpha: 0, duration: 0.3
            }, '>');
            tl.from(next.container.querySelectorAll('.cell'), {
                opacity: 0, duration: 0.5
            }, 1);
            tl.from(next.container.querySelectorAll('.text-line'), {
                opacity: 0, duration: 0.5
            }, '>');
            tl.add(() => { textMatrixControl?.start(); }, '>');
            return tl;
        },
        // -------------------------------------------------
        leave: ({ current }) => {
            unlockInit = false;
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.add(() => { textMatrixControl?.stop(); }, 0);
            tl.to(current.container, {
                autoAlpha: 0, duration: 0.5
            }, 0);
            return tl;
        }
    },

    space: { // MAIN PAGE --------------------------------
        build: () => { space(); },
        // -------------------------------------------------
        enter: ({ next }) => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            return tl;
        },
        // -------------------------------------------------
        leave: ({ current }) => {
            spaceInit = false;
            const tl = gsap.timeline();
            tl.to(current.container, {
                opacity: 0, duration: 0.5, ease: 'power2.in'
            }, 0);
            return tl;
        }
    }
};

// -----------------------------------------------------
// DEBUG PAUSE TOGGLE (press Shift+P)
// -----------------------------------------------------
(() => {
    if (typeof window === 'undefined' || !gsap?.globalTimeline) return;

    let paused = false;
    let scrollState = [];

    const haltScrollTriggers = () => {
        scrollState = ScrollTrigger?.getAll?.() ?? [];
        scrollState.forEach(st => st.disable());
    };

    const resumeScrollTriggers = () => {
        scrollState.forEach(st => st.enable());
        scrollState.length = 0;
        ScrollTrigger?.refresh?.();
    };

    const pauseAll = () => {
        gsap.globalTimeline.pause();
        haltScrollTriggers();
        stopThree?.();
        paused = true;
        console.info('[debug] paused');
    };

    const resumeAll = () => {
        gsap.globalTimeline.resume();
        resumeScrollTriggers();
        startThree?.();
        paused = false;
        console.info('[debug] resumed');
    };

    window.addEventListener('keydown', evt => {
        if (evt.key.toLowerCase() !== 'p' || !evt.shiftKey) return;
        evt.preventDefault();
        paused ? resumeAll() : pauseAll();
    });
})();
