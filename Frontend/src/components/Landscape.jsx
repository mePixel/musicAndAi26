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
      scene.background = new THREE.Color('#dce8ee');
      const camera = new THREE.PerspectiveCamera(50, 1, .1, 160);
      camera.position.set(0, 13, 24); camera.lookAt(0, 5, -22);
      const geometry = new THREE.PlaneGeometry(130, 130, 160, 160);
      geometry.rotateX(-Math.PI / 2);
      const points = geometry.attributes.position;
      const peak = (x, z, px, pz, height, width) => height * Math.exp(-((x-px)**2 + (z-pz)**2) / width);
      for (let i = 0; i < points.count; i++) {
        const x = points.getX(i), z = points.getZ(i);
        const mountains = peak(x,z,-25,-12,24,230) + peak(x,z,13,-26,32,260) + peak(x,z,40,-5,21,180);
        const ridge = Math.sin(x*.7 + z*.35)*Math.sin(z*.55) + .45*Math.sin(x*1.7-z*.8);
        points.setY(i, mountains + ridge * Math.min(2, mountains*.16) + Math.sin(x*.1)*1.2);
      }
      geometry.computeVertexNormals();
      // World-space procedural textures: grass at the foothills, stratified
      // stone on steep faces, and granular snow above the snowline.
      const material = new THREE.ShaderMaterial({
        uniforms: { energy: { value: 0 } },
        vertexShader: `
          uniform float energy;
          varying vec3 terrainPoint;
          varying vec3 terrainNormal;
          varying float distanceToCamera;
          void main() {
            vec3 p = position;
            p.y *= 1.0 + energy * 0.055;
            terrainPoint = p;
            terrainNormal = normal;
            vec4 view = modelViewMatrix * vec4(p, 1.0);
            distanceToCamera = length(view.xyz);
            gl_Position = projectionMatrix * view;
          }
        `,
        fragmentShader: `
          varying vec3 terrainPoint;
          varying vec3 terrainNormal;
          varying float distanceToCamera;
          float hash(vec3 p) { return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453); }
          float noise(vec3 p) {
            vec3 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
            return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),
                           mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
                       mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),
                           mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);
          }
          void main() {
            vec3 p=terrainPoint, n=normalize(terrainNormal);
            float grain=noise(p*9.0)*.5+noise(p*24.0)*.25+noise(p*2.0)*.25;
            float strata=sin(p.y*5.0+noise(p*.7)*5.0)*.05;
            vec3 grass=mix(vec3(.20,.30,.17),vec3(.43,.49,.27),grain);
            vec3 rock=mix(vec3(.29,.29,.27),vec3(.57,.54,.48),grain)+strata;
            vec3 snow=mix(vec3(.77,.84,.88),vec3(.98,.98,.94),grain);
            float steep=1.0-abs(n.y);
            vec3 color=mix(grass,rock,smoothstep(.15,.5,steep)+smoothstep(8.0,17.0,p.y)*(1.0-smoothstep(.15,.5,steep)));
            float snowline=smoothstep(18.0,23.0,p.y+noise(p*.45)*3.0)*(1.0-smoothstep(.35,.75,steep));
            color=mix(color,snow,snowline);
            float light=.48+.52*max(0.0,dot(n,normalize(vec3(-.6,.9,.4))));
            color*=light;
            float fog=smoothstep(35.0,125.0,distanceToCamera);
            gl_FragColor=vec4(mix(color,vec3(.863,.910,.933),fog),1.0);
            #include <tonemapping_fragment>
            #include <colorspace_fragment>
          }
        `,
      });
      const terrain = new THREE.Mesh(geometry, material);
      terrain.position.set(0, -5, -20); scene.add(terrain);
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
          const time = reduced.matches ? 0 : now * .00012;
          material.uniforms.energy.value = energy;
          camera.position.x = Math.sin(time * .4) * 1.2;
          camera.lookAt(0, 5, -22);
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
