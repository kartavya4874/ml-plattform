import { useEffect } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton,
    Avatar, Tooltip, Badge, Chip
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
} from '@mui/icons-material'
import { logout } from '../store/authSlice'
import { fetchSubscription } from '../store/subscriptionSlice'
import type { RootState, AppDispatch } from '../store/store'

const DRAWER_WIDTH = 240

const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Data Explorer', icon: <DataIcon />, path: '/data' },
    { label: 'Training Studio', icon: <TrainIcon />, path: '/train' },
    { label: 'Model Hub', icon: <ModelsIcon />, path: '/models' },
    { label: 'Pricing', icon: <PricingIcon />, path: '/pricing' },
    { label: 'Billing', icon: <ReceiptIcon />, path: '/billing' },
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
    const currentTier = summary?.tier || user?.role || 'free'
    const tierColor = tierColors[currentTier] || '#6366F1'

    useEffect(() => {
        dispatch(fetchSubscription())
    }, [dispatch])

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
                        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>NexusML</Typography>
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
                        <Tooltip title="Notifications">
                            <IconButton sx={{ color: 'text.secondary' }}>
                                <Badge badgeContent={0} color="error">
                                    <NotifIcon />
                                </Badge>
                            </IconButton>
                        </Tooltip>
                    </Toolbar>
                </AppBar>

                <Box
                    className="bg-animated"
                    sx={{ flex: 1, p: 3, overflowY: 'auto' }}
                >
                    <Outlet />
                </Box>
            </Box>
        </Box>
    )
}
