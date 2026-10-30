# Northform — Describe it. We'll shoot it.

A one-page marketing site for **Northform**, a fictional AI studio that turns one written prompt into on-brand product photos and ad creatives for e-commerce brands.

It is plain HTML, CSS and JavaScript. There is no framework, no build step and no bundler. You edit three files and refresh.

```
northform/
├── index.html   every section, the SVG icon sprite, the dialogs
├── style.css    tokens → shared parts → sections top to bottom → footer → dialogs
├── script.js    helpers → hero → one block per section → the globe's land data
├── README.md    this file
└── img/         25 WebP images, 540 KB total
```

**Run it.** Any static server works, for example the workspace's `node .claude/serve.mjs northform 5310`. Then open http://localhost:5310. You can also open `index.html` straight from disk.

**External requests (3).** Inter from Google Fonts, Lenis 1.3.26 (smooth scroll) from jsDelivr, and nothing else. If Lenis fails to load, the site falls back to native smooth scrolling. Nothing breaks.

---

## 1. How it was built

The site went through several rounds. Each round answered specific feedback.

| Round | What happened | What we learned |
|---|---|---|
| **1. Next.js prototype** | First built in Next.js 15 + Tailwind 4 + Motion. Built the hero first, as the brief asked, then stopped for review. The hero is a prompt box that types a prompt, then shrinks to the top-left while a floating collage "generates" around a photo. | The hero idea worked. Everything after it was built in the hero's own language. |
| **2. Sections from references** | Each section was mapped to one of 11 reference images: a feature card with an app window, a dotted path with chips, gallery tiles, a globe, a big-number list, a filter panel, a gradient lockup, and others. | Each section needs a reason to exist, not just a reference. |
| **3. Port to plain HTML** | Rebuilt as static HTML/CSS/JS. The top of the hero was redesigned after a "Popcorn" reference: pill nav, segmented scene control, grainy sky. | — |
| **4. A rejected rebuild** | A "light, rendered" version (WebGL light field, serif type, new palette) was tried and rejected. The previous version was restored. | When a version is liked, fix only the bugs. Don't redesign. |
| **5. The click bug** | "Buttons don't work": `.menu { display: flex }` overrode the `hidden` attribute. An invisible full-screen menu sat over the page and swallowed every click. Fixed with a global `[hidden] { display: none !important }`. | Test with real pointer clicks and `elementFromPoint` hit-tests. Scripted `.click()` calls go straight to the element, so they never catch an overlay. |
| **6. One system** | The Next.js app was deleted and the static site moved to `northform/`. The whole site was recoloured to the hero system: white/black, white cards, ink buttons, one gradient. Added the loader, the shutter flash and the count-ups. | "Match the hero vibe" meant rebuilding every section from hero components, not just recolouring them. |
| **7. Sections round 3** | Every section except the hero was redone. References: Jasper's bento, OpenAI's "Latest updates" tiles, a Battersea→Heathrow card + dot-matrix + photo composition, a jitter.video blurred word wheel, FLORA/Mews how-it-works, Chronicle/Spline pricing, V7 before/after. The pinned scroll section was removed because it caused animation glitches. | Scroll-pinned sections were the main source of jank. Cards that autoplay while visible are smoother and simpler. |
| **8. Finalise (this pass)** | Fixed the clipped footer wordmark. Merged everything into three files. Optimised the images. Removed dead code. Fixed a scroll bug when leaving a dialog. Wrote this document. | See §8. |

**Tooling used along the way:** headless Chrome/Edge over CDP for screenshots at several widths and in both themes (one browser, run sequentially, because parallel software-WebGL instances starve each other); ffmpeg/libwebp for image re-encoding; the Mobbin MCP for how-it-works and pricing references; the in-app browser for real-click testing.

---

## 2. Design system

Everything comes from the hero. If something isn't in the hero, it isn't on the page.

### Colour
| Token | Light | Dark | Used for |
|---|---|---|---|
| `--bg` | `#ffffff` | `#000000` | page |
| `--surface` | `#ffffff` | `#111111` | cards, pills, prompt boxes |
| `--tile` | `#f4f4f4` | `#0c0c0c` | image wells, inner panels |
| `--text` / `--text-2` / `--text-3` | `#111` / `#6b6b6b` / `#b5b5b5` | `#f2f2f2` / `#8a8a8a` / `#555` | ink, secondary, tertiary |
| `--lead-color` | `#8a8a8a` | `#7e7e7e` | lead paragraphs (darkened slightly so 24px text passes AA large) |
| `--line` / `--line-strong` | 7% / 11% black | 9% / 15% white | hairlines |
| `--gradient` | `135deg, #e5484d → #f08a8e → #c9c3f5` | same | **the only accent**: coral → pink → lilac |

