#!/usr/bin/env node
/**
 * babyfairschedule.co.kr 일정 빌드 스크립트
 *
 * data/events.json 하나만 읽어서 다음을 전부 생성합니다:
 *   1. index.html <head>의 JSON-LD (Schema.org Event 배열)
 *   2. index.html 본문의 일정 카드 목록
 *   3. event/{id}.html  — 행사별 개별 페이지 (SEO 롱테일용)
 *   4. sitemap.xml
 *
 * 실행: node scripts/build.mjs
 * 의존성 없음 (Node 18+)
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://www.babyfairschedule.co.kr";

// ── 설정 ────────────────────────────────────────────────────────────
const PATHS = {
  events: join(ROOT, "data/events.json"),
  index: join(ROOT, "index.html"),
  template: join(ROOT, "templates/event.html"),
  eventDir: join(ROOT, "event"),
  sitemap: join(ROOT, "sitemap.xml"),
};

// index.html 안에 아래 주석 마커를 넣어두면 그 사이를 덮어씁니다.
const MARKERS = {
  jsonld: ["<!-- BUILD:JSONLD:START -->", "<!-- BUILD:JSONLD:END -->"],
  fairs: ["// BUILD:FAIRS:START", "// BUILD:FAIRS:END"],
};

// ── 유틸 ────────────────────────────────────────────────────────────
const esc = (s = "") =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
    .replace(/>/g, "&gt;").replace(/"/g, "&quot;");

const today = () => {
  // KST 기준 오늘 날짜 (GitHub Actions는 UTC로 도므로 보정)
  const d = new Date(Date.now() + 9 * 3600 * 1000);
  return d.toISOString().slice(0, 10);
};

const fmtRange = (s, e) => {
  const [, sm, sd] = s.split("-");
  const [, em, ed] = e.split("-");
  const dow = ["일", "월", "화", "수", "목", "금", "토"];
  const w = (x) => dow[new Date(x + "T00:00:00+09:00").getDay()];
  return sm === em
    ? `${+sm}월 ${+sd}일(${w(s)}) ~ ${+ed}일(${w(e)})`
    : `${+sm}월 ${+sd}일(${w(s)}) ~ ${+em}월 ${+ed}일(${w(e)})`;
};

const daysUntil = (date) =>
  Math.round(
    (new Date(date + "T00:00:00+09:00") - new Date(today() + "T00:00:00+09:00")) / 86400000
  );

// ── 로드 & 검증 ─────────────────────────────────────────────────────
const raw = JSON.parse(readFileSync(PATHS.events, "utf8"));
const events = raw.events;
const problems = [];
const seen = new Set();

for (const ev of events) {
  if (seen.has(ev.id)) problems.push(`중복 id: ${ev.id}`);
  seen.add(ev.id);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.startDate)) problems.push(`${ev.id}: startDate 형식 오류`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ev.endDate)) problems.push(`${ev.id}: endDate 형식 오류`);
  if (ev.endDate < ev.startDate) problems.push(`${ev.id}: 종료일이 시작일보다 빠름`);
  if (!ev.name || !ev.venue) problems.push(`${ev.id}: name 또는 venue 누락`);
}
if (problems.length) {
  console.error("❌ 데이터 오류:\n" + problems.map((p) => "  - " + p).join("\n"));
  process.exit(1);
}

const T = today();
for (const ev of events) {
  ev.status = ev.endDate < T ? "ended" : ev.startDate <= T ? "ongoing" : "upcoming";
  ev.url = `${SITE}/event/${ev.id}.html`;
  ev.dday = daysUntil(ev.startDate);
}
events.sort((a, b) => a.startDate.localeCompare(b.startDate));

const upcoming = events.filter((e) => e.status !== "ended");

/** 종료된 행사에서 안내할 "다음 회차" 찾기 — 같은 주최사+도시 > 같은 주최사 > 아무거나 */
const nextFor = (ev) =>
  upcoming.find((e) => e.organizer === ev.organizer && e.city === ev.city) ||
  upcoming.find((e) => e.organizer === ev.organizer) ||
  upcoming[0] || null;

