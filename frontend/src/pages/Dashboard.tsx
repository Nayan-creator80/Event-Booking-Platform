import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { Calendar, MapPin, Ticket, XCircle, ShieldAlert, Loader2 } from "lucide-react";

interface Booking {
  id: string;
  eventId: string;
  seats: number;
  status: "CONFIRMED" | "CANCELLED";
  createdAt: string;
  event: {
    title: string;
    date: string;
    location: string;
    price: number;
  };
}

export const Dashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  // Query user's bookings
  const { data: bookingsData, isLoading, isError } = useQuery({
    queryKey: ["bookings"],
    queryFn: async () => {
      const response = await api.get("/bookings");
      return response.data.data.bookings as Booking[];
    },
  });

  // Cancel booking mutation
  const cancelMutation = useMutation({
    mutationFn: async (bookingId: string) => {
      const response = await api.put(`/bookings/${bookingId}/cancel`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
  });

  const handleCancel = (bookingId: string) => {
    if (window.confirm("Are you sure you want to cancel this booking? This will restore seats for other customers.")) {
      cancelMutation.mutate(bookingId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-accentBlue animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="max-w-md mx-auto my-12 text-center glass-panel rounded-2xl p-8 space-y-4 border-rose-900/30">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold">Failed to Load Dashboard</h3>
        <p className="text-slate-400 text-sm">We couldn't retrieve your bookings. Please check your network and try again.</p>
      </div>
    );
  }

  const activeBookings = bookingsData?.filter((b) => b.status === "CONFIRMED") || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Welcome Banner */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 relative overflow-hidden bg-gradient-to-r from-slate-900 to-slate-950">
        <div className="absolute top-0 right-0 h-48 w-48 bg-accentPurple/5 blur-3xl rounded-full"></div>
        <div className="space-y-2 relative">
          <span className="text-xs font-semibold text-accentBlue uppercase tracking-wider">User Portal</span>
          <h1 className="text-3xl font-extrabold text-white">Hello, {user?.name || "Member"}!</h1>
          <p className="text-slate-400 text-sm max-w-md">Manage your active event tickets and review your booking history below.</p>
        </div>
      </div>

      {/* Bookings List Section */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight text-white flex items-center space-x-2">
          <Ticket className="h-6 w-6 text-accentBlue" />
          <span>My Reservations ({activeBookings.length} Active)</span>
        </h2>

        {!bookingsData || bookingsData.length === 0 ? (
          <div className="text-center py-16 glass-panel rounded-3xl space-y-4">
            <Ticket className="h-12 w-12 text-slate-700 mx-auto" />
            <h3 className="text-lg font-semibold">No Bookings Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">
              You haven't reserved any tickets yet. Explore our events catalog and find something exciting!
            </p>
            <a
              href="/"
              className="inline-flex rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple px-5 py-2.5 text-sm font-semibold text-white glow-button"
            >
              Browse Events
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {bookingsData.map((booking) => {
              const formattedEventDate = new Date(booking.event.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              });
              const isPast = new Date(booking.event.date) < new Date();
              const isCancelled = booking.status === "CANCELLED";

              return (
                <div
                  key={booking.id}
                  className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between transition-colors ${
                    isCancelled
                      ? "border-slate-800/40 opacity-60 bg-slate-950/20"
                      : "border-slate-800 hover:border-slate-700/80"
                  }`}
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          isCancelled
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            : isPast
                            ? "bg-slate-800/80 border-slate-700 text-slate-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {isCancelled ? "Cancelled" : isPast ? "Ended" : "Confirmed"}
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">
                        ID: {booking.id.substring(0, 8)}...
                      </span>
                    </div>

                    <div className="space-y-2">
                      <h3 className="text-xl font-bold tracking-tight text-white line-clamp-1">
                        {booking.event.title}
                      </h3>
                      <div className="space-y-1.5 text-xs text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Calendar className="h-3.5 w-3.5 text-accentPurple shrink-0" />
                          <span>{formattedEventDate}</span>
                        </div>
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-accentBlue shrink-0" />
                          <span className="truncate">{booking.event.location}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-slate-800/50 pt-4 mt-5 flex items-center justify-between">
                    <div className="text-xs space-y-1">
                      <div className="text-slate-400">
                        Seats Reserved: <span className="font-bold text-slate-200">{booking.seats}</span>
                      </div>
                      <div className="text-slate-400">
                        Total Price:{" "}
                        <span className="font-bold text-accentBlue">
                          {booking.event.price === 0
                            ? "Free"
                            : `₹${(booking.event.price * booking.seats).toFixed(2)}`}
                        </span>
                      </div>
                    </div>

                    {!isCancelled && !isPast && (
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancelMutation.isPending}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-rose-500/20 bg-rose-500/5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                        <span>Cancel Booking</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
