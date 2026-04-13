import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Box, Typography, InputBase } from '@mui/material'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search as SearchIcon,
    Storage as DataIcon,
    Psychology as TrainIcon,
    RocketLaunch as DeployIcon,
    Code as NotebookIcon,
    Hub as HubIcon,
    AccountCircle as ProfileIcon,
    Settings as SettingsIcon,
    Article as DocsIcon,
    Home as HomeIcon,
    Security as ApiKeyIcon
} from '@mui/icons-material'

const ACTIONS = [
    { id: '1', title: 'Dashboard', route: '/dashboard', icon: <HomeIcon fontSize="small" /> },
    { id: '2', title: 'Data Studio', route: '/data', icon: <DataIcon fontSize="small" /> },
    { id: '3', title: 'Train Model', route: '/train', icon: <TrainIcon fontSize="small" /> },
    { id: '4', title: 'Model Hub', route: '/models', icon: <HubIcon fontSize="small" /> },
    { id: '5', title: 'Notebooks', route: '/notebooks', icon: <NotebookIcon fontSize="small" /> },
    { id: '6', title: 'Deployment & APIs', route: '/deploy/:id', icon: <DeployIcon fontSize="small" />, placeholder: true }, // For generic search matching
    { id: '7', title: 'API Keys', route: '/api-keys', icon: <ApiKeyIcon fontSize="small" /> },
    { id: '8', title: 'Manage Profile', route: '/profile', icon: <ProfileIcon fontSize="small" /> },
    { id: '9', title: 'Billing', route: '/billing', icon: <SettingsIcon fontSize="small" /> },
    { id: '10', title: 'Documentation', route: '/docs', icon: <DocsIcon fontSize="small" /> },
]

export default function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const [selectedIndex, setSelectedIndex] = useState(0)
    const navigate = useNavigate()
    const inputRef = useRef<HTMLInputElement>(null)

    // Filter actions
    const filteredActions = ACTIONS.filter(a => 
        a.title.toLowerCase().includes(search.toLowerCase()) && !a.placeholder
    )

    // Keyboard bindings for toggling
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setOpen(o => !o)
            }
            if (e.key === 'Escape') setOpen(false)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    // Focus input on open
    useEffect(() => {
        if (open) setTimeout(() => inputRef.current?.focus(), 100)
        else setSearch('')
    }, [open])

    // Keyboard navigation inside palette
    const handlePaletteKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(s => (s + 1) % filteredActions.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(s => (s - 1 + filteredActions.length) % filteredActions.length)
        } else if (e.key === 'Enter') {
            e.preventDefault()
            const action = filteredActions[selectedIndex]
            if (action) {
                navigate(action.route)
                setOpen(false)
            }
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <Box sx={{
                    position: 'fixed', inset: 0, zIndex: 9999,
                    display: 'flex', justifyContent: 'center', pt: '15vh',
                }}>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.5)',
                            backdropFilter: 'blur(8px)',
                        }}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                        style={{
                            position: 'relative',
                            width: '100%', maxWidth: 640,
                            background: '#18181B', // Zinc 900
                            borderRadius: 16,
                            border: '1px solid rgba(255,255,255,0.1)',
                            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)',
                            overflow: 'hidden'
                        }}
                    >
                        {/* Search Input */}
                        <Box sx={{ 
                            display: 'flex', alignItems: 'center', p: 2, 
                            borderBottom: '1px solid rgba(255,255,255,0.08)' 
                        }}>
                            <SearchIcon sx={{ color: '#A1A1AA', mr: 2 }} />
                            <InputBase
                                inputRef={inputRef}
                                value={search}
                                onChange={e => { setSearch(e.target.value); setSelectedIndex(0); }}
                                onKeyDown={handlePaletteKey}
                                placeholder="Search apps, commands, or datasets..."
                                sx={{ color: '#FAFAFA', width: '100%', fontSize: 18, p: 0 }}
                            />
                            <Typography variant="caption" sx={{ 
                                color: '#A1A1AA', background: 'rgba(255,255,255,0.1)', 
                                px: 1, py: 0.5, borderRadius: 1, fontWeight: 700 
                            }}>
                                ESC
                            </Typography>
                        </Box>

                        {/* Results */}
                        <Box sx={{ maxHeight: 300, overflowY: 'auto', p: 1 }}>
                            {filteredActions.length === 0 ? (
                                <Box sx={{ p: 4, textAlign: 'center', color: '#A1A1AA' }}>
                                    No results found.
                                </Box>
                            ) : (
                                filteredActions.map((action, i) => (
                                    <Box
                                        key={action.id}
                                        onMouseEnter={() => setSelectedIndex(i)}
                                        onClick={() => { navigate(action.route); setOpen(false); }}
                                        sx={{
                                            display: 'flex', alignItems: 'center', p: 1.5,
                                            borderRadius: 2, cursor: 'pointer',
                                            background: i === selectedIndex ? 'rgba(99,102,241,0.15)' : 'transparent',
                                            color: i === selectedIndex ? '#FAFAFA' : '#A1A1AA',
                                            transition: 'background 0.1s',
                                        }}
                                    >
                                        <Box sx={{ 
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                            width: 32, height: 32, borderRadius: 1.5, mr: 2,
                                            background: i === selectedIndex ? '#6366F1' : 'rgba(255,255,255,0.05)',
                                            color: i === selectedIndex ? '#FFF' : '#A1A1AA'
                                        }}>
                                            {action.icon}
                                        </Box>
                                        <Typography variant="body1" fontWeight={i === selectedIndex ? 600 : 400}>
                                            {action.title}
                                        </Typography>
                                    </Box>
                                ))
                            )}
                        </Box>
                        
                        {/* Footer */}
                        <Box sx={{ 
                            p: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)', 
                            display: 'flex', gap: 2, color: '#A1A1AA', fontSize: 12,
                            background: 'rgba(0,0,0,0.2)'
                        }}>
                            <Typography variant="caption">Use arrow keys to navigate</Typography>
                            <Typography variant="caption">Enter to select</Typography>
                        </Box>
                    </motion.div>
                </Box>
            )}
        </AnimatePresence>
    )
}
