'use client';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { ref, get, onValue } from "firebase/database";
import { database, auth } from '../firebase/firebase';

import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import Nav from '../components/navbar/Nav';
import CalendarViews from '../components/calendar/CalendarViews';
import RecipesList from '../components/Recipes/RecipeList';
import UserManagement from '../components/auth/UserManagement';
import GeneralAnnouncement from '../components/annoucements/GeneralAnnouncement';
import CampSpecificAnnouncement from '../components/annoucements/CampSpecificAnnouncement';
import PollsPage from '../components/polls/PollsPage';
import MyAccount from '../components/MyAccount/MyAccount';
import Birthdays from '../components/Birthdays/Birthdays';
import WeatherPage from '../components/weather/WeatherPage';
import CampManagement from '../components/management/CampManagement';
import CrewManagement from '../components/management/CrewManagement';
import MessagesPage from '../components/messages/MessagesPage';
import { Paper, Text } from '@mantine/core';

export default function HomePage() {
  const [user, setUser] = useState(undefined); // Start as undefined to track auth state
  const [userData, setUserData] = useState(null);
  const [campID, setCampID] = useState(null);
  const [effectiveRole, setEffectiveRole] = useState(0);

  // Notification state
  const [unreadCount, setUnreadCount] = useState(0);
  const [badgeColor, setBadgeColor] = useState('blue');

  const [isGeneralAnnouncementVisible, setIsGeneralAnnouncementVisible] = useState(false);
  const [isCampSpecificAnnouncementVisible, setIsCampSpecificAnnouncementVisible] = useState(false);

  // Component visibility state
  const [visibleComponent, setVisibleComponent] = useState(null);

  // Effect to handle campID based on user authentication state
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
          const uData = snapshot.val();
          setUserData(uData);
          // Read user-specific cookie
          const storedCampID = Cookies.get(`campID_${currentUser.uid}`);
          if (storedCampID && uData.assignedCamps?.[storedCampID]) {
            setCampID(storedCampID);
          } else {
            setCampID(null);
            Cookies.remove(`campID_${currentUser.uid}`); // Clean up if invalid
          }
        } else {
          setUserData(null);
          setCampID(null);
        }
      } else {
        setUserData(null);
        setCampID(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Effect to calculate the user's effective role
  useEffect(() => {
    const calculateEffectiveRole = async () => {
      if (!user || !userData) {
        setEffectiveRole(0);
        return;
      }

      const globalRole = userData.role || 0;

      if (!campID) {
        setEffectiveRole(globalRole);
        return;
      }

      const campUserRoleRef = ref(database, `camps/${campID}/users/${user.uid}/role`);
      try {
        const snapshot = await get(campUserRoleRef);
        if (snapshot.exists()) {
          const campSpecificRole = snapshot.val() || 0;
          setEffectiveRole(Math.max(globalRole, campSpecificRole));
        } else {
          setEffectiveRole(globalRole);
        }
      } catch (error) {
        console.error("Error fetching camp-specific role:", error);
        setEffectiveRole(globalRole); // Default to global role on error
      }
    };

    calculateEffectiveRole();
  }, [user, userData, campID]);

  // Effect to listen for unread messages and update notification badge
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const userInboxRef = ref(database, `user-inboxes/${user.uid}`);
    const unsubscribe = onValue(userInboxRef, (snapshot) => {
      if (!snapshot.exists()) {
        setUnreadCount(0);
        return;
      }

      const inboxData = snapshot.val();
      const unreadMessages = Object.values(inboxData).filter(msg => !msg.isRead);
      setUnreadCount(unreadMessages.length);

      const priorityOrder = { Formal: 1, Operational: 2, Social: 3, System: 4 };
      const colorMap = { Formal: 'red', Operational: 'yellow', Social: 'green', System: 'blue' };

      let highestPriority = 5;
      let highestPriorityType = 'System';

      for (const msg of unreadMessages) {
        if (!msg.isRead) {
          if (!highestPriorityType || priorityOrder[msg.messageType] < priorityOrder[highestPriorityType]) {
            highestPriority = priorityOrder[msg.messageType];
            highestPriorityType = msg.messageType;
          }
        }
      }

      setBadgeColor(colorMap[highestPriorityType] || 'blue');
    });

    return () => unsubscribe();
  }, [user]);

  const handleComponentChange = (component) => {
    setVisibleComponent(component);
  };

  return (
    <>
      <Nav
        user={user}
        setUser={setUser}
        userData={userData}
        setUserData={setUserData}
        campID={campID}
        setCampID={setCampID}
        handleComponentChange={handleComponentChange}
        effectiveRole={effectiveRole}
        unreadCount={unreadCount}
        badgeColor={badgeColor}
        visibleComponent={visibleComponent}
      />

      <main>
        {/* Main content is now conditionally rendered based on user state */}
        {user && visibleComponent && (
          <>
            <GeneralAnnouncement
              isVisible={isGeneralAnnouncementVisible}
              onClose={() => setIsGeneralAnnouncementVisible(false)}
            />
            <CampSpecificAnnouncement
              isVisible={isCampSpecificAnnouncementVisible}
              onClose={() => setIsCampSpecificAnnouncementVisible(false)}
              user={user}
              campID={campID}
            />

            {visibleComponent === 'messages' && <MessagesPage user={user} effectiveRole={effectiveRole} campID={campID} />}
            {visibleComponent === 'weather' && <WeatherPage />}
            {visibleComponent === 'polls' && campID && <PollsPage user={user} campID={campID} userData={userData} effectiveRole={effectiveRole} />}
            {visibleComponent === 'campManagement' && campID && <CampManagement campID={campID} effectiveRole={effectiveRole} />}
            {visibleComponent === 'crewManagement' && campID && <CrewManagement campID={campID} effectiveRole={effectiveRole} />}
            {visibleComponent === 'calendar' && campID && <CalendarViews user={user} campID={campID} />}
            {visibleComponent === 'recipes' && campID && <RecipesList user={user} campID={campID} />}
            {visibleComponent === 'myAccount' && <MyAccount user={user} setUserData={setUserData} />}
            {visibleComponent === 'birthdays' && <Birthdays />}
            {visibleComponent === 'userManagement' && userData && effectiveRole >= 5 && <UserManagement currentUser={user} campID={campID} effectiveRole={effectiveRole} />}

            {!campID && !['myAccount', 'weather', 'messages', 'userManagement'].includes(visibleComponent) && (
              <Paper shadow="xs" p="xl" radius="md" withBorder style={{ textAlign: 'center', marginTop: '20px' }}>
                <Text size="lg" fw={500}>Welcome, {userData?.name || 'User'}!</Text>
                <Text c="dimmed" mt="sm">Please select a camp from the menu to view its tools and information.</Text>
              </Paper>
            )}
          </>
        )}
        {user === null && (
          <div style={{ minHeight: '80vh' }} />
        )}
      </main>

      <div style={{ display: 'none' }}>
        <ColorSchemeToggle />
      </div>
    </>
  );
}