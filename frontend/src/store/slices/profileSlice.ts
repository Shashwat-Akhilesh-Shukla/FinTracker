// src/store/slices/profileSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ProfileState, ProfileUpdateData } from '../../types/profile';
import { authService } from '../../services/authService';
import { setUser } from './authSlice';

const initialState: ProfileState = {
    isUpdating: false,
    error: null,
    success: false,
};

export const updateProfileAsync = createAsyncThunk(
    'profile/update',
    async (data: ProfileUpdateData, { dispatch, rejectWithValue }) => {
        try {
            const updatedUser = await authService.updateProfile(data);
            // Update the user in auth state
            dispatch(setUser(updatedUser));
            return updatedUser;
        } catch (error: any) {
            return rejectWithValue(error.message);
        }
    }
);

const profileSlice = createSlice({
    name: 'profile',
    initialState,
    reducers: {
        clearProfileState: (state) => {
            state.error = null;
            state.success = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(updateProfileAsync.pending, (state) => {
                state.isUpdating = true;
                state.error = null;
                state.success = false;
            })
            .addCase(updateProfileAsync.fulfilled, (state) => {
                state.isUpdating = false;
                state.error = null;
                state.success = true;
            })
            .addCase(updateProfileAsync.rejected, (state, action) => {
                state.isUpdating = false;
                state.error = action.payload as string;
                state.success = false;
            });
    },
});

export const { clearProfileState } = profileSlice.actions;
export { profileSlice };
