/** Serializable error details, safe to pass from Server to Client Components. */
export type ApiErrorInfo = {
  status: number;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
};

/** Thrown by apiFetch for any non-success response from ThinkTechErpAPI. */
export class ApiError extends Error {
  readonly status: number;
  readonly path?: string;
  readonly fieldErrors?: Record<string, string>;

  constructor(info: ApiErrorInfo) {
    super(info.message);
    this.name = "ApiError";
    this.status = info.status;
    this.path = info.path;
    this.fieldErrors = info.fieldErrors;
  }

  toInfo(): ApiErrorInfo {
    return { status: this.status, message: this.message, path: this.path, fieldErrors: this.fieldErrors };
  }
}

const defaultMessages: Record<number, string> = {
  400: "The API rejected the request.",
  403: "Your account does not have permission for this action.",
  404: "The requested resource was not found.",
  409: "The request conflicts with existing data.",
  429: "Too many requests. The API allows 60 requests per minute; try again shortly.",
};

function lowerFirst(value: string) {
  return value ? value[0].toLowerCase() + value.slice(1) : value;
}

/** Reads `{ error }` bodies and ASP.NET ProblemDetails into a message and field errors. */
export async function readApiError(response: Response, path: string): Promise<ApiError> {
  let message = defaultMessages[response.status] ??
    (response.status >= 500 ? "The API failed to process the request." : `Request failed (${response.status}).`);
  let fieldErrors: Record<string, string> | undefined;

  try {
    const body = (await response.json()) as {
      error?: string;
      title?: string;
      detail?: string;
      errors?: Record<string, string[]>;
    };
    if (body.errors && typeof body.errors === "object") {
      fieldErrors = {};
      for (const [key, messages] of Object.entries(body.errors)) {
        const field = lowerFirst(key.replace(/^\$\./, ""));
        if (Array.isArray(messages) && messages[0]) fieldErrors[field] = messages[0];
      }
      const first = Object.values(fieldErrors)[0];
      message = first ? `Please correct the highlighted fields. ${first}` : message;
    } else {
      message = body.error ?? body.detail ?? body.title ?? message;
    }
  } catch {
    // Body is empty or not JSON; keep the status-based message.
  }

  return new ApiError({ status: response.status, message, path, fieldErrors });
}
