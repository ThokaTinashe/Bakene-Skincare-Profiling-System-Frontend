import React, { useEffect, useState } from "react";
import api from "../lib/api";
import { ScrollText } from "lucide-react";

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/audit-logs")
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-8" data-testid="audit-page">
      <div>
        <div className="label-eyebrow mb-2">Compliance</div>
        <h1 className="font-display text-4xl font-medium text-stone-900">Audit trail</h1>
        <p className="text-stone-500 mt-2 text-sm">
          Every action recorded for POPIA-aligned accountability.
        </p>
      </div>

      <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-6 py-4 label-eyebrow font-semibold">When</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Who</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Action</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Target</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-stone-400 text-sm">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-16 text-center text-stone-400 text-sm">
                  No activity yet.
                </td>
              </tr>
            ) : (
              logs.map((l) => (
                <tr key={l.id} data-testid={`audit-row-${l.id}`}>
                  <td className="px-6 py-3.5 text-stone-600 text-xs tabular-nums">
                    {new Date(l.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-3.5">
                    <div className="text-stone-900 text-sm">{l.user_email}</div>
                    <div className="text-stone-500 text-xs capitalize">{l.user_role}</div>
                  </td>
                  <td className="px-6 py-3.5">
                    <span className="px-2 py-0.5 rounded-sm bg-stone-100 text-stone-700 text-xs font-mono">
                      {l.action}
                    </span>
                  </td>
                  <td className="px-6 py-3.5 text-stone-600 text-xs font-mono break-all">
                    {l.target || "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
