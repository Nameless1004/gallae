"use client";

import { parse as parsePartialJson, Allow } from "partial-json";
import { useRef, useState } from "react";
import { ProblemForm } from "@/components/problem-form";
import { MindMap } from "@/components/mindmap";
import { InsightPanel } from "@/components/insight-panel";
import {
  type Branch,
  type BranchKind,
  type Decomposition,
  type Diagnosis,
  type Leaf,
  type Leverage,
} from "@/lib/types";

const LEVERAGES: Leverage[] = ["high", "medium", "low"];

function pickBranchKind(v: unknown): BranchKind {
  if (typeof v === "string") {
    const trimmed = v.trim();
    if (trimmed) return trimmed.slice(0, 6);
  }
  return "관점";
}
function pickLeverage(v: unknown): Leverage {
  if (typeof v === "string" && LEVERAGES.includes(v as Leverage))
    return v as Leverage;
  return "medium";
}

function takeString(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function pickDiagnosis(obj: Record<string, unknown>): Diagnosis {
  const raw = obj.diagnosis as Record<string, unknown> | undefined;
  const likelyRaw = Array.isArray(raw?.likelyProblems)
    ? raw.likelyProblems
    : [];
  const questionsRaw = Array.isArray(raw?.questions) ? raw.questions : [];

  return {
    visibleProblem: takeString(raw?.visibleProblem),
    likelyProblems: likelyRaw
      .filter((item): item is Record<string, unknown> => {
        return !!item && typeof item === "object";
      })
      .map((item) => ({
        title: takeString(item.title),
        why: takeString(item.why),
        verify: takeString(item.verify),
      }))
      .filter((item) => item.title),
    questions: questionsRaw.filter(
      (question): question is string =>
        typeof question === "string" && question.trim().length > 0
    ),
    solveNow: takeString(raw?.solveNow),
    defer: takeString(raw?.defer),
  };
}

/**
 * Convert whatever partial JSON we have so far into a renderable Decomposition.
 * Skip incomplete entries (no label) so the graph only adds nodes once they're
 * substantive enough to display.
 */
function partialToDecomposition(
  raw: unknown,
  problem: string
): Decomposition | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;

  const fw = obj.framework as Record<string, unknown> | undefined;
  const framework = {
    name: fw && typeof fw.name === "string" ? fw.name : "",
    why: fw && typeof fw.why === "string" ? fw.why : "",
  };

  const essence = typeof obj.essence === "string" ? obj.essence : "";
  if (!essence) return null;

  const frame = typeof obj.frame === "string" ? obj.frame : "";
  const focusRaw = obj.focus as Record<string, unknown> | undefined;
  const focus = {
    title: takeString(focusRaw?.title),
    why: takeString(focusRaw?.why),
    check: takeString(focusRaw?.check),
  };
  const diagnosis = pickDiagnosis(obj);

  const branchesRaw = Array.isArray(obj.branches) ? obj.branches : [];
  const branches: Branch[] = [];
  branchesRaw.forEach((b, i) => {
    if (!b || typeof b !== "object") return;
    const br = b as Record<string, unknown>;
    const label = typeof br.label === "string" ? br.label : "";
    if (!label) return; // not enough yet — skip until label arrives
    const id =
      (typeof br.id === "string" && br.id.trim()) || `b${i + 1}`;
    const kind = pickBranchKind(br.kind);
    const summary = typeof br.summary === "string" ? br.summary : "";

    const check = typeof br.check === "string" ? br.check : "";

    const leavesRaw = Array.isArray(br.leaves) ? br.leaves : [];
    const leaves: Leaf[] = [];
    leavesRaw.forEach((l, li) => {
      if (!l || typeof l !== "object") return;
      const lf = l as Record<string, unknown>;
      const llabel = typeof lf.label === "string" ? lf.label : "";
      if (!llabel) return;
      // Backward-compat: legacy responses may emit a single `detail` string —
      // treat it as `why` so older streams still render.
      const legacyDetail = typeof lf.detail === "string" ? lf.detail : "";
      const actionsRaw = Array.isArray(lf.actions) ? lf.actions : [];
      const actions = actionsRaw
        .filter((item): item is Record<string, unknown> => {
          return !!item && typeof item === "object";
        })
        .map((item, ai) => ({
          id: `${id}-l${li + 1}-a${ai + 1}`,
          label: takeString(item.label || item.title),
          how: takeString(item.how || item.probe || item.check),
        }))
        .filter((item) => item.label);
      leaves.push({
        id: `${id}-l${li + 1}`,
        label: llabel,
        leverage: pickLeverage(lf.leverage),
        why: typeof lf.why === "string" ? lf.why : legacyDetail,
        signal: typeof lf.signal === "string" ? lf.signal : "",
        probe: typeof lf.probe === "string" ? lf.probe : "",
        actions,
      });
    });

    branches.push({ id, label, kind, summary, check, leaves });
  });

  const fs = obj.firstStep as Record<string, unknown> | undefined;
  const fsLegacyWhy = fs && typeof fs.why === "string" ? fs.why : "";
  const firstStep =
    fs && typeof fs.title === "string" && fs.title
      ? {
          title: fs.title,
          minutes:
            typeof fs.minutes === "number" && Number.isFinite(fs.minutes)
              ? Math.max(1, Math.min(30, Math.round(fs.minutes)))
              : 5,
          reveals:
            typeof fs.reveals === "string" ? fs.reveals : fsLegacyWhy,
          narrows: typeof fs.narrows === "string" ? fs.narrows : "",
        }
      : { title: "", minutes: 5, reveals: "", narrows: "" };

  const blockersRaw = Array.isArray(obj.blockers) ? obj.blockers : [];
  const blockers = blockersRaw
    .filter(
      (b): b is Record<string, unknown> =>
        !!b &&
        typeof b === "object" &&
        typeof (b as { title?: unknown }).title === "string"
    )
    .map((b) => {
      const legacyCounter =
        typeof b.counter === "string" ? (b.counter as string) : "";
      return {
        title: b.title as string,
        preempt:
          typeof b.preempt === "string" ? b.preempt : legacyCounter,
        fallback: typeof b.fallback === "string" ? b.fallback : "",
      };
    });

  const actionsRaw = Array.isArray(obj.actionOptions)
    ? obj.actionOptions
    : [];
  const actionOptions = actionsRaw
    .filter(
      (a): a is Record<string, unknown> =>
        !!a &&
        typeof a === "object" &&
        typeof (a as { title?: unknown }).title === "string"
    )
    .map((a) => ({
      minutes:
        typeof a.minutes === "number" && Number.isFinite(a.minutes)
          ? Math.max(1, Math.min(30, Math.round(a.minutes)))
          : 5,
      title: a.title as string,
      purpose: typeof a.purpose === "string" ? a.purpose : "",
    }));

  return {
    problem,
    framework,
    essence,
    frame,
    focus,
    diagnosis,
    branches,
    firstStep,
    actionOptions,
    blockers,
  };
}

