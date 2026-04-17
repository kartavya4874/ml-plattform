import { useNavigate } from 'react-router-dom'
import { Box, Typography, Container, Button, useTheme, IconButton, Divider, Card } from '@mui/material'
import {
    ArrowBack as BackIcon,
    AutoAwesome as LogoIcon,
    DarkModeOutlined as DarkModeIcon,
    LightModeOutlined as LightModeIcon,
    CheckCircleOutline as CheckIcon,
    CancelOutlined as CancelIcon,
    InfoOutlined as InfoIcon,
} from '@mui/icons-material'
import { useDispatch } from 'react-redux'
import { toggleTheme } from '../store/themeSlice'

const LAST_UPDATED = 'April 18, 2026'
const COMPANY_NAME = 'Parametrix AI'
const WEBSITE_URL = 'https://paramatrix.in'
const CONTACT_EMAIL = 'support@paramatrix.in'

interface SectionProps {
    title: string
    children: React.ReactNode
}

function Section({ title, children }: SectionProps) {
    const theme = useTheme()
    return (
        <Box sx={{ mb: 5 }}>
            <Typography variant="h5" fontWeight={700} sx={{ mb: 2, letterSpacing: '-0.01em' }}>
                {title}
            </Typography>
            <Box sx={{ color: theme.palette.text.secondary, lineHeight: 1.8, '& p': { mb: 2 }, '& ul': { pl: 3, mb: 2 }, '& li': { mb: 1 } }}>
                {children}
            </Box>
        </Box>
    )
}

function HighlightCard({ icon, title, description, color }: { icon: React.ReactNode; title: string; description: string; color: string }) {
    const theme = useTheme()
    return (
        <Card sx={{
            p: 3, borderRadius: 4, display: 'flex', gap: 2, alignItems: 'flex-start',
            background: `${color}08`, border: `1px solid ${color}25`,
            mb: 2,
        }}>
            <Box sx={{ color, mt: 0.5, flexShrink: 0 }}>{icon}</Box>
            <Box>
                <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>{title}</Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, lineHeight: 1.7 }}>{description}</Typography>
            </Box>
        </Card>
    )
}

