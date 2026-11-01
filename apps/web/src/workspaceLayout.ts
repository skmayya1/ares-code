export type SplitDirection = "horizontal" | "vertical";
export type PaneDirection = "left" | "right" | "up" | "down";

export type WorkspaceLayout =
  | { type: "pane"; id: string; surfaceIds: string[]; activeSurfaceId: string | null }
  | {
      type: "split";
      id: string;
      direction: SplitDirection;
      ratio: number;
      first: WorkspaceLayout;
      second: WorkspaceLayout;
    };
export type WorkspacePane = Extract<WorkspaceLayout, { type: "pane" }>;

export function workspacePanes(layout: WorkspaceLayout): WorkspacePane[] {
  if (layout.type === "pane") return [layout];
  return [...workspacePanes(layout.first), ...workspacePanes(layout.second)];
}

export function mapWorkspaceLayout(
  layout: WorkspaceLayout,
  update: (node: WorkspaceLayout) => WorkspaceLayout,
): WorkspaceLayout {
  if (layout.type === "pane") return update(layout);
  return update({
    ...layout,
    first: mapWorkspaceLayout(layout.first, update),
    second: mapWorkspaceLayout(layout.second, update),
  });
}

export function removeWorkspacePane(layout: WorkspaceLayout, paneId: string): WorkspaceLayout {
  if (layout.type === "pane") return layout;
  if (layout.first.type === "pane" && layout.first.id === paneId) return layout.second;
  if (layout.second.type === "pane" && layout.second.id === paneId) return layout.first;
  return {
    ...layout,
    first: removeWorkspacePane(layout.first, paneId),
    second: removeWorkspacePane(layout.second, paneId),
  };
}

// Persisted trees are bounded and repaired before recursion or rendering.
export function restoreWorkspaceLayout(
  value: unknown,
  surfaceIds: readonly string[],
  activeSurfaceId: string | null,
  focusedPaneId?: string,
): { layout: WorkspaceLayout; focusedPaneId: string; activeSurfaceId: string | null } {
  const validSurfaces = new Set(surfaceIds);
  const assigned = new Set<string>();
  const nodeIds = new Set<string>();
  const parse = (raw: unknown, depth: number): WorkspaceLayout | null => {
    if (!raw || typeof raw !== "object" || depth > 12) return null;
    if (!("id" in raw) || typeof raw.id !== "string" || nodeIds.has(raw.id)) return null;
    nodeIds.add(raw.id);
    if (
      "type" in raw &&
      raw.type === "pane" &&
      "surfaceIds" in raw &&
      Array.isArray(raw.surfaceIds)
    ) {
      const ids = raw.surfaceIds.filter((id): id is string => {
        if (typeof id !== "string" || !validSurfaces.has(id) || assigned.has(id)) return false;
        assigned.add(id);
        return true;
      });
      let selected = ids[0] ?? null;
      if (
        "activeSurfaceId" in raw &&
        typeof raw.activeSurfaceId === "string" &&
        ids.includes(raw.activeSurfaceId)
      ) {
        selected = raw.activeSurfaceId;
      }
      return { type: "pane", id: raw.id, surfaceIds: ids, activeSurfaceId: selected };
    }
    if (
      !("type" in raw) ||
      raw.type !== "split" ||
      !("direction" in raw) ||
      (raw.direction !== "horizontal" && raw.direction !== "vertical") ||
      !("first" in raw) ||
      !("second" in raw)
    )
      return null;
    const first = parse(raw.first, depth + 1);
    const second = parse(raw.second, depth + 1);
    if (!first) return second;
    if (!second) return first;
    let ratio = 50;
    if ("ratio" in raw && typeof raw.ratio === "number" && Number.isFinite(raw.ratio)) {
      ratio = Math.max(0, Math.min(100, raw.ratio));
    }
    return { type: "split", id: raw.id, direction: raw.direction, ratio, first, second };
  };
  let layout = parse(value, 0);
  if (!layout) {
    layout = { type: "pane", id: "main", surfaceIds: [], activeSurfaceId: null };
    assigned.clear();
  }
  const panes = workspacePanes(layout);
  const focused = panes.find((pane) => pane.id === focusedPaneId) ?? panes[0]!;
  const unassigned = surfaceIds.filter((id) => !assigned.has(id));
  layout = mapWorkspaceLayout(layout, (node) => {
    if (node.type !== "pane") return node;
    const ids = node.id === focused.id ? [...node.surfaceIds, ...unassigned] : node.surfaceIds;
    let selected = node.activeSurfaceId ?? ids[0] ?? null;
    if (activeSurfaceId && ids.includes(activeSurfaceId)) selected = activeSurfaceId;
    return { ...node, surfaceIds: ids, activeSurfaceId: selected };
  });
  const nextPanes = workspacePanes(layout);
  const nextFocus =
    nextPanes.find((pane) => pane.surfaceIds.includes(activeSurfaceId ?? "")) ??
    nextPanes.find((pane) => pane.id === focused.id)!;
  return { layout, focusedPaneId: nextFocus.id, activeSurfaceId: nextFocus.activeSurfaceId };
}

