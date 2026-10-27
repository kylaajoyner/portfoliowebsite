// Animations (GSAP) will be added here in a later step.

// ---------- Project gallery lightbox ----------
// Click any gallery image to see it full screen, then step through the rest.
// The slideshow loops: next on the last image goes back to the first.

(function () {
  const gallery = document.querySelector(".project-gallery");
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
