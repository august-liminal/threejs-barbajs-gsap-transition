//==========================
//IMPORT
//==========================

// Three core (CDN)
import * as THREE from 'https://esm.sh/three@0.180.0';

// Three add-ons (same CDN + shared dependency)
import { GLTFLoader } from 'https://esm.sh/three@0.180.0/examples/jsm/loaders/GLTFLoader.js?deps=three@0.180.0';
import { DRACOLoader } from 'https://esm.sh/three@0.180.0/examples/jsm/loaders/DRACOLoader.js?deps=three@0.180.0';
import { EffectComposer } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/EffectComposer.js?deps=three@0.180.0';
import { RenderPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/RenderPass.js?deps=three@0.180.0';
import { ShaderPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/ShaderPass.js?deps=three@0.180.0';
import { UnrealBloomPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/UnrealBloomPass.js?deps=three@0.180.0';
import { OutputPass } from 'https://esm.sh/three@0.180.0/examples/jsm/postprocessing/OutputPass.js?deps=three@0.180.0';
import { RoomEnvironment } from 'https://esm.sh/three@0.180.0/examples/jsm/environments/RoomEnvironment.js?deps=three@0.180.0';
import { CSS2DRenderer, CSS2DObject } from 'https://esm.sh/three@0.180.0/examples/jsm/renderers/CSS2DRenderer.js?deps=three@0.180.0';
import { HorizontalBlurShader } from 'https://esm.sh/three@0.180.0/examples/jsm/shaders/HorizontalBlurShader.js?deps=three@0.180.0';
import { VerticalBlurShader } from 'https://esm.sh/three@0.180.0/examples/jsm/shaders/VerticalBlurShader.js?deps=three@0.180.0';
import { OrbitControls } from 'https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js?deps=three@0.180.0';

// GSAP
import { gsap } from 'https://esm.sh/gsap@3.13.0?target=es2020';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.13.0/ScrollTrigger?target=es2020&external=gsap';
import { ScrambleTextPlugin } from 'https://esm.sh/gsap@3.13.0/ScrambleTextPlugin?target=es2020&external=gsap';
import { SplitText } from 'https://esm.sh/gsap@3.13.0/SplitText?target=es2020&external=gsap';
gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, SplitText);
ScrollTrigger.normalizeScroll({
    allowNestedScroll: true, 
    type: "touch,wheel"
});

const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

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

// ==========================================================
// ====================== DETECT DEVICE =====================
// ==========================================================

let phonePortrait;
function detectDevice() {
    const ua = navigator.userAgent || '';
    const isTablet = /iPad|Tablet|Nexus 7|Nexus 9|SM-T|Tab|Kindle|Silk|PlayBook/.test(ua) ||
        (/Android/.test(ua) && !/Mobile/.test(ua));
    const isPhone = /iPhone|Android.+Mobile|Windows Phone|BlackBerry|BB10|Mobi/i.test(ua);

    const coarse = matchMedia('(pointer: coarse)').matches;
    const width = Math.min(screen.width, screen.height);
    const uaMobileHint = navigator.userAgentData?.mobile === true;

    let type;
    if (isPhone || uaMobileHint || (coarse && width < 768)) type = 'phone';
    else if (isTablet || (coarse && width >= 768 && width < 1100)) type = 'tablet';
    else type = 'desktop';

    const orientation = matchMedia('(orientation: portrait)').matches ? 'portrait' : 'landscape';

    window.deviceInfo = { type, orientation };

    phonePortrait = window.deviceInfo?.type === 'phone' && window.deviceInfo?.orientation === 'portrait';
};
detectDevice();
window.addEventListener('resize', detectDevice, { passive: true });


// =======================================================================
// ====================== RESPONSIVE STYLE INJECTION =====================
// =======================================================================
if (phonePortrait && !document.getElementById('phone-portrait-styles')) {
    const style = Object.assign(document.createElement('style'), {
        id: 'phone-portrait-styles',
        textContent: `
            :root { font-size: 14px; --safe-top: env(safe-area-inset-top, 0px); --safe-bottom: env(safe-area-inset-bottom, 0px); }
            body { height: 100dvh; box-sizing: border-box; }
            

            .text-line { font-size: 1rem; text-align: center; inset: -1.5rem 0px auto; }
            .welcome { top: 50%;}
            #submit-btn {font-size: 1rem; }

            main[data-barba-namespace="space"] {height: 0}
            #liminalspace section { padding: 4rem 1.25rem; }
            .section { padding: 1.25rem; }
            #liminalspace #logo-holder { inset: 4rem 1.25rem; width: 3rem; height: 3rem; }
            .text-4xl { font-size: 3rem; line-height: 1.1; }
            .text-xl { font-size: 2.25rem; line-height: 1.5; }
            .text-lg { font-size: 1.5rem; }
            #welcome h1 { height: 1.25em; }
            #welcome .scroll-hint { margin: 0;l }

            #who-what { height: 6rem; margin-bottom: 1rem; }

            #page-what>.section-container { pointer-event: none; }
            #page-what>.section-container i { display: none; }
            #page-what>.section-container .section { position: absolute; }
            #vc, #vs, #acc { margin-top: 32dvh }
            #vc-def, #vs-def, #acc-def { flex: 0; margin-bottom: 1em; }

            #what-section-4>div { flex: 0; }
            .liminal-svg { width: 40vw; }
            #we-are-liminal-content { margin-top: 2rem; }
            #what-section-4 .backBtn { bottom: 1.25rem; }
            #page-what .scroll-hint { bottom: 1.25rem; }

            .page#page-profile { grid-template-columns: 1.25rem minmax(0, 1fr) minmax(0, 7fr) 1.25rem; 
                grid-template-rows: 1.25rem minmax(0, 5fr) minmax(0, 1fr) minmax(0, 6fr) 1.25rem; }
            #page-profile>i:nth-child(1) { grid-area: 2 / 1 / 5 / 6; }
            #page-profile>i:nth-child(2) { grid-area: 1 / 2 / 6 / 4; }
            #profile-portrait-container { grid-area: 2 / 3 / 2 / 3; border-width: 0; }
            #profile-back-btn { grid-area: 2 / 2 / 2 / 2; }
            #profile-back-btn .backBtn { width: 100%; inset: 0; padding: 0.75rem; aspect-ratio: 1; border-bottom: 1px solid #fff4}
            #profile-back-btn .backBtn::before { display: block; }
            #profile-name { grid-area: 2 / 3 / 2 / 3; font-size: 2rem; line-height: 1; text-shadow: 0 0 1px #000, 0 0 4px #000, 0 0 16px #000; background: linear-gradient(to top, #0008, transparent 6rem); z-index: -1; }
            #profile-name span { padding: 0.75rem 1.25rem; }
            #profile-title { grid-area: 3 / 3 / 3 / 3; font-size: 1rem; line-height: 1; }
            #profile-desc { grid-area: 4 / 3 / 4 / 3; }
            #profile-desc>span { overflow: scroll; }
            #profile-toggle { grid-area: 2 / 2 / 5 / 2; padding-top: calc(100% + 1em); }
            #profile-toggle a { padding: 0.5rem}
            #profile-toggle a span { display: none; }
            #profile-toggle a::before { display: block; }
            #profile-toggle a[current]::before { opacity: 1; filter: drop-shadow(0 0 1px #fff); }
            #profile-toggle>a::after { width: 1px; }
            #profile-desc::before { inset: -0.725rem -0.725rem auto auto; }
            #profile-desc::after { inset: auto -0.725rem -0.725rem auto; }
            #profile-name::before { display: none } 
            #profile-portrait-container::after {}

            #profile-desc>span, #profile-name>span, #profile-title>span { padding: 1.25rem }

            .page#page-portfolio { grid-template-columns: 1.25rem minmax(0, 1fr) minmax(0, 7fr) 1.25rem; grid-template-rows: 1.25rem minmax(0, 4fr) minmax(0, 8fr) 1.25rem; }
            #page-portfolio>i:nth-child(1) { grid-area: 2 / 1 / 4 / 6; }
            #page-portfolio>i:nth-child(2) { grid-area: 1 / 2 / 5 / 4; }
            #page-portfolio>i:nth-child(3) { display: none; }
            #portfolio-name { display: none; }
            #portfolio-icon-container { grid-area: 2 / 3 / 2 / 3; border-width: 0 0 1px 0 }
            #portfolio-back-btn { grid-area: 2 / 2 / 2 / 2; }
            #portfolio-back-btn .backBtn { width: 100%; inset: 0; padding: 0.75rem; aspect-ratio: 1; border-bottom: 1px solid #fff4}
            #portfolio-back-btn .backBtn::before { display: block; }
            #portfolio-desc { grid-area: 3 / 3 / 3 / 3; padding: 1.25rem; }
            #portfolio-toggle { border-width: 0 1px 0 0; padding-top: calc(100% + 1em); }
            #portfolio-toggle a { padding: 0.5rem}
            #portfolio-toggle a span { display: none; }
            #portfolio-toggle a::before { display: block; }
            #portfolio-toggle a[current]::before { opacity: 1; filter: drop-shadow(0 0 1px #fff4); }
            #portfolio-toggle>a::after { width: 1px; }


            

        `
    });
    document.head.append(style);
    const unlockPotential = document.querySelector('#unlock-potential');
    if (unlockPotential) {
        unlockPotential.innerHTML = "Runway <br>+ Activation <br>+ Agency <br>= The ultimate <span style='white-space:nowrap'>co-founder</span>";
    }
}

// ================================================================
// ====================== LANDING PAGE LAYOUT =====================
// ================================================================


let gridDimension, gridSize, cellSize, x, y, deltaW, deltaH;

function landing() {
    if (!location.pathname.endsWith('/landing') || landingInit) return;
    Object.assign(document.documentElement.style, {
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden'
    });

    function landingLayout() {
        //===== DECLARATIONS
        // Grid dimension in pixel
        gridDimension = Math.max(window.innerHeight, window.innerWidth) - (phonePortrait ? 50 : 0)
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
    loader.setDRACOLoader(dracoLoader);
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

    const updatePointer = (e) => {
        const p = e.touches?.[0] || e;
        if (!p) return;
        const now = Date.now();
        if (now - lastMouseUpdate > MOUSE_UPDATE_INTERVAL) {
            mouseX = p.clientX;
            mouseY = p.clientY;
            lastMouseUpdate = now;
        }
    };

    document.addEventListener('mousemove', updatePointer, { passive: true });
    document.addEventListener('touchstart', updatePointer, { passive: true });
    document.addEventListener('touchmove', updatePointer, { passive: true });

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
    const API_URL = 'https://website-auth-sage.vercel.app/api/validate-code';
    let paddingX, paddingY;

    // --- viewport helper for mobile url bar/visual viewport
    const getViewportHeight = () => (window.visualViewport?.height || window.innerHeight);
    const setVhVar = () => {
        const vh = getViewportHeight() * 0.01;
        document.documentElement.style.setProperty('--vh', `${vh}px`);
    };
    setVhVar();
    window.visualViewport?.addEventListener('resize', setVhVar);
    window.addEventListener('resize', setVhVar);

    // ---- ELEMENTS
    const t = document.querySelector('#unlock-title');
    const unlockModule = document.querySelector('#unlock-module');
    const inner = document.querySelector('#unlock-module-inner');
    const container = unlockModule?.parentNode;

    // Force container to use visual viewport height if available
    if (container) {
        Object.assign(container.style, {
            width: '100vw',
            height: 'calc(var(--vh, 1vh) * 100)',
            overflow: 'hidden'
        });
    }


    // ----- GRID SETUP

    unlockModule.style.display = 'grid';
    unlockModule.style.gap = '0';

    // ---- TYPOGRAPHY / GRID SIZING
    if (t?.style.lineHeight) t.style.removeProperty('line-height');

    const mincellSize = Math.max(24, 0.5 * parseFloat(getComputedStyle(t).fontSize));
    let dimensionH, dimensionW, cellSize, innerH, innerW, cells, total, codeOffsetX, codeOffsetY, moduleOffsetX, moduleOffsetY;
    let centersX, centersY, jitter, lastChar;

    function unlockGrid() {
        unlockModule.querySelectorAll('.cell').forEach(el => el.remove()); // clear previous cells if re-running    
        const viewportH = getViewportHeight();
        dimensionH = Math.max(12, Math.floor(viewportH / mincellSize / 2) * 2);
        dimensionW = Math.max(12, Math.floor(window.innerWidth / mincellSize / 2) * 2);
        cellSize = viewportH / dimensionH;

        inner?.style.setProperty('--cell-size', `${cellSize}px`);
        t.style.lineHeight = (cellSize * 2) + 'px';

        innerH = dimensionH - (phonePortrait ? 4 : 8);
        innerW = dimensionW - (phonePortrait ? 2 : 4);
        total = innerH * innerW;

        // ---- GRID CALCULATION
        document.querySelector('.code')?.style && (document.querySelector('.code').style.top = (innerH / 2 - 1) * cellSize + 'px');


        unlockModule.style.gridTemplateColumns = `repeat(${innerW}, ${cellSize}px)`;
        unlockModule.style.gridAutoRows = `${cellSize}px`;

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

        paddingY = (getViewportHeight() - innerH * cellSize) / 2;
        paddingX = (window.innerWidth - innerW * cellSize) / 2;
        container.style.padding = `${paddingY}px ${paddingX}px`;

        codeOffsetX = window.innerWidth / 2 - document.querySelector('.code').clientWidth / 2;
        codeOffsetY = getViewportHeight() / 2 - document.querySelector('.code').clientHeight / 2;
        moduleOffsetX = window.innerWidth / 2 - document.querySelector('#unlock-module').clientWidth / 2;
        moduleOffsetY = getViewportHeight() / 2 - document.querySelector('#unlock-module').clientHeight / 2

        if (unlockInit) {
            const code = document.querySelector('.code')
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
    if (!phonePortrait) container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `left:${codeOffsetX}px;` }));
    if (!phonePortrait) container.append(Object.assign(document.createElement('div'), { className: 'line-dashed line-vertical', style: `right:${codeOffsetX}px;` }));
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
    const focusFirstEmptyBefore = (idx) => {
        for (let j = 0; j <= idx; j++) {
            if (!inputs[j].value) {
                if (j !== idx) inputs[j].focus();
                return j !== idx;
            }
        }
        return false;
    };
    inputs.forEach((input, i) => {
        input.addEventListener('focus', () => {
            focusFirstEmptyBefore(i);
        });
        input.addEventListener('input', () => {
            if (!input.value) return;
            if (focusFirstEmptyBefore(i)) return; // don't advance if earlier empty
            if (i < inputs.length - 1) inputs[i + 1].focus();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
            if (e.key === 'Enter') {
                e.preventDefault();
                validateCode();
            }
            // If previous empty, redirect focus there (allow typing in current if it's the first empty)
            if (focusFirstEmptyBefore(i)) e.preventDefault();
        });
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
                message.innerHTML = `<span class="welcome">Crossing the chasm...</span>`;

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
                message.innerHTML = '<span class="warning-message">Invalid code.</span>';
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
    if (!location.pathname.endsWith('/space') || spaceInit) return;

    const key = localStorage.getItem('userId');

    // Protection from parachuting
    (function () {
        const validDuration = 3600000 * 24; // 24 hours

        const sessionToken = localStorage.getItem('sessionToken');
        const accessTime = parseInt(localStorage.getItem('accessTime'));

        // Check if session is valid
        if (!(key && sessionToken && accessTime && (Date.now() - accessTime) < validDuration)) {
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

    const FOG_DENSITY = 0.008;
    scene.fog = new THREE.FogExp2(0x000000, FOG_DENSITY); // tweak color/density

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(60, size.width / size.height, 0.5, 1000);
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
    cubeMaterial.fog = false;

    const cubeThesis = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubeWhat = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubeUs = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubePortfolio = new THREE.Mesh(cubeGeometry, cubeMaterial);

    // Raycaster for Interactions
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const clickableCubes = [cubeThesis, cubeWhat, cubeUs, cubePortfolio];
    let hoveredCube = null;

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

        const labelEntry = {
            cube,
            label,
            element: div,
            id,
            line,
            positions: geometry.attributes.position,
            offset: new THREE.Vector3().fromArray(offset),
            hoverSources: { cube: false, label: false }
        };
        cubeLabels.push(labelEntry);

        div.addEventListener('pointerenter', () => {
            setLabelHoverState(cube, true, 'label');
        });
        div.addEventListener('pointerleave', () => {
            setLabelHoverState(cube, false, 'label');
        });
    };

    attachLabel(cubeThesis, 'menuThesis', 'DNA', [8, 6, 0], [0, 1]);
    attachLabel(cubeWhat, 'menuWhat', 'Antithesis', [8, -6, 0], [0, 0]);
    attachLabel(cubeUs, 'menuUs', 'Leadership', [-8, 6, 0], [1, 1]);
    attachLabel(cubePortfolio, 'menuPortfolio', 'Portfolio', [-8, -6, 0], [1, 0]);

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

            if (phonePortrait) {
                const layoutScale = Math.min(window.innerWidth / 375, 1.5);
                const screenRatio = window.innerHeight / window.innerWidth / 2.2;
                cubeThesis.position.set(-10 * layoutScale, 75 * screenRatio, 10 * layoutScale);
                cubeWhat.position.set(-15 * layoutScale, 5 * screenRatio, 0 * layoutScale);
                cubeUs.position.set(5 * layoutScale, 25 * screenRatio, 20 * layoutScale);
                cubePortfolio.position.set(10 * layoutScale, -20 * screenRatio, 20 * layoutScale);
            }
            else {
                const layoutScale = Math.min(window.innerWidth / 1600, 2);
                cubeThesis.position.set(35 * layoutScale, 55, -15 * layoutScale);
                cubeWhat.position.set(5 * layoutScale, 15, 5 * layoutScale);
                cubeUs.position.set(-45 * layoutScale, 45, 45 * layoutScale);
                cubePortfolio.position.set(-45 * layoutScale, -10, -35 * layoutScale);
            }

            object.add(cubeThesis, cubeWhat, cubeUs, cubePortfolio);
            scene.add(object);
        },
        null,
        function (error) {
            console.error('An error occurred loading the GLB:', error);
        }
    );


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

    function setLabelHoverState(cube, isHover, source = 'cube') {
        const labelEntry = cubeLabels.find(entry => entry.cube === cube);
        if (!labelEntry) return;
        labelEntry.hoverSources[source] = isHover;
        const active = labelEntry.hoverSources.cube || labelEntry.hoverSources.label;
        labelEntry.element.classList.toggle('hovered', active);
    }

    canvas.addEventListener('pointermove', (event) => {
        pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
        pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

        raycaster.setFromCamera(pointer, camera);
        const hitCube = raycaster.intersectObjects(clickableCubes, false)[0]?.object ?? null;

        if (hitCube !== hoveredCube) {
            if (hoveredCube) setLabelHoverState(hoveredCube, false);
            if (hitCube) setLabelHoverState(hitCube, true);
            hoveredCube = hitCube;
        }

        canvas.classList.toggle('cursor-pointer', !!hitCube);
    });

    canvas.addEventListener('pointerleave', () => {
        if (hoveredCube) {
            setLabelHoverState(hoveredCube, false);
            hoveredCube = null;
        }
        canvas.classList.remove('cursor-pointer');
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
    const lookPadding = 4;
    const defaultFov = camera.fov;
    const focusFov = 0.1;

    function focusOnCube(cube, onComplete) {
        const allCubes = [cubeThesis, cubeWhat, cubeUs, cubePortfolio];
        allCubes.forEach(c => {
            if (!c.material.userData?.isCloned) {
                c.material = c.material.clone();
                c.material.transparent = true;
                c.material.userData.isCloned = true;
            }
            const opacityTarget = c === cube ? 1 : 0;
            gsap.to(c.material, { duration: 0.5, opacity: opacityTarget, ease: 'power2.out' });
        });
        cubeLabels.forEach(({ element, line }) => {
            gsap.to(element, { duration: 0.5, opacity: 0, ease: 'power2.out' });
            if (line?.material) {
                line.material.transparent = true;
                gsap.to(line.material, { duration: 1, opacity: 0, ease: 'power2.out' });
            }
        });
        if (scene.fog) {
            const fogProxy = { value: scene.fog.density };
            gsap.to(fogProxy, {
                duration: 2,
                value: 0.05,
                onUpdate: () => { scene.fog.density = fogProxy.value; }
            });
        }

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
        document.getElementById('label-container')?.style?.setProperty('z-index', '-999');
    }

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
        labelRenderer?.setSize(size.width, size.height);
    });

    document.documentElement.style.visibility = 'visible';
    spaceInit = true;

    // =========================== WELCOME & MENU ==========================

    if (localStorage.getItem(key) == 0) {
        // Creating scroller
        const scroller = Object.assign(document.createElement('div'), {
            className: 'scroller'
        });
        scroller.style.scrollSnapType = 'unset';
        
        

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
            const originalUserMessage = userMessage;
            const message = root.querySelector('#user_message');
            const greeting = root.querySelector('#user_greeting');
            greeting.dataset.text = userGreeting;

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

            if (phonePortrait) {
                // --- Simple Reveal: MESSAGE for phone
                tl.add(() => {
                    renderer.setAnimationLoop(tick);
                    isRunning = true;
                }, '>');
                const msg = document.querySelector('#user_message');
                if (msg) {
                    msg.innerHTML = (originalUserMessage || '').replace(/\n/g, '<br>');
                    const split = new SplitText(msg, { type: 'lines' });
                    const lines = split.lines;
                    tl.from(lines.length ? lines : ['#user_message'], {
                        autoAlpha: 0,
                        duration: 0.3,
                        ease: 'bounce.out',
                        stagger: 0.1
                    }, '>');
                }
                tl.add(() => { host._cueLoops?.forEach(({ tl }) => tl.play()) }, '>');
                tl.from(scrollHint, { autoAlpha: 0, duration: 0.5 }, '>');
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
                }, '<-2')
            } else {
                // --- Decode Reveal: MESSAGE
                tl.add(() => {
                    renderer.setAnimationLoop(tick);
                    isRunning = true;
                }, '>');
                tl.to('#user_message .coded-char', {
                    className: 'coded-char animated',
                    stagger: 0.002,
                    duration: userMessage.length * 0.022
                }, '>');
                tl.add(() => { host._cueLoops?.forEach(({ tl }) => tl.play()) }, '>');
                tl.from(scrollHint, {
                    autoAlpha: 0, duration: 0.5
                }, '>');
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
                }, '<-2')
            }            

            // TIMELINE
            tl.add(() => {

                const scrubTl = gsap.timeline({
                    defaults: { ease: 'power2.out' },
                    scrollTrigger: {
                        trigger: '#segment-2',
                        scroller,
                        start: 'top bottom',
                        end: 'bottom bottom',
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

        gsap.set(camera.position, { x: 0, y: 0, z: 150 });
        gsap.set(camera.rotation, {
            x: THREE.MathUtils.degToRad(10),
            onUpdate: () => camera.updateProjectionMatrix()
        });

        const tl = gsap.timeline({
            defaults: { ease: 'power2.out' }
        });

        gsap.set(root.querySelector('#logo-holder'), { autoAlpha: 0 })

        tl.add(() => startThree(), 0);
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

            const orbLight = new THREE.PointLight(0xffffff, 50, 0, 2);
            orbLight.position.set(0, 0, 0);
            orbLight.castShadow = true;
            orbLight.shadow.mapSize.set(1024, 1024);
            orbLight.shadow.bias = -0.0005;
            core.add(orbLight);

            const pointLight = new THREE.PointLight(0xffffff, 100000, 0, 2)
            pointLight.position.set(-5, -50, 40);
            scene.add(pointLight);

            const orangeLight = new THREE.PointLight(0xFF8B07, 300, 0, 3)
            orangeLight.position.set(0, 0, -4);
            scene.add(orangeLight);

            const normalMap = new THREE.TextureLoader().load(new URL('./textures/sphereNormal.jpg', import.meta.url));
            const roughnessMap = new THREE.TextureLoader().load(new URL('./textures/sphereRoughness.jpg', import.meta.url));

            const coneGeometry = new THREE.ConeGeometry(1.4, 3, 64);
            const coneMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0x222222),
                metalness: 0.85,
                roughness: 0.55,
                normalMap: normalMap,
                roughnessMap: roughnessMap,
                transparent: true,
                opacity: 0
            });
            const cone = new THREE.Mesh(coneGeometry, coneMaterial);
            cone.castShadow = true;
            cone.receiveShadow = true;
            cone.position.set(-1, 8, 10);
            cone.rotation.set(
                THREE.MathUtils.degToRad(0),
                THREE.MathUtils.degToRad(90),
                THREE.MathUtils.degToRad(90)
            );

            const cylinderGeometry = new THREE.CylinderGeometry(1.4, 1.4, 3, 64);
            const cylinderMaterial = coneMaterial.clone();
            cylinderMaterial.color = new THREE.Color(0x222222);
            const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
            cylinder.castShadow = true;
            cylinder.receiveShadow = true;
            cylinder.position.set(-1, 16, 10);
            cylinder.rotation.set(
                THREE.MathUtils.degToRad(5),
                THREE.MathUtils.degToRad(90),
                THREE.MathUtils.degToRad(90)
            );
            scene.add(cone, cylinder);

            const coneOverlay = core.clone();
            coneOverlay.material = core.material.clone();
            coneOverlay.material.transparent = true;
            coneOverlay.material.opacity = 0;
            coneOverlay.position.set(0, 8, 0);
            scene.add(coneOverlay);

            const cylinderOverlay = core.clone();
            cylinderOverlay.material = cylinderOverlay.material.clone();
            cylinderOverlay.material.transparent = true;
            cylinderOverlay.material.opacity = 0;
            cylinderOverlay.position.set(0, 16, 0);
            scene.add(cylinderOverlay);

            const shellGeometry = new THREE.SphereGeometry(12, 80, 80);

            shellGeometry.computeTangents?.();
            const shellMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0x111111),
                roughness: 0.95,
                metalness: 1,
                normalMap: normalMap,
                roughnessMap: roughnessMap
            });
            const leftShell = new THREE.Mesh(shellGeometry.clone(), shellMaterial.clone());
            leftShell.position.set(-30, 0, -4);
            scene.add(leftShell);
            const rightShell = new THREE.Mesh(shellGeometry.clone(), shellMaterial.clone());
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

            // scene.add(new THREE.AxesHelper(10));

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
                objects: { core, leftShell, rightShell, orangeLight, pointLight, cone, cylinder, coneOverlay, cylinderOverlay },
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
                    coneGeometry.dispose();
                    coneMaterial.dispose();
                    cylinderGeometry.dispose();
                    cylinderMaterial.dispose();
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
            <svg class="guide" id="circle-1" width="100%" height="100%" viewBox="0 0 ${window.innerWidth} ${window.innerHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="0" stroke="white" stroke-dasharray="12 12" vector-effect="non-scaling-stroke"/>
            </svg>
            <svg class="guide" id="circle-2" width="100%" height="100%" viewBox="0 0 ${window.innerWidth} ${window.innerHeight}" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="150" cy="150" r="0" stroke="white" stroke-dasharray="12 12" vector-effect="non-scaling-stroke"/>
            </svg>
            <i class="guide" id="line"></i>
        `;
        const circle1 = guidesContainer.querySelector('#circle-1 circle');
        const circle2 = guidesContainer.querySelector('#circle-2 circle');

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
        tl.set('#thesis-title', { fontSize: phonePortrait ? '4rem' : '8rem', xPercent: 100, autoAlpha: 0, bottom: '2em' });
        tl.set('#page-thesis .section>*', { visibility: 'hidden' });

        // Definition timeline
        tl.from('#page-thesis', {
            autoAlpha: 0, duration: 1
        }, 0);
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
        }, 0);
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
                        duration: Math.max(0.2, full.length * 0.04),
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
            const defDur = document.querySelector('#liminal-def').textContent.length * 0.02;
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
            tl.set(['#liminal-title', '#liminal-phonetic', '#liminal-def', '#liminal-desc', '.scroll-hint'], { autoAlpha: 0 }, 0);
            tl.to('#liminal-title', {
                autoAlpha: 1, duration: 0.5
            }, '>');
            tl.to('#liminal-phonetic', {
                autoAlpha: 1, duration: 0.2
            }, '-=0.2');
            tl.to('#liminal-def', {
                autoAlpha: 1, duration: 0.3
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
        const cone = thesis3D?.objects?.cone;
        const cylinder = thesis3D?.objects?.cylinder;
        const coneOverlay = thesis3D?.objects?.coneOverlay;
        const cylinderOverlay = thesis3D?.objects?.cylinderOverlay;

        tl.add(() => { // Our Core Belief timeline       

            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-2',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
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
                bottom: '1em', xPercent: 0, autoAlpha: 1
            }, '-=0.5');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(45),
                    ease: 'none',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam, {
                    fov: 10
                }, '<');
                segmentTl.to(cam.position, {
                    x: 2, y: 2, z: 70,
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

                const circleTargets = {
                    circle1: { cx: 0, cy: 0, r: 0 },
                    circle2: { cx: 0, cy: 0, r: 0 }
                };
                let circleSetup = false;
                const tempCenter = new THREE.Vector3();
                const tempEdge = new THREE.Vector3();
                const tempClip = new THREE.Vector3();
                const tempScale = new THREE.Vector3();
                segmentTl.add(() => {
                    if (circleSetup) return;
                    const rect = thesisCanvas.getBoundingClientRect();
                    const viewWidth = window.innerWidth;
                    const viewHeight = window.innerHeight;
                    const pairs = [
                        { mesh: rightShell, circle: circle2, key: 'circle2' },
                        { mesh: leftShell, circle: circle1, key: 'circle1' }
                    ];

                    pairs.forEach(({ mesh, circle, key }) => {
                        if (!mesh || !circle) return;
                        mesh.updateWorldMatrix(true, false);

                        if (!mesh.geometry.boundingSphere) {
                            mesh.geometry.computeBoundingSphere();
                        }
                        const sphere = mesh.geometry.boundingSphere;
                        tempCenter.copy(sphere.center);
                        mesh.localToWorld(tempCenter);
                        tempClip.copy(tempCenter).project(cam);
                        const cx = (tempClip.x * 0.5 + 0.5) * viewWidth;
                        const cy = (-tempClip.y * 0.5 + 0.5) * viewHeight;

                        mesh.getWorldScale(tempScale);
                        const scaledRadius = sphere.radius * Math.max(tempScale.x, tempScale.y, tempScale.z);
                        tempEdge.set(scaledRadius, 0, 0).add(sphere.center);
                        mesh.localToWorld(tempEdge);
                        tempClip.copy(tempEdge).project(cam);
                        const ex = (tempClip.x * 0.5 + 0.5) * viewWidth;
                        const ey = (-tempClip.y * 0.5 + 0.5) * viewHeight;
                        const screenRadius = Math.hypot(ex - cx, ey - cy);

                        circleTargets[key].cx = cx;
                        circleTargets[key].cy = cy;
                        circleTargets[key].r = screenRadius;
                        circle.setAttribute('cx', cx);
                        circle.setAttribute('cy', cy);
                    });
                    circleSetup = true;
                }, '>');

                // segmentTl.fromTo(circle2, {
                //     autoAlpha: 0,
                //     attr: {
                //         cx: () => circleTargets.circle2.cx,
                //         cy: () => circleTargets.circle2.cy,
                //         r: 0
                //     }
                // }, {
                //     autoAlpha: 1,
                //     attr: {
                //         cx: () => circleTargets.circle2.cx,
                //         cy: () => circleTargets.circle2.cy,
                //         r: () => circleTargets.circle2.r
                //     },
                //     duration: 1,
                //     ease: 'power2.out'
                // }, '>');
                // segmentTl.fromTo(circle1, {
                //     autoAlpha: 0,
                //     attr: {
                //         cx: () => circleTargets.circle1.cx,
                //         cy: () => circleTargets.circle1.cy,
                //         r: 0
                //     }
                // }, {
                //     autoAlpha: 1,
                //     attr: {
                //         cx: () => circleTargets.circle1.cx,
                //         cy: () => circleTargets.circle1.cy,
                //         r: () => circleTargets.circle1.r
                //     },
                //     duration: 1,
                //     ease: 'power2.out'
                // }, '<');
            }
        });

        tl.add(() => { // Who > What timeline            
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-3',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                }
            });
            segmentTl.to('#thesis-title', {
                fontSize: phonePortrait ? '1.25rem' : '2rem', top: phonePortrait ? '1.25rem' : '4rem', bottom: 'unset'
            }, 0);
            segmentTl.to('#who-what', {
                xPercent: 0, autoAlpha: 1
            }, '+=0.2');
            segmentTl.to('#who-what-content', {
                autoAlpha: 1
            }, '>');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(225),
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: 5, y: 5, z: 100,
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
                segmentTl.to(leftShell.position, {
                    x: 0, z: -60,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(rightShell.position, {
                    x: 0, z: -100,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight.position, {
                    x: -20, y: -20, z: -50,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight, {
                    intensity: 100000,
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
                    end: 'bottom bottom',
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
                    x: -0.4, y: 1, z: 10,
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
            const nestedTl = gsap.timeline({ paused: true });

            nestedTl.to(cone.material, {
                opacity: 1, duration: 0.5
            }, 0);
            nestedTl.to(cylinder.material, {
                opacity: 1, duration: 0.5
            }, 0);
            nestedTl.to(cone.rotation, {
                y: THREE.MathUtils.degToRad(-45),
                ease: 'power2.out',
                duration: 0.7
            }, '<');
            nestedTl.to(cylinder.rotation, {
                y: THREE.MathUtils.degToRad(-45),
                ease: 'power2.out',
                duration: 0.7
            }, '<');
            nestedTl.to(cone.rotation, {
                y: THREE.MathUtils.degToRad(270),
                ease: 'power4.inOut',
                duration: 1.2
            }, '>');
            nestedTl.to(cone.position, {
                x: 0, y: 8, z: -1,
                ease: 'power4.inOut',
                duration: 1.2
            }, '<');
            nestedTl.to(cylinder.rotation, {
                y: THREE.MathUtils.degToRad(270),
                ease: 'power4.inOut',
                duration: 1.2
            }, '<+0.1');
            nestedTl.to(cylinder.position, {
                x: 0, y: 16, z: -1.5,
                ease: 'power4.inOut',
                duration: 1.2
            }, '<');
            nestedTl.to(coneOverlay.material, {
                opacity: 1, duration: 0.5
            }, '>+0.1');
            nestedTl.to(cylinderOverlay.material, {
                opacity: 1, duration: 0.5
            }, '<');
            nestedTl.to(cone.material, {
                opacity: 0, duration: 0.5
            }, '<');
            nestedTl.to(cylinder.material, {
                opacity: 0, duration: 0.5
            }, '<');
            nestedTl.fromTo('.backBtn', {
                autoAlpha: 0, bottom: phonePortrait ? '1.25rem' : '2em'
            }, {
                autoAlpha: 1
            }, '>');

            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-5',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    onEnter: () => {
                        scroller.style.pointerEvents = 'auto';
                        nestedTl.play(0);
                    },
                    onEnterBack: () => {
                        scroller.style.pointerEvents = 'auto';
                    },
                    onLeaveBack: () => nestedTl.reverse()
                }
            });
            segmentTl.to('#unlock-potential', {
                autoAlpha: 0
            });
            segmentTl.to('#unlock-potential-content', {
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
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: THREE.MathUtils.degToRad(450),
                    ease: 'power4.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: -1, y: 8, z: 110,
                    ease: 'power4.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
            }
            segmentTl.to({}, {
                duration: 0,
                onComplete() {

                }
            }, 0);
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

        // Inject fresh SVG each time this page loads; replace the placeholder string with your SVG markup
        const liminalSvg = page.querySelector('.liminal-svg');
        liminalSvg?.querySelectorAll('svg').forEach(n => n.remove()); // clear previous SVGs, keep sibling divs intact
        const liminalSvgMarkup = `<svg width="100%" height="100%" viewBox="0 0 230 230" fill="none" xmlns="http://www.w3.org/2000/svg">
<g clip-path="url(#paint0_angular_1102_1941_clip_path)" data-figma-skip-parse="true"><g transform="matrix(0 0.11 -0.11 0 115 115)"><foreignObject x="-1009.09" y="-1009.09" width="2018.18" height="2018.18"><div xmlns="http://www.w3.org/1999/xhtml" style="background:conic-gradient(from 90deg,rgba(76, 75, 74, 1) 0deg,rgba(12, 10, 9, 1) 44.8945deg,rgba(255, 255, 255, 1) 45.3082deg,rgba(25, 23, 23, 1) 142.401deg,rgba(22, 20, 20, 1) 224.06deg,rgba(180, 180, 180, 1) 224.979deg,rgba(101, 101, 104, 1) 225.426deg,rgba(146, 146, 146, 1) 311.214deg,rgba(76, 75, 74, 1) 360deg);height:100%;width:100%;opacity:1"></div></foreignObject></g></g><path d="M225 5V170H170V60H60L115 5H225Z" data-figma-gradient-fill="{&#34;type&#34;:&#34;GRADIENT_ANGULAR&#34;,&#34;stops&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.047058824449777603,&#34;g&#34;:0.039215687662363052,&#34;b&#34;:0.035294119268655777,&#34;a&#34;:1.0},&#34;position&#34;:0.12470701336860657},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.12585619091987610},{&#34;color&#34;:{&#34;r&#34;:0.10080689191818237,&#34;g&#34;:0.093088507652282715,&#34;b&#34;:0.093088507652282715,&#34;a&#34;:1.0},&#34;position&#34;:0.39555805921554565},{&#34;color&#34;:{&#34;r&#34;:0.086274512112140656,&#34;g&#34;:0.078431375324726105,&#34;b&#34;:0.078431375324726105,&#34;a&#34;:1.0},&#34;position&#34;:0.62238943576812744},{&#34;color&#34;:{&#34;r&#34;:0.70903539657592773,&#34;g&#34;:0.70903539657592773,&#34;b&#34;:0.70903539657592773,&#34;a&#34;:1.0},&#34;position&#34;:0.62494164705276489},{&#34;color&#34;:{&#34;r&#34;:0.39607843756675720,&#34;g&#34;:0.39607843756675720,&#34;b&#34;:0.40784314274787903,&#34;a&#34;:1.0},&#34;position&#34;:0.62618219852447510},{&#34;color&#34;:{&#34;r&#34;:0.57430982589721680,&#34;g&#34;:0.57430982589721680,&#34;b&#34;:0.57430982589721680,&#34;a&#34;:1.0},&#34;position&#34;:0.86448216438293457}],&#34;stopsVar&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.047058824449777603,&#34;g&#34;:0.039215687662363052,&#34;b&#34;:0.035294119268655777,&#34;a&#34;:1.0},&#34;position&#34;:0.12470701336860657},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.12585619091987610},{&#34;color&#34;:{&#34;r&#34;:0.10080689191818237,&#34;g&#34;:0.093088507652282715,&#34;b&#34;:0.093088507652282715,&#34;a&#34;:1.0},&#34;position&#34;:0.39555805921554565},{&#34;color&#34;:{&#34;r&#34;:0.086274512112140656,&#34;g&#34;:0.078431375324726105,&#34;b&#34;:0.078431375324726105,&#34;a&#34;:1.0},&#34;position&#34;:0.62238943576812744},{&#34;color&#34;:{&#34;r&#34;:0.70903539657592773,&#34;g&#34;:0.70903539657592773,&#34;b&#34;:0.70903539657592773,&#34;a&#34;:1.0},&#34;position&#34;:0.62494164705276489},{&#34;color&#34;:{&#34;r&#34;:0.39607843756675720,&#34;g&#34;:0.39607843756675720,&#34;b&#34;:0.40784314274787903,&#34;a&#34;:1.0},&#34;position&#34;:0.62618219852447510},{&#34;color&#34;:{&#34;r&#34;:0.57430982589721680,&#34;g&#34;:0.57430982589721680,&#34;b&#34;:0.57430982589721680,&#34;a&#34;:1.0},&#34;position&#34;:0.86448216438293457}],&#34;transform&#34;:{&#34;m00&#34;:1.3471115431376406e-14,&#34;m01&#34;:-220.0,&#34;m02&#34;:225.0,&#34;m10&#34;:220.0,&#34;m11&#34;:1.3471115431376406e-14,&#34;m12&#34;:5.0},&#34;opacity&#34;:1.0,&#34;blendMode&#34;:&#34;NORMAL&#34;,&#34;visible&#34;:true}"/>
<path d="M225 5V170H170V60H60L115 5H225Z" fill="url(#paint1_radial_1102_1941)" fill-opacity="0.9"/>
<g clip-path="url(#paint2_angular_1102_1941_clip_path)" data-figma-skip-parse="true"><g transform="matrix(0 0.11 -0.11 0 115 115)"><foreignObject x="-1009.09" y="-1009.09" width="2018.18" height="2018.18"><div xmlns="http://www.w3.org/1999/xhtml" style="background:conic-gradient(from 90deg,rgba(76, 75, 74, 1) 0deg,rgba(12, 10, 9, 1) 44.8945deg,rgba(255, 255, 255, 1) 45.3082deg,rgba(25, 23, 23, 1) 142.401deg,rgba(22, 20, 20, 1) 224.06deg,rgba(180, 180, 180, 1) 224.979deg,rgba(101, 101, 104, 1) 225.426deg,rgba(146, 146, 146, 1) 311.214deg,rgba(76, 75, 74, 1) 360deg);height:100%;width:100%;opacity:1"></div></foreignObject></g></g><path d="M5 225V60L60 60L60 170H170L115 225H5Z" data-figma-gradient-fill="{&#34;type&#34;:&#34;GRADIENT_ANGULAR&#34;,&#34;stops&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.047058824449777603,&#34;g&#34;:0.039215687662363052,&#34;b&#34;:0.035294119268655777,&#34;a&#34;:1.0},&#34;position&#34;:0.12470701336860657},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.12585619091987610},{&#34;color&#34;:{&#34;r&#34;:0.10080689191818237,&#34;g&#34;:0.093088507652282715,&#34;b&#34;:0.093088507652282715,&#34;a&#34;:1.0},&#34;position&#34;:0.39555805921554565},{&#34;color&#34;:{&#34;r&#34;:0.086274512112140656,&#34;g&#34;:0.078431375324726105,&#34;b&#34;:0.078431375324726105,&#34;a&#34;:1.0},&#34;position&#34;:0.62238943576812744},{&#34;color&#34;:{&#34;r&#34;:0.70903539657592773,&#34;g&#34;:0.70903539657592773,&#34;b&#34;:0.70903539657592773,&#34;a&#34;:1.0},&#34;position&#34;:0.62494164705276489},{&#34;color&#34;:{&#34;r&#34;:0.39607843756675720,&#34;g&#34;:0.39607843756675720,&#34;b&#34;:0.40784314274787903,&#34;a&#34;:1.0},&#34;position&#34;:0.62618219852447510},{&#34;color&#34;:{&#34;r&#34;:0.57430982589721680,&#34;g&#34;:0.57430982589721680,&#34;b&#34;:0.57430982589721680,&#34;a&#34;:1.0},&#34;position&#34;:0.86448216438293457}],&#34;stopsVar&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.047058824449777603,&#34;g&#34;:0.039215687662363052,&#34;b&#34;:0.035294119268655777,&#34;a&#34;:1.0},&#34;position&#34;:0.12470701336860657},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.12585619091987610},{&#34;color&#34;:{&#34;r&#34;:0.10080689191818237,&#34;g&#34;:0.093088507652282715,&#34;b&#34;:0.093088507652282715,&#34;a&#34;:1.0},&#34;position&#34;:0.39555805921554565},{&#34;color&#34;:{&#34;r&#34;:0.086274512112140656,&#34;g&#34;:0.078431375324726105,&#34;b&#34;:0.078431375324726105,&#34;a&#34;:1.0},&#34;position&#34;:0.62238943576812744},{&#34;color&#34;:{&#34;r&#34;:0.70903539657592773,&#34;g&#34;:0.70903539657592773,&#34;b&#34;:0.70903539657592773,&#34;a&#34;:1.0},&#34;position&#34;:0.62494164705276489},{&#34;color&#34;:{&#34;r&#34;:0.39607843756675720,&#34;g&#34;:0.39607843756675720,&#34;b&#34;:0.40784314274787903,&#34;a&#34;:1.0},&#34;position&#34;:0.62618219852447510},{&#34;color&#34;:{&#34;r&#34;:0.57430982589721680,&#34;g&#34;:0.57430982589721680,&#34;b&#34;:0.57430982589721680,&#34;a&#34;:1.0},&#34;position&#34;:0.86448216438293457}],&#34;transform&#34;:{&#34;m00&#34;:1.3471115431376406e-14,&#34;m01&#34;:-220.0,&#34;m02&#34;:225.0,&#34;m10&#34;:220.0,&#34;m11&#34;:1.3471115431376406e-14,&#34;m12&#34;:5.0},&#34;opacity&#34;:1.0,&#34;blendMode&#34;:&#34;NORMAL&#34;,&#34;visible&#34;:true}"/>
<path d="M5 225V60L60 60L60 170H170L115 225H5Z" fill="url(#paint3_radial_1102_1941)" fill-opacity="0.9"/>
<g style="mix-blend-mode:color-dodge" filter="url(#filter0_f_1102_1941)">
<mask id="path-2-outside-1_1102_1941" maskUnits="userSpaceOnUse" x="4" y="4" width="222" height="222" fill="black">
<rect fill="white" x="4" y="4" width="222" height="222"/>
<path d="M225 5V170H170V60H60L115 5H225Z"/>
<path d="M5 225V60L60 60L60 170H170L115 225H5Z"/>
</mask>
<g clip-path="url(#paint4_angular_1102_1941_clip_path)" data-figma-skip-parse="true" mask="url(#path-2-outside-1_1102_1941)"><g transform="matrix(0 0.11 -0.11 0 115 115)"><foreignObject x="-1009.09" y="-1009.09" width="2018.18" height="2018.18"><div xmlns="http://www.w3.org/1999/xhtml" style="background:conic-gradient(from 90deg,rgba(2, 2, 2, 0.0107) 0deg,rgba(0, 0, 0, 0) 53.2678deg,rgba(255, 255, 255, 1) 98.6773deg,rgba(8, 8, 8, 0.0353) 237.487deg,rgba(2, 2, 2, 0.0107) 360deg);height:100%;width:100%;opacity:1"></div></foreignObject></g></g><path d="M225 5H226V4H225V5ZM225 170V171H226V170H225ZM170 60H171V59H170V60ZM115 5V4H114.586L114.293 4.29289L115 5ZM5 225H4V226H5V225ZM5 60L5 59L4 59V60H5ZM60 170L59 170L59 171H60V170ZM115 225V226H115.414L115.707 225.707L115 225ZM225 5H224V170H225H226V5H225ZM225 170V169H170V170V171H225V170ZM170 170H171V60H170H169V170H170ZM170 60V59H60V60V61H170V60ZM60 60L60.7071 60.7071L115.707 5.70711L115 5L114.293 4.29289L59.2929 59.2929L60 60ZM115 5V6H225V5V4H115V5ZM5 225H6V60H5H4V225H5ZM5 60L5 61L60 61L60 60L60 59L5 59L5 60ZM60 60L59 60L59 170L60 170L61 170L61 60L60 60ZM60 170V171H170V170V169H60V170ZM170 170L169.293 169.293L114.293 224.293L115 225L115.707 225.707L170.707 170.707L170 170ZM115 225V224H5V225V226H115V225Z" data-figma-gradient-fill="{&#34;type&#34;:&#34;GRADIENT_ANGULAR&#34;,&#34;stops&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.0,&#34;g&#34;:0.0,&#34;b&#34;:0.0,&#34;a&#34;:0.0},&#34;position&#34;:0.14796620607376099},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.27410352230072021},{&#34;color&#34;:{&#34;r&#34;:0.035282373428344727,&#34;g&#34;:0.035282373428344727,&#34;b&#34;:0.035282373428344727,&#34;a&#34;:0.035282373428344727},&#34;position&#34;:0.65968674421310425}],&#34;stopsVar&#34;:[{&#34;color&#34;:{&#34;r&#34;:0.0,&#34;g&#34;:0.0,&#34;b&#34;:0.0,&#34;a&#34;:0.0},&#34;position&#34;:0.14796620607376099},{&#34;color&#34;:{&#34;r&#34;:1.0,&#34;g&#34;:1.0,&#34;b&#34;:1.0,&#34;a&#34;:1.0},&#34;position&#34;:0.27410352230072021},{&#34;color&#34;:{&#34;r&#34;:0.035282373428344727,&#34;g&#34;:0.035282373428344727,&#34;b&#34;:0.035282373428344727,&#34;a&#34;:0.035282373428344727},&#34;position&#34;:0.65968674421310425}],&#34;transform&#34;:{&#34;m00&#34;:1.3471115431376406e-14,&#34;m01&#34;:-220.0,&#34;m02&#34;:225.0,&#34;m10&#34;:220.0,&#34;m11&#34;:1.3471115431376406e-14,&#34;m12&#34;:5.0},&#34;opacity&#34;:1.0,&#34;blendMode&#34;:&#34;NORMAL&#34;,&#34;visible&#34;:true}" mask="url(#path-2-outside-1_1102_1941)"/>
</g>
<defs>
<clipPath id="paint0_angular_1102_1941_clip_path"><path d="M225 5V170H170V60H60L115 5H225Z"/></clipPath><clipPath id="paint2_angular_1102_1941_clip_path"><path d="M5 225V60L60 60L60 170H170L115 225H5Z"/></clipPath><filter id="filter0_f_1102_1941" x="0" y="0" width="230" height="230" filterUnits="userSpaceOnUse" color-interpolation-filters="sRGB">
<feFlood flood-opacity="0" result="BackgroundImageFix"/>
<feBlend mode="normal" in="SourceGraphic" in2="BackgroundImageFix" result="shape"/>
<feGaussianBlur stdDeviation="2" result="effect1_foregroundBlur_1102_1941"/>
</filter>
<clipPath id="paint4_angular_1102_1941_clip_path"><path d="M225 5H226V4H225V5ZM225 170V171H226V170H225ZM170 60H171V59H170V60ZM115 5V4H114.586L114.293 4.29289L115 5ZM5 225H4V226H5V225ZM5 60L5 59L4 59V60H5ZM60 170L59 170L59 171H60V170ZM115 225V226H115.414L115.707 225.707L115 225ZM225 5H224V170H225H226V5H225ZM225 170V169H170V170V171H225V170ZM170 170H171V60H170H169V170H170ZM170 60V59H60V60V61H170V60ZM60 60L60.7071 60.7071L115.707 5.70711L115 5L114.293 4.29289L59.2929 59.2929L60 60ZM115 5V6H225V5V4H115V5ZM5 225H6V60H5H4V225H5ZM5 60L5 61L60 61L60 60L60 59L5 59L5 60ZM60 60L59 60L59 170L60 170L61 170L61 60L60 60ZM60 170V171H170V170V169H60V170ZM170 170L169.293 169.293L114.293 224.293L115 225L115.707 225.707L170.707 170.707L170 170ZM115 225V224H5V225V226H115V225Z" mask="url(#path-2-outside-1_1102_1941)"/></clipPath><radialGradient id="paint1_radial_1102_1941" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(115 115) rotate(90) scale(129.5)">
<stop stop-opacity="0"/>
<stop offset="1"/>
</radialGradient>
<radialGradient id="paint3_radial_1102_1941" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(115 115) rotate(90) scale(129.5)">
<stop stop-opacity="0"/>
<stop offset="1"/>
</radialGradient>
</defs>
</svg>
`;
        liminalSvg?.insertAdjacentHTML('beforeend', liminalSvgMarkup);

        //creating scroller
        const scroller = Object.assign(document.createElement('div'), {
            className: 'scroller'
        });

        // ============================== THREEJS

        function createWhatScene() {
            const pageElement = document.querySelector('#page-what');
            if (!pageElement) return null;
            const isPhonePortrait = phonePortrait;
            let activePhoneIndex = isPhonePortrait ? 0 : -1;
            let lastPhoneSelection = activePhoneIndex;

            const canvas = Object.assign(document.createElement('canvas'), {
                id: 'what-canvas',
                className: 'what-canvas'
            });
            canvas.style.pointerEvents = isPhonePortrait ? 'none' : 'none';
            pageElement.prepend(canvas);

            const renderer = new THREE.WebGLRenderer({
                canvas,
                antialias: true,
                alpha: true
            });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            renderer.setClearColor(0x000000, 0);
            renderer.physicallyCorrectLights = true;

            const scene = new THREE.Scene();

            const getViewportSize = () => {
                const rect = pageElement.getBoundingClientRect();
                const width = Math.max(1, rect.width || window.innerWidth);
                const height = Math.max(1, rect.height || window.innerHeight);
                return { width, height };
            };

            const { width, height } = getViewportSize();
            renderer.setSize(width, height, false);

            const camera = new THREE.PerspectiveCamera(
                15,
                width / Math.max(1, height),
                0.1,
                200
            );
            camera.position.set(0, 0, 60);
            const lookAtTarget = phonePortrait
                ? new THREE.Vector3(0, -4.5, 0)
                : new THREE.Vector3(0, -0.5, 0);
            camera.lookAt(lookAtTarget);
            scene.add(camera);

            scene.add(new THREE.AmbientLight(0xffffff, 0.85));
            scene.add(new THREE.HemisphereLight(0xffffff, 0x0a0a0a, 0.6));
            const rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
            rimLight.position.set(6, 8, 10);
            scene.add(rimLight);

            // scene.add(new THREE.AxesHelper(10));

            const groupCount = 3;
            const lights = [];
            const groups = Array.from({ length: groupCount }, (_, index) => {
                const group = new THREE.Group();
                group.name = `whatGroup${index + 1}`;
                const key = new THREE.PointLight(0xFF8B07, 10, 60, 2);
                key.position.set(-10, 0, -15);
                group.add(key);
                const fill = new THREE.AmbientLight(0xffffff, 100);
                group.add(fill);
                lights[index] = key;
                scene.add(group);
                return group;
            });

            const models = [];
            const geometries = new Set();
            const materials = new Set();
            const sectionIds = ['what-section-1', 'what-section-2', 'what-section-3'];
            const sectionMap = new Map(sectionIds.map((id, index) => [id, { group: groups[index], element: document.getElementById(id), index }]));
            let hoveredSectionId = null;
            const sectionResizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => syncGroupsToSections()) : null;
            sectionIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) sectionResizeObserver?.observe(el);
            });
            if (isPhonePortrait) {
                const firstSection = document.getElementById(sectionIds[0]);
                firstSection?.classList.add('hovered');
            }

            const loader = new GLTFLoader();
            loader.setDRACOLoader?.(dracoLoader);
            // Model paths (override by setting window.whatModelPaths before this runs)
            const defaultModelPaths = [
                './element05.glb',
                './element07.glb',
                './element08.glb'
            ];
            const modelPathStrings = Array.isArray(window.whatModelPaths) ? window.whatModelPaths : defaultModelPaths;
            const modelPaths = modelPathStrings.map(p => p ? new URL(p, import.meta.url) : null);
            const templateSizes = Array(groupCount).fill(null);
            const templateSizeFallback = new THREE.Vector3(1, 1, 1);

            const scaleFactor = Math.max(window.innerHeight / window.innerWidth, window.innerWidth / window.innerHeight) * 0.4
            const perGroupOffsets = phonePortrait
                ? [
                    { pos: [0, 0.1, 0], rot: [10, 0, 0], scale: 0.42 },
                    { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.5 },
                    { pos: [0, 0, 0], rot: [80, 0, 20], scale: 0.45 }
                ]
                : [
                    { pos: [0, 0.1, 0], rot: [10, 0, 0], scale: 1 * scaleFactor },
                    { pos: [0, 0.1, 0], rot: [0, 0, 0], scale: 1.1 * scaleFactor },
                    { pos: [0, 0.1, 0], rot: [80, 0, 20], scale: 1 * scaleFactor }
                ];

            modelPaths.forEach((url, index) => {
                if (!url) {
                    console.warn(`[createWhatScene] No model path for index ${index}; skipping load`);
                    return;
                }
                loader.load(url.href, (gltf) => {
                    const template = gltf.scene;
                    const boundingBox = new THREE.Box3().setFromObject(template);
                    const center = boundingBox.getCenter(new THREE.Vector3());
                    const size = boundingBox.getSize(new THREE.Vector3());
                    template.position.sub(center);
                    const targetNorm = 3; // normalize by largest dimension so all models start comparable
                    const maxDim = Math.max(size.x, size.y, size.z, 1e-3);
                    const scale = targetNorm / maxDim;
                    template.scale.setScalar(scale);
                    templateSizes[index] = new THREE.Box3().setFromObject(template).getSize(new THREE.Vector3());

                    const centerHelper = new THREE.Vector3();
                    const tempCenterWorld = new THREE.Vector3();
                    template.traverse((child) => {
                        if (!child.isMesh) return;
                        child.geometry.computeBoundingBox();
                        const box = child.geometry.boundingBox;
                        if (box) {
                            box.getCenter(centerHelper);
                            child.geometry.translate(-centerHelper.x, -centerHelper.y, -centerHelper.z);
                        }
                        child.geometry.computeBoundingSphere?.();
                        child.position.set(0, 0, 0);
                        const material = new THREE.MeshStandardMaterial({
                            color: 0xffffff,
                            roughness: 0.4,
                            metalness: 1,
                            envMapIntensity: 1.2
                        });
                        material.userData.smallColor = new THREE.Color(0x999999);
                        material.userData.largeColor = new THREE.Color(0xffffff);
                        child.material = material;
                        child.castShadow = true;
                        child.receiveShadow = true;
                        geometries.add(child.geometry);
                        materials.add(material);
                    });

                    const group = groups[index];
                    if (!group) return;
                    const clone = template.clone(true);
                    const cfg = perGroupOffsets[index] ?? {};
                    const [rx = 0, ry = 0, rz = 0] = cfg.rot ?? [];
                    clone.rotation.set(rx, ry, rz);
                    if (cfg.scale) clone.scale.multiplyScalar(cfg.scale);

                    group.add(clone);
                    // group.add(new THREE.AxesHelper(2));
                    clone.updateMatrixWorld(true);
                    clone.traverse(child => {
                        if (child.isMesh && child.material) {
                            const mat = child.material.clone();
                            if (mat.userData?.smallColor) {
                                mat.userData.smallColor = mat.userData.smallColor.clone?.() ?? new THREE.Color(mat.userData.smallColor);
                            }
                            if (mat.userData?.largeColor) {
                                mat.userData.largeColor = mat.userData.largeColor.clone?.() ?? new THREE.Color(mat.userData.largeColor);
                            }
                            child.material = mat;
                        }
                    });
                    const centerWorld = new THREE.Box3().setFromObject(clone).getCenter(tempCenterWorld);
                    group.worldToLocal(centerWorld);
                    clone.position.sub(centerWorld); // center to group origin
                    const [ox = 0, oy = 0, oz = 0] = cfg.pos ?? [0, 0, 0];
                    clone.position.add(new THREE.Vector3(ox, oy, oz)); // apply offset after centering
                    models[index] = clone;
                    lights[index] = null;
                    syncGroupsToSections();
                }, undefined, (error) => {
                    console.error(`[createWhatScene] Failed to load ${url.href}`, error);
                });
            });

            const rotationSpeed = 0.2;
            const clock = new THREE.Clock();
            let running = false;
            const targetZ = 0;
            const tempVec = new THREE.Vector3();
            const tempDir = new THREE.Vector3();

            function ndcToWorldX(ndcX) {
                tempVec.set(ndcX, 0, 0).unproject(camera);
                tempDir.copy(tempVec).sub(camera.position).normalize();
                const distance = (targetZ - camera.position.z) / tempDir.z;
                return camera.position.x + tempDir.x * distance;
            }

            function syncGroupsToSections() {
                if (isPhonePortrait) {
                    syncGroupsPhone();
                    return;
                }
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const measurements = [];
                sectionIds.forEach(id => {
                    const entry = sectionMap.get(id);
                    if (!entry) return;
                    const section = document.getElementById(id);
                    if (!section || !entry.group) return;
                    if (entry.element !== section) entry.element = section;
                    const bounds = section.getBoundingClientRect();
                    measurements.push({ entry, bounds });
                });

                if (!measurements.length) return;
                const maxWidth = Math.max(...measurements.map(m => m.bounds.width));
                const minWidth = Math.min(...measurements.map(m => m.bounds.width));
                const widthRange = Math.max(1e-6, maxWidth - minWidth);

                measurements.forEach(({ entry, bounds }) => {
                    const leftNdc = ((bounds.left - rect.left) / rect.width) * 2 - 1;
                    const rightNdc = ((bounds.right - rect.left) / rect.width) * 2 - 1;
                    const worldLeft = ndcToWorldX(leftNdc);
                    const worldRight = ndcToWorldX(rightNdc);
                    const worldWidth = Math.max(0.001, worldRight - worldLeft);
                    entry.group.position.set((worldLeft + worldRight) / 2, 0, targetZ);
                    const cfg = perGroupOffsets[entry.index] ?? {};
                    const baseScale = cfg.scale ?? 1;
                    const normSize = templateSizes[entry.index] ?? templateSizeFallback;
                    const normalizedWidth = Math.max(0.001, normSize.x, normSize.y, normSize.z); // use longest dimension
                    const flexRatio = Math.max(0.4, worldWidth / normalizedWidth); // flex child size relative to normalized model
                    const targetScale = baseScale * flexRatio;
                    const isHovered = entry.element?.classList.contains('hovered') || entry.element?.id === hoveredSectionId;
                    const hoverFactor = isHovered ? 1.2 : 1;
                    entry.group.scale.setScalar(targetScale * hoverFactor);
                    const colorRatio = Math.pow((bounds.width - minWidth) / widthRange, 0.4);
                    entry.group.traverse(child => {
                        if (child.isMesh && child.material?.userData) {
                            const { smallColor: small, largeColor: large } = child.material.userData;
                            if (small && large) {
                                child.material.color.copy(small).lerp(large, colorRatio);
                                child.material.needsUpdate = true;
                            }
                        }
                    });
                });
            }

            function syncGroupsPhone(immediate = false) {
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const positionsNdc = [-2 / 3, 0, 2 / 3]; // three equal slots across the width
                positionsNdc.forEach((ndcX, idx) => {
                    const worldX = ndcToWorldX(ndcX);
                    const group = groups[idx];
                    if (!group) return;
                    group.position.set(worldX, 0, targetZ);
                    const baseScale = perGroupOffsets[idx]?.scale ?? 1;
                    const normSize = templateSizes[idx] ?? templateSizeFallback;
                    const normalizedWidth = Math.max(0.001, normSize.x, normSize.y, normSize.z);
                    const targetScale = baseScale * (10 / normalizedWidth);
                    const hoverFactor = idx === activePhoneIndex ? 1.5 : 0.75;
                    const finalScale = targetScale * hoverFactor;
                    if (immediate) {
                        group.scale.setScalar(finalScale);
                    } else {
                        gsap.to(group.scale, { x: finalScale, y: finalScale, z: finalScale, duration: 0.35, ease: 'power2.out' });
                    }
                });
            }

            function resize() {
                const size = getViewportSize();
                renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
                renderer.setSize(size.width, size.height, false);
                camera.aspect = size.width / Math.max(1, size.height);
                camera.updateProjectionMatrix();
                syncGroupsToSections();
                camera.lookAt(lookAtTarget);
            }

            resize();
            window.addEventListener('resize', resize);
            syncGroupsToSections();

            function renderFrame() {
                if (!running) return;
                const delta = clock.getDelta();
                groups.forEach((group) => {
                    group.rotation.y += rotationSpeed * delta;
                });
                camera.lookAt(lookAtTarget);
                renderer.render(scene, camera);
            }

            const groupSet = new Set(groups);
            function findGroupFromObject(obj) {
                let node = obj;
                while (node) {
                    if (groupSet.has(node)) return node;
                    node = node.parent;
                }
                return null;
            }

            function setPhoneActive(idx, { force = false, immediate = false } = {}) {
                if (idx < 0) return;
                const same = idx === activePhoneIndex;
                activePhoneIndex = idx;
                lastPhoneSelection = idx;
                sectionIds.forEach((id, i) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.classList.toggle('hovered', i === idx);
                });
                // If we're reapplying the same index, only refresh scales when forced
                if (!same || force) {
                    syncGroupsPhone(immediate);
                }
            }

            function onPhoneTap(e) {
                if (!isPhonePortrait) return;
                const rect = canvas.getBoundingClientRect();
                const cx = e.clientX ?? e.touches?.[0]?.clientX;
                const cy = e.clientY ?? e.touches?.[0]?.clientY;
                if (cx == null || cy == null) return;
                // Ignore presses outside the canvas bounds so underlying elements remain clickable
                if (cx < rect.left || cx > rect.right || cy < rect.top || cy > rect.bottom) return;
                const x = ((cx - rect.left) / rect.width) * 2 - 1;
                const y = -((cy - rect.top) / rect.height) * 2 + 1;
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera({ x, y }, camera);
                const intersects = raycaster.intersectObjects(groups, true);
                const hit = intersects.find(i => i.object);
                if (!hit) return;
                const group = findGroupFromObject(hit.object);
                const idx = group ? groups.indexOf(group) : -1;
                if (idx === -1) return;
                setPhoneActive(idx);
            }

            function start() {
                if (running) return;
                running = true;
                clock.start();
                renderer.setAnimationLoop(renderFrame);
                if (isPhonePortrait) {
                    syncGroupsPhone(true); // set initial scales and hovered state
                    window.addEventListener('pointerdown', onPhoneTap, { passive: true });
                    window.addEventListener('touchstart', onPhoneTap, { passive: true });
                }
            }

            function stop() {
                if (!running) return;
                running = false;
                renderer.setAnimationLoop(null);
                if (isPhonePortrait) {
                    window.removeEventListener('pointerdown', onPhoneTap);
                    window.removeEventListener('touchstart', onPhoneTap);
                }
            }

            function dispose() {
                stop();
                window.removeEventListener('resize', resize);
                sectionResizeObserver?.disconnect();
                renderer.dispose();
                materials.forEach(material => material.dispose());
                geometries.forEach(geometry => geometry.dispose());
                canvas.remove();
            }

            return {
                start,
                stop,
                scene,
                camera,
                renderer,
                groups,
                lights,
                objects: models,
                canvases: [canvas],
                syncToSections: syncGroupsToSections,
                dispose,
                lookAtTarget,
                getViewportSize,
                setPhoneActive: (idx) => setPhoneActive(idx),
                getPhoneActiveIndex: () => activePhoneIndex,
                getLastPhoneSelection: () => lastPhoneSelection
            };
        }

        const what3D = createWhatScene();
        window.what3D = what3D;
        const whatLookAt = new THREE.Vector3(0, 0, 0);




        // ============================== TIMELINE

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        // Set initial states
        gsap.set('#what-title', { fontSize: phonePortrait ? '4rem' : '8rem', lineHeight: 1, top: phonePortrait ? 'calc(100dvh - 3em)' : '50%', yPercent: 500, autoAlpha: 0 });
        gsap.set('.section-container', { autoAlpha: 0 });
        gsap.set('#what-section-4', { autoAlpha: 0 });
        if (!phonePortrait) gsap.set('#page-what>.section-container i', { scaleY: 0 });
        gsap.set('#what-canvas', { autoAlpha: 0 });

        // Definition timeline    
        tl.add(() => { // Append Scroller
            document.body.appendChild(scroller);
            appendSegments(3);
            window.scrollTo(0, 0);
            scroller.scrollTop = 0;
            ScrollTrigger.refresh();
        }, 0)
        tl.add(() => { what3D?.start(); }, 0);
        tl.from('#page-what', {
            autoAlpha: 0, duration: 1
        }, 0);
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out', onComplete: () => stopThree()
        }, 0);
        tl.to('#what-title', {
            yPercent: 0, autoAlpha: 1, duration: 0.5
        }, 0)
        tl.to('#page-what .scroll-hint', {
            autoAlpha: 1, duration: 0.5
        }, '>0.5');

        const whatCam = what3D?.camera;
        const whatGroups = what3D?.groups ?? [];

        tl.add(() => { // Three-section timeline
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-2',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    onComplete: () => {
                        if (!phonePortrait) document.querySelector('.scroller').style.pointerEvents = 'none';
                    }
                }
            });
            segmentTl.to('#what-title', {
                fontSize: phonePortrait ? '1.5rem' : '2rem', top: phonePortrait ? '1.25rem' : '4rem'
            }, 0);
            segmentTl.to('#what-canvas', {
                autoAlpha: 1, duration: 1
            }, 0)
            segmentTl.to('.section-container', {
                autoAlpha: 1, duration: 0.5
            }, 0);
            if (!phonePortrait) segmentTl.to('#page-what>.section-container .section', {
                zIndex: 9
            }, 0);
            segmentTl.to('#page-what>.section-container i', {
                scaleY: 1,
                duration: 0.5,
                stagger: 0.2
            }, '<');
            if (!phonePortrait) segmentTl.to('.scroll-hint', {
                opacity: 0, duration: 0.2, onComplete: () => {
                    segmentTl.to('#page-what .scroll-hint', {
                        right: '4rem', duration: 0
                    });
                }
            }, '<-0.5');

            if (!phonePortrait) {
                segmentTl.add(() => {
                    const sections = document.querySelectorAll('#page-what > .section-container .section');
                    const clearHovered = () => {
                        document.querySelectorAll('#page-what > .section-container .section.hovered').forEach(s => {
                            s.classList.remove('hovered');
                        });
                    };
                    sections.forEach(section => {
                        section.addEventListener('mouseenter', () => {
                            clearHovered();
                            sections.forEach(s => {
                                s.removeAttribute('style');
                                s.querySelectorAll('div').forEach(div => div.removeAttribute('style'));
                                s.style.zIndex = '9';
                            });
                            section.removeAttribute('style');
                            section.querySelectorAll('div').forEach(div => div.removeAttribute('style'));
                            section.classList.add('hovered');
                            section.style.zIndex = '0';


                            what3D?.syncToSections?.();
                            requestAnimationFrame(() => what3D?.syncToSections?.());

                            if (section.id === 'what-section-3') {
                                scroller.style.pointerEvents = 'auto';
                                document.querySelector('#page-what .scroll-hint').style.opacity = '1'
                            } else {
                                scroller.style.pointerEvents = 'none';
                                document.querySelector('#page-what .scroll-hint').style.opacity = '0'
                            }
                        });
                    });
                }, '>')
            }
        });
        tl.add(() => { // We Are Liminal timeline
            const sectionContentSel = '#page-what>.section-container .section > div';
            const clearPhoneSectionStyles = () => {
                if (!phonePortrait) return;
                document.querySelectorAll(sectionContentSel).forEach(el => {
                    el.style.removeProperty('opacity');
                    el.style.removeProperty('visibility');
                    el.style.removeProperty('transform');
                });
            };
            const reapplyPhoneHover = () => {
                if (!phonePortrait) return;
                const idx = what3D?.getLastPhoneSelection?.() ?? what3D?.getPhoneActiveIndex?.();
                if (idx == null || idx < 0) return;
                what3D?.setPhoneActive?.(idx, { force: true, immediate: true });
            };

            const stConfig = {
                trigger: '#segment-3',
                scroller,
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true,
                invalidateOnRefresh: true,
                onLeaveBack: () => { clearPhoneSectionStyles(); reapplyPhoneHover(); },
                onEnter: () => { reapplyPhoneHover(); },
                onEnterBack: () => { clearPhoneSectionStyles(); reapplyPhoneHover(); }
            };
            if (phonePortrait) {
                const hoveredSelector = '#page-what>.section-container .section.hovered > div';
                stConfig.onUpdate = (self) => {
                    const p = self.progress;
                    document.querySelectorAll(hoveredSelector).forEach(el => {
                        el.style.opacity = String(1 - p);
                        el.style.transform = `translateY(${(-64 * p)}px)`;
                    });
                    reapplyPhoneHover();
                };
            }

            const segmentTl = gsap.timeline({ scrollTrigger: stConfig });
            segmentTl.to('#page-what .scroll-hint', {
                autoAlpha: 0, duration: 0.01
            });
            segmentTl.to('#what-title', {
                autoAlpha: 0, duration: 0.5
            });
            segmentTl.to('#page-what>.section-container i', {
                yPercent: -100, duration: 0.5
            }, '<');
            if (!phonePortrait) {
                segmentTl.to(sectionContentSel, {
                    autoAlpha: 0, duration: 0.5
                }, '<');
                segmentTl.to(sectionContentSel, {
                    transform: 'translateY(-4rem)', duration: 1
                }, '<');
            }
            segmentTl.to('#page-what>.section-container .section', {
                zIndex: 0
            }, '<');
            if (whatCam) {
                const tempOffset = new THREE.Vector3();
                const triRadius = 1;
                const triHeight = Math.sin(THREE.MathUtils.degToRad(60)) * triRadius;
                const trianglePositions = [
                    new THREE.Vector3(-triRadius, 0, -triHeight),
                    new THREE.Vector3(triRadius, 0, -triHeight),
                    new THREE.Vector3(0, 0, triHeight * 2)
                ];
                let camOffset = null; // vector from target to camera
                let camSpherical = null; // spherical form of camOffset (captured once)
                let startPos = [];
                let startScale = [];
                let startRotX = [];
                const captureStartState = () => {
                    // Always recapture so we start from the latest selection/state
                    camOffset = new THREE.Vector3().copy(whatCam.position).sub(whatLookAt);
                    camSpherical = new THREE.Spherical().setFromVector3(camOffset);
                    startPos = whatGroups.map(g => g.position.clone());
                    startScale = whatGroups.map(g => g.scale.clone());
                    startRotX = whatGroups.map(g => g.rotation.x);
                };
                const orbitState = { phi: 0, theta: 0, radius: 0 };
                segmentTl.to(orbitState, {
                    ease: 'none',
                    immediateRender: false,
                    onStart: captureStartState,
                    onUpdate: function () {
                        if (!camSpherical) return;
                        const t = this.progress();
                        orbitState.radius = camSpherical.radius;
                        orbitState.phi = THREE.MathUtils.lerp(camSpherical.phi, 0.0001, t); // toward top-down
                        orbitState.theta = THREE.MathUtils.lerp(camSpherical.theta, camSpherical.theta + Math.PI / 2, t); // spin 90° around Y
                        tempOffset.setFromSpherical(new THREE.Spherical(orbitState.radius, orbitState.phi, orbitState.theta));
                        // also slide downward on world Y while rotating
                        const easedDrop = THREE.MathUtils.clamp(Math.pow(t, 4), 0, 1); // ~power4.in
                        const yDrop = THREE.MathUtils.lerp(0, -camSpherical.radius * 1, easedDrop);
                        whatCam.position.copy(whatLookAt).add(tempOffset).add(new THREE.Vector3(0, yDrop, 0));
                        whatCam.lookAt(whatLookAt);
                        whatCam.updateProjectionMatrix();
                        whatGroups.forEach((group, index) => {
                            const pos = trianglePositions[index % trianglePositions.length];
                            group.position.copy(startPos[index]).lerp(pos, t);
                            group.scale.copy(startScale[index]).lerp(new THREE.Vector3(1, 1, 1), t);
                            group.rotation.x = THREE.MathUtils.lerp(startRotX[index], THREE.MathUtils.degToRad(90), t);
                            group.visible = t < 0.999; // hide once the move finishes; restores when scrubbing back
                        });
                    }
                }, '<');
                if (phonePortrait && what3D?.lookAtTarget) {
                    segmentTl.to(what3D.lookAtTarget, {
                        x: 0, y: 0, z: 0,
                        duration: 0.8,
                        onUpdate: () => { what3D.camera.lookAt(what3D.lookAtTarget); },
                        ease: 'power2.out'
                    }, '<');
                }
            }
            const nestedTl = gsap.timeline({ paused: true });
            nestedTl.set('#what-section-4', {
                autoAlpha: 1, onComplete: () => {
                    const el = document.querySelector('#what-section-4');
                    if (el) {
                        el.style.removeProperty('transform');
                        el.style.removeProperty('scale');
                    }
                }
            });
            nestedTl.fromTo('.liminal-svg', { scale: 0 }, { scale: 1, duration: 1.5, ease: 'power4.out' });
            nestedTl.fromTo('.liminal-svg>div', { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.5 }, '<');
            nestedTl.fromTo('.liminal-svg>svg', { autoAlpha: 0 }, { autoAlpha: 1, duration: 2.5, ease: 'power4.out' }, '<+0.1');
            nestedTl.fromTo('#we-are-liminal', { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.5 }, '<');
            nestedTl.fromTo('#we-are-liminal-content', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, '>');
            nestedTl.fromTo('.backBtn', { autoAlpha: 0 }, { autoAlpha: 1 }, '>');

            segmentTl.eventCallback('onComplete', () => nestedTl.play(0));
            segmentTl.eventCallback('onReverseComplete', () => {
                nestedTl.pause(0);
                gsap.set('#what-section-4', { autoAlpha: 0 });
            });

            // Scrub fade-out on reverse: tie nested fade-out to segment progress (only visible when scrolling back up)
            const fadeBackTl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
            fadeBackTl.to('#what-section-4', {
                autoAlpha: 0,
                scale: 0,
                duration: 5,
                onComplete: () => {
                    const el = document.querySelector('#what-section-4');
                    if (el) {
                        el.style.removeProperty('transform');
                        el.style.removeProperty('scale');
                    }
                }
            }, '<');
            let prevProg = 0;

            segmentTl.eventCallback('onUpdate', function () {
                const prog = segmentTl.progress();
                if (prog < prevProg) {
                    fadeBackTl.progress(1 - prog);
                } else {
                    fadeBackTl.progress(0);
                }
                prevProg = prog;
            });
        });
        tl.add(() => {
            btn?.addEventListener('click', (e) => {
                back(2, e, what3D);
            }, { once: true });
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
        if (phonePortrait) document.querySelector('#profile-back-btn .backBtn').textContent = '';
        const portraitContainer = document.getElementById('profile-portrait-container');
        const portraitCanvas = portraitContainer?.querySelector('canvas#profile-portrait');
        if (portraitCanvas) portraitCanvas.style.display = 'none';
        let portraitVideo = portraitContainer?.querySelector('video#profile-portrait');
        let portraitPingPongCleanup = null;
        let portraitHasShown = false;
        const enablePortraitPingPong = (video) => {
            if (!video) return null;
            const fps = 30;
            const step = 1 / fps;
            let reversing = false;
            let intervalId = null;
            const clear = () => { if (intervalId) { clearInterval(intervalId); intervalId = null; } };
            const playForward = () => { reversing = false; clear(); video.play().catch(() => { }); };
            const playReverse = () => {
                if (reversing) return;
                reversing = true;
                video.pause();
                clear();
                intervalId = setInterval(() => {
                    if (video.currentTime <= step) {
                        video.currentTime = 0;
                        playForward();
                        return;
                    }
                    video.currentTime = Math.max(0, video.currentTime - step);
                }, 1000 / fps);
            };
            const onEnded = () => playReverse();
            const onLoaded = () => { video.currentTime = 0; playForward(); };
            video.loop = false;
            video.addEventListener('ended', onEnded);
            video.addEventListener('loadedmetadata', onLoaded, { once: true });
            return () => { clear(); video.removeEventListener('ended', onEnded); };
        };
        const ensurePortraitVideo = () => {
            if (!portraitContainer) return null;
            if (!portraitVideo) {
                portraitVideo = Object.assign(document.createElement('video'), {
                    id: 'profile-portrait',
                    playsInline: true,
                    muted: true,
                    loop: true,
                    preload: 'metadata',
                    autoplay: true
                });
                portraitContainer.appendChild(portraitVideo);
            }
            portraitVideo.controls = false;
            portraitVideo.setAttribute('controlsList', 'nodownload noplaybackrate noremoteplayback');
            portraitVideo.disablePictureInPicture = true;
            Object.assign(portraitVideo.style, {
                pointerEvents: 'none',
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                position: 'absolute',
                inset: '0',
                zIndex: '-1',
                opacity: '1'
            });
            return portraitVideo;
        };
        ensurePortraitVideo();
        const buildPortraitMap = () => {
            const map = {};
            document.querySelectorAll('#profile-name [data-user]').forEach(span => {
                const id = span.dataset.user;
                if (id) map[id] = `./videos/${id}.mp4`;
            });
            return map;
        };
        const portraitVideos = window.profileVideos || buildPortraitMap();
        const waitForCanPlay = (video) => new Promise(resolve => {
            if (!video) return resolve();
            if (video.readyState >= 3) return resolve();
            const onCanPlay = () => { video.removeEventListener('canplay', onCanPlay); resolve(); };
            video.addEventListener('canplay', onCanPlay);
        });
        const fadeTo = (video, value, duration = 0.25) => new Promise(res => {
            if (!video) return res();
            gsap.to(video, { autoAlpha: value, duration, ease: 'power1.out', onComplete: res });
        });
        const setPortrait = async (userId) => {
            if (!portraitVideo) return;
            const src = portraitVideos[userId];
            if (!src) return;
            const resolved = new URL(src, import.meta.url).href;
            const changing = portraitVideo.src !== resolved;
            if (changing) {
                await fadeTo(portraitVideo, 0, 0.25);
                portraitVideo.src = resolved;
                await waitForCanPlay(portraitVideo);
            }
            portraitPingPongCleanup?.();
            portraitPingPongCleanup = enablePortraitPingPong(portraitVideo);
            try { await portraitVideo.play(); } catch { /* autoplay might be blocked */ }
            if (changing && portraitHasShown) await fadeTo(portraitVideo, 1, 0.25); // initial show handled by GSAP timeline
        };

        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });
        gsap.set('#page-profile', { '--pseudo-opacity': 0 });
        gsap.set('#profile-portrait', { autoAlpha: 0 })

        // TIMELINE

        tl.from('#page-profile', {
            autoAlpha: 0, duration: 1
        }, 0);
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
        }, 0);

        tl.from('#page-profile>i:nth-child(1)', {
            scaleX: 0, duration: 0.5
        }, '>-0.5');
        tl.from('#page-profile>i:nth-child(2)', {
            scaleY: 0, duration: 0.5
        }, '>-0.25');
        tl.from('#page-profile>i:nth-child(3)', {
            scaleX: 0, duration: 0.5
        }, '<');
        tl.from('#page-profile>i:nth-child(4)', {
            scaleY: 0, duration: 0.5
        }, '<');
        tl.from('#profile-toggle', {
            autoAlpha: 0, duration: 0.2
        }, '-=0.25');
        tl.from('#profile-toggle a', {
            autoAlpha: 0, duration: 0.5, stagger: 0.05, ease: 'bounce.out'
        }, '-=0.25');
        tl.to('#page-profile', {
            '--pseudo-opacity': 1, duration: 0.5
        }, '>');
        tl.from('#profile-portrait-container', { autoAlpha: 0, duration: 0.5 }, '>-1');
        tl.from('#profile-name', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '<');
        tl.from('#profile-title', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '>');
        tl.from('#profile-desc', {
            autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
        }, '-=0.25');
        tl.to('#profile-portrait', {
            autoAlpha: 1,
            duration: 0.5,
            onComplete: () => { portraitHasShown = true; }
        }, '>');

        tl.fromTo('.backBtn', {
            autoAlpha: 0
        }, {
            autoAlpha: 1, duration: 0.5
        }, '+=0.2');

        tl.add(() => {
            btn?.addEventListener('click', (e) => back(3, e), { once: true });
        });

        // Profile Toggler

        (function setupProfileToggle() {
            const sections = ['profile-name', 'profile-title', 'profile-desc'];
            const toggles = document.querySelector('#profile-toggle');
            if (!toggles) return;

            const lockSectionHeights = () => {
                sections.forEach((id) => {
                    const el = document.getElementById(id);
                    if (el && !phonePortrait) el.style.minHeight = el.offsetHeight + 'px';
                });
            };

            const textCache = new WeakMap();
            const rememberText = (nodes) => {
                nodes.forEach((node) => {
                    if (!textCache.has(node)) {
                        textCache.set(node, node.textContent ?? '');
                    }
                });
            };
            const primeTextCache = () => {
                sections.forEach((id) => {
                    rememberText(
                        Array.from(document.querySelectorAll(`#${id} [data-user]`))
                    );
                });
            };

            primeTextCache();

            const showUser = (userId) => {
                sections.forEach((id) => {
                    document
                        .querySelectorAll(`#${id} [data-user]`)
                        .forEach((span) => {
                            const isActive = span.dataset.user === userId;
                            span.hidden = !isActive;
                            if (isActive) {
                                span.textContent = textCache.get(span) ?? span.textContent;
                            }
                        });
                });
                toggles.querySelectorAll('[data-user]').forEach(btn => {
                    btn.toggleAttribute('current', btn.dataset.user === userId);
                });
                setPortrait(userId);
            };

            const getUserNodes = (userId) => {
                const nodes = sections
                    .map((id) => document.querySelector(`#${id} [data-user="${userId}"]`))
                    .filter(Boolean);
                rememberText(nodes);
                return nodes;
            };

            const scrambleInConfig = (target) => ({
                text: textCache.get(target) ?? '',
                chars: 'upperAndLowerCase',
                speed: 0.6,
                revealDelay: 0.1
            });

            const scrambleOutConfig = {
                text: '',
                chars: 'upperAndLowerCase',
                speed: 0.5,
                revealDelay: 0
            };

            let activeUser = 'sonny';
            showUser(activeUser);
            lockSectionHeights();

            const animateSwap = (nextUser) => {
                if (nextUser === activeUser) return;
                lockSectionHeights();

                const outgoing = getUserNodes(activeUser);
                const incoming = getUserNodes(nextUser);

                const tl = gsap.timeline({ defaults: { duration: 0.35, ease: 'power2.out' } });
                tl.to(outgoing, {
                    autoAlpha: 0,
                    y: 10,
                    stagger: 0.05,
                    scrambleText: scrambleOutConfig
                })
                    .add(() => {
                        activeUser = nextUser;
                        toggles.querySelectorAll('[data-user]').forEach((btn) =>
                            btn.toggleAttribute('current', btn.dataset.user === nextUser)
                        );
                        setPortrait(nextUser);
                        outgoing.forEach((node) => {
                            node.hidden = true;
                            node.textContent = textCache.get(node) ?? node.textContent;
                        });
                        incoming.forEach((node) => {
                            node.hidden = false;
                            node.textContent = '';
                        });
                    })
                    .fromTo(incoming, {
                        autoAlpha: 0,
                        y: -10
                    }, {
                        autoAlpha: 1,
                        y: 0,
                        stagger: 0.05,
                        scrambleText: (_, target) => scrambleInConfig(target)
                    }, '<');
            };

            toggles.addEventListener('click', (evt) => {
                const btn = evt.target.closest('[data-user]');
                if (!btn) return;
                animateSwap(btn.dataset.user);
            });
        })();

    };

    // ===================== PORTFOLIO

    function portfolio() {
        if (localStorage.getItem(key) < 4) return;
        const page = document.querySelector('#page-portfolio');

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');
        const btn = page.querySelector('.backBtn');

        if (phonePortrait) document.querySelector('#portfolio-back-btn .backBtn').textContent = '';

        const tl = gsap.timeline({ defaults: { ease: "power4.out" } });

        // TIMELINE

        tl.from('#page-portfolio', {
            autoAlpha: 0, duration: 1
        }, '<');
        tl.to(renderer.domElement, {
            autoAlpha: 0, duration: 1, ease: 'power2.out'
        }, '<');

        tl.from('#page-portfolio>i:nth-child(1)', {
            scaleX: 0, duration: 0.5
        }, '>-0.5');
        tl.from('#page-portfolio>i:nth-child(2)', {
            scaleY: 0, duration: 0.5
        }, '>-0.3');
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
        tl.from('#portfolio-icon-container', {
            autoAlpha: 0, duration: 0.5
        }, '-=0.25');
        tl.from('.backBtn', {
            autoAlpha: 0, duration: 0.5
        }, '+=0.5');

        const portfolio3D = createPortfolioScene();
        tl.add(() => {
            btn?.addEventListener('click', (e) => back(4, e, portfolio3D), { once: true });
        });

        (function setupPortfolioToggle() {
            const sections = ['portfolio-name', 'portfolio-desc'];
            const toggles = document.querySelector('#portfolio-toggle');
            if (!toggles) return;

            const lockSectionHeights = () => {
                sections.forEach((id) => {
                    const el = document.getElementById(id);
                    if (el) el.style.minHeight = el.offsetHeight + 'px';
                });
            };

            const textCache = new WeakMap();
            const rememberText = (nodes) => {
                nodes.forEach((node) => {
                    if (!textCache.has(node)) {
                        textCache.set(node, node.textContent ?? '');
                    }
                });
            };
            const primeTextCache = () => {
                sections.forEach((id) => {
                    rememberText(
                        Array.from(document.querySelectorAll(`#${id} [data-user]`))
                    );
                });
            };

            primeTextCache();

            const showUser = (userId) => {
                sections.forEach((id) => {
                    document
                        .querySelectorAll(`#${id} [data-user]`)
                        .forEach((span) => {
                            const isActive = span.dataset.user === userId;
                            span.hidden = !isActive;
                            if (isActive) {
                                span.textContent = textCache.get(span) ?? span.textContent;
                            }
                        });
                });
                toggles.querySelectorAll('[data-user]').forEach(btn => {
                    btn.toggleAttribute('current', btn.dataset.user === userId);
                });
            };

            const getUserNodes = (userId) => {
                const nodes = sections
                    .map((id) => document.querySelector(`#${id} [data-user="${userId}"]`))
                    .filter(Boolean);
                rememberText(nodes);
                return nodes;
            };

            const scrambleInConfig = (target) => ({
                text: textCache.get(target) ?? '',
                chars: 'upperAndLowerCase',
                speed: 0.6,
                revealDelay: 0.1
            });

            const scrambleOutConfig = {
                text: '',
                chars: 'upperAndLowerCase',
                speed: 0.5,
                revealDelay: 0
            };

            const defaultUser = toggles.querySelector('[data-user]')?.dataset.user || 'xweave';
            let activeUser = defaultUser;
            portfolio3D?.swap?.(activeUser);
            showUser(activeUser);
            lockSectionHeights();

            const animateSwap = (nextUser) => {
                if (nextUser === activeUser) return;
                lockSectionHeights();

                const outgoing = getUserNodes(activeUser);
                const incoming = getUserNodes(nextUser);

                const tl = gsap.timeline({ defaults: { duration: 0.35, ease: 'power2.out' } });
                tl.to(outgoing, {
                    autoAlpha: 0,
                    y: 10,
                    stagger: 0.05,
                    scrambleText: scrambleOutConfig
                })
                    .add(() => {
                        outgoing.forEach((node) => {
                            node.hidden = true;
                            node.textContent = textCache.get(node) ?? node.textContent;
                        });
                        incoming.forEach((node) => {
                            node.hidden = false;
                            node.textContent = '';
                        });
                        activeUser = nextUser;
                        toggles.querySelectorAll('[data-user]').forEach((btn) =>
                            btn.toggleAttribute('current', btn.dataset.user === nextUser)
                        );
                        portfolio3D?.swap?.(nextUser);
                    })
                    .fromTo(incoming, {
                        autoAlpha: 0,
                        y: -10
                    }, {
                        autoAlpha: 1,
                        y: 0,
                        stagger: 0.05,
                        scrambleText: (_, target) => scrambleInConfig(target)
                    });
            };

            toggles.addEventListener('click', (evt) => {
                const btn = evt.target.closest('[data-user]');
                if (!btn) return;
                animateSwap(btn.dataset.user);
            });
        })();

        function createPortfolioScene() {
            const container = document.getElementById('portfolio-icon-container');
            if (!container) return null;
            container.style.position = container.style.position || 'relative';

            const canvas = Object.assign(document.createElement('canvas'), {
                id: 'portfolio-canvas',
                className: 'portfolio-canvas'
            });
            Object.assign(canvas.style, {
                position: 'absolute',
                inset: '0',
                width: '100%',
                height: '100%',
                zIndex: '-1',
                pointerEvents: 'none'
            });
            container.prepend(canvas);

            const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

            const getSize = () => {
                const rect = container.getBoundingClientRect();
                return { width: Math.max(1, rect.width), height: Math.max(1, rect.height) };
            };
            const { width, height } = getSize();
            renderer.setSize(width, height, false);

            const scene = new THREE.Scene();
            const camera = new THREE.PerspectiveCamera(phonePortrait ? 20 : 35, width / height, 0.1, 100);
            camera.position.set(0, 0, 6);
            scene.add(camera);

            scene.add(new THREE.AmbientLight(0xffffff, 10));
            const dir = new THREE.DirectionalLight(0xffffff, 20);
            dir.position.set(-10, 6, 5);
            scene.add(dir);
            const rim = new THREE.DirectionalLight(0xff8800, 8);
            rim.position.set(-6, -2, -2);
            scene.add(rim);
            const front = new THREE.PointLight(0xffffff, 1.6);
            front.position.set(-2, 0, 6);
            scene.add(front);

            const loader = new GLTFLoader();
            loader.setDRACOLoader?.(dracoLoader);
            const modelGroup = new THREE.Group();
            scene.add(modelGroup);

            let currentModel = null;
            let running = true;
            let targetYRot = 0;
            let targetXRot = 0;

            const clock = new THREE.Clock();

            const materialize = (root) => {
                const metalMat = new THREE.MeshStandardMaterial({
                    color: 0xffffff,
                    roughness: 0.2,
                    metalness: 1,
                    transparent: true,
                    opacity: 0
                });
                root.traverse((child) => {
                    if (child.isMesh) {
                        child.material = metalMat.clone();
                        child.castShadow = true;
                        child.receiveShadow = true;
                    }
                });
                return root;
            };

            const centerAndScale = (root) => {
                const box = new THREE.Box3().setFromObject(root);
                const center = box.getCenter(new THREE.Vector3());
                const size = box.getSize(new THREE.Vector3());
                root.position.sub(center);
                const maxDim = Math.max(size.x, size.y, size.z, 1e-3);
                const target = 2;
                root.scale.setScalar(target / maxDim);
                // keep the model centered at origin after scale
                const box2 = new THREE.Box3().setFromObject(root);
                const c2 = box2.getCenter(new THREE.Vector3());
                root.position.sub(c2);
                const pivot = new THREE.Group();
                pivot.add(root);
                return pivot;
            };

            const fadeModel = (root, to, onComplete) => {
                const meshes = [];
                root?.traverse?.((child) => {
                    if (child.isMesh) meshes.push(child);
                });
                if (!meshes.length) return onComplete?.();
                gsap.to(meshes.map(m => m.material), {
                    opacity: to,
                    duration: 0.35,
                    ease: 'power2.out',
                    onComplete
                });
            };

            const loadModel = (userId) => {
                if (!userId) return;
                const url = new URL(`./logo/${userId}.glb`, import.meta.url);
                const old = currentModel;
                loader.load(url.href, (gltf) => {
                    let next = materialize(gltf.scene);
                    next = centerAndScale(next);
                    next.rotation.y = old?.rotation.y ?? 0;

                    const addAndFadeIn = () => {
                        modelGroup.add(next);
                        currentModel = next;
                        fadeModel(next, 1);
                    };

                    if (old) {
                        fadeModel(old, 0, () => {
                            modelGroup.remove(old);
                            addAndFadeIn();
                        });
                    } else {
                        addAndFadeIn();
                    }
                }, undefined, (err) => console.error('[portfolio] load failed', err));
            };

            const onMouseMove = (e) => {
                const rect = container.getBoundingClientRect();
                const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
                const ny = ((e.clientY - rect.top) / rect.height) * 2 - 1;
                targetYRot = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(nx * 20, -20, 20));
                targetXRot = THREE.MathUtils.degToRad(THREE.MathUtils.clamp(ny * 20, -20, 20));
            };
            window.addEventListener('mousemove', onMouseMove, { passive: true });

            const resize = () => {
                const { width, height } = getSize();
                renderer.setSize(width, height, false);
                camera.aspect = width / height;
                camera.updateProjectionMatrix();
            };
            window.addEventListener('resize', resize);

            const render = () => {
                if (!running) return;
                requestAnimationFrame(render);
                const delta = clock.getDelta();
                if (currentModel) {
                    currentModel.rotation.y = THREE.MathUtils.lerp(currentModel.rotation.y, targetYRot, 0.08);
                    currentModel.rotation.x = THREE.MathUtils.lerp(currentModel.rotation.x, targetXRot, 0.08);
                }
                renderer.render(scene, camera);
            };
            render();

            return {
                swap: loadModel,
                dispose() {
                    running = false;
                    window.removeEventListener('mousemove', onMouseMove);
                    window.removeEventListener('resize', resize);
                    renderer.dispose();
                    canvas.remove();
                },
                renderer,
                canvases: [canvas]
            };
        }

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

        const instanceCanvas = threeInstance?.renderer?.domElement ?? (threeInstance instanceof HTMLCanvasElement ? threeInstance : null);
        const instanceCanvases = threeInstance?.canvases ?? (instanceCanvas ? [instanceCanvas] : []);
        document.getElementById('label-container')?.style.removeProperty('z-index');
        const entrance = document.querySelector('#entrance');
        if (entrance) {
            gsap.set(entrance, { xPercent: -50, yPercent: -50, scaleX: 1, scaleY: 1 });
        }

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
        const allCubes = [cubeThesis, cubeWhat, cubeUs, cubePortfolio];
        allCubes.forEach(c => {
            c.material.opacity = 1;
        });
        cubeLabels.forEach(({ element, line }) => {
            element.style.opacity = 1;
            if (line?.material) line.material.opacity = 1;
        });
        if (scene.fog) scene.fog.density = FOG_DENSITY;

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
                scroller?.remove();
                window.scrollTo(0, 0);
                threeInstance?.stop?.();
                threeInstance?.dispose?.();
                instanceCanvases.forEach(canvas => canvas?.remove?.());

                if (value === ref) { localStorage.setItem(key, value + 1) };
            }
        });

        tl.to(page, {
            autoAlpha: 0, duration: 1
        }, 0);
        if (instanceCanvases.length) {
            tl.to(instanceCanvases, {
                autoAlpha: 0, duration: 1
            }, '<');
        }
        tl.add(() => {
            startThree();
        }, '>')
        tl.to('#space', {
            autoAlpha: 1, duration: 1
        }, '>');

        document.querySelector('.guides-container')?.remove();
    };

    function menuLayoutThree(state) {
        const getLabel = (id) => cubeLabels.find(entry => entry.id === id)?.element;

        const menuPortfolio = getLabel('menuPortfolio');
        const menuUs = getLabel('menuUs');
        const menuWhat = getLabel('menuWhat');
        const menuThesis = getLabel('menuThesis');

        menuPortfolio?.removeAttribute('hidden');
        menuUs?.removeAttribute('hidden');
        menuWhat?.removeAttribute('hidden');
        menuThesis && (menuThesis.textContent = 'DNA');

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
// PORTFOLIO PAGE
// -----------------------------------------------------
function portfolioPage() {
    if (!location.pathname.endsWith('/portfolio')) return;

    if (phonePortrait) {
        const list = document.querySelector('.portfolio-list');
        list.style.margin = '2rem';
        list.style.padding = '2rem';
        list.style.height = 'calc(100dvh - 4rem)'
    }

    document.documentElement.style.visibility = 'visible';
}

// -----------------------------------------------------
// PAGE TRANSITION ANIMATION TIMELINE
// -----------------------------------------------------


const Page = {
    landing: { // LANDING PAGE ---------------------------
        build: () => { landing(); updateLanding(); },
        // -------------------------------------------------
        once: ({ next }) => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.set(next.container.querySelector('#entrance'), { xPercent: -50, yPercent: -50, scaleX: 0, scaleY: 0 });
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
            tl.to({}, { duration: 1.5 });
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
                autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
            }, '>');
            tl.from(next.container.querySelector('.copyright-text'), {
                autoAlpha: 0, duration: 0.5, ease: 'bounce.out'
            }, '>-0.3');
            return tl;
        },
        // -------------------------------------------------
        enter: ({ next }) => {
            const tl = gsap.timeline({ defaults: { ease: 'power2.out' } });
            tl.set('#entrance', { xPercent: -50, yPercent: -50 });
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
                width: '100vw', height: '100dvh', backgroundColor: '#0000', borderColor: '#fff', boxShadow: 'none', duration: 0.5
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
    },

    portfolio: { // PORTFOLIO PAGE
        build: () => { portfolioPage(); },
        enter: ({ next }) => {
            const tl = gsap.timeline();
            tl.from('.portfolio-list', {
                scale: 1.2, autoAlpha: 0, duration: 0.5
            });
            tl.from('.portfolio-item', {
                autoAlpha: 0, duration: 0.3, stagger: 0.1
            }, '>');
            tl.from('.portfolio-list a', {
                autoAlpha: 0, duration: 0.3
            }, '>+0.5');
            return tl;
        },
        leave: ({ current }) => {
            const tl = gsap.timeline();
            tl.to(current.container, { autoAlpha: 0, duration: 0.3 });
            return tl;
        }
    },

    cloud: { // CLOUD PAGE --------------------------------
        build: () => { cloud(); },
        enter: ({ next }) => {
            const tl = gsap.timeline();
            tl.from('#cloud-fog-hud', { autoAlpha: 0, duration: 0.5 }, '>+0.1');
            tl.from(next.container.querySelectorAll('a'), { autoAlpha: 0, duration: 0.2 }, '>');
            return tl;
        },
        leave: ({ current }) => {
            const tl = gsap.timeline();
            tl.to(current.container, { autoAlpha: 0, duration: 0.3 });
            return tl;
        }
    }
};

