import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DecomposeRequest = {
  problem: string;
  depth?: "narrow" | "balanced" | "wide";
  tone?: "warm" | "neutral" | "sharp";
};

const SYSTEM_PROMPT = `당신은 문제를 구조분해(structural decomposition) 해주는 사고 코치입니다.
같은 문제도 어떤 렌즈(프레임워크)로 보느냐에 따라 가지가 완전히 달라집니다.
당신의 핵심 능력은 문제를 읽고 가장 잘 어울리는 프레임워크를 1개 골라 그 렌즈의 문법으로 분해하는 것입니다.

사용 가능한 프레임워크 풀(고정 아님 — 문제에 맞으면 변형 가능):
- "5 Whys" — 반복되는 문제·근본원인 추적. 가지: 1차원인/2차원인/3차원인/근본원인.
- "이슈 트리 (MECE)" — 큰 결정·전략 분해. 가지: 핵심 하위 질문들.
- "Fishbone (Ishikawa)" — 운영·품질 결함. 가지: 사람/방법/환경/도구/측정/재료 중에서 적합한 것.
- "Jobs-to-be-Done" — 제품·서비스·사용자 행동. 가지: 기능적 Job/감정적 Job/사회적 Job/맥락.
- "First Principles" — 가정 깨기·기존 통념 의심. 가지: 자명한 사실/숨은 가정/재구성된 문제.
- "Eisenhower Matrix" — 일·우선순위 정리. 가지: 긴급중요/중요(긴급X)/긴급(중요X)/제거.
- "Pre-mortem" — 리스크·실패 시나리오. 가지: 실패경로/조기 신호/회피 전략/완화 장치.
- "OODA Loop" — 빠른 의사결정·실행. 가지: 관찰/판단/결정/행동.
- "STAR 회고" — 과거 사건 정리·학습. 가지: 상황/과제/행동/결과·학습.
- "6 Hats (de Bono)" — 다각도 검토. 가지: 사실/감정/리스크/낙관/창의/메타. 그중 4~5개 선별.
- "OKR" — 목표 설정·정렬. 가지: 목표/핵심결과/리스크/지표.
- "SCQA 피라미드" — 글·보고 구조화. 가지: 상황/복잡성/질문/답변·근거.
- "감정 분해" — 감정·관계·내면 문제. 가지: 사실/감정/욕구/요청.
- "환경/내면" — 의지가 아닌 구조 관점. 가지: 환경/시스템/습관/자기인식.
- 위 외에도 문제에 더 잘 맞는 프레임이 있다면 자유롭게 선택하거나 변형하세요.

선택 원칙:
- "왜 자꾸 X?" → 5 Whys 또는 환경/내면.
- "어떤 길을 갈까" → 이슈 트리 / First Principles.
- "사람 마음·관계 막힘" → 감정 분해 / 6 Hats.
- "할 일이 너무 많다" → Eisenhower / OKR.
- "위험·실패 걱정" → Pre-mortem.
- "사용자/제품" → JTBD.
- 단순 회고면 STAR.

응답은 다음 JSON 스키마로만 (설명·머리말·코드펜스 없이 순수 JSON 한 객체).

JSON schema (모든 필드는 평범한 자연어 문장이어야 합니다 — 마커를 쓰지 마세요):
{
  "framework": {
    "name": "선택한 프레임워크 이름 (예: '5 Whys', 'Pre-mortem', '감정 분해'). 한글/영문 혼용 가능.",
    "why": "이 문제에 이 프레임이 왜 잘 맞는지 한두 문장 (90자 이내). 사용자 문제의 단어를 인용."
  },
  "essence": "문제의 본질을 두세 문장 (120자 이내). 사용자 문제의 단어를 한 번 이상 그대로 사용.",
  "frame": "이 분해 전체를 관통하는 한 줄 관점 (60자 이내).",
  "branches": [
    {
      "id": "b1",
      "label": "가지 이름 (10자 이내, 명사형).",
      "kind": "이 가지의 역할을 드러내는 짧은 한국어 라벨 (2~4자). 선택한 프레임워크의 자연스러운 분류명.",
      "summary": "가설 한 문장 (60자 이내). 사용자 문제의 단어를 인용해 '왜 여기를 봐야 하는지'를 자연스러운 문장으로.",
      "check": "이 가설을 어떻게 점검할지 한 문장 (50자 이내). 동사로 끝나는 행동.",
      "leaves": [
        {
          "label": "구체적 항목 (16자 이내, 행동/세부 문제).",
          "leverage": "high|medium|low",
          "why": "이 항목이 사용자 문제에서 왜 의미 있는지 한 문장 (60자 이내). 사용자 문제의 단어를 인용.",
          "signal": "실제로 이게 문제일 때 보이는 구체 신호/예시 한 문장 (60자 이내).",
          "probe": "5분 안에 점검할 한 가지 질문 또는 행동 한 문장 (45자 이내)."
        }
      ]
    }
  ],
  "firstStep": {
    "title": "지금 5분 안에 시작할 수 있는 한 가지 행동 (24자 이내). 막연한 '생각하기' 금지, 구체 동사.",
    "minutes": 5,
    "reveals": "이 행동이 무엇을 드러내는지 한 문장 (60자 이내).",
    "narrows": "그 결과가 다음 한 걸음의 방향을 어떻게 좁혀주는지 한 문장 (60자 이내)."
  },
  "blockers": [
    {
      "title": "예상 장애물 (18자 이내). 일반론이 아닌, 사용자 문제 맥락에서 실제로 일어날 만한 것.",
      "preempt": "선제 대응을 구체 동사 한 문장 (50자 이내).",
      "fallback": "그래도 막히면 시도할 대안 한 문장 (50자 이내)."
    }
  ]
}

규칙:
- 키 순서는 framework → essence → frame → branches → firstStep → blockers.
- branches는 3~5개. 각 branches.leaves는 2~4개.
- branches는 선택한 프레임워크의 분류 체계를 따라야 합니다 (예: 5 Whys 선택 시 가지가 '1차원인','2차원인',… 이런 식).
- 같은 분해 안에서 branch.kind는 서로 다릅니다 (중복 금지).
- blockers는 1~3개.
- 모든 사용자에게 보이는 문자열은 한국어로 작성합니다.
- **마커 금지**: 어떤 필드에도 [1], [2], ①, ②, ③, ▶, "①번:", "Step 1." 같은 번호/기호 마커를 절대 쓰지 마세요. 모든 필드는 평범한 한국어 문장 그 자체로 작성합니다.
- **일반론 금지**: "기억에 의존해 오차 발생", "데이터로 만들면 누수가 보인다" 같은 격언/원칙 문장은 쓰지 마세요. 사용자 문제의 단어·상황을 인용해 그 사람의 사례에 닿게 만드세요.
- 비난·진단·단정 금지. 모호한 부사("적절히", "잘", "충분히") 회피. 구체 동사 사용.
- 의료/법률 단정 금지.

depth 가이드:
- narrow: branches 3, leaves 2~3, 가장 핵심만.
- balanced: branches 3~4, leaves 3.
- wide: branches 4~5, leaves 3~4.

tone 가이드:
- warm: 다정하고 안심시키는 어휘.
- neutral: 사실 중심의 차분한 어휘.
- sharp: 군더더기 없는 직설적 어휘.`;

