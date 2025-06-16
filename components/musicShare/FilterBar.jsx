'use client';

import React, { useMemo } from 'react';
import { Paper, SegmentedControl, RangeSlider, MultiSelect, Select, Group, Text, Stack } from '@mantine/core';

const FilterBar = ({
    scope,
    setScope,
    bpmRange,
    setBpmRange,
    genres,
    setGenres,
    sortBy,
    setSortBy,
    allSongs,
    campName,
    crewName,
    hasCrew
}) => {
    const availableGenres = useMemo(() => {
        const allGenres = new Set();
        allSongs.forEach(song => {
            if (song.genres) {
                song.genres.forEach(genre => allGenres.add(genre));
            }
        });
        return Array.from(allGenres);
    }, [allSongs]);

    const scopeData = [
        { label: campName, value: 'My Camp' },
        { label: crewName, value: 'My Crew', disabled: !hasCrew },
    ];

    return (
        <Paper p="md" shadow="sm" withBorder>
            <Group grow align="flex-end" wrap="wrap" gap="xl">
                <Stack gap={0} style={{ flex: '1 1 250px' }}>
                    <Text size="sm" fw={500}>View music from...</Text>
                    <SegmentedControl
                        value={scope}
                        onChange={setScope}
                        data={scopeData}
                    />
                </Stack>

                <Stack gap={4} style={{ flex: '1 1 200px' }}>
                    <Text size="sm" fw={500}>BPM Range</Text>
                    <RangeSlider
                        min={40}
                        max={220}
                        value={bpmRange}
                        onChange={setBpmRange}
                        marks={[{ value: 100, label: '100' }, { value: 160, label: '160' }]}
                        pb="xl"
                    />
                </Stack>

                <MultiSelect
                    label="Genres"
                    data={availableGenres}
                    value={genres}
                    onChange={setGenres}
                    placeholder="Filter by genre"
                    searchable
                    clearable
                    style={{ flex: '1 1 200px' }}
                />

                <Select
                    label="Sort By"
                    value={sortBy}
                    onChange={setSortBy}
                    data={['Newest', 'Popularity', 'BPM']}
                    style={{ flex: '1 1 150px' }}
                />
            </Group>
        </Paper>
    );
};

export default FilterBar;