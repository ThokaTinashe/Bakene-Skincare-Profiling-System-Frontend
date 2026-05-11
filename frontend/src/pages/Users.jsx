import React, { useEffect, useState } from "react";
import api, { formatApiError } from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Plus, Trash2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "../lib/auth";

const ROLES = ["admin", "consultant", "viewer"];

export default function Users() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "consultant" });

  const refresh = () => api.get("/users").then((r) => setUsers(r.data));
  useEffect(() => {
    refresh();
  }, []);

  const create = async (e) => {
    e.preventDefault();
    try {
      await api.post("/users", form);
      toast.success("User added");
      setForm({ name: "", email: "", password: "", role: "consultant" });
      setOpen(false);
      refresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const updateRole = async (uid, role) => {
    try {
      await api.patch(`/users/${uid}`, { role });
      toast.success("Role updated");
      refresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  const del = async (uid) => {
    if (!window.confirm("Delete this user?")) return;
    try {
      await api.delete(`/users/${uid}`);
      toast.success("User removed");
      refresh();
    } catch (err) {
      toast.error(formatApiError(err));
    }
  };

  return (
    <div className="space-y-8" data-testid="users-page">
      <div className="flex items-end justify-between">
        <div>
          <div className="label-eyebrow mb-2">Access control</div>
          <h1 className="font-display text-4xl font-medium text-stone-900">Team</h1>
          <p className="text-stone-500 mt-2 text-sm">
            Manage who can view, edit and administer client records.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="new-user-btn" className="bg-[#E35D3F] hover:bg-[#D0482B] text-white shadow-none h-10">
              <Plus className="h-4 w-4 mr-2" /> Add user
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">New team member</DialogTitle>
            </DialogHeader>
            <form onSubmit={create} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-700">Full name</Label>
                <Input
                  required
                  data-testid="user-name-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-700">Email</Label>
                <Input
                  type="email"
                  required
                  data-testid="user-email-input"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-700">Temporary password</Label>
                <Input
                  type="text"
                  required
                  data-testid="user-password-input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="h-10 border-stone-200 focus-visible:ring-[#E35D3F]"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-stone-700">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger data-testid="user-role-select" className="h-10 border-stone-200">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="submit" data-testid="save-user-btn" className="bg-[#E35D3F] hover:bg-[#D0482B] text-white">
                  Create user
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border border-stone-200 rounded-lg bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left">
              <th className="px-6 py-4 label-eyebrow font-semibold">Member</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Email</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Role</th>
              <th className="px-6 py-4 label-eyebrow font-semibold">Joined</th>
              <th className="px-6 py-4 label-eyebrow font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {users.map((u) => (
              <tr key={u.id} data-testid={`user-row-${u.id}`}>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-medium text-stone-700">
                      {u.name?.[0]?.toUpperCase()}
                    </div>
                    <div className="font-medium text-stone-900">{u.name}</div>
                  </div>
                </td>
                <td className="px-6 py-4 text-stone-600">{u.email}</td>
                <td className="px-6 py-4">
                  <Select
                    value={u.role}
                    onValueChange={(v) => updateRole(u.id, v)}
                    disabled={u.id === me.id}
                  >
                    <SelectTrigger
                      data-testid={`role-select-${u.id}`}
                      className="h-8 w-[140px] border-stone-200 capitalize"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="capitalize">
                          {r}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-6 py-4 text-stone-500 text-xs">
                  {u.created_at ? u.created_at.slice(0, 10) : "—"}
                </td>
                <td className="px-6 py-4 text-right">
                  {u.id !== me.id && (
                    <button
                      onClick={() => del(u.id)}
                      data-testid={`delete-user-${u.id}`}
                      className="text-stone-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
