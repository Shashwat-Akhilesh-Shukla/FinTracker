// src/components/layout/Sidebar.tsx
import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Toolbar,
    Box,
    Divider,
    styled,
    useTheme,
    useMediaQuery
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    AccountBalance as PortfolioIcon,
    Analytics as AnalyticsIcon,
    TrendingUp
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { ROUTES } from '../../constants/routes';

const drawerWidth = 260;

const StyledDrawer = styled(Drawer)(({ theme }) => ({
    width: drawerWidth,
    flexShrink: 0,
    '& .MuiDrawer-paper': {
        width: drawerWidth,
        boxSizing: 'border-box',
        background: theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)'
            : 'linear-gradient(180deg, #f8f9fa 0%, #e9ecef 100%)',
        borderRight: `1px solid ${theme.palette.divider}`,
    },
}));

const StyledListItemButton = styled(ListItemButton, {
    shouldForwardProp: (prop) => prop !== 'active',
})<{ active?: boolean }>(({ theme, active }) => ({
    margin: '4px 12px',
    borderRadius: '12px',
    padding: '12px 16px',
    transition: 'all 0.2s ease',
    backgroundColor: active
        ? theme.palette.mode === 'dark'
            ? 'rgba(102, 126, 234, 0.2)'
            : 'rgba(30, 60, 114, 0.1)'
        : 'transparent',
    borderLeft: active ? `4px solid ${theme.palette.primary.main}` : '4px solid transparent',
    '&:hover': {
        backgroundColor: theme.palette.mode === 'dark'
            ? 'rgba(102, 126, 234, 0.15)'
            : 'rgba(30, 60, 114, 0.08)',
        transform: 'translateX(4px)',
    },
}));

const BrandSection = styled(Box)(({ theme }) => ({
    padding: theme.spacing(2),
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1.5),
    marginBottom: theme.spacing(2),
}));

const BrandIcon = styled(Box)(({ theme }) => ({
    width: 40,
    height: 40,
    borderRadius: '10px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#fff',
    fontSize: '20px',
    fontWeight: 700,
    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
}));

interface SidebarProps {
    open: boolean;
    onClose: () => void;
}

const menuItems = [
    { text: 'Dashboard', icon: <DashboardIcon />, path: ROUTES.DASHBOARD },
    { text: 'Portfolio', icon: <PortfolioIcon />, path: ROUTES.PORTFOLIO },
    { text: 'Analytics', icon: <AnalyticsIcon />, path: ROUTES.ANALYTICS },
    { text: 'Rebalancing', icon: <TrendingUp />, path: ROUTES.REBALANCE },
];

const Sidebar: React.FC<SidebarProps> = ({ open, onClose }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));

    const handleNavigation = (path: string) => {
        navigate(path);
        if (isMobile) {
            onClose();
        }
    };

    const drawerContent = (
        <>
            <Toolbar />
            <Box sx={{ overflow: 'auto', pt: 2 }}>
                <BrandSection>
                    <BrandIcon>
                        <TrendingUp />
                    </BrandIcon>
                    <Box>
                        <Box sx={{ fontWeight: 700, fontSize: '0.875rem', color: 'text.primary' }}>
                            Portfolio Tracker
                        </Box>
                        <Box sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                            Professional Edition
                        </Box>
                    </Box>
                </BrandSection>

                <Divider sx={{ mb: 2 }} />

                <List>
                    {menuItems.map((item) => (
                        <ListItem key={item.text} disablePadding>
                            <StyledListItemButton
                                active={location.pathname === item.path}
                                onClick={() => handleNavigation(item.path)}
                            >
                                <ListItemIcon
                                    sx={{
                                        color: location.pathname === item.path
                                            ? 'primary.main'
                                            : 'text.secondary',
                                        minWidth: 40,
                                    }}
                                >
                                    {item.icon}
                                </ListItemIcon>
                                <ListItemText
                                    primary={item.text}
                                    primaryTypographyProps={{
                                        fontWeight: location.pathname === item.path ? 600 : 400,
                                        fontSize: '0.95rem',
                                    }}
                                />
                            </StyledListItemButton>
                        </ListItem>
                    ))}
                </List>
            </Box>
        </>
    );

    return (
        <>
            {isMobile ? (
                <Drawer
                    variant="temporary"
                    open={open}
                    onClose={onClose}
                    ModalProps={{
                        keepMounted: true, // Better mobile performance
                    }}
                    sx={{
                        '& .MuiDrawer-paper': {
                            width: drawerWidth,
                            boxSizing: 'border-box',
                        },
                    }}
                >
                    {drawerContent}
                </Drawer>
            ) : (
                <StyledDrawer
                    variant="persistent"
                    open={open}
                >
                    {drawerContent}
                </StyledDrawer>
            )}
        </>
    );
};

export default Sidebar;
