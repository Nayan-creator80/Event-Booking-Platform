import axios from "axios";

const getBaseUrl = () => {
  const rawUrl = import.meta.env.VITE_API_URL || 
    (typeof window !== "undefined" && window.location.origin.includes("vercel.app") 
      ? window.location.origin + "/api/v1" 
      : "http://localhost:4000/api/v1");
  return rawUrl.endsWith("/api/v1") ? rawUrl : `${rawUrl}/api/v1`;
};

export const api = axios.create({
  baseURL: getBaseUrl(),
  withCredentials: true, // Allow cookies
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalRequest = err.config;

    if (err.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshBaseUrl = getBaseUrl();
        const response = await axios.post(
          `${refreshBaseUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        );
        const { accessToken } = response.data.data;
        localStorage.setItem("accessToken", accessToken);

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        }
        return api(originalRequest);
      } catch (refreshErr) {
        localStorage.removeItem("accessToken");
        if (
          !window.location.pathname.includes("/login") &&
          !window.location.pathname.includes("/register")
        ) {
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(err);
  }
);
