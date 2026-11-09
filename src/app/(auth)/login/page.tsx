import type { Metadata } from "next";
import { Suspense } from "react";
import { serverEnv } from "@/core/config/server-env";
import { Alert } from "@/core/ui/alert";
import { AuthShell } from "../auth-shell";
import { LoginForm, LoginNotice } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  const devMode = serverEnv.authMode === "dev";

  return (
    <AuthShell title="Sign in" description="Enter your credentials to access the ERP administration console.">
      <Suspense>
        <LoginNotice />
      </Suspense>
      {devMode && (
        <Alert tone="info" className="mb-5" title="Development sign-in">
          AUTH_MODE=dev: credentials are checked against DEV_AUTH_* in .env.local and a local token is issued.
        </Alert>
      )}
      <LoginForm defaults={serverEnv.loginDefaults} />
    </AuthShell>
  );
}
