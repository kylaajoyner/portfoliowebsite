// Lucky Lips trading cards: one card in 3D, drag it any way (around and upside down)
// to see the front and the back. Picking a name beside it flips to that character's
// card and turns the Lucky Lips box into that card's pack.
(function () {
  const stage = document.querySelector("[data-lucky-card]");
  if (!stage || !window.THREE) return;
  const canvas = stage.querySelector("canvas");
  const buttons = Array.from(document.querySelectorAll("[data-card-pick]"));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const DIR = "assets/images/lucky-lips/";
  const V = "?v=1";

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) {
    return; // no WebGL: leave the space empty rather than break the page
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputEncoding = THREE.sRGBEncoding;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 0.3);
  key.position.set(-1, 1.5, 3);
  scene.add(key);

  // Card art is 1184 x 1653 px with 40 px rounded corners
  const W = 2, H = W * 1653 / 1184, R = W * 40 / 1184, T = 0.022;
  const shape = new THREE.Shape();
  shape.moveTo(-W / 2 + R, -H / 2);
  shape.lineTo(W / 2 - R, -H / 2);
  shape.quadraticCurveTo(W / 2, -H / 2, W / 2, -H / 2 + R);
  shape.lineTo(W / 2, H / 2 - R);
  shape.quadraticCurveTo(W / 2, H / 2, W / 2 - R, H / 2);
  shape.lineTo(-W / 2 + R, H / 2);
  shape.quadraticCurveTo(-W / 2, H / 2, -W / 2, H / 2 - R);
  shape.lineTo(-W / 2, -H / 2 + R);
  shape.quadraticCurveTo(-W / 2, -H / 2, -W / 2 + R, -H / 2);

  function face() {
    const g = new THREE.ShapeGeometry(shape, 12);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + W / 2) / W, (p.getY(i) + H / 2) / H);
    return g;
  }

  const loader = new THREE.TextureLoader();
  const cache = {};
  function tex(name) {
    if (cache[name]) return cache[name];
    const t = loader.load(DIR + "card-" + name + ".jpg" + V, render);
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    cache[name] = t;
    return t;
  }

  const frontMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const backMat = new THREE.MeshLambertMaterial({ map: tex("back") });
  const edgeMat = new THREE.MeshLambertMaterial({ color: 0xa8333a }); // the cards' red border

  const card = new THREE.Group();
  const edge = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: T, bevelEnabled: false, curveSegments: 12 }), edgeMat);
  edge.position.z = -T / 2;
  const front = new THREE.Mesh(face(), frontMat);
  front.position.z = T / 2 + 0.001;
  const back = new THREE.Mesh(face(), backMat);
  back.rotation.y = Math.PI;
  back.position.z = -T / 2 - 0.001;
  card.add(edge, front, back);
  scene.add(card);

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // fill the space: the card's height, and a bit more than its width so tilts stay in frame
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(0, 0, Math.max((H * 1.08) / (2 * tan), (W * 1.3) / (2 * tan * camera.aspect)) + T);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
    render();
  }
  function render() { renderer.render(scene, camera); }
  window.addEventListener("resize", resize);

  // Drag (mouse or finger) turns the card around both axes, with a little momentum.
  // Left alone it turns slowly so it reads as an object.
  const IDLE = reduceMotion ? 0 : 0.4; // radians per second around the vertical
  const X = new THREE.Vector3(1, 0, 0), Y = new THREE.Vector3(0, 1, 0);
  const q = new THREE.Quaternion();
  let vx = 0, vy = 0, dragging = false, lastX = 0, lastY = 0, lastT = 0, idleAt = 0;
  let tween = null; // turning back to face front after a pick

  function turn(ax, ay) {
    if (ay) card.quaternion.premultiply(q.setFromAxisAngle(Y, ay));
    if (ax) card.quaternion.premultiply(q.setFromAxisAngle(X, ax));
  }

  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; tween = null;
    lastX = e.clientX; lastY = e.clientY; lastT = performance.now();
    vx = vy = 0;
    canvas.setPointerCapture(e.pointerId);
    stage.classList.add("is-dragging", "has-spun");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now(), dt = Math.max(now - lastT, 1) / 1000;
    const k = 4.2 / canvas.clientWidth; // a full width of drag is about two thirds of a turn
    const dx = (e.clientX - lastX) * k, dy = (e.clientY - lastY) * k;
    turn(dy, dx);
    vy = dx / dt; vx = dy / dt;
    lastX = e.clientX; lastY = e.clientY; lastT = now;
    render();
  });
  function endDrag() {
    if (!dragging) return;
    dragging = false;
    stage.classList.remove("is-dragging");
    if (performance.now() - lastT > 80) vx = vy = 0; // held still before letting go
    idleAt = performance.now() + 2500;
  }
  canvas.addEventListener("pointerup", endDrag);
  canvas.addEventListener("pointercancel", endDrag);

  let prev = performance.now();
  function loop(now) {
    const dt = Math.min((now - prev) / 1000, 0.05);
    prev = now;
    if (tween) {
      const t = Math.min((now - tween.t0) / tween.ms, 1);
      const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      card.quaternion.copy(tween.from).slerp(tween.to, e);
      if (t >= 1) { tween = null; idleAt = now + 2000; }
      render();
    } else if (!dragging) {
      const decay = Math.pow(0.04, dt);
      vx *= decay; vy *= decay;
      if (Math.abs(vx) + Math.abs(vy) > 0.02) { turn(vx * dt, vy * dt); render(); }
      else if (IDLE && now > idleAt) { turn(0, IDLE * dt); render(); }
    }
    requestAnimationFrame(loop);
  }

  // Name buttons: show that card (turned to face front) and switch the box's pack
  let current = null;
  function pick(btn, quiet) {
    const name = btn.dataset.cardPick;
    buttons.forEach((b) => b.setAttribute("aria-pressed", b === btn ? "true" : "false"));
    if (name !== current) {
      current = name;
      frontMat.map = tex(name);
      frontMat.needsUpdate = true;
      stage.setAttribute("aria-label", btn.textContent.trim() + " trading card in 3D. Drag to turn it over.");
    }
    if (!quiet) {
      document.dispatchEvent(new CustomEvent("lucky:pack", { detail: btn.dataset.pack }));
      if (reduceMotion) card.quaternion.identity();
      else tween = { from: card.quaternion.clone(), to: new THREE.Quaternion(), t0: performance.now(), ms: 650 };
      vx = vy = 0;
    }
    render();
  }
  buttons.forEach((b) => b.addEventListener("click", () => pick(b)));
  // preload the other fronts so picks swap instantly
  buttons.forEach((b) => tex(b.dataset.cardPick));

  const first = buttons.find((b) => b.getAttribute("aria-pressed") === "true") || buttons[0];
  if (first) pick(first, true);
  resize();
  requestAnimationFrame(loop);
})();
