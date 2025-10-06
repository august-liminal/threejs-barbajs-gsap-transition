import './styles/style.css';
import barba from '@barba/core';
import gsap from 'gsap';
// import webgl from './webgl';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// Barba JS
// barba.init({
//     transitions: [{
//         name: 'default-transition',
//         once() {
//             webgl()
//         },
//         leave() {

//         },
//         enter() {

//         }
//     }]
// });

//=====Landing Page Layout
let gridDimension, gridSize, cellSize, x, y, deltaW, deltaH;
let windowW = 2;
let windowH = 2;

function landing(){
    //===== DECLARATIONS
    // Grid dimension in pixel
    gridDimension = Math.max(window.innerHeight, window.innerWidth)
    document.documentElement.style.setProperty('--grid-dimension', `${gridDimension}px`)
    // Minimum cell size being 1.2x tagline font size
    document.querySelector('.tagline').style.removeProperty('line-height');
    const minCellSize = parseFloat(getComputedStyle(document.querySelector('.tagline')).fontSize);
    // Largest number of cells in grid, minimum 20
    gridSize = Math.max(Math.floor(gridDimension / minCellSize / 4) * 4, 12)
    //Calculate actual possible cell size
    cellSize = gridDimension / gridSize
    document.documentElement.style.setProperty('--cell-size', `${cellSize}px`)
    document.querySelector('.tagline').style.setProperty('line-height', `${cellSize}px`);
    // Difference between viewport and grid dimension
    deltaW = Math.abs(window.innerWidth - gridDimension);
    deltaH = Math.abs(window.innerHeight - gridDimension);
    // Size of tagline and copyright text
    const taglineWidth = document.querySelector('.tagline').getBoundingClientRect().width;


    //===== SHAPE
    // X being tagline width starting from viewport edge or 25% side whichever greater, round up to nearest cell
    x = Math.ceil(Math.max(gridDimension * 0.25, deltaW / 2 + taglineWidth) / cellSize) * cellSize;
    // Y at least 2 cells away from viewport edge and never project diagonally into the vertical edge of screen, round up to nearest cell
    y = Math.ceil(Math.min(deltaH / 2 + cellSize, gridDimension - x) / cellSize) * cellSize;

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

    //===== Text Layout
    const taglineFontsize = parseFloat(getComputedStyle(document.querySelector('.tagline')).fontSize)
    const copyrightFontsize = parseFloat(getComputedStyle(document.querySelector('.copyright-text')).fontSize)
    const textHorizontalOffset = window.innerWidth < gridDimension ? deltaW / 2 : 0
    const taglineOffset = y - cellSize * 0.15;
    const copyrightOffset = y - cellSize * 0.65;

    document.querySelector('.tagline').style.right = textHorizontalOffset + 'px';
    document.querySelector('.tagline').style.bottom = taglineOffset + 'px';
    document.querySelector('.copyright-text').style.left = textHorizontalOffset + 'px';
    document.querySelector('.copyright-text').style.top = copyrightOffset + 'px'; 
    
    //========== THREEJS
    // Canvas
    const canvas = Object.assign(document.querySelector('.window').appendChild(document.createElement('canvas')), { className: 'webgl' });

    // Scene
    const scene = new THREE.Scene()

    // Geometries    

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 100);
    camera.position.set(0,0,0)
    scene.add(camera)

    // GLTF Loader
    const loader = new GLTFLoader();
    loader.load('./src/point_cloud.glb', (gltf) => {
        console.log('gltf')
    })

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
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))        
    })

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    })
    renderer.setSize(size.width, size.height)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
}

//===== Landing page window resizing & flickering effect
function updateLanding(e) {
  const windowBox = document.querySelector('.window');
  
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // --- Get mouse/touch pos relative to viewport center ---
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const p = e?.touches?.[0] || e || { clientX: cx, clientY: cy };
  const pos = { x: p.clientX - cx, y: p.clientY - cy };

  // --- Multiplier for effect ---
  const multiplier = Math.abs(Math.sin(pos.x + pos.y % Math.PI));
  document.documentElement.style.setProperty('--e', String(multiplier));

  // --- Size in cells ---
  const windowW = clamp(Math.round(Math.abs(pos.x) / cellSize) * 2, 2, gridSize - 2);
  const windowH = clamp(Math.round(Math.abs(pos.y) / cellSize) * 2, 2, gridSize - 2 * (y / cellSize) - 4);

  // Passing value
  windowBox.style.inset =
  (window.innerHeight < gridDimension ? deltaH / 2 + 'px' : '0') + ' ' +
  (window.innerWidth < gridDimension ? deltaW / 2 + 'px' : '0');
  windowBox.style.setProperty('--w', windowW);
  windowBox.style.setProperty('--h', windowH);
}



addEventListener('resize', landing);
addEventListener('DOMContentLoaded', landing);

window.addEventListener('load',       updateLanding);
window.addEventListener('mousemove',  updateLanding, { passive: true });
window.addEventListener('touchstart', updateLanding, { passive: true });
window.addEventListener('touchmove',  updateLanding, { passive: true });
