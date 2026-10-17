/** A row from a website table. The API returns rows as plain JSON objects (snake_case columns). */
export type WebsiteRecord = Record<string, unknown>;

export const WEBSITE_PAGE_SIZE = 20;
