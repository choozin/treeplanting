'use client';

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import useSWR, { useSWRConfig } from 'swr';
import { database } from '../../firebase/firebase';
import { ref, get, update, increment } from 'firebase/database';
import { AppShell, Container, ActionIcon, Center, Text, Stack, Paper, Title } from '@mantine/core';
import { IconPlus, IconMusicOff } from '@tabler/icons-react';
import FilterBar from './FilterBar';
import PostListItem from './PostListItem';
import AddPostModal from './AddPostModal';
import CustomLoader from '../common/CustomLoader';

const objectFetcher = (path) => get(ref(database, path)).then(snapshot => snapshot.exists() ? snapshot.val() : null);
const listFetcher = (path) => get(ref(database, path)).then(snapshot => {
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data).map(key => ({ id: key, ...data[key] }));
});

const ClassifiedsPage = () => {
    const { user, campID, openComposeModal } = useAuth();
    const { mutate } = useSWRConfig();

    const { data: campData, error: campError, isLoading: isLoadingCamp } = useSWR(campID ? `camps/${campID}` : null, objectFetcher);
    const companyPath = campData?.companyId ? `companies/${campData.companyId}` : null;
    const { data: companyData, error: companyError } = useSWR(companyPath, objectFetcher);

    const [filters, setFilters] = useState({
        searchTerm: '', scope: 'Camp', postTypes: ['For Sale', 'For Free', 'Wanted'],
        category: null, sortBy: 'Newest',
    });
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedPostId, setExpandedPostId] = useState(null);
    const [viewedInSession, setViewedInSession] = useState([]);

    const postsPath = filters.scope === 'Camp' && campID ? `camps/${campID}/classifieds` : null;
    const { data: posts, error: postsError, isLoading: isLoadingPosts } = useSWR(postsPath, listFetcher);

    const incrementViewCount = (postId) => {
        if (viewedInSession.includes(postId) || !campID) return;

        const postRef = ref(database, `camps/${campID}/classifieds/${postId}`);
        update(postRef, { viewCount: increment(1) });
        setViewedInSession(prev => [...prev, postId]);
        mutate(postsPath); // Revalidate the list data to show new view count
    };

    const handleExpand = (postId) => {
        incrementViewCount(postId);
        setExpandedPostId(currentId => (currentId === postId ? null : postId));
    };

    const handleMessageLister = (post) => {
        incrementViewCount(post.id);
        openComposeModal({
            recipientId: post.listerId, recipientName: post.listerName,
            subject: `Re: Your post "${post.title}"`, isClassifiedsMessage: true,
        });
    };

    const filteredAndSortedData = useMemo(() => {
        if (!posts || !Array.isArray(posts)) return [];
        let filtered = posts.filter(post =>
            (post.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) || post.description.toLowerCase().includes(filters.searchTerm.toLowerCase())) &&
            (filters.postTypes.length === 0 || filters.postTypes.includes(post.postType)) &&
            (!filters.category || post.category === filters.category)
        );
        switch (filters.sortBy) {
            case 'Oldest': filtered.sort((a, b) => a.createdAt - b.createdAt); break;
            case 'Price: High-Low': filtered.sort((a, b) => (b.price || 0) - (a.price || 0)); break;
            case 'Price: Low-High': filtered.sort((a, b) => (a.price || 0) - (b.price || 0)); break;
            default: filtered.sort((a, b) => b.createdAt - a.createdAt); break;
        }
        return filtered;
    }, [posts, filters]);

    if (isLoadingPosts || isLoadingCamp) return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    if (postsError || campError || companyError) return <Center><Text c="red">Error loading classifieds data.</Text></Center>;

    return (
        <Container size="lg" pt="md">
            <AppShell header={{ height: 'auto' }} padding="md">
                <AppShell.Header style={{ position: 'sticky', top: 'var(--navbar-height)', zIndex: 101 }}>
                    <FilterBar
                        filters={filters} setFilters={setFilters}
                        campName={campData?.campName || 'My Camp'} companyName={companyData?.companyName || 'My Company'}
                    />
                </AppShell.Header>
                <AppShell.Main>
                    <Stack>
                        {filteredAndSortedData.length > 0 ? (
                            filteredAndSortedData.map(post => (
                                <PostListItem
                                    key={post.id}
                                    post={post}
                                    isExpanded={expandedPostId === post.id}
                                    onExpand={() => handleExpand(post.id)}
                                    onMessage={() => handleMessageLister(post)}
                                />
                            ))
                        ) : (
                            <Center style={{ height: '50vh' }}>
                                <Paper p="xl" withBorder>
                                    <Stack align="center">
                                        <IconMusicOff size={48} color="var(--mantine-color-gray-5)" />
                                        <Title order={4}>No Listings Found</Title>
                                        <Text c="dimmed">Try adjusting your filters or be the first to create a post!</Text>
                                    </Stack>
                                </Paper>
                            </Center>
                        )}
                    </Stack>
                </AppShell.Main>
            </AppShell>
            <ActionIcon
                size="xl" radius="xl" variant="filled" color="blue"
                style={{ position: 'fixed', bottom: '2rem', right: '2rem' }}
                onClick={() => setIsModalOpen(true)}
                disabled={!campData} title={!campData ? "Loading camp data..." : "Create New Post"}
            >
                <IconPlus size={24} />
            </ActionIcon>
            {campData && (
                <AddPostModal
                    opened={isModalOpen} onClose={() => setIsModalOpen(false)}
                    campData={campData}
                />
            )}
        </Container>
    );
};

export default ClassifiedsPage;