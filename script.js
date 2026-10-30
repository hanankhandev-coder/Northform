/* NORTHFORM — interactions and motion, vanilla JS.
   Lenis smooths the scroll; everything else is CSS transitions switched by classes,
   plus a few rAF loops (hero clock, collage parallax, globe). */

const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const map = (v, a, b, c, d) => c + (d - c) * clamp((v - a) / (b - a));
const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = matchMedia('(pointer: fine)').matches;
const root = document.documentElement;
const ic = (n, s = 18, cls = '') => `<svg class="i${cls ? ' ' + cls : ''}" width="${s}" height="${s}" aria-hidden="true"><use href="#i-${n}"/></svg>`;
// once an element is (amount) in view, call fn
const onView = (el, fn, amount = .3) => {
  const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { fn(el); io.disconnect(); } }, { threshold: amount });
  io.observe(el);
};

/* ---------- smooth scroll + every in-page link ---------- */
const lenis = RM || !window.Lenis ? null : new Lenis({ autoRaf: true, lerp: .1 });
function goTo(sel) {
  const el = typeof sel === 'string' ? $(sel) : sel; if (!el) return;
  const offset = el.id === 'top' ? 0 : -84;                  // clear the floating nav
  if (lenis) { lenis.start(); lenis.scrollTo(el, { offset, duration: 1.4 }); }   // a dialog closing re-starts Lenis only async
  else scrollTo({ top: el.getBoundingClientRect().top + scrollY + offset, behavior: RM ? 'auto' : 'smooth' });
  history.replaceState(null, '', el.id === 'top' ? location.pathname : '#' + el.id);
}
document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="#"]'); if (!a) return;
  const id = a.getAttribute('href'), el = id.length > 1 && $(id); if (!el) return;
  e.preventDefault();
  if (!$('#menu').hidden) closeMenu();
  a.closest('dialog')?.close();
  if (el.tagName !== 'DIALOG') goTo(id);
  else if (el.id === 'signup') signup(a.dataset);
  else openDialog(el);
});
// arriving with a hash (e.g. a shared #pricing link) lands on that section
if (location.hash && $(location.hash)?.tagName === 'SECTION') addEventListener('load', () => setTimeout(() => goTo(location.hash), 100));

/* ---------- dialogs (work viewer, sign-up, small print): lock the scroll, close on the backdrop or × ---------- */
function openDialog(d) { if (!d.open) { d.showModal(); lenis?.stop(); } }
$$('dialog').forEach(d => {
  d.addEventListener('close', () => lenis?.start());
  d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
});
// "Start free" from anywhere: echo back the plan or the prompt the visitor came with
function signup({ plan, billing, images, prompt, ref } = {}) {
  const picked = plan ? `You picked ${plan[0].toUpperCase() + plan.slice(1)}${billing === 'yearly' ? ', billed yearly' : ''}${images ? ` for ${(+images).toLocaleString('en-US')} images a month` : ''}. ` : '';
  $('#signupLead').textContent = picked + 'Sign-up isn’t part of this demo — but your first shoot is ready to go.';
  $('#signupQ').hidden = !prompt; $('#signupText').textContent = prompt || '';
  $('#signupRef').hidden = !ref; $('#signupRef').textContent = ref ? 'Reference: ' + ref : '';
  openDialog($('#signup'));
}

/* ---------- theme ---------- */
const meta = $('meta[name="theme-color"]');
function paintTheme() {
  const dark = root.dataset.theme === 'dark';
  meta.content = dark ? '#000000' : '#ffffff';
  $$('[data-theme-toggle]').forEach(x => { x.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme'); x.setAttribute('aria-pressed', dark); });
}
$$('[data-theme-toggle]').forEach(b => b.addEventListener('click', () => {
  root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  try { localStorage.setItem('nf-theme', root.dataset.theme); } catch (e) {}
  paintTheme();
}));
paintTheme();
// follow the system theme until the visitor picks one
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  let saved = null; try { saved = localStorage.getItem('nf-theme'); } catch (err) {}
  if (!saved) { root.dataset.theme = e.matches ? 'dark' : 'light'; paintTheme(); }
});

/* ---------- mobile menu ---------- */
const menuEl = $('#menu'), menuOpenB = $('#menuOpen');
function openMenu() {
  menuEl.hidden = false; menuOpenB.setAttribute('aria-expanded', 'true'); root.style.overflow = 'hidden'; lenis?.stop();
  requestAnimationFrame(() => requestAnimationFrame(() => menuEl.classList.add('open')));
  $('a', menuEl).focus();
}
function closeMenu() {
  menuEl.classList.remove('open'); menuOpenB.setAttribute('aria-expanded', 'false'); root.style.overflow = ''; lenis?.start();
  setTimeout(() => { if (!menuEl.classList.contains('open')) menuEl.hidden = true; }, 400);
}
menuOpenB.addEventListener('click', openMenu);
$('#menuClose').addEventListener('click', () => { closeMenu(); menuOpenB.focus(); });
addEventListener('keydown', e => e.key === 'Escape' && !menuEl.hidden && closeMenu());
addEventListener('resize', () => innerWidth > 767 && !menuEl.hidden && closeMenu());

/* ---------- nav: glass once the page scrolls; mark the section in view ---------- */
const navEl = $('#nav'), onScroll = () => navEl.classList.toggle('scrolled', scrollY > 8);
addEventListener('scroll', onScroll, { passive: true }); onScroll();
(function spy() {
  const links = $$('.nav-links a');
  const io = new IntersectionObserver(es => es.forEach(e => {
    const a = links.find(l => l.getAttribute('href') === '#' + e.target.id); if (a) a.classList.toggle('is-on', e.isIntersecting);
  }), { rootMargin: '-45% 0px -50% 0px' });
  links.forEach(a => { const s = $(a.getAttribute('href')); s && io.observe(s); });
})();

/* ---------- reveal: fade up once in view ---------- */
$$('[data-reveal]').forEach(el => onView(el, x => x.classList.add('in'), .2));

/* ---------- prompt box outline: three folder tabs on top, a notch bottom-right for the buttons ---------- */
const R = 20, TAB = { y: 11, w: 30, r: 6, gap: 6, x0: 18 }, NOTCH = { w: 44 * 2 + 8 + 12, h: 44 + 12, r: 14 };
function shapePath(w, h) {
  const T = TAB.y; let d = `M ${R} ${T}`;
  for (let i = 0; i < 3; i++) {
    const x = TAB.x0 + i * (TAB.w + TAB.gap);
    d += ` L ${x} ${T} L ${x} ${TAB.r} A ${TAB.r} ${TAB.r} 0 0 1 ${x + TAB.r} 0 L ${x + TAB.w - TAB.r} 0 A ${TAB.r} ${TAB.r} 0 0 1 ${x + TAB.w} ${TAB.r} L ${x + TAB.w} ${T}`;
  }
  const ny = h - NOTCH.h, nx = w - NOTCH.w, r = NOTCH.r;
  d += ` L ${w - R} ${T} A ${R} ${R} 0 0 1 ${w} ${T + R} L ${w} ${ny - r} A ${r} ${r} 0 0 1 ${w - r} ${ny}`;
  d += ` L ${nx + r} ${ny} A ${r} ${r} 0 0 0 ${nx} ${ny + r} L ${nx} ${h - r} A ${r} ${r} 0 0 1 ${nx - r} ${h}`;
  return d + ` L ${R} ${h} A ${R} ${R} 0 0 1 0 ${h - R} L 0 ${T + R} A ${R} ${R} 0 0 1 ${R} ${T} Z`;
}
$$('[data-prompt]').forEach(p => {
  const path = $('.prompt-shape path', p);
  new ResizeObserver(() => path.setAttribute('d', shapePath(p.offsetWidth, p.offsetHeight))).observe(p);
});

/* ---------- stage: a fixed design canvas scaled to its container ---------- */
function stage(el, onFit, { bp = 720, max = 1.08 } = {}) {
  const cv = $('.canvas', el), W = +el.dataset.w, mW = +el.dataset.mw || 0;
  let last = '';
  new ResizeObserver(() => {
    const w = el.clientWidth; if (!w) return;
    const mobile = !!mW && w < bp, s = mobile ? w / mW : Math.min(w / W, max);
    const { W: cw, H } = onFit(mobile, s);
    cv.style.width = cw + 'px'; cv.style.height = H + 'px';
    cv.style.transform = `translateX(-50%) scale(${s})`;
    el.style.height = H * s + 'px'; el.classList.add('sized');
    const key = mobile + ':' + s.toFixed(3); if (key !== last) { last = key; el.dispatchEvent(new CustomEvent('fit', { detail: { mobile, s, H } })); }
  }).observe(el);
}

/* ---------- floating collage: scroll parallax + cursor drift, by depth ---------- */
const PARALLAX = 60, CURSOR = 10;
const mouse = { x: 0, y: 0, sx: 0, sy: 0 };
if (FINE && !RM) addEventListener('pointermove', e => { mouse.x = e.clientX / innerWidth * 2 - 1; mouse.y = e.clientY / innerHeight * 2 - 1; });
const collages = new Set();
function collage(el) {
  collages.add(el);
  $$('.fl', el).forEach(f => {
    const i = +f.dataset.i || 0;
    f.style.setProperty('--i', i); f.style.setProperty('--bob-delay', -i * 1.3 + 's'); f.style.setProperty('--bob-dur', 6 + (i % 3) + 's');
  });
}
(function parallax() {
  let last = performance.now();
  const tick = now => {
    const dt = Math.min(now - last, 100); last = now;
    const k = 1 - Math.exp(-dt / 140);              // a soft spring toward the pointer
    mouse.sx += (mouse.x - mouse.sx) * k; mouse.sy += (mouse.y - mouse.sy) * k;
    if (!RM) for (const el of collages) {
      if (!el.isConnected) { collages.delete(el); continue; }
      const r = el.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) continue;
      const s = clamp((innerHeight - r.top) / (innerHeight + r.height));
      for (const f of el.children) {
        const d = +f.dataset.depth || 0;
        f.style.transform = `translate3d(${(mouse.sx * CURSOR * d).toFixed(2)}px,${((.5 - s) * 2 * PARALLAX * d + mouse.sy * CURSOR * d).toFixed(2)}px,0)`;
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
})();

/* =========================================================
   HERO — a prompt types itself, the button is pressed, and the
   collage it "generated" builds around the photo. Three scenes loop.
   ========================================================= */
const SCENES = [
  { id: 'cycling', prompt: 'A cyclist captured in motion blur at night, lit by harsh flash.',
    photo: { src: 'img/cyclist.webp', alt: 'Motion-blurred road cyclist in a purple jersey, lit by flash', position: '46% center' },
    stat: '63%', metric: { label: 'Visual Storytelling', value: '+ROI' },
    product: { title: 'Down to the last detail', items: [
      { image: 'img/socks.webp', alt: 'Three knitted socks in grey, violet and mustard', label: 'Trail stability sock', text: 'Exceptional grip on uneven terrain' },
      { image: 'img/sunglasses.webp', alt: 'Round sunglasses on a pink backdrop', label: 'Descent shield', text: 'Clear sight on fast descents' }] },
    chip: { avatar: 'img/p-woman.webp', label: "Lara's storefront" },
    gallery: { caption: 'Ride further with Kestrel Kit', shots: [
      { image: 'img/legs.webp', alt: "Runner's legs blurred mid-stride" }, { image: 'img/headphones.webp', alt: 'Black headphones on yellow', label: 'Accessories' }, { image: 'img/sunglasses.webp', alt: 'Round sunglasses on pink' }] } },
  { id: 'night-run', prompt: 'A runner sprinting through the city at night, long-exposure light trails.',
    photo: { src: 'img/runner.webp', alt: 'Runner leaping through a night street with light trails behind', position: '40% center' },
    stat: '48%', metric: { label: 'Click-through', value: '+38%' },
    product: { title: 'Made for the late miles', items: [
      { image: 'img/sneaker.webp', alt: 'Violet mesh running shoes', label: 'Airflow runner', text: 'Light enough for the last kilometre' },
      { image: 'img/headphones.webp', alt: 'Black over-ear headphones', label: 'Sport ANC', text: 'Stays put at full stride' }] },
    chip: { avatar: 'img/p-man.webp', label: 'Okon Running' },
    gallery: { caption: 'Own the night with Okon', shots: [
      { image: 'img/legs.webp', alt: "Runner's legs blurred mid-stride" }, { image: 'img/sneaker.webp', alt: 'Violet running shoes', label: 'Footwear' }, { image: 'img/dunk.webp', alt: 'Basketball player dunking in a dark gym' }] } },
  { id: 'surf', prompt: 'A surfer carving a turquoise wave at noon, shot from the water.',
    photo: { src: 'img/surf.webp', alt: 'Surfer on a pink board carving a bright turquoise wave', position: 'center 40%' },
    stat: '71%', metric: { label: 'Cost per shoot', value: '−62%' },
    product: { title: 'Ready for open water', items: [
      { image: 'img/sunglasses.webp', alt: 'Round sunglasses on a pink backdrop', label: 'Polar lens 02', text: 'Glare-free on bright water' },
      { image: 'img/perfume.webp', alt: 'Clear glass fragrance bottle in sunlight', label: 'Salt & cedar', text: 'A clean, coastal finish' }] },
    chip: { avatar: 'img/p-woman2.webp', label: 'Tidewell Surf' },
    gallery: { caption: 'The summer drop by Tidewell', shots: [
      { image: 'img/surf.webp', alt: 'Surfer on a turquoise wave' }, { image: 'img/sunglasses.webp', alt: 'Round sunglasses', label: 'Eyewear' }, { image: 'img/perfume.webp', alt: 'Glass fragrance bottle' }] } },
];
// design-canvas layouts (px)
const DESKTOP = { W: 1200, H: 720, prompt: { w: 480, idle: { x: 360, y: 120, s: 1 }, collage: { x: 140, y: 34, s: .68 } },
  photo: { x: 420, y: 64, w: 360, h: 580 }, stat: { x: 728, y: 104 }, product: { x: 708, y: 236 }, chip: { x: 214, y: 330 }, metric: { x: 176, y: 548 }, gallery: { x: 962, y: 492 } };
const MOBILE = { W: 390, H: 560, prompt: { w: 342, idle: { x: 24, y: 90, s: 1 }, collage: { x: 55, y: 0, s: .82 } },
  photo: { x: 86, y: 186, w: 210, h: 320 }, stat: { x: 244, y: 206, s: .9 }, product: { x: 236, y: 318, s: .76 }, metric: { x: 14, y: 430, s: .8 } };
const T = { idle: 500, char: 35, beat: 300, press: 380, hold: 5200, exit: 800 };
const times = sc => { const typed = T.idle + sc.prompt.length * T.char, press = typed + T.beat, show = press + T.press, exit = show + T.hold; return { press, show, exit, end: exit + T.exit }; };

const frag = {
  stat: v => `<div class="card stat">${v}${ic('arrow-up-right', 18)}</div>`,
  metric: m => `<div class="card metric"><div class="metric-l">${m.label}${ic('info', 12)}</div><div class="metric-v">${m.value}</div></div>`,
  product: p => `<div class="card product"><div class="product-h">${p.title}</div><div class="product-row">${p.items.map(it => `<div><div class="product-img"><img src="${it.image}" alt="${it.alt}"></div><div class="product-l">${it.label}</div><div class="product-t">${it.text}</div></div>`).join('')}</div></div>`,
  chip: c => `<div class="pchip"><span class="av"><img src="${c.avatar}" alt=""></span><span>${c.label}</span></div>`,
  gallery: ({ caption, shots: [h, a, b] }) => `<div class="card minig"><div class="minig-a"><img src="${h.image}" alt="${h.alt}"><span>${caption}</span></div><div class="minig-b"><span>${a.label}</span><img src="${a.image}" alt="${a.alt}"></div><div class="minig-c"><div><img src="${b.image}" alt="${b.alt}"></div><div><img src="${h.image}" alt=""></div></div></div>`,
};
const piece = (p, i, depth, z, from, html, s = 1, rot = 0) => p ? `<div class="fl" aria-hidden="true" data-i="${i}" data-depth="${depth}" style="left:${p.x}px;top:${p.y}px;--z:${z};--fx:${from[0]}px;--fy:${from[1]}px;--r:${rot}deg"><div class="fl-in"><div class="bob"><div class="rot">${s === 1 ? html : `<div class="scaled" style="transform:scale(${s})">${html}</div>`}</div></div></div></div>` : '';

(function hero() {
  const st = $('#heroStage'), cv = $('#heroCanvas'), promptEl = $('#heroPrompt'), textEl = $('#heroText'), caret = $('.caret', promptEl), go = $('#heroGo');
  const segBtns = $$('#sceneSeg button');
  let L = DESKTOP, mobile = false, scene = 0, t = 0, phase = '', chars = -1, live = null, paused = false;

  stage(st, m => { mobile = m; L = m ? MOBILE : DESKTOP; return L; });
  st.addEventListener('fit', () => {
    promptEl.style.width = L.prompt.w + 'px';
    placePrompt();
    if (live) { live.remove(); live = null; if (phase === 'show') mount(true); }
  });
  function placePrompt() {
    const p = phase === 'show' ? L.prompt.collage : L.prompt.idle;
    promptEl.style.transform = `translate(${p.x}px,${p.y}px) scale(${p.s})`;
  }
  function mount(instant) {
    const sc = SCENES[scene], el = document.createElement('div');
    el.className = 'collage';
    el.innerHTML =
      `<div class="fl" data-i="0" data-depth=".15" style="left:${L.photo.x}px;top:${L.photo.y}px;--z:1"><div class="fl-in"><div class="photo" style="width:${L.photo.w}px;height:${L.photo.h}px"><img src="${sc.photo.src}" alt="${sc.photo.alt}" style="object-position:${sc.photo.position}"${scene === 0 ? ' fetchpriority="high"' : ''}></div></div></div>` +
      piece(L.stat, 1, .7, 4, [40, -30], frag.stat(sc.stat), L.stat.s) +
      piece(L.product, 2, .5, 4, [60, 10], frag.product(sc.product), L.product.s, mobile ? 0 : .6) +
      piece(L.chip, 3, .55, 4, [-50, 0], frag.chip(sc.chip)) +
      piece(L.metric, 4, .8, 4, [-40, 30], frag.metric(sc.metric), L.metric.s, mobile ? 0 : -.8) +
      piece(L.gallery, 5, .35, 3, [30, 60], frag.gallery(sc.gallery));
    el.style.cssText = 'position:absolute;inset:0';
    cv.prepend(el); collage(el); live = el;
    if (instant || RM) el.classList.add('on');
    else requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('on')));
  }
  function unmount() {
    if (!live) return; const el = live; live = null;
    el.classList.remove('on'); el.classList.add('out'); setTimeout(() => el.remove(), 800);
  }
  const setScene = i => segBtns.forEach((b, k) => b.setAttribute('aria-pressed', k === i));

  function render() {
    const sc = SCENES[scene], tm = times(sc);
    const ph = RM ? 'show' : t < tm.press ? 'typing' : t < tm.show ? 'press' : t < tm.exit ? 'show' : 'exit';
    const n = RM ? 999 : Math.max(0, Math.floor((t - T.idle) / T.char));
    if (n !== chars) { chars = n; textEl.textContent = sc.prompt.slice(0, n); }
    if (ph !== phase) {
      const was = phase; phase = ph;
      go.classList.toggle('pressed', ph === 'press');
      caret.classList.toggle('off', RM || ph === 'show');
      if (ph === 'show') mount(); else if (was === 'show') unmount();
      placePrompt();
    }
  }
  function jump(i) {
    if (live) unmount();
    scene = i; t = times(SCENES[i]).show; phase = ''; chars = -1; setScene(i); render();
  }
  segBtns.forEach((b, i) => b.addEventListener('click', () => i !== scene && jump(i)));
  st.addEventListener('pointerenter', () => paused = true);
  st.addEventListener('pointerleave', () => paused = false);

  if (RM) { render(); return; }
  let last = performance.now();
  (function tick(now) {
    const dt = Math.min(now - last, 100); last = now;
    const tm = times(SCENES[scene]);
    if (!(paused && t >= tm.show && t < tm.exit)) t += dt;     // hover pauses only while the collage is on show
    if (t >= tm.end) { scene = (scene + 1) % SCENES.length; t = 0; setScene(scene); }
    render();
    requestAnimationFrame(tick);
  })(last);
})();
/* ---------- loader: the hero's prompt box draws itself, types the promise, presses generate ----------
   Shown once per visit (sessionStorage), skipped for reduced motion. The hero entrance waits for it. */
