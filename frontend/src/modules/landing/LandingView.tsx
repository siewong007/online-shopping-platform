import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, MouseEvent as ReactMouseEvent, ReactNode } from "react";

import { LangToggle, useI18n } from "../../i18n/LanguageContext";
import type { Lang, TranslationKey } from "../../i18n/translations";
import type { LegalSlug } from "../legal/content";

import "./landing.css";

const WA_BASE = "https://wa.me/60174056993";
const INTRO_SEEN_KEY = "ekoway-intro-seen";

function waGeneralUrl(lang: Lang): string {
  const text =
    lang === "bm"
      ? "Hi Ekoway Hardware, saya ingin bertanya..."
      : lang === "zh"
        ? "你好 Ekoway 永光五金，我想咨询..."
        : "Hi Ekoway Hardware, I'd like to ask about...";
  return `${WA_BASE}?text=${encodeURIComponent(text)}`;
}

function waJoinUrl(lang: Lang): string {
  const text =
    lang === "bm"
      ? "Saya nak sertai kemas kini WhatsApp Ekoway"
      : lang === "zh"
        ? "你好，我想加入 Ekoway WhatsApp 最新消息更新"
        : "Hi Ekoway Hardware, I'd like to join your WhatsApp updates";
  return `${WA_BASE}?text=${encodeURIComponent(text)}`;
}

function waTopicUrl(lang: Lang, topic: string): string {
  const text =
    lang === "bm"
      ? `Hi, saya nak tanya tentang ${topic}`
      : lang === "zh"
        ? `你好，我想询问关于 ${topic}`
        : `Hi, I'd like to ask about ${topic}`;
  return `${WA_BASE}?text=${encodeURIComponent(text)}`;
}

