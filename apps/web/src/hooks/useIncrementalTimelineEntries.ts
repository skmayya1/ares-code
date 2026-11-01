import { useState } from "react";
import {
  deriveTimelineEntriesFromVisibleTurnItemsWithState,
  type TimelineEntriesInput,
  type TimelineEntriesProjection,
} from "../session-logic";

function sameInput(left: TimelineEntriesInput, right: TimelineEntriesInput): boolean {
  return (
    left.visibleTurnItems === right.visibleTurnItems &&
    left.optimisticMessages === right.optimisticMessages &&
    left.anchoredMessages === right.anchoredMessages &&
    left.attachmentUrlById === right.attachmentUrlById &&
    left.attempts === right.attempts &&
    left.nodes === right.nodes &&
    left.plans === right.plans
  );
}

function createTimelineEntriesProjector() {
  let previous: { threadKey: string | null; projection: TimelineEntriesProjection } | null = null;
  return (threadKey: string | null, input: TimelineEntriesInput) => {
    if (previous?.threadKey === threadKey && sameInput(previous.projection.input, input)) {
      return previous.projection.entries;
    }
    const projection = deriveTimelineEntriesFromVisibleTurnItemsWithState(
      input,
      previous?.threadKey === threadKey ? previous.projection : null,
    );
    previous = { threadKey, projection };
    return projection.entries;
  };
}

export function useIncrementalTimelineEntries(
  threadKey: string | null,
  input: TimelineEntriesInput,
): TimelineEntriesProjection["entries"] {
  const [project] = useState(createTimelineEntriesProjector);
  return project(threadKey, input);
}
