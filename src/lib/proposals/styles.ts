import type { ProposalTemplate } from "./model";

/**
 * CSS da proposta exportada. Tudo em um canvas fixo de 1280×720 que é escalado
 * para caber na janela. As cores vêm de variáveis definidas em render.ts.
 */
export const BASE_CSS = `
*{box-sizing:border-box;margin:0;padding:0}
html,body{height:100%}
body{background:var(--page);font-family:var(--bf);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;overflow:hidden;text-rendering:optimizeLegibility}
#deck{position:fixed;left:0;right:0;top:0;bottom:64px}
body.embed #deck{bottom:0}
#stage{position:absolute;left:50%;top:50%;width:1280px;height:720px;transform:translate(-50%,-50%);transform-origin:center}
body:not(.embed) #stage{box-shadow:0 40px 120px rgba(0,0,0,.35)}
.slide{position:absolute;inset:0;overflow:hidden;background:var(--bg);color:var(--fg);visibility:hidden}
.slide.active{visibility:visible;animation:slidein .5s cubic-bezier(.2,.7,.2,1)}
.noanim .slide.active{animation:none}
@keyframes slidein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
h1,h2,h3{font-family:var(--tf);font-weight:var(--tw);letter-spacing:-.025em;line-height:1.04;text-wrap:balance}
p{text-wrap:pretty}
img{display:block}
.deco{position:absolute;display:none;pointer-events:none}
.frame{position:absolute;inset:0;padding:50px 80px 42px;display:flex;flex-direction:column;z-index:1}
.sh{display:flex;justify-content:space-between;align-items:center;height:30px;font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.sh-label b{color:var(--accent-ink);margin-right:10px;font-weight:700}
.sh-brand img{height:28px;width:auto;max-width:170px;object-fit:contain;object-position:left center}
.wm{font-family:var(--tf);font-weight:700;letter-spacing:-.01em;text-transform:none;color:var(--fg);font-size:17px}
.body{flex:1;min-height:0;display:flex;flex-direction:column;justify-content:center;padding:30px 0}
.body>.fill{flex:1;min-height:0}
.sf{display:flex;justify-content:space-between;align-items:center;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.kicker{display:flex;align-items:center;gap:12px;font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--accent-ink);margin-bottom:22px}
.kicker:before{content:"";width:28px;height:2px;background:currentColor;flex:none}
.h2{font-size:calc(56px * var(--fit,1))}
.h-xl{font-size:calc(84px * var(--fit,1));line-height:1}
.lead{font-size:20px;line-height:1.6;color:var(--muted);max-width:580px;margin-top:22px}
.hint{font-size:14px;color:var(--muted);border:1px dashed var(--line);border-radius:12px;padding:14px 18px;margin-top:22px;display:inline-block}
.ck{flex:none;display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;background:var(--accent);color:var(--on-accent);margin-top:1px}
.ck svg{width:12px;height:12px}
.checks{list-style:none;margin-top:28px;display:grid;gap:13px}
.checks li{display:flex;gap:14px;align-items:flex-start;font-size:18px;line-height:1.4}

/* Capa */
.cv{position:absolute;inset:0;z-index:1;display:grid;padding:60px 80px 54px;grid-template-columns:1fr auto;grid-template-rows:auto 1fr auto;grid-template-areas:"brand doc" "main main" "side side"}
.cv-brand{grid-area:brand;align-self:center}
.cv-brand img{height:46px;width:auto;max-width:260px;object-fit:contain;object-position:left center}
.cv-brand .wm{font-size:24px}
.cv-doc{grid-area:doc;align-self:center;font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.cv-main{grid-area:main;align-self:center}
.cv-main h1{font-size:calc(108px * var(--fit,1));line-height:.96;letter-spacing:-.04em;max-width:1040px}
.cv-main h1 .dot{color:var(--accent)}
.cv-side{grid-area:side;display:flex;justify-content:space-between;align-items:flex-end;gap:40px;border-top:1px solid var(--line);padding-top:26px}
.cv-for span,.cv-meta span{display:block;font-size:11px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted);margin-bottom:8px}
.cv-for strong{display:block;font-family:var(--tf);font-weight:var(--tw);font-size:30px;letter-spacing:-.02em;line-height:1.1}
.cv-for em{display:block;font-style:normal;color:var(--muted);font-size:15px;margin-top:6px}
.cv-meta{display:flex;gap:56px}
.cv-meta strong{display:block;font-size:17px;font-weight:600}

/* Sua empresa */
.co{display:grid;grid-template-columns:1.05fr 1fr;gap:80px;align-items:center}
.metrics{display:grid;gap:16px}
.metrics.m-3,.metrics.m-4,.metrics.m-5,.metrics.m-6{grid-template-columns:1fr 1fr}
.metrics.m-3 .metric:first-child,.metrics.m-5 .metric:first-child{grid-column:span 2}
.metric{padding:28px 32px;border:1px solid var(--line);border-radius:18px;background:var(--card)}
.metric strong{display:block;font-family:var(--tf);font-weight:var(--tw);font-size:54px;letter-spacing:-.035em;line-height:1;color:var(--accent-ink)}
.metric span{display:block;margin-top:10px;font-size:16px;line-height:1.4;color:var(--muted)}
.metrics.many .metric{padding:20px 24px}
.metrics.many .metric strong{font-size:38px}

/* Estrutura */
.st{display:grid;grid-template-columns:300px 1fr;gap:56px;height:100%}
.st-head{align-self:end}
.st.solo{grid-template-columns:1fr;align-content:center}
.st.solo .st-head{align-self:center;max-width:760px}
.gallery{display:grid;gap:12px;height:100%;min-height:0}
.ph{position:relative;overflow:hidden;border-radius:14px;background:var(--card);min-height:0}
.ph img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.ph.empty{background:repeating-linear-gradient(135deg,var(--card) 0 14px,transparent 14px 28px);border:1px dashed var(--line)}
.g-1{grid-template-columns:1fr}
.g-2{grid-template-columns:1fr 1fr}
.g-3{grid-template-columns:1.6fr 1fr;grid-template-rows:1fr 1fr}.g-3 .ph:first-child{grid-row:span 2}
.g-4{grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr}
.g-5{grid-template-columns:1.6fr 1fr 1fr;grid-template-rows:1fr 1fr}.g-5 .ph:first-child{grid-row:span 2}
.g-6{grid-template-columns:repeat(3,1fr);grid-template-rows:1fr 1fr}

/* Experiência */
.ex{display:grid;grid-template-columns:auto 1fr;gap:88px;align-items:center}
.ex-num{font-family:var(--tf);font-weight:var(--tw);font-size:calc(240px * var(--fitn,1));line-height:.85;letter-spacing:-.06em;color:var(--accent-ink);white-space:nowrap}
.ex-desc{font-size:24px;font-weight:500;margin-top:18px;max-width:360px}
.ex-copy{max-width:580px}

/* Objetivo */
.ob{display:grid;grid-template-columns:.9fr 1.1fr;gap:72px;align-items:center}
.ob-list{list-style:none;display:grid;grid-template-columns:1fr 1fr;gap:0 36px}
.ob-list.few{grid-template-columns:1fr}
.ob-list li{display:flex;gap:16px;align-items:baseline;padding:20px 0;border-top:1px solid var(--line);font-size:19px;line-height:1.35}
.ob-list.many li{padding:13px 0;font-size:16px}
.ob-list .n{flex:none;font-family:var(--tf);font-size:13px;font-weight:700;letter-spacing:.08em;color:var(--accent-ink)}

/* Portfólio */
.pi{max-width:920px}
.pi .lead{font-size:22px}
.pi-count{margin-top:44px;display:inline-flex;align-items:center;gap:14px;font-size:13px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted)}
.pi-count i{display:inline-flex;align-items:center;justify-content:center;width:44px;height:44px;border-radius:50%;background:var(--accent);color:var(--on-accent)}
.pi-count svg,.play svg{width:16px;height:16px;margin-left:2px}
.pf{display:flex;flex-direction:column;height:100%}
.pf-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:26px;gap:24px}
.pf-head h3{font-size:32px}
.pf-head span{font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.videos{flex:1;min-height:0;display:grid;gap:22px;grid-auto-rows:minmax(0,1fr)}
.v-1{grid-template-columns:minmax(0,720px);justify-content:center}
.v-2{grid-template-columns:1fr 1fr}
.v-3{grid-template-columns:repeat(3,1fr)}
.video{appearance:none;border:0;background:none;color:inherit;font:inherit;text-align:left;cursor:pointer;display:flex;flex-direction:column;min-height:0;padding:0}
.thumb{position:relative;flex:1;min-height:0;border-radius:14px;overflow:hidden;background:var(--card)}
.thumb:after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,rgba(0,0,0,.35))}
.thumb img{position:absolute;inset:0;width:100%;height:100%}
.thumb .tb{object-fit:cover;filter:blur(22px) saturate(1.2);transform:scale(1.25);opacity:.7}
.thumb .tf{object-fit:contain;transition:transform .5s ease}
.video:hover .tf{transform:scale(1.03)}
.play{position:absolute;z-index:2;left:50%;top:50%;width:62px;height:62px;margin:-31px 0 0 -31px;border-radius:50%;background:var(--accent);color:var(--on-accent);display:flex;align-items:center;justify-content:center;box-shadow:0 12px 34px rgba(0,0,0,.3);transition:transform .25s}
.video:hover .play{transform:scale(1.08)}
.vnum{position:absolute;z-index:2;left:14px;top:12px;font-size:11px;font-weight:700;letter-spacing:.12em;color:#fff;background:rgba(0,0,0,.5);padding:5px 9px;border-radius:99px}
.vmeta{flex:none;padding-top:16px}
.vmeta strong{display:block;font-family:var(--tf);font-weight:var(--tw);font-size:19px;letter-spacing:-.01em;line-height:1.25}
.vmeta p{margin-top:6px;font-size:14px;line-height:1.5;color:var(--muted);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}

/* Investimento */
.inv{display:grid;grid-template-columns:1.1fr .9fr;gap:64px;align-items:center}
.price{background:var(--card);border:1px solid var(--line);border-radius:24px;padding:44px}
.price-label{display:block;font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;color:var(--muted)}
.price-value{display:block;font-family:var(--tf);font-weight:var(--tw);font-size:calc(66px * var(--fitp,1));letter-spacing:-.035em;line-height:1;margin:18px 0 10px;white-space:nowrap}
.price-value small{font-size:.42em;letter-spacing:0;margin-right:8px;vertical-align:.95em;opacity:.75}
.price-bill{font-size:16px;font-weight:600;color:var(--accent-ink)}
.price-extra{margin-top:28px;padding-top:24px;border-top:1px solid var(--line);display:grid;gap:16px;font-size:15px;line-height:1.5}
.price-extra span{display:block;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:4px}
.pk{display:flex;flex-direction:column;height:100%}
.pk-head{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:26px;gap:24px}
.pk-head .kicker{margin-bottom:14px}
.pk-head .h2{font-size:42px}
.pk-head>span{font-size:12px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);white-space:nowrap}
.pk-grid{flex:1;min-height:0;display:grid;gap:20px}
.pk-grid.n-1{grid-template-columns:minmax(0,560px)}
.pk-grid.n-2{grid-template-columns:1fr 1fr}
.pk-grid.n-3{grid-template-columns:repeat(3,1fr)}
.pkg{display:flex;flex-direction:column;min-height:0;overflow:hidden;background:var(--card);border:1px solid var(--line);border-radius:20px;padding:30px}
.pkg-name{font-size:12px;font-weight:700;letter-spacing:.16em;text-transform:uppercase;color:var(--accent-ink)}
.pkg h3{font-size:30px;margin-top:10px}
.pkg .d{font-size:15px;line-height:1.5;color:var(--muted);margin-top:8px}
.pkg .checks{margin-top:18px;gap:9px}
.pkg .checks li{font-size:15px}
.pkg .ck{width:18px;height:18px}
.pkg .ck svg{width:10px;height:10px}
.pkg-price{margin-top:auto;padding-top:20px;border-top:1px solid var(--line)}
.pkg .checks+.pkg-price,.pkg .d+.pkg-price{margin-top:auto}
.pkg-price strong{display:block;font-family:var(--tf);font-weight:var(--tw);font-size:32px;letter-spacing:-.03em;white-space:nowrap}
.pkg-price strong small{font-size:.5em;margin-right:6px;opacity:.7;letter-spacing:0}
.pkg-price span{display:block;font-size:13px;color:var(--muted);margin-top:6px}
.pkg .note{font-size:12px;line-height:1.45;color:var(--muted);margin-top:8px}

/* Fechamento */
.cl{display:grid;grid-template-columns:1.35fr .65fr;gap:72px;align-items:end}
.contacts{display:grid;gap:20px;border-left:1px solid var(--line);padding-left:36px}
.contacts span{display:block;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:var(--muted);margin-bottom:5px}
.contacts strong{display:block;font-size:18px;font-weight:600;word-break:break-word}
.cl-brand{margin-top:48px}
.cl-brand img{height:40px;width:auto;max-width:220px;object-fit:contain;object-position:left center}

/* Player do Google Drive */
#player{position:fixed;inset:0;z-index:50;display:none;align-items:center;justify-content:center;padding:56px 4vw 4vh;background:rgba(0,0,0,.88);backdrop-filter:blur(6px)}
#player.open{display:flex}
.pl-box{position:relative;width:min(100%,calc((100vh - 110px) * 16 / 9));aspect-ratio:16/9}
.pl-box iframe{width:100%;height:100%;border:0;border-radius:12px;background:#000}
.pl-bar{position:absolute;left:0;right:0;top:-44px;display:flex;justify-content:space-between;align-items:center;font:600 13px/1 var(--bf);color:#fff}
.pl-bar a{color:rgba(255,255,255,.7);text-decoration:none}
.pl-bar a:hover{color:#fff}
.pl-bar button{appearance:none;border:0;background:rgba(255,255,255,.12);color:#fff;font:inherit;padding:9px 14px;border-radius:99px;cursor:pointer}
.pl-bar button:hover{background:rgba(255,255,255,.22)}

/* Navegação do arquivo exportado */
#nav{position:fixed;left:0;right:0;bottom:0;height:64px;display:flex;align-items:center;justify-content:center;gap:18px;font:600 13px/1 var(--bf);color:rgba(255,255,255,.85)}
#nav button{appearance:none;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;font:inherit;padding:10px 16px;border-radius:99px;cursor:pointer;transition:background .2s}
#nav button:hover:not(:disabled){background:rgba(255,255,255,.16)}
#nav button:disabled{opacity:.35;cursor:default}
#nav .cnt{min-width:72px;text-align:center;letter-spacing:.12em;font-variant-numeric:tabular-nums}
#nav .fs{position:absolute;right:20px}
@media (max-width:640px){#nav .fs{display:none}#nav{gap:10px}}
body.page-light #nav{color:rgba(0,0,0,.75)}
body.page-light #nav button{border-color:rgba(0,0,0,.14);background:rgba(255,255,255,.6)}
body.page-light #nav button:hover:not(:disabled){background:#fff}

@media print{
  @page{size:1280px 720px;margin:0}
  html,body{height:auto;overflow:visible;background:none}
  #nav,#player{display:none!important}
  #deck{position:static}
  #stage{position:static;transform:none!important;width:1280px;height:auto;box-shadow:none!important}
  .slide{position:relative;width:1280px;height:720px;opacity:1;visibility:visible;page-break-after:always;break-after:page}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact}
}
`;

