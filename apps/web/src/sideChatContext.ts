const SNAPSHOT_MAX_CHARS = 24_000;

export function buildSideChatContext(input: {
  title: string;
  workspace: string | null;
  messages: ReadonlyArray<{ role: string; text: string }>;
  plan: string | null;
}): string {
  const opening = input.messages.find((message) => message.role === "user" && message.text.trim());
  const overview = [
    `Main conversation: ${input.title.slice(0, 500)}`,
    `Workspace: ${input.workspace?.slice(0, 2_048) ?? "Not selected"}`,
    `Opening request: ${opening?.text.slice(0, 3_000) ?? "No messages yet."}`,
    `Latest plan: ${input.plan?.slice(0, 4_000) ?? "None."}`,
    "Recent messages:",
  ].join("\n\n");
  const recent = input.messages
    .filter((message) => message.role !== "system" && message.text.trim())
    .slice(-12)
    .map((message) => `${message.role}: ${message.text.slice(-4_000)}`)
    .join("\n\n");
  return `${overview}\n${recent.slice(-(SNAPSHOT_MAX_CHARS - overview.length - 1))}`;
}
