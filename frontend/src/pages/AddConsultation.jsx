import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Textarea } from "../components/ui/textarea";
import { ArrowLeft, Save, Upload, X, Plus } from "lucide-react";
import { toast } from "sonner";

function ImageUploader({ kind, clientId, items, setItems }) {
  const [busy, setBusy] = useState(false);

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setBusy(true);
    try {
      for (const f of files) {
        const form = new FormData();
        form.append("file", f);
        form.append("client_id", clientId);
        form.append("kind", kind);
        const r = await api.post("/images/upload", form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        const previewUrl = URL.createObjectURL(f);
        setItems((s) => [...s, { id: r.data.id, previewUrl }]);
      }
      toast.success(`${files.length} ${kind} image${files.length > 1 ? "s" : ""} uploaded`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setBusy(false);
      e.target.value = "";
    }
  };

  const remove = (id) => setItems((s) => s.filter((x) => x.id !== id));

  const accent = kind === "before" ? "border-stone-300" : "border-[#E35D3F]";
  const labelColor = kind === "before" ? "text-stone-600" : "text-[#D0482B]";

  return (
    <div>
      <div className={`label-eyebrow mb-3 ${labelColor}`}>
        {kind === "before" ? "Before" : "After"} images
      </div>
      <div className="grid grid-cols-3 gap-2">
        {items.map((it) => (
          <div key={it.id} className="relative aspect-square rounded-md overflow-hidden border border-stone-200">
            <img src={it.previewUrl} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => remove(it.id)}
              data-testid={`remove-${kind}-${it.id}`}
              className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
        <label
          className={`aspect-square rounded-md border-2 border-dashed ${accent} flex flex-col items-center justify-center text-stone-500 cursor-pointer hover:bg-stone-50 transition ${
            busy ? "opacity-50" : ""
          }`}
          data-testid={`upload-${kind}-trigger`}
        >
          <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} disabled={busy} />
          <Plus className="h-5 w-5 mb-1" />
          <span className="text-[11px]">{busy ? "Uploading…" : "Add"}</span>
        </label>
      </div>
    </div>
  );
}

export default function AddConsultation() {
  const { id: clientId } = useParams();
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    visit_date: new Date().toISOString().slice(0, 10),
    treatment: "",
    notes: "",
    recommendations: "",
    follow_up: "",
    productInput: "",
    products_used: [],
  });
  const [beforeImgs, setBeforeImgs] = useState([]);
  const [afterImgs, setAfterImgs] = useState([]);

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const addProduct = () => {
    const p = form.productInput.trim();
    if (!p) return;
    set("products_used", [...form.products_used, p]);
    set("productInput", "");
  };

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post(`/clients/${clientId}/consultations`, {
        visit_date: form.visit_date,
        treatment: form.treatment || null,
        notes: form.notes || null,
        recommendations: form.recommendations || null,
        follow_up: form.follow_up || null,
        products_used: form.products_used,
        before_image_ids: beforeImgs.map((i) => i.id),
        after_image_ids: afterImgs.map((i) => i.id),
      });
      // free preview urls
      [...beforeImgs, ...afterImgs].forEach((i) => i.previewUrl && URL.revokeObjectURL(i.previewUrl));
      toast.success("Consultation logged");
      navigate(`/clients/${clientId}`);
    } catch (err) {
      toast.error(formatApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8" data-testid="add-consultation-page">
      <button
        onClick={() => navigate(`/clients/${clientId}`)}
        className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Back to client
      </button>
      <div>
        <div className="label-eyebrow mb-2">New visit</div>
        <h1 className="font-display text-4xl font-medium text-stone-900">Log consultation</h1>
        <p className="text-stone-500 mt-2 text-sm max-w-lg">
          Record notes, treatments and capture before / after images for this session.
        </p>
      </div>

      <form onSubmit={submit} className="space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-700">Visit date *</Label>
            <Input
              type="date"
              required
              data-testid="visit-date-input"
              value={form.visit_date}
              onChange={(e) => set("visit_date", e.target.value)}
              className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-700">Treatment performed</Label>
            <Input
              data-testid="treatment-input"
              value={form.treatment}
              placeholder="e.g. Chemical peel, HydraFacial…"
              onChange={(e) => set("treatment", e.target.value)}
              className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </div>
        </section>

        <section className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-700">Notes</Label>
            <Textarea
              data-testid="notes-input"
              value={form.notes}
              placeholder="Observations, skin response, areas of concern…"
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-[110px] border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-700">Recommendations</Label>
            <Textarea
              data-testid="recommendations-input"
              value={form.recommendations}
              onChange={(e) => set("recommendations", e.target.value)}
              className="min-h-[80px] border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-stone-700">Follow-up</Label>
            <Input
              data-testid="follow-up-input"
              value={form.follow_up}
              placeholder="e.g. Re-evaluate in 4 weeks"
              onChange={(e) => set("follow_up", e.target.value)}
              className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
            />
          </div>
        </section>

        {/* Products */}
        <section className="space-y-2">
          <Label className="text-xs font-medium text-stone-700">Products used</Label>
          <div className="flex gap-2">
            <Input
              data-testid="product-input"
              value={form.productInput}
              onChange={(e) => set("productInput", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addProduct();
                }
              }}
              placeholder="Type a product and press Enter"
              className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
            />
            <Button type="button" variant="outline" onClick={addProduct} className="h-10" data-testid="add-product-btn">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {form.products_used.map((p, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-stone-100 text-stone-700 text-xs"
              >
                {p}
                <button
                  type="button"
                  onClick={() => set("products_used", form.products_used.filter((_, i) => i !== idx))}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </section>

        {/* Images */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-200">
          <ImageUploader kind="before" clientId={clientId} items={beforeImgs} setItems={setBeforeImgs} />
          <ImageUploader kind="after" clientId={clientId} items={afterImgs} setItems={setAfterImgs} />
        </section>

        <div className="flex justify-end gap-3 pt-2 border-t border-stone-200">
          <Button type="button" variant="outline" onClick={() => navigate(`/clients/${clientId}`)} className="h-11">
            Cancel
          </Button>
          <Button
            type="submit"
            data-testid="save-consultation-btn"
            disabled={saving}
            className="h-11 bg-[#E35D3F] hover:bg-[#D0482B] text-white shadow-none px-6"
          >
            <Save className="h-4 w-4 mr-2" /> {saving ? "Saving…" : "Save consultation"}
          </Button>
        </div>
      </form>
    </div>
  );
}
