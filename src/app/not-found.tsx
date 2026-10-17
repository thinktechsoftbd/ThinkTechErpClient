import { LinkButton } from "@/core/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <p className="text-6xl font-bold text-brand-500">404</p>
      <h1 className="mt-4 text-xl font-semibold text-gray-800 dark:text-white/90">Page not found</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        The page you are looking for doesn&apos;t exist or has been moved.
      </p>
      <LinkButton href="/dashboard" className="mt-6">
        Back to dashboard
      </LinkButton>
    </main>
  );
}
