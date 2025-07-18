'use client';

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  IconAlertCircle,
  IconPencil,
  IconSearch,
  IconUsers,
  IconUsersGroup,
} from '@tabler/icons-react';
import { User as FirebaseUser } from 'firebase/auth';
import { getDatabase, onValue, ref, update } from 'firebase/database';
import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Center,
  Container,
  Divider,
  Group,
  Loader,
  Modal,
  MultiSelect,
  Paper,
  ScrollArea,
  Select,
  Stack,
  Table,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { database } from '../../firebase/firebase';
import { ROLES } from '../../lib/constants';
import AdminUserList from './AdminUserList';
import CrewManagement from './CrewManagement';

// --- TypeScript Interfaces ---
interface AppUser {
  id: string;
  name: string;
  email: string;
  role: number;
  assignedCamps?: Record<string, { campName: string; role: number; crewId?: string }>;
  managesCompany?: string;
  effectiveRoleInContext?: number;
}

interface Camp {
  campName: string;
  companyId: string;
  users?: Record<string, { name: string; role: number }>;
}

interface EditedUserData {
  name: string;
  email: string;
  globalRole: number;
  campRoles: Record<string, number>;
}

// --- Helper Functions ---
const getRoleName = (level: number) => ROLES[level as keyof typeof ROLES] || 'Unknown Role';

