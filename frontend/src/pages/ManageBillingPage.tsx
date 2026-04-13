import { useEffect, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import { Box, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Button, Chip } from '@mui/material'
import { Download as DownloadIcon } from '@mui/icons-material'
import { api } from '../api/client'
import { fetchSubscription } from '../store/subscriptionSlice'
import type { AppDispatch, RootState } from '../store/store'

interface Invoice {
    id: string;
    amount_due: number;
    amount_paid: number;
    status: string;
    billing_reason: string;
    created_at: string;
}

export default function ManageBillingPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { summary } = useSelector((s: RootState) => s.subscription)
    const [invoices, setInvoices] = useState<Invoice[]>([])

    useEffect(() => {
        dispatch(fetchSubscription())
        loadInvoices()
    }, [dispatch])

    const loadInvoices = async () => {
        try {
            const res = await api.get('/subscription/invoices')
            setInvoices(res.data)
        } catch (error) {
            console.error("Failed to load invoices", error)
        }
    }

    const downloadInvoice = async (invoiceId: string) => {
        try {
            const res = await api.get(`/subscription/invoices/${invoiceId}/download`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }))
            const link = document.createElement('a')
            link.href = url
            link.setAttribute('download', `Parametrix_Invoice_${invoiceId.slice(0, 8).toUpperCase()}.pdf`)
            document.body.appendChild(link)
            link.click()
            link.parentNode?.removeChild(link)
            window.URL.revokeObjectURL(url)
        } catch (error) {
            console.error("Failed to download invoice", error)
        }
    }

    const currentTier = summary?.tier || 'free'
    const status = summary?.subscription?.status || 'active'

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: 'text.primary' }}>
                    Manage Billing
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    View your active subscription and download past invoices.
                </Typography>
            </Box>

            <Paper sx={{ p: 4, background: '#0A0A0A', border: '1px solid #222', borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Current Plan Overview</Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, background: 'rgba(255,255,255,0.03)', borderRadius: 2 }}>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">Plan</Typography>
                        <Typography variant="h6" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{currentTier}</Typography>
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">Status</Typography>
                        <Chip label={status.toUpperCase()} color={status === 'active' ? 'success' : 'warning'} size="small" />
                    </Box>
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary">Renewal</Typography>
                        <Typography variant="body1">
                            {summary?.subscription?.current_period_end ? new Date(summary.subscription.current_period_end).toLocaleDateString() : 'N/A'}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ mt: 3 }}>
                    <Button variant="outlined" href="/pricing" color="inherit">Change Plan</Button>
                </Box>
            </Paper>

            <Paper sx={{ p: 4, background: '#0A0A0A', border: '1px solid #222', borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Billing History</Typography>
                <TableContainer>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>Date</TableCell>
                                <TableCell>Amount</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Invoice</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {invoices.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                                        No invoices found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {invoices.map((inv) => (
                                <TableRow key={inv.id}>
                                    <TableCell>{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                                    <TableCell>${inv.amount_paid.toFixed(2)}</TableCell>
                                    <TableCell>
                                        <Chip label={inv.status} size="small" color={inv.status === 'paid' ? 'success' : 'default'} />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button 
                                            size="small" 
                                            startIcon={<DownloadIcon />} 
                                            onClick={() => downloadInvoice(inv.id)}
                                            variant="text"
                                        >
                                            Download
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>
        </Box>
    )
}
