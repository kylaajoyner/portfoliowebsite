// Animations (GSAP) will be added here in a later step.

// ---------- Project gallery lightbox ----------
// Click any gallery image to see it full screen, then step through the rest.
// The slideshow loops: next on the last image goes back to the first.

(function () {
  const gallery = document.querySelector(".project-gallery, .rodeo-gallery");
  if (!gallery) return;

  const images = Array.from(gallery.querySelectorAll("img:not(.sizzle img)"));
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

  // shuffle the roles so every visit starts on a different one in a different order
  const spans = Array.from(roles.querySelectorAll("span"));
  for (let i = spans.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [spans[i], spans[j]] = [spans[j], spans[i]];
  }
  spans.forEach((span) => roles.appendChild(span));

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

  // the power button on the set turns the picture off and back on
  const power = tv.querySelector(".tv__power");
  if (power) {
    power.addEventListener("click", function (e) {
      e.stopPropagation(); // not a glitch click
      const off = !tv.classList.contains("is-off");
      tv.classList.toggle("is-off", off);
      tv.classList.toggle("is-waking", !off);
      power.setAttribute("aria-pressed", String(off));
      power.setAttribute("aria-label", off ? "Turn the TV on" : "Turn the TV off");
    });
    power.addEventListener("keydown", function (e) { e.stopPropagation(); });
  }

  // channel buttons switch the picture, with a burst of static in between
  const video = tv.querySelector(".tv__video");
  const channels = tv.querySelectorAll(".tv__channel");
  channels.forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (tv.classList.contains("is-off")) return;
      const ch = btn.dataset.channel;
      channels.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
      tv.dataset.channel = "";
      void tv.offsetWidth; // replays the written-out name when channel 3 is picked again
      tv.dataset.channel = ch;
      glitch();
      if (video) {
        if (ch === "3") video.play().catch(function () {});
        else video.pause();
      }
    });
    btn.addEventListener("keydown", function (e) { e.stopPropagation(); });
  });

  tv.addEventListener("click", function () {
    if (!tv.classList.contains("is-off")) glitch();
  });
  tv.addEventListener("keydown", function (e) {
    if (tv.classList.contains("is-off")) return;
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
    setTimeout(function () { lost.classList.add("has-spoken"); }, 2800);
    setTimeout(function () { lost.classList.add("has-links"); }, 3500);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        talk();
        io.disconnect();
      }
    }, { threshold: 0.9 }); // wait until he is fully on screen so the "..." is seen
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

// Rodeo: he never ropes the runaway horse... unless you click him.
// He holds the catch for about a second, then goes back to swinging the lasso.
(function () {
  const rider = document.querySelector(".wrangle");
  if (!rider || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const ride = rider.getAnimations().find((a) => a.animationName === "ride");
  const CATCH_MS = 1650; // matches .wrangle.is-catching in the CSS

  rider.addEventListener("click", () => {
    if (rider.classList.contains("is-catching") || !ride) return;
    rider.classList.add("is-catching");
    setTimeout(() => {
      // restart the normal frames at the ride's current point so the end-of-pass throw stays in step
      const cycle = ride.effect.getComputedTiming().duration;
      rider.style.setProperty("--wrangle-sync", -(ride.currentTime % cycle) + "ms");
      rider.classList.remove("is-catching");
    }, CATCH_MS);
  });
})();

// Rodeo videos: each thumbnail plays a short muted sizzle on its own while it's on screen,
// clicking swaps in the full video with sound.
(function () {
  const thumbs = document.querySelectorAll(".sizzle");
  if (!thumbs.length) return;

  const autoplay = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const CUT_MS = 2200; // how long each sizzle cut lasts on YouTube videos
  const CUTS = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85];

  let ytReady = null;
  function loadYouTube() {
    if (!ytReady) {
      ytReady = new Promise((resolve) => {
        window.onYouTubeIframeAPIReady = resolve;
        const s = document.createElement("script");
        s.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(s);
      });
    }
    return ytReady;
  }

  thumbs.forEach((thumb) => {
    let preview = null;
    let stop = null;

    function start() {
      preview = document.createElement("div");
      preview.className = "sizzle__preview";
      thumb.appendChild(preview);
      const mine = preview;

      if (thumb.dataset.sizzle) {
        const v = document.createElement("video");
        v.src = thumb.dataset.sizzle;
        v.muted = true;
        v.loop = true;
        v.playsInline = true;
        v.addEventListener("playing", () => mine.classList.add("is-playing"));
        preview.appendChild(v);
        v.play().catch(() => {});
        stop = () => v.pause();
        return;
      }

      const slot = document.createElement("div");
      preview.appendChild(slot);
      let hop = null;
      let player = null;
      stop = () => {
        clearInterval(hop);
        if (player && player.destroy) player.destroy();
      };
      loadYouTube().then(() => {
        if (preview !== mine) return; // scrolled away before it loaded
        let cut = 0;
        player = new YT.Player(slot, {
          videoId: thumb.dataset.youtube,
          host: "https://www.youtube-nocookie.com",
          playerVars: { autoplay: 1, mute: 1, controls: 0, disablekb: 1, fs: 0, playsinline: 1, rel: 0, iv_load_policy: 3 },
          events: {
            onReady(e) {
              const len = e.target.getDuration();
              const jump = () => e.target.seekTo(len * CUTS[cut++ % CUTS.length], true);
              jump();
              e.target.playVideo();
              hop = setInterval(jump, CUT_MS);
            },
            onStateChange(e) {
              if (e.data === YT.PlayerState.PLAYING) mine.classList.add("is-playing");
            },
          },
        });
      });
    }

    function end() {
      if (!preview) return;
      if (stop) stop();
      preview.remove();
      preview = null;
      stop = null;
    }

    // play while it's on screen (or nearly), stop once scrolled away
    if (autoplay) {
      new IntersectionObserver((entries) => {
        if (!thumb.isConnected) return;
        if (entries[0].isIntersecting) { if (!preview) start(); } else end();
      }, { rootMargin: "200px 0px" }).observe(thumb);
    }

    thumb.addEventListener("click", () => {
      end();
      let full;
      if (thumb.dataset.youtube) {
        full = document.createElement("iframe");
        full.src = "https://www.youtube-nocookie.com/embed/" + thumb.dataset.youtube + "?autoplay=1&rel=0";
        full.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
        full.allowFullscreen = true;
      } else {
        full = document.createElement("video");
        full.src = thumb.dataset.video;
        full.controls = true;
        full.playsInline = true;
        full.autoplay = true;
      }
      full.title = thumb.getAttribute("aria-label").replace(/^Play /, "");
      thumb.replaceWith(full);
      if (full.focus) full.focus();
    });
  });
})();

