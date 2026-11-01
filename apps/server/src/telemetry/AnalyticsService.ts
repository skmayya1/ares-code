import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import { constant } from "effect/Function";
import * as Layer from "effect/Layer";

export class AnalyticsService extends Context.Service<
  AnalyticsService,
  {
    readonly record: (
      event: string,
      properties?: Readonly<Record<string, unknown>>,
    ) => Effect.Effect<void>;
  }
>()("t3/telemetry/AnalyticsService") {}

// Product analytics are disabled in this build: nothing is buffered or sent.
export const layer = Layer.succeed(AnalyticsService, {
  record: constant(Effect.void),
});
