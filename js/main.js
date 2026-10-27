// Animations (GSAP) will be added here in a later step.

// ---------- Project gallery lightbox ----------
// Click any gallery image to see it full screen, then step through the rest.
// The slideshow loops: next on the last image goes back to the first.

(function () {
  const gallery = document.querySelector(".project-gallery, .rodeo-gallery");
  if (!gallery) return;

  const images = Array.from(gallery.querySelectorAll("img"));
  let current = 0;
  let lastFocus = null;

  const box = document.createElement("div");
  box.className = "lightbox";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-label", "Image viewer");
  box.hidden = true;
  box.innerHTML = `
    <button class="lightbox__close" type="button">Close</button>
    <button class="lightbox__arrow lightbox__arrow--prev" type="button" aria-label="Previous image">&lsaquo;</button>
    <img class="lightbox__image" alt="">
    <button class="lightbox__arrow lightbox__arrow--next" type="button" aria-label="Next image">&rsaquo;</button>
    <p class="lightbox__count" aria-live="polite"></p>
  `;
  document.body.appendChild(box);

  const view = box.querySelector(".lightbox__image");
  const count = box.querySelector(".lightbox__count");
  const closeBtn = box.querySelector(".lightbox__close");

  function show(i) {
    current = (i + images.length) % images.length;
    view.src = images[current].src;
    view.alt = images[current].alt;
    count.textContent = `${current + 1} / ${images.length}`;
  }

  function open(i) {
    lastFocus = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.classList.add("lightbox-open");
    closeBtn.focus();
  }

  function close() {
    box.hidden = true;
    document.body.classList.remove("lightbox-open");
    if (lastFocus) lastFocus.focus();
  }

  images.forEach((img, i) => {
    img.tabIndex = 0;
    img.setAttribute("role", "button");
    img.addEventListener("click", () => open(i));
    img.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        open(i);
      }
    });
  });

  closeBtn.addEventListener("click", close);
  box.querySelector(".lightbox__arrow--prev").addEventListener("click", () => show(current - 1));
  box.querySelector(".lightbox__arrow--next").addEventListener("click", () => show(current + 1));

  // Clicking the empty space around the image closes it.
  box.addEventListener("click", (e) => {
    if (e.target === box) close();
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") show(current - 1);
    if (e.key === "ArrowRight") show(current + 1);
  });

  // Swipe left or right on phones.
  let startX = null;
  box.addEventListener("touchstart", (e) => { startX = e.touches[0].clientX; }, { passive: true });
  box.addEventListener("touchend", (e) => {
    if (startX === null) return;
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    startX = null;
  });
})();

// About TV: roles flip over one at a time once the name is up
(function () {
  const roles = document.querySelector("[data-roles]");
  if (!roles) return;

  const words = roles.querySelectorAll("span");
  let current = 0;
  words[0].classList.add("is-in");

  setTimeout(function () {
    setInterval(function () {
      const prev = words[current];
      prev.classList.remove("is-in");
      prev.classList.add("is-out");
      setTimeout(function () { prev.classList.remove("is-out"); }, 500);
      current = (current + 1) % words.length;
      words[current].classList.add("is-in");
    }, 1800);
  }, 3100);
})();

// About TV: a ring of stars orbiting the name, Paramount style.
// Stars on the near side of the ring pass in front of the text, the far side passes behind.
(function () {
  const stage = document.querySelector("[data-stars]");
  if (!stage) return;

  const COUNT = 22;
  const TILT = -0.12;        // radians, a slight slant like the Paramount arc
  const SPEED = 0.35;        // radians per second
  const START = 2.6;         // seconds, when the stars fly in
  const FLY_IN = 1.6;        // seconds to settle onto the ring
  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const stars = [];
  for (let i = 0; i < COUNT; i++) {
    const img = document.createElement("img");
    img.className = "tv__star";
    img.src = "assets/images/about/star.svg";
    img.alt = "";
    stage.appendChild(img);
    stars.push(img);
  }

  const t0 = performance.now();

  function frame(now) {
    const w = stage.clientWidth;
    const h = stage.clientHeight;
    const size = stars[0].offsetWidth;
    const rx = w * 0.43;
    const ry = h * 0.38;
    const t = (now - t0) / 1000;

    // 0 → 1 as the stars sweep in from far out, eased
    let p = still ? 1 : Math.min(Math.max((t - START) / FLY_IN, 0), 1);
    p = 1 - Math.pow(1 - p, 3);
    const spread = 1 + (1 - p) * 1.8;
    const spin = still ? 0 : t * SPEED + (1 - p) * 2.5;

    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2 + spin;
      const ex = Math.cos(a) * rx * spread;
      const ey = Math.sin(a) * ry * spread;
      const x = w / 2 + ex * Math.cos(TILT) - ey * Math.sin(TILT);
      const y = h / 2 + ex * Math.sin(TILT) + ey * Math.cos(TILT);
      const depth = (Math.sin(a) + 1) / 2;   // 0 far (top), 1 near (bottom)
      const scale = 0.45 + depth * 0.8;
      // turn each star as it travels so it reads as a solid shape, not a sticker
      const turnY = Math.cos(a) * 55;
      const turnX = 18 - depth * 18;
      const s = stars[i];
      s.style.transform = "translate(" + (x - size / 2) + "px," + (y - size / 2) + "px) perspective(" + size * 6 + "px) rotateX(" + turnX + "deg) rotateY(" + turnY + "deg) scale(" + scale + ")";
      s.style.opacity = p * (0.35 + depth * 0.65);
      s.style.zIndex = depth > 0.5 ? 3 : 1;
    }

    if (!still) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
  if (still) window.addEventListener("resize", function () { requestAnimationFrame(frame); });
})();