// --- Main Component ---
const UserManagement: FC<{
  currentUser: FirebaseUser;
  campID: string | null;
  effectiveRole: number;
  globalRole: number;
}> = ({ currentUser, campID, effectiveRole, globalRole }) => {
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [allCamps, setAllCamps] = useState<Record<string, Camp>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editedUserData, setEditedUserData] = useState<Partial<EditedUserData>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('employees');

  const viewer = useMemo(
    () => allUsers.find((u) => u.id === currentUser.uid),
    [allUsers, currentUser.uid]
  );

  useEffect(() => {
    setIsLoading(true);
    const usersRef = ref(database, 'users');
    const campsRef = ref(database, 'camps');

    const unsubUsers = onValue(
      usersRef,
      (snapshot) => {
        setAllUsers(Object.entries(snapshot.val() || {}).map(([id, d]) => ({ id, ...(d as any) })));
        setIsLoading(false);
      },
      (err: Error) => setError(`Failed to load users: ${err.message}`)
    );

    const unsubCamps = onValue(campsRef, (snapshot) => {
      setAllCamps(snapshot.val() || {});
    });

    return () => {
      unsubUsers();
      unsubCamps();
    };
  }, []);

  const calculateUserEffectiveRole = (user: AppUser, contextCampID: string | null) => {
    if (!contextCampID) return user.role || 0;
    const campRole = user.assignedCamps?.[contextCampID]?.role || 0;
    return Math.max(user.role || 0, campRole);
  };

  const sortedAndFilteredUsers = useMemo(() => {
    if (!campID && effectiveRole < 9) return [];

    const usersInScope = campID ? allUsers.filter((u) => u.assignedCamps?.[campID]) : allUsers;

    return usersInScope
      .map((u) => ({ ...u, effectiveRoleInContext: calculateUserEffectiveRole(u, campID) }))
      .filter(
        (user) =>
          (user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
          (roleFilter.length === 0 || roleFilter.includes(String(user.effectiveRoleInContext)))
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [allUsers, campID, searchTerm, roleFilter, effectiveRole]);

  const handleOpenEditModal = (user: AppUser) => {
    setSelectedUser(user);
    const campRoles = user.assignedCamps
      ? Object.keys(user.assignedCamps).reduce(
          (acc, cId) => {
            acc[cId] = allCamps[cId]?.users?.[user.id]?.role || user.assignedCamps![cId].role || 0;
            return acc;
          },
          {} as Record<string, number>
        )
      : {};

    setEditedUserData({
      name: user.name,
      email: user.email,
      globalRole: user.role,
      campRoles,
    });
    setIsEditModalOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!selectedUser) return;
    setIsSaving(true);

    const updates: Record<string, any> = {};
    updates[`/users/${selectedUser.id}/name`] = editedUserData.name;

    if (effectiveRole >= 9) {
      updates[`/users/${selectedUser.id}/role`] = editedUserData.globalRole;
    }

    if (editedUserData.campRoles) {
      for (const cId in editedUserData.campRoles) {
        updates[`/camps/${cId}/users/${selectedUser.id}/role`] = editedUserData.campRoles[cId];
        updates[`/users/${selectedUser.id}/assignedCamps/${cId}/role`] =
          editedUserData.campRoles[cId];
      }
    }

    try {
      await update(ref(database), updates);
      setIsEditModalOpen(false);
    } catch (e) {
      console.error('Failed to save changes:', e);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading)
    return (
      <Center>
        <Loader />
      </Center>
    );
  if (error)
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  if (effectiveRole < 4)
    return (
      <Alert color="red" title="Access Denied">
        You do not have permission to view this page.
      </Alert>
    );
  if (effectiveRole < 9 && !campID) {
    return (
      <Container size="xs" mt="xl">
        <Alert color="blue" title="Select a Camp" icon={<IconAlertCircle />}>
          Please select a camp from the main navigation menu to manage users.
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" mt="lg">
      <Title order={2} mb="xl">
        User Management
      </Title>
      <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'employees')}>
        <Tabs.List>
          <Tabs.Tab value="employees" leftSection={<IconUsers />}>
            Employees
          </Tabs.Tab>
          <Tabs.Tab value="crew" leftSection={<IconUsersGroup />}>
            Crew
          </Tabs.Tab>
          {globalRole >= 9 && (
            <Tabs.Tab value="adminTools" leftSection={<IconUsers />}>
              Admin Tools
            </Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="employees" pt="lg">
          <Paper withBorder shadow="md" p="md">
            <Group grow mb="md">
              <TextInput
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                leftSection={<IconSearch size={14} />}
              />
              <MultiSelect
                data={Object.entries(ROLES).map(([level, name]) => ({ value: level, label: name }))}
                value={roleFilter}
                onChange={setRoleFilter}
                placeholder="Filter by effective role"
                clearable
              />
            </Group>
            <ScrollArea>
              <Table striped highlightOnHover verticalSpacing="sm">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>Email</Table.Th>
                    <Table.Th>Effective Role</Table.Th>
                    <Table.Th>Camps</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {sortedAndFilteredUsers.map((user) => (
                    <Table.Tr key={user.id}>
                      <Table.Td>{user.name}</Table.Td>
                      <Table.Td>{user.email}</Table.Td>
                      <Table.Td>
                        {getRoleName(user.effectiveRoleInContext!)} ({user.effectiveRoleInContext})
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {user.assignedCamps &&
                            Object.keys(user.assignedCamps).map((cId) => (
                              <Badge key={cId} variant="light">
                                {allCamps[cId]?.campName || cId}
                              </Badge>
                            ))}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <ActionIcon
                          onClick={() => handleOpenEditModal(user)}
                          variant="subtle"
                          title="Edit User"
                          disabled={effectiveRole <= user.effectiveRoleInContext!}
                        >
                          <IconPencil size={16} />
                        </ActionIcon>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Paper>
        </Tabs.Panel>

        <Tabs.Panel value="crew" pt="lg">
          <CrewManagement />
        </Tabs.Panel>

        {globalRole >= 9 && (
          <Tabs.Panel value="adminTools" pt="lg">
            <AdminUserList allUsers={allUsers} allCamps={allCamps} />
          </Tabs.Panel>
        )}
      </Tabs>

      <Modal
        opened={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={`Edit ${selectedUser?.name}`}
      >
        <Stack>
          <TextInput
            label="Name"
            value={editedUserData.name || ''}
            onChange={(e) => setEditedUserData((prev) => ({ ...prev, name: e.target.value }))}
          />
          <TextInput label="Email" value={editedUserData.email || ''} disabled />
          {effectiveRole >= 9 && (
            <Select
              label="Global Role"
              data={Object.entries(ROLES).map(([level, name]) => ({ value: level, label: name }))}
              value={String(editedUserData.globalRole || 0)}
              onChange={(value) =>
                setEditedUserData((prev) => ({ ...prev, globalRole: Number(value) }))
              }
            />
          )}
          <Divider my="sm" label="Camp-Specific Roles" />
          {selectedUser?.assignedCamps &&
            Object.keys(selectedUser.assignedCamps).map((cId) => (
              <Select
                key={cId}
                label={allCamps[cId]?.campName || 'Unknown Camp'}
                data={Object.entries(ROLES).map(([level, name]) => ({ value: level, label: name }))}
                value={String(editedUserData.campRoles?.[cId] || 0)}
                onChange={(value) =>
                  setEditedUserData((prev) => ({
                    ...prev,
                    campRoles: {
                      ...prev.campRoles,
                      [cId]: Number(value),
                    },
                  }))
                }
              />
            ))}
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={isSaving} onClick={handleSaveChanges}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default UserManagement;
