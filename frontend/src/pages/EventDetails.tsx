import React, { useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../api/client";
import { useAuthStore } from "../store/authStore";
import { Calendar, MapPin, Ticket, ShieldAlert, CheckCircle, ArrowLeft, Loader2, CreditCard, X } from "lucide-react";

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

export const EventDetails: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { isAuthenticated, user } = useAuthStore();
  const [seats, setSeats] = useState(1);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMockModal, setShowMockModal] = useState(false);
  const [mockOrderDetails, setMockOrderDetails] = useState<any>(null);
  const [paymentProcessing, setPaymentProcessing] = useState(false);

  // Query single event details
  const { data: eventData, isLoading, isError } = useQuery({
    queryKey: ["event", id],
    queryFn: async () => {
      const response = await api.get(`/events/${id}`);
      return response.data.data.event as Event;
    },
  });

  // Booking mutation (for direct free bookings)
  const bookingMutation = useMutation({
    mutationFn: async (bookingData: { eventId: string; seats: number }) => {
      const response = await api.post("/bookings", bookingData);
      return response.data;
    },
    onSuccess: () => {
      setBookingSuccess(true);
      setErrorMsg("");
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error?.message || "Booking failed. Please try again.";
      setErrorMsg(msg);
    },
  });

  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      if ((window as any).Razorpay) {
        resolve(true);
        return;
      }
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    setErrorMsg("");

    try {
      setPaymentProcessing(true);

      // 1. Create Razorpay order on backend
      const response = await api.post("/bookings/order", { eventId: eventData.id, seats });
      const orderInfo = response.data.data;

      // 2. If event is free, directly book it using the direct checkout mutation
      if (orderInfo.isFree) {
        bookingMutation.mutate({ eventId: eventData.id, seats });
        setPaymentProcessing(false);
        return;
      }

      // 3. Paid event checkout - mock check
      if (orderInfo.keyId === "mock") {
        setMockOrderDetails(orderInfo);
        setShowMockModal(true);
        setPaymentProcessing(false);
        return;
      }

      // 4. Live Razorpay Checkout
      const scriptLoaded = await loadRazorpayScript();
      if (!scriptLoaded) {
        setErrorMsg("Failed to load Razorpay Payment Gateway. Check your internet connection.");
        setPaymentProcessing(false);
        return;
      }

      const options = {
        key: orderInfo.keyId,
        amount: orderInfo.amount,
        currency: orderInfo.currency,
        name: "NexusEvents",
        description: `Tickets for ${orderInfo.eventTitle}`,
        order_id: orderInfo.orderId,
        handler: async (response: any) => {
          try {
            setPaymentProcessing(true);
            const verifyPayload = {
              eventId: eventData.id,
              seats,
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            };
            await api.post("/bookings/verify", verifyPayload);
            setBookingSuccess(true);
            queryClient.invalidateQueries({ queryKey: ["event", id] });
            queryClient.invalidateQueries({ queryKey: ["bookings"] });
          } catch (err: any) {
            setErrorMsg(err.response?.data?.error?.message || "Payment verification failed.");
          } finally {
            setPaymentProcessing(false);
          }
        },
        prefill: {
          name: user?.name || "",
          email: user?.email || "",
        },
        theme: {
          color: "#3b82f6",
        },
        modal: {
          ondismiss: () => {
            setPaymentProcessing(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      const msg = err.response?.data?.error?.message || "Checkout creation failed. Please try again.";
      setErrorMsg(msg);
      setPaymentProcessing(false);
    }
  };

  const handleMockPaymentSuccess = async () => {
    if (!mockOrderDetails) return;
    try {
      setPaymentProcessing(true);
      setShowMockModal(false);

      const mockPaymentId = `pay_mock_${Math.random().toString(36).substring(2, 16)}`;
      const verifyPayload = {
        eventId: eventData.id,
        seats,
        razorpayOrderId: mockOrderDetails.orderId,
        razorpayPaymentId: mockPaymentId,
        razorpaySignature: "mock_signature",
      };

      await api.post("/bookings/verify", verifyPayload);
      setBookingSuccess(true);
      queryClient.invalidateQueries({ queryKey: ["event", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    } catch (err: any) {
      setErrorMsg(err.response?.data?.error?.message || "Mock payment verification failed.");
    } finally {
      setPaymentProcessing(false);
      setMockOrderDetails(null);
    }
  };

  const handleMockPaymentCancel = () => {
    setShowMockModal(false);
    setMockOrderDetails(null);
    setErrorMsg("Payment simulation cancelled by user.");
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 text-accentBlue animate-spin" />
      </div>
    );
  }

  if (isError || !eventData) {
    return (
      <div className="max-w-md mx-auto my-12 text-center glass-panel rounded-2xl p-8 space-y-4 border-rose-900/30">
        <ShieldAlert className="h-12 w-12 text-rose-500 mx-auto" />
        <h3 className="text-xl font-bold">Event Not Found</h3>
        <p className="text-slate-400 text-sm">The event you are looking for might have been removed or does not exist.</p>
        <Link to="/" className="inline-block text-accentBlue hover:underline text-sm font-medium">
          Back to Events
        </Link>
      </div>
    );
  }

  const remaining = eventData.capacity - eventData.ticketsSold;
  const isPast = new Date(eventData.date) < new Date();
  const isSoldOut = remaining <= 0;
  const formattedDate = new Date(eventData.date).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <Link to="/" className="inline-flex items-center space-x-2 text-sm text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Events</span>
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Event details column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="relative h-96 bg-slate-900 rounded-3xl overflow-hidden border border-slate-800">
            {eventData.imageUrl ? (
              <img src={eventData.imageUrl} alt={eventData.title} className="h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center">
                <Calendar className="h-16 w-16 text-slate-700" />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              {eventData.title}
            </h1>

            <div className="flex flex-wrap gap-4 text-sm text-slate-300">
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
                <Calendar className="h-4 w-4 text-accentPurple" />
                <span>{formattedDate}</span>
              </div>
              <div className="flex items-center space-x-1.5 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-full">
                <MapPin className="h-4 w-4 text-accentBlue" />
                <span>{eventData.location}</span>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800/80 pt-6 space-y-3">
            <h3 className="text-xl font-semibold">About This Event</h3>
            <p className="text-slate-300 leading-relaxed whitespace-pre-line">
              {eventData.description}
            </p>
          </div>
        </div>

        {/* Booking Card sidebar */}
        <div className="lg:col-span-1">
          <div className="glass-panel rounded-3xl p-6 sticky top-24 space-y-6">
            {!bookingSuccess ? (
              <>
                <div className="space-y-2">
                  <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase block">Ticket Price</span>
                  <div className="text-3xl font-extrabold text-white">
                    {eventData.price === 0 ? "Free" : `₹${eventData.price.toFixed(2)}`}
                  </div>
                </div>

                <div className="border-t border-slate-800 pt-4 space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Status</span>
                    <span className={`font-semibold ${isPast ? "text-rose-400" : isSoldOut ? "text-rose-400" : "text-emerald-400"}`}>
                      {isPast ? "Event Ended" : isSoldOut ? "Sold Out" : "Tickets Available"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">Available Seats</span>
                    <span className="text-slate-200 font-semibold">{remaining} / {eventData.capacity}</span>
                  </div>
                </div>

                {isPast || isSoldOut ? (
                  <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl p-4 text-sm text-center">
                    {isPast ? "Registration is closed because this event has already taken place." : "All seats have been booked. Check back later in case of cancellations!"}
                  </div>
                ) : (
                  <form onSubmit={handleBooking} className="space-y-4">
                    {isAuthenticated ? (
                      <div className="space-y-2">
                        <label htmlFor="seats" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Number of Seats</label>
                        <select
                          id="seats"
                          value={seats}
                          onChange={(e) => setSeats(parseInt(e.target.value))}
                          className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 px-3 text-sm focus:outline-none focus:border-accentPurple cursor-pointer text-slate-200"
                        >
                          {[...Array(Math.min(10, remaining))].map((_, i) => (
                            <option key={i + 1} value={i + 1}>
                              {i + 1} {i + 1 === 1 ? "ticket" : "tickets"}
                            </option>
                          ))}
                        </select>
                      </div>
                    ) : null}

                    {/* Total Price preview */}
                    {isAuthenticated && eventData.price > 0 && (
                      <div className="flex items-center justify-between text-sm border-t border-slate-800 pt-4">
                        <span className="text-slate-400">Total Price</span>
                        <span className="text-xl font-bold text-accentBlue">₹{(eventData.price * seats).toFixed(2)}</span>
                      </div>
                    )}

                    {errorMsg && (
                      <div className="text-xs text-rose-400 bg-rose-500/10 p-3 rounded-xl border border-rose-500/15">
                        {errorMsg}
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={paymentProcessing || bookingMutation.isPending}
                      className="w-full flex items-center justify-center space-x-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-accentBlue to-accentPurple text-white glow-button disabled:opacity-50"
                    >
                      {paymentProcessing || bookingMutation.isPending ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <Ticket className="h-5 w-5" />
                          <span>{isAuthenticated ? "Book Tickets Now" : "Login to Book Tickets"}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </>
            ) : (
              // Booking success confirmation view
              <div className="text-center py-6 space-y-6">
                <CheckCircle className="h-14 w-14 text-emerald-400 mx-auto" />
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Booking Confirmed!</h3>
                  <p className="text-slate-400 text-sm">
                    You have successfully booked {seats} {seats === 1 ? "ticket" : "tickets"} for <strong>{eventData.title}</strong>.
                  </p>
                </div>
                <div className="space-y-3 pt-2">
                  <Link
                    to="/dashboard"
                    className="w-full inline-block py-2.5 rounded-xl text-center text-sm font-semibold bg-slate-900 border border-slate-800 hover:border-slate-700 text-white transition-colors"
                  >
                    Go to My Bookings
                  </Link>
                  <button
                    onClick={() => setBookingSuccess(false)}
                    className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
                  >
                    Book More Seats
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mock Razorpay Payment Simulator Modal */}
      {showMockModal && mockOrderDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center space-x-2">
                <div className="bg-accentBlue/10 p-2 rounded-xl text-accentBlue">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg leading-tight">Razorpay Checkout</h3>
                  <span className="text-[10px] text-amber-400 font-semibold tracking-wider uppercase bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-md">Sandbox Test Mode</span>
                </div>
              </div>
              <button 
                onClick={handleMockPaymentCancel}
                className="text-slate-400 hover:text-white bg-slate-800/40 p-1.5 rounded-lg border border-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-slate-950/50 rounded-2xl p-4 border border-slate-850 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Merchant</span>
                  <span className="font-semibold text-white">NexusEvents India</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Order ID</span>
                  <span className="font-mono text-slate-300 text-xs">{mockOrderDetails.orderId}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Event</span>
                  <span className="font-semibold text-slate-200 text-right max-w-[200px] truncate">{mockOrderDetails.eventTitle}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Seats</span>
                  <span className="font-semibold text-white">{seats} Tickets</span>
                </div>
                <div className="border-t border-slate-850 pt-3 flex justify-between items-center">
                  <span className="text-slate-400 font-medium">Amount to Pay</span>
                  <span className="text-2xl font-black text-accentBlue">₹{(mockOrderDetails.amount / 100).toFixed(2)}</span>
                </div>
              </div>

              <div className="text-xs text-slate-400 text-center leading-relaxed">
                Clicking "Pay Success" will simulate a successful Razorpay transaction and confirm your seats.
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={handleMockPaymentCancel}
                className="w-full py-3 rounded-xl border border-slate-800 hover:border-slate-700 bg-slate-900 text-sm font-semibold text-slate-300 hover:text-white transition-colors"
                disabled={paymentProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleMockPaymentSuccess}
                className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-sm font-bold shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5"
                disabled={paymentProcessing}
              >
                {paymentProcessing ? (
                  <Loader2 className="h-4 w-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <span>Pay Success</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
