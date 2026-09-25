import { escapeHtml, slugify } from "@/utils/document";
import { driveThumbnail } from "./drive";
import {
  BILLING_SUFFIX,
  BODY_FONTS,
  TITLE_FONTS,
  type ProposalData,
  type ProposalPackage,
  type ProposalTemplate,
} from "./model";
import { buildPages, type PortfolioVideo, type ProposalPage } from "./pages";
import { BASE_CSS, TEMPLATE_CSS } from "./styles";

export interface RenderOptions {
  /** Modo prévia dentro do editor: sem barra de navegação, controlado via postMessage. */
  embed?: boolean;
  /** Slide inicial (0-based). */
  start?: number;
}

const MONTHS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Peso de título pretendido por template (limitado ao que a fonte oferece). */
const TEMPLATE_TITLE_WEIGHT: Record<ProposalTemplate, number> = {
  dark: 800,
  light: 500,
  editorial: 500,
  studio: 600,
  bold: 900,
};

const SCHEME_BOLD: Record<ProposalPage["kind"], "a" | "k" | "w"> = {
  cover: "a",
  company: "w",
  structure: "k",
  experience: "a",
  objectives: "k",
  portfolioIntro: "a",
  portfolio: "w",
  investmentSingle: "k",
  package: "k",
  packagesGrid: "w",
  closing: "a",
};

const SECTION_LABEL: Record<ProposalPage["kind"], string> = {
  cover: "",
  company: "Quem somos",
  structure: "Estrutura",
  experience: "Experiência",
  objectives: "Objetivo",
  portfolioIntro: "Portfólio",
  portfolio: "Portfólio",
  investmentSingle: "Investimento",
  package: "Investimento",
  packagesGrid: "Investimento",
  closing: "Contato",
};

const CHECK_SVG =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 8.4l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const PLAY_SVG = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9.5-5.5z" fill="currentColor"/></svg>';

// ——— utilidades ———

function e(value: string | undefined | null) {
  return escapeHtml(value || "");
}