// ── 1. JSON-LD ──────────────────────────────────────────────────────
// 종료된 행사는 제외합니다. Google은 지난 이벤트를 구조화 데이터로 취급하지 않고,
// 넣어두면 "만료된 이벤트" 경고가 Search Console에 쌓입니다.
const jsonld = {
  "@context": "https://schema.org",
  "@graph": upcoming.map((ev) => ({
    "@type": "Event",
    name: ev.name,
    startDate: ev.openTime ? `${ev.startDate}T${ev.openTime}:00+09:00` : ev.startDate,
    endDate: ev.closeTime ? `${ev.endDate}T${ev.closeTime}:00+09:00` : ev.endDate,
    eventStatus: "https://schema.org/EventScheduled",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    location: {
      "@type": "Place",
      name: ev.venue,
      ...(ev.address
        ? { address: { "@type": "PostalAddress", streetAddress: ev.address, addressCountry: "KR" } }
        : { address: { "@type": "PostalAddress", addressLocality: ev.city, addressCountry: "KR" } }),
    },
    organizer: { "@type": "Organization", name: ev.organizer, url: ev.organizerUrl || SITE },
    url: ev.url,
    ...(ev.preRegUrl
      ? {
          offers: {
            "@type": "Offer",
            url: ev.preRegUrl,
            price: ev.preRegFree ? "0" : undefined,
            priceCurrency: "KRW",
            availability: "https://schema.org/InStock",
            validFrom: T,
          },
        }
      : {}),
  })),
};

const jsonldBlock =
  `<script type="application/ld+json">\n${JSON.stringify(jsonld, null, 2)}\n</script>`;

// ── 2. FAIRS JS 배열 ─────────────────────────────────────────────────
// 기존 index.html의 FAIRS 배열을 덮어씁니다 (JS 렌더링 방식 유지).
const DOW = ["일", "월", "화", "수", "목", "금", "토"];
const fairsArray = events.map((ev) => {
  const sd = new Date(ev.startDate + "T00:00:00+09:00");
  return {
    id: ev.id,
    month: sd.getMonth() + 1,
    day: sd.getDate(),
    name: ev.name,
    brand: ev.organizer,
    type: ev.type || "베이비페어",
    region: ev.region,
    venue: ev.venue,
    startDate: ev.startDate,
    endDate: ev.endDate,
    time: ev.openTime && ev.closeTime ? `${ev.openTime}~${ev.closeTime}` : "공식 홈페이지 확인",
    admission: "사전등록 무료",
    prereg: !!ev.preRegUrl,
    officialUrl: ev.officialUrl || ev.organizerUrl || SITE,
    preRegUrl: ev.preRegUrl || "",
    confirmed: ev.confirmed !== false,
    status: ev.status,
    eventPageUrl: `/event/${ev.id}.html`,
    color: "#ff6b6b",
  };
});

const fairsBlock = `const FAIRS = ${JSON.stringify(fairsArray, null, 2)};`;

// ── 3. index.html 주입 ──────────────────────────────────────────────
const inject = (html, [start, end], block) => {
  const i = html.indexOf(start);
  const j = html.indexOf(end);
  if (i === -1 || j === -1) {
    console.warn(`⚠️  마커를 못 찾았습니다: ${start} — index.html에 추가해 주세요.`);
    return html;
  }
  return html.slice(0, i + start.length) + "\n" + block + "\n" + html.slice(j);
};

if (existsSync(PATHS.index)) {
  let html = readFileSync(PATHS.index, "utf8");
  html = inject(html, MARKERS.jsonld, jsonldBlock);
  html = inject(html, MARKERS.fairs, fairsBlock);
  writeFileSync(PATHS.index, html);
  console.log("✅ index.html 갱신");
} else {
  console.warn("⚠️  index.html 없음 — 스킵");
}

// ── 4. 행사별 페이지 ────────────────────────────────────────────────
mkdirSync(PATHS.eventDir, { recursive: true });
const tpl = readFileSync(PATHS.template, "utf8");

