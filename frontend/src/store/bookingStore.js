import { create } from 'zustand';
import { api } from '../services/api';

export const useBookingStore = create((set, get) => ({
  bookings: [],
  currentBooking: null,
  isLoading: false,

  fetchMyBookings: async () => {
    set({ isLoading: true });
    try {
      const bookings = await api.getMyBookings();
      set({ bookings, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  createBooking: async (serviceId, scheduledDate, scheduledTime, notes) => {
    const booking = await api.createBooking({
      service_id: serviceId,
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      notes,
    });
    set((state) => ({ bookings: [booking, ...state.bookings] }));
    return booking;
  },

  setCurrentBooking: (booking) => set({ currentBooking: booking }),

  cancelBooking: async (id) => {
    await api.updateBookingStatus(id, 'cancelled');
    set((state) => ({
      bookings: state.bookings.map((b) =>
        b.id === id ? { ...b, status: 'cancelled' } : b
      ),
    }));
  },
}));
