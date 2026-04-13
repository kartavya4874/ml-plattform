import { useState } from 'react'
import {
    Dialog, Box, Typography, Button, IconButton, MobileStepper,
} from '@mui/material'
import {
    Close as CloseIcon,
    AutoAwesome as LogoIcon,
    CloudUpload as UploadIcon,
    Psychology as TrainIcon,
    RocketLaunch as DeployIcon,
    Explore as ExploreIcon,
    Code as NotebookIcon,
    EmojiEvents as CompIcon,
    ArrowForward,
    ArrowBack,
} from '@mui/icons-material'

const STORAGE_KEY = 'parametrix_onboarded'

const steps = [
    {
        title: 'Welcome to Parametrix AI',
        subtitle: 'Your No-Code AI Platform',
        content: (
            <Box sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{
                    width: 100, height: 100, borderRadius: '28px', mx: 'auto', mb: 3,
                    background: 'linear-gradient(135deg, #6366F1 0%, #8B5CF6 50%, #EC4899 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    animation: 'pulse-glow 2s ease-in-out infinite',
                    boxShadow: '0 0 40px rgba(99,102,241,0.3)',
                }}>
                    <LogoIcon sx={{ fontSize: 48, color: '#fff' }} />
                </Box>
                <Typography variant="h5" fontWeight={700} mb={1}>
                    Build production ML models — no code required
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', maxWidth: 440, mx: 'auto', lineHeight: 1.7 }}>
                    Upload your data, train state-of-the-art models with AutoML,
                    and deploy them as REST APIs — all from a beautiful interface.
                </Typography>
            </Box>
        ),
    },
    {
        title: 'How It Works',
        subtitle: '3 simple steps to production AI',
        content: (
            <Box sx={{ display: 'flex', gap: 3, py: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                    { icon: <UploadIcon sx={{ fontSize: 32 }} />, label: 'Upload Data', desc: 'CSV, Excel, images, or text — we handle the rest', color: '#6366F1', step: '01' },
                    { icon: <TrainIcon sx={{ fontSize: 32 }} />, label: 'Train Model', desc: 'AutoML picks the best algorithm and tunes it for you', color: '#10B981', step: '02' },
                    { icon: <DeployIcon sx={{ fontSize: 32 }} />, label: 'Deploy API', desc: 'One-click REST API with monitoring and API keys', color: '#F59E0B', step: '03' },
                ].map((step, i) => (
                    <Box key={i} sx={{
                        flex: '1 1 160px', maxWidth: 200, textAlign: 'center',
                        p: 2.5, borderRadius: 3,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        transition: 'transform 0.2s, border-color 0.2s',
                        '&:hover': { transform: 'translateY(-4px)', borderColor: step.color },
                    }}>
                        <Typography variant="caption" sx={{ color: step.color, fontWeight: 800, fontSize: 11, letterSpacing: 2 }}>
                            STEP {step.step}
                        </Typography>
                        <Box sx={{
                            width: 56, height: 56, borderRadius: '16px', mx: 'auto', my: 1.5,
                            background: `${step.color}15`, border: `1px solid ${step.color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: step.color,
                        }}>
                            {step.icon}
                        </Box>
                        <Typography variant="body2" fontWeight={700} mb={0.5}>{step.label}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>{step.desc}</Typography>
                    </Box>
                ))}
            </Box>
        ),
    },
    {
        title: 'Explore the Community',
        subtitle: 'Learn, share, and compete',
        content: (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 2 }}>
                {[
                    { icon: <ExploreIcon />, label: 'Explore Hub', desc: 'Discover public datasets, models, and notebooks from the community', color: '#6366F1' },
                    { icon: <NotebookIcon />, label: 'Notebooks', desc: 'Write and run Python code in browser-based Colab-style notebooks', color: '#10B981' },
                    { icon: <CompIcon />, label: 'Competitions', desc: 'Compete on leaderboards and benchmark your models against others', color: '#F59E0B' },
                ].map((item, i) => (
                    <Box key={i} sx={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        p: 2, borderRadius: 2,
                        border: '1px solid var(--border)',
                        background: 'var(--surface)',
                        transition: 'border-color 0.2s',
                        '&:hover': { borderColor: item.color },
                    }}>
                        <Box sx={{
                            width: 44, height: 44, borderRadius: '12px', flexShrink: 0,
                            background: `${item.color}15`, border: `1px solid ${item.color}30`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: item.color,
                        }}>
                            {item.icon}
                        </Box>
                        <Box>
                            <Typography variant="body2" fontWeight={700}>{item.label}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>{item.desc}</Typography>
                        </Box>
                    </Box>
                ))}
            </Box>
        ),
    },
]

export default function OnboardingModal() {
    const [open, setOpen] = useState(() => !localStorage.getItem(STORAGE_KEY))
    const [activeStep, setActiveStep] = useState(0)

    const handleClose = () => {
        localStorage.setItem(STORAGE_KEY, 'true')
        setOpen(false)
    }

    const handleNext = () => {
        if (activeStep === steps.length - 1) {
            handleClose()
        } else {
            setActiveStep((s) => s + 1)
        }
    }

    const handleBack = () => setActiveStep((s) => s - 1)

    if (!open) return null

    const step = steps[activeStep]

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    background: 'var(--bg)',
                    border: '1px solid var(--border)',
                    borderRadius: 4,
                    overflow: 'hidden',
                },
            }}
        >
            {/* Close button */}
            <IconButton
                onClick={handleClose}
                sx={{ position: 'absolute', top: 12, right: 12, color: 'text.secondary', zIndex: 1 }}
            >
                <CloseIcon />
            </IconButton>

            {/* Content */}
            <Box sx={{ p: 4, pt: 5 }}>
                {/* Step indicator dots */}
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mb: 3 }}>
                    {steps.map((_, i) => (
                        <Box key={i} sx={{
                            width: i === activeStep ? 24 : 8, height: 8,
                            borderRadius: 4,
                            background: i === activeStep
                                ? 'linear-gradient(90deg, #6366F1, #8B5CF6)'
                                : 'rgba(255,255,255,0.1)',
                            transition: 'all 0.3s ease',
                        }} />
                    ))}
                </Box>

                <Typography variant="h4" fontWeight={800} textAlign="center" mb={0.5}>
                    {step.title}
                </Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', textAlign: 'center', mb: 2 }}>
                    {step.subtitle}
                </Typography>

                {step.content}
            </Box>

            {/* Footer */}
            <Box sx={{
                px: 4, pb: 3, pt: 1,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
                <Button
                    onClick={handleBack}
                    disabled={activeStep === 0}
                    startIcon={<ArrowBack />}
                    sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
                >
                    Back
                </Button>

                <MobileStepper
                    variant="text"
                    steps={steps.length}
                    position="static"
                    activeStep={activeStep}
                    sx={{ background: 'transparent', flexGrow: 0 }}
                    nextButton={<span />}
                    backButton={<span />}
                />

                <Button
                    variant="contained"
                    onClick={handleNext}
                    endIcon={activeStep < steps.length - 1 ? <ArrowForward /> : undefined}
                    sx={{ minWidth: 140 }}
                >
                    {activeStep === steps.length - 1 ? '🚀 Get Started' : 'Next'}
                </Button>
            </Box>

            {/* Pulse animation for logo */}
            <style>{`
                @keyframes pulse-glow {
                    0%, 100% { box-shadow: 0 0 20px rgba(99,102,241,0.2); transform: scale(1); }
                    50% { box-shadow: 0 0 40px rgba(99,102,241,0.4); transform: scale(1.03); }
                }
            `}</style>
        </Dialog>
    )
}
