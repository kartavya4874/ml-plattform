import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
    Box, Typography, Container, Button, useTheme, IconButton, Divider,
    Card, TextField, Grid, Snackbar, Alert,
} from '@mui/material'
import {
    ArrowBack as BackIcon,
    AutoAwesome as LogoIcon,
    DarkModeOutlined as DarkModeIcon,
    LightModeOutlined as LightModeIcon,
    EmailOutlined as EmailIcon,
    LocationOnOutlined as LocationIcon,
    SupportAgentOutlined as SupportIcon,
    Send as SendIcon,
} from '@mui/icons-material'
import { useDispatch } from 'react-redux'
import { toggleTheme } from '../store/themeSlice'
import { api } from '../api/client'

const COMPANY_NAME = 'Parametrix AI'
const WEBSITE_URL = 'https://paramatrix.in'
const CONTACT_EMAIL = 'support@paramatrix.in'

interface ContactCardProps {
    icon: React.ReactNode
    title: string
    detail: string
    subDetail?: string
    color: string
}

function ContactCard({ icon, title, detail, subDetail, color }: ContactCardProps) {
    const theme = useTheme()
    return (
        <Card sx={{
            p: 4, borderRadius: 4, height: '100%',
            background: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
            border: `1px solid ${theme.palette.divider}`,
            transition: 'all 0.3s ease',
            '&:hover': {
                borderColor: `${color}60`,
                boxShadow: `0 8px 30px ${color}15`,
                transform: 'translateY(-2px)',
            },
        }}>
            <Box sx={{
                width: 52, height: 52, borderRadius: 3,
                background: `${color}15`, border: `1px solid ${color}25`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color, mb: 3,
            }}>
                {icon}
            </Box>
            <Typography variant="h6" fontWeight={700} sx={{ mb: 1 }}>{title}</Typography>
            <Typography variant="body1" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>
                {detail}
            </Typography>
            {subDetail && (
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mt: 1, fontStyle: 'italic' }}>
                    {subDetail}
                </Typography>
            )}
        </Card>
    )
}

