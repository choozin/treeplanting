'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo, FC, ReactNode } from 'react';
import Cookies from "js-cookie";
import { ref, get, onValue } from 'firebase/database';
import { database, auth } from '../firebase/firebase';
import { User, onAuthStateChanged } from 'firebase/auth';
import { ROLES } from '../lib/constants';

// --- TypeScript Interfaces ---

interface UserData {
  name: string;
  email: string;
  role: number;
  assignedCamps?: Record<string, { campName: string; role: number }>;
  profile?: any;
}

interface AuthContextType {
  user: User | null | undefined; // undefined for initial loading state
  userData: UserData | null;
  campID: string | null;
  setCampID: (campID: string | null) => void;
  effectiveRole: number;
  loading: boolean;
}

// --- Context Definition ---
export const AuthContext = createContext<AuthContextType | null>(null);

// --- Provider Component ---
const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null | undefined>(undefined);
    const [userData, setUserData] = useState<UserData | null>(null);
    const [campID, setCampIDState] = useState<string | null>(null);
    const [effectiveRole, setEffectiveRole] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const setCampID = useCallback((newCampID: string | null) => {
        if (user) {
            if (newCampID) {
                Cookies.set(`campID_${user.uid}`, newCampID, { expires: 30 });
            } else {
                Cookies.remove(`campID_${user.uid}`);
            }
        }
        setCampIDState(newCampID);
        // Dispatch an event to notify other parts of the app, like WeatherProvider
        window.dispatchEvent(new Event('campChange'));
    }, [user]);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setLoading(true);
            setUser(currentUser);
            if (currentUser) {
                const userRef = ref(database, `users/${currentUser.uid}`);
                try {
                    const snapshot = await get(userRef);
                    const uData = snapshot.exists() ? snapshot.val() : null;
                    setUserData(uData);

                    const storedCampID = Cookies.get(`campID_${currentUser.uid}`);
                    if (storedCampID && uData?.assignedCamps?.[storedCampID]) {
                        setCampIDState(storedCampID);
                    } else {
                        setCampIDState(null);
                        Cookies.remove(`campID_${currentUser.uid}`);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserData(null);
                    setCampIDState(null);
                }
            } else {
                setUserData(null);
                setCampIDState(null);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

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
        effectiveRole,
        loading,
    }), [user, userData, campID, setCampID, effectiveRole, loading]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthProvider;