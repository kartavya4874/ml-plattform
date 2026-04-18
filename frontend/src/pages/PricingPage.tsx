import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
    Box, Typography, Card, CardContent, Button, Chip, Divider, Grid,
    CircularProgress,
} from '@mui/material'
import {
    Check as CheckIcon,
    Star as StarIcon,
    RocketLaunch as RocketIcon,
    Diamond as DiamondIcon,
    AutoAwesome as SparkleIcon,
    Speed as SpeedIcon,
} from '@mui/icons-material'
import { fetchPricing, fetchSubscription, upgradeTier } from '../store/subscriptionSlice'
import type { AppDispatch, RootState } from '../store/store'
import type { PricingTier } from '../store/subscriptionSlice'

const tierIcons: Record<string, React.ReactNode> = {
    free: <SparkleIcon />,
    pro: <RocketIcon />,
    payg: <SpeedIcon />,
    enterprise: <DiamondIcon />,
}

const tierGradients: Record<string, string> = {
    free: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(99,102,241,0.05))',
    pro: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(99,102,241,0.08))',
    payg: 'linear-gradient(135deg, rgba(16,185,129,0.18), rgba(6,182,212,0.06))',
    enterprise: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(236,72,153,0.08))',
}

const tierBorders: Record<string, string> = {
    free: 'rgba(99,102,241,0.2)',
    pro: 'rgba(139,92,246,0.4)',
    payg: 'rgba(16,185,129,0.3)',
    enterprise: 'rgba(245,158,11,0.3)',
}

const tierAccent: Record<string, string> = {
    free: '#6366F1',
    pro: '#8B5CF6',
    payg: '#10B981',
    enterprise: '#F59E0B',
}

