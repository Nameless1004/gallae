"use client";

import { useMemo, useState } from "react";
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

type RecommendedPath = {
  branch: Branch;
  branchIndex: number;
  leaf: Branch["leaves"][number];
};

type StudioMode = "deeper" | "opposing" | "brief";

const LEVERAGE_SCORE = {
  high: 3,
  medium: 2,
  low: 1,
} as const;

export function InsightPanel({ data, selected, onSelect }: Props) {
  const selectedBranch = selected
    ? data.branches.find((b) => b.id === selected)
    : null;
  const selectedIndex = selected
    ? data.branches.findIndex((b) => b.id === selected)
    : -1;

  const hasSelection = !!(selectedBranch && selectedIndex >= 0);
  const recommendedPath = pickRecommendedPath(data);
  const [studioMode, setStudioMode] = useState<StudioMode>("brief");
  const studioBranch = selectedBranch ?? recommendedPath?.branch ?? data.branches[0];
  const studioLeaf = useMemo(() => {
    if (!studioBranch) return null;
    return (
      studioBranch.leaves.find((leaf) => leaf.leverage === "high") ??
      studioBranch.leaves[0] ??
      recommendedPath?.leaf ??
      null
    );
  }, [recommendedPath?.leaf, studioBranch]);

  return (
    <div className="space-y-4">
      <OutcomeSummary data={data} recommendedPath={recommendedPath} />

      <div>
        {hasSelection ? (
          <SelectedBranchCard
            branch={selectedBranch!}
            color={BRANCH_PALETTE[selectedIndex % BRANCH_PALETTE.length].color}
            soft={BRANCH_PALETTE[selectedIndex % BRANCH_PALETTE.length].soft}
            recommendedLeafId={recommendedPath?.leaf.id ?? null}
            onClose={() => onSelect(null)}
          />
        ) : (
          <BranchListCard branches={data.branches} onSelect={onSelect} />
        )}
      </div>

      <ThinkingStudio
        data={data}
        mode={studioMode}
        branch={studioBranch}
        leaf={studioLeaf}
        onModeChange={setStudioMode}
      />
    </div>
  );
}

function pickRecommendedPath(data: Decomposition): RecommendedPath | null {
  let recommended: RecommendedPath | null = null;

  data.branches.forEach((branch, branchIndex) => {
    branch.leaves.forEach((leaf) => {
      if (
        !recommended ||
        LEVERAGE_SCORE[leaf.leverage] >
          LEVERAGE_SCORE[recommended.leaf.leverage]
      ) {
        recommended = { branch, branchIndex, leaf };
      }
    });
  });

  return recommended;
}

function OutcomeSummary({
  data,
  recommendedPath,
}: {
  data: Decomposition;
  recommendedPath: RecommendedPath | null;
}) {
  const caution = data.blockers[0];

  return (
    <section className="surface-card rounded-2xl p-5 animate-slide-up">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ReframedProblem data={data} />
        <CautionSummary blocker={caution} />
      </div>
      <FirstStepStrip data={data} recommendedPath={recommendedPath} />
    </section>
  );
}

function ReframedProblem({ data }: { data: Decomposition }) {
  const diagnosis = data.diagnosis;
  const candidate = diagnosis.likelyProblems[0];

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        <span className="size-1.5 rounded-full bg-cyan" />
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
          REFRAMED · 재구성된 문제
        </span>
      </div>
      <p className="text-display mt-2 text-lg font-semibold leading-snug text-ink">
        {candidate?.title || data.essence}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-ink-soft">
        {candidate?.why || diagnosis.visibleProblem || data.frame}
      </p>
      {candidate?.verify ? (
        <p className="mt-2 text-xs leading-relaxed text-ink-mute">
          <span className="font-medium text-cyan">확인 </span>
          {candidate.verify}
        </p>
      ) : null}
    </div>
  );
}

