import { ColorSchemeToggle } from '../components/ColorSchemeToggle/ColorSchemeToggle';
import { Welcome } from '../components/Welcome/Welcome';
import AuthForm from '../components/auth/AuthForm';
import CalendarViews from '../components/calendar/CalendarViews';
import RecipesList from '../components/Recipes/RecipeList';

export default function HomePage() {
  return (
    <>
      <AuthForm/>
      <Welcome />
      <RecipesList/>
      <CalendarViews/>
      <ColorSchemeToggle />
    </>
  );
}
