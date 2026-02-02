// src/components/common/ProfileEditDialog.tsx
import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Alert,
    CircularProgress,
    styled,
    IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { RootState, AppDispatch } from '../../store/store';
import { updateProfileAsync } from '../../store/slices/profileSlice';

const StyledDialog = styled(Dialog)(({ theme }) => ({
    '& .MuiDialog-paper': {
        borderRadius: 16,
        minWidth: 500,
        [theme.breakpoints.down('sm')]: {
            minWidth: '90%',
            margin: theme.spacing(2),
        },
    },
}));

const StyledDialogTitle = styled(DialogTitle)(({ theme }) => ({
    background: theme.palette.mode === 'dark'
        ? 'linear-gradient(135deg, #1a237e 0%, #283593 100%)'
        : 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    color: '#fff',
    padding: theme.spacing(2, 3),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
}));

const validationSchema = Yup.object({
    firstName: Yup.string()
        .min(2, 'First name must be at least 2 characters')
        .max(50, 'First name must be less than 50 characters')
        .required('First name is required'),
    lastName: Yup.string()
        .min(2, 'Last name must be at least 2 characters')
        .max(50, 'Last name must be less than 50 characters')
        .required('Last name is required'),
    email: Yup.string()
        .email('Invalid email address')
        .required('Email is required'),
});

interface ProfileEditDialogProps {
    open: boolean;
    onClose: () => void;
}

const ProfileEditDialog: React.FC<ProfileEditDialogProps> = ({ open, onClose }) => {
    const dispatch = useDispatch<AppDispatch>();
    const { user } = useSelector((state: RootState) => state.auth);
    const { isUpdating, error, success } = useSelector((state: RootState) => state.profile);
    const [localError, setLocalError] = useState<string | null>(null);

    const formik = useFormik({
        initialValues: {
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            email: user?.email || '',
        },
        validationSchema,
        onSubmit: async (values) => {
            setLocalError(null);
            try {
                await dispatch(updateProfileAsync(values)).unwrap();
                setTimeout(() => {
                    onClose();
                }, 1500);
            } catch (err: any) {
                setLocalError(err.message || 'Failed to update profile');
            }
        },
    });

    useEffect(() => {
        if (open && user) {
            formik.setFieldValue('firstName', user.firstName || '');
            formik.setFieldValue('lastName', user.lastName || '');
            formik.setFieldValue('email', user.email || '');
            setLocalError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, user]);

    const handleClose = () => {
        if (!isUpdating) {
            formik.resetForm();
            setLocalError(null);
            onClose();
        }
    };

    return (
        <StyledDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
            <StyledDialogTitle>
                Edit Profile
                <IconButton
                    aria-label="close"
                    onClick={handleClose}
                    disabled={isUpdating}
                    sx={{
                        color: '#fff',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        },
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </StyledDialogTitle>

            <form onSubmit={formik.handleSubmit}>
                <DialogContent sx={{ pt: 3 }}>
                    {success && (
                        <Alert severity="success" sx={{ mb: 2 }}>
                            Profile updated successfully!
                        </Alert>
                    )}

                    {(error || localError) && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {error || localError}
                        </Alert>
                    )}

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
                        <TextField
                            fullWidth
                            id="firstName"
                            name="firstName"
                            label="First Name"
                            value={formik.values.firstName}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.firstName && Boolean(formik.errors.firstName)}
                            helperText={formik.touched.firstName && formik.errors.firstName}
                            disabled={isUpdating}
                            variant="outlined"
                        />

                        <TextField
                            fullWidth
                            id="lastName"
                            name="lastName"
                            label="Last Name"
                            value={formik.values.lastName}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.lastName && Boolean(formik.errors.lastName)}
                            helperText={formik.touched.lastName && formik.errors.lastName}
                            disabled={isUpdating}
                            variant="outlined"
                        />

                        <TextField
                            fullWidth
                            id="email"
                            name="email"
                            label="Email"
                            type="email"
                            value={formik.values.email}
                            onChange={formik.handleChange}
                            onBlur={formik.handleBlur}
                            error={formik.touched.email && Boolean(formik.errors.email)}
                            helperText={formik.touched.email && formik.errors.email}
                            disabled={isUpdating}
                            variant="outlined"
                        />
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 3, pt: 2 }}>
                    <Button
                        onClick={handleClose}
                        disabled={isUpdating}
                        variant="outlined"
                        sx={{ borderRadius: 2 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isUpdating || !formik.isValid}
                        sx={{
                            borderRadius: 2,
                            minWidth: 120,
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        }}
                    >
                        {isUpdating ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
                    </Button>
                </DialogActions>
            </form>
        </StyledDialog>
    );
};

export default ProfileEditDialog;
