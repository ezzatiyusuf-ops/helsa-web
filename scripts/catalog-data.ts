export type CatalogCategorySeed = {
  name: string; slug: string; description: string; image: string; subs: string[];
};
export type CatalogProductSeed = {
  name: string; slug: string; category: string; price: number; stock: number;
  weights?: number[]; flavors?: string[]; packaging?: string; origin?: string;
  ingredients?: string; storage?: string; image?: string; featured?: boolean;
};

const IMG = {
  nuts: "/images/opt/premium-mixed-nuts.jpg",
  seeds: "/images/opt/golden-raisins.jpg",
  dates: "/images/opt/medjool-dates.jpg",
  honey: "/images/opt/natural-gon-honey.jpg",
  spice: "/images/opt/saffron-negin.jpg",
  tea: "/images/opt/lahijan-black-tea.jpg",
  chocolate: "/images/chocolate-craft.jpg",
  natural: "/images/opt/dried-fruit-mix.jpg",
  tray: "/images/tray-classic.jpg",
  vip: "/images/tray-vip.jpg",
  cakes: "/images/opt/tiramisu-cake.jpg",
  jams: "/images/opt/quince-jam.jpg",
};

export const CATALOG_CATEGORIES: CatalogCategorySeed[] = [
  ["آجیل و خشکبار","nuts-dried-fruits","آجیل‌های مخلوط و خشکبار منتخب هلسا برای پذیرایی و مصرف روزانه",IMG.nuts,["آجیل مخلوط","چهارمغز","آجیل مهمانی","خشکبار"]],
  ["تخمه","seeds","تخمه‌های خام، شور، بوداده و طعم‌دار هلسا",IMG.seeds,["کدو","آفتابگردان","ژاپنی","هندوانه"]],
  ["خرما","dates","خرمای اصیل ایرانی با بسته‌بندی مناسب پذیرایی",IMG.dates,["پیارم","مضافتی","کبکاب","زاهدی","خاصویی","مجول"]],
  ["عسل","honey","عسل‌های منتخب با تمرکز بر مبدأ، طعم و بافت",IMG.honey,["کنار","بهارنارنج","کوهستان"]],
  ["نبات","rock-candy","نبات ساده و زعفرانی برای چای و پذیرایی",IMG.natural,["ساده","زعفرانی","چوبی","شاخه‌ای"]],
  ["زرشک","barberry","زرشک پفکی و دانه‌اناری منتخب",IMG.natural,["پفکی","دانه‌اناری"]],
  ["بادام زمینی","peanuts","بادام زمینی خام، شور و بوداده",IMG.nuts,["خام","شور","بوداده"]],
  ["آبنبات","candy","آبنبات پذیرایی با طعم‌های منتخب",IMG.natural,["ساده","زعفرانی","میوه‌ای","مغزدار"]],
  ["ادویه","spices","ادویه‌های خالص و ترکیبی مناسب آشپزی ایرانی",IMG.spice,["پلویی","خورشتی","مرغ","گوشت","فلفل","دارچین"]],
  ["عرقیات","distillates","عرقیات سنتی با توضیح طعم و شیوه مصرف",IMG.tea,["نعناع","کاسنی","بهارنارنج","گل محمدی","بیدمشک"]],
  ["شکلات","chocolate","شکلات تلخ، شیری، مغزدار و پذیرایی",IMG.chocolate,["تلخ","شیری","مغزدار","دست‌ساز"]],
  ["پک‌های ویژه هلسا","special-packs","پک‌های هدیه و پذیرایی برای مناسبت‌ها",IMG.vip,["هدیه","پذیرایی","صبحانه","نوروز","یلدا","سازمانی"]],
  ["نقل","noghl","نقل ساده، زعفرانی، بیدمشکی و مغزدار",IMG.natural,["ساده","زعفرانی","بیدمشکی","مغزدار"]],
  ["شیره","syrups","شیره خرما، انگور و توت برای صبحانه و آشپزی",IMG.honey,["خرما","انگور","توت"]],
  ["حبوبات","legumes","حبوبات پاک‌شده و بسته‌بندی‌شده هلسا",IMG.natural,["عدس","نخود","لوبیا","لپه","ماش"]],
  ["پنیر","cheese","پنیرهای مناسب صبحانه و سینی پذیرایی",IMG.tray,["پذیرایی","سنتی"]],
  ["زیتون","olives","زیتون سبز، سیاه، بدون هسته و پرورده",IMG.tray,["سبز","سیاه","بدون هسته","پرورده"]],
  ["ترشیجات","pickles","ترشی‌های ایرانی مناسب سفره و سینی مزه",IMG.tray,["مخلوط","لیته","سیر"]],
  ["بیسکویت و کیک ویژه هلسا","biscuits-cakes","بیسکویت، کیک خرمایی و شیرینی خشک پذیرایی",IMG.chocolate,["بیسکویت","کیک خرمایی","شیرینی خشک"]],
  ["ارده","tahini","ارده کنجد با بافت روان و بسته‌بندی شیشه‌ای",IMG.honey,["سنتی","کنجد"]],
  ["حلوا ارده","halva-tahini","حلوا ارده ساده و پسته‌ای برای صبحانه",IMG.nuts,["ساده","پسته‌ای"]],
  ["دمنوش‌های ویژه هلسا","herbal-tea","دمنوش‌های گل، میوه و ترکیبی برای پذیرایی",IMG.tea,["گل محمدی","بهارنارنج","میوه‌ای","ترکیبی"]],
  ["کره بادام زمینی","peanut-butter","کره بادام زمینی ساده، کرانچی و شکلاتی",IMG.nuts,["ساده","کرانچی","شکلاتی"]],
  ["روغن","oils","روغن زیتون و کنجد برای مصرف خوراکی",IMG.natural,["زیتون","کنجد"]],
  ["گل محمدی","rosebuds","غنچه و گل محمدی خشک مناسب چای و تزئین",IMG.tea,["غنچه","گل خشک"]],
  ["قند خرما","date-sugar","قند خرما برای نوشیدنی و پذیرایی",IMG.dates,["قند خرما"]],
  ["شکلات خرما","date-chocolate","شکلات خرمایی ساده، مغزدار، نارگیلی و کنجدی",IMG.chocolate,["ساده","مغزدار","نارگیلی","کنجدی"]],
  ["بار خرما","date-bars","بار خرما و مغزها برای میان‌وعده",IMG.dates,["مغزها","کنجد","شکلات"]],
  ["بار کنجد","sesame-bars","بار کنجد ساده و ترکیبی",IMG.nuts,["خرما","مغزها"]],
  ["کیک و دسر","cakes-desserts","کیک تیرامیسو، چیزکیک، موس و شیرینی‌های تازه هلسا",IMG.cakes,["تیرامیسو","چیزکیک","موس","رولت","براونی","پاناکوتا"]],
  ["مربا","jams","مرباهای سنتی ایرانی با بستهٔ شیشه‌ای هلسا",IMG.jams,["به","هویج","بالنگ","آلبالو","هندونه","گل محمدی"]],
].map(([name,slug,description,image,subs]) => ({ name: name as string, slug: slug as string, description: description as string, image: image as string, subs: subs as string[] }));

