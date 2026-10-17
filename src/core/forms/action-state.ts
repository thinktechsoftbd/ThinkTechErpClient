/** Result shape every Server Action used with <ActionForm> returns. */
export type ActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string>;
};

export const idleState: ActionState = { status: "idle" };

export type FormAction = (previous: ActionState, formData: FormData) => Promise<ActionState>;

export function actionError(message: string, fieldErrors?: Record<string, string>): ActionState {
  return { status: "error", message, fieldErrors };
}

export function actionSuccess(message: string): ActionState {
  return { status: "success", message };
}
