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
    Alert,
    Tabs
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useModals } from '@mantine/modals';
import { IconHome, IconMapPin, IconPlus, IconPencil, IconTrash, IconChevronDown, IconCheck, IconAlertCircle, IconCalendar, IconTruck, IconUserMinus } from '@tabler/icons-react';
import { ROLES } from '../../lib/constants'; // Import ROLES

interface CampManagementProps {
  campID: string | null;
  effectiveRole: number;
}

const CampManagement: FC<CampManagementProps> = ({ campID, effectiveRole }) => {
    const [campData, setCampData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [allUsers, setAllUsers] = useState<any[]>([]); // State to store all users
    const [campUserUids, setCampUserUids] = useState<Set<string>>(new Set()); // State to store UIDs of users in the current camp

    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState(String(currentYear));

    // Modal state
    const [primaryModalOpened, { open: openPrimaryModal, close: closePrimaryModal }] = useDisclosure(false);
    const [blockModalOpened, { open: openBlockModal, close: closeBlockModal }] = useDisclosure(false);
    const [truckModalOpened, { open: openTruckModal, close: closeTruckModal }] = useDisclosure(false);
    const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
    const [editingLocation, setEditingLocation] = useState<any>(null); // For both primary and secondary
    const [editingTruck, setEditingTruck] = useState<any>(null);

    // Form state
    const [locationName, setLocationName] = useState('');
    const [latitude, setLatitude] = useState<string | number>('');
    const [longitude, setLongitude] = useState<string | number>('');
    const [truckName, setTruckName] = useState('');
    const [truckCapacity, setTruckCapacity] = useState<number | string>(1);

    // Calendar state
    const [seasonStartDate, setSeasonStartDate] = useState<Date | null>(null);
    const [seasonEndDate, setSeasonEndDate] = useState<Date | null>(null);
    const [locationStartDate, setLocationStartDate] = useState<Date | null>(null);
    const [locationEndDate, setLocationEndDate] = useState<Date | null>(null);
    const [shiftLength, setShiftLength] = useState<number | string>(3);


    const modals = useModals();

    useEffect(() => {
        if (!campID) {
            setLoading(false);
            setError("No camp selected.");
            return;
        }

        const campRef = ref(database, `camps/${campID}`);
        const usersInCampRef = ref(database, `camps/${campID}/users`);

        const unsubscribeCamp = onValue(campRef, (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                setCampData(data);
                if (data.seasonInfo) {
                    setSeasonStartDate(data.seasonInfo.startDate ? new Date(data.seasonInfo.startDate) : null);
                    setSeasonEndDate(data.seasonInfo.endDate ? new Date(data.seasonInfo.endDate) : null);
                }
            } else {
                setError("Could not find data for the selected camp.");
            }
            setLoading(false);
        }, (err: any) => {
            setError("Error fetching camp data.");
            setLoading(false);
            console.error(err);
        });

        const unsubscribeUsersInCamp = onValue(usersInCampRef, (snapshot) => {
            if (snapshot.exists()) {
                const uids = Object.keys(snapshot.val());
                setCampUserUids(new Set(uids));
            } else {
                setCampUserUids(new Set());
            }
        }, (err: any) => {
            console.error("Error fetching users in camp:", err);
        });

        return () => {
            unsubscribeCamp();
            unsubscribeUsersInCamp();
        };
    }, [campID]);

    // Fetch all users
    useEffect(() => {
        const usersRef = ref(database, 'users');
        const unsubscribe = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                const usersData = snapshot.val();
                const usersList = Object.entries(usersData).map(([uid, data]) => ({ uid, ...data }));
                setAllUsers(usersList);
                console.log("Fetched all users:", usersList); // Debug log
            } else {
                setAllUsers([]);
                console.log("No users found in database."); // Debug log
            }
        }, (err: any) => {
            console.error("Error fetching users:", err);
        });

        return () => unsubscribe();
    }, []);

    const availableYears = useMemo(() => {
        const years = new Set(campData?.campLocations ? Object.keys(campData.campLocations) : []);
        years.add(String(currentYear));
        return Array.from(years).sort((a, b) => b.localeCompare(a));
    }, [campData, currentYear]);

    const campUsers = useMemo(() => {
        const filteredUsers = allUsers.filter(user => campUserUids.has(user.uid));
        return filteredUsers;
    }, [allUsers, campUserUids]);

    const handleRemoveUserFromCamp = (userUid: string, userName: string) => {
        modals.openConfirmModal({
            title: `Remove ${userName} from Camp`,
            centered: true,
            children: (
                <Text size="sm">
                    Are you sure you want to remove {userName} from this camp? This will remove this camp from their assigned camps.
                </Text>
            ),
            labels: { confirm: 'Remove', cancel: "Cancel" },
            confirmProps: { color: 'red' },
            onConfirm: async () => {
                try {
                    // Remove the specific camp from the user's assignedCamps
                    await remove(ref(database, `users/${userUid}/assignedCamps/${campID}`));
                    // Remove the user from the camp's list of users
                    await remove(ref(database, `camps/${campID}/users/${userUid}`));
                    alert(`${userName} has been removed from this camp's assigned camps.`);
                } catch (e) {
                    console.error("Failed to remove user from camp:", e);
                    alert(`Failed to remove ${userName} from camp.`);
                }
            },
        });
    };

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
                } else if (type === 'truck') {
                    remove(ref(database, `camps/${campID}/trucks/${id}`));
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

    // --- Calendar Handlers ---
    const handleSaveSeasonDates = async () => {
        if (!campID || !seasonStartDate || !seasonEndDate) {
            alert("Please select both a start and end date for the season.");
            return;
        }

        const seasonData = {
            startDate: seasonStartDate.toISOString().split('T')[0],
            endDate: seasonEndDate.toISOString().split('T')[0],
        };

        try {
            await update(ref(database, `camps/${campID}/seasonInfo`), seasonData);
            alert("Season dates saved successfully.");
        } catch (e) {
            console.error(e);
            alert("Failed to save season dates.");
        }
    };

    const handleGenerateCalendar = async (locationId: string) => {
        if (!campID || !locationStartDate || !locationEndDate || !shiftLength) {
            alert("Please set the camp start date, end date, and shift length first.");
            return;
        }

        const calendarConfig = {
            startDate: locationStartDate.toISOString().split('T')[0],
            endDate: locationEndDate.toISOString().split('T')[0],
            shiftLength: typeof shiftLength === 'string' ? parseInt(shiftLength) : shiftLength,
        };

        const calendarData: { [key: string]: any } = {};
        let currentDate = new Date(locationStartDate);
        let currentShiftDay = 1;

        while (currentDate <= locationEndDate) {
            const dateString = currentDate.toISOString().split('T')[0];
            calendarData[dateString] = { shiftDay: currentShiftDay };

            if (currentShiftDay === 0) {
                currentShiftDay = 1;
            } else if (currentShiftDay >= calendarConfig.shiftLength) {
                currentShiftDay = 0;
            } else {
                currentShiftDay++;
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        try {
            await update(ref(database, `camps/${campID}/calendar`), calendarData);
            await update(ref(database, `camps/${campID}/campLocations/${selectedYear}/${locationId}/calendarConfig`), calendarConfig);
            alert("Calendar generated successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to generate calendar.");
        }
    };

    const handleAccordionChange = (value: string | null) => {
        if (value && campData?.campLocations?.[selectedYear]?.[value]?.calendarConfig) {
            const config = campData.campLocations[selectedYear][value].calendarConfig;
            setLocationStartDate(config.startDate ? new Date(config.startDate) : null);
            setLocationEndDate(config.endDate ? new Date(config.endDate) : null);
            setShiftLength(config.shiftLength || 3);
        } else {
            setLocationStartDate(null);
            setLocationEndDate(null);
            setShiftLength(3);
        }
    };

    // --- Truck Handlers ---
    const handleOpenTruckModal = (mode: string, truck: any = null) => {
        setModalMode(mode);
        setEditingTruck(truck);
        if (mode === 'edit' && truck) {
            setTruckName(truck.name);
            setTruckCapacity(truck.capacity);
        } else {
            setTruckName('');
            setTruckCapacity(1);
        }
        openTruckModal();
    };

    const handleSaveTruck = async () => {
        if (!campID || !truckName || !truckCapacity) {
            alert("All truck fields are required.");
            return;
        }

        const truckData = {
            name: truckName,
            capacity: typeof truckCapacity === 'string' ? parseInt(truckCapacity) : truckCapacity,
        };

        const path = `camps/${campID}/trucks/${modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/trucks`)).key : editingTruck.id}`;

        try {
            await set(ref(database, path), truckData);
            alert(`Truck ${modalMode === 'add' ? 'added' : 'updated'} successfully.`);
            closeTruckModal();
        } catch (e) {
            console.error(e);
            alert("Failed to save truck.");
        }
    };


    if (loading) return <Text>Loading Camp Data...</Text>;
    if (error) return <Alert color="red" title="Error">{error}</Alert>;
    if (effectiveRole < 5) return <Alert color="red" title="Access Denied">You do not have permission to view this page.</Alert>;

    const locationsForYear = campData?.campLocations?.[selectedYear] || {};
    const trucks = campData?.trucks ? Object.entries(campData.trucks).map(([id, data]) => ({ id, ...data })) : [];

    return (
        <Container size="md">
            <Title order={2} mb="xl">Camp Management</Title>

            <Tabs defaultValue="locations">
                <Tabs.List>
                    <Tabs.Tab value="locations">Camp Locations</Tabs.Tab>
                    <Tabs.Tab value="season">Season</Tabs.Tab>
                    <Tabs.Tab value="vehicles">Vehicles</Tabs.Tab>
                    <Tabs.Tab value="users">Camp Members</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="locations" pt="xs">
                    <Paper withBorder p="md" shadow="sm" mb="lg">
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

                    <Accordion chevron={<IconChevronDown />} mt="lg" onChange={handleAccordionChange}>
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
                                            <Paper p="sm" withBorder bg="gray.0" mb="md">
                                                <Title order={5} mb="sm">Manage Primary Location</Title>
                                                <Group>
                                                    <Button size="xs" onClick={() => handleSetAsPrimary(id)} disabled={campData.activeLocationId === id}>Set as Active</Button>
                                                    <Button size="xs" variant='outline' onClick={() => handleOpenPrimaryModal('edit', { id, ...loc })}>Edit</Button>
                                                    <Button size="xs" color="red" onClick={() => openDeleteConfirmModal('primary location', id, loc.campLocationName)}>Delete</Button>
                                                </Group>
                                            </Paper>
                                        )}

                                        <Paper p="sm" withBorder mb="md">
                                            <Title order={5} mb="sm">Calendar Configuration</Title>
                                            <Group grow>
                                                <DatePickerInput
                                                    label="Camp Start Date"
                                                    placeholder="Select start date"
                                                    value={locationStartDate}
                                                    onChange={setLocationStartDate}
                                                />
                                                <DatePickerInput
                                                    label="Camp End Date"
                                                    placeholder="Select end date"
                                                    value={locationEndDate}
                                                    onChange={setLocationEndDate}
                                                />
                                            </Group>
                                            <NumberInput
                                                label="Standard Shift Length"
                                                placeholder="e.g., 3"
                                                value={shiftLength}
                                                onChange={setShiftLength}
                                                min={1}
                                                mt="sm"
                                            />
                                            <Group justify="flex-end" mt="md">
                                                <Button onClick={() => handleGenerateCalendar(id)} leftSection={<IconCalendar size={16} />}>
                                                    Generate Calendar
                                                </Button>
                                            </Group>
                                        </Paper>

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
                </Tabs.Panel>

                <Tabs.Panel value="season" pt="xs">
                    <Paper withBorder p="md" shadow="sm" mb="lg">
                        <Title order={4} mb="md">Season Configuration</Title>
                        <Group grow>
                            <DatePickerInput
                                label="Season Start Date"
                                placeholder="Select start date"
                                value={seasonStartDate}
                                onChange={setSeasonStartDate}
                            />
                            <DatePickerInput
                                label="Season End Date"
                                placeholder="Select end date"
                                value={seasonEndDate}
                                onChange={setSeasonEndDate}
                            />
                        </Group>
                        <Group justify="flex-end" mt="md">
                            <Button onClick={handleSaveSeasonDates}>Save Season Dates</Button>
                        </Group>
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="vehicles" pt="xs">
                    <Paper withBorder p="md" shadow="sm" mb="lg">
                        <Group justify="space-between" align="center">
                            <Title order={4}>Truck Management</Title>
                            {effectiveRole >= 5 && (
                                <Button onClick={() => handleOpenTruckModal('add')} leftSection={<IconPlus size={16} />}>
                                    Add New Truck
                                </Button>
                            )}
                        </Group>
                        <Stack mt="md">
                            {trucks.length === 0 ? (
                                <Text c="dimmed">No trucks added yet.</Text>
                            ) : (
                                trucks.map((truck: any) => (
                                    <Paper key={truck.id} p="xs" withBorder>
                                        <Group justify="space-between">
                                            <Text>{truck.name} (Capacity: {truck.capacity})</Text>
                                            <Group gap="xs">
                                                {effectiveRole >= 5 && (
                                                    <ActionIcon variant="subtle" onClick={() => handleOpenTruckModal('edit', truck)}>
                                                        <IconPencil size={16} />
                                                    </ActionIcon>
                                                )}
                                                {effectiveRole >= 5 && (
                                                    <ActionIcon variant="subtle" color="red" onClick={() => openDeleteConfirmModal('truck', truck.id, truck.name)}>
                                                        <IconTrash size={16} />
                                                    </ActionIcon>
                                                )}
                                            </Group>
                                        </Group>
                                    </Paper>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Tabs.Panel>

                <Tabs.Panel value="users" pt="xs">
                    <Paper withBorder p="md" shadow="sm" mb="lg">
                        <Title order={4} mb="md">Users in this Camp</Title>
                        <Stack mt="md">
                            {campUsers.length === 0 ? (
                                <Text c="dimmed">No users assigned to this camp.</Text>
                            ) : (
                                campUsers.map((user: any) => (
                                    <Paper key={user.uid} p="xs" withBorder>
                                        <Group justify="space-between">
                                            <Text>{user.name || user.email} ({ROLES[user.assignedCamps?.[campID]?.role]})</Text>
                                            {effectiveRole >= 5 && (
                                                <Button
                                                    size="xs"
                                                    color="red"
                                                    leftSection={<IconUserMinus size={14} />}
                                                    onClick={() => handleRemoveUserFromCamp(user.uid, user.name || user.email)}
                                                >
                                                    Remove from Camp
                                                </Button>
                                            )}
                                        </Group>
                                    </Paper>
                                ))
                            )}
                        </Stack>
                    </Paper>
                </Tabs.Panel>
            </Tabs>

            <Modal opened={primaryModalOpened} onClose={closePrimaryModal} title={`${modalMode === 'add' ? 'Add' : 'Edit'} Primary Location`}>
                <Stack>
                    <TextInput label="Location Name" placeholder="e.g., Main Camp 2025" value={locationName} onChange={(e) => setLocationName(e.target.value)} required />
                    <NumberInput label="Latitude" placeholder="e.g., 53.916943" value={latitude} onChange={setLatitude} decimalScale={6} required />
                    <NumberInput label="Longitude" placeholder="e.g., -122.749443" value={longitude} onChange={setLongitude} decimalScale={6} required />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closePrimaryModal}>Cancel</Button>
                        <Button onClick={handlePrimaryLocationSubmit}>Save</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={blockModalOpened} onClose={closeBlockModal} title={`${modalMode === 'add' ? 'Add' : 'Edit'} Block Location`}>
                <Stack>
                    <TextInput label="Block Name" placeholder="e.g., Block 101" value={locationName} onChange={(e) => setLocationName(e.currentTarget.value)} required />
                    <NumberInput label="Latitude" placeholder="e.g., 53.916943" value={latitude} onChange={setLatitude} decimalScale={6} required />
                    <NumberInput label="Longitude" placeholder="e.g., -122.749443" value={longitude} onChange={setLongitude} decimalScale={6} required />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeBlockModal}>Cancel</Button>
                        <Button onClick={handleBlockLocationSubmit}>Save</Button>
                    </Group>
                </Stack>
            </Modal>

            <Modal opened={truckModalOpened} onClose={closeTruckModal} title={`${modalMode === 'add' ? 'Add' : 'Edit'} Truck`}>
                <Stack>
                    <TextInput label="Truck Name" placeholder="e.g., Ford F-150" value={truckName} onChange={(e) => setTruckName(e.currentTarget.value)} required />
                    <NumberInput label="Capacity" placeholder="e.g., 6" value={truckCapacity} onChange={setTruckCapacity} min={1} required />
                    <Group justify="flex-end" mt="md">
                        <Button variant="default" onClick={closeTruckModal}>Cancel</Button>
                        <Button onClick={handleSaveTruck}>Save</Button>
                    </Group>
                </Stack>
            </Modal>
        </Container>
    );
};

export default CampManagement;
