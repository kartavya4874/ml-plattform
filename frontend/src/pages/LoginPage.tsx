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
            background: 'radial-gradient(ellipse at 30% 20%, rgba(99,102,241,0.15) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(16,185,129,0.1) 0%, transparent 50%), #0A0A0F',
        }}>
            {/* Decorative elements */}
            <Box sx={{
                position: 'absolute', top: '15%', right: '10%',
                width: 200, height: 200, borderRadius: '50%',
                background: 'rgba(99,102,241,0.06)',
                filter: 'blur(40px)',
            }} />
            <Box sx={{
                position: 'absolute', bottom: '20%', left: '5%',
                width: 300, height: 300, borderRadius: '50%',
                background: 'rgba(16,185,129,0.05)',
                filter: 'blur(60px)',
            }} />

            <Box sx={{
                width: '100%', maxWidth: 420, mx: 2,
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(24px)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 4,
                p: 4,
                position: 'relative',
                className: 'fade-in'
            }}>
                {/* Logo */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
                    }}>
                        <LogoIcon sx={{ color: 'white', fontSize: 22 }} />
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>NoCode AI Platform</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Train models without code</Typography>
                    </Box>
                </Box>

                <Typography variant="h4" fontWeight={800} mb={0.5} sx={{
                    background: 'linear-gradient(135deg, #6366F1, #10B981)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                }}>
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
