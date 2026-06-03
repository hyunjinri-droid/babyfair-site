/**
 * 블로그 자동 발행 스크립트
 * Claude API로 육아 블로그 포스트 생성 → HTML 저장 → blog.html 카드 추가 → sitemap.xml 업데이트
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://www.babyfairschedule.co.kr';
const ROOT = path.join(__dirname, '..');

// 카테고리별 태그 기본 스타일
const TAG_STYLES = {
  육아정보:   { bg: '#fff1f1', color: '#c2410c' },
  베이비페어: { bg: '#fff1f1', color: '#c2410c' },
  출산지원금: { bg: '#ecfdf5', color: '#10b981' },
  임산부건강: { bg: '#f5f3ff', color: '#7c3aed' },
  지역별혜택: { bg: '#eff6ff', color: '#3b82f6' },
};

// ─── 메인 ─────────────────────────────────────────────────────────────────────

async function main() {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const dateKr  = dateStr.replace(/-/g, '.');        // YYYY.MM.DD

  // 기존 블로그 파일 목록 (slug만)
  const existingSlugs = fs.readdirSync(ROOT)
    .filter(f => /^blog-.+\.html$/.test(f))
    .map(f => f.replace('.html', ''));

  const prompt = buildPrompt(existingSlugs, dateStr);

  console.log('Claude API 호출 중...');
  const response = await client.messages.create({
    model: 'claude-opus-4-8',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].text;
  const data = extractJson(raw);

  if (!data || !data.slug || !data.bodyHtml) {
    throw new Error('응답 JSON 파싱 실패:\n' + raw.slice(0, 500));
  }

  console.log(`포스트 생성: ${data.slug}.html — "${data.title}"`);

  // slug 중복 방지
  const safeSuffix = existingSlugs.includes(data.slug) ? `-${Date.now()}` : '';
  const slug = data.slug + safeSuffix;

  // 1) 블로그 포스트 HTML 파일 저장
  const pageHtml = buildBlogPage(data, slug, dateStr, dateKr);
  fs.writeFileSync(path.join(ROOT, `${slug}.html`), pageHtml, 'utf8');
  console.log(`저장 완료: ${slug}.html`);

  // 2) blog.html에 카드 삽입
  insertCard(data, slug, dateKr);
  console.log('blog.html 카드 추가 완료');

  // 3) sitemap.xml 업데이트
  updateSitemap(slug, dateStr);
  console.log('sitemap.xml 업데이트 완료');
}

// ─── 프롬프트 ─────────────────────────────────────────────────────────────────

function buildPrompt(existingSlugs, dateStr) {
  return `당신은 babyfairschedule.co.kr 사이트의 한국 육아 전문 블로그 작가입니다.
오늘 날짜: ${dateStr}

아래 주제 풀에서 **아직 작성되지 않은 주제**를 하나 골라 2026년 최신 정보 기준으로 블로그 포스트를 작성해주세요.

## 주제 풀 (카테고리 [태그]):
- 아기 이유식 시작 시기와 단계별 진행 방법 2026 [육아정보]
- 신생아 수면 패턴과 수면 교육 완벽 가이드 [육아정보]
- 아기 예방접종 스케줄 월령별 완벽 정리 2026 [육아정보]
- 월령별 아기 발달 장난감·놀이 추천 [육아정보]
- 기저귀 발진 예방법과 집에서 치료하는 법 [육아정보]
- 신생아 황달 원인·증상·광선치료 총정리 [육아정보]
- 아기 변비 원인과 해결 방법 총정리 [육아정보]
- 영아 산통(배앓이) 원인과 달래기 방법 [육아정보]
- 아기 아토피 피부염 관리법과 보습제 선택 [육아정보]
- 영유아 건강검진 항목 시기별 총정리 2026 [육아정보]
- 아기 언어 발달 촉진법과 말이 늦을 때 대처법 [육아정보]
- 유아 분리불안 원인과 극복 방법 [육아정보]
- 아기 목욕 방법과 목욕 용품 선택 가이드 [육아정보]
- 신생아 모유수유 성공 가이드 [육아정보]
- 아기 보행기 사용법과 주의사항 [육아정보]
- 임신 중 철분제 복용 시기와 올바른 방법 [임산부건강]
- 임신 중 안전한 운동 방법과 금지 운동 [임산부건강]
- 임신 중 카페인·음식 주의사항 총정리 [임산부건강]
- 산후우울증 증상과 극복 방법 [임산부건강]
- 출산 준비물 완벽 체크리스트 2026 [베이비페어]
- 2026 베이비페어 사전등록 꿀팁과 혜택 총정리 [베이비페어]
- 아기 카시트 종류별 선택 가이드 2026 [베이비페어]
- 아기 침대·범퍼침대 선택법과 안전 사용법 [베이비페어]
- 2026 부모급여 수령 방법과 신청 절차 [출산지원금]
- 2026 첫만남이용권 사용처와 사용법 완전 가이드 [출산지원금]
- 2026 아동수당 신청 방법과 수령 꿀팁 [출산지원금]

## 이미 작성된 파일 (중복 주제 피해주세요):
${existingSlugs.join(', ')}

## 반드시 유효한 JSON으로만 응답해주세요 (마크다운 코드블럭 없이):
{
  "slug": "blog-영문-kebab-slug",
  "title": "SEO 최적화 한국어 제목 (40자 이내)",
  "cardTitle": "카드 제목 (줄바꿈은 <br>으로, 짧게)",
  "description": "메타 디스크립션 (80자 이내)",
  "cardDesc": "카드 설명 (60자 이내, 핵심 내용)",
  "category": "육아정보 또는 베이비페어 또는 출산지원금 또는 임산부건강 또는 지역별혜택",
  "keywords": "SEO 키워드를 쉼표로 구분",
  "emoji": "관련 이모지 1개",
  "thumbGradient": ["#색상1", "#색상2"],
  "labelText": "썸네일 레이블 텍스트 (10자 이내)",
  "labelEmoji": "레이블 이모지 1개",
  "labelBg": "rgba(R,G,B,.15)",
  "labelColor": "#색상코드",
  "readTime": 숫자,
  "faqs": [
    {"question": "자주 묻는 질문 1?", "answer": "구체적인 답변 내용"},
    {"question": "자주 묻는 질문 2?", "answer": "구체적인 답변 내용"},
    {"question": "자주 묻는 질문 3?", "answer": "구체적인 답변 내용"}
  ],
  "bodyHtml": "본문 HTML (아래 규칙 참고)"
}

## bodyHtml 작성 규칙:
- 2026년 한국 최신 정보 기준, 실용적이고 신뢰할 수 있는 내용
- 최소 2500자 이상의 충실한 본문
- 사용 가능 HTML 요소:
  <h2>섹션 제목</h2>
  <h3>소제목</h3>
  <p>단락 — <strong>강조</strong> 활용</p>
  <ul><li>항목</li></ul>  <ol><li>항목</li></ol>
  <table><thead><tr><th>헤더</th></tr></thead><tbody><tr><td>내용</td></tr></tbody></table>
  <div class="tip-box"><strong>💡 팁 제목</strong> 내용</div>
  <div class="green-box"><strong>✅ 제목</strong> 내용</div>
  <div class="blue-box"><strong>📋 제목</strong> 내용</div>
  <div class="orange-box"><strong>⚠️ 제목</strong> 내용</div>
  <div class="warn-box"><strong>🚨 제목</strong> 내용</div>
  <div class="yellow-box"><strong>⭐ 제목</strong> 내용</div>
  타임라인: <div class="timeline"><div class="tl-item"><div class="tl-dot d1">1</div><div class="tl-body"><div class="tl-title">제목</div><div class="tl-desc">설명</div></div></div></div>
  단계카드: <div class="stage-list"><div class="stage-card mild"><div class="stage-title">경증</div><p>내용</p></div></div>
  AdSense(본문 중간 1회): <div style="margin:24px 0;"><ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-2284090720087182" data-ad-slot="8862749299" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script></div>
- 마지막 섹션은 반드시 "마치며" 또는 "정리" 형태의 결론 포함`;
}

// ─── JSON 추출 ─────────────────────────────────────────────────────────────────

function extractJson(text) {
  // 마크다운 코드블럭 제거 시도
  const blockMatch = text.match(/```(?:json)?\s*([\s\S]+?)\s*```/);
  const raw = blockMatch ? blockMatch[1] : text;

  // 첫 번째 { ... } 블럭 추출
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start === -1 || end === -1) return null;

  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ─── 블로그 포스트 HTML 빌드 ──────────────────────────────────────────────────

function buildBlogPage(data, slug, dateStr, dateKr) {
  const tagStyle = TAG_STYLES[data.category] || TAG_STYLES['육아정보'];

  const faqLd = data.faqs && data.faqs.length > 0 ? `
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    ${data.faqs.map(f => `{"@type":"Question","name":${JSON.stringify(f.question)},"acceptedAnswer":{"@type":"Answer","text":${JSON.stringify(f.answer)}}}`).join(',\n    ')}
  ]
}
</script>` : '';

  return `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(data.title)} | 베이비페어 일정</title>
<meta name="description" content="${escHtml(data.description)}">
<meta name="keywords" content="${escHtml(data.keywords)}">
<meta name="robots" content="index, follow">
<link rel="canonical" href="${BASE_URL}/${slug}.html">
<meta property="og:type" content="article">
<meta property="og:title" content="${escHtml(data.title)}">
<meta property="og:description" content="${escHtml(data.description)}">
<meta property="og:url" content="${BASE_URL}/${slug}.html">
<meta property="og:site_name" content="베이비페어 일정">
<meta property="og:locale" content="ko_KR">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escHtml(data.title)}">
<meta name="twitter:description" content="${escHtml(data.description)}">

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": ${JSON.stringify(data.title)},
  "description": ${JSON.stringify(data.description)},
  "author": {"@type": "Organization", "name": "베이비페어 일정"},
  "publisher": {"@type": "Organization", "name": "베이비페어 일정", "url": "${BASE_URL}"},
  "datePublished": "${dateStr}",
  "dateModified": "${dateStr}",
  "url": "${BASE_URL}/${slug}.html",
  "inLanguage": "ko",
  "mainEntityOfPage": {"@type": "WebPage", "@id": "${BASE_URL}/${slug}.html"}
}
</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {"@type":"ListItem","position":1,"name":"홈","item":"${BASE_URL}/"},
    {"@type":"ListItem","position":2,"name":"육아 꿀팁","item":"${BASE_URL}/blog.html"},
    {"@type":"ListItem","position":3,"name":${JSON.stringify(data.title)},"item":"${BASE_URL}/${slug}.html"}
  ]
}
</script>${faqLd}

<script async src="https://www.googletagmanager.com/gtag/js?id=G-69QTMS4KBS"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-69QTMS4KBS');</script>

<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&family=Noto+Serif+KR:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet">

<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2284090720087182" crossorigin="anonymous"></script>

<style>
:root{--white:#fff;--bg:#f7f8fa;--border:#e8eaed;--border2:#d1d5db;--ink:#111827;--ink2:#4b5563;--ink3:#9ca3af;--primary:#ff6b6b;--primary-soft:#fff1f1;--primary-mid:#ffe0e0;--green:#10b981;--green-soft:#ecfdf5;--blue:#3b82f6;--blue-soft:#eff6ff;--orange:#f97316;--orange-soft:#fff7ed;--yellow:#f59e0b;--yellow-soft:#fffbeb;--purple:#8b5cf6;--purple-soft:#f5f3ff;--radius:12px;}
*{margin:0;padding:0;box-sizing:border-box;}html{scroll-behavior:smooth;}
body{background:var(--bg);color:var(--ink);font-family:'Noto Sans KR',sans-serif;font-size:15px;line-height:1.8;-webkit-font-smoothing:antialiased;}
header{background:var(--white);border-bottom:1px solid var(--border);height:56px;position:sticky;top:0;z-index:200;}
.h-in{max-width:1100px;margin:0 auto;padding:0 24px;height:100%;display:flex;align-items:center;gap:24px;}
.logo{display:flex;align-items:center;gap:8px;font-size:16px;font-weight:700;color:var(--ink);text-decoration:none;}
.logo-ic{width:28px;height:28px;border-radius:7px;background:var(--primary);display:flex;align-items:center;justify-content:center;font-size:15px;}
nav{display:flex;gap:2px;}.nav-a{padding:6px 12px;border-radius:6px;font-size:13px;font-weight:500;color:var(--ink2);text-decoration:none;transition:.15s;}.nav-a:hover,.nav-a.on{color:var(--primary);}
.h-cta{margin-left:auto;padding:7px 16px;border-radius:8px;background:var(--primary);color:white;font-size:13px;font-weight:600;text-decoration:none;white-space:nowrap;}.h-cta:hover{background:#e55f5f;}
.breadcrumb{max-width:780px;margin:0 auto;padding:14px 24px 0;font-size:12px;color:var(--ink3);}.breadcrumb a{color:var(--ink3);text-decoration:none;}.breadcrumb a:hover{color:var(--primary);}.breadcrumb span{margin:0 6px;}
.art-wrap{max-width:780px;margin:0 auto;padding:24px 24px 80px;}
.art-thumb{border-radius:var(--radius);height:180px;display:flex;align-items:center;justify-content:center;font-size:72px;margin-bottom:24px;}
.art-header{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:32px;margin-bottom:24px;}
.art-tags{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}
.tag{display:inline-flex;padding:3px 10px;border-radius:4px;font-size:11px;font-weight:700;}
.t-primary{background:var(--primary-soft);color:var(--primary);}
.t-green{background:var(--green-soft);color:var(--green);}
.t-blue{background:var(--blue-soft);color:var(--blue);}
.t-orange{background:var(--orange-soft);color:var(--orange);}
.t-purple{background:var(--purple-soft);color:var(--purple);}
.art-title{font-family:'Noto Serif KR',serif;font-size:26px;font-weight:700;line-height:1.35;margin-bottom:12px;letter-spacing:-.5px;}
.art-meta{font-size:12px;color:var(--ink3);display:flex;gap:14px;flex-wrap:wrap;padding-top:14px;border-top:1px solid var(--border);}
.art-body{background:var(--white);border:1px solid var(--border);border-radius:var(--radius);padding:32px;margin-bottom:16px;}
.art-body h2{font-family:'Noto Serif KR',serif;font-size:20px;font-weight:700;color:var(--ink);margin:32px 0 14px;padding-left:14px;border-left:4px solid var(--primary);line-height:1.4;}.art-body h2:first-child{margin-top:0;}
.art-body h3{font-size:16px;font-weight:700;color:var(--ink);margin:22px 0 10px;}
.art-body p{color:var(--ink2);margin-bottom:14px;line-height:1.85;}
.art-body ul{padding-left:20px;color:var(--ink2);margin-bottom:14px;}.art-body ul li{margin-bottom:8px;line-height:1.75;}
.art-body ol{padding-left:20px;color:var(--ink2);margin-bottom:14px;}.art-body ol li{margin-bottom:8px;line-height:1.75;}
.art-body strong{color:var(--ink);}
.art-body table{width:100%;border-collapse:collapse;margin:14px 0;font-size:14px;}
.art-body th{background:#f9fafb;padding:10px 14px;text-align:left;font-weight:600;border:1px solid var(--border);}
.art-body td{padding:10px 14px;border:1px solid var(--border);color:var(--ink2);line-height:1.6;}
.art-body tr:nth-child(even) td{background:#fafafa;}
.tip-box{background:var(--primary-soft);border:1px solid var(--primary-mid);border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;color:var(--ink2);}.tip-box strong{color:var(--primary);}
.green-box{background:var(--green-soft);border:1px solid #bbf7d0;border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;color:#065f46;}
.blue-box{background:var(--blue-soft);border:1px solid #bfdbfe;border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;color:#1e40af;}
.orange-box{background:var(--orange-soft);border:1px solid #fed7aa;border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;color:#7c2d12;}
.warn-box{background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;color:#991b1b;}
.yellow-box{background:var(--yellow-soft);border:1px solid #fde68a;border-radius:10px;padding:16px 18px;margin:18px 0;font-size:14px;color:#78350f;}
.timeline{display:flex;flex-direction:column;gap:0;margin:16px 0;}
.tl-item{display:flex;gap:16px;padding-bottom:20px;position:relative;}.tl-item:not(:last-child)::before{content:'';position:absolute;left:18px;top:38px;bottom:0;width:2px;background:var(--border);}
.tl-dot{width:38px;height:38px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;font-weight:700;}
.tl-dot.d1{background:#fef3c7;color:#92400e;}.tl-dot.d2{background:#fee2e2;color:#991b1b;}.tl-dot.d3{background:#fef9c3;color:#713f12;}.tl-dot.d4{background:#dcfce7;color:#166534;}
.tl-body{flex:1;padding-top:6px;}.tl-title{font-size:15px;font-weight:700;color:var(--ink);margin-bottom:4px;}.tl-desc{font-size:14px;color:var(--ink2);line-height:1.7;}
.stage-list{display:flex;flex-direction:column;gap:12px;margin:16px 0;}
.stage-card{border-radius:12px;padding:20px 22px;border-left:5px solid;}
.stage-card.mild{background:#f0fdf4;border-color:#22c55e;}.stage-card.mod{background:#fffbeb;border-color:#f59e0b;}.stage-card.sev{background:#fef2f2;border-color:#ef4444;}
.stage-title{font-size:15px;font-weight:700;margin-bottom:8px;}.stage-card.mild .stage-title{color:#15803d;}.stage-card.mod .stage-title{color:#b45309;}.stage-card.sev .stage-title{color:#b91c1c;}
.stage-card p{color:var(--ink2);font-size:14px;margin:0;}
.back-link{display:inline-flex;align-items:center;gap:6px;color:var(--ink3);font-size:13px;text-decoration:none;margin-bottom:20px;}.back-link:hover{color:var(--primary);}
footer{background:var(--ink);color:rgba(255,255,255,.4);padding:32px 24px;text-align:center;}
footer p{font-size:12px;line-height:1.8;}
.f-links{display:flex;gap:16px;justify-content:center;margin:10px 0;flex-wrap:wrap;}
.f-links a{color:rgba(255,255,255,.4);text-decoration:none;font-size:12px;}.f-links a:hover{color:rgba(255,255,255,.8);}
@media(max-width:640px){.art-wrap{padding:16px 16px 60px;}.art-header{padding:20px;}.art-body{padding:20px;}.art-title{font-size:22px;}header nav .nav-a{display:none;}}
</style>
</head>
<body>

<header>
  <div class="h-in">
    <a class="logo" href="index.html">
      <div class="logo-ic">🍼</div>베이비페어 일정
    </a>
    <nav>
      <a class="nav-a" href="index.html">전체 일정</a>
      <a class="nav-a on" href="blog.html">육아 꿀팁</a>
      <a class="nav-a" href="night-care.html" style="color:#a5b4fc;">🌙 야간진료</a>
    </nav>
    <a class="h-cta" href="index.html">일정 보기 →</a>
  </div>
</header>

<div class="breadcrumb">
  <a href="index.html">홈</a><span>›</span>
  <a href="blog.html">육아 꿀팁</a><span>›</span>
  ${escHtml(data.title)}
</div>

<div class="art-wrap">

  <a class="back-link" href="blog.html">← 블로그 목록으로</a>

  <div class="art-thumb" style="background:linear-gradient(135deg,${data.thumbGradient[0]},${data.thumbGradient[1]});">${data.emoji}</div>

  <div class="art-header">
    <div class="art-tags">
      <span class="tag" style="background:${tagStyle.bg};color:${tagStyle.color};">${escHtml(data.category)}</span>
    </div>
    <h1 class="art-title">${escHtml(data.title)}</h1>
    <div class="art-meta">
      <span>📅 ${dateKr}</span>
      <span>📖 ${data.readTime}분 읽기</span>
      <span>✍️ 베이비페어 일정 편집팀</span>
    </div>
  </div>

  <!-- AdSense 상단 -->
  <div style="margin-bottom:20px;">
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-2284090720087182" data-ad-slot="8862749299" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>
  </div>

  <div class="art-body">
${data.bodyHtml}
  </div>

  <!-- AdSense 하단 -->
  <div style="margin:24px 0;">
    <ins class="adsbygoogle" style="display:block" data-ad-client="ca-pub-2284090720087182" data-ad-slot="8862749299" data-ad-format="auto" data-full-width-responsive="true"></ins>
    <script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>
  </div>

  <div style="background:#fff;border:1px solid #e8eaed;border-radius:12px;padding:24px;text-align:center;margin-top:8px;">
    <p style="font-size:14px;color:#4b5563;margin-bottom:16px;">🍼 더 많은 육아 꿀팁이 궁금하다면?</p>
    <a href="blog.html" style="display:inline-block;padding:12px 28px;background:#ff6b6b;color:white;border-radius:8px;font-size:14px;font-weight:700;text-decoration:none;">블로그 목록 보기 →</a>
  </div>

</div>

<footer>
  <p>© 2026 babyfairschedule.co.kr — 전국 베이비페어 일정 & 육아 정보</p>
  <div class="f-links">
    <a href="index.html">베이비페어 일정</a>
    <a href="blog.html">육아 꿀팁</a>
    <a href="night-care.html">달빛어린이병원</a>
    <a href="privacy.html">개인정보처리방침</a>
    <a href="legal.html">이용약관</a>
  </div>
</footer>

</body>
</html>`;
}

// ─── blog.html 카드 삽입 ──────────────────────────────────────────────────────

function insertCard(data, slug, dateKr) {
  const blogPath = path.join(ROOT, 'blog.html');
  let html = fs.readFileSync(blogPath, 'utf8');

  const tagStyle = TAG_STYLES[data.category] || TAG_STYLES['육아정보'];
  const g1 = data.thumbGradient[0];
  const g2 = data.thumbGradient[1];

  const cardHtml = `
    <!-- ${escHtml(data.title)} -->
    <div class="art-card" onclick="location.href='${slug}.html'" data-category="${escAttr(data.category)}" data-title="${escAttr(data.title)}" data-desc="${escAttr(data.cardDesc || data.description)}">
      <div class="art-thumb" style="background:linear-gradient(135deg,${g1},${g2});height:180px;display:flex;align-items:center;justify-content:center;font-size:56px;position:relative;">
        ${data.emoji}
        <div class="art-thumb-label" style="background:${data.labelBg};color:${data.labelColor};">${data.labelEmoji} ${escHtml(data.labelText)}</div>
      </div>
      <div class="card-body">
        <div class="art-meta">
          <span class="art-tag" style="background:${tagStyle.bg};color:${tagStyle.color};">${escHtml(data.category)}</span>
          <span class="art-date">${dateKr}</span>
          <span class="art-read">📖 ${data.readTime}분 읽기</span>
        </div>
        <div class="art-title">${data.cardTitle || escHtml(data.title)}</div>
        <div class="art-desc">${escHtml(data.cardDesc || data.description)}</div>
        <span class="art-more">자세히 읽기 →</span>
      </div>
    </div>
`;

  // <main> 바로 다음에 새 카드 삽입 (최신 글이 맨 위)
  const MARKER = '  <main>\n';
  const idx = html.indexOf(MARKER);
  if (idx === -1) throw new Error('blog.html에서 <main> 태그를 찾을 수 없습니다');

  html = html.slice(0, idx + MARKER.length) + cardHtml + html.slice(idx + MARKER.length);
  fs.writeFileSync(blogPath, html, 'utf8');
}

// ─── sitemap.xml 업데이트 ─────────────────────────────────────────────────────

function updateSitemap(slug, dateStr) {
  const sitemapPath = path.join(ROOT, 'sitemap.xml');
  let xml = fs.readFileSync(sitemapPath, 'utf8');

  const newEntry = `  <url>
    <loc>${BASE_URL}/${slug}.html</loc>
    <lastmod>${dateStr}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>`;

  // blog.html <lastmod> 업데이트
  xml = xml.replace(
    /(<loc>https:\/\/www\.babyfairschedule\.co\.kr\/blog\.html<\/loc>\s*<lastmod>)[^<]+(<\/lastmod>)/,
    `$1${dateStr}$2`
  );

  // 새 URL을 blog.html 항목 바로 뒤에 삽입
  const blogEntry = '<loc>https://www.babyfairschedule.co.kr/blog.html</loc>';
  const afterBlogBlock = xml.indexOf('</url>', xml.indexOf(blogEntry)) + '</url>'.length;
  xml = xml.slice(0, afterBlogBlock) + '\n' + newEntry + xml.slice(afterBlogBlock);

  fs.writeFileSync(sitemapPath, xml, 'utf8');
}

// ─── 유틸리티 ─────────────────────────────────────────────────────────────────

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escAttr(str) {
  return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ─── 실행 ─────────────────────────────────────────────────────────────────────

main().catch(err => {
  console.error('오류 발생:', err.message);
  process.exit(1);
});
