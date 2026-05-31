export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";

export type UploadResponse = {
  file_id: string;
  status: string;
  original_filename: string;
  file_size: number;
  expires_at: string;
};

export type ConvertResponse = {
  job_id: string;
  file_id: string;
  status: string;
};

export type ConversionStatus = {
  file_id: string;
  job_id: string | null;
  status: string;
  progress: number;
  output_format: string | null;
  download_url: string | null;
  error_message: string | null;
  expires_at: string;
};

export type HistoryItem = {
  id: string;
  original_filename: string;
  input_format: string;
  output_format: string | null;
  tool: string | null;
  file_size: number;
  status: string;
  progress: number;
  download_url: string | null;
  error_message: string | null;
  created_at: string;
  expired_at: string;
};

export type User = {
  id: string;
  name: string;
  email: string;
  plan: string;
  created_at: string;
};

export type AuthResponse = {
  access_token: string;
  token_type: "bearer";
  user: User;
};

async function request<T>(path: string, init: RequestInit = {}, token?: string): Promise<T> {
  const headers = new Headers(init.headers);
  if (!(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(async () => ({ detail: await response.text().catch(() => "") }));
    const detail = Array.isArray(payload.detail)
      ? payload.detail.map((item: { msg?: string; message?: string }) => item.msg ?? item.message ?? String(item)).join(", ")
      : payload.detail;
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return response.json() as Promise<T>;
}

export function uploadFiles(files: File[], token?: string) {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));
  return request<UploadResponse>("/upload", { method: "POST", body: formData }, token);
}

export function startConversion(fileId: string, tool: string, outputFormat?: string, token?: string) {
  return request<ConvertResponse>(
    "/convert",
    {
      method: "POST",
      body: JSON.stringify({ file_id: fileId, tool, output_format: outputFormat })
    },
    token
  );
}

export function getStatus(jobId: string, token?: string) {
  return request<ConversionStatus>(`/status/${jobId}`, {}, token);
}

export async function downloadBatchZip(items: { file_id: string; token: string }[], token?: string) {
  const headers = new Headers({ "Content-Type": "application/json" });
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_BASE}/download/batch`, {
    method: "POST",
    headers,
    body: JSON.stringify({ items })
  });
  if (!response.ok) {
    const payload = await response.json().catch(async () => ({ detail: await response.text().catch(() => "") }));
    throw new Error(payload.detail || `Request failed with status ${response.status}`);
  }
  return response.blob();
}

export function register(name: string, email: string, password: string) {
  return request<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({ name, email, password })
  });
}

export function login(email: string, password: string) {
  return request<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

export function loginWithGoogle(credential: string) {
  return request<AuthResponse>("/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential })
  });
}

export function getHistory(token: string) {
  return request<HistoryItem[]>("/history", {}, token);
}

export function deleteFile(fileId: string, token: string) {
  return request<void>(`/file/${fileId}`, { method: "DELETE" }, token);
}

export function getAdminStats(token: string) {
  return request<{
    total_users: number;
    conversions_today: number;
    failed_today: number;
    storage_bytes: number;
    queue_status: string;
    recent_failures: HistoryItem[];
  }>("/admin/stats", {}, token);
}