The gradient is the generate button's colour. It is used only where something is "made" or "live": generate buttons, orbs, step progress, the active plan glow, flight arcs, ripples, the CTA lockup, the footer wordmark. `--accent` (`#e5484d`) is used only for tiny marks such as error text.

### Type
- **Inter 400 / 500 only.** One family keeps the product feeling like a tool, not a magazine.
- Hero 44 → 64 → 88px, line-height .95, tracking −.03em. Section titles 34 → 44 → 56px. Lead 18 → 20 → 24px. The breakpoints are 768 and 1200.
- Big display numbers (stats, prices, the wheel) use tighter tracking (−.045 to −.055em) and `tabular-nums`, so count-ups don't jitter.

### Shape and depth
- Radii: pills 999px, cards 20–28px, image tiles 16–18px, square buttons 10–12px.
- Shadow `--sh`: three soft layers (1px contact, 8px, 24px). `--sh-lift` is used on hover and active states.
- Every section opens on a hairline rule (`.rule`), with the title on the left and the lead text opposite, like an index page.

### The prompt box
This is the signature component, used four times (hero, problems, use-case search, CTA). It is an SVG path drawn by `shapePath(w, h)` in `script.js`: a rounded rectangle with three folder tabs on top and a notch cut into the bottom-right corner, where the + and generate buttons sit. A `ResizeObserver` redraws the path whenever the box resizes, so it always fits its text exactly.

### Motion
- One curve for everything: `--ease: cubic-bezier(.22, 1, .36, 1)`, a long, soft ease-out. `--spring` (slight overshoot) is used only for pop-ins: markers, ticks, the "Recommended" pill.
- Only `transform`, `opacity` and `filter` are animated, never layout.
- Things that loop (the hero, the wheel, the product tour, the steps, the globe) run only while on screen, and pause on hover so the visitor can read.

### Theme
Light and dark. An inline script in `<head>` picks the theme before first paint: the stored choice, otherwise the system setting. So there is no flash. The page keeps following the system setting until the visitor picks a theme with the toggle. Canvases (the dot matrix and the globe) redraw when the theme changes.

---

## 3. Sections

| # | Section | Why it exists | What you can do | How it works |
|---|---|---|---|---|
| — | **Loader** | Sets the idea before anything else: you describe, it shoots. | — | The prompt-box outline draws itself (`stroke-dashoffset` on a `pathLength=1` path), types "Describe it. We'll shoot it.", then presses generate. Shown once per visit (`sessionStorage`). Skipped for reduced motion. A timer guarantees the page unlocks even if animation frames are throttled, and a CSS fallback hides the loader after 5s if the script never runs. |
| — | **Nav** | — | Section links, theme toggle, Start free. On mobile, a full-screen menu. | The nav turns to glass once the page scrolls. A scroll-spy puts a gradient dot under the section in view. The menu traps focus at its first link and closes on Esc, on resize to desktop, or on a link click. |
| 00 | **Hero** | Shows the product working in the first five seconds. | Watch it, hover to pause, use the scene bars to jump between cycling, night run and surf. | A rAF clock drives a timeline: type → beat → press → show → exit. The collage is laid out on a fixed design canvas (1200×720 on desktop, 390×560 on phones) that is scaled to fit, so it never reflows. The pieces enter from offsets with a stagger. The photo resolves from a blur with a white shutter flash. Each piece has a depth value for scroll parallax and cursor drift. |
| — | **Logos** | Social proof, quietly. | Hover to pause the strip and highlight a logo. | A CSS marquee with a duplicated list and a mask fade at both edges. |
| 01 | **Problems** | Names the pain before the product. | Click a problem or use the arrow keys. Turns on its own otherwise. | A kinetic word wheel: each item is placed by its circular distance from the selected one, with translate, scale, blur and opacity. The item that wraps round moves with transitions off, so it never flies across the wheel. The prompt box types the fix and a Before → With Northform card swaps. |
| 02 | **Product** | The three tools: Brand kit, Relight, Every format. | Switch tabs; pick a brand colour, a light or a format; drag across the dots to move the light. | One overlapping composition: a spec card (big "X → Y" title, controls, meta row), a canvas dot-matrix, and the photo. Every dot eases toward a target colour and brightness per tool: Brand kit shows bars of on-brand score tinted by the chosen swatch, Relight shows light falloff from the pointer, and Every format outlines the crop's safe area. The photo relights (CSS filters plus a soft-light radial) and resizes to the ratio. It tours itself until you touch it. |
| 03 | **How it works** | Prompt → generate → edit → publish. | Hover or focus a step. They autoplay otherwise. | Four cards, each holding a working miniature: typing, takes un-blurring, an edit selection, channel ticks. The active card gets a gradient border, and a gradient line fills up to it. On phones the cards become a snap-scrolling row. |
| 04 | **Work** | What comes out, and the sentence behind it. | Filter by category, Show all, open a tile, browse with ←/→, "Use this prompt". | Square tiles with the prompt as the title. A native `<dialog>` viewer. "Use this prompt" drops it into the CTA prompt box and scrolls there. |
| 05 | **Results + Customers** | Proof. | — | A bento on faint graph paper: count-up stats, quotes with faces, photo tiles captioned with the result they drove. The layout is set with CSS grid areas on desktop and flows on mobile. |
| 06 | **Reach** | Global, always rendering. | Pick a city or drag the globe. | A canvas globe built from 4,862 land dots (`LAND` at the end of `script.js`). The globe turns the shortest way round to face the chosen city. Briefs fly between studios as slerped great-circle arcs lifted off the surface, with a bright head. Each landing sends a ripple ring through the land dots. Dots are drawn in four depth buckets, one path each, which makes every frame much cheaper. Local times update every 30s. |
| 07 | **Use cases** | "There's a prompt for whatever you sell." | Type in the prompt box (press `/` from anywhere), filter by industry, Use prompt. | A live filter over a small prompt library, with matches highlighted. Results are hairline rows. |
| 08 | **Pricing** | Pick the plan by volume, not by guessing. | Slide images per month; switch monthly/yearly. | The plan that fits glows (radial gradient, ink button, Recommended pill). Yearly savings against a €120-per-image studio count up. Prices roll when billing changes. The plan buttons carry the plan, billing and volume into the sign-up dialog. |
| 10 | **FAQ** | Answers objections in conversation. | Tap a question, or type your own. | A chat: typing dots, then the answer typed back. Typed questions are matched to the closest answer by shared keywords; unknown questions get a fallback with an email link. |
| 11 | **CTA** | One prompt away. | Suggestion chips, attach a reference image, Generate (Enter submits). | Four shimmering tiles resolve into takes, then the sign-up dialog opens and shows your prompt and the reference file name. An empty prompt flashes the box and changes the placeholder. |
| 12 | **Footer** | Navigation and sign-off. | Links, socials, newsletter (validated), small print. | A giant gradient wordmark with a slow sheen. It is sized in container units, so it always fits edge to edge (see §8). |
| — | **Dialogs** | Sign-up and small print, without leaving the page. | Esc, × or a backdrop click closes them. | Native `<dialog>`. Every `href="#signup"` or `href="#legal"` link opens one. `data-plan` on a link personalises the sign-up text. |