// -----------------------------------------------------
// CLOUD
// -----------------------------------------------------

function cloud() {
    if (!location.pathname.endsWith('/cloud')) return;

    const canvas = document.querySelector('#cloud-canvas') || Object.assign(document.createElement('canvas'), { id: 'cloud-canvas' });
    if (!canvas.parentElement) document.body.appendChild(canvas);

    const scene = new THREE.Scene();
    const FOG_DENSITY = 0.008;
    scene.fog = new THREE.FogExp2(0x000000, FOG_DENSITY);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 5000);
    camera.position.set(-1, 0, 0);
    scene.add(camera);

    const renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        depth: true,
        stencil: false,
        powerPreference: 'high-performance'
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMappingExposure = 1.35;
    renderer.setClearColor(0x000000, 1);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enablePan = true;
    controls.enableZoom = true;
    controls.target.set(0, 0, 0);
    controls.update();

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
    shaderMaterial.depthWrite = false;
    shaderMaterial.blending = THREE.AdditiveBlending;
    shaderMaterial.transparent = true;

    const loader = new GLTFLoader();
    let root = null;

    loader.load(new URL('./cloud.glb', import.meta.url).href, (gltf) => {
        const group = new THREE.Group();
        gltf.scene.traverse((n) => {
            if (n.isPoints) {
                const geo = n.geometry.clone();
                const pts = new THREE.Points(geo, shaderMaterial);
                pts.position.copy(n.position);
                pts.rotation.copy(n.rotation);
                pts.scale.copy(n.scale);
                group.add(pts);
                n.material?.dispose?.();
            }
        });
        const box = new THREE.Box3().setFromObject(group);
        const center = new THREE.Vector3();
        box.getCenter(center);
        group.position.sub(center);
        root = group;
        scene.add(root);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        const radius = sphere.radius;
        controls.target.copy(sphere.center);
        controls.minDistance = 0; // allow crossing through center
        camera.near = Math.max(0.005, radius * 0.0001);
        camera.updateProjectionMatrix();
        const startOffset = Math.max(10, radius * 0.8);
        camera.position.copy(sphere.center).add(new THREE.Vector3(-startOffset, 0, 0));
        controls.update();
    });

    const params = {
        threshold: 0.1,
        strength: 0.3,
        radius: 0.3,
        exposure: 2
    };

    const renderScene = new RenderPass(scene, camera);
    const halfW = Math.max(256, window.innerWidth >> 1);
    const halfH = Math.max(256, window.innerHeight >> 1);
    const bloomComposer = new EffectComposer(renderer);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(halfW, halfH), params.strength, params.radius, params.threshold);
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass(renderScene);
    bloomComposer.addPass(bloomPass);

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
    finalComposer.setSize(window.innerWidth, window.innerHeight);
    finalComposer.addPass(renderScene);
    finalComposer.addPass(mixPass);
    finalComposer.addPass(outputPass);

    // Minimal HUD for fog control
    const hud = document.getElementById('cloud-fog-hud') || (() => {
        const wrap = Object.assign(document.createElement('div'), { id: 'cloud-fog-hud' });
        const hint = Object.assign(document.createElement('div'), { innerHTML: 'Drag to Rotate<br>Shift + Drag to Pan' });
        hint.className = 'cloud-hud__hint';
        wrap.append(hint);
        const addSlider = ({ label, min, max, step, value, format = (v) => v.toFixed(3), onInput }) => {
            const row = document.createElement('div');
            row.className = 'cloud-hud__row';
            const header = document.createElement('div');
            header.className = 'cloud-hud__row-header';
            const lbl = Object.assign(document.createElement('label'), { textContent: label });
            lbl.className = 'cloud-hud__label';
            const val = Object.assign(document.createElement('span'), { textContent: format(value) });
            val.className = 'cloud-hud__value';
            header.append(lbl, val);

            const input = Object.assign(document.createElement('input'), {
                type: 'range', min: String(min), max: String(max), step: String(step), value: String(value)
            });
            input.className = 'cloud-hud__range';
            const updateBg = (v) => {
                const pct = ((v - min) / (max - min)) * 100;
                input.style.setProperty('--pos', `${pct}%`);
            };
            updateBg(value);
            input.addEventListener('input', () => {
                const v = parseFloat(input.value);
                onInput?.(v);
                val.textContent = format(v);
                updateBg(v);
            });
            row.append(header, input);
            wrap.append(row);
            return input;
        };

        addSlider({
            label: 'Fog',
            min: 0,
            max: 0.02,
            step: 0.0002,
            value: FOG_DENSITY,
            format: (v) => v.toFixed(4),
            onInput: (v) => { if (scene.fog) scene.fog.density = v; }
        });

        addSlider({
            label: 'Bloom Radius',
            min: 0,
            max: 1,
            step: 0.01,
            value: params.radius,
            onInput: (v) => { params.radius = v; bloomPass.radius = v; }
        });

        addSlider({
            label: 'Bloom Gain',
            min: 0,
            max: 2,
            step: 0.05,
            value: mixPass.material.uniforms.bloomGain.value,
            onInput: (v) => { mixPass.material.uniforms.bloomGain.value = v; }
        });

        addSlider({
            label: 'Exposure',
            min: 0.1,
            max: 3,
            step: 0.05,
            value: renderer.toneMappingExposure,
            onInput: (v) => { renderer.toneMappingExposure = v; }
        });

        const bgLabel = Object.assign(document.createElement('label'), { textContent: 'Transparent BG' });
        bgLabel.className = 'cloud-hud__label-inline';
        const bgCheckbox = Object.assign(document.createElement('input'), { type: 'checkbox' });
        bgCheckbox.className = 'cloud-hud__checkbox';
        bgCheckbox.addEventListener('change', () => {
            const alpha = bgCheckbox.checked ? 0 : 1;
            renderer.setClearColor(0x000000, alpha);
        });
        const bgWrapper = document.createElement('div');
        bgWrapper.className = 'cloud-hud__row';
        bgWrapper.append(bgCheckbox, bgLabel);
        wrap.append(bgWrapper);

        const saveBtn = Object.assign(document.createElement('button'), { textContent: 'Save PNG' });
        saveBtn.className = 'cloud-hud__save';
        saveBtn.addEventListener('click', () => {
            const origFog = scene.fog ? scene.fog.density : null;
            const origPR = renderer.getPixelRatio();
            const origSize = renderer.getSize(new THREE.Vector2());
            const origClear = renderer.getClearColor(new THREE.Color());
            const origAlpha = renderer.getClearAlpha();
            const origUSize = shaderMaterial.uniforms.uSize.value;

            const exportScale = 2;

            renderer.setPixelRatio(origPR * exportScale);
            renderer.setSize(origSize.x, origSize.y, false);
            bloomComposer.setSize(origSize.x * exportScale, origSize.y * exportScale);
            finalComposer.setSize(origSize.x * exportScale, origSize.y * exportScale);
            shaderMaterial.uniforms.uSize.value = origUSize * exportScale;

            finalComposer.render();
            const url = renderer.domElement.toDataURL('image/png');

            if (scene.fog && origFog != null) scene.fog.density = origFog;
            renderer.setPixelRatio(origPR);
            renderer.setSize(origSize.x, origSize.y, false);
            bloomComposer.setSize(origSize.x, origSize.y);
            finalComposer.setSize(origSize.x, origSize.y);
            renderer.setClearColor(origClear, origAlpha);
            shaderMaterial.uniforms.uSize.value = origUSize;

            const a = document.createElement('a');
            a.href = url;
            a.download = 'cloud.png';
            a.click();
        });
        wrap.append(saveBtn);
        const cloudMain = document.querySelector('main[data-barba-namespace="cloud"]') || document.querySelector('main');
        (cloudMain || document.body).appendChild(wrap);
        return wrap;
    })();

    function resize() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        renderer.setSize(width, height, false);
        camera.aspect = width / Math.max(1, height);
        camera.updateProjectionMatrix();
        bloomComposer.setSize(width, height);
        finalComposer.setSize(width, height);
    }

    resize();
    window.addEventListener('resize', resize);

    const clock = new THREE.Clock();
    const api = {
        renderer,
        scene,
        camera,
        controls,
        get root() { return root; },
        get radius() {
            if (!root) return null;
            const sphere = new THREE.Sphere();
            new THREE.Box3().setFromObject(root).getBoundingSphere(sphere);
            return sphere.radius;
        },
        start() { renderer.setAnimationLoop(renderLoop); },
        stop() { renderer.setAnimationLoop(null); }
    };
    window.cloudInstance = api;

    function renderLoop() {
        clock.getDelta();
        controls.update();
        bloomComposer.render();
        finalComposer.render();
    }
    renderer.setAnimationLoop(renderLoop);
}
