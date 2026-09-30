import { getStorage } from "@/lib/storage";
import type { AnalyticsAdapter, TrackEventInput } from "./types";

class StorageAnalyticsAdapter implements AnalyticsAdapter {
  async track(input: TrackEventInput) {
    await getStorage().saveEvent({
      name: input.name,
      personId: input.personId,
      properties: input.properties ?? {},
    });
  }
}

const analytics = new StorageAnalyticsAdapter();

export async function trackEvent(input: TrackEventInput) {
  try {
    await analytics.track(input);
  } catch (error) {
    console.warn("Analytics event was not saved", error);
  }
}

