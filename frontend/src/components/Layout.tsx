import { useEffect, useState, useCallback } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { motion } from 'framer-motion'
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton,
    Avatar, Tooltip, Badge, Chip, Popover, List, ListItemButton,
    ListItemText, ListItemIcon, Button, Divider
} from '@mui/material'
import {
    Dashboard as DashboardIcon,
    Storage as DataIcon,
    Psychology as TrainIcon,
    Hub as ModelsIcon,
    Logout as LogoutIcon,
    Notifications as NotifIcon,
    AutoAwesome as LogoIcon,
    Payments as PricingIcon,
    Person as PersonIcon,
    Receipt as ReceiptIcon,
    Explore as ExploreIcon,
    Forum as ForumIcon,
    Code as NotebookIcon,
    EmojiEvents as CompIcon,
    AdminPanelSettings as AdminIcon,
    VpnKey as VpnKeyIcon,
    DarkMode as DarkModeIcon,
    LightMode as LightModeIcon,
} from '@mui/icons-material'
import { logout } from '../store/authSlice'
import { fetchSubscription } from '../store/subscriptionSlice'
import { toggleTheme } from '../store/themeSlice'
import { api } from '../api/client'
import type { RootState, AppDispatch } from '../store/store'

const DRAWER_WIDTH = 240

const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Data Explorer', icon: <DataIcon />, path: '/data' },
    { label: 'Training Studio', icon: <TrainIcon />, path: '/train' },
    { label: 'Model Hub', icon: <ModelsIcon />, path: '/models' },
    { label: 'Pricing', icon: <PricingIcon />, path: '/pricing' },
    { label: 'Billing', icon: <ReceiptIcon />, path: '/billing' },
    { label: 'API Keys', icon: <VpnKeyIcon />, path: '/api-keys' },
    { label: 'Profile', icon: <PersonIcon />, path: '/profile' },
]

const communityNavItems = [
    { label: 'Explore Hub', icon: <ExploreIcon />, path: '/explore' },
    { label: 'Discussions', icon: <ForumIcon />, path: '/discussions' },
    { label: 'Notebooks', icon: <NotebookIcon />, path: '/notebooks' },
    { label: 'Competitions', icon: <CompIcon />, path: '/competitions' },
]

const adminNavItems = [
    { label: 'Admin Panel', icon: <AdminIcon />, path: '/admin' },
]

const tierColors: Record<string, string> = {
    free: '#6366F1',
    pro: '#8B5CF6',
    enterprise: '#F59E0B',
}

