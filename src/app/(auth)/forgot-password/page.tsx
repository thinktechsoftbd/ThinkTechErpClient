import type { Metadata } from "next";
import { AuthShell } from "../auth-shell";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell title="Forgot password" description="Enter the email address of your account and we'll email you a link to choose a new password.">
      <ForgotPasswordForm />
    </AuthShell>
  );
}