function mailtoUrl(lang: Lang): string {
  const subject =
    lang === "bm"
      ? "Pertanyaan untuk Ekoway Hardware"
      : lang === "zh"
        ? "咨询 Ekoway 永光五金"
        : "Enquiry for Ekoway Hardware";
  const body =
    lang === "bm"
      ? "Hi Ekoway Hardware,\n\nSaya ingin bertanya tentang:\n\n"
      : lang === "zh"
        ? "你好 Ekoway 永光五金，\n\n我想咨询：\n\n"
        : "Hi Ekoway Hardware,\n\nI would like to ask about:\n\n";
  return `mailto:ekowayhardware@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function mapsEmbedUrl(lang: Lang): string {
  const hl = lang === "bm" ? "ms" : lang === "zh" ? "zh-CN" : "en";
  return `https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3986.6977382848936!2d111.86063787456054!3d2.26624669771383!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x31f82ab60c66c68d%3A0x917e4600a1a1d410!2sEKOWAY%20HARDWARE!5e0!3m2!1s${hl}!2smy!4v1781600738759!5m2!1s${hl}!2smy&hl=${hl}`;
}

function isPlainLeftClick(event: ReactMouseEvent<HTMLAnchorElement>): boolean {
  return (
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function shouldSkipIntroOnMount(): boolean {
  if (typeof window === "undefined") return true;
  if (prefersReducedMotion()) return true;
  try {
    return window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

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
    <span key={i} className="ch" style={{ opacity: 0.32 }}>
      {c}
    </span>
  ));
}

const catRows = [
  { num: "/01", name: "cat.01.name", sub: "cat.01.sub", img: "/ekoway/categories/power-tools-v1.jpg", shopHint: "power-tools|tools" },
  { num: "/02", name: "cat.02.name", sub: "cat.02.sub", img: "/ekoway/categories/paint-v1.jpg", shopHint: "paint" },
  { num: "/03", name: "cat.03.name", sub: "cat.03.sub", img: "/ekoway/categories/building-v1.jpg", shopHint: "building-materials" },
  { num: "/04", name: "cat.04.name", sub: "cat.04.sub", img: "/ekoway/categories/bathroom-v1.jpg", shopHint: "bathroom|bath" },
  { num: "/05", name: "cat.05.name", sub: "cat.05.sub", img: "/ekoway/categories/kitchen-v1.jpg", shopHint: "kitchen" },
  { num: "/06", name: "cat.06.name", sub: "cat.06.sub", img: "/ekoway/categories/electrical-v1.jpg", shopHint: "electrical|appliances" }
] as const;

const dealCards = [
  { img: "/ekoway/img/power-tools.jpg", brand: "BOSCH · DONGCHENG · STANLEY", title: "month.1.title", body: "month.1.body", shopHint: "power-tools|tools" },
  { img: "/ekoway/img/paints.jpg", brand: "Nippon Paint · Smart Paint", title: "month.2.title", body: "month.2.body", shopHint: "paint" },
  { img: "/ekoway/img/home-appliances.jpg", brand: "Panasonic · Midea · KDK", title: "month.3.title", body: "month.3.body", shopHint: "electrical|appliances" },
  { img: "/ekoway/img/bathroom-plumbing.jpg", brand: "Saniware · Cabana · Inspire", title: "month.4.title", body: "month.4.body", shopHint: "bathroom|bath" }
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

const sectionLinks: readonly { href: string; labelKey: TranslationKey }[] = [
  { href: "#categories", labelKey: "nav.catalog" },
  { href: "#month", labelKey: "nav.month" },
  { href: "#why", labelKey: "nav.why" },
  { href: "#about", labelKey: "nav.story" },
  { href: "#contact", labelKey: "nav.contact" }
];

const legalLinks: readonly { slug: LegalSlug; labelKey: TranslationKey }[] = [
  { slug: "privacy", labelKey: "shop.footer.link.privacy" },
  { slug: "terms", labelKey: "shop.footer.link.terms" },
  { slug: "returns", labelKey: "shop.footer.link.returns" },
  { slug: "delivery", labelKey: "shop.footer.link.delivery" },
  { slug: "contact", labelKey: "shop.footer.link.contact" }
];

function delay(seconds: number): CSSProperties {
  return { "--d": `${seconds}s` } as CSSProperties;
}

type LandingViewProps = {
  onOpenShop: (categoryHint?: string) => void;
  onOpenLegal?: (slug: LegalSlug) => void;
};

export function LandingView({ onOpenShop, onOpenLegal }: LandingViewProps) {
  const { lang, t } = useI18n();
  const rootRef = useRef<HTMLDivElement>(null);
  const heroNavRef = useRef<HTMLElement>(null);
  const stickyNavRef = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const progRef = useRef<HTMLElement>(null);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const lbCloseRef = useRef<HTMLButtonElement>(null);
  const lbOpenerRef = useRef<HTMLElement | null>(null);
  const dragMovedRef = useRef(0);
  const wasLightboxOpenRef = useRef(false);

  const [skipIntro] = useState(shouldSkipIntroOnMount);
  const [introState, setIntroState] = useState<"idle" | "play" | "done" | "gone">(() =>
    skipIntro ? "gone" : "idle"
  );
  const [loaded, setLoaded] = useState(() => skipIntro);
  const [heroIn, setHeroIn] = useState(() => skipIntro);
  const [menuOpen, setMenuOpen] = useState(false);
  const [stickyVisible, setStickyVisible] = useState(false);
  const [stickyMenuOpen, setStickyMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const waGeneral = waGeneralUrl(lang);
  const waJoin = waJoinUrl(lang);

  const handleShopClick = useCallback(
    (categoryHint?: string, closeMenus?: boolean) =>
      (event: ReactMouseEvent<HTMLAnchorElement>) => {
        if (closeMenus) {
          setMenuOpen(false);
          setStickyMenuOpen(false);
        }
        if (!isPlainLeftClick(event)) return;
        event.preventDefault();
        onOpenShop(categoryHint);
      },
    [onOpenShop]
  );

  const handleLegalClick = useCallback(
    (slug: LegalSlug) => (event: ReactMouseEvent<HTMLAnchorElement>) => {
      if (!onOpenLegal || !isPlainLeftClick(event)) return;
      event.preventDefault();
      onOpenLegal(slug);
    },
    [onOpenLegal]
  );

  /* keep overscroll black behind the cream-on-black landing, not the storefront's light page bg */
  useEffect(() => {
    const previous = document.body.style.background;
    document.body.style.background = "#000";
    return () => {
      document.body.style.background = previous;
    };
  }, []);

  /* pause background hero video when reduced motion is preferred */
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncVideo = () => {
      if (mq.matches) {
        video.pause();
      } else {
        void video.play().catch(() => {
          // autoplay blocked by browser policy
        });
      }
    };
    syncVideo();
    mq.addEventListener("change", syncVideo);
    return () => mq.removeEventListener("change", syncVideo);
  }, []);

  /* session-once intro curtain + load sequence */
  useEffect(() => {
    if (skipIntro) return;
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // sessionStorage unavailable
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
  }, [skipIntro]);

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

  /* scroll-linked effects (intersection-gated, rAF-throttled scroll/resize listeners) */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const heroEl = root.querySelector<HTMLElement>(".hero");
    const heroMedia = root.querySelector<HTMLElement>(".hero-media");
    const footer = root.querySelector<HTMLElement>("footer");
    const wordmark = root.querySelector<HTMLElement>(".wordmark");
    const charHost = root.querySelector<HTMLElement>("[data-charreveal]");
    const chars = charHost ? Array.from(charHost.querySelectorAll<HTMLElement>(".ch")) : [];
    const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
    const easeOut = (p: number) => 1 - Math.pow(1 - p, 2.4);

    if (reduced) {
      chars.forEach((c) => (c.style.opacity = "1"));
    }

    let heroVisible = true;
    let footerVisible = false;
    let aboutVisible = false;
    let stickyShown = window.scrollY > window.innerHeight * 0.72;
    setStickyVisible(stickyShown);

    const update = () => {
      const y = window.scrollY;
      const shouldShowSticky = y > window.innerHeight * 0.72;
      if (shouldShowSticky !== stickyShown) {
        stickyShown = shouldShowSticky;
        setStickyVisible(shouldShowSticky);
        if (!shouldShowSticky) setStickyMenuOpen(false);
      }

      if (reduced) return;

      if (heroVisible && heroMedia && y < window.innerHeight * 1.3) {
        heroMedia.style.transform = `translateY(${y * 0.16}px)`;
      }
      if (footerVisible && footer && wordmark) {
        const rect = footer.getBoundingClientRect();
        const p = clamp01((window.innerHeight - rect.top) / (rect.height * 0.9));
        wordmark.style.transform = `translateY(${(1 - easeOut(p)) * 38}%)`;
      }
      if (aboutVisible && charHost && chars.length > 0) {
        const rect = charHost.getBoundingClientRect();
        const start = window.innerHeight * 0.85;
        const end = window.innerHeight * 0.32;
        const prog = clamp01((start - rect.top) / (start - end));
        const n = chars.length;
        chars.forEach((c, idx) => {
          const cp = idx / n;
          const local = clamp01((prog - cp * 0.85) / 0.12);
          c.style.opacity = (0.32 + 0.68 * local).toFixed(3);
        });
      }
    };

    let rafId = 0;
    const schedule = () => {
      if (rafId) return;
      rafId = requestAnimationFrame(() => {
        rafId = 0;
        update();
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        let shouldRun = false;
        entries.forEach((entry) => {
          if (entry.target === heroEl) heroVisible = entry.isIntersecting;
          else if (entry.target === footer) footerVisible = entry.isIntersecting;
          else if (entry.target === charHost) aboutVisible = entry.isIntersecting;
          if (entry.isIntersecting) shouldRun = true;
        });
        if (shouldRun) schedule();
      },
      { rootMargin: "120px 0px" }
    );
    if (heroEl) io.observe(heroEl);
    if (footer) io.observe(footer);
    if (charHost) io.observe(charHost);

    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (rafId) cancelAnimationFrame(rafId);
    };
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

  /* mobile menus: close on outside click / Escape */
  useEffect(() => {
    if (!menuOpen && !stickyMenuOpen) return;
    const onClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (menuOpen && heroNavRef.current && !heroNavRef.current.contains(target)) {
        setMenuOpen(false);
      }
      if (stickyMenuOpen && stickyNavRef.current && !stickyNavRef.current.contains(target)) {
        setStickyMenuOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setStickyMenuOpen(false);
      }
    };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen, stickyMenuOpen]);

  /* store gallery: intersection-gated pinned scroll + drag/wheel/focus */
  useEffect(() => {
    const pin = pinRef.current;
    const stage = stageRef.current;
    const track = trackRef.current;
    const prog = progRef.current;
    if (!pin || !stage || !track) return;

    const resetDragFlag = () => {
      window.setTimeout(() => {
        track.classList.remove("dragging");
        dragMovedRef.current = 0;
      }, 0);
    };

    if (!prefersReducedMotion()) {
      let maxShift = 0;
      let pinIntersecting = false;
      let rafId = 0;

      const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
      const applyProgress = (p: number) => {
        track.style.transform = `translate3d(${(-p * maxShift).toFixed(2)}px,0,0)`;
        if (prog) prog.style.transform = `scaleX(${p.toFixed(4)})`;
      };
      const syncFromScroll = () => {
        if (maxShift <= 0) {
          applyProgress(0);
          return;
        }
        const top = pin.getBoundingClientRect().top;
        applyProgress(clamp01(-top / maxShift));
      };
      const layout = () => {
        maxShift = Math.max(0, track.scrollWidth - stage.clientWidth);
        pin.style.height = `${stage.clientHeight + maxShift}px`;
        syncFromScroll();
      };
      const scheduleSync = () => {
        if (!pinIntersecting || rafId) return;
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          syncFromScroll();
        });
      };

      const io = new IntersectionObserver(
        (entries) => {
          pinIntersecting = entries.some((entry) => entry.isIntersecting);
          if (pinIntersecting) syncFromScroll();
        },
        { rootMargin: "200px 0px" }
      );
      io.observe(pin);

      let down = false;
      let axisLocked: "x" | null = null;
      let startX = 0;
      let startY = 0;
      let startShift = 0;
      let pinDocTop = 0;

      const onDown = (event: PointerEvent) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        down = true;
        axisLocked = null;
        dragMovedRef.current = 0;
        startX = event.clientX;
        startY = event.clientY;
        const rect = pin.getBoundingClientRect();
        pinDocTop = window.scrollY + rect.top;
        startShift = maxShift > 0 ? Math.max(0, Math.min(maxShift, -rect.top)) : 0;
      };
      const onMove = (event: PointerEvent) => {
        if (!down || maxShift <= 0) return;
        const dx = event.clientX - startX;
        const dy = event.clientY - startY;
        if (!axisLocked) {
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
          if (event.pointerType !== "mouse" && Math.abs(dy) > Math.abs(dx)) {
            down = false;
            return;
          }
          axisLocked = "x";
          track.classList.add("dragging");
          try {
            stage.setPointerCapture(event.pointerId);
          } catch {
            // pointer capture unavailable
          }
        }
        dragMovedRef.current = Math.max(dragMovedRef.current, Math.abs(dx));
        const nextShift = Math.max(0, Math.min(maxShift, startShift - dx));
        window.scrollTo({ top: pinDocTop + nextShift, behavior: "auto" });
        applyProgress(nextShift / maxShift);
      };
      const release = (event: PointerEvent) => {
        if (!down && axisLocked !== "x") return;
        down = false;
        axisLocked = null;
        try {
          if (stage.hasPointerCapture(event.pointerId)) {
            stage.releasePointerCapture(event.pointerId);
          }
        } catch {
          // pointer capture already released
        }
        resetDragFlag();
      };
      const onWheel = (event: WheelEvent) => {
        if (maxShift <= 0) return;
        if (Math.abs(event.deltaX) <= Math.abs(event.deltaY) || Math.abs(event.deltaX) < 0.5) return;
        const rect = pin.getBoundingClientRect();
        const curShift = Math.max(0, Math.min(maxShift, -rect.top));
        const nextShift = Math.max(0, Math.min(maxShift, curShift + event.deltaX));
        if (Math.abs(nextShift - curShift) > 0.5) {
          event.preventDefault();
          window.scrollTo({ top: window.scrollY + rect.top + nextShift, behavior: "auto" });
          applyProgress(nextShift / maxShift);
        }
      };
      const onFocusIn = (event: FocusEvent) => {
        const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>(".shot-trigger");
        if (!trigger) return;
        stage.scrollLeft = 0;
        if (maxShift <= 0) return;
        const shotEl = trigger.closest<HTMLElement>(".shot") ?? trigger;
        const centeredShift = Math.max(
          0,
          Math.min(maxShift, shotEl.offsetLeft - (stage.clientWidth - shotEl.offsetWidth) / 2)
        );
        const docTop = window.scrollY + pin.getBoundingClientRect().top;
        window.scrollTo({ top: docTop + centeredShift, behavior: "auto" });
        applyProgress(centeredShift / maxShift);
      };

      const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(layout) : null;
      ro?.observe(stage);
      ro?.observe(track);
      track.querySelectorAll("img").forEach((img) => {
        if (!img.complete) img.addEventListener("load", layout, { once: true });
      });
      window.addEventListener("scroll", scheduleSync, { passive: true });
      window.addEventListener("resize", layout, { passive: true });
      window.addEventListener("load", layout);
      stage.addEventListener("pointerdown", onDown);
      stage.addEventListener("pointermove", onMove);
      stage.addEventListener("pointerup", release);
      stage.addEventListener("pointercancel", release);
      stage.addEventListener("wheel", onWheel, { passive: false });
      track.addEventListener("focusin", onFocusIn);
      layout();
      const relayout = window.setTimeout(layout, 400);

      return () => {
        io.disconnect();
        ro?.disconnect();
        window.removeEventListener("scroll", scheduleSync);
        window.removeEventListener("resize", layout);
        window.removeEventListener("load", layout);
        stage.removeEventListener("pointerdown", onDown);
        stage.removeEventListener("pointermove", onMove);
        stage.removeEventListener("pointerup", release);
        stage.removeEventListener("pointercancel", release);
        stage.removeEventListener("wheel", onWheel);
        track.removeEventListener("focusin", onFocusIn);
        window.clearTimeout(relayout);
        if (rafId) cancelAnimationFrame(rafId);
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
      if (event.pointerType === "mouse" && event.button !== 0) return;
      down = true;
      dragMovedRef.current = 0;
      startX = event.clientX;
      startLeft = track.scrollLeft;
    };
    const onMove = (event: PointerEvent) => {
      if (!down) return;
      const dx = event.clientX - startX;
      dragMovedRef.current = Math.max(dragMovedRef.current, Math.abs(dx));
      if (dragMovedRef.current > 4) {
        track.classList.add("dragging");
        try {
          if (!track.hasPointerCapture(event.pointerId)) {
            track.setPointerCapture(event.pointerId);
          }
        } catch {
          // pointer capture unavailable
        }
      }
      track.scrollLeft = startLeft - dx;
    };
    const release = (event: PointerEvent) => {
      if (!down) return;
      down = false;
      try {
        if (track.hasPointerCapture(event.pointerId)) {
          track.releasePointerCapture(event.pointerId);
        }
      } catch {
        // pointer capture already released
      }
      resetDragFlag();
    };
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) > Math.abs(event.deltaX)) {
        track.scrollLeft += event.deltaY;
        event.preventDefault();
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      const trigger = (event.target as HTMLElement | null)?.closest<HTMLElement>(".shot-trigger");
      if (!trigger) return;
      const shotEl = trigger.closest<HTMLElement>(".shot") ?? trigger;
      shotEl.scrollIntoView({ block: "nearest", inline: "center", behavior: "auto" });
    };
    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", release);
    track.addEventListener("pointercancel", release);
    track.addEventListener("wheel", onWheel, { passive: false });
    track.addEventListener("focusin", onFocusIn);
    return () => {
      stage.classList.remove("no-pin");
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", release);
      track.removeEventListener("pointercancel", release);
      track.removeEventListener("wheel", onWheel);
      track.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const closeLightbox = useCallback(() => {
    setLightboxIndex(null);
  }, []);

  /* lightbox: keyboard navigation, focus trap, scroll lock, opener focus restoration */
  useEffect(() => {
    const isOpen = lightboxIndex !== null;
    if (!isOpen) {
      if (wasLightboxOpenRef.current) {
        wasLightboxOpenRef.current = false;
        const opener = lbOpenerRef.current;
        lbOpenerRef.current = null;
        opener?.focus({ preventScroll: true });
      }
      return;
    }

    if (!wasLightboxOpenRef.current) {
      wasLightboxOpenRef.current = true;
      lbCloseRef.current?.focus();
    }

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeLightbox();
      } else if (event.key === "ArrowLeft") {
        setLightboxIndex((c) => (c === null ? 0 : (c - 1 + storeShots.length) % storeShots.length));
      } else if (event.key === "ArrowRight") {
        setLightboxIndex((c) => (c === null ? 0 : (c + 1) % storeShots.length));
      } else if (event.key === "Tab") {
        const dialog = lightboxRef.current;
        if (!dialog) return;
        const focusables = Array.from(
          dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])")
        );
        if (focusables.length === 0) {
          event.preventDefault();
          return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (!dialog.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [closeLightbox, lightboxIndex]);

  const openLightbox = (idx: number, opener?: HTMLElement | null) => {
    if (dragMovedRef.current > 4) return;
    lbOpenerRef.current = opener ?? (document.activeElement as HTMLElement | null);
    setLightboxIndex(idx);
  };

  const shot = lightboxIndex !== null ? storeShots[lightboxIndex] : null;
  const waAriaLabel = (topicLabel: string) =>
    lang === "bm"
      ? `WhatsApp tentang ${topicLabel}`
      : lang === "zh"
        ? `通过 WhatsApp 咨询 ${topicLabel}`
        : `WhatsApp about ${topicLabel}`;

  return (
    <div className={`landing-page ${loaded ? "loaded" : ""}`} ref={rootRef}>
      <a className="skip-link" href="#main">
        {t("landing.skipToContent")}
      </a>

      {introState !== "gone" ? (
        <div
          className={`intro ${introState === "play" ? "play" : ""} ${introState === "done" ? "done" : ""}`}
          aria-hidden="true"
        >
          <div className="intro-word">
            <span>
              <img src="/ekoway/ekoway-logo.jpeg" alt="Ekoway logo" />
            </span>
          </div>
        </div>
      ) : null}

      {/* hero */}
      <header className="hero" id="top">
        <div className="hero-frame">
          <div className="hero-media">
            <video
              ref={videoRef}
              className="hero-video"
              src="/ekoway/hero.mp4"
              poster="/ekoway/hero-poster.jpg"
              autoPlay={!prefersReducedMotion()}
              muted
              loop
              playsInline
              preload="metadata"
            />
          </div>
          <div className="hero-noise" />
          <div className="hero-grad" />

          <nav className={`nav ${menuOpen ? "open" : ""}`} ref={heroNavRef} aria-label="Primary">
            <a className="brand" href="#top">
              <img src="/ekoway/ekoway-logo.jpeg" alt="Ekoway logo" />
              <b>Ekoway</b>
            </a>
            <span className="divider" />
            <div className="links" id="navLinks" onClick={() => setMenuOpen(false)}>
              {sectionLinks.map((item) => (
                <a key={item.href} href={item.href}>
                  {t(item.labelKey)}
                </a>
              ))}
              <a href="/shop" onClick={handleShopClick(undefined, true)}>
                {t("nav.shop")}
              </a>
            </div>
            <span className="divider" />
            <LangToggle />
            <button
              type="button"
              className="menu-btn"
              aria-label={menuOpen ? t("landing.menuClose") : t("landing.menuOpen")}
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
                <a className="cta-pill" href={waGeneral} target="_blank" rel="noopener noreferrer">
                  <span>{t("hero.cta")}</span>
                  <span className="circle">↗</span>
                </a>
                <a className="hero-shop-cta" href="/shop" onClick={handleShopClick()}>
                  <span>{t("landing.shopOnlineCta")}</span> <span className="arr">↗</span>
                </a>
                <a className="hero-sec" href="#categories">
                  <span>{t("hero.browse")}</span> <span className="arr">↗</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* fixed sticky nav (appears once scrolled past hero) */}
      <nav
        ref={stickyNavRef}
        className={`nav-sticky ${stickyVisible ? "visible" : ""} ${stickyMenuOpen ? "open" : ""}`}
        aria-label="Quick navigation"
        aria-hidden={!stickyVisible || undefined}
      >
        <a className="brand" href="#top" aria-label="Ekoway Hardware">
          <img src="/ekoway/ekoway-logo.jpeg" alt="" aria-hidden="true" />
          <b>Ekoway</b>
        </a>
        <div className="links" id="stickyNavLinks" onClick={() => setStickyMenuOpen(false)}>
          {sectionLinks.map((item) => (
            <a key={item.href} href={item.href}>
              {t(item.labelKey)}
            </a>
          ))}
        </div>
        <div className="nav-sticky-right">
          <a className="nav-sticky-cta" href="/shop" onClick={handleShopClick(undefined, true)}>
            <span>{t("landing.shopOnlineCta")}</span>
            <span className="arr" aria-hidden="true">
              ↗
            </span>
          </a>
          <LangToggle />
          <button
            type="button"
            className="menu-btn"
            aria-label={stickyMenuOpen ? t("landing.menuClose") : t("landing.menuOpen")}
            aria-expanded={stickyMenuOpen}
            aria-controls="stickyNavLinks"
            onClick={(event) => {
              event.stopPropagation();
              setStickyMenuOpen((open) => !open);
            }}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>

      <main id="main" tabIndex={-1}>
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
        <section id="categories" className="categories-section">
          <div className="container">
            <div className="sec-head" data-reveal="">
              <span className="idx">01</span>
              <h2 className="display">{t("sec.cat.title")}</h2>
              <a className="more" href="#contact">
                {t("sec.cat.more")}
              </a>
            </div>
            <div className="cat-list">
              {catRows.map((row, index) => {
                const label = t(row.name);
                return (
                  <div className="cat-row" data-reveal="" style={delay(index * 0.04)} key={row.num}>
                    <a className="cat-row-main" href="/shop" onClick={handleShopClick(row.shopHint)}>
                      <span className="num">{row.num}</span>
                      <div className="cat-row-copy">
                        <h3>{label}</h3>
                        <div className="sub">{t(row.sub)}</div>
                      </div>
                      <div className="cat-thumb">
                        <img src={row.img} alt={label} loading="lazy" decoding="async" />
                      </div>
                    </a>
                    <a
                      className="go"
                      href={waTopicUrl(lang, label)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={waAriaLabel(label)}
                    >
                      ↗
                    </a>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* this month */}
        <section id="month" className="deals">
          <div className="container">
            <div className="sec-head" data-reveal="">
              <span className="idx">02</span>
              <h2 className="display">{t("sec.month.title")}</h2>
              <a className="more" href={waGeneral} target="_blank" rel="noopener noreferrer">
                {t("sec.month.more")}
              </a>
            </div>
            <div className="deal-grid">
              {dealCards.map((card, index) => {
                const title = t(card.title);
                return (
                  <div className="deal-card" data-reveal="" style={delay(index * 0.08)} key={card.brand}>
                    <img className="slot-img" src={card.img} alt={title} loading="lazy" decoding="async" />
                    <div className="dbrand">{card.brand}</div>
                    <h3>{title}</h3>
                    <p className="dnote">{t(card.body)}</p>
                    <div className="deal-actions">
                      <a
                        className="btn btn-ghost dwa"
                        href={waTopicUrl(lang, title)}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span>{t("month.wa")}</span> <span className="arr">↗</span>
                      </a>
                      <a className="deal-shop-link" href="/shop" onClick={handleShopClick(card.shopHint)}>
                        <span>{t("landing.browseInShop")}</span> <span className="arr">↗</span>
                      </a>
                    </div>
                  </div>
                );
              })}
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
                <img className="slot-img" src="/ekoway/img/why-ekoway.jpg" alt={t("why.cap")} loading="lazy" decoding="async" />
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
              <a
                className="proof-card"
                href="https://facebook.com/ekowayhardware"
                target="_blank"
                rel="noopener noreferrer"
                data-reveal=""
                style={delay(0.1)}
              >
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
                    <figure className={`shot ${item.wide ? "wide" : ""}`} key={item.src}>
                      <button
                        type="button"
                        className="shot-btn shot-trigger"
                        aria-label={`${t(item.cap)} — ${t("landing.enlargePhoto")}`}
                        onClick={(event) => openLightbox(index, event.currentTarget)}
                      >
                        <img
                          src={item.src}
                          alt={t(item.cap)}
                          loading="lazy"
                          decoding="async"
                          draggable={false}
                        />
                        <span className="expand" aria-hidden="true">
                          ⤢
                        </span>
                      </button>
                      <figcaption>
                        <span className="n">{String(index + 1).padStart(2, "0")}</span>
                        <span className="t">{t(item.cap)}</span>
                      </figcaption>
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
                <a className="btn btn-solid" href={waGeneral} target="_blank" rel="noopener noreferrer">
                  <span>{t("cta.wa")}</span> <span className="arr">↗</span>
                </a>
                <a className="btn btn-ghost" href="#contact">
                  {t("cta.visit")}
                </a>
                <a className="btn btn-ghost" href="/shop" onClick={handleShopClick()}>
                  <span>{t("landing.browseInShop")}</span> <span className="arr">↗</span>
                </a>
              </div>
              <div className="wa-join">
                <span className="label">{t("cta.join.k")}</span>
                <a className="btn btn-ghost" href={waJoin} target="_blank" rel="noopener noreferrer">
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
                  <a className="btn btn-solid" href={waGeneral} target="_blank" rel="noopener noreferrer">
                    <span>{t("contact.wa")}</span> <span className="arr">↗</span>
                  </a>
                  <a className="btn btn-ghost" href="tel:+6084253883">
                    {t("contact.call")}
                  </a>
                  <a className="btn btn-ghost" href={mailtoUrl(lang)}>
                    {t("contact.email")}
                  </a>
                  <a
                    className="btn btn-ghost"
                    href="https://facebook.com/ekowayhardware"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t("contact.fb")}
                  </a>
                </div>
              </div>
              <div className="contact-map" data-reveal="" style={delay(0.12)}>
                <iframe
                  src={mapsEmbedUrl(lang)}
                  title={t("landing.mapTitle")}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* lightbox */}
      <div
        ref={lightboxRef}
        className={`lightbox lb ${lightboxIndex !== null ? "open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={shot ? t(shot.cap) : t("landing.enlargePhoto")}
        aria-hidden={lightboxIndex === null}
      >
        <button
          type="button"
          className="lb-close"
          ref={lbCloseRef}
          aria-label={t("landing.lightboxClose")}
          onClick={closeLightbox}
        >
          ✕
        </button>
        <button
          type="button"
          className="lb-nav lb-prev"
          aria-label={t("landing.lightboxPrev")}
          onClick={(event) => {
            event.stopPropagation();
            setLightboxIndex((c) => (c === null ? 0 : (c - 1 + storeShots.length) % storeShots.length));
          }}
        >
          ‹
        </button>
        <div className="lb-stage" onClick={closeLightbox}>
          {shot ? (
            <img
              className="lb-img"
              src={shot.src}
              alt={t(shot.cap)}
              loading="lazy"
              decoding="async"
              onClick={(event) => event.stopPropagation()}
            />
          ) : null}
        </div>
        <button
          type="button"
          className="lb-nav lb-next"
          aria-label={t("landing.lightboxNext")}
          onClick={(event) => {
            event.stopPropagation();
            setLightboxIndex((c) => (c === null ? 0 : (c + 1) % storeShots.length));
          }}
        >
          ›
        </button>
        {shot && lightboxIndex !== null ? (
          <div className="lb-cap">
            {t(shot.cap)}&nbsp;&nbsp;·&nbsp;&nbsp;{lightboxIndex + 1} / {storeShots.length}
          </div>
        ) : null}
      </div>

      {/* footer */}
      <footer>
        <div className="container">
          <div className="foot-grid">
            <div className="foot-brand">
              <img src="/ekoway/ekoway-logo.jpeg" alt="Ekoway logo" loading="lazy" decoding="async" />
              <p>
                {t("foot.tag.1")}
                <br />
                {t("foot.tag.2")}
              </p>
            </div>
            <div>
              <div className="label">{t("foot.shop")}</div>
              <a href="/shop" onClick={handleShopClick("power-tools|tools")}>
                {t("foot.s1")}
              </a>
              <a href="/shop" onClick={handleShopClick("paint")}>
                {t("foot.s2")}
              </a>
              <a href="/shop" onClick={handleShopClick("building-materials")}>
                {t("foot.s3")}
              </a>
              <a href="/shop" onClick={handleShopClick("electrical|appliances")}>
                {t("foot.s4")}
              </a>
              <a href="/shop" className="foot-link" onClick={handleShopClick()}>
                {t("nav.shop")} ↗
              </a>
            </div>
            <div>
              <div className="label">{t("foot.co")}</div>
              <a href="#about">{t("foot.c1")}</a>
              <a href="#brands">{t("foot.c2")}</a>
              <a href="#contact">{t("foot.c3")}</a>
            </div>
            <nav className="foot-legal" aria-label={t("legal.navLabel")}>
              <div className="label">{t("shop.footer.legal")}</div>
              {legalLinks.map((item) => (
                <a key={item.slug} href={`/${item.slug}`} onClick={handleLegalClick(item.slug)}>
                  {t(item.labelKey)}
                </a>
              ))}
            </nav>
            <div>
              <div className="label">{t("foot.follow")}</div>
              <a href="https://facebook.com/ekowayhardware" target="_blank" rel="noopener noreferrer">
                Facebook
              </a>
              <a href={waGeneral} target="_blank" rel="noopener noreferrer">
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
      <a
        className="float-wa"
        href={waGeneral}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t("contact.wa")}
      >
        <svg viewBox="0 0 32 32" aria-hidden="true">
          <path d="M16.02 4.5C9.66 4.5 4.5 9.66 4.5 16.02c0 2.03.53 4.01 1.55 5.76L4.5 27.5l5.86-1.52a11.46 11.46 0 0 0 5.66 1.48h.01c6.35 0 11.52-5.16 11.52-11.52 0-3.08-1.2-5.97-3.38-8.15A11.44 11.44 0 0 0 16.02 4.5Zm0 21.04h-.01a9.56 9.56 0 0 1-4.87-1.33l-.35-.21-3.62.95.97-3.53-.23-.36a9.53 9.53 0 0 1-1.46-5.04c0-5.28 4.3-9.58 9.58-9.58 2.56 0 4.96 1 6.77 2.81a9.51 9.51 0 0 1 2.8 6.78c0 5.28-4.3 9.58-9.58 9.58Zm5.25-7.17c-.29-.14-1.7-.84-1.96-.94-.26-.1-.45-.14-.64.14-.19.29-.74.94-.9 1.13-.17.19-.33.21-.62.07-.29-.14-1.21-.45-2.31-1.42-.85-.76-1.43-1.7-1.6-1.98-.17-.29-.02-.44.13-.58.13-.13.29-.33.43-.5.14-.17.19-.29.29-.48.1-.19.05-.36-.02-.5-.07-.14-.64-1.55-.88-2.12-.23-.56-.47-.48-.64-.49l-.55-.01c-.19 0-.5.07-.76.36-.26.29-1 .98-1 2.38 0 1.41 1.02 2.76 1.16 2.95.14.19 2.01 3.07 4.87 4.3.68.29 1.21.47 1.62.6.68.22 1.3.19 1.79.12.55-.08 1.7-.69 1.94-1.36.24-.67.24-1.24.17-1.36-.07-.12-.26-.19-.55-.33Z" />
        </svg>
      </a>
    </div>
  );
}
