'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, get } from 'firebase/database';
import useSWR from 'swr';
import {
    AppShell,
    Grid,
    Container,
    Text,
    ActionIcon,
    Center,
    Paper,
    Title,
    Stack
} from '@mantine/core';
import { IconPlus, IconMusicOff } from '@tabler/icons-react';
import FilterBar from './FilterBar';
import SongCard from './SongCard';
import AddSongModal from './AddSongModal';
import CustomLoader from '../common/CustomLoader';

const fetcher = (path) => get(ref(database, path)).then(snapshot => {
    if (snapshot.exists()) {
        const data = snapshot.val();
        return Object.keys(data).map(key => ({ id: key, ...data[key] }));
    }
    return [];
});

const objectFetcher = (path) => get(ref(database, path)).then(snapshot => {
    return snapshot.exists() ? snapshot.val() : null;
});

const MusicShare = () => {
    const { user, campID, userData, effectiveRole } = useAuth();
    const [recommendations, setRecommendations] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);

    // --- Filter and Sort State ---
    const [scope, setScope] = useState('My Camp'); // 'My Camp' or 'My Crew'
    const [bpmRange, setBpmRange] = useState([60, 180]);
    const [selectedGenres, setSelectedGenres] = useState([]);
    const [sortBy, setSortBy] = useState('Newest');

    const musicPath = campID ? `camps/${campID}/music_recommendations` : null;
    const { data: fetchedData, error, isLoading } = useSWR(musicPath, fetcher);

    const userCrewId = userData?.assignedCamps?.[campID]?.crewId;
    const crewPath = campID && userCrewId ? `camps/${campID}/crews/${userCrewId}` : null;
    const { data: crewData } = useSWR(crewPath, objectFetcher);
    const campName = userData?.assignedCamps?.[campID]?.campName;

    useEffect(() => {
        if (fetchedData) {
            setRecommendations(fetchedData);
        }
    }, [fetchedData]);

    const filteredAndSortedData = useMemo(() => {
        if (!recommendations) return [];

        let filtered = [...recommendations];

        if (scope === 'My Crew' && userCrewId) {
            filtered = filtered.filter(rec => rec.crewId === userCrewId);
        }

        filtered = filtered.filter(rec => rec.bpm >= bpmRange[0] && rec.bpm <= bpmRange[1]);

        if (selectedGenres.length > 0) {
            filtered = filtered.filter(rec => rec.genres && selectedGenres.every(g => rec.genres.includes(g)));
        }

        switch (sortBy) {
            case 'Popularity':
                filtered.sort((a, b) => (b.upvotes?.length || 0) - (a.upvotes?.length || 0));
                break;
            case 'BPM':
                filtered.sort((a, b) => b.bpm - a.bpm);
                break;
            case 'Newest':
            default:
                filtered.sort((a, b) => b.createdAt - a.createdAt);
                break;
        }

        return filtered;
    }, [recommendations, scope, bpmRange, selectedGenres, sortBy, userCrewId]);

    const handleUpvote = (songId) => {
        if (!navigator.onLine) {
            handleOfflineUpvote(songId);
            return;
        }
        // Online logic...
    };

    const handleOfflineUpvote = (songId) => {
        console.log(`(Offline) Queuing upvote for song: ${songId}`);
        alert("You're offline! Your upvote will be synced when you're back online.");
    };

    if (isLoading) {
        return <Center style={{ height: '80vh' }}><CustomLoader /></Center>;
    }

    if (error) {
        return <Center><Text c="red">Failed to load music recommendations.</Text></Center>;
    }

    return (
        <Container size="lg" pt="md">
            <AppShell
                header={{ height: 'auto' }}
                padding="md"
            >
                <AppShell.Header style={{ position: 'sticky', top: 'var(--navbar-height)' }}>
                    <FilterBar
                        scope={scope}
                        setScope={setScope}
                        bpmRange={bpmRange}
                        setBpmRange={setBpmRange}
                        genres={selectedGenres}
                        setGenres={setSelectedGenres}
                        sortBy={sortBy}
                        setSortBy={setSortBy}
                        allSongs={recommendations}
                        campName={campName || 'My Camp'}
                        crewName={crewData?.crewName || 'My Crew'}
                        hasCrew={!!userCrewId}
                    />
                </AppShell.Header>

                <AppShell.Main>
                    {filteredAndSortedData.length > 0 ? (
                        <Grid>
                            {filteredAndSortedData.map((song) => (
                                <Grid.Col key={song.id} span={{ base: 12, sm: 6, md: 4, lg: 3 }}>
                                    <SongCard song={song} onUpvote={handleUpvote} currentUserId={user?.uid} />
                                </Grid.Col>
                            ))}
                        </Grid>
                    ) : (
                        <Center style={{ height: '50vh' }}>
                            <Paper p="xl" withBorder>
                                <Stack align="center">
                                    <IconMusicOff size={48} color="var(--mantine-color-gray-5)" />
                                    <Title order={4}>No Songs Yet</Title>
                                    <Text c="dimmed">No songs match your filters. Be the first to share one!</Text>
                                </Stack>
                            </Paper>
                        </Center>
                    )}
                </AppShell.Main>
            </AppShell>
            <ActionIcon
                size="xl"
                radius="xl"
                variant="filled"
                color="blue"
                style={{ position: 'fixed', bottom: '2rem', right: '2rem' }}
                onClick={() => setIsModalOpen(true)}
            >
                <IconPlus size={24} />
            </ActionIcon>
            <AddSongModal
                opened={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                user={user}
                campId={campID}
                crewId={userCrewId}
            />
        </Container>
    );
};

export default MusicShare;