import type { Metadata } from "next";
import { Suspense } from "react";
import { appConfig } from "@/core/config/app";
import { serverEnv } from "@/core/config/server-env";
import { ThemeToggle } from "@/core/theme/theme-toggle";
import { Alert } from "@/core/ui/alert";
import { modules } from "@/modules/registry";
import { ExpiredNotice, LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const devMode = serverEnv.authMode === "dev";

  return (
    <div className="relative flex min-h-screen bg-white dark:bg-gray-900">
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-lg bg-brand-500 font-bold text-white">
              {appConfig.shortName}
            </span>
            <span className="text-xl font-semibold text-gray-800 dark:text-white/90">{appConfig.name}</span>
          </div>
          <h1 className="mb-2 text-2xl font-semibold text-gray-800 sm:text-3xl dark:text-white/90">Sign in</h1>
          <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
            Enter your credentials to access the ERP administration console.
          </p>
          <Suspense>
            <ExpiredNotice />
          </Suspense>
          {devMode && (
            <Alert tone="info" className="mb-5" title="Development sign-in">
              AUTH_MODE=dev: credentials are checked against DEV_AUTH_* in .env.local and a local token is issued.
            </Alert>
          )}
          <LoginForm defaults={serverEnv.loginDefaults} />
        </div>
      </div>

      <div className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-brand-950 lg:flex">
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "linear-gradient(to right, rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.15) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
          aria-hidden
        />
        <div className="relative z-10 max-w-md px-10 text-center">
          <span className="mx-auto flex size-16 items-center justify-center rounded-2xl bg-brand-500 text-2xl font-bold text-white">
            {appConfig.shortName}
          </span>
          <h2 className="mt-6 text-3xl font-semibold text-white">{appConfig.name}</h2>
          <p className="mt-3 text-brand-200">One console for every part of your business.</p>
          <ul className="mt-8 flex flex-wrap justify-center gap-2">
            {modules.map((module) => (
              <li
                key={module.key}
                className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-sm text-white/80"
              >
                <module.icon className="size-4" aria-hidden />
                {module.name}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
    </div>
  );
}
