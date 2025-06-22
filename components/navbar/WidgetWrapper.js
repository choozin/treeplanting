// components/navbar/WidgetWrapper.js
'use client';

import React from 'react';
import {
    ActionIcon,
    Box,
    Collapse,
    Group,
    Text,
} from '@mantine/core';
import {
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-react';
import WeatherNavWidget from '../weather/WeatherNavWidget';

import classes from './Navbar.module.css';

const WidgetWrapper = ({ widgetsOpen, setWidgetsOpen, primary, preferences }) => {
    return (
        <div
            className={classes.navSection}
            style={{
                padding: widgetsOpen ? 'var(--mantine-spacing-md)' : 'var(--mantine-spacing-xs)',
                backgroundColor: widgetsOpen ? 'rgba(255, 255, 255, 0.85)' : 'rgba(233, 236, 239, 0.85)',
            }}
        >
            <Group
                justify="space-between"
                mb={widgetsOpen ? 'sm' : 0}
                onClick={() => setWidgetsOpen((o) => !o)} // Moved onClick here
                style={{ cursor: 'pointer' }} // Added cursor style
            >
                <Text fw={500} c="dimmed">
                    Widgets
                </Text>
                {/* ActionIcon now just displays the icon, click handled by parent Group */}
                <ActionIcon variant="transparent">
                    {widgetsOpen ? <IconChevronUp /> : <IconChevronDown />}
                </ActionIcon>
            </Group>
            <Collapse in={widgetsOpen}>
                {preferences?.navWidget?.visible && primary.data ? (
                    <WeatherNavWidget />
                ) : (
                    <Text c="dimmed" size="sm" ta="center" mt="sm">
                        Widgets you enable for the menu will appear here.
                    </Text>
                )}
            </Collapse>
        </div>
    );
};

export default WidgetWrapper;