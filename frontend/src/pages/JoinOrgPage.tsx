import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Paper, Typography, Box, Button, CircularProgress, Alert } from '@mui/material';
import { Business as BusinessIcon, CheckCircle as CheckCircleIcon } from '@mui/icons-material';
import { api } from '../api/client';
import { useSelector } from 'react-redux';
import type { RootState } from '../store/store';

export default function JoinOrgPage() {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { token: userToken, isAuthenticated } = useSelector((s: RootState) => s.auth);

    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid invite link.');
            return;
        }

        if (!isAuthenticated) {
            // Save token and redirect to login
            localStorage.setItem('pending_invite', token);
            navigate('/login');
            return;
        }

        const joinOrg = async () => {
            try {
                await api.post(`/orgs/join/${token}`);
                setStatus('success');
                setMessage('Successfully joined the organization!');
            } catch (e: any) {
                setStatus('error');
                setMessage(e.response?.data?.detail || 'Failed to join organization. The link may have expired.');
            }
        };

        joinOrg();
    }, [token, isAuthenticated, navigate]);

    return (
        <Container maxWidth="sm" sx={{ py: 10 }}>
            <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 4 }}>
                <Box sx={{ mb: 3 }}>
                    {status === 'loading' && <CircularProgress color="primary" />}
                    {status === 'success' && <CheckCircleIcon color="success" sx={{ fontSize: 60 }} />}
                    {status === 'error' && <BusinessIcon color="error" sx={{ fontSize: 60 }} />}
                </Box>
                
                <Typography variant="h5" fontWeight={700} mb={2}>
                    Organization Invitation
                </Typography>

                {status === 'loading' && (
                    <Typography color="text.secondary">Processing your invitation...</Typography>
                )}

                {status === 'success' && (
                    <>
                        <Alert severity="success" sx={{ mb: 3 }}>{message}</Alert>
                        <Button variant="contained" fullWidth onClick={() => navigate('/organizations')}>
                            Go to Organization Dashboard
                        </Button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <Alert severity="error" sx={{ mb: 3 }}>{message}</Alert>
                        <Button variant="outlined" fullWidth onClick={() => navigate('/dashboard')}>
                            Return to Dashboard
                        </Button>
                    </>
                )}
            </Paper>
        </Container>
    );
}
