import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../api/client'

export interface MLModel {
    id: string
    name: string
    description: string | null
    is_public: boolean
    collaborator_ids: string[]
    task_type: string
    framework: string
    stage: string
    metrics: any | null
    input_schema: any | null
    artifact_path: string
    version: number
    slug: string
    created_at: string
    updated_at: string
}

interface ModelsState {
    models: MLModel[]
    loading: boolean
    error: string | null
    selectedModel: MLModel | null
    deployment: any | null
    apiKeys: any[]
}

const initialState: ModelsState = {
    models: [],
    loading: false,
    error: null,
    selectedModel: null,
    deployment: null,
    apiKeys: [],
}

export const fetchModels = createAsyncThunk('models/fetchModels', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/models/')
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to fetch models')
    }
})

export const promoteModel = createAsyncThunk('models/promoteModel', async (id: string, { rejectWithValue }) => {
    try {
        const { data } = await api.post(`/models/${id}/promote`)
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to promote model')
    }
})

export const deployModel = createAsyncThunk('models/deployModel', async (id: string, { rejectWithValue }) => {
    try {
        const { data } = await api.post(`/deploy/${id}/api`)
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to deploy model')
    }
})

export const deleteModel = createAsyncThunk('models/deleteModel', async (id: string, { rejectWithValue }) => {
    try {
        await api.delete(`/models/${id}`)
        return id
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to delete model')
    }
})

const modelsSlice = createSlice({
    name: 'models',
    initialState,
    reducers: {
        setSelectedModel(state, action) { state.selectedModel = action.payload },
        setDeployment(state, action) { state.deployment = action.payload },
        clearError(state) { state.error = null },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchModels.pending, (state) => { state.loading = true })
            .addCase(fetchModels.fulfilled, (state, action) => { state.loading = false; state.models = action.payload })
            .addCase(fetchModels.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
            .addCase(promoteModel.fulfilled, (state, action) => {
                const idx = state.models.findIndex(m => m.id === action.payload.id)
                if (idx !== -1) state.models[idx] = action.payload
            })
            .addCase(deleteModel.fulfilled, (state, action) => {
                state.models = state.models.filter(m => m.id !== action.payload)
            })
            .addCase(deployModel.fulfilled, (state, action) => {
                state.deployment = action.payload
            })
    },
})

export const { setSelectedModel, setDeployment, clearError } = modelsSlice.actions
export default modelsSlice.reducer
