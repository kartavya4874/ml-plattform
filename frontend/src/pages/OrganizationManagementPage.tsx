import React, { useState, useEffect } from 'react';
import {
  Container, Typography, Paper, Button, Box, Table, TableBody, TableCell, TableHead, TableRow,
  Chip, TextField, Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, IconButton,
  Alert, Divider
} from '@mui/material';
import {
  Business as BusinessIcon, Add as AddIcon, ArrowBack as ArrowBackIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';
import { api } from '../api/client';

export const OrganizationManagementPage: React.FC = () => {
  const [orgs, setOrgs] = useState<any[]>([]);
  const [selectedOrgSlug, setSelectedOrgSlug] = useState<string | null>(null);
  
  // Create state
  const [openCreate, setOpenCreate] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');

  // Selected Org specific
  const [orgData, setOrgData] = useState<any>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [invites, setInvites] = useState<any[]>([]);
  
  const [tab, setTab] = useState(0);

  // Invite state
  const [openInvite, setOpenInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  
  // Domain state
  const [newDomain, setNewDomain] = useState('');
  const [errorMSG, setErrorMSG] = useState('');

  // Whitelabel state
  const [wlConfig, setWlConfig] = useState<any>({});

  const fetchOrgs = async () => {
    try {
      const res = await api.get('/orgs');
      setOrgs(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchOrgDetails = async (slug: string) => {
    try {
      const [orgRes, memRes, invRes, wlRes] = await Promise.all([
        api.get(`/orgs/${slug}`),
        api.get(`/orgs/${slug}/members`),
        api.get(`/orgs/${slug}/invites`),
        api.get(`/orgs/${slug}/whitelabel`)
      ]);
      setOrgData(orgRes.data);
      setMembers(memRes.data);
      setInvites(invRes.data);
      setWlConfig(wlRes.data || {});
    } catch (e) {
      console.error(e);
      setErrorMSG('Failed to load organization or you lack permissions.');
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  useEffect(() => {
    if (selectedOrgSlug) {
      fetchOrgDetails(selectedOrgSlug);
    }
  }, [selectedOrgSlug]);

  const handleCreate = async () => {
    if (!newOrgName.trim()) return;
    try {
      await api.post('/orgs', { name: newOrgName, description: '' });
      setNewOrgName('');
      setOpenCreate(false);
      fetchOrgs();
    } catch (e) {
      console.error(e);
    }
  };

  const handleInvite = async () => {
    setErrorMSG('');
    try {
      await api.post(`/orgs/${selectedOrgSlug}/invite`, { email: inviteEmail, role: 'member' });
      setInviteEmail('');
      setOpenInvite(false);
      fetchOrgDetails(selectedOrgSlug!);
    } catch (e: any) {
      setErrorMSG(e.response?.data?.detail || 'Failed to invite');
    }
  };

  const handleRevoke = async (id: string) => {
    if (!window.confirm("Revoke this invite?")) return;
    try {
      await api.delete(`/orgs/${selectedOrgSlug}/invites/${id}`);
      fetchOrgDetails(selectedOrgSlug!);
    } catch (e: any) {
      setErrorMSG(e.response?.data?.detail || 'Failed to revoke');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm("Remove this member?")) return;
    try {
      await api.delete(`/orgs/${selectedOrgSlug}/members/${userId}`);
      fetchOrgDetails(selectedOrgSlug!);
    } catch (e: any) {
      setErrorMSG(e.response?.data?.detail || 'Failed to remove member');
    }
  };

  const saveDomains = async (domains: string[]) => {
    try {
      await api.put(`/orgs/${selectedOrgSlug}/email-domains`, { allowed_email_domains: domains });
      fetchOrgDetails(selectedOrgSlug!);
    } catch (e: any) {
      setErrorMSG(e.response?.data?.detail || 'Failed to update domains');
    }
  };

  const saveWhitelabel = async () => {
    try {
      await api.put(`/orgs/${selectedOrgSlug}/whitelabel`, wlConfig);
      alert('Branding settings saved successfully');
    } catch (e: any) {
      setErrorMSG(e.response?.data?.detail || 'Failed to update branding');
    }
  };

  if (selectedOrgSlug && orgData) {
    return (
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={() => setSelectedOrgSlug(null)} sx={{ color: 'text.secondary' }}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h4" fontWeight="bold">{orgData.name}</Typography>
          <Chip label="Enterprise" size="small" color="primary" />
        </Box>

        {errorMSG && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setErrorMSG('')}>{errorMSG}</Alert>}

        <Paper sx={{ background: '#111', borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ borderBottom: '1px solid #222', px: 2 }}>
            <Tab label="Members" />
            <Tab label="Invites" />
            <Tab label="Security & Domains" />
            <Tab label="White-labeling" />
          </Tabs>

          <Box sx={{ p: 4 }}>
            {tab === 0 && (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                  <Typography variant="h6">Team Members</Typography>
                  <Button variant="contained" size="small" onClick={() => setOpenInvite(true)}>Invite Member</Button>
                </Box>
                <Table>
                  <TableHead><TableRow>
                    <TableCell>Email / Name</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Joined</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {members.map(m => (
                      <TableRow key={m.id}>
                        <TableCell>{m.full_name || m.username || 'Unknown'}</TableCell>
                        <TableCell><Chip label={m.role} size="small" color={m.role === 'owner' ? 'secondary' : 'default'} /></TableCell>
                        <TableCell>{new Date(m.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          {m.role !== 'owner' && (
                            <IconButton size="small" color="error" onClick={() => handleRemoveMember(m.user_id)}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {tab === 1 && (
              <Box>
                <Typography variant="h6" mb={3}>Pending Invites</Typography>
                <Table>
                  <TableHead><TableRow>
                    <TableCell>Email</TableCell>
                    <TableCell>Role</TableCell>
                    <TableCell>Sent</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow></TableHead>
                  <TableBody>
                    {invites.map(i => (
                      <TableRow key={i.id}>
                        <TableCell>{i.email}</TableCell>
                        <TableCell><Chip label={i.role} size="small" /></TableCell>
                        <TableCell>{new Date(i.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(i.expires_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button size="small" variant="outlined" color="error" onClick={() => handleRevoke(i.id)}>Revoke</Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Box>
            )}

            {tab === 2 && (
              <Box>
                <Typography variant="h6" mb={1}>Allowed Email Domains</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                  Restrict who can join this organization to specific email domains (e.g., paramatrix.in). Leave empty to allow any domain.
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
                  {orgData.allowed_email_domains?.map((d: string) => (
                    <Chip key={d} label={d} onDelete={() => saveDomains(orgData.allowed_email_domains.filter((x: string) => x !== d))} />
                  ))}
                  {(!orgData.allowed_email_domains || orgData.allowed_email_domains.length === 0) && (
                    <Typography color="text.secondary" variant="body2" sx={{ py: 0.5 }}>No domain restrictions</Typography>
                  )}
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                  <TextField size="small" placeholder="example.com" value={newDomain} onChange={e => setNewDomain(e.target.value)} />
                  <Button variant="outlined" onClick={() => {
                    if (newDomain && !orgData.allowed_email_domains?.includes(newDomain)) {
                      saveDomains([...(orgData.allowed_email_domains || []), newDomain]);
                      setNewDomain('');
                    }
                  }}>Add Domain</Button>
                </Box>
              </Box>
            )}

            {tab === 3 && (
              <Box sx={{ maxWidth: 600 }}>
                <Typography variant="h6" mb={1}>Custom Branding & White-labeling</Typography>
                <Typography variant="body2" color="text.secondary" mb={4}>
                  Customize the look and feel of the platform for your organization members.
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <TextField 
                    label="Custom Brand Name" 
                    value={wlConfig.brand_name || ''} 
                    onChange={e => setWlConfig({...wlConfig, brand_name: e.target.value})} 
                    placeholder="e.g. Acme AI"
                  />
                  <TextField 
                    label="Custom Logo URL" 
                    value={wlConfig.logo_url || ''} 
                    onChange={e => setWlConfig({...wlConfig, logo_url: e.target.value})} 
                    placeholder="https://..."
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField 
                      label="Primary Color" 
                      value={wlConfig.primary_color || ''} 
                      onChange={e => setWlConfig({...wlConfig, primary_color: e.target.value})} 
                      placeholder="#6366F1"
                      fullWidth
                    />
                    <TextField 
                      label="Accent Color" 
                      value={wlConfig.accent_color || ''} 
                      onChange={e => setWlConfig({...wlConfig, accent_color: e.target.value})} 
                      placeholder="#EC4899"
                      fullWidth
                    />
                  </Box>
                  <TextField 
                    label="Custom Domain Routing" 
                    value={wlConfig.custom_domain || ''} 
                    onChange={e => setWlConfig({...wlConfig, custom_domain: e.target.value})} 
                    placeholder="e.g. ai.acmecorp.com"
                    helperText="Requires CNAME DNS configuration"
                  />
                  <Button variant="contained" onClick={saveWhitelabel} sx={{ alignSelf: 'flex-start' }}>Save Branding</Button>
                </Box>
              </Box>
            )}
          </Box>
        </Paper>

        <Dialog open={openInvite} onClose={() => setOpenInvite(false)}>
          <DialogTitle>Invite Member</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              They will receive a link to join your organization.
            </Typography>
            <TextField
              autoFocus
              label="Email Address"
              fullWidth
              variant="outlined"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} variant="contained" disabled={!inviteEmail.includes('@')}>Send Invite</Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <BusinessIcon fontSize="large" color="primary" /> Organization Management
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)}>
          Create Organization
        </Button>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Slug</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Created</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {orgs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  You don't belong to any organizations yet.
                </TableCell>
              </TableRow>
            ) : (
              orgs.map((org) => (
                <TableRow key={org.id}>
                  <TableCell sx={{ fontWeight: 'medium' }}>{org.name}</TableCell>
                  <TableCell><Chip label={org.slug} size="small" variant="outlined" /></TableCell>
                  <TableCell>{new Date(org.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Button size="small" variant="outlined" color="primary" onClick={() => setSelectedOrgSlug(org.slug)}>
                      Manage Settings
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)}>
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
          <Button onClick={() => setOpenCreate(false)}>Cancel</Button>
          <Button onClick={handleCreate} variant="contained" disabled={!newOrgName.trim()}>Create</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default OrganizationManagementPage;
