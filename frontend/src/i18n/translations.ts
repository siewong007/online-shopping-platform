export type Lang = "en" | "bm" | "zh";

type Entry = { en: string; bm: string; zh: string };

export const translations = {
  /* ---- landing nav ---- */
  "nav.catalog": { en: "Catalog", bm: "Katalog", zh: "产品" },
  "nav.month": { en: "This month", bm: "Bulan ini", zh: "本月精选" },
  "nav.why": { en: "Why us", bm: "Kenapa Ekoway", zh: "我们的优势" },
  "nav.story": { en: "Our story", bm: "Tentang Kami", zh: "关于我们" },
  "nav.contact": { en: "Contact", bm: "Hubungi", zh: "联系我们" },
  "nav.shop": { en: "Shop online", bm: "Beli online", zh: "线上商店" },

  /* ---- landing hero ---- */
  "hero.sub": {
    en: "From Bosch power tools to Nippon Paint and everyday essentials — genuine brands in Salim, near Farley, Sibu since 2017.",
    bm: "Dari alatan kuasa Bosch hingga cat Nippon Paint dan keperluan harian — jenama terpercaya di Salim, berhampiran Farley, Sibu sejak 2017.",
    zh: "从 Bosch 电动工具到立邦漆与日常用品 — 自 2017 年起，正品品牌尽在诗巫 Salim 区，毗邻 Farley。"
  },
  "hero.cta": { en: "WhatsApp us", bm: "WhatsApp kami", zh: "WhatsApp 我们" },
  "hero.browse": { en: "Browse categories", bm: "Lihat kategori", zh: "浏览分类" },

  /* ---- landing ticker ---- */
  "tick.1": { en: "Genuine brands · full warranty", bm: "Jenama terpercaya · waranti penuh", zh: "正品品牌 · 完整保修" },
  "tick.2": { en: "New arrivals in store", bm: "Stok baharu di kedai", zh: "新货到店" },
  "tick.3": { en: "WhatsApp 017-405 6993", bm: "WhatsApp 017-405 6993", zh: "WhatsApp 017-405 6993" },
  "tick.4": {
    en: "Open Mon–Sat 8am–6pm · Sun 9am–2pm",
    bm: "Buka Isn–Sab 8pg–6ptg · Ahd 9pg–2ptg",
    zh: "营业 周一至周六 8am–6pm · 周日 9am–2pm"
  },

  /* ---- landing about ---- */
  "about.label": { en: "Serving Sibu since 2017", bm: "Berkhidmat di Sibu sejak 2017", zh: "自 2017 年服务诗巫" },
  "about.head.1": { en: "We are Ekoway Hardware, ", bm: "Kami Ekoway Hardware, ", zh: "我们是 Ekoway Hardware，" },
  "about.head.serif": {
    en: "永光五金 — Sibu’s hardware counter since 2017.",
    bm: "永光五金 — kedai perkakasan Sibu sejak 2017.",
    zh: "永光五金 — 自 2017 年起服务诗巫的五金店。"
  },
  "about.head.2": {
    en: " Power tools to building materials, for DIY and contractors alike.",
    bm: " Alatan kuasa hingga bahan binaan, untuk DIY dan kontraktor.",
    zh: " 从电动工具到建筑材料，为 DIY 爱好者与承包商而备。"
  },
  "about.body": {
    en: "Ekoway Hardware has served Sibu since 2017 — 永光五金 — from our store in Salim, near Farley Commercial Centre. We stock everything from power tools to building materials for DIY customers and contractors, with trusted brands and straightforward service. Visit us or message us on WhatsApp — we’re happy to help.",
    bm: "Ekoway Hardware telah berkhidmat di Sibu sejak 2017 — 永光五金 — dari kedai kami di Salim, berhampiran Farley Commercial Centre. Kami menyediakan semua keperluan dari alatan kuasa hingga bahan binaan untuk pelanggan DIY dan kontraktor, dengan jenama terpercaya dan servis yang mudah. Kunjungi kami atau WhatsApp kami — kami sedia membantu.",
    zh: "Ekoway Hardware 自 2017 年起服务诗巫 — 永光五金 — 门市位于 Salim 区，毗邻 Farley 商业中心。我们备有从电动工具到建筑材料的各类商品，服务 DIY 顾客与承包商，提供正品品牌与实在的服务。欢迎到店或通过 WhatsApp 联系我们 — 我们乐意效劳。"
  },

  /* ---- landing categories ---- */
  "sec.cat.title": { en: "What we stock", bm: "Apa yang kami simpan", zh: "我们的商品" },
  "sec.cat.more": { en: "Visit or WhatsApp ↗", bm: "Kunjungi atau WhatsApp ↗", zh: "到店或 WhatsApp ↗" },
  "cat.01.name": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
  "cat.01.sub": { en: "drills · grinders · saws", bm: "gerudi · pengisar · gergaji", zh: "钻机 · 砂轮机 · 锯" },
  "cat.02.name": { en: "Paint", bm: "Cat", zh: "油漆" },
  "cat.02.sub": { en: "interior · exterior · primers", bm: "dalaman · luaran · primer", zh: "内墙 · 外墙 · 底漆" },
  "cat.03.name": { en: "Building Materials", bm: "Bahan Binaan", zh: "建筑材料" },
  "cat.03.sub": { en: "cement · sand · fixings", bm: "simen · pasir · pengikat", zh: "水泥 · 沙 · 紧固件" },
  "cat.04.name": { en: "Bathroom Accessories", bm: "Barangan Bilik Air", zh: "浴室配件" },
  "cat.04.sub": { en: "fittings · fixtures", bm: "kelengkapan · pemasangan", zh: "配件 · 装置" },
  "cat.05.name": { en: "Kitchen Accessories", bm: "Barangan Dapur", zh: "厨房用品" },
  "cat.05.sub": { en: "cookware · utensils", bm: "periuk belanga · perkakas", zh: "炊具 · 器皿" },
  "cat.06.name": { en: "Electrical Appliances", bm: "Barangan Elektrik", zh: "电器" },
  "cat.06.sub": { en: "wiring · fans · lighting", bm: "pendawaian · kipas · lampu", zh: "布线 · 风扇 · 照明" },

  /* ---- landing this month ---- */
  "sec.month.title": { en: "This month at Ekoway", bm: "Bulan ini di Ekoway", zh: "本月精选" },
  "sec.month.more": { en: "Ask on WhatsApp ↗", bm: "Tanya di WhatsApp ↗", zh: "WhatsApp 询问 ↗" },
  "month.1.title": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
  "month.1.body": {
    en: "Cordless drills, grinders and saws built for the job.",
    bm: "Gerudi tanpa wayar, pengisar dan gergaji untuk kerja anda.",
    zh: "为工作而生的无线钻机、砂轮机与锯。"
  },
  "month.2.title": { en: "Paints", bm: "Cat", zh: "油漆" },
  "month.2.body": {
    en: "Interior, exterior and primers — tinted in store.",
    bm: "Dalaman, luaran dan primer — ditona di kedai.",
    zh: "内墙、外墙与底漆 — 店内调色。"
  },
  "month.3.title": { en: "Home Appliances", bm: "Barangan Elektrik Rumah", zh: "家用电器" },
  "month.3.body": {
    en: "Fans, kitchen appliances and water heaters for the home.",
    bm: "Kipas, perkakas dapur dan pemanas air untuk rumah.",
    zh: "风扇、厨房电器与家用热水器。"
  },
  "month.4.title": { en: "Bathroom & Plumbing", bm: "Bilik Air & Paip", zh: "浴室与水管" },
  "month.4.body": {
    en: "Fittings, fixtures, pipes and valves.",
    bm: "Kelengkapan, pemasangan, paip dan injap.",
    zh: "配件、装置、水管与阀门。"
  },
  "month.wa": { en: "WhatsApp for promotions", bm: "WhatsApp untuk promosi", zh: "WhatsApp 询问促销" },

  /* ---- landing stats ---- */
  "stat.1": { en: "Years in Sibu", bm: "Tahun di Sibu", zh: "在诗巫的年数" },
  "stat.2": { en: "Trusted brands", bm: "Jenama terpercaya", zh: "信赖品牌" },
  "stat.3": { en: "Product types", bm: "Jenis produk", zh: "产品种类" },
  "stat.4": { en: "Facebook followers", bm: "Pengikut Facebook", zh: "Facebook 粉丝" },

  /* ---- landing why ---- */
  "sec.why.title": { en: "Why Ekoway", bm: "Kenapa Ekoway", zh: "为什么选择 Ekoway" },
  "why.head1": {
    en: "Store-grade stock for serious work.",
    bm: "Stok gred kedai untuk kerja serius.",
    zh: "应对认真工作的门市级库存。"
  },
  "why.head2": {
    en: "Genuine brands. Honest service. Real advice.",
    bm: "Jenama terpercaya. Servis jujur. Nasihat sebenar.",
    zh: "正品品牌。诚实服务。实用建议。"
  },
  "why.cap": { en: "Your projects, supplied.", bm: "Projek anda, dibekalkan.", zh: "供应您的每个项目。" },
  "why.1.title": { en: "Genuine brands.", bm: "Jenama terpercaya.", zh: "正品品牌。" },
  "why.1.a": { en: "Sourced from authorised distributors", bm: "Dari pengedar yang sah", zh: "来自授权经销商" },
  "why.1.b": { en: "Genuine stock — no greys, no fakes", bm: "Stok tulen — bukan tiruan", zh: "正品库存 — 绝无水货或假货" },
  "why.1.c": { en: "18 trusted brands on the shelves", bm: "18 jenama terpercaya di rak", zh: "货架上 18 个信赖品牌" },
  "why.1.d": {
    en: "Bosch · DONGCHENG · Nippon Paint · Panasonic",
    bm: "Bosch · DONGCHENG · Nippon Paint · Panasonic",
    zh: "Bosch · DONGCHENG · 立邦漆 · Panasonic"
  },
  "why.1.learn": { en: "See the brands", bm: "Lihat jenama", zh: "查看品牌" },
  "why.2.title": { en: "Fair, honest pricing.", bm: "Harga yang jujur.", zh: "公道诚实的价格。" },
  "why.2.a": { en: "Ask us about price matching", bm: "Tanya kami tentang padanan harga", zh: "欢迎询问价格匹配" },
  "why.2.b": { en: "Genuine brands at counter prices", bm: "Jenama tulen pada harga kaunter", zh: "正品品牌门市价" },
  "why.2.c": { en: "Tell us your budget — we’ll help", bm: "Beritahu bajet anda — kami bantu", zh: "告诉我们您的预算 — 我们帮您" },
  "why.2.learn": { en: "Ask us", bm: "Tanya kami", zh: "咨询我们" },
  "why.3.title": { en: "Advice that’s useful.", bm: "Nasihat yang berguna.", zh: "实用的建议。" },
  "why.3.a": {
    en: "Bring the broken part — we’ll help match it",
    bm: "Bawa bahagian rosak — kami bantu padankan",
    zh: "带上损坏的零件 — 我们帮您配对"
  },
  "why.3.b": {
    en: "DIY or contractor — ask our counter staff",
    bm: "DIY atau kontraktor — tanya kakitangan kami",
    zh: "DIY 或承包商 — 请咨询门市人员"
  },
  "why.3.c": { en: "Ask about delivery options", bm: "Tanya tentang pilihan penghantaran", zh: "欢迎询问送货选项" },
  "why.3.learn": { en: "Visit us", bm: "Kunjungi kami", zh: "到店参观" },

  /* ---- landing brands ---- */
  "sec.brands": {
    en: "04 · Trusted brands on our shelves",
    bm: "04 · Jenama terpercaya di rak kami",
    zh: "04 · 货架上的信赖品牌"
  },

  /* ---- landing proof ---- */
  "sec.proof.title": { en: "Word around Sibu", bm: "Kata orang Sibu", zh: "诗巫口碑" },
  "proof.quote": {
    en: "“One of Sibu’s most complete hardware stores.”",
    bm: "“Antara kedai perkakasan paling lengkap di Sibu.”",
    zh: "“诗巫货品最齐全的五金店之一。”"
  },
  "proof.attr": { en: "— Sibu shopping guide", bm: "— Panduan beli-belah Sibu", zh: "— 诗巫购物指南" },
  "proof.fb.k": { en: "On Facebook", bm: "Di Facebook", zh: "Facebook 上" },
  "proof.fb.v": {
    en: "4,000+ followers — follow @ekowayhardware",
    bm: "4,000+ pengikut — ikuti @ekowayhardware",
    zh: "4,000+ 粉丝 — 关注 @ekowayhardware"
  },
  "proof.g.k": { en: "On the map", bm: "Di peta", zh: "地图上" },
  "proof.g.v": { en: "Find us on Google Maps", bm: "Cari kami di Google Maps", zh: "在 Google 地图找到我们" },

  /* ---- landing store gallery ---- */
  "store.label": { en: "Inside the store", bm: "Dalam kedai", zh: "走进门市" },
  "store.head.1": { en: "Every aisle,", bm: "Setiap lorong,", zh: "每条走道," },
  "store.head.serif": { en: "floor to ceiling.", bm: "dari lantai ke siling.", zh: "从地板到天花。" },
  "store.lede": {
    en: "Genuine-brand power tools, paints, lighting, hardware and abrasives — all under one roof in Salim. Walk in and we'll point you straight to it.",
    bm: "Alatan kuasa jenama tulen, cat, lampu, perkakasan dan pelelas — semua di bawah satu bumbung di Salim. Masuk sahaja, kami tunjukkan terus.",
    zh: "正品电动工具、油漆、灯具、五金与砂磨用品 — 全在 Salim 一处。走进来,我们直接帮你找到。"
  },
  "store.tag": {
    en: "Lorong Salim 17 · near Farley, Sibu",
    bm: "Lorong Salim 17 · berhampiran Farley, Sibu",
    zh: "Lorong Salim 17 · 近 Farley, 诗巫"
  },
  "store.hint": {
    en: "Scroll to walk the aisles · tap any photo to enlarge",
    bm: "Tatal untuk menyusuri lorong · ketik gambar untuk besarkan",
    zh: "滚动浏览走道 · 点按任意照片放大"
  },
  "store.cap.1": { en: "Power tools — Bosch & Dong Cheng", bm: "Alatan kuasa — Bosch & Dong Cheng", zh: "电动工具 — Bosch & Dong Cheng" },
  "store.cap.2": { en: "Pressure washers & generators", bm: "Pencuci tekanan & penjana", zh: "高压清洗机与发电机" },
  "store.cap.3": { en: "Cutting discs & abrasives", bm: "Cakera pemotong & pelelas", zh: "切割片与砂磨用品" },
  "store.cap.4": { en: "Hand tools & fasteners", bm: "Alatan tangan & pengikat", zh: "手动工具与五金扣件" },
  "store.cap.5": { en: "Adhesives, epoxy & sealants", bm: "Pelekat, epoksi & pengedap", zh: "胶黏剂、环氧与密封胶" },
  "store.cap.6": { en: "Paints, rollers & brushes", bm: "Cat, roler & berus", zh: "油漆、滚筒与刷子" },
  "store.cap.7": { en: "The Nippon Paint range", bm: "Rangkaian Nippon Paint", zh: "立邦漆系列" },
  "store.cap.8": { en: "Emulsion paint by the stack", bm: "Cat emulsi bertimbun", zh: "乳胶漆整叠现货" },
  "store.cap.9": { en: "Lighting & electrical", bm: "Lampu & elektrik", zh: "灯具与电器" },
  "store.cap.10": { en: "Walk the aisles", bm: "Susuri lorong", zh: "走进货架之间" },

  /* ---- landing cta ---- */
  "cta.head.1": { en: "Need it?", bm: "Perlukan?", zh: "需要吗？" },
  "cta.head.outline": { en: "We stock it.", bm: "Kami ada.", zh: "我们有货。" },
  "cta.wa": { en: "WhatsApp the counter", bm: "WhatsApp kaunter", zh: "WhatsApp 门市" },
  "cta.visit": { en: "Visit the store", bm: "Lawati kedai", zh: "到店参观" },
  "cta.join.k": { en: "Get updates the easy way", bm: "Dapatkan kemas kini dengan mudah", zh: "轻松获取最新消息" },
  "cta.join.v": { en: "Join our WhatsApp updates", bm: "Sertai kemas kini WhatsApp", zh: "加入我们的 WhatsApp 更新" },

  /* ---- landing contact ---- */
  "sec.contact.title": { en: "Visit Us", bm: "Lawati Kami", zh: "到店参观" },
  "contact.addr.k": { en: "Address", bm: "Alamat", zh: "地址" },
  "contact.hours.k": { en: "Hours", bm: "Waktu", zh: "营业时间" },
  "contact.hours.wk": { en: "Mon – Sat", bm: "Isnin – Sabtu", zh: "周一至周六" },
  "contact.hours.wkt": { en: "8:00 AM – 6:00 PM", bm: "8:00 pagi – 6:00 petang", zh: "上午 8:00 – 傍晚 6:00" },
  "contact.hours.sun": { en: "Sunday", bm: "Ahad", zh: "周日" },
  "contact.hours.sunt": { en: "9:00 AM – 2:00 PM", bm: "9:00 pagi – 2:00 petang", zh: "上午 9:00 – 下午 2:00" },
  "contact.wa": { en: "WhatsApp us", bm: "WhatsApp kami", zh: "WhatsApp 我们" },
  "contact.call": { en: "Call 084-253883", bm: "Telefon 084-253883", zh: "致电 084-253883" },
  "contact.email": { en: "Email us", bm: "E-mel kami", zh: "电邮我们" },
  "contact.fb": { en: "Facebook", bm: "Facebook", zh: "Facebook" },

  /* ---- landing footer ---- */
  "foot.tag.1": {
    en: "Ekoway Hardware · 永光五金 · Est. 2017",
    bm: "Ekoway Hardware · 永光五金 · Sejak 2017",
    zh: "Ekoway Hardware · 永光五金 · 始于 2017"
  },
  "foot.tag.2": { en: "Sibu’s hardware counter.", bm: "Kedai perkakasan Sibu.", zh: "诗巫的五金店。" },
  "foot.shop": { en: "Shop", bm: "Produk", zh: "商品" },
  "foot.co": { en: "Company", bm: "Syarikat", zh: "公司" },
  "foot.follow": { en: "Follow", bm: "Ikuti", zh: "关注" },
  "foot.s1": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
  "foot.s2": { en: "Paint", bm: "Cat", zh: "油漆" },
  "foot.s3": { en: "Building Materials", bm: "Bahan Binaan", zh: "建筑材料" },
  "foot.s4": { en: "Electrical Appliances", bm: "Barangan Elektrik", zh: "电器" },
  "foot.c1": { en: "Our story", bm: "Tentang Kami", zh: "关于我们" },
  "foot.c2": { en: "Brands", bm: "Jenama", zh: "品牌" },
  "foot.c3": { en: "Contact", bm: "Hubungi", zh: "联系我们" },

  /* ---- storefront chrome ---- */
  "shop.strip.before": {
    en: "Genuine brands at counter prices — shop online or WhatsApp ",
    bm: "Jenama tulen pada harga kaunter — beli online atau WhatsApp ",
    zh: "正品品牌门市价 — 在线购买或 WhatsApp "
  },
  "shop.strip.after": { en: ".", bm: ".", zh: "。" },
  "shop.strip.cta": { en: "Open Ops Console", bm: "Buka Konsol Operasi", zh: "打开运营控制台" },
  "shop.eyebrow": {
    en: "Sibu’s hardware counter since 2017",
    bm: "Kedai perkakasan Sibu sejak 2017",
    zh: "自 2017 年服务诗巫的五金店"
  },
  "shop.brand": { en: "Ekoway Hardware", bm: "Ekoway Hardware", zh: "Ekoway Hardware" },
  "shop.tagline": {
    en: "永光五金 · Salim, Sibu, Sarawak",
    bm: "永光五金 · Salim, Sibu, Sarawak",
    zh: "永光五金 · Salim · 诗巫 · 砂拉越"
  },
  "shop.search.label": {
    en: "What can we help you find today?",
    bm: "Apa yang boleh kami bantu cari hari ini?",
    zh: "今天想找什么？"
  },
  "shop.search.placeholder": {
    en: "Search power tools, paint, plumbing and more",
    bm: "Cari alatan kuasa, cat, paip dan banyak lagi",
    zh: "搜索电动工具、油漆、水管配件等"
  },
  "shop.account": { en: "My Account", bm: "Akaun Saya", zh: "我的账户" },
  "shop.cart": { en: "Cart", bm: "Troli", zh: "购物车" },
  "shop.nav.admin": { en: "Admin", bm: "Admin", zh: "管理" },
  "shop.nav.home": { en: "Home", bm: "Utama", zh: "首页" },
  "shop.loading": { en: "Loading the Ekoway storefront...", bm: "Memuatkan kedai Ekoway...", zh: "正在加载 Ekoway 商店..." },

  "shop.hero.eyebrow": {
    en: "Order online, collect in Salim",
    bm: "Pesan online, ambil di Salim",
    zh: "在线下单，Salim 门市自取"
  },
  "shop.hero.title": {
    en: "Genuine-brand tools, paint and home essentials at counter prices.",
    bm: "Alatan jenama tulen, cat dan keperluan rumah pada harga kaunter.",
    zh: "正品工具、油漆与家居必需品，一律门市价。"
  },
  "shop.hero.body": {
    en: "Browse the shelves online — power tools to building materials — then pick up at the store or arrange delivery around Sibu.",
    bm: "Lihat rak kami secara online — alatan kuasa hingga bahan binaan — kemudian ambil di kedai atau atur penghantaran sekitar Sibu.",
    zh: "在线浏览货架 — 从电动工具到建筑材料 — 到店自取或安排诗巫周边送货。"
  },
  "shop.hero.cta1": { en: "Shop deals", bm: "Lihat tawaran", zh: "查看优惠" },
  "shop.hero.cta2": { en: "Explore services", bm: "Lihat perkhidmatan", zh: "了解服务" },
  "shop.hero.m1.v": { en: "Since 2017", bm: "Sejak 2017", zh: "始于 2017" },
  "shop.hero.m1.k": {
    en: "serving Sibu’s DIY and contractors",
    bm: "berkhidmat untuk DIY dan kontraktor Sibu",
    zh: "服务诗巫的 DIY 与承包商"
  },
  "shop.hero.m2.v": { en: "18+", bm: "18+", zh: "18+" },
  "shop.hero.m2.k": { en: "trusted brands on the shelves", bm: "jenama terpercaya di rak", zh: "货架上的信赖品牌" },
  "shop.hero.m3.v": { en: "10,000+", bm: "10,000+", zh: "10,000+" },
  "shop.hero.m3.k": { en: "product types under one roof", bm: "jenis produk di bawah satu bumbung", zh: "同一屋檐下的产品种类" },

  "shop.panel2.eyebrow": { en: "This month’s picks", bm: "Pilihan bulan ini", zh: "本月推荐" },
  "shop.panel2.title": { en: "Deals stacked for real projects.", bm: "Tawaran untuk projek sebenar.", zh: "为真实项目准备的优惠。" },
  "shop.panel2.body": {
    en: "Category-led offers across tools, paint and appliances — ask the counter about promotions.",
    bm: "Tawaran mengikut kategori untuk alatan, cat dan perkakas — tanya kaunter tentang promosi.",
    zh: "涵盖工具、油漆与电器的分类优惠 — 欢迎向门市询问促销。"
  },
  "shop.panel2.p1": {
    en: "Cordless tool kits from Bosch and DONGCHENG",
    bm: "Kit alatan tanpa wayar Bosch dan DONGCHENG",
    zh: "Bosch 与 DONGCHENG 无线工具套装"
  },
  "shop.panel2.p2": { en: "Nippon Paint tinted in store", bm: "Nippon Paint ditona di kedai", zh: "立邦漆店内调色" },
  "shop.panel2.p3": {
    en: "Fans and water heaters for the home",
    bm: "Kipas dan pemanas air untuk rumah",
    zh: "家用风扇与热水器"
  },
  "shop.panel2.link": { en: "View all savings", bm: "Lihat semua tawaran", zh: "查看全部优惠" },

  "shop.panel3.eyebrow": { en: "Store services", bm: "Perkhidmatan kedai", zh: "门市服务" },
  "shop.panel3.title": {
    en: "Pickup, delivery and advice from one counter.",
    bm: "Ambilan, penghantaran dan nasihat dari satu kaunter.",
    zh: "自取、送货与建议，尽在一个柜台。"
  },
  "shop.panel3.body": {
    en: "Message the counter on WhatsApp — we’ll pick, pack and have it ready.",
    bm: "WhatsApp kaunter kami — kami sediakan pesanan anda.",
    zh: "WhatsApp 联系门市 — 我们为您备货打包。"
  },
  "shop.svc.1.k": { en: "Pickup", bm: "Ambilan", zh: "自取" },
  "shop.svc.1.v": {
    en: "Order online and collect at the Salim store.",
    bm: "Pesan online dan ambil di kedai Salim.",
    zh: "在线下单，Salim 门市自取。"
  },
  "shop.svc.2.k": { en: "Delivery", bm: "Penghantaran", zh: "送货" },
  "shop.svc.2.v": {
    en: "Bulky orders delivered around Sibu — ask for a quote.",
    bm: "Pesanan pukal dihantar sekitar Sibu — minta sebut harga.",
    zh: "大件订单诗巫周边配送 — 欢迎询价。"
  },
  "shop.svc.3.k": { en: "Advice", bm: "Nasihat", zh: "建议" },
  "shop.svc.3.v": {
    en: "Bring the broken part — the counter will match it.",
    bm: "Bawa bahagian rosak — kaunter kami padankan.",
    zh: "带上损坏零件 — 门市帮您配对。"
  },

  "shop.sec.cat.eyebrow": { en: "Shop by category", bm: "Beli ikut kategori", zh: "按分类购买" },
  "shop.sec.cat.title": {
    en: "Department-first, just like the counter",
    bm: "Mengikut jabatan, seperti di kaunter",
    zh: "按部门陈列，如同门市"
  },
  "shop.sec.cat.now": { en: "Now showing:", bm: "Sedang dipaparkan:", zh: "当前显示：" },
  "shop.filter.min": { en: "Min price", bm: "Harga minimum", zh: "最低价" },
  "shop.filter.max": { en: "Max price", bm: "Harga maksimum", zh: "最高价" },
  "shop.filter.sort": { en: "Sort by", bm: "Susun ikut", zh: "排序" },
  "shop.sort.featured": { en: "Featured", bm: "Pilihan", zh: "精选" },
  "shop.sort.priceAsc": { en: "Price: Low to High", bm: "Harga: Rendah ke Tinggi", zh: "价格：从低到高" },
  "shop.sort.priceDesc": { en: "Price: High to Low", bm: "Harga: Tinggi ke Rendah", zh: "价格：从高到低" },
  "shop.sort.name": { en: "Name A-Z", bm: "Nama A-Z", zh: "名称 A-Z" },

  "shop.savings.eyebrow": { en: "Savings snapshot", bm: "Ringkasan tawaran", zh: "优惠一览" },
  "shop.savings.title": {
    en: "Promotions grouped around urgency, delivery and category breadth.",
    bm: "Promosi mengikut keutamaan, penghantaran dan kategori.",
    zh: "按时效、配送与品类分组的促销。"
  },
  "shop.savings.count": {
    en: "{n} featured products match the current department and search filters.",
    bm: "{n} produk pilihan sepadan dengan jabatan dan carian semasa.",
    zh: "{n} 件精选商品符合当前的部门与搜索条件。"
  },
  "shop.savings.t1": { en: "Daily Deals", bm: "Tawaran Harian", zh: "每日优惠" },
  "shop.savings.t2": { en: "Special Buy", bm: "Belian Istimewa", zh: "特价商品" },
  "shop.savings.t3": { en: "Free Delivery", bm: "Penghantaran Percuma", zh: "免费送货" },
  "shop.savings.t4": { en: "Pro Volume Pricing", bm: "Harga Pukal Pro", zh: "承包商批量价" },

  "shop.products.eyebrow": { en: "This month’s deals", bm: "Tawaran bulan ini", zh: "本月优惠" },
  "shop.products.title": {
    en: "Featured products from the Ekoway shelves",
    bm: "Produk pilihan dari rak Ekoway",
    zh: "来自 Ekoway 货架的精选商品"
  },
  "shop.product.from": { en: "From", bm: "Dari", zh: "价格自" },
  "shop.product.add": { en: "Add to Cart", bm: "Tambah ke Troli", zh: "加入购物车" },

  "shop.services.eyebrow": { en: "More ways to get it done", bm: "Lebih banyak cara siapkan kerja", zh: "更多完成工作的方式" },
  "shop.services.title": {
    en: "Services next to the shelves, not outside them",
    bm: "Perkhidmatan di sebelah rak, bukan di luar",
    zh: "服务就在货架旁"
  },
  "shop.services.card": { en: "Service", bm: "Perkhidmatan", zh: "服务" },

  "shop.pro.eyebrow": {
    en: "Pro services & contractor supply",
    bm: "Perkhidmatan pro & bekalan kontraktor",
    zh: "专业服务与承包商供应"
  },
  "shop.pro.title": {
    en: "Built for crews that need quotes, pickups and deliveries to move without friction.",
    bm: "Untuk krew yang perlukan sebut harga, ambilan dan penghantaran tanpa halangan.",
    zh: "为需要快速报价、自取与送货的施工队而设。"
  },
  "shop.pro.body": {
    en: "Contractor pricing, bulk orders and scheduled deliveries — talk to the counter and we’ll sort your site list.",
    bm: "Harga kontraktor, pesanan pukal dan penghantaran berjadual — hubungi kaunter dan kami uruskan senarai tapak anda.",
    zh: "承包商价格、批量订单与定期送货 — 联系门市，我们帮您安排工地清单。"
  },

  "shop.dept.all": { en: "Shop All", bm: "Semua", zh: "全部商品" },
  "shop.dept.deals": { en: "Specials & Offers", bm: "Tawaran Istimewa", zh: "特价优惠" },
  "shop.dept.power": { en: "Power Tools", bm: "Alatan Kuasa", zh: "电动工具" },
  "shop.dept.paint": { en: "Paint", bm: "Cat", zh: "油漆" },
  "shop.dept.building": { en: "Building Materials", bm: "Bahan Binaan", zh: "建筑材料" },
  "shop.dept.bath": { en: "Bathroom", bm: "Bilik Air", zh: "浴室" },
  "shop.dept.kitchen": { en: "Kitchen", bm: "Dapur", zh: "厨房" },
  "shop.dept.electrical": { en: "Electrical", bm: "Elektrik", zh: "电器" },
  "shop.dept.lighting": { en: "Lighting", bm: "Lampu", zh: "照明" },
  "shop.dept.hand": { en: "Hand Tools", bm: "Alatan Tangan", zh: "手动工具" },
  "shop.dept.services": { en: "Services", bm: "Perkhidmatan", zh: "服务" },
  "shop.dept.pro": { en: "Pro", bm: "Pro", zh: "承包商" },

  "shop.cartd.title": { en: "Your Cart", bm: "Troli Anda", zh: "您的购物车" },
  "shop.cartd.empty": {
    en: "Your cart is empty. Add products to get started.",
    bm: "Troli anda kosong. Tambah produk untuk bermula.",
    zh: "购物车是空的。添加商品开始购物。"
  },
  "shop.cartd.subtotal": { en: "Subtotal", bm: "Jumlah kecil", zh: "小计" },
  "shop.cartd.checkout": { en: "Checkout", bm: "Bayar", zh: "结算" },
  "shop.cartd.remove": { en: "Remove", bm: "Buang", zh: "移除" },
  "shop.cartd.close": { en: "Close", bm: "Tutup", zh: "关闭" },

  /* ---- storefront support chat ---- */
  "support.launcher": { en: "Chat with support", bm: "Chat dengan sokongan", zh: "联系支持" },
  "support.closePanel": { en: "Close support chat", bm: "Tutup chat sokongan", zh: "关闭支持聊天" },
  "support.eyebrow": { en: "Customer care", bm: "Khidmat pelanggan", zh: "客户服务" },
  "support.title": { en: "Chat with support", bm: "Chat dengan sokongan", zh: "联系支持" },
  "support.instructions": {
    en: "Leave a message and our team will reply here. We do not show live availability.",
    bm: "Tinggalkan mesej dan pasukan kami akan membalas di sini. Kami tidak memaparkan ketersediaan langsung.",
    zh: "请留言，我们的团队会在这里回复。我们不会显示在线状态。"
  },
  "support.welcome": { en: "How can we help?", bm: "Bagaimana kami boleh membantu?", zh: "我们怎样帮您？" },
  "support.name": { en: "Your name", bm: "Nama anda", zh: "您的姓名" },
  "support.email": { en: "Email address", bm: "Alamat e-mel", zh: "电子邮箱" },
  "support.firstMessage": { en: "Your message", bm: "Mesej anda", zh: "您的留言" },
  "support.firstMessagePlaceholder": {
    en: "Tell us what you need help with",
    bm: "Beritahu kami perkara yang anda perlukan bantuan",
    zh: "请告诉我们您需要什么帮助"
  },
  "support.start": { en: "Start conversation", bm: "Mulakan perbualan", zh: "开始对话" },
  "support.starting": { en: "Starting…", bm: "Sedang bermula…", zh: "正在开始…" },
  "support.loading": { en: "Loading your conversation…", bm: "Memuatkan perbualan anda…", zh: "正在加载您的对话…" },
  "support.retry": { en: "Try again", bm: "Cuba lagi", zh: "重试" },
  "support.status.open": { en: "Open", bm: "Terbuka", zh: "进行中" },
  "support.status.pending": { en: "Pending", bm: "Menunggu", zh: "待处理" },
  "support.status.closed": { en: "Closed", bm: "Ditutup", zh: "已关闭" },
  "support.closeConversation": { en: "Close conversation", bm: "Tutup perbualan", zh: "关闭对话" },
  "support.closing": { en: "Closing…", bm: "Sedang ditutup…", zh: "正在关闭…" },
  "support.closed": {
    en: "This conversation is closed. Start a new conversation if you need more help.",
    bm: "Perbualan ini telah ditutup. Mulakan perbualan baharu jika anda perlukan bantuan lagi.",
    zh: "此对话已关闭。如需更多帮助，请开始新的对话。"
  },
  "support.newConversation": {
    en: "Your previous support session has ended. You can start a new conversation below.",
    bm: "Sesi sokongan terdahulu anda telah tamat. Anda boleh mulakan perbualan baharu di bawah.",
    zh: "您之前的支持会话已结束。您可以在下方开始新的对话。"
  },
  "support.thread": { en: "Support conversation", bm: "Perbualan sokongan", zh: "支持对话" },
  "support.you": { en: "You", bm: "Anda", zh: "您" },
  "support.team": { en: "Support team", bm: "Pasukan sokongan", zh: "支持团队" },
  "support.message": { en: "Message", bm: "Mesej", zh: "消息" },
  "support.messagePlaceholder": { en: "Write a reply", bm: "Tulis balasan", zh: "输入回复" },
  "support.sendHint": {
    en: "Press Enter to send · Shift+Enter for a new line",
    bm: "Tekan Enter untuk hantar · Shift+Enter untuk baris baharu",
    zh: "按 Enter 发送 · Shift+Enter 换行"
  },
  "support.send": { en: "Send", bm: "Hantar", zh: "发送" },
  "support.sending": { en: "Sending…", bm: "Sedang menghantar…", zh: "正在发送…" },
  "support.unread": { en: "New support reply", bm: "Balasan sokongan baharu", zh: "新的支持回复" },
  "support.error.required": {
    en: "Complete the required fields before sending your message.",
    bm: "Lengkapkan ruangan wajib sebelum menghantar mesej anda.",
    zh: "请填写必填项后再发送消息。"
  },
  "support.error.email": {
    en: "Enter a valid email address.",
    bm: "Masukkan alamat e-mel yang sah.",
    zh: "请输入有效的电子邮箱。"
  },
  "support.error.connection": {
    en: "We could not reach support right now. Check your connection and try again.",
    bm: "Kami tidak dapat menghubungi sokongan sekarang. Semak sambungan anda dan cuba lagi.",
    zh: "目前无法连接支持服务。请检查网络后重试。"
  },
  "support.error.sessionExpired": {
    en: "Your support session has expired. Start a new conversation to continue.",
    bm: "Sesi sokongan anda telah tamat. Mulakan perbualan baharu untuk teruskan.",
    zh: "您的支持会话已过期。请开始新的对话以继续。"
  },
  "support.error.generic": {
    en: "We could not complete that support request. Try again.",
    bm: "Kami tidak dapat menyelesaikan permintaan sokongan itu. Cuba lagi.",
    zh: "无法完成该支持请求。请重试。"
  }
} as const satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;
