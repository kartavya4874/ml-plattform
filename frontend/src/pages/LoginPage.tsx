import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    Box, TextField, Button, Typography, Alert, InputAdornment, IconButton, Divider
} from '@mui/material'
import {
    Email as EmailIcon, Lock as LockIcon, Visibility, VisibilityOff,
    AutoAwesome as LogoIcon
} from '@mui/icons-material'
import { login, fetchMe } from '../store/authSlice'
import type { AppDispatch, RootState } from '../store/store'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPwd, setShowPwd] = useState(false)
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { loading, error } = useSelector((s: RootState) => s.auth)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const result = await dispatch(login({ email, password }))
        if (login.fulfilled.match(result)) {
            await dispatch(fetchMe())
            navigate('/dashboard')
        }
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg)',
        }}>

            <Box sx={{
                width: '100%', maxWidth: 420, mx: 2,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                p: 4,
                position: 'relative',
                boxShadow: 'none',
                className: 'fade-in'
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: '#FAFAFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <LogoIcon sx={{ color: '#000', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Parametrix AI</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Train models without code</Typography>
                    </Box>
                </Box>

                <Typography variant="h4" fontWeight={700} mb={0.5} sx={{ color: 'text.primary' }}>
                    Welcome back
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Sign in to your account to continue
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        id="login-email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                        }}
                    />
                    <TextField
                        id="login-password"
                        label="Password"
                        type={showPwd ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                        InputProps={{
                            startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment>,
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton size="small" onClick={() => setShowPwd(!showPwd)} edge="end">
                                        {showPwd ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        }}
                    />
                    <Button
                        id="login-submit"
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading}
                        sx={{ py: 1.5, mt: 1 }}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>
                </Box>

                <Divider sx={{ my: 3, opacity: 0.3 }} />

                <Typography variant="body2" textAlign="center" sx={{ color: 'text.secondary' }}>
                    Don't have an account?{' '}
                    <Link to="/register" style={{ color: '#818CF8', fontWeight: 600, textDecoration: 'none' }}>
                        Create one free
                    </Link>
                </Typography>
            </Box>
        </Box>
    )
}
