import { configureStore } from '@reduxjs/toolkit'
import authReducer from './authSlice'
import dataReducer from './dataSlice'
import trainingReducer from './trainingSlice'
import modelsReducer from './modelsSlice'
import subscriptionReducer from './subscriptionSlice'

export const store = configureStore({
    reducer: {
        auth: authReducer,
        data: dataReducer,
        training: trainingReducer,
        models: modelsReducer,
        subscription: subscriptionReducer,
    },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
