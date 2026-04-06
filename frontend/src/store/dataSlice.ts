import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../api/client'

export interface Dataset {
    id: string
    name: string
    dataset_type: string
    file_size_bytes: number
    row_count: number | null
    column_count: number | null
    status: string
    quality_score: number | null
    version: number
    created_at: string
}

interface DataState {
    datasets: Dataset[]
    loading: boolean
    uploading: boolean
    uploadProgress: number
    error: string | null
    selectedDataset: Dataset | null
    profile: any | null
}

const initialState: DataState = {
    datasets: [],
    loading: false,
    uploading: false,
    uploadProgress: 0,
    error: null,
    selectedDataset: null,
    profile: null,
}

export const fetchDatasets = createAsyncThunk('data/fetchDatasets', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/data/datasets')
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to fetch datasets')
    }
})

export const uploadDataset = createAsyncThunk(
    'data/uploadDataset',
    async ({ file, onProgress }: { file: File; onProgress?: (pct: number) => void }, { rejectWithValue }) => {
        try {
            const formData = new FormData()
            formData.append('file', file)
            const { data } = await api.post('/data/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (e) => {
                    if (e.total) onProgress?.(Math.round((e.loaded / e.total) * 100))
                },
            })
            return data
        } catch (e: any) {
            return rejectWithValue(e.response?.data?.detail || 'Upload failed')
        }
    }
)

export const deleteDataset = createAsyncThunk('data/deleteDataset', async (id: string, { rejectWithValue }) => {
    try {
        await api.delete(`/data/datasets/${id}`)
        return id
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Delete failed')
    }
})

export const fetchProfile = createAsyncThunk('data/fetchProfile', async (id: string, { rejectWithValue }) => {
    try {
        const { data } = await api.get(`/data/datasets/${id}/profile`)
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to fetch profile')
    }
})

const dataSlice = createSlice({
    name: 'data',
    initialState,
    reducers: {
        setSelectedDataset(state, action) { state.selectedDataset = action.payload },
        setUploadProgress(state, action) { state.uploadProgress = action.payload },
        clearError(state) { state.error = null },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchDatasets.pending, (state) => { state.loading = true })
            .addCase(fetchDatasets.fulfilled, (state, action) => { state.loading = false; state.datasets = action.payload })
            .addCase(fetchDatasets.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
            .addCase(uploadDataset.pending, (state) => { state.uploading = true; state.uploadProgress = 0 })
            .addCase(uploadDataset.fulfilled, (state, action) => { state.uploading = false; state.uploadProgress = 100; state.datasets.unshift(action.payload) })
            .addCase(uploadDataset.rejected, (state, action) => { state.uploading = false; state.error = action.payload as string })
            .addCase(deleteDataset.fulfilled, (state, action) => { state.datasets = state.datasets.filter(d => d.id !== action.payload) })
            .addCase(fetchProfile.fulfilled, (state, action) => { state.profile = action.payload })
    },
})

export const { setSelectedDataset, setUploadProgress, clearError } = dataSlice.actions
export default dataSlice.reducer
