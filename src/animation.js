import gsap from 'gsap';

// timeline that expands .window, fades stuff out, removes them, and fades in #unlock-module
export function toUnlock() {
  const parent = document.querySelector('.grid-container');
  if (!parent) return gsap.timeline();

  let unlock = document.querySelector('#unlock-module');
  if (!unlock) {
    unlock = Object.assign(document.createElement('section'), { id: 'unlock-module' });
    unlock.style.opacity = 0;
  } else gsap.set(unlock, { autoAlpha: 0 });

  const killNodes = [
    ...document.querySelectorAll('.webgl, #entrance, .tagline, .grid-bg, .copyright, .copyright-text')
  ];

  const tl = gsap.timeline({ defaults: { ease: 'power2.inOut' } });

  tl.to('.window', { width: '100vw', height: '100vh', duration: 0.6 }, 0)
    .to(killNodes, { autoAlpha: 0, duration: 0.4 }, 0)
    .add(() => {
      killNodes.forEach(n => n?.remove());
      parent.appendChild(unlock);
    })
    .to(unlock, { autoAlpha: 1, duration: 0.6, ease: 'power2.out' });

  return tl;
}