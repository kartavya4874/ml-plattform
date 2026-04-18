import { useState, useEffect } from 'react'
import { useSelector } from 'react-redux'
import { Box, Typography, Card, Grid, Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Select, MenuItem, TextField, Dialog, DialogTitle, DialogContent, DialogActions, IconButton, Tabs, Tab } from '@mui/material'
import { Delete as DeleteIcon, AdminPanelSettings as AdminIcon, Refresh as RefreshIcon } from '@mui/icons-material'
import { api } from '../api/client'
import type { RootState } from '../store/store'

export default function AdminPage() {
    const user = useSelector((s: RootState) => s.auth.user)
    const [tab, setTab] = useState(0)
    const [stats, setStats] = useState<any>(null)
    const [users, setUsers] = useState<any[]>([])
    const [datasets, setDatasets] = useState<any[]>([])
    const [models, setModels] = useState<any[]>([])
    const [discussions, setDiscussions] = useState<any[]>([])
    const [organizations, setOrganizations] = useState<any[]>([])
    const [competitions, setCompetitions] = useState<any[]>([])
    const [auditLogs, setAuditLogs] = useState<any[]>([])
    
    // Badge state
    const [badgeUser, setBadgeUser] = useState('')
    const [badgeName, setBadgeName] = useState('community_hero')

    const loadData = async () => {
        try {
            const [st, u, d, m, di, al, orgs, comps] = await Promise.all([
                api.get('/admin/stats'), api.get('/admin/users'), api.get('/admin/datasets'),
                api.get('/admin/models'), api.get('/admin/discussions'), api.get('/admin/audit-logs'),
                api.get('/admin/organizations'), api.get('/admin/competitions')
            ])
            setStats(st.data); setUsers(u.data); setDatasets(d.data); setModels(m.data); setDiscussions(di.data); setAuditLogs(al.data);
            setOrganizations(orgs.data); setCompetitions(comps.data);
        } catch (e) { console.error(e) }
    }

    useEffect(() => { loadData() }, [])

    const updateUserRole = async (userId: string, role: string) => {
        try {
            await api.patch(`/admin/users/${userId}`, { role })
            loadData()
        } catch (e: any) { alert(e.response?.data?.detail || e.message) }
    }

    const updateUserTier = async (userId: string, tier: string) => {
        try {
            await api.patch(`/admin/users/${userId}/subscription?tier=${tier}`)
            loadData()
        } catch (e: any) { alert(e.response?.data?.detail || e.message) }
    }

    const toggleUserActive = async (userId: string, is_active: boolean) => {
        await api.patch(`/admin/users/${userId}`, { is_active })
        loadData()
    }

    const deleteUser = async (userId: string) => {
        if (!window.confirm('Delete this user?')) return
        await api.delete(`/admin/users/${userId}`)
        loadData()
    }

    const deleteDataset = async (id: string) => { await api.delete(`/admin/datasets/${id}`); loadData() }
    const deleteModel = async (id: string) => { await api.delete(`/admin/models/${id}`); loadData() }
    const deleteDiscussion = async (id: string) => { await api.delete(`/admin/discussions/${id}`); loadData() }
    const deleteOrganization = async (id: string) => { 
        if(!window.confirm('Force delete this organization and everything inside it?')) return;
        await api.delete(`/admin/organizations/${id}`); 
        loadData() 
    }
    const deleteCompetition = async (id: string) => { 
        if(!window.confirm('Force delete this competition?')) return;
        await api.delete(`/admin/competitions/${id}`); 
        loadData() 
    }

    const grantBadge = async () => {
        if(!badgeUser.trim() || !badgeName.trim()) return;
        try {
            await api.post(`/badges/grant`, { target_user_id: badgeUser, badge_name: badgeName })
            alert('Badge granted successfully')
            setBadgeUser('')
        } catch(e:any) {
            alert(e.response?.data?.detail || e.message)
        }
    }

    if (user?.role !== 'admin') {
        return (
            <Box sx={{ textAlign: 'center', py: 8 }}>
                <AdminIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h5" fontWeight={700}>Admin Access Required</Typography>
                <Typography color="text.secondary">You need admin privileges to access this page.</Typography>
            </Box>
        )
    }

    return (
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                <Box>
                    <Typography variant="h4" fontWeight={800}>Admin Panel</Typography>
                    <Typography color="text.secondary">Manage users, content, and platform settings</Typography>
                </Box>
                <Button startIcon={<RefreshIcon />} variant="outlined" onClick={loadData}>Refresh</Button>
            </Box>

            {stats && (
                <Grid container spacing={2} sx={{ mb: 4 }}>
                    {[
                        { label: 'Users', val: stats.total_users },
                        { label: 'Datasets', val: stats.total_datasets },
                        { label: 'Models', val: stats.total_models },
                        { label: 'Notebooks', val: stats.total_notebooks },
                        { label: 'Competitions', val: stats.total_competitions },
                        { label: 'Organizations', val: stats.total_organizations },
                        { label: 'Discussions', val: stats.total_discussions },
                        { label: 'Public Datasets', val: stats.public_datasets },
                        { label: 'Public Models', val: stats.public_models },
                    ].map(s => (
                        <Grid size={{ xs: 6, md: 3, lg: 2 }} key={s.label}>
                            <Card sx={{ p: 2, textAlign: 'center' }}>
                                <Typography variant="h5" fontWeight={800}>{s.val}</Typography>
                                <Typography variant="caption" color="text.secondary">{s.label}</Typography>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3, borderBottom: '1px solid #222' }} variant="scrollable" scrollButtons="auto">
                <Tab label={`Users (${users.length})`} />
                <Tab label={`Organizations (${organizations.length})`} />
                <Tab label={`Competitions (${competitions.length})`} />
                <Tab label={`Datasets (${datasets.length})`} />
                <Tab label={`Models (${models.length})`} />
                <Tab label={`Discussions (${discussions.length})`} />
                <Tab label="Badges" />
                <Tab label={`Audit Logs (${auditLogs.length})`} />
            </Tabs>

            {tab === 0 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Email</TableCell><TableCell>Name</TableCell><TableCell>Username</TableCell>
                            <TableCell>Role</TableCell><TableCell>Tier (Sub)</TableCell><TableCell>Active</TableCell><TableCell>Actions</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {users.map(u => (
                                <TableRow key={u.id}>
                                    <TableCell>{u.email}</TableCell>
                                    <TableCell>{u.full_name || '—'}</TableCell>
                                    <TableCell>{u.username || '—'}</TableCell>
                                    <TableCell>
                                        <Select size="small" value={u.role} onChange={e => updateUserRole(u.id, e.target.value)} sx={{ minWidth: 90 }}>
                                            <MenuItem value="free">Free</MenuItem>
                                            <MenuItem value="pro">Pro</MenuItem>
                                            <MenuItem value="admin">Admin</MenuItem>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Select size="small" value={u.tier || 'free'} onChange={e => updateUserTier(u.id, e.target.value)} sx={{ minWidth: 100 }}>
                                            <MenuItem value="free">Free</MenuItem>
                                            <MenuItem value="pro">Pro</MenuItem>
                                            <MenuItem value="payg">PayG</MenuItem>
                                            <MenuItem value="enterprise">Enterprise</MenuItem>
                                        </Select>
                                    </TableCell>
                                    <TableCell>
                                        <Chip size="small" label={u.is_active ? 'Active' : 'Disabled'} color={u.is_active ? 'success' : 'error'}
                                            onClick={() => toggleUserActive(u.id, !u.is_active)} sx={{ cursor: 'pointer' }} />
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => deleteUser(u.id)}><DeleteIcon fontSize="small" /></IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 1 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Name</TableCell><TableCell>Slug</TableCell><TableCell>Members</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {organizations.map(o => (
                                <TableRow key={o.id}>
                                    <TableCell>{o.name}</TableCell>
                                    <TableCell><Chip label={o.slug} size="small" variant="outlined" /></TableCell>
                                    <TableCell>{o.members_count}</TableCell>
                                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><IconButton size="small" color="error" onClick={() => deleteOrganization(o.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 2 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Title</TableCell><TableCell>Participants</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {competitions.map(c => (
                                <TableRow key={c.id}>
                                    <TableCell>{c.title}</TableCell>
                                    <TableCell>{c.participant_count}</TableCell>
                                    <TableCell><Chip size="small" label={c.is_active ? 'Active' : 'Closed'} color={c.is_active ? 'success' : 'default'} /></TableCell>
                                    <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><IconButton size="small" color="error" onClick={() => deleteCompetition(c.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 3 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Name</TableCell><TableCell>Public</TableCell><TableCell>Status</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {datasets.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.name}</TableCell>
                                    <TableCell><Chip size="small" label={d.is_public ? 'Yes' : 'No'} /></TableCell>
                                    <TableCell>{d.status}</TableCell>
                                    <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><IconButton size="small" color="error" onClick={() => deleteDataset(d.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 4 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Name</TableCell><TableCell>Public</TableCell><TableCell>Stage</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {models.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>{m.name}</TableCell>
                                    <TableCell><Chip size="small" label={m.is_public ? 'Yes' : 'No'} /></TableCell>
                                    <TableCell>{m.stage}</TableCell>
                                    <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><IconButton size="small" color="error" onClick={() => deleteModel(m.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 5 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Title</TableCell><TableCell>Upvotes</TableCell><TableCell>Created</TableCell><TableCell>Actions</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {discussions.map(d => (
                                <TableRow key={d.id}>
                                    <TableCell>{d.title}</TableCell>
                                    <TableCell>{d.upvotes}</TableCell>
                                    <TableCell>{new Date(d.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell><IconButton size="small" color="error" onClick={() => deleteDiscussion(d.id)}><DeleteIcon fontSize="small" /></IconButton></TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {tab === 6 && (
                <Card sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
                    <Typography variant="h6" mb={2}>Manually Grant Badge</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField 
                            label="Target User ID" 
                            variant="outlined" 
                            value={badgeUser} 
                            onChange={e => setBadgeUser(e.target.value)} 
                        />
                        <Select value={badgeName} onChange={e => setBadgeName(e.target.value)}>
                            <MenuItem value="early_adopter">Early Adopter</MenuItem>
                            <MenuItem value="community_hero">Community Hero</MenuItem>
                            <MenuItem value="trusted_creator">Trusted Creator</MenuItem>
                            <MenuItem value="pro_subscriber">Pro Subscriber</MenuItem>
                            <MenuItem value="enterprise_member">Enterprise Member</MenuItem>
                        </Select>
                        <Button variant="contained" onClick={grantBadge}>Grant Badge</Button>
                    </Box>
                </Card>
            )}

            {tab === 7 && (
                <TableContainer component={Card}>
                    <Table size="small">
                        <TableHead><TableRow>
                            <TableCell>Action</TableCell><TableCell>Resource</TableCell><TableCell>User ID</TableCell><TableCell>IP</TableCell><TableCell>Created</TableCell>
                        </TableRow></TableHead>
                        <TableBody>
                            {auditLogs.map(l => (
                                <TableRow key={l.id}>
                                    <TableCell>
                                        <Chip size="small" label={l.action} 
                                              color={l.action.includes('delete') ? 'error' : l.action.includes('create') ? 'success' : 'primary'} />
                                    </TableCell>
                                    <TableCell>{l.resource_type} {l.resource_id ? `(${l.resource_id.slice(0, 8)})` : ''}</TableCell>
                                    <TableCell>{l.user_id ? l.user_id.slice(0, 8) : 'System'}</TableCell>
                                    <TableCell>{l.ip_address || '—'}</TableCell>
                                    <TableCell>{new Date(l.created_at).toLocaleString()}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    )
}
