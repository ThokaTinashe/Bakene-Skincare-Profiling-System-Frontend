import React, { useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import AuthImage from "../components/AuthImage";
import BeforeAfterCompare from "../components/BeforeAfterCompare";
import {
  ArrowLeft,
  Pencil,
  Plus,
  Mail,
  Phone,
  Calendar,
  Heart,
  Pill,
  AlertCircle,
  Trash2,
  Layers,
} from "lucide-react";
import { useAuth } from "../lib/auth";
import { toast } from "sonner";

export default function ClientProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [client, setClient] = useState(null);
  const [consultations, setConsultations] = useState([]);
  const [images, setImages] = useState([]);
  const [zoomId, setZoomId] = useState(null);
  const [compareIds, setCompareIds] = useState(null); // {before, after}

  const canEdit = user.role === "admin" || user.role === "consultant";

  const refresh = async () => {
    const [c, cs, im] = await Promise.all([
      api.get(`/clients/${id}`),
      api.get(`/clients/${id}/consultations`),
      api.get(`/images`, { params: { client_id: id } }),
    ]);
    setClient(c.data);
    setConsultations(cs.data);
    setImages(im.data);
    // default compare = newest before + after
    const before = im.data.find((i) => i.kind === "before");
    const after = im.data.find((i) => i.kind === "after");
    if (before && after) setCompareIds({ before: before.id, after: after.id });
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const deleteConsult = async (cid) => {
    if (!window.confirm("Delete this consultation?")) return;
    await api.delete(`/consultations/${cid}`);
    toast.success("Consultation removed");
    refresh();
  };

  if (!client) return <div className="text-sm text-stone-500">Loading client…</div>;

  return (
    <div className="space-y-10" data-testid="client-profile-page">
      <button
        onClick={() => navigate("/clients")}
        className="text-sm text-stone-500 hover:text-stone-900 inline-flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> All clients
      </button>

      {/* Header */}
      <div className="border-b border-stone-200 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
        <div className="flex items-center gap-5">
          <div className="h-20 w-20 rounded-full bg-[#FFF0ED] border border-[#FFD7CE] flex items-center justify-center text-2xl font-medium text-[#D0482B] font-display">
            {client.full_name?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="label-eyebrow mb-1.5">Client #{client.id.slice(0, 6)}</div>
            <h1 className="font-display text-4xl md:text-5xl font-medium text-stone-900 leading-tight">
              {client.full_name}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm text-stone-500">
              {client.age && <span>{client.age} years</span>}
              {client.skin_type && <span className="capitalize">· {client.skin_type} skin</span>}
              {client.first_consultation_date && (
                <span className="inline-flex items-center gap-1">
                  · <Calendar className="h-3.5 w-3.5" /> First visit {client.first_consultation_date}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <>
              <Button
                variant="outline"
                onClick={() => navigate(`/clients/${id}/edit`)}
                data-testid="edit-client-btn"
                className="h-10"
              >
                <Pencil className="h-4 w-4 mr-2" /> Edit profile
              </Button>
              <Button
                onClick={() => navigate(`/clients/${id}/consultations/new`)}
                data-testid="add-consultation-btn"
                className="h-10 bg-[#E35D3F] hover:bg-[#D0482B] text-white shadow-none"
              >
                <Plus className="h-4 w-4 mr-2" /> New consultation
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr,360px] gap-10">
        {/* LEFT: Timeline + Compare */}
        <div className="space-y-10 min-w-0">
          {/* Before / After compare hero */}
          {compareIds && (
            <section>
              <div className="flex items-end justify-between mb-4">
                <div>
                  <div className="label-eyebrow mb-1">Visual progress</div>
                  <h3 className="font-display text-2xl font-medium">Before / After</h3>
                </div>
                <div className="text-xs text-stone-500">Drag the slider to compare</div>
              </div>
              <div className="max-w-xl">
                <BeforeAfterCompare beforeId={compareIds.before} afterId={compareIds.after} />
              </div>
            </section>
          )}

          {/* Timeline */}
          <section>
            <div className="flex items-end justify-between mb-6">
              <div>
                <div className="label-eyebrow mb-1">Journey</div>
                <h3 className="font-display text-2xl font-medium">Consultation timeline</h3>
              </div>
              <div className="text-xs text-stone-500">{consultations.length} visits</div>
            </div>

            {consultations.length === 0 ? (
              <div className="border border-dashed border-stone-300 rounded-lg p-10 text-center">
                <div className="text-sm text-stone-500 mb-3">No consultations recorded yet.</div>
                {canEdit && (
                  <Button
                    onClick={() => navigate(`/clients/${id}/consultations/new`)}
                    className="bg-[#E35D3F] hover:bg-[#D0482B] text-white"
                  >
                    <Plus className="h-4 w-4 mr-2" /> Log first consultation
                  </Button>
                )}
              </div>
            ) : (
              <div className="relative pl-8 timeline-line">
                {consultations.map((c) => {
                  const before = images.filter((i) => c.before_image_ids?.includes(i.id));
                  const after = images.filter((i) => c.after_image_ids?.includes(i.id));
                  return (
                    <div key={c.id} data-testid={`consult-${c.id}`} className="relative pb-10 last:pb-0">
                      <div className="absolute left-[-22px] top-1 h-3 w-3 rounded-full bg-[#E35D3F] ring-4 ring-[#FFF0ED]" />
                      <div className="border border-stone-200 rounded-lg bg-white">
                        <div className="px-6 py-4 border-b border-stone-100 flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="px-2 py-0.5 rounded-sm bg-stone-100 text-stone-700 text-[11px] font-semibold">
                              Visit #{c.visit_number}
                            </span>
                            <span className="text-sm font-medium text-stone-900">{c.visit_date}</span>
                            {c.treatment && (
                              <span className="text-sm text-stone-600">· {c.treatment}</span>
                            )}
                          </div>
                          {canEdit && (
                            <button
                              onClick={() => deleteConsult(c.id)}
                              data-testid={`delete-consult-${c.id}`}
                              className="text-stone-400 hover:text-red-600 transition"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                        <div className="px-6 py-4 space-y-3 text-sm">
                          {c.notes && (
                            <div>
                              <div className="label-eyebrow mb-1">Notes</div>
                              <p className="text-stone-700 whitespace-pre-wrap">{c.notes}</p>
                            </div>
                          )}
                          {c.recommendations && (
                            <div>
                              <div className="label-eyebrow mb-1">Recommendations</div>
                              <p className="text-stone-700 whitespace-pre-wrap">{c.recommendations}</p>
                            </div>
                          )}
                          {c.products_used?.length > 0 && (
                            <div>
                              <div className="label-eyebrow mb-1">Products</div>
                              <div className="flex flex-wrap gap-1.5">
                                {c.products_used.map((p, idx) => (
                                  <span key={idx} className="px-2 py-0.5 rounded-sm bg-stone-100 text-stone-700 text-xs">
                                    {p}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {c.follow_up && (
                            <div>
                              <div className="label-eyebrow mb-1">Follow-up</div>
                              <p className="text-stone-700">{c.follow_up}</p>
                            </div>
                          )}
                          {(before.length > 0 || after.length > 0) && (
                            <div className="pt-2">
                              <div className="grid grid-cols-2 gap-3 max-w-md">
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 mb-2">
                                    Before
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {before.map((im) => (
                                      <button
                                        key={im.id}
                                        onClick={() => setZoomId(im.id)}
                                        data-testid={`zoom-before-${im.id}`}
                                      >
                                        <AuthImage
                                          imageId={im.id}
                                          alt="Before"
                                          className="w-full aspect-square object-cover rounded-sm border border-stone-200 hover:border-[#E35D3F] transition"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#D0482B] mb-2">
                                    After
                                  </div>
                                  <div className="grid grid-cols-2 gap-1.5">
                                    {after.map((im) => (
                                      <button
                                        key={im.id}
                                        onClick={() => setZoomId(im.id)}
                                        data-testid={`zoom-after-${im.id}`}
                                      >
                                        <AuthImage
                                          imageId={im.id}
                                          alt="After"
                                          className="w-full aspect-square object-cover rounded-sm border border-stone-200 hover:border-[#E35D3F] transition"
                                        />
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                              {before[0] && after[0] && (
                                <button
                                  onClick={() => setCompareIds({ before: before[0].id, after: after[0].id })}
                                  className="mt-3 text-xs text-[#D0482B] font-medium hover:underline inline-flex items-center gap-1"
                                  data-testid={`compare-visit-${c.id}`}
                                >
                                  <Layers className="h-3 w-3" /> Compare in slider
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT: Profile panel */}
        <aside className="space-y-6">
          <Panel title="Contact" icon={Phone}>
            <Row icon={Phone} label="Phone" value={client.phone} />
            <Row icon={Mail} label="Email" value={client.email} />
          </Panel>

          <Panel title="Skin" icon={Heart}>
            <Row label="Skin type" value={client.skin_type} capitalize />
            <div>
              <div className="label-eyebrow mb-2">Concerns</div>
              <div className="flex flex-wrap gap-1.5">
                {(client.concerns || []).length === 0 ? (
                  <span className="text-stone-400 text-sm">—</span>
                ) : (
                  client.concerns.map((c) => (
                    <span
                      key={c}
                      className="px-2 py-0.5 rounded-sm bg-[#FFF0ED] text-[#D0482B] text-xs font-medium capitalize"
                    >
                      {c}
                    </span>
                  ))
                )}
              </div>
            </div>
            <Row icon={AlertCircle} label="Allergies" value={client.allergies} />
            <Row label="Medical notes" value={client.medical_notes} block />
          </Panel>

          <Panel title="Products" icon={Pill}>
            <Row label="Previously used" value={client.previous_products} block />
            <Row label="Current routine" value={client.current_routine} block />
            <Row label="Sensitivities" value={client.reactions} block />
          </Panel>
        </aside>
      </div>

      {/* Zoom dialog */}
      <Dialog open={!!zoomId} onOpenChange={(v) => !v && setZoomId(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Image preview</DialogTitle>
          </DialogHeader>
          {zoomId && <AuthImage imageId={zoomId} alt="Zoom" className="w-full max-h-[80vh] object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Panel({ title, children }) {
  return (
    <div className="border border-stone-200 rounded-lg bg-white">
      <div className="px-5 py-4 border-b border-stone-100">
        <div className="label-eyebrow">{title}</div>
      </div>
      <div className="px-5 py-4 space-y-3 text-sm">{children}</div>
    </div>
  );
}

function Row({ icon: Icon, label, value, capitalize, block }) {
  if (!value) value = "—";
  return (
    <div className={block ? "" : "flex items-start gap-3"}>
      {Icon && !block && <Icon className="h-3.5 w-3.5 mt-1 text-stone-400 shrink-0" />}
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500 mb-0.5">{label}</div>
        <div className={`text-stone-800 text-sm ${capitalize ? "capitalize" : ""} whitespace-pre-wrap break-words`}>
          {value}
        </div>
      </div>
    </div>
  );
}
