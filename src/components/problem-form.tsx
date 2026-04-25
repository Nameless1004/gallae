"use client";

import { useState } from "react";

type Depth = "narrow" | "balanced" | "wide";
type Tone = "warm" | "neutral" | "sharp";

const DEPTH_OPTIONS: { value: Depth; label: string; hint: string }[] = [
  { value: "narrow", label: "좁게", hint: "핵심 3가지" },
  { value: "balanced", label: "균형", hint: "기본 분해" },
  { value: "wide", label: "넓게", hint: "다층 분해" },
];

const TONE_OPTIONS: { value: Tone; label: string }[] = [
  { value: "warm", label: "따뜻" },
  { value: "neutral", label: "차분" },
  { value: "sharp", label: "직설" },
];

type Props = {
  initialProblem?: string;
  initialDepth?: Depth;
  initialTone?: Tone;
  isLoading: boolean;
  compact?: boolean;
  onSubmit: (problem: string, depth: Depth, tone: Tone) => void;
};

export function ProblemForm({
  initialProblem = "",
  initialDepth = "balanced",
  initialTone = "warm",
  isLoading,
  compact = false,
  onSubmit,
}: Props) {
  const [problem, setProblem] = useState(initialProblem);
  const [depth, setDepth] = useState<Depth>(initialDepth);
  const [tone, setTone] = useState<Tone>(initialTone);

  function submit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!problem.trim() || isLoading) return;
    onSubmit(problem.trim(), depth, tone);
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
      onSubmit={submit}
      className={`surface-card relative overflow-hidden rounded-3xl p-5 ${compact ? "" : "p-6 sm:p-7"}`}
    >
      {isLoading ? (
        <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
          <div
            aria-hidden
            className="animate-scan-soft absolute inset-x-0 h-32"
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
          id="problem-input"
          value={problem}
          onChange={(e) => setProblem(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="예: 졸업작품 주제가 떠오르지 않고 마감은 한 달 남았다. 무엇부터 해야 할지 모르겠다."
          rows={compact ? 3 : 4}
          disabled={isLoading}
          className="text-display mt-3 w-full resize-none rounded-2xl border border-line bg-[var(--surface-soft)] p-4 text-base leading-relaxed text-ink placeholder:text-ink-mute outline-none transition focus:border-cyan/60 focus:bg-white focus:ring-2 focus:ring-cyan/20 disabled:opacity-60"
        />

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
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
              options={TONE_OPTIONS.map((o) => ({ ...o, hint: "" }))}
              disabled={isLoading}
            />
          </div>

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
                  <span>갈라보는 중…</span>
                </>
              ) : (
                <>
                  <span>분해하기</span>
                  <kbd className="rounded bg-white/15 px-1.5 py-0.5 text-[10px] font-medium tracking-wide">
                    ⌘↵
                  </kbd>
                </>
              )}
            </span>
          </button>
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
  return (
    <div className="flex items-center gap-2 rounded-full border border-line bg-[var(--surface-soft)] p-1">
      <span className="px-2 text-[10px] uppercase tracking-[0.2em] text-ink-mute">
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
            className={`relative rounded-full px-3 py-1 text-[12px] font-medium transition ${
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
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin-slow"
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
