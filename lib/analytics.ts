import { track } from "@vercel/analytics";

export function trackEvent(
  name: string,
  data?: Record<string, string | number | boolean | null>
) {
  try {
    track(name, data);
  } catch {
    // ignore analytics failures
  }
}