// Rodeo gallery: pack the pieces into columns, shortest column first, with each video
// taking two columns so the photos fill in around it. Recomputed on resize.
(function () {
  const grid = document.querySelector(".rodeo-gallery__grid:not(.rodeo-gallery__grid--big)");
  if (!grid) return;
  const items = Array.from(grid.children);
  const VIDEO_SPAN = 2;

  function ratio(li) {
    if (li.classList.contains("rodeo-gallery__item--video")) return 9 / 16;
    const img = li.querySelector("img");
    return img.height / img.width; // from the width/height attributes, so it works before load
  }

  function pack() {
    const w = window.innerWidth;
    const cols = w <= 480 ? 1 : w <= 900 ? 2 : Number(grid.dataset.cols || 4);
    grid.classList.remove("is-packed");
    const gap = parseFloat(getComputedStyle(grid).columnGap) || 0;
    grid.classList.add("is-packed");
    const col = (grid.clientWidth - gap * (cols - 1)) / cols;
    const heights = new Array(cols).fill(0);

    const isVideo = (li) => li.classList.contains("rodeo-gallery__item--video");

    // the run of columns where a piece can sit highest, and the empty space it would leave under itself
    // on the 4-column desktop layout each piece has a hand-picked column (data-col)
    function spot(span, li) {
      const pinned = li && cols === 4 && li.dataset.col ? Number(li.dataset.col) - 1 : -1;
      let best = 0;
      let bestTop = Infinity;
      for (let c = Math.max(pinned, 0); c + span <= cols && (pinned < 0 || c === pinned); c++) {
        const top = Math.max(...heights.slice(c, c + span));
        if (top < bestTop - 1) { bestTop = top; best = c; }
      }
      let waste = 0;
      for (let c = best; c < best + span; c++) waste += bestTop - heights[c];
      return { best, bestTop, waste };
    }

    function place(li) {
      const span = Math.min(isVideo(li) ? VIDEO_SPAN : 1, cols);
      const { best, bestTop } = spot(span, li);
      const width = col * span + gap * (span - 1);
      li.style.width = width + "px";
      li.style.left = best * (col + gap) + "px";
      li.style.top = bestTop + "px";
      const bottom = bestTop + width * ratio(li) + gap;
      for (let c = best; c < best + span; c++) heights[c] = bottom;
    }

    // a video waits for the next photos to even out the columns under it, so no holes open up
    // (but only for a few photos, so it stays roughly where it is in the list)
    const MAX_WAIT = 3;
    const waiting = [];
    let waited = 0;
    const fits = (li) => spot(Math.min(VIDEO_SPAN, cols)).waste < col * 0.35;
    items.forEach((li, i) => {
      if (cols === 4 && li.dataset.col) place(li);
      else if (isVideo(li)) waiting.push(li);
      else { place(li); if (waiting.length) waited++; }
      while (waiting.length && (fits(waiting[0]) || waited >= MAX_WAIT || !items.slice(i + 1).some((x) => !isVideo(x)))) {
        place(waiting.shift());
        waited = 0;
      }
    });
    grid.style.height = Math.max(...heights) - gap + "px";
  }

  pack();
  let raf = 0;
  window.addEventListener("resize", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(pack); });
})();

// Project pages: More Work slides this project out and the next one in, like a slideshow.
(function () {
  try { sessionStorage.removeItem("slide-in"); } catch (e) {}
  const more = document.querySelector(".more-link");
  const page = document.querySelector(".page--project");
  if (!more || !page || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  more.addEventListener("click", (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // let new-tab clicks through
    e.preventDefault();
    try { sessionStorage.setItem("slide-in", "1"); } catch (err) {}
    page.classList.add("is-leaving");
    setTimeout(() => { window.location.href = more.href; }, 350);
  });

  // coming back with the browser's back button shouldn't show a blank page
  window.addEventListener("pageshow", (e) => { if (e.persisted) page.classList.remove("is-leaving"); });
})();