// About TV: warp strength follows the screen size; clicking the set glitches the picture
(function () {
  const tv = document.querySelector("[data-tv]");
  if (!tv) return;

  const warp = document.querySelector("#crt-warp feDisplacementMap");
  const content = tv.querySelector(".tv__content");
  function sizeWarp() {
    if (warp && content) warp.setAttribute("scale", Math.round(content.clientWidth * 0.06));
  }
  sizeWarp();
  window.addEventListener("resize", sizeWarp);

  let timer;
  function glitch() {
    tv.classList.remove("is-glitching");
    void tv.offsetWidth; // restart the animation on repeat clicks
    tv.classList.add("is-glitching");
    clearTimeout(timer);
    timer = setTimeout(function () { tv.classList.remove("is-glitching"); }, 600);
  }

  tv.addEventListener("click", glitch);
  tv.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      glitch();
    }
  });
})();

// Jukebox: duplicate the song list so the marquee loops seamlessly,
// and keep the scroll speed steady however many songs there are
(function () {
  const display = document.querySelector("[data-marquee]");
  if (!display) return;

  const track = display.querySelector(".radio__track");

  // shuffle the artists so the order is different on every visit
  const items = Array.from(track.children);
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  items.forEach(function (el) { track.appendChild(el); });

  track.innerHTML += track.innerHTML;
  track.querySelectorAll("span").forEach(function (s, i, all) {
    if (i >= all.length / 2) s.setAttribute("aria-hidden", "true");
  });

  function setSpeed() {
    const pxPerSecond = display.clientWidth * 0.12;
    track.style.setProperty("--marquee-time", (track.scrollWidth / 2) / pxPerSecond + "s");
  }
  setSpeed();
  window.addEventListener("resize", setSpeed);

  // Hold TUNE or FFWD: ease the scroll up to fast-forward, ease back down on release
  const FAST = 5;
  let held = 0;
  let rate = 1;
  let easing = false;

  function scrollAnim() {
    return track.getAnimations().find(function (a) { return a.animationName === "radio-scroll"; });
  }

  function ease() {
    const anim = scrollAnim();
    const target = held > 0 ? FAST : 1;
    rate += (target - rate) * 0.12;
    if (Math.abs(target - rate) < 0.02) rate = target;
    if (anim) anim.playbackRate = rate;
    if (rate !== target) requestAnimationFrame(ease);
    else easing = false;
  }

  function startEase() {
    if (!easing) {
      easing = true;
      requestAnimationFrame(ease);
    }
  }

  document.querySelectorAll("[data-ffwd]").forEach(function (btn) {
    let down = false;
    function press() {
      if (down) return;
      down = true;
      held++;
      btn.classList.add("is-held");
      startEase();
    }
    function release() {
      if (!down) return;
      down = false;
      held--;
      btn.classList.remove("is-held");
      startEase();
    }
    btn.addEventListener("pointerdown", function (e) {
      btn.setPointerCapture(e.pointerId);
      press();
    });
    btn.addEventListener("pointerup", release);
    btn.addEventListener("pointercancel", release);
    btn.addEventListener("lostpointercapture", release);
    btn.addEventListener("contextmenu", function (e) { e.preventDefault(); }); // long-press on phones
    btn.addEventListener("keydown", function (e) {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        press();
      }
    });
    btn.addEventListener("keyup", function (e) {
      if (e.key === " " || e.key === "Enter") release();
    });
    btn.addEventListener("blur", release);
  });

  // OFF/VOL knob or EJECT: switch the display off (blank label), press again to switch it back on
  const power = document.querySelectorAll("[data-power]");
  power.forEach(function (btn) {
    btn.addEventListener("click", function () {
      const off = display.classList.toggle("is-off");
      const anim = scrollAnim();
      if (anim) off ? anim.pause() : anim.play();
      power.forEach(function (b) {
        b.setAttribute("aria-pressed", String(off));
        b.setAttribute("aria-label", b.getAttribute("aria-label").replace(off ? " off" : " back on", off ? " back on" : " off"));
      });
    });
  });
})();

// Lost partner: when the cowboy scrolls into view his bubble types "..." then speaks
(function () {
  const lost = document.querySelector("[data-lost]");
  if (!lost) return;

  const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function talk() {
    lost.classList.add("is-talking");
    if (still) {
      lost.classList.add("has-spoken", "has-links");
      return;
    }
    setTimeout(function () { lost.classList.add("has-spoken"); }, 1800);
    setTimeout(function () { lost.classList.add("has-links"); }, 2500);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        talk();
        io.disconnect();
      }
    }, { threshold: 0.5 });
    io.observe(lost);
  } else {
    talk();
  }

  const top = lost.querySelector("[data-top]");
  if (top) {
    top.addEventListener("click", function (e) {
      e.preventDefault();
      window.scrollTo({ top: 0, behavior: still ? "auto" : "smooth" });
    });
  }
})();
