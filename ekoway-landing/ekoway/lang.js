// Ekoway Hardware — trilingual (EN / BM / ZH) engine.
// Runs BEFORE landing.js so the word-split / char-reveal animations
// operate on the correct-language text on first paint.
(function () {
  // value may contain inline HTML (e.g. <span class="serif">…</span>)
  const I18N = {
    /* ---- nav ---- */
    "nav.catalog": { en: "Catalog", bm: "Katalog", zh: "产品" },
    "nav.month":   { en: "This month", bm: "Bulan ini", zh: "本月精选" },
    "nav.why":     { en: "Why us", bm: "Kenapa Ekoway", zh: "我们的优势" },
    "nav.story":   { en: "Our story", bm: "Tentang Kami", zh: "关于我们" },
    "nav.contact": { en: "Contact", bm: "Hubungi", zh: "联系我们" },

    /* ---- hero ---- */
    "hero.sub": {
      en: "From Bosch power tools to Nippon Paint and everyday essentials — genuine brands in Salim, near Farley, Sibu since 2017.",
      bm: "Dari alatan kuasa Bosch hingga cat Nippon Paint dan keperluan harian — jenama terpercaya di Salim, berhampiran Farley, Sibu sejak 2017.",
      zh: "从 Bosch 电动工具到立邦漆与日常用品 — 自 2017 年起，正品品牌尽在诗巫 Salim 区，毗邻 Farley。"
    },
    "hero.cta":    { en: "WhatsApp us", bm: "WhatsApp kami", zh: "WhatsApp 我们" },
    "hero.browse": { en: "Browse categories", bm: "Lihat kategori", zh: "浏览分类" },

    /* ---- ticker ---- */
    "tick.1": { en: "Genuine brands · full warranty", bm: "Jenama terpercaya · waranti penuh", zh: "正品品牌 · 完整保修" },
    "tick.2": { en: "New arrivals in store", bm: "Stok baharu di kedai", zh: "新货到店" },
    "tick.3": { en: "WhatsApp 017-405 6993", bm: "WhatsApp 017-405 6993", zh: "WhatsApp 017-405 6993" },
    "tick.4": { en: "Open Mon–Sat 8am–6pm · Sun 9am–2pm", bm: "Buka Isn–Sab 8pg–6ptg · Ahd 9pg–2ptg", zh: "营业 周一至周六 8am–6pm · 周日 9am–2pm" },

    /* ---- about ---- */
    "about.label": { en: "Serving Sibu since 2017", bm: "Berkhidmat di Sibu sejak 2017", zh: "自 2017 年服务诗巫" },
    "about.head": {
      en: 'We are Ekoway Hardware, <span class="serif">永光五金 — Sibu’s hardware counter since 2017.</span> Power tools to building materials, for DIY and contractors alike.',
      bm: 'Kami Ekoway Hardware, <span class="serif">永光五金 — kedai perkakasan Sibu sejak 2017.</span> Alatan kuasa hingga bahan binaan, untuk DIY dan kontraktor.',
      zh: '我们是 Ekoway Hardware，<span class="serif">永光五金 — 自 2017 年起服务诗巫的五金店。</span> 从电动工具到建筑材料，为 DIY 爱好者与承包商而备。'
    },
    "about.body": {
      en: "Ekoway Hardware has served Sibu since 2017 — 永光五金 — from our store in Salim, near Farley Commercial Centre. We stock everything from power tools to building materials for DIY customers and contractors, with trusted brands and straightforward service. Visit us or message us on WhatsApp — we’re happy to help.",
      bm: "Ekoway Hardware telah berkhidmat di Sibu sejak 2017 — 永光五金 — dari kedai kami di Salim, berhampiran Farley Commercial Centre. Kami menyediakan semua keperluan dari alatan kuasa hingga bahan binaan untuk pelanggan DIY dan kontraktor, dengan jenama terpercaya dan servis yang mudah. Kunjungi kami atau WhatsApp kami — kami sedia membantu.",
      zh: "Ekoway Hardware 自 2017 年起服务诗巫 — 永光五金 — 门市位于 Salim 区，毗邻 Farley 商业中心。我们备有从电动工具到建筑材料的各类商品，服务 DIY 顾客与承包商，提供正品品牌与实在的服务。欢迎到店或通过 WhatsApp 联系我们 — 我们乐意效劳。"
    },

    /* ---- categories ---- */
    "sec.cat.title": { en: "What we stock", bm: "Apa yang kami simpan", zh: "我们的商品" },
    "sec.cat.more":  { en: "Visit or WhatsApp ↗", bm: "Kunjungi atau WhatsApp ↗", zh: "到店或 WhatsApp ↗" },
    "cat.01.name": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
    "cat.01.sub":  { en: "drills · grinders · saws", bm: "gerudi · pengisar · gergaji", zh: "钻机 · 砂轮机 · 锯" },
    "cat.02.name": { en: "Paint", bm: "Cat", zh: "油漆" },
    "cat.02.sub":  { en: "interior · exterior · primers", bm: "dalaman · luaran · primer", zh: "内墙 · 外墙 · 底漆" },
    "cat.03.name": { en: "Building Materials", bm: "Bahan Binaan", zh: "建筑材料" },
    "cat.03.sub":  { en: "cement · sand · fixings", bm: "simen · pasir · pengikat", zh: "水泥 · 沙 · 紧固件" },
    "cat.04.name": { en: "Bathroom Accessories", bm: "Barangan Bilik Air", zh: "浴室配件" },
    "cat.04.sub":  { en: "fittings · fixtures", bm: "kelengkapan · pemasangan", zh: "配件 · 装置" },
    "cat.05.name": { en: "Kitchen Accessories", bm: "Barangan Dapur", zh: "厨房用品" },
    "cat.05.sub":  { en: "cookware · utensils", bm: "periuk belanga · perkakas", zh: "炊具 · 器皿" },
    "cat.06.name": { en: "Electrical Appliances", bm: "Barangan Elektrik", zh: "电器" },
    "cat.06.sub":  { en: "wiring · fans · lighting", bm: "pendawaian · kipas · lampu", zh: "布线 · 风扇 · 照明" },

    /* ---- this month ---- */
    "sec.month.title": { en: "This month at Ekoway", bm: "Bulan ini di Ekoway", zh: "本月精选" },
    "sec.month.more":  { en: "Ask on WhatsApp ↗", bm: "Tanya di WhatsApp ↗", zh: "WhatsApp 询问 ↗" },
    "month.1.title": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
    "month.1.body":  { en: "Cordless drills, grinders and saws built for the job.", bm: "Gerudi tanpa wayar, pengisar dan gergaji untuk kerja anda.", zh: "为工作而生的无线钻机、砂轮机与锯。" },
    "month.2.title": { en: "Paints", bm: "Cat", zh: "油漆" },
    "month.2.body":  { en: "Interior, exterior and primers — tinted in store.", bm: "Dalaman, luaran dan primer — ditona di kedai.", zh: "内墙、外墙与底漆 — 店内调色。" },
    "month.3.title": { en: "Home Appliances", bm: "Barangan Elektrik Rumah", zh: "家用电器" },
    "month.3.body":  { en: "Fans, kitchen appliances and water heaters for the home.", bm: "Kipas, perkakas dapur dan pemanas air untuk rumah.", zh: "风扇、厨房电器与家用热水器。" },
    "month.4.title": { en: "Bathroom & Plumbing", bm: "Bilik Air & Paip", zh: "浴室与水管" },
    "month.4.body":  { en: "Fittings, fixtures, pipes and valves.", bm: "Kelengkapan, pemasangan, paip dan injap.", zh: "配件、装置、水管与阀门。" },
    "month.wa":      { en: "WhatsApp for promotions", bm: "WhatsApp untuk promosi", zh: "WhatsApp 询问促销" },

    /* ---- stats ---- */
    "stat.1": { en: "Years in Sibu", bm: "Tahun di Sibu", zh: "在诗巫的年数" },
    "stat.2": { en: "Trusted brands", bm: "Jenama terpercaya", zh: "信赖品牌" },
    "stat.3": { en: "Product types", bm: "Jenis produk", zh: "产品种类" },
    "stat.4": { en: "Facebook followers", bm: "Pengikut Facebook", zh: "Facebook 粉丝" },

    /* ---- why ---- */
    "sec.why.title": { en: "Why Ekoway", bm: "Kenapa Ekoway", zh: "为什么选择 Ekoway" },
    "why.head1": { en: "Store-grade stock for serious work.", bm: "Stok gred kedai untuk kerja serius.", zh: "应对认真工作的门市级库存。" },
    "why.head2": { en: "Genuine brands. Honest service. Real advice.", bm: "Jenama terpercaya. Servis jujur. Nasihat sebenar.", zh: "正品品牌。诚实服务。实用建议。" },
    "why.cap":   { en: "Your projects, supplied.", bm: "Projek anda, dibekalkan.", zh: "供应您的每个项目。" },

    "why.1.title": { en: "Genuine brands.", bm: "Jenama terpercaya.", zh: "正品品牌。" },
    "why.1.a": { en: "Sourced from authorised distributors", bm: "Dari pengedar yang sah", zh: "来自授权经销商" },
    "why.1.b": { en: "Genuine stock — no greys, no fakes", bm: "Stok tulen — bukan tiruan", zh: "正品库存 — 绝无水货或假货" },
    "why.1.c": { en: "18 trusted brands on the shelves", bm: "18 jenama terpercaya di rak", zh: "货架上 18 个信赖品牌" },
    "why.1.d": { en: "Bosch · Nippon Paint · Panasonic", bm: "Bosch · Nippon Paint · Panasonic", zh: "Bosch · 立邦漆 · Panasonic" },
    "why.1.learn": { en: "See the brands", bm: "Lihat jenama", zh: "查看品牌" },

    "why.2.title": { en: "Fair, honest pricing.", bm: "Harga yang jujur.", zh: "公道诚实的价格。" },
    "why.2.a": { en: "Ask us about price matching", bm: "Tanya kami tentang padanan harga", zh: "欢迎询问价格匹配" },
    "why.2.b": { en: "Genuine brands at counter prices", bm: "Jenama tulen pada harga kaunter", zh: "正品品牌门市价" },
    "why.2.c": { en: "Tell us your budget — we’ll help", bm: "Beritahu bajet anda — kami bantu", zh: "告诉我们您的预算 — 我们帮您" },
    "why.2.learn": { en: "Ask us", bm: "Tanya kami", zh: "咨询我们" },

    "why.3.title": { en: "Advice that’s useful.", bm: "Nasihat yang berguna.", zh: "实用的建议。" },
    "why.3.a": { en: "Bring the broken part — we’ll help match it", bm: "Bawa bahagian rosak — kami bantu padankan", zh: "带上损坏的零件 — 我们帮您配对" },
    "why.3.b": { en: "DIY or contractor — ask our counter staff", bm: "DIY atau kontraktor — tanya kakitangan kami", zh: "DIY 或承包商 — 请咨询门市人员" },
    "why.3.c": { en: "Ask about delivery options", bm: "Tanya tentang pilihan penghantaran", zh: "欢迎询问送货选项" },
    "why.3.learn": { en: "Visit us", bm: "Kunjungi kami", zh: "到店参观" },

    /* ---- brands ---- */
    "sec.brands": { en: "04 · Trusted brands on our shelves", bm: "04 · Jenama terpercaya di rak kami", zh: "04 · 货架上的信赖品牌" },

    /* ---- testimonials / proof ---- */
    "sec.proof.title": { en: "Word around Sibu", bm: "Kata orang Sibu", zh: "诗巫口碑" },
    "proof.quote": { en: "“One of Sibu’s most complete hardware stores.”", bm: "“Antara kedai perkakasan paling lengkap di Sibu.”", zh: "“诗巫货品最齐全的五金店之一。”" },
    "proof.attr":  { en: "— Sibu shopping guide", bm: "— Panduan beli-belah Sibu", zh: "— 诗巫购物指南" },
    "proof.fb.k":  { en: "On Facebook", bm: "Di Facebook", zh: "Facebook 上" },
    "proof.fb.v":  { en: "4,000+ followers — follow @ekowayhardware", bm: "4,000+ pengikut — ikuti @ekowayhardware", zh: "4,000+ 粉丝 — 关注 @ekowayhardware" },
    "proof.g.k":   { en: "On the map", bm: "Di peta", zh: "地图上" },
    "proof.g.v":   { en: "Find us on Google Maps", bm: "Cari kami di Google Maps", zh: "在 Google 地图找到我们" },

    /* ---- store strip ---- */
    "store.label": { en: "Inside the store", bm: "Dalam kedai", zh: "走进门市" },
    "store.head": { en: "Every aisle,<br><span class='serif'>floor to ceiling.</span>", bm: "Setiap lorong,<br><span class='serif'>dari lantai ke siling.</span>", zh: "每条走道,<br><span class='serif'>从地板到天花。</span>" },
    "store.lede": { en: "Genuine-brand power tools, paints, lighting, hardware and abrasives — all under one roof in Salim. Walk in and we'll point you straight to it.", bm: "Alatan kuasa jenama tulen, cat, lampu, perkakasan dan pelelas — semua di bawah satu bumbung di Salim. Masuk sahaja, kami tunjukkan terus.", zh: "正品电动工具、油漆、灯具、五金与砂磨用品 — 全在 Salim 一处。走进来,我们直接帮你找到。" },
    "store.tag":  { en: "Lorong Salim 17 · near Farley, Sibu", bm: "Lorong Salim 17 · berhampiran Farley, Sibu", zh: "Lorong Salim 17 · 近 Farley, 诗巫" },
    "store.hint": { en: "Scroll to walk the aisles · tap any photo to enlarge", bm: "Tatal untuk menyusuri lorong · ketik gambar untuk besarkan", zh: "滚动浏览走道 · 点按任意照片放大" },
    "store.cap.1":  { en: "Power tools — Bosch & Dong Cheng", bm: "Alatan kuasa — Bosch & Dong Cheng", zh: "电动工具 — Bosch & Dong Cheng" },
    "store.cap.2":  { en: "Pressure washers & generators", bm: "Pencuci tekanan & penjana", zh: "高压清洗机与发电机" },
    "store.cap.3":  { en: "Cutting discs & abrasives", bm: "Cakera pemotong & pelelas", zh: "切割片与砂磨用品" },
    "store.cap.4":  { en: "Hand tools & fasteners", bm: "Alatan tangan & pengikat", zh: "手动工具与五金扣件" },
    "store.cap.5":  { en: "Adhesives, epoxy & sealants", bm: "Pelekat, epoksi & pengedap", zh: "胶黏剂、环氧与密封胶" },
    "store.cap.6":  { en: "Paints, rollers & brushes", bm: "Cat, roler & berus", zh: "油漆、滚筒与刷子" },
    "store.cap.7":  { en: "The Nippon Paint range", bm: "Rangkaian Nippon Paint", zh: "立邦漆系列" },
    "store.cap.8":  { en: "Emulsion paint by the stack", bm: "Cat emulsi bertimbun", zh: "乳胶漆整叠现货" },
    "store.cap.9":  { en: "Lighting & electrical", bm: "Lampu & elektrik", zh: "灯具与电器" },
    "store.cap.10": { en: "Walk the aisles", bm: "Susuri lorong", zh: "走进货架之间" },

    /* ---- cta ---- */
    "cta.head": { en: "Need it?<br><span class=\"outline\">We stock it.</span>", bm: "Perlukan?<br><span class=\"outline\">Kami ada.</span>", zh: "需要吗？<br><span class=\"outline\">我们有货。</span>" },
    "cta.wa":   { en: "WhatsApp the counter", bm: "WhatsApp kaunter", zh: "WhatsApp 门市" },
    "cta.visit":{ en: "Visit the store", bm: "Lawati kedai", zh: "到店参观" },
    "cta.join.k": { en: "Get updates the easy way", bm: "Dapatkan kemas kini dengan mudah", zh: "轻松获取最新消息" },
    "cta.join.v": { en: "Join our WhatsApp updates", bm: "Sertai kemas kini WhatsApp", zh: "加入我们的 WhatsApp 更新" },

    /* ---- contact ---- */
    "sec.contact.title": { en: "Visit Us", bm: "Lawati Kami", zh: "到店参观" },
    "contact.addr.k": { en: "Address", bm: "Alamat", zh: "地址" },
    "contact.hours.k": { en: "Hours", bm: "Waktu", zh: "营业时间" },
    "contact.hours.wk": { en: "Mon – Sat", bm: "Isnin – Sabtu", zh: "周一至周六" },
    "contact.hours.wkt": { en: "8:00 AM – 6:00 PM", bm: "8:00 pagi – 6:00 petang", zh: "上午 8:00 – 傍晚 6:00" },
    "contact.hours.sun": { en: "Sunday", bm: "Ahad", zh: "周日" },
    "contact.hours.sunt": { en: "9:00 AM – 2:00 PM", bm: "9:00 pagi – 2:00 petang", zh: "上午 9:00 – 下午 2:00" },
    "contact.wa":    { en: "WhatsApp us", bm: "WhatsApp kami", zh: "WhatsApp 我们" },
    "contact.call":  { en: "Call 084-253883", bm: "Telefon 084-253883", zh: "致电 084-253883" },
    "contact.email": { en: "Email us", bm: "E-mel kami", zh: "电邮我们" },
    "contact.fb":    { en: "Facebook", bm: "Facebook", zh: "Facebook" },
    "contact.map":   { en: "Google Maps embed — owner to add", bm: "Peta Google — pemilik tambah", zh: "Google 地图嵌入 — 由店主添加" },

    /* ---- footer ---- */
    "foot.tag": {
      en: "Ekoway Hardware · 永光五金 · Est. 2017<br>Sibu’s hardware counter.",
      bm: "Ekoway Hardware · 永光五金 · Sejak 2017<br>Kedai perkakasan Sibu.",
      zh: "Ekoway Hardware · 永光五金 · 始于 2017<br>诗巫的五金店。"
    },
    "foot.shop":  { en: "Shop", bm: "Produk", zh: "商品" },
    "foot.co":    { en: "Company", bm: "Syarikat", zh: "公司" },
    "foot.follow":{ en: "Follow", bm: "Ikuti", zh: "关注" },
    "foot.s1": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
    "foot.s2": { en: "Paint", bm: "Cat", zh: "油漆" },
    "foot.s3": { en: "Building Materials", bm: "Bahan Binaan", zh: "建筑材料" },
    "foot.s4": { en: "Electrical Appliances", bm: "Barangan Elektrik", zh: "电器" },
    "foot.c1": { en: "Our story", bm: "Tentang Kami", zh: "关于我们" },
    "foot.c2": { en: "Brands", bm: "Jenama", zh: "品牌" },
    "foot.c3": { en: "Contact", bm: "Hubungi", zh: "联系我们" }
  };

  function getLang() {
    try { return localStorage.getItem("ekoway-lang") || "en"; } catch (e) { return "en"; }
  }
  function setStored(l) {
    try { localStorage.setItem("ekoway-lang", l); } catch (e) {}
  }

  function apply(lang) {
    document.querySelectorAll("[data-i18n]").forEach((el) => {
      const key = el.getAttribute("data-i18n");
      const entry = I18N[key];
      if (!entry) return;
      const val = entry[lang] != null ? entry[lang] : entry.en;
      el.innerHTML = val;
    });
    document.documentElement.lang = lang === "zh" ? "zh-Hans" : lang;
    document.querySelectorAll(".lang-toggle [data-lang]").forEach((s) => {
      const active = s.getAttribute("data-lang") === lang;
      s.classList.toggle("on", active);
      s.setAttribute("aria-pressed", active ? "true" : "false");
    });
  }

  // initial pass — synchronous, before landing.js splits text
  apply(getLang());

  // expose toggle + wire the nav control once the DOM is ready
  window.ekowaySetLang = function (lang) {
    setStored(lang);
    apply(lang);
  };
  function wire() {
    document.querySelectorAll(".lang-toggle [data-lang]").forEach((s) => {
      s.addEventListener("click", (e) => {
        e.preventDefault();
        window.ekowaySetLang(s.getAttribute("data-lang"));
      });
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", wire);
  } else {
    wire();
  }
})();