---

## 4. Code structure

### `script.js` (top to bottom)
1. **Helpers**: `$`, `$$`, `clamp`, `map`, `ic()` (icon markup), `onView()` (run once in view), `RM` (reduced motion), `FINE` (fine pointer).
2. **Navigation**: Lenis plus one click handler for every `href="#…"` link. It scrolls to sections (clearing the 84px nav and updating the hash) or opens dialogs. `goTo()` restarts Lenis before scrolling, because a closing dialog only restarts it asynchronously.
3. **Dialogs**, `signup()`, **theme**, **mobile menu**, **nav glass + scroll-spy**, **reveal**.
4. **Shared building blocks**: `shapePath()` (prompt outline), `stage()` (scaled design canvas), the collage parallax loop, `countUp()`, `typeInto()` (cancellable typewriter), `whileVisible()` (runs a rAF callback only while an element is on screen), `radio()` (accessible radio groups with arrow keys), `usePrompt()`, `segPill()`.
5. **One IIFE per section**, in page order: hero, loader, problems, product, flow, work, results, use cases, pricing, chat, CTA, newsletter.
6. **`globe()`** is declared as a function and called last, after the `LAND` array (lat×10, lng×10 pairs), so 40 KB of coordinates don't sit in the middle of the code.

All content (scenes, problems, tools, work, use cases, FAQ, cities) lives in small arrays at the top of each block. Edit those to change copy.

### `style.css` (top to bottom)
Tokens (light + dark) → base and reset → type → reveal → buttons → nav → hero → logos → loader → reduced motion → footer → shared section parts (kicker, chips, range slider, rule) → sections 01–11 → small details (gradient hover, orbs, marquee hover) → dialogs.

---

## 5. Accessibility

- Skip link; landmarks (`header`, `main`, `footer`, `nav` with labels); every section is `aria-labelledby` its heading.
- All interactive parts are real buttons, links or inputs. Tabs use `role="tab"`/`aria-selected`. Option groups use `role="radio"`/`aria-checked` with arrow-key support. Toggles use `aria-pressed`.
- Visible focus ring on everything (`:focus-visible`, 2px ink outline).
- Decorative collage, canvases and icons are `aria-hidden`. Live text (the problem fix, the product stat, chat answers, search count) uses `aria-live="polite"`.
- `prefers-reduced-motion`: no loader, loops stop, auto-tours stop, transitions jump to their end state, and the hero shows the finished collage.
- Contrast: lead text was darkened to pass AA for large text. Small text uses `--text-2`.
- `[hidden] { display: none !important }`, so a closed overlay can never block clicks.

