'use client';

import React, { useMemo } from 'react';
import { Paper, SegmentedControl, RangeSlider, MultiSelect, Select, Group, Text } from '@mantine/core';

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

  return (
    <Paper p="md" shadow="sm" withBorder>
      <Group grow>
        <SegmentedControl
          value={scope}
          onChange={setScope}
          data={[
            { label: 'My Camp', value: 'My Camp' },
            { label: 'My Crew', value: 'My Crew' },
          ]}
        />
        <Select
          label="Sort By"
          value={sortBy}
          onChange={setSortBy}
          data={['Newest', 'Popularity', 'BPM']}
        />
        <RangeSlider
          label="BPM"
          min={40}
          max={220}
          value={bpmRange}
          onChange={setBpmRange}
          marks={[{ value: 100, label: '100' }, { value: 160, label: '160' }]}
        />
        <MultiSelect
          label="Genres"
          data={availableGenres}
          value={genres}
          onChange={setGenres}
          placeholder="Filter by genre"
          searchable
          clearable
        />
      </Group>
    </Paper>
  );
};

export default FilterBar;