# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**babyfairschedule.co.kr** — Korean parenting information site covering:
- Nationwide baby fair (베이비페어) schedules
- Night-care clinic (달빛어린이병원) and late-night pharmacy lookup by region
- Parenting blog articles (임신·육아 꿀팁)
- Regional government childcare benefit guides
- `aidiary/` sub-section: a separate "아이달력" baby-calendar app

## Tech Stack

- **No build system.** Pure static HTML/CSS/JS files — open any `.html` directly in a browser.
- **Netlify** for hosting + serverless functions (Node.js, no npm install needed for the functions).
- **Netlify Functions** (`netlify/functions/`): thin proxies to Korean government open APIs (data.go.kr) to avoid CORS issues from the browser.
- **Google Analytics** `G-69QTMS4KBS` included in every page.
- **Fonts**: Noto Sans KR, Noto Serif KR, DM Mono (Google Fonts CDN).

## Deployment

Push to the connected Git repo and Netlify auto-deploys. The Netlify functions are deployed automatically alongside the static files.

To test functions locally, install the Netlify CLI and run:
```
netlify dev
```
This serves the site at `localhost:8888` and makes functions available at `/.netlify/functions/<name>`.

## Architecture & Conventions

### Page categories (all root-level `.html` files)
| Pattern | Content |
|---|---|
| `index.html` | Homepage — nationwide baby fair schedule |
| `blog.html`, `blog-*.html` | Blog article index + individual posts |
| `night-care.html`, `night-care-*.html` | Night clinic finder hub + one page per city/district |
| `*-benefit.html` | Regional government childcare benefit guides |
| `befe-babyfair.html`, `cobe-babyfair.html`, `momsholic-babyfair.html` | Individual baby fair brand pages |
| `about.html`, `privacy.html`, `legal.html` | Static info pages |

### Shared design system (inline CSS, repeated per page)
All pages define the same CSS custom properties at `:root`. Primary values:
- `--primary: #ff6b6b` (coral red), `--primary-soft: #fff1f1`
- `--ink: #111827`, `--ink2: #4b5563`, `--ink3: #9ca3af`
- `--bg: #f7f8fa`, `--white: #ffffff`
- Max content width: `1100px` (narrow article pages use `780px`)
- Sticky header height: `56px`

**Exception**: `night-care.html` and its region pages use a dark-mode palette (`--bg: #0a0f1e`) with indigo (`--moon: #6366f1`) accents.

There is no shared CSS file — styles are inlined in each page's `<style>` block. When editing styles, update each relevant page individually and keep the `:root` variables consistent.

### SEO patterns (apply to every new page)
- `<link rel="canonical">` pointing to the full production URL
- Schema.org JSON-LD: `WebPage` or `Article` type + `BreadcrumbList` + `FAQPage` where appropriate
- Open Graph and Twitter Card meta tags

### Data files
- `aidiary/benefits.json` — structured list of Korean government childcare benefits (used client-side by the 아이달링 app). Schema: `{ version, lastUpdated, benefits[] }` where each benefit has `id, name, emoji, amount, amountNum, category, conditionMonthMin/Max, deadlineType/Value, url, place, desc, tip`.

### Netlify Functions
- `hospital.js` — proxies `ErmctInfoInqireService` (달빛어린이병원 list) from data.go.kr. Query params: `sido`, `page`.
- `pharmacy.js` — proxies `pharmacyInfoService` from data.go.kr. Query params: `sido`, `sigungu`, `page`.
- Both return raw JSON from the government API with `Access-Control-Allow-Origin: *`.
- The API key is hardcoded in the function source (public key for data.go.kr, low sensitivity).

### `sitemap.xml` and `robots.txt`
Manually maintained. Add new pages to `sitemap.xml` with `<lastmod>`, `<changefreq>`, and `<priority>` matching similar existing entries.
