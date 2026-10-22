/** Parses a positive integer route param (e.g. an API id); null when it isn't one. */
export function parseIdParam(value: string) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

/** Decodes a route param, tolerating values that are already decoded. */
export function decodeParam(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}