(function loader() {
  const el = $('#loader'), ready = () => document.body.classList.add('ready');
  let seen = false; try { seen = sessionStorage.getItem('nf-loaded') === '1'; sessionStorage.setItem('nf-loaded', '1'); } catch (e) {}
  if (RM || seen) { el.remove(); return requestAnimationFrame(ready); }
  const path = $('#loaderPath'), text = $('#loaderText'), count = $('#loaderCount'), go = $('#loaderGo');
  path.setAttribute('d', shapePath(320, 168)); path.setAttribute('pathLength', '1');
  root.style.overflow = 'hidden'; lenis?.stop();
  const line = 'Describe it. We’ll shoot it.', t0 = performance.now(), DUR = 2100;
  let finished = false;
  const finish = () => {
    if (finished) return; finished = true;
    go.classList.remove('pressed'); el.classList.add('done');
    root.style.overflow = ''; lenis?.start(); ready();
    setTimeout(() => el.remove(), 900);
  };
  // frames drive the drawing; a timer guarantees the page unlocks on time even if frames are throttled
  setTimeout(finish, DUR + 250);
  setTimeout(() => el.classList.add('drawn'), 30);
  (function tick(now) {
    if (finished) return;
    const p = clamp((now - t0) / DUR);
    count.textContent = String(Math.round(p * 100)).padStart(2, '0');
    text.textContent = line.slice(0, Math.round(clamp((p - .3) / .5) * line.length));   // types between 30% and 80%
    if (p > .86) go.classList.add('pressed');
    if (p < 1) requestAnimationFrame(tick); else finish();
  })(t0);
})();


// count a number up (keeps decimals and a prefix/suffix), easing out
function countUp(el, to, { pre = '', suf = '', dec = 0, dur = 1200, fmt } = {}) {
  const out = v => pre + (fmt ? fmt(v) : v.toFixed(dec)) + suf;
  if (RM || !dur) { el._c = (el._c || 0) + 1; el._v = to; el.textContent = out(to); return; }
  const from = el._v ?? 0, t0 = performance.now(), id = el._c = (el._c || 0) + 1; el._v = to;
  (function f(now) {
    if (el._c !== id) return;
    const p = clamp((now - t0) / dur), e = 1 - Math.pow(1 - p, 3);
    el.textContent = out(from + (to - from) * e);
    if (p < 1) requestAnimationFrame(f);
  })(t0);
}
const euro = v => '€' + Math.round(v).toLocaleString('en-US');
// type text into an element, one character at a time (cancels any earlier run on the same element)
function typeInto(el, text, speed = 18, done) {
  const id = el._t = (el._t || 0) + 1;
  if (RM) { el.textContent = text; done && done(); return; }
  let i = 0; el.textContent = '';
  (function f() { if (el._t !== id) return; el.textContent = text.slice(0, ++i); i < text.length ? setTimeout(f, speed) : done && done(); })();
}
// run fn(dt) every frame while el is on screen
function whileVisible(el, fn) {
  let on = false, last = 0;
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) { last = performance.now(); requestAnimationFrame(tick); } }).observe(el);
  function tick(now) { if (!on) return; const dt = Math.min(now - last, 100); last = now; fn(dt); requestAnimationFrame(tick); }
}
// a radio-style group: one aria-checked at a time; returns set(i)
function radio(group, onPick) {
  const btns = $$('[role="radio"]', group);
  const set = (i, fire = true) => { btns.forEach((b, k) => b.setAttribute('aria-checked', k === i)); fire && onPick(btns[i], i); };
  btns.forEach((b, i) => b.addEventListener('click', () => b.getAttribute('aria-checked') !== 'true' && set(i)));
  group.addEventListener('keydown', e => {
    const k = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key]; if (!k) return;
    e.preventDefault(); const i = (btns.findIndex(b => b.getAttribute('aria-checked') === 'true') + k + btns.length) % btns.length; set(i); btns[i].focus();
  });
  return set;
}
// any prompt on the page can be dropped into the final prompt box
function usePrompt(text) {
  const ta = $('#prompt-input'), box = ta.closest('.prompt');
  ta.value = text; goTo('#start');
  setTimeout(() => { ta.focus({ preventScroll: true }); box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 900); }, 1000);
}

// slide a segmented control's ink pill under its chosen button
function segPill(seg) {
  const pill = $('.seg-pill', seg), move = () => { const b = $('[aria-checked="true"],[aria-selected="true"]', seg); if (b) { pill.style.width = b.offsetWidth + 'px'; pill.style.transform = `translateX(${b.offsetLeft - 4}px)`; } };
  document.fonts.ready.then(move); new ResizeObserver(move).observe(seg);
  return move;
}

/* =========================================================
   01 PROBLEMS — a wheel of problems turns; the prompt types each fix
   ========================================================= */
(function problems() {
  const P = [
    ['Brief at nine, campaign live by lunch. No studio to book, no crew to wait for.', '6 weeks', '9 minutes'],
    ['Upload three photos of the product once. Northform learns it, so nothing has to ship.', '14 days', '3 photos'],
    ['Twelve takes per prompt, each in a new scene. Your grid never repeats itself.', '1 backdrop', '∞ scenes'],
    ['Say “warmer light” or “swap the prop”. Every edit is just another sentence.', '5 rounds', '1 sentence'],
    ['Every generation exports to 1:1, 4:5, 9:16 and 16:9 at the same time.', '1 crop', '4 formats'],
    ['Each image is tagged by scene and light, then ranked by what actually converts.', 'Gut feel', '+38% CTR'],
  ];
  const box = $('#wheelBox'), btns = $$('#wheel button'), text = $('#wheelText'), before = $('#wBefore'), after = $('#wAfter'), go = $('#wheelGo'), n = btns.length;
  let cur = -1, wait = 0, hover = false;
  function select(i) {
    if (i === cur) return; cur = i; wait = 0;
    btns.forEach((b, k) => {
      let d = k - i; if (d > n / 2) d -= n; if (d < -n / 2 + 1) d += n;      // circular: -2..3
      const a = Math.abs(d), jump = b._d != null && Math.abs(d - b._d) > 1; b._d = d;
      b.style.transition = jump ? 'none' : '';                                   // the one wrapping round moves while invisible
      b.style.transform = `translateY(${d * 118 - 50}%) scale(${1 - a * .07})`;
      b.style.opacity = a > 2 ? 0 : [1, .3, .1][a];
      b.style.filter = a ? `blur(${a * 3}px)` : 'none';
      b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1;
    });
    typeInto(text, P[i][0], 16);
    [[before, P[i][1]], [after, P[i][2]]].forEach(([el, v], k) => { el.textContent = v; el.classList.remove('pop'); void el.offsetWidth; el.style.animationDelay = k * .12 + 's'; el.classList.add('pop'); });
    go.classList.add('pressed'); setTimeout(() => go.classList.remove('pressed'), 220);
  }
  btns.forEach((b, i) => b.addEventListener('click', () => select(i)));
  $('#wheel').addEventListener('keydown', e => { const k = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]; if (!k) return; e.preventDefault(); select((cur + k + n) % n); btns[cur].focus(); });
  box.addEventListener('pointerenter', () => hover = true); box.addEventListener('pointerleave', () => hover = false);
  select(0);
  whileVisible(box, dt => { if (hover || RM) return; wait += dt; if (wait > 4200) select((cur + 1) % n); });
})();

/* =========================================================
   02 PRODUCT — spec card + dot-matrix readout + the shot, one composition per tool
   ========================================================= */
