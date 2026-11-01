/* oxlint-disable shadcn/no-restyle -- ResizeSeparator is from react-resizable-panels, not components/ui. */
import type { ScopedThreadRef } from "@t3tools/contracts";
import { useShallow } from "zustand/react/shallow";
import { createPortal } from "react-dom";
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Group, Panel, Separator as ResizeSeparator, useGroupRef } from "react-resizable-panels";
import { requestWorkspaceFocus } from "../lib/workspaceFocus";
import { resolveShortcutCommand } from "../keybindings";
import { useMediaQuery } from "../hooks/useMediaQuery";
import {
  useRightPanelStore,
  type RightPanelSurface,
  type ThreadRightPanelState,
} from "../rightPanelStore";
import { restoreWorkspaceLayout, workspacePanes, type WorkspaceLayout } from "../workspaceLayout";
import {
  PANEL_SHORTCUT_BLOCKING_LAYERS,
  RightPanelTabs,
  type RightPanelTabsProps,
} from "./RightPanelTabs";

type WorkspaceTabsProps = Omit<RightPanelTabsProps, "children" | "mode"> & {
  threadRef: ScopedThreadRef;
  state: ThreadRightPanelState;
  renderSurface: (surface: RightPanelSurface, visible: boolean) => ReactNode;
};

