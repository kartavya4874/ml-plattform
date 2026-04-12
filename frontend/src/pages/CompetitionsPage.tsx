import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, Card, Grid, Chip, Button, Avatar } from '@mui/material'
import { EmojiEvents as TrophyIcon, Timer as TimerIcon } from '@mui/icons-material'
import { api } from '../api/client'

interface CompetitionItem {
    id: string; title: string; description: string; metric: string; deadline: string | null
    is_active: boolean; tags: string[]; participant_count: number; prize_description: string | null; created_at: string
}

export default function CompetitionsPage() {
    const navigate = useNavigate()
    const [competitions, setCompetitions] = useState<CompetitionItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        api.get('/competitions').then(r => setCompetitions(r.data)).catch(console.error).finally(() => setLoading(false))
    }, [])

    if (loading) return <Typography>Loading competitions...</Typography>

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800} mb={1}>Competitions</Typography>
                <Typography color="text.secondary">Compete with the community. Climb the leaderboard. Win prizes.</Typography>
            </Box>

            <Grid container spacing={3}>
                {competitions.length === 0 ? (
                    <Grid item xs={12}>
                        <Card sx={{ p: 6, textAlign: 'center' }}>
                            <TrophyIcon sx={{ fontSize: 48, color: '#F59E0B', mb: 2 }} />
                            <Typography variant="h6" mb={1}>No active competitions</Typography>
                            <Typography color="text.secondary">Check back soon — competitions are created by admins.</Typography>
                        </Card>
                    </Grid>
                ) : competitions.map(comp => (
                    <Grid item xs={12} md={6} key={comp.id}>
                        <Card sx={{ p: 3, cursor: 'pointer', '&:hover': { borderColor: '#444' }, transition: 'border-color 0.2s' }}
                              onClick={() => navigate(`/competitions/${comp.id}`)}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                                <Box>
                                    <Typography variant="h6" fontWeight={700}>{comp.title}</Typography>
                                    <Chip size="small" label={comp.is_active ? 'Active' : 'Closed'} color={comp.is_active ? 'success' : 'default'} sx={{ mt: 0.5 }} />
                                </Box>
                                <TrophyIcon sx={{ color: '#F59E0B' }} />
                            </Box>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, minHeight: 40 }}>
                                {comp.description.length > 120 ? comp.description.slice(0, 120) + '...' : comp.description}
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', color: 'text.secondary' }}>
                                <Typography variant="caption">Metric: <b>{comp.metric}</b></Typography>
                                <Typography variant="caption">{comp.participant_count} participants</Typography>
                                {comp.deadline && (
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                        <TimerIcon sx={{ fontSize: 14 }} />
                                        <Typography variant="caption">{new Date(comp.deadline).toLocaleDateString()}</Typography>
                                    </Box>
                                )}
                            </Box>
                            {comp.tags.length > 0 && (
                                <Box sx={{ display: 'flex', gap: 0.5, mt: 1 }}>
                                    {comp.tags.map(t => <Chip key={t} size="small" label={t} variant="outlined" />)}
                                </Box>
                            )}
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    )
}