type Depth = "narrow" | "balanced" | "wide";
type Tone = "warm" | "neutral" | "sharp";
type FrameworkChoice = string;

const EXAMPLES: { title: string; problem: string; tag: string; accent: string }[] = [
  {
    tag: "학업",
    accent: "#1f8aa8",
    title: "졸업 작품 주제가 안 잡힌다",
    problem:
      "졸업작품 마감이 한 달 남았는데 주제가 안 잡힌다. 흥미는 영상과 데이터 둘 다 있는데, 어떤 방향이 좋을지, 무엇부터 해야 할지 모르겠다.",
  },
  {
    tag: "협업",
    accent: "#6a59b8",
    title: "팀 의사소통이 자꾸 어긋난다",
    problem:
      "최근 팀 안에서 같은 얘기를 반복해도 결과물이 다르게 나오고, 회의에서 정한 결정이 흐려진다. 누구의 잘못이라기보단 구조 문제 같은데 어디부터 봐야 할지 모르겠다.",
  },
  {
    tag: "개인",
    accent: "#b87a1f",
    title: "사이드 프로젝트가 멈춰 있다",
    problem:
      "1년째 만들고 싶었던 사이드 프로젝트가 있는데, 본업 끝나면 손이 안 간다. 의지 문제로 보지 말고, 환경과 설계의 문제로 분해해 보고 싶다.",
  },
];

