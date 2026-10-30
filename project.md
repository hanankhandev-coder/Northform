# Northform: Project Card

Everything someone needs to rebuild this exact site: the prompts, workflow, tools and history.

---

## Short description (30 max)
**AI product-photo studio SaaS**

## Description
Northform is a one-page marketing site for a made-up AI studio. E-commerce brands write one prompt and get on-brand product photos and ad creatives back. The hero types a prompt into a prompt box, then the box shrinks away while a floating collage "generates" around a photo. The site is clean white/black with Inter type, and its only accent is a coral → pink → lilac gradient. Every section is interactive: a word wheel, a dot-matrix relight demo, a canvas globe with flight arcs, a pricing slider, and an FAQ that works like a chat.

## Type
Landing page / marketing site (one page, static HTML/CSS/JS, no build step)

## Vibe
Clean, bright and techy-minimal: white space, Inter, one soft coral-to-lilac gradient, a playful "generating" motion, and everything clickable

## Category
SaaS / AI tools (e-commerce product photography)

## Claude model used most
**Claude Opus 5.5** (`claude-opus-5-5`), in every Northform session

## How many tries
**About 8 major rounds** over 5 build sessions (Oct 9–16, 2026):
1 Next.js prototype → 2 reference sections → 3 HTML port + Popcorn hero top → 4 rejected "light, rendered" rebuild (rolled back) → 5 click-bug fix → 6 one design system → 7 sections rebuilt from Mobbin refs → 8 finalise to 3 files.
Each round also had several smaller fix prompts.

---

## Main prompt

> Build a one-page marketing site for **Northform**, a fictional AI studio that turns one written prompt into on-brand product photos and ad creatives for e-commerce brands. Tagline: "Describe it. We'll shoot it." Use plain HTML/CSS/JS in 3 files (index.html, style.css, script.js), with no framework. Use Lenis from a CDN for smooth scroll.
>
> **Design system:** white #fff / black #000 with a light/dark toggle, white cards, ink buttons and hairline dividers. Use **Inter 400/500 only**. The ONLY accent is a gradient `135deg #e5484d → #f08a8e → #c9c3f5`, used only where something is "made" or "live" (generate buttons, orbs, progress, the active plan, the footer wordmark).
>
> **Loader (once per session):** a prompt-box outline draws itself, types "Describe it. We'll shoot it." and presses generate.
>
> **Hero:** a centred pill nav (Northform® + links + theme toggle + Start free) and scene bars (Cycling / Night run / Surf). A prompt box with folder tabs and a notch types a prompt, presses generate and shrinks to the top-left. Then a floating collage builds around a product photo. The photo resolves from blur with a white shutter flash, and the cards and chips enter with a stagger. Lay it out on a fixed design canvas (1200×720 desktop, 390×560 mobile) scaled to fit. Add cursor drift and scroll parallax. Hover pauses it.
>
> **Sections, each interactive:** logo marquee → Problems (a blurred kinetic word wheel; the prompt box types the fix, with a before/after card) → Product tabs Brand kit / Relight / Every format (spec card + canvas dot-matrix + photo; drag across the dots to relight) → How it works (4 step cards with live miniatures and a gradient progress line) → Work (square tiles with the prompt as the title, a `<dialog>` viewer, and "Use this prompt" that fills the CTA) → Results bento on graph paper (count-ups, quotes, photo tiles) → Reach (a canvas dot globe with flight arcs between studios and landing ripples, steered by a city list) → Use-case prompt search (press `/` to focus) → Pricing (an images-per-month slider recommends a glowing plan, monthly/yearly toggle, savings count-up) → FAQ as a chat (typing dots, keyword-matched answers) → CTA prompt box (chips, attach a reference image, generate shimmer, then a sign-up dialog) → footer with a giant gradient wordmark sized in `cqi`.
>
> Sign-up and legal are native `<dialog>`s. Make it fully accessible, support reduced motion, use lazy WebP images, and only run rAF loops while a section is on screen.

