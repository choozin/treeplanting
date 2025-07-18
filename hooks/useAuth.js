'use client';

import { useContext } from 'react';
import { AuthContext } from '../context/AuthProvider';

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === null) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    console.log("useAuth context:", context);
    return context;
};