import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
    Box, Drawer, AppBar, Toolbar, Typography, IconButton,
    Avatar, Tooltip, Badge
} from '@mui/material'
import {
    Dashboard as DashboardIcon,
    Storage as DataIcon,
    Psychology as TrainIcon,
    Hub as ModelsIcon,
    Logout as LogoutIcon,
    Notifications as NotifIcon,
    AutoAwesome as LogoIcon,
} from '@mui/icons-material'
import { logout } from '../store/authSlice'
import type { RootState } from '../store/store'

const DRAWER_WIDTH = 240

const navItems = [
    { label: 'Dashboard', icon: <DashboardIcon />, path: '/dashboard' },
    { label: 'Data Explorer', icon: <DataIcon />, path: '/data' },
    { label: 'Training Studio', icon: <TrainIcon />, path: '/train' },
    { label: 'Model Hub', icon: <ModelsIcon />, path: '/models' },
]

export default function Layout() {
    const location = useLocation()
    const navigate = useNavigate()
    const dispatch = useDispatch()
    const user = useSelector((s: RootState) => s.auth.user)

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
                        background: 'linear-gradient(135deg, #6366F1, #8B5CF6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: '0 4px 15px rgba(99,102,241,0.4)'
                    }}>
                        <LogoIcon sx={{ fontSize: 20, color: 'white' }} />
                    </Box>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.2 }}>NoCode AI</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 10 }}>Platform v1.0</Typography>
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

                {/* User Profile */}
                <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Avatar sx={{ width: 36, height: 36, background: 'linear-gradient(135deg, #6366F1, #10B981)', fontSize: 14 }}>
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Typography variant="body2" fontWeight={600} noWrap>{user?.full_name || user?.email}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'capitalize' }}>
                                {user?.role || 'free'}
                            </Typography>
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
