'use client';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie';
import { ref, get } from "firebase/database";
import { database } from '../firebase/firebase';

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
import WeatherPage from '../components/weather/WeatherPage'; // Import the new component
import { Paper, Text } from '@mantine/core';

export default function HomePage() {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [campID, setCampID] = useState(null);
  const [effectiveRole, setEffectiveRole] = useState(0);

  const [navIsOpen, setNavIsOpen] = useState(false);
  const [isGeneralAnnouncementVisible, setIsGeneralAnnouncementVisible] = useState(true);
  const [isCampSpecificAnnouncementVisible, setIsCampSpecificAnnouncementVisible] = useState(true);

  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const [isRecipesListVisible, setIsRecipesListVisible] = useState(false);
  const [isUserManagementVisible, setIsUserManagementVisible] = useState(false);
  const [isPollsVisible, setIsPollsVisible] = useState(false);
  const [isMyAccountVisible, setIsMyAccountVisible] = useState(false);
  const [isBirthdaysVisible, setIsBirthdaysVisible] = useState(false);
  const [isWeatherVisible, setIsWeatherVisible] = useState(false); // New state for weather page

  // Effect to handle campID based on user authentication state
  useEffect(() => {
    if (user && userData?.assignedCamps) {
      const storedCampID = Cookies.get("campID");
      // Only set campID from cookie if it's a valid camp for the current user
      if (storedCampID && userData.assignedCamps[storedCampID]) {
        setCampID(storedCampID);
      } else {
        // If the cookie holds an invalid camp, or no camp, clear it.
        setCampID(null);
        Cookies.remove("campID");
      }
    } else if (!user) {
      // If there is no user, ensure campID state and cookie are cleared.
      setCampID(null);
      Cookies.remove("campID");
    }
  }, [user, userData]);

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

  const handleComponentChange = (visibleComponent) => {
    setNavIsOpen(false);

    // Hide all functional components first
    setIsCalendarVisible(false);
    setIsRecipesListVisible(false);
    setIsUserManagementVisible(false);
    setIsMyAccountVisible(false);
    setIsBirthdaysVisible(false);
    setIsPollsVisible(false);
    setIsWeatherVisible(false); // Hide weather page

    // Show the selected component
    switch (visibleComponent) {
      case 'calendar':
        setIsCalendarVisible(true);
        break;
      case 'recipes':
        setIsRecipesListVisible(true);
        break;
      case 'userManagement':
        setIsUserManagementVisible(true);
        break;
      case 'polls':
        setIsPollsVisible(true);
        break;
      case 'myAccount':
        setIsMyAccountVisible(true);
        break;
      case 'birthdays':
        setIsBirthdaysVisible(true);
        break;
      case 'weather': // Show weather page
        setIsWeatherVisible(true);
        break;
      default:
        setIsCalendarVisible(true);
        break;
    }
  };

  const mainContentStyle = {
    padding: '16px',
    marginTop: user ? '20px' : '70px',
  };

  const colorSchemeToggleContainerStyle = {
    padding: '24px',
    textAlign: 'center',
    marginTop: '24px',
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
        navIsOpen={navIsOpen}
        setNavIsOpen={setNavIsOpen}
        handleComponentChange={handleComponentChange}
        effectiveRole={effectiveRole}
      />

      <main style={mainContentStyle}>
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

        {isWeatherVisible && <WeatherPage />}

        {isPollsVisible && user && campID && (
          <PollsPage user={user} campID={campID} userData={userData} effectiveRole={effectiveRole} />
        )}

        {isCalendarVisible && user && campID && (
          <CalendarViews
            user={user}
            campID={campID}
          />
        )}
        {isRecipesListVisible && user && campID && (
          <RecipesList
            user={user}
            campID={campID}
            setIsRecipesListVisible={setIsRecipesListVisible}
          />
        )}

        {isMyAccountVisible && <MyAccount user={user} setUserData={setUserData} />}

        {isBirthdaysVisible && <Birthdays />}

        {isUserManagementVisible && user && userData && effectiveRole >= 5 && (
          <UserManagement
            currentUser={user}
            campID={campID}
            effectiveRole={effectiveRole}
          />
        )}

        {user && !campID && !isMyAccountVisible && !isWeatherVisible && (
          <Paper shadow="xs" p="xl" radius="md" withBorder style={{ textAlign: 'center', marginTop: '20px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="lg" fw={500}>Welcome, {userData?.name || 'User'}!</Text>
            <Text c="dimmed" mt="sm">Please select a camp from the menu to view its tools and information.</Text>
          </Paper>
        )}

        {!user && !isMyAccountVisible && !isWeatherVisible && (
          <Paper shadow="xs" p="xl" radius="md" withBorder style={{ textAlign: 'center', marginTop: '20px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="lg" fw={500}>Please log in to access the application features.</Text>
            <Text c="dimmed" mt="sm">You can open the menu to log in or register.</Text>
          </Paper>
        )}

      </main>
      <div style={{ colorSchemeToggleContainerStyle, display: 'none' }}>
        <ColorSchemeToggle />
      </div>
    </>
  );
}