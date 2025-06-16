'use client';

import React, { useState, useEffect, useMemo, useCallback, FC } from 'react';
import { getDatabase, ref, onValue, update, remove, set, push as firebasePush } from 'firebase/database';
import { database } from '../../firebase/firebase';
import { ROLES } from '../../lib/constants';
import {
    Container,
    Title,
    Tabs,
    Table,
    Group,
    Text,
    ActionIcon,
    Modal,
    Button,
    TextInput,
    Select,
    Box,
    Alert,
    ScrollArea,
    Paper,
    Divider,
    Stack,
    MultiSelect,
    Badge,
    Accordion
} from '@mantine/core';
import {
    IconUsers, IconBuilding, IconCampfire, IconUsersGroup, IconSearch, IconEdit,
    IconTrash, IconUserOff, IconAlertCircle, IconPencil, IconChevronUp, IconChevronDown, IconPlus
} from '@tabler/icons-react';
import { User as FirebaseUser } from 'firebase/auth';
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

interface Crew {
    crewName: string;
    crewBosses?: Record<string, boolean>;
    drivers?: Record<string, boolean>;
    members?: Record<string, boolean>;
}

interface Camp {
    campName: string;
    companyId: string;
    users?: Record<string, { name: string; role: number }>;
    crews?: Record<string, Crew>;
    campBosses?: Record<string, boolean>;
}

interface Company {
    companyName: string;
}

interface UserManagementProps {
    currentUser: FirebaseUser;
    campID: string | null;
    effectiveRole: number;
}

interface EditedUserData {
    name: string;
    email: string;
    globalRole: number;
    campRoles: Record<string, number>;
}

// --- Helper Functions ---
const getRoleName = (level: number) => ROLES[level as keyof typeof ROLES] || 'Unknown Role';

const SortableHeader: FC<{ children: React.ReactNode, sorted: boolean, reversed: boolean, onSort: () => void }> = ({ children, sorted, reversed, onSort }) => (
    <Table.Th onClick={onSort} style={{ cursor: 'pointer' }}>
        <Group justify="space-between">
            <Text fw={500} fz="sm">{children}</Text>
            {sorted && (reversed ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />)}
        </Group>
    </Table.Th>
);

