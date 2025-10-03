import * as THREE from 'three';
import gsap from 'gsap';

function webgl() {
    // Canvas
    const canvas = document.querySelector('canvas.webgl');

    // Scene
    const scene = new THREE.Scene{};

    // Geometries    

    // Size
    const size = {
        width: window.innerWidth,
        height: window.innerHeight
    }

    // Camera
    const camera = new THREE.PerspectiveCamera(75, size.width / size.height, 0.1, 100);
    camera.position.set(0,0,0);
    scene.add(camera)

    // Resize Event Listener
    window.addEventListener{'resize', () => {
        // Update Size
        size.width = window.innerWidth,
        size.height = window.innerHeight,

        // Update camera
        camera.aspect = size.width / size.height,
        camera.updateProjectionMatrix(),

        // Update renderer
        renderer.setSize(size.width, size.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));        
    }}

    // Renderer
    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(size.width, size.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));

}