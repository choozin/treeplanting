'use client';

import React from 'react';
import { Paper, TextInput, Checkbox, Select, Group, Text } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';

const FilterBar = ({ filters, setFilters, campName, companyName }) => {
    const handleFilterChange = (key, value) => {
        setFilters(currentFilters => ({ ...currentFilters, [key]: value }));
    };

    const scopeData = [
        { label: campName, value: 'Camp' },
        { label: companyName, value: 'Company' },
        { label: 'Regional', value: 'Regional', disabled: true },
    ];

    return (
        <Paper p="md" withBorder>
            <Group align="flex-end" grow wrap="wrap">
                <TextInput
                    label="Search Listings"
                    placeholder="Search by keyword..."
                    leftSection={<IconSearch size={16} stroke={1.5} />}
                    value={filters.searchTerm}
                    onChange={(e) => handleFilterChange('searchTerm', e.currentTarget.value)}
                    style={{ flex: '1 1 200px' }}
                />
                <Select
                    label="Search within"
                    data={scopeData}
                    value={filters.scope}
                    onChange={(value) => handleFilterChange('scope', value)}
                    style={{ flex: '1 1 200px' }}
                />
                <Select
                    label="Sort By"
                    data={['Newest', 'Oldest', 'Price: High-Low', 'Price: Low-High']}
                    value={filters.sortBy}
                    onChange={(value) => handleFilterChange('sortBy', value)}
                    style={{ flex: '1 1 180px' }}
                />
                <Checkbox.Group
                    label="Listing Type"
                    value={filters.postTypes}
                    onChange={(value) => handleFilterChange('postTypes', value)}
                    style={{ flex: '1 1 300px' }}
                >
                    <Group mt="xs">
                        <Checkbox value="For Sale" label="For Sale" color="blue" />
                        <Checkbox value="For Free" label="For Free" color="green" />
                        <Checkbox value="Wanted" label="Wanted" color="orange" />
                    </Group>
                </Checkbox.Group>
                <Select
                    label="Category"
                    data={['Planting Gear', 'Other']}
                    value={filters.category}
                    onChange={(value) => handleFilterChange('category', value)}
                    placeholder="All Categories"
                    clearable
                    style={{ flex: '1 1 180px' }}
                />
            </Group>
        </Paper>
    );
};

export default FilterBar;