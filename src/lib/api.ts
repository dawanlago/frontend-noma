import axios from "axios";

export const AUTH_TOKEN_KEY = "noma_token";
/** Empresa ativa (enviada em toda chamada no header X-Org-Id). */
export const ORG_KEY = "noma:org";

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3333/api",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    const org = localStorage.getItem(ORG_KEY);
    if (org) config.headers["X-Org-Id"] = org;
  }

  return config;
});

const PUBLIC_PATHS = /^\/(login|esqueci-senha|redefinir-senha)\/?$|^\/(f|p|nps\/responder)\//;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== "undefined" && error.response?.status === 401) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      // Sessão expirada: volta ao login, menos nas telas de acesso e nos links públicos (cliente).
      if (!PUBLIC_PATHS.test(window.location.pathname)) window.location.href = "/login";
    }

    return Promise.reject(error);
  },
);
