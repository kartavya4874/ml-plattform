import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#6366F1',       // Indigo
            light: '#818CF8',
            dark: '#4338CA',
            contrastText: '#fff',
        },
        secondary: {
            main: '#10B981',       // Emerald
            light: '#34D399',
            dark: '#059669',
        },
        background: {
            default: '#0A0A0F',
            paper: '#111117',
        },
        text: {
            primary: '#F9FAFB',
            secondary: '#9CA3AF',
        },
        error: { main: '#EF4444' },
        warning: { main: '#F59E0B' },
        success: { main: '#10B981' },
        divider: 'rgba(255,255,255,0.08)',
    },
    typography: {
        fontFamily: '"Inter", "system-ui", sans-serif',
        h1: { fontWeight: 800, letterSpacing: '-0.025em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 700, letterSpacing: '-0.015em' },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 600, textTransform: 'none' },
    },
    shape: { borderRadius: 12 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                        transform: 'translateY(-2px)',
                        boxShadow: '0 20px 60px rgba(99,102,241,0.15)',
                    },
                },
            },
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 8,
                    padding: '10px 20px',
                    fontWeight: 600,
                },
                contained: {
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                    boxShadow: '0 4px 15px rgba(99,102,241,0.4)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%)',
                        boxShadow: '0 6px 20px rgba(99,102,241,0.5)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 6, fontWeight: 500 },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 8,
                        '& fieldset': { borderColor: 'rgba(255,255,255,0.12)' },
                        '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.24)' },
                    },
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 4,
                    background: 'rgba(255,255,255,0.08)',
                },
                bar: {
                    background: 'linear-gradient(90deg, #6366F1, #10B981)',
                    borderRadius: 4,
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    background: 'rgba(10,10,15,0.95)',
                    backdropFilter: 'blur(24px)',
                    borderRight: '1px solid rgba(255,255,255,0.06)',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: 'rgba(10,10,15,0.8)',
                    backdropFilter: 'blur(24px)',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    boxShadow: 'none',
                },
            },
        },
    },
})
