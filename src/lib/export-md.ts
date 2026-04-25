import { LEVERAGE_KO, branchKindLabel, type Decomposition } from "./types";

/** Convert a Decomposition into a structured Markdown document. */
export function decompositionToMarkdown(data: Decomposition): string {
  const out: string[] = [];

  out.push(`# ${data.essence || "Re:Frame 분석"}`);
  out.push("");

  if (data.problem) {
    out.push(`> **문제**`);
    out.push(`> ${data.problem.replace(/\n/g, "\n> ")}`);
    out.push("");
  }

  if (data.framework?.name) {
    out.push(`**렌즈 · ${data.framework.name}**`);
    if (data.framework.why) out.push(data.framework.why);
    out.push("");
  }

  if (data.frame) {
    out.push(`*${data.frame}*`);
    out.push("");
  }

  if (
    data.diagnosis?.visibleProblem ||
    data.diagnosis?.likelyProblems.length ||
    data.diagnosis?.questions.length
  ) {
    out.push(`## 문제 진단`);
    out.push("");
    if (data.diagnosis.visibleProblem) {
      out.push(`- **겉으로 보이는 문제:** ${data.diagnosis.visibleProblem}`);
    }
    if (data.diagnosis.solveNow) {
      out.push(`- **지금 풀 것:** ${data.diagnosis.solveNow}`);
    }
    if (data.diagnosis.defer) {
      out.push(`- **미룰 것:** ${data.diagnosis.defer}`);
    }
    out.push("");

    data.diagnosis.likelyProblems.forEach((candidate) => {
      out.push(`### ${candidate.title}`);
      if (candidate.why) out.push(candidate.why);
      if (candidate.verify) out.push(`- **확인:** ${candidate.verify}`);
      out.push("");
    });

    if (data.diagnosis.questions.length > 0) {
      out.push(`### 확인 질문`);
      data.diagnosis.questions.forEach((question) => {
        out.push(`- ${question}`);
      });
      out.push("");
    }
  }

  out.push(`## 첫 한 걸음`);
  out.push(`- **행동:** ${data.firstStep.title || "—"} (${data.firstStep.minutes ?? 5}분)`);
  if (data.firstStep.reveals) out.push(`- **드러남:** ${data.firstStep.reveals}`);
  if (data.firstStep.narrows) out.push(`- **다음 한 걸음:** ${data.firstStep.narrows}`);
  if (data.actionOptions.length > 0) {
    data.actionOptions.forEach((action) => {
      out.push(
        `- **${action.minutes}분:** ${action.title}${
          action.purpose ? ` — ${action.purpose}` : ""
        }`
      );
    });
  }
  out.push("");

  out.push(`## 가지`);
  out.push("");

  data.branches.forEach((branch, bi) => {
    out.push(`### ${bi + 1}. ${branch.label} _(${branchKindLabel(branch.kind)})_`);
    if (branch.summary) {
      out.push(`**가설:** ${branch.summary}`);
    }
    if (branch.check) {
      out.push(`**점검:** ${branch.check}`);
    }
    out.push("");

    branch.leaves.forEach((leaf) => {
      out.push(`#### ${leaf.label} — *${LEVERAGE_KO[leaf.leverage]}*`);
      if (leaf.why) out.push(`- **왜:** ${leaf.why}`);
      if (leaf.signal) out.push(`- **신호:** ${leaf.signal}`);
      if (leaf.probe) out.push(`- **점검:** ${leaf.probe}`);
      if (leaf.actions?.length) {
        out.push(`- **해결 액션:**`);
        leaf.actions.forEach((action) => {
          out.push(`  - [ ] ${action.label}${action.how ? ` — ${action.how}` : ""}`);
        });
      }
      out.push("");
    });
  });

  if (data.blockers.length > 0) {
    out.push(`## 막힘 신호`);
    out.push("");
    data.blockers.forEach((b) => {
      out.push(`### ${b.title}`);
      if (b.preempt) out.push(`- **대응:** ${b.preempt}`);
      if (b.fallback) out.push(`- **대안:** ${b.fallback}`);
      out.push("");
    });
  }

  out.push("---");
  out.push(`_Re:Frame — ${new Date().toISOString().slice(0, 10)}_`);

  return out.join("\n");
}

/** Suggest a filename slug derived from the essence (or fallback). */
export function decompositionFilename(data: Decomposition): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const raw = (data.essence || data.problem || "reframe").trim();
  const slug = raw
    .replace(/[\s/\\:*?"<>|]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32)
    .replace(/^-|-$/g, "");
  return `reframe-${stamp}-${slug || "analysis"}.md`;
}
