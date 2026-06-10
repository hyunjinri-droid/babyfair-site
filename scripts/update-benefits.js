/**
 * 매월 1일 GitHub Actions에서 실행되는 지원금 정보 업데이트 스크립트.
 * ANTHROPIC_API_KEY가 있으면 Claude API로 최신 정책 검토 후 업데이트,
 * 없으면 version/lastUpdated 날짜만 갱신한다.
 */

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const BENEFITS_PATH = path.join(__dirname, '..', 'aidiary', 'benefits.json');

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function versionStr() {
  const d = new Date();
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}`;
}

async function reviewWithClaude(current) {
  const client = new Anthropic();

  const systemPrompt = `당신은 한국 정부 육아·임신·출산 지원 정책 전문가입니다.
JSON 데이터를 검토해 최신 정책 기준과 맞지 않는 항목을 수정합니다.

반드시 지켜야 할 규칙:
- 응답은 오직 유효한 JSON만 반환 (마크다운 코드블록, 설명 문구 불가)
- 최상위 구조 { version, lastUpdated, benefits[] } 유지
- 각 benefit의 id, deadlineType, deadlineValue, url, place, category 필드는 절대 변경 금지
- conditionMonthMin, conditionMonthMax, conditionLabel은 정책 변경이 명확한 경우에만 수정
- 수정이 필요 없는 항목은 원본 그대로 유지
- 금액(amount, amountNum)은 검증된 최신 정보만 반영`;

  const userPrompt = `오늘 날짜: ${todayStr()}

아래 육아지원금 JSON 데이터를 ${new Date().getFullYear()}년 최신 정부 정책 기준으로 검토하고,
변경이 필요한 항목만 수정해서 전체 JSON을 반환해 주세요.

주요 검토 항목:
- 부모급여 금액 (0세/1세 월 지급액)
- 아동수당 지급 연령 상한 (2026년부터 만 9세 미만으로 상향 예정)
- 첫만남이용권 금액
- 육아휴직급여 상한액
- 자녀장려금 연간 한도

현재 데이터:
${JSON.stringify(current, null, 2)}`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  const text = message.content[0].text.trim();

  // 혹시 코드블록이 포함된 경우 제거
  const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  return JSON.parse(codeBlockMatch ? codeBlockMatch[1].trim() : text);
}

function validateBenefits(data) {
  if (!data || typeof data !== 'object') throw new Error('응답이 객체가 아닙니다');
  if (!Array.isArray(data.benefits))     throw new Error('benefits 배열이 없습니다');
  if (data.benefits.length < 10)         throw new Error(`항목이 너무 적습니다 (${data.benefits.length}개)`);

  const requiredFields = ['id', 'name', 'emoji', 'amount', 'amountNum', 'category', 'url'];
  for (const b of data.benefits) {
    for (const field of requiredFields) {
      if (b[field] === undefined) throw new Error(`항목 ${b.id || '?'}: ${field} 필드 누락`);
    }
  }
}

async function main() {
  console.log(`\n지원금 정보 업데이트 시작 — ${todayStr()}\n`);

  const current = JSON.parse(fs.readFileSync(BENEFITS_PATH, 'utf-8'));
  console.log(`현재 데이터: v${current.version}, ${current.benefits.length}개 항목, 기준일 ${current.lastUpdated}`);

  let updated = JSON.parse(JSON.stringify(current));

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('Claude API로 최신 정책 검토 중...');
    try {
      const result = await reviewWithClaude(current);
      validateBenefits(result);
      updated = result;
      console.log(`Claude 검토 완료 — ${result.benefits.length}개 항목`);
    } catch (e) {
      console.error('Claude API 오류 (날짜만 업데이트):', e.message);
    }
  } else {
    console.log('ANTHROPIC_API_KEY 없음 — version/lastUpdated만 업데이트');
  }

  updated.version     = versionStr();
  updated.lastUpdated = todayStr();

  fs.writeFileSync(BENEFITS_PATH, JSON.stringify(updated, null, 2) + '\n', 'utf-8');
  console.log(`\n완료: benefits.json 저장됨 (v${updated.version})\n`);
}

main().catch(e => {
  console.error('\n스크립트 실패:', e.message);
  process.exit(1);
});
