import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import {
    Home as HomeIcon,
    Explore as ExploreIcon,
    SentimentVeryDissatisfied,
} from '@mui/icons-material'

export default function NotFoundPage() {
    const navigate = useNavigate()

    return (
        <Box
            className="fade-in"
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '70vh',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}
        >
            {/* Animated background grid */}
            <Box sx={{
                position: 'absolute', inset: 0, opacity: 0.04, pointerEvents: 'none',
                backgroundImage: `
                    linear-gradient(rgba(99,102,241,0.5) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(99,102,241,0.5) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
                animation: 'grid-drift 20s linear infinite',
            }} />

            {/* Floating orbs */}
            <Box sx={{
                position: 'absolute', top: '10%', left: '15%',
                width: 200, height: 200, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99,102,241,0.08), transparent 70%)',
                animation: 'float-orb 6s ease-in-out infinite',
                pointerEvents: 'none',
            }} />
            <Box sx={{
                position: 'absolute', bottom: '15%', right: '10%',
                width: 250, height: 250, borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(236,72,153,0.06), transparent 70%)',
                animation: 'float-orb 8s ease-in-out infinite 1s',
                pointerEvents: 'none',
            }} />

            {/* Icon */}
            <Box sx={{
                width: 80, height: 80, borderRadius: '24px', mb: 3,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(236,72,153,0.1))',
                border: '1px solid rgba(99,102,241,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
                <SentimentVeryDissatisfied sx={{ fontSize: 40, color: '#6366F1' }} />
            </Box>

            {/* 404 heading */}
            <Typography
                variant="h1"
                sx={{
                    fontSize: { xs: 80, sm: 120 },
                    fontWeight: 900,
                    lineHeight: 1,
                    mb: 1,
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #EC4899 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.04em',
                }}
            >
                404
            </Typography>

            <Typography variant="h5" fontWeight={700} mb={1}>
                Page Not Found
            </Typography>
            <Typography
                variant="body1"
                sx={{ color: 'text.secondary', maxWidth: 420, mb: 4, lineHeight: 1.7 }}
            >
                This page doesn't exist or has been moved.
                Let's get you back on track.
            </Typography>

            {/* Action buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                <Button
                    id="404-back-dashboard"
                    variant="contained"
                    size="large"
                    startIcon={<HomeIcon />}
                    onClick={() => navigate('/dashboard')}
                    sx={{ px: 4 }}
                >
                    Back to Dashboard
                </Button>
                <Button
                    id="404-explore"
                    variant="outlined"
                    size="large"
                    startIcon={<ExploreIcon />}
                    onClick={() => navigate('/explore')}
                    sx={{ px: 4 }}
                >
                    Explore Hub
                </Button>
            </Box>

            {/* Animations */}
            <style>{`
                @keyframes grid-drift {
                    0% { transform: translate(0, 0); }
                    100% { transform: translate(60px, 60px); }
                }
                @keyframes float-orb {
                    0%, 100% { transform: translate(0, 0) scale(1); }
                    50% { transform: translate(20px, -20px) scale(1.1); }
                }
            `}</style>
        </Box>
    )
}
