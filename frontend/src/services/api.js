import * as SecureStore from 'expo-secure-store';
import Constants from 'expo-constants';

function getBaseUrl() {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  // In Expo Go, derive the API host from the dev server so it works on physical devices
  const host = Constants.expoConfig?.hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:3000/api`;
  }
  return 'http://localhost:3000/api';
}

const BASE_URL = getBaseUrl();

async function getToken() {
  return SecureStore.getItemAsync('auth_token');
}

async function request(path, options = {}) {
  const token = await getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.error || `Request failed: ${response.status}`);
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body) => request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request('/auth/me'),

  // Locals
  searchLocals: (params) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/locals/search?${qs}`);
  },
  getLocal: (id) => request(`/locals/${id}`),
  getMyProfile: () => request('/locals/my/profile'),
  updateMyProfile: (body) =>
    request('/locals/my/profile', { method: 'PUT', body: JSON.stringify(body) }),
  getMyDashboard: () => request('/locals/my/dashboard'),

  // Services
  getService: (id) => request(`/services/${id}`),
  getMyServices: () => request('/services/my/list'),
  createService: (body) => request('/services', { method: 'POST', body: JSON.stringify(body) }),
  updateService: (id, body) =>
    request(`/services/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteService: (id) => request(`/services/${id}`, { method: 'DELETE' }),

  // Availability
  getAvailability: (localId, month) =>
    request(`/availability/${localId}${month ? `?month=${month}` : ''}`),
  addAvailability: (body) =>
    request('/availability', { method: 'POST', body: JSON.stringify(body) }),
  updateAvailability: (id, body) =>
    request(`/availability/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  deleteAvailability: (id) => request(`/availability/${id}`, { method: 'DELETE' }),

  // Bookings
  getMyBookings: () => request('/bookings'),
  getLocalBookings: () => request('/bookings/local'),
  getBooking: (id) => request(`/bookings/${id}`),
  createBooking: (body) => request('/bookings', { method: 'POST', body: JSON.stringify(body) }),
  updateBookingStatus: (id, status) =>
    request(`/bookings/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),

  // Payments
  createPaymentIntent: (bookingId) =>
    request('/payments/create-intent', {
      method: 'POST',
      body: JSON.stringify({ booking_id: bookingId }),
    }),

  // Reviews
  getReviews: (localId) => request(`/reviews/local/${localId}`),
  submitReview: (body) => request('/reviews', { method: 'POST', body: JSON.stringify(body) }),

  // Messages
  getMessages: (bookingId) => request(`/messages/${bookingId}`),
  sendMessage: (body) => request('/messages', { method: 'POST', body: JSON.stringify(body) }),
};