for (const ev of events) {
  const next = ev.status === "ended" ? nextFor(ev) : null;
  const title = `${ev.name} 일정·사전등록 총정리 | ${fmtRange(ev.startDate, ev.endDate).split("~")[0].trim()}`;
  const desc =
    ev.status === "ended"
      ? `${ev.name}은(는) ${fmtRange(ev.startDate, ev.endDate)} ${ev.venue}에서 종료되었습니다.` +
        (next ? ` 다음 회차는 ${next.name} (${fmtRange(next.startDate, next.endDate)})입니다.` : "")
      : `${ev.name} ${fmtRange(ev.startDate, ev.endDate)} ${ev.venue} 개최. 일정·장소·사전등록 무료입장 방법을 한눈에 확인하세요.`;

  const statusBox =
    ev.status === "ended"
      ? `<div class="notice notice--ended">
          <strong>이 행사는 종료되었습니다.</strong>
          ${next ? `<p>다음 회차: <a href="/event/${esc(next.id)}.html">${esc(next.name)}</a> · ${esc(fmtRange(next.startDate, next.endDate))} · ${esc(next.venue)}</p>` : ""}
        </div>`
      : ev.status === "ongoing"
      ? `<div class="notice notice--live"><strong>지금 진행 중입니다</strong> · ${esc(fmtRange(ev.startDate, ev.endDate))}</div>`
      : `<div class="notice notice--soon"><strong>D-${ev.dday}</strong> · 개막까지 ${ev.dday}일 남았습니다</div>`;

  const prereg = ev.preRegUrl
    ? `<a class="btn btn--primary" href="${esc(ev.preRegUrl)}" target="_blank" rel="noopener nofollow">사전등록 바로가기 →</a>`
    : `<p class="muted">사전등록 페이지는 아직 열리지 않았습니다. 보통 행사 3~4주 전에 오픈되며, 확인되는 대로 이 페이지에 링크를 추가합니다.</p>`;

  const confirmNote = ev.confirmed
    ? ""
    : `<p class="muted">⚠️ 이 일정은 주최사가 <strong>예상 일정</strong>으로 안내한 것입니다. 방문 전 <a href="${esc(ev.officialUrl || ev.organizerUrl)}" target="_blank" rel="noopener nofollow">공식 홈페이지</a>에서 반드시 확인해 주세요.</p>`;

  const out = tpl
    .replaceAll("{{TITLE}}", esc(title))
    .replaceAll("{{DESCRIPTION}}", esc(desc))
    .replaceAll("{{CANONICAL}}", ev.url)
    .replaceAll("{{NAME}}", esc(ev.name))
    .replaceAll("{{ORGANIZER}}", esc(ev.organizer))
    .replaceAll("{{ORGANIZER_URL}}", esc(ev.organizerUrl || SITE))
    .replaceAll("{{VENUE}}", esc(ev.venue))
    .replaceAll("{{CITY}}", esc(ev.city))
    .replaceAll("{{REGION}}", esc(ev.region))
    .replaceAll("{{DATE_RANGE}}", esc(fmtRange(ev.startDate, ev.endDate)))
    .replaceAll("{{START_DATE}}", ev.startDate)
    .replaceAll("{{END_DATE}}", ev.endDate)
    .replaceAll("{{HOURS}}", ev.openTime && ev.closeTime ? `${ev.openTime} ~ ${ev.closeTime}` : "공식 홈페이지 확인")
    .replaceAll("{{STATUS_BOX}}", statusBox)
    .replaceAll("{{PREREG}}", prereg)
    .replaceAll("{{CONFIRM_NOTE}}", confirmNote)
    .replaceAll("{{VERIFIED_AT}}", ev.verifiedAt || "")
    .replaceAll("{{JSONLD}}", ev.status === "ended" ? "" : `<script type="application/ld+json">${JSON.stringify(jsonld["@graph"].find((e) => e.url === ev.url) || {})}</script>`);

  writeFileSync(join(PATHS.eventDir, `${ev.id}.html`), out);
}
console.log(`✅ event/ 페이지 ${events.length}개 생성`);

// ── 5. sitemap.xml ──────────────────────────────────────────────────
const staticPages = [
  "/", "/blog.html", "/blog-region.html", "/blog-prereg.html", "/blog-guide.html",
  "/night-care.html", "/subsidy.html", "/befe-babyfair.html", "/cobe-babyfair.html",
  "/momsholic-babyfair.html", "/kintex-babyfair.html", "/coex-babyfair.html",
  "/kintex-prereg.html", "/coex-free.html", "/blog-babyfair-supplies.html",
  "/blog-checklist.html", "/about.html",
];

const urls = [
  ...staticPages.map((p) => ({ loc: SITE + p, pri: p === "/" ? "1.0" : "0.7", freq: "weekly" })),
  ...events.map((ev) => ({
    loc: ev.url,
    pri: ev.status === "ended" ? "0.3" : ev.dday <= 30 ? "0.9" : "0.6",
    freq: ev.status === "ended" ? "monthly" : "daily",
  })),
];

writeFileSync(
  PATHS.sitemap,
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${T}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join("\n")}
</urlset>
`
);
console.log(`✅ sitemap.xml (${urls.length} URL)`);

// ── 리포트 ──────────────────────────────────────────────────────────
const byOrg = {};
for (const e of events) byOrg[e.organizer] = (byOrg[e.organizer] || 0) + 1;

console.log(`
──────────────────────────────
전체 ${events.length}건 · 예정 ${upcoming.length}건 · 종료 ${events.length - upcoming.length}건
주최사별: ${Object.entries(byOrg).map(([k, v]) => `${k} ${v}`).join(", ")}
미확정(예상) 일정: ${events.filter((e) => !e.confirmed).length}건
사전등록 링크 없음: ${upcoming.filter((e) => !e.preRegUrl).length}건  ← 채우면 전환 개선
다음 행사: ${upcoming[0] ? `${upcoming[0].name} (D-${upcoming[0].dday})` : "없음"}
──────────────────────────────`);
