import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate } from 'react-router-dom'
import { Box, Grid, Typography, Card, CardContent, Chip, LinearProgress } from '@mui/material'
import {
    Storage as DataIcon,
    Psychology as TrainIcon,
    Hub as ModelsIcon,
    RocketLaunch as DeployIcon,
    AccessTime,
    CheckCircle,
    Add as AddIcon,
} from '@mui/icons-material'
import { fetchDatasets } from '../store/dataSlice'
import { fetchJobs } from '../store/trainingSlice'
import { fetchModels } from '../store/modelsSlice'
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

export default function Dashboard() {
    const dispatch = useDispatch<AppDispatch>()
    const navigate = useNavigate()
    const user = useSelector((s: RootState) => s.auth.user)
    const { datasets } = useSelector((s: RootState) => s.data)
    const { jobs } = useSelector((s: RootState) => s.training)
    const { models } = useSelector((s: RootState) => s.models)

    useEffect(() => {
        dispatch(fetchDatasets())
        dispatch(fetchJobs())
        dispatch(fetchModels())
    }, [dispatch])

    const runningJobs = jobs.filter(j => j.status === 'running').length
    const completedJobs = jobs.filter(j => j.status === 'completed').length
    const productionModels = models.filter(m => m.stage === 'production').length

    return (
        <Box className="fade-in">
            {/* Header */}
            <Box mb={4}>
                <Typography variant="h4" fontWeight={800} mb={0.5}>
                    Welcome back, {user?.full_name || user?.email?.split('@')[0]} 👋
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Here's what's happening with your AI projects today.
                </Typography>
            </Box>

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
        </Box>
    )
}
