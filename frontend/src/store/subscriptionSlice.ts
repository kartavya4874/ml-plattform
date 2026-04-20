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
                // Fallback pricing data so the page always renders
                if (state.pricing.length === 0) {
                    state.pricing = [
                        {
                            tier: 'free', name: 'Free', price_monthly: 0, price_label: '₹0',
                            description: 'Perfect for exploring the platform and building your first models.',
                            limits: { datasets: 10, max_file_size_mb: 100, training_jobs_per_month: 20, models: 10, deployments: 3, inference_requests_per_month: 5000, api_keys_per_model: 2 },
                            features: ['10 datasets (up to 100 MB each)', '20 training jobs per month', '10 models', '3 deployments', '5,000 inference requests/month', 'Community support', 'Data profiling & quality reports'],
                            is_popular: false,
                        },
                        {
                            tier: 'pro', name: 'Pro', price_monthly: 2999, price_label: '₹2,999/mo',
                            description: 'For professionals and teams building production ML pipelines.',
                            limits: { datasets: 25, max_file_size_mb: 2048, training_jobs_per_month: 50, models: 20, deployments: 10, inference_requests_per_month: 50000, api_keys_per_model: 5 },
                            features: ['25 datasets (up to 2 GB each)', '50 training jobs per month', '20 models & 10 deployments', '50,000 inference requests/month', 'GPU Training (T4 included)', 'Priority support', 'SHAP & explainability lab', 'Model export (ONNX / Docker)'],
                            is_popular: true,
                        },
                        {
                            tier: 'payg', name: 'Pay As You Go', price_monthly: 499, price_label: '₹499 base + usage',
                            description: 'Pay only for what you use. Perfect for variable workloads.',
                            limits: { datasets: 100, max_file_size_mb: 51200, training_jobs_per_month: 999999, models: 100, deployments: 50, inference_requests_per_month: 999999, api_keys_per_model: 20 },
                            features: ['100 datasets (up to 50 GB each)', 'Unlimited training jobs (metered)', '100 models & 50 deployments', 'Unlimited inference (metered)', 'All GPU clusters available', '₹50/hr (T4) · ₹90/hr (A10G) · ₹200/hr (A100)', 'Scale-to-zero deployments', 'API calls: ₹0.001/request'],
                            is_popular: false,
                        },
                        {
                            tier: 'enterprise', name: 'Enterprise', price_monthly: 15999, price_label: '₹15,999/mo',
                            description: 'Enterprise-grade features, custom limits, and dedicated support.',
                            limits: { datasets: 999999, max_file_size_mb: 51200, training_jobs_per_month: 999999, models: 999999, deployments: 999999, inference_requests_per_month: 999999, api_keys_per_model: 999999 },
                            features: ['Unlimited datasets & storage', 'Unlimited models & deployments', 'SLA-backed priority support', 'Organization management', 'White-labeling & custom branding', 'Audit logs & compliance', 'Dedicated solutions architect', 'SSO Integration'],
                            is_popular: false,
                        },
                    ]
                }
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
