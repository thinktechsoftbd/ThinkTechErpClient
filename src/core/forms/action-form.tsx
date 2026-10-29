"use client";

import { LoaderCircle } from "lucide-react";
import {
  createContext,
  startTransition,
  use,
  useActionState,
  useEffect,
  useEffectEvent,
  useRef,
  type ReactNode,
} from "react";
import { Alert } from "@/core/ui/alert";
import { buttonClasses } from "@/core/ui/button";
import { idleState, type ActionState, type FormAction } from "./action-state";

const FormStateContext = createContext<{ state: ActionState; pending: boolean }>({
  state: idleState,
  pending: false,
});

/**
 * A form bound to a Server Action. Submits through a transition (instead of the
 * native form action) so field values survive a validation error.
 */
export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess = false,
  onSuccess,
}: {
  action: FormAction;
  children: ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
  /** Called once per successful submit, e.g. to close the dialog holding the form. */
  onSuccess?: () => void;
}) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const formRef = useRef<HTMLFormElement>(null);
  const handleSuccess = useEffectEvent(() => {
    if (resetOnSuccess) formRef.current?.reset();
    onSuccess?.();
  });

  useEffect(() => {
    if (state.status === "success") handleSuccess();
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className}
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      <FormStateContext value={{ state, pending }}>{children}</FormStateContext>
    </form>
  );
}

export function useFormState() {
  return use(FormStateContext);
}

export function FormMessage({ className }: { className?: string }) {
  const { state } = useFormState();
  if (state.status === "idle" || !state.message) return null;
  return (
    <Alert tone={state.status === "error" ? "error" : "success"} className={className}>
      {state.message}
    </Alert>
  );
}

export function FieldError({ name }: { name: string }) {
  const { state } = useFormState();
  const message = state.fieldErrors?.[name];
  if (!message) return null;
  return <p className="mt-1.5 text-xs text-red-600 dark:text-red-400">{message}</p>;
}

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "danger" | "outline";
  className?: string;
}) {
  const { pending } = useFormState();
  return (
    <button type="submit" disabled={pending} className={buttonClasses(variant, "md", className)}>
      {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
      {pending ? (pendingLabel ?? "Saving…") : children}
    </button>
  );
}
