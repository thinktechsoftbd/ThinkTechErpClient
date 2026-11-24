import { cacheLife } from "next/cache";
import { appConfig } from "@/core/config/app";
import { cn } from "@/core/utils/cn";

/** This year, for the copyright line: cached (prerendered) and refreshed daily, so it turns over on New Year. */
async function copyrightYear() {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** "© 2026 ThinkTech. All Rights Reserved. | Powered by ThinkTech", centred at the foot of every page (not printed). */
export async function AppFooter({ className }: { className?: string }) {
  const year = await copyrightYear();
  const company = appConfig.companyName;
  return (
    <footer className={cn("text-center text-sm text-gray-500 print:hidden dark:text-gray-400", className)}>
      © {year} {company}. All Rights Reserved. <span aria-hidden>|</span> Powered by {company}
    </footer>
  );
}