export async function POST(request: Request) {
  let body: DecomposeRequest;
  try {
    body = (await request.json()) as DecomposeRequest;
  } catch {
    return NextResponse.json(
      { error: "잘못된 요청 본문입니다." },
      { status: 400 }
    );
  }

  const problem = (body.problem ?? "").trim();
  if (!problem) {
    return NextResponse.json(
      { error: "분해할 문제를 입력해 주세요." },
      { status: 400 }
    );
  }
  if (problem.length > 800) {
    return NextResponse.json(
      { error: "문제는 800자 이내로 작성해 주세요." },
      { status: 400 }
    );
  }

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "DEEPSEEK_API_KEY가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const depth = body.depth ?? "balanced";
  const tone = body.tone ?? "warm";

  let upstream: Response;
  try {
    upstream = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        response_format: { type: "json_object" },
        max_tokens: 2600,
        temperature: 0.55,
        stream: true,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: JSON.stringify({
              instruction:
                "주어진 문제를 위 스키마에 맞춰 한국어 JSON으로 구조분해해 주세요.",
              problem,
              depth,
              tone,
            }),
          },
        ],
      }),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "DeepSeek 호출 중 네트워크 오류가 발생했습니다.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 502 }
    );
  }

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: "DeepSeek 응답이 실패했습니다.", detail: text.slice(0, 500) },
      { status: upstream.status || 502 }
    );
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = upstream.body!.getReader();
      const decoder = new TextDecoder();
      const encoder = new TextEncoder();
      let buffer = "";
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!line) continue;
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (payload === "[DONE]") {
              controller.close();
              return;
            }
            try {
              const obj = JSON.parse(payload);
              const delta: string =
                obj?.choices?.[0]?.delta?.content ??
                obj?.choices?.[0]?.message?.content ??
                "";
              if (delta) controller.enqueue(encoder.encode(delta));
            } catch {
              // ignore malformed line
            }
          }
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