export default function ContactUsPage() {
    const navigate = useNavigate()
    const theme = useTheme()
    const dispatch = useDispatch()
    const isDark = theme.palette.mode === 'dark'

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        subject: '',
        message: '',
    })
    const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({
        open: false, message: '', severity: 'success',
    })

    const handleChange = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setFormData(prev => ({ ...prev, [field]: e.target.value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name || !formData.email || !formData.message) {
            setSnackbar({ open: true, message: 'Please fill in all required fields.', severity: 'error' })
            return
        }
        try {
            await api.post('/contact', formData)
            setSnackbar({ open: true, message: 'Thank you! Your message has been received. We will get back to you within 24-48 hours.', severity: 'success' })
            setFormData({ name: '', email: '', subject: '', message: '' })
        } catch (error: any) {
            setSnackbar({ open: true, message: error.response?.data?.detail || 'Failed to send message. Please try again later.', severity: 'error' })
        }
    }

    return (
        <Box sx={{
            minHeight: '100vh',
            background: theme.palette.background.default,
            color: theme.palette.text.primary,
            transition: 'background 0.3s ease',
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: { xs: 3, md: 8 }, py: 2,
                position: 'sticky', top: 0, zIndex: 50,
                background: isDark ? 'rgba(9, 9, 11, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${theme.palette.divider}`,
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/')}>
                    <Box sx={{
                        width: 32, height: 32, borderRadius: '8px',
                        background: isDark ? '#FAFAFA' : '#18181B',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <LogoIcon sx={{ color: isDark ? '#000' : '#FFF', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">Parametrix AI</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => dispatch(toggleTheme())} sx={{ color: theme.palette.text.secondary }}>
                        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                    </IconButton>
                    <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate(-1)}
                        sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, fontWeight: 600, borderRadius: 2 }}>
                        Back
                    </Button>
                </Box>
            </Box>

            {/* Content */}
            <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
                {/* Hero */}
                <Box sx={{ textAlign: 'center', mb: 8 }}>
                    <Typography variant="h3" fontWeight={900} sx={{ mb: 2, letterSpacing: '-0.03em' }}>
                        Get in Touch
                    </Typography>
                    <Typography variant="h6" sx={{ color: theme.palette.text.secondary, fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
                        Have a question, feedback, or need help? We'd love to hear from you. Our team typically responds within 24–48 hours.
                    </Typography>
                    <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mt: 2 }}>
                        Built by <strong style={{ color: theme.palette.text.primary }}>Kartavya Baluja</strong> — Founder, Parametrix AI
                    </Typography>
                </Box>

                {/* Contact Cards */}
                <Grid container spacing={3} sx={{ mb: 8 }}>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <ContactCard
                            icon={<EmailIcon />}
                            title="Email Us"
                            detail={CONTACT_EMAIL}
                            subDetail="For general inquiries and support"
                            color="#6366F1"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <ContactCard
                            icon={<SupportIcon />}
                            title="Technical Support"
                            detail="Get help with platform issues, billing, or account-related queries."
                            subDetail="Response time: 24-48 hours"
                            color="#10B981"
                        />
                    </Grid>
                    <Grid size={{ xs: 12, md: 4 }}>
                        <ContactCard
                            icon={<LocationIcon />}
                            title="Registered Address"
                            detail="House Number 453, Sector 25 Part 2, HUDA"
                            subDetail="Panipat, Haryana - 132103"
                            color="#F59E0B"
                        />
                    </Grid>
                </Grid>

                <Divider sx={{ mb: 8, borderColor: theme.palette.divider }} />

                {/* Contact Form */}
                <Grid container spacing={6} alignItems="flex-start">
                    <Grid size={{ xs: 12, md: 5 }}>
                        <Typography variant="h4" fontWeight={800} sx={{ mb: 2, letterSpacing: '-0.02em' }}>
                            Send Us a Message
                        </Typography>
                        <Typography variant="body1" sx={{ color: theme.palette.text.secondary, lineHeight: 1.8, mb: 3 }}>
                            Fill out the form and our team will respond as soon as possible. For urgent billing or payment issues, please include your registered email and transaction details.
                        </Typography>
                        <Box sx={{ p: 3, borderRadius: 3, background: isDark ? 'rgba(99,102,241,0.06)' : 'rgba(99,102,241,0.04)', border: `1px solid ${isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)'}` }}>
                            <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>
                                💡 <strong>Tip:</strong> For faster resolution, include relevant details like your account email, subscription tier, and a clear description of the issue.
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 7 }}>
                        <Card sx={{
                            p: 4, borderRadius: 4,
                            background: isDark ? 'rgba(255,255,255,0.02)' : '#FFFFFF',
                            border: `1px solid ${theme.palette.divider}`,
                        }}>
                            <form onSubmit={handleSubmit}>
                                <Grid container spacing={2}>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            fullWidth label="Your Name *" variant="outlined"
                                            value={formData.name} onChange={handleChange('name')}
                                            id="contact-name"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12, sm: 6 }}>
                                        <TextField
                                            fullWidth label="Email Address *" variant="outlined" type="email"
                                            value={formData.email} onChange={handleChange('email')}
                                            id="contact-email"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth label="Subject" variant="outlined"
                                            value={formData.subject} onChange={handleChange('subject')}
                                            placeholder="e.g., Billing Inquiry, Technical Issue, Feedback"
                                            id="contact-subject"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <TextField
                                            fullWidth label="Message *" variant="outlined" multiline rows={5}
                                            value={formData.message} onChange={handleChange('message')}
                                            placeholder="Describe your question or issue in detail..."
                                            id="contact-message"
                                        />
                                    </Grid>
                                    <Grid size={{ xs: 12 }}>
                                        <Button
                                            type="submit" variant="contained" size="large"
                                            endIcon={<SendIcon />}
                                            fullWidth
                                            id="contact-submit"
                                            sx={{
                                                py: 1.8, fontWeight: 700, fontSize: 16, borderRadius: 3,
                                                background: isDark ? '#FAFAFA' : '#18181B',
                                                color: isDark ? '#09090B' : '#FFFFFF',
                                                boxShadow: 'none',
                                                '&:hover': {
                                                    background: isDark ? '#E4E4E7' : '#27272A',
                                                    boxShadow: theme.shadows[4],
                                                },
                                            }}
                                        >
                                            Send Message
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </Card>
                    </Grid>
                </Grid>
            </Container>

            {/* Footer */}
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 4, px: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 0.5 }}>
                    © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    Founded by <strong>Kartavya Baluja</strong>
                </Typography>
            </Box>

            {/* Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
                    severity={snackbar.severity}
                    variant="filled"
                    sx={{ borderRadius: 2 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    )
}
