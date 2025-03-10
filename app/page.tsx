'use client' // This is a client component
import { useState } from 'react';

import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import Nav from '../components/navbar/Nav';
import AuthForm from '../components/auth/AuthForm';
import CalendarViews from '../components/calendar/CalendarViews';
import RecipesList from '../components/Recipes/RecipeList';
import { set } from 'firebase/database';

export default function HomePage() {

  const [user, setUser] = useState(null); // this is the auth user object
  const [userData, setUserData] = useState(null); // this is the DB user object
  const [campID, setCampID] = useState(null);

  const [navIsOpen, setNavIsOpen] = useState(false);

  const [isCalendarVisible, setIsCalendarVisible] = useState(true);
  const [isRecipesListVisible, setIsRecipesListVisible] = useState(false);

  return (
    <>
      <Nav user={user} setUser={setUser} userData={userData} setUserData={setUserData} campID={campID} setCampID={setCampID} navIsOpen={navIsOpen} setNavIsOpen={setNavIsOpen} isCalendarVisible={isCalendarVisible} setIsCalendarVisible={setIsCalendarVisible} isRecipesListVisible={isRecipesListVisible} setIsRecipesListVisible={setIsRecipesListVisible} />
      {isCalendarVisible && <CalendarViews user={user} campID={campID} isCalendarVisible={isCalendarVisible} setIsCalendarVisible={setIsCalendarVisible} />}
      {isRecipesListVisible &&
        <div>
          <RecipesList isRecipesListVisible={isRecipesListVisible} setIsRecipesListVisible={setIsRecipesListVisible}/>
        </div>
      }
      <ColorSchemeToggle />
    </>
  );
}
