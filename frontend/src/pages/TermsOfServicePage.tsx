import { useNavigate } from 'react-router-dom'
import { Box, Typography, Container, Button, useTheme, IconButton, Divider } from '@mui/material'
import {
    ArrowBack as BackIcon,
    AutoAwesome as LogoIcon,
    DarkModeOutlined as DarkModeIcon,
    LightModeOutlined as LightModeIcon,
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

export default function TermsOfServicePage() {
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
                    Terms of Service
                </Typography>
                <Typography variant="body1" sx={{ color: theme.palette.text.secondary, mb: 1 }}>
                    Last updated: {LAST_UPDATED}
                </Typography>
                <Typography variant="body2" sx={{ color: theme.palette.text.secondary, mb: 5 }}>
                    These terms apply to use of <Box component="a" href={WEBSITE_URL} sx={{ color: theme.palette.info.main, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>{WEBSITE_URL}</Box>
                </Typography>

                <Divider sx={{ mb: 5, borderColor: theme.palette.divider }} />

                <Section title="1. Acceptance of Terms">
                    <Typography variant="body1">
                        By accessing or using the {COMPANY_NAME} platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not access or use the Service.
                    </Typography>
                    <Typography variant="body1">
                        We reserve the right to modify these Terms at any time. Continued use of the Service after any modification constitutes acceptance of the updated Terms.
                    </Typography>
                </Section>

                <Section title="2. Description of Service">
                    <Typography variant="body1">
                        {COMPANY_NAME} provides a cloud-based machine learning platform that enables users to upload datasets, train machine learning models, deploy models as REST APIs, and collaborate with other users through community features. The Service includes both free and paid subscription tiers.
                    </Typography>
                </Section>

                <Section title="3. Account Registration">
                    <Typography variant="body1">To use the Service, you must:</Typography>
                    <ul>
                        <li><Typography variant="body1">Be at least 16 years of age</Typography></li>
                        <li><Typography variant="body1">Provide accurate and complete registration information</Typography></li>
                        <li><Typography variant="body1">Maintain the security of your account credentials</Typography></li>
                        <li><Typography variant="body1">Notify us immediately of any unauthorized use of your account</Typography></li>
                    </ul>
                    <Typography variant="body1">
                        You are solely responsible for all activities that occur under your account.
                    </Typography>
                </Section>

                <Section title="4. Subscription Plans & Billing">
                    <Typography variant="body1">
                        The Service offers multiple subscription tiers (Free, Pro, Enterprise) with varying limits on features, storage, and API usage. Details of each tier are available on our <Box component="span" sx={{ color: theme.palette.info.main, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/pricing')}>Pricing page</Box>.
                    </Typography>
                    <ul>
                        <li><Typography variant="body1"><strong>Billing Cycle:</strong> Paid subscriptions are billed monthly. Your billing cycle begins on the date you upgrade to a paid plan.</Typography></li>
                        <li><Typography variant="body1"><strong>Payment:</strong> All payments are processed securely through our third-party payment processor. Prices are listed in the currency displayed at checkout.</Typography></li>
                        <li><Typography variant="body1"><strong>Auto-Renewal:</strong> Subscriptions automatically renew at the end of each billing period unless cancelled before the renewal date.</Typography></li>
                        <li><Typography variant="body1"><strong>Price Changes:</strong> We may change subscription prices with at least 30 days' notice. Price changes will take effect at the start of the next billing cycle after notification.</Typography></li>
                    </ul>
                </Section>

                <Section title="5. Acceptable Use">
                    <Typography variant="body1">You agree not to use the Service to:</Typography>
                    <ul>
                        <li><Typography variant="body1">Upload, train on, or distribute illegal, harmful, or offensive content</Typography></li>
                        <li><Typography variant="body1">Violate any applicable laws, regulations, or third-party rights</Typography></li>
                        <li><Typography variant="body1">Attempt to gain unauthorized access to the Service, other accounts, or related systems</Typography></li>
                        <li><Typography variant="body1">Interfere with or disrupt the integrity or performance of the Service</Typography></li>
                        <li><Typography variant="body1">Reverse engineer, decompile, or disassemble any part of the Service</Typography></li>
                        <li><Typography variant="body1">Use the Service as a component of any commercial product without prior written consent</Typography></li>
                        <li><Typography variant="body1">Scrape, mine, or extract data from the Service through automated means</Typography></li>
                    </ul>
                </Section>

                <Section title="6. Intellectual Property">
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>Your Content</Typography>
                    <Typography variant="body1">
                        You retain ownership of all data, datasets, trained models, and content you upload to or create using the Service ("Your Content"). By using the Service, you grant us a limited license to process, store, and display Your Content solely to provide the Service.
                    </Typography>
                    <Typography variant="body1" fontWeight={600} sx={{ mb: 1 }}>Our Platform</Typography>
                    <Typography variant="body1">
                        The Service, its features, and all associated software, documentation, and design elements are the intellectual property of {COMPANY_NAME}. You may not copy, modify, or distribute any part of the platform without our written consent.
                    </Typography>
                </Section>

                <Section title="7. Data & Privacy">
                    <Typography variant="body1">
                        Your use of the Service is also governed by our <Box component="span" sx={{ color: theme.palette.info.main, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }} onClick={() => navigate('/privacy')}>Privacy Policy</Box>, which describes how we collect, use, and protect your information.
                    </Typography>
                </Section>

                <Section title="8. Service Availability & Modifications">
                    <Typography variant="body1">
                        We strive to maintain high availability but do not guarantee uninterrupted access to the Service. We may modify, suspend, or discontinue any feature with or without notice. We are not liable for any modification, suspension, or discontinuation of the Service.
                    </Typography>
                </Section>

                <Section title="9. Limitation of Liability">
                    <Typography variant="body1">
                        TO THE MAXIMUM EXTENT PERMITTED BY LAW, {COMPANY_NAME.toUpperCase()} SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, DATA, GOODWILL, OR OTHER INTANGIBLE LOSSES, ARISING FROM YOUR USE OF THE SERVICE.
                    </Typography>
                    <Typography variant="body1">
                        Our total liability for any claims arising under these Terms shall not exceed the amount you paid to us in the twelve (12) months preceding the claim.
                    </Typography>
                </Section>

                <Section title="10. Indemnification">
                    <Typography variant="body1">
                        You agree to indemnify and hold harmless {COMPANY_NAME}, its officers, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
                    </Typography>
                </Section>

                <Section title="11. Termination">
                    <Typography variant="body1">
                        We may suspend or terminate your account at our discretion if you violate these Terms. You may terminate your account at any time by contacting us. Upon termination, your right to use the Service will cease immediately. Provisions that by their nature should survive termination shall survive (including liability limitations and indemnification).
                    </Typography>
                </Section>

                <Section title="12. Governing Law">
                    <Typography variant="body1">
                        These Terms shall be governed by and construed in accordance with the laws of India. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in India.
                    </Typography>
                </Section>

                <Section title="13. Contact">
                    <Typography variant="body1">
                        For questions about these Terms, please contact us at:
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
