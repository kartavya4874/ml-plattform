import { createTheme } from '@mui/material/styles'

export const theme = createTheme({
    palette: {
        mode: 'dark',
        primary: {
            main: '#E4E4E7', // Almost white
            dark: '#D4D4D8',
            contrastText: '#000',
        },
        secondary: {
            main: '#27272A',
            contrastText: '#FFF',
        },
        background: {
            default: '#000000',
            paper: '#0A0A0A',
        },
        text: {
            primary: '#FAFAFA',
            secondary: '#A1A1AA',
        },
        error: { main: '#EF4444' },
        warning: { main: '#F59E0B' },
        success: { main: '#10B981' },
        divider: '#222222',
        info: { main: '#3B82F6' }
    },
    typography: {
        fontFamily: '"Inter", "system-ui", sans-serif',
        h1: { fontWeight: 700, letterSpacing: '-0.025em' },
        h2: { fontWeight: 700, letterSpacing: '-0.02em' },
        h3: { fontWeight: 600, letterSpacing: '-0.015em' },
        h4: { fontWeight: 600 },
        h5: { fontWeight: 600 },
        h6: { fontWeight: 600 },
        button: { fontWeight: 500, textTransform: 'none', letterSpacing: '-0.01em' },
    },
    shape: { borderRadius: 8 },
    components: {
        MuiCard: {
            styleOverrides: {
                root: {
                    background: '#0A0A0A',
                    border: '1px solid #222222',
                    boxShadow: 'none',
                    backgroundImage: 'none',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundImage: 'none',
                    boxShadow: 'none',
                }
            }
        },
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 6,
                    padding: '8px 16px',
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    }
                },
                containedPrimary: {
                    border: '1px solid #FFF',
                    background: '#FAFAFA',
                    color: '#000',
                    '&:hover': {
                        background: '#E4E4E7',
                        border: '1px solid #FFF',
                    },
                },
                outlined: {
                    borderColor: '#333333',
                    color: '#FAFAFA',
                    '&:hover': {
                        background: '#111111',
                        borderColor: '#555555',
                    }
                }
            },
        },
        MuiChip: {
            styleOverrides: {
                root: { borderRadius: 4, fontWeight: 500, border: '1px solid #333', background: '#111' },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    '& .MuiOutlinedInput-root': {
                        borderRadius: 6,
                        backgroundColor: '#0A0A0A',
                        '& fieldset': { borderColor: '#333333' },
                        '&:hover fieldset': { borderColor: '#555555' },
                        '&.Mui-focused fieldset': { borderColor: '#FAFAFA', borderWidth: '1px' },
                    },
                },
            },
        },
        MuiLinearProgress: {
            styleOverrides: {
                root: {
                    borderRadius: 2,
                    background: '#222222',
                },
                bar: {
                    background: '#FAFAFA',
                },
            },
        },
        MuiDrawer: {
            styleOverrides: {
                paper: {
                    background: '#000000',
                    borderRight: '1px solid #1A1A1A',
                },
            },
        },
        MuiAppBar: {
            styleOverrides: {
                root: {
                    background: '#000000',
                    borderBottom: '1px solid #1A1A1A',
                    boxShadow: 'none',
                    backgroundImage: 'none',
                },
            },
        },
    },
})
