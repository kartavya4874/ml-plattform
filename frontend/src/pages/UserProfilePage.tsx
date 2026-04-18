import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Typography, Avatar, Chip, Tabs, Tab, Card, Grid, Link as MuiLink } from '@mui/material'
import { GitHub as GithubIcon, Language as WebIcon, Star as StarIcon, People as PeopleIcon, EmojiEvents as BadgeIcon } from '@mui/icons-material'
import { api } from '../api/client'

interface Profile {
    id: string; username: string | null; full_name: string | null; avatar_url: string | null
    bio: string | null; website: string | null; github_url: string | null; kaggle_url: string | null
    followers_count: number; following_count: number; is_public: boolean; created_at: string
    datasets_count: number; models_count: number; notebooks_count: number
}

export default function UserProfilePage() {
    const { username } = useParams<{ username: string }>()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [tab, setTab] = useState(0)
    const [datasets, setDatasets] = useState<any[]>([])
    const [models, setModels] = useState<any[]>([])
    const [notebooks, setNotebooks] = useState<any[]>([])
    const [activity, setActivity] = useState<any[]>([])
    const [badges, setBadges] = useState<any[]>([])
    const [error, setError] = useState('')

    useEffect(() => {
        if (!username) return
        api.get(`/profiles/${username}`).then(r => setProfile(r.data)).catch(() => setError('Profile not found or private'))
        api.get(`/profiles/${username}/datasets`).then(r => setDatasets(r.data)).catch(() => {})
        api.get(`/profiles/${username}/models`).then(r => setModels(r.data)).catch(() => {})
        api.get(`/profiles/${username}/notebooks`).then(r => setNotebooks(r.data)).catch(() => {})
        api.get(`/profiles/${username}/activity`).then(r => setActivity(r.data)).catch(() => {})
        // Use user.id for badges after profile loads (in a real app we might lookup by username in backend)
        api.get(`/profiles/${username}`).then(r => {
            setProfile(r.data);
            if (r.data.id) {
                api.get(`/badges/user/${r.data.id}`).then(res => setBadges(res.data)).catch(() => {})
            }
        }).catch(() => setError('Profile not found or private'))
    }, [username])

    if (error) return <Typography color="error">{error}</Typography>
    if (!profile) return <Typography>Loading...</Typography>

    return (
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
            {/* Profile Header */}
            <Box sx={{ display: 'flex', gap: 4, mb: 4, alignItems: 'flex-start' }}>
                <Avatar src={profile.avatar_url || undefined} sx={{ width: 120, height: 120, fontSize: 48 }}>
                    {(profile.full_name || profile.username || 'U')[0].toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                    <Typography variant="h4" fontWeight={800}>{profile.full_name || profile.username}</Typography>
                    {profile.username && <Typography variant="body1" color="text.secondary">@{profile.username}</Typography>}
                    {profile.bio && <Typography variant="body2" sx={{ mt: 1, maxWidth: 500 }}>{profile.bio}</Typography>}
                    <Box sx={{ display: 'flex', gap: 3, mt: 2, alignItems: 'center' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PeopleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                            <Typography variant="body2"><b>{profile.followers_count}</b> followers</Typography>
                        </Box>
                        <Typography variant="body2"><b>{profile.following_count}</b> following</Typography>
                        {profile.website && (
                            <MuiLink href={profile.website} target="_blank" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <WebIcon sx={{ fontSize: 16 }} /> Website
                            </MuiLink>
                        )}
                        {profile.github_url && (
                            <MuiLink href={profile.github_url} target="_blank" underline="hover" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <GithubIcon sx={{ fontSize: 16 }} /> GitHub
                            </MuiLink>
                        )}
                    </Box>
                    <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        <Chip label={`${profile.datasets_count} Datasets`} size="small" variant="outlined" />
                        <Chip label={`${profile.models_count} Models`} size="small" variant="outlined" />
                        <Chip label={`${profile.notebooks_count} Notebooks`} size="small" variant="outlined" />
                    </Box>
                </Box>
            </Box>

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #222' }}>
                <Tab label="Datasets" />
                <Tab label="Models" />
                <Tab label="Notebooks" />
                <Tab label="Badges" />
                <Tab label="Activity" />
            </Tabs>

            {tab === 0 && (
                <Grid container spacing={2}>
                    {datasets.length === 0 ? <Grid size={{ xs: 12 }}><Typography color="text.secondary">No public datasets</Typography></Grid> : datasets.map(d => (
                        <Grid size={{ xs: 12, md: 6 }} key={d.id}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700}>{d.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{d.description || 'No description'}</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip size="small" icon={<StarIcon />} label={d.star_count} />
                                    {d.tags?.map((t: string) => <Chip key={t} size="small" label={t} variant="outlined" />)}
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {tab === 1 && (
                <Grid container spacing={2}>
                    {models.length === 0 ? <Grid size={{ xs: 12 }}><Typography color="text.secondary">No public models</Typography></Grid> : models.map(m => (
                        <Grid size={{ xs: 12, md: 6 }} key={m.id}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700}>{m.name}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{m.description || 'No description'}</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip size="small" icon={<StarIcon />} label={m.star_count} />
                                    <Chip size="small" label={m.task_type} variant="outlined" />
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {tab === 2 && (
                <Grid container spacing={2}>
                    {notebooks.length === 0 ? <Grid size={{ xs: 12 }}><Typography color="text.secondary">No public notebooks</Typography></Grid> : notebooks.map(n => (
                        <Grid size={{ xs: 12, md: 6 }} key={n.id}>
                            <Card sx={{ p: 3 }}>
                                <Typography variant="subtitle1" fontWeight={700}>{n.title}</Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>{n.description || 'No description'}</Typography>
                                <Box sx={{ display: 'flex', gap: 1 }}>
                                    <Chip size="small" icon={<StarIcon />} label={n.star_count} />
                                    {n.tags?.map((t: string) => <Chip key={t} size="small" label={t} variant="outlined" />)}
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {tab === 3 && (
                <Grid container spacing={2}>
                    {badges.length === 0 ? <Grid size={{ xs: 12 }}><Typography color="text.secondary">No public badges</Typography></Grid> : badges.map(b => (
                        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={b.id}>
                            <Card sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
                                <Box sx={{ fontSize: 32, background: 'rgba(255,255,255,0.05)', borderRadius: 2, width: 60, height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {b.badge_icon}
                                </Box>
                                <Box>
                                    <Typography variant="subtitle2" fontWeight={700}>{b.badge_name}</Typography>
                                    <Chip size="small" label={b.badge_tier} sx={{ height: 16, fontSize: 10, mt: 0.5, mb: 0.5,
                                        ...(b.badge_tier === 'gold' && { background: 'linear-gradient(135deg, #F59E0B, #FCD34D)', color: '#000' }),
                                        ...(b.badge_tier === 'silver' && { background: 'linear-gradient(135deg, #9CA3AF, #E5E7EB)', color: '#000' }),
                                        ...(b.badge_tier === 'bronze' && { background: 'linear-gradient(135deg, #B45309, #D97706)', color: '#fff' }),
                                        ...(b.badge_tier === 'platinum' && { background: 'linear-gradient(135deg, #6366F1, #A855F7)', color: '#fff' }),
                                    }} />
                                    <Typography variant="caption" color="text.secondary" display="block">{b.description}</Typography>
                                </Box>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            {tab === 4 && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                    {activity.length === 0 ? <Typography color="text.secondary">No recent activity</Typography> : activity.map(a => (
                        <Card key={a.id} sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <Chip size="small" label={a.action} />
                            <Typography variant="body2">{a.resource_type} — {new Date(a.created_at).toLocaleDateString()}</Typography>
                        </Card>
                    ))}
                </Box>
            )}
        </Box>
    )
}
