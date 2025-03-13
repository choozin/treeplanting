'use client' // This is a client component
import { useState } from 'react';

import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import Nav from '../components/navbar/Nav';
import UserManagement from '../components/auth/UserManagement';
import CalendarViews from '../components/calendar/CalendarViews';
import RecipesList from '../components/Recipes/RecipeList';
import { set } from 'firebase/database';

export default function HomePage() {

  const [user, setUser] = useState(null); // this is the auth user object
  const [userData, setUserData] = useState(null); // this is the DB user object
  const [campID, setCampID] = useState(null);

  const [navIsOpen, setNavIsOpen] = useState(false);

  const [isWelcomeVisible, setIsWelcomeVisible] = useState(true);

  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const [isRecipesListVisible, setIsRecipesListVisible] = useState(false);
  const [isUserManagementVisible, setIsUserManagementVisible] = useState(false);

  const handleComponentChange = ( visibleComponent: any ) => {
    setNavIsOpen(false);
    setIsCalendarVisible(false);
    setIsRecipesListVisible(false);
    setIsUserManagementVisible(false);

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
      default: setIsWelcomeVisible(true);
    }
  }

  return (
    <>
      <Nav user={user} setUser={setUser} userData={userData} setUserData={setUserData} campID={campID} setCampID={setCampID} navIsOpen={navIsOpen} setNavIsOpen={setNavIsOpen} handleComponentChange={handleComponentChange} isWelcomeVisible={isWelcomeVisible} setIsWelcomeVisible={setIsWelcomeVisible} isCalendarVisible={isCalendarVisible} setIsCalendarVisible={setIsCalendarVisible} isRecipesListVisible={isRecipesListVisible} setIsRecipesListVisible={setIsRecipesListVisible} />
      {isCalendarVisible && <CalendarViews user={user} campID={campID} isCalendarVisible={isCalendarVisible} setIsCalendarVisible={setIsCalendarVisible} handleComponentChange={handleComponentChange} />}
      {isRecipesListVisible &&
        <div>
          <RecipesList isRecipesListVisible={isRecipesListVisible} setIsRecipesListVisible={setIsRecipesListVisible} handleComponentChange={handleComponentChange} />
        </div>
      }
      <ColorSchemeToggle />
      {isUserManagementVisible &&
        <UserManagement currentUser={user} campID={campID} handleComponentChange={handleComponentChange} />
      }
    </>
  );
}
