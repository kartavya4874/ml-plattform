import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import PublicHeader from './PublicHeader';
import ChatWidget from './ChatWidget';

export default function PublicLayout() {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', background: 'var(--bg)' }}>
            <PublicHeader />
            <Box sx={{ flex: 1, overflowY: 'auto' }}>
                <Outlet />
            </Box>
        </Box>
    );
}