// --- Main Component ---
const UserManagement: FC<UserManagementProps> = ({ currentUser, campID, effectiveRole }) => {
    // --- State Declarations ---
    const [allUsers, setAllUsers] = useState<AppUser[]>([]);
    const [allCamps, setAllCamps] = useState<Record<string, Camp>>({});
    const [allCompanies, setAllCompanies] = useState<Record<string, Company>>({});
    const [crews, setCrews] = useState<Record<string, Crew>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [activeTab, setActiveTab] = useState('employees');
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    const [campFilter, setCampFilter] = useState<string[]>([]);
    const [roleFilter, setRoleFilter] = useState<string[]>([]);
    const [sortBy, setSortBy] = useState('name');
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    const [editedUserData, setEditedUserData] = useState<Partial<EditedUserData>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: '', name: '' });

    const [newCrewName, setNewCrewName] = useState('');
    const [newCrewBosses, setNewCrewBosses] = useState<string[]>([]);
    const [newCampName, setNewCampName] = useState('');
    const [newCampCompany, setNewCampCompany] = useState<string | null>('');

    const viewer = useMemo(() => allUsers.find(u => u.id === currentUser.uid), [allUsers, currentUser.uid]);

    useEffect(() => {
        setIsLoading(true);
        const refs = [
            { path: 'users', setter: (data: Record<string, Omit<AppUser, 'id'>>) => setAllUsers(Object.entries(data || {}).map(([id, d]) => ({ id, ...d }))) },
            { path: 'camps', setter: setAllCamps },
            { path: 'companies', setter: setAllCompanies }
        ];
        const unsubscribes = refs.map(({ path, setter }) =>
            onValue(ref(database, path), (snapshot) => {
                const data = snapshot.val() || {};
                setter(data);
            }, (err: Error) => setError(`Failed to load ${path}: ${err.message}`))
        );
        setIsLoading(false);
        return () => unsubscribes.forEach(unsub => unsub());
    }, []);

    useEffect(() => {
        if (campID) {
            const crewsRef = ref(database, `camps/${campID}/crews`);
            const unsubscribe = onValue(crewsRef, (snapshot) => {
                setCrews(snapshot.val() || {});
            });
            return () => unsubscribe();
        }
    }, [campID]);

    const viewerPermissions = useMemo(() => {
        if (!viewer) return { role: 0, scope: 'none' };
        const role = effectiveRole;
        if (role >= 9) return { role, scope: 'app' };
        if (role >= 7 && viewer.managesCompany) return { role, scope: 'company', managesCompany: viewer.managesCompany };
        if (!campID) return { role, scope: 'none' };
        if (role >= 6) return { role, scope: 'camp', managesCamp: campID };
        if (role >= 5) {
            const currentCampAssignment = viewer.assignedCamps?.[campID];
            return { role, scope: 'crew', managesCrew: currentCampAssignment?.crewId, managesCamp: campID };
        }
        return { role, scope: 'none' };
    }, [viewer, effectiveRole, campID]);

    const handleOpenEditModal = (user: AppUser) => {
        setSelectedUser(user);
        const campRoles = user.assignedCamps ? Object.keys(user.assignedCamps).reduce((acc, cId) => {
            acc[cId] = (allCamps[cId]?.users?.[user.id]?.role) || 0;
            return acc;
        }, {} as Record<string, number>) : {};

        setEditedUserData({
            name: user.name,
            email: user.email,
            globalRole: user.role,
            campRoles
        });
        setIsEditModalOpen(true);
    };

    const sortedAndFilteredUsers = useMemo(() => {
        let visibleUsers: AppUser[] = [];
        if (viewerPermissions.scope === 'app') {
            visibleUsers = allUsers;
        } else if (viewerPermissions.scope === 'company' && viewerPermissions.managesCompany) {
            const companyCampIds = Object.keys(allCamps).filter(cid => allCamps[cid].companyId === viewerPermissions.managesCompany);
            visibleUsers = allUsers.filter(u => u.assignedCamps && Object.keys(u.assignedCamps).some(cid => companyCampIds.includes(cid)));
        } else if (viewerPermissions.scope === 'camp' && viewerPermissions.managesCamp) {
            visibleUsers = allUsers.filter(u => u.assignedCamps?.[viewerPermissions.managesCamp ?? '']);
        } else if (viewerPermissions.scope === 'crew' && viewerPermissions.managesCamp && viewerPermissions.managesCrew) {
            visibleUsers = allUsers.filter(u => u.assignedCamps?.[viewerPermissions.managesCamp ?? '']?.crewId === viewerPermissions.managesCrew);
        }

        const filtered = visibleUsers.map(user => {
            const campSpecificRole = (campID && allCamps[campID]?.users?.[user.id]?.role) || 0;
            const userEffectiveRole = Math.max(user.role || 0, campSpecificRole);
            return { ...user, effectiveRoleInContext: userEffectiveRole };
        }).filter(user =>
            (user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (roleFilter.length === 0 || roleFilter.includes(String(user.role))) &&
            (campFilter.length === 0 || (user.assignedCamps && Object.keys(user.assignedCamps).some(cId => campFilter.includes(cId))))
        );

        return filtered.sort((a, b) => {
            const aVal = (a as any)[sortBy] || '';
            const bVal = (b as any)[sortBy] || '';
            if (aVal < bVal) return reverseSortDirection ? 1 : -1;
            if (aVal > bVal) return reverseSortDirection ? -1 : 1;
            return 0;
        });
    }, [allUsers, allCamps, viewerPermissions, searchTerm, campFilter, roleFilter, sortBy, reverseSortDirection, campID]);


    const setSorting = (field: string) => {
        const reversed = field === sortBy && !reverseSortDirection;
        setReverseSortDirection(reversed);
        setSortBy(field);
    };

    if (isLoading) return <Text>Loading User Data...</Text>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (!viewer) return <Alert color="yellow" title="Initializing">Please wait, initializing user permissions...</Alert>;
    if (effectiveRole < 5) return <Alert color="red" title="Access Denied">You do not have permission to view this page.</Alert>;
    if ((viewer.role < 9) && !campID) {
        return <Container size="xs" mt="xl"><Alert color="blue" title="Select a Camp" icon={<IconAlertCircle />}>Please select a camp from the main navigation menu to manage users.</Alert></Container>
    }

    return (
        <Container size="xl" mt="lg">
            <Title order={2} mb="xl">User Management</Title>
            <Tabs value={activeTab} onChange={(value) => setActiveTab(value || 'employees')}>
                <Tabs.List>
                    <Tabs.Tab value="employees" leftSection={<IconUsers />}>Employees</Tabs.Tab>
                    <Tabs.Tab value="crew" leftSection={<IconUsersGroup />}>Crew</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="employees" pt="lg">
                    <Paper withBorder shadow="md" p="md">
                        <Group grow mb="md">
                            <TextInput placeholder="Search by name or email..." value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} leftSection={<IconSearch size={14} />} />
                            <MultiSelect data={Object.entries(ROLES).map(([level, name]) => ({ value: level, label: name }))} value={roleFilter} onChange={setRoleFilter} placeholder="Filter by global role" clearable />
                        </Group>
                        <ScrollArea>
                            <Table striped highlightOnHover verticalSpacing="sm">
                                <Table.Thead>
                                    <Table.Tr>
                                        <SortableHeader sorted={sortBy === 'name'} reversed={reverseSortDirection} onSort={() => setSorting('name')}>Name</SortableHeader>
                                        <SortableHeader sorted={sortBy === 'email'} reversed={reverseSortDirection} onSort={() => setSorting('email')}>Email</SortableHeader>
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
                                            <Table.Td>{getRoleName(user.effectiveRoleInContext || 0)} ({user.effectiveRoleInContext})</Table.Td>
                                            <Table.Td><Group gap="xs">{user.assignedCamps && Object.entries(user.assignedCamps).map(([cId]) => (<Badge key={cId} variant="light">{allCamps[cId]?.campName || cId}</Badge>))}</Group></Table.Td>
                                            <Table.Td><ActionIcon onClick={() => handleOpenEditModal(user)} variant="subtle" title="Edit User" disabled={effectiveRole <= (user.effectiveRoleInContext || 0)}><IconPencil size={16} /></ActionIcon></Table.Td>
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
            </Tabs>
        </Container>
    );
};

export default UserManagement;