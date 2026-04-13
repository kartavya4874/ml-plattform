import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Container, Grid, Chip } from '@mui/material'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
    AutoAwesome as LogoIcon,
    CloudUpload as UploadIcon,
    Psychology as TrainIcon,
    RocketLaunch as DeployIcon,
    Code as NotebookIcon,
    EmojiEvents as CompIcon,
    Hub as HubIcon,
    Storage as StorageIcon,
    Speed as SpeedIcon,
    ArrowForward,
    PlayArrow as PlayIcon,
    AutoGraph as AutoGraphIcon,
} from '@mui/icons-material'

/* ── Container Variants ──────────────────────────────────────────────────────── */
const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            staggerChildren: 0.15
        }
    }
}

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 100 } }
}

/* ── Animated Counters ─────────────────────────────────────────────────────── */
function AnimCounter({ target, suffix = '' }: { target: number; suffix?: string }) {
    const [count, setCount] = useState(0)

    useEffect(() => {
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
        return () => clearInterval(interval)
    }, [target])

    return <span>{count.toLocaleString()}{suffix}</span>
}

/* ── Abstract Dashboard Mockup ─────────────────────────────────────────────── */
const AbstractDashboard = () => {
    return (
        <Box sx={{
            position: 'relative',
            width: '100%',
            height: 400,
            borderRadius: 6,
            background: 'rgba(20, 20, 22, 0.7)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
            display: { xs: 'none', lg: 'block' }
        }}>
            {/* Header */}
            <Box sx={{
                h: 48, p: 2, borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', gap: 1
            }}>
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#EF4444' }} />
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#F59E0B' }} />
                <Box sx={{ width: 12, height: 12, borderRadius: '50%', background: '#10B981' }} />
            </Box>
            
            <Box sx={{ display: 'flex', height: 'calc(100% - 48px)' }}>
                {/* Sidebar */}
                <Box sx={{ width: 80, borderRight: '1px solid rgba(255,255,255,0.05)', p: 2 }}>
                    {[...Array(4)].map((_, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.5 + (i * 0.1) }}
                        >
                            <Box sx={{ width: 40, height: 40, borderRadius: 2, background: 'rgba(255,255,255,0.05)', mb: 2 }} />
                        </motion.div>
                    ))}
                </Box>
                
                {/* Main Content */}
                <Box sx={{ flex: 1, p: 4, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}>
                        <Box sx={{ width: '40%', height: 24, borderRadius: 1, background: 'rgba(255,255,255,0.1)' }} />
                    </motion.div>
                    
                    <Box sx={{ display: 'flex', gap: 2, height: 100 }}>
                        {[...Array(3)].map((_, i) => (
                            <motion.div
                                key={i}
                                style={{ flex: 1, height: '100%' }}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 1.2 + (i * 0.1) }}
                            >
                                <Box sx={{
                                    height: '100%', borderRadius: 3, 
                                    background: `linear-gradient(135deg, rgba(99,102,241,${0.1 + (i*0.05)}) 0%, rgba(139,92,246,${0.05}) 100%)`, 
                                    border: '1px solid rgba(99,102,241,0.2)' 
                                }} />
                            </motion.div>
                        ))}
                    </Box>

                    <motion.div
                        style={{ flex: 1, width: '100%' }}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.6 }}
                    >
                        <Box sx={{
                            height: '100%', borderRadius: 3,
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            position: 'relative', overflow: 'hidden'
                        }}>
                             {/* Faux graph line */}
                             <svg viewBox="0 0 400 100" style={{ position: 'absolute', bottom: 0, width: '100%', height: '100%' }} preserveAspectRatio="none">
                                <motion.path
                                    d="M0 100 Q 50 20 100 60 T 200 40 T 300 70 T 400 10"
                                    fill="none"
                                    stroke="#6366F1"
                                    strokeWidth="3"
                                    initial={{ pathLength: 0 }}
                                    animate={{ pathLength: 1 }}
                                    transition={{ duration: 2, delay: 1.8, ease: "easeOut" }}
                                />
                                <motion.path
                                    d="M0 100 Q 50 20 100 60 T 200 40 T 300 70 T 400 10 L 400 100 L 0 100 Z"
                                    fill="rgba(99,102,241,0.1)"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ duration: 1, delay: 2.8 }}
                                />
                             </svg>
                        </Box>
                    </motion.div>
                </Box>
            </Box>
        </Box>
    )
}

