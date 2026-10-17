/** Decodes a route param, tolerating values that are already decoded. */
export function decodeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
