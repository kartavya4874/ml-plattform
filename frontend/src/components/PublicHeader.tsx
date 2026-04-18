import React from 'react';
import { Box, Typography, Button, useTheme } from '@mui/material';
import { AutoAwesome as LogoIcon, ArrowBack } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export default function PublicHeader() {
    const theme = useTheme();
    const navigate = useNavigate();
    const isDark = theme.palette.mode === 'dark';

    return (
        <Box sx={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            px: { xs: 3, md: 8 }, py: 2,
            background: isDark ? 'rgba(9, 9, 11, 0.7)' : 'rgba(255, 255, 255, 0.8)', 
            backdropFilter: 'blur(20px)',
            borderBottom: `1px solid ${theme.palette.divider}`,
            position: 'sticky',
            top: 0,
            zIndex: 50,
        }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, cursor: 'pointer' }} onClick={() => navigate('/')}>
                <Box sx={{
                    width: 32, height: 32, borderRadius: '8px',
                    background: isDark ? '#FAFAFA' : '#18181B',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    <LogoIcon sx={{ color: isDark ? '#000' : '#FFF', fontSize: 18 }} />
                </Box>
                <Typography variant="h6" fontWeight={800} letterSpacing="-0.5px">Parametrix AI</Typography>
            </Box>
            
            <Button
                variant="outlined" 
                startIcon={<ArrowBack />}
                onClick={() => navigate('/')}
                sx={{
                    borderRadius: 3, fontWeight: 600,
                    borderColor: theme.palette.divider, 
                    color: theme.palette.text.primary,
                    '&:hover': { background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)' },
                }}
            >
                Back to Home
            </Button>
        </Box>
    );
}
