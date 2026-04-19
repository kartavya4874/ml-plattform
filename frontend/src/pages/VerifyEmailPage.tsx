import { useEffect, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { Box, Typography, Button, CircularProgress } from '@mui/material'
import { 
    CheckCircleOutline as SuccessIcon, 
    ErrorOutline as ErrorIcon,
    ArrowForward as ArrowIcon
} from '@mui/icons-material'
import { api as client } from '../api/client'
import { useToast } from '../components/ToastProvider'

export default function VerifyEmailPage() {
    const { token } = useParams<{ token: string }>()
    const navigate = useNavigate()
    const { success: successToast, error: errorToast } = useToast()
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
    const [message, setMessage] = useState('Verifying your email address...')

    useEffect(() => {
        const verify = async () => {
            if (!token) {
                setStatus('error')
                setMessage('Invalid verification link.')
                return
            }

            try {
                const response = await client.get(`/auth/verify/${token}`)
                setStatus('success')
                setMessage(response.data.message || 'Email verified successfully!')
                successToast('Your email has been verified. You can now sign in.')
                
                // Optional: Auto redirect after 3 seconds
                setTimeout(() => {
                    navigate('/login')
                }, 3000)
            } catch (err: any) {
                console.error('Verification failed:', err)
                setStatus('error')
                setMessage(err.response?.data?.detail || 'Verification failed. The link may be expired or invalid.')
                errorToast('Verification failed. Please try again.')
            }
        }

        verify()
    }, [token, navigate, successToast, errorToast])

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--bg)',
                p: 3
            }}
        >
            <Box
                className="glass-card"
                sx={{
                    maxWidth: 450,
                    width: '100%',
                    textAlign: 'center',
                    py: 6,
                    px: 4
                }}
            >
                {status === 'loading' && (
                    <>
                        <CircularProgress sx={{ mb: 3, color: 'primary.main' }} />
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Verifying...
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Pleas wait while we confirm your email address.
                        </Typography>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <Box sx={{ 
                            width: 80, height: 80, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3,
                            border: '1px solid rgba(16, 185, 129, 0.2)'
                        }}>
                            <SuccessIcon sx={{ fontSize: 40, color: '#10B981' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Email Verified!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            {message} You will be redirected to login shortly.
                        </Typography>
                        <Button
                            variant="contained"
                            fullWidth
                            endIcon={<ArrowIcon />}
                            onClick={() => navigate('/login')}
                            sx={{ borderRadius: 2, py: 1.2 }}
                        >
                            Sign In Now
                        </Button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <Box sx={{ 
                            width: 80, height: 80, borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 3,
                            border: '1px solid rgba(239, 68, 68, 0.2)'
                        }}>
                            <ErrorIcon sx={{ fontSize: 40, color: '#EF4444' }} />
                        </Box>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Verification Failed
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                            {message}
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                            <Button
                                variant="outlined"
                                color="inherit"
                                fullWidth
                                component={Link}
                                to="/register"
                                sx={{ borderRadius: 2 }}
                            >
                                Back to Register
                            </Button>
                            <Button
                                variant="text"
                                color="primary"
                                fullWidth
                                component={Link}
                                to="/contact"
                                sx={{ borderRadius: 2 }}
                            >
                                Contact Support
                            </Button>
                        </Box>
                    </>
                )}
            </Box>
        </Box>
    )
}