/* ── Feature card ──────────────────────────────────────────────────────────── */
interface FeatureCardProps {
    icon: React.ReactNode;
    title: string;
    desc: string;
    color: string;
}

const FeatureCard = ({ icon, title, desc, color }: FeatureCardProps) => {
    return (
        <motion.div variants={itemVariants} whileHover={{ y: -8 }}>
            <Box sx={{
                p: 3, borderRadius: 4, height: '100%',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.08)',
                position: 'relative', overflow: 'hidden',
                '&::before': {
                    content: '""',
                    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: 4, padding: '2px',
                    background: `linear-gradient(135deg, ${color}40, transparent)`,
                    WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                    WebkitMaskComposite: 'xor',
                    maskComposite: 'exclude',
                }
            }}>
                <Box sx={{
                    width: 52, height: 52, borderRadius: 3, mb: 3,
                    background: `linear-gradient(135deg, rgba(255,255,255,0.05), ${color}20)`,
                    border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: color,
                    boxShadow: `0 8px 32px ${color}15`
                }}>
                    {icon}
                </Box>
                <Typography variant="h6" fontWeight={700} mb={1} sx={{ fontSize: 18, color: '#FAFAFA' }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: '#A1A1AA', lineHeight: 1.6, fontSize: 15 }}>{desc}</Typography>
            </Box>
        </motion.div>
    )
}

