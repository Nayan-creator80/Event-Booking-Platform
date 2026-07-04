import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import {
  Ticket,
  IndianRupee,
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Loader2,
} from "lucide-react";

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  price: number;
  capacity: number;
  ticketsSold: number;
  imageUrl?: string;
}

interface Booking {
  id: string;
  seats: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
  event: {
    title: string;
  };
}

export const AdminDashboard: React.FC = () => {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"events" | "bookings">("events");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formDate, setFormDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formPrice, setFormPrice] = useState(0);
  const [formCapacity, setFormCapacity] = useState(10);
  const [formImageUrl, setFormImageUrl] = useState("");
  const [formError, setFormError] = useState("");

  // Query Stats
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: ["adminStats"],
    queryFn: async () => {
      const response = await api.get("/admin/stats");
      return response.data.data;
    },
  });

  // Query Events
  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["adminEvents"],
    queryFn: async () => {
      const response = await api.get("/events?limit=100");
      return response.data.data.events as Event[];
    },
  });

  // Query Bookings
  const { data: bookingsData, isLoading: bookingsLoading } = useQuery({
    queryKey: ["adminBookings"],
    queryFn: async () => {
      const response = await api.get("/bookings?limit=100");
      return response.data.data.bookings as Booking[];
    },
  });

  // Create Event mutation
  const createMutation = useMutation({
    mutationFn: async (newEvent: any) => {
      const response = await api.post("/events", newEvent);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || "Failed to create event");
    },
  });

  // Update Event mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await api.put(`/events/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      closeModal();
    },
    onError: (err: any) => {
      setFormError(err.response?.data?.error?.message || "Failed to update event");
    },
  });

  // Delete Event mutation
  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const response = await api.delete(`/events/${eventId}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["adminEvents"] });
      queryClient.invalidateQueries({ queryKey: ["adminStats"] });
      queryClient.invalidateQueries({ queryKey: ["adminBookings"] });
    },
  });

  const openCreateModal = () => {
    setEditingEvent(null);
    setFormTitle("");
    setFormDescription("");
    setFormDate("");
    setFormLocation("");
    setFormPrice(0);
    setFormCapacity(10);
    setFormImageUrl("");
    setFormError("");
    setIsModalOpen(true);
  };

  const openEditModal = (event: Event) => {
    setEditingEvent(event);
    setFormTitle(event.title);
    setFormDescription(event.description);
    // Convert date to format input datetime-local understands
    const d = new Date(event.date);
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    setFormDate(d.toISOString().slice(0, 16));
    setFormLocation(event.location);
    setFormPrice(event.price);
    setFormCapacity(event.capacity);
    setFormImageUrl(event.imageUrl || "");
    setFormError("");
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEvent(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const eventPayload = {
      title: formTitle,
      description: formDescription,
      date: new Date(formDate).toISOString(),
      location: formLocation,
      price: Number(formPrice),
      capacity: Number(formCapacity),
      imageUrl: formImageUrl || null,
    };

    if (editingEvent) {
      updateMutation.mutate({ id: editingEvent.id, data: eventPayload });
    } else {
      createMutation.mutate(eventPayload);
    }
  };

  const handleDelete = (eventId: string) => {
    if (window.confirm("Are you sure you want to delete this event? This will cascade delete all bookings related to it.")) {
      deleteMutation.mutate(eventId);
    }
  };

  const stats = statsData?.stats || {
    totalEvents: 0,
    totalBookings: 0,
    totalTicketsSold: 0,
    totalRevenue: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white">Admin Dashboard</h1>
          <p className="text-slate-400 text-sm">Monitor platform bookings and orchestrate active events.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center justify-center space-x-1.5 rounded-xl bg-gradient-to-r from-accentBlue to-accentPurple px-5 py-3 font-semibold text-white glow-button self-start sm:self-auto"
        >
          <Plus className="h-5 w-5" />
          <span>Create Event</span>
        </button>
      </div>

      {/* Stats Dashboard Grid */}
      {statsLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 animate-pulse">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="glass-panel rounded-2xl p-5 h-28 bg-slate-900/40"></div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
          <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Events</span>
              <div className="text-2xl font-bold text-white">{stats.totalEvents}</div>
            </div>
            <div className="rounded-xl bg-accentBlue/10 p-3 text-accentBlue">
              <Layers className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Bookings</span>
              <div className="text-2xl font-bold text-white">{stats.totalBookings}</div>
            </div>
            <div className="rounded-xl bg-accentPurple/10 p-3 text-accentPurple">
              <Ticket className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Tickets Sold</span>
              <div className="text-2xl font-bold text-white">{stats.totalTicketsSold}</div>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Ticket className="h-5 w-5" />
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs text-slate-400 font-medium">Total Revenue</span>
              <div className="text-2xl font-bold text-white">₹{stats.totalRevenue.toFixed(2)}</div>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <IndianRupee className="h-5 w-5" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs Controller */}
      <div className="flex border-b border-slate-800/80">
        <button
          onClick={() => setActiveTab("events")}
          className={`pb-4 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "events"
              ? "border-accentPurple text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          Manage Events
        </button>
        <button
          onClick={() => setActiveTab("bookings")}
          className={`pb-4 px-6 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "bookings"
              ? "border-accentPurple text-white"
              : "border-transparent text-slate-400 hover:text-slate-200"
          }`}
        >
          View Bookings
        </button>
      </div>

      {/* Content Table Viewports */}
      <div className="glass-panel rounded-3xl overflow-hidden border border-slate-800">
        {activeTab === "events" ? (
          eventsLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 text-accentBlue animate-spin" />
            </div>
          ) : !eventsData || eventsData.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">No events found. Click "Create Event" to start.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-300">
                <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Title</th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Location</th>
                    <th className="px-6 py-4">Price</th>
                    <th className="px-6 py-4">Tickets Sold</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                  {eventsData.map((event) => (
                    <tr key={event.id} className="hover:bg-slate-900/30 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{event.title}</td>
                      <td className="px-6 py-4 text-xs">
                        {new Date(event.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>
                      <td className="px-6 py-4">{event.location}</td>
                      <td className="px-6 py-4 font-semibold text-accentBlue">
                        {event.price === 0 ? "Free" : `₹${event.price.toFixed(2)}`}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium">
                        {event.ticketsSold} / {event.capacity}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => openEditModal(event)}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(event.id)}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        ) : bookingsLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 text-accentBlue animate-spin" />
          </div>
        ) : !bookingsData || bookingsData.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">No ticket bookings logged yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/60 text-slate-400 border-b border-slate-800 text-xs font-semibold uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4">User</th>
                  <th className="px-6 py-4">Event</th>
                  <th className="px-6 py-4">Seats</th>
                  <th className="px-6 py-4">Booking Date</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 bg-slate-950/20">
                {bookingsData.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-900/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-semibold text-white">{booking.user.name}</div>
                      <div className="text-[10px] text-slate-500">{booking.user.email}</div>
                    </td>
                    <td className="px-6 py-4 font-medium">{booking.event.title}</td>
                    <td className="px-6 py-4 font-bold">{booking.seats}</td>
                    <td className="px-6 py-4 text-xs">
                      {new Date(booking.createdAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                          booking.status === "CANCELLED"
                            ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                      >
                        {booking.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Dialog */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
              <h3 className="text-lg font-bold text-white">
                {editingEvent ? "Edit Event Details" : "Create New Event"}
              </h3>
              <button
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {formError && (
                <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20">
                  {formError}
                </div>
              )}

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Event Title</label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Tech Expo 2026"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Description</label>
                <textarea
                  required
                  rows={3}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Provide details about schedules, organizers, and topics..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors cursor-pointer"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Location</label>
                  <input
                    type="text"
                    required
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="San Francisco, CA"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Price (₹)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    required
                    value={formPrice}
                    onChange={(e) => setFormPrice(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Capacity</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={formCapacity}
                    onChange={(e) => setFormCapacity(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Image URL (Optional)</label>
                <input
                  type="url"
                  value={formImageUrl}
                  onChange={(e) => setFormImageUrl(e.target.value)}
                  placeholder="https://images.unsplash.com/..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-sm text-slate-200 focus:outline-none focus:border-accentPurple transition-colors"
                />
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-slate-800 rounded-xl text-sm font-semibold text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-accentBlue to-accentPurple text-white glow-button disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : editingEvent ? (
                    "Save Changes"
                  ) : (
                    "Create Event"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
