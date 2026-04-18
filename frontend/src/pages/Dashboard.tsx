import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import {
    Box, Grid, Typography, Card, CardContent, Chip, LinearProgress,
    CircularProgress,
} from '@mui/material'
import {
    Storage as DataIcon,
    Psychology as TrainIcon,
    Hub as ModelsIcon,
    RocketLaunch as DeployIcon,
    AccessTime,
    CheckCircle,
    Add as AddIcon,
    Notifications as NotifIcon,
} from '@mui/icons-material'
import { fetchDatasets } from '../store/dataSlice'
import { fetchJobs } from '../store/trainingSlice'
import { fetchModels } from '../store/modelsSlice'
import { fetchSubscription } from '../store/subscriptionSlice'
import UpgradePrompt from '../components/UpgradePrompt'
import OnboardingModal from '../components/OnboardingModal'
import { api } from '../api/client'
import type { AppDispatch, RootState } from '../store/store'

const StatCard = ({ label, value, icon, color, sublabel }: { label: string; value: any; icon: React.ReactNode; color: string; sublabel?: string }) => (
    <Card sx={{ height: '100%' }}>
        <CardContent sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5 }}>
                        {label.toUpperCase()}
                    </Typography>
                    <Typography variant="h3" fontWeight={800} sx={{ mt: 0.5, color }}>
                        {value}
                    </Typography>
                    {sublabel && <Typography variant="caption" sx={{ color: 'text.secondary' }}>{sublabel}</Typography>}
                </Box>
                <Box sx={{
                    width: 48, height: 48, borderRadius: '12px',
                    background: `${color}20`,
                    border: `1px solid ${color}30`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', color
                }}>
                    {icon}
                </Box>
            </Box>
        </CardContent>
    </Card>
)

const QuickActionCard = ({ icon, title, desc, color, onClick }: any) => (
    <Card sx={{ cursor: 'pointer', height: '100%' }} onClick={onClick}>
        <CardContent sx={{ p: 3 }}>
            <Box sx={{
                width: 52, height: 52, borderRadius: '14px', mb: 2,
                background: `linear-gradient(135deg, ${color}33, ${color}11)`,
                border: `1px solid ${color}30`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', color
            }}>
                {icon}
            </Box>
            <Typography variant="h6" fontWeight={700} mb={0.5}>{title}</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{desc}</Typography>
        </CardContent>
    </Card>
)