(function product() {
  const comp = $('#demo'), seg = $('#toolSeg'), tabs = $$('[role="tab"]', seg), movePill = segPill(seg);
  const card = $('.comp-card', comp), label = $('#compLabel'), title = $('#compTitle'), meta = $('#compMeta'), ctrls = $$('[data-for]', comp);
  const slot = $('#compSlot'), photo = $('#compPhoto'), img = $('#compImg'), tag = $('#compTag'), tint = $('#kitTint'), hint = $('#dotsHint');
  const desc = $('#compDesc'), statV = $('#compStatV'), statL = $('#compStatL'), cv = $('#dots'), ctx = cv.getContext('2d');
  const TOOLS = [
    { img: 'perfume', alt: "Fragrance bottle in the brand's light", tag: 'Tidewell · Salt & cedar', hint: 'On-brand score, per shot', desc: 'Your colours, type and props, applied to every shot automatically. Pick a colour.' },
    { img: 'serum', alt: 'Serum bottle, relit', tag: 'Lumen Skin · Serum 02', hint: 'Drag to move the light', desc: 'Move the sun after the shoot. Drag across the dots to place the light.' },
    { img: 'phone-woman', alt: 'Woman in a cream jumper, cropped to the selected format', tag: 'Maison Okra · Winter knit', hint: 'Safe area for the placement', desc: 'One generation, cut for every placement you publish to.' },
  ];
  const LIGHT = { golden: [255, 196, 140], blue: [150, 170, 255], flash: [255, 255, 255] };
  const st = { tool: -1, score: 98, sw: '#e9dcc9', light: 'golden', k: '3,200K', lx: .62, ly: .34, ratio: 4 / 5, ar: '4:5', where: 'Instagram feed', size: '1080×1350', dragged: false };
  let stopped = false, hover = false, t = 0;

  function texts() {
    const i = st.tool;
    title.innerHTML = ['Tidewell<br>&rarr; On brand', `Studio sweep<br>&rarr; ${st.light === 'golden' ? 'Golden hour' : st.light === 'blue' ? 'Blue hour' : 'Studio flash'}`, 'One shot<br>&rarr; Every format'][i];
    const M = [[['Palette', '5 colours'], ['Type', 'Inter'], ['Score', st.score + '/100']], [['Light', st.light === 'flash' ? 'Flash' : 'Natural'], ['Temp', st.k], ['Shadows', 'Soft']], [['Placement', st.where], ['Size', st.size], ['Export', '4K']]][i];
    meta.innerHTML = M.map(([a, b]) => `<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');
    [statV.textContent, statL.textContent] = [[st.score, 'on-brand'], [st.k, 'colour temp'], [st.ar, st.where]][i];
  }
  function fit() {
    const W = slot.clientWidth, H = slot.clientHeight; if (!W) return;
    const w = Math.min(W, H * st.ratio); photo.style.width = w + 'px'; photo.style.height = w / st.ratio + 'px';
  }
  new ResizeObserver(fit).observe(slot);
  function show(i, user) {
    if (user) stopped = true;
    if (i === st.tool) return; st.tool = i; t = 0;
    comp.dataset.tool = i; label.textContent = tabs[i].textContent;
    tabs.forEach((b, k) => { b.setAttribute('aria-selected', k === i); b.tabIndex = k === i ? 0 : -1; }); movePill();
    ctrls.forEach(c => c.hidden = +c.dataset.for !== i);
    hint.textContent = TOOLS[i].hint; desc.textContent = TOOLS[i].desc;
    if (i !== 2) st.ratio = 4 / 5; else { const b = $('[data-for="2"] [aria-checked="true"]', comp), [a, c] = b.dataset.ar.split('/').map(Number); st.ratio = a / c; }
    fit(); texts();
    card.classList.remove('swap'); void card.offsetWidth; card.classList.add('swap');
    // the photo cross-fades to this tool's shot
    photo.classList.add('fade');
    setTimeout(() => {
      img.onload = () => photo.classList.remove('fade');
      img.src = `img/${TOOLS[i].img}.webp`; img.alt = TOOLS[i].alt; tag.textContent = TOOLS[i].tag;
      if (i === 1) img.dataset.light = st.light; else delete img.dataset.light;
      if (img.complete) photo.classList.remove('fade');
    }, 260);
  }
  tabs.forEach((b, i) => b.addEventListener('click', () => show(i, true)));
  seg.addEventListener('keydown', e => { const k = { ArrowRight: 1, ArrowLeft: -1 }[e.key]; if (!k) return; e.preventDefault(); const i = (st.tool + k + 3) % 3; show(i, true); tabs[i].focus(); });
  radio($('[data-for="0"]', comp), b => { st.sw = getComputedStyle(b).getPropertyValue('--c').trim(); tint.style.setProperty('--kit', st.sw); st.score = +b.dataset.score; texts(); stopped = true; });
  radio($('[data-for="1"]', comp), b => { st.light = b.dataset.light; st.k = b.dataset.k; img.dataset.light = st.light; texts(); stopped = true; });
  radio($('[data-for="2"]', comp), b => { const [a, c] = b.dataset.ar.split('/').map(Number); st.ratio = a / c; st.ar = b.textContent; st.where = b.dataset.where; st.size = b.dataset.size; fit(); texts(); stopped = true; });
  comp.addEventListener('pointerenter', () => hover = true); comp.addEventListener('pointerleave', () => hover = false);

  // the dot matrix: every dot eases toward a target colour + brightness for the current tool
  const G = [[229, 72, 77], [240, 138, 142], [201, 195, 245]];
  const mix = (a, b, t) => a.map((v, k) => v + (b[k] - v) * t);
  const grad = t => t < .5 ? mix(G[0], G[1], t * 2) : mix(G[1], G[2], (t - .5) * 2);
  const hex = h => [1, 3, 5].map(k => parseInt(h.slice(k, k + 2), 16));
  const BARS = Array.from({ length: 48 }, (_, i) => .3 + .62 * Math.abs(Math.sin(i * 1.9 + .7)) * (.6 + .4 * Math.abs(Math.cos(i * .7))));
  let W = 0, H = 0, cols = 0, rows = 0, cell = 0, oy = 0, D = [];
  function size() {
    const dpr = Math.min(devicePixelRatio, 2); W = cv.clientWidth; H = cv.clientHeight; if (!W) return;
    cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.max(9, Math.round(W / 30)); cell = W / cols; rows = Math.floor((H - 48) / cell); oy = 48 + (H - 48 - rows * cell) / 2;
    D = Array.from({ length: cols * rows }, (_, k) => D[k] || { c: [0, 0, 0], a: 0 });
  }
  new ResizeObserver(size).observe(cv);
  function target(c, r) {
    if (st.tool === 0) {                                   // bars: on-brand score per shot, tinted with the chosen colour
      const h = BARS[c % BARS.length] * st.score / 100, up = (rows - r) / rows;
      return [mix(grad(1 - r / rows), hex(st.sw), .4), up <= h ? .95 : 0];
    }
    if (st.tool === 1) {                                   // relight: brightness falls off from the light
      const dx = (c + .5) / cols - st.lx, dy = ((r + .5) / rows - st.ly) * rows / cols, d = Math.hypot(dx, dy);
      return [LIGHT[st.light], Math.pow(clamp(1 - d / .62), 1.6)];
    }
    // formats: the crop's safe area, outlined
    const fw = Math.min(cols * .84, rows * .84 * st.ratio), fh = fw / st.ratio, x0 = (cols - fw) / 2, y0 = (rows - fh) / 2;
    const inside = c + .5 > x0 && c + .5 < x0 + fw && r + .5 > y0 && r + .5 < y0 + fh;
    const edge = inside && (c + .5 - x0 < 1 || x0 + fw - c - .5 < 1 || r + .5 - y0 < 1 || y0 + fh - r - .5 < 1);
    return [grad(c / cols), edge ? .95 : inside ? .22 : 0];
  }
  function draw(k) {
    ctx.clearRect(0, 0, W, H);
    const rad = cell * .3, off = root.dataset.theme === 'dark' ? '#1f1f1f' : '#e9e9e9';
    ctx.fillStyle = off; ctx.beginPath();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) { const x = (c + .5) * cell, y = oy + (r + .5) * cell; ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, 6.2832); }
    ctx.fill();
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const d = D[r * cols + c], [tc, ta] = target(c, r);
      d.c = d.c.map((v, j) => v + (tc[j] - v) * k); d.a += (ta - d.a) * k;
      if (d.a < .02) continue;
      ctx.fillStyle = `rgba(${d.c[0] | 0},${d.c[1] | 0},${d.c[2] | 0},${d.a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc((c + .5) * cell, oy + (r + .5) * cell, rad * (.85 + .25 * d.a), 0, 6.2832); ctx.fill();
    }
  }
  // drag on the matrix to move the light (switches to Relight)
  let drag = false;
  const lightFrom = e => { const b = cv.getBoundingClientRect(); st.lx = clamp((e.clientX - b.left) / b.width); st.ly = clamp((e.clientY - b.top - oy) / (rows * cell)); st.dragged = true; };
  cv.addEventListener('pointerdown', e => { drag = true; cv.setPointerCapture(e.pointerId); show(1, true); lightFrom(e); });
  cv.addEventListener('pointermove', e => { if (drag) lightFrom(e); else if (st.tool === 1 && e.pointerType === 'mouse') lightFrom(e); });
  const up = () => drag = false; cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);

  let clock = 0;
  whileVisible(comp, dt => {
    clock += dt;
    if (st.tool === 1 && !st.dragged && !RM) { st.lx = .5 + .3 * Math.cos(clock / 1800); st.ly = .42 + .26 * Math.sin(clock / 1800); }
    comp.style.setProperty('--lx', st.lx * 100 + '%'); comp.style.setProperty('--ly', st.ly * 100 + '%'); comp.style.setProperty('--lc', LIGHT[st.light].join(' '));
    if (!stopped && !hover && !RM) { t += dt; if (t > 7000) show((st.tool + 1) % 3); }
    draw(RM ? 1 : 1 - Math.exp(-dt / 110));
  });
  new MutationObserver(() => draw(1)).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  size(); show(0); photo.classList.remove('fade');
})();

/* =========================================================
   03 HOW IT WORKS — the steps take turns; hover or focus one to play it
   ========================================================= */
(function flow() {
  const box = $('#flow'), cards = $$('.fc', box), bar = $('#flowBar'), typeEl = $('#fcType'), PROMPT = typeEl.textContent;
  let cur = -1, t = 0, hover = false;
  function set(i) {
    if (i === cur) return; cur = i; t = 0;
    cards.forEach((c, k) => c.classList.toggle('on', k === i));
    bar.style.transform = `scaleX(${(i + 1) / cards.length})`;
    if (i === 0) typeInto(typeEl, PROMPT, 26);
  }
  cards.forEach((c, i) => {
    c.addEventListener('pointerenter', () => { hover = true; set(i); });
    c.addEventListener('pointerleave', () => hover = false);
    c.addEventListener('focus', () => set(i));
  });
  set(0);
  whileVisible(box, dt => { if (hover || RM) return; t += dt; if (t > (cur === 0 ? 4400 : 3400)) set((cur + 1) % cards.length); });
})();

/* =========================================================
   04 WORK — square tiles with the prompt as the title; a viewer on click
   ========================================================= */
(function work() {
  const W = [
    ['cyclist', 'sport', 'Kestrel Kit', '3:2', 'Hard flash', 'A cyclist captured in motion blur at night, lit by harsh flash.'],
    ['fashion-red', 'fashion', 'Rally', '4:5', 'Daylight', 'A model in a red tracksuit sitting against a deep blue sky, shot from below.'],
    ['serum', 'beauty', 'Lumen Skin', '4:5', 'Studio flash', 'A glass serum bottle with its dropper on a mirrored surface, crisp studio light.'],
    ['surf', 'sport', 'Tidewell', '2:3', 'Noon sun', 'A surfer carving a turquoise wave at noon, shot from the water.'],
    ['watch', 'product', 'Kestrel', '3:2', 'Golden hour', 'A leather-strap smartwatch resting on a tree stump, late sun.'],
    ['fashion-green', 'fashion', 'Orchard', '3:4', 'Warm side light', 'A model in a green satin dress holding an apple, warm side light.'],
    ['pump-pink', 'beauty', 'Lumen Skin', '16:9', 'Soft pastel', 'A pink pump bottle on a pastel plinth, soft shadows.'],
    ['runner', 'sport', 'Okon Running', '3:4', 'Neon night', 'A runner sprinting through the city at night, long-exposure light trails.'],
    ['sneaker', 'product', 'Okon Running', '2:3', 'Soft daylight', 'Violet mesh running shoes floating against a pale wall.'],
    ['model-orange', 'fashion', 'Maison Okra', '2:3', 'Overcast', 'A model in an orange jacket on a grey street, overcast light.'],
    ['lipstick', 'beauty', 'Maison Okra', '2:3', 'Window light', 'Three lipsticks on a quartz slab, soft window light.'],
    ['headphones', 'product', 'Fieldnote', '3:2', 'Hard flash', 'Black over-ear headphones on a yellow sweep, hard flash.'],
    ['dunk', 'sport', 'Okon Running', '2:3', 'Spotlight', 'A basketball player mid-dunk in a dark gym, a single spotlight.'],
    ['fashion-fur', 'fashion', 'Maison Okra', '3:2', 'Studio pastel', 'A model in a pink faux-fur coat against a lilac backdrop.'],
    ['perfume', 'beauty', 'Tidewell', '1:1', 'Low sun', 'A clear fragrance bottle on sand at sunset, long warm shadows.'],
    ['backpack', 'product', 'Fieldnote', '2:3', 'Daylight', 'A canvas backpack on a mountain trail, bright daylight.'],
  ];
  const grid = $('#workGrid'), dlg = $('#viewer'), more = $('#workMore'), CAT = { sport: 'Sport', fashion: 'Fashion', beauty: 'Beauty', product: 'Product' };
  let shown = W, at = 0, limit = 8;
  function render() {
    grid.innerHTML = shown.slice(0, limit).map(([img, , brand, , light, p], i) => `<li style="--n:${i % 8}"><button type="button" class="wk" data-i="${i}" aria-label="Open: ${p}">
      <span class="wk-img"><img src="img/${img}.webp" alt="" loading="lazy"><span class="core-go">${ic('arrow-up-right', 15)}</span></span>
      <span class="wk-t">${p}</span><span class="wk-m">${brand} · ${light}</span></button></li>`).join('');
    more.parentElement.hidden = shown.length <= limit; more.textContent = `Show all ${shown.length}`;
  }
  radio($('#workFilter'), b => { shown = b.dataset.f === 'all' ? W : W.filter(w => w[1] === b.dataset.f); limit = 8; render(); });
  more.addEventListener('click', () => { const from = limit; limit = shown.length; render(); $$('li', grid).forEach((li, i) => li.style.setProperty('--n', Math.max(0, i - from))); });
  function open(i) {
    at = (i + shown.length) % shown.length; const [img, cat, brand, ratio, light, p] = shown[at];
    $('#viewerImg').src = `img/${img}.webp`; $('#viewerImg').alt = p; $('#viewerPrompt').textContent = p; $('#viewerMeta').textContent = `${CAT[cat]} · ${at + 1} of ${shown.length}`;
    $('#viewerDl').innerHTML = `<dt>Brand</dt><dd>${brand}</dd><dt>Format</dt><dd>${ratio}</dd><dt>Light</dt><dd>${light}</dd><dt>Generated in</dt><dd>${8 + (img.length % 7)} seconds</dd>`;
    openDialog(dlg);
  }
  grid.addEventListener('click', e => { const b = e.target.closest('.wk'); if (b) open(+b.dataset.i); });
  $('#viewerPrev').addEventListener('click', () => open(at - 1));
  $('#viewerNext').addEventListener('click', () => open(at + 1));
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') open(at - 1); if (e.key === 'ArrowRight') open(at + 1); });
  $('#viewerUse').addEventListener('click', () => { dlg.close(); usePrompt(shown[at][5]); });
  render();
})();

/* ---------- 05 RESULTS — the numbers count up once seen ---------- */
$$('.bento b[data-count]').forEach(b => onView(b, () => countUp(b, +b.dataset.count, { pre: b.dataset.pre || '', suf: b.dataset.suf || '', dec: +b.dataset.dec || 0, dur: 1400 }), .6));

/* =========================================================
   06 REACH — the dotted globe. Briefs fly between studios as arcs;
   each landing sends a ripple through the land dots.
   ========================================================= */
function globe() {
  const C = [
    ['London', 51.5, -0.1, 'Europe/London', 420], ['New York', 40.7, -74, 'America/New_York', 380], ['San Francisco', 37.7, -122.4, 'America/Los_Angeles', 290],
    ['Toronto', 43.7, -79.4, 'America/Toronto', 160], ['Berlin', 52.5, 13.4, 'Europe/Berlin', 210], ['Dubai', 25.2, 55.3, 'Asia/Dubai', 120],
    ['Karachi', 24.9, 67, 'Asia/Karachi', 140], ['Tokyo', 35.7, 139.7, 'Asia/Tokyo', 120],
  ];
  const el = $('#globe'), cv = $('canvas', el), ctx = cv.getContext('2d'), land = LAND, list = $('#cities');
  const D2R = Math.PI / 180, TILT = 34 * D2R, cT = Math.cos(TILT), sT = Math.sin(TILT);
  const vec = (lat, lng) => { const la = lat * D2R, lo = lng * D2R; return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)]; };
  // land dots as unit vectors, computed once
  const N = land.length / 2, LV = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = vec(land[i * 2] / 10, land[i * 2 + 1] / 10); LV.set(v, i * 3); }
  const CV = C.map(c => vec(c[1], c[2]));
  el.insertAdjacentHTML('beforeend', C.map((c, i) => `<div class="marker" aria-hidden="true"><i style="--d:${i * .3}s"></i><b>${c[0]} · ${c[4]} brands</b></div>`).join(''));
  const mEls = $$('.marker', el);
  const time = tz => new Intl.DateTimeFormat('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date());
  list.innerHTML = C.map((c, i) => `<li><button type="button" aria-pressed="${i === 0}" data-i="${i}"><i></i>${c[0]}<span>${time(c[3])}</span></button></li>`).join('');
  const btns = $$('button', list);
  setInterval(() => btns.forEach((b, i) => $('span', b).textContent = time(C[i][3])), 30000);
  let w = 0, h = 0, rot = 0.1, goal = 0.1, cur = 0, idle = 0, drag = null, Rr = 0, cx = 0, cy = 0, cr = 1, sr = 0;
  const norm = a => ((a % 360) + 540) % 360 - 180;
  function pick(i) {
    cur = i; idle = 0; goal = rot + norm(-C[i][2] - (innerWidth >= 1000 ? 8 : 0) - rot);           // the shortest way round to face this city
    btns.forEach((b, k) => b.setAttribute('aria-pressed', k === i)); mEls.forEach((m, k) => m.classList.toggle('on', k === i));
    flights.push(...C.map((_, k) => k).filter(k => k !== i).sort(() => Math.random() - .5).slice(0, 3).map((k, j) => fly(k, i, j * 220)));
  }
  btns.forEach((b, i) => b.addEventListener('click', () => pick(i)));
  const resize = () => { const dpr = Math.min(devicePixelRatio, 2); w = el.clientWidth; h = el.clientHeight; cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
  // rotate about the axis, tilt toward the viewer, project; d > 0 faces us
  const P = (x, y, z, s = 1) => { const X = x * cr + z * sr, Z = z * cr - x * sr; return [cx + Rr * s * X, cy - Rr * s * (y * cT - Z * sT), y * sT + Z * cT]; };

  // flights: a brief leaves one studio, arcs over the globe, lands at another and ripples
  const flights = [], ripples = [];
  const fly = (a, b, delay = 0) => ({ a: CV[a], b: CV[b], to: b, t0: performance.now() + delay, dur: 1500 + Math.random() * 500, landed: false });
  function slerp(a, b, s) {
    const d = clamp(a[0] * b[0] + a[1] * b[1] + a[2] * b[2], -1, 1), om = Math.acos(d), so = Math.sin(om) || 1;
    const k1 = Math.sin((1 - s) * om) / so, k2 = Math.sin(s * om) / so;
    return [a[0] * k1 + b[0] * k2, a[1] * k1 + b[1] * k2, a[2] * k1 + b[2] * k2, om];
  }

  function draw(now) {
    Rr = Math.min(w * .56, 720); cx = w * (innerWidth >= 1000 ? .56 : .5); cy = Rr * 1.04 + 28; cr = Math.cos(rot * D2R); sr = Math.sin(rot * D2R);
    const css = getComputedStyle(el), dark = root.dataset.theme === 'dark';
    ctx.clearRect(0, 0, w, h);
    // body + a soft rim of the brand light
    const fill = css.getPropertyValue('--globe-fill').trim(), g = ctx.createRadialGradient(cx, cy - Rr * .35, Rr * .2, cx, cy, Rr);
    g.addColorStop(0, fill); g.addColorStop(.85, fill); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, Rr, 0, Math.PI * 2); ctx.fill();
    const rim = ctx.createRadialGradient(cx, cy, Rr * .9, cx, cy, Rr * 1.06);
    rim.addColorStop(0, 'rgba(240,138,142,0)'); rim.addColorStop(.6, dark ? 'rgba(240,138,142,.10)' : 'rgba(240,138,142,.08)'); rim.addColorStop(1, 'rgba(201,195,245,0)');
    ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, Rr * 1.06, 0, Math.PI * 2); ctx.fill();

    // land dots in four depth buckets (one path each), ripple-lit dots on top
    const live = ripples.filter(r => now - r.t0 < 1600);
    ripples.length = 0; ripples.push(...live);
    const buckets = [[], [], [], []], hot = [], base = Rr / 340;
    for (let i = 0; i < N; i++) {
      const x = LV[i * 3], y = LV[i * 3 + 1], z = LV[i * 3 + 2], [px, py, d] = P(x, y, z);
      if (d <= 0 || py > h + 4) continue;
      let lit = 0;
      for (const r of live) { const ang = Math.acos(clamp(x * r.v[0] + y * r.v[1] + z * r.v[2], -1, 1)), ring = (now - r.t0) / 1600 * .55, e = 1 - Math.abs(ang - ring) / .045; if (e > lit) lit = e * (1 - (now - r.t0) / 1600); }
      if (lit > .05) hot.push(px, py, d, lit);
      else buckets[Math.min(3, d * 4 | 0)].push(px, py);
    }
    ctx.fillStyle = css.getPropertyValue('--globe-dot').trim() || '#c4c4c4';
    buckets.forEach((b, k) => {
      ctx.globalAlpha = .35 + .65 * (k + .5) / 4; const r = base * (.5 + .5 * (k + .5) / 4);
      ctx.beginPath(); for (let i = 0; i < b.length; i += 2) { ctx.moveTo(b[i] + r, b[i + 1]); ctx.arc(b[i], b[i + 1], r, 0, 6.2832); } ctx.fill();
    });
    for (let i = 0; i < hot.length; i += 4) { ctx.globalAlpha = Math.min(1, hot[i + 3] * 1.4); ctx.fillStyle = '#f08a8e'; ctx.beginPath(); ctx.arc(hot[i], hot[i + 1], base * 1.5, 0, 6.2832); ctx.fill(); }
    ctx.globalAlpha = 1;

    // flight arcs: a gradient trail with a bright head, lifted off the surface
    for (let f = flights.length - 1; f >= 0; f--) {
      const fl = flights[f], p = (now - fl.t0) / fl.dur;
      if (p < 0) continue;
      if (p >= 1 && !fl.landed) { fl.landed = true; ripples.push({ v: fl.b, t0: now }); }
      if (p > 1.35) { flights.splice(f, 1); continue; }
      const head = clamp(1 - Math.pow(1 - Math.min(p, 1), 2.2)), tail = clamp(head - .4 - Math.max(0, p - 1) * 1.6), steps = 28;
      let prev = null;
      for (let s = 0; s <= steps; s++) {
        const u = tail + (head - tail) * s / steps, [x, y, z, om] = slerp(fl.a, fl.b, u), lift = 1 + Math.sin(Math.PI * u) * (.06 + om * .12), q = P(x, y, z, lift);
        const hidden = q[2] < 0 && Math.hypot(q[0] - cx, q[1] - cy) < Rr;
        if (prev && !hidden && !prev[3]) {
          const c = grad3(s / steps); ctx.strokeStyle = `rgba(${c},${(s / steps) * .95})`; ctx.lineWidth = 1 + 1.6 * s / steps;
          ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
        }
        prev = [q[0], q[1], q[2], hidden];
      }
      if (p < 1 && prev && !prev[3]) { ctx.fillStyle = '#fff'; ctx.shadowColor = '#f08a8e'; ctx.shadowBlur = 12; ctx.beginPath(); ctx.arc(prev[0], prev[1], 2.6, 0, 6.2832); ctx.fill(); ctx.shadowBlur = 0; }
    }

    C.forEach((c, i) => { const v = CV[i], [px, py, d] = P(v[0], v[1], v[2]), show = d > .12 && py < h - 16; mEls[i].style.transform = `translate(${px}px,${py}px)`; mEls[i].style.opacity = show ? Math.min(1, (d - .12) * 5) : 0; });
  }
  const grad3 = t => (t < .5 ? [229 + 11 * t * 2, 72 + 66 * t * 2, 77 + 65 * t * 2] : [240 - 39 * (t - .5) * 2, 138 + 57 * (t - .5) * 2, 142 + 103 * (t - .5) * 2]).map(v => v | 0).join(',');
  resize(); new ResizeObserver(() => { resize(); draw(performance.now()); }).observe(el);
  // drag to spin; it settles back to the chosen city a few seconds after you let go
  cv.addEventListener('pointerdown', e => { drag = { x: e.clientX, r: rot }; cv.setPointerCapture(e.pointerId); });
  cv.addEventListener('pointermove', e => { if (drag) { rot = goal = drag.r + (e.clientX - drag.x) * .3; idle = -3000; } });
  const end = () => drag = null; cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
  let spawn = 0;
  whileVisible(el, dt => {
    if (!drag) rot += (goal - rot) * (RM ? 1 : 1 - Math.exp(-dt / 260));
    idle += dt; if (idle > 5200 && !RM) pick((cur + 1) % C.length);
    spawn += dt; if (spawn > 900 && !RM && flights.length < 7) { spawn = 0; const a = Math.random() * C.length | 0, b = (a + 1 + (Math.random() * (C.length - 1) | 0)) % C.length; flights.push(fly(a, b)); }
    draw(performance.now());
  });
  new MutationObserver(() => draw(performance.now())).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  pick(0); rot = goal; flights.length = 0; draw(performance.now());
  const live = $('#liveN'); let n = 1284; setInterval(() => { n += (Math.random() * 7 | 0) - 2; live.textContent = n.toLocaleString('en-US'); }, 1600);
}

