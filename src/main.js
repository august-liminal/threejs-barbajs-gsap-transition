import './styles/style.css';
import barba from '@barba/core';
import webgl from './webgl'
import { transition } from 'three/examples/jsm/tsl/display/TransitionNode.js';

// Barba JS
barba.init({
    transitions: [{
        name: 'default-transition',
        once() {
            webgl()
        },
        leave() {

        },
        enter() {

        }
    }]
})