import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button, Container, Grid, Chip, useTheme, Card, IconButton } from '@mui/material'
import { motion, useScroll, useTransform } from 'framer-motion'
import {
    AutoAwesome as LogoIcon,
    CloudUpload as UploadIcon,
    Psychology as TrainIcon,
    RocketLaunch as DeployIcon,
    ArrowForward,
    PlayArrow as PlayIcon,
    DarkModeOutlined as DarkModeIcon,
    LightModeOutlined as LightModeIcon,
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../store/themeSlice'
import type { RootState } from '../store/store'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts'

/* ── MOCK DATA ─────────────────────────────────────────────────────────────── */
const chartData = [
  { name: 'Jan', acc: 4000, loss: 2400 },
  { name: 'Feb', acc: 5500, loss: 2210 },
  { name: 'Mar', acc: 6800, loss: 1900 },
  { name: 'Apr', acc: 8100, loss: 1600 },
  { name: 'May', acc: 9200, loss: 1100 },
  { name: 'Jun', acc: 9800, loss: 400 },
]

const scatterData = [
  { x: 10, y: 30, z: 200 }, { x: 20, y: 50, z: 260 },
  { x: 45, y: 10, z: 400 }, { x: 60, y: 80, z: 280 },
  { x: 75, y: 40, z: 500 }, { x: 90, y: 90, z: 200 },
]

/* ── UTILS ─────────────────────────────────────────────────────────────────── */
const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.15 } }
}

const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 80, damping: 20 } }
}

function AutoAwesomeIcon(props: React.ComponentProps<typeof LogoIcon>) {
  return <LogoIcon {...props} />
}

/* ── ANIMATED COMPONENTS ────────────────────────────────────────────────────── */

const AnimatedTerminal = () => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'
    
    return (
        <Card sx={{ 
            borderRadius: 4, width: '100%', maxWidth: 400,
            background: isDark ? 'rgba(20,20,20,0.8)' : '#FAFAFA',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[10], overflow: 'hidden'
        }}>
            <Box sx={{ px: 2, py: 1.5, borderBottom: `1px solid ${theme.palette.divider}`, display: 'flex', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#EF4444' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#F59E0B' }} />
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', background: '#10B981' }} />
            </Box>
            <Box sx={{ p: 3, fontFamily: '"JetBrains Mono", monospace', fontSize: 13, color: isDark ? '#E4E4E7' : '#3F3F46', lineHeight: 1.7 }}>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                    <span style={{ color: '#C084FC' }}>import</span> parametrix <br />
                    <span style={{ color: '#C084FC' }}>from</span> parametrix.automl <span style={{ color: '#C084FC' }}>import</span> AutoModel
                </motion.div>
                <div style={{ marginTop: 16 }} />
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 }}>
                    dataset = parametrix.load(<span style={{ color: '#10B981' }}>'sales_data.csv'</span>)
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.8 }}>
                    model = AutoModel(target=<span style={{ color: '#10B981' }}>'revenue'</span>)
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 2.4 }}>
                    model.fit(dataset)
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3.0 }}>
                    <span style={{ color: '#6366F1' }}>[INFO]</span> Training complete. Acc: 98.2%
                </motion.div>
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 3.6 }}>
                    model.deploy(name=<span style={{ color: '#10B981' }}>'sales-api'</span>)
                </motion.div>
            </Box>
        </Card>
    )
}