/* =========================================================
   07 USE CASES — the prompt box searches the library
   ========================================================= */
(function useCases() {
  const U = [
    ['Fashion', 'Lookbook', 'Seasonal lookbook in one afternoon', 'A linen two-piece on a model walking through a sunlit olive grove, editorial, 35mm.', ['Shopify', 'Email'], 'Carousel'],
    ['Fashion', 'On-model', 'On-model shots without a model booking', 'Our wool coat on a model on a foggy hillside, diffused light, full length.', ['Shopify', 'Pinterest'], 'Photo'],
    ['Fashion', 'Paid social', 'Street-style ads for every colourway', 'The same hoodie in six colourways, street style, flash at night, 9:16.', ['Meta', 'TikTok'], 'Video'],
    ['Beauty', 'Launch', 'Hero packshots on sculpted plinths', 'A glass serum bottle on a travertine plinth, soft shadow, pastel backdrop.', ['Shopify', 'Google'], 'Photo'],
    ['Beauty', 'Email', 'Texture close-ups for the launch email', 'Macro of a cream swatch on glass, morning light, dewy texture.', ['Email', 'Meta'], 'Photo'],
    ['Beauty', 'Paid social', 'Shade-matched ads for every skin tone', 'The foundation range on twelve models, one per shade, clean studio light.', ['Meta', 'TikTok'], 'Carousel'],
    ['Outdoor', 'Paid social', 'Motion-blur action without the expedition', 'A trail runner on a ridge at dawn, motion blur, wide angle.', ['Meta', 'TikTok'], 'Video'],
    ['Outdoor', 'Catalogue', 'Gear on location, any terrain', 'Our backpack on a mossy rock beside a mountain lake, overcast.', ['Shopify', 'Google'], 'Photo'],
    ['Home', 'Catalogue', 'Furniture placed in real-looking rooms', 'A linen sofa in a quiet living room at dusk, cool window light.', ['Shopify', 'Pinterest'], 'Photo'],
    ['Home', 'Seasonal', 'Holiday sets without moving a sofa', 'The same armchair styled for winter: wool throw, candles, warm lamp light.', ['Email', 'Meta'], 'Carousel'],
    ['Food', 'Packs', 'Appetising packshots, styled to brand', 'Our granola pack on a breakfast table, spilled oats, morning sun.', ['Shopify', 'Google'], 'Photo'],
    ['Food', 'Paid social', 'Recipe reels from a single product shot', 'Hot sauce drizzled over tacos, top-down, bright and saturated, 9:16.', ['TikTok', 'Meta'], 'Video'],
  ];
  const grid = $('#ucGrid'), q = $('#ucQuery'), count = $('#ucCount');
  let ind = '';
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const hi = (s, w) => { if (!w) return esc(s); const i = s.toLowerCase().indexOf(w); return i < 0 ? esc(s) : esc(s.slice(0, i)) + '<mark>' + esc(s.slice(i, i + w.length)) + '</mark>' + esc(s.slice(i + w.length)); };
  function render() {
    const w = q.value.trim().toLowerCase();
    const rows = U.filter(u => (!ind || u[0] === ind) && (!w || u.flat().join(' ').toLowerCase().includes(w)));
    count.textContent = rows.length ? `${rows.length} prompt${rows.length > 1 ? 's' : ''}${w ? ` for “${q.value.trim()}”` : ''} · from a library of 48` : '';
    grid.innerHTML = rows.length ? rows.map((u, i) => `<li class="uc" style="animation-delay:${i * 35}ms">
      <p class="uc-ind"><b>${u[0]}</b>${u[1]} · ${u[5]}</p>
      <div class="uc-main"><small>${hi(u[2], w)}</small><p>${hi(u[3], w)}</p></div>
      <div class="uc-tags">${u[4].map(c => `<span>${hi(c, w)}</span>`).join('')}</div>
      <button type="button" class="uc-use" data-p="${esc(u[3])}">Use prompt${ic('arrow-right', 15)}</button></li>`).join('')
      : `<li class="uc-empty">No prompt matches “${esc(q.value.trim())}” yet. <button type="button" id="ucReset">Show all</button></li>`;
  }
  grid.addEventListener('click', e => {
    if (e.target.closest('#ucReset')) { q.value = ''; setInd(0); return; }
    const b = e.target.closest('.uc-use'); if (b) usePrompt(b.dataset.p);
  });
  const setInd = radio($('#ucInd'), b => { ind = b.dataset.ind; render(); });
  q.addEventListener('input', render);
  q.addEventListener('keydown', e => { if (e.key === 'Escape') { q.value = ''; render(); } });
  $('#ucClear').addEventListener('click', () => { q.value = ''; render(); q.focus(); });
  // "/" jumps to the search
  addEventListener('keydown', e => {
    if (e.key !== '/' || /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName)) return;
    e.preventDefault(); goTo('#uses'); setTimeout(() => q.focus({ preventScroll: true }), 700);
  });
  render();
})();

/* =========================================================
   08 PRICING — slide the monthly volume; the plan that fits glows, savings count
   ========================================================= */
(function pricing() {
  const inp = $('#planIn'), plans = $$('.plan'), seg = $('#billing'), movePill = segPill(seg), save = $('#roiSave');
  const st = { v: 400, b: 'm' };
  const rec = v => v <= 200 ? 'starter' : v <= 1500 ? 'growth' : 'studio';
  function update(first) {
    st.v = +inp.value; inp.style.setProperty('--p', (st.v - inp.min) / (inp.max - inp.min) * 100 + '%');
    $('#planN').textContent = st.v.toLocaleString('en-US');
    const r = rec(st.v);
    plans.forEach(p => {
      const on = p.dataset.plan === r, price = +p.dataset[st.b];
      p.classList.toggle('rec', on);
      countUp($('.plan-price span', p), price, { dur: 500 });
      $('.plan-price small', p).textContent = st.b === 'y' ? '/ month, billed yearly' : '/ month';
      Object.assign($('.btn', p).dataset, { billing: st.b === 'y' ? 'yearly' : 'monthly', images: st.v });
      if (on) { $('#planRecName').textContent = $('h3', p).textContent; countUp(save, (120 * st.v - price) * 12, { fmt: euro, dur: first ? 0 : 450 }); }
    });
  }
  plans.forEach(p => $('.plan-price span', p)._v = +p.dataset.m);
  inp.addEventListener('input', () => update());
  radio(seg, b => { st.b = b.dataset.b; movePill(); update(); });
  update(true);
})();


/* =========================================================
   10 FAQ — tap a question and Northform types the answer
   ========================================================= */