function products(category: string, defs: Array<[string,string,number,number,string?]>): CatalogProductSeed[] {
  return defs.map(([name, slug, price, stock, origin]) => ({
    name, slug, category, price, stock, origin: origin ?? "ایران",
    packaging: "بسته‌بندی بهداشتی هلسا", storage: "در جای خشک و خنک، دور از نور مستقیم نگهداری شود",
    image: categoryImage(category), weights: bulkCategories.has(category) ? [250,500,1000] : undefined,
  }));
}
function categoryImage(slug: string) {
  if (["nuts-dried-fruits","peanuts","halva-tahini","peanut-butter","sesame-bars"].includes(slug)) return IMG.nuts;
  if (["seeds"].includes(slug)) return IMG.seeds;
  if (["dates","date-sugar","date-bars"].includes(slug)) return IMG.dates;
  if (["honey","syrups","tahini"].includes(slug)) return IMG.honey;
  if (["spices"].includes(slug)) return IMG.spice;
  if (["distillates","herbal-tea","rosebuds"].includes(slug)) return IMG.tea;
  if (["chocolate","date-chocolate","biscuits-cakes"].includes(slug)) return IMG.chocolate;
  if (["cheese","olives","pickles"].includes(slug)) return IMG.tray;
  if (["special-packs"].includes(slug)) return IMG.vip;
  if (slug === "cakes-desserts") return IMG.cakes;
  if (slug === "jams") return IMG.jams;
  return IMG.natural;
}
const bulkCategories = new Set(["nuts-dried-fruits","seeds","dates","barberry","peanuts","spices","legumes","rosebuds"]);

