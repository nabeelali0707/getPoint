export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function extractErrorMessage(data: Record<string, unknown>): string {
  if (typeof data.message === "string") return data.message;
  if (typeof data.error === "string") return data.error;

  const details = data.details as { fieldErrors?: Record<string, string[]> } | undefined;
  const fieldErrors = details?.fieldErrors;
  if (fieldErrors) {
    for (const messages of Object.values(fieldErrors)) {
      if (messages?.[0]) return messages[0];
    }
  }

  return "Request failed.";
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const url = path.startsWith("http") ? path : `${apiBaseUrl}${path}`;
  let res: Response;

  const isFormData = typeof window !== "undefined" && init?.body instanceof FormData;

  try {
    res = await fetch(url, {
      ...init,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...init?.headers,
      },
    });
  } catch {
    throw new ApiError(0, "Unable to reach the server. Make sure the API is running.");
  }

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;

  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(data));
  }

  return data as T;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("accessToken");
}

export async function authFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken();
  return apiFetch<T>(path, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
}
