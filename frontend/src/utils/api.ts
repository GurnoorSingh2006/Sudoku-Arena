export const getAuthToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("sudoku_token");
  }
  return null;
};

export const setAuthToken = (token: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("sudoku_token", token);
  }
};

export const clearAuthToken = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("sudoku_token");
    localStorage.removeItem("sudoku_user");
  }
};

export const getStoredUser = () => {
  if (typeof window !== "undefined") {
    const userStr = localStorage.getItem("sudoku_user");
    return userStr ? JSON.parse(userStr) : null;
  }
  return null;
};

export const setStoredUser = (user: any) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("sudoku_user", JSON.stringify(user));
  }
};

export const apiFetch = async (endpoint: string, options: RequestInit = {}) => {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const host = typeof window !== "undefined" ? window.location.hostname : "localhost";
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || `http://${host}:8080`;

  const response = await fetch(`${baseUrl}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      clearAuthToken();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
    const text = await response.text();
    throw new Error(text || "API Request Failed");
  }

  // Handle empty responses
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return response.text();
};
