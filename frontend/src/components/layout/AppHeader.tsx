// src/components/layout/AppHeader.tsx
import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  styled,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle
} from '@mui/icons-material';
import DarkModeToggle from '../common/DarkModeToggle';
import UserProfileMenu from '../common/UserProfileMenu';

const StyledAppBar = styled(AppBar)(({ theme }) => ({
  background: theme.palette.mode === 'dark'
    ? 'linear-gradient(135deg, #1a237e 0%, #283593 50%, #3949ab 100%)'
    : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3a7bd5 100%)',
  boxShadow: '0 4px 20px 0 rgba(0,0,0,0.15)',
  backdropFilter: 'blur(10px)',
  borderBottom: `1px solid ${theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)'}`,
}));

const Logo = styled(Box)(({ theme }) => ({
  display: 'flex',
  alignItems: 'center',
  gap: theme.spacing(1.5),
  cursor: 'pointer',
  transition: 'transform 0.2s ease',
  '&:hover': {
    transform: 'scale(1.02)',
  },
}));

const LogoIcon = styled(Box)(({ theme }) => ({
  width: 36,
  height: 36,
  borderRadius: '8px',
  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontWeight: 700,
  fontSize: '18px',
  color: '#fff',
  boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
}));

interface AppHeaderProps {
  onMenuClick: () => void;
}

const AppHeader: React.FC<AppHeaderProps> = ({ onMenuClick }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setAnchorEl(null);
  };

  return (
    <StyledAppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
      <Toolbar sx={{ px: { xs: 2, sm: 3 } }}>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onMenuClick}
          sx={{ mr: 2 }}
        >
          <MenuIcon />
        </IconButton>

        <Logo>
          <LogoIcon>FT</LogoIcon>
          {!isMobile && (
            <Typography
              variant="h6"
              noWrap
              component="div"
              sx={{
                fontWeight: 700,
                fontSize: '1.25rem',
                letterSpacing: '-0.5px',
                background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              FinTracker Pro
            </Typography>
          )}
        </Logo>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DarkModeToggle />
          
          <IconButton
            color="inherit"
            aria-label="notifications"
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <NotificationsIcon />
          </IconButton>

          <IconButton
            color="inherit"
            aria-label="account"
            onClick={handleProfileClick}
            sx={{
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
              },
            }}
          >
            <AccountCircle sx={{ fontSize: 32 }} />
          </IconButton>

          <UserProfileMenu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleProfileClose}
          />
        </Box>
      </Toolbar>
    </StyledAppBar>
  );
};

export default AppHeader;
