'use client';

import RecipeList from '../../components/Recipes/RecipeList';
import { useAuth } from '../../hooks/useAuth';
import { Center } from '@mantine/core';
import CustomLoader from '@/components/common/CustomLoader';

export default function RecipesPage() {
    const { user, campID, loading } = useAuth();

    if (loading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    return <RecipeList user={user} campID={campID} />;
}