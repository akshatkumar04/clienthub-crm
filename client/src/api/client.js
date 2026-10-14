import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true, // send the session cookie
});

// If the session expires mid-use, tell the AuthContext so it can send the user to /login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || '';
    if (error.response?.status === 401 && !url.startsWith('/auth/')) {
      window.dispatchEvent(new Event('auth:unauthorized'));
    }
    return Promise.reject(error);
  }
);

/** Unwraps the { success, data, message } envelope. */
export const unwrap = (promise) => promise.then((res) => res.data.data);

/** Best-effort human readable message from an axios error. */
export const getErrorMessage = (error) => {
  const body = error.response?.data;
  if (Array.isArray(body?.data) && body.data.length) {
    return body.data.map((e) => e.message).join('. ');
  }
  return body?.message || error.message || 'Something went wrong';
};

export default api;
