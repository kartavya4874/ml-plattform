import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, TextField, Button, Typography, Alert, InputAdornment } from '@mui/material'
import { Email as EmailIcon, Lock as LockIcon, Person as PersonIcon, AutoAwesome as LogoIcon } from '@mui/icons-material'
import { register } from '../store/authSlice'
import type { AppDispatch, RootState } from '../store/store'

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { loading, error } = useSelector((s: RootState) => s.auth)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const result = await dispatch(register({ email, password, full_name: fullName }))
        if (register.fulfilled.match(result)) navigate('/login')
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
                width: '100%', maxWidth: 440, mx: 2,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                p: 4,
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
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Free to get started</Typography>
                    </Box>
                </Box>

                <Typography variant="h4" fontWeight={700} mb={0.5} sx={{ color: 'text.primary' }}>
                    Create account
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
                    Start building AI models for free — no credit card required
                </Typography>

                {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

                <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField
                        id="reg-name"
                        label="Full Name (optional)"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        fullWidth
                        InputProps={{ startAdornment: <InputAdornment position="start"><PersonIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                    />
                    <TextField
                        id="reg-email"
                        label="Email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        fullWidth
                        InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                    />
                    <TextField
                        id="reg-password"
                        label="Password (min 8 chars)"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        fullWidth
                        InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                    />
                    <Button id="reg-submit" type="submit" variant="contained" fullWidth disabled={loading} sx={{ py: 1.5, mt: 1 }}>
                        {loading ? 'Creating account...' : 'Create Free Account'}
                    </Button>
                </Box>

                <Typography variant="body2" textAlign="center" sx={{ mt: 3, color: 'text.secondary' }}>
                    Already have an account?{' '}
                    <Link to="/login" style={{ color: '#818CF8', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
                </Typography>
            </Box>
        </Box>
    )
}
