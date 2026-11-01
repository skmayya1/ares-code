import "../index.css";
import { createMemoryHistory } from "@tanstack/react-router";
import { scopeProjectRef, scopeThreadRef } from "@t3tools/client-runtime/environment";
import { ProjectId, ThreadId } from "@t3tools/contracts";
import { DEFAULT_CLIENT_SETTINGS } from "@t3tools/contracts/settings";
import type * as Context from "effect/Context";
import { expect, it, vi } from "vite-plus/test";
import { page, userEvent } from "vite-plus/test/browser";
import { AppRoot } from "../AppRoot";
import { DraftId, useComposerDraftStore } from "../composerDraftStore";
import { __setClientSettingsForTests } from "../hooks/useSettings";
import { getRouter } from "../router";
import {
  ENVIRONMENT_ID,
  installFakeEnvironment,
  threadWithHistory,
  type FakeDriver,
} from "../../test/fakeEnvironment";
import { useRightPanelStore } from "../rightPanelStore";
import { act, render } from "../../test/render";

vi.mock("../../../../packages/client-runtime/src/connection/driver.ts", async (importOriginal) => {
  const [actual, { fakeDriver }, Layer] = await Promise.all([
    importOriginal<{ readonly ConnectionDriver: Context.Key<unknown, FakeDriver> }>(),
    import("../../test/fakeEnvironment"),
    import("effect/Layer"),
  ]);
  return { ...actual, layer: Layer.succeed(actual.ConnectionDriver, fakeDriver) };
});
vi.mock(import("../rpc/requestLatencyState"), async (original) => ({
  ...(await original()),
  trackRpcRequestSent: () => {},
}));

it("restores a draft workspace when opening the app", async () => {
  await page.viewport(1400, 900);
  using _environment = installFakeEnvironment([
    threadWithHistory("existing", 1),
    threadWithHistory("side-chat", 0),
  ]);
  __setClientSettingsForTests({
    ...DEFAULT_CLIENT_SETTINGS,
    onboardingCompletedAt: "2026-01-01T00:00:00.000Z",
  });
  const draftId = DraftId.make("startup-draft");
  useComposerDraftStore
    .getState()
    .setProjectDraftThreadId(
      scopeProjectRef(ENVIRONMENT_ID, ProjectId.make("project-render")),
      draftId,
    );
  useComposerDraftStore.getState().setPrompt(draftId, "restored draft");
  const router = getRouter(createMemoryHistory({ initialEntries: [`/draft/${draftId}`] }));
  await router.load();
  const container = document.createElement("div");
  container.style.cssText = "height: 900px; width: 1400px;";
  // The app owns its router.
  await using screen = await render(<AppRoot router={router} />, { container, router: false });
  await expect.element(page.getByRole("button", { name: "Chat", exact: true })).toBeVisible();
  await expect.element(screen.getByTestId("composer-editor")).toHaveTextContent("restored draft");
  const session = useComposerDraftStore.getState().getDraftSession(draftId)!;
  await act(() =>
    useRightPanelStore
      .getState()
      .openSideChat(
        scopeThreadRef(ENVIRONMENT_ID, session.threadId),
        ThreadId.make("side-chat"),
        "Hidden main conversation snapshot",
      ),
  );
  await expect
    .element(screen.getByRole("button", { name: "Side Chat 1", exact: true }))
    .toBeVisible();
  await expect.element(screen.getByTestId("composer-editor").nth(0)).toBeVisible();
  expect(screen.getByTestId("composer-editor").nth(0).element().textContent).toBe("");
  expect(screen.container.textContent).not.toContain("Hidden main conversation snapshot");
  await userEvent.click(screen.getByRole("button", { name: "Chat", exact: true }));
  await expect
    .element(screen.getByTestId("composer-editor").nth(0))
    .toHaveTextContent("restored draft");
});
