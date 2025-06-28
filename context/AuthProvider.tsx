'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo, FC, ReactNode } from 'react';
import Cookies from "js-cookie";
import { ref, get, onValue } from 'firebase/database';
import { database, auth } from '../firebase/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ROLES } from '../lib/constants';

interface UserData {
  name: string;
  email: string;
  role: number;
  assignedCamps?: Record<string, { campName: string; role: number }>;
  profile?: any;
  dashboardPreferences?: {
      layout: string[];
  };
}

interface ComposeModalState {
    recipientId?: string;
    recipientName?: string;
    subject?: string;
    isClassifiedsMessage?: boolean;
}

interface AuthContextType {
  user: User | null | undefined;
  userData: UserData | null;
  campID: string | null;
  setCampID: (campID: string | null) => void;
  refreshUserData: () => void; // Added this function
  effectiveRole: number;
  loading: boolean;
  isComposeModalOpen: boolean;
  openComposeModal: (initialState?: ComposeModalState) => void;
  closeComposeModal: () => void;
  composeInitialState: ComposeModalState | null;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [campID, setCampIDState] = useState<string | null>(null);
    const [effectiveRole, setEffectiveRole] = useState<number>(0);
    const [loading, setLoading] = useState(true);
    
    const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
    const [composeInitialState, setComposeInitialState] = useState<ComposeModalState | null>(null);

    const fetchCurrentUserData = useCallback(async (currentUser: User | null) => {
        if (currentUser) {
            const userRef = ref(database, `users/${currentUser.uid}`);
            try {
                const snapshot = await get(userRef);
                const uData = snapshot.exists() ? snapshot.val() : null;
                setUserData(uData);
                return uData;
            } catch (error) {
                console.error("Error fetching user data:", error);
                setUserData(null);
                return null;
            }
        } else {
            setUserData(null);
            return null;
        }
    }, []);

    const refreshUserData = useCallback(() => {
        if (user) {
            fetchCurrentUserData(user);
        }
    }, [user, fetchCurrentUserData]);

    const setCampID = useCallback((newCampID: string | null) => {
        if (user) {
            if (newCampID) {
                Cookies.set(`campID_${user.uid}`, newCampID, { expires: 30 });
            } else {
                Cookies.remove(`campID_${user.uid}`);
            }
        }
        setCampIDState(newCampID);
        window.dispatchEvent(new Event('campChange'));
    }, [user]);
    
    const openComposeModal = useCallback((initialState: ComposeModalState = {}) => {
        setComposeInitialState(initialState);
        setIsComposeModalOpen(true);
    }, []);

    const closeComposeModal = useCallback(() => {
        setIsComposeModalOpen(false);
        setComposeInitialState(null);
    }, []);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            setUser(currentUser);
            const uData = await fetchCurrentUserData(currentUser);
            if (currentUser && uData) {
                const storedCampID = Cookies.get(`campID_${currentUser.uid}`);
                if (storedCampID && uData.assignedCamps?.[storedCampID]) {
                    setCampIDState(storedCampID);
                } else {
                    setCampIDState(null);
                    Cookies.remove(`campID_${currentUser.uid}`);
                }
            } else {
                setUserData(null);
                setCampIDState(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [fetchCurrentUserData]);

    useEffect(() => {
        if (!user || !userData) {
            setEffectiveRole(0);
            return;
        }
        const globalRole = userData.role || 0;
        if (!campID) {
            setEffectiveRole(globalRole);
            return;
        }
        const campSpecificRole = userData.assignedCamps?.[campID]?.role || 0;
        setEffectiveRole(Math.max(globalRole, campSpecificRole));
    }, [user, userData, campID]);

    const value = useMemo(() => ({
        user,
        userData,
        campID,
        setCampID,
        refreshUserData,
        effectiveRole,
        loading,
        isComposeModalOpen,
        openComposeModal,
        closeComposeModal,
        composeInitialState,
    }), [user, userData, campID, setCampID, refreshUserData, effectiveRole, loading, isComposeModalOpen, openComposeModal, closeComposeModal, composeInitialState]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;