export default function Layout() {
    const location = useLocation()
    const navigate = useNavigate()
    const dispatch = useDispatch<AppDispatch>()
    const user = useSelector((s: RootState) => s.auth.user)
    const { summary } = useSelector((s: RootState) => s.subscription)
    const themeMode = useSelector((s: RootState) => s.theme.mode)
    const currentTier = summary?.tier || user?.role || 'free'
    const tierColor = tierColors[currentTier] || '#6366F1'

    // Notification state
    const [unreadCount, setUnreadCount] = useState(0)
    const [notifications, setNotifications] = useState<any[]>([])
    const [notifAnchor, setNotifAnchor] = useState<HTMLElement | null>(null)

    const fetchNotifs = useCallback(async () => {
        try {
            const [countRes, listRes] = await Promise.all([
                api.get('/notifications/count'),
                api.get('/notifications/', { params: { limit: 20 } }),
            ])
            setUnreadCount(countRes.data.unread)
            setNotifications(listRes.data)
        } catch {}
    }, [])

    useEffect(() => {
        dispatch(fetchSubscription())
        fetchNotifs()
        const interval = setInterval(fetchNotifs, 30000) // poll every 30s
        return () => clearInterval(interval)
    }, [dispatch, fetchNotifs])

    const handleNotifClick = async (notif: any) => {
        if (!notif.is_read) {
            await api.post(`/notifications/${notif.id}/read`)
            fetchNotifs()
        }
        setNotifAnchor(null)
        if (notif.link) navigate(notif.link)
    }

    const handleMarkAllRead = async () => {
        await api.post('/notifications/read-all')
        fetchNotifs()
    }

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
            {/* Sidebar */}
            <Drawer
                variant="permanent"
                sx={{
                    width: DRAWER_WIDTH,
                    flexShrink: 0,
                    '& .MuiDrawer-paper': { width: DRAWER_WIDTH, borderRight: '1px solid rgba(255,255,255,0.06)' },
                }}
            >
                {/* Logo */}
                <Box sx={{ p: 3, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box sx={{
                        width: 36, height: 36, borderRadius: '10px',
                        background: '#FAFAFA',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <LogoIcon sx={{ color: '#000', fontSize: 18 }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>Parametrix AI</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>v1.0</Typography>
                    </Box>
                </Box>

                {/* Nav Items */}
                <Box sx={{ px: 1.5, flex: 1 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.5, mb: 1, display: 'block', fontWeight: 600, letterSpacing: 1 }}>
                        WORKSPACE
                    </Typography>
                    {navItems.map((item) => {
                        const active = location.pathname.startsWith(item.path)
                        return (
                            <Box
                                key={item.path}
                                className={`nav-item ${active ? 'active' : ''}`}
                                onClick={() => navigate(item.path)}
                                sx={{ mb: 0.5 }}
                            >
                                <Box sx={{ color: active ? 'primary.light' : 'text.secondary', display: 'flex' }}>
                                    {item.icon}
                                </Box>
                                <Typography variant="body2" fontWeight={active ? 600 : 500}>
                                    {item.label}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>

                {/* Community Nav Items */}
                <Box sx={{ px: 1.5, pb: 2 }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.5, mb: 1, display: 'block', fontWeight: 600, letterSpacing: 1 }}>
                        COMMUNITY
                    </Typography>
                    {communityNavItems.map((item) => {
                        const active = location.pathname.startsWith(item.path)
                        return (
                            <Box
                                key={item.path}
                                className={`nav-item ${active ? 'active' : ''}`}
                                onClick={() => navigate(item.path)}
                                sx={{ mb: 0.5 }}
                            >
                                <Box sx={{ color: active ? 'primary.light' : 'text.secondary', display: 'flex' }}>
                                    {item.icon}
                                </Box>
                                <Typography variant="body2" fontWeight={active ? 600 : 500}>
                                    {item.label}
                                </Typography>
                            </Box>
                        )
                    })}
                </Box>

                {/* Admin */}
                {user?.role === 'admin' && (
                    <Box sx={{ px: 1.5, pb: 2 }}>
                        <Typography variant="caption" sx={{ color: 'text.secondary', px: 1.5, mb: 1, display: 'block', fontWeight: 600, letterSpacing: 1 }}>
                            ADMIN
                        </Typography>
                        {adminNavItems.map((item) => {
                            const active = location.pathname.startsWith(item.path)
                            return (
                                <Box key={item.path} className={`nav-item ${active ? 'active' : ''}`} onClick={() => navigate(item.path)} sx={{ mb: 0.5 }}>
                                    <Box sx={{ color: active ? 'primary.light' : 'text.secondary', display: 'flex' }}>{item.icon}</Box>
                                    <Typography variant="body2" fontWeight={active ? 600 : 500}>{item.label}</Typography>
                                </Box>
                            )
                        })}
                    </Box>
                )}

                {/* User Profile */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar src={user?.avatar_url || undefined} sx={{ width: 36, height: 36, background: '#FAFAFA', color: '#000', fontSize: 14 }}>
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{user?.full_name || user?.email}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                                {user?.role || 'free'}
                            </Typography>
                            <Chip
                                label={currentTier.toUpperCase()}
                                size="small"
                                sx={{
                                    height: 18, fontSize: 9, fontWeight: 800,
                                    letterSpacing: 1,
                                    background: `${tierColor}20`,
                                    color: tierColor,
                                    border: `1px solid ${tierColor}40`,
                                    ml: 0.5,
                                }}
                            />
                        </Box>
                        <Tooltip title="Logout">
                            <IconButton size="small" onClick={() => dispatch(logout())} sx={{ color: 'text.secondary' }}>
                                <LogoutIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Drawer>

            {/* Main Content */}
            <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <AppBar position="static" elevation={0}>
                    <Toolbar sx={{ justifyContent: 'flex-end', gap: 1 }}>
                        <Tooltip title={themeMode === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                            <IconButton
                                id="theme-toggle"
                                sx={{ color: 'text.secondary' }}
                                onClick={() => dispatch(toggleTheme())}
                            >
                                {themeMode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Notifications">
                            <IconButton sx={{ color: 'text.secondary' }} onClick={(e) => setNotifAnchor(e.currentTarget)}>
                                <Badge badgeContent={unreadCount} color="error">
                                    <NotifIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                        <Popover
                            open={!!notifAnchor}
                            anchorEl={notifAnchor}
                            onClose={() => setNotifAnchor(null)}
                            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                            PaperProps={{ sx: { width: 360, maxHeight: 420, background: '#1A1A24', border: '1px solid rgba(255,255,255,0.08)' } }}
                        >
                            <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle2" fontWeight={700}>Notifications</Typography>
                                {unreadCount > 0 && (
                                    <Button size="small" onClick={handleMarkAllRead} sx={{ fontSize: 11 }}>Mark all read</Button>
                                )}
                            </Box>
                            <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)' }} />
                            {notifications.length === 0 ? (
                                <Box sx={{ p: 3, textAlign: 'center' }}>
                                    <Typography variant="body2" color="text.secondary">No notifications yet</Typography>
                                </Box>
                            ) : (
                                <List dense sx={{ p: 0, maxHeight: 320, overflowY: 'auto' }}>
                                    {notifications.map((n: any) => (
                                        <ListItemButton
                                            key={n.id}
                                            onClick={() => handleNotifClick(n)}
                                            sx={{
                                                px: 2, py: 1.5,
                                                background: n.is_read ? 'transparent' : 'rgba(99,102,241,0.05)',
                                                borderLeft: n.is_read ? 'none' : '3px solid #6366F1',
                                            }}
                                        >
                                            <ListItemText
                                                primary={<Typography variant="body2" fontWeight={n.is_read ? 400 : 700} sx={{ fontSize: 13 }}>{n.title}</Typography>}
                                                secondary={
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>{n.message}</Typography>
                                                        <Typography variant="caption" sx={{ color: '#6B7280', fontSize: 10 }}>
                                                            {new Date(n.created_at).toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                }
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            )}
                        </Popover>
                    </Toolbar>
                </AppBar>

                <Box
                    className="bg-animated"
                    sx={{ flex: 1, p: 3, overflowY: 'auto', position: 'relative' }}
                >
                    <motion.div
                        key={location.pathname}
                        initial={{ opacity: 0, y: 15, filter: 'blur(4px)' }}
                        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                        transition={{ duration: 0.25, ease: 'easeOut' }}
                        style={{ height: '100%' }}
                    >
                        <Outlet />
                    </motion.div>
                </Box>
            </Box>
        </Box>
    )
}
