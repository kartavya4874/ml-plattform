import React from 'react';
import { Box, Typography, Container, Paper, List, ListItem, ListItemText, Divider } from '@mui/material';

export const DocumentationPage: React.FC = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h3" gutterBottom fontWeight="bold">
        Parametrix AI Help Center
      </Typography>
      <Typography variant="subtitle1" color="text.secondary" gutterBottom>
        Everything you need to know about preparing data, training models, and deploying your ML solutions.
      </Typography>

      <Paper sx={{ mt: 4, p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Getting Started
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List>
          <ListItem>
            <ListItemText 
              primary="1. Upload your Data" 
              secondary="Navigate to the Data Explorer. We support CSV, Excel, Parquet, and ZIP (for images). Your data must have a target column for supervised tasks." 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="2. Auto-Fix Data (Optional)" 
              secondary="In the Data Prep Studio, use the magic wand to automatically fill missing values, encode text variables, and drop useless columns." 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="3. Train a Model" 
              secondary="Go to the Training Studio. Select your dataset and target column. You can let Auto-ML handle everything, or fine-tune hyperparameters." 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="4. Deploy" 
              secondary="Once a model finishes training, view it in the Model Hub. Click Deploy to get a REST API endpoint and provision an API key." 
            />
          </ListItem>
        </List>
      </Paper>

      <Paper sx={{ mt: 4, p: 4, borderRadius: 2 }}>
        <Typography variant="h5" fontWeight="bold" gutterBottom>
          Keyboard Shortcuts
        </Typography>
        <Divider sx={{ mb: 2 }} />
        <List>
          <ListItem>
            <ListItemText primary="? (Shift + /)" secondary="Open Help Center" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Ctrl/Cmd + D" secondary="Go to Dashboard" />
          </ListItem>
          <ListItem>
            <ListItemText primary="Ctrl/Cmd + N" secondary="Upload New Dataset" />
          </ListItem>
        </List>
      </Paper>
    </Container>
  );
};

export default DocumentationPage;
