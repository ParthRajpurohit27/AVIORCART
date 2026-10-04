/* AVIOR assistant — answers from the site's own products + policy pages (no external AI, free forever) */

interface AvVariant {
  id: number;
  option1?: string;
  available?: boolean;
}

interface AvProduct {
  id: number;
  handle: string;
  title: string;
  description?: string;
  type?: string;
  tags?: string[];
  price: number;
  compare_at_price?: number;
  category_name?: string;
  images: string[];
  variants: AvVariant[];
}

declare const PRODUCTS: AvProduct[] | undefined;
declare function addToCart(product: AvProduct, variantId: number, qty: number, btn?: HTMLElement): void;
declare function thumb(u: string, w: number): string;

(function (): void {
  interface Doc {
    title: string;
    body: string[];
    url: string;
    tf: Map<string, number>;
    titleTokens: Set<string>;
    len: number;
  }

  interface Link {
    label: string;
    href: string;
  }

  interface Reply {
    text: string;
    products?: AvProduct[];
    links?: Link[];
    chips?: string[];
  }

  interface Budget {
    min?: number;
    max?: number;
  }

  const ROOT = location.pathname.indexOf("/products/") !== -1 ? "../" : "";
  const PAGES: ReadonlyArray<{ file: string; label: string }> = [
    { file: "shipping-policy.html", label: "Shipping Policy" },
    { file: "refund-policy.html", label: "Return & Refund Policy" },
    { file: "terms-and-conditions.html", label: "Terms & Conditions" },
    { file: "privacy-policy.html", label: "Privacy Policy" },
    { file: "about.html", label: "About AVIORCART" },
  ];

  const STOP = new Set(
    ("a an the is are was were be to of for in on at and or if it its i me my we our you your can could would should do does did have has had " +
      "this that these those with from as by about what which who when where how why please pls plz tell give show send want need get any some " +
      "hai hain ho hoga hogi kya ka ki ke ko se me mein par pe aur ya bhi to toh ye yeh wo woh mujhe mera meri mere aap tum hum kar karo karna " +
      "kab kaise kaha kahan kitna kitne koi kuch batao bata bataiye dikhao dikha chahiye chahie wala wali wale").split(" "),
  );

  const GENERIC = new Set(
    ("price cost rate rs rupee rupees inr kimat daam under below above over budget product products item items best cheap cheapest sasta " +
      "buy available stock list new latest trending offer offers discount details detail info good quality only just more less than max min " +
      "upto andar tak neeche upar zyada kam sab all").split(" "),
  );

  const SYN: Record<string, string[]> = {
    wapas: ["return", "refund"], vapas: ["return", "refund"], refund: ["return", "money"], return: ["refund", "replace"],
    replace: ["return", "exchange"], replacement: ["return", "exchange"], exchange: ["return", "replace"],
    cancel: ["cancel", "refund", "return"], paisa: ["refund", "payment"], paise: ["refund", "payment"], money: ["refund", "payment"],
    damaged: ["damaged", "return", "refund"], kharab: ["damaged", "return"], toota: ["damaged", "return"], broken: ["damaged", "return"],
    defective: ["damaged", "return"], galat: ["wrong", "return"], wrong: ["return", "damaged"],
    deliver: ["delivery", "shipping", "timeline"], delivery: ["shipping", "timeline", "day"], shipping: ["delivery", "timeline"],
    ship: ["shipping", "delivery"], courier: ["shipping", "delivery"], pahuchega: ["delivery", "timeline"], aayega: ["delivery", "timeline"],
    ayega: ["delivery", "timeline"], din: ["day", "delivery"], days: ["day", "delivery"], time: ["timeline", "delivery"],
    charge: ["charge", "free"], free: ["free", "charge"], pay: ["payment", "payu"], payment: ["payu", "secure"], payu: ["payment", "secure"],
    upi: ["payment", "payu"], card: ["payment", "payu"], cod: ["payment", "cash"], cash: ["payment", "cash"], online: ["payment"],
    track: ["tracking", "awb"], tracking: ["awb"], awb: ["tracking"], privacy: ["data", "personal", "information"],
    data: ["privacy", "personal"], personal: ["privacy", "data"], terms: ["condition"], condition: ["terms"],
    founder: ["parth", "rajpurohit", "owner"], owner: ["parth", "rajpurohit", "founder"], parth: ["founder", "owner"],
    story: ["about", "founder"], genuine: ["genuine", "quality"], original: ["genuine", "quality"], fake: ["genuine", "quality"],
    trusted: ["genuine", "secure"], safe: ["secure", "privacy"], secure: ["safe", "payment"],
  };

  const CLOTH = ["clothing", "fashion", "sarees", "kurtis"];
  const CAT_MAP: Record<string, string[]> = {
    footwear: ["footwear"], shoe: ["footwear"], sneaker: ["footwear"], joota: ["footwear"], jooti: ["footwear"], joote: ["footwear"],
    chappal: ["footwear"], slipper: ["footwear"], sandal: ["footwear"], clothes: CLOTH, clothing: CLOTH, cloth: CLOTH,
    kapde: CLOTH, kapda: CLOTH, fashion: CLOTH, dress: ["clothing", "fashion"], saree: ["sarees"], sari: ["sarees"], kurti: ["kurtis"],
    watch: ["watches"], ghadi: ["watches"], beauty: ["beauty"], makeup: ["beauty"], skincare: ["beauty"],
    jewelry: ["jewelry"], jewellery: ["jewelry"], gehne: ["jewelry"], electronic: ["electronics"], home: ["home"], decor: ["home"],
    kitchen: ["home"], toy: ["toys"], baby: ["baby"], food: ["food"], snack: ["food"],
  };

  const GARMENT = /saree|sari|kurti|shirt|dress|\btop\b|hoodie|sweatshirt|trouser|pant|jogger|shrug|co[\s-]?ord|tracksuit|jacket|jeans|suit|lehenga|dupatta|blouse|kurta/i;

  const HINGLISH = /\b(hai|hain|kya|kab|kaise|kaha|kahan|kitna|kitne|mujhe|mera|meri|mere|nahi|nahin|chahiye|bhej|bata|batao|dikhao|aap|tum|hoga|karna|karo|wapas|vapas|paise|paisa|sasta|andar|aayega|ayega|kaun|kyu|kyun)\b/;

  function norm(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9₹\s]/g, " ").replace(/\s+/g, " ").trim();
  }

  function stem(w: string): string {
    if (w.length > 4 && w.endsWith("ies")) return `${w.slice(0, -3)}y`;
    if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) return w.slice(0, -1);
    return w;
  }

  function tokenize(s: string): string[] {
    return norm(s)
      .split(" ")
      .filter((w) => w.length > 1 && !STOP.has(w))
      .map(stem);
  }

  function rupees(n: number): string {
    return `₹${Math.round(n).toLocaleString("en-IN")}`;
  }

  function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls?: string, text?: string): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  const products = (): AvProduct[] => (typeof PRODUCTS !== "undefined" && Array.isArray(PRODUCTS) ? PRODUCTS : []);

  function contact(): { email: string; phone: string; hours: string; wa: string } {
    const f = (document.getElementById("footer-placeholder") ?? document.body).textContent ?? "";
    const wa = document.querySelector<HTMLAnchorElement>(".whatsapp-float")?.href ?? "https://wa.me/919425619133";
    return {
      email: f.match(/[\w.+-]+@[\w-]+\.[\w.]+/)?.[0] ?? "",
      phone: f.match(/\+91[\s-]?\d[\d\s-]{8,12}\d/)?.[0] ?? "",
      hours: f.match(/Mon\s*[-–]\s*Sat\s*[\d:]+\s*[AP]M\s*[-–]\s*[\d:]+\s*[AP]M/i)?.[0] ?? "",
      wa,
    };
  }

  const FAQ: ReadonlyArray<{ title: string; body: string[]; file: string }> = [
    {
      title: "Offers & discounts",
      body: [
        "FREE delivery on all orders for a limited time, with no minimum order value.",
        "Bank offer: 5% cashback on payments.",
        "Easy return within 10 days.",
      ],
      file: "index.html",
    },
    {
      title: "How to order",
      body: [
        "Open a product, choose your option (size/colour if shown), then tap Add to Cart or Buy Now.",
        "Enter your delivery details at checkout and pay securely via PayU.",
        "You can also place an order on WhatsApp using the Order via WhatsApp button on the product page.",
      ],
      file: "collections.html",
    },
    {
      title: "Payment",
      body: ["Payments are processed securely by PayU — you are redirected to PayU's secure payment page at checkout."],
      file: "checkout.html",
    },
    {
      title: "Genuine products",
      body: ["Every product is handpicked and verified. AVIORCART promises 100% genuine products, Pan India delivery and 10 days easy returns."],
      file: "about.html",
    },
  ];

  let docs: Doc[] = [];
  let avgLen = 1;
  const df = new Map<string, number>();
  let indexReady: Promise<void> | null = null;

  function makeDoc(title: string, body: string[], url: string): Doc {
    const tokens = tokenize(`${title} ${title} ${body.join(" ")}`);
    const tf = new Map<string, number>();
    tokens.forEach((t) => tf.set(t, (tf.get(t) ?? 0) + 1));
    return { title, body, url, tf, titleTokens: new Set(tokenize(title)), len: tokens.length || 1 };
  }

  function parsePage(html: string, file: string, label: string): Doc[] {
    const dom = new DOMParser().parseFromString(html, "text/html");
    const main = dom.querySelector("main") ?? dom.body;
    const out: Doc[] = [];
    let title = label;
    let anchor = "";
    let lines: string[] = [];
    const flush = (): void => {
      if (lines.length) out.push(makeDoc(title === label ? label : `${label}: ${title}`, lines, `${file}${anchor}`));
      lines = [];
    };
    main.querySelectorAll("h1,h2,h3,h4,p,li,.legal-callout").forEach((node) => {
      if (/^H[1-4]$/.test(node.tagName)) {
        flush();
        title = (node.textContent ?? "").replace(/^\s*\d+\.\s*/, "").replace(/\s+/g, " ").trim() || label;
        const id = node.getAttribute("id");
        anchor = id ? `#${id}` : "";
        return;
      }
      if (node.closest(".legal-toc")) return;
      if (node.tagName === "P" && node.closest(".legal-callout")) return;
      const t = (node.textContent ?? "").replace(/\s+/g, " ").trim();
      if (t.length >= 25) lines.push(t);
    });
    flush();
    return out;
  }

  function buildIndex(): Promise<void> {
    if (indexReady) return indexReady;
    indexReady = (async (): Promise<void> => {
      const built: Doc[] = FAQ.map((f) => makeDoc(f.title, [...f.body], f.file));
      const results = await Promise.all(
        PAGES.map(async (p) => {
          try {
            const res = await fetch(`${ROOT}${p.file}`);
            if (!res.ok) return [] as Doc[];
            return parsePage(await res.text(), p.file, p.label);
          } catch {
            return [] as Doc[];
          }
        }),
      );
      results.forEach((r) => built.push(...r));
      docs = built;
      avgLen = docs.reduce((s, d) => s + d.len, 0) / Math.max(1, docs.length);
      docs.forEach((d) => d.tf.forEach((_v, k) => df.set(k, (df.get(k) ?? 0) + 1)));
    })();
    return indexReady;
  }

  function expand(tokens: string[]): string[] {
    const set = new Set<string>(tokens);
    tokens.forEach((t) => (SYN[t] ?? []).forEach((x) => set.add(stem(x))));
    return [...set];
  }

  function scoreDoc(d: Doc, q: string[]): number {
    const N = docs.length;
    let s = 0;
    q.forEach((t) => {
      const f = d.tf.get(t) ?? 0;
      const idf = Math.log(1 + (N - (df.get(t) ?? 0) + 0.5) / ((df.get(t) ?? 0) + 0.5));
      if (f > 0) s += (idf * (f * 2.2)) / (f + 1.2 * (0.25 + (0.75 * d.len) / avgLen));
      if (d.titleTokens.has(t)) s += idf * 1.2;
    });
    return s;
  }

  function pickLines(d: Doc, q: string[]): string[] {
    const scored = d.body.map((line, i) => {
      const toks = new Set(tokenize(line));
      return { line, i, s: q.filter((t) => toks.has(t)).length };
    });
    const best = scored.filter((x) => x.s > 0).sort((a, b) => b.s - a.s || a.i - b.i).slice(0, 3);
    const chosen = (best.length ? best : scored.slice(0, 3)).sort((a, b) => a.i - b.i).map((x) => x.line);
    return chosen.map((l) => (l.length > 260 ? `${l.slice(0, 257)}…` : l));
  }

  function parseBudget(raw: string): Budget {
    const n = (s: string): number => parseInt(s.replace(/,/g, ""), 10);
    const q = raw.toLowerCase();
    let m = q.match(/(?:under|below|less than|upto|up to|within|max|maximum|budget)\s*(?:of\s*)?(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/);
    if (m?.[1]) return { max: n(m[1]) };
    m = q.match(/(\d[\d,]*)\s*(?:rs|₹|rupees?|rupaye)?\s*(?:ke\s*)?(?:andar|tak|se kam|se neeche|ke neeche)\b/);
    if (m?.[1]) return { max: n(m[1]) };
    m = q.match(/(?:above|over|more than|minimum)\s*(?:rs\.?|₹|inr)?\s*(\d[\d,]*)/);
    if (m?.[1]) return { min: n(m[1]) };
    m = q.match(/(\d[\d,]*)\s*(?:rs|₹|rupees?)?\s*(?:se upar|se zyada|se jyada)/);
    if (m?.[1]) return { min: n(m[1]) };
    return {};
  }

  function discount(p: AvProduct): number {
    const c = p.compare_at_price ?? 0;
    return c > p.price ? Math.round(((c - p.price) * 100) / c) : 0;
  }

  function searchProducts(rawQ: string, qTokens: string[], budget: Budget): { list: AvProduct[]; strong: boolean } {
    const all = products().filter((p) => p.price > 0);
    const terms = qTokens.filter((t) => !GENERIC.has(t) && !/^\d+$/.test(t));
    const cats = new Set<string>();
    terms.forEach((t) => (CAT_MAP[t] ?? []).forEach((c) => cats.add(c)));

    let pool = all;
    if (cats.size) pool = pool.filter((p) => [...cats].some((c) => (p.category_name ?? "").toLowerCase().startsWith(c)));
    if (terms.some((t) => ["kapde", "kapda", "clothes", "clothing", "cloth"].indexOf(t) !== -1)) {
      pool = pool.filter((p) => GARMENT.test(`${p.title} ${p.type ?? ""}`) && !/holder|organi[sz]er|keychain|cosmetic/i.test(p.title));
    }

    const hardTerms = terms.filter((t) => !(t in CAT_MAP));
    const scored = pool.map((p) => {
      const title = tokenize(p.title);
      const meta = tokenize(`${p.type ?? ""} ${(p.tags ?? []).join(" ")} ${p.category_name ?? ""}`);
      const desc = new Set(tokenize((p.description ?? "").slice(0, 500)));
      let s = 0;
      let matchedHard = 0;
      terms.forEach((t) => {
        const inTitle = title.some((w) => w === t || w.startsWith(t) || (t.length > 3 && w.includes(t)));
        const inMeta = meta.some((w) => w === t || w.startsWith(t));
        const inDesc = desc.has(t);
        if (inTitle) s += 3;
        else if (inMeta) s += 2;
        else if (inDesc) s += 1;
        if ((inTitle || inMeta || inDesc) && hardTerms.indexOf(t) !== -1) matchedHard++;
      });
      return { p, s, matchedHard };
    });

    let hits = scored;
    if (hardTerms.length) {
      const need = hardTerms.length === 1 ? 1 : Math.ceil(hardTerms.length / 2);
      hits = scored.filter((x) => x.matchedHard >= need && x.s > 0);
    } else if (!cats.size && budget.max === undefined && budget.min === undefined) {
      hits = [];
    }

    let list = hits.sort((a, b) => b.s - a.s || discount(b.p) - discount(a.p)).map((x) => x.p);
    if (budget.max !== undefined) list = list.filter((p) => p.price <= (budget.max as number));
    if (budget.min !== undefined) list = list.filter((p) => p.price >= (budget.min as number));
    if (!hardTerms.length && !cats.size) list = list.sort((a, b) => discount(b) - discount(a) || a.price - b.price);
    if (/\b(sasta|cheap|cheapest|lowest|low price)\b/.test(rawQ.toLowerCase())) list = [...list].sort((a, b) => a.price - b.price);

    const top = hits.length ? Math.max(...hits.map((x) => x.s)) : 0;
    const strong = hardTerms.length > 0 && top >= hardTerms.length * 3 && list.length > 0 && list.length <= 3;
    return { list, strong };
  }

  async function reply(q: string): Promise<Reply> {
    const hi = HINGLISH.test(q.toLowerCase());
    const t = (en: string, hin: string): string => (hi ? hin : en);
    const text = norm(q);
    const c = contact();
    const waLink: Link = { label: "💬 Chat on WhatsApp", href: c.wa };
    const chips = ["Delivery time?", "Return policy", "Track my order", "Products under ₹500", "Contact us"];

    if (!text) return { text: t("Type your question and I'll help.", "Apna sawal likho, main madad karunga."), chips };

    if (/^(hi+|hello+|hey+|hlo+|helo|hola|namaste|namaskar|hii+|good (morning|afternoon|evening))\b/.test(text) && text.split(" ").length <= 4) {
      return {
        text: t(
          "Hi! 👋 I'm AVIOR. Ask me about products, prices, delivery, returns or your order.",
          "Namaste! 👋 Main AVIOR hu. Products, price, delivery, return ya order ke baare me kuch bhi puchho.",
        ),
        chips,
      };
    }
    if (/\b(thank|thanks|thx|shukriya|dhanyavad|dhanyawad)\b/.test(text)) {
      return { text: t("You're welcome! Anything else?", "Koi baat nahi! Aur kuch puchna hai?"), chips: ["Delivery time?", "Return policy"] };
    }

    const awb = q.match(/\b[A-Za-z0-9]{10,20}\b/g)?.find((w) => (w.match(/\d/g) ?? []).length >= 8);
    if (awb && (/track|awb|status|order|parcel|kahan|kaha/i.test(q) || q.trim().length <= awb.length + 2)) {
      return {
        text: t(`Tap below to see live tracking for ${awb}.`, `${awb} ki live tracking neeche se dekho.`),
        links: [{ label: "📦 Track this order", href: `${ROOT}track.html?awb=${encodeURIComponent(awb)}` }],
      };
    }

    if (/\b(contact|call|phone|number|whatsapp|email|mail|support|help desk|agent|human|baat|owner)\b/.test(text) && !/\bpolicy\b/.test(text)) {
      const parts: string[] = [];
      if (c.phone) parts.push(`📞 ${c.phone}`);
      if (c.email) parts.push(`📧 ${c.email}`);
      if (c.hours) parts.push(`🕐 ${c.hours}`);
      return {
        text: parts.length ? parts.join("\n") : t("Reach us on WhatsApp.", "Hume WhatsApp par message karo."),
        links: [waLink, { label: "Contact page", href: `${ROOT}contact.html` }],
      };
    }

    if (/\b(track|tracking|awb|order status|where is my order|kahan hai (mera )?order|order kahan|parcel)\b/.test(text)) {
      return {
        text: t(
          "Enter your AWB number on the Track Order page to see live courier updates. You can also paste the AWB here.",
          "Track Order page par apna AWB number daalo, live courier update dikh jayega. AWB yahin paste bhi kar sakte ho.",
        ),
        links: [{ label: "📦 Track Order", href: `${ROOT}track.html` }],
      };
    }

    const direct = /(how to (order|buy|purchase|place)|order (kaise|kese|karna)|kaise (order|kharid|buy)|buy kaise|kharidna|place an order)/.test(text)
      ? "How to order"
      : /\b(offer|offers|discount|coupon|cashback|deal|sale)\b/.test(text)
        ? "Offers & discounts"
        : "";
    if (direct) {
      await buildIndex();
      const d = docs.find((x) => x.title === direct);
      if (d) {
        return {
          text: `${d.title}\n${d.body.map((l) => `• ${l}`).join("\n")}`,
          links: direct === "How to order" ? [{ label: "🛍️ Browse products", href: `${ROOT}collections.html` }] : undefined,
        };
      }
    }

    const budget = parseBudget(q);
    const timeQ = /\b(kab|how long|how many days|kitne din|when|time)\b/.test(text) ? ["day", "business"] : [];
    const qTokens = expand([...tokenize(q), ...timeQ]);
    const policyWords = /\b(return|refund|replace|exchange|cancel|shipping|delivery|deliver|ship|charge|privacy|terms|condition|payment|pay|payu|damaged|wapas|vapas|policy|tracking|genuine|secure)\b/.test(text);

    await buildIndex();
    const ranked = docs.map((d) => ({ d, s: scoreDoc(d, qTokens) })).sort((a, b) => b.s - a.s);
    const top = ranked[0];
    const productRes = searchProducts(q, tokenize(q), budget);

    const wantsProducts = productRes.list.length > 0 && !policyWords;
    if (wantsProducts) {
      const list = productRes.list.slice(0, 4);
      const intro = productRes.strong
        ? t(`Found it: ${list[0]?.title ?? ""}`, `Ye mila: ${list[0]?.title ?? ""}`).slice(0, 90)
        : t(`Here ${list.length === 1 ? "is a match" : `are ${list.length} matches`}:`, `Ye ${list.length} options mile:`);
      return {
        text: intro,
        products: list,
        links: productRes.list.length > 4 ? [{ label: "See all products", href: `${ROOT}collections.html` }] : undefined,
      };
    }

    if (top && top.s >= 2.2) {
      const d = top.d;
      const lines = pickLines(d, qTokens);
      const links: Link[] = [{ label: `Read full: ${d.title.split(":")[0] ?? d.title}`, href: `${ROOT}${d.url}` }];
      const second = ranked[1];
      if (second && second.s >= top.s * 0.9 && second.d.url.split("#")[0] !== d.url.split("#")[0]) {
        links.push({ label: second.d.title.split(":")[0] ?? second.d.title, href: `${ROOT}${second.d.url}` });
      }
      const head = d.title.includes(": ") ? (d.title.split(": ")[1] ?? d.title) : d.title;
      return { text: `${head}\n${lines.map((l) => `• ${l}`).join("\n")}`, links };
    }

    if (productRes.list.length) {
      return { text: t("Closest matches:", "Sabse milte-julte products:"), products: productRes.list.slice(0, 4) };
    }

    return {
      text: t(
        "I don't have a sure answer for that. Pick a topic below or ask our team directly on WhatsApp.",
        "Iska pakka jawab mere paas nahi hai. Neeche se topic chuno ya seedha WhatsApp par puchho.",
      ),
      chips,
      links: [waLink],
    };
  }

  const CSS = `
.avc-fab{position:fixed;right:16px;bottom:92px;z-index:9997;width:54px;height:54px;border-radius:50%;background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#0a0a0a;display:flex;align-items:center;justify-content:center;box-shadow:0 6px 22px rgba(251,191,36,.45);cursor:pointer;border:0;transition:transform .2s}
.avc-fab:active{transform:scale(.94)}
.avc-fab svg{width:26px;height:26px}
.avc-fab::after{content:'';position:absolute;inset:0;border-radius:50%;border:2px solid rgba(251,191,36,.7);animation:avcRing 2.6s ease-out infinite;pointer-events:none}
@keyframes avcRing{0%{transform:scale(1);opacity:.8}70%,100%{transform:scale(1.5);opacity:0}}
.avc-tip{position:fixed;right:78px;bottom:101px;z-index:9997;background:#0a0a0a;color:#fff;font-size:12px;padding:7px 12px;border-radius:999px;border:1px solid rgba(251,191,36,.5);box-shadow:0 4px 14px rgba(0,0,0,.35);animation:avcTip .4s ease both;pointer-events:none}
@keyframes avcTip{from{opacity:0;transform:translateX(8px)}to{opacity:1;transform:none}}
.avc-panel{position:fixed;right:16px;bottom:92px;z-index:9998;width:370px;max-width:calc(100vw - 24px);height:560px;max-height:calc(100vh - 120px);background:#fff;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.45);display:none;flex-direction:column;overflow:hidden;border:1px solid rgba(251,191,36,.4);font-family:Inter,system-ui,-apple-system,'Segoe UI',Roboto,sans-serif}
.avc-panel.open{display:flex;animation:avcUp .25s ease both}
@keyframes avcUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
.avc-head{background:#0a0a0a;color:#fff;padding:12px 14px;display:flex;align-items:center;gap:10px;border-bottom:2px solid #fbbf24}
.avc-head__star{width:30px;height:30px;color:#fbbf24;flex-shrink:0}
.avc-head__t{flex:1;min-width:0}
.avc-head__t b{display:block;font-size:15px;letter-spacing:.04em}
.avc-head__t span{font-size:11px;color:rgba(255,255,255,.6)}
.avc-x{color:#fff;font-size:20px;line-height:1;padding:6px 8px;background:none;border:0;cursor:pointer;width:auto!important}
.avc-msgs{flex:1;overflow-y:auto;padding:14px;background:#f9fafb;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
.avc-m{max-width:88%;padding:10px 12px;border-radius:14px;font-size:14px;line-height:1.45;white-space:pre-wrap;word-wrap:break-word;animation:avcUp .2s ease both}
.avc-m.bot{align-self:flex-start;background:#fff;color:#111827;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
.avc-m.me{align-self:flex-end;background:#fbbf24;color:#0a0a0a;border-bottom-right-radius:4px;font-weight:500}
.avc-typing{display:flex;gap:4px;padding:12px 14px}
.avc-typing i{width:7px;height:7px;border-radius:50%;background:#9ca3af;animation:avcDot 1s infinite ease-in-out}
.avc-typing i:nth-child(2){animation-delay:.15s}.avc-typing i:nth-child(3){animation-delay:.3s}
@keyframes avcDot{0%,80%,100%{transform:scale(.6);opacity:.5}40%{transform:scale(1);opacity:1}}
.avc-chips{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start;max-width:96%}
.avc-chip{background:#fff;border:1px solid #fbbf24;color:#92400e;border-radius:999px;padding:6px 12px;font-size:12.5px;font-weight:500;cursor:pointer;width:auto!important}
.avc-chip:active{background:#fef3c7}
.avc-links{display:flex;flex-wrap:wrap;gap:6px;align-self:flex-start}
.avc-link{display:inline-block;background:#0a0a0a;color:#fff!important;text-decoration:none;border-radius:8px;padding:8px 12px;font-size:13px;font-weight:600}
.avc-link.wa{background:#25D366}
.avc-cards{display:flex;flex-direction:column;gap:8px;align-self:stretch}
.avc-card{display:flex;gap:10px;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:8px}
.avc-card img{width:64px;height:64px;border-radius:8px;object-fit:cover;background:#f3f4f6;flex-shrink:0}
.avc-card__b{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px}
.avc-card__t{font-size:13px;font-weight:600;color:#111827;text-decoration:none;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.avc-card__p{font-size:13px;display:flex;gap:6px;align-items:baseline;flex-wrap:wrap}
.avc-card__p b{color:#111827}.avc-card__p s{color:#9ca3af;font-size:12px}.avc-card__p em{color:#16a34a;font-style:normal;font-size:12px;font-weight:600}
.avc-card__a{display:flex;gap:6px;margin-top:2px}
.avc-card__a a,.avc-card__a button{font-size:12px;font-weight:600;border-radius:6px;padding:5px 10px;border:1px solid #e5e7eb;background:#fff;color:#111827;text-decoration:none;cursor:pointer;width:auto!important}
.avc-card__a button{background:#fbbf24;border-color:#fbbf24}
.avc-form{display:flex;gap:8px;padding:10px;background:#fff;border-top:1px solid #e5e7eb}
.avc-form input{flex:1;min-width:0;border:1px solid #d1d5db;border-radius:999px;padding:10px 14px;font-size:16px;outline:none}
.avc-form input:focus{border-color:#fbbf24;box-shadow:0 0 0 3px rgba(251,191,36,.25)}
.avc-form button{width:42px!important;height:42px;border-radius:50%;background:#fbbf24;color:#0a0a0a;border:0;display:flex;align-items:center;justify-content:center;cursor:pointer;flex-shrink:0}
.avc-open .whatsapp-float{display:none!important}
@media(max-width:640px){
  .avc-panel{right:0;left:0;bottom:0;width:100%;max-width:100%;height:82vh;height:min(82dvh,640px);border-radius:18px 18px 0 0}
  .avc-fab{right:14px;bottom:90px}
  .avc-tip{right:76px;bottom:99px}
}
`;

  const STAR_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 0C12.8 8 16 11.2 24 12C16 12.8 12.8 16 12 24C11.2 16 8 12.8 0 12C8 11.2 11.2 8 12 0Z"/></svg>';

  function init(): void {
    if (document.querySelector(".avc-fab")) return;
    const style = el("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    const fab = el("button", "avc-fab");
    fab.type = "button";
    fab.setAttribute("aria-label", "Ask AVIOR assistant");
    fab.innerHTML = STAR_SVG;

    const panel = el("div", "avc-panel");
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "AVIOR assistant");

    const head = el("div", "avc-head");
    const hs = el("div", "avc-head__star");
    hs.innerHTML = STAR_SVG;
    const ht = el("div", "avc-head__t");
    ht.append(el("b", undefined, "AVIOR Assistant"), el("span", undefined, "Ask about products, delivery, returns & orders"));
    const close = el("button", "avc-x", "✕");
    close.type = "button";
    close.setAttribute("aria-label", "Close chat");
    head.append(hs, ht, close);

    const msgs = el("div", "avc-msgs");
    msgs.setAttribute("aria-live", "polite");

    const form = el("form", "avc-form");
    const input = el("input");
    input.type = "text";
    input.placeholder = "Type your question…";
    input.setAttribute("aria-label", "Your question");
    input.autocomplete = "off";
    const send = el("button");
    send.type = "submit";
    send.setAttribute("aria-label", "Send");
    send.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>';
    form.append(input, send);

    panel.append(head, msgs, form);
    document.body.append(panel, fab);

    let greeted = false;
    let busy = false;

    function scroll(): void {
      msgs.scrollTop = msgs.scrollHeight;
    }

    function addMsg(text: string, who: "bot" | "me"): void {
      msgs.appendChild(el("div", `avc-m ${who}`, text));
      scroll();
    }

    function addChips(list: string[]): void {
      const box = el("div", "avc-chips");
      list.forEach((label) => {
        const b = el("button", "avc-chip", label);
        b.type = "button";
        b.addEventListener("click", () => {
          box.remove();
          void ask(label);
        });
        box.appendChild(b);
      });
      msgs.appendChild(box);
      scroll();
    }

    function addLinks(list: Link[]): void {
      const box = el("div", "avc-links");
      list.forEach((l) => {
        const isWa = l.href.indexOf("wa.me") !== -1;
        const a = el("a", `avc-link${isWa ? " wa" : ""}`, l.label);
        a.href = l.href;
        if (isWa) {
          a.target = "_blank";
          a.rel = "noopener noreferrer";
        }
        box.appendChild(a);
      });
      msgs.appendChild(box);
      scroll();
    }

    function addProducts(list: AvProduct[]): void {
      const box = el("div", "avc-cards");
      list.forEach((p) => {
        const card = el("div", "avc-card");
        const href = `${ROOT}products/${p.handle}.html`;
        const img = el("img");
        const first = p.images[0] ?? "";
        img.src = typeof thumb === "function" ? thumb(first, 160) : first;
        img.alt = p.title;
        img.loading = "lazy";
        img.decoding = "async";
        img.width = 64;
        img.height = 64;
        const body = el("div", "avc-card__b");
        const title = el("a", "avc-card__t", p.title);
        title.href = href;
        const price = el("div", "avc-card__p");
        price.appendChild(el("b", undefined, rupees(p.price)));
        const off = discount(p);
        if (off > 0) {
          price.appendChild(el("s", undefined, rupees(p.compare_at_price ?? 0)));
          price.appendChild(el("em", undefined, `${off}% off`));
        }
        const actions = el("div", "avc-card__a");
        const view = el("a", undefined, "View");
        view.href = href;
        actions.appendChild(view);
        const firstVariant = p.variants[0];
        if (p.variants.length === 1 && firstVariant && typeof addToCart === "function") {
          const add = el("button", undefined, "+ Add to cart");
          add.type = "button";
          add.addEventListener("click", () => {
            try {
              addToCart(p, firstVariant.id, 1, add);
              add.textContent = "Added ✓";
            } catch {
              view.click();
            }
          });
          actions.appendChild(add);
        }
        body.append(title, price, actions);
        card.append(img, body);
        box.appendChild(card);
      });
      msgs.appendChild(box);
      scroll();
    }

    async function ask(q: string): Promise<void> {
      if (busy) return;
      const text = q.trim();
      if (!text) return;
      busy = true;
      addMsg(text, "me");
      input.value = "";
      const typing = el("div", "avc-m bot avc-typing");
      typing.innerHTML = "<i></i><i></i><i></i>";
      msgs.appendChild(typing);
      scroll();
      let r: Reply;
      try {
        const [res] = await Promise.all([reply(text), new Promise<void>((ok) => window.setTimeout(ok, 450))]);
        r = res;
      } catch {
        r = { text: "Something went wrong. Please try again or message us on WhatsApp.", links: [{ label: "💬 Chat on WhatsApp", href: contact().wa }] };
      }
      typing.remove();
      addMsg(r.text, "bot");
      if (r.products?.length) addProducts(r.products);
      if (r.links?.length) addLinks(r.links);
      if (r.chips?.length) addChips(r.chips);
      busy = false;
      input.focus();
    }

    function open(): void {
      panel.classList.add("open");
      document.body.classList.add("avc-open");
      fab.style.display = window.innerWidth <= 640 ? "none" : "flex";
      document.querySelector(".avc-tip")?.remove();
      if (!greeted) {
        greeted = true;
        addMsg("Hi! 👋 I'm AVIOR. Ask me about products, prices, delivery, returns or your order.", "bot");
        addChips(["Delivery time?", "Return policy", "Track my order", "Products under ₹500", "Contact us"]);
        void buildIndex();
      }
      window.setTimeout(() => input.focus(), 120);
    }

    function shut(): void {
      panel.classList.remove("open");
      document.body.classList.remove("avc-open");
      fab.style.display = "flex";
    }

    fab.addEventListener("click", () => (panel.classList.contains("open") ? shut() : open()));
    close.addEventListener("click", shut);
    document.addEventListener("keydown", (e: KeyboardEvent) => {
      if (e.key === "Escape" && panel.classList.contains("open")) shut();
    });
    form.addEventListener("submit", (e: Event) => {
      e.preventDefault();
      void ask(input.value);
    });

    try {
      if (!sessionStorage.getItem("avc_tip")) {
        sessionStorage.setItem("avc_tip", "1");
        window.setTimeout(() => {
          if (panel.classList.contains("open")) return;
          const tip = el("div", "avc-tip", "Ask AVIOR ✨");
          document.body.appendChild(tip);
          window.setTimeout(() => tip.remove(), 6000);
        }, 3500);
      }
    } catch {
      /* storage unavailable */
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
