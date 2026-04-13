import React from 'react'
import ReactDOM from 'react-dom/client'
import { Provider, useSelector } from 'react-redux'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider, CssBaseline } from '@mui/material'
import App from './App'
import { store } from './store/store'
import { getTheme } from './theme'
import './index.css'
import { injectStore } from './api/client'
import type { RootState } from './store/store'

injectStore(store)

// Sync data-theme attribute on initial load
const savedTheme = localStorage.getItem('nexusml_theme') || 'dark'
document.documentElement.setAttribute('data-theme', savedTheme)

function ThemedApp() {
    const mode = useSelector((s: RootState) => s.theme.mode)
    const theme = getTheme(mode)

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <App />
        </ThemeProvider>
    )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <Provider store={store}>
            <BrowserRouter>
                <ThemedApp />
            </BrowserRouter>
        </Provider>
    </React.StrictMode>
)
