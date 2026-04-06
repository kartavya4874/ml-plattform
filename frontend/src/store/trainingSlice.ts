import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../api/client'

export interface TrainingJob {
    id: string
    dataset_id: string
    task_type: string
    target_column: string | null
    config: any
    status: string
    metrics: any | null
    error_message: string | null
    started_at: string | null
    completed_at: string | null
    created_at: string
}

interface TrainingState {
    jobs: TrainingJob[]
    loading: boolean
    submitting: boolean
    error: string | null
    currentJob: TrainingJob | null
    liveProgress: number
    liveLog: string[]
}

const initialState: TrainingState = {
    jobs: [],
    loading: false,
    submitting: false,
    error: null,
    currentJob: null,
    liveProgress: 0,
    liveLog: [],
}

export const fetchJobs = createAsyncThunk('training/fetchJobs', async (_, { rejectWithValue }) => {
    try {
        const { data } = await api.get('/training/jobs')
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to fetch jobs')
    }
})

export const submitJob = createAsyncThunk('training/submitJob', async (payload: any, { rejectWithValue }) => {
    try {
        const { data } = await api.post('/training/jobs', payload)
        return data
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Failed to submit job')
    }
})

export const cancelJob = createAsyncThunk('training/cancelJob', async (id: string, { rejectWithValue }) => {
    try {
        await api.delete(`/training/jobs/${id}`)
        return id
    } catch (e: any) {
        return rejectWithValue(e.response?.data?.detail || 'Cancel failed')
    }
})

const trainingSlice = createSlice({
    name: 'training',
    initialState,
    reducers: {
        setCurrentJob(state, action) { state.currentJob = action.payload },
        appendLog(state, action) { state.liveLog.push(action.payload) },
        setProgress(state, action) { state.liveProgress = action.payload },
        resetLive(state) { state.liveProgress = 0; state.liveLog = [] },
        updateJobStatus(state, action) {
            const idx = state.jobs.findIndex(j => j.id === action.payload.id)
            if (idx !== -1) state.jobs[idx] = { ...state.jobs[idx], ...action.payload }
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchJobs.pending, (state) => { state.loading = true })
            .addCase(fetchJobs.fulfilled, (state, action) => { state.loading = false; state.jobs = action.payload })
            .addCase(fetchJobs.rejected, (state, action) => { state.loading = false; state.error = action.payload as string })
            .addCase(submitJob.pending, (state) => { state.submitting = true })
            .addCase(submitJob.fulfilled, (state, action) => { state.submitting = false; state.jobs.unshift(action.payload); state.currentJob = action.payload })
            .addCase(submitJob.rejected, (state, action) => { state.submitting = false; state.error = action.payload as string })
            .addCase(cancelJob.fulfilled, (state, action) => {
                const idx = state.jobs.findIndex(j => j.id === action.payload)
                if (idx !== -1) state.jobs[idx].status = 'cancelled'
            })
    },
})

export const { setCurrentJob, appendLog, setProgress, resetLive, updateJobStatus } = trainingSlice.actions
export default trainingSlice.reducer
