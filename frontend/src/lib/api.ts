import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to login if we have a token (meaning user was logged in but token expired)
    // Don't redirect on login failures (when there's no token)
    if (error.response?.status === 401) {
      const token = localStorage.getItem("token");
      if (token) {
        // Token exists but is invalid/expired - clear and redirect
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        // Use Next.js router instead of window.location to avoid full page refresh
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
      // If no token, just reject the error (login failure case)
    }
    return Promise.reject(error);
  },
);

export default api;
