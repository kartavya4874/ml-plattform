import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Container, Grid, Chip } from '@mui/material'
import {
    AutoAwesome as LogoIcon,
    CloudUpload as UploadIcon,
    Psychology as TrainIcon,
    RocketLaunch as DeployIcon,
    Code as NotebookIcon,
    EmojiEvents as CompIcon,
    Hub as HubIcon,
    People as PeopleIcon,
    Storage as StorageIcon,
    Speed as SpeedIcon,
    ArrowForward,
    Login as LoginIcon,
} from '@mui/icons-material'

/* ── Animated counter ──────────────────────────────────────────────────────── */
function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0)
    const ref = useRef<HTMLSpanElement>(null)

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    let start = 0
                    const duration = 2000
                    const step = target / (duration / 16)
                    const interval = setInterval(() => {
                        start += step
                        if (start >= target) {
                            setCount(target)
                            clearInterval(interval)
                        } else {
                            setCount(Math.floor(start))
                        }
                    }, 16)
                    observer.disconnect()
                }
            },
            { threshold: 0.3 }
        )
        if (ref.current) observer.observe(ref.current)
        return () => observer.disconnect()
    }, [target])

    return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ── Feature card ──────────────────────────────────────────────────────────── */
const FeatureCard = ({ icon, title, desc, color }: any) => (
    <Box sx={{
        p: 3, borderRadius: 3,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'all 0.3s ease',
        '&:hover': {
            transform: 'translateY(-6px)',
            borderColor: `${color}40`,
            background: `${color}08`,
            boxShadow: `0 12px 40px ${color}15`,
        },
    }}>
        <Box sx={{
            width: 48, height: 48, borderRadius: '14px', mb: 2,
            background: `${color}15`, border: `1px solid ${color}25`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
        }}>
            {icon}
        </Box>
        <Typography variant="h6" fontWeight={700} mb={0.5} sx={{ fontSize: 16, color: '#FAFAFA' }}>{title}</Typography>
        <Typography variant="body2" sx={{ color: '#A1A1AA', lineHeight: 1.6 }}>{desc}</Typography>
    </Box>
)

