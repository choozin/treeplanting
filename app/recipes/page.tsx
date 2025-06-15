'use client';

import RecipeList from '../../components/Recipes/RecipeList';
import { useAuth } from '../../hooks/useAuth';
import { Center, Loader } from '@mantine/core';

export default function RecipesPage() {
    const { user, campID, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><Loader /></Center>;
    }

    return <RecipeList user={user} campID={campID} />;
}