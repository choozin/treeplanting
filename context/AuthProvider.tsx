'use client';

import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';
import { get, onValue, ref, update } from 'firebase/database';
import Cookies from 'js-cookie';
import { auth, database } from '../firebase/firebase';
import { ROLES } from '../lib/constants';

interface UserData {
  name: string;
  email: string;
  role: number;
  assignedCamps?: Record<string, { campName: string; role: number; crewId?: string | string[] }>;
  profile?: any;
  dashboardPreferences?: {
    layout: string[];
  };
  notificationPreferences?: {
    classifieds: {
      enabled: boolean;
      types: string[];
      categories: string[];
      scope: string;
      keyword: string;
    };
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
  refreshUserData: () => void;
  effectiveRole: number;
  loading: boolean;
  isComposeModalOpen: boolean;
  openComposeModal: (initialState?: ComposeModalState) => void;
  closeComposeModal: () => void;
  composeInitialState: ComposeModalState | null;
  isFeedbackModalOpen: boolean;
  openFeedbackModal: () => void;
  closeFeedbackModal: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [campID, setCampIDState] = useState<string | null>(null);
  const [effectiveRole, setEffectiveRole] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [crews, setCrews] = useState<any[]>([]);

  const [isComposeModalOpen, setIsComposeModalOpen] = useState(false);
  const [composeInitialState, setComposeInitialState] = useState<ComposeModalState | null>(null);

  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);

  const fetchCurrentUserData = useCallback(async (currentUser: User | null) => {
    if (currentUser) {
      const userRef = ref(database, `users/${currentUser.uid}`);
      try {
        const snapshot = await get(userRef);
        const uData = snapshot.exists() ? snapshot.val() : null;
        setUserData(uData);
        return uData;
      } catch (error) {
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

  const setCampID = useCallback(
    (newCampID: string | null) => {
      if (user) {
        if (newCampID) {
          Cookies.set(`campID_${user.uid}`, newCampID, { expires: 30 });
        } else {
          Cookies.remove(`campID_${user.uid}`);
        }
      }
      setCampIDState(newCampID);
      window.dispatchEvent(new Event('campChange'));
      // Update lastActiveCampID in the database
      update(ref(database, `users/${user.uid}`), { lastActiveCampID: newCampID });
      refreshUserData(); // Refresh user data after setting camp ID
    },
    [user]
  );

  const openComposeModal = useCallback((initialState: ComposeModalState = {}) => {
    setComposeInitialState(initialState);
    setIsComposeModalOpen(true);
  }, []);

  const closeComposeModal = useCallback(() => {
    setIsComposeModalOpen(false);
    setComposeInitialState(null);
  }, []);

  const openFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(true);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    setIsFeedbackModalOpen(false);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setUser(currentUser);
      if (currentUser) {
        const uData = await fetchCurrentUserData(currentUser);
        if (uData) {
          // If a user exists but doesn't have a profile, create a default one.
          if (!uData.profile) {
            uData.profile = {
              name: uData.name || currentUser.displayName || currentUser.email,
              nickname: uData.name || currentUser.displayName || currentUser.email,
            };
          }
          const storedCampID = Cookies.get(`campID_${currentUser.uid}`);
          let initialCampID = null;

          if (storedCampID && uData.assignedCamps?.[storedCampID]) {
            initialCampID = storedCampID;
          } else if (uData.lastActiveCampID && uData.assignedCamps?.[uData.lastActiveCampID]) {
            initialCampID = uData.lastActiveCampID;
          }

          if (initialCampID) {
            // Verify if the user is actually listed under this camp's users node
            const campUserRef = ref(database, `camps/${initialCampID}/users/${currentUser.uid}`);
            const campUserSnapshot = await get(campUserRef);

            if (campUserSnapshot.exists()) {
              setCampIDState(initialCampID);
            } else {
              // User is not listed in the camp's user node, so don't set this camp as active
              setCampIDState(null);
              Cookies.remove(`campID_${currentUser.uid}`); // Also clear the cookie if it led to an invalid camp
            }
          } else {
            setCampIDState(null);
            Cookies.remove(`campID_${currentUser.uid}`);
          }
        } else {
          // This case might happen for a brand new user.
          // We can trigger a refresh after a short delay to get the new data.
          setTimeout(() => fetchCurrentUserData(currentUser), 1000);
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
    let unsubscribeCrews: (() => void) | undefined;
    if (campID) {
      const crewsRef = ref(database, `camps/${campID}/crews`);
      unsubscribeCrews = onValue(crewsRef, (snapshot) => {
        const crewsVal = snapshot.val();
        const loadedCrews: any[] = crewsVal
          ? Object.keys(crewsVal).map((key) => ({ id: key, ...crewsVal[key] }))
          : [];
        setCrews(loadedCrews);
      });
    }
    return () => {
      if (unsubscribeCrews) unsubscribeCrews();
    };
  }, [campID]);

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

    let crewRole = 0;
    const userCrewId = userData.assignedCamps?.[campID]?.crewId;
    if (userCrewId && crews.length > 0) {
      const userCrew = crews.find((crew) => crew.id === userCrewId);
      if (userCrew && userCrew.role !== undefined) {
        crewRole = userCrew.role;
      }
    }

    setEffectiveRole(Math.max(globalRole, campSpecificRole, crewRole));
  }, [user, userData, campID, crews]);

  const value = useMemo(
    () => ({
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
      isFeedbackModalOpen,
      openFeedbackModal,
      closeFeedbackModal,
    }),
    [
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
      isFeedbackModalOpen,
      openFeedbackModal,
      closeFeedbackModal,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthProvider;