/* ── Main Landing Page ─────────────────────────────────────────────────────── */
export default function LandingPage() {
    const navigate = useNavigate()

    return (
        <Box sx={{
            minHeight: '100vh',
            background: '#000000',
            color: '#FAFAFA',
            overflow: 'hidden',
        }}>
            {/* Nav */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: { xs: 3, md: 6 }, py: 2,
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                position: 'sticky', top: 0, zIndex: 10,
                background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(12px)',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        background: '#FAFAFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <LogoIcon sx={{ color: '#000', fontSize: 18 }} />
                    </Box>
                    <Typography variant="h6" fontWeight={800}>NexusML</Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1.5 }}>
                    <Button
                        variant="outlined"
                        startIcon={<LoginIcon />}
                        onClick={() => navigate('/login')}
                        sx={{
                            borderColor: 'rgba(255,255,255,0.15)', color: '#FAFAFA',
                            '&:hover': { borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' },
                        }}
                    >
                        Sign In
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => navigate('/register')}
                        sx={{ background: '#FAFAFA', color: '#000', '&:hover': { background: '#E4E4E7' } }}
                    >
                        Get Started Free
                    </Button>
                </Box>
            </Box>

            {/* Hero */}
            <Box sx={{
                position: 'relative',
                textAlign: 'center',
                pt: { xs: 10, md: 16 }, pb: { xs: 10, md: 14 },
                px: 3,
            }}>
                {/* Radial gradient background */}
                <Box sx={{
                    position: 'absolute', inset: 0, pointerEvents: 'none',
                    background: 'radial-gradient(ellipse 80% 50% at 50% 0%, rgba(99,102,241,0.12), transparent)',
                }} />
                <Box sx={{
                    position: 'absolute', top: '20%', left: '50%', transform: 'translateX(-50%)',
                    width: 600, height: 600, borderRadius: '50%', pointerEvents: 'none',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)',
                    animation: 'float-orb 10s ease-in-out infinite',
                }} />

                <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                    <Chip
                        label="✨ No-Code AI Platform"
                        sx={{
                            mb: 3, background: 'rgba(99,102,241,0.12)', color: '#818CF8',
                            border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600, fontSize: 13,
                        }}
                    />
                    <Typography
                        variant="h1"
                        sx={{
                            fontSize: { xs: 36, sm: 48, md: 64 },
                            fontWeight: 900,
                            lineHeight: 1.1,
                            mb: 3,
                            letterSpacing: '-0.03em',
                        }}
                    >
                        Build AI Models{' '}
                        <Box component="span" sx={{
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 40%, #EC4899 100%)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}>
                            Without Code
                        </Box>
                    </Typography>
                    <Typography
                        variant="h5"
                        sx={{ color: '#A1A1AA', maxWidth: 560, mx: 'auto', mb: 5, lineHeight: 1.6, fontWeight: 400, fontSize: { xs: 16, md: 20 } }}
                    >
                        Upload your data, train state-of-the-art machine learning models with AutoML,
                        and deploy production REST APIs — all from a single platform.
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
                        <Button
                            id="landing-cta-register"
                            variant="contained"
                            size="large"
                            endIcon={<ArrowForward />}
                            onClick={() => navigate('/register')}
                            sx={{
                                px: 4, py: 1.5, fontSize: 16, fontWeight: 700,
                                background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                                border: '1px solid rgba(99,102,241,0.5)',
                                '&:hover': { background: 'linear-gradient(135deg, #5558E8 0%, #7C4FE0 100%)' },
                            }}
                        >
                            Start Building Free
                        </Button>
                        <Button
                            id="landing-cta-login"
                            variant="outlined"
                            size="large"
                            onClick={() => navigate('/login')}
                            sx={{
                                px: 4, py: 1.5, fontSize: 16,
                                borderColor: 'rgba(255,255,255,0.15)', color: '#FAFAFA',
                                '&:hover': { borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' },
                            }}
                        >
                            Sign In
                        </Button>
                    </Box>
                </Container>
            </Box>

            {/* Stats */}
            <Box sx={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                py: 5,
            }}>
                <Container maxWidth="md">
                    <Grid container spacing={4} justifyContent="center" textAlign="center">
                        {[
                            { val: 1200, suffix: '+', label: 'Models Trained' },
                            { val: 580, suffix: '+', label: 'Datasets Uploaded' },
                            { val: 340, suffix: '+', label: 'Active Users' },
                            { val: 99, suffix: '%', label: 'Uptime SLA' },
                        ].map((s, i) => (
                            <Grid size={{ xs: 6, md: 3 }} key={i}>
                                <Typography variant="h3" fontWeight={900} sx={{ color: '#FAFAFA', mb: 0.5 }}>
                                    <AnimCounter target={s.val} suffix={s.suffix} />
                                </Typography>
                                <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>{s.label}</Typography>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* How It Works */}
            <Box sx={{ py: { xs: 10, md: 14 }, px: 3 }}>
                <Container maxWidth="md">
                    <Typography variant="h3" fontWeight={800} textAlign="center" mb={1}>
                        How It Works
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#A1A1AA', textAlign: 'center', mb: 6, maxWidth: 500, mx: 'auto' }}>
                        Go from raw data to a deployed AI model in three simple steps
                    </Typography>
                    <Grid container spacing={4}>
                        {[
                            { step: '01', icon: <UploadIcon sx={{ fontSize: 32 }} />, title: 'Upload Data', desc: 'Drag & drop your CSV, Excel, or image files. We auto-detect schemas, data types, and quality issues.', color: '#6366F1' },
                            { step: '02', icon: <TrainIcon sx={{ fontSize: 32 }} />, title: 'Train Model', desc: 'Choose your target, pick an algorithm (or let AutoML decide), and train. Get metrics, confusion matrices, and feature importance.', color: '#10B981' },
                            { step: '03', icon: <DeployIcon sx={{ fontSize: 32 }} />, title: 'Deploy API', desc: 'One-click deployment generates a REST API with authentication, monitoring, and usage analytics built in.', color: '#F59E0B' },
                        ].map((s, i) => (
                            <Grid size={{ xs: 12, md: 4 }} key={i}>
                                <Box sx={{
                                    p: 3, borderRadius: 3, height: '100%',
                                    background: 'rgba(255,255,255,0.02)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    transition: 'border-color 0.3s',
                                    '&:hover': { borderColor: `${s.color}40` },
                                }}>
                                    <Typography variant="caption" sx={{ color: s.color, fontWeight: 800, fontSize: 12, letterSpacing: 2 }}>
                                        STEP {s.step}
                                    </Typography>
                                    <Box sx={{
                                        width: 56, height: 56, borderRadius: '16px', my: 2,
                                        background: `${s.color}12`, border: `1px solid ${s.color}25`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: s.color,
                                    }}>
                                        {s.icon}
                                    </Box>
                                    <Typography variant="h6" fontWeight={700} mb={1}>{s.title}</Typography>
                                    <Typography variant="body2" sx={{ color: '#A1A1AA', lineHeight: 1.7 }}>{s.desc}</Typography>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Features Grid */}
            <Box sx={{
                py: { xs: 10, md: 14 }, px: 3,
                background: 'rgba(255,255,255,0.01)',
                borderTop: '1px solid rgba(255,255,255,0.06)',
            }}>
                <Container maxWidth="lg">
                    <Typography variant="h3" fontWeight={800} textAlign="center" mb={1}>
                        Everything You Need
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#A1A1AA', textAlign: 'center', mb: 6, maxWidth: 500, mx: 'auto' }}>
                        A complete ecosystem for building, deploying, and sharing machine learning
                    </Typography>
                    <Grid container spacing={3}>
                        {[
                            { icon: <SpeedIcon />, title: 'AutoML Training', desc: 'Automatic algorithm selection, hyperparameter tuning, and cross-validation', color: '#6366F1' },
                            { icon: <DeployIcon />, title: 'One-Click Deploy', desc: 'Production REST APIs with API key auth, rate limiting, and usage monitoring', color: '#10B981' },
                            { icon: <NotebookIcon />, title: 'Cloud Notebooks', desc: 'Browser-based Python notebooks with real execution — like Google Colab', color: '#3B82F6' },
                            { icon: <CompIcon />, title: 'Competitions', desc: 'Kaggle-style leaderboards to benchmark your models against others', color: '#F59E0B' },
                            { icon: <PeopleIcon />, title: 'Community', desc: 'Follow users, star datasets, fork notebooks, and discuss in threaded forums', color: '#EC4899' },
                            { icon: <HubIcon />, title: 'Model Hub', desc: 'Version, compare, and manage all your trained models in one place', color: '#8B5CF6' },
                            { icon: <StorageIcon />, title: 'Data Studio', desc: 'Automated EDA, data profiling, preprocessing, and quality scoring', color: '#14B8A6' },
                            { icon: <LogoIcon />, title: 'Explainability', desc: 'SHAP values, feature importance, and plain-English model explanations', color: '#F97316' },
                        ].map((f, i) => (
                            <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={i}>
                                <FeatureCard {...f} />
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* CTA */}
            <Box sx={{
                py: { xs: 10, md: 14 }, px: 3,
                textAlign: 'center',
                borderTop: '1px solid rgba(255,255,255,0.06)',
                position: 'relative',
            }}>
                <Box sx={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: 500, height: 500, borderRadius: '50%', pointerEvents: 'none',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.06), transparent 70%)',
                }} />
                <Container maxWidth="sm" sx={{ position: 'relative', zIndex: 1 }}>
                    <Typography variant="h3" fontWeight={800} mb={2}>
                        Ready to Build?
                    </Typography>
                    <Typography variant="body1" sx={{ color: '#A1A1AA', mb: 4, lineHeight: 1.7 }}>
                        Join hundreds of developers and data scientists building
                        AI models without writing a single line of code.
                    </Typography>
                    <Button
                        id="landing-bottom-cta"
                        variant="contained"
                        size="large"
                        endIcon={<ArrowForward />}
                        onClick={() => navigate('/register')}
                        sx={{
                            px: 5, py: 1.5, fontSize: 16, fontWeight: 700,
                            background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)',
                            border: '1px solid rgba(99,102,241,0.5)',
                            '&:hover': { background: 'linear-gradient(135deg, #5558E8 0%, #7C4FE0 100%)' },
                        }}
                    >
                        Get Started — It's Free
                    </Button>
                </Container>
            </Box>

            {/* Footer */}
            <Box sx={{
                borderTop: '1px solid rgba(255,255,255,0.06)',
                py: 4, px: 3, textAlign: 'center',
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                    <Box sx={{
                        width: 28, height: 28, borderRadius: '8px', background: '#FAFAFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <LogoIcon sx={{ color: '#000', fontSize: 14 }} />
                    </Box>
                    <Typography variant="body2" fontWeight={700}>NexusML</Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#6B7280' }}>
                    © {new Date().getFullYear()} NexusML. Built for the ML community.
                </Typography>
            </Box>

            {/* Global animations */}
            <style>{`
                @keyframes float-orb {
                    0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
                    50% { transform: translateX(-50%) scale(1.15); opacity: 0.8; }
                }
            `}</style>
        </Box>
    )
}
