import axios from "axios";

export const AUTH_TOKEN_KEY = "noma_token";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

export function apiAssetUrl(filePath: string) {
  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }
  const base = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api").replace(/\/api$/, "");
  return `${base}${filePath.startsWith("/") ? filePath : `/${filePath}`}`;
}

export const publicApi = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api",
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      typeof window !== "undefined" &&
      error.response?.status === 401 &&
        window.location.pathname !== "/login" &&
        !window.location.pathname.startsWith("/nps/responder") &&
        !window.location.pathname.startsWith("/formularios/")
    ) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
