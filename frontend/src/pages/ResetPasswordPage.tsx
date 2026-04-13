import { useState } from 'react'
import { useParams, useNavigate, Link as RouterLink } from 'react-router-dom'
import { Box, Button, TextField, Typography, Alert, Link } from '@mui/material'
import { api } from '../api/client'

export default function ResetPasswordPage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState('')

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match!")
            setStatus('error')
            return
        }
        if (password.length < 8) {
            setErrorMsg("Password must be at least 8 characters.")
            setStatus('error')
            return
        }
        
        setStatus('loading')
        setErrorMsg('')
        try {
            await api.post('/auth/reset-password', { token, new_password: password })
            setStatus('success')
            setTimeout(() => {
                navigate('/login')
            }, 3000)
        } catch (err: any) {
            setErrorMsg(err.response?.data?.detail || 'Invalid or expired token.')
            setStatus('error')
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
                <Box textAlign="center" mb={4}>
                    <Typography variant="h4" fontWeight="800" sx={{ mb: 1, background: 'linear-gradient(90deg, #60A5FA, #A78BFA)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Set New Password
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Please enter your new password below.
                    </Typography>
                </Box>

                {status === 'success' ? (
                    <Box textAlign="center">
                        <Alert severity="success" sx={{ mb: 3 }}>
                            Your password has been successfully reset! Redirecting to login...
                        </Alert>
                        <Button component={RouterLink} to="/login" variant="contained" fullWidth>
                            Go to Login manually
                        </Button>
                    </Box>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {status === 'error' && (
                            <Alert severity="error" sx={{ mb: 3 }}>{errorMsg}</Alert>
                        )}
                        
                        <TextField
                            label="New Password"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />

                        <TextField
                            label="Confirm New Password"
                            variant="outlined"
                            fullWidth
                            margin="normal"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />

                        <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            fullWidth
                            size="large"
                            sx={{ mt: 3, mb: 2 }}
                            disabled={status === 'loading'}
                        >
                            {status === 'loading' ? 'Saving...' : 'Reset Password'}
                        </Button>
                        
                        <Typography textAlign="center" variant="body2">
                            <Link component={RouterLink} to="/login" underline="hover">
                                Back to Login
                            </Link>
                        </Typography>
                    </form>
                )}
            </Box>
        </Box>
    )
}
