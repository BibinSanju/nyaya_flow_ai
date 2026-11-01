export interface StoredUser {
  id?: string;
  fullName?: string;
  name?: string;
  email?: string;
  phone?: string;
  role?: string;
  idProof?: string;
  jurisdiction?: string;
  [key: string]: unknown;
}

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("nyayaflow_user");
    return raw ? (JSON.parse(raw) as StoredUser) : null;
  } catch {
    return null;
  }
}

export function signOut() {
  if (typeof window === "undefined") return;
  localStorage.removeItem("nyayaflow_token");
  localStorage.removeItem("nyayaflow_user");
  window.location.href = "/auth";
}

export function openAssistant() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("open-nyayaflow-chat"));
}