export default function Page() {
  const [data, setData] = useState<Decomposition | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [seedProblem, setSeedProblem] = useState("");
  const [seedKey, setSeedKey] = useState(0);
  const [focusSignal, setFocusSignal] = useState(0);
  const [lastInput, setLastInput] = useState<{
    problem: string;
    depth: Depth;
    tone: Tone;
    framework: FrameworkChoice;
  } | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const canvasRef = useRef<HTMLElement | null>(null);
  const scrolledRef = useRef(false);

  async function submit(
    problem: string,
    depth: Depth,
    tone: Tone,
    framework: FrameworkChoice
  ) {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setIsStreaming(false);
    setError(null);
    setSelected(null);
    setData(null);
    setLastInput({ problem, depth, tone, framework });
    scrolledRef.current = false;

    try {
      const res = await fetch("/api/decompose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problem, depth, tone, framework }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        let msg = "분해에 실패했습니다.";
        try {
          const j = await res.json();
          if (j?.error) msg = j.error;
        } catch {}
        throw new Error(msg);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      setIsStreaming(true);
      if (!scrolledRef.current) {
        scrolledRef.current = true;
        window.requestAnimationFrame(() => {
          canvasRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        });
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        try {
          const partial = parsePartialJson(
            raw,
            Allow.STR | Allow.OBJ | Allow.ARR | Allow.NUM | Allow.NULL
          );
          const dec = partialToDecomposition(partial, problem);
          if (dec) setData(dec);
        } catch {
          // not enough yet
        }
      }
      // Final flush
      try {
        const final = parsePartialJson(raw);
        const dec = partialToDecomposition(final, problem);
        if (dec) setData(dec);
      } catch {}
    } catch (err) {
      if ((err as Error)?.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "알 수 없는 오류");
    } finally {
      setIsStreaming(false);
      setIsLoading(false);
    }
  }

  function pickExample(problem: string) {
    setSeedProblem(problem);
    setSeedKey((k) => k + 1);
    setFocusSignal((k) => k + 1);
  }

  function reset() {
    setData(null);
    setError(null);
    setSelected(null);
    setSeedProblem("");
    setSeedKey((k) => k + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const showHero = !data && !isLoading;

  return (
    <>
      <Header onReset={reset} hasData={!!data || isLoading} />

      <main className="mx-auto w-full max-w-[1320px] px-5 pb-24 pt-6 sm:px-8">
        {showHero ? <Hero /> : null}

        <div className={showHero ? "mt-8" : "mt-2"}>
          <ProblemForm
            key={seedKey}
            initialProblem={seedProblem || lastInput?.problem || ""}
            initialDepth={lastInput?.depth ?? "balanced"}
            initialTone={lastInput?.tone ?? "warm"}
            initialFramework={lastInput?.framework ?? "auto"}
            focusSignal={focusSignal}
            isLoading={isLoading}
            compact={!showHero}
            onSubmit={submit}
          />
        </div>

        {error ? (
          <div className="mt-4 rounded-2xl border border-rose/40 bg-rose/10 p-4 text-sm text-rose animate-fade-in">
            <span className="font-medium">오류 — </span>
            {error}
          </div>
        ) : null}

        {showHero ? <Examples examples={EXAMPLES} onPick={pickExample} /> : null}

        {(isLoading || data) && (
          <section ref={canvasRef} className="mt-10 flex flex-col gap-6">
            <div className="surface-card relative overflow-hidden rounded-3xl p-4 sm:p-6">
              <CanvasHeader
                data={data}
                isLoading={isLoading}
                isStreaming={isStreaming}
              />
              <div className="mt-4">
                {data ? (
                  <MindMap
                    data={data}
                    selected={selected}
                    onSelectBranch={setSelected}
                    isStreaming={isStreaming}
                  />
                ) : (
                  <MindMapSkeleton />
                )}
              </div>
            </div>

            <aside>
              {data && data.firstStep.title ? (
                <InsightPanel
                  data={data}
                  selected={selected}
                  onSelect={setSelected}
                />
              ) : (
                <PanelSkeleton />
              )}
            </aside>
          </section>
        )}

        {showHero ? <Howto /> : null}
      </main>

      <Footer />
    </>
  );
}

function Header({
  onReset,
  hasData,
}: {
  onReset: () => void;
  hasData: boolean;
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-[var(--background)]/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-[1320px] items-center justify-between px-5 py-4 sm:px-8">
        <button
          type="button"
          onClick={onReset}
          className="group flex items-center gap-3"
        >
          <Logo />
          <div className="text-left">
            <p className="text-display text-base font-bold leading-none tracking-tight text-ink">
              Re:Frame
            </p>
            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
              문제를 다시 보는 사고 도구
            </p>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {hasData ? (
            <button
              type="button"
              onClick={onReset}
              className="rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:bg-[var(--surface-warm)] hover:text-ink"
            >
              ↺ 새로 보기
            </button>
          ) : null}
          <a
            href="#howto"
            className="hidden rounded-full border border-line bg-white px-3.5 py-1.5 text-xs font-medium text-ink-soft transition hover:border-line-strong hover:bg-[var(--surface-warm)] hover:text-ink sm:inline-flex"
          >
            사용법
          </a>
        </div>
      </div>
    </header>
  );
}

function Logo() {
  return (
    <div className="relative">
      <svg
        width="36"
        height="36"
        viewBox="0 0 36 36"
        className="relative"
        aria-hidden
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#1f8aa8" />
            <stop offset="58%" stopColor="#6a59b8" />
            <stop offset="100%" stopColor="#b04a64" />
          </linearGradient>
          <linearGradient id="logo-shine" x1="0%" x2="100%" y1="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0.36" />
          </linearGradient>
        </defs>
        <rect
          x="3.5"
          y="3.5"
          width="29"
          height="29"
          rx="9"
          fill="url(#logo-grad)"
        />
        <g transform="translate(-1.4 0)">
          <path
            d="M11.2 11.4h9.6c4.1 0 6.8 2.3 6.8 5.8 0 2.5-1.4 4.3-3.7 5.1l4 6.3h-5.3l-3.4-5.6h-3v5.6h-5V11.4Zm5 3.9v4h4.1c1.4 0 2.2-.8 2.2-2s-.8-2-2.2-2h-4.1Z"
            fill="rgba(255,255,255,0.94)"
          />
        </g>
        <g
          stroke="url(#logo-shine)"
          strokeWidth="1.35"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        >
          <path d="M9.6 8.8h7.1" opacity="0.9" />
          <path d="M8.8 9.6v7.1" opacity="0.9" />
          <path d="M26.4 27.2h-7.1" opacity="0.72" />
          <path d="M27.2 26.4v-7.1" opacity="0.72" />
        </g>
        <circle cx="25.8" cy="10.4" r="2.1" fill="#ffffff" opacity="0.78" />
      </svg>
    </div>
  );
}

function Hero() {
  return (
    <section className="relative pt-12 sm:pt-20">
      <div className="flex flex-col items-center text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1 text-[11px] font-medium text-ink-soft animate-fade-in">
          <span className="size-1.5 rounded-full bg-cyan animate-blink" />
          문제를 다시 보는 사고 도구
        </div>

        <h1 className="text-display mt-6 text-[44px] font-bold leading-[1.05] tracking-tight sm:text-[64px] lg:text-[80px]">
          <span className="text-ink">문제를 </span>
          <span className="text-gradient-aurora">다시</span>
          <span className="text-ink"> 봅니다.</span>
        </h1>
        <p className="mt-5 max-w-2xl text-base leading-relaxed text-ink-soft sm:text-lg">
          쓰기만 하면 Re:Frame이 문제의 본질, 검증 포인트, 첫 한 걸음을 구조화해 드려요.
          <br className="hidden sm:inline" /> 막힘은 의지가 아니라 구조의 문제입니다.
        </p>

        <div className="mt-8 flex items-center gap-4 text-[11px] uppercase tracking-[0.22em] text-ink-mute">
          <span>본질</span>
          <span className="size-1 rounded-full bg-cyan animate-blink" />
          <span>가지</span>
          <span className="size-1 rounded-full bg-violet animate-blink" />
          <span>첫 한 걸음</span>
        </div>
      </div>
    </section>
  );
}

function Examples({
  examples,
  onPick,
}: {
  examples: typeof EXAMPLES;
  onPick: (problem: string) => void;
}) {
  return (
    <section className="mt-10">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
          예시 문제 — 클릭해 채워 넣기
        </h2>
        <span className="text-[10px] text-ink-mute">EXAMPLES</span>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {examples.map((ex, i) => (
          <button
            key={ex.title}
            type="button"
            onClick={() => onPick(ex.problem)}
            className="surface-card group relative overflow-hidden rounded-2xl p-5 text-left transition hover:-translate-y-0.5 animate-slide-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${ex.accent}, transparent)`,
              }}
            />
            <span
              className="text-[10px] font-medium uppercase tracking-[0.2em]"
              style={{ color: ex.accent }}
            >
              {ex.tag}
            </span>
            <h3 className="text-display mt-2 text-base font-semibold leading-snug text-ink">
              {ex.title}
            </h3>
            <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-ink-soft">
              {ex.problem}
            </p>
            <span
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-ink-mute transition group-hover:text-ink"
            >
              채우기
              <span className="transition-transform group-hover:translate-x-0.5">
                →
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function CanvasHeader({
  data,
  isLoading,
  isStreaming,
}: {
  data: Decomposition | null;
  isLoading: boolean;
  isStreaming?: boolean;
}) {
  const fwName = data?.framework?.name?.trim();
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
      <div className="flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-cyan/15 text-xs font-bold text-cyan">
          ✦
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
            CANVAS · 사고 지도
          </p>
          <p className="text-display truncate text-[13px] font-semibold text-ink sm:text-sm">
            {isStreaming
              ? "생각의 구조를 그리는 중…"
              : isLoading
                ? "문제를 다시 보는 중…"
                : "마인드맵을 클릭해 가지를 살펴보세요"}
          </p>
        </div>
        {fwName ? (
          <div
            className="ml-1 hidden shrink-0 flex-col items-start rounded-xl border border-line bg-[var(--surface-warm)] px-3 py-1.5 md:flex"
            title={data?.framework?.why || ""}
          >
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-ink-mute leading-none">
              FRAMEWORK · 렌즈
            </span>
            <span className="text-display mt-0.5 text-[12px] font-semibold text-ink leading-tight">
              {fwName}
            </span>
          </div>
        ) : null}
      </div>
      {data ? (
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {fwName ? (
            <span
              className="md:hidden inline-flex items-center gap-1 rounded-full border border-line bg-[var(--surface-warm)] px-2 py-1 text-[10px] font-medium text-ink-soft"
              title={data?.framework?.why || ""}
            >
              <span className="size-1 rounded-full bg-violet" />
              {fwName}
            </span>
          ) : null}
          <Stat label="가지" value={data.branches.length} accent="#1f8aa8" />
          <Stat
            label="세부"
            value={data.branches.reduce((s, b) => s + b.leaves.length, 0)}
            accent="#6a59b8"
          />
          <Stat label="장애물" value={data.blockers.length} accent="#b04a64" />
        </div>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-white px-3 py-1.5">
      <span
        className="size-1.5 rounded-full"
        style={{ background: accent }}
      />
      <span className="text-[10px] uppercase tracking-[0.2em] text-ink-mute">
        {label}
      </span>
      <span className="text-display tabular-nums text-sm font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}

/** Wireframe positions in 1600×920 canvas space — mirrors real graph layout. */
const SKELETON_LAYOUT = {
  branches: [
    {
      x: 1080,
      y: 220,
      leaves: [
        { x: 1380, y: 170 },
        { x: 1380, y: 230 },
        { x: 1380, y: 290 },
      ],
    },
    {
      x: 520,
      y: 220,
      leaves: [
        { x: 220, y: 170 },
        { x: 220, y: 230 },
        { x: 220, y: 290 },
      ],
    },
    {
      x: 1080,
      y: 700,
      leaves: [
        { x: 1380, y: 650 },
        { x: 1380, y: 710 },
        { x: 1380, y: 770 },
      ],
    },
    {
      x: 520,
      y: 700,
      leaves: [
        { x: 220, y: 650 },
        { x: 220, y: 710 },
        { x: 220, y: 770 },
      ],
    },
  ],
};

function MindMapSkeleton() {
  return (
    <div className="relative w-full overflow-hidden rounded-2xl border border-line bg-[var(--surface-soft)] aspect-[3/4] sm:aspect-[1400/1000] lg:aspect-[1600/1040]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage:
            "radial-gradient(rgba(26,29,51,0.07) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Mobile (<sm): simple centered loader with stacked ghost rows */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-5 sm:hidden">
        <div className="relative flex flex-col items-center">
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-12 rounded-full"
            style={{
              background:
                "radial-gradient(closest-side, rgba(31,138,168,0.16), transparent 70%)",
            }}
          />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div
              className="absolute size-20 rounded-full border animate-ring-soft"
              style={{ borderColor: "rgba(31,138,168,0.32)" }}
            />
            <div
              className="absolute size-20 rounded-full border animate-ring-soft"
              style={{
                borderColor: "rgba(106,89,184,0.28)",
                animationDelay: "1.3s",
              }}
            />
          </div>
          <div
            className="relative flex size-16 items-center justify-center rounded-full"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line-strong)",
              boxShadow:
                "0 1px 0 rgba(26,29,51,0.04), 0 18px 40px -18px rgba(26,29,51,0.18)",
            }}
          >
            <div className="flex items-center gap-1">
              <span
                className="size-1.5 rounded-full bg-ink animate-thinking-dot"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="size-1.5 rounded-full bg-ink animate-thinking-dot"
                style={{ animationDelay: "0.18s" }}
              />
              <span
                className="size-1.5 rounded-full bg-ink animate-thinking-dot"
                style={{ animationDelay: "0.36s" }}
              />
            </div>
          </div>
        </div>
        <p className="text-display text-center text-sm font-medium text-ink-soft">
          문제를 다시 보고 있어요
        </p>

        <div className="mt-2 flex w-full max-w-[260px] flex-col gap-2.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="animate-skel-pulse rounded-xl border border-line bg-white/70 p-2.5"
              style={{ animationDelay: `${i * 160}ms` }}
            >
              <div className="flex items-center gap-2">
                <div className="size-5 rounded-md bg-[rgba(26,29,51,0.08)]" />
                <div className="h-2 w-16 rounded-full bg-[rgba(26,29,51,0.10)]" />
                <div className="h-2 flex-1 rounded-full bg-[rgba(26,29,51,0.06)]" />
              </div>
              <div className="mt-2 h-2 w-3/4 rounded-full bg-[rgba(26,29,51,0.06)]" />
            </div>
          ))}
        </div>
      </div>

      {/* Desktop (>=sm): wireframe preview */}
      <div className="hidden sm:block">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-y-0 w-1/3 animate-skel-sweep"
            style={{
              background:
                "linear-gradient(90deg, transparent, rgba(31,138,168,0.08), transparent)",
            }}
          />
        </div>

        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 1600 920"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <defs>
            <linearGradient id="skel-edge" x1="0%" x2="100%">
              <stop offset="0%" stopColor="rgba(26,29,51,0.18)" />
              <stop offset="100%" stopColor="rgba(26,29,51,0.06)" />
            </linearGradient>
          </defs>
          {SKELETON_LAYOUT.branches.map((b, i) => (
            <path
              key={`e${i}`}
              d={`M 800,460 C ${800 + (b.x - 800) * 0.5},460 ${800 + (b.x - 800) * 0.5},${b.y} ${b.x},${b.y}`}
              stroke="url(#skel-edge)"
              strokeWidth={1.5}
              strokeDasharray="4 6"
              fill="none"
              className="animate-skel-pulse"
              style={{ animationDelay: `${i * 120}ms` }}
            />
          ))}
          {SKELETON_LAYOUT.branches.flatMap((b, bi) =>
            b.leaves.map((l, li) => (
              <path
                key={`le${bi}-${li}`}
                d={`M ${b.x},${b.y} C ${(b.x + l.x) / 2},${b.y} ${(b.x + l.x) / 2},${l.y} ${l.x},${l.y}`}
                stroke="rgba(26,29,51,0.10)"
                strokeWidth={1}
                strokeDasharray="3 5"
                fill="none"
                className="animate-skel-pulse"
                style={{ animationDelay: `${bi * 120 + li * 60 + 200}ms` }}
              />
            ))
          )}
        </svg>

        {SKELETON_LAYOUT.branches.map((b, i) => (
          <div
            key={`b${i}`}
            className="absolute animate-skel-pulse rounded-2xl border border-line bg-white/60"
            style={{
              left: `calc(${(b.x / 1600) * 100}% - 110px)`,
              top: `calc(${(b.y / 920) * 100}% - 32px)`,
              width: 220,
              height: 64,
              animationDelay: `${i * 120}ms`,
            }}
          >
            <div className="flex h-full items-center gap-2 px-3">
              <div className="size-7 rounded-md bg-[rgba(26,29,51,0.08)]" />
              <div className="flex-1 space-y-1.5">
                <div className="h-2 w-12 rounded-full bg-[rgba(26,29,51,0.08)]" />
                <div className="h-2.5 w-3/4 rounded-full bg-[rgba(26,29,51,0.12)]" />
              </div>
            </div>
          </div>
        ))}

        {SKELETON_LAYOUT.branches.flatMap((b, bi) =>
          b.leaves.map((l, li) => (
            <div
              key={`l${bi}-${li}`}
              className="absolute animate-skel-pulse rounded-xl border border-line bg-white/55"
              style={{
                left: `calc(${(l.x / 1600) * 100}% - 88px)`,
                top: `calc(${(l.y / 920) * 100}% - 24px)`,
                width: 176,
                height: 48,
                animationDelay: `${bi * 120 + li * 60 + 200}ms`,
              }}
            >
              <div className="space-y-1.5 px-3 py-2">
                <div className="h-2 w-2/3 rounded-full bg-[rgba(26,29,51,0.10)]" />
                <div className="h-2 w-1/2 rounded-full bg-[rgba(26,29,51,0.06)]" />
              </div>
            </div>
          ))
        )}

        <div className="absolute inset-0 flex items-center justify-center">
          <div
            className="relative animate-skel-pulse rounded-3xl border border-line-strong bg-white/85 px-7 py-5 text-center"
            style={{ width: 300 }}
          >
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan">
              <span className="size-1.5 rounded-full bg-cyan animate-blink" />
              본질 · ESSENCE
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              <span
                className="size-2 rounded-full bg-ink animate-thinking-dot"
                style={{ animationDelay: "0s" }}
              />
              <span
                className="size-2 rounded-full bg-ink animate-thinking-dot"
                style={{ animationDelay: "0.18s" }}
              />
              <span
                className="size-2 rounded-full bg-ink animate-thinking-dot"
                style={{ animationDelay: "0.36s" }}
              />
            </div>
            <p className="text-display mt-3 text-xs leading-relaxed text-ink-mute">
              문제를 다시 보고 있어요…
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function PanelSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="surface-card rounded-2xl p-5"
          style={{ animationDelay: `${i * 100}ms` }}
        >
          <div
            className="h-2 w-24 rounded-full animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, rgba(26,29,51,0.06), rgba(26,29,51,0.14), rgba(26,29,51,0.06))",
            }}
          />
          <div
            className="mt-4 h-5 w-3/4 rounded-full animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, rgba(26,29,51,0.06), rgba(26,29,51,0.14), rgba(26,29,51,0.06))",
            }}
          />
          <div
            className="mt-2 h-3 w-full rounded-full animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, rgba(26,29,51,0.04), rgba(26,29,51,0.10), rgba(26,29,51,0.04))",
            }}
          />
          <div
            className="mt-1.5 h-3 w-5/6 rounded-full animate-shimmer"
            style={{
              background:
                "linear-gradient(90deg, rgba(26,29,51,0.04), rgba(26,29,51,0.10), rgba(26,29,51,0.04))",
            }}
          />
        </div>
      ))}
    </div>
  );
}

