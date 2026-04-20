// src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { Box, styled, useTheme, useMediaQuery } from '@mui/material';
import AppHeader from './AppHeader';
import Sidebar from './Sidebar';
import Chatbot from '../common/Chatbot';

const drawerWidth = 260;

const Main = styled('main', {
    shouldForwardProp: (prop) => prop !== 'open',
})<{ open?: boolean }>(({ theme, open }) => ({
    flexGrow: 1,
    padding: theme.spacing(3),
    transition: theme.transitions.create('margin', {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    ...(open && {
        transition: theme.transitions.create('margin', {
            easing: theme.transitions.easing.easeOut,
            duration: theme.transitions.duration.enteringScreen,
        }),
        marginLeft: `${drawerWidth}px`,
    }),
    [theme.breakpoints.down('md')]: {
        marginLeft: 0,
    },
}));

const DrawerHeader = styled('div')(({ theme }) => ({
    display: 'flex',
    alignItems: 'center',
    padding: theme.spacing(0, 1),
    ...theme.mixins.toolbar,
    justifyContent: 'flex-end',
}));

interface MainLayoutProps {
    children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [sidebarOpen, setSidebarOpen] = useState(!isMobile);

    const handleDrawerToggle = () => {
        setSidebarOpen(!sidebarOpen);
    };

    return (
        <Box sx={{ display: 'flex', minHeight: '100vh' }}>
            <AppHeader onMenuClick={handleDrawerToggle} />
            <Sidebar open={sidebarOpen} onClose={handleDrawerToggle} />
            <Main open={!isMobile && sidebarOpen}>
                <DrawerHeader />
                <Box
                    sx={{
                        maxWidth: '1600px',
                        margin: '0 auto',
                        width: '100%',
                    }}
                >
                    {children}
                </Box>
            </Main>
            <Chatbot />
        </Box>
    );
};

export default MainLayout;