export const TEMPLATE_CSS: Record<ProposalTemplate, string> = {
  dark: `
.tpl-dark{--page:#030303;--bg:#0A0A0B;--fg:#F5F3EF;--muted:rgba(245,243,239,.56);--line:rgba(255,255,255,.1);--card:rgba(255,255,255,.035);--accent-ink:var(--ink-dark)}
.tpl-dark .slide{background:radial-gradient(900px 600px at 105% -10%,rgba(var(--accent-rgb),.13),transparent 60%),var(--bg)}
.tpl-dark .k-cover{background:#070708}
.tpl-dark .k-cover .deco-a{display:block;right:-260px;bottom:-420px;width:1000px;height:1000px;border-radius:50%;background:radial-gradient(circle,rgba(var(--accent-rgb),.85) 0%,rgba(var(--accent-rgb),.25) 35%,transparent 65%);filter:blur(10px)}
.tpl-dark .k-cover .deco-b{display:block;right:-140px;top:-200px;width:640px;height:640px;border-radius:50%;border:1px solid rgba(255,255,255,.08);box-shadow:0 0 0 90px rgba(255,255,255,.012),0 0 0 180px rgba(255,255,255,.01)}
.tpl-dark .k-closing .deco-a,.tpl-dark .k-portfolioIntro .deco-a{display:block;left:-300px;bottom:-460px;width:980px;height:980px;border-radius:50%;background:radial-gradient(circle,rgba(var(--accent-rgb),.55),transparent 62%)}
.tpl-dark .k-portfolioIntro .deco-b{display:block;right:110px;top:50%;width:360px;height:360px;margin-top:-180px;border-radius:50%;border:1px solid rgba(255,255,255,.1);box-shadow:inset 0 0 0 40px rgba(255,255,255,.015),0 0 0 50px rgba(255,255,255,.02)}
.tpl-dark .metric{background:linear-gradient(180deg,rgba(255,255,255,.055),rgba(255,255,255,.012))}
.tpl-dark .metric strong{color:var(--fg)}
.tpl-dark .metric:first-child strong{color:var(--accent-ink)}
.tpl-dark .ex-num{background:linear-gradient(180deg,var(--accent-ink) 20%,rgba(var(--accent-rgb),.25));-webkit-background-clip:text;background-clip:text;color:transparent;padding-bottom:10px}
.tpl-dark .price{background:linear-gradient(155deg,rgba(var(--accent-rgb),.26),rgba(255,255,255,.03) 58%);border-color:rgba(var(--accent-rgb),.4);box-shadow:0 30px 80px rgba(0,0,0,.45)}
.tpl-dark .pkg{background:linear-gradient(180deg,rgba(255,255,255,.05),rgba(255,255,255,.015))}
.tpl-dark .pkg:first-child{border-color:rgba(var(--accent-rgb),.45);background:linear-gradient(160deg,rgba(var(--accent-rgb),.18),rgba(255,255,255,.02) 60%)}
.tpl-dark .thumb{box-shadow:0 20px 50px rgba(0,0,0,.5)}
`,
  light: `
.tpl-light{--page:#E7E5E0;--bg:#FBFAF8;--fg:#141416;--muted:#77777D;--line:rgba(20,20,22,.09);--card:#F3F2EE;--accent-ink:var(--ink-light)}
body.tpl-light{}
.tpl-light h1,.tpl-light h2,.tpl-light h3{letter-spacing:-.03em}
.tpl-light .frame{padding:62px 100px 50px}
.tpl-light .sh,.tpl-light .sf{font-weight:500;letter-spacing:.2em}
.tpl-light .kicker{color:var(--muted);font-weight:500;letter-spacing:.22em;font-size:12px}
.tpl-light .kicker:before{width:7px;height:7px;border-radius:50%;background:var(--accent)}
.tpl-light .h2{font-size:calc(50px * var(--fit,1))}
.tpl-light .h-xl{font-size:calc(74px * var(--fit,1))}
.tpl-light .lead{font-size:19px}
.tpl-light .cv{padding:72px 100px 70px;grid-template-columns:1fr 1fr;grid-template-rows:auto 1fr auto;grid-template-areas:"brand side" ". side" "main main"}
.tpl-light .cv-doc{display:none}
.tpl-light .cv-side{flex-direction:column;align-items:flex-end;justify-content:flex-start;text-align:right;border:0;padding:0;gap:30px}
.tpl-light .cv-meta{flex-direction:column;gap:22px}
.tpl-light .cv-for strong{font-size:24px}
.tpl-light .cv-main{align-self:end}
.tpl-light .cv-main:before{content:"";display:block;width:56px;height:3px;background:var(--accent);margin-bottom:40px}
.tpl-light .cv-main h1{font-size:calc(96px * var(--fit,1));letter-spacing:-.045em}
.tpl-light .cv-main h1 .dot{display:none}
.tpl-light .co{grid-template-columns:1fr;gap:64px}
.tpl-light .metrics,.tpl-light .metrics.m-3,.tpl-light .metrics.m-4,.tpl-light .metrics.m-5,.tpl-light .metrics.m-6{grid-template-columns:none;grid-auto-flow:column;grid-auto-columns:1fr;gap:0}
.tpl-light .metrics .metric,.tpl-light .metrics.m-3 .metric:first-child,.tpl-light .metrics.m-5 .metric:first-child{grid-column:auto;background:none;border:0;border-left:1px solid var(--line);border-radius:0;padding:4px 32px}
.tpl-light .metric:first-child{border-left:0!important;padding-left:0!important}
.tpl-light .metric strong{color:var(--fg);font-size:60px;letter-spacing:-.045em}
.tpl-light .metrics.many .metric strong{font-size:38px}
.tpl-light .st{grid-template-columns:1fr;grid-template-rows:auto minmax(0,1fr);gap:30px}
.tpl-light .st-head{align-self:start}
.tpl-light .st-head .kicker{margin-bottom:14px}
.tpl-light .gallery{gap:10px}
.tpl-light .ph,.tpl-light .thumb{border-radius:4px}
.tpl-light .ex-num{color:var(--fg);letter-spacing:-.07em}
.tpl-light .ex-desc{color:var(--accent-ink)}
.tpl-light .ob-list li{font-size:18px}
.tpl-light .price,.tpl-light .pkg{background:#fff;border-radius:8px;box-shadow:0 1px 0 rgba(0,0,0,.02),0 24px 60px -30px rgba(0,0,0,.18)}
.tpl-light .price{border-top:3px solid var(--accent)}
.tpl-light .pkg{padding:28px}
.tpl-light .ck{background:none;color:var(--accent-ink);border:1.5px solid currentColor}
.tpl-light .play{width:56px;height:56px;margin:-28px 0 0 -28px;background:rgba(255,255,255,.92);color:#111}
.tpl-light .pi-count i{background:none;border:1.5px solid var(--accent);color:var(--accent-ink)}
.tpl-light .k-closing .h-xl{max-width:760px}
.tpl-light .contacts{border-left:0;padding-left:0}
`,
  editorial: `
.tpl-editorial{--page:#D6CDBE;--bg:#F1EBE0;--fg:#1D1B17;--muted:#71685B;--line:rgba(29,27,23,.2);--card:#E7DFD1;--accent-ink:var(--ink-light)}
.tpl-editorial .slide{background:var(--bg)}
.tpl-editorial .frame{padding:50px 76px 42px 220px}
.tpl-editorial .sh{position:absolute;left:72px;top:50px;bottom:42px;width:110px;height:auto;flex-direction:column;align-items:flex-start;justify-content:space-between;border-right:1px solid var(--line)}
.tpl-editorial .sh-label{writing-mode:vertical-rl;transform:rotate(180deg);font-family:var(--tf);font-style:italic;text-transform:none;letter-spacing:.01em;font-size:22px;font-weight:400;color:var(--fg)}
.tpl-editorial .sh-label b{font-style:normal;margin:0 0 14px 0}
.tpl-editorial .sh-brand img{height:24px;max-width:96px}
.tpl-editorial .sh-brand .wm{font-size:14px}
.tpl-editorial .sf{border-top:1px solid var(--fg);padding-top:12px}
.tpl-editorial .kicker{font-family:var(--tf);font-style:italic;text-transform:none;letter-spacing:0;font-size:22px;font-weight:400;color:var(--accent-ink);margin-bottom:18px}
.tpl-editorial .kicker:before{display:none}
.tpl-editorial .h2{font-size:calc(64px * var(--fit,1));line-height:1;letter-spacing:-.02em}
.tpl-editorial .h-xl{font-size:calc(92px * var(--fit,1));line-height:.95}
.tpl-editorial .lead{color:var(--fg);opacity:.78;font-size:19px}
.tpl-editorial .cv{padding:0;grid-template-columns:1fr 410px;grid-template-rows:auto 1fr auto;grid-template-areas:"brand side" "main side" "doc side"}
.tpl-editorial .cv-brand{padding:56px 64px 0}
.tpl-editorial .cv-main{padding:0 64px 40px;align-self:end}
.tpl-editorial .cv-main h1{font-size:calc(124px * var(--fit,1));line-height:.9;letter-spacing:-.03em}
.tpl-editorial .cv-main h1 .dot{color:var(--accent)}
.tpl-editorial .cv-doc{margin:0 64px 52px;padding-top:14px;border-top:1px solid var(--fg);color:var(--fg);align-self:end;font-family:var(--tf);font-style:italic;text-transform:none;letter-spacing:0;font-size:18px;font-weight:400}
.tpl-editorial .cv-side{background:var(--accent);color:var(--on-accent);flex-direction:column;align-items:flex-start;justify-content:space-between;border:0;padding:56px 48px 52px}
.tpl-editorial .cv-side span{color:var(--on-accent-muted)}
.tpl-editorial .cv-for strong{font-size:40px;line-height:1.02}
.tpl-editorial .cv-for em{color:var(--on-accent-muted)}
.tpl-editorial .cv-meta{flex-direction:column;gap:18px;width:100%;border-top:1px solid var(--on-accent-line);padding-top:22px}
.tpl-editorial .co{grid-template-columns:1fr 1fr;gap:0;align-items:stretch}
.tpl-editorial .co-head{padding-right:56px;border-right:1px solid var(--line);display:flex;flex-direction:column;justify-content:center}
.tpl-editorial .metrics,.tpl-editorial .metrics.m-3,.tpl-editorial .metrics.m-4,.tpl-editorial .metrics.m-5,.tpl-editorial .metrics.m-6{grid-template-columns:1fr;gap:0;align-content:center;padding-left:56px}
.tpl-editorial .metrics.m-4,.tpl-editorial .metrics.m-5,.tpl-editorial .metrics.m-6{grid-template-columns:1fr 1fr;column-gap:32px}
.tpl-editorial .metrics.m-5 .metric:first-child{grid-column:auto}
.tpl-editorial .metric{background:none;border:0;border-bottom:1px solid var(--line);border-radius:0;padding:22px 0}
.tpl-editorial .metric strong{font-size:78px;color:transparent;-webkit-text-stroke:1.5px var(--fg);letter-spacing:-.02em}
.tpl-editorial .metric:first-child strong{color:var(--accent);-webkit-text-stroke:0}
.tpl-editorial .metrics.many .metric strong{font-size:48px}
.tpl-editorial .metric span{font-family:var(--tf);font-style:italic;font-size:18px;color:var(--fg)}
.tpl-editorial .st{grid-template-columns:1fr 250px;gap:40px}
.tpl-editorial .st-head{order:2;align-self:start;border-top:3px solid var(--fg);padding-top:18px}
.tpl-editorial .st-head .h2{font-size:calc(44px * var(--fit,1))}
.tpl-editorial .gallery{gap:8px}
.tpl-editorial .ph,.tpl-editorial .thumb{border-radius:0}
.tpl-editorial .ex{grid-template-columns:1fr 1fr;gap:0}
.tpl-editorial .ex-stat{padding-right:48px}
.tpl-editorial .ex-num{font-size:calc(270px * var(--fitn,1));font-style:italic;letter-spacing:-.05em;color:var(--accent-ink)}
.tpl-editorial .ex-desc{font-family:var(--tf);font-style:italic;font-size:28px;font-weight:400;margin-top:40px}
.tpl-editorial .ex-num{padding-right:.08em}
.tpl-editorial .ex-copy{border-left:1px solid var(--line);padding-left:48px}
.tpl-editorial .ob{grid-template-columns:.8fr 1.2fr}
.tpl-editorial .ob-list{gap:0 32px}
.tpl-editorial .ob-list li{flex-direction:column;gap:2px;border-top:1px solid var(--fg);padding:14px 0 18px;font-size:18px}
.tpl-editorial .ob-list .n{font-size:30px;font-weight:400;font-style:italic;letter-spacing:0}
.tpl-editorial .ob-list.many li{padding:10px 0 12px}
.tpl-editorial .ob-list.many .n{font-size:22px}
.tpl-editorial .price{background:none;border:0;border-top:3px solid var(--fg);border-radius:0;padding:26px 0 0}
.tpl-editorial .price-value{font-size:calc(84px * var(--fitp,1))}
.tpl-editorial .price-bill{font-family:var(--tf);font-style:italic;font-size:22px;font-weight:400}
.tpl-editorial .pkg{background:none;border:0;border-top:3px solid var(--fg);border-radius:0;padding:20px 0 0}
.tpl-editorial .pkg:first-child{border-top-color:var(--accent)}
.tpl-editorial .pkg-name{font-family:var(--tf);font-style:italic;text-transform:none;letter-spacing:0;font-size:20px;font-weight:400}
.tpl-editorial .ck{background:none;color:var(--accent-ink);width:auto;border-radius:0}
.tpl-editorial .play{border-radius:0;background:var(--bg);color:var(--fg)}
.tpl-editorial .pi-count i{border-radius:0}
.tpl-editorial .k-closing .deco-a,.tpl-editorial .k-portfolioIntro .deco-a{display:block;right:0;top:0;bottom:0;width:44px;background:var(--accent)}
.tpl-editorial .contacts{border-left:0;padding-left:0;border-top:3px solid var(--fg);padding-top:18px}
`,
  studio: `
.tpl-studio{--page:#C8CCD2;--bg:#ECEDEF;--fg:#0F1012;--muted:#5C616A;--line:rgba(15,16,18,.16);--card:#FFFFFF;--grid:rgba(15,16,18,.055);--mono:ui-monospace,"SF Mono",SFMono-Regular,Menlo,Consolas,monospace;--accent-ink:var(--ink-light)}
.tpl-studio .slide{background-color:var(--bg);background-image:linear-gradient(var(--grid) 1px,transparent 1px),linear-gradient(90deg,var(--grid) 1px,transparent 1px);background-size:40px 40px;background-position:-1px -1px}
.tpl-studio h1,.tpl-studio h2,.tpl-studio h3{letter-spacing:-.04em}
.tpl-studio .frame{padding:40px}
.tpl-studio .sh{height:46px;border:1px solid var(--fg);background:var(--bg);padding:0 18px;font-family:var(--mono);font-size:11px;font-weight:500;letter-spacing:.06em}
.tpl-studio .sh-label{color:var(--fg)}
.tpl-studio .sh-label b{display:inline-block;background:var(--accent);color:var(--on-accent);padding:3px 6px;margin-right:10px}
.tpl-studio .body{border:1px solid var(--fg);border-top:0;border-bottom:0;padding:34px 44px;background:rgba(236,237,239,.72)}
.tpl-studio .sf{border:1px solid var(--fg);background:var(--bg);padding:11px 18px;font-family:var(--mono);font-size:10.5px;font-weight:500;letter-spacing:.06em}
.tpl-studio .kicker{font-family:var(--mono);font-weight:500;font-size:12px;letter-spacing:.06em;color:var(--fg)}
.tpl-studio .kicker:before{width:10px;height:10px;background:var(--accent)}
.tpl-studio .h2{font-size:calc(52px * var(--fit,1))}
.tpl-studio .h-xl{font-size:calc(80px * var(--fit,1))}
.tpl-studio .lead{font-size:18px}
.tpl-studio .cv{padding:40px;grid-template-columns:repeat(4,1fr);grid-template-rows:70px 1fr auto;grid-template-areas:"brand doc doc doc" "main main main main" "side side side side"}
.tpl-studio .cv-brand{align-self:stretch;display:flex;align-items:center;border:1px solid var(--fg);background:var(--card);padding:0 22px}
.tpl-studio .cv-brand img{height:34px;max-width:200px}
.tpl-studio .cv-doc{align-self:stretch;display:flex;align-items:center;justify-content:flex-end;border:1px solid var(--fg);border-left:0;background:var(--bg);padding:0 22px;font-family:var(--mono);font-weight:500;letter-spacing:.06em;color:var(--fg)}
.tpl-studio .cv-main{align-self:stretch;display:flex;flex-direction:column;justify-content:center;border:1px solid var(--fg);border-top:0;border-bottom:0;padding:0 56px;background:rgba(236,237,239,.6)}
.tpl-studio .cv-main h1{font-size:calc(104px * var(--fit,1));letter-spacing:-.055em}
.tpl-studio .cv-main h1 .dot{color:var(--accent)}
.tpl-studio .cv-side{display:grid;grid-template-columns:2fr 2fr;gap:0;padding:0;border:1px solid var(--fg)}
.tpl-studio .cv-for{background:var(--accent);color:var(--on-accent);padding:24px 26px}
.tpl-studio .cv-for span,.tpl-studio .cv-for em{color:var(--on-accent-muted)}
.tpl-studio .cv-for strong{font-size:28px}
.tpl-studio .cv-meta{display:grid;grid-template-columns:1fr 1fr;gap:0;background:var(--card)}
.tpl-studio .cv-meta>div{padding:24px 26px;border-left:1px solid var(--fg)}
.tpl-studio .cv-for span,.tpl-studio .cv-meta span,.tpl-studio .price-label,.tpl-studio .price-extra span,.tpl-studio .contacts span,.tpl-studio .pf-head span,.tpl-studio .pk-head>span,.tpl-studio .pi-count{font-family:var(--mono);font-weight:500;letter-spacing:.06em}
.tpl-studio .k-cover .deco-a{display:block;z-index:2;right:84px;top:150px;width:34px;height:34px;background:linear-gradient(var(--fg),var(--fg)) center/1px 100% no-repeat,linear-gradient(var(--fg),var(--fg)) center/100% 1px no-repeat}
.tpl-studio .k-cover .deco-b{display:block;z-index:2;left:84px;bottom:190px;width:34px;height:34px;background:linear-gradient(var(--fg),var(--fg)) center/1px 100% no-repeat,linear-gradient(var(--fg),var(--fg)) center/100% 1px no-repeat}
.tpl-studio .metric{position:relative;border-radius:0;border:1px solid var(--fg);background:var(--card)}
.tpl-studio .metric:before{content:attr(data-i);position:absolute;right:14px;top:12px;font-family:var(--mono);font-size:10px;letter-spacing:.06em;opacity:.55}
.tpl-studio .metric strong{color:var(--fg);letter-spacing:-.05em}
.tpl-studio .metric:first-child{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.tpl-studio .metric:first-child strong,.tpl-studio .metric:first-child span{color:var(--on-accent)}
.tpl-studio .metrics{gap:0}
.tpl-studio .metrics .metric+.metric{margin-top:-1px}
.tpl-studio .metrics.m-3 .metric,.tpl-studio .metrics.m-4 .metric,.tpl-studio .metrics.m-5 .metric,.tpl-studio .metrics.m-6 .metric{margin:0 0 -1px -1px}
.tpl-studio .gallery{gap:1px;background:var(--fg);border:1px solid var(--fg)}
.tpl-studio .ph{border-radius:0}
.tpl-studio .ph:after{content:attr(data-i);position:absolute;left:10px;bottom:8px;font-family:var(--mono);font-size:10px;color:#fff;background:rgba(0,0,0,.55);padding:3px 6px}
.tpl-studio .ph.empty:after{display:none}
.tpl-studio .ex-num{color:var(--fg);letter-spacing:-.07em}
.tpl-studio .ex-stat{border:1px solid var(--fg);background:var(--card);padding:34px 40px 30px;box-shadow:10px 10px 0 var(--accent)}
.tpl-studio .ex-desc{font-family:var(--mono);font-size:14px;letter-spacing:.04em;text-transform:uppercase}
.tpl-studio .ob-list,.tpl-studio .ob-list.few{gap:0;border-top:1px solid var(--fg);border-left:1px solid var(--fg)}
.tpl-studio .ob-list li{border-top:0;border-right:1px solid var(--fg);border-bottom:1px solid var(--fg);background:var(--card);padding:18px 20px;font-size:17px}
.tpl-studio .ob-list.many li{padding:11px 16px;font-size:15px}
.tpl-studio .ob-list .n{font-family:var(--mono);font-weight:500;font-size:11px}
.tpl-studio .price{border-radius:0;border:1px solid var(--fg);background:var(--card);box-shadow:12px 12px 0 var(--accent)}
.tpl-studio .price-extra{border-top-style:dashed;border-top-color:var(--fg)}
.tpl-studio .pkg{border-radius:0;border:1px solid var(--fg);background:var(--card)}
.tpl-studio .pkg:first-child{box-shadow:inset 0 6px 0 var(--accent)}
.tpl-studio .pkg-name{font-family:var(--mono);font-weight:500;letter-spacing:.06em}
.tpl-studio .pkg-price{border-top:1px dashed var(--fg)}
.tpl-studio .ck{border-radius:0}
.tpl-studio .thumb{border-radius:0;border:1px solid var(--fg)}
.tpl-studio .play,.tpl-studio .pi-count i{border-radius:0}
.tpl-studio .vnum{border-radius:0;font-family:var(--mono);font-weight:500}
.tpl-studio .contacts{border-left:1px solid var(--fg);background:var(--card);padding:26px 28px;border:1px solid var(--fg)}
`,
  bold: `
.tpl-bold{--page:#0E0E0E}
.tpl-bold .slide{--bg:#FFFFFF;--fg:#0E0E0E;--muted:rgba(14,14,14,.62);--line:rgba(14,14,14,.14);--card:#F1F1F1;--accent-ink:var(--ink-light)}
.tpl-bold .sch-a{--bg:var(--accent);--fg:var(--on-accent);--muted:var(--on-accent-muted);--line:var(--on-accent-line);--card:var(--on-accent-card);--accent-ink:var(--on-accent)}
.tpl-bold .sch-k{--bg:#0E0E0E;--fg:#FFFFFF;--muted:rgba(255,255,255,.62);--line:rgba(255,255,255,.14);--card:#1B1B1B;--accent-ink:var(--ink-dark)}
.tpl-bold h1,.tpl-bold h2,.tpl-bold h3{text-transform:uppercase;letter-spacing:-.025em;line-height:1}
.tpl-bold .sh,.tpl-bold .sf{font-weight:800;color:var(--fg)}
.tpl-bold .kicker{display:inline-flex;align-self:flex-start;background:var(--fg);color:var(--bg);padding:7px 12px;font-weight:800;letter-spacing:.12em;font-size:12px}
.tpl-bold .kicker:before{display:none}
.tpl-bold .sch-w .kicker{background:var(--accent);color:var(--on-accent)}
.tpl-bold .h2{font-size:calc(66px * var(--fit,1))}
.tpl-bold .h-xl{font-size:calc(92px * var(--fit,1));line-height:1}
.tpl-bold .lead{color:var(--fg);opacity:.8;font-weight:500}
.tpl-bold .cv{padding:56px 80px 0}
.tpl-bold .cv-main h1{font-size:calc(150px * var(--fit,1));line-height:.92;letter-spacing:-.035em}
.tpl-bold .cv-main h1 .dot{color:var(--fg)}
.tpl-bold .cv-doc{color:var(--fg);font-weight:800}
.tpl-bold .cv-side{margin:0 -80px;padding:26px 80px 30px;background:#0E0E0E;color:#fff;border:0}
.tpl-bold .cv-side span,.tpl-bold .cv-for em{color:rgba(255,255,255,.6)}
.tpl-bold .cv-for strong{text-transform:uppercase;font-size:32px}
.tpl-bold .k-cover .deco-a{display:block;right:80px;top:120px;width:170px;height:170px;border-radius:50%;background:var(--fg);opacity:.12}
.tpl-bold .metric{border:0;border-radius:0;background:var(--accent);color:var(--on-accent)}
.tpl-bold .metric strong{color:var(--on-accent);font-size:66px;text-transform:uppercase;letter-spacing:-.04em}
.tpl-bold .metric span{color:var(--on-accent-muted);font-weight:600}
.tpl-bold .metric:nth-child(even){background:#0E0E0E;color:#fff}
.tpl-bold .metric:nth-child(even) strong{color:#fff}
.tpl-bold .metric:nth-child(even) span{color:rgba(255,255,255,.62)}
.tpl-bold .metrics.many .metric strong{font-size:42px}
.tpl-bold .ph,.tpl-bold .thumb{border-radius:0}
.tpl-bold .gallery{gap:6px}
.tpl-bold .ex-num{font-size:calc(290px * var(--fitn,1));color:var(--fg);letter-spacing:-.07em}
.tpl-bold .ex-desc{font-weight:800;text-transform:uppercase;font-size:26px;letter-spacing:-.01em}
.tpl-bold .ob-list li{border-top:3px solid var(--fg);font-weight:600}
.tpl-bold .ob-list .n{font-size:26px;font-weight:900;letter-spacing:-.02em}
.tpl-bold .ob-list.many .n{font-size:18px}
.tpl-bold .price{background:var(--accent);color:var(--on-accent);border:0;border-radius:0;padding:48px}
.tpl-bold .price-label,.tpl-bold .price-extra span{color:var(--on-accent-muted)}
.tpl-bold .price-bill{color:var(--on-accent);text-transform:uppercase;letter-spacing:.06em;font-weight:800}
.tpl-bold .price-extra{border-top-color:var(--on-accent-line)}
.tpl-bold .price-value{font-weight:900}
.tpl-bold .pkg{border:0;border-radius:0;border-top:10px solid var(--accent)}
.tpl-bold .pkg h3{font-size:34px}
.tpl-bold .ck{border-radius:0}
.tpl-bold .sch-a .ck{background:var(--fg);color:var(--bg)}
.tpl-bold .play{border-radius:0;width:70px;height:70px;margin:-35px 0 0 -35px}
.tpl-bold .pi-count i{border-radius:0;background:var(--fg);color:var(--bg)}
.tpl-bold .pi-count{color:var(--fg);font-weight:800}
.tpl-bold .vmeta strong{text-transform:uppercase}
.tpl-bold .contacts{border-left:4px solid var(--fg)}
`,
};
