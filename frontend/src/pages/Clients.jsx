import React, { useEffect, useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ClipboardList, Search, Filter, X } from "lucide-react";
import { useAuth } from "../lib/auth";

const CONCERNS = ["acne", "pigmentation", "scars", "wrinkles", "dryness", "redness", "rosacea", "eczema"];
const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"];

export default function Clients() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(true);

  const q = params.get("q") || "";
  const concern = params.get("concern") || "";
  const skinType = params.get("skin_type") || "";

  useEffect(() => {
    setLoading(true);
    api
      .get("/clients", { params: { q: q || undefined, concern: concern || undefined, skin_type: skinType || undefined } })
      .then((r) => setList(r.data))
      .finally(() => setLoading(false));
  }, [q, concern, skinType]);

  const update = (k, v) => {
    const next = new URLSearchParams(params);
    if (v) next.set(k, v);
    else next.delete(k);
    setParams(next);
  };

  const clearFilters = () => setParams(new URLSearchParams());
  const hasFilters = q || concern || skinType;

  return (
    <div className="space-y-8" data-testid="clients-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow mb-2">Roster</div>
          <h1 className="font-display text-4xl font-medium text-stone-900">Clients</h1>
          <p className="text-stone-500 mt-2 text-sm">
            {list.length} {list.length === 1 ? "result" : "results"} · search and filter your studio's roster.
          </p>
        </div>
        {(user.role === "admin" || user.role === "consultant") && (
          <Button
            data-testid="new-client-btn"
            onClick={() => navigate("/clients/new")}
            className="bg-[#E35D3F] hover:bg-[#D0482B] text-white shadow-none h-10"
          >
            <ClipboardList className="h-4 w-4 mr-2" /> Add client
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="border border-stone-200 rounded-lg bg-white p-4 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <Input
            data-testid="clients-search-input"
            value={q}
            placeholder="Search by name…"
            onChange={(e) => update("q", e.target.value)}
            className="pl-9 h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
          />
        </div>
        <Select value={skinType || "_all"} onValueChange={(v) => update("skin_type", v === "_all" ? "" : v)}>
          <SelectTrigger data-testid="filter-skin-type" className="w-[170px] h-10 border-stone-200">
            <SelectValue placeholder="Skin type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All skin types</SelectItem>
            {SKIN_TYPES.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={concern || "_all"} onValueChange={(v) => update("concern", v === "_all" ? "" : v)}>
          <SelectTrigger data-testid="filter-concern" className="w-[180px] h-10 border-stone-200">
            <SelectValue placeholder="Primary concern" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">All concerns</SelectItem>
            {CONCERNS.map((s) => (
              <SelectItem key={s} value={s} className="capitalize">
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button
            variant="ghost"
            onClick={clearFilters}
            data-testid="clear-filters-btn"
            className="h-10 text-stone-500 hover:text-stone-900"
          >
            <X className="h-4 w-4 mr-1.5" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-6 py-4 label-eyebrow font-semibold">Name</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Skin Type</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Primary Concerns</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Contact</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">First Visit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {loading ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center text-stone-400 text-sm">
                  Loading roster…
                </td>
              </tr>
            ) : list.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-16 text-center">
                  <div className="text-sm text-stone-500 mb-3">No clients match your filters.</div>
                  {hasFilters ? (
                    <Button variant="outline" size="sm" onClick={clearFilters}>
                      <Filter className="h-4 w-4 mr-1.5" /> Reset filters
                    </Button>
                  ) : (
                    (user.role === "admin" || user.role === "consultant") && (
                      <Button size="sm" onClick={() => navigate("/clients/new")} className="bg-[#E35D3F] hover:bg-[#D0482B]">
                        Add your first client
                      </Button>
                    )
                  )}
                </td>
              </tr>
            ) : (
              list.map((c) => (
                <tr
                  key={c.id}
                  data-testid={`client-row-${c.id}`}
                  onClick={() => navigate(`/clients/${c.id}`)}
                  className="cursor-pointer hover:bg-stone-50 transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-medium text-stone-700">
                        {c.full_name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-stone-900">{c.full_name}</div>
                        {c.age && <div className="text-xs text-stone-500">{c.age} yrs</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize text-stone-700">{c.skin_type || "—"}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(c.concerns || []).slice(0, 3).map((cc) => (
                        <span
                          key={cc}
                          className="px-2 py-0.5 rounded-sm bg-[#FFF0ED] text-[#D0482B] text-[11px] font-medium capitalize"
                        >
                          {cc}
                        </span>
                      ))}
                      {(c.concerns?.length || 0) > 3 && (
                        <span className="text-[11px] text-stone-500">+{c.concerns.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-stone-600 text-xs">
                    {c.phone || c.email || "—"}
                  </td>
                  <td className="px-6 py-4 text-stone-600 text-xs">{c.first_consultation_date || "—"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
