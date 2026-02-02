// src/components/common/UserProfileMenu.tsx
import React, { useState } from 'react';
import {
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Avatar,
    Box,
    Typography,
    styled
} from '@mui/material';
import {
    Person as PersonIcon,
    Settings as SettingsIcon,
    Logout as LogoutIcon,
    Edit as EditIcon
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logoutAsync } from '../../store/slices/authSlice';
import { RootState, AppDispatch } from '../../store/store';
import { ROUTES } from '../../constants/routes';
import ProfileEditDialog from './ProfileEditDialog';

const StyledMenu = styled(Menu)(({ theme }) => ({
    '& .MuiPaper-root': {
        marginTop: theme.spacing(1),
        minWidth: 240,
        borderRadius: 12,
        boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        border: `1px solid ${theme.palette.divider}`,
    },
}));

const UserInfoSection = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    borderBottom: `1px solid ${theme.palette.divider}`,
}));

const StyledMenuItem = styled(MenuItem)(({ theme }) => ({
    padding: theme.spacing(1.5, 2),
    borderRadius: 8,
    margin: theme.spacing(0.5, 1),
    transition: 'all 0.2s ease',
    '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(102, 126, 234, 0.15)'
            : 'rgba(30, 60, 114, 0.08)',
    },
}));

interface UserProfileMenuProps {
    anchorEl: null | HTMLElement;
    open: boolean;
    onClose: () => void;
}

const UserProfileMenu: React.FC<UserProfileMenuProps> = ({ anchorEl, open, onClose }) => {
    const dispatch = useDispatch<AppDispatch>();
    const navigate = useNavigate();
    const { user } = useSelector((state: RootState) => state.auth);
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const handleLogout = async () => {
        await dispatch(logoutAsync());
        onClose();
        navigate(ROUTES.LOGIN);
    };

    const handleEditProfile = () => {
        setEditDialogOpen(true);
        onClose();
    };

    const handleCloseEditDialog = () => {
        setEditDialogOpen(false);
    };

    const getInitials = () => {
        if (!user) return 'U';
        return `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`.toUpperCase();
    };

    return (
        <>
            <StyledMenu
                anchorEl={anchorEl}
                open={open}
                onClose={onClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
            >
                <UserInfoSection>
                    <Avatar
                        sx={{
                            width: 48,
                            height: 48,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            fontWeight: 600,
                        }}
                    >
                        {getInitials()}
                    </Avatar>
                    <Box>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {user?.firstName} {user?.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.875rem' }}>
                            {user?.email}
                        </Typography>
                    </Box>
                </UserInfoSection>

                <Box sx={{ py: 1 }}>
                    <StyledMenuItem onClick={handleEditProfile}>
                        <ListItemIcon>
                            <EditIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Edit Profile</ListItemText>
                    </StyledMenuItem>

                    <StyledMenuItem onClick={onClose}>
                        <ListItemIcon>
                            <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Settings</ListItemText>
                    </StyledMenuItem>

                    <Divider sx={{ my: 1 }} />

                    <StyledMenuItem onClick={handleLogout}>
                        <ListItemIcon>
                            <LogoutIcon fontSize="small" color="error" />
                        </ListItemIcon>
                        <ListItemText>
                            <Typography color="error">Logout</Typography>
                        </ListItemText>
                    </StyledMenuItem>
                </Box>
            </StyledMenu>

            <ProfileEditDialog open={editDialogOpen} onClose={handleCloseEditDialog} />
        </>
    );
};

export default UserProfileMenu;