## 6. Performance

- **Images**: WebP, sized to the largest size they are shown at (2× for retina). This pass removed 3 unused images (`pylons`, `t-2`, `t-4`: 200 KB). It also re-encoded avatars from 300px to 120px (about 70% smaller each), socks from 900 to 480px (35 → 7 KB), legs from 900 to 480px (33 → 10 KB) and watch at q68. Total **816 KB → 540 KB**.
- Every image below the fold is `loading="lazy"`. The first hero photo is preloaded and fetched with `fetchpriority="high"`.
- Only `transform`/`opacity`/`filter` are animated. `will-change` is used only on the moving collage pieces and wheel items.
- Every rAF loop runs only while its section is visible (`whileVisible`). The parallax loop skips collages that are off screen.
- Globe: land dots are precomputed once into a `Float32Array` and drawn in four batched paths per frame. Device pixel ratio is capped at 2.
- Fonts: one family, two weights, `display=swap`, preconnected.
- No framework. About 105 KB of JS, including about 42 KB of globe coordinates. About 63 KB of CSS. Neither is minified, so they stay readable.

## 7. Browser support

Current Chrome, Edge, Safari and Firefox. Uses `<dialog>`, `:has()`-free CSS, container query units (`cqi`, for the wordmark), `overflow: clip`, `translate`/`rotate`/`scale` as individual properties, and `ResizeObserver`/`IntersectionObserver`.

---

## 8. Changelog: final pass (16 Oct 2026)

- **Footer wordmark no longer cut off.** Two causes:
  1. `line-height: .8` made the text box shorter than the glyphs. With `background-clip: text`, the gradient paints only inside the box, so the tops of N, h, t and f were sliced off.
  2. `font-size: clamp(64px, 19vw, 300px)` grew wider than the content column on screens wider than about 1550px, and `overflow-x: clip` cut the "m".

  Fix: `line-height: 1` with a small negative bottom margin to keep the tight look. The size is now `22cqi` of the footer's `.wrap` (`container-type: inline-size`), so the word always spans about 96% of the column at every width. Checked at 375, 958 and 1700px.
- **Three files.** `globe-data.js` was inlined into `script.js`. `favicon.svg` became a data URI. `vendor/lenis.min.js` was replaced by the identical file from jsDelivr. `signup.html` and `legal.html` became in-page `<dialog>`s, and the CTA, plan buttons and nav "Start free" now open the sign-up dialog with the prompt or plan the visitor brought.
- **Bug fixes.** Scrolling from inside a dialog ("Use this prompt", "Write a prompt") did nothing, because Lenis was still stopped; `goTo()` now restarts it. The CTA takes animation referenced a keyframe (`take`) that didn't exist; it now uses `takeIn`. The theme-colour meta now matches the real backgrounds (`#fff`/`#000`).
- **Dead code removed.** Unused CSS (`.abs`, `.tab`, `.fillc`, `.lift`, `.ln` and the line-reveal variants, `.btn-surface`, `.btn-xs`, `.logo sup`, `.pchip.mt/.mb`, `.band`, the signup/legal page styles), unused tokens (`--bg-2`, `--frame`, `--off`, `--marker`, `--dot-light`), a duplicate rule, two reduced-motion blocks merged into one, an unused `getComputedStyle` call, and the per-viewer close handlers (now one shared dialog handler).
- **Verified.** No console errors, no failed requests, no broken images, no horizontal scroll at 375px. Dialogs, pricing → sign-up, work viewer → CTA, and CTA → sign-up were tested with real pointer clicks, in light and dark.

---

## 9. Editing notes

- **Re-brand:** change `--gradient` in `:root` and every accent follows. The dot-matrix and globe colours are written as RGB in `script.js` (`G` in product, `grad3` in globe, `#f08a8e` ripples).
- **Hero:** prompts, photos and cards are `SCENES`. Layouts are `DESKTOP` and `MOBILE` (design-canvas pixels). Timing is `T`.
- **Copy and data:** `P` (problems), `TOOLS` (product), `W` (work), `C` (cities), `U` (use cases), `F` (FAQ). Plan prices are `data-m` and `data-y` on each `.plan`, and the recommendation thresholds are in `rec()`.
- **Images:** add WebP files to `img/` at no more than 2× the displayed size (roughly 900px for big photos, 480px for tiles, 120px for avatars).
- All brands, people and products are fictional. Photos are stock imagery used for illustration.
