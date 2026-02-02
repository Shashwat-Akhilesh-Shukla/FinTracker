// src/types/profile.ts
export interface ProfileUpdateData {
    firstName?: string;
    lastName?: string;
    email?: string;
}

export interface ProfileState {
    isUpdating: boolean;
    error: string | null;
    success: boolean;
}
