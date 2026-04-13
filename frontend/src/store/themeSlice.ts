import { createSlice } from '@reduxjs/toolkit'

type ThemeMode = 'dark' | 'light'

const STORAGE_KEY = 'nexusml_theme'

interface ThemeState {
    mode: ThemeMode
}

const initialState: ThemeState = {
    mode: (localStorage.getItem(STORAGE_KEY) as ThemeMode) || 'dark',
}

const themeSlice = createSlice({
    name: 'theme',
    initialState,
    reducers: {
        toggleTheme(state) {
            state.mode = state.mode === 'dark' ? 'light' : 'dark'
            localStorage.setItem(STORAGE_KEY, state.mode)
            document.documentElement.setAttribute('data-theme', state.mode)
        },
        setTheme(state, action: { payload: ThemeMode }) {
            state.mode = action.payload
            localStorage.setItem(STORAGE_KEY, state.mode)
            document.documentElement.setAttribute('data-theme', state.mode)
        },
    },
})

export const { toggleTheme, setTheme } = themeSlice.actions
export default themeSlice.reducer