function PricingCard({ plan, currentTier, onUpgrade, upgrading }: {
    plan: PricingTier
    currentTier: string
    onUpgrade: (tier: string) => void
    upgrading: boolean
}) {
    const isCurrent = currentTier === plan.tier
    const isPopular = plan.is_popular
    const accent = tierAccent[plan.tier] || '#6366F1'
    const tierOrder: Record<string, number> = { free: 0, pro: 1, payg: 2, enterprise: 3 }
    const canUpgrade = tierOrder[plan.tier] > tierOrder[currentTier]

    return (
        <Card
            id={`pricing-card-${plan.tier}`}
            sx={{
                height: '100%',
                position: 'relative',
                background: tierGradients[plan.tier],
                border: `1px solid ${tierBorders[plan.tier]}`,
                borderRadius: '20px',
                overflow: 'visible',
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                transform: isPopular ? 'scale(1.03)' : 'none',
                '&:hover': {
                    transform: isPopular ? 'scale(1.05) translateY(-4px)' : 'translateY(-4px)',
                    boxShadow: `0 20px 60px ${accent}25`,
                },
            }}
        >
            {/* Popular badge */}
            {isPopular && (
                <Box sx={{
                    position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                    background: `linear-gradient(135deg, ${accent}, #EC4899)`,
                    color: 'white', px: 3, py: 0.5, borderRadius: '20px',
                    fontSize: 12, fontWeight: 700, letterSpacing: 1,
                    boxShadow: `0 4px 15px ${accent}50`,
                    display: 'flex', alignItems: 'center', gap: 0.5,
                    whiteSpace: 'nowrap',
                }}>
                    <StarIcon sx={{ fontSize: 14 }} /> MOST POPULAR
                </Box>
            )}

            <CardContent sx={{ p: 4, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Icon + Name */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                    <Box sx={{
                        width: 44, height: 44, borderRadius: '12px',
                        background: `${accent}20`, border: `1px solid ${accent}30`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: accent,
                    }}>
                        {tierIcons[plan.tier]}
                    </Box>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>{plan.name}</Typography>
                        {isCurrent && (
                            <Chip
                                label="Current Plan"
                                size="small"
                                sx={{
                                    background: `${accent}20`, color: accent,
                                    border: `1px solid ${accent}40`,
                                    height: 20, fontSize: 10, fontWeight: 700,
                                }}
                            />
                        )}
                    </Box>
                </Box>

                {/* Price */}
                <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography variant="h3" fontWeight={900} sx={{
                            background: `linear-gradient(135deg, ${accent}, ${accent}CC)`,
                            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                        }}>
                            {plan.price_monthly === 0 ? 'Free' : plan.tier === 'payg' ? '₹499+' : `₹${plan.price_monthly.toLocaleString()}`}
                        </Typography>
                        {plan.price_monthly > 0 && (
                            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                {plan.tier === 'payg' ? 'base + usage' : '/month'}
                            </Typography>
                        )}
                    </Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
                        {plan.description}
                    </Typography>
                </Box>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', my: 2 }} />

                {/* Features */}
                <Box sx={{ flex: 1, mb: 3 }}>
                    {plan.features.map((feature, i) => (
                        <Box key={i} sx={{ display: 'flex', gap: 1.5, mb: 1.5, alignItems: 'flex-start' }}>
                            <CheckIcon sx={{ fontSize: 18, color: accent, mt: 0.2, flexShrink: 0 }} />
                            <Typography variant="body2" sx={{ color: 'text.secondary', lineHeight: 1.5 }}>
                                {feature}
                            </Typography>
                        </Box>
                    ))}
                </Box>

                {/* CTA Button */}
                {isCurrent ? (
                    <Button
                        fullWidth variant="outlined"
                        disabled
                        sx={{
                            borderColor: `${accent}40`, color: accent,
                            borderRadius: '10px', py: 1.5, fontWeight: 700,
                        }}
                    >
                        Current Plan
                    </Button>
                ) : canUpgrade ? (
                    <Button
                        id={`upgrade-btn-${plan.tier}`}
                        fullWidth variant="contained"
                        disabled={upgrading}
                        onClick={() => {
                            if (!window.localStorage.getItem('token') && !document.cookie.includes('token')) {
                                window.location.href = '/login'
                            } else {
                                onUpgrade(plan.tier)
                            }
                        }}
                        sx={{
                            background: `linear-gradient(135deg, ${accent}, ${accent}DD)`,
                            borderRadius: '10px', py: 1.5, fontWeight: 700, fontSize: 15,
                            boxShadow: `0 4px 20px ${accent}40`,
                            '&:hover': {
                                boxShadow: `0 6px 30px ${accent}60`,
                                background: `linear-gradient(135deg, ${accent}EE, ${accent}CC)`,
                            },
                        }}
                    >
                        {upgrading ? <CircularProgress size={20} /> : `Upgrade to ${plan.name}`}
                    </Button>
                ) : (
                    <Button
                        fullWidth variant="outlined"
                        sx={{
                            borderColor: 'rgba(255,255,255,0.15)',
                            color: 'text.secondary',
                            borderRadius: '10px', py: 1.5,
                        }}
                    >
                        Included in your plan
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}

export default function PricingPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { pricing, pricingLoading, summary, upgrading } = useSelector((s: RootState) => s.subscription)
    const currentTier = summary?.tier || 'free'

    const token = useSelector((s: RootState) => s.auth.accessToken)

    useEffect(() => {
        dispatch(fetchPricing())
        if (token) {
            dispatch(fetchSubscription())
        }
    }, [dispatch, token])

    const handleUpgrade = async (tier: string) => {
        await dispatch(upgradeTier(tier))
        // Refresh subscription data after upgrade
        dispatch(fetchSubscription())
    }

    return (
        <Box className="fade-in" sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 6, pt: 2 }}>
                {token && summary && (
                    <Chip
                        icon={<StarIcon sx={{ fontSize: 16 }} />}
                        label={`Current Active Plan: ${currentTier.toUpperCase()}`}
                        sx={{
                            background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
                            color: '#10B981',
                            border: '1px solid rgba(16,185,129,0.3)',
                            fontWeight: 800, letterSpacing: 1, fontSize: 13,
                            mb: 3, py: 2.5, px: 1, borderRadius: '12px'
                        }}
                    />
                )}
                
                {!token || !summary ? (
                    <Chip
                        label="PRICING"
                        sx={{
                            background: 'rgba(99,102,241,0.12)',
                            color: '#818CF8',
                            border: '1px solid rgba(99,102,241,0.2)',
                            fontWeight: 700, letterSpacing: 1.5, fontSize: 11,
                            mb: 2,
                        }}
                    />
                ) : null}
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1.5 }}>
                    Choose the perfect plan for{' '}
                    <Box component="span" sx={{
                        background: 'linear-gradient(135deg, #6366F1, #EC4899)',
                        WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                    }}>
                        your AI journey
                    </Box>
                </Typography>
                <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400, maxWidth: 600, mx: 'auto' }}>
                    Start free, upgrade when you need more power. No credit card required.
                </Typography>
            </Box>

            {/* Pricing Cards */}
            {pricingLoading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <Grid container spacing={3} sx={{ mb: 6, alignItems: 'stretch' }}>
                    {pricing.map((plan) => (
                        <Grid size={{ xs: 12, md: 3 }} key={plan.tier}>
                            <PricingCard
                                plan={plan}
                                currentTier={currentTier}
                                onUpgrade={handleUpgrade}
                                upgrading={upgrading}
                            />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Comparison Table */}
            <Box sx={{ mt: 4, mb: 6 }}>
                <Typography variant="h5" fontWeight={700} sx={{ textAlign: 'center', mb: 4 }}>
                    Feature Comparison
                </Typography>
                <Card sx={{ borderRadius: '16px', overflow: 'hidden' }}>
                    <Box sx={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                                    <th style={{ textAlign: 'left', padding: '16px 24px', color: '#9CA3AF', fontSize: 13, fontWeight: 600 }}>Feature</th>
                                    {pricing.map(p => (
                                        <th key={p.tier} style={{
                                            textAlign: 'center', padding: '16px 24px',
                                            color: tierAccent[p.tier], fontSize: 14, fontWeight: 700,
                                        }}>
                                            {p.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    { label: 'Datasets', key: 'datasets' as const },
                                    { label: 'Max File Size', key: 'max_file_size_mb' as const, format: (v: number) => v >= 51200 ? 'Unlimited' : v >= 1024 ? `${v / 1024} GB` : `${v} MB` },
                                    { label: 'Training Jobs/Mo', key: 'training_jobs_per_month' as const },
                                    { label: 'Models', key: 'models' as const },
                                    { label: 'Deployments', key: 'deployments' as const },
                                    { label: 'Inference Req/Mo', key: 'inference_requests_per_month' as const },
                                    { label: 'API Keys/Model', key: 'api_keys_per_model' as const },
                                ].map((row, i) => (
                                    <tr key={row.key} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'rgba(255,255,255,0.01)' : 'transparent' }}>
                                        <td style={{ padding: '14px 24px', fontSize: 14, color: '#D1D5DB' }}>{row.label}</td>
                                        {pricing.map(p => {
                                            const val = p.limits[row.key]
                                            const display = val >= 999_999 ? '∞' : row.format ? row.format(val) : val.toLocaleString()
                                            return (
                                                <td key={p.tier} style={{ textAlign: 'center', padding: '14px 24px', fontSize: 14, fontWeight: 600, color: '#F9FAFB' }}>
                                                    {display}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </Box>
                </Card>
            </Box>

            {/* FAQ / Note */}
            <Box sx={{ textAlign: 'center', pb: 4 }}>
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                💳 PayU payment gateway activating soon. For now, tier upgrades are applied directly.
                </Typography>
            </Box>
        </Box>
    )
}