/** Texto com quebras de linha preservadas. */
function nl(value: string | undefined | null) {
  return e(value).replace(/\r?\n/g, "<br>");
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Fator de redução de fonte para textos longos (1 = tamanho cheio). */
function fit(text: string, idealChars: number, min = 0.42) {
  const len = (text || "").trim().length;
  if (len <= idealChars) return 1;
  return Math.max(min, Math.sqrt(idealChars / len));
}

function fitLinear(text: string, idealChars: number, min = 0.35) {
  const len = (text || "").trim().length;
  if (len <= idealChars) return 1;
  return Math.max(min, idealChars / len);
}

function styleVar(name: string, value: number) {
  return value < 1 ? ` style="${name}:${value.toFixed(3)}"` : "";
}

function longDate(iso: string) {
  const [y, m, d] = (iso || "").slice(0, 10).split("-").map(Number);
  if (!y || !m || !d) return "";
  return `${d} de ${MONTHS[m - 1]} de ${y}`;
}

function safeImage(src: string) {
  return /^data:image\/(png|jpe?g|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(src || "") ? src : "";
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = /^#[0-9a-f]{6}$/i.test(hex) ? hex.slice(1) : "F43700";
  return [0, 2, 4].map((i) => parseInt(clean.slice(i, i + 2), 16)) as [number, number, number];
}

function luminance([r, g, b]: [number, number, number]) {
  const ch = (c: number) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
}

function mix(rgb: [number, number, number], target: number, amount: number) {
  const out = rgb.map((c) => Math.round(c + (target - c) * amount));
  return `rgb(${out.join(",")})`;
}

function moneyHtml(value: string) {
  const text = (value || "").trim() || "R$ 0,00";
  const match = text.match(/^R\$\s*(.+)$/);
  return match ? `<small>R$</small>${e(match[1])}` : e(text);
}

/** Fontes com itálico real no Google Fonts (o layout Editorial usa itálico). */
const ITALIC_FONTS = new Set(["Playfair Display", "DM Serif Display", "Lora"]);

function fontHref(title: string, body: string) {
  const families = Array.from(new Set([title, body])).map((name) => {
    const spec = TITLE_FONTS[name] || BODY_FONTS[name];
    const family = name.replace(/ /g, "+");
    const italic = ITALIC_FONTS.has(name);
    if (!spec) return `family=${family}`;
    if (spec.weights.length === 1) return italic ? `family=${family}:ital@0;1` : `family=${family}`;
    if (!italic) return `family=${family}:wght@${spec.weights.join(";")}`;
    const tuples = [...spec.weights.map((w) => `0,${w}`), ...spec.weights.map((w) => `1,${w}`)];
    return `family=${family}:ital,wght@${tuples.join(";")}`;
  });
  return `https://fonts.googleapis.com/css2?${families.join("&")}&display=swap`;
}

function fontStack(name: string, fallback: string) {
  return `'${name}', ${fallback === "serif" ? "Georgia, 'Times New Roman', serif" : "system-ui, -apple-system, 'Segoe UI', Arial, sans-serif"}`;
}

// ——— contexto comum ———

interface Ctx {
  data: ProposalData;
  embed: boolean;
  total: number;
  clientDisplay: string;
  brandSmall: string;
  brandLarge: string;
}

function brand(data: ProposalData, large: boolean) {
  const logo = safeImage(data.company.logo);
  if (logo) return `<img src="${logo}" alt="${e(data.company.name || "Logo")}">`;
  return `<span class="wm">${e(data.company.name || (large ? "Sua empresa" : ""))}</span>`;
}

function frame(ctx: Ctx, page: ProposalPage, index: number, body: string, bodyClass = "") {
  const label = SECTION_LABEL[page.kind];
  return `<div class="frame">
<header class="sh"><span class="sh-brand">${ctx.brandSmall}</span><span class="sh-label"><b>${pad(index + 1)}</b>${e(label)}</span></header>
<div class="body ${bodyClass}">${body}</div>
<footer class="sf"><span>${ctx.clientDisplay ? `Proposta para ${e(ctx.clientDisplay)}` : e(ctx.data.client.title)}</span><span>${pad(index + 1)} / ${pad(ctx.total)}</span></footer>
</div>`;
}

function checks(items: string[]) {
  const list = items.map((item) => item.trim()).filter(Boolean);
  if (!list.length) return "";
  return `<ul class="checks">${list.map((item) => `<li><i class="ck">${CHECK_SVG}</i><span>${e(item)}</span></li>`).join("")}</ul>`;
}

// ——— páginas ———

function coverSlide(ctx: Ctx) {
  const { client, company } = ctx.data;
  const title = client.title.trim() || "Proposta Comercial";
  const endsWithPunct = /[.!?…]$/.test(title);
  const docLine = company.instagram || company.site || String(new Date().getFullYear());
  const forName = client.company.trim() || client.name.trim();
  const attention = client.company.trim() && client.name.trim() ? `A/C ${client.name.trim()}` : "";
  const date = longDate(client.date);
  return `<div class="cv">
<div class="cv-brand">${ctx.brandLarge}</div>
<div class="cv-doc">${e(docLine)}</div>
<div class="cv-main"><h1${styleVar("--fit", fit(title, 20, 0.5))}>${e(title)}${endsWithPunct ? "" : '<span class="dot">.</span>'}</h1></div>
<div class="cv-side">
<div class="cv-for"><span>Preparada para</span><strong>${e(forName || (ctx.embed ? "Nome do cliente" : "—"))}</strong>${attention ? `<em>${e(attention)}</em>` : ""}</div>
<div class="cv-meta">${date ? `<div><span>Data</span><strong>${e(date)}</strong></div>` : ""}${client.validity.trim() ? `<div><span>Validade</span><strong>${e(client.validity)}</strong></div>` : ""}</div>
</div>
</div>`;
}

function companyBody(ctx: Ctx) {
  const { company } = ctx.data;
  const metrics = company.metrics.filter((m) => m.value.trim() || m.label.trim()).slice(0, 6);
  const name = company.name.trim() || (ctx.embed ? "Sua empresa" : "");
  return `<div class="co">
<div class="co-head"><p class="kicker">Quem somos</p><h2 class="h2"${styleVar("--fit", fit(name, 18))}>${e(name)}</h2>${company.tagline.trim() ? `<p class="lead">${nl(company.tagline)}</p>` : ""}</div>
${metrics.length ? `<div class="metrics m-${metrics.length}${metrics.length > 4 ? " many" : ""}">${metrics
    .map((m, i) => `<div class="metric" data-i="M.${pad(i + 1)}"><strong>${e(m.value)}</strong><span>${e(m.label)}</span></div>`)
    .join("")}</div>` : "<div></div>"}
</div>`;
}

function structureBody(ctx: Ctx) {
  const { structure } = ctx.data;
  const images = structure.images.map(safeImage).filter(Boolean).slice(0, 6);
  const cells = images.length
    ? images.map((src, i) => `<div class="ph" data-i="IMG_${pad(i + 1)}"><img src="${src}" alt=""></div>`).join("")
    : '<div class="ph empty"></div><div class="ph empty"></div><div class="ph empty"></div>';
  if (!images.length && !ctx.embed) {
    return `<div class="st solo"><div class="st-head"><p class="kicker">Estrutura</p><h2 class="h-xl"${styleVar("--fit", fit(structure.title, 22))}>${e(structure.title)}</h2></div></div>`;
  }
  return `<div class="st fill">
<div class="st-head"><p class="kicker">Estrutura</p><h2 class="h2"${styleVar("--fit", fit(structure.title, 22))}>${e(structure.title)}</h2>${
    !images.length && ctx.embed ? '<p class="hint">Envie fotos da sua estrutura na etapa 03.</p>' : ""
  }</div>
<div class="gallery g-${images.length || 3}">${cells}</div>
</div>`;
}

function experienceBody(ctx: Ctx) {
  const { experience } = ctx.data;
  return `<div class="ex">
<div class="ex-stat"><div class="ex-num"${styleVar("--fitn", fitLinear(experience.number, 4))}>${e(experience.number)}</div>${
    experience.description.trim() ? `<p class="ex-desc">${e(experience.description)}</p>` : ""
  }</div>
<div class="ex-copy"><p class="kicker">Experiência</p><h2 class="h2"${styleVar("--fit", fit(experience.title, 34))}>${e(experience.title)}</h2>${
    experience.text.trim() ? `<p class="lead">${nl(experience.text)}</p>` : ""
  }</div>
</div>`;
}

function objectivesBody(ctx: Ctx) {
  const { objectives } = ctx.data;
  const items = objectives.items.map((item) => item.trim()).filter(Boolean).slice(0, 12);
  const listClass = items.length <= 3 ? "few" : items.length > 8 ? "many" : "";
  return `<div class="ob">
<div class="ob-head"><p class="kicker">Objetivo</p><h2 class="h2"${styleVar("--fit", fit(objectives.title, 40))}>${e(objectives.title)}</h2></div>
<ol class="ob-list ${listClass}">${items.map((item, i) => `<li><span class="n">${pad(i + 1)}</span><span>${e(item)}</span></li>`).join("")}</ol>
</div>`;
}

function portfolioIntroBody(ctx: Ctx, total: number) {
  const { portfolioIntro } = ctx.data;
  return `<div class="pi">
${portfolioIntro.eyebrow.trim() ? `<p class="kicker">${e(portfolioIntro.eyebrow)}</p>` : ""}
<h2 class="h-xl"${styleVar("--fit", fit(portfolioIntro.title, 22))}>${e(portfolioIntro.title)}</h2>
${portfolioIntro.text.trim() ? `<p class="lead">${nl(portfolioIntro.text)}</p>` : ""}
${total
    ? `<p class="pi-count"><i>${PLAY_SVG}</i>${total} ${total === 1 ? "trabalho" : "trabalhos"} a seguir</p>`
    : ctx.embed
      ? '<p class="hint">Adicione links de vídeos do Google Drive na etapa 06.</p>'
      : ""}
</div>`;
}

function videoCard(video: PortfolioVideo) {
  const thumb = driveThumbnail(video.driveId);
  return `<button type="button" class="video" data-video="${e(video.driveId)}" aria-label="Assistir ${e(video.title || `trabalho ${video.number}`)}">
<div class="thumb"><img class="tb" src="${e(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"><img class="tf" src="${e(thumb)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()"><span class="vnum">${pad(video.number)}</span><span class="play">${PLAY_SVG}</span></div>
<div class="vmeta"><strong>${e(video.title || `Trabalho ${pad(video.number)}`)}</strong>${video.description.trim() ? `<p>${e(video.description)}</p>` : ""}</div>
</button>`;
}

function portfolioBody(ctx: Ctx, page: Extract<ProposalPage, { kind: "portfolio" }>) {
  const first = page.videos[0]?.number || 1;
  const last = page.videos[page.videos.length - 1]?.number || first;
  return `<div class="pf fill">
<div class="pf-head"><h3>${e(ctx.data.portfolioIntro.title)}</h3><span>${pad(first)}${last !== first ? `–${pad(last)}` : ""} de ${pad(page.total)}</span></div>
<div class="videos v-${page.videos.length}">${page.videos.map(videoCard).join("")}</div>
</div>`;
}

function priceBox(label: string, value: string, bill: string, payment: string, note: string) {
  const extra = [
    payment.trim() ? `<p><span>Pagamento</span>${nl(payment)}</p>` : "",
    note.trim() ? `<p><span>Observação</span>${nl(note)}</p>` : "",
  ].join("");
  return `<div class="price"><span class="price-label">${e(label)}</span><strong class="price-value"${styleVar("--fitp", fitLinear(value, 11, 0.55))}>${moneyHtml(value)}</strong>${
    bill ? `<span class="price-bill">${e(bill)}</span>` : ""
  }${extra ? `<div class="price-extra">${extra}</div>` : ""}</div>`;
}

function investmentSingleBody(ctx: Ctx) {
  const { single } = ctx.data.investment;
  return `<div class="inv">
<div class="inv-info"><p class="kicker">Investimento</p><h2 class="h2"${styleVar("--fit", fit(single.name, 24))}>${e(single.name)}</h2>${
    single.description.trim() ? `<p class="lead">${nl(single.description)}</p>` : ""
  }${checks(single.items)}</div>
${priceBox("Investimento", single.value, BILLING_SUFFIX[single.billing] || "", single.payment, single.note)}
</div>`;
}

function packageBody(ctx: Ctx, pkg: ProposalPackage, number: number, total: number) {
  return `<div class="inv">
<div class="inv-info"><p class="kicker">${e(pkg.name || `Plano ${pad(number)}`)} · ${number} de ${total}</p><h2 class="h2"${styleVar("--fit", fit(pkg.title, 24))}>${e(pkg.title)}</h2>${
    pkg.description.trim() ? `<p class="lead">${nl(pkg.description)}</p>` : ""
  }${checks(pkg.items)}</div>
${priceBox("Investimento", pkg.value, "", pkg.payment, pkg.note)}
</div>`;
}

function packagesGridBody(ctx: Ctx, page: Extract<ProposalPage, { kind: "packagesGrid" }>) {
  const cards = page.packages
    .map(
      (pkg) => `<article class="pkg"><span class="pkg-name">${e(pkg.name || `Plano ${pad(pkg.number)}`)}</span><h3>${e(pkg.title)}</h3>${
        pkg.description.trim() ? `<p class="d">${nl(pkg.description)}</p>` : ""
      }${checks(pkg.items)}<div class="pkg-price"><strong>${moneyHtml(pkg.value)}</strong>${pkg.payment.trim() ? `<span>${e(pkg.payment)}</span>` : ""}${
        pkg.note.trim() ? `<p class="note">${e(pkg.note)}</p>` : ""
      }</div></article>`,
    )
    .join("");
  const total = ctx.data.investment.packages.length;
  return `<div class="pk fill">
<div class="pk-head"><div><p class="kicker">Investimento</p><h2 class="h2">Opções de investimento</h2></div><span>${
    page.parts > 1 ? `Parte ${page.part} de ${page.parts} · ` : ""
  }${total} ${total === 1 ? "opção" : "opções"}</span></div>
<div class="pk-grid n-${page.packages.length}">${cards}</div>
</div>`;
}

function closingBody(ctx: Ctx) {
  const { closing, company } = ctx.data;
  const rows: [string, string][] = [
    ["Empresa", closing.company || company.name],
    ["Site", closing.site || company.site],
    ["Contato", closing.contact || company.whatsapp],
    ["Instagram", company.instagram],
  ];
  const seen = new Set<string>();
  const contacts = rows
    .filter(([, value]) => {
      const key = value.trim().toLowerCase();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map(([label, value]) => `<div><span>${e(label)}</span><strong>${e(value)}</strong></div>`)
    .join("");
  const logo = safeImage(company.logo);
  return `<div class="cl">
<div><p class="kicker">Próximo passo</p><h2 class="h-xl"${styleVar("--fit", fit(closing.call, 34, 0.5))}>${e(closing.call)}</h2>${
    logo ? `<div class="cl-brand"><img src="${logo}" alt=""></div>` : ""
  }</div>
${contacts ? `<div class="contacts">${contacts}</div>` : ctx.embed ? '<p class="hint">Preencha os contatos na etapa 08.</p>' : "<div></div>"}
</div>`;
}

function renderSlide(ctx: Ctx, page: ProposalPage, index: number, active: boolean) {
  const cls = `slide k-${page.kind} sch-${SCHEME_BOLD[page.kind]}${active ? " active" : ""}`;
  const deco = '<i class="deco deco-a"></i><i class="deco deco-b"></i>';
  let inner = "";
  switch (page.kind) {
    case "cover":
      inner = coverSlide(ctx);
      break;
    case "company":
      inner = frame(ctx, page, index, companyBody(ctx));
      break;
    case "structure":
      inner = frame(ctx, page, index, structureBody(ctx));
      break;
    case "experience":
      inner = frame(ctx, page, index, experienceBody(ctx));
      break;
    case "objectives":
      inner = frame(ctx, page, index, objectivesBody(ctx));
      break;
    case "portfolioIntro":
      inner = frame(ctx, page, index, portfolioIntroBody(ctx, page.total));
      break;
    case "portfolio":
      inner = frame(ctx, page, index, portfolioBody(ctx, page));
      break;
    case "investmentSingle":
      inner = frame(ctx, page, index, investmentSingleBody(ctx));
      break;
    case "package":
      inner = frame(ctx, page, index, packageBody(ctx, page.pkg, page.number, page.total));
      break;
    case "packagesGrid":
      inner = frame(ctx, page, index, packagesGridBody(ctx, page));
      break;
    case "closing":
      inner = frame(ctx, page, index, closingBody(ctx));
      break;
  }
  return `<section class="${cls}" data-i="${index}">${deco}${inner}</section>`;
}

// ——— script do documento ———

function script(embed: boolean, start: number) {
  return `(function(){
var EMBED=${embed ? "true" : "false"},i=${start};
var slides=[].slice.call(document.querySelectorAll('.slide')),n=slides.length;
var stage=document.getElementById('stage'),deck=document.getElementById('deck');
var cnt=document.getElementById('cnt'),prev=document.getElementById('prev'),next=document.getElementById('next');
var player=document.getElementById('player'),frameEl=player.querySelector('iframe'),openLink=document.getElementById('pl-open');
function pad(v){return (v<10?'0':'')+v}
function fit(){var w=deck.clientWidth,h=deck.clientHeight;var s=Math.min(w/1280,h/720);if(!EMBED)s*=0.96;stage.style.transform='translate(-50%,-50%) scale('+s+')'}
function go(k,silent){i=Math.max(0,Math.min(n-1,k));for(var j=0;j<n;j++){slides[j].classList.toggle('active',j===i)}
if(cnt)cnt.textContent=pad(i+1)+' / '+pad(n);if(prev)prev.disabled=i===0;if(next)next.disabled=i===n-1;
if(EMBED){if(!silent)try{parent.postMessage({type:'noma-proposal-slide',index:i,total:n},'*')}catch(e){}}
else{try{history.replaceState(null,'','#'+(i+1))}catch(e){}}}
function openVideo(id){frameEl.src='https://drive.google.com/file/d/'+encodeURIComponent(id)+'/preview';openLink.href='https://drive.google.com/file/d/'+encodeURIComponent(id)+'/view';player.classList.add('open')}
function closeVideo(){player.classList.remove('open');frameEl.src='about:blank'}
document.addEventListener('click',function(ev){var t=ev.target;var v=t&&t.closest?t.closest('[data-video]'):null;if(v){ev.preventDefault();openVideo(v.getAttribute('data-video'));return}
if(t===player||(t.closest&&t.closest('[data-close]'))){closeVideo()}});
document.addEventListener('keydown',function(ev){if(player.classList.contains('open')){if(ev.key==='Escape')closeVideo();return}
var k=ev.key;if(k==='ArrowRight'||k==='PageDown'||k===' '){ev.preventDefault();go(i+1)}else if(k==='ArrowLeft'||k==='PageUp'){ev.preventDefault();go(i-1)}else if(k==='Home'){go(0)}else if(k==='End'){go(n-1)}});
var tx=null;document.addEventListener('touchstart',function(ev){tx=ev.touches[0].clientX},{passive:true});
document.addEventListener('touchend',function(ev){if(tx===null)return;var dx=ev.changedTouches[0].clientX-tx;if(Math.abs(dx)>50)go(i+(dx<0?1:-1));tx=null});
if(prev)prev.onclick=function(){go(i-1)};if(next)next.onclick=function(){go(i+1)};
var fs=document.getElementById('fs');if(fs)fs.onclick=function(){var d=document.documentElement;if(document.fullscreenElement){document.exitFullscreen()}else if(d.requestFullscreen){d.requestFullscreen()}};
window.addEventListener('message',function(ev){var m=ev.data;if(m&&m.type==='noma-proposal-goto'&&typeof m.index==='number')go(m.index,true)});
window.addEventListener('resize',fit);
if(!EMBED&&location.hash){var h=parseInt(location.hash.slice(1),10);if(h>0)i=h-1}
fit();go(i,false);
requestAnimationFrame(function(){requestAnimationFrame(function(){document.body.classList.remove('noanim')})});
})();`;
}

// ——— documento completo ———

export function renderProposalHtml(data: ProposalData, options: RenderOptions = {}): string {
  const embed = Boolean(options.embed);
  const pages = buildPages(data);
  const start = Math.max(0, Math.min(pages.length - 1, Math.floor(options.start || 0)));
  const clientDisplay = data.client.company.trim() || data.client.name.trim();
  const ctx: Ctx = {
    data,
    embed,
    total: pages.length,
    clientDisplay,
    brandSmall: brand(data, false),
    brandLarge: brand(data, true),
  };

  const template: ProposalTemplate = TEMPLATE_CSS[data.identity.template] ? data.identity.template : "dark";
  const titleFont = TITLE_FONTS[data.identity.titleFont] ? data.identity.titleFont : "Manrope";
  const bodyFont = BODY_FONTS[data.identity.bodyFont] ? data.identity.bodyFont : "Inter";
  const titleSpec = TITLE_FONTS[titleFont];
  const titleWeight = Math.min(TEMPLATE_TITLE_WEIGHT[template], Math.max(...titleSpec.weights));

  const rgb = hexToRgb(data.identity.color);
  const lum = luminance(rgb);
  const accent = `rgb(${rgb.join(",")})`;
  const lightAccent = lum > 0.42;
  const onAccent = lightAccent ? "#111111" : "#FFFFFF";
  const inkLight = lum > 0.4 ? mix(rgb, 0, 0.45) : accent;
  const inkDark = lum < 0.06 ? mix(rgb, 255, 0.5) : accent;

  const vars = `:root{--accent:${accent};--accent-rgb:${rgb.join(",")};--on-accent:${onAccent};--on-accent-muted:${
    lightAccent ? "rgba(17,17,17,.66)" : "rgba(255,255,255,.74)"
  };--on-accent-line:${lightAccent ? "rgba(17,17,17,.2)" : "rgba(255,255,255,.28)"};--on-accent-card:${
    lightAccent ? "rgba(17,17,17,.08)" : "rgba(255,255,255,.13)"
  };--ink-light:${inkLight};--ink-dark:${inkDark};--tf:${fontStack(titleFont, titleSpec.fallback)};--bf:${fontStack(
    bodyFont,
    BODY_FONTS[bodyFont].fallback,
  )};--tw:${titleWeight}}`;

  const pageLight = template === "light" || template === "editorial" || template === "studio";
  const docTitle = clientDisplay ? `${data.client.title || "Proposta"} — ${clientDisplay}` : data.client.title || "Proposta";

  const slides = pages.map((page, index) => renderSlide(ctx, page, index, index === start)).join("\n");

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${e(docTitle)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="${e(fontHref(titleFont, bodyFont))}">
<style>${vars}${BASE_CSS}${TEMPLATE_CSS[template]}</style>
</head>
<body class="tpl-${template} noanim${embed ? " embed" : ""}${pageLight ? " page-light" : ""}">
<div id="deck"><div id="stage">
${slides}
</div></div>
${embed ? "" : `<nav id="nav"><button type="button" id="prev">← Anterior</button><span class="cnt" id="cnt"></span><button type="button" id="next">Próxima →</button><button type="button" class="fs" id="fs" title="Tela cheia">Tela cheia</button></nav>`}
<div id="player" role="dialog" aria-modal="true" aria-label="Vídeo"><div class="pl-box"><div class="pl-bar"><a id="pl-open" href="#" target="_blank" rel="noopener">Abrir no Google Drive ↗</a><button type="button" data-close>Fechar ✕</button></div><iframe title="Vídeo do Google Drive" allow="autoplay; fullscreen" allowfullscreen></iframe></div></div>
<script>${script(embed, start)}</script>
</body>
</html>`;
}

export function proposalFileName(data: ProposalData) {
  return `proposta-${slugify(data.client.company || data.client.name, "cliente")}.html`;
}
