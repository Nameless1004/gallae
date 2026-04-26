/** Free-form short Korean label (2~4 chars) describing the branch's lens. */
export type BranchKind = string;

export type Leverage = "high" | "medium" | "low";

export type LeafAction = {
  id: string;
  label: string;
  how: string;
};

export type Leaf = {
  id: string;
  label: string;
  leverage: Leverage;
  /** Why this leaf matters in the user's context. */
  why: string;
  /** Concrete signal/example showing this is actually a problem. */
  signal: string;
  /** A 5-minute probe — question or micro-action. */
  probe: string;
  actions?: LeafAction[];
};

export type Branch = {
  id: string;
  label: string;
  kind: BranchKind;
  /** One-sentence hypothesis: why look here. */
  summary: string;
  /** One-sentence check: how to verify the hypothesis. */
  check: string;
  leaves: Leaf[];
};

export type FirstStep = {
  title: string;
  minutes: number;
  /** What the action reveals (info/feeling/signal). */
  reveals: string;
  /** How that result narrows the next step. */
  narrows: string;
};

export type ProblemCandidate = {
  title: string;
  why: string;
  verify: string;
};

export type Focus = {
  title: string;
  why: string;
  check: string;
};

export type ActionOption = {
  minutes: number;
  title: string;
  purpose: string;
};

export type Diagnosis = {
  visibleProblem: string;
  likelyProblems: ProblemCandidate[];
  questions: string[];
  solveNow: string;
  defer: string;
};

export type Blocker = {
  title: string;
  preempt: string;
  fallback: string;
};

export type Framework = {
  name: string;
  why: string;
};

export type Decomposition = {
  problem: string;
  framework: Framework;
  essence: string;
  frame: string;
  focus: Focus;
  diagnosis: Diagnosis;
  branches: Branch[];
  firstStep: FirstStep;
  actionOptions: ActionOption[];
  blockers: Blocker[];
};

/** Render the branch kind label as-is (model already produces a Korean tag). */
export function branchKindLabel(kind: BranchKind): string {
  return (kind ?? "").trim() || "관점";
}

export const LEVERAGE_KO: Record<Leverage, string> = {
  high: "우선",
  medium: "보조",
  low: "나중",
};
