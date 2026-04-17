import { useNavigate } from 'react-router-dom'
import { Box, Typography, Container, Button, useTheme, IconButton, Divider } from '@mui/material'
import {
    ArrowBack as BackIcon,
    AutoAwesome as LogoIcon,
    DarkModeOutlined as DarkModeIcon,
    LightModeOutlined as LightModeIcon,
} from '@mui/icons-material'
import { useDispatch, useSelector } from 'react-redux'
import { toggleTheme } from '../store/themeSlice'
import type { RootState } from '../store/store'

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
            <Typography
                variant="h5"
                fontWeight={700}
                sx={{ mb: 2, letterSpacing: '-0.01em' }}
            >
                {title}
            </Typography>
            <Box sx={{ color: theme.palette.text.secondary, lineHeight: 1.8, '& p': { mb: 2 }, '& ul': { pl: 3, mb: 2 }, '& li': { mb: 1 } }}>
                {children}
            </Box>
        </Box>
    )
}

export default function PrivacyPolicyPage() {
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
                    Privacy Policy
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                    Last updated: {LAST_UPDATED}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 5 }}>
                    Effective for users of <Box component="a" href={WEBSITE_URL} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{WEBSITE_URL}</Box>
                </Typography>

                <Divider sx={{ mb: 5, borderColor: theme.palette.divider }} />

                <Section title="1. Introduction">
                    <Typography variant="body1">
                        {COMPANY_NAME} ("we", "our", or "us") is committed to protecting and respecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website <strong>{WEBSITE_URL}</strong> and use our machine learning platform services, including any related applications (collectively, the "Service").
                    </Typography>
                    <Typography variant="body1">
                        By accessing or using the Service, you agree to the collection and use of information in accordance with this policy. If you do not agree, please discontinue use of the Service.
                    </Typography>
                </Section>

                <Section title="2. Information We Collect">
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>Personal Information</Typography>
                    <Typography variant="body1">When you register for an account, subscribe to a plan, or contact us, we may collect:</Typography>
                    <ul>
                        <li><Typography variant="body1">Full name and email address</Typography></li>
                        <li><Typography variant="body1">Billing address and payment information (processed securely via third-party payment processors)</Typography></li>
                        <li><Typography variant="body1">Organization name (if applicable)</Typography></li>
                        <li><Typography variant="body1">Profile information you provide (avatar, bio, username)</Typography></li>
                    </ul>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>Usage Data</Typography>
                    <Typography variant="body1">We automatically collect certain information when you use the Service:</Typography>
                    <ul>
                        <li><Typography variant="body1">IP address, browser type, device information</Typography></li>
                        <li><Typography variant="body1">Pages visited, features used, time spent on the platform</Typography></li>
                        <li><Typography variant="body1">Datasets uploaded (metadata only — we do <strong>not</strong> analyze the contents of your data for advertising)</Typography></li>
                        <li><Typography variant="body1">Model training logs and performance metrics</Typography></li>
                    </ul>
                </Section>

                <Section title="3. How We Use Your Information">
                    <Typography variant="body1">We use your information for the following purposes:</Typography>
                    <ul>
                        <li><Typography variant="body1">To provide, maintain, and improve the Service</Typography></li>
                        <li><Typography variant="body1">To process transactions and send related billing information</Typography></li>
                        <li><Typography variant="body1">To communicate with you via email regarding account updates, security alerts, and service changes</Typography></li>
                        <li><Typography variant="body1">To respond to your support requests and inquiries</Typography></li>
                        <li><Typography variant="body1">To monitor and analyze usage patterns to improve platform performance</Typography></li>
                        <li><Typography variant="body1">To detect, prevent, and address fraud or technical issues</Typography></li>
                        <li><Typography variant="body1">To comply with legal obligations</Typography></li>
                    </ul>
                </Section>

                <Section title="4. Data Security">
                    <Typography variant="body1">
                        We implement industry-standard security measures to protect your personal information, including encryption of data in transit (TLS/SSL) and at rest. However, no method of electronic storage or transmission is 100% secure, and we cannot guarantee absolute security.
                    </Typography>
                    <Typography variant="body1">
                        Payment information is processed through PCI-DSS compliant payment gateways and is never stored on our servers.
                    </Typography>
                </Section>

                <Section title="5. Third-Party Services">
                    <Typography variant="body1">We may share your information with the following categories of third-party service providers:</Typography>
                    <ul>
                        <li><Typography variant="body1"><strong>Payment Processors:</strong> To handle subscription billing and payment processing</Typography></li>
                        <li><Typography variant="body1"><strong>Cloud Infrastructure:</strong> To host the Service and store your data securely</Typography></li>
                        <li><Typography variant="body1"><strong>Analytics:</strong> To understand usage patterns and improve the Service</Typography></li>
                        <li><Typography variant="body1"><strong>Authentication Providers:</strong> Google OAuth for sign-in functionality</Typography></li>
                    </ul>
                    <Typography variant="body1">
                        We do <strong>not</strong> sell, rent, or trade your personal information to any third party for marketing purposes.
                    </Typography>
                </Section>

                <Section title="6. Cookies & Tracking">
                    <Typography variant="body1">
                        We use essential cookies and local storage to maintain your session, remember your preferences (like theme mode), and keep you authenticated. We do not use third-party advertising cookies.
                    </Typography>
                </Section>

                <Section title="7. Data Retention">
                    <Typography variant="body1">
                        We retain your personal information for as long as your account is active or as needed to provide the Service. If you request account deletion, we will remove your data within 30 days, except where retention is required by law or for legitimate business purposes (e.g., fraud prevention).
                    </Typography>
                </Section>

                <Section title="8. Your Rights">
                    <Typography variant="body1">You have the right to:</Typography>
                    <ul>
                        <li><Typography variant="body1">Access, update, or delete your personal information through your account settings</Typography></li>
                        <li><Typography variant="body1">Request a copy of your data in a portable format</Typography></li>
                        <li><Typography variant="body1">Withdraw consent for optional data processing</Typography></li>
                        <li><Typography variant="body1">Lodge a complaint with a data protection authority</Typography></li>
                    </ul>
                    <Typography variant="body1">
                        To exercise any of these rights, contact us at <Box component="a" href={`mailto:${CONTACT_EMAIL}`} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{CONTACT_EMAIL}</Box>.
                    </Typography>
                </Section>

                <Section title="9. Children's Privacy">
                    <Typography variant="body1">
                        The Service is not directed to individuals under the age of 16. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child without parental consent, we will take steps to delete that information.
                    </Typography>
                </Section>

                <Section title="10. Changes to This Policy">
                    <Typography variant="body1">
                        We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this page and updating the "Last Updated" date. Continued use of the Service after changes constitutes acceptance of the revised policy.
                    </Typography>
                </Section>

                <Section title="11. Contact Us">
                    <Typography variant="body1">
                        If you have any questions about this Privacy Policy, please contact us at:
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
