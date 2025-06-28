'use client';

import React, { useMemo } from 'react';
import useSWR from 'swr';
import { database } from '../../firebase/firebase';
import { ref, get } from 'firebase/database';
import { Paper, Title, Text, Stack, Group, Skeleton, Center } from '@mantine/core';
import { IconCake } from '@tabler/icons-react';

const usersFetcher = async (path: string) => {
    const snapshot = await get(ref(database, path));
    if (!snapshot.exists()) return [];
    const usersData = snapshot.val();
    return Object.keys(usersData).map(uid => ({
        uid,
        ...usersData[uid],
    }));
};

const BirthdaysWidget = () => {
    const { data: allUsers, error, isLoading } = useSWR('users', usersFetcher);

    const upcomingBirthdays = useMemo(() => {
        if (!allUsers) return [];

        const currentYear = new Date().getFullYear();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return allUsers
            .filter(user => user.profile?.isBirthdayVisible && user.profile?.birthday)
            .map(user => {
                const [year, month, day] = user.profile.birthday.split('-').map(Number);
                const birthdayThisYear = new Date(currentYear, month - 1, day);
                return {
                    name: user.profile.nickname || user.name,
                    date: birthdayThisYear,
                };
            })
            .filter(bday => bday.date >= today)
            .sort((a, b) => a.date.getTime() - b.date.getTime())
            .slice(0, 5); // Show the next 5 upcoming birthdays
    }, [allUsers]);

    const renderContent = () => {
        if (isLoading) {
             return (
                <Stack>
                    <Skeleton height={16} radius="sm" />
                    <Skeleton height={16} radius="sm" />
                    <Skeleton height={16} width="70%" radius="sm" />
                </Stack>
            );
        }

        if (error) {
            return <Text c="red">Error loading birthdays.</Text>;
        }

        if (upcomingBirthdays.length === 0) {
            return <Text c="dimmed">No upcoming birthdays to show.</Text>;
        }

        return (
            <Stack gap="sm">
                {upcomingBirthdays.map((bday, index) => (
                    <Group key={index} justify="space-between">
                        <Text fw={500}>{bday.name}</Text>
                        <Text size="sm">{bday.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}</Text>
                    </Group>
                ))}
            </Stack>
        );
    }


    return (
        <Paper withBorder p="lg" radius="md" style={{ flex: '1 1 400px', minWidth: '300px' }}>
            <Group justify="space-between" align="center" mb="md">
                <Group>
                    <IconCake size={24} />
                    <Title order={3}>Upcoming Birthdays</Title>
                </Group>
            </Group>
            {renderContent()}
        </Paper>
    );
};

export default BirthdaysWidget;