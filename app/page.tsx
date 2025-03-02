import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import AuthForm from '../components/auth/AuthForm';
import CalendarViews from '../components/calendar/CalendarViews';
import RecipesList from '../components/Recipes/RecipeList';

export default function HomePage() {
  return (
    <>
      <div>This page is a bit chaotic right now... working on several different features at once. If you're looking for the original table I had at this link let me know and I'll throw it back up here.</div>
      <AuthForm/>
      <RecipesList/>
      <CalendarViews/>
      <ColorSchemeToggle />
    </>
  );
}
