'use client';

import React, { useState, useEffect, useMemo, FC } from 'react';
import { database } from '../../firebase/firebase';
import { ref, onValue, get, set, update, push as firebasePush, remove } from 'firebase/database';
import { useDisclosure } from '@mantine/hooks';
import {
    Container,
    Title,
    Paper,
    Text,
    Accordion,
    Group,
    Button,
    ActionIcon,
    Modal,
    TextInput,
    NumberInput,
    Select,
    Badge,
    SimpleGrid,
    Stack,
    Divider,
    Alert
} from '@mantine/core';
import { useModals } from '@mantine/modals';
import { IconHome, IconMapPin, IconPlus, IconPencil, IconTrash, IconChevronDown, IconCheck, IconAlertCircle } from '@tabler/icons-react';

interface CampManagementProps {
    campID: string | null;
    effectiveRole: number;
}

const CampManagement: FC<CampManagementProps> = ({ campID, effectiveRole }) => {
    const [campData, setCampData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));

    // Modal state
    const [primaryModalOpened, { open: openPrimaryModal, close: closePrimaryModal }] = useDisclosure(false);
    const [blockModalOpened, { open: openBlockModal, close: closeBlockModal }] = useDisclosure(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [editingLocation, setEditingLocation] = useState<any>(null); // For both primary and secondary

    // Form state
    const [locationName, setLocationName] = useState('');
    const [latitude, setLatitude] = useState<string | number>('');
    const [longitude, setLongitude] = useState<string | number>('');

    const modals = useModals();

    useEffect(() => {
        if (!campID) {
            setLoading(false);
            setError("No camp selected.");
            return;
        }

        const campRef = ref(database, `camps/${campID}`);
        const unsubscribe = onValue(campRef, (snapshot) => {
            if (snapshot.exists()) {
                setCampData(snapshot.val());
            } else {
                setError("Could not find data for the selected camp.");
            }
            setLoading(false);
        }, (err: any) => {
            setError("Error fetching camp data.");
            setLoading(false);
            console.error(err);
        });

        return () => unsubscribe();
    }, [campID]);

    const availableYears = useMemo(() => {
        const years = new Set(campData?.campLocations ? Object.keys(campData.campLocations) : []);
        years.add(String(currentYear));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [campData, currentYear]);

    // --- Handlers for Primary Locations ---
    const handleOpenPrimaryModal = (mode: string, location: any = null) => {
        setModalMode(mode);
        setEditingLocation(location);
        if (mode === 'edit' && location) {
            setLocationName(location.campLocationName);
            setLatitude(location.latLong.latitude);
            setLongitude(location.latLong.longitude);
        } else {
            setLocationName('');
            setLatitude('');
            setLongitude('');
        }
        openPrimaryModal();
    };

    const handlePrimaryLocationSubmit = async () => {
        if (!locationName || latitude === '' || longitude === '') {
            alert("All fields are required.");
            return;
        }
        const locationData = {
            campLocationName: locationName,
            latLong: {
                latitude: parseFloat(latitude as string),
                longitude: parseFloat(longitude as string),
            },
        };

        const path = `camps/${campID}/campLocations/${selectedYear}/${modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/campLocations/${selectedYear}`)).key : editingLocation.id}`;

        try {
            await set(ref(database, path), locationData);
            alert(`Primary location ${modalMode === 'add' ? 'added' : 'updated'} successfully.`);
            closePrimaryModal();
        } catch (e) {
            console.error(e);
            alert("Failed to save primary location.");
        }
    };

    const handleSetAsPrimary = async (locationId: string) => {
        try {
            await update(ref(database, `camps/${campID}`), { activeLocationId: locationId });
            alert("Active location updated successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to set active location.");
        }
    };

    const openDeleteConfirmModal = (type: string, id: string, name: string, primaryLocationId: string | null = null) => {
        modals.openConfirmModal({
            title: `Delete ${name}`,
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to delete this {type}? This action is irreversible.
                </Text>
            ),
            labels: { confirm: 'Delete', cancel: "Cancel" },
            confirmProps: { color: 'red' },
            onConfirm: () => {
                if (type === 'primary location') {
                    remove(ref(database, `camps/${campID}/campLocations/${selectedYear}/${id}`));
                    if (campData.activeLocationId === id) {
                        update(ref(database, `camps/${campID}`), { activeLocationId: null });
                    }
                } else if (type === 'block location' && primaryLocationId) {
                    remove(ref(database, `camps/${campID}/campLocations/${selectedYear}/${primaryLocationId}/secondaryLocations/${id}`));
                }
            },
        });
    };

    // --- Handlers for Block (Secondary) Locations ---
    const handleOpenBlockModal = (primaryLocationId: string, mode: string, block: any = null) => {
        setModalMode(mode);
        setEditingLocation({ primaryId: primaryLocationId, ...(block || {}) });
        if (mode === 'edit' && block) {
            setLocationName(block.name);
            setLatitude(block.latLong.latitude);
            setLongitude(block.latLong.longitude);
        } else {
            setLocationName('');
            setLatitude('');
            setLongitude('');
        }
        openBlockModal();
    };

    const handleBlockLocationSubmit = async () => {
        if (!locationName || latitude === '' || longitude === '') {
            alert("All fields are required.");
            return;
        }
        const blockData = {
            name: locationName,
            latLong: {
                latitude: parseFloat(latitude as string),
                longitude: parseFloat(longitude as string),
            }
        };
        const path = `camps/${campID}/campLocations/${selectedYear}/${editingLocation.primaryId}/secondaryLocations/${modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/campLocations/${selectedYear}/${editingLocation.primaryId}/secondaryLocations`)).key : editingLocation.id}`;
        try {
            await set(ref(database, path), blockData);
            alert(`Block location ${modalMode === 'add' ? 'added' : 'updated'} successfully.`);
            closeBlockModal();
        } catch (e) {
            console.error(e);
            alert("Failed to save block location.");
        }
    };


    if (loading) return <Text>Loading Camp Data...</Text>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (effectiveRole < 5) return <Alert color="red" title="Access Denied">You do not have permission to view this page.</Alert>;

    const locationsForYear = campData?.campLocations?.[selectedYear] || {};

    return (
        <Container size="md">
            <Title order={2} mb="xl">Camp Management</Title>

            <Paper withBorder p="md" shadow="sm">
                <Group justify="space-between" align="center">
                    <Select
                        label="View Locations For Year"
                        data={availableYears}
                        value={selectedYear}
                        onChange={(value) => setSelectedYear(value || String(currentYear))}
                    />
                    {effectiveRole >= 5 && (
                        <Button onClick={() => handleOpenPrimaryModal('add')} leftSection={<IconPlus size={16} />}>
                            Add New Primary Location
                        </Button>
                    )}
                </Group>
            </Paper>

            <Accordion chevron={<IconChevronDown />} mt="lg">
                {Object.entries(locationsForYear).map(([id, loc]: [string, any]) => (
                    <Accordion.Item key={id} value={id}>
                        <Accordion.Control>
                            <Group justify="space-between">
                                <Group>
                                    <IconHome />
                                    <Text fw={500}>{loc.campLocationName}</Text>
                                    {campData.activeLocationId === id && <Badge color="green">Active</Badge>}
                                </Group>
                            </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                            <Stack>
                                {effectiveRole >= 5 && (
                                    <Paper p="sm" withBorder bg="gray.0">
                                        <Title order={5} mb="sm">Manage Primary Location</Title>
                                        <Group>
                                            <Button size="xs" onClick={() => handleSetAsPrimary(id)} disabled={campData.activeLocationId === id}>Set as Active</Button>
                                            <Button size="xs" variant='outline' onClick={() => handleOpenPrimaryModal('edit', { id, ...loc })}>Edit</Button>
                                            <Button size="xs" color="red" onClick={() => openDeleteConfirmModal('primary location', id, loc.campLocationName)}>Delete</Button>
                                        </Group>
                                    </Paper>
                                )}
                                <Paper p="sm" withBorder>
                                    <Title order={5} mb="sm">Block Locations</Title>
                                    {Object.entries(loc.secondaryLocations || {}).map(([blockId, block]: [string, any]) => (
                                        <Paper key={blockId} p="xs" withBorder mb="xs">
                                            <Group justify="space-between">
                                                <Text>{block.name} ({block.latLong.latitude}, {block.latLong.longitude})</Text>
                                                <Group gap="xs">
                                                    {effectiveRole >= 4 && (
                                                        <ActionIcon variant="subtle" onClick={() => handleOpenBlockModal(id, 'edit', { id: blockId, ...block })}>
                                                            <IconPencil size={16} />
                                                        </ActionIcon>
                                                    )}
                                                    {effectiveRole >= 5 && (
                                                        <ActionIcon variant="subtle" color="red" onClick={() => openDeleteConfirmModal('block location', blockId, block.name, id)}>
                                                            <IconTrash size={16} />
                                                        </ActionIcon>
                                                    )}
                                                </Group>
                                            </Group>
                                        </Paper>
                                    ))}
                                    {effectiveRole >= 3 && (
                                        <Button size="xs" mt="sm" onClick={() => handleOpenBlockModal(id, 'add')} leftSection={<IconPlus size={14} />}>Add New Block</Button>
                                    )}
                                </Paper>
                            </Stack>
                        </Accordion.Panel>
                    </Accordion.Item>
                ))}
            </Accordion>

            <Modal opened={primaryModalOpened} onClose={closePrimaryModal} title={`${modalMode === 'add' ? 'Add' : 'Edit'} Primary Location`}>
                <Stack>
                    <TextInput label="Location Name" placeholder="e.g., Main Camp 2025" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
                    <NumberInput label="Latitude" placeholder="e.g., 53.916943" value={latitude} onChange={setLatitude} precision={6} required />
                    <NumberInput label="Longitude" placeholder="e.g., -122.749443" value={longitude} onChange={setLongitude} precision={6} required />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closePrimaryModal}>Cancel</Button>
                        <Button onClick={handlePrimaryLocationSubmit}>Save</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={blockModalOpened} onClose={closeBlockModal} title={`${modalMode === 'add' ? 'Add' : 'Edit'} Block Location`}>
                <Stack>
                    <TextInput label="Block Name" placeholder="e.g., Block 101" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
                    <NumberInput label="Latitude" placeholder="e.g., 53.916943" value={latitude} onChange={setLatitude} precision={6} required />
                    <NumberInput label="Longitude" placeholder="e.g., -122.749443" value={longitude} onChange={setLongitude} precision={6} required />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeBlockModal}>Cancel</Button>
                        <Button onClick={handleBlockLocationSubmit}>Save</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default CampManagement;