## Follow-up prompts (in order)
1. "Build the hero first and stop so I can review it."
2. "Add new sections based on my reference images: each section maps to one reference." *(11 reference screenshots attached)*
3. "Convert it to plain HTML/CSS/JS."
4. "Redesign the top of the hero after this Popcorn reference: pill nav, segmented scene control. Keep the collage."
5. "The buttons and toggle don't work. Make everything functional and don't redesign." *(after the rejected rebuild)*
6. "Match the hero vibe across ALL sections. Rebuild them from hero components; don't just recolour."
7. "Redo every section except the hero. References: Jasper bento, OpenAI 'Latest updates', a jitter blurred word wheel, a Battersea→Heathrow card + dot-matrix. Use Mobbin for how-it-works, pricing and before/after. Remove the pinned scroll section because it glitches."
8. "Finalise: exactly 3 files plus a README, fix the clipped footer wordmark, optimise the images."

---

## Workflow
1. **Brief → hero only → review.** Build the hero first and stop for feedback.
2. **Reference mapping.** Turn each reference image into one section, and give each section a reason to exist.
3. **Port.** Next.js 15 + Tailwind 4 → plain HTML/CSS/JS.
4. **Bug hunt with real clicks.** An invisible `[hidden]` menu was swallowing every click. Test with real pointer clicks and `elementFromPoint`, not scripted `.click()`.
5. **One system.** Recolour every section to the hero tokens and rebuild them from hero components.
6. **Reference research.** Look up how-it-works, pricing and before/after patterns on the Mobbin MCP, then rebuild the sections.
7. **Verify.** Take headless Chrome/Edge screenshots over CDP at 375 / 958 / 1700px in light and dark, check the console, and look for horizontal overflow.
8. **Finalise.** Merge into 3 files, re-encode images with ffmpeg to WebP (816 KB → 540 KB), remove dead code, and write the README.

## Tech stack
- HTML, CSS (custom properties, container query units, `overflow: clip`), vanilla JS
- Lenis 1.3.26 (jsDelivr) for smooth scroll; Inter from Google Fonts
- Canvas 2D for the dot-matrix and the globe (4,862 land dots, inlined as `LAND`)
- First prototype only: Next.js 15, Tailwind CSS 4, Motion, lucide

---

## Skills used
| Skill | Used? | Notes |
|---|---|---|
| `anthropic-skills:built-in-browser` | ✅ | In-app browser pane for real-click testing and previews |
| `impeccable` | ❌ | Not invoked on this project |
| `ponytail` | ❌ | Not active while Northform was built (turned on later) |
| `design-taste-frontend` | ❌ | Not invoked |

**Recommended if you rebuild it:** `impeccable` (polish/critique passes), `design-taste-frontend` (avoids a templated look), `ponytail` (keeps the code to 3 lean files).

## Connectors / MCPs used
| Connector | Used? | What for |
|---|---|---|
| **Mobbin** | ✅ | `search_sections` / `search_screens` for the FLORA/Mews how-it-works, Chronicle/Spline pricing and V7 before/after patterns |
| **Claude Browser (in-app)** | ✅ | Dev-server preview (`preview_start`, port 5310), real pointer clicks, console checks |
| **Higgsfield** | ❌ | Not used. All photos are Unsplash stock, re-encoded to WebP |

## Other tools
- **Unsplash** for the product and lifestyle photos (25 WebPs, 540 KB total)
- **ffmpeg / libwebp** to resize and re-encode images
- **Headless Chrome/Edge over CDP** (scratchpad `shoot.mjs` / `shots.mjs`) for screenshots in light/dark/reduced motion. Run them one browser at a time, because parallel WebGL instances starve each other.
- `.claude/serve.mjs` as the static server (`node .claude/serve.mjs northform 5310`)

## References
Popcorn (hero top), Jasper.ai (bento), OpenAI "Latest updates" (tiles), Battersea→Heathrow card (product composition), jitter.video (blurred word wheel), FLORA / Mews (how it works), Chronicle / Spline (pricing), V7 (before/after), August (case-study card), plus the user's 11 original reference screenshots.
