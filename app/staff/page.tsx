'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { IconLayoutGrid, IconList, IconSearch } from '@tabler/icons-react';
import { onValue, ref } from 'firebase/database';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Box,
  Center,
  Container,
  Group,
  Loader,
  Paper,
  SegmentedControl,
  Select,
  SimpleGrid,
  Table,
  Text,
  TextInput,
} from '@mantine/core';
import ProfileModal from '../../components/staff/ProfileModal';
import StaffCard from '../../components/staff/StaffCard';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../lib/constants';
import classes from '../../components/staff/Staff.module.css';

interface AppUser {
  id: string;
  name: string;
  email: string;
  role: number;
  profileImageURL?: string;
  assignedCamps?: Record<string, { campName: string; role: number; crewId?: string }>;
  profile?: {
    nickname?: string;
  };
  effectiveRole?: number;
}

const StaffPage = () => {
  const { campID, user, openComposeModal } = useAuth();
  const [usersInCamp, setUsersInCamp] = useState<AppUser[]>([]);
  const [crews, setCrews] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [crewFilter, setCrewFilter] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    if (!campID) {
      setIsLoading(false);
      return;
    }

    const usersRef = ref(database, 'users');
    const crewsRef = ref(database, `camps/${campID}/crews`);

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const allUsers = snapshot.val() || {};
      const campUsers = Object.keys(allUsers)
        .map((uid) => ({
          id: uid,
          ...allUsers[uid],
          email: allUsers[uid].email || '',
          profile: {
            // Ensure profile is explicitly mapped
            ...allUsers[uid].profile,
            isEmailVisible: allUsers[uid].profile?.isEmailVisible || false, // Default to false if not present
          },
        }))
        .filter((u) => u.assignedCamps && u.assignedCamps[campID]);
      setUsersInCamp(campUsers);
      setIsLoading(false);
    });

    const unsubscribeCrews = onValue(crewsRef, (snapshot) => {
      const crewsData = snapshot.val() || {};
      const crewsMap = Object.keys(crewsData).reduce(
        (acc, crewId) => {
          acc[crewId] = crewsData[crewId].crewName;
          return acc;
        },
        {} as Record<string, string>
      );
      setCrews(crewsMap);
    });

    return () => {
      unsubscribeUsers();
      unsubscribeCrews();
    };
  }, [campID]);

  const calculateUserEffectiveRole = (user: AppUser) => {
    if (!campID) {
      return user.role;
    }
    const campRole = user.assignedCamps?.[campID]?.role || 0;
    return Math.max(user.role || 0, campRole);
  };

  const usersWithEffectiveRoles = useMemo(() => {
    return usersInCamp.map((u) => ({
      ...u,
      effectiveRole: calculateUserEffectiveRole(u),
    }));
  }, [usersInCamp, campID]);

  const filteredUsers = useMemo(() => {
    return usersWithEffectiveRoles.filter((u) => {
      const nameMatch =
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.profile?.nickname &&
          u.profile.nickname.toLowerCase().includes(searchTerm.toLowerCase()));
      const crewMatch = !crewFilter || u.assignedCamps?.[campID!]?.crewId === crewFilter;
      return nameMatch && crewMatch;
    });
  }, [usersWithEffectiveRoles, searchTerm, crewFilter, campID]);

  const crewOptions = useMemo(() => {
    return Object.entries(crews).map(([id, name]) => ({ value: id, label: name as string }));
  }, [crews]);

  const handleMessageUser = (targetUser: AppUser) => {
    openComposeModal({
      recipientId: targetUser.id,
      recipientName: targetUser.profile?.nickname || targetUser.name,
      subject: `Message for ${targetUser.profile?.nickname || targetUser.name}`,
    });
    setSelectedUser(null);
  };

  if (isLoading) {
    return (
      <Center style={{ height: '80vh' }}>
        <Loader />
      </Center>
    );
  }

  if (!user || !campID) {
    return (
      <Center>
        <Text>Please select a camp to view the staff list.</Text>
      </Center>
    );
  }

  return (
    <Box className={classes.pageBackground}>
      <Container size="xl" py="xl">
        <Paper p="md" withBorder mb="xl">
          <Group>
            <TextInput
              style={{ flex: 1 }}
              placeholder="Search by name..."
              leftSection={<IconSearch size={16} />}
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.currentTarget.value)}
            />
            <Select
              placeholder="Filter by crew"
              data={crewOptions}
              value={crewFilter}
              onChange={setCrewFilter}
              clearable
            />
            <SegmentedControl
              value={viewMode}
              onChange={(value) => setViewMode(value as 'grid' | 'list')}
              data={[
                {
                  label: (
                    <Center>
                      <IconLayoutGrid />
                      <Box ml="xs">Photo View</Box>
                    </Center>
                  ),
                  value: 'grid',
                },
                {
                  label: (
                    <Center>
                      <IconList />
                      <Box ml="xs">List View</Box>
                    </Center>
                  ),
                  value: 'list',
                },
              ]}
            />
          </Group>
        </Paper>

        {viewMode === 'grid' ? (
          <motion.div layout>
            <SimpleGrid
              cols={{ base: 2, sm: 3, md: 4, lg: 5 }}
              spacing={{ base: 'md', sm: 'xl' }}
              verticalSpacing={{ base: 'md', sm: 'xl' }}
            >
              <AnimatePresence>
                {filteredUsers.map((u) => (
                  <motion.div
                    key={u.id}
                    layout
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => setSelectedUser(u)}
                  >
                    <StaffCard user={u} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </SimpleGrid>
          </motion.div>
        ) : (
          <Paper withBorder>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Crew</Table.Th>
                  <Table.Th>Role</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredUsers.map((u) => (
                  <Table.Tr
                    key={u.id}
                    onClick={() => setSelectedUser(u)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Table.Td>{u.profile?.nickname || u.name}</Table.Td>
                    <Table.Td>
                      {crews[u.assignedCamps?.[campID!]?.crewId || ''] || 'No Crew'}
                    </Table.Td>
                    <Table.Td>{ROLES[u.effectiveRole as keyof typeof ROLES]}</Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Paper>
        )}

        <ProfileModal
          user={selectedUser}
          crewName={
            selectedUser
              ? Array.isArray(selectedUser.assignedCamps?.[campID!]?.crewId)
                ? selectedUser.assignedCamps[campID!].crewId
                    .map((id) => crews[id] || 'Unknown Crew')
                    .join(', ')
                : crews[selectedUser.assignedCamps?.[campID!]?.crewId || ''] || 'No Crew'
              : ''
          }
          opened={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          onMessage={handleMessageUser}
        />
      </Container>
    </Box>
  );
};

export default StaffPage;
