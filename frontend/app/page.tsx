"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  api,
  ApiError,
  errorMessage,
  formatSlot,
  type DoctorResult,
  type Patient,
  type SearchResponse,
  type Slot,
} from "@/lib/api";

const EXAMPLES = [
  "A dermatologist in Lyon next Tuesday morning",
  "A pediatrician in Paris tomorrow afternoon",
  "Any cardiologist",
  "A cardiologist in Lyon next Monday morning",
  "A general practitioner in Paris this afternoon",
  "A skin doctor in Lyon next week",
  "A children's doctor in Paris tomorrow morning",
  "Any doctor available tomorrow",
  "I have a rash, who should I see?",
  "I have chest pain, who should I see?",
];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [result, setResult] = useState<SearchResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState<number | null>(null);
  const [selected, setSelected] = useState<{ doctor: DoctorResult; slot: Slot } | null>(null);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState<string | null>(null);

  useEffect(() => {
    api
      .patients()
      .then((list) => {
        setPatients(list);
        setPatientId(list[0]?.id ?? null);
      })
      .catch((e) => setError(errorMessage(e)));
  }, []);

  async function runSearch(text: string) {
    const q = text.trim();
    if (q.length < 2) return;
    setLoading(true);
    setError(null);
    setSelected(null);
    try {
      setResult(await api.search(q));
      setLastQuery(q);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  async function confirmBooking() {
    if (!selected || patientId === null) return;
    setBooking(true);
    setBookError(null);
    try {
      const appointment = await api.book(patientId, selected.slot.id);
      router.push(`/appointments/${appointment.id}`);
    } catch (e) {
      const message = errorMessage(e);
      if (e instanceof ApiError && e.status === 409) await runSearch(lastQuery); // refresh free slots
      setBookError(message);
    } finally {
      setBooking(false);
    }
  }

  return (
    <>
      <h1>Find a doctor</h1>
      <p className="muted">Describe what you need: specialty, city and when. I can&apos;t give medical advice.</p>

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          void runSearch(query);
        }}
      >
        <label htmlFor="q" hidden>
          Search
        </label>
        <input
          id="q"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. a skin doctor in Lyon next Tuesday morning"
          maxLength={500}
        />
        <button type="submit" disabled={loading || query.trim().length < 2}>
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      <div className="row" style={{ margin: "12px 0 20px" }}>
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            type="button"
            className="chip"
            onClick={() => {
              setQuery(ex);
              void runSearch(ex);
            }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <div className="alert danger" role="alert">{error}</div>}
      {bookError && <div className="alert danger" role="alert">{bookError}</div>}

      {result?.kind === "emergency" && (
        <div className="alert danger" role="alert">{result.message}</div>
      )}

      {result?.kind === "results" && (
        <>
          {result.notices.map((n) => (
            <div key={n} className="alert">{n}</div>
          ))}

          <div className="row" style={{ marginBottom: 12 }}>
            {Object.entries(result.filters)
              .filter(([, v]) => v)
              .map(([k, v]) => (
                <span key={k} className="badge">{k}: {v}</span>
              ))}
          </div>

          {result.doctors.length === 0 && <p>No doctor with free slots matches your request.</p>}

          {result.doctors.map((d) => (
            <article key={d.id} className="card">
              <strong>{d.name}</strong> <span className="badge">{d.specialty}</span>
              <p className="muted" style={{ margin: "4px 0 12px" }}>
                {d.clinic.name}, {d.clinic.address}
              </p>
              {d.slots.length === 0 ? (
                <span className="muted">No free slots.</span>
              ) : (
                <div className="row">
                  {d.slots.map((s) => (
                    <button
                      key={s.id}
                      className="slot secondary"
                      onClick={() => {
                        setSelected({ doctor: d, slot: s });
                        setBookError(null);
                      }}
                    >
                      {formatSlot(s.startsAt)}
                    </button>
                  ))}
                </div>
              )}
            </article>
          ))}
        </>
      )}

      {selected && (
        <section className="card" aria-label="Confirm booking" style={{ borderColor: "var(--accent)" }}>
          <strong>Confirm your appointment</strong>
          <p style={{ margin: "8px 0" }}>
            {selected.doctor.name} ({selected.doctor.specialty})
            <br />
            {formatSlot(selected.slot.startsAt)} at {selected.doctor.clinic.name}
          </p>
          <div className="row">
            <label htmlFor="patient">Patient:</label>
            <select
              id="patient"
              value={patientId ?? ""}
              onChange={(e) => setPatientId(Number(e.target.value))}
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <button onClick={confirmBooking} disabled={booking || patientId === null}>
              {booking ? "Booking…" : "Confirm booking"}
            </button>
            <button className="secondary" onClick={() => setSelected(null)} disabled={booking}>
              Cancel
            </button>
          </div>
        </section>
      )}
    </>
  );
}