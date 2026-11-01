import "../index.css";
import { scopeThreadRef } from "@t3tools/client-runtime/environment";
import { EnvironmentId, ThreadId } from "@t3tools/contracts";
import { DEFAULT_RESOLVED_KEYBINDINGS } from "@t3tools/shared/keybindings";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { act, render } from "../../test/render";
import { selectThreadRightPanelState, useRightPanelStore } from "../rightPanelStore";
import { startWorkspaceFocus } from "../lib/workspaceFocus";
import { workspacePanes } from "../workspaceLayout";
import { WorkspaceTabs } from "./WorkspaceTabs";

vi.mock("../browser/browserDefaults", () => ({
  useBrowserDefaults: () => ({ profiles: [] }),
}));

const ref = scopeThreadRef(EnvironmentId.make("layout-test"), ThreadId.make("thread"));

function Fixture(props: { width?: number; height?: number } = {}) {
  const state = useRightPanelStore((store) => selectThreadRightPanelState(store.byThreadKey, ref));
  const store = useRightPanelStore((state) => state);
  return (
    <div style={{ width: props.width ?? 1100, height: props.height ?? 700, display: "flex" }}>
      <WorkspaceTabs
        threadRef={ref}
        state={state}
        surfaces={state.surfaces}
        activeSurfaceId={state.activeSurfaceId}
        environmentId={ref.environmentId}
        keybindings={DEFAULT_RESOLVED_KEYBINDINGS}
        getShortcutContext={() => ({
          rightPanelOpen: true,
          terminalFocus: false,
          terminalOpen: false,
          previewFocus: false,
          previewOpen: false,
          isWeb: true,
          isDesktop: false,
        })}
        pendingSurfaceIds={new Set()}
        previewSessions={{}}
        desktopByTabId={{}}
        terminalLabelsById={new Map()}
        onActivate={(surface) => store.activateSurface(ref, surface.id)}
        onCloseSurface={(surface) => store.closeSurface(ref, surface.id)}
        onCloseOtherSurfaces={(surface) => store.closeOtherSurfaces(ref, surface.id)}
        onCloseSurfacesToRight={(surface) => store.closeSurfacesToRight(ref, surface.id)}
        onCloseAllSurfaces={() => store.closeAllSurfaces(ref)}
        onCopyFilePath={() => {}}
        onAddChat={() => store.open(ref, "chat")}
        onAddSideChat={() => store.openSideChat(ref, ThreadId.make("fork"))}
        onAddBrowser={() => {}}
        onAddBrowserInProfile={() => {}}
        onAddTerminal={() => {}}
        onAddDiff={() => store.open(ref, "diff")}
        onAddFiles={() => store.open(ref, "files")}
        onAddPullRequest={() => {}}
        onAddPullRequests={() => {}}
        onAddDevice={() => {}}
        browserAvailable={false}
        terminalAvailable={false}
        diffAvailable
        filesAvailable
        pullRequestAvailable={false}
        pullRequestsAvailable={false}
        deviceAvailable={false}
        renderSurface={(surface) => (
          <textarea aria-label={`${surface.id} content`} defaultValue={surface.id} />
        )}
      />
    </div>
  );
}

