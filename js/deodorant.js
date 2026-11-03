// Old Spice: Kyla's Pure Sport stick as a 3D model. Her front-view art wraps the
// stick front and back; drag (or swipe sideways) to spin it, and it idles in a slow turn.
(function () {
  const stage = document.querySelector("[data-product-3d]");
  if (!stage || !window.THREE) return;
  const canvas = stage.querySelector("canvas");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL: leave the space empty rather than break the page
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  camera.position.set(0, 0.25, 7.2);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight(0xffffff, 0xd9d9d9, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 0.75);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffffff, 0.35);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  // Stick proportions follow the art (665 x 1531 px); depth is a typical stick's
  const W = 1.3;
  const H = W * (1531 / 665);
  const D = 0.62;
  const BEVEL = 0.06;

  // Cross-section: a stadium (flat front and back, round ends), extruded upward
  const r = D / 2;
  const half = W / 2 - r;
  const shape = new THREE.Shape();
  shape.moveTo(-half, -r);
  shape.lineTo(half, -r);
  shape.absarc(half, 0, r, -Math.PI / 2, Math.PI / 2, false);
  shape.lineTo(-half, r);
  shape.absarc(-half, 0, r, Math.PI / 2, Math.PI * 1.5, false);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: H - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelSegments: 4,
    curveSegments: 32,
  });
  geo.rotateX(-Math.PI / 2); // extrude along y instead of z
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  geo.translate(0, -(box.min.y + box.max.y) / 2, 0);
  geo.computeBoundingBox();
  geo.computeVertexNormals();

  // Project the art straight on from the front (mirrored for the back so it reads
  // correctly); the flat top takes the cap red and the flat bottom the base white
  const pos = geo.attributes.position;
  const nrm = geo.attributes.normal;
  const uv = geo.attributes.uv;
  const bb = geo.boundingBox;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), ny = nrm.getY(i);
    if (ny > 0.95) { uv.setXY(i, 0.5, 0.97); continue; } // cap red
    if (ny < -0.95) { uv.setXY(i, 0.5, 0.02); continue; } // base white
    let u = (x - bb.min.x) / (bb.max.x - bb.min.x);
    if (z < 0) u = 1 - u;
    uv.setXY(i, u, (y - bb.min.y) / (bb.max.y - bb.min.y));
  }
  uv.needsUpdate = true;

  const tex = new THREE.TextureLoader().load(stage.dataset.texture, render);
  tex.encoding = THREE.sRGBEncoding;
  tex.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const stick = new THREE.Mesh(
    geo,
    new THREE.MeshStandardMaterial({ map: tex, roughness: 0.38, metalness: 0 })
  );
  stick.rotation.x = 0.08;
  scene.add(stick);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the whole stick in frame on narrow screens
    const fitH = (H * 1.18) / (2 * Math.tan((camera.fov * Math.PI) / 360));
    const fitW = (W * 1.6) / (2 * Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    camera.position.z = Math.max(fitH, fitW);
    camera.updateProjectionMatrix();
    render();
  }

  function render() {
    renderer.render(scene, camera);
  }

  // Drag to spin, with a little momentum; idle spin when left alone
  const IDLE_SPEED = reduceMotion ? 0 : 0.35; // radians per second
  let velocity = 0;
  let dragging = false;
  let lastX = 0, lastT = 0, idleAt = 0;

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastT = performance.now();
    velocity = 0;
    stage.classList.add("is-dragging", "has-spun");
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - lastX;
    const turn = (dx / canvas.clientWidth) * Math.PI * 1.6;
    stick.rotation.y += turn;
    velocity = turn / Math.max((now - lastT) / 1000, 0.008);
    lastX = e.clientX;
    lastT = now;
  });
  function release() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (performance.now() - lastT > 80) velocity = 0; // held still before letting go
    idleAt = performance.now() + 2500;
  }
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  // Only animate while it's on screen
  let visible = false, raf = 0, prev = 0;
  function tick(t) {
    const dt = Math.min((t - prev) / 1000, 0.05);
    prev = t;
    if (!dragging) {
      if (Math.abs(velocity) > 0.01) {
        stick.rotation.y += velocity * dt;
        velocity *= Math.pow(0.04, dt); // ease out
      } else if (t > idleAt) {
        stick.rotation.y += IDLE_SPEED * dt;
      }
    }
    render();
    raf = visible ? requestAnimationFrame(tick) : 0;
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (visible && !raf) { prev = performance.now(); raf = requestAnimationFrame(tick); }
  }).observe(stage);

  window.addEventListener("resize", resize);
  resize();
})();
