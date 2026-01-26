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
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath('https://www.gstatic.com/draco/v1/decoders/');

// GSAP
import { gsap } from 'https://esm.sh/gsap@3.13.0?target=es2020';
import { ScrollTrigger } from 'https://esm.sh/gsap@3.13.0/ScrollTrigger?target=es2020&external=gsap';
import { ScrambleTextPlugin } from 'https://esm.sh/gsap@3.13.0/ScrambleTextPlugin?target=es2020&external=gsap';
import { SplitText } from 'https://esm.sh/gsap@3.13.0/SplitText?target=es2020&external=gsap';
import Observer from 'https://esm.sh/gsap@3.13.0/Observer?target=es2020&external=gsap';
gsap.registerPlugin(ScrollTrigger, ScrambleTextPlugin, SplitText, Observer);
ScrollTrigger.normalizeScroll({
    allowNestedScroll: true,
    type: "touch,wheel"
});

import Lenis from 'https://esm.sh/lenis@1.3.16?target=es2020';
// Lenis (configured when a scroller exists)
let lenis = null;
gsap.ticker.add((time) => { lenis?.raf(time * 1000); });
gsap.ticker.lagSmoothing(0);

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

            .scroller { z-index: 1; scroll-snap-type: y mandatory;}
            .thesis-scroller .segment {height: 100dvh !important; scroll-snap-align: end !important; scroll-snap-stop: always !important; }
            

            .text-line { font-size: 1rem; text-align: center; inset: -1.5rem 0px auto; }
            .welcome { top: 50%;}
            #submit-btn {font-size: 1rem; }

            .portfolio-list { padding: 1rem; }
            .portfolio-item { font-size: 1.5rem; }

            main[data-barba-namespace="space"] {height: 0}
            #liminalspace section { padding: 4rem 1.25rem; }
            .section { padding: 4rem 1.25rem; }
            #liminalspace #logo-holder { inset: 4rem 1.25rem; width: 3rem; height: 3rem; }
            .text-4xl { font-size: 3rem; line-height: 1.1; }
            .text-xl { font-size: 2rem; line-height: 1.5; }
            .text-lg { font-size: 1.5rem; }
            .text-md { max-width: none; }
            #welcome h1 { height: 1.25em; }
            .scroll-hint { left: 1.25rem; bottom: 1.25rem; font-size: 0.875rem  }
            #logout-btn { right: 1.25rem; bottom: 1.25rem; font-size: 0.875rem; padding: 0 }

            #liminal-desc { font-size: 1.5rem }

            #who-what { margin-bottom: 1rem; }
            #thesis-section-4 #whitespaces { display: flex; flex-wrap: wrap; }
            #thesis-section-4 #whitespaces div { display: flex; flex-wrap: wrap; }

            #page-what>.section-container { pointer-events: none; }
            #page-what>.section-container i { display: none; }
            #page-what>.section-container .section { position: absolute; }
            #vc, #vs, #acc { margin-top: 24dvh }
            #vc-def, #vs-def, #acc-def { flex: 0; margin-bottom: 1em; }

            #what-section-4>div { flex: 0; }
            .liminal-svg { width: 40vw; }
            #we-are-liminal-content { margin-top: 2rem; }
            #what-section-4 .backBtn { bottom: 4.25rem; }
            .what-scroller #segment-5 { height: 100dvh }
            .what-scroller #segment-5, .what-scroller #segment-6 { scroll-snap-align: end; scroll-snap-stop: always; }

            .page#page-profile { grid-template-columns: 1.25rem minmax(0, 1fr) minmax(0, 7fr) 1.25rem; 
                grid-template-rows: 4rem minmax(0, 5fr) minmax(0, 1fr) minmax(0, 6fr) 4rem; }
            #page-profile>i:nth-child(1) { grid-area: 2 / 1 / 5 / 6; }
            #page-profile>i:nth-child(2) { grid-area: 1 / 2 / 6 / 4; }
            #profile-portrait-container { grid-area: 2 / 3 / 2 / 3; border-width: 0; }
            #profile-back-btn { grid-area: 2 / 2 / 2 / 2; }
            #profile-back-btn .backBtn { width: 100%; inset: 0; padding: 0.75rem; aspect-ratio: 1; border-bottom: 1px solid #fff4; overflow: hidden; }
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
            #profile-desc>div { padding: 1.25rem; }

            #profile-desc>span, #profile-name>span, #profile-title>span { padding: 1.25rem }

            .page#page-portfolio { grid-template-columns: 1.25rem minmax(0, 1fr) minmax(0, 7fr) 1.25rem; grid-template-rows: 4rem minmax(0, 4fr) minmax(0, 8fr) 4rem; }
            #page-portfolio>i:nth-child(1) { grid-area: 2 / 1 / 4 / 6; }
            #page-portfolio>i:nth-child(2) { grid-area: 1 / 2 / 5 / 4; }
            #page-portfolio>i:nth-child(3) { display: none; }
            #portfolio-name { display: none; }
            #portfolio-icon-container { grid-area: 2 / 3 / 2 / 3; border-width: 0 0 1px 0 }
            #portfolio-back-btn { grid-area: 2 / 2 / 2 / 2; }
            #portfolio-back-btn .backBtn { width: 100%; inset: 0; padding: 0.75rem; aspect-ratio: 1; border-bottom: 1px solid #fff4; overflow: hidden; }
            #portfolio-back-btn .backBtn::before { display: block; }
            #portfolio-toggle { border-width: 0 1px 0 0; padding-top: calc(100% + 1em); }
            #portfolio-toggle a { padding: 0.5rem}
            #portfolio-toggle a span { display: none; }
            #portfolio-toggle a::before { display: block; }
            #portfolio-toggle a[current]::before { opacity: 1; filter: drop-shadow(0 0 1px #fff4); }
            #portfolio-toggle>a::after { width: 1px; }
            #portfolio-desc>div { padding: 1.25rem }


            

        `
    });
    document.head.append(style);
    
}

// ================================================================
// ====================== LANDING PAGE LAYOUT =====================
// ================================================================


let gridDimension, gridSize, cellSize, x, y, deltaW, deltaH;

async function landing() {
    if (!location.pathname.endsWith('/') || landingInit) return;
    Object.assign(document.documentElement.style, {
        width: '100vw',
        height: '100dvh',
        overflow: 'hidden'
    });
    const fontReady = document.fonts?.ready ?? Promise.resolve();

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
        const glow = document.querySelector('.loader-glow') || Object.assign(document.createElement('div'), { className: 'loader-glow' });
        const loaderEl = Object.assign(document.createElement('div'), { className: 'loader' });
        if (!glow.parentElement) document.querySelector('.grid-container')?.appendChild(glow);
        document.querySelector('.grid-bg')?.appendChild(loaderEl);
        requestAnimationFrame(() => {
            glow.classList.add('is-active');
            loaderEl.classList.add('is-active');
        });

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

    await fontReady;
    landingLayout();
    const entranceEl = document.querySelector('#entrance') || document.querySelector('.grid-container')?.appendChild(Object.assign(document.createElement('a'), { id: 'entrance' }));
    entranceEl?.style.setProperty('--entrance-w', 4);
    entranceEl?.style.setProperty('--entrance-h', 4);
    if (phonePortrait) {
        const maxEntranceW = gridSize;
        const maxEntranceH = Math.max(2, Math.floor(gridSize - 2 * (y / cellSize) - 2));
        entranceEl?.style.setProperty('--entrance-w', maxEntranceW);
        entranceEl?.style.setProperty('--entrance-h', maxEntranceH);
        const windowBox = document.querySelector('.window');
        if (windowBox) {
            windowBox.style.inset = (window.innerHeight < gridDimension ? deltaH / 2 + 'px' : '0') + ' ' + (window.innerWidth < gridDimension ? deltaW / 2 + 'px' : '0');
            windowBox.style.setProperty('--w', maxEntranceW);
            windowBox.style.setProperty('--h', maxEntranceH);
        }
    }




    //=============== THREEJS
    // Canvas
    const canvas = document.querySelector('.webgl');

    // Scene
    const scene = new THREE.Scene()
    let object;
    const cubeGeometry = new THREE.BoxGeometry(10, 10, 10);
    const cubeMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const originCube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    const cubeEdges = new THREE.EdgesGeometry(cubeGeometry);
    const cubeEdgeLines = new THREE.LineSegments(
        cubeEdges,
        new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.5 })
    );
    originCube.add(cubeEdgeLines);

    // scene.add(new THREE.AxesHelper(10));

    //Keep track of the mouse position to animate the scene
    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const startFov = 75;
    const camera = new THREE.PerspectiveCamera(startFov, size.width / size.height, 0.1, 2000);
    camera.position.set(0, 0, 0);
    scene.add(camera);

    // GLTF Loader + preload
    const loader = new GLTFLoader();
    loader.setDRACOLoader(dracoLoader);
    const modelURL = new URL('./cloud.glb', import.meta.url);
    let cloudScene = null;
    try {
        const [, gltfScene] = await Promise.all([
            fontReady,
            new Promise((resolve, reject) => {
                loader.load(modelURL.href, gltf => resolve(gltf.scene), undefined, reject);
            })
        ]);
        cloudScene = gltfScene;
    } catch (err) {
        console.error('Landing preload failed', err);
    }

    if (cloudScene) {
        object = cloudScene;
        const boundingBox = new THREE.Box3().setFromObject(object);
        const center = new THREE.Vector3();
        boundingBox.getCenter(center);
        object.position.sub(center);
        object.position.z = 1;
        originCube.position.set(phonePortrait ? -180 : -160, phonePortrait ? 180 : 160, -1000);
        object.add(originCube);
        scene.add(object);
    }

    //Instantiate a new renderer and set its size
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true
    })
    renderer.setSize(size.width, size.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))

    const targetFov = 25;
    const fovSpeed = 0.0001;
    const startCubeScale = 1;
    const targetCubeScale = 2;
    const cubeScaleSpeed = 0.15;
    const clock = new THREE.Clock();
    originCube.scale.setScalar(startCubeScale);

    //Render the scene
    function animate() {
        requestAnimationFrame(animate);
        //Here we could add some code to update the scene, adding some automatic movement
        //Make the scene move
        if (object) {
            object.rotation.y = ((mouseX / window.innerWidth) * 20 - 20) * Math.PI / 180;
            object.rotation.x = ((mouseY / window.innerHeight) * 20 - 20) * Math.PI / 180;
            originCube.rotation.y += 0.01;
        }
        const cubeScaleDelta = targetCubeScale - originCube.scale.x;
        if (Math.abs(cubeScaleDelta) > 0.000001) {
            const dt = clock.getDelta();
            const step = 1 - Math.exp(-cubeScaleSpeed * dt);
            originCube.scale.setScalar(originCube.scale.x + cubeScaleDelta * step);
        }
        if (Math.abs(camera.fov - targetFov) > 0.01) {
            camera.fov += (targetFov - camera.fov) * fovSpeed;
            camera.updateProjectionMatrix();
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
    if (!location.pathname.endsWith('/')) return;
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
    windowW = clamp(Math.max(2, rawW), 2, gridSize - 2) + 2;
    windowH = clamp(Math.max(2, rawH), 2, gridSize - 2 * (y / cellSize) - 4) + 2;

    if (!Number.isFinite(windowW)) windowW = Math.floor(Math.min(window.innerHeight, window.innerWidth) / cellSize / 2) * 2;
    if (!Number.isFinite(windowH)) windowH = Math.floor(Math.min(window.innerHeight, window.innerWidth) / cellSize / 2) * 2;

    // Drawing Entrance
    const entrance = document.querySelector('#entrance') || document.querySelector('.grid-container').appendChild(Object.assign(document.createElement('a'), { id: 'entrance' }));
    entrance.style.setProperty('--entrance-w', windowW);
    entrance.style.setProperty('--entrance-h', windowH);
    const glowMultiplier = 4 / Math.pow((windowW / 4 + windowH / 4), 2);
    if (windowH == 4 && windowW == 4) {
        Object.assign(entrance.style, { background: '#fff', boxShadow: `0 0 ${4 * glowMultiplier}rem #fff` });
        entrance.setAttribute('href', '/unlock');
        document.documentElement.style.setProperty('--e', '1');
    } else {
        Object.assign(entrance.style, { background: 'transparent', boxShadow: `0 0 ${4 * glowMultiplier}rem #fffa` });
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
    const ENTRY_PAGE = '/';
    const PROTECTED_PAGE = '/space';
    const API_URL = 'https://liminal-website-auth-v2.vercel.app/api/validate';

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


    // ----- GRID SETUP
    let paddingX, paddingY;
    unlockModule.style.display = 'grid';
    unlockModule.style.gap = '0';

    // ---- TYPOGRAPHY / GRID SIZING
    if (t?.style.lineHeight) t.style.removeProperty('line-height');

    const mincellSize = Math.max(24, 0.5 * parseFloat(getComputedStyle(t).fontSize));
    const baseViewportH = getViewportHeight();
    let dimensionH, dimensionW, cellSize, innerH, innerW, cells, total, codeOffsetX, codeOffsetY, moduleOffsetX, moduleOffsetY;
    let centersX, centersY, jitter, lastChar;
    let extraRows = 0; // rows temporarily re-added when keyboard shows

    function unlockGrid() {
        unlockModule.querySelectorAll('.cell').forEach(el => el.remove()); // clear previous cells if re-running    
        const viewportH = getViewportHeight();
        dimensionH = Math.max(12, Math.floor(viewportH / mincellSize / 2) * 2);
        dimensionW = Math.max(12, Math.floor(window.innerWidth / mincellSize / 2) * 2);
        cellSize = viewportH / dimensionH;

        inner?.style.setProperty('--cell-size', `${cellSize}px`);
        t.style.lineHeight = (cellSize * 2) + 'px';

        const deducted = phonePortrait ? 4 : 8;
        innerH = dimensionH - deducted + extraRows;
        if (innerH > dimensionH) innerH = dimensionH;
        innerW = dimensionW - (phonePortrait ? 2 : 4);
        total = innerH * innerW;


        // ---- GRID CALCULATION
        document.querySelector('.code')?.style && (document.querySelector('.code').style.top = (innerH / 2 - 1) * cellSize + 'px');


        unlockModule.style.gridTemplateColumns = `repeat(${innerW}, ${cellSize}px)`;
        unlockModule.style.gridAutoRows = `${cellSize}px`;

        unlockModule.style.width = (innerW * cellSize) + 'px';
        unlockModule.style.height = (innerH * cellSize) + 'px'; // keep matrix grid static

        /*cells = new Array(total);
        const frag = document.createDocumentFragment();
        for (let i = 0; i < total; i++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.textContent = '•';
            frag.appendChild(cell);
            cells[i] = cell;
        }
        unlockModule.appendChild(frag);*/


        paddingY = (getViewportHeight() - innerH * cellSize) / 2;
        paddingX = (window.innerWidth - innerW * cellSize) / 2;
        container.style.padding = `${paddingY}px ${paddingX}px`;

        codeOffsetX = window.innerWidth / 2 - document.querySelector('.code').clientWidth / 2;
        codeOffsetY = getViewportHeight() / 2 - document.querySelector('.code').clientHeight / 2;
        moduleOffsetX = window.innerWidth / 2 - document.querySelector('#unlock-module').clientWidth / 2;
        moduleOffsetY = getViewportHeight() / 2 - document.querySelector('#unlock-module').clientHeight / 2

        {
            const code = document.querySelector('.code');
            if (code) code.style.position = 'absolute';
            // ---- LINES: clear previous then place fresh
            container.querySelectorAll('.line-solid, .line-dashed').forEach(n => n.remove());


            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `left:${moduleOffsetX - 8}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `left:${moduleOffsetX}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `right:${moduleOffsetX}px;` }));
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-vertical', style: `right:${moduleOffsetX - 8}px;` }));

            // verticals
            if (code && !phonePortrait) {
                code.append(Object.assign(document.createElement('div'), {
                    className: 'line-dashed line-vertical',
                    style: `position:absolute;height:100dvh;top:${-codeOffsetY}px;left:0;`
                }));
                code.append(Object.assign(document.createElement('div'), {
                    className: 'line-dashed line-vertical',
                    style: `position:absolute;height:100dvh;top:${-codeOffsetY}px;right:0;`
                }));
            }
            // horizontals
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal', style: `top:${moduleOffsetY}px;` }));
            if (code) {
                code.append(Object.assign(document.createElement('div'), {
                    className: 'line-dashed line-horizontal',
                    style: `position:absolute;width:100vw;left:${-codeOffsetX}px;top:0;`
                }));
                code.append(Object.assign(document.createElement('div'), {
                    className: 'line-dashed line-horizontal',
                    style: `position:absolute;width:100vw;left:${-codeOffsetX}px;bottom:0;`
                }));
            }
            container.append(Object.assign(document.createElement('div'), { className: 'line-solid line-horizontal', style: `bottom:${paddingY}px;` }));
        }

        //initMatrixBuffers();

    }
    unlockGrid()


    /*function initMatrixBuffers() {
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
    }*/


    // =============== TEXT MATRIX ===============

    /*
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
        */

    // ===================== BACKGROUND VIDEOS ========================

    const videoContainer = document.getElementById('bg-video');
    if (videoContainer) {
        const videoFiles = [
            'dust/1.mp4',
            'dust/2.mp4',
            'dust/3.mp4'
        ];

        const videoFiles2 = [
            'depth/1.mp4',
            'depth/2.mp4',
            'depth/3.mp4'
        ];

        const picked = videoFiles[Math.floor(Math.random() * videoFiles.length)];
        const source = document.createElement('source');
        const src = new URL('./videos/' + picked, import.meta.url).href;
        source.src = src;
        source.type = 'video/mp4';
        videoContainer.appendChild(source);
    }

    // ===================== VALIDATION ========================

    document.getElementById('submit-btn')?.addEventListener('click', validateCode);

    const inputs = document.querySelectorAll('.digit');
    const submitBtn = document.getElementById('submit-btn');
    const message = document.getElementById('message');
    const clearInvalidState = () => {
        if (!submitBtn) return;
        if (submitBtn.classList.contains('invalid')) {
            submitBtn.classList.remove('invalid');
            submitBtn.textContent = 'Enter';
        }
    };
    const updateSubmitState = () => {
        if (!submitBtn) return;
        if (submitBtn.textContent === 'Validating') return;
        const lastFilled = inputs.length ? inputs[inputs.length - 1].value : '';
        submitBtn.disabled = !lastFilled;
        if (!lastFilled) clearInvalidState();
    };
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
            clearInvalidState();
            if (!input.value) { // disable if emptied
                updateSubmitState();
                return;
            }
            if (focusFirstEmptyBefore(i)) { updateSubmitState(); return; } // don't advance if earlier empty
            if (i < inputs.length - 1) inputs[i + 1].focus();
            updateSubmitState();
        });
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !input.value && i > 0) inputs[i - 1].focus();
            if (e.key === 'Enter') {
                if (submitBtn?.disabled) {
                    e.preventDefault();
                    return;
                }
                e.preventDefault();
                validateCode();
            }
            // If previous empty, redirect focus there (allow typing in current if it's the first empty)
            if (focusFirstEmptyBefore(i)) e.preventDefault();
        });
    });
    updateSubmitState();

    async function validateCode() {
        const code = Array.from(document.querySelectorAll('.digit')).map(i => i.value).join('');
        const button = submitBtn;

        if (!code || code.length !== inputs.length) {
            message.innerHTML = '<span class="warning-message">Please enter a 4-digit code</span>';
            updateSubmitState();
            return;
        }

        clearInvalidState();
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
                document.querySelector('#bg-video').style.opacity = '0';
                message.innerHTML = `<span class="transition">Crossing the chasm...</span>`;

                //Set state management. Only uncomment after states are done
                //if(!localStorage.getItem(code)) {
                localStorage.setItem('userId', code);
                localStorage.setItem(code, 0);
                //}

                // Start dissolve but don't block navigation on it
                const MAX_WAIT = 900;
                Promise.race([
                    //textMatrixControl?.dissolve?.({ duration: 700, spread: 400 }) ?? Promise.resolve(),
                    new Promise(r => setTimeout(r, MAX_WAIT))
                ]).then(() => barba.go(PROTECTED_PAGE));
            } else {
                if (button) {
                    button.textContent = 'invalid';
                    button.classList.add('invalid');
                    button.disabled = true;
                }

                // Immediately run wrong-input feedback
                (() => {
                    const duration = 200;
                    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)');

                    // --- Block the matrix render temporarily ---
                    /*matrixBlocked = true;
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
                    }, duration);*/
                })();
            }

        } catch (err) {
            clearTimeout(timeoutId);
            message.innerHTML = '<span style="color:red;">Connection error. Try again.</span>';
        } finally {
            if (button && !button.classList.contains('invalid')) {
                button.textContent = 'Enter';
                updateSubmitState();
            }
        }
    }

    // Show page
    document.documentElement.style.visibility = 'visible';
    requestAnimationFrame(() => { inputs[0]?.focus?.(); });
    unlockInit = true;
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            unlockGrid();
            textMatrixControl?.update();
        }, 50);
    });

    // Keyboard show/hide watcher: when keyboard shows, add back the same number of deducted rows; revert when it hides.
    if (phonePortrait) {
        const applyKeyboardRows = (visible) => {
            const deducted = phonePortrait ? 4 : 8;
            const added = visible ? deducted : 0;
            if (added === extraRows) return;
            extraRows = added;
            unlockGrid();
            textMatrixControl?.update();
        };
        const keyboardThreshold = 0.9; // viewport shrinks below this ratio => keyboard likely shown
        const checkKeyboard = () => {
            const h = window.visualViewport?.height || window.innerHeight;
            const visible = h < baseViewportH * keyboardThreshold;
            applyKeyboardRows(visible);
        };
        window.visualViewport?.addEventListener('resize', checkKeyboard);
        window.addEventListener('focusin', checkKeyboard);
        window.addEventListener('focusout', checkKeyboard);
    }
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
    function logout() { localStorage.clear(); barba.go('/'); }
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
    camera.position.set(phonePortrait ? -200 : -250, 0, 0);
    scene.add(camera);

    // GLTF Loader
    const loader = new GLTFLoader();
    const preloadAssets = () => {
        const urls = new Set();
        ['./element05.glb', './element07.glb', './element08.glb'].forEach(p => {
            urls.add(new URL(p, import.meta.url).href);
        });
        ['./textures/sphereNormal.jpg', './textures/sphereRoughness.jpg', './textures/sphereColor.png'].forEach(p => {
            urls.add(new URL(p, import.meta.url).href);
        });
        document.querySelectorAll('#portfolio-toggle [data-user]').forEach(btn => {
            const id = btn.dataset.user;
            if (id) urls.add(new URL(`./logo/${id}.glb`, import.meta.url).href);
        });
        document.querySelectorAll('#profile-name [data-user]').forEach(span => {
            const id = span.dataset.user;
            if (id) urls.add(new URL(`./videos/${id}.mp4`, import.meta.url).href);
        });
        urls.forEach(url => {
            fetch(url, { mode: 'no-cors' }).catch(() => { /* swallow prefetch errors */ });
        });
    };
    preloadAssets();

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
                cubeThesis.position.set(-5 * layoutScale, 80 * screenRatio, 5 * layoutScale);
                cubeWhat.position.set(-5 * layoutScale, 45 * screenRatio, 0 * layoutScale);
                cubeUs.position.set(5 * layoutScale, 5 * screenRatio, -5 * layoutScale);
                cubePortfolio.position.set(0 * layoutScale, -25 * screenRatio, -5 * layoutScale);
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

        if (cube) {
            const targetScale = active ? 1.25 : 1;
            gsap.to(cube.scale, { x: targetScale, y: targetScale, z: targetScale, duration: 0.25, ease: 'power2.out' });
        }
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
        document.querySelector('#welcome')?.remove();
        document.querySelector('.scroller')?.remove();
        document.querySelector('#logo-holder').style.opacity = 0;
        if (localStorage.getItem(key) < 1) localStorage.setItem(key, 1);

        const allCubes = [cubeThesis, cubeWhat, cubeUs, cubePortfolio];
        // Reset any hover-driven transforms/colors before focusing
        allCubes.forEach(c => {
            gsap.killTweensOf(c.scale);
            gsap.set(c.scale, { x: 1, y: 1, z: 1 });
            if (c.material?.userData?.baseColor) {
                c.material.color.copy(c.material.userData.baseColor);
            }
        });
        allCubes.forEach(c => {
            if (!c.material.userData?.isCloned) {
                c.material = c.material.clone();
                c.material.transparent = true;
                c.material.userData.isCloned = true;
            }
            const opacityTarget = c === cube ? 1 : 0;
            gsap.to(c.material, { duration: 0.5, opacity: opacityTarget, ease: 'power2.out' });
        });
        gsap.to('#logout-btn', {
            autoAlpha: 0,
            duration: 3
        }, 0);
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
            className: 'welcome-scroller scroller'
        });
        scroller.style.scrollSnapType = 'unset';
        scroller.style.pointerEvents = 'none';



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

            // Build Cue (pure CSS loader)
            const host = document.querySelector('#welcome .scroll-cue-container');
            if (host) {
                host.innerHTML = '';
                host.appendChild(Object.assign(document.createElement('div'), { className: 'cue' }));
                host.style.opacity = '0';
            }

            const tl = gsap.timeline({
                defaults: { ease: 'power2.out' },
                onComplete: () => {
                    resolve();
                }
            });
            tl.set('#logout-btn', { autoAlpha: 0, zIndex: -1 });

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
                        yPercent: -10,
                        duration: 1,
                        ease: 'power2.out',
                        stagger: 0.4
                    }, '>');
                }
                if (host) {
                    tl.to(host, { autoAlpha: 1, duration: 0.6 }, '>');
                    tl.add(() => {
                        if (phonePortrait) {
                            gsap.to(host, { autoAlpha: 0, duration: 0.4, delay: 1.5 });
                        }
                    }, '>');
                }
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
                if (host) {
                    tl.to(host, { autoAlpha: 1, duration: 0.6 }, '>');
                    tl.add(() => {
                        if (phonePortrait) {
                            gsap.to(host, { autoAlpha: 0, duration: 0.4, delay: 2.5 });
                        }
                    }, '>');
                }
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
            }

            // TIMELINE
            tl.add(() => {

                const finishWelcome = () => {
                    if (scrubTl.data === 'done') return;
                    scrubTl.data = 'done';

                    const welcome = document.querySelector('#welcome');
                    const scrollerEl = document.querySelector('.scroller');
                    ScrollTrigger.getById?.('welcomeScrub')?.kill(false);
                    gsap.timeline().add(() => { welcome?.remove(); scrollerEl?.remove(); ScrollTrigger.refresh(); });
                    localStorage.setItem(localStorage.getItem('userId'), 1);
                };

                const scrubTl = gsap.timeline({
                    defaults: { ease: 'power2.out' },
                    scrollTrigger: {
                        id: 'welcomeScrub',
                        trigger: '#segment-2',
                        scroller,
                        start: 'top bottom',
                        end: 'bottom bottom',
                        scrub: true,
                        invalidateOnRefresh: true,

                        onLeave: finishWelcome,
                        onUpdate(self) {
                            if (self.progress >= 0.8) finishWelcome();
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
                scrubTl.to('#logout-btn', { autoAlpha: 0.5, zIndex: 9 }, '>');
                scrubTl.to('.scroll-hint', { autoAlpha: 0, duration: 1 }, '<');
            }, '<');
        })
    }

    else {
        const root = document.querySelector('[data-barba="container"][data-barba-namespace="space"]');
        if (!root) return;

        root.querySelector('#welcome').remove();

        gsap.set(camera.position, { x: 0, y: 0, z: 150 });
        gsap.set('.scroll-hint', { autoAlpha: 0 }, '>');
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
        if (!document.querySelector('body>.backBtn')) {
            document.body.insertAdjacentHTML('beforeend', "<div class='backBtn backBtn-thesis' style='opacity:0'><i></i><span>Continue</span></div>");
        }
        document.querySelector('#welcome')?.remove();
        document.querySelector('.scroller')?.remove();
        document.querySelector('#logo-holder').style.opacity = 0;

        // THREE JS FUNCTION
        function createThesisScene(canvas) {
            const params = {
                threshold: 0.0,
                strength: 1.6,
                radius: 1.0,
                exposure: 1.0
            };

            const scene = new THREE.Scene();
            // scene.add(new THREE.AxesHelper(10));
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
            const scaleFactor = phonePortrait ? 0.8 : window.innerWidth / window.innerHeight;

            const coreSize = 1 * scaleFactor;
            const orbRepeatSize = phonePortrait ? 0.4 * scaleFactor : 0.5 * scaleFactor;
            const orbScientistSize = phonePortrait ? 0.1 * scaleFactor : 0.25 * scaleFactor;

            const coreGeometry = new THREE.SphereGeometry(coreSize, 64, 64);
            const coreMaterial = new THREE.MeshStandardMaterial({
                color: new THREE.Color(0x000000),
                metalness: 0.5,
                roughness: 0.9,
                emissive: new THREE.Color(0x222222),
                emissiveIntensity: 1.2
            });
            const core = new THREE.Mesh(coreGeometry, coreMaterial);
            core.name = 'core';
            core.layers.enable(BLOOM_SCENE);
            scene.add(core);

            const orbLight = new THREE.PointLight(0xffffff, 50, 0, 2);
            orbLight.position.set(0, 0, 0);
            orbLight.castShadow = true;
            orbLight.shadow.mapSize.set(1024, 1024);
            orbLight.shadow.bias = -0.0005;
            core.add(orbLight);

            const orbRepeatMaterial = coreMaterial.clone();
            orbRepeatMaterial.emissive = new THREE.Color(0x222222);
            orbRepeatMaterial.emissiveIntensity = 1.6;
            orbRepeatMaterial.transparent = true;
            const orbRepeat = new THREE.Mesh(new THREE.SphereGeometry(orbRepeatSize, 64, 64), orbRepeatMaterial);
            orbRepeat.name = 'orbRepeat';
            orbRepeat.layers.enable(BLOOM_SCENE);
            orbRepeat.position.set(-10, 10, -10);
            scene.add(orbRepeat);

            const orbScientistMaterial = coreMaterial.clone();
            orbScientistMaterial.emissive = new THREE.Color(0x222222);
            orbScientistMaterial.emissiveIntensity = 1.6;
            orbScientistMaterial.transparent = true;
            const orbScientist = new THREE.Mesh(new THREE.SphereGeometry(orbScientistSize, 64, 64), orbScientistMaterial);
            orbScientist.name = 'orbScientist';
            orbScientist.layers.enable(BLOOM_SCENE);
            orbScientist.position.set(10, 30, 15);
            scene.add(orbScientist);

            const thesisLabelRenderer = new CSS2DRenderer();
            thesisLabelRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
            thesisLabelRenderer.domElement.id = 'thesis-label-container';
            thesisLabelRenderer.domElement.style.position = 'absolute';
            thesisLabelRenderer.domElement.style.inset = '0';
            thesisLabelRenderer.domElement.style.pointerEvents = 'none';
            document.body.appendChild(thesisLabelRenderer.domElement);

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
            cone.position.set(0, phonePortrait ? 4 : 8, 10);
            cone.rotation.set(
                THREE.MathUtils.degToRad(0),
                THREE.MathUtils.degToRad(90),
                THREE.MathUtils.degToRad(90)
            );
            if (phonePortrait) cone.scale.setScalar(0.5);

            const cylinderGeometry = new THREE.CylinderGeometry(1.4, 1.4, 3, 64);
            const cylinderMaterial = coneMaterial.clone();
            cylinderMaterial.color = new THREE.Color(0x222222);
            const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial);
            cylinder.castShadow = true;
            cylinder.receiveShadow = true;
            cylinder.position.set(0, phonePortrait ? 8 : 16, 10);
            cylinder.rotation.set(
                THREE.MathUtils.degToRad(5),
                THREE.MathUtils.degToRad(90),
                THREE.MathUtils.degToRad(90)
            );
            if (phonePortrait) cylinder.scale.setScalar(0.5);
            scene.add(cone, cylinder);

            const coneOverlay = core.clone();
            coneOverlay.material = core.material.clone();
            coneOverlay.material.transparent = true;
            coneOverlay.material.opacity = 0;
            coneOverlay.position.copy(cone.position);
            coneOverlay.position.add(new THREE.Vector3(0, 0, -10));
            scene.add(coneOverlay);

            const cylinderOverlay = core.clone();
            cylinderOverlay.material = cylinderOverlay.material.clone();
            cylinderOverlay.material.transparent = true;
            cylinderOverlay.material.opacity = 0;
            cylinderOverlay.position.copy(cylinder.position);
            cylinderOverlay.position.add(new THREE.Vector3(0, 0, -10));
            scene.add(cylinderOverlay);

            const orbLabels = [];
            const thesisConnectorMaterial = new THREE.LineDashedMaterial({
                color: 0xffffff,
                scale: 1,
                dashSize: 0.05,
                gapSize: 0.025,
                transparent: true,
                opacity: 0.5
            });
            const attachOrbLabel = (target, text, offset = [2, 1.2, 0], anchor = [0, 0.5]) => {
                const targetName = target?.name || 'target';
                const div = Object.assign(document.createElement('div'), {
                    className: `label label-thesis`,
                    id: `label-${targetName}`,
                    innerHTML: `<span>${text}</span><span class='content'></span>`
                });
                const label = new CSS2DObject(div);
                label.center.set(...anchor);
                scene.add(label);

                const geometry = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
                const line = new THREE.Line(geometry, thesisConnectorMaterial);
                line.name = `thesis-connector-${targetName}`;
                line.userData.thesisConnector = true;
                line.userData.excludeBloom = true;
                target.add(line);

                const entry = {
                    target,
                    label,
                    element: div,
                    line,
                    positions: geometry.attributes.position,
                    offset: new THREE.Vector3().fromArray(offset)
                };
                orbLabels.push(entry);
                return entry;
            };

            let coreLabelEntry, repeatLabelEntry, scientistLabelEntry;
            if (phonePortrait) {
                coreLabelEntry = attachOrbLabel(core, 'Topflight Founder', [1 * (coreSize + 0.25), -1 * (coreSize + 0.25), 0], [0, 1]);
                repeatLabelEntry = attachOrbLabel(orbRepeat, 'Repeat Founder', [1 * (orbRepeatSize + 0.45), -1 * (orbRepeatSize + 0.45), 0], [0, 1]);
                scientistLabelEntry = attachOrbLabel(orbScientist, 'Entrepreneurial Scientist', [1 * (orbScientistSize + 0.35), -1 * (orbScientistSize + 0.35), 0], [0, 1]);
            } else {
                coreLabelEntry = attachOrbLabel(core, 'Topflight Founder', [-1 * (coreSize - 0.5), -1 * (coreSize + 0.05), 0], [1, 1]);
                repeatLabelEntry = attachOrbLabel(orbRepeat, 'Repeat Founder', [-1 * (orbRepeatSize - 0.25), -1 * (orbRepeatSize + 0.5), 0], [1, 1]);
                scientistLabelEntry = attachOrbLabel(orbScientist, 'Entrepreneurial Scientist', [-1 * (orbScientistSize + 0.15), -1 * (orbScientistSize + 0.75), 0], [1, 1]);
            }

            const coreContent = coreLabelEntry.element.querySelector('.content');
            const repeatContent = repeatLabelEntry.element.querySelector('.content');
            const scientistContent = scientistLabelEntry.element.querySelector('.content');
            if (coreContent) coreContent.textContent = 'Founders with >$1B in exits';
            if (repeatContent) repeatContent.textContent = 'Founders who have raised >$5M in previous startup(s)';
            if (scientistContent) scientistContent.textContent = 'Founders working on breakthrough technologies';
            thesisLabelRenderer.render(scene, camera); // ensure labels exist in DOM before timelines

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
            const tempWorld = new THREE.Vector3();
            const tempEnd = new THREE.Vector3();
            const tempDir = new THREE.Vector3();
            const tempScale = new THREE.Vector3();
            const tempBox = new THREE.Box3();
            const tempSphere = new THREE.Sphere();
            const tempLabel = new THREE.Vector3();

            const getTargetRadius = (target) => {
                let radius = target.geometry?.boundingSphere?.radius;
                if (!radius && target.geometry?.computeBoundingSphere) {
                    target.geometry.computeBoundingSphere();
                    radius = target.geometry.boundingSphere?.radius;
                }
                if (!radius) {
                    tempBox.setFromObject(target);
                    tempBox.getBoundingSphere(tempSphere);
                    radius = tempSphere.radius || 1;
                }
                target.getWorldScale(tempScale);
                const maxScale = Math.max(tempScale.x, tempScale.y, tempScale.z, 1);
                return radius * maxScale;
            };

            function resize() {
                const width = canvas.clientWidth;
                const height = Math.max(1, canvas.clientHeight);
                renderer.setSize(width, height, false);
                const aspect = width / height;
                camera.aspect = aspect;
                camera.updateProjectionMatrix();
                bloomComposer.setSize(width, height);
                finalComposer.setSize(width, height);
                thesisLabelRenderer.setSize(width, height);
            }

            window.addEventListener('resize', resize);
            resize();

            const getSurfaceOffset = (target, endWorld) => {
                target.getWorldPosition(tempWorld);
                tempDir.copy(endWorld).sub(tempWorld);
                const len = tempDir.length() || 1;
                let radius = target.geometry?.boundingSphere?.radius;
                if (!radius && target.geometry?.computeBoundingSphere) {
                    target.geometry.computeBoundingSphere();
                    radius = target.geometry.boundingSphere?.radius;
                }
                if (!radius) {
                    tempBox.setFromObject(target);
                    tempBox.getBoundingSphere(tempSphere);
                    radius = tempSphere.radius || 1;
                }
                target.getWorldScale(tempScale);
                const maxScale = Math.max(tempScale.x, tempScale.y, tempScale.z, 1);
                const surface = (radius || 1) * maxScale;
                tempDir.multiplyScalar(surface / len);
                return tempWorld.clone().add(tempDir);
            };

            const tempHiddenLines = [];
            function renderFrame() {
                tempHiddenLines.length = 0;
                scene.traverse(obj => {
                    if (obj.isLine && obj.userData?.excludeBloom) {
                        obj.visible = false;
                        tempHiddenLines.push(obj);
                    }
                });
                orbLabels.forEach(({ target, label, line, positions, offset }) => {
                    // position label relative to target
                    target.getWorldPosition(tempWorld);
                    tempEnd.copy(tempWorld).add(offset);
                    label.position.copy(tempEnd);

                    // start at label anchor
                    label.getWorldPosition(tempLabel);

                    // end on orb surface along line toward orb center
                    const radius = getSurfaceOffset(target, tempLabel).distanceTo(tempWorld);
                    tempDir.copy(tempLabel).sub(tempWorld);
                    const len = tempDir.length() || 1;
                    const surfacePoint = tempWorld.clone().add(tempDir.multiplyScalar(radius / len));

                    const startLocal = target.worldToLocal(tempLabel.clone());
                    const endLocal = target.worldToLocal(surfacePoint.clone());
                    positions.setXYZ(0, startLocal.x, startLocal.y, startLocal.z);
                    positions.setXYZ(1, endLocal.x, endLocal.y, endLocal.z);
                    positions.needsUpdate = true;
                    line.computeLineDistances();
                });
                scene.traverse(darkenNonBloomed);
                bloomComposer.render();
                scene.traverse(restoreMaterial);
                tempHiddenLines.forEach(l => { l.visible = true; });
                finalComposer.render();
                thesisLabelRenderer.render(scene, camera);
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
                labelRenderer: thesisLabelRenderer,
                labels: {
                    core: coreLabelEntry?.element,
                    orbRepeat: repeatLabelEntry?.element,
                    orbScientist: scientistLabelEntry?.element
                },
                objects: { core, orbRepeat, orbScientist, leftShell, rightShell, orangeLight, pointLight, cone, cylinder, coneOverlay, cylinderOverlay },
                dispose() {
                    stop();
                    window.removeEventListener('resize', resize);
                    thesisLabelRenderer.domElement?.remove();
                    renderer.dispose();
                    bloomRenderTarget.dispose();
                    finalRenderTarget.dispose();
                    coreGeometry.dispose();
                    [leftShell, rightShell].forEach(mesh => mesh.geometry.dispose());
                    coreMaterial.dispose();
                    orbRepeatMaterial.dispose();
                    orbScientistMaterial.dispose();
                    shellMaterial.dispose();
                    coneGeometry.dispose();
                    coneMaterial.dispose();
                    cylinderGeometry.dispose();
                    cylinderMaterial.dispose();
                    orbLabels.forEach(({ line }) => {
                        line.geometry?.dispose?.();
                    });
                    thesisConnectorMaterial.dispose();
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

        const thesisCanvas = Object.assign(document.createElement('canvas'), { id: 'thesis-canvas' });
        document.body.appendChild(thesisCanvas);

        const thesis3D = canvas ? createThesisScene(thesisCanvas) : null;

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');

        //creating scroller
        const scroller = Object.assign(document.createElement('div'), {
            className: 'thesis-scroller scroller'
        });

        // ============================== TIMELINE

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        const connectors = [];
        thesis3D.scene.traverse(o => {
            if (o.isLine && o.userData?.thesisConnector) {
                // optional: give each its own material so fades are independent
                o.material = o.material.clone();
                connectors.push(o);
            }
        });
        const [coreLine, repeatLine, scientistLine] = connectors;
        gsap.set(coreLine.material, { opacity: 0 });
        gsap.set(repeatLine.material, { opacity: 0 });
        gsap.set(scientistLine.material, { opacity: 0 });

        // Set initial states
        tl.set('#thesis-title', { fontSize: phonePortrait ? '4rem' : '6rem', translateY: '2rem', autoAlpha: 0, top: phonePortrait ? 'calc(100dvh - 8rem)' : 'calc(100dvh - 12rem)' });
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
            tl.to('.scroll-hint', {
                autoAlpha: 1,
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
            appendSegments(6);

            window.scrollTo(0, 0);
            scroller.scrollTop = 0;
            ScrollTrigger.refresh();
        }, '>')

        // ========== SCROLL TRIGGER

        const cam = thesis3D?.camera;
        const orbRepeat = thesis3D?.objects?.orbRepeat;
        const orbScientist = thesis3D?.objects?.orbScientist;
        const leftShell = thesis3D?.objects?.leftShell;
        const rightShell = thesis3D?.objects?.rightShell;
        const orangeLight = thesis3D?.objects?.orangeLight;
        const cone = thesis3D?.objects?.cone;
        const cylinder = thesis3D?.objects?.cylinder;
        const coneOverlay = thesis3D?.objects?.coneOverlay;
        const cylinderOverlay = thesis3D?.objects?.cylinderOverlay;

        const labelCoreEl = document.getElementById('label-core');
        const labelRepeatEl = document.getElementById('label-orbRepeat');
        const labelScientistEl = document.getElementById('label-orbScientist');


        tl.add(() => { // DNA Title timeline       

            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-2',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    snap: {
                        snapTo: [0, 1],
                        duration: { min: 0.2, max: 0.6 },
                        ease: 'power1.inOut'
                    }
                }
            });

            segmentTl.to('#liminal-title', {
                translateY: '-10rem', autoAlpha: 0, duration: 0.2
            }, 0);
            segmentTl.to('#liminal-phonetic', {
                translateY: '-10rem', autoAlpha: 0, duration: 0.2
            }, '<+0.05');
            segmentTl.to('#page-thesis #line', {
                autoAlpha: 0, duration: 0.1, duration: 0.05
            }, '<+0.05')
            segmentTl.to('#liminal-def', {
                translateY: '-10rem', autoAlpha: 0, duration: 0.2
            }, '>');
            segmentTl.to('#liminal-desc', {
                translateY: '-20rem', autoAlpha: 0, duration: 0.2
            }, '<+0.05');
            segmentTl.to('#thesis-title', {
                translateY: '0rem', autoAlpha: 1
            }, '<+0.2');
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
                    snap: {
                        snapTo: 1,
                        delay: 0.1,
                        duration: { min: 0.2, max: 0.6 },
                        ease: 'power1.inOut'
                    }
                }
            });
            segmentTl.to('#thesis-title', {
                translateY: '-2em', autoAlpha: 0
            }, 0);
            segmentTl.set('#thesis-title', {
                'font-family': 'Space Mono', top: '8rem', bottom: 'unset', fontSize: phonePortrait ? '1.25rem' : '2rem', translateY: 0
            }, '>');
            segmentTl.to('#thesis-title', {
                autoAlpha: 1, top: '4rem', bottom: 'unset'
            }, '>');
            segmentTl.fromTo('#who-what', {
                translateY: '5rem', autoAlpha: 0
            }, {
                translateY: 0, autoAlpha: 1, duration: 0.2
            }, '<+0.3');
            segmentTl.to('#who-what-content', {
                autoAlpha: 1, duration: 0.2
            }, '>');
            const scaleFactor = phonePortrait ? 1 : window.innerWidth / window.innerHeight;
            if (labelCoreEl) segmentTl.to(labelCoreEl, { opacity: 1, duration: 0.2 }, '>');
            segmentTl.fromTo(coreLine.material, { opacity: 0 }, { opacity: 0.5, duration: 0.2, ease: 'power1.out' }, '<');
            if (labelRepeatEl) segmentTl.to(labelRepeatEl, { opacity: 1, duration: 0.2 }, '<+0.1');
            segmentTl.fromTo(repeatLine.material, { opacity: 0 }, { opacity: 0.5, duration: 0.2, ease: 'power1.out' }, '<');
            if (labelScientistEl) segmentTl.to(labelScientistEl, { opacity: 1, duration: 0.2 }, '<+0.1');
            segmentTl.fromTo(scientistLine.material, { opacity: 0 }, { opacity: 0.5, duration: 0.2, ease: 'power1.out' }, '<');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: phonePortrait ? THREE.MathUtils.degToRad(270) : THREE.MathUtils.degToRad(135),
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: phonePortrait ? 0 : -1.625 * scaleFactor,
                    y: phonePortrait ? -2.5 * scaleFactor : 0.15 * scaleFactor,
                    z: phonePortrait ? 50 : 30,
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
                segmentTl.to(orbRepeat.position, {
                    x: phonePortrait ? -1.75 * scaleFactor : -1.825 * scaleFactor,
                    y: phonePortrait ? -0.5 * scaleFactor : 1.1 * scaleFactor,
                    z: 0,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orbScientist.position, {
                    x: phonePortrait ? -3.25 * scaleFactor : -3 * scaleFactor,
                    y: phonePortrait ? -1 * scaleFactor : 1.85 * scaleFactor,
                    z: 0,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight.position, {
                    x: -20,
                    y: -20,
                    z: -50,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orangeLight, {
                    intensity: 100000,
                    ease: 'power4.in'
                }, '<');
            }
        });

        tl.add(() => { // Ultimate Co-Founder timeline            
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-4',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    snap: {
                        snapTo: [0, 1],
                        duration: { min: 0.2, max: 0.6 },
                        ease: 'power1.inOut'
                    }
                }
            });
            segmentTl.to([labelCoreEl, labelRepeatEl, labelScientistEl], { opacity: 0, duration: 0.1 }, 0);
            segmentTl.to(coreLine.material, { opacity: 0, duration: 0.1 }, 0);
            segmentTl.to(repeatLine.material, { opacity: 0, duration: 0.1 }, 0);
            segmentTl.to(scientistLine.material, { opacity: 0, duration: 0.1 }, 0);
            segmentTl.to('#thesis-title', {
                translateY: '-1em', autoAlpha: 0
            }, 0);
            segmentTl.to('#who-what', {
                translateY: '-2rem', autoAlpha: 0
            }, '>');
            segmentTl.to('#who-what-content', {
                translateY: '-2rem', autoAlpha: 0
            }, 0.1);
            segmentTl.fromTo('#unlock-potential', {
                translateY: '2rem', autoAlpha: 0
            }, {
                translateY: 0, autoAlpha: 1
            }, 0);
            segmentTl.fromTo('#unlock-potential-content', {
                translateY: '2rem', autoAlpha: 0
            }, {
                translateY: 0, autoAlpha: 1
            }, '<+0.2');
            if (cam && leftShell && rightShell) {
                segmentTl.to(cam.rotation, {
                    z: phonePortrait ? THREE.MathUtils.degToRad(450) : THREE.MathUtils.degToRad(415),
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, 0);
                segmentTl.to(cam.position, {
                    x: phonePortrait ? -0.2 : -0.4, 
                    y: phonePortrait ? 0.2 : 1, 
                    z: phonePortrait ? 8 : 10,
                    ease: 'power2.out',
                    onUpdate: () => cam.updateProjectionMatrix()
                }, '<');
                segmentTl.to(orbRepeat.position, {
                    z: -50,
                    ease: 'power2.out'
                }, '<');
                segmentTl.to(orbScientist.position, {
                    x: 0, y: 0, z: 30,
                    ease: 'power2.out'
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
                segmentTl.to(orbScientist.material, { opacity: 0, duration: 0.1 }, '>');
                segmentTl.to(orbRepeat.material, { opacity: 0, duration: 0.1 }, '<');
            }
        });

        tl.add(() => { // Back the Founder timeline 
            const computeCamXForWhitespace = () => {
                const content = document.querySelector('#whitespaces-content');
                const viewportH = window.innerHeight || document.documentElement.clientHeight || 1;
                if (!content) return -10;
                const rect = content.getBoundingClientRect();
                const bottom = rect.top + rect.height;
                const available = Math.max(0, viewportH - bottom - (4 * 16));
                const center = rect.top + rect.height + available / 2;
                const ratio = Math.min(Math.max(center / viewportH, 0), 1);
                return 10 - 20 * ratio; // 10 => top, -10 => bottom
            };

            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-5',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    snap: {
                        snapTo: [0, 1],
                        duration: { min: 0.2, max: 0.6 },
                        ease: 'power1.inOut'
                    }
                }
            });
            segmentTl.to('.scroll-hint', {
                autoAlpha: 0, translateY: '-2em'
            });
            segmentTl.to('#unlock-potential', {
                translateY: '-2rem', autoAlpha: 0
            }, '<');
            segmentTl.to('#unlock-potential-content', {
                translateY: '-2rem', autoAlpha: 0
            }, '<+0.1');
            segmentTl.fromTo('#whitespaces', {
                translateY: '5rem', autoAlpha: 0
            }, {
                translateY: '0', autoAlpha: 1
            }, 0);
            segmentTl.fromTo('#whitespaces-content', {
                translateY: '5rem', autoAlpha: 0
            }, {
                translateY: '0', autoAlpha: 1
            }, '<+0.1');
            segmentTl.fromTo('.backBtn-thesis', {
                translateY: '2rem', autoAlpha: 0
            }, {
                translateY: 0, autoAlpha: 1
            }, 0)

            segmentTl.to(cam.rotation, {
                z: THREE.MathUtils.degToRad(450),
                ease: 'power4.out',
                onUpdate: () => cam.updateProjectionMatrix()
            }, 0);
            segmentTl.to(cam.position, {
                x: () => computeCamXForWhitespace(), y: phonePortrait? 4 : 8, z: 110,
                ease: 'power4.out',
                onUpdate: () => cam.updateProjectionMatrix()
            }, '<');

            tl.add(() => {
                document.querySelector('.backBtn-thesis').addEventListener('click', (e) => back(1, e, thesis3D), { once: true });
            });
        });

        tl.add(() => { // Back the Founder objects timeline
            const nestedTl = gsap.timeline({ paused: true });
            nestedTl.add(() => {
                console.log(coneOverlay.material.opacity);
            }, 0)
            nestedTl.set(coneOverlay.material, { opacity: 0 }, 0);
            nestedTl.set(cylinderOverlay.material, { opacity: 0 }, 0);
            nestedTl.to(cone.rotation, {
                y: THREE.MathUtils.degToRad(270), ease: 'power4.inOut', duration: 1.2
            }, '>');
            nestedTl.to(cone.position, {
                z: -2, 
                ease: 'power4.inOut', duration: 1.2
            }, '<');
            nestedTl.to(cylinder.rotation, {
                y: THREE.MathUtils.degToRad(270), ease: 'power4.inOut', duration: 1.2
            }, '<+0.1');
            nestedTl.to(cylinder.position, {
                x: 0,
                z: -2, ease: 'power4.inOut', duration: 1.2
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

            const objectsTlForward = gsap.timeline({ paused: true });
            objectsTlForward.to(cone.position, { z: -2, duration: 0.1 }, 0);
            objectsTlForward.to(cone.material, { opacity: 1, duration: 0.1 }, '<');
            objectsTlForward.fromTo(cone.rotation, { y: THREE.MathUtils.degToRad(-60) }, {
                y: THREE.MathUtils.degToRad(0), ease: 'power4.inOut', duration: 0.1
            }, '<');
            objectsTlForward.to(cylinder.position, { z: -2, duration: 0.1 }, 0.05);
            objectsTlForward.to(cylinder.material, { opacity: 1, duration: 0.1 }, '<');
            objectsTlForward.fromTo(cylinder.rotation, { y: THREE.MathUtils.degToRad(-60) }, {
                y: THREE.MathUtils.degToRad(0), ease: 'power4.inOut', duration: 0.1
            }, '<');
            const objectsTlBackward = gsap.timeline({ paused: true });
            objectsTlBackward.to(coneOverlay.material, { opacity: 0, duration: 0.1 }, '<');
            objectsTlBackward.to(cylinderOverlay.material, { opacity: 0, duration: 0.1 }, '<');

            let usingBackward = false;
            objectsTlForward.eventCallback('onStart', () => {
                nestedTl.pause(0).progress(0);
            });
            objectsTlForward.eventCallback('onComplete', () => {
                nestedTl.play(0);
            });

            ScrollTrigger.create({
                trigger: '#segment-5',
                scroller,
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true,
                invalidateOnRefresh: true,
                snap: {
                    snapTo: [0, 1],
                    duration: { min: 0.2, max: 0.6 },
                    ease: 'power1.inOut'
                },
                onUpdate: (self) => {
                    const fProg = Math.min(1, Math.max(0, self.progress));
                    const bProg = 1 - fProg;
                    if (!usingBackward) {
                        objectsTlForward.progress(fProg);
                        if (self.direction > 0 && objectsTlForward.progress() >= 1) {
                            usingBackward = true;
                            objectsTlForward.progress(1); // keep forward timeline pinned once completed
                            objectsTlBackward.progress(bProg);
                        }
                    } else {
                        objectsTlBackward.progress(bProg);
                        objectsTlForward.progress(1); // prevent forward timeline from rewinding while backward is active
                        // if (self.direction < 0 && objectsTlBackward.progress() >= 1) {
                        //     usingBackward = false;
                        //     objectsTlForward.progress(fProg);
                        // }
                    }
                }
            });

        });

        tl.add(() => { // Exit timeline
            let backCalled = false;
            const triggerBack = () => {
                if (backCalled) return;
                backCalled = true;
                const target = page?.querySelector('.backBtn') ?? page;
                back(1, { currentTarget: target }, thesis3D);
            };
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-6',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    snap: {
                        snapTo: [0, 1],
                        duration: { min: 0.2, max: 0.6 },
                        ease: 'power1.inOut'
                    },
                    onLeave: triggerBack
                }
            });
            segmentTl.to('.backBtn-thesis i', {
                width: '100%', background: '#fff8', duration: 1
            }, 0);
            segmentTl.to('#page-thesis', {
                scale: 0, autoAlpha: 0, ease: 'power4.in', duration: 0.8
            }, '<');
            segmentTl.to('canvas#thesis-canvas', {
                scale: 0.5, autoAlpha: 0, ease: 'power4.in', duration: 0.8
            }, '<');
        });
    };

    // ============================ WHAT WE ARE

    function what() {
        const page = document.querySelector('#page-what');
        if (!document.querySelector('body>.backBtn')) {
            document.body.insertAdjacentHTML('beforeend', "<div class='backBtn backBtn-what' style='opacity:0'><i></i><span>Continue</span></div>");
        }


        const sectionSyncState = { suppress: false, target: null };
        let canInteract = false;
        const isSectionContainerVisible = () => {
            const container = document.querySelector('#page-what>.section-container');
            if (!container) return false;
            const style = getComputedStyle(container);
            return style.visibility !== 'hidden' && style.display !== 'none' && parseFloat(style.opacity || '0') > 0.01;
        };
        const setScrollerInteractive = () => {
            canInteract = isSectionContainerVisible();
            if (!scroller) return;
            scroller.style.pointerEvents = 'auto'; // keep scroll working
            scroller.style.cursor = canInteract ? 'pointer' : 'default';
        };

        const setSectionFromSegment = (idx, { immediate = false } = {}) => {
            const sections = Array.from(document.querySelectorAll('#page-what > .section-container .section'));
            if (!sections.length) return;
            const clamped = Math.max(0, Math.min(idx, sections.length - 1));
            sections.forEach((section, i) => {
                section.classList.toggle('active', i === clamped);
            });
            what3D?.setActiveSectionId?.(sections[clamped]?.id ?? null);
            if (phonePortrait) {
                what3D?.setPhoneActive?.(clamped, { force: true, immediate });
            } else {
                what3D?.syncToSections?.();
                requestAnimationFrame(() => what3D?.syncToSections?.());
            }
        };

        const setupSectionScrollSync = () => {
            if (!scroller || scroller.dataset.sectionScrollSync === '1') return;
            scroller.dataset.sectionScrollSync = '1';
            const setFromTrigger = (idx) => {
                if (sectionSyncState.suppress && sectionSyncState.target !== idx) return;
                setSectionFromSegment(idx);
            };
            setSectionFromSegment(0, { immediate: true });
            phoneSectionSegmentIds.forEach((id, idx) => {
                const selector = `#${id}`;
                ScrollTrigger.create({
                    trigger: selector,
                    scroller,
                    start: 'top center',
                    end: 'bottom center',
                    onEnter: () => setFromTrigger(idx),
                    onEnterBack: () => setFromTrigger(idx),
                    onLeave: () => setFromTrigger(Math.min(phoneSectionSegmentIds.length - 1, idx + 1)),
                    onLeaveBack: () => setFromTrigger(Math.max(0, idx - 1))
                });
            });
        };

        const bindSectionClicks = () => {
            const sections = Array.from(document.querySelectorAll('#page-what > .section-container .section'));

            // Fallback: direct clicks (in case pointer-events allow)
            sections.forEach((section, idx) => {
                if (section.dataset.sectionClickBound === '1') return;
                section.dataset.sectionClickBound = '1';
                section.addEventListener('click', () => {
                    if (!canInteract) return;
                    sectionSyncState.suppress = true;
                    sectionSyncState.target = idx;
                    setSectionFromSegment(idx, { immediate: true });
                    scrollToPhoneSectionSegment(idx, { behavior: 'auto' });
                    ScrollTrigger.update();
                    setTimeout(() => {
                        sectionSyncState.suppress = false;
                        sectionSyncState.target = null;
                    }, 0);
                });
            });

            // Proxy clicks through the scroller overlay so tapping anywhere still hits sections
            if (scroller && scroller.dataset.sectionClickProxy !== '1') {
                scroller.dataset.sectionClickProxy = '1';
                const onProxyClick = (evt) => {
                    if (!canInteract) return;
                    const { clientX, clientY } = evt;
                    const previous = scroller.style.pointerEvents;
                    scroller.style.pointerEvents = 'none';
                    const hit = document.elementFromPoint(clientX, clientY);
                    scroller.style.pointerEvents = previous;
                    const targetSection = hit?.closest?.('#page-what > .section-container .section');
                    if (!targetSection) return;
                    const idx = sections.indexOf(targetSection);
                    if (idx < 0) return;
                    sectionSyncState.suppress = true;
                    sectionSyncState.target = idx;
                    setSectionFromSegment(idx, { immediate: true });
                    scrollToPhoneSectionSegment(idx, { behavior: 'auto' });
                    ScrollTrigger.update();
                    setTimeout(() => {
                        sectionSyncState.suppress = false;
                        sectionSyncState.target = null;
                    }, 0);
                };
                scroller.addEventListener('click', onProxyClick);
            }
        };

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');

        // Measure safe zone for desktop layouts (only when visible)
        const sectionsForMeasure = Array.from(document.querySelectorAll('#page-what>.section-container .section'));
        let safeHeight = 0;
        let safeTop = 0;
        let safeBottom = 0;
        if (!phonePortrait) {
            sectionsForMeasure.forEach(s => s.style.transition = 'none');
            const vh = window.innerHeight;
            sectionsForMeasure.forEach(section => {
                section.classList.add('active');
                const gap = section.querySelector('.gap');
                const rect = gap.getBoundingClientRect();
                const topDist = Math.max(0, rect.top);
                const bottomDist = Math.max(0, vh - rect.bottom);
                safeTop = Math.max(safeTop, topDist);
                safeBottom = Math.max(safeBottom, bottomDist);
                section.classList.remove('active');
            });
            safeHeight = Math.max(0, vh - safeTop - safeBottom);
            sectionsForMeasure.forEach(s => s.style.removeProperty('transition'));
        }
        const safeZone = {
            height: safeHeight,
            top: safeTop
        };
        safeZone.center = safeZone.top + safeZone.height / 2;


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
            className: 'what-scroller scroller'
        });

        const phoneSectionSegmentIds = ['segment-2', 'segment-3', 'segment-4'];
        const scrollToPhoneSectionSegment = (idx, { behavior = 'smooth' } = {}) => {
            if (idx == null || idx < 0) return;
            const segmentId = phoneSectionSegmentIds[idx];
            if (!segmentId || !scroller) return;
            const target = scroller.querySelector(`#${segmentId}`);
            if (!target) return;
            scroller.scrollTo({ top: target.offsetTop, behavior });
        };

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
            camera.position.set(0, 0, 50);
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
            const modelHeights = [];
            const geometries = new Set();
            const materials = new Set();
            const sectionIds = ['what-section-1', 'what-section-2', 'what-section-3'];
            const sectionMap = new Map(sectionIds.map((id, index) => [id, { group: groups[index], element: document.getElementById(id), index }]));
            let activeSectionId = null;
            const scaleTweens = new Map();
            const sectionResizeObserver = 'ResizeObserver' in window ? new ResizeObserver(() => syncGroupsToSections({ immediate: true })) : null;
            sectionIds.forEach(id => {
                const el = document.getElementById(id);
                if (el) sectionResizeObserver?.observe(el);
            });
            if (isPhonePortrait) {
                const firstSection = document.getElementById(sectionIds[0]);
                firstSection?.classList.add('active');
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

            // const scaleFactor = Math.max(window.innerHeight / window.innerWidth, window.innerWidth / window.innerHeight)
            const perGroupOffsets = phonePortrait
                ? [
                    { pos: [0, 0.1, 0], rot: [10, 0, 0], scale: 0.42 },
                    { pos: [0, 0, 0], rot: [0, 0, 0], scale: 0.5 },
                    { pos: [0, 0, 0], rot: [80, 0, 20], scale: 0.45 }
                ]
                : [
                    { pos: [0, 0.1, 0], rot: [10, 0, 0], scale: 5 },
                    { pos: [0, 0.1, 0], rot: [0, 0, 0], scale: 3 },
                    { pos: [0, 0.1, 0], rot: [80, 0, 20], scale: 2.2 }
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
                    clone.updateMatrixWorld(true);
                    const measuredHeight = new THREE.Box3().setFromObject(clone).getSize(new THREE.Vector3()).y;
                    modelHeights[index] = measuredHeight || (templateSizes[index]?.y ?? templateSizeFallback.y);
                    models[index] = clone;
                    lights[index] = null;
                    syncGroupsToSections({ immediate: true });
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
            function ndcToWorldY(ndcY) {
                tempVec.set(0, ndcY, 0).unproject(camera);
                tempDir.copy(tempVec).sub(camera.position).normalize();
                const distance = (targetZ - camera.position.z) / tempDir.z;
                return camera.position.y + tempDir.y * distance;
            }

            function syncGroupsToSections({ immediate = false } = {}) {
                if (isPhonePortrait) {
                    syncGroupsPhone();
                    return;
                }
                const rect = canvas.getBoundingClientRect();
                if (!rect.width || !rect.height) return;
                const mapPxToNdcY = (px) => 1 - (((px - rect.top) / rect.height) * 2);
                const safeZoneValid = safeZone.height > 0 && rect.height > 0;
                const safeTopNdc = safeZoneValid ? mapPxToNdcY(safeZone.top) : 0;
                const safeBottomNdc = safeZoneValid ? mapPxToNdcY(safeZone.top + safeZone.height) : 0;
                const defaultWorldHeight = Math.abs(ndcToWorldY(1) - ndcToWorldY(-1));
                const safeWorldTop = safeZoneValid ? ndcToWorldY(safeTopNdc) : ndcToWorldY(1);
                const safeWorldBottom = safeZoneValid ? ndcToWorldY(safeBottomNdc) : ndcToWorldY(-1);
                const safeWorldCenterY = safeZoneValid ? (safeWorldTop + safeWorldBottom) / 2 : ndcToWorldY(0);
                const safeWorldHeight = safeZoneValid ? Math.abs(safeWorldBottom - safeWorldTop) : defaultWorldHeight;
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
                    entry.group.position.set((worldLeft + worldRight) / 2, safeWorldCenterY, targetZ);
                    const cfg = perGroupOffsets[entry.index] ?? {};
                    const cfgScale = cfg.scale ?? 1;
                    const baseModelHeight = Math.max(
                        0.001,
                        modelHeights[entry.index]
                        ?? (templateSizes[entry.index]?.y ?? templateSizeFallback.y) * cfgScale
                    );
                    const isActive = entry.element?.classList.contains('active') || entry.element?.id === activeSectionId;
                    const desiredHeight = safeWorldHeight > 0
                        ? safeWorldHeight * (isActive ? 0.6 : (1 / 3))
                        : baseModelHeight;
                    const targetScale = desiredHeight / baseModelHeight;
                    const tweenKey = entry.group;
                    const existingTween = scaleTweens.get(tweenKey);
                    if (Math.abs(entry.group.scale.x - targetScale) < 1e-3 || immediate) {
                        existingTween?.kill();
                        scaleTweens.delete(tweenKey);
                        entry.group.scale.setScalar(targetScale);
                    } else {
                        existingTween?.kill();
                        const tween = gsap.to(entry.group.scale, {
                            x: targetScale,
                            y: targetScale,
                            z: targetScale,
                            duration: 0.3,
                            ease: 'power1.out',
                            onComplete: () => scaleTweens.delete(tweenKey)
                        });
                        scaleTweens.set(tweenKey, tween);
                    }
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
                const safeNdcY = safeZone.height ? (((safeZone.center - rect.top) / rect.height) * 2 - 1) : 0;
                const safeWorldY = safeZone.height ? ndcToWorldY(safeNdcY) : 0;
                const positionsNdc = [-2 / 3, 0, 2 / 3]; // three equal slots across the width
                positionsNdc.forEach((ndcX, idx) => {
                    const worldX = ndcToWorldX(ndcX);
                    const group = groups[idx];
                    if (!group) return;
                    group.position.set(worldX, safeWorldY, targetZ);
                    const baseScale = (perGroupOffsets[idx]?.scale ?? 1) * (safeZone.height && rect.height ? (safeZone.height / rect.height) / 3 : 1);
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
                syncGroupsToSections({ immediate: true });
                camera.lookAt(lookAtTarget);
            }

            resize();
            window.addEventListener('resize', resize);
            syncGroupsToSections({ immediate: true });

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
                    el.classList.toggle('active', i === idx);
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
                scrollToPhoneSectionSegment(idx);
            }

            function start() {
                if (running) return;
                running = true;
                clock.start();
                renderer.setAnimationLoop(renderFrame);
                if (isPhonePortrait) {
                    syncGroupsPhone(true); // set initial scales and active state
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
                scaleTweens.forEach(t => t?.kill?.());
                scaleTweens.clear();
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
                getLastPhoneSelection: () => lastPhoneSelection,
                setActiveSectionId: (id) => { activeSectionId = id; }
            };
        }

        const what3D = createWhatScene();
        window.what3D = what3D;
        const whatLookAt = new THREE.Vector3(0, 0, 0);

        // ============================== TIMELINE

        const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

        // Set initial states
        gsap.set('#what-title', { fontSize: phonePortrait ? '4rem' : '8rem', lineHeight: 1, top: phonePortrait ? 'calc(100dvh - 10rem)' : '50%', yPercent: 500, autoAlpha: 0 });
        gsap.set('.section-container', { autoAlpha: 0 });
        gsap.set('#what-section-4', { autoAlpha: 0 });
        if (!phonePortrait) gsap.set('#page-what>.section-container i', { scaleY: 0 });
        gsap.set('#what-canvas', { autoAlpha: 0 });

        // Definition timeline    
        tl.add(() => { // Append Scroller
            document.body.appendChild(scroller);
            appendSegments(6);
            setupSectionScrollSync();
            bindSectionClicks();
            setScrollerInteractive();

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
            yPercent: 0, autoAlpha: 1, duration: 0.2
        }, 0)
        tl.to('.scroll-hint', {
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
                    onEnter: () => setScrollerInteractive(),
                    onEnterBack: () => setScrollerInteractive(),
                    onLeave: () => setScrollerInteractive(),
                    onLeaveBack: () => setScrollerInteractive()
                }
            });
            segmentTl.to('#what-title', {
                translateY: '-1em', autoAlpha: 0, duration: 0.2
            }, 0);
            segmentTl.to('#what-canvas', {
                autoAlpha: 1, duration: 1
            }, 0)
            segmentTl.to('.section-container', {
                autoAlpha: 1, duration: 0.5
            }, 0);
            segmentTl.to('#page-what>.section-container i', {
                scaleY: 1,
                duration: 0.5,
                stagger: 0.2
            }, '<');
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

            const stConfig = {
                trigger: '#segment-5',
                scroller,
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true,
                invalidateOnRefresh: true,
                onLeaveBack: () => { clearPhoneSectionStyles(); },
                onEnterBack: () => { clearPhoneSectionStyles(); }
            };
            if (phonePortrait) {
                const activeSelector = '#page-what>.section-container .section.active > div';
                stConfig.onEnter = () => {
                    clearPhoneSectionStyles();
                    what3D?.setPhoneActive?.(2, { force: true, immediate: true });
                };
                stConfig.onUpdate = (self) => {
                    const p = self.progress;
                    document.querySelectorAll(activeSelector).forEach(el => {
                        el.style.opacity = String(1 - p);
                        el.style.transform = `translateY(${(-64 * p)}px)`;
                    });
                };
            }

            const segmentTl = gsap.timeline({ scrollTrigger: stConfig });

            segmentTl.to('#what-title', {
                autoAlpha: 0, duration: 0.5
            });
            segmentTl.to('#page-what>.section-container', {
                autoAlpha: 0
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
                const orbitState = { phi: 0, theta: 0, radius: 0 };
                let captured = null;

                const captureStartState = () => {
                    const camOffset = new THREE.Vector3().copy(whatCam.position).sub(whatLookAt);
                    const camSpherical = new THREE.Spherical().setFromVector3(camOffset);
                    const startPos = whatGroups.map(g => g.position.clone());
                    const startScale = whatGroups.map(g => g.scale.clone());
                    const startRotX = whatGroups.map(g => g.rotation.x);

                    const tempSize = new THREE.Vector3();
                    const sizes = whatGroups.map(g => new THREE.Box3().setFromObject(g).getSize(tempSize.clone()));
                    const heights = sizes.map(s => s.y || 0);
                    const validHeights = heights.filter(h => h > 0);
                    const targetHeight = validHeights.length
                        ? validHeights.reduce((min, h) => Math.min(min, h), Infinity)
                        : 1;
                    const targetScale = whatGroups.map((g, idx) => {
                        const h = Math.max(heights[idx] || targetHeight, 1e-3);
                        const factor = targetHeight / h; // shrink larger items down; avoid inflating smaller ones
                        return startScale[idx].clone().multiplyScalar(factor);
                    });
                    const sizeAfterScale = sizes.map((s, idx) => {
                        const h = Math.max(heights[idx] || targetHeight, 1e-3);
                        const factor = targetHeight / h;
                        return s.clone().multiplyScalar(factor);
                    });
                    const maxFootprint = sizeAfterScale.reduce(
                        (max, s) => Math.max(max, Math.max(s.x, s.z)),
                        targetHeight
                    );
                    // Increase spacing multiplier to minimize overlap during interpolation
                    const triRadius = Math.max(0.75, (maxFootprint / 2));
                    const triHeight = Math.sin(THREE.MathUtils.degToRad(60)) * triRadius;
                    const trianglePositions = [
                        new THREE.Vector3(-triRadius, 0, -triHeight),
                        new THREE.Vector3(triRadius, 0, -triHeight),
                        new THREE.Vector3(0, 0, triHeight * 2)
                    ];

                    captured = { camSpherical, startPos, startScale, startRotX, targetScale, trianglePositions };
                };

                segmentTl.to(orbitState, {
                    ease: 'power2.out',
                    immediateRender: false,
                    duration: 0.6,
                    onStart: captureStartState,
                    onUpdate: function () {
                        if (!captured) captureStartState();
                        const { camSpherical, startPos, startScale, startRotX, targetScale, trianglePositions } = captured;
                        const t = this.progress();

                        orbitState.radius = camSpherical.radius;
                        orbitState.phi = THREE.MathUtils.lerp(camSpherical.phi, 0.0001, t); // toward top-down
                        orbitState.theta = THREE.MathUtils.lerp(camSpherical.theta, camSpherical.theta + Math.PI / 2, t); // spin 90° around Y

                        const offset = new THREE.Vector3().setFromSpherical(new THREE.Spherical(orbitState.radius, orbitState.phi, orbitState.theta));
                        const easedDrop = THREE.MathUtils.clamp(Math.pow(t, 4), 0, 1);
                        const yDrop = THREE.MathUtils.lerp(0, -camSpherical.radius, easedDrop);
                        whatCam.position.copy(whatLookAt).add(offset).add(new THREE.Vector3(0, yDrop, 0));
                        whatCam.lookAt(whatLookAt);
                        whatCam.updateProjectionMatrix();

                        whatGroups.forEach((group, index) => {
                            const pos = trianglePositions[index % trianglePositions.length];
                            group.position.copy(startPos[index]).lerp(pos, t);
                            group.scale.copy(startScale[index]).lerp(targetScale[index], t);
                            group.rotation.x = THREE.MathUtils.lerp(startRotX[index], THREE.MathUtils.degToRad(90), t);
                            group.visible = t < 0.999;
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
            segmentTl.fromTo('#what-section-4', { autoAlpha: 0, scale: 0 }, {
                autoAlpha: 1, scale: 1, duration: 0
            }, '>-0.2');
            segmentTl.to('.scroll-hint', {
                autoAlpha: 0, duration: 0.5
            }, '<');
            segmentTl.fromTo('.liminal-svg', { scale: 0 }, { scale: 1, duration: 1.5, ease: 'power4.out' }, '<');
            segmentTl.fromTo('.liminal-svg>div', { autoAlpha: 0.8 }, { autoAlpha: 1, duration: 1.5 }, '<');
            segmentTl.fromTo('.liminal-svg>svg', { autoAlpha: 0.8 }, { autoAlpha: 1, duration: 2.5, ease: 'power4.out' }, '<+0.1');
            segmentTl.fromTo('#we-are-liminal', { autoAlpha: 0, scale: 0 }, { autoAlpha: 1, scale: 1, duration: 0.5 }, '<');
            segmentTl.fromTo('#we-are-liminal-content', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5 }, '>');
            segmentTl.fromTo('.backBtn-what', { autoAlpha: 0 }, { autoAlpha: 1 }, 1);
        });
        tl.add(() => {
            document.querySelector('.backBtn-what').addEventListener('click', (e) => back(2, e, what3D), { once: true });
        });
        tl.add(() => { // Exit timeline
            let backCalled = false;
            const triggerBack = () => {
                if (backCalled) return;
                backCalled = true;
                const target = page?.querySelector('.backBtn') ?? page;
                back(2, { currentTarget: target }, what3D);
            };
            const segmentTl = gsap.timeline({
                scrollTrigger: {
                    trigger: '#segment-6',
                    scroller,
                    start: 'top bottom',
                    end: 'bottom bottom',
                    scrub: true,
                    invalidateOnRefresh: true,
                    onLeave: triggerBack
                }
            });
            segmentTl.to('.backBtn-what i', {
                width: '100%', background: '#fff8', duration: 1
            }, 0);
            segmentTl.to('#page-what', {
                scale: 0, autoAlpha: 0, ease: 'power4.in', duration: 0.8
            }, '<');
            segmentTl.to('canvas#what-canvas', {
                scale: 0.5, autoAlpha: 0, ease: 'power4.in', duration: 0.8
            }, '<');
        });
    };

    // =============================== PROFILE

    function us() {
        const page = document.querySelector('#page-profile');

        // // Normalize desc newlines (caret ^ -> double U+000A)
        // page?.querySelectorAll('#profile-desc > div, #profile-desc > span')?.forEach(node => {
        //     if (!node?.textContent) return;
        //     const normalized = normalizeCaret(node.textContent);
        //     if (normalized !== node.textContent) node.textContent = normalized;
        // });

        // show page
        page.removeAttribute('hidden');
        page.setAttribute('style', 'position: absolute; inset: 0');

        const btn = page.querySelector('.backBtn');
        btn.textContent = 'Back';
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

            const textCache = new WeakMap();
            const getRaw = (node) => node?.textContent ?? '';
            const isDescContainer = (node) => node?.closest?.('#profile-desc');

            const rememberText = (nodes) => nodes.forEach((node) => {
                if (!textCache.has(node)) textCache.set(node, getRaw(node));
            });

            // Prime cache for all leaf nodes
            rememberText(Array.from(document.querySelectorAll('#profile-name [data-user], #profile-title [data-user], #profile-desc [data-user] p')));

            const showUser = (userId) => {
                sections.forEach((id) => {
                    document
                        .querySelectorAll(`#${id} [data-user]`)
                        .forEach((el) => {
                            const isActive = el.dataset.user === userId;
                            el.hidden = !isActive;
                            if (isActive && el.childElementCount === 0) {
                                el.textContent = textCache.get(el) ?? getRaw(el);
                            }
                        });
                });
                toggles.querySelectorAll('[data-user]').forEach(btn => {
                    btn.toggleAttribute('current', btn.dataset.user === userId);
                });
                setPortrait(userId);
            };

            const getUserNodes = (userId) => sections.flatMap((id) =>
                Array.from(document.querySelectorAll(`#${id} [data-user="${userId}"]`))
            );
            const getUserParas = (userId) =>
                Array.from(document.querySelectorAll(`#profile-desc [data-user="${userId}"] p`));

            const scrambleInConfig = (text) => ({
                text,
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

            let activeUser = toggles.querySelector('[data-user]')?.dataset.user || 'sonny';
            showUser(activeUser);

            const animateSwap = (nextUser) => {
                if (nextUser === activeUser) return;

                const outgoingNodes = getUserNodes(activeUser);
                const incomingNodes = getUserNodes(nextUser);
                const outgoingParas = getUserParas(activeUser);
                const incomingParas = getUserParas(nextUser);
                rememberText([...outgoingParas, ...incomingParas]);
                const incomingTexts = incomingParas.map(p => textCache.get(p) ?? getRaw(p));
                const outgoingOther = outgoingNodes.filter(n => !isDescContainer(n) && n.childElementCount === 0);
                const incomingOther = incomingNodes.filter(n => !isDescContainer(n) && n.childElementCount === 0);

                const resetInline = (nodes) => nodes.forEach(n => {
                    n.style.removeProperty('opacity');
                    n.style.removeProperty('visibility');
                    n.style.removeProperty('transform');
                });
                resetInline([...outgoingNodes, ...incomingNodes, ...outgoingParas, ...incomingParas]);

                const tl = gsap.timeline({ defaults: { duration: 0.35, ease: 'power2.out' } });

                // Scramble out paragraphs (last -> first)
                if (outgoingParas.length) {
                    outgoingParas.slice().reverse().forEach((p, idx) => {
                        tl.to(p, { scrambleText: scrambleOutConfig }, idx === 0 ? 0 : '<+0.1');
                    });
                }
                // Scramble out other leaves (name/title)
                if (outgoingOther.length) {
                    tl.to(outgoingOther, {
                        autoAlpha: 0,
                        stagger: 0.05,
                        scrambleText: scrambleOutConfig
                    }, '<+0.2');
                }

                tl.add(() => {
                    activeUser = nextUser;
                    toggles.querySelectorAll('[data-user]').forEach((btn) =>
                        btn.toggleAttribute('current', btn.dataset.user === nextUser)
                    );
                    setPortrait(nextUser);
                    outgoingNodes.forEach(n => n.hidden = true);
                    incomingNodes.forEach(n => {
                        n.hidden = false;
                        n.style.removeProperty('opacity');
                        n.style.removeProperty('visibility');
                    });
                    incomingParas.forEach(p => { p.textContent = ''; });
                }, '>');

                // Scramble in other leaves
                if (incomingOther.length) {
                    tl.fromTo(incomingOther, {
                        autoAlpha: 0,
                    }, {
                        autoAlpha: 1,
                        scrambleText: (_, target) => scrambleInConfig(textCache.get(target) ?? getRaw(target))
                    }, '<');
                }

                // Scramble in paragraphs (first -> last)
                if (incomingParas.length) {
                    let pos = incomingOther.length ? '>' : '<';
                    incomingParas.forEach((p, idx) => {
                        const txt = incomingTexts[idx] ?? '';
                        tl.fromTo(p, {
                            autoAlpha: 0
                        }, {
                            autoAlpha: 1,
                            scrambleText: scrambleInConfig(txt)
                        }, pos);
                        pos = '<+0.1'; // chain sequentially
                    });
                }
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

            const textCache = new WeakMap();
            const getRaw = (node) => node?.textContent ?? '';
            const isDescContainer = (node) => node?.closest?.('#portfolio-desc');

            const rememberText = (nodes) => nodes.forEach((node) => {
                if (!textCache.has(node)) textCache.set(node, getRaw(node));
            });

            // Cache leaf text
            rememberText(Array.from(document.querySelectorAll('#portfolio-name [data-user], #portfolio-desc [data-user] p')));

            const showUser = (userId) => {
                sections.forEach((id) => {
                    document
                        .querySelectorAll(`#${id} [data-user]`)
                        .forEach((el) => {
                            const isActive = el.dataset.user === userId;
                            el.hidden = !isActive;
                            if (isActive && el.childElementCount === 0) {
                                el.textContent = textCache.get(el) ?? getRaw(el);
                            }
                        });
                });
                toggles.querySelectorAll('[data-user]').forEach(btn => {
                    btn.toggleAttribute('current', btn.dataset.user === userId);
                });
                portfolio3D?.swap?.(userId);
            };

            const getUserNodes = (userId) => sections.flatMap((id) =>
                Array.from(document.querySelectorAll(`#${id} [data-user="${userId}"]`))
            );
            const getUserParas = (userId) =>
                Array.from(document.querySelectorAll(`#portfolio-desc [data-user="${userId}"] p`));

            const scrambleInConfig = (text) => ({
                text,
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

            let activeUser = toggles.querySelector('[data-user]')?.dataset.user || 'xweave';
            showUser(activeUser);

            const animateSwap = (nextUser) => {
                if (nextUser === activeUser) return;

                const outgoingNodes = getUserNodes(activeUser);
                const incomingNodes = getUserNodes(nextUser);
                const outgoingParas = getUserParas(activeUser);
                const incomingParas = getUserParas(nextUser);
                rememberText([...outgoingParas, ...incomingParas]);
                const incomingTexts = incomingParas.map(p => textCache.get(p) ?? getRaw(p));
                const outgoingOther = outgoingNodes.filter(n => !isDescContainer(n) && n.childElementCount === 0);
                const incomingOther = incomingNodes.filter(n => !isDescContainer(n) && n.childElementCount === 0);

                const resetInline = (nodes) => nodes.forEach(n => {
                    n.style.removeProperty('opacity');
                    n.style.removeProperty('visibility');
                    n.style.removeProperty('transform');
                });
                resetInline([...outgoingNodes, ...incomingNodes, ...outgoingParas, ...incomingParas]);

                const tl = gsap.timeline({ defaults: { duration: 0.35, ease: 'power2.out' } });

                if (outgoingParas.length) {
                    outgoingParas.slice().reverse().forEach((p, idx) => {
                        tl.to(p, { scrambleText: scrambleOutConfig }, idx === 0 ? 0 : '<+0.1');
                    });
                }
                if (outgoingOther.length) {
                    tl.to(outgoingOther, {
                        autoAlpha: 0,
                        stagger: 0.05,
                        scrambleText: scrambleOutConfig
                    }, '<+0.2');
                }

                tl.add(() => {
                    activeUser = nextUser;
                    toggles.querySelectorAll('[data-user]').forEach((btn) =>
                        btn.toggleAttribute('current', btn.dataset.user === nextUser)
                    );
                    outgoingNodes.forEach(n => n.hidden = true);
                    incomingNodes.forEach(n => {
                        n.hidden = false;
                        n.style.removeProperty('opacity');
                        n.style.removeProperty('visibility');
                    });
                    incomingParas.forEach(p => { p.textContent = ''; });
                    portfolio3D?.swap?.(nextUser);
                }, '>');

                if (incomingOther.length) {
                    tl.fromTo(incomingOther, {
                        autoAlpha: 0,
                    }, {
                        autoAlpha: 1,
                        stagger: 0.05,
                        scrambleText: (_, target) => scrambleInConfig(textCache.get(target) ?? getRaw(target))
                    }, '<');
                }

                if (incomingParas.length) {
                    let pos = incomingOther.length ? '>' : '<';
                    incomingParas.forEach((p, idx) => {
                        const txt = incomingTexts[idx] ?? '';
                        tl.fromTo(p, {
                            autoAlpha: 0,
                        }, {
                            autoAlpha: 1,
                            scrambleText: scrambleInConfig(txt)
                        }, pos);
                        pos = '<+0.1';
                    });
                }
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

            scene.add(new THREE.AmbientLight(0xffffff, 1));
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
        if (!scroller) return;
        const target = scroller.querySelector('.smoother-content') || scroller;
        for (let i = 0; i < number; i++) {
            target.appendChild(Object.assign(document.createElement('div'), {
                className: 'segment', id: `segment-${i + 1}`
            }));
        }
        initLenisForScroller(scroller);

        // Forward wheel/touch to the scroller so it can sit “behind” interactables
        if (scroller && !scroller.dataset.forwardingSetup) {
            scroller.dataset.forwardingSetup = '1';
            let lastTouchY = null;
            const forward = (dy) => {
                const next = scroller.scrollTop + dy;
                if (lenis) {
                    lenis.scrollTo(next, { immediate: false });
                } else {
                    scroller.scrollTop = next;
                }
                ScrollTrigger.update();
            };
            const onWheel = (e) => {
                if (!document.body.contains(scroller)) { window.removeEventListener('wheel', onWheel, wheelOpts); return; }
                const dy = e.deltaY;
                const isMouseWheel = (e.deltaMode === 1) || (Math.abs(dy % 120) < 0.01);
                if (scroller.dataset.segmentSnapWheel === '1' && isMouseWheel) {
                    e.preventDefault();
                    return; // Observer-driven snapping will handle mouse wheels
                }
                forward(e.deltaY);
                e.preventDefault();
            };
            const onTouchMove = (e) => {
                if (!document.body.contains(scroller)) { window.removeEventListener('touchmove', onTouchMove, touchOpts); return; }
                const t = e.touches?.[0];
                if (!t) return;
                if (lastTouchY != null) forward(lastTouchY - t.clientY);
                lastTouchY = t.clientY;
                e.preventDefault();
            };
            const onTouchEnd = () => { lastTouchY = null; };
            const wheelOpts = { passive: false };
            const touchOpts = { passive: false };
            window.addEventListener('wheel', onWheel, wheelOpts);
            window.addEventListener('touchmove', onTouchMove, touchOpts);
            window.addEventListener('touchend', onTouchEnd);
        }
    }

    // Lenis helper for the hidden scroller
    function initLenisForScroller(wrapper) {
        if (!wrapper) return null;
        if (phonePortrait) {
            lenis?.destroy?.();
            lenis = null;
            return null;
        }
        if (!wrapper.querySelector('.smoother-content')) {
            const content = document.createElement('div');
            content.className = 'smoother-content';
            while (wrapper.firstChild) {
                content.appendChild(wrapper.firstChild);
            }
            wrapper.appendChild(content);
        }
        lenis?.destroy?.();
        lenis = new Lenis({
            wrapper,
            content: wrapper.querySelector('.smoother-content'),
            // duration: 1.1,                   // higher = longer glide (default 1)
            smoothTouch: true,               // smooth on touch
            smoothWheel: true,               // smooth on wheel
            wheelMultiplier: 1.5   // boost wheel delta
        });
        lenis.on('scroll', ScrollTrigger.update);
        window.lenis = lenis;
        return lenis;
    }

    // Back Button
    function back(ref, e, threeInstance) {
        const page = e?.currentTarget?.closest?.('.page') || document.querySelector('.page:not([hidden])') || document.querySelector('.page');
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
                if (page) {
                    gsap.killTweensOf(page);
                    const children = page.querySelectorAll('*');
                    gsap.killTweensOf(children);
                    gsap.set(children, { clearProps: 'all' });
                    gsap.set(page, { clearProps: 'all' });
                    page.hidden = true;
                }
                gsap.to('#logout-btn', { autoAlpha: 0.5, zIndex: 2, duration: 1 }, 0);
                gsap.set('.scroll-hint', { autoAlpha: 0 }, 0);

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
        const bodyBackBtns = document.querySelectorAll('body > .backBtn');
        if (bodyBackBtns.length) {
            tl.to(bodyBackBtns, {
                autoAlpha: 0,
                duration: 0.3,
                onComplete: () => bodyBackBtns.forEach(btn => btn.remove())
            }, 0);
        }
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

        // if (state < 4) {
        //     menuPortfolio?.setAttribute('hidden', '');
        //     cubePortfolio.visible = false;
        // }
        // if (state < 3) {
        //     menuUs?.setAttribute('hidden', '');
        //     cubeUs.visible = false;
        // }
        // if (state < 2) {
        //     menuWhat?.setAttribute('hidden', '');
        //     cubeWhat.visible = false;
        // }
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

    const list = document.querySelector('.portfolio-list');
    const container = list?.parentNode;
    if (list && container) {
        const fontSize = parseFloat(getComputedStyle(list).fontSize) || 16;
        const minCell = Math.max(24, 0.5 * fontSize);
        const vh = window.visualViewport?.height || window.innerHeight;
        const vw = window.innerWidth;
        const dimH = Math.max(12, Math.floor(vh / minCell / 2) * 2);
        const dimW = Math.max(12, Math.floor(vw / minCell / 2) * 2);
        const cell = vh / dimH;
        const innerH = dimH - (phonePortrait ? 4 : 8);
        const innerW = dimW - (phonePortrait ? 2 : 4);
        const padY = (vh - innerH * cell) / 2;
        const padX = (vw - innerW * cell) / 2;
        container.style.padding = `${padY}px ${padX}px`;
        container.style.height = '100%'
    }

    document.documentElement.style.visibility = 'visible';
}

// -----------------------------------------------------
// EXPERIENCE PAGE
// -----------------------------------------------------
function experiencePage() {
    if (!location.pathname.endsWith('/experience')) return;

    const container = document.querySelector('.experience-container');

    if (container) {
        const fontSize = 16;
        const minCell = Math.max(24, 0.5 * fontSize);
        const vh = window.visualViewport?.height || window.innerHeight;
        const vw = window.innerWidth;
        const dimH = Math.max(12, Math.floor(vh / minCell / 2) * 2);
        const dimW = Math.max(12, Math.floor(vw / minCell / 2) * 2);
        const cell = vh / dimH;
        const innerH = dimH - (phonePortrait ? 4 : 8);
        const innerW = dimW - (phonePortrait ? 2 : 4);
        const padY = (vh - innerH * cell) / 2;
        const padX = (vw - innerW * cell) / 2;
        container.style.inset = `${padY}px ${padX}px`;
        container.style.height = `calc(100dvh - ${padY * 2}px)`;
    }

    const videoIds = ['vid-1', 'vid-2', 'vid-2', 'vid-4'];
    const pickedId = videoIds[Math.floor(Math.random() * videoIds.length)];
    videoIds.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.style.visibility = id === pickedId ? 'visible' : 'hidden';
    });

    document.documentElement.style.visibility = 'visible';
}


// -----------------------------------------------------
// THESIS PAGE
// -----------------------------------------------------
function thesisPage() {
    if (!location.pathname.endsWith('/thesis')) return;

    const container = document.querySelector('.thesis-container');
    const content = document.querySelector('.thesis-content');
    const contentParagraphs = document.querySelectorAll('.thesis-content-inner p');
    const thesisOverlay = document.querySelector('.thesis');

    if (container) {
        const fontSize = 16;
        const minCell = Math.max(24, 0.5 * fontSize);
        const vh = window.visualViewport?.height || window.innerHeight;
        const vw = window.innerWidth;
        const dimH = Math.max(12, Math.floor(vh / minCell / 2) * 2);
        const dimW = Math.max(12, Math.floor(vw / minCell / 2) * 2);
        const cell = vh / dimH;
        const innerH = dimH - (phonePortrait ? 4 : 8);
        const innerW = dimW - (phonePortrait ? 2 : 4);
        const padY = (vh - innerH * cell) / 2;
        const padX = (vw - innerW * cell) / 2;
        container.style.inset = `${padY}px ${padX}px`;
        container.style.height = `calc(100dvh - ${padY * 2}px`
    }

    if (container && content && contentParagraphs.length) {
        const scrollEl = content;
        const setOpacity = () => {
            const maxScroll = scrollEl.scrollHeight - scrollEl.clientHeight;
            const progress = maxScroll > 0 ? Math.min(1, Math.max(0, scrollEl.scrollTop / maxScroll)) : 0;
            const fadeProgress = progress <= 0 ? 0 : Math.min(progress / 0.25, 1);
            const easedFade = Math.pow(fadeProgress, 4);
            const opacity = 1 - easedFade;
            contentParagraphs.forEach((p) => {
                p.style.opacity = opacity.toFixed(3);
            });
            if (thesisOverlay) {
                const overlayProgress = progress <= 0.2 ? 0 : (progress - 0.2) / 0.1;
                thesisOverlay.style.opacity = Math.min(1, Math.max(0, overlayProgress)).toFixed(3);
            }
        };
        const setPadding = () => {
            if (!container) return;
            container.style.setProperty('--parent-h', `${container.clientHeight}px`);
        };
        setOpacity();
        setPadding();
        scrollEl.addEventListener('scroll', setOpacity, { passive: true });
        window.addEventListener('resize', () => {
            setPadding();
            setOpacity();
        }, { passive: true });
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
            tl.add(() => {
                next.container.querySelector('.loader')?.remove();
                next.container.querySelector('.loader-glow')?.remove();
            }, 0);
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
            tl.add(() => {
                current.container.querySelector('.loader')?.remove();
                current.container.querySelector('.loader-glow')?.remove();
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

    experience: { // EXPERIENCE PAGE
        build: () => { experiencePage(); },
        enter: ({ next }) => {
            const tl = gsap.timeline();
            tl.from('.experience-container', {
                scale: 1.2, autoAlpha: 0, duration: 0.5
            });
            tl.from('.experience-container a', {
                autoAlpha: 0, duration: 0.5
            }, '>');
            return tl;
        },
        leave: ({ current }) => {
            const tl = gsap.timeline();
            tl.to(current.container, { autoAlpha: 0, duration: 0.3 });
            return tl;
        }
    },

    thesis: { // THESIS PAGE
        build: () => { thesisPage(); },
        enter: ({ next }) => {
            const tl = gsap.timeline();
            tl.fromTo('.thesis-container', {
                scaleX: 0, scaleY: 0
            }, {
                scaleX: 1, scaleY: 0.01, duration: 0.25, ease: 'power2.Out'
            });
            tl.to('.thesis-container', {
                scaleY: 1, duration: 0.25, ease: 'power2.Out'
            }, '>');
            tl.from('.thesis-container i', {
                autoAlpha: 0, duration: 0.15, ease: 'power2.Out'
            }, '>');
            tl.from('.thesis-content-header', {
                autoAlpha: 0, duration: 0.25, ease: 'power2.Out'
            }, '>');
            tl.from('.thesis-content-inner p', {
                autoAlpha: 0, duration: 0.25, stagger: 0.1, ease: 'power2.Out'
            }, '>');
            tl.from('a', {
                autoAlpha: 0, duration: 0.25, ease: 'power2.Out'
            }, '<+0.5');
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
