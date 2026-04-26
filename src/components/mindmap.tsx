"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { toPng } from "html-to-image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  decompositionFilename,
  decompositionToMarkdown,
} from "@/lib/export-md";
import {
  branchKindLabel,
  LEVERAGE_KO,
  type Branch,
  type Decomposition,
  type Leaf,
  type Leverage,
} from "@/lib/types";

// ─── Palette ──────────────────────────────────────────────────────────────────

const PALETTE = [
  { color: "#1f8aa8", soft: "rgba(31,138,168,0.11)" },
  { color: "#6a59b8", soft: "rgba(106,89,184,0.11)" },
  { color: "#b87a1f", soft: "rgba(184,122,31,0.11)" },
  { color: "#b04a64", soft: "rgba(176,74,100,0.11)" },
  { color: "#5b8a47", soft: "rgba(91,138,71,0.11)" },
] as const;

// Quadrant mode uses a fixed 4-color mapping
const Q_PALETTE = [PALETTE[0], PALETTE[2], PALETTE[4], PALETTE[3]] as const;

// ─── Framework detection ──────────────────────────────────────────────────────

type RenderMode = "mindmap" | "quadrant" | "process";

const QUADRANT_KW = ["swot", "risk matrix", "decision matrix", "impact-effort", "assumption mapping", "감정분해", "ice/rice", "eisenhower"];
const PROCESS_KW  = ["ooda", "scqa", "user journey", "lean experiment", "6 hats", "debugging", "divide", "whys", "root cause"];

function detectMode(name: string | undefined): RenderMode {
  const n = (name ?? "").toLowerCase();
  if (QUADRANT_KW.some(k => n.includes(k))) return "quadrant";
  if (PROCESS_KW.some(k => n.includes(k)))  return "process";
  return "mindmap";
}

type QuadrantConfig = { labels: [string, string, string, string] };

function quadrantConfig(name: string): QuadrantConfig {
  const n = name.toLowerCase();
  if (n.includes("swot"))          return { labels: ["강점 (S)", "약점 (W)", "기회 (O)", "위협 (T)"] };
  if (n.includes("eisenhower"))    return { labels: ["긴급·중요", "긴급·덜중요", "덜긴급·중요", "덜긴급·덜중요"] };
  if (n.includes("impact-effort")) return { labels: ["Quick Win", "Major Project", "Fill-in", "Hard Slog"] };
  if (n.includes("risk"))          return { labels: ["고위험·고확률", "고위험·저확률", "저위험·고확률", "저위험·저확률"] };
  if (n.includes("decision"))      return { labels: ["최선안", "차선안", "보류안", "제외안"] };
  if (n.includes("assumption"))    return { labels: ["중요·불확실", "중요·확실", "덜중요·불확실", "덜중요·확실"] };
  if (n.includes("감정분해"))       return { labels: ["긍정·내부", "긍정·외부", "부정·내부", "부정·외부"] };
  return { labels: ["영역 A", "영역 B", "영역 C", "영역 D"] };
}

// ─── Leverage helpers ─────────────────────────────────────────────────────────

function levStyle(lev: Leverage) {
  switch (lev) {
    case "high":   return { bg: "rgba(91,138,71,0.13)",   text: "#3a6229", dot: "#5b8a47" };
    case "medium": return { bg: "rgba(184,122,31,0.11)",  text: "#7a5010", dot: "#b87a1f" };
    case "low":    return { bg: "rgba(26,29,51,0.06)",    text: "#8e93ab", dot: "#bbb"   };
  }
}

// ─── Node dimensions ──────────────────────────────────────────────────────────

const CW = 296;  // center width
const CH = 180;  // center height (estimate)
const BW = 238;  // branch width
const BH = 98;   // branch min height
const LW = 216;  // leaf width
const LH = 108;  // leaf min height

const B_RADIUS  = 316;  // distance from center to branch
const L_OFFSET  = 282;  // distance from branch to leaf (per side)
const B_GAP     = 38;   // vertical gap between branch slots
const L_GAP     = 16;   // vertical gap between leaves

// ─── Node data types ──────────────────────────────────────────────────────────

