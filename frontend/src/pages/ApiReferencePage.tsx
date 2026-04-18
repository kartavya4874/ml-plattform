import React from 'react';
import { Box, Typography, Container, Paper, Divider } from '@mui/material';

export const ApiReferencePage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold">
        API Reference
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Integrate Parametrix AI seamlessly into your applications with our robust REST API.
      </Typography>

      <Paper sx={{ mt: 4, p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Authentication
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1" sx={{ mb: 2 }}>
          All API requests must be authenticated using a Bearer token. You can generate API keys directly from the Deployment Hub after deploying your model.
        </Typography>
        <Box sx={{ p: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 2, fontFamily: 'monospace', fontSize: 14 }}>
          Authorization: Bearer nx_key123...
        </Box>
      </Paper>

      <Paper sx={{ mt: 4, p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Endpoints
        </Typography>
        <Divider sx={{ mb: 2 }} />
        
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            POST /v1/predict
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Run inference against your deployed endpoint.
          </Typography>
          <Box sx={{ p: 2, background: 'rgba(0,0,0,0.05)', borderRadius: 2, fontFamily: 'monospace', fontSize: 13, mb: 1 }}>
            curl -X POST https://api.parametrix.in/v1/predict \ <br/>
            &nbsp;&nbsp;-H "Authorization: Bearer nx_key123" \ <br/>
            &nbsp;&nbsp;-H "Content-Type: application/json" \ <br/>
            &nbsp;&nbsp;-d '{"{"} "feature1": 24, "feature2": "NYC" {"}"}'
          </Box>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" fontWeight="bold" color="primary.main">
            GET /v1/models
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            List all your available deployed models.
          </Typography>
        </Box>

      </Paper>
      
      <Paper sx={{ mt: 4, p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Rate Limits
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <Typography variant="body1">
          Rate limits are determined by your active subscription plan. Free tier users are limited to 1,000 requests per month. Pro and Enterprise users enjoy significantly higher thresholds. If you exceed your limit, you will receive a 429 Too Many Requests response.
        </Typography>
      </Paper>

    </Container>
  );
};

export default ApiReferencePage;