(function chat() {
  const F = [
    ['Do the images look like my actual products?', 'Yes. Upload a few photos of each product and Northform learns its shape, colour and materials — labels, stitching and all. Every scene keeps the real item.', 'product real look like accurate same match'],
    ['Can I use the images commercially?', 'Every plan includes full commercial rights for ads, product pages, packaging and print. You own what you generate.', 'commercial rights own license use legal copyright'],
    ['How does it stay on-brand?', 'Brand kits hold your colours, type, light and banned styles. Every prompt is checked against the kit before it renders.', 'brand kit colours style consistent'],
    ['Which channels can I publish to?', 'Shopify, Meta, TikTok, Google and Pinterest are one click away. Anything else gets a clean export in the right size and format.', 'channels publish shopify meta tiktok google pinterest export'],
    ['Is there a free trial?', 'Start free with 25 generations, no card required. Upgrade only when you’re ready to publish.', 'free trial cost price card try'],
    ['How much does it cost?', 'Starter is €29 a month, Growth €99 and Studio €299 — 20% less if you pay yearly. The plan builder above picks one for you.', 'price pricing cost plan much money pay'],
    ['Can my team work with me?', 'Invite as many teammates as you like. Studio adds roles, approval steps and separate workspaces per brand.', 'team agency invite collaborate approvals roles'],
  ];
  const log = $('#chatLog'), sugg = $('#chatSugg'), form = $('#chatForm'), inp = $('#chatIn');
  sugg.innerHTML = F.map((f, i) => `<button type="button" class="q" data-i="${i}">${f[0]}${ic('plus', 16)}</button>`).join('');
  let busy = false;
  const scroll = () => log.scrollTo({ top: log.scrollHeight, behavior: RM ? 'auto' : 'smooth' });
  const bubble = (who, text) => { const m = document.createElement('div'); m.className = 'msg ' + who; if (text) m.textContent = text; log.append(m); scroll(); return m; };
  function reply(text) {
    const m = bubble('nf'); m.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>'; scroll(); busy = true;
    setTimeout(() => typeInto(m, text, 12, () => { busy = false; if (/hello@/.test(text)) m.innerHTML = text.replace('hello@northform.ai', '<a href="mailto:hello@northform.ai">hello@northform.ai</a>'); scroll(); }), RM ? 0 : 750);
    const iv = setInterval(() => { scroll(); if (!busy) clearInterval(iv); }, 120);
  }
  function ask(q, i) {
    if (busy) return; bubble('me', q);
    if (i == null) {                                                   // typed: find the closest question by shared words
      const words = q.toLowerCase().match(/[a-z]+/g) || [];
      let best = -1, score = 0;
      F.forEach((f, k) => { const s = words.filter(w => w.length > 2 && (f[2] + ' ' + f[0].toLowerCase()).includes(w)).length; if (s > score) { score = s; best = k; } });
      i = best;
    }
    if (i >= 0) $(`[data-i="${i}"]`, sugg)?.classList.add('asked');
    reply(i >= 0 ? F[i][1] : 'Good question — I don’t have that one yet. Write to hello@northform.ai and a person will answer within a day.');
  }
  sugg.addEventListener('click', e => { const b = e.target.closest('.q'); if (b) ask(F[+b.dataset.i][0], +b.dataset.i); });
  form.addEventListener('submit', e => { e.preventDefault(); const v = inp.value.trim(); if (!v) return inp.focus(); inp.value = ''; ask(v); });
  bubble('nf', 'Hi — I’m the Northform helper. Ask me about shoots, pricing, rights or channels.');
})();

/* =========================================================
   11 CTA — suggestions fill the box; submitting "generates" four takes first
   ========================================================= */
(function cta() {
  const form = $('#ctaForm'), ta = $('#prompt-input'), box = form.closest('.prompt'), gen = $('#gen'), tiles = $$('#gen i'), cap = $('#genCap');
  const refIn = $('#refIn'), chip = $('#refChip');
  const POOL = ['fashion-green', 'fashion-red', 'serum', 'sneaker', 'perfume', 'watch', 'surf', 'model-orange', 'lipstick', 'headphones'];
  $$('#ctaSugg .chip').forEach(c => c.addEventListener('click', () => { ta.value = c.textContent + ', soft natural light, editorial.'; ta.focus(); box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 600); }));
  ta.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
  form.addEventListener('submit', e => {
    e.preventDefault(); const v = ta.value.trim();
    if (!v) { ta.focus(); box.classList.add('flash'); setTimeout(() => box.classList.remove('flash'), 700); ta.placeholder = 'Describe the shot first — any product, any light.'; return; }
    const done = () => signup({ prompt: v, ref: refIn.files[0]?.name });
    if (RM) return done();
    gen.hidden = false; cap.textContent = 'Generating 4 takes…';
    tiles.forEach(t => { t.classList.remove('done'); t.style.backgroundImage = ''; });
    const picks = [...POOL].sort(() => Math.random() - .5).slice(0, 4);
    tiles.forEach((t, i) => setTimeout(() => { t.style.backgroundImage = `url(img/${picks[i]}.webp)`; t.classList.add('done'); }, 650 + i * 380));
    setTimeout(() => cap.textContent = '4 takes ready — opening your studio…', 650 + 4 * 380);
    setTimeout(done, 650 + 4 * 380 + 1100);
  });
  refIn.addEventListener('change', () => {
    const file = refIn.files[0]; if (!file) return;
    $('#refImg').src = URL.createObjectURL(file); $('#refName').textContent = file.name.length > 26 ? file.name.slice(0, 24) + '…' : file.name; chip.hidden = false;
  });
  $('#refX').addEventListener('click', () => { refIn.value = ''; chip.hidden = true; });
})();

/* ---------- newsletter ---------- */
$('#news').addEventListener('submit', e => {
  e.preventDefault();
  const input = $('#newsletter'), note = $('#newsNote'), b = $('button', e.target);
  if (!input.checkValidity()) { note.textContent = 'That email doesn’t look right — try again.'; note.classList.add('err'); input.focus(); return; }
  $('span', b).textContent = 'Subscribed'; $('.i', b)?.remove(); input.disabled = b.disabled = true;
  note.classList.remove('err'); note.textContent = 'Thanks — the next issue lands on Thursday.';
});

