import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthShell } from "../auth-shell";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "Reset password" };

/** Opened from the emailed link (?token=...). */
export default function ResetPasswordPage() {
  return (
    <AuthShell title="Choose a new password" description="Enter your new password twice. You'll then sign in with it.">
      <Suspense>
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