type CenterData = {
  essence: string;
  frame: string;
  framework: { name: string; why: string };
  streaming?: boolean;
};

type BranchData = {
  branch: Branch;
  index: number;
  color: string;
  soft: string;
  isRight: boolean;
  isSelected: boolean;
  focused: boolean;
  height: number;
  mode: RenderMode;
  onSelect: () => void;
};

type LeafData = {
  leaf: Leaf;
  color: string;
  inHandle: Position;
  focused: boolean;
  height: number;
};

type QuadrantData = {
  essence: string;
  frame: string;
  framework: string;
  branches: Branch[];
  config: QuadrantConfig;
};

// ─── CenterNode ───────────────────────────────────────────────────────────────

function CenterNode({ data }: NodeProps) {
  const d = data as unknown as CenterData;
  return (
    <div
      className="relative animate-center-bloom"
      style={{
        width: CW,
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(26,29,51,0.04), 0 24px 60px -28px rgba(26,29,51,0.18)",
      }}
    >
      <Handle type="source" id="r" position={Position.Right} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" id="l" position={Position.Left}  style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" id="b" position={Position.Bottom} style={{ opacity: 0, pointerEvents: "none" }} />

      {/* Ambient aura */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-full"
        style={{
          background: "radial-gradient(closest-side, rgba(31,138,168,0.16), transparent 70%)",
          zIndex: -1,
        }}
      />

      <div className="flex flex-col items-center gap-2 px-7 py-5">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-cyan">
          <span className="size-1.5 rounded-full bg-cyan animate-blink" />
          본질 · ESSENCE
        </div>

        <p className="text-display text-center text-[17px] font-semibold leading-snug text-ink">
          {d.essence || "…"}
        </p>

        {d.frame ? (
          <>
            <div className="h-px w-12 divider-soft" />
            <p className="text-center text-[11px] leading-relaxed text-ink-soft">
              {d.frame}
            </p>
          </>
        ) : null}

        {d.framework?.name ? (
          <div className="mt-1 inline-flex items-center gap-1.5 rounded-full border border-line bg-[var(--surface-warm)] px-2.5 py-1">
            {d.streaming ? (
              <span className="size-1 rounded-full bg-cyan animate-blink" />
            ) : (
              <span className="size-1 rounded-full bg-violet" />
            )}
            <span className="text-[10px] font-medium text-ink-soft">
              {d.framework.name}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── BranchNode ───────────────────────────────────────────────────────────────

function BranchNode({ data }: NodeProps) {
  const d = data as unknown as BranchData;
  const { branch, color, soft, isRight, isSelected, focused, height, mode } = d;

  /* Handle positions vary by layout mode */
  const inPos  = mode === "process" ? Position.Left  : isRight ? Position.Left  : Position.Right;
  const outPos = mode === "process" ? Position.Bottom : isRight ? Position.Right : Position.Left;
  const seqPos = mode === "process" ? Position.Right  : isRight ? Position.Right : Position.Left;

  const kindChar = (branch.kind ?? "").trim()
    ? Array.from(branch.kind.trim())[0]
    : "·";

  return (
    <button
      type="button"
      onClick={d.onSelect}
      className="group animate-node-rise"
      style={{
        width: BW,
        opacity: focused ? 1 : 0.28,
        transition: "opacity 200ms ease",
        display: "block",
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        position: "relative",
      }}
    >
      <Handle type="target" id="in"  position={inPos}  style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" id="out" position={outPos} style={{ opacity: 0, pointerEvents: "none" }} />
      <Handle type="source" id="seq" position={seqPos} style={{ opacity: 0, pointerEvents: "none" }} />

      {/* Selection aura */}
      {isSelected && (
        <div
          aria-hidden
          style={{
            position: "absolute", inset: -10,
            borderRadius: 22,
            background: `radial-gradient(ellipse, ${soft} 0%, transparent 72%)`,
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      )}

      <div
        className="group-hover:-translate-y-px"
        style={{
          background: isSelected ? "#ffffff" : "var(--surface, #fdfcf8)",
          borderRadius: 14,
          padding: "12px 13px 11px",
          border: `1.5px solid ${isSelected ? color : "rgba(26,29,51,0.09)"}`,
          boxShadow: isSelected
            ? `0 0 0 1px ${color}38, 0 14px 36px -14px ${color}55`
            : "0 1px 0 rgba(26,29,51,0.03), 0 5px 18px -9px rgba(26,29,51,0.13)",
          minHeight: height,
          textAlign: "left",
          transition: "border-color 200ms, box-shadow 200ms, transform 140ms",
        }}
      >
        {/* Kind chip + label row */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
          <span
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, width: 26, height: 26,
              borderRadius: 7, background: soft, color,
              fontSize: 13, fontWeight: 700,
            }}
          >
            {kindChar}
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div
              style={{
                fontSize: 9, fontWeight: 600, letterSpacing: "0.17em",
                color: "var(--ink-mute, #8e93ab)",
                textTransform: "uppercase", marginBottom: 2, lineHeight: 1,
              }}
            >
              {branchKindLabel(branch.kind)}
            </div>
            <div
              style={{
                fontSize: 13.5, fontWeight: 700, lineHeight: 1.3,
                color: focused ? "var(--ink, #1a1d33)" : "var(--ink-soft, #5a5f7a)",
                wordBreak: "keep-all", overflowWrap: "anywhere",
              }}
            >
              {branch.label || "…"}
            </div>
          </div>
        </div>

        {/* Summary */}
        {branch.summary ? (
          <p
            style={{
              fontSize: 11, color: "var(--ink-soft, #5a5f7a)",
              lineHeight: 1.56, margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {branch.summary}
          </p>
        ) : null}

        {/* Leverage dots */}
        {branch.leaves?.length > 0 ? (
          <div style={{ display: "flex", gap: 4, marginTop: 9, alignItems: "center" }}>
            {branch.leaves.slice(0, 6).map((lf, i) => {
              const ls = levStyle(lf.leverage);
              return (
                <div
                  key={i}
                  title={lf.label}
                  style={{
                    width: 7, height: 7, borderRadius: "50%", background: ls.dot,
                    opacity: lf.leverage === "high" ? 1 : lf.leverage === "medium" ? 0.6 : 0.3,
                  }}
                />
              );
            })}
            {branch.leaves.length > 6 ? (
              <span style={{ fontSize: 9, color: "var(--ink-mute, #8e93ab)", marginLeft: 2 }}>
                +{branch.leaves.length - 6}
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </button>
  );
}

// ─── LeafNode ─────────────────────────────────────────────────────────────────

function LeafNode({ data }: NodeProps) {
  const d = data as unknown as LeafData;
  const { leaf, color, inHandle, focused, height } = d;
  const ls = levStyle(leaf.leverage);
  const [hov, setHov] = useState(false);

  return (
    <div
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      className="animate-node-rise"
      style={{
        width: LW,
        opacity: focused ? 1 : 0.22,
        transition: "opacity 200ms ease",
      }}
    >
      <Handle type="target" id="in" position={inHandle} style={{ opacity: 0, pointerEvents: "none" }} />

      <div
        style={{
          background: "var(--surface, #fdfcf8)",
          borderRadius: 11,
          padding: "10px 12px",
          border: `1px solid ${hov ? color + "70" : "rgba(26,29,51,0.08)"}`,
          boxShadow: hov
            ? `0 0 0 1px ${color}35, 0 8px 22px -10px ${color}45`
            : "0 1px 0 rgba(26,29,51,0.02), 0 4px 14px -8px rgba(26,29,51,0.10)",
          minHeight: height,
          transition: "all 170ms ease",
        }}
      >
        {/* Leverage badge + label */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 5, marginBottom: 5 }}>
          <span
            style={{
              fontSize: 8, fontWeight: 700, padding: "2px 5px",
              borderRadius: 4, background: ls.bg, color: ls.text,
              flexShrink: 0, marginTop: 1, letterSpacing: "0.02em",
            }}
          >
            {LEVERAGE_KO[leaf.leverage]}
          </span>
          <span
            style={{
              fontSize: 12.5, fontWeight: 650, lineHeight: 1.35,
              color: "var(--ink, #1a1d33)", wordBreak: "keep-all",
            }}
          >
            {leaf.label || "…"}
          </span>
        </div>

        {/* Why */}
        {leaf.why ? (
          <p
            style={{
              fontSize: 10.5, color: "var(--ink-soft, #5a5f7a)",
              lineHeight: 1.52, margin: "0 0 4px",
              display: "-webkit-box",
              WebkitLineClamp: 3,
              WebkitBoxOrient: "vertical" as const,
              overflow: "hidden",
            }}
          >
            {leaf.why}
          </p>
        ) : null}

        {/* Probe */}
        {leaf.probe ? (
          <div style={{ display: "flex", gap: 4, fontSize: 10, lineHeight: 1.42, color: "var(--ink-mute, #8e93ab)" }}>
            <span style={{ color: "#1f8aa8", fontWeight: 600, flexShrink: 0 }}>확인</span>
            <span
              style={{
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical" as const,
                overflow: "hidden",
              }}
            >
              {leaf.probe}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ─── QuadrantNode ─────────────────────────────────────────────────────────────

const QW = 776;    // quadrant total width
const CELL_H = 236; // each cell min-height

function QuadrantNode({ data }: NodeProps) {
  const d = data as unknown as QuadrantData;
  const { labels } = d.config;
  const branches = d.branches.slice(0, 4);

  return (
    <div
      className="animate-center-bloom"
      style={{
        width: QW,
        background: "#fff",
        borderRadius: 18,
        overflow: "hidden",
        boxShadow: "0 0 0 1px rgba(26,29,51,0.09), 0 12px 50px rgba(0,0,0,0.14)",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--line)",
          padding: "16px 20px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        {d.framework ? (
          <div
            className="inline-flex items-center gap-1.5 rounded-full border border-line bg-[var(--surface-warm)] px-2.5 py-1"
          >
            <span className="size-1 rounded-full bg-violet" />
            <span className="text-[10px] font-medium text-ink-soft">{d.framework}</span>
          </div>
        ) : null}
        <div
          style={{
            fontSize: 14, fontWeight: 700,
            color: "var(--ink)",
            lineHeight: 1.4, wordBreak: "keep-all",
            flex: 1,
          }}
        >
          {d.essence || d.frame || ""}
        </div>
      </div>

      {/* 2 × 2 Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 1,
          background: "rgba(26,29,51,0.08)",
        }}
      >
        {([0, 1, 2, 3] as const).map(i => {
          const branch = branches[i];
          const pal = Q_PALETTE[i];
          const isShaded = i === 1 || i === 2;

          return (
            <div
              key={i}
              style={{
                background: isShaded ? "#f7f5f0" : "#faf8f3",
                padding: "16px 18px",
                minHeight: CELL_H,
              }}
            >
              {/* Quadrant label */}
              <div
                style={{
                  display: "inline-flex", marginBottom: 9,
                  fontSize: 9, fontWeight: 700, letterSpacing: "0.08em",
                  color: pal.color, background: pal.soft,
                  padding: "3px 8px", borderRadius: 5,
                  textTransform: "uppercase",
                }}
              >
                {labels[i]}
              </div>

              {branch ? (
                <>
                  <div
                    style={{
                      fontSize: 13, fontWeight: 700,
                      color: "#1a1d33", lineHeight: 1.3,
                      marginBottom: 4, wordBreak: "keep-all",
                    }}
                  >
                    {branch.label}
                  </div>
                  {branch.summary ? (
                    <div
                      style={{
                        fontSize: 11, color: "#5a5f7a",
                        lineHeight: 1.5, marginBottom: 10,
                      }}
                    >
                      {branch.summary}
                    </div>
                  ) : null}

                  {/* Leaf items */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    {branch.leaves.slice(0, 4).map((lf, j) => {
                      const ls = levStyle(lf.leverage);
                      return (
                        <div
                          key={j}
                          style={{
                            display: "flex", alignItems: "flex-start", gap: 7,
                            padding: "5px 8px", borderRadius: 7,
                            background: lf.leverage === "high" ? ls.bg : "rgba(0,0,0,0.024)",
                            border: `1px solid ${lf.leverage === "high" ? ls.dot + "28" : "transparent"}`,
                          }}
                        >
                          <div
                            style={{
                              width: 5, height: 5, borderRadius: "50%",
                              background: ls.dot, flexShrink: 0,
                              marginTop: 4,
                              opacity: lf.leverage === "high" ? 1 : 0.45,
                            }}
                          />
                          <div>
                            <div
                              style={{
                                fontSize: 11, fontWeight: 600,
                                color: "#2a2d40", lineHeight: 1.3, wordBreak: "keep-all",
                              }}
                            >
                              {lf.label}
                            </div>
                            {lf.why ? (
                              <div
                                style={{
                                  fontSize: 10, color: "#888",
                                  marginTop: 2, lineHeight: 1.4,
                                }}
                              >
                                {lf.why}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      );
                    })}
                    {branch.leaves.length > 4 ? (
                      <div style={{ fontSize: 10, color: "#bbb", paddingLeft: 12, marginTop: 1 }}>
                        +{branch.leaves.length - 4} 항목 더 있음
                      </div>
                    ) : null}
                  </div>
                </>
              ) : (
                <div style={{ color: "#ccc", fontSize: 13 }}>—</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Overflow branches (5+) */}
      {d.branches.length > 4 ? (
        <div
          style={{
            padding: "10px 16px",
            background: "#f4f2eb",
            borderTop: "1px solid rgba(26,29,51,0.07)",
            display: "flex", gap: 6, flexWrap: "wrap",
          }}
        >
          {d.branches.slice(4).map((br, i) => (
            <div
              key={i}
              style={{
                fontSize: 11, padding: "3px 10px", borderRadius: 6,
                background: "#fff", border: "1px solid rgba(26,29,51,0.10)",
                color: "#5a5f7a",
              }}
            >
              {br.label}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Node types registry ──────────────────────────────────────────────────────

const nodeTypes = {
  center:   CenterNode,
  branch:   BranchNode,
  leaf:     LeafNode,
  quadrant: QuadrantNode,
};

const defaultEdgeOptions = {
  type: "smoothstep" as const,
  pathOptions: { borderRadius: 18 },
};

// ─── Height estimation ────────────────────────────────────────────────────────

function estLines(text: string | undefined, cpl: number, max: number) {
  const len = (text ?? "").trim().length;
  return len === 0 ? 0 : Math.max(1, Math.min(max, Math.ceil(len / cpl)));
}

function bHeight(b: Branch): number {
  return Math.max(BH, 54 + estLines(b.label, 13, 2) * 18 + estLines(b.summary, 28, 2) * 16);
}

function lHeight(l: Leaf): number {
  return Math.max(LH, 34 + estLines(l.label, 17, 1) * 18 + estLines(l.why, 27, 3) * 15 + estLines(l.probe, 30, 2) * 14);
}

// ─── Layout: Mindmap ──────────────────────────────────────────────────────────

function buildMindmap(
  data: Decomposition,
  selected: string | null,
  onSelect: (id: string | null) => void,
): { nodes: Node[]; edges: Edge[] } {
  const branches = data.branches ?? [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  nodes.push({
    id: "center",
    type: "center",
    position: { x: -CW / 2, y: -CH / 2 },
    data: {
      essence: data.essence,
      frame: data.frame,
      framework: data.framework ?? { name: "", why: "" },
    } as CenterData as unknown as Record<string, unknown>,
    draggable: false,
    selectable: false,
  });

  function slotH(b: Branch) {
    const leaves = b.leaves ?? [];
    const bh = bHeight(b);
    if (!leaves.length) return bh;
    const lBlock = leaves.reduce((s, l) => s + lHeight(l), 0) + (leaves.length - 1) * L_GAP;
    return Math.max(bh, lBlock);
  }

  const rightIdx: number[] = [];
  const leftIdx: number[] = [];
  branches.forEach((_, k) => (k % 2 === 0 ? rightIdx : leftIdx).push(k));

  function placeSide(sideIdx: number[], isRight: boolean) {
    if (!sideIdx.length) return;
    const slots = sideIdx.map(i => slotH(branches[i]));
    const totalH = slots.reduce((a, b) => a + b, 0) + (sideIdx.length - 1) * B_GAP;
    let cur = -totalH / 2;

    sideIdx.forEach((bIdx, k) => {
      const h = slots[k];
      const cy = cur + h / 2;
      cur += h + B_GAP;

      const branch = branches[bIdx];
      const bh = bHeight(branch);
      const pal = PALETTE[bIdx % PALETTE.length];
      const focused = selected === null || selected === branch.id;
      const bx = isRight ? B_RADIUS : -B_RADIUS;

      nodes.push({
        id: branch.id,
        type: "branch",
        position: { x: bx - BW / 2, y: cy - bh / 2 },
        data: {
          branch, index: bIdx,
          color: pal.color, soft: pal.soft,
          isRight, isSelected: selected === branch.id,
          focused, height: bh, mode: "mindmap",
          onSelect: () => onSelect(selected === branch.id ? null : branch.id),
        } as BranchData as unknown as Record<string, unknown>,
        draggable: false, selectable: false,
      });

      edges.push({
        id: `ec-${branch.id}`,
        source: "center",
        sourceHandle: isRight ? "r" : "l",
        target: branch.id,
        targetHandle: "in",
        type: "smoothstep",
        animated: focused && selected === null,
        style: {
          stroke: pal.color,
          strokeWidth: focused ? 2.2 : 0.8,
          opacity: focused ? 0.88 : 0.12,
        },
      });

      const leaves = branch.leaves ?? [];
      const lBlock = leaves.length
        ? leaves.reduce((s, l) => s + lHeight(l), 0) + (leaves.length - 1) * L_GAP
        : 0;
      let lCur = cy - lBlock / 2;

      leaves.forEach(leaf => {
        const lh = lHeight(leaf);
        const lx = isRight ? bx + L_OFFSET : bx - L_OFFSET;
        const lcy = lCur + lh / 2;
        lCur += lh + L_GAP;

        nodes.push({
          id: leaf.id,
          type: "leaf",
          position: { x: lx - LW / 2, y: lcy - lh / 2 },
          data: {
            leaf, color: pal.color, soft: pal.soft,
            isRight,
            inHandle: isRight ? Position.Left : Position.Right,
            focused, height: lh,
          } as LeafData as unknown as Record<string, unknown>,
          draggable: false, selectable: false,
        });

        edges.push({
          id: `eb-${branch.id}-${leaf.id}`,
          source: branch.id,
          sourceHandle: "out",
          target: leaf.id,
          targetHandle: "in",
          type: "smoothstep",
          style: {
            stroke: pal.color,
            strokeWidth: 1.2,
            opacity: focused ? 0.52 : 0.09,
          },
        });
      });
    });
  }

  placeSide(rightIdx, true);
  placeSide(leftIdx, false);
  return { nodes, edges };
}

// ─── Layout: Quadrant ─────────────────────────────────────────────────────────

function buildQuadrant(data: Decomposition): { nodes: Node[]; edges: Edge[] } {
  const cfg = quadrantConfig(data.framework?.name ?? "");
  return {
    nodes: [
      {
        id: "quadrant",
        type: "quadrant",
        position: { x: -QW / 2, y: -(CELL_H + 80) },
        data: {
          essence: data.essence,
          frame: data.frame,
          framework: data.framework?.name ?? "",
          branches: data.branches,
          config: cfg,
        } as QuadrantData as unknown as Record<string, unknown>,
        draggable: false, selectable: false,
      },
    ],
    edges: [],
  };
}

// ─── Layout: Process ──────────────────────────────────────────────────────────

const PS_W = 222;   // process step card width
const PS_GAP = 64;  // horizontal gap between steps

function buildProcess(
  data: Decomposition,
  selected: string | null,
  onSelect: (id: string | null) => void,
): { nodes: Node[]; edges: Edge[] } {
  const branches = data.branches ?? [];
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const totalW = branches.length * (PS_W + PS_GAP) - PS_GAP;
  const startX = -totalW / 2;

  /* Center context node above the steps */
  nodes.push({
    id: "center",
    type: "center",
    position: { x: -CW / 2, y: -180 },
    data: {
      essence: data.essence,
      frame: data.frame,
      framework: data.framework ?? { name: "", why: "" },
    } as CenterData as unknown as Record<string, unknown>,
    draggable: false, selectable: false,
  });

  const LEAF_V_GAP = 14;

  branches.forEach((branch, i) => {
    const x = startX + i * (PS_W + PS_GAP);
    const pal = PALETTE[i % PALETTE.length];
    const focused = selected === null || selected === branch.id;
    const bh = bHeight(branch);

    /* Reuse BranchNode with process mode */
    nodes.push({
      id: branch.id,
      type: "branch",
      position: { x, y: 60 },
      data: {
        branch, index: i,
        color: pal.color, soft: pal.soft,
        isRight: true,
        isSelected: selected === branch.id,
        focused, height: bh, mode: "process",
        onSelect: () => onSelect(selected === branch.id ? null : branch.id),
      } as BranchData as unknown as Record<string, unknown>,
      draggable: false, selectable: false,
    });

    /* Leaves hanging below each step */
    const leaves = branch.leaves ?? [];
    let leafY = 60 + bh + 18;
    leaves.forEach(leaf => {
      const lh = lHeight(leaf);
      const lx = x + (PS_W - LW) / 2;

      nodes.push({
        id: leaf.id,
        type: "leaf",
        position: { x: lx, y: leafY },
        data: {
          leaf, color: pal.color, soft: pal.soft,
          isRight: true,
          inHandle: Position.Top,
          focused, height: lh,
        } as LeafData as unknown as Record<string, unknown>,
        draggable: false, selectable: false,
      });

      edges.push({
        id: `el-${branch.id}-${leaf.id}`,
        source: branch.id,
        sourceHandle: "out",
        target: leaf.id,
        targetHandle: "in",
        type: "smoothstep",
        style: {
          stroke: pal.color, strokeWidth: 1.2,
          opacity: focused ? 0.45 : 0.09,
        },
      });

      leafY += lh + LEAF_V_GAP;
    });

    /* Horizontal arrows between sequential steps */
    if (i > 0) {
      const pp = PALETTE[i % PALETTE.length];
      edges.push({
        id: `es-${i - 1}-${i}`,
        source: branches[i - 1].id,
        sourceHandle: "seq",
        target: branch.id,
        targetHandle: "in",
        type: "smoothstep",
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: pp.color,
          width: 13,
          height: 13,
        },
        style: { stroke: pp.color, strokeWidth: 2.2, opacity: 0.58 },
      });
    }
  });

  return { nodes, edges };
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────

function buildGraph(
  data: Decomposition,
  selected: string | null,
  onSelect: (id: string | null) => void,
): { nodes: Node[]; edges: Edge[]; mode: RenderMode } {
  const mode = detectMode(data.framework?.name);
  const result =
    mode === "quadrant" ? buildQuadrant(data) :
    mode === "process"  ? buildProcess(data, selected, onSelect) :
                          buildMindmap(data, selected, onSelect);
  return { ...result, mode };
}

// ─── Component ────────────────────────────────────────────────────────────────

type Props = {
  data: Decomposition;
  selected: string | null;
  onSelectBranch: (id: string | null) => void;
  isStreaming?: boolean;
};

export function MindMap(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}

function Inner({ data, selected, onSelectBranch, isStreaming }: Props) {
  /* Serialize only graph-relevant fields to detect structural changes */
  const sig = JSON.stringify({
    framework: data.framework,
    essence: data.essence,
    frame: data.frame,
    branches: data.branches,
  });

  const graphData = useMemo<Decomposition>(() => {
    const g = JSON.parse(sig) as Pick<Decomposition, "framework" | "essence" | "frame" | "branches">;
    return {
      problem: "",
      framework: g.framework,
      essence: g.essence,
      frame: g.frame,
      branches: g.branches,
      focus: { title: "", why: "", check: "" },
      diagnosis: { visibleProblem: "", likelyProblems: [], questions: [], solveNow: "", defer: "" },
      firstStep: { title: "", minutes: 5, reveals: "", narrows: "" },
      actionOptions: [],
      blockers: [],
    };
  }, [sig]);

  const { nodes, edges } = useMemo(
    () => buildGraph(graphData, selected, onSelectBranch),
    [graphData, selected, onSelectBranch],
  );

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const flow = useReactFlow();
  const fittedRef = useRef(0);

  /* fitView only when new structural nodes arrive (streaming growth) */
  useEffect(() => {
    if (nodes.length <= 1) return;
    if (nodes.length <= fittedRef.current) {
      fittedRef.current = nodes.length;
      return;
    }
    const id = window.setTimeout(() => {
      try {
        flow.fitView({
          padding: isStreaming ? 0.11 : 0.09,
          duration: isStreaming ? 210 : 270,
          maxZoom: 1.12,
        });
        fittedRef.current = nodes.length;
      } catch { /* viewport not ready */ }
    }, isStreaming ? 75 : 28);
    return () => window.clearTimeout(id);
  }, [nodes.length, flow, isStreaming]);

  /* ── Exports ── */

  const downloadMd = useCallback(() => {
    const md = decompositionToMarkdown(data);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = Object.assign(document.createElement("a"), { href: url, download: decompositionFilename(data) });
    a.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const [dlPng, setDlPng] = useState(false);
  const downloadPng = useCallback(async () => {
    if (dlPng) return;
    setDlPng(true);
    try {
      const el = wrapRef.current?.querySelector(".react-flow__viewport") as HTMLElement | null;
      const url = await toPng(el ?? wrapRef.current!, {
        backgroundColor: "#fbf9f3",
        pixelRatio: 2,
        cacheBust: true,
      });
      const a = Object.assign(document.createElement("a"), {
        href: url,
        download: `reframe-${new Date().toISOString().slice(0, 10)}.png`,
      });
      a.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDlPng(false);
    }
  }, [dlPng]);

  return (
    <div className="relative">
      <div
        ref={wrapRef}
        className="relative w-full overflow-hidden rounded-2xl border border-line bg-[var(--surface-soft)] aspect-[3/4] sm:aspect-[1400/1000] lg:aspect-[1600/1040]"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.09, maxZoom: 1.12 }}
          minZoom={0.14}
          maxZoom={2.5}
          panOnScroll={false}
          zoomOnScroll
          proOptions={{ hideAttribution: true }}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elevateNodesOnSelect={false}
          deleteKeyCode={null}
        >
          <Background
            variant={BackgroundVariant.Dots}
            gap={24}
            size={1.3}
            color="rgba(26,29,51,0.12)"
          />
          <Controls showInteractive={false} position="bottom-left" />
        </ReactFlow>
      </div>

      {/* Toolbar overlay */}
      <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-end gap-2 px-3 sm:bottom-4 sm:px-4">
        {isStreaming ? (
          <div className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 py-1.5 text-[10px] text-ink-soft shadow-sm backdrop-blur">
            <span className="relative flex size-2">
              <span className="absolute inset-0 rounded-full bg-cyan opacity-60 animate-ping" />
              <span className="relative size-2 rounded-full bg-cyan" />
            </span>
            실시간 생성 중…
          </div>
        ) : null}
        <button
          type="button"
          onClick={downloadMd}
          title="Markdown으로 저장"
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 text-[11px] font-medium text-ink-soft shadow-sm backdrop-blur transition hover:border-violet/40 hover:text-violet"
        >
          <span className="text-sm leading-none">↓</span>
          <span>MD</span>
        </button>
        <button
          type="button"
          onClick={downloadPng}
          disabled={dlPng}
          title="PNG로 저장"
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 text-[11px] font-medium text-ink-soft shadow-sm backdrop-blur transition hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
        >
          <span className="text-sm leading-none">↓</span>
          <span>{dlPng ? "저장 중…" : "PNG"}</span>
        </button>
      </div>
    </div>
  );
}

export const REACT_FLOW_THEME_STYLE: React.CSSProperties = {
  ["--xy-background-color" as string]: "transparent",
};
