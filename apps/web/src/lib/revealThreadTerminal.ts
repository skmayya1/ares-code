import type { ScopedThreadRef } from "@t3tools/contracts";

import { selectThreadRightPanelState, useRightPanelStore } from "../rightPanelStore";
import { focusTerminalOnNavigation } from "./terminalFocus";

export function revealThreadTerminal(threadRef: ScopedThreadRef, terminalId: string) {
  const panels = useRightPanelStore.getState();
  const surface = selectThreadRightPanelState(panels.byThreadKey, threadRef).surfaces.find(
    (surface) => surface.kind === "terminal" && surface.terminalIds.includes(terminalId),
  );
  if (surface) {
    panels.activateTerminal(threadRef, surface.id, terminalId);
    panels.activateSurface(threadRef, surface.id);
    focusTerminalOnNavigation(threadRef, terminalId);
    return;
  }
  panels.openTerminal(threadRef, terminalId);
  focusTerminalOnNavigation(threadRef, terminalId);
}
