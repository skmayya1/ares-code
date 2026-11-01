import { describe, expect, it } from "vite-plus/test";

import { findReusableProjectScriptTerminal } from "./projectScriptTerminal";

describe("findReusableProjectScriptTerminal", () => {
  it.each([
    {
      name: "reuses an idle workspace terminal without creating a second surface",
      terminalIds: ["term-1"],
      activeTerminalId: "term-1",
      runningTerminalIds: [],
      expected: "term-1",
    },
    {
      name: "reuses the active idle workspace terminal",
      terminalIds: ["term-1", "term-2"],
      activeTerminalId: "term-2",
      runningTerminalIds: [],
      expected: "term-2",
    },
    {
      name: "falls back to another idle workspace terminal when the active one is busy",
      terminalIds: ["term-1", "term-2"],
      activeTerminalId: "term-1",
      runningTerminalIds: ["term-1"],
      expected: "term-2",
    },
    {
      name: "finds nothing when every workspace terminal is busy",
      terminalIds: ["term-1"],
      activeTerminalId: "term-1",
      runningTerminalIds: ["term-1"],
      expected: null,
    },
  ])("$name", ({ expected, ...input }) => {
    expect(findReusableProjectScriptTerminal(input)).toBe(expected);
  });
});
