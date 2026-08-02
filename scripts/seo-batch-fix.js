#!/usr/bin/env node
/**
 * SEO 일괄 처리 스크립트
 * 1. blog-*.html 파일에서 meta description 120~150자로 확장
 * 2. "관련 글" 섹션 누락된 파일에 추가
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// ─── 카테고리 분류 ──────────────────────────────────────────────────────────────

function getCategory(filename) {
  if (filename.includes('-benefit') || filename.includes('firstwelcome') || filename.includes('parental-benefit') || filename.includes('child-allowance') || filename.includes('insurance')) return 'benefit';
  if (filename.includes('babyfair') || filename.includes('checklist') || filename.includes('supplies') || filename.includes('baby-vs-edu')) return 'babyfair';
  if (filename.includes('pregnancy') || filename.includes('caffeine') || filename.includes('gestational') || filename.includes('headache') || filename.includes('preeclampsia') || filename.includes('ppd') || filename.includes('iron') || filename.includes('checkup') || filename.includes('ultrasound') || filename.includes('food-bad') || filename.includes('food-good') || filename.includes('dental')) return 'pregnancy';
  if (filename.includes('vaccine') || filename.includes('fever') || filename.includes('febrile') || filename.includes('hfmd') || filename.includes('vomit') || filename.includes('diarrhea') || filename.includes('night-care') || filename.includes('nightcare') || filename.includes('night-cough')) return 'illness';
  if (filename.includes('newborn') || filename.includes('jaundice') || filename.includes('bath') || filename.includes('eczema') || filename.includes('colic') || filename.includes('babyheat') || filename.includes('breastfeeding') || filename.includes('sleep-position')) return 'newborn';
  if (filename.includes('weaning') || filename.includes('iron') || filename.includes('sleep-training') || filename.includes('sleep-pattern') || filename.includes('language') || filename.includes('toys') || filename.includes('walker') || filename.includes('constipation') || filename.includes('diaper-rash') || filename.includes('separation-anxiety') || filename.includes('dental') || filename.includes('babycheck')) return 'childcare';
  if (filename.includes('guide') || filename.includes('stroller') || filename.includes('carseat') || filename.includes('crib') || filename.includes('wagon') || filename.includes('fan') || filename.includes('bath-products')) return 'product';
  if (filename.includes('birth-registration') || filename.includes('prereg') || filename.includes('dday') || filename.includes('wonderweeks') || filename.includes('travel') || filename.includes('summer')) return 'info';
  return 'general';
}

// ─── 카테고리별 관련 글 링크 맵 ───────────────────────────────────────────────

const RELATED_BY_CATEGORY = {
  benefit: [
    { href: 'blog-firstwelcome.html', icon: '🎁', label: '첫만남이용권', title: '첫만남이용권 사용처·사용법 2026 완전정복' },
    { href: 'blog-2026-parental-benefit.html', icon: '💰', label: '부모급여', title: '2026 부모급여 지급액·신청 방법 총정리' },
    { href: 'blog-2026-child-allowance.html', icon: '👶', label: '아동수당', title: '2026 아동수당 신청 방법과 수령 꿀팁' },
    { href: 'blog-gyeonggi-benefit.html', icon: '📍', label: '지역혜택', title: '경기도 출산·육아 지원금 한눈에 보기' },
    { href: 'blog-region.html', icon: '🗺️', label: '지역별혜택', title: '지역별 출산지원금 총정리' },
  ],
  babyfair: [
    { href: 'blog-babyfair-guide.html', icon: '🏪', label: '베이비페어', title: '베이비페어 완벽 가이드 — 처음 가는 분 필독' },
    { href: 'blog-checklist.html', icon: '✅', label: '준비물', title: '베이비페어 준비물 체크리스트' },
    { href: 'blog-babyfair-supplies.html', icon: '🛍️', label: '추천 품목', title: '베이비페어 꼭 사야 할 준비물 6가지' },
    { href: 'blog-baby-vs-edu.html', icon: '🏫', label: '박람회 비교', title: '베이비페어 vs 유아교육전 차이점 총정리' },
    { href: 'blog-stroller-guide.html', icon: '🛒', label: '유모차', title: '유모차 종류별 비교 구매 가이드 2026' },
  ],
  pregnancy: [
    { href: 'blog-checkup.html', icon: '🩺', label: '산전검사', title: '임산부 검진 일정 주수별 완벽 가이드' },
    { href: 'blog-food-good.html', icon: '🥗', label: '먹어도 되는 음식', title: '임산부 먹어도 되는 음식 총정리 2026' },
    { href: 'blog-food-bad.html', icon: '🚫', label: '금지 음식', title: '임산부 먹으면 안 되는 음식 총정리 2026' },
    { href: 'blog-caffeine.html', icon: '☕', label: '카페인', title: '임산부 카페인 하루 권장량 총정리 2026' },
    { href: 'blog-iron.html', icon: '💊', label: '철분제', title: '임산부 철분제 복용법·부작용 총정리 2026' },
  ],
  illness: [
    { href: 'blog-fever-guide.html', icon: '🌡️', label: '열날 때', title: '아이 열날 때 대처법 — 해열제 교차 복용 총정리' },
    { href: 'blog-febrile-seizure.html', icon: '⚡', label: '열성경련', title: '소아 열성경련 대처법 — 당황하지 않는 부모 가이드' },
    { href: 'blog-hfmd.html', icon: '🖐️', label: '수족구병', title: '수족구병 증상·전염·격리 기간 총정리 2026' },
    { href: 'blog-vomit-diarrhea.html', icon: '🤢', label: '구토·설사', title: '아기 구토·설사 대처법과 탈수 예방 총정리' },
    { href: 'blog-night-care-vs-er.html', icon: '🏥', label: '달빛병원', title: '달빛어린이병원 vs 응급실, 언제 어디로 갈까?' },
  ],
  newborn: [
    { href: 'blog-newborn-bath.html', icon: '🛁', label: '신생아 목욕', title: '신생아 목욕 방법·온도·욕조 선택 총정리 2026' },
    { href: 'blog-sleep-position.html', icon: '💤', label: '수면 자세', title: '신생아 수면 자세 — 안전한 방법 총정리' },
    { href: 'blog-jaundice.html', icon: '🌼', label: '황달', title: '신생아 황달 원인·증상·치료 총정리 2026' },
    { href: 'blog-infant-colic.html', icon: '😢', label: '영아산통', title: '영아 산통 원인과 달래기 방법 총정리 2026' },
    { href: 'blog-breastfeeding.html', icon: '🤱', label: '모유수유', title: '모유수유 방법·자세 총정리 2026' },
  ],
  childcare: [
    { href: 'blog-weaning.html', icon: '🥣', label: '이유식', title: '이유식 시작 시기와 단계별 진행 방법 총정리' },
    { href: 'blog-vaccine.html', icon: '💉', label: '예방접종', title: '아기 예방접종 스케줄 월령별 완벽 정리 2026' },
    { href: 'blog-sleep-training.html', icon: '🌙', label: '수면 교육', title: '신생아 수면 교육 — 월령별 단계별 총정리' },
    { href: 'blog-baby-language-development.html', icon: '💬', label: '언어 발달', title: '아기 언어 발달 촉진법과 말 늦을 때 대처법' },
    { href: 'blog-baby-toys-by-month.html', icon: '🧸', label: '발달 장난감', title: '월령별 아기 발달 장난감 추천 가이드' },
  ],
  product: [
    { href: 'blog-stroller-guide.html', icon: '🛒', label: '유모차', title: '유모차 종류별 비교 구매 가이드 2026' },
    { href: 'blog-carseat-guide.html', icon: '🚗', label: '카시트', title: '카시트 종류별 비교 구매 가이드 2026' },
    { href: 'blog-baby-crib-guide.html', icon: '🛏️', label: '아기 침대', title: '아기 침대 종류별 특징과 안전 가이드 2026' },
    { href: 'blog-babyfair-guide.html', icon: '🏪', label: '베이비페어', title: '베이비페어 완벽 가이드 — 처음 가는 분 필독' },
    { href: 'blog-checklist.html', icon: '✅', label: '준비물 체크리스트', title: '베이비페어 준비물 체크리스트' },
  ],
  info: [
    { href: 'blog-birth-registration.html', icon: '📋', label: '출생신고', title: '출생신고 방법 총정리 2026 — 온라인·방문 신청' },
    { href: 'blog-firstwelcome.html', icon: '🎁', label: '첫만남이용권', title: '첫만남이용권 사용처·사용법 2026 완전정복' },
    { href: 'blog-2026-parental-benefit.html', icon: '💰', label: '부모급여', title: '2026 부모급여 지급액·신청 방법 총정리' },
    { href: 'blog-vaccine.html', icon: '💉', label: '예방접종', title: '아기 예방접종 스케줄 월령별 완벽 정리 2026' },
    { href: 'blog.html', icon: '📚', label: '블로그', title: '임신·육아 꿀팁 블로그 전체 보기' },
  ],
  general: [
    { href: 'blog-firstwelcome.html', icon: '🎁', label: '첫만남이용권', title: '첫만남이용권 사용처·사용법 2026 완전정복' },
    { href: 'blog-vaccine.html', icon: '💉', label: '예방접종', title: '아기 예방접종 스케줄 월령별 완벽 정리 2026' },
    { href: 'blog-fever-guide.html', icon: '🌡️', label: '열날 때', title: '아이 열날 때 대처법 총정리' },
    { href: 'blog.html', icon: '📚', label: '블로그', title: '임신·육아 꿀팁 블로그 전체 보기' },
  ],
};

function buildRelatedSection(links) {
  const cards = links.slice(0, 4).map(l =>
    `      <a style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:16px;text-decoration:none;display:block;" href="${l.href}"><div style="font-size:11px;color:#9ca3af;margin-bottom:4px;">${l.icon} ${l.label}</div><div style="font-size:14px;font-weight:600;color:#111827;line-height:1.4;">${l.title}</div></a>`
  ).join('\n');
  return `\n  <!-- 관련 글 -->\n  <div style="max-width:780px;margin:32px auto 0;padding:0 20px;">\n    <div style="font-size:14px;font-weight:700;color:#4b5563;margin-bottom:14px;">🔗 함께 읽으면 좋은 글</div>\n    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;">\n${cards}\n    </div>\n  </div>\n`;
}

// ─── Meta description 확장 규칙 ───────────────────────────────────────────────

// 파일명 기반으로 desc 보강 suffix 반환 (현재 desc가 120자 미만일 때)
const DESC_SUFFIX = {
  'blog-baby-constipation.html': ' 변비 예방 습관부터 분유·모유수유별 차이, 이유식 시작 후 변비 대처법, 소아과 방문 기준까지 한눈에 확인하세요.',
  'blog-2026-child-allowance.html': ' 2026년부터 만 9세 미만으로 확대된 지급 연령, 신청 누락 시 소급 적용 여부, 지급일까지 꼼꼼히 정리했습니다.',
  'blog-2026-firstwelcome-usage.html': ' 국민행복카드 발급 방법, 사용 불가 항목, 잔액 조회 방법, 2026년 사용 기한 변경사항까지 꼼꼼히 정리했습니다.',
  'blog-2026-parental-benefit.html': ' 0세 70만원·1세 35만원 부모급여 신청 방법, 어린이집 이용 시 차액 지급 기준, 아동수당·첫만남이용권과의 차이점까지 총정리했습니다.',
  'blog-baby-bath-products-guide.html': ' 월령별 적합한 베이비 로션, 샴푸, 목욕용품 고르는 법과 성분 확인 포인트, 인기 제품 비교까지 2026년 최신 기준으로 정리했습니다.',
  'blog-baby-crib-guide.html': ' 범퍼침대 사용 기준, 안전 인증 마크 확인법, 옆면 개폐형 vs 고정형 비교, 연령별 교체 시기까지 꼼꼼히 정리했습니다.',
  'blog-baby-language-development.html': ' 언어 발달 지연 판별 기준, 언어 자극 놀이법 10가지, 이중 언어 환경의 영향, 언어 치료 시작 시기까지 완벽 가이드로 확인하세요.',
  'blog-baby-toys-by-month.html': ' 발달 단계별 놀이 원리, 인지·대근육·소근육 자극 장난감 선택법, 안전 인증 확인 방법까지 꼼꼼히 담았습니다.',
  'blog-baby-vaccine-schedule-detail-2026.html': ' BCG·B형간염·로타바이러스·DTaP 등 필수 예방접종 세부 일정, 무료·유료 구분, 접종 후 이상반응 대처법까지 완벽 정리했습니다.',
  'blog-baby-vs-edu.html': ' 베이비페어는 출산 준비, 유교전은 3세 이상 교육에 특화되어 있어요. 시기별 추천 박람회와 필수 체크리스트까지 함께 확인하세요.',
  'blog-baby-walker-guide.html': ' 보행기 사용 금지 연령, 안전 기준, 쏘서·점퍼루 대안 비교, 골반 발달에 미치는 영향까지 최신 소아과 권고 기준으로 정리했습니다.',
  'blog-baby-weaning-start-2026.html': ' 이유식 거부 대처법, 월령별 식재료 도입 순서, 알레르기 확인 방법, 시판 이유식 vs 자가 제조 비교까지 실전 꿀팁을 담았습니다.',
  'blog-babyfair-guide.html': ' 현장 등록 vs 사전 등록 차이, 할인 쿠폰 받는 법, 아기와 함께 갈 때 동선 짜는 팁, 추천 품목 우선순위까지 실전 가이드입니다.',
  'blog-babyfair-supplies.html': ' 행사장에서 쉽게 지치는 아기를 위한 필수 아이템, 현장 구매보다 사전 체크가 유리한 품목, 가방 무게 줄이는 팁까지 담았어요.',
  'blog-babyheat.html': ' 태열과 아토피 구분법, 목욕 온도 및 횟수 조절, 보습제 선택 기준, 병원 가야 할 위험 신호까지 소아과 기준으로 안내합니다.',
  'blog-birth-registration.html': ' 출생신고 기간 30일 초과 시 과태료, 외국 출생 신고 방법, 출생신고와 동시에 신청 가능한 복지혜택 목록까지 완벽 정리했습니다.',
  'blog-breastfeeding.html': ' 모유 부족 판단 기준, 유두 혼동 예방법, 직장 복귀 후 수유 유지법, 유선염 셀프 관리법까지 실전 수유 가이드를 담았습니다.',
  'blog-caffeine.html': ' 음료별·식품별 카페인 함량 비교표, 디카페인의 실제 카페인 함량, 카페인 초과 시 태아에 미치는 영향, 안심 대체 음료까지 총정리했습니다.',
  'blog-carseat-guide.html': ' 신생아·영아·유아·주니어 카시트 단계별 선택 기준, 안전 인증(ECE R44/R129) 확인법, 설치 방식 비교, 인기 제품 추천까지 정리했습니다.',
  'blog-checklist.html': ' 처음 베이비페어 가는 분을 위한 준비물 체크리스트, 놓치기 쉬운 유용한 무료 아이템, 동선 절약 꿀팁까지 한눈에 담았습니다.',
  'blog-checkup.html': ' 초음파 검사 시기별 목적, 기형아 검사 종류와 비용, 임신성 당뇨 검사 기준, 건강보험 적용 검사와 비급여 검사 구분까지 총정리했습니다.',
  'blog-chungnam-benefit.html': ' 충청남도 시군별 추가 지원금, 신청 방법, 지급 시기, 복지로·정부24 온라인 신청 절차까지 한눈에 정리했습니다.',
  'blog-dental.html': ' 임신 시기별 치과 치료 가능 여부 상세 기준, 안전한 마취제 종류, 임신 중 충치 방치 시 위험, 건강보험 적용 항목까지 총정리했습니다.',
  'blog-diaper-rash.html': ' 기저귀 발진 단계별 심각도 구분, 땀띠·칸디다 감염과의 차이, 연고 선택 기준, 천 기저귀 vs 일회용 기저귀 비교까지 정리했습니다.',
  'blog-febrile-seizure.html': ' 열성경련 지속 시간에 따른 대응 방법, 구급차 호출 기준, 경련 후 병원 검사 내용, 재발 예방과 해열제 사용 원칙까지 총정리했어요.',
  'blog-fever-guide.html': ' 체온 측정 위치별 정상 기준, 해열제 교차 복용 간격과 용량, 열 내리는 방법 5가지, 즉시 응급실 가야 할 기준까지 정리했습니다.',
  'blog-firstwelcome.html': ' 첫째 200만원·둘째이상 300만원 신청 방법, 국민행복카드 발급법, 사용 불가 항목 목록, 잔액 조회 방법까지 총정리했습니다.',
  'blog-food-bad.html': ' 음식별 위험 이유와 대체 식품, 가공식품 라벨 확인 방법, 조리법 따라 안전도 달라지는 음식 목록까지 실용 정보를 담았습니다.',
  'blog-food-good.html': ' 분기별 영양소 우선순위, 하루 권장 영양 섭취량, 간편하게 섭취 가능한 식품 조합, 입덧 시에도 먹기 좋은 음식까지 안내합니다.',
  'blog-gestational-diabetes.html': ' 임당 자가 혈당 측정기 사용법, 식후 혈당 목표 수치, 안전한 운동 종류와 시간, 인슐린 치료 시작 기준까지 2026년 가이드로 정리했습니다.',
  'blog-headache-hypertension.html': ' 타이레놀 용법·용량, 이부프로펜 복용 금지 이유, 임신성 고혈압 단계별 관리법, 전자간증 위험 신호와 병원 방문 기준까지 총정리했습니다.',
  'blog-hfmd.html': ' 어린이집 등원 가능 기준, 가정 내 접촉 예방법, 구내염 통증 완화 방법, 드물게 중증으로 진행되는 위험 신호까지 총정리했어요.',
  'blog-infant-colic.html': ' 산통 피크 시기와 끝나는 시점, 수유 방법별 산통 유발 차이, 가스 배출 마사지 방법, 의사 상담이 필요한 경우까지 총정리했습니다.',
  'blog-iron.html': ' 철분제 공복 vs 식후 복용 차이, 변비 부작용 줄이는 방법, 비타민 C와 함께 먹어야 하는 이유, 제품별 철분 함량 비교까지 정리했습니다.',
  'blog-jaundice.html': ' 빌리루빈 수치에 따른 광선치료 기준, 모유황달 지속 기간, 퇴원 후 집에서 확인하는 황달 체크법, 재입원 판단 기준까지 총정리했습니다.',
  'blog-newborn-bath.html': ' 신생아 배꼽 탈락 전후 목욕법 차이, 욕조 소독 방법, 목욕 용품 성분 확인 포인트, 단계별 목욕 순서 가이드까지 담았습니다.',
  'blog-newborn-eczema.html': ' 습진 부위별 특징과 관리법, 스테로이드 연고 강도별 사용 기준, 아토피로 발전할 위험 신호, 욕조 온도와 목욕 빈도까지 정리했습니다.',
  'blog-newborn-jaundice-phototherapy.html': ' 광선치료 기간과 방법, 아이빌리 기기 렌탈 정보, 치료 중 수유 방법, 빌리루빈 수치 감소 확인 방법까지 2026년 최신 기준으로 안내합니다.',
  'blog-newborn-sleep-pattern.html': ' 신생아 낮밤 구별 훈련법, 월령별 총 수면시간 기준, 잠투정 줄이는 수면 환경 만들기, 통잠 단계별 접근법까지 실전 가이드를 담았습니다.',
  'blog-newborn-sleep-training-guide.html': ' 퍼버법·페이들아웃·의자법 비교, 시작 적정 월령, 밤중 수유 끊는 시기, 낮잠과 밤잠 연결 방법까지 실전 가이드를 총정리했습니다.',
  'blog-night-care-vs-er.html': ' 달빛어린이병원 운영 시간과 전국 위치 찾는 법, 응급실 대기 시간 줄이는 팁, 증상별 적합한 의료기관 판단 기준까지 안내합니다.',
  'blog-nightcare-vs-er.html': ' 달빛어린이병원 운영 시간과 전국 위치 찾는 법, 응급실 대기 시간 줄이는 팁, 증상별 적합한 의료기관 판단 기준까지 안내합니다.',
  'blog-night-cough.html': ' 야간 기침 원인별 구분법(알레르기/크룹/천식), 가정 내 응급 대처법, 소아과 방문 기준, 수면 환경 개선 방법까지 총정리했습니다.',
  'blog-ppd.html': ' 산후우울증 증상 체크리스트, 베이비블루와 산후우울증 구분법, 전문 치료 방법, 가족의 역할과 지원 방법까지 총정리했습니다.',
  'blog-preeclampsia.html': ' 전자간증 조기 발견 체크리스트, 혈압 자가 측정법, 입원 기준, 출산 후 회복 과정과 다음 임신 시 주의사항까지 총정리했습니다.',
  'blog-pregnancy-caffeine-food-caution.html': ' 카페인 외 주의해야 할 음식 목록, 식품 라벨에서 피해야 할 성분, 먹고 싶은 음식 대체하는 방법까지 실용적인 임신 식품 가이드입니다.',
  'blog-pregnancy-exercise.html': ' 임신 중 안전한 운동 종류와 금지 운동 구분, 분기별 강도 조절 방법, 운동 중 멈춰야 할 위험 신호까지 2026년 기준으로 안내합니다.',
  'blog-pregnancy-safe-exercise-guide.html': ' 임신 중 안전한 운동 종류와 금지 운동 구분, 분기별 강도 조절 방법, 운동 중 멈춰야 할 위험 신호까지 2026년 기준으로 안내합니다.',
  'blog-pregnancy-weight.html': ' 임신 전 체중별 권장 증가량 기준, 분기별 체중 관리 식단 팁, 과체중·저체중 임산부 주의사항, 안전한 체중 감소 방법까지 정리했습니다.',
  'blog-sleep-position.html': ' 엎드려 재우기 위험성(영아돌연사 SIDS), 쿠션·베개 사용 주의사항, 뒤집기 시작 후 수면 자세 관리법까지 최신 AAP 권고 기준으로 정리했습니다.',
  'blog-sleep-training.html': ' 퍼버법·페이들아웃·의자법 비교, 시작 적정 월령, 밤중 수유 끊는 시기, 낮잠과 밤잠 연결 방법까지 실전 가이드를 총정리했습니다.',
  'blog-stroller-guide.html': ' A형·B형·절충형·쌍둥이 유모차 비교, 신생아 사용 가능 여부, 무게·접이 방식 선택 기준, 2026년 인기 제품 추천까지 총정리했습니다.',
  'blog-toddler-separation-anxiety.html': ' 분리불안 시작 시기와 자연 소멸 시점, 어린이집 적응 돕는 방법, 과도한 분리불안 판별 기준, 훈련 방법 단계별 가이드까지 정리했습니다.',
  'blog-travel.html': ' 월령별 여행 안전 기준, 비행기 탑승 최소 월령, 여행 중 수유·이유식 보관법, 해외여행 시 필수 준비물까지 실용 정보를 담았습니다.',
  'blog-ultrasound.html': ' 초음파 종류별(경질·복부) 시기, 태아 크기 성장 기준, 이상 소견 발견 시 추가 검사, 3D/4D 초음파 의미까지 총정리했습니다.',
  'blog-vaccine.html': ' 국가예방접종 무료 항목 목록, 병원 방문 전 준비사항, 접종 후 발열·이상반응 대처법, 누락 접종 따라잡기 방법까지 총정리했습니다.',
  'blog-vaccine-schedule-2026.html': ' 2026년 국가예방접종 변경 사항, 무료 접종 대상과 비용, 접종 증명서 발급 방법, 이상반응 신고 방법까지 최신 정보로 정리했습니다.',
  'blog-vomit-diarrhea.html': ' 구토·설사 원인별 구분(장염/식중독/알레르기), 경구 수분 보충 방법, 지사제 사용 주의사항, 병원 방문 기준까지 총정리했습니다.',
  'blog-weaning.html': ' 이유식 거부 대처법, 식재료 도입 순서와 알레르기 확인 방법, 시판 이유식 vs 자가 제조 비교, 이유식 도구 추천까지 총정리했습니다.',
  'blog-baby-constipation.html': ' 변비 예방 습관, 분유·모유수유별 변 상태 차이, 이유식 시작 후 변비 대처, 관장 방법과 주의사항까지 한눈에 확인하세요.',
};

// 모든 파일 공통 접두 suffix (특정 suffix가 없을 때)
function getDescSuffix(filename) {
  return DESC_SUFFIX[filename] || ' 2026년 최신 기준으로 정확한 정보만 엄선하여 정리했습니다. 관련 궁금증을 한 번에 해결해 보세요.';
}

// ─── 메인 처리 ────────────────────────────────────────────────────────────────

function processFile(filename) {
  const filepath = path.join(ROOT, filename);
  let content = fs.readFileSync(filepath, 'utf8');
  let changed = false;

  // 1. meta description 확장
  const descMatch = content.match(/<meta name="description" content="([^"]+)"/);
  if (descMatch) {
    const currentDesc = descMatch[1];
    if (currentDesc.length < 120) {
      const suffix = getDescSuffix(filename);
      const newDesc = currentDesc + suffix;
      const truncated = newDesc.length > 160 ? newDesc.substring(0, 157) + '...' : newDesc;
      content = content.replace(
        `<meta name="description" content="${currentDesc}"`,
        `<meta name="description" content="${truncated}"`
      );
      // og:description도 동일하게
      content = content.replace(
        `<meta property="og:description" content="${currentDesc}"`,
        `<meta property="og:description" content="${truncated}"`
      );
      // twitter:description도
      content = content.replace(
        `<meta name="twitter:description" content="${currentDesc}"`,
        `<meta name="twitter:description" content="${truncated}"`
      );
      changed = true;
    }
  }

  // 2. 관련 글 섹션 추가 (없는 경우만)
  if (!content.includes('함께 읽으면 좋은 글') && !content.includes('관련 글')) {
    const category = getCategory(filename);
    const allLinks = RELATED_BY_CATEGORY[category] || RELATED_BY_CATEGORY.general;
    // 현재 파일 자신은 제외
    const filteredLinks = allLinks.filter(l => l.href !== filename);
    const relatedHtml = buildRelatedSection(filteredLinks);

    // <footer> 직전에 삽입
    if (content.includes('<footer>')) {
      content = content.replace('<footer>', relatedHtml + '<footer>');
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filepath, content, 'utf8');
    return true;
  }
  return false;
}

// ─── 실행 ─────────────────────────────────────────────────────────────────────

const files = fs.readdirSync(ROOT)
  .filter(f => f.startsWith('blog-') && f.endsWith('.html'))
  .sort();

let updated = 0;
let skipped = 0;

for (const f of files) {
  const result = processFile(f);
  if (result) {
    updated++;
    console.log(`✅ ${f}`);
  } else {
    skipped++;
  }
}

console.log(`\n완료: ${updated}개 수정, ${skipped}개 이미 최적화됨`);
