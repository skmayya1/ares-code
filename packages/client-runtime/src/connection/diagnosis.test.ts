import { describe, expect, it } from "@effect/vitest";

import { presentConnectionDiagnosis } from "./diagnosis.ts";
import { mapRemoteEnvironmentError } from "./errors.ts";
import {
  AVAILABLE_CONNECTION_STATE,
  type ConnectionAttemptError,
  type SupervisorConnectionState,
} from "./model.ts";
import { RemoteEnvironmentAuthFetchError } from "../rpc/http.ts";

const backoff = (lastFailure: ConnectionAttemptError): SupervisorConnectionState => ({
  ...AVAILABLE_CONNECTION_STATE,
  desired: true,
  network: "online",
  phase: "backoff",
  attempt: 3,
  lastFailure,
  retryAt: Date.UTC(2026, 9, 19, 12, 0, 30),
});

const unreachable = mapRemoteEnvironmentError(
  new RemoteEnvironmentAuthFetchError({ message: "Failed to fetch", cause: new TypeError() }),
);

const diagnose = (state: SupervisorConnectionState) =>
  presentConnectionDiagnosis({ hostLabel: "Mac mini", state });

describe("presentConnectionDiagnosis", () => {
  it("names T3 Code on the host when it does not answer", () => {
    const diagnosis = diagnose(backoff(unreachable));
    expect(diagnosis?.headline).toBe("T3 Code on Mac mini did not answer");
    expect(diagnosis?.hops.map((hop) => `${hop.hop}:${hop.result}`)).toEqual([
      "device:ok",
      "server:failed",
    ]);
  });

  it("reports this device as offline before any other hop", () => {
    const state = { ...backoff(unreachable), network: "offline" as const };
    expect(diagnose(state)?.headline).toBe("This device is offline");
    expect(diagnose(state)?.hops[0]?.result).toBe("failed");
  });

  it("has nothing to diagnose before any attempt fails", () => {
    expect(diagnose(AVAILABLE_CONNECTION_STATE)).toBeNull();
  });
});