export function splitWorkspaceSurface(
  layout: WorkspaceLayout,
  surfaceId: string,
  direction: SplitDirection,
  paneId: string,
): WorkspaceLayout {
  const source = workspacePanes(layout).find((pane) => pane.surfaceIds.includes(surfaceId));
  if (!source) return layout;
  return mapWorkspaceLayout(layout, (node) => {
    if (node.type !== "pane" || node.id !== source.id) return node;
    const ids = node.surfaceIds.filter((id) => id !== surfaceId);
    let selected = node.activeSurfaceId;
    if (selected === surfaceId) selected = ids[0] ?? null;
    return {
      type: "split",
      id: `split:${paneId}`,
      direction,
      ratio: 50,
      first: { ...node, surfaceIds: ids, activeSurfaceId: selected },
      second: { type: "pane", id: paneId, surfaceIds: [surfaceId], activeSurfaceId: surfaceId },
    };
  });
}

export function adjacentWorkspacePane(
  layout: WorkspaceLayout,
  paneId: string,
  direction: PaneDirection,
): WorkspacePane | undefined {
  const rectangles: { pane: WorkspacePane; x: number; y: number; width: number; height: number }[] =
    [];
  const visit = (node: WorkspaceLayout, x: number, y: number, width: number, height: number) => {
    if (node.type === "pane") {
      rectangles.push({ pane: node, x, y, width, height });
      return;
    }
    const fraction = node.ratio / 100;
    if (node.direction === "horizontal") {
      visit(node.first, x, y, width * fraction, height);
      visit(node.second, x + width * fraction, y, width * (1 - fraction), height);
    } else {
      visit(node.first, x, y, width, height * fraction);
      visit(node.second, x, y + height * fraction, width, height * (1 - fraction));
    }
  };
  visit(layout, 0, 0, 1, 1);
  const source = rectangles.find((entry) => entry.pane.id === paneId);
  if (!source) return;
  const candidates = rectangles.filter((target) => {
    if (target === source) return false;
    if (direction === "left" || direction === "right") {
      if (
        Math.min(target.y + target.height, source.y + source.height) -
          Math.max(target.y, source.y) <
        0.0001
      )
        return false;
      if (direction === "left") return target.x + target.width <= source.x + 0.0001;
      return target.x >= source.x + source.width - 0.0001;
    }
    if (
      Math.min(target.x + target.width, source.x + source.width) - Math.max(target.x, source.x) <
      0.0001
    )
      return false;
    if (direction === "up") return target.y + target.height <= source.y + 0.0001;
    return target.y >= source.y + source.height - 0.0001;
  });
  return candidates.toSorted((a, b) => {
    const distance = (target: (typeof rectangles)[number]) =>
      Math.abs(target.x + target.width / 2 - source.x - source.width / 2) +
      Math.abs(target.y + target.height / 2 - source.y - source.height / 2);
    return distance(a) - distance(b);
  })[0]?.pane;
}
