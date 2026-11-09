"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { forgotPasswordAction } from "@/core/auth/actions";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Field, Input } from "@/core/forms/fields";

export function ForgotPasswordForm() {
  return (
    <ActionForm action={forgotPasswordAction} className="space-y-5">
      <FormMessage />
      <Field label="Email" name="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={256}
          required
          autoFocus
        />
      </Field>
      <SubmitButton pendingLabel="Sending…" className="w-full">
        Send reset link
      </SubmitButton>
      <Link href="/login" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-500 hover:underline">
        <ArrowLeft className="size-4" aria-hidden /> Back to sign in
      </Link>
    </ActionForm>
  );
}
