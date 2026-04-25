"use client";

import {
  branchKindLabel,
  LEVERAGE_KO,
  type Branch,
  type Decomposition,
} from "@/lib/types";

const BRANCH_PALETTE = [
  { color: "#1f8aa8", soft: "rgba(31,138,168,0.10)" },
  { color: "#6a59b8", soft: "rgba(106,89,184,0.10)" },
  { color: "#b87a1f", soft: "rgba(184,122,31,0.10)" },
  { color: "#b04a64", soft: "rgba(176,74,100,0.10)" },
  { color: "#5b8a47", soft: "rgba(91,138,71,0.10)" },
];

type Props = {
  data: Decomposition;
  selected: string | null;
  onSelect: (id: string | null) => void;
};

export function InsightPanel({ data, selected, onSelect }: Props) {
  const selectedBranch = selected
    ? data.branches.find((b) => b.id === selected)
    : null;
  const selectedIndex = selected
    ? data.branches.findIndex((b) => b.id === selected)
    : -1;

  const hasSelection = !!(selectedBranch && selectedIndex >= 0);

  return (
    <div
      className={`grid grid-cols-1 gap-4 ${
        hasSelection
          ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_minmax(0,1fr)]"
          : "lg:grid-cols-3"
      }`}
    >
      <FirstStepCard data={data} />

      {hasSelection ? (
        <SelectedBranchCard
          branch={selectedBranch!}
          color={BRANCH_PALETTE[selectedIndex % BRANCH_PALETTE.length].color}
          soft={BRANCH_PALETTE[selectedIndex % BRANCH_PALETTE.length].soft}
          onClose={() => onSelect(null)}
        />
      ) : (
        <BranchListCard branches={data.branches} onSelect={onSelect} />
      )}

      <BlockersCard data={data} />
    </div>
  );
}

function FirstStepCard({ data }: { data: Decomposition }) {
  return (
    <div className="surface-card relative overflow-hidden rounded-2xl p-5 animate-slide-up">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full opacity-60"
        style={{
          background:
            "radial-gradient(closest-side, rgba(184,122,31,0.18), transparent 70%)",
        }}
      />
      <div className="relative">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-amber/15 text-[11px] font-bold text-amber">
            ▶
          </span>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
            FIRST STEP · 첫 한 걸음
          </span>
        </div>
        <p className="text-display mt-3 text-xl font-semibold leading-snug text-gradient-amber">
          {data.firstStep.title}
        </p>
        {data.firstStep.reveals ? (
          <p className="mt-2 flex gap-2 text-sm leading-relaxed text-ink-soft">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-amber pt-1">
              드러남
            </span>
            <span>{data.firstStep.reveals}</span>
          </p>
        ) : null}
        {data.firstStep.narrows ? (
          <p className="mt-1 flex gap-2 text-sm leading-relaxed text-ink-soft">
            <span className="shrink-0 text-[10px] font-medium uppercase tracking-[0.18em] text-amber pt-1">
              다음 한걸음
            </span>
            <span>{data.firstStep.narrows}</span>
          </p>
        ) : null}
        <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-line bg-[var(--surface-soft)] px-2.5 py-1 text-[11px] text-ink-soft">
          <span className="size-1 rounded-full bg-amber animate-blink" />
          {data.firstStep.minutes}분 안에 시작
        </div>
      </div>
    </div>
  );
}

