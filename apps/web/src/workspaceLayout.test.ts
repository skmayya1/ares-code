import { describe, expect, it } from "vite-plus/test";
import {
  adjacentWorkspacePane,
  restoreWorkspaceLayout,
  splitWorkspaceSurface,
  workspacePanes,
} from "./workspaceLayout";

describe("workspace layout recovery and navigation", () => {
  it("repairs duplicate and missing tabs, invalid sizes, and stale pane selection", () => {
    const restored = restoreWorkspaceLayout(
      {
        type: "split",
        id: "root",
        direction: "horizontal",
        ratio: Number.NaN,
        first: {
          type: "pane",
          id: "a",
          surfaceIds: ["chat", "missing"],
          activeSurfaceId: "missing",
        },
        second: { type: "pane", id: "b", surfaceIds: ["chat", "diff"], activeSurfaceId: "diff" },
      },
      ["chat", "diff", "file:new"],
      "diff",
      "missing",
    );
    expect(restored.layout).toMatchObject({ type: "split", ratio: 50 });
    expect(workspacePanes(restored.layout).map((pane) => pane.surfaceIds)).toEqual([
      ["chat", "file:new"],
      ["diff"],
    ]);
    expect(restored.focusedPaneId).toBe("b");
    expect(restoreWorkspaceLayout({ type: "split", first: null }, ["chat"], "chat").layout).toEqual(
      {
        type: "pane",
        id: "main",
        surfaceIds: ["chat"],
        activeSurfaceId: "chat",
      },
    );
  });

  it("finds spatial neighbors in nested layouts and keeps outer edges a no-op", () => {
    let { layout } = restoreWorkspaceLayout(null, ["chat", "diff", "files"], "chat");
    layout = splitWorkspaceSurface(layout, "diff", "horizontal", "right");
    layout = splitWorkspaceSurface(layout, "files", "vertical", "below");
    expect(adjacentWorkspacePane(layout, "main", "down")?.id).toBe("below");
    expect(adjacentWorkspacePane(layout, "below", "up")?.id).toBe("main");
    expect(adjacentWorkspacePane(layout, "below", "right")?.id).toBe("right");
    expect(adjacentWorkspacePane(layout, "right", "left")?.id).toBe("main");
    expect(adjacentWorkspacePane(layout, "main", "left")).toBeUndefined();
    expect(adjacentWorkspacePane(layout, "right", "right")).toBeUndefined();
  });
});
