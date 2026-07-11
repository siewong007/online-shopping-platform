// Ekoway Hardware — animation engine (vanilla, scroll-driven)
(function () {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const calm = () => document.documentElement.dataset.motion === "calm";

  /* ---------- word pull-up: split [data-pullup] into word spans ---------- */
  let widx = 0;
  function splitNode(node, host) {
    node.childNodes.forEach((child) => {
      if (child.nodeType === 3) {
        const words = child.textContent.split(/(\s+)/);
        words.forEach((w) => {
          if (w === "") return;
          const s = document.createElement("span");
          if (/^\s+$/.test(w)) { s.className = "w sp"; s.textContent = w; }
          else { s.className = "w"; s.textContent = w; }
          s.style.setProperty("--i", widx++);
          host.appendChild(s);
        });
      } else if (child.nodeType === 1) {
        // keep the element (e.g. .serif / .star) but split its words, preserving class
        if (child.classList && child.classList.contains("star")) {
          child.style.setProperty("--i", widx++);
          child.classList.add("w");
          host.appendChild(child);
          return;
        }
        const wrap = document.createElement("span");
        if (child.className) wrap.className = child.className;
        splitNode(child, wrap);
        host.appendChild(wrap);
      }
    });
  }
  document.querySelectorAll("[data-pullup]").forEach((el) => {
    widx = 0;
    const frag = document.createElement("span");
    splitNode(el, frag);
    el.innerHTML = "";
    while (frag.firstChild) el.appendChild(frag.firstChild);
  });

  /* ---------- char reveal: wrap [data-charreveal] characters ---------- */
  const charEls = [];
  document.querySelectorAll("[data-charreveal]").forEach((el) => {
    const text = el.textContent;
    el.textContent = "";
    const chars = [];
    for (const c of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.textContent = c;
      s.style.opacity = "0.18";
      el.appendChild(s);
      chars.push(s);
    }
    charEls.push({ el, chars });
  });

  /* ---------- intro curtain ---------- */
  const intro = document.querySelector(".intro");
  function finishIntro() {
    document.body.classList.add("loaded");
    if (intro) {
      intro.classList.add("done");
      setTimeout(() => intro.remove(), 1000);
    }
  }
  if (reduced || calm()) {
    if (intro) intro.remove();
    document.body.classList.add("loaded");
    document.querySelectorAll(".pull").forEach((p) => p.classList.add("in"));
  } else {
    requestAnimationFrame(() => intro && intro.classList.add("play"));
    setTimeout(finishIntro, 1400);
  }

  /* ---------- scroll reveals (incl. pull-up + feature cards) ---------- */
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add("in");
          io.unobserve(e.target);
        }
      });
    },
    { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
  );
  document.querySelectorAll("[data-reveal], .feat-card, .pull").forEach((el) => {
    // hero headline pull-up is gated by body.loaded instead
    if (el.closest(".hero")) return;
    io.observe(el);
  });
  // hero pull-up fires with the load sequence
  if (!reduced) {
    setTimeout(() => document.querySelectorAll(".hero .pull").forEach((p) => p.classList.add("in")), reduced ? 0 : 1450);
  } else {
    document.querySelectorAll(".hero .pull").forEach((p) => p.classList.add("in"));
  }

  /* ---------- counters ---------- */
  const cio = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        cio.unobserve(e.target);
        const el = e.target;
        const target = parseFloat(el.dataset.count);
        const decimals = (el.dataset.count.split(".")[1] || "").length;
        const dur = reduced ? 0 : 1400;
        const t0 = performance.now();
        function tick(t) {
          const p = dur === 0 ? 1 : Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          let val = (target * eased);
          el.textContent = decimals ? val.toFixed(decimals) : Math.round(val).toLocaleString();
          if (p < 1) requestAnimationFrame(tick);
        }
        requestAnimationFrame(tick);
      });
    },
    { threshold: 0.5 }
  );
  document.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));

  /* ---------- scroll-linked effects (rAF loop) ---------- */
  const heroMedia = document.querySelector(".hero-media");
  const footer = document.querySelector("footer");
  const wordmark = document.querySelector(".wordmark");
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const easeOut = (p) => 1 - Math.pow(1 - p, 2.4);
  let lastY = -1;

  function frame() {
    const y = window.scrollY;
    if (y !== lastY) {
      lastY = y;
      if (!reduced && !calm()) {
        if (heroMedia && y < window.innerHeight * 1.3) {
          heroMedia.style.transform = `translateY(${y * 0.16}px)`;
        }
        if (footer && wordmark) {
          const r = footer.getBoundingClientRect();
          const p = clamp01((window.innerHeight - r.top) / (r.height * 0.9));
          wordmark.style.transform = `translateY(${(1 - easeOut(p)) * 38}%)`;
        }
      }
      // char reveal — progressive opacity as the paragraph scrolls through
      if (!reduced) {
        charEls.forEach(({ el, chars }) => {
          const r = el.getBoundingClientRect();
          const start = window.innerHeight * 0.85;
          const end = window.innerHeight * 0.32;
          const prog = clamp01((start - r.top) / (start - end));
          const n = chars.length;
          chars.forEach((c, idx) => {
            const cp = idx / n;
            const local = clamp01((prog - cp * 0.85) / 0.12);
            c.style.opacity = (0.18 + 0.82 * local).toFixed(3);
          });
        });
      }
    }
    requestAnimationFrame(frame);
  }
  if (reduced) {
    charEls.forEach(({ chars }) => chars.forEach((c) => (c.style.opacity = "1")));
  }
  requestAnimationFrame(frame);

  /* ---------- magnetic buttons ---------- */
  if (!reduced && window.matchMedia("(pointer: fine)").matches) {
    document.querySelectorAll(".cta-pill, .btn-solid").forEach((btn) => {
      btn.addEventListener("mousemove", (e) => {
        if (calm()) return;
        const r = btn.getBoundingClientRect();
        const dx = (e.clientX - r.left - r.width / 2) / r.width;
        const dy = (e.clientY - r.top - r.height / 2) / r.height;
        btn.style.transform = `translate(${dx * 7}px, ${dy * 5}px)`;
      });
      btn.addEventListener("mouseleave", () => { btn.style.transform = ""; });
    });
  }

  /* ---------- mobile nav menu ---------- */
  (function () {
    const nav = document.querySelector(".nav");
    const btn = document.getElementById("menuBtn");
    const links = document.getElementById("navLinks");
    if (!nav || !btn || !links) return;
    const setOpen = (open) => {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      setOpen(!nav.classList.contains("open"));
    });
    links.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("click", (e) => {
      if (nav.classList.contains("open") && !nav.contains(e.target)) setOpen(false);
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("open")) { setOpen(false); btn.focus(); }
    });
  })();

  /* ---------- hero video: load via blob (preview hosts serve mp4 without range support) ---------- */
  (function () {
    const v = document.querySelector(".hero-video");
    if (!v) return;
    const srcUrl = v.getAttribute("data-src") || (v.querySelector("source") && v.querySelector("source").getAttribute("src"));
    const kick = () => { try { const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {} };
    async function load() {
      if (!srcUrl) return;
      try {
        const r = await fetch(srcUrl);
        if (!r.ok) return;
        v.src = URL.createObjectURL(await r.blob());
        v.load();
        kick();
      } catch (e) {}
    }
    window.addEventListener("load", kick);
    load();
  })();

  /* ---------- store gallery: drag-scroll, wheel, auto-drift, lightbox ---------- */
  (function () {
    const track = document.getElementById("storeTrack");
    if (!track) return;
    const shots = Array.from(track.querySelectorAll(".shot"));
    shots.forEach((fig) => {
      const b = document.createElement("span");
      b.className = "expand"; b.setAttribute("aria-hidden", "true"); b.textContent = "⤢";
      fig.appendChild(b);
      const cap = fig.querySelector("figcaption .t");
      fig.setAttribute("role", "button");
      fig.setAttribute("tabindex", "0");
      fig.setAttribute("aria-label", (cap ? cap.textContent + " — " : "") + "enlarge photo");
    });

    let moved = 0;
    const pin = document.getElementById("storePin");
    const stage = pin && pin.querySelector(".store-stage");
    const prog = document.getElementById("storeProg");
    const flat = reduced || calm();

    if (pin && stage && !flat) {
      /* ---- pinned: vertical scroll drives the strip horizontally ---- */
      let maxShift = 0, cur = 0, target = 0;
      const ease = 0.12;

      function layout() {
        maxShift = Math.max(0, track.scrollWidth - stage.clientWidth);
        // tall enough that traversing the strip takes a comfortable scroll
        pin.style.height = (stage.clientHeight + maxShift) + "px";
      }
      function loop() {
        if (maxShift > 0) {
          const top = pin.getBoundingClientRect().top;
          let p = -top / maxShift;
          p = p < 0 ? 0 : p > 1 ? 1 : p;
          target = p;
        } else {
          target = 0;
        }
        cur += (target - cur) * ease;
        if (Math.abs(target - cur) < 0.0004) cur = target;
        track.style.transform = "translate3d(" + (-cur * maxShift).toFixed(2) + "px,0,0)";
        if (prog) prog.style.transform = "scaleX(" + cur.toFixed(4) + ")";
        requestAnimationFrame(loop);
      }
      window.addEventListener("resize", layout);
      window.addEventListener("load", layout);
      // re-measure once lazy images arrive (their width sets scrollWidth)
      track.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", layout, { once: true });
      });
      // one-shot measurements race the first paint (stage height / track width
      // can still be settling), which collapses the pin and kills the animation
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(layout);
        ro.observe(stage);
        ro.observe(track);
      }
      layout();
      setTimeout(layout, 400);
      requestAnimationFrame(loop);
    } else {
      /* ---- fallback: plain horizontal drag-scroll, no pin ---- */
      if (stage) stage.classList.add("no-pin");
      let down = false, startX = 0, startLeft = 0;
      track.addEventListener("pointerdown", (e) => {
        down = true; moved = 0; startX = e.clientX; startLeft = track.scrollLeft;
        track.setPointerCapture(e.pointerId);
      });
      track.addEventListener("pointermove", (e) => {
        if (!down) return;
        const dx = e.clientX - startX;
        moved = Math.max(moved, Math.abs(dx));
        if (moved > 4) track.classList.add("dragging");
        track.scrollLeft = startLeft - dx;
      });
      const release = (e) => {
        if (!down) return;
        down = false;
        try { track.releasePointerCapture(e.pointerId); } catch (_) {}
        setTimeout(() => track.classList.remove("dragging"), 0);
      };
      track.addEventListener("pointerup", release);
      track.addEventListener("pointercancel", release);
      track.addEventListener("wheel", (e) => {
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { track.scrollLeft += e.deltaY; e.preventDefault(); }
      }, { passive: false });
    }

    // lightbox
    const lb = document.getElementById("storeLightbox");
    const lbImg = document.getElementById("lbImg");
    const lbCap = document.getElementById("lbCap");
    let idx = 0, lastFocus = null;
    const lbClose = document.getElementById("lbClose");
    function show(i) {
      idx = (i + shots.length) % shots.length;
      const fig = shots[idx];
      const img = fig.querySelector("img");
      lbImg.src = img.src;
      lbImg.alt = img.alt || "";
      const capEl = fig.querySelector("figcaption .t");
      lbCap.textContent = (capEl ? capEl.textContent : "") + "  ·  " + (idx + 1) + " / " + shots.length;
    }
    function open(i) { lastFocus = shots[i] || document.activeElement; show(i); lb.classList.add("open"); lb.setAttribute("aria-hidden", "false"); if (lbClose) lbClose.focus(); }
    function close() { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); if (lastFocus && lastFocus.focus) lastFocus.focus(); }
    shots.forEach((fig, i) => {
      fig.addEventListener("click", () => { if (moved <= 4) open(i); });
      fig.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(i); }
      });
    });
    document.getElementById("lbClose").addEventListener("click", close);
    document.getElementById("lbPrev").addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); });
    document.getElementById("lbNext").addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); });
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.classList.contains("lb-stage")) close(); });
    document.addEventListener("keydown", (e) => {
      if (!lb.classList.contains("open")) return;
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") show(idx - 1);
      else if (e.key === "ArrowRight") show(idx + 1);
    });
  })();
})();
