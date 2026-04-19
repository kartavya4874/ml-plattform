import { useState, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { Box, TextField, Button, Typography, Alert, InputAdornment, LinearProgress } from '@mui/material'
import { Email as EmailIcon, Lock as LockIcon, Person as PersonIcon, AutoAwesome as LogoIcon } from '@mui/icons-material'
import { register } from '../store/authSlice'
import { useToast } from '../components/ToastProvider'
import type { AppDispatch, RootState } from '../store/store'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
    if (!pwd) return { score: 0, label: '', color: '#6B7280' }
    let score = 0
    if (pwd.length >= 8) score++
    if (pwd.length >= 12) score++
    if (/[A-Z]/.test(pwd)) score++
    if (/[0-9]/.test(pwd)) score++
    if (/[^A-Za-z0-9]/.test(pwd)) score++

    if (score <= 1) return { score: 20, label: 'Weak', color: '#EF4444' }
    if (score === 2) return { score: 40, label: 'Fair', color: '#F59E0B' }
    if (score === 3) return { score: 60, label: 'Good', color: '#F59E0B' }
    if (score === 4) return { score: 80, label: 'Strong', color: '#10B981' }
    return { score: 100, label: 'Very Strong', color: '#10B981' }
}

export default function RegisterPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [fullName, setFullName] = useState('')
    const [touched, setTouched] = useState({ email: false, password: false })
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const { loading, error } = useSelector((s: RootState) => s.auth)
    const { success: successToast } = useToast()

    const emailError = useMemo(() => {
        if (!touched.email || !email) return ''
        return EMAIL_REGEX.test(email) ? '' : 'Enter a valid email address'
    }, [email, touched.email])

    const passwordError = useMemo(() => {
        if (!touched.password || !password) return ''
        return password.length >= 8 ? '' : 'Password must be at least 8 characters'
    }, [password, touched.password])

    const strength = useMemo(() => getPasswordStrength(password), [password])
    const isValid = email && password.length >= 8 && EMAIL_REGEX.test(email)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setTouched({ email: true, password: true })
        if (!isValid) return
        const result = await dispatch(register({ email, password, full_name: fullName }))
        if (register.fulfilled.match(result)) {
            successToast('Account created successfully! Please sign in.')
            navigate('/login')
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
                width: '100%', maxWidth: 440, mx: 2,
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderRadius: 3,
                p: 4,
            }}
                className="fade-in"
            >
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
                        onBlur={() => setTouched(t => ({ ...t, email: true }))}
                        error={!!emailError}
                        helperText={emailError}
                        required
                        fullWidth
                        InputProps={{ startAdornment: <InputAdornment position="start"><EmailIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                    />
                    <Box>
                        <TextField
                            id="reg-password"
                            label="Password (min 8 chars)"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            onBlur={() => setTouched(t => ({ ...t, password: true }))}
                            error={!!passwordError}
                            helperText={passwordError}
                            required
                            fullWidth
                            InputProps={{ startAdornment: <InputAdornment position="start"><LockIcon sx={{ color: 'text.secondary', fontSize: 18 }} /></InputAdornment> }}
                        />
                        {password && (
                            <Box sx={{ mt: 1 }}>
                                <LinearProgress
                                    variant="determinate"
                                    value={strength.score}
                                    sx={{
                                        height: 4,
                                        borderRadius: 2,
                                        backgroundColor: 'var(--border)',
                                        '& .MuiLinearProgress-bar': {
                                            borderRadius: 2,
                                            backgroundColor: strength.color,
                                            transition: 'width 0.3s ease, background-color 0.3s ease',
                                        },
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{ color: strength.color, fontWeight: 600, mt: 0.5, display: 'block' }}
                                >
                                    {strength.label}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                    <Button
                        id="reg-submit"
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={loading || (!isValid && touched.email && touched.password)}
                        sx={{ py: 1.5, mt: 1 }}
                    >
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
