// Calendar dates travel as "YYYY-MM-DD" (form values, query strings, the API's DateOnly) and are shown and
// typed as day/month/year: "29/10/2026".

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "2026-10-29" → "29/10/2026"; anything that isn't a YYYY-MM-DD date → "". */
export function isoToDmy(iso: string | null | undefined) {
  const match = iso ? ISO_DATE.exec(iso) : null;
  return match ? `${match[3]}/${match[2]}/${match[1]}` : "";
}

/** A YYYY-MM-DD date (or a timestamp starting with one) for showing: "29/10/2026"; anything else as it is. */
export function showDate(value: string) {
  return isoToDmy(value.slice(0, 10)) || value;
}

/** "29/10/2026" (or "9/1/2026") → "2026-10-29" when it is a real date; otherwise "". */
export function dmyToIso(text: string) {
  const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text.trim());
  if (!match) return "";
  const [day, month, year] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return "";
  return `${match[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/**
 * Shapes what is typed into dd/mm/yyyy: digits fill the day, month and year in turn, and "/", "-", "." or a
 * space moves to the next part (so "1/" becomes "01/"). A pasted "2026-10-29" becomes "29/10/2026".
 */
export function maskDmy(raw: string) {
  const iso = ISO_DATE.exec(raw.trim());
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const parts = ["", "", ""];
  let index = 0;
  for (const char of raw) {
    if (char >= "0" && char <= "9") {
      if (parts[index].length === (index < 2 ? 2 : 4)) {
        if (index === 2) break;
        index++;
      }
      parts[index] += char;
    } else if ("/-. ".includes(char) && index < 2 && parts[index].length > 0) {
      parts[index] = parts[index].padStart(2, "0");
      index++;
    }
  }
  return parts.slice(0, index + 1).join("/");
}
