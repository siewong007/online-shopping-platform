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
    en: "Tools, building supplies and everyday hardware from our store in Salim, Sibu.",
    bm: "Alatan, bahan binaan dan perkakasan harian dari kedai kami di Salim, Sibu.",
    zh: "工具、建筑用品与日常五金，来自诗巫 Salim 门市。"
  },
  "hero.cta": { en: "WhatsApp us", bm: "WhatsApp kami", zh: "WhatsApp 我们" },
  "hero.browse": { en: "Browse categories", bm: "Lihat kategori", zh: "浏览分类" },

  /* ---- landing ticker ---- */
  "tick.1": { en: "Tools · materials · everyday hardware", bm: "Alatan · bahan · perkakasan harian", zh: "工具 · 材料 · 日常五金" },
  "tick.2": { en: "New arrivals in store", bm: "Stok baharu di kedai", zh: "新货到店" },
  "tick.3": { en: "WhatsApp 017-405 6993", bm: "WhatsApp 017-405 6993", zh: "WhatsApp 017-405 6993" },
  "tick.4": {
    en: "Call or WhatsApp to confirm today's hours",
    bm: "Telefon atau WhatsApp untuk sahkan waktu hari ini",
    zh: "请致电或 WhatsApp 确认当天营业时间"
  },

  /* ---- landing about ---- */
  "about.label": { en: "Your Sibu hardware store", bm: "Kedai perkakasan anda di Sibu", zh: "您的诗巫五金店" },
  "about.head.1": { en: "We are Ekoway Hardware, ", bm: "Kami Ekoway Hardware, ", zh: "我们是 Ekoway Hardware，" },
  "about.head.serif": {
    en: "永光五金 — hardware supplies in Sibu.",
    bm: "永光五金 — bekalan perkakasan di Sibu.",
    zh: "永光五金 — 诗巫五金用品。"
  },
  "about.head.2": {
    en: " Power tools to building materials, for DIY and contractors alike.",
    bm: " Alatan kuasa hingga bahan binaan, untuk DIY dan kontraktor.",
    zh: " 从电动工具到建筑材料，为 DIY 爱好者与承包商而备。"
  },
  "about.body": {
    en: "Ekoway Hardware — 永光五金 — operates from Lorong Salim 17 in Sibu. Browse tools, fittings and building supplies for home projects and trade work, or message us on WhatsApp if you need help finding the right item.",
    bm: "Ekoway Hardware — 永光五金 — beroperasi di Lorong Salim 17, Sibu. Lihat alatan, kelengkapan dan bahan binaan untuk projek rumah serta kerja perdagangan, atau WhatsApp kami jika anda perlukan bantuan.",
    zh: "Ekoway Hardware — 永光五金 — 位于诗巫 Lorong Salim 17。这里提供家居工程与专业工作所需的工具、配件和建筑用品；如需选购协助，欢迎 WhatsApp 联系我们。"
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
    en: "Clear information. Practical help. Local pickup.",
    bm: "Maklumat jelas. Bantuan praktikal. Ambil di kedai.",
    zh: "资料清楚。实用协助。门市自取。"
  },
  "why.cap": { en: "Your projects, supplied.", bm: "Projek anda, dibekalkan.", zh: "供应您的每个项目。" },
  "why.1.title": { en: "Useful product details.", bm: "Butiran produk berguna.", zh: "实用产品资料。" },
  "why.1.a": { en: "Product details taken from our stock records", bm: "Butiran produk daripada rekod stok kami", zh: "产品资料来自我们的库存记录" },
  "why.1.b": { en: "Ask our team about the item before buying", bm: "Tanya pasukan kami tentang barangan sebelum membeli", zh: "购买前可向我们的团队查询产品" },
  "why.1.c": { en: "Practical ranges for home and trade work", bm: "Pilihan praktikal untuk kerja rumah dan perdagangan", zh: "适合家居与专业工作的实用选择" },
  "why.1.d": {
    en: "Bosch · DONGCHENG · Nippon Paint · Panasonic",
    bm: "Bosch · DONGCHENG · Nippon Paint · Panasonic",
    zh: "Bosch · DONGCHENG · 立邦漆 · Panasonic"
  },
  "why.1.learn": { en: "See the brands", bm: "Lihat jenama", zh: "查看品牌" },
  "why.2.title": { en: "Fair, honest pricing.", bm: "Harga yang jujur.", zh: "公道诚实的价格。" },
  "why.2.a": { en: "Prices shown clearly in Malaysian Ringgit", bm: "Harga dipaparkan dengan jelas dalam Ringgit Malaysia", zh: "价格以马来西亚令吉清楚显示" },
  "why.2.b": { en: "The checkout total is shown before payment", bm: "Jumlah bayaran dipaparkan sebelum pembayaran", zh: "付款前会显示结账总额" },
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
    en: "Browse online, ask on WhatsApp, or visit our Sibu store.",
    bm: "Lihat dalam talian, tanya di WhatsApp, atau kunjungi kedai kami di Sibu.",
    zh: "可在线浏览、WhatsApp 咨询，或到访诗巫门市。"
  },
  "proof.attr": { en: "— Ekoway Hardware", bm: "— Ekoway Hardware", zh: "— Ekoway Hardware" },
  "proof.fb.k": { en: "On Facebook", bm: "Di Facebook", zh: "Facebook 上" },
  "proof.fb.v": {
    en: "Follow @ekowayhardware",
    bm: "Ikuti @ekowayhardware",
    zh: "关注 @ekowayhardware"
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
  "contact.hours.wk": { en: "Current hours", bm: "Waktu semasa", zh: "当前营业时间" },
  "contact.hours.wkt": { en: "Please call to confirm", bm: "Sila telefon untuk sahkan", zh: "请致电确认" },
  "contact.hours.sun": { en: "Before travelling", bm: "Sebelum datang", zh: "到访之前" },
  "contact.hours.sunt": { en: "Call or WhatsApp us", bm: "Telefon atau WhatsApp kami", zh: "请致电或 WhatsApp" },
  "contact.wa": { en: "WhatsApp us", bm: "WhatsApp kami", zh: "WhatsApp 我们" },
  "contact.call": { en: "Call 084-253883", bm: "Telefon 084-253883", zh: "致电 084-253883" },
  "contact.email": { en: "Email us", bm: "E-mel kami", zh: "电邮我们" },
  "contact.fb": { en: "Facebook", bm: "Facebook", zh: "Facebook" },

  /* ---- landing footer ---- */
  "foot.tag.1": {
    en: "Ekoway Hardware · 永光五金 · Sibu",
    bm: "Ekoway Hardware · 永光五金 · Sibu",
    zh: "Ekoway Hardware · 永光五金 · 诗巫"
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
    en: "Hardware supplies in Sibu — shop online or WhatsApp ",
    bm: "Bekalan perkakasan di Sibu — beli dalam talian atau WhatsApp ",
    zh: "诗巫五金用品 — 在线购买或 WhatsApp "
  },
  "shop.strip.after": { en: ".", bm: ".", zh: "。" },
  "shop.strip.cta": { en: "Open Ops Console", bm: "Buka Konsol Operasi", zh: "打开运营控制台" },
  "shop.eyebrow": {
    en: "Hardware supplies in Sibu",
    bm: "Bekalan perkakasan di Sibu",
    zh: "诗巫五金用品"
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
  "shop.search.action": { en: "Search", bm: "Cari", zh: "搜索" },
  "shop.account": { en: "My Account", bm: "Akaun Saya", zh: "我的账户" },
  "shop.account.short": { en: "Account", bm: "Akaun", zh: "账户" },
  "shop.cart": { en: "Cart", bm: "Troli", zh: "购物车" },
  "shop.dept.all.short": { en: "All departments", bm: "Semua jabatan", zh: "所有部门" },
  "shop.whatsapp": { en: "WhatsApp the store", bm: "WhatsApp kedai", zh: "WhatsApp 联系门店" },
  "shop.nav.admin": { en: "Admin", bm: "Admin", zh: "管理" },
  "shop.nav.home": { en: "Home", bm: "Utama", zh: "首页" },
  "shop.loading": { en: "Loading the Ekoway storefront...", bm: "Memuatkan kedai Ekoway...", zh: "正在加载 Ekoway 商店..." },

  "shop.hero.eyebrow": {
    en: "Order online, collect in Salim",
    bm: "Pesan online, ambil di Salim",
    zh: "在线下单，Salim 门市自取"
  },
  "shop.hero.title": {
    en: "Tools, paint and everyday hardware for pickup in Sibu.",
    bm: "Alatan, cat dan perkakasan harian untuk diambil di Sibu.",
    zh: "工具、油漆与日常五金，可在诗巫门市自取。"
  },
  "shop.hero.body": {
    en: "Browse online — from power tools to building materials — and collect a confirmed order from our Salim store.",
    bm: "Lihat dalam talian — daripada alatan kuasa hingga bahan binaan — dan ambil pesanan yang disahkan di kedai Salim kami.",
    zh: "在线浏览从电动工具到建筑材料的商品，并在 Salim 门市领取已确认的订单。"
  },
  "shop.hero.cta1": { en: "Shop deals", bm: "Lihat tawaran", zh: "查看优惠" },
  "shop.hero.cta2": { en: "Explore services", bm: "Lihat perkhidmatan", zh: "了解服务" },
  "shop.hero.m1.v": { en: "Salim", bm: "Salim", zh: "Salim" },
  "shop.hero.m1.k": {
    en: "pickup location in Sibu",
    bm: "lokasi pengambilan di Sibu",
    zh: "诗巫自取地点"
  },
  "shop.hero.m2.v": { en: "WhatsApp", bm: "WhatsApp", zh: "WhatsApp" },
  "shop.hero.m2.k": { en: "help choosing an item", bm: "bantuan memilih barangan", zh: "协助选择商品" },
  "shop.hero.m3.v": { en: "Live stock", bm: "Stok langsung", zh: "实时库存" },
  "shop.hero.m3.k": { en: "checked again at checkout", bm: "disemak semula semasa pembayaran", zh: "结账时再次检查" },

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
  "shop.purchase.banner": {
    en: "Pickup only at Salim. Add to cart, then WhatsApp the counter to confirm your pickup. Online card payment is not open yet.",
    bm: "Ambilan di Salim sahaja. Tambah ke troli, kemudian WhatsApp kaunter untuk sahkan. Bayaran kad dalam talian belum dibuka.",
    zh: "仅限 Salim 门市自取。加入购物车后请 WhatsApp 门市确认。线上银行卡付款尚未开通。"
  },
  "shop.purchase.askPrice": { en: "WhatsApp the counter", bm: "WhatsApp kaunter", zh: "WhatsApp 门市" },
  "shop.purchase.priceNote": {
    en: "Price as listed. Collect at Lorong Salim 17. Online card payment is not open yet.",
    bm: "Harga seperti dipaparkan. Ambil di Lorong Salim 17. Bayaran kad dalam talian belum dibuka.",
    zh: "价格如图所示。请到 Lorong Salim 17 自取。线上银行卡付款尚未开通。"
  },
  "shop.cartd.buyingPaused": {
    en: "Online card payment is not open yet. Send this pickup list to the counter on WhatsApp.",
    bm: "Bayaran kad dalam talian belum dibuka. Hantar senarai ambilan ini ke kaunter melalui WhatsApp.",
    zh: "线上银行卡付款尚未开通。请通过 WhatsApp 把门市自取清单发给柜台。"
  },
  "shop.cartd.sendWhatsapp": {
    en: "Send pickup list on WhatsApp",
    bm: "Hantar senarai ambilan di WhatsApp",
    zh: "通过 WhatsApp 发送自取清单"
  },

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
  },

  /* ---- shop: sidebar filters ---- */
  "shop.filters.title": { en: "Filters", bm: "Penapis", zh: "筛选" },
  "shop.filters.department": { en: "Department", bm: "Jabatan", zh: "部门" },
  "shop.filters.availability": { en: "Availability", bm: "Ketersediaan", zh: "库存状态" },
  "shop.filters.instock": { en: "In stock", bm: "Ada stok", zh: "有现货" },
  "shop.filters.onsale": { en: "On sale", bm: "Sedang diskaun", zh: "特价商品" },
  "shop.filters.price": { en: "Price", bm: "Harga", zh: "价格" },
  "shop.filters.priceUnder": { en: "Under {n}", bm: "Bawah {n}", zh: "低于 {n}" },
  "shop.filters.priceOver": { en: "{n}+", bm: "{n}+", zh: "{n} 以上" },
  "shop.filters.clearAll": { en: "Clear all", bm: "Kosongkan semua", zh: "清除全部" },
  "shop.filters.toggle": { en: "Filters", bm: "Penapis", zh: "筛选" },
  "shop.filters.close": { en: "Close filters", bm: "Tutup penapis", zh: "关闭筛选" },

  /* ---- shop: toolbar ---- */
  "shop.toolbar.results": { en: "{n} results", bm: "{n} hasil", zh: "{n} 件商品" },
  "shop.toolbar.resultsFiltered": {
    en: "{visible} of {total} results",
    bm: "{visible} daripada {total} hasil",
    zh: "{total} 件中的 {visible} 件"
  },
  "shop.toolbar.sort": { en: "Sort", bm: "Susun", zh: "排序" },
  "shop.toolbar.view.grid": { en: "Grid view", bm: "Paparan grid", zh: "网格视图" },
  "shop.toolbar.view.list": { en: "List view", bm: "Paparan senarai", zh: "列表视图" },

  /* ---- shop: 3a worklist job lens ---- */
  "shop.jobs.workingOn": { en: "Working\non", bm: "Sedang\ndibuat", zh: "正在\n进行" },
  "shop.jobs.resolvesTo": { en: "Resolves to", bm: "Merangkumi", zh: "包含" },
  "shop.jobs.summary": {
    en: "{departments} departments · {products} products",
    bm: "{departments} jabatan · {products} produk",
    zh: "{departments} 个部门 · {products} 件商品"
  },
  "shop.jobs.resultCount": {
    en: "{products} products · {job}",
    bm: "{products} produk · {job}",
    zh: "{products} 件商品 · {job}"
  },
  "shop.jobs.context": { en: "Job context", bm: "Konteks kerja", zh: "项目背景" },
  "shop.jobs.atmosphere": { en: "category atmosphere", bm: "suasana kategori", zh: "品类氛围" },
  "shop.jobs.inspirationDisclosure": {
    en: "Project inspiration — not exact product imagery.",
    bm: "Inspirasi projek — bukan imej produk sebenar.",
    zh: "项目灵感展示，并非准确商品图片。"
  },
  "shop.jobs.departments": { en: "Departments in this job", bm: "Jabatan dalam kerja ini", zh: "此项目包含的部门" },

  /* ---- shop: product card / detail ---- */
  "shop.product.view": { en: "View product", bm: "Lihat produk", zh: "查看商品" },
  "shop.product.viewDetails": { en: "View details", bm: "Lihat butiran", zh: "查看详情" },
  "shop.product.reviews.none": { en: "No reviews yet", bm: "Belum ada ulasan", zh: "暂无评价" },
  "shop.product.stock.in": { en: "In stock", bm: "Ada stok", zh: "现货充足" },
  "shop.product.stock.low": { en: "Low stock", bm: "Stok terhad", zh: "库存紧张" },
  "shop.product.stock.out": { en: "Out of stock", bm: "Stok habis", zh: "缺货" },
  "shop.product.stock.inCount": { en: "In stock — {n} avail.", bm: "Ada stok — baki {n}", zh: "现货——剩 {n} 件" },
  "shop.product.stock.lowCount": { en: "Low stock — {n} left", bm: "Stok terhad — baki {n}", zh: "库存紧张——剩 {n} 件" },
  "shop.product.stock.outSoon": {
    en: "Out of stock — check back soon",
    bm: "Stok habis — sila semak semula",
    zh: "缺货——请稍后查看"
  },

  /* ---- shop: dense listing (Trade Counter) ---- */
  "shop.listing.col.product": { en: "Product", bm: "Produk", zh: "产品" },
  "shop.listing.col.category": { en: "Category", bm: "Kategori", zh: "分类" },
  "shop.listing.col.stock": { en: "Stock", bm: "Stok", zh: "库存" },
  "shop.listing.col.badge": { en: "Badge", bm: "Lencana", zh: "标签" },
  "shop.listing.col.actions": { en: "Actions", bm: "Tindakan", zh: "操作" },
  "shop.listing.noPhoto": {
    en: "Product image is not available yet.",
    bm: "Gambar produk belum tersedia.",
    zh: "商品图片暂未提供。"
  },
  "shop.listing.loading": { en: "Loading products…", bm: "Memuatkan produk…", zh: "正在加载商品…" },
  "shop.listing.empty.title": {
    en: "No products match right now",
    bm: "Tiada produk yang sepadan buat masa ini",
    zh: "暂无符合条件的商品"
  },
  "shop.listing.empty.searchBody": {
    en: 'No products match "{query}." Try a different term, or browse by department below.',
    bm: 'Tiada produk sepadan dengan "{query}." Cuba istilah lain, atau layari mengikut jabatan di bawah.',
    zh: '没有商品与"{query}"匹配。请尝试其他关键词，或在下方按部门浏览。'
  },
  "shop.listing.empty.filterBody": {
    en: "No products match the current filters.",
    bm: "Tiada produk sepadan dengan penapis semasa.",
    zh: "没有商品符合目前的筛选条件。"
  },
  "shop.listing.empty.clearSearch": { en: "Clear search", bm: "Kosongkan carian", zh: "清除搜索" },
  "shop.listing.empty.browseAll": { en: "Browse all departments", bm: "Lihat semua jabatan", zh: "浏览所有部门" },
  "shop.offline.banner": {
    en: "Showing recently saved catalogue data — live prices and stock may be a little out of date.",
    bm: "Memaparkan data katalog yang disimpan baru-baru ini — harga dan stok mungkin sedikit lapuk.",
    zh: "正在显示近期保存的目录数据——实时价格和库存可能略有延迟。"
  },
  "shop.offline.reload": { en: "Reload", bm: "Muat semula", zh: "重新加载" },
  "shop.detail.back": { en: "Back to shop", bm: "Kembali ke kedai", zh: "返回商店" },
  "shop.detail.reviews": { en: "Reviews", bm: "Ulasan", zh: "评价" },
  "shop.detail.writeReview": { en: "Write a review", bm: "Tulis ulasan", zh: "写评价" },
  "shop.detail.rating": { en: "Rating", bm: "Penilaian", zh: "评分" },
  "shop.detail.reviewBody": { en: "Your review", bm: "Ulasan anda", zh: "您的评价" },
  "shop.detail.submit": { en: "Submit review", bm: "Hantar ulasan", zh: "提交评价" },
  "shop.detail.submitting": { en: "Submitting...", bm: "Menghantar...", zh: "提交中..." },
  "shop.detail.alreadyReviewed": {
    en: "You've already reviewed this product.",
    bm: "Anda telah mengulas produk ini.",
    zh: "您已经评价过此商品。"
  },
  "shop.detail.mustPurchase": {
    en: "Only customers who've purchased and received this product can leave a review.",
    bm: "Hanya pelanggan yang telah membeli dan menerima produk ini boleh menulis ulasan.",
    zh: "只有购买并收到此商品的顾客才能撰写评价。"
  },
  "shop.detail.signInToReview": {
    en: "Sign in to your account to write a review.",
    bm: "Log masuk ke akaun anda untuk menulis ulasan.",
    zh: "请登录您的账户以撰写评价。"
  },
  "shop.detail.noReviews": {
    en: "No reviews yet — be the first to share your experience.",
    bm: "Belum ada ulasan — jadilah yang pertama berkongsi pengalaman anda.",
    zh: "暂无评价 — 快来分享您的第一条评价吧。"
  },
  "shop.detail.notFound": { en: "Product not found.", bm: "Produk tidak dijumpai.", zh: "找不到该商品。" },
  "shop.detail.backProducts": { en: "Back to products", bm: "Kembali ke produk", zh: "返回商品" },
  "shop.detail.allDepartment": {
    en: "All {department}",
    bm: "Semua {department}",
    zh: "全部{department}"
  },
  "shop.detail.breadcrumb": { en: "Breadcrumb", bm: "Laluan navigasi", zh: "面包屑导航" },
  "shop.detail.stillWorkingOn": {
    en: "Still working on:",
    bm: "Masih mengusahakan:",
    zh: "仍在进行："
  },
  "shop.detail.productCount": { en: "{n} products", bm: "{n} produk", zh: "{n} 件商品" },
  "shop.detail.purchase": { en: "Purchase", bm: "Pembelian", zh: "购买" },
  "shop.detail.quantity": { en: "Quantity", bm: "Kuantiti", zh: "数量" },
  "shop.detail.decreaseQuantity": {
    en: "Decrease quantity",
    bm: "Kurangkan kuantiti",
    zh: "减少数量"
  },
  "shop.detail.increaseQuantity": {
    en: "Increase quantity",
    bm: "Tambah kuantiti",
    zh: "增加数量"
  },
  "shop.detail.askWhatsapp": {
    en: "Ask about this product on WhatsApp",
    bm: "Tanya tentang produk ini di WhatsApp",
    zh: "通过 WhatsApp 咨询此商品"
  },
  "shop.detail.whatsappMessage": {
    en: "Hello Ekoway, I have a question about {product}.",
    bm: "Hai Ekoway, saya ingin bertanya tentang {product}.",
    zh: "您好 Ekoway，我想咨询 {product}。"
  },
  "shop.detail.savedCatalogue": { en: "SAVED CATALOGUE", bm: "KATALOG DISIMPAN", zh: "已保存目录" },
  "shop.detail.savedCatalogueBody": {
    en: "Showing saved product information because the live catalogue could not be reached. Price and availability may not be current.",
    bm: "Maklumat produk yang disimpan dipaparkan kerana katalog langsung tidak dapat dicapai. Harga dan ketersediaan mungkin bukan yang terkini.",
    zh: "由于无法连接实时目录，正在显示已保存的商品信息。价格和库存状态可能不是最新的。"
  },
  "shop.detail.verifiedInformation": {
    en: "VERIFIED INFORMATION",
    bm: "MAKLUMAT DISAHKAN",
    zh: "已核实信息"
  },
  "shop.detail.department": { en: "Department", bm: "Jabatan", zh: "部门" },
  "shop.detail.price": { en: "Price", bm: "Harga", zh: "价格" },
  "shop.detail.availability": { en: "Availability", bm: "Ketersediaan", zh: "库存状态" },
  "shop.detail.verifiedNote": {
    en: "Only information confirmed by Ekoway is shown.",
    bm: "Hanya maklumat yang disahkan oleh Ekoway dipaparkan.",
    zh: "仅显示经 Ekoway 确认的信息。"
  },
  "shop.detail.moreIn": {
    en: "More in {department}",
    bm: "Lagi dalam {department}",
    zh: "更多{department}商品"
  },
  "shop.detail.departmentProductCount": {
    en: "{n} products in this department",
    bm: "{n} produk dalam jabatan ini",
    zh: "此部门共有 {n} 件商品"
  },
  "shop.detail.notFoundTitle": {
    en: "This product is not available.",
    bm: "Produk ini tidak tersedia.",
    zh: "此商品目前不可用。"
  },
  "shop.detail.notFoundBody": {
    en: "It may have been removed from the catalogue, or the link may be out of date.",
    bm: "Produk ini mungkin telah dikeluarkan daripada katalog, atau pautannya mungkin sudah lapuk.",
    zh: "该商品可能已从目录中移除，或此链接已经失效。"
  },
  "shop.detail.errorTitle": {
    en: "We could not load this product.",
    bm: "Kami tidak dapat memuatkan produk ini.",
    zh: "无法加载此商品。"
  },
  "shop.detail.errorBody": {
    en: "Please return to the catalogue and try again.",
    bm: "Sila kembali ke katalog dan cuba lagi.",
    zh: "请返回商品目录后重试。"
  },
  "shop.detail.retry": { en: "Try again", bm: "Cuba lagi", zh: "重试" },
  "shop.detail.askStore": {
    en: "Ask the store on WhatsApp",
    bm: "Tanya kedai di WhatsApp",
    zh: "通过 WhatsApp 咨询门店"
  },

  /* ---- shop: footer ---- */
  "shop.footer.about": {
    en: "永光五金 · Salim, Sibu, Sarawak. Browse hardware supplies online and collect confirmed orders from our store.",
    bm: "永光五金 · Salim, Sibu, Sarawak. Lihat bekalan perkakasan dalam talian dan ambil pesanan yang disahkan di kedai kami.",
    zh: "永光五金 · 砂拉越诗巫 Salim。在线浏览五金用品，并到门市领取已确认的订单。"
  },
  "shop.footer.shop": { en: "Shop", bm: "Beli-belah", zh: "商店" },
  "shop.footer.services": { en: "Services", bm: "Perkhidmatan", zh: "服务" },
  "shop.footer.contact": { en: "Contact", bm: "Hubungi", zh: "联系我们" },
  "shop.footer.hours": { en: "Call to confirm current hours", bm: "Telefon untuk sahkan waktu semasa", zh: "请致电确认营业时间" },
  "shop.footer.copy": {
    en: "© 2026 Ekoway Hardware Sdn Bhd",
    bm: "© 2026 Ekoway Hardware Sdn Bhd",
    zh: "© 2026 Ekoway Hardware Sdn Bhd"
  },
  "shop.wa.chat": { en: "Chat on WhatsApp", bm: "Sembang di WhatsApp", zh: "WhatsApp 咨询" },

  /* ---- shop: cart and checkout ---- */
  "shop.checkout.promotion": { en: "Promotion", bm: "Promosi", zh: "促销" },
  "shop.checkout.voucherCode": { en: "Voucher code", bm: "Kod baucar", zh: "优惠码" },
  "shop.checkout.fullName": { en: "Full name", bm: "Nama penuh", zh: "姓名" },
  "shop.checkout.email": { en: "Email", bm: "E-mel", zh: "电子邮件" },
  "shop.checkout.fulfillment": { en: "Fulfillment", bm: "Cara terima", zh: "取货方式" },
  "shop.checkout.pickup": { en: "Pickup", bm: "Ambil sendiri", zh: "到店自取" },
  "shop.checkout.delivery": { en: "Delivery", bm: "Penghantaran", zh: "送货" },
  "shop.checkout.deliveryNote": {
    en: "Delivery is available across Sarawak.",
    bm: "Penghantaran tersedia di seluruh Sarawak.",
    zh: "砂拉越全境提供送货服务。"
  },
  "shop.checkout.recipientName": { en: "Recipient name", bm: "Nama penerima", zh: "收件人姓名" },
  "shop.checkout.phone": { en: "Phone", bm: "Telefon", zh: "联系电话" },
  "shop.checkout.address1": { en: "Address line 1", bm: "Alamat baris 1", zh: "地址第一行" },
  "shop.checkout.address2": {
    en: "Address line 2 (optional)",
    bm: "Alamat baris 2 (pilihan)",
    zh: "地址第二行（选填）"
  },
  "shop.checkout.city": { en: "City", bm: "Bandar", zh: "城市" },
  "shop.checkout.state": { en: "State", bm: "Negeri", zh: "州属" },
  "shop.checkout.postalCode": { en: "Postal code", bm: "Poskod", zh: "邮编" },
  "shop.checkout.deliveryService": { en: "Delivery service", bm: "Perkhidmatan penghantaran", zh: "配送方式" },

  /* ---- shop: footer policy links ---- */
  "shop.footer.legal": { en: "Policies", bm: "Polisi", zh: "条款政策" },
  "shop.footer.link.privacy": { en: "Privacy Notice", bm: "Notis Privasi", zh: "隐私声明" },
  "shop.footer.link.terms": { en: "Terms & Conditions", bm: "Terma & Syarat", zh: "条款与细则" },
  "shop.footer.link.returns": { en: "Returns & Refunds", bm: "Pemulangan & Bayaran Balik", zh: "退换与退款" },
  "shop.footer.link.delivery": { en: "Delivery & Collection", bm: "Penghantaran & Ambilan", zh: "配送与自取" },
  "shop.footer.link.contact": { en: "Contact us", bm: "Hubungi kami", zh: "联系我们" },

  /* ---- shop: catalogue paging ---- */
  "shop.listing.loadMore": { en: "Load more products", bm: "Muatkan lagi produk", zh: "加载更多商品" },
  "shop.listing.shownOfTotal": {
    en: "Showing {shown} of {total} products",
    bm: "Memaparkan {shown} daripada {total} produk",
    zh: "已显示 {total} 件中的 {shown} 件"
  }
} as const satisfies Record<string, Entry>;

export type TranslationKey = keyof typeof translations;
