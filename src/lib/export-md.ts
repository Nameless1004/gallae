import { LEVERAGE_KO, branchKindLabel, type Decomposition } from "./types";

/** Convert a Decomposition into a structured Markdown document. */
export function decompositionToMarkdown(data: Decomposition): string {
  const out: string[] = [];

  out.push(`# ${data.essence || "갈래 분해"}`);
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

  out.push(`## 첫 한 걸음`);
  out.push(`- **행동:** ${data.firstStep.title || "—"} (${data.firstStep.minutes ?? 5}분)`);
  if (data.firstStep.reveals) out.push(`- **드러남:** ${data.firstStep.reveals}`);
  if (data.firstStep.narrows) out.push(`- **다음 한 걸음:** ${data.firstStep.narrows}`);
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
  out.push(`_갈래 · GALLAE — ${new Date().toISOString().slice(0, 10)}_`);

  return out.join("\n");
}

/** Suggest a filename slug derived from the essence (or fallback). */
export function decompositionFilename(data: Decomposition): string {
  const stamp = new Date().toISOString().slice(0, 10);
  const raw = (data.essence || data.problem || "gallae").trim();
  const slug = raw
    .replace(/[\s/\\:*?"<>|]+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 32)
    .replace(/^-|-$/g, "");
  return `gallae-${stamp}-${slug || "decomposition"}.md`;
}
