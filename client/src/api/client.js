import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Variable to store the active polling interval ID
let activeIntervalId = null;

// Function to set the active interval ID (used by Dashboard to register its interval)
export const setActiveInterval = (intervalId) => {
  activeIntervalId = intervalId;
};

// Function to clear the active interval (used by components to clear on unmount)
export const clearActiveInterval = () => {
  if (activeIntervalId) {
    clearInterval(activeIntervalId);
    activeIntervalId = null;
  }
};

// Request interceptor to add Authorization header
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor to handle 401 errors globally
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear the polling interval if exists
      if (activeIntervalId) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
      }
      
      // Clear token and user from localStorage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      
      // Redirect to login page
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;
