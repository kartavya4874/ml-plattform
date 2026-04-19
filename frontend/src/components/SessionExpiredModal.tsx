import { useState, useEffect } from 'react'
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Typography, Box
} from '@mui/material'
import { LockClock as SessionIcon } from '@mui/icons-material'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../store/store'

/**
 * Listens for session-expired events dispatched by the API client's 401 interceptor.
 * Shows a polished modal instead of silently redirecting to login.
 */
export default function SessionExpiredModal() {
    const [open, setOpen] = useState(false)
    const token = useSelector((s: RootState) => s.auth.accessToken)
    const dispatch = useDispatch()

    useEffect(() => {
        const handler = () => setOpen(true)
        window.addEventListener('session-expired', handler)
        return () => window.removeEventListener('session-expired', handler)
    }, [])

    const handleLogin = () => {
        setOpen(false)
        dispatch({ type: 'auth/logout' })
        window.location.href = '/login'
    }

    if (!open) return null

    return (
        <Dialog
            open={open}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 3,
                }
            }}
        >
            <DialogTitle sx={{ textAlign: 'center', pt: 4, pb: 1 }}>
                <Box
                    sx={{
                        width: 64, height: 64, borderRadius: '50%', mx: 'auto', mb: 2,
                        background: 'rgba(245, 158, 11, 0.1)',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                >
                    <SessionIcon sx={{ fontSize: 28, color: '#F59E0B' }} />
                </Box>
                <Typography variant="h6" fontWeight={700}>
                    Session Expired
                </Typography>
            </DialogTitle>
            <DialogContent sx={{ textAlign: 'center', pb: 1 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Your session has expired for security reasons. Please sign in again to continue where you left off.
                </Typography>
            </DialogContent>
            <DialogActions sx={{ justifyContent: 'center', pb: 3, px: 3 }}>
                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleLogin}
                    sx={{ py: 1.2, borderRadius: 2 }}
                >
                    Sign In Again
                </Button>
            </DialogActions>
        </Dialog>
    )
}