/* ---------- globe land dots: [lat×10, lng×10, …] pairs (1.5° rows); last so the code above stays readable ---------- */
const LAND = [-550,-704,-550,-678,-535,-717,-535,-692,-520,-730,-520,-705,-520,-608,-505,-741,-505,-718,-505,-694,-490,-745,-490,-722,-490,-699,-490,-676,-490,699,-475,-733,-475,-711,-475,-689,-475,-667,-460,-744,-460,-722,-460,-701,-460,-679,-460,1671,-460,1692,-445,-726,-445,-705,-445,-684,-445,-663,-445,1695,-430,-736,-430,-716,-430,-695,-430,-675,-430,-655,-430,1473,-430,1718,-415,-720,-415,-700,-415,-680,-415,-660,-415,1460,-415,1480,-415,1720,-415,1740,-400,-724,-400,-704,-400,-685,-400,-665,-400,-646,-400,-626,-400,1761,-385,-728,-385,-709,-385,-689,-385,-670,-385,-651,-385,-632,-385,-613,-385,-594,-385,1436,-385,1455,-385,1762,-385,1781,-370,-712,-370,-694,-370,-675,-370,-656,-370,-637,-370,-619,-370,-600,-370,-581,-370,1406,-370,1425,-370,1444,-370,1463,-370,1481,-355,-711,-355,-692,-355,-674,-355,-655,-355,-637,-355,-618,-355,-600,-355,-582,-355,1394,-355,1412,-355,1431,-355,1449,-355,1468,-355,1486,-355,1505,-340,-715,-340,-696,-340,-678,-340,-660,-340,-642,-340,-624,-340,-606,-340,-588,-340,-570,-340,-552,-340,190,-340,208,-340,1167,-340,1185,-340,1384,-340,1402,-340,1420,-340,1438,-340,1456,-340,1474,-340,1492,-340,1511,-325,-713,-325,-695,-325,-677,-325,-659,-325,-642,-325,-624,-325,-606,-325,-588,-325,-570,-325,-552,-325,-535,-325,196,-325,214,-325,232,-325,250,-325,267,-325,285,-325,1158,-325,1176,-325,1194,-325,1212,-325,1230,-325,1248,-325,1354,-325,1372,-325,1390,-325,1408,-325,1426,-325,1444,-325,1461,-325,1479,-325,1497,-325,1515,-310,-717,-310,-699,-310,-682,-310,-664,-310,-647,-310,-629,-310,-612,-310,-594,-310,-577,-310,-559,-310,-542,-310,-524,-310,192,-310,210,-310,227,-310,245,-310,262,-310,280,-310,297,-310,1171,-310,1188,-310,1206,-310,1223,-310,1241,-310,1258,-310,1276,-310,1293,-310,1311,-310,1328,-310,1346,-310,1363,-310,1381,-310,1398,-310,1416,-310,1433,-310,1450,-310,1468,-310,1485,-310,1503,-310,1520,-295,-698,-295,-680,-295,-663,-295,-646,-295,-629,-295,-611,-295,-594,-295,-577,-295,-560,-295,-543,-295,-525,-295,-508,-295,181,-295,198,-295,215,-295,233,-295,250,-295,267,-295,284,-295,301,-295,1163,-295,1180,-295,1197,-295,1214,-295,1232,-295,1249,-295,1266,-295,1283,-295,1300,-295,1318,-295,1335,-295,1352,-295,1369,-295,1387,-295,1404,-295,1421,-295,1438,-295,1456,-295,1473,-295,1490,-295,1507,-295,1524,-280,-696,-280,-679,-280,-662,-280,-645,-280,-628,-280,-611,-280,-594,-280,-577,-280,-560,-280,-543,-280,-526,-280,-509,-280,-492,-280,170,-280,187,-280,204,-280,221,-280,238,-280,255,-280,272,-280,289,-280,306,-280,323,-280,1155,-280,1172,-280,1189,-280,1206,-280,1223,-280,1240,-280,1257,-280,1274,-280,1291,-280,1308,-280,1325,-280,1342,-280,1358,-280,1375,-280,1392,-280,1409,-280,1426,-280,1443,-280,1460,-280,1477,-280,1494,-280,1511,-280,1528,-265,-695,-265,-678,-265,-661,-265,-645,-265,-628,-265,-611,-265,-594,-265,-578,-265,-561,-265,-544,-265,-527,-265,-511,-265,-494,-265,159,-265,176,-265,193,-265,209,-265,226,-265,243,-265,260,-265,276,-265,293,-265,310,-265,327,-265,1147,-265,1164,-265,1180,-265,1197,-265,1214,-265,1231,-265,1247,-265,1264,-265,1281,-265,1298,-265,1314,-265,1331,-265,1348,-265,1365,-265,1381,-265,1398,-265,1415,-265,1432,-265,1448,-265,1465,-265,1482,-265,1499,-265,1515,-250,-694,-250,-677,-250,-661,-250,-644,-250,-628,-250,-611,-250,-594,-250,-578,-250,-561,-250,-545,-250,-528,-250,-512,-250,-495,-250,-479,-250,149,-250,165,-250,182,-250,198,-250,215,-250,231,-250,248,-250,264,-250,281,-250,297,-250,314,-250,330,-250,446,-250,462,-250,1139,-250,1156,-250,1172,-250,1189,-250,1206,-250,1222,-250,1239,-250,1255,-250,1272,-250,1288,-250,1305,-250,1321,-250,1338,-250,1354,-250,1371,-250,1387,-250,1404,-250,1420,-250,1437,-250,1453,-250,1470,-250,1486,-250,1503,-250,1519,-235,-704,-235,-687,-235,-671,-235,-655,-235,-638,-235,-622,-235,-605,-235,-589,-235,-573,-235,-556,-235,-540,-235,-524,-235,-507,-235,-491,-235,-475,-235,-458,-235,147,-235,164,-235,180,-235,196,-235,213,-235,229,-235,245,-235,262,-235,278,-235,295,-235,311,-235,327,-235,344,-235,442,-235,458,-235,475,-235,1145,-235,1162,-235,1178,-235,1195,-235,1211,-235,1227,-235,1244,-235,1260,-235,1276,-235,1293,-235,1309,-235,1325,-235,1342,-235,1358,-235,1375,-235,1391,-235,1407,-235,1424,-235,1440,-235,1456,-235,1473,-235,1489,-235,1505,-220,-686,-220,-670,-220,-654,-220,-638,-220,-622,-220,-605,-220,-589,-220,-573,-220,-557,-220,-541,-220,-525,-220,-509,-220,-492,-220,-476,-220,-460,-220,-444,-220,-428,-220,-412,-220,153,-220,170,-220,186,-220,202,-220,218,-220,234,-220,250,-220,266,-220,283,-220,299,-220,315,-220,331,-220,347,-220,444,-220,460,-220,476,-220,1154,-220,1170,-220,1187,-220,1203,-220,1219,-220,1235,-220,1251,-220,1267,-220,1283,-220,1300,-220,1316,-220,1332,-220,1348,-220,1364,-220,1380,-220,1396,-220,1413,-220,1429,-220,1445,-220,1461,-220,1477,-220,1493,-205,-696,-205,-680,-205,-664,-205,-648,-205,-632,-205,-616,-205,-600,-205,-584,-205,-568,-205,-552,-205,-536,-205,-520,-205,-504,-205,-488,-205,-472,-205,-456,-205,-440,-205,-424,-205,-408,-205,136,-205,152,-205,168,-205,184,-205,200,-205,216,-205,232,-205,248,-205,264,-205,280,-205,296,-205,312,-205,328,-205,344,-205,456,-205,472,-205,1192,-205,1208,-205,1224,-205,1240,-205,1256,-205,1272,-205,1288,-205,1304,-205,1320,-205,1336,-205,1352,-205,1368,-205,1384,-205,1400,-205,1416,-205,1432,-205,1448,-205,1464,-205,1480,-190,-690,-190,-674,-190,-658,-190,-642,-190,-626,-190,-611,-190,-595,-190,-579,-190,-563,-190,-547,-190,-531,-190,-515,-190,-500,-190,-484,-190,-468,-190,-452,-190,-436,-190,-420,-190,-404,-190,135,-190,151,-190,167,-190,182,-190,198,-190,214,-190,230,-190,246,-190,262,-190,278,-190,293,-190,309,-190,325,-190,341,-190,357,-190,452,-190,468,-190,484,-190,1229,-190,1245,-190,1261,-190,1277,-190,1293,-190,1308,-190,1324,-190,1340,-190,1356,-190,1372,-190,1388,-190,1404,-190,1419,-190,1435,-190,1451,-175,-700,-175,-684,-175,-668,-175,-652,-175,-637,-175,-621,-175,-605,-175,-590,-175,-574,-175,-558,-175,-542,-175,-527,-175,-511,-175,-495,-175,-479,-175,-464,-175,-448,-175,-432,-175,-417,-175,-401,-175,118,-175,134,-175,149,-175,165,-175,181,-175,197,-175,212,-175,228,-175,244,-175,259,-175,275,-175,291,-175,307,-175,322,-175,338,-175,354,-175,369,-175,448,-175,464,-175,479,-175,1234,-175,1250,-175,1266,-175,1281,-175,1297,-175,1313,-175,1328,-175,1344,-175,1360,-175,1376,-175,1391,-175,1407,-175,1423,-175,1438,-175,1454,-175,1784,-160,-740,-160,-725,-160,-709,-160,-694,-160,-678,-160,-662,-160,-647,-160,-631,-160,-616,-160,-600,-160,-584,-160,-569,-160,-553,-160,-538,-160,-522,-160,-506,-160,-491,-160,-475,-160,-460,-160,-444,-160,-429,-160,-413,-160,-397,-160,132,-160,148,-160,164,-160,179,-160,195,-160,210,-160,226,-160,242,-160,257,-160,273,-160,288,-160,304,-160,319,-160,335,-160,351,-160,366,-160,382,-160,397,-160,460,-160,475,-160,491,-160,1255,-160,1270,-160,1286,-160,1301,-160,1317,-160,1332,-160,1348,-160,1364,-160,1426,-160,1442,-145,-760,-145,-745,-145,-729,-145,-714,-145,-698,-145,-683,-145,-667,-145,-652,-145,-636,-145,-621,-145,-605,-145,-590,-145,-574,-145,-559,-145,-543,-145,-528,-145,-512,-145,-497,-145,-481,-145,-466,-145,-450,-145,-434,-145,-419,-145,-403,-145,124,-145,140,-145,155,-145,171,-145,186,-145,202,-145,217,-145,233,-145,248,-145,264,-145,279,-145,295,-145,310,-145,326,-145,341,-145,357,-145,372,-145,388,-145,403,-145,481,-145,497,-145,1257,-145,1272,-145,1303,-145,1319,-145,1334,-145,1350,-145,1428,-145,1443,-130,-754,-130,-738,-130,-723,-130,-708,-130,-692,-130,-677,-130,-662,-130,-646,-130,-631,-130,-615,-130,-600,-130,-585,-130,-569,-130,-554,-130,-538,-130,-523,-130,-508,-130,-492,-130,-477,-130,-462,-130,-446,-130,-431,-130,-415,-130,-400,-130,-385,-130,138,-130,154,-130,169,-130,185,-130,200,-130,215,-130,231,-130,246,-130,262,-130,277,-130,292,-130,308,-130,323,-130,338,-130,354,-130,369,-130,385,-130,400,-130,492,-130,1308,-130,1323,-130,1338,-130,1354,-130,1431,-115,-774,-115,-758,-115,-743,-115,-728,-115,-712,-115,-697,-115,-682,-115,-666,-115,-651,-115,-636,-115,-620,-115,-605,-115,-590,-115,-574,-115,-559,-115,-544,-115,-529,-115,-513,-115,-498,-115,-483,-115,-467,-115,-452,-115,-437,-115,-421,-115,-406,-115,-391,-115,-375,-115,146,-115,161,-115,176,-115,191,-115,207,-115,222,-115,237,-115,253,-115,268,-115,283,-115,299,-115,314,-115,329,-115,345,-115,360,-115,375,-115,391,-115,1325,-100,-778,-100,-763,-100,-747,-100,-732,-100,-717,-100,-702,-100,-686,-100,-671,-100,-656,-100,-641,-100,-625,-100,-610,-100,-595,-100,-580,-100,-564,-100,-549,-100,-534,-100,-519,-100,-503,-100,-488,-100,-473,-100,-458,-100,-442,-100,-427,-100,-412,-100,-397,-100,-381,-100,-366,-100,137,-100,153,-100,168,-100,183,-100,198,-100,214,-100,229,-100,244,-100,259,-100,275,-100,290,-100,305,-100,320,-100,336,-100,351,-100,366,-100,381,-100,397,-100,1205,-100,1236,-100,1480,-100,1495,-85,-782,-85,-767,-85,-752,-85,-737,-85,-722,-85,-706,-85,-691,-85,-676,-85,-661,-85,-646,-85,-630,-85,-615,-85,-600,-85,-585,-85,-570,-85,-554,-85,-539,-85,-524,-85,-509,-85,-494,-85,-478,-85,-463,-85,-448,-85,-433,-85,-418,-85,-403,-85,-387,-85,-372,-85,-357,-85,144,-85,159,-85,175,-85,190,-85,205,-85,220,-85,235,-85,251,-85,266,-85,281,-85,296,-85,311,-85,327,-85,342,-85,357,-85,372,-85,387,-85,1147,-85,1177,-85,1208,-85,1223,-85,1268,-85,1405,-85,1420,-85,1466,-85,1481,-70,-787,-70,-771,-70,-756,-70,-741,-70,-726,-70,-711,-70,-696,-70,-681,-70,-666,-70,-650,-70,-635,-70,-620,-70,-605,-70,-590,-70,-575,-70,-560,-70,-545,-70,-529,-70,-514,-70,-499,-70,-484,-70,-469,-70,-454,-70,-439,-70,-424,-70,-408,-70,-393,-70,-378,-70,-363,-70,136,-70,151,-70,166,-70,182,-70,197,-70,212,-70,227,-70,242,-70,257,-70,272,-70,287,-70,303,-70,318,-70,333,-70,348,-70,363,-70,378,-70,393,-70,1074,-70,1089,-70,1104,-70,1119,-70,1392,-70,1407,-70,1422,-70,1437,-70,1452,-70,1467,-55,-806,-55,-791,-55,-776,-55,-761,-55,-746,-55,-731,-55,-715,-55,-700,-55,-685,-55,-670,-55,-655,-55,-640,-55,-625,-55,-610,-55,-595,-55,-580,-55,-565,-55,-550,-55,-535,-55,-520,-55,-505,-55,-490,-55,-474,-55,-459,-55,-444,-55,-429,-55,-414,-55,-399,-55,-384,-55,-369,-55,-354,-55,128,-55,143,-55,158,-55,173,-55,188,-55,203,-55,218,-55,233,-55,249,-55,264,-55,279,-55,294,-55,309,-55,324,-55,339,-55,354,-55,369,-55,384,-55,1047,-55,1197,-55,1228,-55,1393,-55,1408,-55,1423,-55,1438,-55,1454,-55,1499,-55,1514,-40,-806,-40,-791,-40,-776,-40,-761,-40,-746,-40,-731,-40,-715,-40,-700,-40,-685,-40,-670,-40,-655,-40,-640,-40,-625,-40,-610,-40,-595,-40,-580,-40,-565,-40,-550,-40,-535,-40,-520,-40,-505,-40,-490,-40,-474,-40,-459,-40,-444,-40,-429,-40,-414,-40,-399,-40,-384,-40,113,-40,128,-40,143,-40,158,-40,173,-40,188,-40,203,-40,218,-40,233,-40,249,-40,264,-40,279,-40,294,-40,309,-40,324,-40,339,-40,354,-40,369,-40,384,-40,1032,-40,1047,-40,1197,-40,1333,-40,1348,-40,1363,-40,1378,-40,1393,-40,1408,-40,1423,-40,1438,-40,1529,-25,-795,-25,-780,-25,-765,-25,-750,-25,-735,-25,-720,-25,-705,-25,-690,-25,-675,-25,-660,-25,-645,-25,-630,-25,-615,-25,-600,-25,-585,-25,-570,-25,-555,-25,-540,-25,-525,-25,-510,-25,-495,-25,-480,-25,-465,-25,-450,-25,-435,-25,105,-25,120,-25,135,-25,150,-25,165,-25,180,-25,195,-25,210,-25,225,-25,240,-25,255,-25,270,-25,285,-25,300,-25,315,-25,330,-25,345,-25,360,-25,375,-25,390,-25,405,-25,1020,-25,1035,-25,1050,-25,1110,-25,1125,-25,1140,-25,1155,-25,1200,-25,1215,-25,1335,-25,1365,-25,1380,-25,1395,-10,-795,-10,-780,-10,-765,-10,-750,-10,-735,-10,-720,-10,-705,-10,-690,-10,-675,-10,-660,-10,-645,-10,-630,-10,-615,-10,-600,-10,-585,-10,-570,-10,-555,-10,-540,-10,-525,-10,-510,-10,-495,-10,-480,-10,-465,-10,90,-10,105,-10,120,-10,135,-10,150,-10,165,-10,180,-10,195,-10,210,-10,225,-10,240,-10,255,-10,270,-10,285,-10,300,-10,315,-10,330,-10,345,-10,360,-10,375,-10,390,-10,405,-10,420,-10,1005,-10,1020,-10,1035,-10,1095,-10,1110,-10,1125,-10,1140,-10,1155,-10,1170,-10,1200,-10,1215,-10,1320,-10,1335,5,-795,5,-780,5,-765,5,-750,5,-735,5,-720,5,-705,5,-690,5,-675,5,-660,5,-645,5,-630,5,-615,5,-600,5,-585,5,-570,5,-555,5,-540,5,-525,5,-510,5,105,5,120,5,135,5,150,5,165,5,180,5,195,5,210,5,225,5,240,5,255,5,270,5,285,5,300,5,315,5,330,5,345,5,360,5,375,5,390,5,405,5,420,5,1005,5,1020,5,1095,5,1110,5,1125,5,1140,5,1155,5,1170,5,1215,5,1230,20,-780,20,-765,20,-750,20,-735,20,-720,20,-705,20,-690,20,-675,20,-660,20,-645,20,-630,20,-615,20,-600,20,-585,20,-570,20,-555,20,-540,20,-525,20,-510,20,105,20,120,20,135,20,150,20,165,20,180,20,195,20,210,20,225,20,240,20,255,20,270,20,285,20,300,20,315,20,330,20,345,20,360,20,375,20,390,20,405,20,420,20,435,20,450,20,990,20,1005,20,1035,20,1125,20,1140,20,1155,20,1170,35,-765,35,-750,35,-735,35,-720,35,-705,35,-690,35,-675,35,-660,35,-645,35,-630,35,-615,35,-600,35,-585,35,-570,35,-555,35,-540,35,-525,35,105,35,120,35,135,35,150,35,165,35,180,35,195,35,210,35,225,35,240,35,255,35,270,35,285,35,300,35,315,35,330,35,345,35,360,35,375,35,390,35,405,35,420,35,435,35,450,35,465,35,975,35,990,35,1020,35,1140,35,1155,35,1170,50,-761,50,-746,50,-731,50,-715,50,-700,50,-685,50,-670,50,-655,50,-640,50,-625,50,-610,50,-595,50,-580,50,-565,50,-550,50,-535,50,-83,50,-68,50,-23,50,68,50,83,50,98,50,113,50,128,50,143,50,158,50,173,50,188,50,203,50,218,50,233,50,249,50,264,50,279,50,294,50,309,50,324,50,339,50,354,50,369,50,384,50,399,50,414,50,429,50,444,50,459,50,474,50,956,50,972,50,1017,50,1032,50,1152,50,1167,50,1182,65,-771,65,-756,65,-741,65,-726,65,-711,65,-696,65,-681,65,-666,65,-650,65,-635,65,-620,65,-605,65,-590,65,-106,65,-91,65,-76,65,-61,65,-45,65,-30,65,-15,65,0,65,15,65,30,65,45,65,61,65,76,65,91,65,106,65,121,65,136,65,151,65,166,65,182,65,197,65,212,65,227,65,242,65,257,65,272,65,287,65,303,65,318,65,333,65,348,65,363,65,378,65,393,65,408,65,424,65,439,65,454,65,469,65,484,65,802,65,1013,65,1165,80,-771,80,-756,80,-741,80,-726,80,-711,80,-696,80,-681,80,-666,80,-650,80,-635,80,-620,80,-605,80,-121,80,-106,80,-91,80,-76,80,-61,80,-45,80,-30,80,-15,80,0,80,15,80,30,80,45,80,61,80,76,80,91,80,106,80,121,80,136,80,151,80,166,80,182,80,197,80,212,80,227,80,242,80,257,80,272,80,287,80,303,80,318,80,333,80,348,80,363,80,378,80,393,80,408,80,424,80,439,80,454,80,469,80,484,80,499,80,802,80,983,80,998,80,1225,80,1240,80,1255,95,-843,95,-828,95,-752,95,-737,95,-722,95,-706,95,-691,95,-676,95,-661,95,-646,95,-630,95,-615,95,-129,95,-114,95,-99,95,-84,95,-68,95,-53,95,-38,95,-23,95,-8,95,8,95,23,95,38,95,53,95,68,95,84,95,99,95,114,95,129,95,144,95,159,95,175,95,190,95,205,95,220,95,235,95,251,95,266,95,281,95,296,95,311,95,327,95,342,95,357,95,372,95,387,95,403,95,418,95,433,95,448,95,463,95,478,95,494,95,767,95,782,95,1056,110,-854,110,-839,110,-747,110,-732,110,-717,110,-702,110,-686,110,-137,110,-122,110,-107,110,-92,110,-76,110,-61,110,-46,110,-31,110,-15,110,0,110,15,110,31,110,46,110,61,110,76,110,92,110,107,110,122,110,137,110,153,110,168,110,183,110,198,110,214,110,229,110,244,110,259,110,275,110,290,110,305,110,320,110,336,110,351,110,366,110,381,110,397,110,412,110,427,110,473,110,488,110,503,110,763,110,778,110,793,110,992,110,1037,110,1053,110,1068,110,1083,110,1220,125,-862,125,-846,125,-154,125,-138,125,-123,125,-108,125,-92,125,-77,125,-62,125,-46,125,-31,125,-15,125,0,125,15,125,31,125,46,125,62,125,77,125,92,125,108,125,123,125,138,125,154,125,169,125,185,125,200,125,215,125,231,125,246,125,262,125,277,125,292,125,308,125,323,125,338,125,354,125,369,125,385,125,400,125,415,125,431,125,754,125,769,125,785,125,800,125,1000,125,1031,125,1046,125,1062,125,1077,125,1092,125,1246,140,-904,140,-888,140,-873,140,-858,140,-842,140,-162,140,-147,140,-131,140,-116,140,-100,140,-85,140,-70,140,-54,140,-39,140,-23,140,-8,140,8,140,23,140,39,140,54,140,70,140,85,140,100,140,116,140,131,140,147,140,162,140,178,140,193,140,209,140,224,140,239,140,255,140,270,140,286,140,301,140,317,140,332,140,348,140,363,140,379,140,394,140,409,140,440,140,456,140,471,140,749,140,765,140,780,140,796,140,981,140,997,140,1012,140,1027,140,1043,140,1058,140,1074,140,1089,140,1213,140,1228,155,-927,155,-912,155,-896,155,-881,155,-865,155,-849,155,-164,155,-148,155,-132,155,-117,155,-101,155,-86,155,-70,155,-55,155,-39,155,-23,155,-8,155,8,155,23,155,39,155,55,155,70,155,86,155,101,155,117,155,132,155,148,155,164,155,179,155,195,155,210,155,226,155,242,155,257,155,273,155,288,155,304,155,319,155,335,155,351,155,366,155,382,155,397,155,429,155,444,155,460,155,475,155,491,155,506,155,740,155,756,155,771,155,787,155,990,155,1005,155,1021,155,1036,155,1052,155,1068,155,1083,155,1208,170,-1002,170,-986,170,-970,170,-955,170,-939,170,-923,170,-908,170,-892,170,-157,170,-141,170,-125,170,-110,170,-94,170,-78,170,-63,170,-47,170,-31,170,-16,170,0,170,16,170,31,170,47,170,63,170,78,170,94,170,110,170,125,170,141,170,157,170,172,170,188,170,203,170,219,170,235,170,250,170,266,170,282,170,297,170,313,170,329,170,344,170,360,170,376,170,438,170,454,170,470,170,485,170,501,170,517,170,532,170,548,170,736,170,751,170,767,170,783,170,798,170,814,170,955,170,970,170,986,170,1002,170,1017,170,1033,170,1049,170,1064,170,1205,170,1221,185,-1026,185,-1011,185,-995,185,-979,185,-963,185,-916,185,-900,185,-884,185,-742,185,-711,185,-695,185,-663,185,-158,185,-142,185,-126,185,-111,185,-95,185,-79,185,-63,185,-47,185,-32,185,-16,185,0,185,16,185,32,185,47,185,63,185,79,185,95,185,111,185,126,185,142,185,158,185,174,185,189,185,205,185,221,185,237,185,253,185,268,185,284,185,300,185,316,185,332,185,347,185,363,185,426,185,442,185,458,185,474,185,489,185,505,185,521,185,537,185,553,185,742,185,758,185,774,185,789,185,805,185,821,185,837,185,947,185,963,185,979,185,995,185,1011,185,1026,185,1042,185,1058,185,1089,200,-1051,200,-1035,200,-1019,200,-1004,200,-988,200,-972,200,-892,200,-876,200,-765,200,-749,200,-159,200,-143,200,-127,200,-112,200,-96,200,-80,200,-64,200,-48,200,-32,200,-16,200,0,200,16,200,32,200,48,200,64,200,80,200,96,200,112,200,127,200,143,200,159,200,175,200,191,200,207,200,223,200,239,200,255,200,271,200,287,200,303,200,319,200,335,200,350,200,366,200,414,200,430,200,446,200,462,200,478,200,494,200,510,200,526,200,542,200,558,200,573,200,733,200,749,200,765,200,781,200,796,200,812,200,828,200,844,200,860,200,940,200,956,200,972,200,988,200,1004,200,1019,200,1035,200,1051,200,1099,215,-1041,215,-1025,215,-1009,215,-993,215,-977,215,-783,215,-170,215,-153,215,-137,215,-121,215,-105,215,-89,215,-73,215,-57,215,-40,215,-24,215,-8,215,8,215,24,215,40,215,57,215,73,215,89,215,105,215,121,215,137,215,153,215,170,215,186,215,202,215,218,215,234,215,250,215,266,215,283,215,299,215,315,215,331,215,347,215,363,215,396,215,412,215,428,215,444,215,460,215,476,215,492,215,509,215,525,215,541,215,557,215,573,215,589,215,702,215,718,215,735,215,751,215,767,215,783,215,799,215,815,215,831,215,848,215,864,215,928,215,944,215,961,215,977,215,993,215,1009,215,1025,215,1041,215,1057,215,1074,215,1106,230,-1100,230,-1051,230,-1034,230,-1018,230,-1002,230,-986,230,-823,230,-806,230,-155,230,-138,230,-122,230,-106,230,-90,230,-73,230,-57,230,-41,230,-24,230,-8,230,8,230,24,230,41,230,57,230,73,230,90,230,106,230,122,230,138,230,155,230,171,230,187,230,204,230,220,230,236,230,252,230,269,230,285,230,301,230,318,230,334,230,350,230,399,230,415,230,432,230,448,230,464,230,481,230,497,230,513,230,529,230,546,230,562,230,578,230,692,230,709,230,725,230,741,230,757,230,774,230,790,230,806,230,823,230,839,230,855,230,871,230,888,230,904,230,920,230,937,230,953,230,969,230,986,230,1002,230,1018,230,1034,230,1051,230,1067,230,1083,230,1100,230,1116,230,1132,230,1148,245,-1073,245,-1057,245,-1040,245,-1024,245,-1007,245,-991,245,-776,245,-149,245,-132,245,-116,245,-99,245,-83,245,-66,245,-50,245,-33,245,-17,245,0,245,17,245,33,245,50,245,66,245,83,245,99,245,116,245,132,245,149,245,165,245,182,245,198,245,215,245,231,245,248,245,264,245,281,245,297,245,314,245,330,245,347,245,380,245,396,245,413,245,429,245,446,245,462,245,479,245,495,245,512,245,545,245,561,245,677,245,694,245,710,245,727,245,743,245,760,245,776,245,793,245,809,245,826,245,842,245,859,245,875,245,892,245,908,245,925,245,941,245,958,245,974,245,991,245,1007,245,1024,245,1040,245,1057,245,1073,245,1090,245,1106,245,1123,245,1139,245,1156,245,1172,260,-1117,260,-1083,260,-1067,260,-1050,260,-1033,260,-1017,260,-1000,260,-983,260,-817,260,-133,260,-117,260,-100,260,-83,260,-67,260,-50,260,-33,260,-17,260,0,260,17,260,33,260,50,260,67,260,83,260,100,260,117,260,133,260,150,260,167,260,183,260,200,260,217,260,233,260,250,260,267,260,283,260,300,260,317,260,333,260,367,260,383,260,400,260,417,260,433,260,450,260,467,260,483,260,500,260,583,260,600,260,617,260,633,260,650,260,667,260,683,260,700,260,717,260,733,260,750,260,767,260,783,260,800,260,817,260,833,260,850,260,867,260,883,260,900,260,917,260,933,260,950,260,967,260,983,260,1000,260,1017,260,1033,260,1050,260,1067,260,1083,260,1100,260,1117,260,1133,260,1150,260,1167,260,1183,275,-1141,275,-1090,275,-1073,275,-1056,275,-1039,275,-1023,275,-1006,275,-989,275,-820,275,-127,275,-110,275,-93,275,-76,275,-59,275,-42,275,-25,275,-8,275,8,275,25,275,42,275,59,275,76,275,93,275,110,275,127,275,144,275,161,275,177,275,194,275,211,275,228,275,245,275,262,275,279,275,296,275,313,275,330,275,363,275,380,275,397,275,414,275,431,275,448,275,465,275,482,275,532,275,549,275,566,275,583,275,600,275,617,275,634,275,651,275,668,275,685,275,701,275,718,275,735,275,752,275,769,275,786,275,803,275,820,275,837,275,854,275,870,275,887,275,904,275,921,275,938,275,955,275,972,275,989,275,1006,275,1023,275,1039,275,1056,275,1073,275,1090,275,1107,275,1124,275,1141,275,1158,275,1175,275,1192,290,-1114,290,-1097,290,-1080,290,-1063,290,-1046,290,-1029,290,-1011,290,-994,290,-977,290,-960,290,-823,290,-103,290,-86,290,-69,290,-51,290,-34,290,-17,290,0,290,17,290,34,290,51,290,69,290,86,290,103,290,120,290,137,290,154,290,171,290,189,290,206,290,223,290,240,290,257,290,274,290,291,290,309,290,326,290,343,290,360,290,377,290,394,290,411,290,429,290,446,290,463,290,480,290,514,290,531,290,549,290,566,290,583,290,600,290,617,290,634,290,651,290,669,290,686,290,703,290,720,290,737,290,754,290,771,290,789,290,806,290,823,290,840,290,857,290,874,290,891,290,909,290,926,290,943,290,960,290,977,290,994,290,1011,290,1029,290,1046,290,1063,290,1080,290,1097,290,1114,290,1131,290,1149,290,1166,290,1183,290,1200,290,1217,305,-1157,305,-1122,305,-1104,305,-1087,305,-1070,305,-1052,305,-1035,305,-1017,305,-1000,305,-983,305,-965,305,-948,305,-930,305,-913,305,-896,305,-878,305,-861,305,-843,305,-826,305,-96,305,-78,305,-61,305,-43,305,-26,305,-9,305,9,305,26,305,43,305,61,305,78,305,96,305,113,305,130,305,148,305,165,305,183,305,200,305,217,305,235,305,252,305,270,305,287,305,304,305,322,305,339,305,357,305,374,305,391,305,409,305,426,305,443,305,461,305,478,305,496,305,513,305,530,305,548,305,565,305,583,305,600,305,617,305,635,305,652,305,670,305,687,305,704,305,722,305,739,305,757,305,774,305,791,305,809,305,826,305,843,305,861,305,878,305,896,305,913,305,930,305,948,305,965,305,983,305,1000,305,1017,305,1035,305,1052,305,1070,305,1087,305,1104,305,1122,305,1139,305,1157,305,1174,305,1191,305,1209,320,-1165,320,-1147,320,-1129,320,-1112,320,-1094,320,-1076,320,-1059,320,-1041,320,-1024,320,-1006,320,-988,320,-971,320,-953,320,-935,320,-918,320,-900,320,-882,320,-865,320,-847,320,-829,320,-812,320,-88,320,-71,320,-53,320,-35,320,-18,320,0,320,18,320,35,320,53,320,71,320,88,320,106,320,124,320,141,320,212,320,229,320,353,320,371,320,388,320,406,320,424,320,441,320,459,320,476,320,494,320,512,320,529,320,547,320,565,320,582,320,600,320,618,320,635,320,653,320,671,320,688,320,706,320,724,320,741,320,759,320,776,320,794,320,812,320,829,320,847,320,865,320,882,320,900,320,918,320,935,320,953,320,971,320,988,320,1006,320,1024,320,1041,320,1059,320,1076,320,1094,320,1112,320,1129,320,1147,320,1165,320,1182,320,1200,320,1306,335,-1170,335,-1152,335,-1134,335,-1116,335,-1098,335,-1080,335,-1062,335,-1044,335,-1026,335,-1008,335,-990,335,-972,335,-954,335,-936,335,-918,335,-900,335,-882,335,-864,335,-846,335,-828,335,-810,335,-792,335,-72,335,-54,335,-36,335,-18,335,0,335,18,335,36,335,54,335,72,335,90,335,108,335,360,335,378,335,396,335,414,335,432,335,450,335,468,335,486,335,504,335,522,335,540,335,558,335,576,335,594,335,612,335,630,335,648,335,666,335,684,335,702,335,720,335,738,335,756,335,774,335,792,335,810,335,828,335,846,335,864,335,882,335,900,335,918,335,936,335,954,335,972,335,990,335,1008,335,1026,335,1044,335,1062,335,1080,335,1098,335,1116,335,1134,335,1152,335,1170,335,1188,335,1314,335,1332,350,-1197,350,-1179,350,-1160,350,-1142,350,-1124,350,-1106,350,-1087,350,-1069,350,-1051,350,-1032,350,-1014,350,-996,350,-978,350,-959,350,-941,350,-923,350,-905,350,-886,350,-868,350,-850,350,-831,350,-813,350,-795,350,-777,350,-46,350,-27,350,-9,350,9,350,27,350,46,350,64,350,82,350,101,350,338,350,375,350,393,350,411,350,429,350,448,350,466,350,484,350,503,350,521,350,539,350,557,350,576,350,594,350,612,350,630,350,649,350,667,350,685,350,704,350,722,350,740,350,758,350,777,350,795,350,813,350,831,350,850,350,868,350,886,350,905,350,923,350,941,350,959,350,978,350,996,350,1014,350,1032,350,1051,350,1069,350,1087,350,1106,350,1124,350,1142,350,1160,350,1179,350,1270,350,1325,350,1343,350,1361,350,1380,350,1398,365,-1203,365,-1184,365,-1166,365,-1147,365,-1128,365,-1110,365,-1091,365,-1073,365,-1054,365,-1035,365,-1017,365,-998,365,-979,365,-961,365,-942,365,-923,365,-905,365,-886,365,-867,365,-849,365,-830,365,-811,365,-793,365,-774,365,28,365,47,365,65,365,84,365,103,365,326,365,364,365,382,365,401,365,420,365,438,365,457,365,476,365,494,365,513,365,532,365,550,365,569,365,588,365,606,365,625,365,644,365,662,365,681,365,699,365,718,365,737,365,755,365,774,365,793,365,811,365,830,365,849,365,867,365,886,365,905,365,923,365,942,365,961,365,979,365,998,365,1017,365,1035,365,1054,365,1073,365,1091,365,1110,365,1128,365,1147,365,1166,365,1184,365,1203,365,1278,365,1371,365,1390,380,-1210,380,-1190,380,-1171,380,-1152,380,-1133,380,-1114,380,-1095,380,-1076,380,-1057,380,-1038,380,-1019,380,-1000,380,-981,380,-962,380,-943,380,-924,380,-905,380,-886,380,-867,380,-848,380,-829,380,-810,380,-790,380,-771,380,-86,380,-67,380,-48,380,-29,380,-10,380,143,380,219,380,238,380,276,380,295,380,314,380,333,380,352,380,371,380,390,380,410,380,429,380,448,380,467,380,486,380,543,380,562,380,581,380,600,380,619,380,638,380,657,380,676,380,695,380,714,380,733,380,752,380,771,380,790,380,810,380,829,380,848,380,867,380,886,380,905,380,924,380,943,380,962,380,981,380,1000,380,1019,380,1038,380,1057,380,1076,380,1095,380,1114,380,1133,380,1152,380,1171,380,1267,380,1286,380,1400,395,-1236,395,-1216,395,-1197,395,-1177,395,-1158,395,-1138,395,-1119,395,-1099,395,-1080,395,-1061,395,-1041,395,-1022,395,-1002,395,-983,395,-963,395,-944,395,-924,395,-905,395,-885,395,-866,395,-846,395,-827,395,-808,395,-788,395,-769,395,-749,395,-88,395,-68,395,-49,395,-29,395,-10,395,88,395,165,395,204,395,224,395,263,395,282,395,302,395,321,395,341,395,360,395,379,395,399,395,418,395,438,395,457,395,477,395,535,395,555,395,574,395,594,395,613,395,632,395,652,395,671,395,691,395,710,395,730,395,749,395,769,395,788,395,808,395,827,395,846,395,866,395,885,395,905,395,924,395,944,395,963,395,983,395,1002,395,1022,395,1041,395,1061,395,1080,395,1099,395,1119,395,1138,395,1158,395,1177,395,1216,395,1255,395,1275,395,1411,410,-1223,410,-1203,410,-1183,410,-1164,410,-1144,410,-1124,410,-1104,410,-1084,410,-1064,410,-1044,410,-1024,410,-1004,410,-985,410,-965,410,-945,410,-925,410,-905,410,-885,410,-865,410,-845,410,-825,410,-806,410,-786,410,-766,410,-746,410,-726,410,-70,410,-50,410,-30,410,-10,410,90,410,149,410,169,410,209,410,229,410,249,410,269,410,308,410,328,410,348,410,368,410,388,410,408,410,428,410,448,410,467,410,487,410,547,410,567,410,587,410,607,410,627,410,646,410,666,410,686,410,706,410,726,410,746,410,766,410,786,410,806,410,825,410,845,410,865,410,885,410,905,410,925,410,945,410,965,410,985,410,1004,410,1024,410,1044,410,1064,410,1084,410,1104,410,1124,410,1144,410,1164,410,1183,410,1203,410,1223,410,1243,410,1263,410,1283,410,1402,425,-1231,425,-1210,425,-1190,425,-1169,425,-1149,425,-1129,425,-1108,425,-1088,425,-1068,425,-1047,425,-1027,425,-1007,425,-986,425,-966,425,-946,425,-925,425,-905,425,-885,425,-864,425,-844,425,-824,425,-803,425,-783,425,-763,425,-742,425,-722,425,-71,425,-51,425,-31,425,-10,425,10,425,92,425,112,425,132,425,193,425,214,425,234,425,254,425,275,425,417,425,437,425,458,425,478,425,539,425,559,425,580,425,600,425,620,425,641,425,661,425,681,425,702,425,722,425,742,425,763,425,783,425,803,425,824,425,844,425,864,425,885,425,905,425,925,425,946,425,966,425,986,425,1007,425,1027,425,1047,425,1068,425,1088,425,1108,425,1129,425,1149,425,1169,425,1190,425,1210,425,1231,425,1251,425,1271,425,1292,425,1414,425,1434,440,-1238,440,-1217,440,-1197,440,-1176,440,-1155,440,-1134,440,-1113,440,-1092,440,-1072,440,-1051,440,-1030,440,-1009,440,-988,440,-968,440,-947,440,-926,440,-905,440,-884,440,-864,440,-843,440,-822,440,-801,440,-780,440,-760,440,-739,440,-718,440,-697,440,-655,440,-10,440,10,440,31,440,52,440,73,440,114,440,156,440,177,440,198,440,218,440,239,440,260,440,281,440,406,440,427,440,447,440,468,440,510,440,531,440,551,440,572,440,593,440,614,440,635,440,655,440,676,440,697,440,718,440,739,440,760,440,780,440,801,440,822,440,843,440,864,440,884,440,905,440,926,440,947,440,968,440,988,440,1009,440,1030,440,1051,440,1072,440,1092,440,1113,440,1134,440,1155,440,1176,440,1197,440,1217,440,1238,440,1259,440,1280,440,1301,440,1321,440,1342,440,1425,455,-1221,455,-1200,455,-1179,455,-1157,455,-1136,455,-1114,455,-1093,455,-1071,455,-1050,455,-1029,455,-1007,455,-986,455,-964,455,-943,455,-921,455,-900,455,-879,455,-857,455,-836,455,-814,455,-793,455,-771,455,-750,455,-729,455,-707,455,-686,455,-664,455,-643,455,-621,455,0,455,21,455,43,455,64,455,86,455,107,455,150,455,171,455,193,455,214,455,236,455,257,455,279,455,343,455,386,455,407,455,429,455,450,455,471,455,536,455,557,455,579,455,600,455,621,455,643,455,664,455,686,455,707,455,729,455,750,455,771,455,793,455,814,455,836,455,857,455,879,455,900,455,921,455,943,455,964,455,986,455,1007,455,1029,455,1050,455,1071,455,1093,455,1114,455,1136,455,1157,455,1179,455,1200,455,1221,455,1243,455,1264,455,1286,455,1307,455,1329,455,1350,455,1371,470,-1229,470,-1207,470,-1185,470,-1163,470,-1141,470,-1120,470,-1098,470,-1076,470,-1054,470,-1032,470,-1010,470,-988,470,-966,470,-944,470,-922,470,-900,470,-878,470,-856,470,-834,470,-812,470,-790,470,-768,470,-746,470,-724,470,-680,470,-659,470,0,470,22,470,44,470,66,470,88,470,110,470,132,470,154,470,176,470,198,470,220,470,241,470,263,470,285,470,307,470,329,470,351,470,373,470,395,470,417,470,439,470,461,470,483,470,505,470,527,470,549,470,571,470,593,470,615,470,637,470,659,470,680,470,702,470,724,470,746,470,768,470,790,470,812,470,834,470,856,470,878,470,900,470,922,470,944,470,966,470,988,470,1010,470,1032,470,1054,470,1076,470,1098,470,1120,470,1141,470,1163,470,1185,470,1207,470,1229,470,1251,470,1273,470,1295,470,1317,470,1339,470,1361,470,1383,470,1427,485,-1211,485,-1189,485,-1166,485,-1143,485,-1121,485,-1098,485,-1075,485,-1053,485,-1030,485,-1008,485,-985,485,-962,485,-940,485,-917,485,-894,485,-872,485,-849,485,-826,485,-804,485,-781,485,-758,485,-736,485,-713,485,-668,485,-645,485,-577,485,-555,485,-532,485,-34,485,-11,485,11,485,34,485,57,485,79,485,102,485,125,485,147,485,170,485,192,485,215,485,238,485,260,485,283,485,306,485,328,485,351,485,374,485,396,485,419,485,442,485,464,485,487,485,509,485,532,485,555,485,577,485,600,485,623,485,645,485,668,485,691,485,713,485,736,485,758,485,781,485,804,485,826,485,849,485,872,485,894,485,917,485,940,485,962,485,985,485,1008,485,1030,485,1053,485,1075,485,1098,485,1121,485,1143,485,1166,485,1189,485,1211,485,1234,485,1257,485,1279,485,1302,485,1325,485,1347,485,1370,485,1392,500,-1262,500,-1239,500,-1216,500,-1192,500,-1169,500,-1145,500,-1122,500,-1099,500,-1075,500,-1052,500,-1029,500,-1005,500,-982,500,-958,500,-935,500,-912,500,-888,500,-865,500,-842,500,-818,500,-795,500,-771,500,-748,500,-725,500,-701,500,-678,500,-561,500,23,500,47,500,70,500,94,500,117,500,140,500,164,500,187,500,210,500,234,500,257,500,281,500,304,500,327,500,351,500,374,500,397,500,421,500,444,500,468,500,491,500,514,500,538,500,561,500,584,500,608,500,631,500,655,500,678,500,701,500,725,500,748,500,771,500,795,500,818,500,842,500,865,500,888,500,912,500,935,500,958,500,982,500,1005,500,1029,500,1052,500,1075,500,1099,500,1122,500,1145,500,1169,500,1192,500,1216,500,1239,500,1262,500,1286,500,1309,500,1332,500,1356,500,1379,500,1403,500,1426,515,-1268,515,-1244,515,-1220,515,-1196,515,-1172,515,-1148,515,-1123,515,-1099,515,-1075,515,-1051,515,-1027,515,-1003,515,-979,515,-954,515,-930,515,-906,515,-882,515,-858,515,-834,515,-809,515,-785,515,-761,515,-737,515,-713,515,-689,515,-664,515,-640,515,-616,515,-592,515,-36,515,-12,515,12,515,36,515,60,515,85,515,109,515,133,515,157,515,181,515,205,515,230,515,254,515,278,515,302,515,326,515,350,515,374,515,399,515,423,515,447,515,471,515,495,515,519,515,544,515,568,515,592,515,616,515,640,515,664,515,689,515,713,515,737,515,761,515,785,515,809,515,834,515,858,515,882,515,906,515,930,515,954,515,979,515,1003,515,1027,515,1051,515,1075,515,1099,515,1123,515,1148,515,1172,515,1196,515,1220,515,1244,515,1268,515,1293,515,1317,515,1341,515,1365,515,1389,530,-1275,530,-1250,530,-1225,530,-1200,530,-1175,530,-1150,530,-1125,530,-1100,530,-1075,530,-1050,530,-1025,530,-1000,530,-975,530,-950,530,-925,530,-900,530,-875,530,-850,530,-825,530,-775,530,-750,530,-725,530,-700,530,-675,530,-650,530,-625,530,-600,530,-575,530,-75,530,-25,530,0,530,50,530,75,530,100,530,125,530,150,530,175,530,200,530,225,530,250,530,275,530,300,530,325,530,350,530,375,530,400,530,425,530,450,530,475,530,500,530,525,530,550,530,575,530,600,530,625,530,650,530,675,530,700,530,725,530,750,530,775,530,800,530,825,530,850,530,875,530,900,530,925,530,950,530,975,530,1000,530,1025,530,1050,530,1075,530,1100,530,1125,530,1150,530,1175,530,1200,530,1225,530,1250,530,1275,530,1300,530,1325,530,1350,530,1375,530,1400,530,1425,530,1575,545,-1645,545,-1282,545,-1256,545,-1230,545,-1204,545,-1178,545,-1153,545,-1127,545,-1101,545,-1075,545,-1049,545,-1023,545,-997,545,-971,545,-945,545,-919,545,-894,545,-868,545,-842,545,-790,545,-764,545,-738,545,-712,545,-686,545,-660,545,-635,545,-609,545,-583,545,-65,545,-13,545,91,545,168,545,220,545,246,545,272,545,298,545,324,545,350,545,376,545,401,545,427,545,453,545,479,545,505,545,531,545,557,545,583,545,609,545,635,545,660,545,686,545,712,545,738,545,764,545,790,545,816,545,842,545,868,545,894,545,919,545,945,545,971,545,997,545,1023,545,1049,545,1075,545,1101,545,1127,545,1153,545,1178,545,1204,545,1230,545,1256,545,1282,545,1308,545,1334,545,1360,545,1567,545,1593,560,-1585,560,-1316,560,-1290,560,-1263,560,-1236,560,-1209,560,-1182,560,-1155,560,-1128,560,-1101,560,-1075,560,-1048,560,-1021,560,-994,560,-967,560,-940,560,-913,560,-887,560,-752,560,-725,560,-699,560,-672,560,-645,560,-618,560,-54,560,134,560,215,560,242,560,269,560,296,560,322,560,349,560,376,560,403,560,430,560,457,560,484,560,510,560,537,560,564,560,591,560,618,560,645,560,672,560,699,560,725,560,752,560,779,560,806,560,833,560,860,560,887,560,913,560,940,560,967,560,994,560,1021,560,1048,560,1075,560,1101,560,1128,560,1155,560,1182,560,1209,560,1236,560,1263,560,1290,560,1316,560,1343,560,1370,560,1558,560,1585,560,1612,575,-1577,575,-1326,575,-1298,575,-1270,575,-1242,575,-1214,575,-1186,575,-1158,575,-1130,575,-1102,575,-1074,575,-1047,575,-1019,575,-991,575,-963,575,-935,575,-767,575,-740,575,-712,575,-684,575,-656,575,-628,575,-42,575,126,575,153,575,265,575,293,575,321,575,349,575,377,575,405,575,433,575,460,575,488,575,516,575,544,575,572,575,600,575,628,575,656,575,684,575,712,575,740,575,767,575,795,575,823,575,851,575,879,575,907,575,935,575,963,575,991,575,1019,575,1047,575,1074,575,1102,575,1130,575,1158,575,1186,575,1214,575,1242,575,1270,575,1298,575,1326,575,1353,575,1381,575,1577,575,1605,590,-1597,590,-1568,590,-1539,590,-1365,590,-1335,590,-1306,590,-1277,590,-1248,590,-1219,590,-1190,590,-1161,590,-1132,590,-1103,590,-1074,590,-1045,590,-1016,590,-987,590,-958,590,-755,590,-726,590,-697,590,-639,590,58,590,87,590,116,590,145,590,174,590,261,590,290,590,319,590,348,590,377,590,406,590,435,590,465,590,494,590,523,590,552,590,581,590,610,590,639,590,668,590,697,590,726,590,755,590,784,590,813,590,842,590,871,590,900,590,929,590,958,590,987,590,1016,590,1045,590,1074,590,1103,590,1132,590,1161,590,1190,590,1219,590,1248,590,1277,590,1306,590,1335,590,1365,590,1394,590,1626,605,-1647,605,-1617,605,-1586,605,-1556,605,-1525,605,-1495,605,-1434,605,-1403,605,-1373,605,-1342,605,-1312,605,-1281,605,-1251,605,-1220,605,-1190,605,-1159,605,-1129,605,-1098,605,-1068,605,-1037,605,-1007,605,-976,605,-946,605,-763,605,-732,605,-702,605,61,605,92,605,122,605,153,605,244,605,275,605,305,605,336,605,366,605,397,605,427,605,458,605,488,605,519,605,549,605,580,605,610,605,641,605,671,605,702,605,732,605,763,605,793,605,824,605,854,605,885,605,915,605,946,605,976,605,1007,605,1037,605,1068,605,1098,605,1129,605,1159,605,1190,605,1220,605,1251,605,1281,605,1312,605,1342,605,1373,605,1403,605,1434,605,1464,605,1495,605,1525,605,1647,605,1678,605,1708,620,-1641,620,-1609,620,-1577,620,-1545,620,-1513,620,-1481,620,-1450,620,-1418,620,-1386,620,-1354,620,-1322,620,-1290,620,-1258,620,-1227,620,-1195,620,-1163,620,-1131,620,-1099,620,-1067,620,-1035,620,-1004,620,-972,620,-940,620,-749,620,-494,620,-462,620,-430,620,80,620,112,620,143,620,239,620,271,620,303,620,335,620,366,620,398,620,430,620,462,620,494,620,526,620,558,620,589,620,621,620,653,620,685,620,717,620,749,620,781,620,812,620,844,620,876,620,908,620,940,620,972,620,1004,620,1035,620,1067,620,1099,620,1131,620,1163,620,1195,620,1227,620,1258,620,1290,620,1322,620,1354,620,1386,620,1418,620,1450,620,1481,620,1513,620,1545,620,1577,620,1609,620,1673,620,1704,620,1736,635,-1699,635,-1598,635,-1564,635,-1531,635,-1497,635,-1464,635,-1430,635,-1396,635,-1363,635,-1329,635,-1295,635,-1262,635,-1228,635,-1194,635,-1161,635,-1127,635,-1093,635,-1060,635,-1026,635,-993,635,-959,635,-925,635,-690,635,-656,635,-488,635,-454,635,-421,635,118,635,151,635,185,635,252,635,286,635,320,635,353,635,387,635,421,635,454,635,488,635,521,635,555,635,589,635,622,635,656,635,690,635,723,635,757,635,791,635,824,635,858,635,892,635,925,635,959,635,993,635,1026,635,1060,635,1093,635,1127,635,1161,635,1194,635,1228,635,1262,635,1295,635,1329,635,1363,635,1396,635,1430,635,1464,635,1497,635,1531,635,1564,635,1598,635,1632,635,1665,635,1699,635,1733,635,1766,650,-1800,650,-1729,650,-1657,650,-1622,650,-1586,650,-1550,650,-1515,650,-1479,650,-1444,650,-1408,650,-1372,650,-1337,650,-1301,650,-1265,650,-1230,650,-1194,650,-1158,650,-1123,650,-1087,650,-1051,650,-1016,650,-980,650,-945,650,-909,650,-873,650,-838,650,-766,650,-731,650,-695,650,-517,650,-481,650,-446,650,-410,650,-196,650,-160,650,125,650,160,650,196,650,267,650,303,650,339,650,374,650,410,650,446,650,481,650,517,650,552,650,588,650,624,650,659,650,695,650,731,650,766,650,802,650,838,650,873,650,909,650,945,650,980,650,1016,650,1051,650,1087,650,1123,650,1158,650,1194,650,1230,650,1265,650,1301,650,1337,650,1372,650,1408,650,1444,650,1479,650,1515,650,1550,650,1586,650,1622,650,1657,650,1693,650,1729,650,1764,665,-1800,665,-1762,665,-1725,665,-1612,665,-1575,665,-1537,665,-1500,665,-1462,665,-1425,665,-1387,665,-1350,665,-1312,665,-1275,665,-1237,665,-1200,665,-1162,665,-1125,665,-1087,665,-1050,665,-1012,665,-975,665,-937,665,-900,665,-862,665,-712,665,-675,665,-637,665,-525,665,-487,665,-450,665,-412,665,-375,665,150,665,188,665,225,665,263,665,300,665,375,665,450,665,488,665,525,665,563,665,600,665,638,665,675,665,713,665,750,665,788,665,825,665,863,665,900,665,938,665,975,665,1013,665,1050,665,1088,665,1125,665,1163,665,1200,665,1238,665,1275,665,1313,665,1350,665,1388,665,1425,665,1463,665,1500,665,1538,665,1575,665,1613,665,1650,665,1688,665,1725,665,1763,680,-1800,680,-1640,680,-1600,680,-1560,680,-1520,680,-1480,680,-1440,680,-1400,680,-1360,680,-1320,680,-1280,680,-1240,680,-1200,680,-1160,680,-1080,680,-1040,680,-920,680,-840,680,-760,680,-720,680,-680,680,-520,680,-480,680,-440,680,-400,680,-360,680,160,680,200,680,240,680,280,680,320,680,360,680,400,680,520,680,560,680,600,680,640,680,680,680,720,680,760,680,800,680,840,680,880,680,920,680,960,680,1000,680,1040,680,1080,680,1120,680,1160,680,1200,680,1240,680,1280,680,1320,680,1360,680,1400,680,1440,680,1480,680,1520,680,1560,680,1600,680,1640,680,1680,680,1720,680,1760,695,-1629,695,-1586,695,-1543,695,-1500,695,-1457,695,-1414,695,-1329,695,-1286,695,-1157,695,-1114,695,-1071,695,-1029,695,-986,695,-943,695,-729,695,-686,695,-471,695,-429,695,-386,695,-343,695,-300,695,-257,695,214,695,257,695,300,695,686,695,771,695,814,695,857,695,900,695,943,695,986,695,1029,695,1071,695,1114,695,1157,695,1200,695,1243,695,1286,695,1329,695,1371,695,1414,695,1457,695,1500,695,1543,695,1586,695,1629,695,1671,695,1714,695,1757,710,-1569,710,-1154,710,-1108,710,-1062,710,-877,710,-831,710,-785,710,-738,710,-508,710,-462,710,-415,710,-369,710,-323,710,-277,710,-231,710,277,710,554,710,692,710,738,710,785,710,831,710,877,710,923,710,969,710,1015,710,1062,710,1108,710,1154,710,1200,710,1246,710,1292,710,1338,710,1385,710,1431,710,1477,710,1523,710,1569,725,-1250,725,-1200,725,-1150,725,-1100,725,-1000,725,-950,725,-850,725,-500,725,-450,725,-400,725,-350,725,-300,725,-250,725,550,725,700,725,750,725,850,725,900,725,950,725,1000,725,1050,725,1100,725,1150,725,1200,725,1250,725,1400,725,1450,740,-1200,740,-927,740,-545,740,-491,740,-436,740,-382,740,-327,740,-273,740,-218,740,545,740,873,740,927,740,982,740,1036,740,1091,755,-1140,755,-1080,755,-900,755,-840,755,-540,755,-480,755,-420,755,-360,755,-300,755,-240,755,600,755,900,755,960,755,1020,755,1080,755,1380,755,1440,770,-1200,770,-867,770,-800,770,-667,770,-600,770,-533,770,-467,770,-400,770,-333,770,-267,770,-200,785,-1125,785,-975,785,-900,785,-825,785,-675,785,-600,785,-525,785,-450,785,-375,785,-300,785,-225,785,150,785,1050,800,-943,800,-857,800,-771,800,-600,800,-514,800,-429,800,-343,800,-257,800,171,800,257,800,943];
globe();
