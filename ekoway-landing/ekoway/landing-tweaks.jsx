// Ekoway landing — Tweaks panel (cream-on-black system)
const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "cream": "#E1E0CC",
  "bgTone": "#000000",
  "panelTone": "#101010",
  "motion": "full",
  "promo": true
}/*EDITMODE-END*/;

function EkowayTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--cream", t.cream);
    root.setProperty("--cream-2", t.cream);
    root.setProperty("--bg", t.bgTone);
    root.setProperty("--panel", t.panelTone);
    root.setProperty("--panel2", t.panelTone);
    document.documentElement.dataset.motion = t.motion;
    const promo = document.querySelector(".promo");
    if (promo) promo.style.display = t.promo ? "" : "none";
  }, [t]);

  return (
    <TweaksPanel>
      <TweakSection label="Palette" />
      <TweakColor
        label="Cream"
        value={t.cream}
        options={["#E1E0CC", "#DEDBC8", "#EAE7D6", "#D8C9A8"]}
        onChange={(v) => setTweak("cream", v)}
      />
      <TweakColor
        label="Background"
        value={t.bgTone}
        options={["#000000", "#0A0A0A", "#0D0B08", "#0B0E0F"]}
        onChange={(v) => setTweak("bgTone", v)}
      />
      <TweakColor
        label="Card / panel"
        value={t.panelTone}
        options={["#101010", "#161616", "#14110C", "#0F1213"]}
        onChange={(v) => setTweak("panelTone", v)}
      />
      <TweakSection label="Motion" />
      <TweakRadio
        label="Animation"
        value={t.motion}
        options={["full", "calm"]}
        onChange={(v) => setTweak("motion", v)}
      />
      <TweakSection label="Layout" />
      <TweakToggle
        label="Promo marquee"
        value={t.promo}
        onChange={(v) => setTweak("promo", v)}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<EkowayTweaks />);
