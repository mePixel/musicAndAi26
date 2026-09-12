import { useEffect, useRef } from 'react';

export function Landscape({ audio }) {
  const host = useRef(null);
  useEffect(() => {
    let disposed = false, cleanup;
    import('three').then(THREE => {
      if (disposed) return;
      const container = host.current;
      let renderer;
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false, powerPreference: 'low-power' }); }
      catch { return; }
      renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
      container.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      scene.background = new THREE.Color('#eee8ff');
      const camera = new THREE.PerspectiveCamera(48, 1, .1, 180);
      camera.position.set(0, 8, 30); camera.lookAt(0, 0, -28);
      // Dense points form the surface; there are no solid faces or wire lines.
      const count = 230, positions = new Float32Array(count * count * 3);
      for (let row = 0; row < count; row++) {
        for (let col = 0; col < count; col++) {
          const x = (col / (count - 1) - .5) * 145;
          const z = (row / (count - 1) - .5) * 130;
          const ridge = Math.sin(x * .09 + z * .045) * 3.5
            + Math.sin(x * .19 - z * .07) * 1.9
            + Math.sin(x * .39 + z * .23) * .65;
          const peaks = 9 * Math.exp(-((z + 22) ** 2) / 200)
            * (.65 + .35 * Math.sin(x * .13));
          const i = (row * count + col) * 3;
          positions[i] = x; positions[i + 1] = ridge + peaks; positions[i + 2] = z;
        }
      }
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      const material = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false,
        uniforms: { energy: { value: 0 }, time: { value: 0 }, pixelRatio: { value: renderer.getPixelRatio() } },
        vertexShader: `
          uniform float energy;
          uniform float time;
          uniform float pixelRatio;
          varying float brightness;
          varying float distanceToCamera;
          void main() {
            vec3 p = position;
            float wave = p.x*.12 + p.z*.09 - time*2.2;
            p.y += sin(wave)*(2.2 + energy*3.0) + cos(p.z*.16-time)*.7;
            p.x += cos(wave)*.65;
            p.z += sin(wave*.7)*.45;
            vec4 view = modelViewMatrix * vec4(p, 1.0);
            distanceToCamera = -view.z;
            brightness = .55 + .45*smoothstep(-4.0, 13.0, p.y);
            brightness *= .85 + .15*sin(p.x*7.3+p.z*4.7);
            brightness = clamp(brightness * (1.0 + energy*.7), 0.0, 1.0);
            gl_PointSize = clamp(240.0 / max(10.0,-view.z), 3.0, 5.5) * pixelRatio;
            gl_Position = projectionMatrix * view;
          }
        `,
        fragmentShader: `
          varying float brightness;
          varying float distanceToCamera;
          void main() {
            float radius = length(gl_PointCoord - .5);
            if (radius > .5) discard;
            float dotShape = 1.0-smoothstep(.32,.5,radius);
            float fog = 1.0-smoothstep(30.0,135.0,distanceToCamera);
            vec3 danceColor = mix(vec3(.12,.20,.95),vec3(1.0,.06,.52),brightness);
            gl_FragColor = vec4(danceColor, dotShape*fog*brightness);
          }
        `,
      });
      const terrain = new THREE.Points(geometry, material);
      terrain.position.set(0, 0, -25); scene.add(terrain);
      const bins = new Uint8Array(128);
      const reduced = matchMedia('(prefers-reduced-motion: reduce)');
      let frame = 0, last = 0, energy = 0;
      function draw(now = 0) {
        if (disposed || document.hidden) return;
        if (now - last >= 33 || !last) {
          last = now;
          const analyser = audio.getAnalyser();
          let bass = 0;
          if (analyser && !reduced.matches) {
            analyser.getByteFrequencyData(bins);
            for (let i = 1; i < 18; i++) bass += bins[i];
            bass /= 17 * 255;
          }
          energy += (bass - energy) * .15;
          const time = reduced.matches ? 0 : now * .0007;
          material.uniforms.energy.value = energy;
          camera.position.x = Math.sin(time * .4) * 1.2;
          material.uniforms.time.value = time;
          camera.lookAt(0, 0, -28);
          renderer.render(scene, camera);
        }
        if (!reduced.matches) frame = requestAnimationFrame(draw);
      }
      function restart() { cancelAnimationFrame(frame); last = 0; draw(); }
      function resize() {
        renderer.setSize(innerWidth, innerHeight);
        camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); restart();
      }
      const lost = event => { event.preventDefault(); cancelAnimationFrame(frame); container.style.opacity = '0'; };
      renderer.domElement.addEventListener('webglcontextlost', lost);
      window.addEventListener('resize', resize);
      document.addEventListener('visibilitychange', restart);
      reduced.addEventListener('change', restart);
      resize();
      cleanup = () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        document.removeEventListener('visibilitychange', restart);
        reduced.removeEventListener('change', restart);
        renderer.domElement.removeEventListener('webglcontextlost', lost);
        geometry.dispose(); material.dispose(); renderer.dispose(); renderer.domElement.remove();
      };
    }).catch(() => { /* The solid page background remains if the optional effect cannot load. */ });
    return () => { disposed = true; cleanup?.(); };
  }, [audio]);
  return <div className="music-landscape" ref={host} aria-hidden="true" />;
}