it("splits through shortcuts and preserves content while moving, resizing, maximizing, and switching tabs by keyboard", async () => {
  await page.viewport(1280, 800);
  useRightPanelStore.setState({
    byThreadKey: {},
    threadPanelVisibilityByThreadKey: {},
    userActionRevisionByThreadKey: {},
    closeRevisionByThreadKey: {},
  });
  const store = useRightPanelStore.getState();
  store.open(ref, "chat");
  store.open(ref, "diff");
  store.activateSurface(ref, "chat");
  await using screen = await render(<Fixture />);
  using _focus = { [Symbol.dispose]: startWorkspaceFocus(screen.router!) };
  await userEvent.fill(screen.getByRole("textbox", { name: "chat content" }), "unsent draft");
  const chat = screen.getByRole("textbox", { name: "chat content" }).element();
  await userEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
  await expect
    .element(page.getByRole("menuitem", { name: "Open as split" }))
    .not.toBeInTheDocument();
  await userEvent.keyboard("{Control>}{Alt>}s{/Alt}{/Control}");
  await expect
    .element(screen.getByRole("textbox", { name: "chat content" }))
    .toHaveValue("unsent draft");
  expect(screen.getByRole("textbox", { name: "chat content" }).element()).toBe(chat);
  await expect.element(screen.getByRole("textbox", { name: "diff content" })).toBeVisible();
  await userEvent.click(screen.getByRole("textbox", { name: "chat content" }));
  await userEvent.keyboard("{Control>}{Alt>}{Shift>}{ArrowLeft}{/Shift}{/Alt}{/Control}");
  expect(screen.getByRole("textbox", { name: "chat content" }).element()).toBe(chat);
  await userEvent.keyboard("{Control>}1{/Control}");
  await expect.element(screen.getByRole("textbox", { name: "diff content" })).toBeVisible();
  await userEvent.keyboard("{Control>}2{/Control}");
  await expect
    .element(screen.getByRole("textbox", { name: "chat content" }))
    .toHaveValue("unsent draft");
  const state = () => selectThreadRightPanelState(useRightPanelStore.getState().byThreadKey, ref);
  const splitId = state().layout!.id;
  await act(() => store.resizeSplit(ref, splitId, 60));
  await vi.waitFor(() => {
    const panel = screen.container.querySelector<HTMLElement>(
      `[data-panel][id="${workspacePanes(state().layout!)[0]!.id}"]`,
    );
    expect(panel!.getBoundingClientRect().width).toBeGreaterThan(600);
  });
  await userEvent.keyboard("{Control>}{Alt>}m{/Alt}{/Control}");
  expect(screen.container.querySelectorAll("[data-workspace-pane]")).toHaveLength(1);
  await userEvent.keyboard("{Control>}{Alt>}m{/Alt}{/Control}");
  expect(screen.container.querySelectorAll("[data-workspace-pane]")).toHaveLength(2);
  expect(screen.getByRole("textbox", { name: "chat content" }).element()).toBe(chat);
  await userEvent.click(screen.getByRole("button", { name: "Add panel surface" }).first());
  await expect.element(page.getByRole("menuitem", { name: /^Chat/ })).not.toBeInTheDocument();
  await expect.element(page.getByRole("menuitem", { name: /Side Chat/ })).toBeVisible();
  await userEvent.keyboard("{Escape}");
  await userEvent.keyboard("{Control>}{Alt>}n{/Alt}{/Control}");
  await userEvent.fill(
    screen.getByRole("textbox", { name: "side-chat:fork content" }),
    "side draft",
  );
  await userEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
  await expect
    .element(screen.getByRole("textbox", { name: "chat content" }))
    .toHaveValue("unsent draft");
  await userEvent.click(screen.getByRole("button", { name: "Side Chat 1", exact: true }));
  await expect
    .element(screen.getByRole("textbox", { name: "side-chat:fork content" }))
    .toHaveValue("side draft");
  await userEvent.keyboard("{Control>}{Alt>}s{/Alt}{/Control}");
  await expect
    .element(screen.getByRole("textbox", { name: "side-chat:fork content" }))
    .toHaveValue("side draft");
});

it.each(["horizontal", "vertical"] as const)(
  "resizes %s splits by dragging their divider",
  async (direction) => {
    await page.viewport(1280, 800);
    useRightPanelStore.setState({
      byThreadKey: {},
      threadPanelVisibilityByThreadKey: {},
      userActionRevisionByThreadKey: {},
      closeRevisionByThreadKey: {},
    });
    const store = useRightPanelStore.getState();
    store.open(ref, "chat");
    store.open(ref, "diff");
    store.splitSurface(ref, "diff", direction);
    await using screen = await render(<Fixture />);
    const divider = screen.getByRole("separator");
    const target = screen.getByRole("textbox", { name: "diff content" });
    await userEvent.dragAndDrop(divider, target);
    await vi.waitFor(() => {
      const layout = selectThreadRightPanelState(
        useRightPanelStore.getState().byThreadKey,
        ref,
      ).layout;
      expect(layout?.type).toBe("split");
      if (layout?.type === "split") expect(layout.ratio).toBeGreaterThan(55);
    });

    await page.viewport(2560, 1800);
    await screen.rerender(<Fixture width={2400} height={1600} />);
    await userEvent.dragAndDrop(divider, screen.getByRole("textbox", { name: "chat content" }), {
      targetPosition: { x: 0, y: 0 },
    });
    await vi.waitFor(() => {
      const layout = selectThreadRightPanelState(
        useRightPanelStore.getState().byThreadKey,
        ref,
      ).layout;
      if (layout?.type !== "split") throw new Error("Expected split");
      expect(layout.ratio).toBeLessThan(10);
      const panel = screen.container.querySelector<HTMLElement>(
        `[data-panel][id="${layout.first.id}"]`,
      )!;
      const rect = panel.getBoundingClientRect();
      let size = rect.width;
      let minimum = 180;
      if (direction === "vertical") {
        size = rect.height;
        minimum = 120;
      }
      expect(size).toBeGreaterThanOrEqual(0);
      expect(size).toBeLessThan(minimum);
    });
  },
);
