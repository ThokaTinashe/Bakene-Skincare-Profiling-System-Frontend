import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { toast } from "sonner";

const CONCERNS = ["acne", "pigmentation", "scars", "wrinkles", "dryness", "redness", "rosacea", "eczema"];
const SKIN_TYPES = ["oily", "dry", "combination", "sensitive", "normal"];

export default function ClientForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    age: "",
    email: "",
    phone: "",
    first_consultation_date: "",
    skin_type: "",
    concerns: [],
    allergies: "",
    medical_notes: "",
    previous_products: "",
    current_routine: "",
    reactions: "",
  });

  useEffect(() => {
    if (editing) {
      api.get(`/clients/${id}`).then((r) =>
        setForm({
          ...r.data,
          age: r.data.age || "",
          concerns: r.data.concerns || [],
        })
      );
    }
  }, [id, editing]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const toggleConcern = (c) =>
    setForm((s) => ({
      ...s,
      concerns: s.concerns.includes(c) ? s.concerns.filter((x) => x !== c) : [...s.concerns, c],
    }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        age: form.age ? parseInt(form.age, 10) : null,
      };
      const res = editing
        ? await api.patch(`/clients/${id}`, payload)
        : await api.post("/clients", payload);
      toast.success(editing ? "Client updated" : "Client added");
      navigate(`/clients/${res.data.id}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8" data-testid="client-form-page">
      <button
        onClick={() => navigate(-1)}
        className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
        data-testid="back-btn"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <div>
        <div className="label-eyebrow mb-2">{editing ? "Edit profile" : "Onboarding"}</div>
        <h1 className="font-display text-4xl font-medium text-stone-900">
          {editing ? form.full_name || "Update client" : "New client profile"}
        </h1>
      </div>

      <form onSubmit={submit} className="space-y-10">
        {/* Personal */}
        <section className="space-y-4">
          <h3 className="font-display text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
            Personal
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Full name *">
              <Input
                data-testid="client-fullname-input"
                required
                value={form.full_name}
                onChange={(e) => set("full_name", e.target.value)}
                className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
              />
            </Field>
            <Field label="Age">
              <Input
                type="number"
                data-testid="client-age-input"
                value={form.age}
                onChange={(e) => set("age", e.target.value)}
                className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
              />
            </Field>
            <Field label="Phone">
              <Input
                data-testid="client-phone-input"
                value={form.phone}
                onChange={(e) => set("phone", e.target.value)}
                className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                data-testid="client-email-input"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
              />
            </Field>
            <Field label="First consultation date">
              <Input
                type="date"
                data-testid="client-first-date-input"
                value={form.first_consultation_date}
                onChange={(e) => set("first_consultation_date", e.target.value)}
                className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
              />
            </Field>
          </div>
        </section>

        {/* Skin */}
        <section className="space-y-4">
          <h3 className="font-display text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
            Skin profile
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Skin type">
              <Select value={form.skin_type || ""} onValueChange={(v) => set("skin_type", v)}>
                <SelectTrigger data-testid="client-skin-type-select" className="h-10 border-stone-200">
                  <SelectValue placeholder="Select skin type" />
                </SelectTrigger>
                <SelectContent>
                  {SKIN_TYPES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Allergies">
              <Input
                data-testid="client-allergies-input"
                value={form.allergies}
                onChange={(e) => set("allergies", e.target.value)}
                className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
              />
            </Field>
          </div>
          <Field label="Primary concerns">
            <div className="flex flex-wrap gap-2 pt-1">
              {CONCERNS.map((c) => {
                const active = form.concerns.includes(c);
                return (
                  <button
                    type="button"
                    key={c}
                    onClick={() => toggleConcern(c)}
                    data-testid={`concern-chip-${c}`}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium capitalize border transition ${
                      active
                        ? "bg-[#E35D3F] text-white border-[#E35D3F]"
                        : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Medical notes">
            <Textarea
              data-testid="client-medical-notes-input"
              value={form.medical_notes}
              onChange={(e) => set("medical_notes", e.target.value)}
              className="min-h-[80px] border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </Field>
        </section>

        {/* Products */}
        <section className="space-y-4">
          <h3 className="font-display text-lg font-medium text-stone-900 border-b border-stone-200 pb-2">
            Product history
          </h3>
          <Field label="Previously used products">
            <Textarea
              data-testid="client-prev-products-input"
              value={form.previous_products}
              onChange={(e) => set("previous_products", e.target.value)}
              className="min-h-[70px] border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </Field>
          <Field label="Current skincare routine">
            <Textarea
              data-testid="client-current-routine-input"
              value={form.current_routine}
              onChange={(e) => set("current_routine", e.target.value)}
              className="min-h-[70px] border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </Field>
          <Field label="Known reactions / sensitivities">
            <Textarea
              data-testid="client-reactions-input"
              value={form.reactions}
              onChange={(e) => set("reactions", e.target.value)}
              className="min-h-[70px] border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </Field>
        </section>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outline" onClick={() => navigate(-1)} className="h-11">
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={saving}
            data-testid="save-client-btn"
            className="h-11 bg-[#E35D3F] hover:bg-[#D0482B] text-white shadow-none px-6"
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving…" : editing ? "Save changes" : "Create profile"}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-stone-700">{label}</Label>
      {children}
    </div>
  );
}
