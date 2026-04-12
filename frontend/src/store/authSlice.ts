import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import type { PayloadAction } from '@reduxjs/toolkit'
import { api } from '../api/client'

interface User {
    id: string
    email: string
    full_name: string | null
    username: string | null
    avatar_url: string | null
    is_public: boolean
    bio: string | null
    website: string | null
    github_url: string | null
    kaggle_url: string | null
    followers_count: number
    following_count: number
    role: string
    is_verified: boolean
    slug: string
}

interface AuthState {
    user: User | null
    accessToken: string | null
    refreshToken: string | null
    loading: boolean
    error: string | null
}

const initialState: AuthState = {
    user: JSON.parse(localStorage.getItem('user') || 'null'),
    accessToken: localStorage.getItem('access_token'),
    refreshToken: localStorage.getItem('refresh_token'),
    loading: false,
    error: null,
}

export const login = createAsyncThunk('auth/login', async (creds: { email: string; password: string }, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/login', creds)
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Login failed')
    }
})

export const register = createAsyncThunk('auth/register', async (payload: { email: string; password: string; full_name?: string }, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/auth/register', payload)
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Registration failed')
    }
})

export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/auth/me')
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to fetch user')
    }
})

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        logout(state) {
            state.user = null
            state.accessToken = null
            state.refreshToken = null
            localStorage.removeItem('access_token')
            localStorage.removeItem('refresh_token')
            localStorage.removeItem('user')
        },
        setTokens(state, action: PayloadAction<{ access_token: string; refresh_token: string }>) {
            state.accessToken = action.payload.access_token
            state.refreshToken = action.payload.refresh_token
            localStorage.setItem('access_token', action.payload.access_token)
            localStorage.setItem('refresh_token', action.payload.refresh_token)
        },
        clearError(state) { state.error = null },
    },
    extraReducers: (builder) => {
        builder
            .addCase(login.pending, (state) => { state.loading = true; state.error = null })
            .addCase(login.fulfilled, (state, action) => {
                state.loading = false
                state.accessToken = action.payload.access_token
                state.refreshToken = action.payload.refresh_token
                localStorage.setItem('access_token', action.payload.access_token)
                localStorage.setItem('refresh_token', action.payload.refresh_token)
            })
            .addCase(login.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(register.pending, (state) => { state.loading = true; state.error = null })
            .addCase(register.fulfilled, (state) => { state.loading = false })
            .addCase(register.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(fetchMe.fulfilled, (state, action) => {
                state.user = action.payload
                localStorage.setItem('user', JSON.stringify(action.payload))
            })
    },
})

export const { logout, setTokens, clearError } = authSlice.actions
export default authSlice.reducer
