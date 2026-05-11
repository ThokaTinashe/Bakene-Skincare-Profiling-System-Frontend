import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Button } from "../components/ui/button";
import { Sparkles, Lock, Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    navigate("/dashboard", { replace: true });
  }

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const r = await login(email, password);
    setLoading(false);
    if (r.ok) {
      toast.success("Welcome back");
      navigate(location.state?.from?.pathname || "/dashboard", { replace: true });
    } else {
      toast.error(r.error);
    }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.1fr,1fr] bg-white">
      {/* Visual */}
      <div className="hidden lg:block relative overflow-hidden bg-stone-100">
        <img
          src="https://images.unsplash.com/photo-1748543668643-1ada33167539?w=1600&q=85"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-tr from-[#E35D3F]/20 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12 right-12 z-10">
          <div className="flex items-center gap-2 mb-6">
            <div className="h-9 w-9 rounded-md bg-[#E35D3F] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[17px] font-semibold text-stone-900">Dermis</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-600">Skin CRM</div>
            </div>
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-medium text-stone-900 leading-[1.05] max-w-md">
            A private studio for tracking every skin journey.
          </h1>
          <p className="mt-4 text-stone-700 text-sm max-w-md leading-relaxed">
            Capture consultations, compare before & after, and follow each client's progress over months — all in one
            secure, POPIA-aligned workspace.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center px-8 py-12 lg:px-16">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="h-9 w-9 rounded-md bg-[#E35D3F] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="font-display text-lg font-semibold">Dermis</div>
          </div>
          <div className="label-eyebrow mb-3">Sign in</div>
          <h2 className="font-display text-3xl font-medium text-stone-900 mb-2">Welcome back.</h2>
          <p className="text-sm text-stone-500 mb-10">
            Use your studio credentials to access client records.
          </p>

          <form onSubmit={submit} className="space-y-5" data-testid="login-form">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-medium text-stone-700">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  id="email"
                  data-testid="login-email-input"
                  type="email"
                  placeholder="you@studio.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 h-11 border-stone-200 focus-visible:ring-[#E35D3F]"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-medium text-stone-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  id="password"
                  data-testid="login-password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 h-11 border-stone-200 focus-visible:ring-[#E35D3F]"
                />
              </div>
            </div>
            <Button
              type="submit"
              data-testid="login-submit-btn"
              disabled={loading}
              className="w-full h-11 bg-[#E35D3F] hover:bg-[#D0482B] text-white shadow-none group"
            >
              {loading ? "Signing in…" : "Continue"}
              <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-0.5 transition-transform" />
            </Button>
          </form>

          <div className="mt-10 pt-6 border-t border-stone-200">
            <div className="text-xs text-stone-500">
              Default admin (demo): <span className="font-mono text-stone-700">admin@skinprofile.com</span> ·{" "}
              <span className="font-mono text-stone-700">Admin@12345</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
