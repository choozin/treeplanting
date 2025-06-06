'use client';
import { useState, useEffect } from 'react';
import Cookies from 'js-cookie'; // Import Cookies

import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import Nav from '../components/navbar/Nav';
import CalendarViews from '../components/calendar/CalendarViews';
import RecipesList from '../components/Recipes/RecipeList';
import UserManagement from '../components/auth/UserManagement'; // Assuming this path is correct
import GeneralAnnouncement from '../components/annoucements/GeneralAnnouncement';
import CampSpecificAnnouncement from '../components/annoucements/CampSpecificAnnouncement';
import PollsPage from '../components/polls/PollsPage';
import MyAccount from '../components/MyAccount/MyAccount';
import Birthdays from '../components/Birthdays/Birthdays';

// Styling for the main content area can be done via a CSS module or inline
// For simplicity here, some basic inline styles are used for the main wrapper.

export default function HomePage() {
  const [user, setUser] = useState(null); // Firebase auth user object
  const [userData, setUserData] = useState(null); // User data from Firebase RTDB
  const [campID, setCampID] = useState(null); // Currently selected camp ID

  const [navIsOpen, setNavIsOpen] = useState(false);

  // State for the general announcement visibility
  const [isGeneralAnnouncementVisible, setIsGeneralAnnouncementVisible] = useState(true);
  const [isCampSpecificAnnouncementVisible, setIsCampSpecificAnnouncementVisible] = useState(true);

  // States for main functional component visibility
  const [isWelcomeVisible, setIsWelcomeVisible] = useState(false); // Defaulting to false as per new structure
  const [isCalendarVisible, setIsCalendarVisible] = useState(true); // Calendar is the default main view
  const [isRecipesListVisible, setIsRecipesListVisible] = useState(false);
  const [isUserManagementVisible, setIsUserManagementVisible] = useState(false);
  const [isPollsVisible, setIsPollsVisible] = useState(false);
  const [isMyAccountVisible, setIsMyAccountVisible] = useState(false); // New state for MyAccount
  const [isBirthdaysVisible, setIsBirthdaysVisible] = useState(false); // New state for Birthdays

  // Attempt to load campID from cookies on initial client-side load
  useEffect(() => {
    // This check ensures Cookies is only accessed on the client-side
    if (typeof window !== "undefined") {
      const storedCampID = Cookies.get("campID");
      if (storedCampID) {
        setCampID(storedCampID);
      }
    }
  }, []); // Empty dependency array ensures this runs once on mount

  // Function to handle switching between main functional components
  const handleComponentChange = (visibleComponent) => {
    setNavIsOpen(false); // Close nav when a component is selected

    // Hide all functional components first
    setIsWelcomeVisible(false); // Assuming Welcome is not a main view anymore
    setIsCalendarVisible(false);
    setIsRecipesListVisible(false);
    setIsUserManagementVisible(false);
    setIsMyAccountVisible(false); // Ensure all are false
    setIsBirthdaysVisible(false); // Ensure all are false
    setIsPollsVisible(false);

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
        setIsPollsVisible(true); break;
      case 'myAccount': // Add this case
        setIsMyAccountVisible(true);
        break;
      case 'birthdays': // Add this case
        setIsBirthdaysVisible(true);
        break;
      // Add cases for other components if needed
      // case 'welcome':
      //   setIsWelcomeVisible(true);
      //   break;
      default:
        // If no specific component matches, default to showing the calendar
        // This ensures there's always a primary view active.
        setIsCalendarVisible(true);
        break;
    }
  };

  // Inline style for the main content wrapper
  const mainContentStyle = {
    padding: 'var(--mantine-spacing-md, 16px)',
    // Add a top margin to prevent content from being hidden under a potentially fixed Nav button
    // Adjust this value based on your Nav button's height and position
    marginTop: user ? '20px' : '70px', // Less margin if user is logged in (Nav might be smaller)
    // More margin if login form is full screen
  };

  // Style for the ColorSchemeToggle container to center it
  const colorSchemeToggleContainerStyle = {
    padding: 'var(--mantine-spacing-xl, 24px)', // Use Mantine spacing
    textAlign: 'center',
    marginTop: 'var(--mantine-spacing-xl, 24px)',
  };


  return (
    <>
      <Nav
        user={user}
        setUser={setUser}
        userData={userData}
        setUserData={setUserData}
        campID={campID}
        setCampID={setCampID} // Pass setCampID to Nav
        navIsOpen={navIsOpen}
        setNavIsOpen={setNavIsOpen}
        handleComponentChange={handleComponentChange}
      // No need to pass individual visibility states like isCalendarVisible to Nav
      // as Nav's primary role here is navigation and auth display.
      />

      {/* Main content area where components are rendered */}
      <main style={mainContentStyle}>
        <GeneralAnnouncement
          isVisible={isGeneralAnnouncementVisible}
          onClose={() => setIsGeneralAnnouncementVisible(false)}
        />

        {/* CampSpecificAnnouncement will only render its content if user & campID match criteria */}
        <CampSpecificAnnouncement
          isVisible={isCampSpecificAnnouncementVisible}
          onClose={() => setIsCampSpecificAnnouncementVisible(false)}
          user={user}
          campID={campID}
        />

        {isPollsVisible && user && campID && (
          <PollsPage user={user} campID={campID} userData={userData} />
        )}

        {/* Conditionally render main functional components */}
        {isCalendarVisible && user && campID && ( // Show calendar only if user logged in and camp selected
          <CalendarViews
            user={user}
            campID={campID}
          // setIsCalendarVisible={setIsCalendarVisible} // Not needed if visibility is managed here
          // handleComponentChange={handleComponentChange} // Not needed if Nav handles changes
          />
        )}
        {isRecipesListVisible && user && campID && ( // Show recipes only if user logged in and camp selected
          <RecipesList
            user={user}
            campID={campID}
            setIsRecipesListVisible={setIsRecipesListVisible} // To allow closing from within
          // handleComponentChange={handleComponentChange} // Not needed if Nav handles changes
          />
        )}

        {isMyAccountVisible && <MyAccount user={user} setUserData={setUserData} />} {/* Render MyAccount */}

        {isBirthdaysVisible && <Birthdays />} {/* Render Birthdays */}

        {isUserManagementVisible && user && userData && userData.role >= 8 && ( // Example: Show UserManagement if role is high enough
          <UserManagement
            currentUser={user} // Prop name as expected by UserManagement
            campID={campID}
          // handleComponentChange={handleComponentChange} // Not needed if Nav handles changes
          />
        )}

        {/* Fallback content if no main component is active (e.g., user logged in but no camp selected) */}
        {user && !campID && !isCalendarVisible && !isRecipesListVisible && !isUserManagementVisible && (
          <Paper shadow="xs" p="xl" radius="md" withBorder style={{ textAlign: 'center', marginTop: '20px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="lg" fw={500}>Welcome, {userData?.name || 'User'}!</Text>
            <Text c="dimmed" mt="sm">Please select a camp from the menu to view its tools and information.</Text>
          </Paper>
        )}

        {/* If user is not logged in, and no specific component is set to be visible by default for non-logged-in users */}
        {!user && !isCalendarVisible && !isRecipesListVisible && !isUserManagementVisible && !isWelcomeVisible && (
          <Paper shadow="xs" p="xl" radius="md" withBorder style={{ textAlign: 'center', marginTop: '20px', backgroundColor: 'var(--mantine-color-gray-0)' }}>
            <Text size="lg" fw={500}>Please log in to access the application features.</Text>
            <Text c="dimmed" mt="sm">You can open the menu to log in or register.</Text>
          </Paper>
        )}

      </main>
      <div style={colorSchemeToggleContainerStyle}>
        <ColorSchemeToggle />
      </div>
    </>
  );
}