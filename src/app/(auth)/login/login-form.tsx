"use client";

import { Eye, EyeOff } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { loginAction } from "@/core/auth/actions";
import { ActionForm, FormMessage, SubmitButton } from "@/core/forms/action-form";
import { Field, Input } from "@/core/forms/fields";
import { Alert } from "@/core/ui/alert";

/** Carries ?next= through the login so users land where they were going. */
function NextField() {
  const next = useSearchParams().get("next") ?? "";
  return <input type="hidden" name="next" value={next} />;
}

export function ExpiredNotice() {
  const expired = useSearchParams().has("expired");
  if (!expired) return null;
  return (
    <Alert tone="warning" className="mb-5">
      Your session has ended. Please sign in again.
    </Alert>
  );
}

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <ActionForm action={loginAction} className="space-y-5">
      <Suspense>
        <NextField />
      </Suspense>
      <FormMessage />
      <Field label="User name" name="userName" required>
        <Input id="userName" name="userName" autoComplete="username" placeholder="Enter your user name" required autoFocus />
      </Field>
      <Field label="Password" name="password" required>
        <div className="relative">
          <Input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="pr-12"
            required
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
      <SubmitButton pendingLabel="Signing in…" className="w-full">
        Sign in
      </SubmitButton>
    </ActionForm>
  );
}
