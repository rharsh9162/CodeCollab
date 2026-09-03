import axios from 'axios';

const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Production fallback connects directly to your verified live Render backend
const DEFAULT_API_BASE = isLocalhost 
    ? 'http://localhost:3001' 
    : 'https://codecollab-backend-a4w0.onrender.com';

export const API_BASE_URL = import.meta.env.VITE_API_URL || DEFAULT_API_BASE;

export const apiClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 20000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Response interceptor for consistent error extraction
apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const message = error.response?.data?.error || 
                        error.response?.data?.message || 
                        error.message || 
                        'Network error. Please check your backend connection.';
        return Promise.reject(new Error(message));
    }
);

/**
 * Fetch problem details from backend
 */
export async function getProblemDetail(titleSlug) {
    const res = await apiClient.get(`/api/problem/${encodeURIComponent(titleSlug)}`);
    return res.data;
}

/**
 * Search LeetCode problems
 */
export async function searchLeetCodeProblems(query) {
    const res = await apiClient.get(`/api/search/${encodeURIComponent(query)}`);
    return res.data?.questions || [];
}

/**
 * Execute code via backend Piston proxy
 */
export async function runCodeExecution(code, language, stdin = '') {
    const res = await apiClient.post('/api/execute', {
        code,
        language,
        stdin,
    });
    return res.data;
}