export default function RefundPolicyPage() {
    const navigate = useNavigate()
    const theme = useTheme()
    const dispatch = useDispatch()
    const isDark = theme.palette.mode === 'dark'

    return (
        <Box sx={{
            minHeight: '100vh',
            background: theme.palette.background.default,
            color: theme.palette.text.primary,
            transition: 'background 0.3s ease',
        }}>
            {/* Header */}
            <Box sx={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                px: { xs: 3, md: 8 }, py: 2,
                position: 'sticky', top: 0, zIndex: 50,
                background: isDark ? 'rgba(9, 9, 11, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(20px)',
                borderBottom: `1px solid ${theme.palette.divider}`,
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
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <IconButton onClick={() => dispatch(toggleTheme())} sx={{ color: theme.palette.text.secondary }}>
                        {isDark ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                    </IconButton>
                    <Button variant="outlined" startIcon={<BackIcon />} onClick={() => navigate(-1)}
                        sx={{ borderColor: theme.palette.divider, color: theme.palette.text.primary, fontWeight: 600, borderRadius: 2 }}>
                        Back
                    </Button>
                </Box>
            </Box>

            {/* Content */}
            <Container maxWidth="md" sx={{ py: { xs: 6, md: 10 } }}>
                <Typography variant="h3" fontWeight={900} sx={{ mb: 1, letterSpacing: '-0.03em' }}>
                    Refund & Cancellation Policy
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                    Last updated: {LAST_UPDATED}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 5 }}>
                    Applicable to all paid subscriptions on <Box component="a" href={WEBSITE_URL} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{WEBSITE_URL}</Box>
                </Typography>

                <Divider sx={{ mb: 5, borderColor: theme.palette.divider }} />

                {/* Quick Reference Cards */}
                <Box sx={{ mb: 6 }}>
                    <Typography variant="h5" fontWeight={700} sx={{ mb: 3 }}>At a Glance</Typography>
                    <HighlightCard
                        icon={<CheckIcon fontSize="medium" />}
                        title="Cancel anytime"
                        description="You can cancel your subscription at any time. Your access continues until the end of your current billing period."
                        color="#10B981"
                    />
                    <HighlightCard
                        icon={<InfoIcon fontSize="medium" />}
                        title="Refunds within 7 days"
                        description="If you are unsatisfied, request a full refund within 7 days of your first subscription payment. No questions asked."
                        color="#3B82F6"
                    />
                    <HighlightCard
                        icon={<CancelIcon fontSize="medium" />}
                        title="No refunds after 7 days"
                        description="After the 7-day window, refunds are not available for the current billing period. You can still cancel to prevent future charges."
                        color="#EF4444"
                    />
                </Box>

                <Section title="1. Subscription Cancellation">
                    <Typography variant="body1">
                        You may cancel your paid subscription at any time through your account Billing settings or by contacting our support team. Upon cancellation:
                    </Typography>
                    <ul>
                        <li><Typography variant="body1">Your subscription will remain active until the end of the current billing period</Typography></li>
                        <li><Typography variant="body1">You will not be charged for subsequent billing periods</Typography></li>
                        <li><Typography variant="body1">Your account will automatically downgrade to the Free tier at the end of the paid period</Typography></li>
                        <li><Typography variant="body1">Your data, datasets, and models will be preserved, but access may be limited based on Free tier limits</Typography></li>
                    </ul>
                </Section>

                <Section title="2. Refund Eligibility">
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>First-Time Subscribers</Typography>
                    <Typography variant="body1">
                        If you are a first-time subscriber to any paid plan and are not satisfied with the Service, you may request a <strong>full refund within 7 calendar days</strong> of your initial subscription payment. This is a one-time courtesy and applies only to the first subscription purchase.
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>Renewal Payments</Typography>
                    <Typography variant="body1">
                        Refunds are <strong>not available</strong> for subscription renewals. It is your responsibility to cancel your subscription before the renewal date if you do not wish to continue.
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>Service Disruptions</Typography>
                    <Typography variant="body1">
                        In the event of significant, prolonged service outages or disruptions caused by us (exceeding 72 continuous hours), we will issue a prorated credit or refund for the affected period on a case-by-case basis.
                    </Typography>
                </Section>

                <Section title="3. How to Request a Refund">
                    <Typography variant="body1">To request a refund:</Typography>
                    <ul>
                        <li><Typography variant="body1">Send an email to <Box component="a" href={`mailto:${CONTACT_EMAIL}`} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{CONTACT_EMAIL}</Box> with the subject line "Refund Request"</Typography></li>
                        <li><Typography variant="body1">Include your registered email address and the date of payment</Typography></li>
                        <li><Typography variant="body1">Briefly describe the reason for your refund request</Typography></li>
                    </ul>
                    <Typography variant="body1">
                        We will process eligible refund requests within <strong>5–10 business days</strong>. The refund will be credited to the original payment method used during the transaction.
                    </Typography>
                </Section>

                <Section title="4. Non-Refundable Items">
                    <Typography variant="body1">The following are not eligible for refunds:</Typography>
                    <ul>
                        <li><Typography variant="body1">Subscription fees after the 7-day refund window</Typography></li>
                        <li><Typography variant="body1">Partial billing periods (no prorated refunds for mid-cycle cancellations)</Typography></li>
                        <li><Typography variant="body1">Accounts terminated due to violation of our Terms of Service</Typography></li>
                        <li><Typography variant="body1">Any promotional or discounted subscriptions, unless otherwise stated</Typography></li>
                    </ul>
                </Section>

                <Section title="5. Downgrade Policy">
                    <Typography variant="body1">
                        If you downgrade from a higher tier to a lower tier (e.g., Enterprise to Pro), the downgrade takes effect at the start of the next billing cycle. You will continue to have access to the higher tier features until the end of the current paid period. No refunds or credits are issued for downgrades.
                    </Typography>
                </Section>

                <Section title="6. Free Tier">
                    <Typography variant="body1">
                        The Free tier does not involve any payment and therefore is not subject to refund or cancellation policies. You may use or discontinue the Free tier at any time.
                    </Typography>
                </Section>

                <Section title="7. Disputes">
                    <Typography variant="body1">
                        If you believe a charge was made in error or if you have a billing dispute, please contact us at <Box component="a" href={`mailto:${CONTACT_EMAIL}`} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{CONTACT_EMAIL}</Box> before initiating a chargeback with your bank or payment provider. We will make every effort to resolve your concern promptly.
                    </Typography>
                </Section>

                <Section title="8. Contact Us">
                    <Typography variant="body1">
                        For any questions regarding refunds, cancellations, or billing, reach out to:
                    </Typography>
                    <ul>
                        <li><Typography variant="body1"><strong>Email:</strong> <Box component="a" href={`mailto:${CONTACT_EMAIL}`} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{CONTACT_EMAIL}</Box></Typography></li>
                        <li><Typography variant="body1"><strong>Website:</strong> <Box component="a" href={WEBSITE_URL} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{WEBSITE_URL}</Box></Typography></li>
                    </ul>
                </Section>
            </Container>

            {/* Footer */}
            <Box sx={{ borderTop: `1px solid ${theme.palette.divider}`, py: 4, px: 3, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary }}>
                    © {new Date().getFullYear()} {COMPANY_NAME}. All rights reserved.
                </Typography>
            </Box>
        </Box>
    )
}
