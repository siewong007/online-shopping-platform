import { useEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { LangToggle, useI18n } from "../../i18n/LanguageContext";

import "./landing.css";

const WA_GENERAL = "https://wa.me/60174056993?text=Hi%20Ekoway%20Hardware%2C%20saya%20ingin%20bertanya...";
const WA_JOIN = "https://wa.me/60174056993?text=Saya%20nak%20join%20broadcast%20Ekoway";
const waTopic = (topic: string) => `https://wa.me/60174056993?text=Hi%2C%20saya%20nak%20tanya%20tentang%20${topic}`;

const MAPS_EMBED =
  "https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3986.6977382848936!2d111.86063787456054!3d2.26624669771383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31f82ab60c66c68d%3A0x917e4600a1a1d410!2sEKOWAY%20HARDWARE!5e0!3m2!1szh-CN!2smy!4v1781600738759!5m2!1szh-CN!2smy";

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type PullSegment = { text: string; className?: string; star?: boolean };

function pullWords(segments: PullSegment[]): ReactNode[] {
  let index = 0;
  return segments.map((segment, si) => {
    if (segment.star) {
      const style = { "--i": String(index++) } as CSSProperties;
      return (
        <span key={si} className={`${segment.className ?? ""} w`} style={style}>
          {segment.text}
        </span>
      );
    }
    const words = segment.text.split(/(\s+)/).filter((w) => w !== "");
    const spans = words.map((word, wi) => {
      const style = { "--i": String(index++) } as CSSProperties;
      return (
        <span key={wi} className={/^\s+$/.test(word) ? "w sp" : "w"} style={style}>
          {word}
        </span>
      );
    });
    return segment.className ? (
      <span key={si} className={segment.className}>
        {spans}
      </span>
    ) : (
      <span key={si}>{spans}</span>
    );
  });
}

function charSpans(text: string): ReactNode[] {
  return Array.from(text).map((c, i) => (
    <span key={i} className="ch" style={{ opacity: 0.18 }}>
      {c}
    </span>
  ));
}

const catRows = [
  { num: "/01", name: "cat.01.name", sub: "cat.01.sub", img: "/ekoway/slots/cat-power-tools.png", topic: "Power%20Tools" },
  { num: "/02", name: "cat.02.name", sub: "cat.02.sub", img: "/ekoway/slots/cat-paints.png", topic: "Paint" },
  { num: "/03", name: "cat.03.name", sub: "cat.03.sub", img: "/ekoway/slots/cat-building.png", topic: "Building%20Materials" },
  { num: "/04", name: "cat.04.name", sub: "cat.04.sub", img: "/ekoway/slots/cat-bathroom.png", topic: "Bathroom%20Accessories" },
  { num: "/05", name: "cat.05.name", sub: "cat.05.sub", img: "/ekoway/slots/cat-kitchen.png", topic: "Kitchen%20Accessories" },
  { num: "/06", name: "cat.06.name", sub: "cat.06.sub", img: "/ekoway/slots/cat-electrical.png", topic: "Electrical%20Appliances" }
] as const;

const dealCards = [
  { img: "/ekoway/slots/feat-power.png", brand: "BOSCH · DONGCHENG · STANLEY", title: "month.1.title", body: "month.1.body", topic: "Power%20Tools" },
  { img: "/ekoway/img/paints.jpg", brand: "Nippon Paint · Smart Paint", title: "month.2.title", body: "month.2.body", topic: "Paints" },
  { img: "/ekoway/img/home-appliances.jpg", brand: "Panasonic · Midea · KDK", title: "month.3.title", body: "month.3.body", topic: "Home%20Appliances" },
  { img: "/ekoway/img/bathroom-plumbing.jpg", brand: "Saniware · Cabana · Inspire", title: "month.4.title", body: "month.4.body", topic: "Bathroom%20and%20Plumbing" }
] as const;

const stats = [
  { count: 9, suffix: "", label: "stat.1" },
  { count: 18, suffix: "+", label: "stat.2" },
  { count: 10000, suffix: "+", label: "stat.3" },
  { count: 4000, suffix: "+", label: "stat.4" }
] as const;

const brandRowA = ["Bosch", "Stanley", "Dong Cheng", "Black+Decker", "Kobelco", "Nippon Paint", "Smart Paint", "Panasonic"];
const brandRowB = ["KDK", "Khind", "Midea", "Joven", "Alpha", "Sorento", "Cabana", "Saniware", "Inspire"];

const storeShots = [
  { src: "/ekoway/store/store-03.jpg", cap: "store.cap.1", wide: false },
  { src: "/ekoway/store/store-02.jpg", cap: "store.cap.2", wide: false },
  { src: "/ekoway/store/store-07.jpg", cap: "store.cap.3", wide: false },
  { src: "/ekoway/store/store-01.jpg", cap: "store.cap.4", wide: false },
  { src: "/ekoway/store/store-05.jpg", cap: "store.cap.5", wide: false },
  { src: "/ekoway/store/store-04.jpg", cap: "store.cap.6", wide: false },
  { src: "/ekoway/store/store-09.jpg", cap: "store.cap.7", wide: true },
  { src: "/ekoway/store/store-10.jpg", cap: "store.cap.8", wide: false },
  { src: "/ekoway/store/store-06.jpg", cap: "store.cap.9", wide: false },
  { src: "/ekoway/store/store-08.jpg", cap: "store.cap.10", wide: false }
] as const;

const whyIcons = [
  <svg key="shield" className="ficon" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </svg>,
  <svg key="tag" className="ficon" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20.6 13.4l-7.2 7.2a2 2 0 0 1-2.8 0l-6.2-6.2a2 2 0 0 1-.6-1.4V4.4a1.4 1.4 0 0 1 1.4-1.4h6.2a2 2 0 0 1 1.4.6l6.8 6.8a2 2 0 0 1 0 2.8z" />
    <circle cx="8" cy="8" r="1.4" />
  </svg>,
  <svg key="chat" className="ficon" viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4v-4H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
    <path d="M8 10h8M8 13h5" />
  </svg>
];

const whyCards = [
  {
    num: "01",
    title: "why.1.title",
    points: ["why.1.a", "why.1.b", "why.1.c", "why.1.d"],
    learn: "why.1.learn",
    href: "#brands"
  },
  {
    num: "02",
    title: "why.2.title",
    points: ["why.2.a", "why.2.b", "why.2.c"],
    learn: "why.2.learn",
    href: "#contact"
  },
  {
    num: "03",
    title: "why.3.title",
    points: ["why.3.a", "why.3.b", "why.3.c"],
    learn: "why.3.learn",
    href: "#contact"
  }
] as const;

function delay(seconds: number): CSSProperties {
  return { "--d": `${seconds}s` } as CSSProperties;
}

type LandingViewProps = {
  onOpenShop: () => void;
};

export function LandingView({ onOpenShop }: LandingViewProps) {
  const { lang, t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<HTMLElement>(null);
  const lbCloseRef = useRef<HTMLButtonElement>(null);
  const dragMovedRef = useRef(0);

  const [introState, setIntroState] = useState<"idle" | "play" | "done" | "gone">("idle");
  const [loaded, setLoaded] = useState(false);
  const [heroIn, setHeroIn] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [lightbox, setLightbox] = useState<{ open: boolean; idx: number }>({ open: false, idx: 0 });

  /* keep overscroll black behind the cream-on-black landing, not the storefront's light page bg */
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = "#000";
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  /* intro curtain + load sequence */
  useEffect(() => {
    if (prefersReducedMotion()) {
      setIntroState("gone");
      setLoaded(true);
      setHeroIn(true);
      return;
    }
    const raf = requestAnimationFrame(() => setIntroState("play"));
    const tDone = window.setTimeout(() => {
      setLoaded(true);
      setIntroState("done");
    }, 1400);
    const tHero = window.setTimeout(() => setHeroIn(true), 1450);
    const tGone = window.setTimeout(() => setIntroState("gone"), 2400);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(tDone);
      window.clearTimeout(tHero);
      window.clearTimeout(tGone);
    };
  }, []);

  /* scroll reveals + counters */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.16, rootMargin: "0px 0px -40px 0px" }
    );
    root.querySelectorAll("[data-reveal], .feat-card, .pull").forEach((el) => {
      if (el.closest(".hero")) return;
      io.observe(el);
    });

    const cio = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          cio.unobserve(entry.target);
          const el = entry.target as HTMLElement;
          const target = parseFloat(el.dataset.count ?? "0");
          const duration = reduced ? 0 : 1400;
          const t0 = performance.now();
          const tick = (now: number) => {
            const p = duration === 0 ? 1 : Math.min(1, (now - t0) / duration);
            const eased = 1 - Math.pow(1 - p, 3);
            el.textContent = Math.round(target * eased).toLocaleString();
            if (p < 1) requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
      },
      { threshold: 0.5 }
    );
    root.querySelectorAll("[data-count]").forEach((el) => cio.observe(el));

    return () => {
      io.disconnect();
      cio.disconnect();
    };
  }, []);

  /* scroll-linked effects: hero parallax, footer wordmark, char reveal */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const heroMedia = root.querySelector<HTMLElement>(".hero-media");
    const footer = root.querySelector<HTMLElement>("footer");
    const wordmark = root.querySelector<HTMLElement>(".wordmark");
    const charHost = root.querySelector<HTMLElement>("[data-charreveal]");
    const chars = charHost ? Array.from(charHost.querySelectorAll<HTMLElement>(".ch")) : [];
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const easeOut = (p: number) => 1 - Math.pow(1 - p, 2.4);

    if (reduced) {
      chars.forEach((c) => (c.style.opacity = "1"));
      return;
    }

    let lastY = -1;
    let rafId = 0;
    const frame = () => {
      const y = window.scrollY;
      if (y !== lastY) {
        lastY = y;
        if (heroMedia && y < window.innerHeight * 1.3) {
          heroMedia.style.transform = `translateY(${y * 0.16}px)`;
        }
        if (footer && wordmark) {
          const rect = footer.getBoundingClientRect();
          const p = clamp01((window.innerHeight - rect.top) / (rect.height * 0.9));
          wordmark.style.transform = `translateY(${(1 - easeOut(p)) * 38}%)`;
        }
        if (charHost && chars.length > 0) {
          const rect = charHost.getBoundingClientRect();
          const start = window.innerHeight * 0.85;
          const end = window.innerHeight * 0.32;
          const prog = clamp01((start - rect.top) / (start - end));
          const n = chars.length;
          chars.forEach((c, idx) => {
            const cp = idx / n;
            const local = clamp01((prog - cp * 0.85) / 0.12);
            c.style.opacity = (0.18 + 0.82 * local).toFixed(3);
          });
        }
      }
      rafId = requestAnimationFrame(frame);
    };
    rafId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafId);
  }, [lang]);

  /* magnetic buttons */
  useEffect(() => {
    const root = rootRef.current;
    if (!root || prefersReducedMotion() || !window.matchMedia("(pointer: fine)").matches) return;
    const buttons = Array.from(root.querySelectorAll<HTMLElement>(".cta-pill, .btn-solid"));
    const onMove = (event: MouseEvent) => {
      const btn = event.currentTarget as HTMLElement;
      const rect = btn.getBoundingClientRect();
      const dx = (event.clientX - rect.left - rect.width / 2) / rect.width;
      const dy = (event.clientY - rect.top - rect.height / 2) / rect.height;
      btn.style.transform = `translate(${dx * 7}px, ${dy * 5}px)`;
    };
    const onLeave = (event: MouseEvent) => {
      (event.currentTarget as HTMLElement).style.transform = "";
    };
    buttons.forEach((btn) => {
      btn.addEventListener("mousemove", onMove);
      btn.addEventListener("mouseleave", onLeave);
    });
    return () => {
      buttons.forEach((btn) => {
        btn.removeEventListener("mousemove", onMove);
        btn.removeEventListener("mouseleave", onLeave);
      });
    };
  }, []);

  /* mobile menu: close on outside click / Escape */
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (event: MouseEvent) => {
      const nav = rootRef.current?.querySelector(".nav");
      if (nav && !nav.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  /* store gallery: pinned scroll (or drag-scroll fallback) */
  useEffect(() => {
    const pin = pinRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    const prog = progRef.current;
    if (!pin || !stage || !track) return;

    if (!prefersReducedMotion()) {
      let maxShift = 0;
      let cur = 0;
      let target = 0;
      let rafId = 0;
      const ease = 0.12;

      const layout = () => {
        maxShift = Math.max(0, track.scrollWidth - stage.clientWidth);
        pin.style.height = `${stage.clientHeight + maxShift}px`;
      };
      const loop = () => {
        if (maxShift > 0) {
          const top = pin.getBoundingClientRect().top;
          target = Math.max(0, Math.min(1, -top / maxShift));
        } else {
          target = 0;
        }
        cur += (target - cur) * ease;
        if (Math.abs(target - cur) < 0.0004) cur = target;
        track.style.transform = `translate3d(${(-cur * maxShift).toFixed(2)}px,0,0)`;
        if (prog) prog.style.transform = `scaleX(${cur.toFixed(4)})`;
        rafId = requestAnimationFrame(loop);
      };
      window.addEventListener("resize", layout);
      window.addEventListener("load", layout);
      track.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", layout, { once: true });
      });
      // one-shot measurements race the first paint (stage height / track width
      // can still be settling), which collapses the pin and kills the animation
      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : null;
      ro?.observe(stage);
      ro?.observe(track);
      layout();
      const relayout = window.setTimeout(layout, 400);
      rafId = requestAnimationFrame(loop);
      return () => {
        window.removeEventListener("resize", layout);
        window.removeEventListener("load", layout);
        ro?.disconnect();
        window.clearTimeout(relayout);
        cancelAnimationFrame(rafId);
        pin.style.height = "";
        track.style.transform = "";
      };
    }

    /* reduced motion: plain drag-scroll, no pin */
    stage.classList.add("no-pin");
    let down = false;
    let startX = 0;
    let startLeft = 0;
    const onDown = (event: PointerEvent) => {
      down = true;
      dragMovedRef.current = 0;
      startX = event.clientX;
      startLeft = track.scrollLeft;
      track.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!down) return;
      const dx = event.clientX - startX;
      dragMovedRef.current = Math.max(dragMovedRef.current, Math.abs(dx));
      if (dragMovedRef.current > 4) track.classList.add("dragging");
      track.scrollLeft = startLeft - dx;
    };
    const release = (event: PointerEvent) => {
      if (!down) return;
      down = false;
      try {
        track.releasePointerCapture(event.pointerId);
      } catch {
        // pointer capture already released
      }
      window.setTimeout(() => track.classList.remove("dragging"), 0);
    };
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        track.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    };
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    track.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      stage.classList.remove("no-pin");
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", release);
      track.removeEventListener("pointercancel", release);
      track.removeEventListener("wheel", onWheel);
    };
  }, []);

  /* lightbox keyboard navigation */
  useEffect(() => {
    if (!lightbox.open) return;
    lbCloseRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLightbox((c) => ({ ...c, open: false }));
      else if (event.key === "ArrowLeft")
        setLightbox((c) => ({ ...c, idx: (c.idx - 1 + storeShots.length) % storeShots.length }));
      else if (event.key === "ArrowRight") setLightbox((c) => ({ ...c, idx: (c.idx + 1) % storeShots.length }));
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [lightbox.open]);

  const openLightbox = (idx: number) => {
    if (dragMovedRef.current > 4) return;
    setLightbox({ open: true, idx });
  };

  const shot = storeShots[lightbox.idx];

  return (
    <div className={`landing-page ${loaded ? "loaded" : ""}`} ref={rootRef}>
      {introState !== "gone" ? (
        <div className={`intro ${introState === "play" ? "play" : ""} ${introState === "done" ? "done" : ""}`} aria-hidden="true">
          <div className="intro-word">
            <span>
              Ekoway<sup>*</sup>
            </span>
          </div>
        </div>
      ) : null}

      {/* hero */}
      <header className="hero">
        <div className="hero-frame">
          <div className="hero-media">
            <video
              className="hero-video"
              src="/ekoway/hero.mp4"
              poster="/ekoway/hero-poster.jpg"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
          <div className="hero-noise" />
          <div className="hero-grad" />

          <nav className={`nav ${menuOpen ? "open" : ""}`}>
            <a className="brand" href="#top" onClick={(e) => e.preventDefault()}>
              <img src="/ekoway/ekoway-logo.jpeg" alt="Ekoway logo" />
              <b>Ekoway</b>
            </a>
            <span className="divider" />
            <div className="links" id="navLinks" onClick={() => setMenuOpen(false)}>
              <a href="#categories">{t("nav.catalog")}</a>
              <a href="#month">{t("nav.month")}</a>
              <a href="#why">{t("nav.why")}</a>
              <a href="#about">{t("nav.story")}</a>
              <a href="#contact">{t("nav.contact")}</a>
              <button type="button" onClick={onOpenShop}>
                {t("nav.shop")}
              </button>
            </div>
            <span className="divider" />
            <LangToggle />
            <button
              type="button"
              className="menu-btn"
              aria-label="Menu"
              aria-expanded={menuOpen}
              aria-controls="navLinks"
              onClick={(event) => {
                event.stopPropagation();
                setMenuOpen((open) => !open);
              }}
            >
              <span />
              <span />
            </button>
          </nav>

          <div className="hero-inner">
            <div className="hero-eyebrow">
              <span className="dash" />
              <span className="label">Ekoway Hardware · 永光五金 · Sibu, Sarawak</span>
            </div>
            <h1 className={`pull ${heroIn ? "in" : ""}`}>
              {pullWords([{ text: "Ekoway" }, { text: "*", className: "star", star: true }])}
            </h1>
            <div className="hero-right">
              <p>{t("hero.sub")}</p>
              <div className="hero-actions">
                <a className="cta-pill" href={WA_GENERAL} target="_blank" rel="noopener">
                  <span>{t("hero.cta")}</span>
                  <span className="circle">↗</span>
                </a>
                <a className="hero-sec" href="#categories">
                  <span>{t("hero.browse")}</span> <span className="arr">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* promo marquee */}
      <div className="promo">
        <div className="promo-track">
          {[false, true].map((hidden) => (
            <div className="promo-group" aria-hidden={hidden || undefined} key={String(hidden)}>
              <span>{t("tick.1")}</span>
              <i>◆</i>
              <span>{t("tick.2")}</span>
              <i>◆</i>
              <span>{t("tick.3")}</span>
              <i>◆</i>
              <span>{t("tick.4")}</span>
              <i>◆</i>
            </div>
          ))}
        </div>
      </div>

      {/* about */}
      <section className="about" id="about">
        <div className="container">
          <div className="about-card" data-reveal="">
            <div className="label">{t("about.label")}</div>
            <h2 className="about-head pull">
              {pullWords([
                { text: t("about.head.1") },
                { text: t("about.head.serif"), className: "serif" },
                { text: t("about.head.2") }
              ])}
            </h2>
            <p className="about-body" data-charreveal="" key={lang}>
              {charSpans(t("about.body"))}
            </p>
          </div>
        </div>
      </section>

      {/* categories */}
      <section id="categories">
        <div className="container">
          <div className="sec-head" data-reveal="">
            <span className="idx">01</span>
            <h2 className="display">{t("sec.cat.title")}</h2>
            <a className="more" href="#contact">
              {t("sec.cat.more")}
            </a>
          </div>
          <div className="cat-list">
            {catRows.map((row, index) => (
              <div className="cat-row" data-reveal="" style={delay(index * 0.04)} key={row.num}>
                <span className="num">{row.num}</span>
                <div>
                  <h3>{t(row.name)}</h3>
                  <div className="sub">{t(row.sub)}</div>
                </div>
                <div className="cat-thumb">
                  <img src={row.img} alt={t(row.name)} loading="lazy" />
                </div>
                <a
                  className="go"
                  href={waTopic(row.topic)}
                  target="_blank"
                  rel="noopener"
                  aria-label={`WhatsApp about ${t(row.name)}`}
                >
                  ↗
                </a>
              </div>
            ))}
          </div>
          <div style={{ height: 40 }} />
        </div>
      </section>

      {/* this month */}
      <section id="month" className="deals">
        <div className="container">
          <div className="sec-head" data-reveal="">
            <span className="idx">02</span>
            <h2 className="display">{t("sec.month.title")}</h2>
            <a className="more" href={WA_GENERAL} target="_blank" rel="noopener">
              {t("sec.month.more")}
            </a>
          </div>
          <div className="deal-grid">
            {dealCards.map((card, index) => (
              <div className="deal-card" data-reveal="" style={delay(index * 0.08)} key={card.brand}>
                <img className="slot-img" src={card.img} alt={t(card.title)} loading="lazy" />
                <div className="dbrand">{card.brand}</div>
                <h4>{t(card.title)}</h4>
                <p className="dnote">{t(card.body)}</p>
                <a className="btn btn-ghost dwa" href={waTopic(card.topic)} target="_blank" rel="noopener">
                  <span>{t("month.wa")}</span> <span className="arr">↗</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* stats */}
      <section className="stats">
        <div className="container">
          <div className="stats-inner">
            {stats.map((stat, index) => (
              <div className="stat" data-reveal="" style={delay(index * 0.08)} key={stat.label}>
                <div className="n">
                  <span data-count={stat.count}>0</span>
                  {stat.suffix}
                </div>
                <div className="t">{t(stat.label)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* why */}
      <section id="why" className="features">
        <div className="container">
          <div className="sec-head" data-reveal="">
            <span className="idx">03</span>
            <h2 className="display">{t("sec.why.title")}</h2>
          </div>
          <div className="feat-head" data-reveal="">
            <span className="l1">{t("why.head1")}</span>
            <span className="l2">{t("why.head2")}</span>
          </div>
          <div className="feat-grid">
            <div className="feat-card media" style={delay(0)}>
              <img className="slot-img" src="/ekoway/img/why-ekoway.jpg" alt={t("why.cap")} loading="lazy" />
              <div className="m-grad" />
              <div className="m-cap">{t("why.cap")}</div>
            </div>
            {whyCards.map((card, index) => (
              <div className="feat-card" style={delay(0.12 * (index + 1))} key={card.num}>
                <div className="f-top">
                  <div className="ic">{whyIcons[index]}</div>
                  <span className="f-num">{card.num}</span>
                </div>
                <h3>{t(card.title)}</h3>
                <ul>
                  {card.points.map((point) => (
                    <li key={point}>
                      <span className="ck">✓</span>
                      <span>{t(point)}</span>
                    </li>
                  ))}
                </ul>
                <a className="learn" href={card.href}>
                  <span>{t(card.learn)}</span> <span className="arr">↗</span>
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* brands */}
      <section id="brands" className="brands">
        <div className="container" data-reveal="">
          <span className="label" style={{ display: "block", paddingBottom: 26 }}>
            {t("sec.brands")}
          </span>
        </div>
        {[brandRowA, brandRowB].map((row, rowIndex) => (
          <div className={`brand-row ${rowIndex === 1 ? "rev" : ""}`} key={rowIndex}>
            <div className="brand-track">
              {[false, true].map((hidden) => (
                <div className="brand-group" aria-hidden={hidden || undefined} key={String(hidden)}>
                  {row.map((brand) => (
                    <span key={brand} style={{ display: "contents" }}>
                      <span>{brand}</span>
                      <i>◆</i>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* proof */}
      <section id="proof" className="proof">
        <div className="container">
          <div className="sec-head" data-reveal="">
            <span className="idx">05</span>
            <h2 className="display">{t("sec.proof.title")}</h2>
          </div>
          <div className="proof-grid">
            <blockquote className="proof-quote" data-reveal="" style={delay(0)}>
              <p>{t("proof.quote")}</p>
              <cite>{t("proof.attr")}</cite>
            </blockquote>
            <a className="proof-card" href="https://facebook.com/ekowayhardware" target="_blank" rel="noopener" data-reveal="" style={delay(0.1)}>
              <span className="proof-k">{t("proof.fb.k")}</span>
              <span className="proof-v">{t("proof.fb.v")}</span>
              <span className="arr">↗</span>
            </a>
            <a className="proof-card" href="#contact" data-reveal="" style={delay(0.18)}>
              <span className="proof-k">{t("proof.g.k")}</span>
              <span className="proof-v">{t("proof.g.v")}</span>
              <span className="arr">↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* store gallery */}
      <section className="store-wrap">
        <div className="store-head container" data-reveal="">
          <div className="label">{t("store.label")}</div>
          <h2 className="display store-title">
            {t("store.head.1")}
            <br />
            <span className="serif">{t("store.head.serif")}</span>
          </h2>
          <p className="store-lede">{t("store.lede")}</p>
        </div>

        <div className="store-gallery">
          <div className="store-pin" ref={pinRef}>
            <div className="store-stage" ref={stageRef}>
              <div className="store-track" ref={trackRef}>
                {storeShots.map((item, index) => (
                  <figure
                    className={`shot ${item.wide ? "wide" : ""}`}
                    key={item.src}
                    role="button"
                    tabIndex={0}
                    aria-label={`${t(item.cap)} — enlarge photo`}
                    onClick={() => openLightbox(index)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openLightbox(index);
                      }
                    }}
                  >
                    <img src={item.src} alt={t(item.cap)} loading="lazy" draggable={false} />
                    <figcaption>
                      <span className="n">{String(index + 1).padStart(2, "0")}</span>
                      <span className="t">{t(item.cap)}</span>
                    </figcaption>
                    <span className="expand" aria-hidden="true">
                      ⤢
                    </span>
                  </figure>
                ))}
              </div>
              <div className="store-progress">
                <i ref={progRef} />
              </div>
            </div>
          </div>
          <div className="store-foot container">
            <span className="store-tag">{t("store.tag")}</span>
            <span className="store-hint">{t("store.hint")}</span>
          </div>
        </div>
      </section>

      {/* lightbox */}
      <div className={`lightbox ${lightbox.open ? "open" : ""}`} aria-hidden={!lightbox.open}>
        <button className="lb-close" ref={lbCloseRef} aria-label="Close" onClick={() => setLightbox((c) => ({ ...c, open: false }))}>
          ✕
        </button>
        <button
          className="lb-nav lb-prev"
          aria-label="Previous"
          onClick={(event) => {
            event.stopPropagation();
            setLightbox((c) => ({ ...c, idx: (c.idx - 1 + storeShots.length) % storeShots.length }));
          }}
        >
          ‹
        </button>
        <div className="lb-stage" onClick={() => setLightbox((c) => ({ ...c, open: false }))}>
          <img className="lb-img" src={shot.src} alt={t(shot.cap)} onClick={(event) => event.stopPropagation()} />
        </div>
        <button
          className="lb-nav lb-next"
          aria-label="Next"
          onClick={(event) => {
            event.stopPropagation();
            setLightbox((c) => ({ ...c, idx: (c.idx + 1) % storeShots.length }));
          }}
        >
          ›
        </button>
        <div className="lb-cap">
          {t(shot.cap)}&nbsp;&nbsp;·&nbsp;&nbsp;{lightbox.idx + 1} / {storeShots.length}
        </div>
      </div>

      {/* CTA pre-footer */}
      <section className="cta">
        <div className="container">
          <h2 className="display" data-reveal="">
            {t("cta.head.1")}
            <br />
            <span className="outline">{t("cta.head.outline")}</span>
          </h2>
          <div className="cta-row" data-reveal="" style={delay(0.15)}>
            <div className="cta-btns">
              <a className="btn btn-solid" href={WA_GENERAL} target="_blank" rel="noopener">
                <span>{t("cta.wa")}</span> <span className="arr">↗</span>
              </a>
              <a className="btn btn-ghost" href="#contact">
                {t("cta.visit")}
              </a>
            </div>
            <div className="wa-join">
              <span className="label">{t("cta.join.k")}</span>
              <a className="btn btn-ghost" href={WA_JOIN} target="_blank" rel="noopener">
                <span>{t("cta.join.v")}</span> <span className="arr">↗</span>
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* contact */}
      <section id="contact" className="contact">
        <div className="container">
          <div className="sec-head" data-reveal="">
            <span className="idx">06</span>
            <h2 className="display">{t("sec.contact.title")}</h2>
          </div>
          <div className="contact-grid">
            <div className="contact-info" data-reveal="">
              <div className="ci-block">
                <div className="label">{t("contact.addr.k")}</div>
                <p className="ci-addr">
                  NO. 43-44, Lorong Salim 17, Jalan Salim,
                  <br />
                  96000 Sibu, Sarawak
                </p>
              </div>
              <div className="ci-block">
                <div className="label">{t("contact.hours.k")}</div>
                <table className="hours">
                  <tbody>
                    <tr>
                      <td>{t("contact.hours.wk")}</td>
                      <td>{t("contact.hours.wkt")}</td>
                    </tr>
                    <tr>
                      <td>{t("contact.hours.sun")}</td>
                      <td>{t("contact.hours.sunt")}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div className="ci-actions">
                <a className="btn btn-solid" href={WA_GENERAL} target="_blank" rel="noopener">
                  <span>{t("contact.wa")}</span> <span className="arr">↗</span>
                </a>
                <a className="btn btn-ghost" href="tel:+6084253883">
                  {t("contact.call")}
                </a>
                <a
                  className="btn btn-ghost"
                  href="mailto:ekowayhardware@gmail.com?subject=Enquiry%20for%20Ekoway%20Hardware&body=Hi%20Ekoway%20Hardware%2C%0A%0ASaya%20ingin%20bertanya%20tentang%3A%0A%0A"
                >
                  {t("contact.email")}
                </a>
                <a className="btn btn-ghost" href="https://facebook.com/ekowayhardware" target="_blank" rel="noopener">
                  {t("contact.fb")}
                </a>
              </div>
            </div>
            <div className="contact-map" data-reveal="" style={delay(0.12)}>
              <iframe
                src={MAPS_EMBED}
                title="Ekoway Hardware location on Google Maps"
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <img src="/ekoway/ekoway-logo.jpeg" alt="Ekoway logo" />
              <p>
                {t("foot.tag.1")}
                <br />
                {t("foot.tag.2")}
              </p>
            </div>
            <div>
              <div className="label">{t("foot.shop")}</div>
              <a href="#categories">{t("foot.s1")}</a>
              <a href="#categories">{t("foot.s2")}</a>
              <a href="#categories">{t("foot.s3")}</a>
              <a href="#categories">{t("foot.s4")}</a>
              <button type="button" className="foot-link" onClick={onOpenShop}>
                {t("nav.shop")} ↗
              </button>
            </div>
            <div>
              <div className="label">{t("foot.co")}</div>
              <a href="#about">{t("foot.c1")}</a>
              <a href="#brands">{t("foot.c2")}</a>
              <a href="#contact">{t("foot.c3")}</a>
            </div>
            <div>
              <div className="label">{t("foot.follow")}</div>
              <a href="https://facebook.com/ekowayhardware" target="_blank" rel="noopener">
                Facebook
              </a>
              <a href="https://wa.me/60174056993" target="_blank" rel="noopener">
                WhatsApp
              </a>
            </div>
          </div>
        </div>
        <div className="wordmark display" aria-hidden="true">
          Ekoway<span className="star">*</span>
        </div>
        <div className="container">
          <div className="foot-base">
            <span>© 2026 Ekoway Hardware · 永光五金</span>
            <span>NO. 43-44, Lorong Salim 17 · Sibu, Sarawak</span>
          </div>
        </div>
      </footer>

      {/* floating WhatsApp */}
      <a className="float-wa" href={WA_GENERAL} target="_blank" rel="noopener" aria-label="WhatsApp Ekoway Hardware">
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16.02 4.5C9.66 4.5 4.5 9.66 4.5 16.02c0 2.03.53 4.01 1.55 5.76L4.5 27.5l5.86-1.52a11.46 11.46 0 0 0 5.66 1.48h.01c6.35 0 11.52-5.16 11.52-11.52 0-3.08-1.2-5.97-3.38-8.15A11.44 11.44 0 0 0 16.02 4.5Zm0 21.04h-.01a9.56 9.56 0 0 1-4.87-1.33l-.35-.21-3.62.95.97-3.53-.23-.36a9.53 9.53 0 0 1-1.46-5.04c0-5.28 4.3-9.58 9.58-9.58 2.56 0 4.96 1 6.77 2.81a9.51 9.51 0 0 1 2.8 6.78c0 5.28-4.3 9.58-9.58 9.58Zm5.25-7.17c-.29-.14-1.7-.84-1.96-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.41 1.02 2.76 1.16 2.95.14.19 2.01 3.07 4.87 4.3.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33Z" />
        </svg>
      </a>
    </div>
  );
}
