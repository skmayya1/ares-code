export function findReusableProjectScriptTerminal(input: {
  readonly terminalIds: ReadonlyArray<string>;
  readonly activeTerminalId: string;
  readonly runningTerminalIds: ReadonlyArray<string>;
}): string | null {
  const idleTerminalIds = input.terminalIds.filter(
    (terminalId) => !input.runningTerminalIds.includes(terminalId),
  );
  if (idleTerminalIds.includes(input.activeTerminalId)) return input.activeTerminalId;
  return idleTerminalIds[0] ?? null;
}
