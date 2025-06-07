'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { getDatabase, ref, onValue, update, remove, push as firebasePush } from 'firebase/database';
import { database } from '../../firebase/firebase';
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

// --- Constants and Helper Functions ---

const ROLES = {
    0: 'Disabled', 1: 'Visitor', 2: 'Apprentice', 3: 'Jr. Crew Member', 4: 'Crew Member',
    5: 'Crew Boss', 6: 'Camp Boss', 7: 'Company Boss', 8: 'Company Owner',
    9: 'App Admin', 10: 'Super Admin'
};

const getRoleName = (level) => ROLES[level] || 'Unknown Role';

const SortableHeader = ({ children, sorted, reversed, onSort }) => (
    <Table.Th onClick={onSort} style={{ cursor: 'pointer' }}>
        <Group justify="space-between">
            <Text fw={500} fz="sm">{children}</Text>
            {sorted && (reversed ? <IconChevronUp size={14} /> : <IconChevronDown size={14} />)}
        </Group>
    </Table.Th>
);

// --- Main Component ---

const UserManagement = ({ currentUser, campID }) => {
    // --- State Declarations ---
    const [allUsers, setAllUsers] = useState([]);
    const [allCamps, setAllCamps] = useState({});
    const [allCompanies, setAllCompanies] = useState({});
    const [crews, setCrews] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const [activeTab, setActiveTab] = useState('employees');
    const [selectedUser, setSelectedUser] = useState(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);

    // State for filtering and sorting
    const [searchTerm, setSearchTerm] = useState('');
    const [campFilter, setCampFilter] = useState([]);
    const [roleFilter, setRoleFilter] = useState([]);
    const [sortBy, setSortBy] = useState('name');
    const [reverseSortDirection, setReverseSortDirection] = useState(false);

    // State for Modals
    const [editedUserData, setEditedUserData] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [deleteModal, setDeleteModal] = useState({ open: false, type: '', id: '', name: '' });

    // State for Creation Forms
    const [newCrewName, setNewCrewName] = useState('');
    const [newCampName, setNewCampName] = useState('');
    const [newCampCompany, setNewCampCompany] = useState('');


    const viewer = useMemo(() => allUsers.find(u => u.id === currentUser.uid), [allUsers, currentUser.uid]);

    // --- Data Fetching Effects ---
    useEffect(() => {
        setIsLoading(true);
        const refs = [
            { path: 'users', setter: setAllUsers, transform: (data) => Object.entries(data).map(([id, d]) => ({ id, ...d })) },
            { path: 'camps', setter: setAllCamps },
            { path: 'companies', setter: setAllCompanies }
        ];
        const unsubscribes = refs.map(({ path, setter, transform }) =>
            onValue(ref(database, path), (snapshot) => {
                const data = snapshot.val() || {};
                setter(transform ? transform(data) : data);
            }, (err) => setError(`Failed to load ${path}.`))
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

    // --- Memoized Permissions and Scopes ---
    const effectiveViewerRole = useMemo(() => {
        if (!viewer) return 0;
        const globalRole = viewer.role || 0;
        const campSpecificRole = viewer.assignedCamps?.[campID]?.role || 0;
        return Math.max(globalRole, campSpecificRole);
    }, [viewer, campID]);

    const viewerPermissions = useMemo(() => {
        if (!viewer) return { role: 0, scope: 'none' };
        const globalRole = viewer.role || 0;
        const role = effectiveViewerRole;

        if (globalRole >= 9) return { role, scope: 'app' };
        if (globalRole >= 7) return { role, scope: 'company', managesCompany: viewer.managesCompany };

        if (!campID) return { role: globalRole, scope: 'none' };

        if (role >= 6) return { role, scope: 'camp', managesCamp: campID };
        if (role >= 5) {
            const currentCampAssignment = viewer.assignedCamps?.[campID];
            return { role, scope: 'crew', managesCrew: currentCampAssignment?.crewId, managesCamp: campID };
        }
        return { role, scope: 'none' };
    }, [viewer, effectiveViewerRole, campID]);

    // --- Filter and Sort Logic ---
    const sortedAndFilteredUsers = useMemo(() => {
        let visibleUsers = [];
        if (viewerPermissions.scope === 'app') {
            visibleUsers = allUsers;
        } else if (viewerPermissions.scope === 'company' && viewerPermissions.managesCompany) {
            const companyCampIds = Object.keys(allCamps).filter(cid => allCamps[cid].companyId === viewerPermissions.managesCompany);
            visibleUsers = allUsers.filter(u => u.assignedCamps && Object.keys(u.assignedCamps).some(cid => companyCampIds.includes(cid)));
        } else if (viewerPermissions.scope === 'camp' && viewerPermissions.managesCamp) {
            visibleUsers = allUsers.filter(u => u.assignedCamps?.[viewerPermissions.managesCamp]);
        } else if (viewerPermissions.scope === 'crew' && viewerPermissions.managesCamp && viewerPermissions.managesCrew) {
            visibleUsers = allUsers.filter(u => u.assignedCamps?.[viewerPermissions.managesCamp]?.crewId === viewerPermissions.managesCrew);
        }

        const filtered = visibleUsers.filter(user =>
            (user.name.toLowerCase().includes(searchTerm.toLowerCase()) || user.email.toLowerCase().includes(searchTerm.toLowerCase())) &&
            (roleFilter.length === 0 || roleFilter.includes(String(user.role))) &&
            (campFilter.length === 0 || (user.assignedCamps && Object.keys(user.assignedCamps).some(cId => campFilter.includes(cId))))
        );

        return filtered.sort((a, b) => {
            const aVal = a[sortBy] || '';
            const bVal = b[sortBy] || '';
            if (aVal < bVal) return reverseSortDirection ? 1 : -1;
            if (aVal > bVal) return reverseSortDirection ? -1 : 1;
            return 0;
        });
    }, [allUsers, allCamps, viewerPermissions, searchTerm, campFilter, roleFilter, sortBy, reverseSortDirection]);

    const setSorting = (field) => {
        const reversed = field === sortBy && !reverseSortDirection;
        setReverseSortDirection(reversed);
        setSortBy(field);
    };

    // --- Handlers ---
    const handleOpenEditModal = (user) => {
        setSelectedUser(user);
        setEditedUserData({
            name: user.name, email: user.email, globalRole: user.role,
            campRoles: user.assignedCamps ? Object.entries(user.assignedCamps).reduce((acc, [cId, cData]) => ({ ...acc, [cId]: cData.role }), {}) : {}
        });
        setIsEditModalOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedUser || !viewer) return;
        setIsSaving(true);
        const updates = {};
        if (editedUserData.name !== selectedUser.name) updates[`/users/${selectedUser.id}/name`] = editedUserData.name;
        if (editedUserData.email !== selectedUser.email) updates[`/users/${selectedUser.id}/email`] = editedUserData.email;
        if (viewer.role >= 9 && editedUserData.globalRole !== selectedUser.role) updates[`/users/${selectedUser.id}/role`] = editedUserData.globalRole;
        if (editedUserData.campRoles) {
            for (const [cId, cRole] of Object.entries(editedUserData.campRoles)) {
                if (cRole !== selectedUser.assignedCamps?.[cId]?.role) updates[`/users/${selectedUser.id}/assignedCamps/${cId}/role`] = cRole;
            }
        }
        try {
            await update(ref(database), updates);
            alert("User updated successfully."); setIsEditModalOpen(false);
        } catch (err) { console.error(err); alert("Failed to save changes."); } finally { setIsSaving(false); }
    };

    const handleCreateCrew = async () => {
        if (!newCrewName.trim()) return alert("Crew name cannot be empty.");
        if (!campID) return alert("A camp must be selected to add a crew.");
        const newCrewRef = firebasePush(ref(database, `camps/${campID}/crews`));
        try {
            await update(newCrewRef, { crewName: newCrewName.trim() });
            alert("Crew created successfully."); setNewCrewName('');
        } catch (err) { console.error(err); alert("Failed to create crew."); }
    };

    const handleCreateCamp = async () => {
        if (!newCampName.trim() || !newCampCompany) return alert("Camp name and company are required.");
        const newCampRef = firebasePush(ref(database, 'camps'));
        try {
            await update(newCampRef, { campName: newCampName.trim(), companyId: newCampCompany });
            alert("Camp created successfully."); setNewCampName(''); setNewCampCompany('');
        } catch (err) { console.error(err); alert("Failed to create camp."); }
    };

    const handleCrewAssignment = async (userId, crewId) => {
        if (!campID) return alert("Cannot assign to crew without a selected camp.");
        const updates = {};
        const currentCrewId = allUsers.find(u => u.id === userId)?.assignedCamps?.[campID]?.crewId;
        if (currentCrewId === crewId) {
            updates[`/users/${userId}/assignedCamps/${campID}/crewId`] = null;
        } else {
            updates[`/users/${userId}/assignedCamps/${campID}/crewId`] = crewId;
        }
        try { await update(ref(database), updates); alert("Crew assignment updated successfully."); }
        catch (err) { console.error("Crew assignment error:", err); alert("Failed to update crew assignment."); }
    };

    const confirmDelete = async () => {
        const { type, id } = deleteModal;
        const updates = {};
        if (type === 'crew') {
            updates[`/camps/${campID}/crews/${id}`] = null;
            allUsers.forEach(user => {
                if (user.assignedCamps?.[campID]?.crewId === id) {
                    updates[`/users/${user.id}/assignedCamps/${campID}/crewId`] = null;
                }
            });
        } else if (type === 'camp') {
            updates[`/camps/${id}`] = null;
            allUsers.forEach(user => {
                if (user.assignedCamps?.[id]) {
                    updates[`/users/${user.id}/assignedCamps/${id}`] = null;
                }
            });
        }
        try {
            await update(ref(database), updates);
            alert(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted successfully.`);
            setDeleteModal({ open: false, type: '', id: '', name: '' });
        } catch (err) { console.error(err); alert(`Failed to delete ${type}.`); }
    };

    // --- UI Rendering ---
    if (isLoading) return <Text>Loading User Data...</Text>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (!viewer) return <Alert color="yellow" title="Initializing">Please wait, initializing user permissions...</Alert>;

    if ((viewer.role < 9) && !campID) {
        return <Container size="xs" mt="xl"><Alert color="blue" title="Select a Camp" icon={<IconAlertCircle />}>Please select a camp from the main navigation menu to manage users.</Alert></Container>
    }

    if (effectiveViewerRole < 5) return <Alert color="red" title="Access Denied">You do not have permission to view this page.</Alert>;

    const roleOptions = Object.entries(ROLES).filter(([level]) => parseInt(level) < effectiveViewerRole).map(([level, name]) => ({ value: level, label: `${name} (${level})` }));

    return (
        <Container size="xl" mt="lg">
            <Title order={2} mb="xl">User Management</Title>

            <Tabs value={activeTab} onChange={setActiveTab}>
                <Tabs.List>
                    {effectiveViewerRole >= 5 && <Tabs.Tab value="employees" leftSection={<IconUsers />}>Employees</Tabs.Tab>}
                    {effectiveViewerRole >= 5 && <Tabs.Tab value="crew" leftSection={<IconUsersGroup />}>Crew</Tabs.Tab>}
                    {effectiveViewerRole >= 6 && <Tabs.Tab value="camp" leftSection={<IconCampfire />}>Camp</Tabs.Tab>}
                    {effectiveViewerRole >= 7 && <Tabs.Tab value="company" leftSection={<IconBuilding />}>Company</Tabs.Tab>}
                </Tabs.List>

                <Tabs.Panel value="employees" pt="lg">
                    <Paper withBorder shadow="md" p="md">
                        <Group grow mb="md">
                            <TextInput placeholder="Search by name or email..." value={searchTerm} onChange={(event) => setSearchTerm(event.currentTarget.value)} leftSection={<IconSearch size={14} />} />
                            {viewerPermissions.scope !== 'camp' && viewerPermissions.scope !== 'crew' && <MultiSelect data={Object.entries(allCamps).map(([id, camp]) => ({ value: id, label: camp.campName }))} value={campFilter} onChange={setCampFilter} placeholder="Filter by camp" clearable />}
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
                                    {sortedAndFilteredUsers.map((user) => {
                                        const effectiveUserRoleInContext = Math.max(user.role || 0, user.assignedCamps?.[campID]?.role || 0);
                                        return (
                                            <Table.Tr key={user.id}>
                                                <Table.Td>{user.name}</Table.Td>
                                                <Table.Td>{user.email}</Table.Td>
                                                <Table.Td>{getRoleName(effectiveUserRoleInContext)} ({effectiveUserRoleInContext})</Table.Td>
                                                <Table.Td><Group gap="xs">{user.assignedCamps && Object.entries(user.assignedCamps).map(([cId]) => (<Badge key={cId} variant="light">{allCamps[cId]?.campName || cId}</Badge>))}</Group></Table.Td>
                                                <Table.Td><ActionIcon onClick={() => handleOpenEditModal(user)} variant="subtle" title="Edit User" disabled={effectiveViewerRole <= effectiveUserRoleInContext}><IconPencil size={16} /></ActionIcon></Table.Td>
                                            </Table.Tr>
                                        )
                                    })}
                                </Table.Tbody>
                            </Table>
                        </ScrollArea>
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="crew" pt="lg">
                    {effectiveViewerRole >= 5 ? (
                        <Paper withBorder shadow="md" p="md">
                            <Title order={4} mb="md">Manage Crews for {allCamps[campID]?.campName || 'Current Camp'}</Title>
                            {viewerPermissions.role >= 6 && (
                                <>
                                    <Group mb="xl">
                                        <TextInput placeholder="New Crew Name" value={newCrewName} onChange={(e) => setNewCrewName(e.currentTarget.value)} style={{ flex: 1 }} />
                                        <Button onClick={handleCreateCrew} leftSection={<IconPlus size={16} />}>Create Crew</Button>
                                    </Group>
                                    <Divider label="Existing Crews" labelPosition="center" />
                                </>
                            )}
                            {Object.keys(crews).length > 0 ? (
                                <Accordion variant="separated" mt="md">
                                    {Object.entries(crews).map(([crewId, crew]) => {
                                        const members = allUsers.filter(u => u.assignedCamps?.[campID]?.crewId === crewId);
                                        const potentialMembers = allUsers.filter(u => u.assignedCamps?.[campID] && !u.assignedCamps?.[campID]?.crewId).map(u => ({ value: u.id, label: u.name }));
                                        return (
                                            <Accordion.Item key={crewId} value={crewId}>
                                                <Accordion.Control>
                                                    <Group justify="space-between">
                                                        <Text fw={500}>{crew.crewName}</Text>
                                                        <Group gap="xs">
                                                            <Badge>{members.length} member(s)</Badge>
                                                            {viewerPermissions.role >= 6 && <ActionIcon color="red" variant="subtle" onClick={(e) => { e.stopPropagation(); setDeleteModal({ open: true, type: 'crew', id: crewId, name: crew.crewName }) }} title="Delete Crew"><IconTrash size={16} /></ActionIcon>}
                                                        </Group>
                                                    </Group>
                                                </Accordion.Control>
                                                <Accordion.Panel>
                                                    <Title order={6} mb="sm">Assign Members</Title>
                                                    {members.map(member => (<Group key={member.id} justify="space-between" p="xs"><Text size="sm">{member.name}</Text><Button size="xs" color="red" variant="light" onClick={() => handleCrewAssignment(member.id, crewId)}>Remove</Button></Group>))}
                                                    {members.length === 0 && <Text c="dimmed" size="sm" p="xs">No members assigned yet.</Text>}
                                                    <Divider my="sm" />
                                                    <Select label="Add a user from this camp to the crew" placeholder="Select user to add" data={potentialMembers} onChange={(userId) => userId && handleCrewAssignment(userId, crewId)} searchable clearable />
                                                </Accordion.Panel>
                                            </Accordion.Item>
                                        );
                                    })}
                                </Accordion>
                            ) : (<Text c="dimmed" mt="md">No crews have been created for this camp yet.</Text>)}
                        </Paper>
                    ) : <Alert color="red" title="Access Denied">You do not have permission to manage crews.</Alert>}
                </Tabs.Panel>

                <Tabs.Panel value="camp" pt="lg">
                    {viewerPermissions.role >= 7 ? (
                        <Paper withBorder shadow="md" p="md">
                            <Title order={4} mb="md">Manage Camps</Title>
                            <Group mb="xl">
                                <TextInput placeholder="New Camp Name" value={newCampName} onChange={(e) => setNewCampName(e.currentTarget.value)} style={{ flex: 1 }} />
                                <Select placeholder="Assign to Company" data={Object.entries(allCompanies).map(([id, comp]) => ({ value: id, label: comp.companyName }))} value={newCampCompany} onChange={setNewCampCompany} style={{ flex: 1 }} />
                                <Button onClick={handleCreateCamp} leftSection={<IconPlus size={16} />}>Create Camp</Button>
                            </Group>
                            <Divider label="Existing Camps" labelPosition="center" />
                            <ScrollArea style={{ height: 300 }}>
                                <Table mt="md">
                                    <Table.Thead><Table.Tr><Table.Th>Camp Name</Table.Th><Table.Th>Company</Table.Th><Table.Th>Actions</Table.Th></Table.Tr></Table.Thead>
                                    <Table.Tbody>
                                        {Object.entries(allCamps).map(([id, camp]) => (
                                            <Table.Tr key={id}><Table.Td>{camp.campName}</Table.Td><Table.Td>{allCompanies[camp.companyId]?.companyName || 'N/A'}</Table.Td><Table.Td><ActionIcon color="red" onClick={() => setDeleteModal({ open: true, type: 'camp', id, name: camp.campName })}><IconTrash size={16} /></ActionIcon></Table.Td></Table.Tr>
                                        ))}
                                    </Table.Tbody>
                                </Table>
                            </ScrollArea>
                        </Paper>
                    ) : <Alert color="red" title="Access Denied">You do not have permission to manage camps.</Alert>}
                </Tabs.Panel>

                <Tabs.Panel value="company" pt="lg"><Alert color="blue">Company management features (e.g., assigning users to camps) will be implemented here.</Alert></Tabs.Panel>
            </Tabs>

            <Modal opened={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit User: ${selectedUser?.name}`} size="lg">
                {selectedUser && viewer && (
                    <Stack>
                        <Paper withBorder p="md" radius="md"><Title order={4} mb="sm">User Profile</Title><TextInput label="Name" value={editedUserData.name || ''} onChange={(e) => setEditedUserData(p => ({ ...p, name: e.currentTarget.value }))} /><TextInput label="Email" mt="sm" value={editedUserData.email || ''} onChange={(e) => setEditedUserData(p => ({ ...p, email: e.currentTarget.value }))} /></Paper>
                        <Paper withBorder p="md" radius="md"><Title order={4} mb="sm">Permissions</Title>{viewer.role >= 9 ? (<Select label="Global Role" data={roleOptions} value={String(editedUserData.globalRole)} onChange={(val) => setEditedUserData(p => ({ ...p, globalRole: parseInt(val) }))} disabled={effectiveViewerRole <= selectedUser.role} />) : (<TextInput label="Global Role" value={getRoleName(selectedUser.role)} readOnly />)}</Paper>
                        <Paper withBorder p="md" radius="md"><Title order={4} mb="sm">Camp-Specific Assignments</Title>{selectedUser.assignedCamps ? Object.entries(selectedUser.assignedCamps).map(([cId, cData]) => { const campRoleOptions = Object.entries(ROLES).filter(([level]) => parseInt(level) < effectiveViewerRole && parseInt(level) < 7).map(([level, name]) => ({ value: level, label: `${name} (${level})` })); return (<Box key={cId} mt="sm"><Text fw={500}>{allCamps[cId]?.campName}</Text><Select label="Camp Role" data={campRoleOptions} value={String(editedUserData.campRoles?.[cId] ?? cData.role)} onChange={(val) => setEditedUserData(p => ({ ...p, campRoles: { ...p.campRoles, [cId]: parseInt(val) } }))} disabled={effectiveViewerRole <= (cData.role || 0) && viewer.role < 9} /></Box>) }) : <Text c="dimmed">User is not assigned to any camps.</Text>}</Paper>
                        <Paper withBorder p="md" radius="md" bg="red.0"><Title order={4} mb="sm" c="red">Danger Zone</Title><Button color="red" leftSection={<IconUserOff size={16} />} onClick={() => alert("Disabling user...")}>Disable User Access</Button></Paper>
                        <Group justify="flex-end" mt="xl"><Button variant="default" onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button onClick={handleSaveChanges} loading={isSaving}>Save Changes</Button></Group>
                    </Stack>
                )}
            </Modal>

            <Modal opened={deleteModal.open} onClose={() => setDeleteModal({ open: false, type: '', id: '', name: '' })} title={`Confirm Deletion`} centered>
                <Text>Are you sure you want to delete the {deleteModal.type} "<strong>{deleteModal.name}</strong>"? This action is irreversible and will un-assign all users from it.</Text>
                <Group mt="xl" justify="flex-end">
                    <Button variant="default" onClick={() => setDeleteModal({ open: false, type: '', id: '', name: '' })}>Cancel</Button>
                    <Button color="red" onClick={confirmDelete}>Delete</Button>
                </Group>
            </Modal>
        </Container>
    );
};

export default UserManagement;