const AnimatedChartUI = () => {
    const theme = useTheme()
    const isDark = theme.palette.mode === 'dark'

    return (
        <Card sx={{ 
            borderRadius: 4, width: '100%', height: 260, p: 3,
            background: isDark ? 'rgba(30,30,35,0.9)' : '#FFFFFF',
            backdropFilter: 'blur(12px)',
            border: `1px solid ${theme.palette.divider}`,
            boxShadow: theme.shadows[10], display: 'flex', flexDirection: 'column'
        }}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 2, color: theme.palette.text.primary }}>Model Accuracy Convergence</Typography>
            <Box sx={{ flex: 1, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                        <defs>
                            <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366F1" stopOpacity={0.4}/>
                                <stop offset="95%" stopColor="#6366F1" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <Tooltip 
                            contentStyle={{ background: isDark ? '#18181B' : '#FFF', border: 'none', borderRadius: 8, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} 
                            itemStyle={{ color: isDark ? '#FFF' : '#000' }} 
                        />
                        <Area type="monotone" dataKey="acc" stroke="#6366F1" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" isAnimationActive={true} animationDuration={2000} />
                    </AreaChart>
                </ResponsiveContainer>
            </Box>
        </Card>
    )
}


/* ── PAGE LAYOUT ───────────────────────────────────────────────────────────── */
export default function LandingPage() {
    const navigate = useNavigate()
    const theme = useTheme()
    const dispatch = useDispatch()
    const { scrollYProgress } = useScroll()
    const yHero = useTransform(scrollYProgress, [0, 1], [0, 200])
    const opacityHero = useTransform(scrollYProgress, [0, 0.2], [1, 0])

    const isDark = theme.palette.mode === 'dark'

    return (
        <Box sx={{
            minHeight: '100vh',
            background: theme.palette.background.default,
            color: theme.palette.text.primary,
            overflowX: 'hidden',
            transition: 'background 0.3s ease',
        }}>
            {/* Header */}
            <motion.div initial={{ y: -100 }} animate={{ y: 0 }} transition={{ type: 'spring', stiffness: 50, delay: 0.1 }}>
                <Box sx={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    px: { xs: 3, md: 8 }, py: 2,
                    position: 'fixed', top: 0, left: 0, right: 0, zIndex: 50,
                    background: isDark ? 'rgba(9, 9, 11, 0.7)' : 'rgba(255, 255, 255, 0.8)', 
                    backdropFilter: 'blur(20px)',
                    borderBottom: `1px solid ${theme.palette.divider}`,
                }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
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
                        <IconButton 
                            onClick={() => dispatch(toggleTheme())}
                            sx={{ color: theme.palette.text.secondary }}
                        >
                            {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </IconButton>
                        <Button variant="text" onClick={() => navigate('/login')} sx={{ display: { xs: 'none', sm: 'inline-flex' }, color: theme.palette.text.secondary, '&:hover': { color: theme.palette.text.primary }, fontWeight: 600 }}>
                            Log in
                        </Button>
                        <Button variant="contained" onClick={() => navigate('/register')} sx={{
                            background: isDark ? '#FAFAFA' : '#18181B', 
                            color: isDark ? '#09090B' : '#FFFFFF', 
                            fontWeight: 700, px: 3, borderRadius: 2,
                            boxShadow: 'none',
                            '&:hover': { background: isDark ? '#E4E4E7' : '#27272A', boxShadow: theme.shadows[4] },
                        }}>
                            Get Started
                        </Button>
                    </Box>
                </Box>
            </motion.div>

            {/* Premium Hero Section */}
            <Box sx={{ position: 'relative', pt: { xs: 16, lg: 24 }, pb: { xs: 10, md: 16 }, px: 3 }}>
                {/* Background ambient light */}
                <Box sx={{
                    position: 'absolute', top: '-10%', left: '50%', transform: 'translateX(-50%)',
                    width: '100vw', height: '100vh', maxWidth: 1200, maxHeight: 1000,
                    borderRadius: '50%', pointerEvents: 'none', zIndex: 0,
                    background: isDark 
                        ? 'radial-gradient(ellipse at top, rgba(99,102,241,0.15) 0%, rgba(9,9,11,0) 70%)'
                        : 'radial-gradient(ellipse at top, rgba(99,102,241,0.08) 0%, rgba(255,255,255,0) 70%)',
                    filter: 'blur(80px)'
                }} />
                
                <motion.div style={{ y: yHero, opacity: opacityHero }}>
                    <Container maxWidth="xl" sx={{ position: 'relative', zIndex: 1 }}>
                        <Grid container spacing={8} alignItems="center">
                            {/* Left Text content */}
                            <Grid size={{ xs: 12, lg: 6 }} sx={{ textAlign: { xs: 'center', lg: 'left' } }}>
                                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                                    <Chip
                                        icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important', color: '#6366F1' }} />}
                                        label="Parametrix AI Platform v1.0 Launch"
                                        sx={{
                                            mb: 4, background: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.08)', 
                                            color: isDark ? '#818CF8' : '#4F46E5',
                                            border: `1px solid ${isDark ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.3)'}`, 
                                            fontWeight: 700, fontSize: 13, height: 32
                                        }}
                                    />
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.8 }}>
                                    <Typography variant="h1" sx={{
                                        fontSize: { xs: 44, sm: 60, md: 72 },
                                        fontWeight: 900, lineHeight: 1.05, mb: 4, letterSpacing: '-0.04em',
                                    }}>
                                        Build ML Models. <br />
                                        <Box component="span" sx={{
                                            background: 'linear-gradient(135deg, #6366F1 0%, #A855F7 50%, #EC4899 100%)',
                                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                                        }}>
                                            Code or No-Code.
                                        </Box>
                                    </Typography>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.8 }}>
                                    <Typography variant="h5" sx={{ 
                                        color: theme.palette.text.secondary, maxWidth: 580, mx: { xs: 'auto', lg: 0 }, 
                                        mb: 6, lineHeight: 1.6, fontWeight: 400, fontSize: { xs: 18, md: 22 } 
                                    }}>
                                        A unified hybrid workspace to explore data, auto-train robust models, and deploy production APIs. Built for modern developers and data scientists.
                                    </Typography>
                                </motion.div>

                                <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.8 }}>
                                    <Box sx={{ display: 'flex', gap: 2, justifyContent: { xs: 'center', lg: 'flex-start' }, flexWrap: 'wrap' }}>
                                        <Button
                                            variant="contained" size="large" endIcon={<ArrowForward />}
                                            onClick={() => navigate('/register')}
                                            sx={{
                                                px: 4, py: 1.8, fontSize: 16, fontWeight: 700, borderRadius: 3,
                                                background: isDark ? '#FAFAFA' : '#18181B', 
                                                color: isDark ? '#09090B' : '#FFFFFF',
                                                boxShadow: theme.shadows[8],
                                                '&:hover': { background: isDark ? '#E4E4E7' : '#27272A', transform: 'translateY(-2px)' },
                                                transition: 'all 0.2s',
                                            }}
                                        >
                                            Start Building Free
                                        </Button>
                                        <Button
                                            variant="outlined" size="large" startIcon={<PlayIcon />}
                                            onClick={() => navigate('/login')}
                                            sx={{
                                                px: 4, py: 1.8, fontSize: 16, borderRadius: 3, fontWeight: 600,
                                                borderColor: theme.palette.divider, color: theme.palette.text.primary,
                                                '&:hover': { borderColor: theme.palette.text.secondary, background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                                            }}
                                        >
                                            View Demo
                                        </Button>
                                    </Box>
                                </motion.div>
                            </Grid>

                            {/* Right Graphical Content */}
                            <Grid size={{ xs: 12, lg: 6 }} sx={{ display: { xs: 'none', lg: 'block' }, position: 'relative', height: 500 }}>
                                <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                    <motion.div
                                        initial={{ opacity: 0, x: 50, y: -20 }} animate={{ opacity: 1, x: 0, y: 0 }}
                                        transition={{ duration: 1, delay: 0.4, type: "spring" }}
                                        style={{ position: 'absolute', top: 20, right: 0, zIndex: 2 }}
                                    >
                                        <AnimatedTerminal />
                                    </motion.div>

                                    <motion.div
                                        initial={{ opacity: 0, x: -50, y: 50 }} animate={{ opacity: 1, x: 0, y: 0 }}
                                        transition={{ duration: 1, delay: 0.6, type: "spring" }}
                                        style={{ position: 'absolute', bottom: 40, left: 0, zIndex: 3, width: '85%' }}
                                    >
                                        <AnimatedChartUI />
                                    </motion.div>
                                </Box>
                            </Grid>
                        </Grid>
                    </Container>
                </motion.div>
            </Box>

            {/* Custom Bento Grid Layout Instead of Repeating Cards */}
            <Box sx={{ py: { xs: 12, md: 20 }, px: 3, background: isDark ? 'rgba(255,255,255,0.01)' : 'rgba(0,0,0,0.01)', borderTop: `1px solid ${theme.palette.divider}` }}>
                <Container maxWidth="xl">
                    <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                        <Typography variant="h2" fontWeight={800} textAlign="center" mb={1} sx={{ letterSpacing: '-0.03em', fontSize: { xs: 32, md: 48 } }}>
                            From raw data to REST API.
                        </Typography>
                        <Typography variant="h6" sx={{ color: theme.palette.text.secondary, textAlign: 'center', mb: 10, maxWidth: 600, mx: 'auto', fontWeight: 400 }}>
                            A radically flexible platform designed for speed. Use robust Auto-ML tools, or write complete custom scripts in cloud notebooks.
                        </Typography>
                    </motion.div>

                    <motion.div variants={containerVariants} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }}>
                        <Grid container spacing={3}>
                            {/* BENTO BLOCK 1: Visual Data Analysis (Large) */}
                            <Grid size={{ xs: 12, md: 8 }}>
                                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                    <Card sx={{ 
                                        p: 4, height: '100%', borderRadius: 6, display: 'flex', flexDirection: 'column',
                                        background: isDark ? 'rgba(255,255,255,0.02)' : '#FFF',
                                        border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[4],
                                    }}>
                                        <Typography variant="h4" fontWeight={800} mb={1}>Data Explorer Studio</Typography>
                                        <Typography variant="body1" color="text.secondary" mb={4} sx={{ maxWidth: 400 }}>
                                            Instantly visualize correlations, detect outliers, and prepare your tabular data or images for training.
                                        </Typography>
                                        <Box sx={{ flex: 1, width: '100%', minHeight: 250, background: isDark ? '#000' : '#F9F9F9', borderRadius: 4, p: 2, border: `1px solid ${theme.palette.divider}` }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                                    <XAxis type="number" dataKey="x" name="stature" hide />
                                                    <YAxis type="number" dataKey="y" name="weight" hide />
                                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                    <Scatter name="A school" data={scatterData} fill="#EC4899" />
                                                </ScatterChart>
                                            </ResponsiveContainer>
                                        </Box>
                                    </Card>
                                </motion.div>
                            </Grid>

                            {/* BENTO BLOCK 2: AutoML (Small) */}
                            <Grid size={{ xs: 12, md: 4 }}>
                                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                    <Card sx={{ 
                                        p: 4, height: '100%', borderRadius: 6, background: isDark ? '#18181B' : '#FAFAFA',
                                        border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[2]
                                    }}>
                                        <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'rgba(16,185,129,0.1)', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                                            <TrainIcon />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800} mb={2}>Automated Training</Typography>
                                        <Typography variant="body2" color="text.secondary" lineHeight={1.6}>
                                            Select your target variable and let our engine automatically construct, test, and tune state-of-the-art Random Forests and Neural Networks. Let the platform pick the winner.
                                        </Typography>
                                    </Card>
                                </motion.div>
                            </Grid>

                            {/* BENTO BLOCK 3: Deployments (Small Span) */}
                            <Grid size={{ xs: 12, md: 5 }}>
                                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                    <Card sx={{ 
                                        p: 4, height: '100%', borderRadius: 6, background: isDark ? 'rgba(255,255,255,0.02)' : '#FFF',
                                        border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[2]
                                    }}>
                                        <Box sx={{ width: 48, height: 48, borderRadius: 3, background: 'rgba(99,102,241,0.1)', color: '#6366F1', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                                            <DeployIcon />
                                        </Box>
                                        <Typography variant="h5" fontWeight={800} mb={2}>Instant Serverless REST</Typography>
                                        <Typography variant="body2" color="text.secondary" mb={3} lineHeight={1.6}>
                                            One click deploys your model globally. We instantly provision secure endpoints with built-in API keys, usage metrics, and strict rate limiting.
                                        </Typography>
                                        <Box sx={{ p: 2, background: isDark ? '#000' : '#F4F4F5', borderRadius: 2, fontFamily: 'monospace', fontSize: 12, color: isDark ? '#A1A1AA' : '#52525B' }}>
                                            curl -X POST \ <br/>
                                            &nbsp;&nbsp;https://api.parametrix.in/v1/predict \ <br/>
                                            &nbsp;&nbsp;-H "Authorization: Bearer nx_key123" \ <br/>
                                            &nbsp;&nbsp;-d '{"{"} "age": 24, "city": "NYC" {"}"}'
                                        </Box>
                                    </Card>
                                </motion.div>
                            </Grid>

                            {/* BENTO BLOCK 4: Python Notebooks (Large) */}
                            <Grid size={{ xs: 12, md: 7 }}>
                                <motion.div variants={itemVariants} style={{ height: '100%' }}>
                                    <Card sx={{ 
                                        p: 4, height: '100%', borderRadius: 6, display: 'flex', flexDirection: 'column',
                                        background: isDark ? '#111113' : '#F9F9FA',
                                        border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[6],
                                        position: 'relative', overflow: 'hidden'
                                    }}>
                                        <Box sx={{ position: 'relative', zIndex: 2 }}>
                                            <Typography variant="h4" fontWeight={800} mb={1}>Cloud Hosted Notebooks</Typography>
                                            <Typography variant="body1" color="text.secondary" mb={4} sx={{ maxWidth: 450 }}>
                                                Drop into code instantly. We provide fully managed, containerized environments attached directly to your datasets.
                                            </Typography>
                                        </Box>
                                        <Box sx={{ 
                                            position: 'absolute', right: -20, bottom: -40, width: '60%', 
                                            background: isDark ? '#000' : '#FFF', p: 3, borderRadius: 4, 
                                            border: `1px solid ${theme.palette.divider}`, boxShadow: theme.shadows[10],
                                            fontFamily: 'monospace', fontSize: 12, lineHeight: 1.8
                                        }}>
                                            <span style={{ color: '#10B981' }}># custom_logic.py</span><br/>
                                            <span style={{ color: '#C084FC' }}>import</span> pandas <span style={{ color: '#C084FC' }}>as</span> pd<br/>
                                            <span style={{ color: '#C084FC' }}>from</span> sklearn.ensemble <span style={{ color: '#C084FC' }}>import</span> RandomForestClassifier<br/>
                                            <br/>
                                            clf = RandomForestClassifier(n_estimators=100)<br/>
                                            clf.fit(X_train, y_train)<br/>
                                            parametrix.hub.push(clf, tags=[<span style={{ color: '#10B981' }}>"prod"</span>])
                                        </Box>
                                    </Card>
                                </motion.div>
                            </Grid>
                        </Grid>
                    </motion.div>
                </Container>
            </Box>

            {/* Bottom CTA */}
            <Box sx={{ py: { xs: 16, md: 24 }, px: 3, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <Box sx={{
                    position: 'absolute', bottom: '-20%', left: '50%', transform: 'translateX(-50%)',
                    width: '100vw', height: '100vw', maxWidth: 1200, maxHeight: 1200,
                    borderRadius: '50%', pointerEvents: 'none',
                    background: isDark 
                        ? 'radial-gradient(circle, rgba(139,92,246,0.1) 0%, transparent 70%)'
                        : 'radial-gradient(circle, rgba(139,92,246,0.05) 0%, transparent 70%)',
                    filter: 'blur(80px)'
                }} />
                
                <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}>
                    <Container maxWidth="md" sx={{ position: 'relative', zIndex: 1 }}>
                        <Typography variant="h2" fontWeight={900} mb={3} sx={{ letterSpacing: '-0.03em', fontSize: { xs: 40, md: 56 } }}>
                            Start shipping today.
                        </Typography>
                        <Typography variant="h6" sx={{ color: theme.palette.text.secondary, mb: 6, fontWeight: 400, maxWidth: 500, mx: 'auto' }}>
                            Join thousands of teams deploying robust machine learning pipelines. No credit card required.
                        </Typography>
                        <Button
                            variant="contained" size="large" onClick={() => navigate('/register')}
                            sx={{
                                px: 5, py: 2, fontSize: 18, fontWeight: 800, borderRadius: 4,
                                background: isDark ? '#FAFAFA' : '#18181B', 
                                color: isDark ? '#09090B' : '#FFFFFF',
                                boxShadow: theme.shadows[12],
                                '&:hover': { background: isDark ? '#FFF' : '#000', transform: 'translateY(-2px)' },
                                transition: 'all 0.2s',
                            }}
                        >
                            Create Your Free Account
                        </Button>
                    </Container>
                </motion.div>
            </Box>

            {/* Footer */}
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 6, px: 3 }}>
                <Container maxWidth="xl">
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: 'center', gap: 3 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                            <Box sx={{ width: 28, height: 28, borderRadius: '8px', background: isDark ? '#FAFAFA' : '#18181B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <LogoIcon sx={{ color: isDark ? '#09090B' : '#FFFFFF', fontSize: 14 }} />
                            </Box>
                            <Typography variant="body1" fontWeight={800} letterSpacing="-0.5px">Parametrix AI</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ color: theme.palette.text.secondary, fontWeight: 500 }}>
                            © {new Date().getFullYear()} Parametrix AI. All rights reserved. Built for the modern ML workflow.
                        </Typography>
                    </Box>
                </Container>
            </Box>
        </Box>
    )
}
