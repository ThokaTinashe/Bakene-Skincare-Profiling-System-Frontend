import React from "react";
import { Link, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import {
  LayoutGrid,
  Users,
  ClipboardList,
  ScrollText,
  UserCog,
  LogOut,
  Sparkles,
  Search,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

const NAV = [
  { to: "/dashboard", label: "Overview", icon: LayoutGrid, roles: ["admin", "consultant", "viewer"] },
  { to: "/clients", label: "Clients", icon: Users, roles: ["admin", "consultant", "viewer"] },
  { to: "/audit-logs", label: "Audit Trail", icon: ScrollText, roles: ["admin"] },
  { to: "/users", label: "Team", icon: UserCog, roles: ["admin"] },
];

export default function AppLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const filteredNav = NAV.filter((n) => n.roles.includes(user.role));

  const handleSearch = (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (q) navigate(`/clients?q=${encodeURIComponent(q)}`);
  };

  return (
    <div className="min-h-screen flex bg-[#FAFAFA]">
      {/* Sidebar */}
      <aside
        data-testid="sidebar"
        className="w-64 shrink-0 border-r border-stone-200 bg-white flex flex-col"
      >
        <div className="px-6 py-7 border-b border-stone-200">
          <Link to="/dashboard" className="flex items-center gap-2.5" data-testid="brand-link">
            <div className="h-9 w-9 rounded-md bg-[#E35D3F] flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-white" strokeWidth={2.5} />
            </div>
            <div className="leading-tight">
              <div className="font-display text-[17px] font-semibold text-stone-900">Dermis</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-stone-500">Skin CRM</div>
            </div>
          </Link>
        </div>
        <nav className="flex-1 px-3 py-6 space-y-1">
          {filteredNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              data-testid={`nav-${item.label.toLowerCase().replace(/\s/g, "-")}`}
              className={({ isActive }) =>
                `group flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                  isActive
                    ? "bg-[#FFF0ED] text-[#D0482B] font-medium"
                    : "text-stone-600 hover:bg-stone-50 hover:text-stone-900"
                }`
              }
              end={item.to === "/dashboard"}
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-6">
          <div className="px-3 py-3 rounded-md bg-stone-50 border border-stone-200">
            <div className="label-eyebrow mb-1">Signed in</div>
            <div className="text-sm font-medium text-stone-900 truncate" data-testid="sidebar-user-name">
              {user.name}
            </div>
            <div className="text-xs text-stone-500 capitalize">{user.role}</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-stone-200 bg-white px-8 flex items-center justify-between">
          <form onSubmit={handleSearch} className="flex-1 max-w-md relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
            <Input
              name="q"
              data-testid="global-search-input"
              placeholder="Search clients by name…"
              className="pl-9 h-10 border-stone-200 bg-stone-50 focus-visible:ring-[#E35D3F] focus-visible:bg-white"
              defaultValue={new URLSearchParams(location.search).get("q") || ""}
            />
          </form>
          <div className="flex items-center gap-3">
            {(user.role === "admin" || user.role === "consultant") && (
              <Button
                data-testid="header-new-client-btn"
                onClick={() => navigate("/clients/new")}
                className="bg-[#E35D3F] hover:bg-[#D0482B] text-white h-10 rounded-md px-4 shadow-none"
              >
                <ClipboardList className="h-4 w-4 mr-2" /> New Client
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  data-testid="header-user-menu"
                  className="h-10 w-10 rounded-full bg-stone-100 border border-stone-200 flex items-center justify-center text-sm font-medium text-stone-700 hover:border-[#E35D3F] transition"
                >
                  {user.name?.[0]?.toUpperCase() || "U"}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-sm font-medium">{user.name}</div>
                  <div className="text-xs text-stone-500">{user.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  data-testid="logout-btn"
                  onClick={async () => {
                    await logout();
                    navigate("/login");
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="px-8 py-8 max-w-[1400px] mx-auto w-full animate-fade-up">{children}</div>
        </main>
      </div>
    </div>
  );
}
