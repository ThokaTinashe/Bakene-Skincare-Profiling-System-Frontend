import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../lib/api";
import { Users, ClipboardList, Camera, TrendingUp, ArrowUpRight } from "lucide-react";

function StatTile({ label, value, icon: Icon, accent }) {
  return (
    <div className="border border-stone-200 rounded-lg p-6 bg-white hover:border-stone-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="label-eyebrow">{label}</div>
        <div className={`h-8 w-8 rounded-md flex items-center justify-center ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-4 font-display text-4xl font-medium text-stone-900 tabular-nums" data-testid={`stat-${label.toLowerCase().replace(/\s/g, "-")}`}>
        {value}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    api.get("/dashboard/stats").then((r) => setStats(r.data)).catch(() => setStats(false));
  }, []);

  if (stats === null)
    return <div className="text-stone-500 text-sm">Loading…</div>;
  if (stats === false)
    return <div className="text-stone-500 text-sm">Couldn't load dashboard.</div>;

  return (
    <div className="space-y-10" data-testid="dashboard-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow mb-2">Overview</div>
          <h1 className="font-display text-4xl font-medium text-stone-900">
            Studio at a glance.
          </h1>
          <p className="text-stone-500 mt-2 text-sm max-w-lg">
            A live read-out of every skin journey under your care — clients, consultations, and visual progress logged
            today.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Active Clients"
          value={stats.total_clients}
          icon={Users}
          accent="bg-[#FFF0ED] text-[#D0482B]"
        />
        <StatTile
          label="Consultations"
          value={stats.total_consultations}
          icon={ClipboardList}
          accent="bg-stone-100 text-stone-700"
        />
        <StatTile
          label="Images Stored"
          value={stats.total_images}
          icon={Camera}
          accent="bg-stone-100 text-stone-700"
        />
        <StatTile
          label="New / 30 days"
          value={stats.new_clients_30d}
          icon={TrendingUp}
          accent="bg-emerald-50 text-emerald-700"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent consultations */}
        <div className="lg:col-span-2 border border-stone-200 rounded-lg bg-white">
          <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between">
            <div>
              <div className="label-eyebrow mb-1">Latest</div>
              <h3 className="font-display text-xl font-medium">Recent consultations</h3>
            </div>
            <Link to="/clients" className="text-xs font-medium text-[#D0482B] hover:underline inline-flex items-center gap-1">
              View clients <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {stats.recent_consultations.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-stone-500">
              No consultations logged yet.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {stats.recent_consultations.map((c) => (
                <Link
                  key={c.id}
                  to={`/clients/${c.client_id}`}
                  data-testid={`recent-consult-${c.id}`}
                  className="flex items-center gap-4 px-6 py-4 hover:bg-stone-50 transition-colors"
                >
                  <div className="h-10 w-10 rounded-md bg-[#FFF0ED] flex items-center justify-center text-[#D0482B] text-xs font-semibold tabular-nums">
                    #{c.visit_number}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-stone-900 truncate">{c.client_name}</div>
                    <div className="text-xs text-stone-500 truncate">
                      {c.treatment || "Consultation"} · {c.visit_date}
                    </div>
                  </div>
                  <div className="text-xs text-stone-400 hidden sm:block">{c.created_by_name}</div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Recent clients */}
        <div className="border border-stone-200 rounded-lg bg-white">
          <div className="px-6 py-5 border-b border-stone-200">
            <div className="label-eyebrow mb-1">New</div>
            <h3 className="font-display text-xl font-medium">Latest clients</h3>
          </div>
          {stats.recent_clients.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-stone-500">
              No clients yet. <Link to="/clients/new" className="text-[#D0482B] hover:underline">Add one</Link>.
            </div>
          ) : (
            <div className="divide-y divide-stone-100">
              {stats.recent_clients.map((c) => (
                <Link
                  key={c.id}
                  to={`/clients/${c.id}`}
                  className="flex items-center gap-3 px-6 py-4 hover:bg-stone-50 transition-colors"
                  data-testid={`recent-client-${c.id}`}
                >
                  <div className="h-9 w-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-medium text-stone-700">
                    {c.full_name?.[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-stone-900 truncate">{c.full_name}</div>
                    <div className="text-xs text-stone-500 capitalize">{c.skin_type || "—"}</div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
