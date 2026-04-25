"use client";

import {
  Background,
  BackgroundVariant,
  Controls,
  Handle,
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

const BRANCH_PALETTE = [
  { color: "#1f8aa8", soft: "rgba(31,138,168,0.10)" },
  { color: "#6a59b8", soft: "rgba(106,89,184,0.10)" },
  { color: "#b87a1f", soft: "rgba(184,122,31,0.10)" },
  { color: "#b04a64", soft: "rgba(176,74,100,0.10)" },
  { color: "#5b8a47", soft: "rgba(91,138,71,0.10)" },
] as const;

/** First character of the kind label is used as the glyph inside the chip. */
function kindGlyph(kind: string): string {
  const trimmed = (kind ?? "").trim();
  return trimmed ? Array.from(trimmed)[0] : "·";
}

const CENTER_W = 320;
const CENTER_H = 200;
const BRANCH_W = 244;
const BRANCH_H = 110;
const LEAF_W = 264;
const LEAF_H = 148; // layout spacing — cards auto-size to content (no minHeight)

const BRANCH_RADIUS = 330;
const LEAF_OFFSET = 310;

type CenterData = {
  essence: string;
  frame: string;
  framework: { name: string; why: string };
};

type BranchData = {
  branch: Branch;
  index: number;
  color: string;
  soft: string;
  isRight: boolean;
  isSelected: boolean;
  focused: boolean;
  onSelect: () => void;
};

type LeafData = {
  leaf: Leaf;
  color: string;
  soft: string;
  isRight: boolean;
  focused: boolean;
};


function leverageStyle(leverage: Leverage) {
  switch (leverage) {
    case "high":
      return { chip: "rgba(184,122,31,0.14)", chipText: "#b87a1f", glyph: "▲" };
    case "medium":
      return { chip: "rgba(31,138,168,0.12)", chipText: "#1f8aa8", glyph: "●" };
    case "low":
      return { chip: "rgba(26,29,51,0.06)", chipText: "#8e93ab", glyph: "◦" };
  }
}

/* ------------------------------------------------------------------ */
/* Custom nodes                                                        */
/* ------------------------------------------------------------------ */

function CenterNode({ data }: NodeProps) {
  const d = data as unknown as CenterData;
  return (
    <div
      className="relative animate-center-bloom"
      style={{
        width: CENTER_W,
        background: "var(--surface)",
        border: "1px solid var(--line-strong)",
        borderRadius: 24,
        boxShadow:
          "0 1px 0 rgba(26,29,51,0.04), 0 24px 60px -28px rgba(26,29,51,0.18)",
      }}
    >
      <Handle
        type="source"
        id="r"
        position={Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        id="l"
        position={Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 rounded-full"
        style={{
          background:
            "radial-gradient(closest-side, rgba(31,138,168,0.16), transparent 70%)",
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
            <span className="size-1 rounded-full bg-violet" />
            <span className="text-[10px] font-medium text-ink-soft">
              {d.framework.name}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BranchNode({ data }: NodeProps) {
  const d = data as unknown as BranchData;
  const branch = d.branch;
  return (
    <button
      type="button"
      onClick={d.onSelect}
      className="group relative animate-node-rise"
      style={{
        width: BRANCH_W,
        opacity: d.focused ? 1 : 0.4,
        transition: "opacity 220ms ease",
      }}
    >
      <Handle
        type="target"
        id="in"
        position={d.isRight ? Position.Left : Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        id="out"
        position={d.isRight ? Position.Right : Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />

      <div
        aria-hidden
        className="pointer-events-none absolute -inset-3 rounded-2xl blur-xl transition-opacity"
        style={{
          background: `radial-gradient(closest-side, ${d.soft}, transparent 70%)`,
          opacity: d.isSelected ? 1 : 0,
        }}
      />
      <div
        className="relative flex flex-col gap-2 rounded-2xl px-3.5 py-3 text-left transition-transform group-hover:-translate-y-0.5"
        style={{
          background: "var(--surface)",
          border: `1px solid ${d.isSelected ? d.color : "var(--line)"}`,
          boxShadow: d.isSelected
            ? `0 0 0 1px ${d.color}, 0 18px 40px -16px ${d.color}40`
            : "0 1px 0 rgba(26,29,51,0.03), 0 8px 24px -12px rgba(26,29,51,0.14)",
          minHeight: BRANCH_H,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="flex size-7 items-center justify-center rounded-md text-[11px] font-bold"
            style={{ background: d.soft, color: d.color }}
          >
            {kindGlyph(branch.kind)}
          </span>
          <div className="flex min-w-0 flex-col">
            <span className="text-[9px] font-medium uppercase tracking-[0.2em] text-ink-mute leading-none">
              {branchKindLabel(branch.kind)}
            </span>
            <span
              className="text-display truncate text-[14px] font-semibold leading-tight mt-0.5"
              style={{ color: d.focused ? "var(--ink)" : "var(--ink-mute)" }}
            >
              {branch.label || "…"}
            </span>
          </div>
        </div>
        {branch.summary ? (
          <p
            className="text-[11px] leading-relaxed text-ink-soft line-clamp-2"
            style={{ opacity: d.focused ? 1 : 0.55 }}
          >
            {branch.summary}
          </p>
        ) : null}
        {branch.check ? (
          <p
            className="flex gap-1 text-[10px] leading-snug text-ink-mute line-clamp-1"
            style={{ opacity: d.focused ? 1 : 0.55 }}
          >
            <span className="shrink-0 font-medium" style={{ color: d.color }}>
              점검
            </span>
            <span>{branch.check}</span>
          </p>
        ) : null}
      </div>
    </button>
  );
}

function LeafNode({ data }: NodeProps) {
  const d = data as unknown as LeafData;
  const leaf = d.leaf;
  const lev = leverageStyle(leaf.leverage);
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative animate-node-rise"
      style={{
        width: LEAF_W,
        opacity: d.focused ? 1 : 0.32,
        transition: "opacity 220ms ease",
      }}
    >
      <Handle
        type="target"
        id="in"
        position={d.isRight ? Position.Left : Position.Right}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <Handle
        type="source"
        id="out"
        position={d.isRight ? Position.Right : Position.Left}
        style={{ opacity: 0, pointerEvents: "none" }}
      />
      <div
        className="rounded-xl px-3 py-2.5 text-[12px] leading-tight transition-all"
        style={{
          background: "var(--surface)",
          border: `1px solid ${hovered ? d.color : "var(--line)"}`,
          boxShadow: hovered
            ? `0 0 0 1px ${d.color}, 0 12px 32px -12px ${d.color}55`
            : "0 1px 0 rgba(26,29,51,0.02), 0 6px 18px -10px rgba(26,29,51,0.14)",
        }}
      >
        <div className="flex items-center gap-1.5">
          <span
            className="inline-flex h-4 shrink-0 items-center gap-0.5 rounded-full px-1.5 text-[9px] font-medium"
            style={{ background: lev.chip, color: lev.chipText }}
          >
            <span className="text-[9px] leading-none">{lev.glyph}</span>
            {LEVERAGE_KO[leaf.leverage]}
          </span>
          <span className="text-display truncate font-semibold text-ink text-[13px]">
            {leaf.label || "…"}
          </span>
        </div>
        {leaf.why ? (
          <p className="mt-1.5 text-[11px] leading-relaxed text-ink-soft line-clamp-3">
            {leaf.why}
          </p>
        ) : null}
        {leaf.probe ? (
          <p className="mt-1.5 flex gap-1 text-[10px] leading-snug text-ink-mute line-clamp-2">
            <span className="shrink-0 font-medium text-cyan">진단</span>
            <span>{leaf.probe}</span>
          </p>
        ) : null}
      </div>
    </div>
  );
}

const nodeTypes = {
  center: CenterNode,
  branch: BranchNode,
  leaf: LeafNode,
};

const defaultEdgeOptions = {
  type: "default" as const,
};

/* ------------------------------------------------------------------ */
/* Graph builder                                                       */
/* ------------------------------------------------------------------ */

function buildGraph(
  data: Decomposition,
  selected: string | null,
  onSelectBranch: (id: string | null) => void
): { nodes: Node[]; edges: Edge[] } {
  const branches = data.branches ?? [];

  const nodes: Node[] = [
    {
      id: "center",
      type: "center",
      position: { x: -CENTER_W / 2, y: -CENTER_H / 2 },
      data: {
        essence: data.essence,
        frame: data.frame,
        framework: data.framework ?? { name: "", why: "" },
      } as CenterData as unknown as Record<string, unknown>,
      draggable: false,
      selectable: false,
    },
  ];
  const edges: Edge[] = [];

  // Split branches into right (even idx) / left (odd idx) sides
  const rightIdx: number[] = [];
  const leftIdx: number[] = [];
  branches.forEach((_, k) => {
    if (k % 2 === 0) rightIdx.push(k);
    else leftIdx.push(k);
  });

  const BRANCH_GAP = 28; // vertical gap between adjacent branch slots
  const LEAF_GAP = 16; // vertical gap between leaves within a slot

  // For a branch at given Y, leaves stack vertically around it. Slot height
  // is the max of branch card height and the total leaf stack height.
  function slotHeight(branch: Branch): number {
    const leaves = branch.leaves ?? [];
    if (leaves.length === 0) return BRANCH_H;
    const leafBlock =
      leaves.length * LEAF_H + (leaves.length - 1) * LEAF_GAP;
    return Math.max(BRANCH_H, leafBlock);
  }

  function placeSide(sideIdx: number[], isRight: boolean) {
    if (sideIdx.length === 0) return;

    const slots = sideIdx.map((i) => slotHeight(branches[i]));
    const totalH =
      slots.reduce((a, b) => a + b, 0) +
      (sideIdx.length - 1) * BRANCH_GAP;

    let cursor = -totalH / 2;
    sideIdx.forEach((bIdx, k) => {
      const h = slots[k];
      const branchCenterY = cursor + h / 2;
      cursor += h + BRANCH_GAP;

      const branch = branches[bIdx];
      const palette = BRANCH_PALETTE[bIdx % BRANCH_PALETTE.length];
      const isFocused = selected === null || selected === branch.id;
      const branchX = isRight ? BRANCH_RADIUS : -BRANCH_RADIUS;

      nodes.push({
        id: branch.id,
        type: "branch",
        position: {
          x: branchX - BRANCH_W / 2,
          y: branchCenterY - BRANCH_H / 2,
        },
        data: {
          branch,
          index: bIdx,
          color: palette.color,
          soft: palette.soft,
          isRight,
          isSelected: selected === branch.id,
          focused: isFocused,
          onSelect: () =>
            onSelectBranch(selected === branch.id ? null : branch.id),
        } as BranchData as unknown as Record<string, unknown>,
        draggable: true,
        selectable: false,
      });

      edges.push({
        id: `e-c-${branch.id}`,
        source: "center",
        sourceHandle: isRight ? "r" : "l",
        target: branch.id,
        targetHandle: "in",
        type: "default",
        animated: true,
        style: {
          stroke: palette.color,
          strokeWidth: isFocused ? 2.4 : 1,
          opacity: isFocused ? 1 : 0.2,
        },
      });

      // Leaves stacked vertically, centered on branchCenterY
      const leaves = branch.leaves ?? [];
      const leafBlockH =
        leaves.length === 0
          ? 0
          : leaves.length * LEAF_H + (leaves.length - 1) * LEAF_GAP;
      const leavesTop = branchCenterY - leafBlockH / 2;

      let leafCursor = leavesTop;
      leaves.forEach((leaf) => {
        const leafX = isRight
          ? branchX + LEAF_OFFSET
          : branchX - LEAF_OFFSET;
        const leafCenterY = leafCursor + LEAF_H / 2;
        leafCursor += LEAF_H + LEAF_GAP;

        nodes.push({
          id: leaf.id,
          type: "leaf",
          position: {
            x: leafX - LEAF_W / 2,
            y: leafCenterY - LEAF_H / 2,
          },
          data: {
            leaf,
            color: palette.color,
            soft: palette.soft,
            isRight,
            focused: isFocused,
          } as LeafData as unknown as Record<string, unknown>,
          draggable: true,
          selectable: false,
        });

        edges.push({
          id: `e-${branch.id}-${leaf.id}`,
          source: branch.id,
          sourceHandle: "out",
          target: leaf.id,
          targetHandle: "in",
          type: "default",
          animated: true,
          style: {
            stroke: palette.color,
            strokeWidth: 1.4,
            opacity: isFocused ? 0.65 : 0.18,
          },
        });

      });
    });
  }

  placeSide(rightIdx, true);
  placeSide(leftIdx, false);

  return { nodes, edges };
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

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

function Inner({
  data,
  selected,
  onSelectBranch,
  isStreaming,
}: Props) {
  const graphSignature = JSON.stringify({
    framework: data.framework,
    essence: data.essence,
    frame: data.frame,
    branches: data.branches,
  });
  const graphData = useMemo(() => {
    const graphOnly = JSON.parse(graphSignature) as Pick<
      Decomposition,
      "framework" | "essence" | "frame" | "branches"
    >;
    return {
      problem: "",
      framework: graphOnly.framework,
      essence: graphOnly.essence,
      frame: graphOnly.frame,
      branches: graphOnly.branches,
      diagnosis: {
        visibleProblem: "",
        likelyProblems: [],
        questions: [],
        solveNow: "",
        defer: "",
      },
      firstStep: { title: "", minutes: 5, reveals: "", narrows: "" },
      actionOptions: [],
      blockers: [],
    } satisfies Decomposition;
  }, [graphSignature]);

  const { nodes, edges } = useMemo(
    () => buildGraph(graphData, selected, onSelectBranch),
    [graphData, selected, onSelectBranch]
  );

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const flow = useReactFlow();
  const fittedNodeCountRef = useRef(0);

  // Follow only structural graph growth. Text updates and lower-panel streaming
  // should not move the canvas, but new branch/leaf nodes should stay in view.
  useEffect(() => {
    if (nodes.length <= 1) return;

    const previousCount = fittedNodeCountRef.current;
    if (nodes.length <= previousCount) {
      fittedNodeCountRef.current = nodes.length;
      return;
    }

    const id = window.setTimeout(() => {
      try {
        flow.fitView({
          padding: isStreaming ? 0.1 : 0.08,
          duration: isStreaming ? 220 : 280,
          maxZoom: 1.08,
        });
        fittedNodeCountRef.current = nodes.length;
      } catch {}
    }, isStreaming ? 80 : 30);
    return () => window.clearTimeout(id);
  }, [nodes.length, flow, isStreaming]);

  const downloadMd = useCallback(() => {
    const md = decompositionToMarkdown(data);
    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = decompositionFilename(data);
    link.click();
    URL.revokeObjectURL(url);
  }, [data]);

  const [downloading, setDownloading] = useState(false);
  const downloadPng = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      // Capture the entire viewport pane
      const el = wrapperRef.current?.querySelector(
        ".react-flow__viewport"
      ) as HTMLElement | null;
      const target = el ?? wrapperRef.current!;
      const dataUrl = await toPng(target, {
        backgroundColor: "#fbf9f3",
        pixelRatio: 2,
        cacheBust: true,
      });
      const link = document.createElement("a");
      const stamp = new Date().toISOString().slice(0, 10);
      link.href = dataUrl;
      link.download = `reframe-${stamp}.png`;
      link.click();
    } catch (err) {
      console.error(err);
    } finally {
      setDownloading(false);
    }
  }, [downloading]);

  return (
    <div className="relative">
      <div
        ref={wrapperRef}
        className="relative w-full overflow-hidden rounded-2xl border border-line bg-[var(--surface-soft)] aspect-[3/4] sm:aspect-[1400/1000] lg:aspect-[1600/1040]"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.06, maxZoom: 1.15 }}
          minZoom={0.2}
          maxZoom={2.2}
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
            size={1.4}
            color="rgba(26,29,51,0.16)"
          />
          <Controls
            showInteractive={false}
            position="bottom-left"
            style={
              {
                button: { background: "white" },
              } as React.CSSProperties
            }
          />
        </ReactFlow>
      </div>

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
          disabled={downloading}
          title="PNG로 저장"
          className="pointer-events-auto flex h-9 items-center gap-1.5 rounded-full border border-line bg-white/90 px-3 text-[11px] font-medium text-ink-soft shadow-sm backdrop-blur transition hover:border-cyan/40 hover:text-cyan disabled:opacity-50"
        >
          <span className="text-sm leading-none">↓</span>
          <span>{downloading ? "저장 중…" : "PNG"}</span>
        </button>
      </div>
    </div>
  );
}

/* React Flow CSS variable overrides for our theme */
export const REACT_FLOW_THEME_STYLE: React.CSSProperties = {
  ["--xy-background-color" as string]: "transparent",
};
