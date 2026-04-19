import axios from 'axios'

let store: any;
export const injectStore = (_store: any) => {
    store = _store
}

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'

export const api = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
})

// Request interceptor — attach access token
api.interceptors.request.use((config) => {
    if (store) {
        const token = store.getState().auth.accessToken
        if (token) config.headers.Authorization = `Bearer ${token}`
    }
    return config
})

// Response interceptor — auto-refresh on 401
let isRefreshing = false
let failedQueue: Array<{ resolve: (token: string) => void; reject: (err: any) => void }> = []

const processQueue = (error: any, token: string | null = null) => {
    failedQueue.forEach((p) => {
        if (error) p.reject(error)
        else p.resolve(token!)
    })
    failedQueue = []
}

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const original = error.config

        // Quota exceeded — redirect to pricing page
        if (error.response?.status === 402) {
            const detail = error.response?.data?.detail || 'Quota exceeded — please upgrade your plan'
            // Dispatch a custom event so any component can listen
            window.dispatchEvent(new CustomEvent('quota-exceeded', { detail }))
            // Redirect to pricing page
            setTimeout(() => {
                if (window.location.pathname !== '/pricing') {
                    window.location.href = '/pricing'
                }
            }, 100)
            return Promise.reject(error)
        }

        if (error.response?.status === 401 && !original._retry && !original.url?.includes('/auth/login')) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({
                        resolve: (token) => { original.headers.Authorization = `Bearer ${token}`; resolve(axios(original)) },
                        reject,
                    })
                })
            }

            original._retry = true
            isRefreshing = true

            const refreshToken = store.getState().auth.refreshToken
            if (!refreshToken) {
                store.dispatch({ type: 'auth/logout' })
                return Promise.reject(error)
            }

            try {
                const { data } = await axios.post(`${BASE_URL}/auth/refresh`, { refresh_token: refreshToken })
                store.dispatch({ type: 'auth/setTokens', payload: { access_token: data.access_token, refresh_token: data.refresh_token } })
                processQueue(null, data.access_token)
                original.headers.Authorization = `Bearer ${data.access_token}`
                return axios(original)
            } catch (refErr) {
                processQueue(refErr)
                window.dispatchEvent(new CustomEvent('session-expired'))
                store.dispatch({ type: 'auth/logout' })
                return Promise.reject(refErr)
            } finally {
                isRefreshing = false
            }
        }
        return Promise.reject(error)
    }
)
