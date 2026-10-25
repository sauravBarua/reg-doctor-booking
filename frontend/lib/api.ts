const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

export type Patient = { id: number; name: string };
export type Slot = { id: number; startsAt: string; endsAt: string };

export type DoctorResult = {
  id: number;
  name: string;
  bio: string;
  specialty: string;
  clinic: { id: number; name: string; city: string; address: string };
  slots: Slot[];
};

export type SearchResponse =
  | { kind: "emergency"; message: string }
  | {
      kind: "results";
      filters: {
        specialty: string | null;
        city: string | null;
        date: string | null;
        timeOfDay: string | null;
      };
      doctors: DoctorResult[];
      notices: string[];
    };

export type FaqSource = {
  chunkId: number;
  documentTitle: string;
  excerpt: string;
  score: number;
};
export type FaqResponse = {
  kind: "emergency" | "not_found" | "error" | "answer";
  answer: string;
  sources: FaqSource[];
};

export type MessageType =
  | "confirmation"
  | "reminder"
  | "reschedule"
  | "cancellation";

export type AppointmentSummary = {
  appointmentId: number;
  status: "BOOKED" | "CANCELLED";
  type: MessageType;
  details: {
    doctor: string;
    specialty: string;
    clinic: string;
    address: string;
    startsAt: string;
  };
  summary: string;
  message: { subject: string; body: string };
  generatedBy: "ai" | "template";
};

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/api${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    throw new ApiError(0, "Cannot reach the server. Is the API running?");
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, body?.error ?? "Request failed");
  return body as T;
}

const post = (body: unknown): RequestInit => ({
  method: "POST",
  body: JSON.stringify(body),
});

export const api = {
  patients: () => request<Patient[]>("/patients"),
  search: (query: string) =>
    request<SearchResponse>("/assistant/search", post({ query })),
  faq: (question: string) =>
    request<FaqResponse>("/assistant/faq", post({ question })),
  book: (patientId: number, slotId: number) =>
    request<{ id: number }>("/appointments", post({ patientId, slotId })),
  cancel: (id: number) =>
    request<{ id: number }>(`/appointments/${id}`, { method: "DELETE" }),
  summary: (id: number, type?: MessageType) =>
    request<AppointmentSummary>(
      `/appointments/${id}/summary${type ? `?type=${type}` : ""}`,
    ),
};

/** Slot times are stored in UTC and treated as clinic-local in this demo. */
export function formatSlot(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  });
}
