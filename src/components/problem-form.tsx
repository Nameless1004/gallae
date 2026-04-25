"use client";

import { useEffect, useRef, useState } from "react";

type Depth = "narrow" | "balanced" | "wide";
type Tone = "warm" | "neutral" | "sharp";
type FrameworkChoice = string;

const DEPTH_OPTIONS: { value: Depth; label: string; hint: string }[] = [
  { value: "narrow", label: "좁게", hint: "핵심 가지 3개만 빠르게 봅니다" },
  { value: "balanced", label: "균형", hint: "가지 4~5개로 원인과 조건을 함께 봅니다" },
  { value: "wide", label: "넓게", hint: "가지 6~7개까지 넓혀 관계자와 리스크를 봅니다" },
];

const TONE_OPTIONS: { value: Tone; label: string; hint: string }[] = [
  { value: "warm", label: "따뜻", hint: "부담을 낮추고 다정하게 짚습니다" },
  { value: "neutral", label: "차분", hint: "감정을 덜어내고 객관적으로 정리합니다" },
  { value: "sharp", label: "직설", hint: "모호한 지점을 바로 짚고 우선순위를 세웁니다" },
];

const FRAMEWORK_OPTIONS: {
  value: FrameworkChoice;
  label: string;
  hint: string;
  bestFor: string;
}[] = [
  { value: "auto", label: "자동", hint: "문제에 맞는 렌즈를 Re:Frame이 직접 고릅니다.", bestFor: "무엇을 써야 할지 모를 때 가장 안전합니다." },
  { value: "5 Whys", label: "5 Whys", hint: "반복되는 문제의 근본 원인을 좁힙니다.", bestFor: "같은 문제가 자꾸 반복될 때 좋습니다." },
  { value: "이슈 트리 (MECE)", label: "MECE", hint: "결정과 전략을 빠짐없이 하위 질문으로 나눕니다.", bestFor: "큰 기획, 전략, 선택지를 빠짐없이 보고 싶을 때 좋습니다." },
  { value: "Decision Matrix", label: "Decision Matrix", hint: "선택지와 기준을 비교해 판단을 돕습니다.", bestFor: "A/B/C 중 무엇을 고를지 애매할 때 좋습니다." },
  { value: "Lean Experiment", label: "Lean Experiment", hint: "가설을 가장 작은 실험으로 검증합니다.", bestFor: "아이디어가 될지 빠르게 확인하고 싶을 때 좋습니다." },
  { value: "Jobs-to-be-Done", label: "JTBD", hint: "사용자 행동과 맥락, 욕구를 중심으로 봅니다.", bestFor: "제품, 서비스, 고객 행동을 이해할 때 좋습니다." },
  { value: "Pre-mortem", label: "Pre-mortem", hint: "실패 시나리오와 리스크를 먼저 봅니다.", bestFor: "실패가 걱정되거나 리스크를 먼저 보고 싶을 때 좋습니다." },
  { value: "First Principles", label: "First Principles", hint: "숨은 가정과 통념을 걷어내고 다시 봅니다.", bestFor: "당연하다고 믿는 전제가 의심될 때 좋습니다." },
  { value: "Eisenhower Matrix", label: "Eisenhower", hint: "긴급도와 중요도로 우선순위를 정리합니다.", bestFor: "할 일이 많아 무엇부터 할지 모를 때 좋습니다." },
  { value: "OODA Loop", label: "OODA", hint: "관찰, 판단, 결정, 행동의 빠른 루프로 봅니다.", bestFor: "빠르게 보고 움직여야 하는 상황에 좋습니다." },
  { value: "SCQA 피라미드", label: "SCQA", hint: "상황, 복잡성, 질문, 답으로 논리를 잡습니다.", bestFor: "보고서, 발표, 글의 논리를 잡을 때 좋습니다." },
  { value: "6 Hats (de Bono)", label: "6 Hats", hint: "사실, 감정, 리스크, 기회 등 관점을 나눕니다.", bestFor: "한 문제를 여러 관점으로 검토하고 싶을 때 좋습니다." },
  { value: "OKR", label: "OKR", hint: "목표, 핵심결과, 지표, 리스크로 정렬합니다.", bestFor: "목표가 흐릿하거나 지표가 필요한 상황에 좋습니다." },
  { value: "ICE/RICE", label: "ICE/RICE", hint: "영향도, 확신, 노력으로 우선순위를 봅니다.", bestFor: "기능, 작업, 실험 우선순위를 정할 때 좋습니다." },
  { value: "Stakeholder Map", label: "Stakeholder", hint: "이해관계자와 충돌 지점을 정리합니다.", bestFor: "팀, 조직, 협업, 갈등 문제가 얽혀 있을 때 좋습니다." },
  { value: "User Journey", label: "Journey", hint: "사용자 여정의 마찰과 기회를 찾습니다.", bestFor: "사용자가 어디서 막히는지 찾을 때 좋습니다." },
  { value: "Root Cause Tree", label: "Root Cause", hint: "증상, 원인 후보, 증거, 검증을 트리로 봅니다.", bestFor: "원인이 여러 개로 보일 때 좋습니다." },
  { value: "SWOT", label: "SWOT", hint: "강점, 약점, 기회, 위협으로 상황을 봅니다.", bestFor: "상황을 넓게 평가하고 전략 방향을 잡을 때 좋습니다." },
  { value: "Impact-Effort Matrix", label: "Impact/Effort", hint: "효과와 노력으로 실행 우선순위를 잡습니다.", bestFor: "작게 시작할 고효과 행동을 고를 때 좋습니다." },
  { value: "Risk Matrix", label: "Risk Matrix", hint: "가능성과 영향도로 위험을 분류합니다.", bestFor: "위험을 분류하고 대응 순서를 정할 때 좋습니다." },
  { value: "Assumption Mapping", label: "Assumption", hint: "중요하지만 불확실한 가정을 먼저 찾습니다.", bestFor: "성공 여부를 좌우하는 가정을 검증할 때 좋습니다." },
  { value: "감정 분해", label: "감정", hint: "사실, 감정, 욕구, 요청을 분리합니다.", bestFor: "관계, 대화, 내면의 불편함을 다룰 때 좋습니다." },
  { value: "환경/내면", label: "환경/내면", hint: "의지보다 구조, 습관, 환경을 먼저 봅니다.", bestFor: "의지 문제가 아니라 생활 구조 문제처럼 느껴질 때 좋습니다." },
];

