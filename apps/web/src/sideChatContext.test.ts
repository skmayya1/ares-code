import { expect, it } from "vite-plus/test";
import { buildSideChatContext } from "./sideChatContext";

it("captures the opening request, plan, workspace, and recent conversation within its budget", () => {
  const context = buildSideChatContext({
    title: "Fix login",
    workspace: "/workspace/app",
    plan: "Keep existing sessions valid",
    messages: [
      { role: "user", text: "Fix login without changing sessions" },
      ...Array.from({ length: 20 }, (_, index) => ({
        role: "assistant",
        text: `answer ${index} ${"x".repeat(4_000)}`,
      })),
      { role: "user", text: "The latest decision" },
    ],
  });
  expect(context).toContain("Fix login without changing sessions");
  expect(context).toContain("Keep existing sessions valid");
  expect(context).toContain("/workspace/app");
  expect(context).toContain("The latest decision");
  expect(context).not.toContain("answer 0 ");
  expect(context.length).toBeLessThanOrEqual(24_000);
  expect(
    buildSideChatContext({ title: "New chat", workspace: null, messages: [], plan: null }),
  ).toContain("No messages yet.");
});