/* ── Main Landing Page ─────────────────────────────────────────────────────── */
export default function LandingPage() {
    const navigate = useNavigate()
    const { scrollYProgress } = useScroll()
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 300])
    const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0])

    return (
        <Box sx={{
            minHeight: '100vh',
            background: '#09090B',
            color: '#FAFAFA',
            overflowX: 'hidden',
        }}>
            {/* Nav */}
            <motion.div
                initial={{ y: -100 }}
                animate={{ y: 0 }}
                transition={{ type: 'spring', stiffness: 50, delay: 0.2 }}
            >
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: { xs: 3, md: 8 }, py: 2.5,
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                    background: 'rgba(9, 9, 11, 0.7)', backdropFilter: 'blur(16px)',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Box sx={{
                            width: 36, height: 36, borderRadius: '10px',
                            background: 'linear-gradient(135deg, #FFF, #E4E4E7)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(255,255,255,0.1)'
                        }}>
                            <LogoIcon sx={{ color: '#09090B', fontSize: 20 }} />
                        </Box>
                        <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">NexusML</Typography>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant="text"
                            onClick={() => navigate('/login')}
                            sx={{ color: '#A1A1AA', '&:hover': { color: '#FFF', background: 'transparent' }, fontWeight: 600 }}
                        >
                            Log in
                        </Button>
                        <Button
                            variant="contained"
                            onClick={() => navigate('/register')}
                            sx={{
                                background: '#FAFAFA', color: '#09090B', fontWeight: 700, px: 3, borderRadius: 2,
                                '&:hover': { background: '#E4E4E7', transform: 'translateY(-1px)' },
                                transition: 'all 0.2s'
                            }}
                        >
                            Get Started
                        </Button>
                    </Box>
                </Box>
            </motion.div>

            {/* Hero Section */}
            <Box sx={{ position: 'relative', pt: { xs: 16, md: 24 }, pb: { xs: 10, md: 16 }, px: 3 }}>
                {/* Background glowing orbs */}
                <Box sx={{
                    position: 'absolute', top: '10%', left: '50%', transform: 'translateX(-50%)',
                    width: '80vw', height: '80vw', maxWidth: 1000, maxHeight: 1000,
                    borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
                    background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.15) 0%, rgba(9,9,11,0) 70%)',
                    filter: 'blur(60px)'
                }} />
                
                <motion.div style={{ y: yHero, opacity: opacityHero }}>
                    <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
                        <Grid container spacing={6} alignItems="center">
                            <Grid size={{ xs: 12, lg: 6 }} sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ type: "spring", stiffness: 100 }}
                                >
                                    <Chip
                                        icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important', color: '#818CF8' }} />}
                                        label="NexusML Platform 2.0 Available"
                                        sx={{
                                            mb: 4, background: 'rgba(99,102,241,0.1)', color: '#818CF8',
                                            border: '1px solid rgba(99,102,241,0.2)', fontWeight: 600, fontSize: 13,
                                            height: 32, '& .MuiChip-icon': { ml: 1.5 }
                                        }}
                                    />
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1, duration: 0.8, ease: "easeOut" }}
                                >
                                    <Typography
                                        variant="h1"
                                        sx={{
                                            fontSize: { xs: 48, sm: 64, md: 76 },
                                            fontWeight: 900,
                                            lineHeight: 1.05,
                                            mb: 4,
                                            letterSpacing: '-0.04em',
                                        }}
                                    >
                                        Build AI Models{' '}
                                        <Box component="span" sx={{
                                            background: 'linear-gradient(135deg, #818CF8 0%, #C084FC 50%, #F472B6 100%)',
                                            WebkitBackgroundClip: 'text',
                                            WebkitTextFillColor: 'transparent',
                                            display: 'block'
                                        }}>
                                            Without Code.
                                        </Box>
                                    </Typography>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2, duration: 0.8, ease: "easeOut" }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{ 
                                            color: '#A1A1AA', maxWidth: 600, mx: { xs: 'auto', lg: 0 }, 
                                            mb: 6, lineHeight: 1.6, fontWeight: 400, fontSize: { xs: 18, md: 22 } 
                                        }}
                                    >
                                        The unified workspace to clean data, train state-of-the-art models, and deploy 
                                        production-ready APIs in minutes. No infrastructure required.
                                    </Typography>
                                </motion.div>

                                <motion.div
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
                                >
                                    <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', lg: 'flex-start' }, flexWrap: 'wrap' }}>
                                        <Button
                                            variant="contained"
                                            size="large"
                                            endIcon={<ArrowForward />}
                                            onClick={() => navigate('/register')}
                                            sx={{
                                                px: 4, py: 1.8, fontSize: 16, fontWeight: 700, borderRadius: 3,
                                                background: '#FAFAFA', color: '#09090B',
                                                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 8px 24px -8px rgba(255,255,255,0.3)',
                                                '&:hover': { background: '#E4E4E7', transform: 'translateY(-2px)' },
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            Start Building Free
                                        </Button>
                                        <Button
                                            variant="outlined"
                                            size="large"
                                            startIcon={<PlayIcon />}
                                            onClick={() => navigate('/login')}
                                            sx={{
                                                px: 4, py: 1.8, fontSize: 16, borderRadius: 3, fontWeight: 600,
                                                borderColor: 'rgba(255,255,255,0.15)', color: '#FAFAFA',
                                                '&:hover': { borderColor: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' },
                                            }}
                                        >
                                            View Demo
                                        </Button>
                                    </Box>
                                </motion.div>
                            </Grid>

                            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: { xs: 'none', lg: 'block' } }}>
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, rotateY: 15 }}
                                    animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                                    transition={{ duration: 1, delay: 0.4, type: "spring", stiffness: 50 }}
                                    style={{ perspective: 1000 }}
                                >
                                    <Box sx={{ transform: 'rotateY(-5deg) rotateX(5deg)' }}>
                                        <AbstractDashboard />
                                    </Box>
                                </motion.div>
                            </Grid>
                        </Grid>
                    </Container>
                </motion.div>
            </Box>

            {/* Trusted By / Stats */}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.05)', py: 6, background: 'rgba(255,255,255,0.01)' }}>
                <Container maxWidth="lg">
                    <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={containerVariants}>
                        <Grid container spacing={4} justifyContent="center" textAlign="center">
                            {[
                                { val: 12500, suffix: '+', label: 'Models Deployed' },
                                { val: 840, suffix: 'GB+', label: 'Data Processed' },
                                { val: 99.9, suffix: '%', label: 'Uptime SLA' },
                                { val: 4, suffix: 'ms', label: 'Inference Latency' },
                            ].map((s, i) => (
                                <Grid size={{ xs: 6, md: 3 }} key={i}>
                                    <motion.div variants={itemVariants}>
                                        <Typography variant="h3" fontWeight={900} sx={{ color: '#FAFAFA', mb: 1, letterSpacing: '-0.02em', fontSize: { xs: 32, md: 48 } }}>
                                            <AnimCounter target={s.val} suffix={s.suffix} />
                                        </Typography>
                                        <Typography variant="body1" sx={{ color: '#A1A1AA', fontWeight: 500 }}>{s.label}</Typography>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Container>
            </Box>

            {/* Workflow / How It Works */}
            <Box sx={{ py: { xs: 14, md: 20 }, px: 3, position: 'relative' }}>
                <Container maxWidth="lg">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
                        <Typography variant="h2" fontWeight={900} textAlign="center" mb={2} sx={{ letterSpacing: '-0.03em', fontSize: { xs: 36, md: 56 } }}>
                            Train in minutes, <br />
                            <Box component="span" sx={{ color: '#A1A1AA' }}>deploy in seconds.</Box>
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#A1A1AA', textAlign: 'center', mb: 10, maxWidth: 600, mx: 'auto', fontSize: { xs: 16, md: 20 }, lineHeight: 1.6 }}>
                            A radically simplified ML lifecycle. We handle the infrastructure, GPU allocation, and API generation. You focus on the results.
                        </Typography>
                    </motion.div>

                    <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
                        <Grid container spacing={4}>
                            {[
                                { num: '01', icon: <UploadIcon sx={{ fontSize: 40 }} />, title: 'Connect Data', desc: 'Securely upload CSVs or images. Our engine automatically profiles your data, detects anomalies, and imputes missing values.', color: '#6366F1' },
                                { num: '02', icon: <TrainIcon sx={{ fontSize: 40 }} />, title: 'Automated Training', desc: 'Select your target variable. AutoML automatically tests dozens of architectures and optimizes hyperparameters while you watch.', color: '#10B981' },
                                { num: '03', icon: <DeployIcon sx={{ fontSize: 40 }} />, title: 'Global Deployment', desc: 'Click deploy to generate a secure REST endpoint. Keys, rate limiting, and observability are instantly provisioned.', color: '#F43F5E' },
                            ].map((s, i) => (
                                <Grid size={{ xs: 12, md: 4 }} key={i}>
                                    <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                        <Box sx={{
                                            p: 4, borderRadius: 4, height: '100%',
                                            background: 'rgba(255,255,255,0.02)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            position: 'relative'
                                        }}>
                                            <Typography variant="h1" sx={{ 
                                                position: 'absolute', top: 20, right: 30, 
                                                fontWeight: 900, color: 'rgba(255,255,255,0.03)', fontSize: 100, lineHeight: 1 
                                            }}>
                                                {s.num}
                                            </Typography>
                                            <Box sx={{
                                                width: 64, height: 64, borderRadius: 4, mb: 4,
                                                background: `linear-gradient(135deg, ${s.color}20, transparent)`,
                                                border: `1px solid ${s.color}30`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                color: s.color, position: 'relative', zIndex: 1
                                            }}>
                                                {s.icon}
                                            </Box>
                                            <Typography variant="h5" fontWeight={800} mb={2} position="relative" zIndex={1}>{s.title}</Typography>
                                            <Typography variant="body1" sx={{ color: '#A1A1AA', lineHeight: 1.7 }} position="relative" zIndex={1}>{s.desc}</Typography>
                                        </Box>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Container>
            </Box>

            {/* Features Expanded */}
            <Box sx={{ py: { xs: 14, md: 20 }, px: 3, background: 'rgba(255,255,255,0.01)', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                <Container maxWidth="xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <Typography variant="h3" fontWeight={900} textAlign="center" mb={2} sx={{ letterSpacing: '-0.02em' }}>
                            Enterprise-grade capabilities. <br />Consumer-grade UX.
                        </Typography>
                        <Typography variant="body1" sx={{ color: '#A1A1AA', textAlign: 'center', mb: 8, maxWidth: 600, mx: 'auto', fontSize: 18 }}>
                            Everything you need to build, collaborate, and scale in one unified workspace.
                        </Typography>
                    </motion.div>

                    <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
                        <Grid container spacing={3}>
                            {[
                                { icon: <SpeedIcon />, title: 'AutoML Ecosystem', desc: 'State-of-the-art Random Forests, XGBoost, and Neural Nets selected automatically.', color: '#6366F1' },
                                { icon: <DeployIcon />, title: 'Instant REST APIs', desc: 'Secure endpoints with built-in JWT authentication and granular rate limits.', color: '#10B981' },
                                { icon: <SpeedIcon />, title: 'Explainability Lab', desc: 'Peek inside the black box with integrated SHAP values and permutation importance.', color: '#F59E0B' },
                                { icon: <StorageIcon />, title: 'Data Prep Studio', desc: 'Advanced imputation, outlier detection, and one-click data normalization.', color: '#14B8A6' },
                                { icon: <AutoGraphIcon />, title: 'Visual EDA', desc: 'Interactive correlation matrices, distribution plots, and pair grids.', color: '#EC4899' },
                                { icon: <NotebookIcon />, title: 'Cloud Notebooks', desc: 'For when you need code. Fully managed Jupyter environments with pre-loaded context.', color: '#3B82F6' },
                                { icon: <CompIcon />, title: 'Kaggle-Style Competitions', desc: 'Host internal leaderboards to challenge your team or the open community.', color: '#8B5CF6' },
                                { icon: <HubIcon />, title: 'Model Hub', desc: 'Version control for ML. Track lineage, metrics, and parameters in one elegant registry.', color: '#F43F5E' },
                            ].map((f, i) => (
                                <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={i}>
                                    <FeatureCard {...f} />
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Container>
            </Box>

            {/* Bottom CTA */}
            <Box sx={{
                py: { xs: 16, md: 24 }, px: 3,
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <Box sx={{
                    position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
                    width: '100vw', height: '100vw', maxWidth: 1200, maxHeight: 1200,
                    borderRadius: '50%', pointerEvents: 'none',
                    background: 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)',
                    filter: 'blur(80px)'
                }} />
                
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h2" fontWeight={900} mb={3} sx={{ letterSpacing: '-0.03em', fontSize: { xs: 40, md: 56 } }}>
                            Start building the future.
                        </Typography>
                        <Typography variant="h6" sx={{ color: '#A1A1AA', mb: 6, fontWeight: 400, maxWidth: 500, mx: 'auto' }}>
                            Join thousands of teams shipping AI products faster than ever before. No credit card required.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={() => navigate('/register')}
                            sx={{
                                px: 5, py: 2, fontSize: 18, fontWeight: 800, borderRadius: 4,
                                background: '#FAFAFA', color: '#09090B',
                                boxShadow: '0 0 0 1px rgba(255,255,255,0.1), 0 12px 32px -8px rgba(255,255,255,0.4)',
                                '&:hover': { background: '#FFF', transform: 'translateY(-2px)' },
                                transition: 'all 0.2s',
                            }}
                        >
                            Create Your Free Account
                        </Button>
                    </Container>
                </motion.div>
            </Box>

            {/* Footer */}
            <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.05)', py: 6, px: 3 }}>
                <Container maxWidth="xl">
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{
                                width: 28, height: 28, borderRadius: '8px', background: '#FAFAFA',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <LogoIcon sx={{ color: '#09090B', fontSize: 14 }} />
                            </Box>
                            <Typography variant="body1" fontWeight={800} letterSpacing="-0.5px">NexusML</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: '#6B7280', fontWeight: 500 }}>
                            © {new Date().getFullYear()} NexusML Inc. All rights reserved. Built for the modern ML workflow.
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </Box>
    )
}
// Using AutoAwesome as our Logo...
function AutoAwesomeIcon(props: React.ComponentProps<typeof LogoIcon>) {
  return <LogoIcon {...props} />
}
