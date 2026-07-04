import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { Search, MapPin, Tag, Calendar, ArrowRight, ArrowLeft } from "lucide-react";

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

export const Home: React.FC = () => {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState("");
  const [isFree, setIsFree] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 6;

  // Query events from API
  const { data, isLoading, isError } = useQuery({
    queryKey: ["events", search, location, isFree, page],
    queryFn: async () => {
      const response = await api.get("/events", {
        params: {
          search: search || undefined,
          location: location || undefined,
          isFree: isFree ? "true" : undefined,
          page,
          limit,
        },
      });
      return response.data.data;
    },
  });

  const events: Event[] = data?.events || [];
  const pagination = data?.pagination || { totalPages: 1 };

  return (
    <div className="space-y-12 pb-16">
      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-slate-950">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-accentPurple/10 via-slate-950 to-slate-950"></div>
        <div className="relative mx-auto max-w-4xl text-center space-y-6">
          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight">
            Discover & Book <br />
            <span className="gradient-text">Unforgettable Events</span>
          </h1>
          <p className="mx-auto max-w-xl text-lg text-slate-400">
            Join the most popular tech talks, local music festivals, and workshops around you. Seamless seat reservation in seconds.
          </p>
        </div>
      </section>

      {/* Filter and Browse Section */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="glass-panel rounded-2xl p-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accentBlue transition-colors"
            />
          </div>

          {/* Location Input */}
          <div className="relative">
            <MapPin className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Location..."
              value={location}
              onChange={(e) => {
                setLocation(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-accentBlue transition-colors"
            />
          </div>

          {/* Price Filter */}
          <div className="flex items-center space-x-3 px-2">
            <input
              type="checkbox"
              id="isFree"
              checked={isFree}
              onChange={(e) => {
                setIsFree(e.target.checked);
                setPage(1);
              }}
              className="h-5 w-5 rounded border-slate-800 bg-slate-900 text-accentPurple focus:ring-accentPurple/20 focus:ring-2 accent-accentPurple cursor-pointer"
            />
            <label htmlFor="isFree" className="text-sm font-medium text-slate-300 cursor-pointer select-none">
              Free Events Only
            </label>
          </div>

          {/* Clean Filter Reset */}
          <button
            onClick={() => {
              setSearch("");
              setLocation("");
              setIsFree(false);
              setPage(1);
            }}
            className="text-sm font-medium text-slate-400 hover:text-white transition-colors py-2.5 border border-slate-800 rounded-xl bg-slate-900/40 hover:bg-slate-900"
          >
            Clear Filters
          </button>
        </div>

        {/* Loading and Error States */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-panel rounded-2xl p-5 space-y-4 animate-pulse">
                <div className="h-48 bg-slate-800 rounded-xl"></div>
                <div className="h-6 bg-slate-800 rounded w-3/4"></div>
                <div className="h-4 bg-slate-800 rounded w-1/2"></div>
                <div className="h-10 bg-slate-800 rounded-xl"></div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="text-center py-12 glass-panel rounded-2xl max-w-md mx-auto space-y-4 border-rose-900/30">
            <h3 className="text-lg font-semibold text-rose-400">Failed to Load Events</h3>
            <p className="text-sm text-slate-400">There was an issue fetching events from the server. Please check back later.</p>
          </div>
        )}

        {!isLoading && !isError && events.length === 0 && (
          <div className="text-center py-16 glass-panel rounded-2xl space-y-4">
            <Tag className="h-12 w-12 text-slate-600 mx-auto" />
            <h3 className="text-xl font-semibold">No Events Found</h3>
            <p className="text-sm text-slate-400 max-w-sm mx-auto">Try refining your keywords or clearing active filters to explore more listings.</p>
          </div>
        )}

        {/* Events Grid */}
        {!isLoading && !isError && events.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {events.map((event) => {
              const remaining = event.capacity - event.ticketsSold;
              const formattedDate = new Date(event.date).toLocaleDateString(undefined, {
                weekday: "short",
                month: "short",
                day: "numeric",
                year: "numeric",
              });

              return (
                <div key={event.id} className="glass-panel rounded-2xl overflow-hidden hover:scale-[1.01] transition-transform duration-300 flex flex-col justify-between group">
                  <div>
                    {/* Event image fallback */}
                    <div className="relative h-48 bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-800/80">
                      {event.imageUrl ? (
                        <img
                          src={event.imageUrl}
                          alt={event.title}
                          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800/60 to-slate-950 flex items-center justify-center">
                          <Calendar className="h-10 w-10 text-slate-600 group-hover:scale-110 transition-transform duration-300" />
                        </div>
                      )}
                      <div className="absolute top-4 right-4 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-accentBlue border border-slate-800">
                        {event.price === 0 ? "Free" : `₹${event.price.toFixed(2)}`}
                      </div>
                    </div>

                    <div className="p-5 space-y-4">
                      <div className="flex items-center space-x-2 text-xs text-slate-400">
                        <Calendar className="h-3.5 w-3.5 text-accentPurple" />
                        <span>{formattedDate}</span>
                      </div>

                      <h3 className="text-xl font-bold tracking-tight text-white group-hover:text-accentBlue transition-colors">
                        {event.title}
                      </h3>

                      <p className="text-sm text-slate-400 line-clamp-3 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="flex items-center justify-between border-t border-slate-800/50 pt-4 mb-4 text-xs">
                      <div className="flex items-center space-x-1 text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-slate-500" />
                        <span className="truncate max-w-[120px]">{event.location}</span>
                      </div>
                      <span className={`font-semibold ${remaining === 0 ? "text-rose-400" : remaining < 10 ? "text-amber-400" : "text-emerald-400"}`}>
                        {remaining === 0 ? "Sold Out" : `${remaining} Seats Left`}
                      </span>
                    </div>

                    <Link
                      to={`/events/${event.id}`}
                      className="w-full flex items-center justify-center space-x-2 py-2.5 rounded-xl text-sm font-medium border border-slate-800 hover:border-accentPurple hover:bg-accentPurple/10 text-slate-300 hover:text-white transition-all"
                    >
                      <span>View Details</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!isLoading && !isError && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center space-x-4 pt-8">
            <button
              onClick={() => setPage((p) => Math.max(p - 1, 1))}
              disabled={page === 1}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium hover:bg-slate-850 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Previous</span>
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(p + 1, pagination.totalPages))}
              disabled={page === pagination.totalPages}
              className="flex items-center space-x-1.5 px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-sm font-medium hover:bg-slate-850 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span>Next</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
};
