'use client';

import React, { useState, useEffect, useMemo, FC } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, set, push as firebasePush, update, remove } from 'firebase/database';
import { useModals } from '@mantine/modals';
import {
    Accordion,
    Badge,
    Box,
    Button,
    Center,
    Container,
    Group,
    Loader,
    Modal,
    MultiSelect,
    Paper,
    Select,
    Stack,
    Text,
    TextInput,
    Title,
    ThemeIcon,
    List,
    ActionIcon,
    Tooltip
} from '@mantine/core';
import { IconUsers, IconPlus, IconPencil, IconTrash } from '@tabler/icons-react';
import { ROLES } from '../../lib/constants';

// --- TypeScript Interfaces ---
interface Crew {
    id: string;
    crewName: string;
    crewType?: string;
    crewBosses?: Record<string, boolean>;
    members?: Record<string, boolean>;
}

interface AppUser {
    id: string;
    name: string;
    email: string;
    role: number;
    assignedCamps?: Record<string, { campName: string; role: number; crewId?: string; }>;
}

// --- Main Component ---
const CrewManagement = () => {
    const { user, campID, effectiveRole } = useAuth();
    const modals = useModals();

    const [crews, setCrews] = useState<Crew[]>([]);
    const [users, setUsers] = useState<AppUser[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState('add');
    const [editingCrew, setEditingCrew] = useState<Crew | null>(null);

    const [crewName, setCrewName] = useState('');
    const [crewType, setCrewType] = useState('');
    const [selectedBosses, setSelectedBosses] = useState<string[]>([]);
    const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!campID) {
            setIsLoading(false);
            return;
        }

        const crewsRef = ref(database, `camps/${campID}/crews`);
        const usersRef = ref(database, 'users');
        
        const unsubs: (() => void)[] = [];

        unsubs.push(onValue(crewsRef, (snapshot) => {
            const crewsData = snapshot.val() || {};
            const crewsArray = Object.keys(crewsData).map(id => ({ id, ...crewsData[id] }));
            setCrews(crewsArray);
        }));

        unsubs.push(onValue(usersRef, (snapshot) => {
            const usersData = snapshot.val() || {};
            const usersArray = Object.keys(usersData).map(id => ({ id, ...usersData[id] }));
            setUsers(usersArray);
        }));
        
        setIsLoading(false);
        return () => unsubs.forEach(unsub => unsub());

    }, [campID]);

    const usersInCamp = useMemo(() => {
        if (!campID) return [];
        return users.filter(u => u.assignedCamps && u.assignedCamps[campID]);
    }, [users, campID]);

    const getUserName = (userId: string) => users.find(u => u.id === userId)?.name || 'Unknown User';
    
    const openModal = (mode: 'add' | 'edit', crew: Crew | null = null) => {
        setModalMode(mode);
        if (mode === 'edit' && crew) {
            setEditingCrew(crew);
            setCrewName(crew.crewName);
            setCrewType(crew.crewType || '');
            setSelectedBosses(crew.crewBosses ? Object.keys(crew.crewBosses) : []);
            setSelectedMembers(usersInCamp.filter(u => u.assignedCamps?.[campID]?.crewId === crew.id).map(u => u.id));
        } else {
            setEditingCrew(null);
            setCrewName('');
            setCrewType('');
            setSelectedBosses([]);
            setSelectedMembers([]);
        }
        setIsModalOpen(true);
    };

    const handleSaveCrew = async () => {
        if (!crewName) {
            alert("Crew name is required.");
            return;
        }
        setIsSaving(true);
        const crewData = {
            crewName: crewName,
            crewType: crewType,
            crewBosses: selectedBosses.reduce((acc, bossId) => ({ ...acc, [bossId]: true }), {})
        };
        
        const crewId = modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/crews`)).key : editingCrew!.id;
        const crewRef = ref(database, `camps/${campID}/crews/${crewId}`);

        const memberUpdates: Record<string, any> = {};
        usersInCamp.forEach(u => {
            const isCurrentlyInCrew = u.assignedCamps?.[campID]?.crewId === crewId;
            const shouldBeInCrew = selectedMembers.includes(u.id);
            if (isCurrentlyInCrew && !shouldBeInCrew) {
                memberUpdates[`users/${u.id}/assignedCamps/${campID}/crewId`] = null;
            } else if (!isCurrentlyInCrew && shouldBeInCrew) {
                memberUpdates[`users/${u.id}/assignedCamps/${campID}/crewId`] = crewId;
            }
        });

        try {
            await set(crewRef, crewData);
            if (Object.keys(memberUpdates).length > 0) {
                await update(ref(database), memberUpdates);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error("Error saving crew:", error);
        } finally {
            setIsSaving(false);
        }
    };
    
    const openDeleteModal = (crew: Crew) => {
        modals.openConfirmModal({
            title: `Delete ${crew.crewName}`,
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to delete this crew? This will unassign all members from this crew. This action is irreversible.
                </Text>
            ),
            labels: { confirm: 'Delete Crew', cancel: "Cancel" },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                 try {
                    await remove(ref(database, `camps/${campID}/crews/${crew.id}`));
                    const memberUpdates: Record<string, any> = {};
                    usersInCamp.forEach(u => {
                        if(u.assignedCamps?.[campID]?.crewId === crew.id) {
                            memberUpdates[`users/${u.id}/assignedCamps/${campID}/crewId`] = null;
                        }
                    });
                    if (Object.keys(memberUpdates).length > 0) {
                        await update(ref(database), memberUpdates);
                    }
                } catch (error) {
                    console.error("Error deleting crew:", error);
                }
            },
        });
    };

    if (isLoading) {
        return <Center><Loader /></Center>;
    }
    
    if (!campID) {
        return <Paper p="md" withBorder><Text c="dimmed">Please select a camp to manage crews.</Text></Paper>
    }

    const canManageAllCrews = effectiveRole >= 5;
    
    return (
        <Container>
            <Group justify="space-between" mb="xl">
                <Title order={3}>Crews</Title>
                {canManageAllCrews && (
                    <Button onClick={() => openModal('add')} leftSection={<IconPlus size={16} />}>
                        Create New Crew
                    </Button>
                )}
            </Group>

            <Accordion>
                {crews.map((crew) => {
                    const crewBosses = crew.crewBosses ? Object.keys(crew.crewBosses) : [];
                    const crewMembers = usersInCamp.filter(u => u.assignedCamps?.[campID]?.crewId === crew.id);
                    const isUserCrewBoss = crewBosses.includes(user?.uid || '');

                    return (
                        <Accordion.Item key={crew.id} value={crew.id}>
                            <Accordion.Control>
                                <Group>
                                    <ThemeIcon variant="light">
                                        <IconUsers size={20} />
                                    </ThemeIcon>
                                    <Stack gap={0}>
                                        <Text fw={500}>{crew.crewName}</Text>
                                        <Text size="xs" c="dimmed">{crew.crewType || 'No type assigned'}</Text>
                                    </Stack>
                                </Group>
                            </Accordion.Control>
                            <Accordion.Panel>
                                <Stack>
                                    <Box>
                                        <Text size="sm" fw={500}>Crew Boss(es):</Text>
                                        {crewBosses.length > 0 ? (
                                            <List size="sm" withPadding>
                                                {crewBosses.map(bossId => <List.Item key={bossId}>{getUserName(bossId)}</List.Item>)}
                                            </List>
                                        ) : (
                                            <Text size="sm" c="dimmed">No crew bosses assigned.</Text>
                                        )}
                                    </Box>
                                     <Box>
                                        <Text size="sm" fw={500}>Members ({crewMembers.length}):</Text>
                                        {crewMembers.length > 0 ? (
                                            <List size="sm" withPadding>
                                                {crewMembers.map(member => <List.Item key={member.id}>{member.name}</List.Item>)}
                                            </List>
                                        ) : (
                                            <Text size="sm" c="dimmed">No members assigned.</Text>
                                        )}
                                    </Box>
                                     <Group mt="md">
                                        {(canManageAllCrews || isUserCrewBoss) && (
                                            <Button size="xs" variant="outline" leftSection={<IconPencil size={14} />} onClick={() => openModal('edit', crew)}>Edit Crew</Button>
                                        )}
                                        {canManageAllCrews && (
                                            <Button size="xs" color="red" variant="outline" leftSection={<IconTrash size={14} />} onClick={() => openDeleteModal(crew)}>Delete Crew</Button>
                                        )}
                                    </Group>
                                </Stack>
                            </Accordion.Panel>
                        </Accordion.Item>
                    );
                })}
            </Accordion>
            
            <Modal opened={isModalOpen} onClose={() => setIsModalOpen(false)} title={modalMode === 'add' ? 'Create New Crew' : `Edit ${crewName}`}>
                <Stack>
                    <TextInput 
                        label="Crew Name"
                        placeholder="Enter crew name"
                        value={crewName}
                        onChange={(e) => setCrewName(e.currentTarget.value)}
                        required
                    />
                    <Select
                        label="Crew Type"
                        placeholder="Select a crew type"
                        data={['Planting', 'Kitchen', 'Health & Safety', 'Party Planning']}
                        value={crewType || ''}
                        onChange={(value) => setCrewType(value || '')}
                        clearable
                    />
                    <MultiSelect
                        label="Assign Crew Boss(es)"
                        placeholder="Select one or more crew bosses"
                        data={usersInCamp.map(user => ({ value: user.id, label: user.name }))}
                        value={selectedBosses}
                        onChange={setSelectedBosses}
                        searchable
                    />
                    <MultiSelect
                        label="Assign Members"
                        placeholder="Select crew members"
                        data={usersInCamp.map(user => ({ value: user.id, label: user.name }))}
                        value={selectedMembers}
                        onChange={setSelectedMembers}
                        searchable
                    />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveCrew} loading={isSaving}>Save Crew</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default CrewManagement;