function CautionSummary({
  blocker,
}: {
  blocker: Decomposition["blockers"][number] | undefined;
}) {
  return (
    <div className="rounded-xl border border-rose/20 bg-rose/5 p-3">
      <div className="flex items-center gap-2">
        <span className="flex size-5 items-center justify-center rounded-md bg-rose/15 text-[10px] font-bold text-rose">
          !
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
          CAUTION · 주의할 점
        </span>
      </div>
      <p className="text-display mt-2 text-base font-semibold text-ink">
        {blocker?.title || "검증 없이 결론 내리기"}
      </p>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">
        {blocker?.preempt ||
          "첫 행동으로 확인한 뒤 다음 결정을 좁혀야 합니다."}
      </p>
    </div>
  );
}

function FirstStepStrip({
  data,
  recommendedPath,
}: {
  data: Decomposition;
  recommendedPath: RecommendedPath | null;
}) {
  const leaf = recommendedPath?.leaf;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="flex size-6 items-center justify-center rounded-md bg-amber/15 text-[11px] font-bold text-amber">
              ▶
            </span>
            <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
              FIRST STEP · 첫 한 걸음
            </span>
          </div>
          <p className="text-display mt-2 text-xl font-semibold leading-snug text-gradient-amber">
            {data.firstStep.title}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-ink-soft">
            {data.firstStep.reveals || data.firstStep.narrows}
          </p>
          {leaf ? (
            <p className="mt-2 text-xs leading-relaxed text-ink-mute">
              <span className="font-medium text-amber">먼저 볼 것 </span>
              {recommendedPath.branch.label} · {leaf.label}
            </p>
          ) : null}
        </div>
        <ActionOptions data={data} />
      </div>
    </div>
  );
}

