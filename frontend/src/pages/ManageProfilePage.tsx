import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Box, Typography, TextField, Button, Alert, Paper, Avatar, Input, FormControlLabel, Switch } from '@mui/material'
import { api } from '../api/client'
import { fetchMe } from '../store/authSlice'
import type { AppDispatch, RootState } from '../store/store'

export default function ManageProfilePage() {
    const dispatch = useDispatch<AppDispatch>()
    const user = useSelector((s: RootState) => s.auth.user)
    
    const [fullName, setFullName] = useState(user?.full_name || '')
    const [email, setEmail] = useState(user?.email || '')
    const [username, setUsername] = useState(user?.username || '')
    const [isPublic, setIsPublic] = useState(user?.is_public || false)
    const [bio, setBio] = useState(user?.bio || '')
    const [website, setWebsite] = useState(user?.website || '')
    const [githubUrl, setGithubUrl] = useState(user?.github_url || '')
    const [kaggleUrl, setKaggleUrl] = useState(user?.kaggle_url || '')
    const [is2FA, setIs2FA] = useState(user?.is_2fa_enabled || false)
    
    // Avatar upload
    const [avatarFile, setAvatarFile] = useState<File | null>(null)
    const [avatarPreview, setAvatarPreview] = useState<string | null>(user?.avatar_url || null)
    
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    
    const [profileSuccess, setProfileSuccess] = useState('')
    const [profileError, setProfileError] = useState('')
    
    const [passwordSuccess, setPasswordSuccess] = useState('')
    const [passwordError, setPasswordError] = useState('')

    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setProfileError('')
        setProfileSuccess('')
        setProfileSuccess('')
        try {
            await api.put('/auth/me', { full_name: fullName, email, username, is_public: isPublic, bio, website, github_url: githubUrl, kaggle_url: kaggleUrl, is_2fa_enabled: is2FA })
            if (avatarFile) {
                const formData = new FormData();
                formData.append('file', avatarFile);
                await api.post('/auth/me/avatar', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }
            await dispatch(fetchMe())
            setProfileSuccess('Profile updated successfully.')
        } catch (err: any) {
            setProfileError(err.response?.data?.detail || 'Failed to update profile.')
        }
    }

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0]
            setAvatarFile(file)
            setAvatarPreview(URL.createObjectURL(file))
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setPasswordError('')
        setPasswordSuccess('')
        try {
            await api.put('/auth/me/password', { current_password: currentPassword, new_password: newPassword })
            setPasswordSuccess('Password updated successfully.')
            setCurrentPassword('')
            setNewPassword('')
        } catch (err: any) {
            setPasswordError(err.response?.data?.detail || 'Failed to update password.')
        }
    }

    const handleDeleteAccount = async () => {
        if (!window.confirm("Are you ABSOLUTELY sure you want to delete your account? This action cannot be undone.")) return;
        try {
            await api.delete('/auth/me');
            window.location.href = '/login'; // Redirect to login
        } catch (err) {
            alert('Failed to delete account.');
        }
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Box>
                <Typography variant="h4" fontWeight={800} sx={{ mb: 1, color: 'text.primary' }}>
                    Manage Profile
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Update your personal details and secure your account.
                </Typography>
            </Box>

            <Paper sx={{ p: 4, background: '#0A0A0A', border: '1px solid #222', borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Personal Information</Typography>
                {profileSuccess && <Alert severity="success" sx={{ mb: 3 }}>{profileSuccess}</Alert>}
                {profileError && <Alert severity="error" sx={{ mb: 3 }}>{profileError}</Alert>}
                
                <Box component="form" onSubmit={handleProfileSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 2 }}>
                        <Avatar src={avatarPreview || undefined} sx={{ width: 80, height: 80 }}>
                            {user?.email?.[0]?.toUpperCase() || 'U'}
                        </Avatar>
                        <Button variant="outlined" component="label">
                            Upload Photo
                            <input type="file" hidden accept="image/jpeg, image/png, image/webp" onChange={handleAvatarChange} />
                        </Button>
                    </Box>

                    <TextField 
                        label="Username" 
                        value={username} 
                        onChange={e => setUsername(e.target.value)} 
                        fullWidth 
                        helperText="Will be used for public links (@username)"
                    />
                    <TextField 
                        label="Full Name" 
                        value={fullName} 
                        onChange={e => setFullName(e.target.value)} 
                        fullWidth 
                    />
                    <TextField 
                        label="Email Address" 
                        type="email" 
                        value={email} 
                        onChange={e => setEmail(e.target.value)} 
                        fullWidth 
                        required 
                    />
                    
                    <FormControlLabel
                        control={<Switch checked={isPublic} onChange={(e) => setIsPublic(e.target.checked)} color="primary" />}
                        label="Make profile public to the community"
                    />

                    <FormControlLabel
                        control={<Switch checked={is2FA} onChange={(e) => setIs2FA(e.target.checked)} color="primary" />}
                        label="Enable Two-Factor Authentication (2FA)"
                    />

                    <TextField label="Bio" value={bio} onChange={e => setBio(e.target.value)} fullWidth multiline rows={3} helperText="Tell the community about yourself" />
                    <TextField label="Website" value={website} onChange={e => setWebsite(e.target.value)} fullWidth placeholder="https://yoursite.com" />
                    <TextField label="GitHub URL" value={githubUrl} onChange={e => setGithubUrl(e.target.value)} fullWidth placeholder="https://github.com/username" />
                    <TextField label="Kaggle URL" value={kaggleUrl} onChange={e => setKaggleUrl(e.target.value)} fullWidth placeholder="https://kaggle.com/username" />

                    <Button type="submit" variant="contained" sx={{ alignSelf: 'flex-start', mt: 1 }}>Save Changes</Button>
                </Box>
            </Paper>

            <Paper sx={{ p: 4, background: '#0A0A0A', border: '1px solid #222', borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={3}>Change Password</Typography>
                {passwordSuccess && <Alert severity="success" sx={{ mb: 3 }}>{passwordSuccess}</Alert>}
                {passwordError && <Alert severity="error" sx={{ mb: 3 }}>{passwordError}</Alert>}

                <Box component="form" onSubmit={handlePasswordSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <TextField 
                        label="Current Password" 
                        type="password" 
                        value={currentPassword} 
                        onChange={e => setCurrentPassword(e.target.value)} 
                        fullWidth 
                        required 
                    />
                    <TextField 
                        label="New Password" 
                        type="password" 
                        value={newPassword} 
                        onChange={e => setNewPassword(e.target.value)} 
                        fullWidth 
                        required 
                    />
                    <Button type="submit" variant="contained" color="secondary" sx={{ alignSelf: 'flex-start' }}>Update Password</Button>
                </Box>
            </Paper>

            <Paper sx={{ p: 4, background: '#1a0505', border: '1px solid #ff4444', borderRadius: 3 }}>
                <Typography variant="h6" fontWeight={600} mb={1} color="error">Danger Zone</Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    Permanently delete your account and all associated datasets, models, and deployments.
                </Typography>
                <Button variant="contained" color="error" onClick={handleDeleteAccount}>
                    Delete Account
                </Button>
            </Paper>
        </Box>
    )
}
