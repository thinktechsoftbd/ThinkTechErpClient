"use client";

import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { resetPasswordAction } from "@/core/auth/actions";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Field, Input } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";

/** The new password, twice, sent with the token from the emailed link. */
export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [showPassword, setShowPassword] = useState(false);

  if (!token) {
    return (
      <div className="space-y-5">
        <Alert tone="warning">This page needs the link from the reset email. Open that link again, or ask for a new one.</Alert>
        <Link href="/forgot-password" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Ask for a new link
        </Link>
      </div>
    );
  }

  return (
    <ActionForm action={resetPasswordAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />
      <FormMessage />
      <Field label="New password" name="password" required hint="At least 8 characters.">
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            minLength={8}
            className="pr-12"
            required
            autoFocus
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            className="absolute top-1/2 right-3 -translate-y-1/2 rounded p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
          </button>
        </div>
      </Field>
      <Field label="Confirm new password" name="confirmPassword" required>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type={showPassword ? "text" : "password"}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </Field>
      <SubmitButton pendingLabel="Saving…" className="w-full">
        Set new password
      </SubmitButton>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
    </ActionForm>
  );
}