function ActionOptions({ data }: { data: Decomposition }) {
  if (data.actionOptions.length === 0) return null;

  return (
    <div className="grid min-w-0 gap-2 lg:w-[520px] lg:grid-cols-3">
      {data.actionOptions.slice(0, 3).map((action) => (
        <div
          key={`${action.minutes}-${action.title}`}
          className="grid grid-cols-[40px_minmax(0,1fr)] gap-2 rounded-xl border border-line bg-[var(--surface-soft)] p-3 lg:grid-cols-1 lg:gap-1"
        >
          <span className="pt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-amber">
            {action.minutes}분
          </span>
          <div className="min-w-0">
            <p className="text-display text-sm font-semibold leading-snug text-ink">
              {action.title}
            </p>
            {action.purpose ? (
              <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
                {action.purpose}
              </p>
            ) : null}
          </div>
        </div>
      ))}
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
    <div className="surface-card self-start rounded-2xl p-5 animate-slide-up lg:min-h-[420px]" style={{ animationDelay: "80ms" }}>
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
  recommendedLeafId,
  onClose,
}: {
  branch: Branch;
  color: string;
  soft: string;
  recommendedLeafId: string | null;
  onClose: () => void;
}) {
  return (
    <div
      className="surface-card relative self-start overflow-hidden rounded-2xl p-5 animate-slide-up"
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
      <div className="relative lg:min-h-[380px]">
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
          {branch.leaves.map((leaf, i) => {
            const isRecommended = leaf.id === recommendedLeafId;

            return (
              <div
                key={leaf.id}
                className="rounded-xl border bg-[var(--surface-soft)] p-3 animate-slide-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  borderColor: isRecommended ? color : "var(--line)",
                  boxShadow: isRecommended
                    ? `0 12px 28px -22px ${color}`
                    : undefined,
                }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-display text-sm font-semibold text-ink">
                    {leaf.label}
                  </span>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {isRecommended ? (
                      <span
                        className="rounded-full px-1.5 py-0.5 text-[9px] font-medium"
                        style={{ background: soft, color }}
                      >
                        먼저 볼 것
                      </span>
                    ) : null}
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
                    <span className="shrink-0 font-medium text-cyan">진단</span>
                    <span>{leaf.probe}</span>
                  </p>
                ) : null}
                {leaf.actions?.length ? (
                  <div className="mt-2.5 space-y-1.5">
                    <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-mute">
                      해결 액션
                    </span>
                    <div className="mt-1 space-y-1">
                      {leaf.actions.map((action) => (
                        <div
                          key={action.id}
                          className="flex items-start gap-2 rounded-lg border border-line bg-white px-2.5 py-2"
                        >
                          <span className="mt-0.5 size-3.5 shrink-0 rounded-sm border border-line" />
                          <div className="min-w-0">
                            <p className="text-[11px] font-medium leading-snug text-ink">
                              {action.label}
                            </p>
                            {action.how ? (
                              <p className="mt-0.5 text-[10px] leading-relaxed text-ink-mute">
                                {action.how}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function ThinkingStudio({
  data,
  mode,
  branch,
  leaf,
  onModeChange,
}: {
  data: Decomposition;
  mode: StudioMode;
  branch: Branch | undefined;
  leaf: Branch["leaves"][number] | null;
  onModeChange: (mode: StudioMode) => void;
}) {
  const actions: { mode: StudioMode; label: string; hint: string }[] = [
    {
      mode: "deeper",
      label: "이 가지 더 파기",
      hint: "선택한 가지를 검증 질문과 작은 실험으로 좁힙니다.",
    },
    {
      mode: "opposing",
      label: "반대 관점으로 보기",
      hint: "현재 분해가 틀렸을 가능성을 먼저 봅니다.",
    },
    {
      mode: "brief",
      label: "문제 정의서로 변환",
      hint: "공유 가능한 1페이지 구조로 바꿉니다.",
    },
  ];

  return (
    <div className="surface-card self-start rounded-2xl p-5 animate-slide-up">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.22em] text-ink-mute">
            STUDIO · 사고 확장
          </span>
          <h3 className="text-display mt-2 text-xl font-semibold text-ink">
            결과를 바로 다음 산출물로 바꾸기
          </h3>
        </div>
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => {
            const active = action.mode === mode;
            return (
              <button
                key={action.mode}
                type="button"
                onClick={() => onModeChange(action.mode)}
                title={action.hint}
                className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active
                    ? "border-cyan bg-cyan/10 text-cyan"
                    : "border-line bg-white text-ink-soft hover:border-line-strong hover:text-ink"
                }`}
              >
                {action.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-4">
        {mode === "deeper" ? (
          <DeepDiveView branch={branch} leaf={leaf} />
        ) : mode === "opposing" ? (
          <OpposingView data={data} branch={branch} leaf={leaf} />
        ) : (
          <ProblemBriefView data={data} branch={branch} leaf={leaf} />
        )}
      </div>
    </div>
  );
}

function DeepDiveView({
  branch,
  leaf,
}: {
  branch: Branch | undefined;
  leaf: Branch["leaves"][number] | null;
}) {
  if (!branch) return null;

  const focusLeaves = branch.leaves.slice(0, 3);

  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
      <div className="rounded-xl border border-line bg-[var(--surface-soft)] p-4">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-cyan">
          더 파볼 가지
        </span>
        <p className="text-display mt-2 text-lg font-semibold text-ink">
          {branch.label}
        </p>
        <p className="mt-2 text-sm leading-relaxed text-ink-soft">
          {branch.summary}
        </p>
        {branch.check ? (
          <p className="mt-3 text-xs leading-relaxed text-ink-mute">
            <span className="font-medium text-cyan">첫 검증 </span>
            {branch.check}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        {focusLeaves.map((item) => (
          <div
            key={item.id}
            className="rounded-xl border border-line bg-white p-3"
          >
            <span className="text-[10px] font-medium text-ink-mute">
              {LEVERAGE_KO[item.leverage]}
            </span>
            <p className="text-display mt-1 text-sm font-semibold text-ink">
              {item.label}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-ink-soft">
              {item.probe || item.signal || item.why}
            </p>
          </div>
        ))}
      </div>
      {leaf ? (
        <p className="rounded-xl border border-cyan/25 bg-cyan/10 p-3 text-xs leading-relaxed text-ink-soft lg:col-span-2">
          <span className="font-medium text-cyan">가장 먼저 확인할 것 </span>
          {leaf.label}은 {leaf.signal || leaf.why} {leaf.probe ? `확인은 "${leaf.probe}"로 시작하세요.` : ""}
        </p>
      ) : null}
    </div>
  );
}

function OpposingView({
  data,
  branch,
  leaf,
}: {
  data: Decomposition;
  branch: Branch | undefined;
  leaf: Branch["leaves"][number] | null;
}) {
  const questions = data.diagnosis.questions.slice(0, 3);
  const blockers = data.blockers.slice(0, 2);

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <StudioPoint
        title="가정이 틀렸다면"
        body={
          branch
            ? `${branch.label}보다 다른 가지가 핵심일 수 있습니다. ${branch.check || "이 가설을 작은 행동으로 먼저 확인하세요."}`
            : "현재 분해가 문제의 증상만 다루고 있을 수 있습니다."
        }
      />
      <StudioPoint
        title="과하게 보는 부분"
        body={
          data.diagnosis.defer ||
          "지금 당장 결정에 영향을 주지 않는 가지는 잠시 미뤄도 됩니다."
        }
      />
      <StudioPoint
        title="반박 신호"
        body={
          leaf?.signal ||
          blockers[0]?.fallback ||
          "첫 행동을 해도 정보가 전혀 좁혀지지 않으면 문제 정의를 다시 잡아야 합니다."
        }
      />
      <div className="rounded-xl border border-line bg-[var(--surface-soft)] p-4 lg:col-span-3">
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-rose">
          불편한 질문
        </span>
        <div className="mt-2 grid gap-2 sm:grid-cols-3">
          {(questions.length > 0
            ? questions
            : [
                "이 문제가 해결돼도 정말 원하는 결과가 나오나요?",
                "지금 원인이라고 부르는 것이 사실은 증상 아닌가요?",
                "가장 보기 싫은 데이터는 무엇인가요?",
              ]
          ).map((question) => (
            <p
              key={question}
              className="rounded-lg border border-line bg-white p-2.5 text-xs leading-relaxed text-ink-soft"
            >
              {question}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function ProblemBriefView({
  data,
  branch,
  leaf,
}: {
  data: Decomposition;
  branch: Branch | undefined;
  leaf: Branch["leaves"][number] | null;
}) {
  const candidate = data.diagnosis.likelyProblems[0];

  return (
    <div className="rounded-xl border border-line bg-[var(--surface-soft)] p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-violet">
            1 PAGE BRIEF
          </span>
          <h4 className="text-display mt-2 text-lg font-semibold text-ink">
            {candidate?.title || data.essence}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-ink-soft">
            {candidate?.why || data.frame || data.essence}
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <BriefRow label="현재 문제" body={data.diagnosis.visibleProblem || data.problem} />
          <BriefRow label="핵심 가설" body={branch?.summary || candidate?.why || data.essence} />
          <BriefRow label="근거 신호" body={leaf?.signal || branch?.check || "첫 검증 행동으로 확인이 필요합니다."} />
          <BriefRow label="다음 행동" body={data.firstStep.title} />
          <BriefRow label="지금 풀 것" body={data.diagnosis.solveNow || branch?.label || "가장 영향이 큰 가지를 먼저 좁힙니다."} />
          <BriefRow label="미룰 것" body={data.diagnosis.defer || "결정에 영향이 작은 세부 선택은 뒤로 보냅니다."} />
        </div>
      </div>
    </div>
  );
}

function StudioPoint({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-line bg-[var(--surface-soft)] p-4">
      <p className="text-display text-sm font-semibold text-ink">{title}</p>
      <p className="mt-2 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}

function BriefRow({ label, body }: { label: string; body: string }) {
  return (
    <div className="rounded-lg border border-line bg-white p-3">
      <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-ink-mute">
        {label}
      </span>
      <p className="mt-1 text-xs leading-relaxed text-ink-soft">{body}</p>
    </div>
  );
}
