import React, { useState, useEffect } from 'react';
import { Container, Typography, Paper, Button, Box, Table, TableBody, TableCell, TableHead, TableRow, Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import BusinessIcon from '@mui/icons-material/Business';
import AddIcon from '@mui/icons-material/Add';
import { api } from '../api/client';

interface Org {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export const OrganizationManagementPage: React.FC = () => {
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [open, setOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  const fetchOrgs = async () => {
    try {
      const res = await api.get('/organizations');
      setOrgs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;
    try {
      await api.post('/organizations', { name: newOrgName, description: '' });
      setNewOrgName('');
      setOpen(false);
      fetchOrgs();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon fontSize="large" color="primary" /> Organization Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpen(true)}>
          Create Organization
        </Button>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Slug</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Members</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  You don't belong to any organizations yet.
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell sx={{ fontWeight: 'medium' }}>{org.name}</TableCell>
                  <TableCell><Chip label={org.slug} size="small" variant="outlined" /></TableCell>
                  <TableCell>1</TableCell>
                  <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" color="primary">Manage</Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Create New Organization</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Organization Name"
            fullWidth
            variant="outlined"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newOrgName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrganizationManagementPage;
