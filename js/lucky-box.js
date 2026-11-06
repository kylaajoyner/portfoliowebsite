// Lucky Lips (MSCHF): Kyla's red box as a 3D model. Click it and the lid flips open,
// a cigarette rises out and fades away, and that cigarette's "tooth" in the lips goes
// black. Keep clicking until the mouth is empty.
(function () {
  const stage = document.querySelector("[data-lucky-box]");
  if (!stage || !window.THREE) return;
  const canvas = stage.querySelector("canvas");
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
  const camera = new THREE.PerspectiveCamera(26, 1, 0.1, 100);
  scene.add(new THREE.AmbientLight(0xffffff, 0.72));
  const key = new THREE.DirectionalLight(0xffffff, 0.42);
  key.position.set(-1, 1.6, 2);
  scene.add(key);

  // Proportions follow Kyla's render: front art 560 x 912 px, lid = top 234 px,
  // depth from the dieline (58 x 23 mm)
  const PX = 560, PY = 912, PLID = 234, PD = 222;
  const S = 3 / PY;
  const W = PX * S, H = PY * S, D = PD * S, LID = PLID * S, BODY = H - LID;

  const loader = new THREE.TextureLoader();
  let pending = 0;
  function tex(name) {
    pending++;
    const t = loader.load(DIR + name + ".jpg" + V, () => { if (--pending === 0) ready(); });
    t.encoding = THREE.sRGBEncoding;
    t.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return t;
  }
  const mat = (map) => new THREE.MeshLambertMaterial({ map });
  const flat = (color) => new THREE.MeshLambertMaterial({ color });
  const BLACK = 0x121212, RED = 0xa83939, INSIDE = 0xe9e5df;

  // The five cigarettes are the five teeth in the lips: x ranges in the front art
  const TEETH = [[86, 166], [162, 248], [243, 332], [327, 413], [408, 470]];
  const WIN_Y = [124, 312]; // the lip window's rows in the body's front art
  const left = TEETH.map(() => true);

  // Body front is drawn on a canvas: the empty (black) mouth, with each remaining
  // cigarette's column copied back in from the full art
  const frontCanvas = document.createElement("canvas");
  frontCanvas.width = PX; frontCanvas.height = PY - PLID;
  const fctx = frontCanvas.getContext("2d");
  const frontTex = new THREE.CanvasTexture(frontCanvas);
  frontTex.encoding = THREE.sRGBEncoding;
  frontTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const fullImg = new Image(), emptyImg = new Image();
  pending += 2;
  fullImg.onload = emptyImg.onload = () => { if (--pending === 0) ready(); };
  fullImg.src = DIR + "body-front.jpg" + V;
  emptyImg.src = DIR + "body-front-empty.jpg" + V;
  function drawFront() {
    fctx.drawImage(emptyImg, 0, 0);
    TEETH.forEach(([x0, x1], i) => {
      if (!left[i]) return;
      const [y0, y1] = WIN_Y;
      fctx.drawImage(fullImg, x0, y0, x1 - x0, y1 - y0, x0, y0, x1 - x0, y1 - y0);
    });
    frontTex.needsUpdate = true;
  }

  // Inside the box, seen from above when the lid is open: a row of five filter tips
  const topCanvas = document.createElement("canvas");
  topCanvas.width = PX; topCanvas.height = PD;
  const tctx = topCanvas.getContext("2d");
  const topTex = new THREE.CanvasTexture(topCanvas);
  topTex.encoding = THREE.sRGBEncoding;
  const R = PX / 5 * 0.44;
  function drawTop(hidden) {
    tctx.fillStyle = "#e9e5df"; // the white card wall
    tctx.fillRect(0, 0, PX, PD);
    tctx.fillStyle = "#1a1514"; // the dark inside
    tctx.fillRect(12, 12, PX - 24, PD - 24);
    left.forEach((on, i) => {
      if (!on || i === hidden) return;
      const cx = (i + 0.5) * PX / 5, cy = PD / 2;
      const g = tctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.1, cx, cy, R);
      g.addColorStop(0, "#f0b066");
      g.addColorStop(1, "#c8782e");
      tctx.fillStyle = g;
      tctx.beginPath(); tctx.arc(cx, cy, R, 0, Math.PI * 2); tctx.fill();
      tctx.strokeStyle = "rgba(90,45,10,0.45)"; tctx.lineWidth = 3; tctx.stroke();
    });
    topTex.needsUpdate = true;
  }

  // Box faces: +x right, -x left, +y top, -y bottom, +z front, -z back
  const body = new THREE.Mesh(new THREE.BoxGeometry(W, BODY, D), [
    mat(tex("body-right")), mat(tex("body-left")), mat(topTex), flat(RED), mat(frontTex), mat(tex("body-back")),
  ]);
  body.position.y = -H / 2 + BODY / 2;

  // The lid hinges on the back edge where it meets the body
  const hinge = new THREE.Group();
  hinge.position.set(0, -H / 2 + BODY, -D / 2);
  const lid = new THREE.Mesh(new THREE.BoxGeometry(W, LID, D), [
    mat(tex("lid-right")), mat(tex("lid-left")), flat(BLACK), flat(INSIDE), mat(tex("lid-front")), mat(tex("lid-back")),
  ]);
  lid.position.set(0, LID / 2, D / 2);
  hinge.add(lid);

  const pack = new THREE.Group();
  pack.add(body, hinge);
  pack.rotation.y = 0.42; // turned a little so it reads as a box
  scene.add(pack);

  // One cigarette: white paper with an orange filter on top
  const CIG_R = W / 5 * 0.4, CIG_L = BODY * 1.02, FILTER = CIG_L * 0.3;
  const paperMat = new THREE.MeshLambertMaterial({ color: 0xf6f4f0, transparent: true });
  const filterMat = new THREE.MeshLambertMaterial({ color: 0xd98a3e, transparent: true });
  const cig = new THREE.Group();
  const paper = new THREE.Mesh(new THREE.CylinderGeometry(CIG_R, CIG_R, CIG_L - FILTER, 28), paperMat);
  paper.position.y = -FILTER / 2;
  const filter = new THREE.Mesh(new THREE.CylinderGeometry(CIG_R, CIG_R, FILTER, 28), filterMat);
  filter.position.y = (CIG_L - FILTER) / 2;
  cig.add(paper, filter);
  cig.visible = false;
  pack.add(cig);
  const cigRestY = -H / 2 + BODY - CIG_L / 2 - 0.01; // just under the top of the body

  function resize() {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // frame the box plus the room the cigarette rises into
    const top = H / 2 + CIG_L * 0.72, bottom = -H / 2;
    const midY = (top + bottom) / 2, spanY = (top - bottom) * 1.04;
    const tan = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(spanY / (2 * tan), (W * 1.5) / (2 * tan * camera.aspect));
    const tilt = 0.32; // look down a little so the open box shows its cigarettes
    camera.position.set(0, midY + dist * Math.sin(tilt), dist * Math.cos(tilt));
    camera.lookAt(0, midY, 0);
    camera.updateProjectionMatrix();
    render();
  }
  function render() { renderer.render(scene, camera); }

  let started = false;
  function ready() {
    if (started) return;
    started = true;
    drawFront();
    drawTop(-1);
    resize();
    stage.classList.add("is-ready");
  }
  window.addEventListener("resize", resize);

  // Click: open, lift one cigarette out, fade it away, close
  const OPEN = -1.95;
  const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const clamp01 = (t) => Math.min(Math.max(t, 0), 1);
  let busy = false;

  function pull() {
    if (busy) return;
    stage.classList.add("has-spun");
    const i = left.indexOf(true); // left to right across the mouth
    busy = true;
    if (reduceMotion) {
      if (i >= 0) { left[i] = false; drawFront(); drawTop(-1); }
      render();
      busy = false;
      return;
    }
    if (i >= 0) {
      cig.position.set(-W / 2 + (i + 0.5) * W / 5, cigRestY, 0);
      paperMat.opacity = filterMat.opacity = 1;
    }
    const T_OPEN = 450, T_RISE = 750, T_FADE = 650, T_CLOSE = 450;
    const t0 = performance.now();
    let toothGone = false;
    function frame(now) {
      const t = now - t0;
      const open = clamp01(t / T_OPEN);
      const close = clamp01((t - (T_OPEN + T_RISE + T_FADE * 0.6)) / T_CLOSE);
      hinge.rotation.x = OPEN * (ease(open) - ease(close));
      if (i >= 0) {
        const rise = clamp01((t - T_OPEN * 0.7) / T_RISE);
        const fade = clamp01((t - T_OPEN * 0.7 - T_RISE) / T_FADE);
        if (rise > 0 && !toothGone) {
          toothGone = true;
          left[i] = false;
          cig.visible = true;
          drawFront();
          drawTop(i);
        }
        cig.position.y = cigRestY + CIG_L * 0.7 * ease(rise) + CIG_L * 0.25 * fade;
        paperMat.opacity = filterMat.opacity = 1 - fade;
        if (fade >= 1) cig.visible = false;
      }
      render();
      if (t < T_OPEN + T_RISE + T_FADE * 0.6 + T_CLOSE) requestAnimationFrame(frame);
      else {
        hinge.rotation.x = 0;
        cig.visible = false;
        drawTop(-1);
        render();
        busy = false;
        if (!left.includes(true)) stage.classList.add("is-empty");
      }
    }
    requestAnimationFrame(frame);
  }

  canvas.addEventListener("click", pull);
  canvas.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pull(); }
  });
})();