export function WorkspaceTabs(props: WorkspaceTabsProps) {
  const { state, threadRef } = props;
  const restored = restoreWorkspaceLayout(
    state.layout,
    props.surfaces.map((surface) => surface.id),
    state.activeSurfaceId,
    state.focusedPaneId,
  );
  const panes = workspacePanes(restored.layout);
  const narrow = useMediaQuery("(max-width: 700px)");
  const hosts = useRef(new Map<string, HTMLDivElement>());
  const parking = useRef<HTMLDivElement>(null);
  const store = useRightPanelStore(
    useShallow((state) => ({
      splitSurface: state.splitSurface,
      focusPane: state.focusPane,
      focusAdjacentPane: state.focusAdjacentPane,
      resizeSplit: state.resizeSplit,
      resizeFocusedPane: state.resizeFocusedPane,
      toggleMaximizedPane: state.toggleMaximizedPane,
      closePane: state.closePane,
    })),
  );
  const handleShortcut = useEffectEvent((event: KeyboardEvent) => {
    if (
      event.defaultPrevented ||
      event.isComposing ||
      event.repeat ||
      document.querySelector(PANEL_SHORTCUT_BLOCKING_LAYERS)
    )
      return;
    const command = resolveShortcutCommand(event, props.keybindings, {
      context: { ...props.getShortcutContext(), rightPanelOpen: true },
    });
    if (!command?.startsWith("layout.")) return;
    event.preventDefault();
    event.stopPropagation();
    const activeId = state.activeSurfaceId;
    switch (command) {
      case "layout.newSideChat":
        props.onAddSideChat?.();
        break;
      case "layout.splitRight":
        if (activeId) store.splitSurface(threadRef, activeId, "horizontal");
        break;
      case "layout.splitBelow":
        if (activeId) store.splitSurface(threadRef, activeId, "vertical");
        break;
      case "layout.focusLeft":
        store.focusAdjacentPane(threadRef, "left");
        break;
      case "layout.focusRight":
        store.focusAdjacentPane(threadRef, "right");
        break;
      case "layout.focusUp":
        store.focusAdjacentPane(threadRef, "up");
        break;
      case "layout.focusDown":
        store.focusAdjacentPane(threadRef, "down");
        break;
      case "layout.moveLeft":
        store.focusAdjacentPane(threadRef, "left", true);
        break;
      case "layout.moveRight":
        store.focusAdjacentPane(threadRef, "right", true);
        break;
      case "layout.moveUp":
        store.focusAdjacentPane(threadRef, "up", true);
        break;
      case "layout.moveDown":
        store.focusAdjacentPane(threadRef, "down", true);
        break;
      case "layout.grow":
        store.resizeFocusedPane(threadRef, true);
        return;
      case "layout.shrink":
        store.resizeFocusedPane(threadRef, false);
        return;
      case "layout.maximize":
        store.toggleMaximizedPane(threadRef);
        break;
      case "layout.closePane":
        store.closePane(threadRef);
        break;
    }
    requestWorkspaceFocus({ area: "panel" });
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- captures configurable layout shortcuts before embedded editors and terminals consume them
  useEffect(() => {
    document.addEventListener("keydown", handleShortcut, true);
    return () => document.removeEventListener("keydown", handleShortcut, true);
  }, []);

  const renderPane = (pane: Extract<WorkspaceLayout, { type: "pane" }>) => {
    const focused = pane.id === restored.focusedPaneId;
    const surfaces = pane.surfaceIds.flatMap((id) =>
      props.surfaces.filter((surface) => surface.id === id),
    );
    const focusPane = () => store.focusPane(threadRef, pane.id);
    return (
      <div
        data-workspace-pane={pane.id}
        data-workspace-pane-focused={focused}
        tabIndex={-1}
        onPointerDownCapture={focusPane}
        onFocusCapture={focusPane}
        className="relative flex h-full min-h-0 min-w-0 flex-1 outline-none"
      >
        <RightPanelTabs
          {...props}
          onAddChat={
            state.surfaces.some((surface) => surface.id === "chat") ? undefined : props.onAddChat
          }
          mode={pane.id === visiblePanes[0]?.id ? "inline" : "embedded"}
          maximized
          open
          layoutControls={pane.id === visiblePanes[0]?.id ? props.layoutControls : undefined}
          workspaceFocusKey={`pane:${threadRef.environmentId}:${threadRef.threadId}:${pane.id}`}
          shortcutsEnabled={focused}
          surfaces={surfaces}
          activeSurfaceId={pane.activeSurfaceId}
          onActivate={(surface) => {
            focusPane();
            props.onActivate(surface);
          }}
          onMoveSurface={(surfaceId, index) => {
            const targetId = surfaces[index]?.id;
            const globalIndex = props.surfaces.findIndex((surface) => surface.id === targetId);
            if (globalIndex >= 0) props.onMoveSurface?.(surfaceId, globalIndex);
          }}
        >
          <div
            className="relative flex min-h-0 min-w-0 flex-1 flex-col"
            ref={(element) => {
              if (element) hosts.current.set(pane.id, element);
              else hosts.current.delete(pane.id);
            }}
          />
        </RightPanelTabs>
      </div>
    );
  };
  let displayed: WorkspaceLayout = restored.layout;
  if (narrow || state.maximizedPaneId) {
    displayed =
      panes.find((pane) => pane.id === (state.maximizedPaneId ?? restored.focusedPaneId)) ??
      panes[0]!;
  }
  const visiblePanes = workspacePanes(displayed);
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {narrow && panes.length > 1 ? (
        <div
          className="flex shrink-0 gap-1 overflow-x-auto bg-sidebar px-2 py-1"
          aria-label="Workspace panes"
        >
          {panes.map((pane, index) => (
            <button
              key={pane.id}
              type="button"
              aria-pressed={pane.id === restored.focusedPaneId}
              className="rounded px-2 py-1 text-xs aria-pressed:bg-background"
              onClick={() => store.focusPane(threadRef, pane.id)}
            >
              Pane {index + 1}
            </button>
          ))}
        </div>
      ) : null}
      <WorkspaceBranch
        layout={displayed}
        renderPane={renderPane}
        onResize={(id, ratio) => store.resizeSplit(threadRef, id, ratio)}
      />
      <div hidden inert ref={parking} />
      {props.surfaces
        .filter(
          (surface) =>
            surface.kind === "chat" ||
            visiblePanes.some((pane) => pane.activeSurfaceId === surface.id),
        )
        .map((surface) => {
          const pane = visiblePanes.find((entry) => entry.activeSurfaceId === surface.id);
          return (
            <WorkspaceSurface
              key={surface.id}
              surfaceId={surface.id}
              getHost={() => (pane ? hosts.current.get(pane.id) : parking.current) ?? null}
              onFocus={() => {
                if (pane) store.focusPane(threadRef, pane.id);
              }}
            >
              {props.renderSurface(surface, pane !== undefined)}
            </WorkspaceSurface>
          );
        })}
    </div>
  );
}

function WorkspaceBranch(props: {
  layout: WorkspaceLayout;
  renderPane: (pane: Extract<WorkspaceLayout, { type: "pane" }>) => ReactNode;
  onResize: (id: string, ratio: number) => void;
}) {
  const groupRef = useGroupRef();
  const { layout } = props;
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- applies keyboard-driven or restored sizes to the resizable panel library
  useLayoutEffect(() => {
    if (layout.type !== "split") return;
    const sizes = groupRef.current?.getLayout();
    if (Math.abs((sizes?.[layout.first.id] ?? layout.ratio) - layout.ratio) > 0.1) {
      groupRef.current?.setLayout({
        [layout.first.id]: layout.ratio,
        [layout.second.id]: 100 - layout.ratio,
      });
    }
  }, [layout, groupRef]);
  if (layout.type === "pane") return props.renderPane(layout);
  return (
    <Group
      key={layout.id}
      groupRef={groupRef}
      orientation={layout.direction}
      className="min-h-0 min-w-0 flex-1"
      defaultLayout={{ [layout.first.id]: layout.ratio, [layout.second.id]: 100 - layout.ratio }}
      onLayoutChanged={(sizes) => {
        const ratio = sizes[layout.first.id];
        if (ratio !== undefined && Math.abs(ratio - layout.ratio) > 0.1)
          props.onResize(layout.id, ratio);
      }}
    >
      <Panel id={layout.first.id}>
        <WorkspaceBranch {...props} layout={layout.first} />
      </Panel>
      <ResizeSeparator
        aria-label={
          layout.direction === "horizontal"
            ? "Resize panes horizontally"
            : "Resize panes vertically"
        }
        className={
          layout.direction === "horizontal"
            ? "relative z-20 w-px touch-none bg-sidebar-border outline-none after:absolute after:inset-y-0 after:-inset-x-1 hover:brightness-75 focus-visible:brightness-75 data-[separator=hover]:brightness-75 data-[separator=active]:brightness-75"
            : "relative z-20 h-px touch-none bg-sidebar-border outline-none after:absolute after:inset-x-0 after:-inset-y-1 hover:brightness-75 focus-visible:brightness-75 data-[separator=hover]:brightness-75 data-[separator=active]:brightness-75"
        }
      />
      <Panel id={layout.second.id}>
        <WorkspaceBranch {...props} layout={layout.second} />
      </Panel>
    </Group>
  );
}

function WorkspaceSurface(props: {
  surfaceId: string;
  getHost: () => HTMLElement | null;
  onFocus: () => void;
  children: ReactNode;
}) {
  const [container] = useState(() => {
    const element = document.createElement("div");
    element.className = "flex min-h-0 min-w-0 flex-1 flex-col";
    return element;
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- reparents a stable portal container so moving a tab preserves its composer, editor, and terminal DOM state
  useLayoutEffect(() => {
    const host = props.getHost();
    if (host && container.parentElement !== host) {
      const focused = container.contains(document.activeElement) ? document.activeElement : null;
      host.appendChild(container);
      if (focused instanceof HTMLElement) focused.focus({ preventScroll: true });
    }
  });
  // oxlint-disable-next-line t3code/no-unreasoned-state-sync -- removes the portal container from its external pane host on unmount
  useLayoutEffect(() => () => container.remove(), [container]);
  return createPortal(
    <div
      data-workspace-surface={props.surfaceId}
      tabIndex={-1}
      onPointerDownCapture={props.onFocus}
      onFocusCapture={props.onFocus}
      className="flex min-h-0 min-w-0 flex-1 flex-col outline-none"
    >
      {props.children}
    </div>,
    container,
  );
}