function BranchListCard({
  branches,
  onSelect,
}: {
  branches: Branch[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="surface-card rounded-2xl p-5 animate-slide-up" style={{ animationDelay: "80ms" }}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
          BRANCHES · 가지
        </span>
        <span className="text-[10px] text-ink-mute">
          {branches.length}개
        </span>
      </div>
      <div className="mt-4 space-y-2.5">
        {branches.map((branch, i) => {
          const palette = BRANCH_PALETTE[i % BRANCH_PALETTE.length];
          return (
            <button
              key={branch.id}
              type="button"
              onClick={() => onSelect(branch.id)}
              className="group flex w-full items-start gap-3 rounded-xl border border-line bg-[var(--surface-soft)] p-3 text-left transition hover:bg-white hover:border-line-strong"
            >
              <span
                className="mt-1 size-2 shrink-0 rounded-full"
                style={{ background: palette.color }}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-display text-sm font-semibold text-ink">
                    {branch.label}
                  </span>
                  <span className="text-[9px] uppercase tracking-[0.2em] text-ink-mute">
                    {branchKindLabel(branch.kind)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-relaxed text-ink-soft">
                  {branch.summary}
                </p>
              </div>
              <span className="mt-1 text-ink-mute opacity-0 transition group-hover:opacity-100">
                →
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SelectedBranchCard({
  branch,
  color,
  soft,
  onClose,
}: {
  branch: Branch;
  color: string;
  soft: string;
  onClose: () => void;
}) {
  return (
    <div
      className="surface-card relative overflow-hidden rounded-2xl p-5 animate-slide-up"
      style={{
        borderColor: color,
        boxShadow: `0 0 0 1px ${color}, 0 18px 44px -20px ${color}55`,
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-70"
        style={{
          background: `radial-gradient(closest-side, ${soft}, transparent 70%)`,
        }}
      />
      <div className="relative">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span
                className="size-2 rounded-full"
                style={{ background: color }}
              />
              <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
                {branchKindLabel(branch.kind)} · BRANCH
              </span>
            </div>
            <h3
              className="text-display mt-2 text-xl font-semibold leading-tight"
              style={{ color }}
            >
              {branch.label}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-2 py-1 text-xs text-ink-mute transition hover:bg-[var(--surface-soft)] hover:text-ink"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-soft">
          {branch.summary}
        </p>
        {branch.check ? (
          <div
            className="mt-3 flex items-start gap-2 rounded-xl border border-dashed px-3 py-2 text-xs text-ink-soft"
            style={{ borderColor: color, background: soft }}
          >
            <span
              className="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em]"
              style={{ color }}
            >
              점검
            </span>
            <span className="flex-1 leading-relaxed">{branch.check}</span>
          </div>
        ) : null}

        <div className="mt-5 space-y-2.5">
          {branch.leaves.map((leaf, i) => (
            <div
              key={leaf.id}
              className="rounded-xl border border-line bg-[var(--surface-soft)] p-3 animate-slide-up"
              style={{ animationDelay: `${i * 60}ms` }}
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-display text-sm font-semibold text-ink">
                  {leaf.label}
                </span>
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                  style={{
                    background:
                      leaf.leverage === "high"
                        ? "rgba(184,122,31,0.14)"
                        : leaf.leverage === "medium"
                          ? "rgba(31,138,168,0.12)"
                          : "rgba(26,29,51,0.06)",
                    color:
                      leaf.leverage === "high"
                        ? "#b87a1f"
                        : leaf.leverage === "medium"
                          ? "#1f8aa8"
                          : "#8e93ab",
                  }}
                >
                  {LEVERAGE_KO[leaf.leverage]}
                </span>
              </div>
              {leaf.why ? (
                <p className="mt-1.5 text-xs leading-relaxed text-ink-soft">
                  {leaf.why}
                </p>
              ) : null}
              {leaf.signal ? (
                <p className="mt-1.5 flex gap-1.5 text-[11px] leading-relaxed text-ink-soft">
                  <span className="shrink-0 font-medium" style={{ color }}>
                    신호
                  </span>
                  <span>{leaf.signal}</span>
                </p>
              ) : null}
              {leaf.probe ? (
                <p className="mt-1 flex gap-1.5 text-[11px] leading-relaxed text-ink-mute">
                  <span className="shrink-0 font-medium text-cyan">점검</span>
                  <span>{leaf.probe}</span>
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function BlockersCard({ data }: { data: Decomposition }) {
  return (
    <div
      className="surface-card rounded-2xl p-5 animate-slide-up"
      style={{ animationDelay: "160ms" }}
    >
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-rose/15 text-[11px] font-bold text-rose">
          !
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
          BLOCKERS · 막힘 신호
        </span>
      </div>
      <div className="mt-3 space-y-2.5">
        {data.blockers.map((blocker, i) => (
          <div
            key={i}
            className="rounded-xl border border-line bg-[var(--surface-soft)] p-3"
          >
            <p className="text-display text-sm font-semibold text-ink">
              {blocker.title}
            </p>
            {blocker.preempt ? (
              <p className="mt-1.5 flex gap-1.5 text-xs leading-relaxed text-ink-soft">
                <span className="shrink-0 font-medium text-rose">대응</span>
                <span>{blocker.preempt}</span>
              </p>
            ) : null}
            {blocker.fallback ? (
              <p className="mt-0.5 flex gap-1.5 text-xs leading-relaxed text-ink-mute">
                <span className="shrink-0 font-medium text-rose/80">대안</span>
                <span>{blocker.fallback}</span>
              </p>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
