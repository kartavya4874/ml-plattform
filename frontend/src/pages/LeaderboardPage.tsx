import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Typography, Card, TextField, Button, Avatar, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'
import { EmojiEvents as TrophyIcon } from '@mui/icons-material'
import { api } from '../api/client'

interface Entry { rank: number; user_id: string; username: string | null; avatar_url: string | null; score: number; submissions: number; last_submission: string }

export default function LeaderboardPage() {
    const { id } = useParams<{ id: string }>()
    const [comp, setComp] = useState<any>(null)
    const [entries, setEntries] = useState<Entry[]>([])
    const [score, setScore] = useState('')

    useEffect(() => {
        if (!id) return
        api.get(`/competitions/${id}`).then(r => setComp(r.data)).catch(console.error)
        api.get(`/competitions/${id}/leaderboard`).then(r => setEntries(r.data)).catch(console.error)
    }, [id])

    const submitEntry = async () => {
        try {
            await api.post(`/competitions/${id}/submit`, { score: parseFloat(score) })
            setScore('')
            api.get(`/competitions/${id}/leaderboard`).then(r => setEntries(r.data))
        } catch (e) { console.error(e) }
    }

    const medalColor = (rank: number) => rank === 1 ? '#FFD700' : rank === 2 ? '#C0C0C0' : rank === 3 ? '#CD7F32' : undefined

    if (!comp) return <Typography>Loading...</Typography>

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800} mb={1}>{comp.title}</Typography>
                <Typography color="text.secondary" mb={2}>{comp.description}</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Chip label={`Metric: ${comp.metric}`} />
                    <Chip label={`${comp.participant_count} participants`} />
                    <Chip label={comp.is_active ? 'Active' : 'Closed'} color={comp.is_active ? 'success' : 'default'} />
                </Box>
            </Box>

            {comp.is_active && (
                <Card sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" fontWeight={600} mb={2}>Submit Score</Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <TextField label="Score" value={score} onChange={e => setScore(e.target.value)} type="number" size="small" />
                        <Button variant="contained" onClick={submitEntry} disabled={!score}>Submit</Button>
                    </Box>
                </Card>
            )}

            <Typography variant="h6" fontWeight={700} mb={2}>
                <TrophyIcon sx={{ mr: 1, color: '#F59E0B', verticalAlign: 'middle' }} /> Leaderboard
            </Typography>

            <TableContainer component={Card}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell width={60}>Rank</TableCell>
                            <TableCell>Participant</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell align="right">Submissions</TableCell>
                            <TableCell align="right">Last</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {entries.map(e => (
                            <TableRow key={e.user_id} sx={{ background: e.rank <= 3 ? `${medalColor(e.rank)}08` : 'transparent' }}>
                                <TableCell>
                                    <Typography fontWeight={700} sx={{ color: medalColor(e.rank) || 'text.primary' }}>
                                        {e.rank <= 3 ? ['🥇', '🥈', '🥉'][e.rank - 1] : `#${e.rank}`}
                                    </Typography>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                        <Avatar src={e.avatar_url || undefined} sx={{ width: 28, height: 28, fontSize: 12 }}>
                                            {(e.username || 'U')[0].toUpperCase()}
                                        </Avatar>
                                        <Typography variant="body2" fontWeight={600}>{e.username || 'Anonymous'}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right"><Typography fontWeight={700}>{e.score.toFixed(4)}</Typography></TableCell>
                                <TableCell align="right">{e.submissions}</TableCell>
                                <TableCell align="right"><Typography variant="caption">{new Date(e.last_submission).toLocaleDateString()}</Typography></TableCell>
                            </TableRow>
                        ))}
                        {entries.length === 0 && (
                            <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>No submissions yet</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    )
}