const QUICK_FRAMEWORKS = [
  "auto",
  "이슈 트리 (MECE)",
  "Decision Matrix",
  "Lean Experiment",
  "5 Whys",
  "SCQA 피라미드",
];

const WRITING_GUIDE: { label: string; text: string }[] = [
  { label: "상황", text: "언제, 어디서, 누가 얽혀 있나요?" },
  { label: "막힌 지점", text: "무엇 때문에 다음 행동이 안 나오나요?" },
  { label: "결정", text: "지금 골라야 하는 선택지는 무엇인가요?" },
  { label: "이미 해본 것", text: "시도한 방법과 결과를 적어 주세요." },
];

type Props = {
  initialProblem?: string;
  initialDepth?: Depth;
  initialTone?: Tone;
  initialFramework?: FrameworkChoice;
  focusSignal?: number;
  isLoading: boolean;
  compact?: boolean;
  onSubmit: (
    problem: string,
    depth: Depth,
    tone: Tone,
    framework: FrameworkChoice
  ) => void;
};

export function ProblemForm({
  initialProblem = "",
  initialDepth = "balanced",
  initialTone = "warm",
  initialFramework = "auto",
  focusSignal = 0,
  isLoading,
  compact = false,
  onSubmit,
}: Props) {
  const [problem, setProblem] = useState(initialProblem);
  const [depth, setDepth] = useState<Depth>(initialDepth);
  const [tone, setTone] = useState<Tone>(initialTone);
  const [framework, setFramework] =
    useState<FrameworkChoice>(initialFramework);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    if (!focusSignal || !initialProblem.trim()) return;

    const id = window.requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });

      window.setTimeout(() => {
        const input = textareaRef.current;
        if (!input) return;
        input.focus({ preventScroll: true });
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }, 180);
    });

    return () => window.cancelAnimationFrame(id);
  }, [focusSignal, initialProblem]);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!problem.trim() || isLoading) return;
    onSubmit(problem.trim(), depth, tone, framework);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      submit();
    }
  }

  const charCount = problem.length;
  const tooLong = charCount > 800;

  return (
    <form
      ref={formRef}
      onSubmit={submit}
      className={`surface-card relative overflow-hidden rounded-3xl p-5 ${compact ? "" : "p-6 sm:p-7"}`}
    >
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div
            aria-hidden
            className="animate-scan-soft absolute inset-x-0 top-0 h-full"
            style={{
              background:
                "linear-gradient(180deg, transparent, rgba(31,138,168,0.16), transparent)",
            }}
          />
        </div>
      ) : null}

      <div className="relative">
        <label
          htmlFor="problem-input"
          className="flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
            <span className="size-1.5 rounded-full bg-cyan animate-blink" />
            PROBLEM · 문제를 적어 주세요
          </span>
          <span
            className={`text-[10px] tabular-nums ${tooLong ? "text-rose" : "text-ink-mute"}`}
          >
            {charCount}/800
          </span>
        </label>

        <textarea
          ref={textareaRef}
          id="problem-input"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: 졸업작품 주제가 떠오르지 않고 마감은 한 달 남았다. 무엇부터 해야 할지 모르겠다."
          rows={compact ? 3 : 4}
          disabled={isLoading}
          className="text-display mt-3 w-full resize-none rounded-2xl border border-line bg-[var(--surface-soft)] p-4 text-base leading-relaxed text-ink placeholder:text-ink-mute outline-none transition focus:border-cyan/60 focus:bg-white focus:ring-2 focus:ring-cyan/20 disabled:opacity-60"
        />

        <div className="mt-3 grid gap-2 text-xs text-ink-mute sm:grid-cols-2">
          {WRITING_GUIDE.map((item) => (
            <p key={item.label} className="border-l-2 border-line pl-3 leading-relaxed">
              <span className="font-semibold text-ink">{item.label}</span>
              <span className="mx-1 text-line">/</span>
              {item.text}
            </p>
          ))}
        </div>

        <div className="mt-4">
          <FrameworkPicker
            value={framework}
            onChange={setFramework}
            disabled={isLoading}
          />
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2 lg:max-w-[760px]">
            <SegmentGroup
              label="깊이"
              value={depth}
              onChange={(v) => setDepth(v as Depth)}
              options={DEPTH_OPTIONS}
              disabled={isLoading}
            />
            <SegmentGroup
              label="어조"
              value={tone}
              onChange={(v) => setTone(v as Tone)}
              options={TONE_OPTIONS}
              disabled={isLoading}
            />
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-[220px]">
            <button
              type="submit"
              disabled={isLoading || !problem.trim() || tooLong}
              className="group relative inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full px-6 text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background:
                  "linear-gradient(120deg, #1f8aa8 0%, #6a59b8 60%, #b04a64 100%)",
                boxShadow:
                  "0 1px 0 rgba(255,255,255,0.4) inset, 0 12px 28px -10px rgba(31,138,168,0.5)",
              }}
            >
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-[linear-gradient(120deg,transparent,rgba(255,255,255,0.35),transparent)] transition-transform duration-700 group-hover:translate-x-full"
              />
              <span className="relative flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Spinner />
                    <span>다시 보는 중…</span>
                  </>
                ) : (
                  <>
                    <span>Reframe</span>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

function SegmentGroup<T extends string>({
  label,
  value,
  onChange,
  options,
  disabled,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string; hint?: string }[];
  disabled?: boolean;
}) {
  const activeHint = options.find((opt) => opt.value === value)?.hint;

  return (
    <div className="min-w-0">
      <div
        className="grid items-center gap-1 rounded-full border border-line bg-[var(--surface-soft)] p-1"
        style={{
          gridTemplateColumns: `52px repeat(${options.length}, minmax(0, 1fr))`,
        }}
      >
        <span className="px-2 text-center text-[10px] uppercase tracking-[0.2em] text-ink-mute">
          {label}
        </span>
        {options.map((opt) => {
          const active = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(opt.value)}
              className={`relative min-w-0 rounded-full px-2 py-1 text-[12px] font-medium transition ${
                active
                  ? "bg-white text-ink shadow-sm"
                  : "text-ink-mute hover:text-ink hover:bg-white"
              }`}
              title={opt.hint}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
      <div className="min-h-[32px] px-3 pt-1">
        <p className="text-[11px] leading-snug text-ink-mute">
          {activeHint}
        </p>
      </div>
    </div>
  );
}

function FrameworkPicker({
  value,
  onChange,
  disabled,
}: {
  value: FrameworkChoice;
  onChange: (value: FrameworkChoice) => void;
  disabled?: boolean;
}) {
  const active = FRAMEWORK_OPTIONS.find((option) => option.value === value);

  return (
    <div className="rounded-2xl border border-line bg-[var(--surface-soft)] p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
            FRAMEWORK · 사고 렌즈
          </span>
          <p className="mt-1 text-xs leading-relaxed text-ink-soft">
            {active?.hint}
          </p>
        </div>
        <select
          value={value}
          disabled={disabled}
          onChange={(event) =>
            onChange(event.target.value as FrameworkChoice)
          }
          className="h-9 rounded-full border border-line bg-white px-3 text-xs font-medium text-ink outline-none transition hover:border-line-strong focus:border-cyan/60 focus:ring-2 focus:ring-cyan/20 disabled:opacity-60"
        >
          {FRAMEWORK_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label} · {option.hint}
            </option>
          ))}
        </select>
      </div>
      {active ? (
        <div className="mt-3 rounded-xl border border-line bg-white/65 p-3">
          <div className="grid gap-2 text-xs leading-relaxed text-ink-soft sm:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <p>
              <span className="font-semibold text-ink">무엇을 보나 </span>
              {active.hint}
            </p>
            <p>
              <span className="font-semibold text-ink">언제 쓰나 </span>
              {active.bestFor}
            </p>
          </div>
        </div>
      ) : null}
      <div className="mt-3 grid gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
        {FRAMEWORK_OPTIONS.filter((option) =>
          QUICK_FRAMEWORKS.includes(option.value)
        ).map((option) => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              title={option.hint}
              className={`min-h-10 rounded-xl border px-2 py-1.5 text-left transition ${
                selected
                  ? "border-cyan bg-white text-ink shadow-sm"
                  : "border-line bg-white/55 text-ink-soft hover:border-line-strong hover:text-ink"
              }`}
            >
              <span className="block truncate text-[11px] font-semibold">
                {option.label}
              </span>
              <span className="mt-0.5 block line-clamp-1 text-[10px] leading-snug text-ink-mute">
                {option.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="2"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="#ffffff"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
