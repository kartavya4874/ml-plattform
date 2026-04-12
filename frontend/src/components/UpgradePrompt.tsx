import { useNavigate } from 'react-router-dom'
import { Box, Typography, Button } from '@mui/material'
import { RocketLaunch as UpgradeIcon } from '@mui/icons-material'

interface UpgradePromptProps {
    resource: string
    current: number
    limit: number
    tier: string
}

export default function UpgradePrompt({ resource, current, limit, tier }: UpgradePromptProps) {
    const navigate = useNavigate()
    const percentage = Math.min((current / limit) * 100, 100)
    const isAtLimit = current >= limit
    const isNearLimit = percentage >= 80

    if (!isNearLimit) return null

    return (
        <Box
            id={`upgrade-prompt-${resource}`}
            sx={{
                p: 2.5,
                borderRadius: '12px',
                background: isAtLimit
                    ? 'linear-gradient(135deg, rgba(239,68,68,0.12), rgba(239,68,68,0.04))'
                    : 'linear-gradient(135deg, rgba(245,158,11,0.12), rgba(245,158,11,0.04))',
                border: `1px solid ${isAtLimit ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                display: 'flex',
                alignItems: 'center',
                gap: 2,
                animation: 'fadeIn 0.4s ease forwards',
            }}
        >
            <Box sx={{
                width: 40, height: 40, borderRadius: '10px',
                background: isAtLimit ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: isAtLimit ? '#EF4444' : '#F59E0B',
                flexShrink: 0,
            }}>
                <UpgradeIcon fontSize="small" />
            </Box>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="body2" fontWeight={600} sx={{ color: isAtLimit ? '#EF4444' : '#F59E0B' }}>
                    {isAtLimit
                        ? `${resource.replace('_', ' ')} limit reached`
                        : `Approaching ${resource.replace('_', ' ')} limit`}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    {current} / {limit >= 999_999 ? '∞' : limit.toLocaleString()} used
                    {tier !== 'enterprise' && ' — Upgrade to get more.'}
                </Typography>
            </Box>
            {tier !== 'enterprise' && (
                <Button
                    size="small"
                    variant="contained"
                    onClick={() => navigate('/pricing')}
                    sx={{
                        flexShrink: 0,
                        background: isAtLimit
                            ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                            : 'linear-gradient(135deg, #F59E0B, #D97706)',
                        fontSize: 12,
                        px: 2,
                    }}
                >
                    Upgrade
                </Button>
            )}
        </Box>
    )
}
