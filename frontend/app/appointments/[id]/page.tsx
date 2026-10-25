"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { api, errorMessage, formatSlot, type AppointmentSummary, type MessageType } from "@/lib/api";

const TYPES: MessageType[] = ["confirmation", "reminder", "reschedule", "cancellation"];

export default function AppointmentPage() {
  const { id } = useParams<{ id: string }>();
  const appointmentId = Number(id);

  const [type, setType] = useState<MessageType | "">("");
  const [reloadKey, setReloadKey] = useState(0);
  const [data, setData] = useState<AppointmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch whenever the id, message type or reload counter changes.
  // State is only set after the request resolves, never synchronously in the effect body.
  useEffect(() => {
    let ignore = false;
    api
      .summary(appointmentId, type || undefined)
      .then((res) => {
        if (ignore) return;
        setData(res);
        setError(null);
      })
      .catch((e) => {
        if (!ignore) setError(errorMessage(e));
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });
    return () => {
      ignore = true;
    };
  }, [appointmentId, type, reloadKey]);

  // Event handlers may set state freely
  function changeType(next: MessageType) {
    setLoading(true);
    setType(next);
  }

  async function cancel() {
    if (!window.confirm("Cancel this appointment?")) return;
    try {
      await api.cancel(appointmentId);
      setLoading(true);
      setType(""); // default message for a cancelled appointment
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <>
      <h1>Appointment #{id}</h1>

      {error && <div className="alert danger" role="alert">{error}</div>}
      {loading && !data && <p>Loading…</p>}

      {data && (
        <>
          <section className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>{data.details.doctor}</strong>
              <span className="badge">{data.status}</span>
            </div>
            <p style={{ margin: "8px 0" }}>
              {data.details.specialty}
              <br />
              {formatSlot(data.details.startsAt)}
              <br />
              {data.details.clinic}, {data.details.address}
            </p>
            <p className="muted" style={{ margin: 0 }}>{data.summary}</p>
          </section>

          <section className="card">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>Message draft</strong>
              <span className="badge">{data.generatedBy === "ai" ? "AI generated" : "template"}</span>
            </div>
            <div className="row" style={{ margin: "8px 0" }}>
              <label htmlFor="type">Type:</label>
              <select
                id="type"
                value={type || data.type}
                onChange={(e) => changeType(e.target.value as MessageType)}
                disabled={loading}
              >
                {TYPES.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <strong>{data.message.subject}</strong>
            <pre className="draft">{data.message.body}</pre>
            <p className="muted" style={{ margin: "8px 0 0" }}>Draft only. Nothing is sent automatically.</p>
          </section>

          <div className="row">
            <button className="danger" onClick={cancel} disabled={data.status === "CANCELLED" || loading}>
              Cancel appointment
            </button>
            <Link href="/">Book another</Link>
          </div>
        </>
      )}
    </>
  );
}