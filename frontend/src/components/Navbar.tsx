import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { Calendar, User as UserIcon, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { api } from "../api/client";

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await api.post("/auth/logout");
    } catch (err) {
      console.error("Logout failed on server, cleaning client state...");
    } finally {
      clearAuth();
      navigate("/login");
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full glass-panel border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="rounded-lg bg-gradient-to-tr from-accentBlue to-accentPurple p-2 text-white group-hover:scale-105 transition-transform duration-300">
                <Calendar className="h-5 w-5" />
              </div>
              <span className="font-bold text-xl tracking-tight gradient-text">
                NexusEvents
              </span>
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  to="/events"
                  className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Explore Events
                </Link>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {isAuthenticated && user ? (
              <>
                {user.role === "ADMIN" ? (
                  <Link
                    to="/admin"
                    className="flex items-center space-x-1.5 text-accentBlue hover:text-cyan-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Shield className="h-4 w-4" />
                    <span>Admin Panel</span>
                  </Link>
                ) : (
                  <Link
                    to="/dashboard"
                    className="flex items-center space-x-1.5 text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                )}

                <div className="hidden sm:flex items-center space-x-2 text-slate-400 border-l border-slate-800 pl-4 h-6">
                  <UserIcon className="h-4 w-4" />
                  <span className="text-sm font-medium max-w-[120px] truncate">
                    {user.name}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-1 text-slate-400 hover:text-rose-400 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link
                  to="/login"
                  className="text-slate-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="rounded-lg bg-gradient-to-r from-accentBlue to-accentPurple px-4 py-2 text-sm font-medium text-white glow-button"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};