function UsageGauge({ label, current, limit, color }: { label: string; current: number; limit: number; color: string }) {
    const isUnlimited = limit >= 999_999
    const pct = isUnlimited ? 5 : Math.min((current / limit) * 100, 100)
    const displayLimit = isUnlimited ? '∞' : limit.toLocaleString()
    const isWarning = !isUnlimited && pct >= 80
    const gaugeColor = isWarning ? '#EF4444' : color

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                <CircularProgress
                    variant="determinate"
                    value={100}
                    size={72}
                    thickness={4}
                    sx={{ color: 'rgba(255,255,255,0.06)', position: 'absolute' }}
                />
                <CircularProgress
                    variant="determinate"
                    value={pct}
                    size={72}
                    thickness={4}
                    sx={{
                        color: gaugeColor,
                        '& .MuiCircularProgress-circle': {
                            strokeLinecap: 'round',
                            transition: 'stroke-dashoffset 0.8s ease',
                        },
                    }}
                />
                <Box sx={{
                    position: 'absolute', top: 0, left: 0, bottom: 0, right: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <Typography variant="caption" fontWeight={700} sx={{ color: gaugeColor, fontSize: 13 }}>
                        {isUnlimited ? '∞' : Math.round(pct) + '%'}
                    </Typography>
                </Box>
            </Box>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" fontWeight={600} sx={{ display: 'block', fontSize: 11 }}>
                    {label}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>
                    {current.toLocaleString()} / {displayLimit}
                </Typography>
            </Box>
        </Box>
    )
}

export default function Dashboard() {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const user = useSelector((s: RootState) => s.auth.user)
    const { datasets } = useSelector((s: RootState) => s.data)
    const { jobs } = useSelector((s: RootState) => s.training)
    const { models } = useSelector((s: RootState) => s.models)
    const { summary } = useSelector((s: RootState) => s.subscription)

    useEffect(() => {
        dispatch(fetchDatasets())
        dispatch(fetchJobs())
        dispatch(fetchModels())
        dispatch(fetchSubscription())
    }, [dispatch])

    const runningJobs = jobs.filter(j => j.status === 'running').length
    const completedJobs = jobs.filter(j => j.status === 'completed').length
    const productionModels = models.filter(m => m.stage === 'production').length
    const currentTier = summary?.tier || 'free'

    return (
        <Box className="fade-in">
            {/* Onboarding modal for first-time users */}
            <OnboardingModal />

            {/* Header */}
            <Box mb={4}>
                <Typography variant="h4" fontWeight={800} mb={0.5}>
                    Welcome back, {user?.full_name || user?.email?.split('@')[0]} 👋
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Here's what's happening with your AI projects today.
                </Typography>
            </Box>

            {/* Getting Started Checklist — shows until all steps completed */}
            {(datasets.length === 0 || completedJobs === 0 || productionModels === 0) && (
                <Card sx={{ mb: 4, border: '1px solid rgba(99,102,241,0.2)', background: 'linear-gradient(135deg, rgba(99,102,241,0.05) 0%, rgba(139,92,246,0.03) 100%)' }}>
                    <CardContent sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box>
                                <Typography variant="h6" fontWeight={700}>🚀 Getting Started</Typography>
                                <Typography variant="body2" color="text.secondary">Complete these steps to build your first AI model</Typography>
                            </Box>
                            <Chip label={`${[datasets.length > 0, completedJobs > 0, productionModels > 0].filter(Boolean).length}/3`} 
                                sx={{ fontWeight: 700, background: 'rgba(99,102,241,0.15)', color: '#6366F1' }} />
                        </Box>
                        <Grid container spacing={2}>
                            {[
                                { done: datasets.length > 0, label: 'Upload a Dataset', desc: 'Upload CSV, Excel, or image data', path: '/data', icon: <DataIcon /> },
                                { done: completedJobs > 0, label: 'Train a Model', desc: 'Run AutoML or pick your own algorithm', path: '/train', icon: <TrainIcon /> },
                                { done: productionModels > 0, label: 'Deploy to Production', desc: 'Create a REST API from your best model', path: '/models', icon: <DeployIcon /> },
                            ].map((s, i) => (
                                <Grid size={{ xs: 12, sm: 4 }} key={i}>
                                    <Box 
                                        onClick={() => !s.done && navigate(s.path)}
                                        sx={{
                                            p: 2, borderRadius: 2, cursor: s.done ? 'default' : 'pointer',
                                            border: s.done ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                                            background: s.done ? 'rgba(16,185,129,0.06)' : 'rgba(255,255,255,0.02)',
                                            opacity: s.done ? 0.7 : 1,
                                            transition: 'all 0.2s',
                                            '&:hover': !s.done ? { borderColor: '#6366F1', background: 'rgba(99,102,241,0.06)' } : {},
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                            {s.done ? <CheckCircle sx={{ color: '#10B981', fontSize: 20 }} /> : <Box sx={{ color: '#6366F1' }}>{s.icon}</Box>}
                                            <Typography variant="body2" fontWeight={700} sx={{ textDecoration: s.done ? 'line-through' : 'none', color: s.done ? '#6B7280' : 'inherit' }}>
                                                {s.label}
                                            </Typography>
                                        </Box>
                                        <Typography variant="caption" color="text.secondary">{s.desc}</Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Stats Row */}
            <Grid container spacing={3} mb={4}>
                {[
                    { label: 'Datasets', value: datasets.length, icon: <DataIcon />, color: '#6366F1', sublabel: 'uploaded' },
                    { label: 'Training Jobs', value: jobs.length, icon: <TrainIcon />, color: '#10B981', sublabel: `${runningJobs} running` },
                    { label: 'Models', value: models.length, icon: <ModelsIcon />, color: '#F59E0B', sublabel: `${productionModels} in production` },
                    { label: 'Completed', value: completedJobs, icon: <CheckCircle />, color: '#34D399', sublabel: 'successful runs' },
                ].map((stat) => (
                    <Grid size={{ xs: 12, sm: 6, lg: 3 }} key={stat.label}>
                        <StatCard {...stat} />
                    </Grid>
                ))}
            </Grid>

            {/* Usage & Quota */}
            {summary && (
                <Box mb={4}>
                    <Typography variant="h6" fontWeight={700} mb={2}>Usage & Quota</Typography>
                    <Card sx={{ borderRadius: '16px' }}>
                        <CardContent sx={{ p: 3 }}>
                            <Box sx={{
                                display: 'flex', justifyContent: 'center', gap: 5,
                                flexWrap: 'wrap', mb: 2,
                            }}>
                                <UsageGauge
                                    label="Datasets"
                                    current={summary.usage.datasets_created}
                                    limit={summary.limits.datasets}
                                    color="#6366F1"
                                />
                                <UsageGauge
                                    label="Training Jobs"
                                    current={summary.usage.training_jobs_run}
                                    limit={summary.limits.training_jobs_per_month}
                                    color="#10B981"
                                />
                                <UsageGauge
                                    label="Models"
                                    current={summary.usage.models_created}
                                    limit={summary.limits.models}
                                    color="#F59E0B"
                                />
                                <UsageGauge
                                    label="Deployments"
                                    current={summary.usage.deployments_active}
                                    limit={summary.limits.deployments}
                                    color="#EC4899"
                                />
                                <UsageGauge
                                    label="Inferences"
                                    current={summary.usage.inference_requests}
                                    limit={summary.limits.inference_requests_per_month}
                                    color="#3B82F6"
                                />
                            </Box>

                            {/* Upgrade prompts */}
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mt: 1 }}>
                                <UpgradePrompt resource="datasets" current={summary.usage.datasets_created} limit={summary.limits.datasets} tier={currentTier} />
                                <UpgradePrompt resource="training_jobs" current={summary.usage.training_jobs_run} limit={summary.limits.training_jobs_per_month} tier={currentTier} />
                                <UpgradePrompt resource="inference_requests" current={summary.usage.inference_requests} limit={summary.limits.inference_requests_per_month} tier={currentTier} />
                            </Box>
                        </CardContent>
                    </Card>
                </Box>
            )}

            {/* Quick Actions */}
            <Typography variant="h6" fontWeight={700} mb={2}>Quick Actions</Typography>
            <Grid container spacing={3} mb={4}>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <QuickActionCard
                        icon={<AddIcon fontSize="large" />}
                        title="Upload Dataset"
                        desc="Start by uploading your tabular, image, or text data"
                        color="#6366F1"
                        onClick={() => navigate('/data')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <QuickActionCard
                        icon={<TrainIcon fontSize="large" />}
                        title="Train a Model"
                        desc="Run AutoML on your dataset in minutes"
                        color="#10B981"
                        onClick={() => navigate('/train')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <QuickActionCard
                        icon={<ModelsIcon fontSize="large" />}
                        title="Browse Models"
                        desc="View, test, and manage your trained models"
                        color="#F59E0B"
                        onClick={() => navigate('/models')}
                    />
                </Grid>
                <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
                    <QuickActionCard
                        icon={<DeployIcon fontSize="large" />}
                        title="Deploy API"
                        desc="One-click deployment with REST API & Swagger docs"
                        color="#EC4899"
                        onClick={() => navigate('/models')}
                    />
                </Grid>
            </Grid>

            {/* Recent Jobs */}
            {jobs.length > 0 && (
                <>
                    <Typography variant="h6" fontWeight={700} mb={2}>Recent Training Jobs</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {jobs.slice(0, 5).map((job) => {
                            const statusColor = {
                                completed: '#10B981', running: '#6366F1', failed: '#EF4444',
                                queued: '#F59E0B', cancelled: '#9CA3AF',
                            }[job.status] || '#6B7280'
                            return (
                                <Card key={job.id} sx={{ cursor: 'pointer' }} onClick={() => navigate('/train')}>
                                    <CardContent sx={{ py: 2, px: 3, '&:last-child': { pb: 2 } }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box sx={{ flex: 1 }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                                    <Typography variant="body2" fontWeight={600}>{job.task_type}</Typography>
                                                    <Chip
                                                        label={job.status}
                                                        size="small"
                                                        sx={{
                                                            background: `${statusColor}15`,
                                                            color: statusColor,
                                                            borderColor: `${statusColor}30`,
                                                            border: '1px solid',
                                                            height: 20, fontSize: 11
                                                        }}
                                                    />
                                                </Box>
                                                {job.status === 'running' && <LinearProgress sx={{ height: 2 }} />}
                                                {job.metrics && (
                                                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                                        {Object.entries(job.metrics)
                                                            .filter(([k]) => ['accuracy', 'f1_weighted', 'rmse', 'r2'].includes(k))
                                                            .map(([k, v]) => `${k}: ${typeof v === 'number' ? v.toFixed(4) : v}`)
                                                            .join(' · ')}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                <AccessTime fontSize="inherit" />
                                                {new Date(job.created_at).toLocaleDateString()}
                                            </Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </Box>
                </>
            )}

            {/* Activity Feed */}
            <Box mt={4}>
                <Typography variant="h6" fontWeight={700} mb={2}>📋 Recent Activity</Typography>
                <ActivityFeed />
            </Box>
        </Box>
    )
}

function ActivityFeed() {
    const [activities, setActivities] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    useEffect(() => {
        api.get('/notifications', { params: { limit: 10 } })
            .then(({ data }) => setActivities(data))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [])
    
    if (loading) return <CircularProgress size={20} />
    if (activities.length === 0) return (
        <Card><CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body2" color="text.secondary">No recent activity</Typography>
        </CardContent></Card>
    )

    const typeColors: Record<string, string> = {
        training_complete: '#10B981', training_failed: '#EF4444',
        new_follower: '#8B5CF6', starred: '#F59E0B', forked: '#6366F1', system: '#6B7280'
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {activities.map((a: any, i: number) => (
                <Card key={a.id || i} sx={{ opacity: a.is_read ? 0.7 : 1 }}>
                    <CardContent sx={{ py: 1.5, px: 2.5, '&:last-child': { pb: 1.5 }, display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', background: typeColors[a.type] || '#6B7280', flexShrink: 0 }} />
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" fontWeight={600} sx={{ fontSize: 13 }}>{a.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{a.message}</Typography>
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                            {new Date(a.created_at).toLocaleString()}
                        </Typography>
                    </CardContent>
                </Card>
            ))}
        </Box>
    )
}