function Howto() {
  const steps: { num: string; title: string; body: string; color: string }[] = [
    {
      num: "01",
      title: "있는 그대로 적기",
      body: "정돈하지 말고, 머리에 떠오르는 흐릿한 표현 그대로 입력합니다. Re:Frame이 본질을 다시 찾아 줍니다.",
      color: "#1f8aa8",
    },
    {
      num: "02",
      title: "구조로 다시 보기",
      body: "원인·제약·하위 목표·관계자·레버리지로 문제를 구조화합니다. 가지를 클릭해 자세히 봅니다.",
      color: "#6a59b8",
    },
    {
      num: "03",
      title: "첫 한 걸음 떼기",
      body: "5분 안에 시작할 수 있는 행동 하나가 항상 함께 옵니다. 큰 결정 대신 작은 시작이 우선입니다.",
      color: "#b87a1f",
    },
  ];

  return (
    <section id="howto" className="mt-20">
      <div className="mb-6 flex flex-col items-center text-center">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
          HOWTO · 사용법
        </span>
        <h2 className="text-display mt-3 text-3xl font-bold leading-tight text-ink sm:text-4xl">
          세 단계로 다시 봅니다
        </h2>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={s.num}
            className="surface-card relative overflow-hidden rounded-2xl p-6 animate-slide-up"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background: `linear-gradient(90deg, transparent, ${s.color}, transparent)`,
              }}
            />
            <span
              className="text-display block text-5xl font-bold leading-none"
              style={{ color: s.color }}
            >
              {s.num}
            </span>
            <h3 className="text-display mt-4 text-lg font-semibold text-ink">
              {s.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-ink-soft">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex w-full max-w-[1320px] flex-col items-start justify-between gap-3 px-5 py-8 sm:flex-row sm:items-center sm:px-8">
        <p className="text-[11px] text-ink-mute">
          Re:Frame — 문제를 다시 보는 사고 도구.
        </p>
        <p className="text-[11px] text-ink-mute">
          AI가 만든 결과는 가설입니다. 의료/법률 단정 답변에 사용하지 마세요.
        </p>
      </div>
    </footer>
  );
}
