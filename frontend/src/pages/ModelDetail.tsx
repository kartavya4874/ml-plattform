import { useParams } from 'react-router-dom'
import { Box, Typography } from '@mui/material'

export default function ModelDetail() {
    const { id } = useParams<{ id: string }>()
    return (
        <Box>
            <Typography variant="h4" fontWeight={800}>Model Detail</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>Model ID: {id}</Typography>
        </Box>
    )
}