export const CATALOG_PRODUCTS: CatalogProductSeed[] = [
  ...products("nuts-dried-fruits", [["آجیل مخلوط هلسا","helsa-mixed-nuts",690000,28],["آجیل چهارمغز","four-kernel-nuts",820000,20],["آجیل ویژه هلسا","helsa-signature-nuts",980000,12],["آجیل اقتصادی","everyday-nuts",460000,34],["آجیل مهمانی","party-nuts-collection",890000,18],["آجیل نوروزی","nowruz-nuts",930000,10],["آجیل شب یلدا","yalda-nuts",920000,9],["خشکبار ویژه هلسا","helsa-dried-fruit-selection",580000,22]]),
  ...products("seeds", [["تخمه کدو","pumpkin-seeds",240000,44],["تخمه کدو گوشتی","meaty-pumpkin-seeds",285000,36],["تخمه آفتابگردان","sunflower-seeds",155000,55],["تخمه ژاپنی","japanese-seeds",210000,31],["تخمه هندوانه","watermelon-seeds",195000,26],["تخمه شور","salted-seeds",175000,40],["تخمه بوداده","roasted-seeds",185000,38],["تخمه طعم‌دار ویژه هلسا","helsa-flavored-seeds",225000,24]]).map((p) => p.slug.includes("pumpkin") ? ({...p, flavors:["نمکی","لیمویی","فلفلی","گلپر","دودی"]}) : p.slug.includes("sunflower") ? ({...p,flavors:["نمکی","لیمویی"]}) : p),
  ...products("dates", [["خرما پیارم","piaram-dates",485000,30,"هرمزگان"],["خرما مضافتی","mazafati-dates",320000,42,"بم، کرمان"],["خرما کبکاب","kabkab-dates",265000,35,"بوشهر"],["خرما زاهدی","zahedi-dates",210000,38,"خوزستان"],["خرما خاصویی","khasoei-dates",240000,28,"فارس"],["خرما مجول","medjool-dates",780000,14,"ایران"]]),
  ...products("honey", [["عسل طبیعی","natural-honey",620000,20],["عسل کنار","sidr-honey",760000,15,"جنوب ایران"],["عسل بهارنارنج","orange-blossom-honey",690000,12,"شمال ایران"],["عسل خلیلو","khalilo-honey",710000,10],["عسل کوهستان","mountain-honey",740000,11,"کوهستان‌های ایران"],["عسل ویژه هلسا","helsa-signature-honey",820000,8]]),
  ...products("rock-candy", [["نبات زعفرانی","saffron-rock-candy",195000,35],["نبات ساده","plain-rock-candy",120000,46],["نبات چوبی","stick-rock-candy",160000,30],["نبات شاخه‌ای","branch-rock-candy",145000,28],["نبات ویژه هلسا","helsa-rock-candy",230000,16]]),
  ...products("barberry", [["زرشک پفکی","puffy-barberry",390000,25,"خراسان جنوبی"],["زرشک دانه‌اناری","pomegranate-barberry",320000,29,"خراسان جنوبی"],["زرشک ممتاز هلسا","helsa-premium-barberry",440000,18,"خراسان جنوبی"]]),
  ...products("peanuts", [["بادام زمینی شور","salted-peanuts",185000,44],["بادام زمینی خام","raw-peanuts",165000,40],["بادام زمینی بوداده","roasted-peanuts",180000,36],["بادام زمینی طعم‌دار","flavored-peanuts",210000,24]]),
  ...products("candy", [["آبنبات ساده","plain-candy",95000,52],["آبنبات زعفرانی","saffron-candy",145000,32],["آبنبات میوه‌ای","fruit-candy",135000,36],["آبنبات مغزدار","filled-candy",180000,24],["آبنبات ویژه هلسا","helsa-candy",210000,18]]),
  ...products("spices", [["ادویه مخصوص هلسا","helsa-spice-blend",185000,30],["ادویه پلویی","rice-spice",125000,40],["ادویه خورشتی","stew-spice",125000,40],["ادویه مرغ","chicken-spice",135000,36],["ادویه گوشت","meat-spice",145000,34],["فلفل سیاه","black-pepper",160000,45],["فلفل قرمز","red-pepper",120000,43],["زردچوبه","turmeric",110000,50],["دارچین","cinnamon",175000,38],["گلپر","golpar",130000,29],["سماق","sumac",145000,33],["ادویه ترکیبی هلسا","mixed-spices",195000,22]]),
  ...products("distillates", [["عرق نعناع","mint-distillate",125000,30],["عرق کاسنی","chicory-distillate",120000,24],["عرق بهارنارنج","orange-blossom-distillate",155000,20],["عرق گل محمدی","rose-distillate",165000,18],["عرق بیدمشک","bidmeshk-distillate",165000,26],["عرق شاتره","fumitory-distillate",120000,21],["عرق رازیانه","fennel-distillate",135000,19]]),
  ...products("chocolate", [["شکلات تلخ","dark-chocolate",330000,26],["شکلات شیری","milk-chocolate",310000,24],["شکلات مغزدار","filled-chocolate",390000,18],["شکلات دست‌ساز هلسا","helsa-handmade-chocolate",460000,15],["شکلات ویژه هلسا","helsa-signature-chocolate",520000,10],["شکلات پذیرایی","hospitality-chocolate",420000,20]]),
  ...products("special-packs", [["پک هدیه هلسا","helsa-gift-pack",1250000,10],["پک پذیرایی هلسا","helsa-hospitality-pack",1450000,9],["پک صبحانه هلسا","helsa-breakfast-pack",980000,12],["پک نوروز هلسا","helsa-nowruz-pack",1580000,7],["پک یلدای هلسا","helsa-yalda-pack",1520000,6],["پک سازمانی هلسا","helsa-corporate-pack",1850000,5],["پک ویژه مهمانی","helsa-party-pack",1680000,8]]),
  ...products("noghl", [["نقل ساده","plain-noghl",145000,32],["نقل زعفرانی","saffron-noghl",210000,24],["نقل بیدمشکی","bidmeshk-noghl",185000,27],["نقل مغزدار","filled-noghl",240000,20],["نقل ویژه هلسا","helsa-noghl",275000,15]]),
  ...products("syrups", [["شیره خرما","date-syrup",230000,26],["شیره انگور","grape-syrup",245000,24],["شیره توت","mulberry-syrup",260000,18],["شیره ویژه هلسا","helsa-signature-syrup",290000,14]]),
  ...products("legumes", [["عدس","lentils",160000,48],["نخود","chickpeas",150000,42],["لوبیا قرمز","red-beans",175000,40],["لوبیا چیتی","pinto-beans",185000,38],["لپه","split-peas",170000,44],["ماش","mung-beans",165000,36],["نخودچی","roasted-chickpeas",195000,30]]),
  ...products("cheese", [["پنیر پذیرایی","hospitality-cheese",285000,16],["پنیر سنتی","traditional-cheese",250000,18],["پنیر ویژه هلسا","helsa-cheese",340000,12]]),
  ...products("olives", [["زیتون سبز","green-olives",220000,25],["زیتون سیاه","black-olives",240000,20],["زیتون بدون هسته","pitted-olives",260000,22],["زیتون پرورده","marinated-olives",295000,18],["زیتون ویژه هلسا","helsa-olives",320000,14]]),
  ...products("pickles", [["ترشی مخلوط","mixed-pickles",195000,24],["ترشی لیته","liteh-pickles",185000,22],["ترشی سیر","garlic-pickles",260000,16],["ترشی ویژه هلسا","helsa-pickles",285000,12]]),
  ...products("biscuits-cakes", [["بیسکویت پذیرایی هلسا","helsa-hospitality-biscuits",260000,25],["کیک خرمایی هلسا","helsa-date-cake",320000,18],["کیک خشک هلسا","helsa-dry-cake",280000,20],["بیسکویت خرمایی","date-biscuits",240000,28],["شیرینی خشک ویژه هلسا","helsa-dry-sweets",360000,16]]),
  ...products("tahini", [["ارده سنتی","traditional-tahini",240000,22],["ارده کنجد","sesame-tahini",265000,24],["ارده ویژه هلسا","helsa-tahini",310000,14]]),
  ...products("halva-tahini", [["حلوا ارده ساده","plain-halva-tahini",280000,20],["حلوا ارده پسته‌ای","pistachio-halva-tahini",380000,15],["حلوا ارده ویژه هلسا","helsa-halva-tahini",420000,12]]),
  ...products("herbal-tea", [["دمنوش گل محمدی","rose-herbal-tea",175000,30],["دمنوش بهارنارنج","orange-blossom-tea",185000,26],["دمنوش آرامش","calm-herbal-tea",195000,22],["دمنوش ترکیبی هلسا","helsa-herbal-blend",220000,20],["دمنوش میوه‌ای هلسا","helsa-fruit-tea",230000,18],["دمنوش ویژه پذیرایی","hospitality-herbal-tea",250000,16]]),
  ...products("peanut-butter", [["کره بادام زمینی ساده","plain-peanut-butter",260000,26],["کره بادام زمینی کرانچی","crunchy-peanut-butter",280000,22],["کره بادام زمینی شکلاتی","chocolate-peanut-butter",310000,18],["کره بادام زمینی ویژه هلسا","helsa-peanut-butter",340000,14]]),
  ...products("oils", [["روغن زیتون","olive-oil",420000,20],["روغن کنجد","sesame-oil",460000,18],["روغن زیتون فرابکر","extra-virgin-olive-oil",520000,12],["روغن کنجد ویژه هلسا","helsa-sesame-oil",490000,14]]),
  ...products("rosebuds", [["غنچه گل محمدی","rosebuds",195000,28],["گل محمدی خشک","dried-rose",175000,30],["غنچه گل محمدی ویژه هلسا","helsa-rosebuds",230000,18]]),
  ...products("date-sugar", [["قند خرما","date-sugar",185000,32],["قند خرما ویژه هلسا","helsa-date-sugar",220000,20]]),
  ...products("date-chocolate", [["شکلات خرمایی","date-chocolate",395000,24],["شکلات خرمایی مغزدار","filled-date-chocolate",430000,18],["شکلات خرمایی نارگیلی","coconut-date-chocolate",420000,16],["شکلات خرمایی کنجدی","sesame-date-chocolate",410000,17],["شکلات خرمایی ویژه هلسا","helsa-signature-date-chocolate",480000,12]]),
  ...products("date-bars", [["خرما بار","date-bar",185000,30],["بار خرما و مغزها","date-nut-bar",240000,24],["بار خرما و کنجد","date-sesame-bar",210000,26],["بار خرما و شکلات","date-chocolate-bar",230000,22],["بار خرما ویژه هلسا","helsa-date-bar",270000,18]]),
  ...products("sesame-bars", [["بار کنجد","sesame-bar",170000,30],["بار کنجد و خرما","sesame-date-bar",195000,26],["بار کنجد و مغزها","sesame-nut-bar",230000,22],["بار کنجد ویژه هلسا","helsa-sesame-bar",260000,18]]),
  ...products("cakes-desserts", [
    ["کیک تیرامیسو هلسا","tiramisu-cake",640000,14],
    ["چیزکیک نیویورکی هلسا","new-york-cheesecake",580000,12],
    ["موس شکلات بلژیکی هلسا","belgian-chocolate-mousse",520000,16],
    ["رولت شکلاتی هلسا","chocolate-roulade",460000,15],
    ["براونی فاج هلسا","fudge-brownie",380000,20],
    ["پاناکوتا وانیلی هلسا","vanilla-panna-cotta",340000,18],
  ]).map((p, i) => ({
    ...p,
    weights: [500, 1000, 1500],
    featured: p.slug === "tiramisu-cake",
    image: [
      "/images/opt/tiramisu-cake.jpg",
      "/images/opt/new-york-cheesecake.jpg",
      "/images/opt/belgian-chocolate-mousse.jpg",
      "/images/opt/chocolate-roulade.jpg",
      "/images/opt/fudge-brownie.jpg",
      "/images/opt/vanilla-panna-cotta.jpg",
    ][i],
    packaging: "جعبه کادویی کیک هلسا",
    storage: "در یخچال (۲ تا ۶ درجه) نگهداری شود و تا ۴۸ ساعت مصرف شود",
  })),
  ...products("jams", [
    ["مربای به هلسا","quince-jam",340000,18],
    ["مربای هویج هلسا","carrot-jam",280000,20],
    ["مربای بالنگ هلسا","balang-jam",360000,14],
    ["مربای آلبالو هلسا","sour-cherry-jam",310000,17],
    ["مربای هندونه هلسا","watermelon-rind-jam",290000,15],
    ["مربای گل محمدی هلسا","rose-petal-jam",420000,10],
  ]).map((p, i) => ({
    ...p,
    weights: [250, 500, 1000],
    image: [
      "/images/opt/quince-jam.jpg",
      "/images/opt/carrot-jam.jpg",
      "/images/opt/balang-jam.jpg",
      "/images/opt/sour-cherry-jam.jpg",
      "/images/opt/watermelon-rind-jam.jpg",
      "/images/opt/rose-petal-jam.jpg",
    ][i],
    packaging: "شیشه بهداشتی با درب مهر و موم هلسا",
    storage: "پس از باز شدن در یخچال نگهداری شود",
  })),
];
