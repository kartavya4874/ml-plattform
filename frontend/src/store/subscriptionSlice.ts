import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../api/client'

export interface TierLimits {
    datasets: number
    max_file_size_mb: number
    training_jobs_per_month: number
    models: number
    deployments: number
    inference_requests_per_month: number
    api_keys_per_model: number
}

export interface Usage {
    datasets_created: number
    training_jobs_run: number
    models_created: number
    deployments_active: number
    inference_requests: number
    storage_bytes_used: number
}

export interface SubscriptionInfo {
    id: string
    user_id: string
    tier: string
    status: string
    current_period_start: string
    current_period_end: string | null
    cancel_at_period_end: boolean
    created_at: string
}

export interface SubscriptionSummary {
    subscription: SubscriptionInfo | null
    usage: Usage
    limits: TierLimits
    tier: string
}

export interface PricingTier {
    tier: string
    name: string
    price_monthly: number
    price_label: string
    description: string
    limits: TierLimits
    features: string[]
    is_popular: boolean
}

interface SubscriptionState {
    summary: SubscriptionSummary | null
    pricing: PricingTier[]
    loading: boolean
    pricingLoading: boolean
    upgrading: boolean
    error: string | null
}

const initialState: SubscriptionState = {
    summary: null,
    pricing: [],
    loading: false,
    pricingLoading: false,
    upgrading: false,
    error: null,
}

export const fetchSubscription = createAsyncThunk(
    'subscription/fetchSubscription',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/subscription')
            return data
        } catch (e: any) {
            return rejectWithValue(e.response?.data?.detail || 'Failed to fetch subscription')
        }
    }
)

export const fetchPricing = createAsyncThunk(
    'subscription/fetchPricing',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.get('/subscription/pricing')
            return data
        } catch (e: any) {
            return rejectWithValue(e.response?.data?.detail || 'Failed to fetch pricing')
        }
    }
)

export const upgradeTier = createAsyncThunk(
    'subscription/upgradeTier',
    async (tier: string, { rejectWithValue }) => {
        try {
            const { data } = await api.post(`/subscription/upgrade/${tier}`)
            return data
        } catch (e: any) {
            return rejectWithValue(e.response?.data?.detail || 'Upgrade failed')
        }
    }
)

export const cancelSubscription = createAsyncThunk(
    'subscription/cancelSubscription',
    async (_, { rejectWithValue }) => {
        try {
            const { data } = await api.post('/subscription/cancel')
            return data
        } catch (e: any) {
            return rejectWithValue(e.response?.data?.detail || 'Cancel failed')
        }
    }
)

const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState,
    reducers: {
        clearError(state) { state.error = null },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchSubscription.pending, (state) => { state.loading = true; state.error = null })
            .addCase(fetchSubscription.fulfilled, (state, action) => {
                state.loading = false
                state.summary = action.payload
            })
            .addCase(fetchSubscription.rejected, (state, action) => {
                state.loading = false
                state.error = action.payload as string
            })
            .addCase(fetchPricing.pending, (state) => { state.pricingLoading = true })
            .addCase(fetchPricing.fulfilled, (state, action) => {
                state.pricingLoading = false
                state.pricing = action.payload
            })
            .addCase(fetchPricing.rejected, (state, action) => {
                state.pricingLoading = false
                state.error = action.payload as string
            })
            .addCase(upgradeTier.pending, (state) => { state.upgrading = true; state.error = null })
            .addCase(upgradeTier.fulfilled, (state) => { state.upgrading = false })
            .addCase(upgradeTier.rejected, (state, action) => {
                state.upgrading = false
                state.error = action.payload as string
            })
    },
})

export const { clearError } = subscriptionSlice.actions
export default subscriptionSlice.reducer
