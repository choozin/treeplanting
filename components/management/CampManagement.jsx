'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  IconCalendar,
  IconChevronDown,
  IconHome,
  IconPencil,
  IconPlus,
  IconTrash,
  IconUserMinus,
} from '@tabler/icons-react';
import { push as firebasePush, onValue, ref, remove, set, update } from 'firebase/database';
import {
  Accordion,
  ActionIcon,
  Alert,
  Badge,
  Button,
  Container,
  Group,
  Modal,
  NumberInput,
  Paper,
  Select,
  Stack,
  Tabs,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { DatePickerInput } from '@mantine/dates';
import { useDisclosure } from '@mantine/hooks';
import { useModals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';
import { ROLES } from '../../lib/constants'; // Import ROLES



const CampManagement = ({ campID, effectiveRole }) => {
  const [campData, setCampData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [allUsers, setAllUsers] = useState([]); // State to store all users
  const [campUserUids, setCampUserUids] = useState(new Set()); // State to store UIDs of users in the current camp

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(String(currentYear));

  // Modal state
  const [primaryModalOpened, { open: openPrimaryModal, close: closePrimaryModal }] =
    useDisclosure(false);
  const [blockModalOpened, { open: openBlockModal, close: closeBlockModal }] = useDisclosure(false);
  const [truckModalOpened, { open: openTruckModal, close: closeTruckModal }] = useDisclosure(false);
  const [modalMode, setModalMode] = useState('add'); // 'add' or 'edit'
  const [editingLocation, setEditingLocation] = useState(null); // For both primary and secondary
  const [editingTruck, setEditingTruck] = useState(null);

  // Form state
  const [locationName, setLocationName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [truckName, setTruckName] = useState('');
  const [truckCapacity, setTruckCapacity] = useState(1);

  // Calendar state
  const [seasonStartDate, setSeasonStartDate] = useState(null);
  const [seasonEndDate, setSeasonEndDate] = useState(null);
  const [locationStartDate, setLocationStartDate] = useState(null);
  const [locationEndDate, setLocationEndDate] = useState(null);
  const [shiftLength, setShiftLength] = useState(3);
  const [selectedLocationId, setSelectedLocationId] = useState(null);

  const modals = useModals();

  useEffect(() => {
    if (!campID) {
      setLoading(false);
      setError('No camp selected.');
      return;
    }

    const campRef = ref(database, `camps/${campID}`);
    const usersInCampRef = ref(database, `camps/${campID}/users`);

    const unsubscribeCamp = onValue(
      campRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.val();
          setCampData(data);
          if (data.seasonInfo) {
            setSeasonStartDate(
              data.seasonInfo.startDate ? new Date(data.seasonInfo.startDate) : null
            );
            setSeasonEndDate(data.seasonInfo.endDate ? new Date(data.seasonInfo.endDate) : null);
          }
        } else {
          setError('Could not find data for the selected camp.');
        }
        setLoading(false);
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching camp data: ' + err.message,
          color: 'red',
        });
        setLoading(false);
      }
    );

    const unsubscribeUsersInCamp = onValue(
      usersInCampRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const uids = Object.keys(snapshot.val());
          setCampUserUids(new Set(uids));
        } else {
          setCampUserUids(new Set());
        }
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching users in camp: ' + err.message,
          color: 'red',
        });
      }
    );

    return () => {
      unsubscribeCamp();
      unsubscribeUsersInCamp();
    };
  }, [campID]);

  // Fetch all users
  useEffect(() => {
    const usersRef = ref(database, 'users');
    const unsubscribe = onValue(
      usersRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const usersData = snapshot.val();
          const usersList = Object.entries(usersData).map(([uid, data]) => ({ uid, ...data }));
          setAllUsers(usersList);
        } else {
          setAllUsers([]);
        }
      },
      (err) => {
        notifications.show({
          title: 'Error',
          message: 'Error fetching users: ' + err.message,
          color: 'red',
        });
      }
    );

    return () => unsubscribe();
  }, []);

  const availableYears = useMemo(() => {
    const years = new Set(campData?.campLocations ? Object.keys(campData.campLocations) : []);
    years.add(String(currentYear));
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [campData, currentYear]);

  const campUsers = useMemo(() => {
    const filteredUsers = allUsers.filter((user) => campUserUids.has(user.uid));
    return filteredUsers;
  }, [allUsers, campUserUids]);

  const isExtendMode = useMemo(() => {
    if (!selectedLocationId || !campData?.campLocations?.[selectedYear]?.[selectedLocationId]?.calendarConfig) {
      return false;
    }
    const currentConfig = campData.campLocations[selectedYear][selectedLocationId].calendarConfig;
    const newStartDate = locationStartDate?.toISOString().split('T')[0];
    const newEndDate = locationEndDate?.toISOString().split('T')[0];

    return (
      currentConfig.startDate === newStartDate &&
      newEndDate &&
      new Date(newEndDate) > new Date(currentConfig.endDate)
    );
  }, [selectedLocationId, campData, selectedYear, locationStartDate, locationEndDate]);

  const isShortenMode = useMemo(() => {
    if (!selectedLocationId || !campData?.campLocations?.[selectedYear]?.[selectedLocationId]?.calendarConfig) {
      return false;
    }
    const currentConfig = campData.campLocations[selectedYear][selectedLocationId].calendarConfig;
    const newStartDate = locationStartDate?.toISOString().split('T')[0];
    const newEndDate = locationEndDate?.toISOString().split('T')[0];

    return (
      currentConfig.startDate === newStartDate &&
      newEndDate &&
      new Date(newEndDate) < new Date(currentConfig.endDate)
    );
  }, [selectedLocationId, campData, selectedYear, locationStartDate, locationEndDate]);

  const handleRemoveUserFromCamp = (userUid, userName) => {
    modals.openConfirmModal({
      title: `Remove ${userName} from Camp`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to remove {userName} from this camp? This will remove this camp from
          their assigned camps.
        </Text>
      ),
      labels: { confirm: 'Remove', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          // Remove the specific camp from the user's assignedCamps
          await remove(ref(database, `users/${userUid}/assignedCamps/${campID}`));
          // Remove the user from the camp's list of users
          await remove(ref(database, `camps/${campID}/users/${userUid}`));
          notifications.show({
            title: 'User Removed',
            message: `${userName} has been removed from this camp's assigned camps.`,
            color: 'green',
          });
        } catch (e) {
          notifications.show({
            title: 'Error',
            message: `Failed to remove user from camp: ${e.message}`,
            color: 'red',
          });
        }
      },
    });
  };

  // --- Handlers for Primary Locations ---
  const handleOpenPrimaryModal = (mode, location = null) => {
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
      notifications.show({
        title: 'Error',
        message: 'All fields are required.',
        color: 'red',
      });
      return;
    }
    const locationData = {
      campLocationName: locationName,
      latLong: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    };

    const path = `camps/${campID}/campLocations/${selectedYear}/${modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/campLocations/${selectedYear}`)).key : editingLocation.id}`;

    try {
      await set(ref(database, path), locationData);
      notifications.show({
        title: 'Success',
        message: `Primary location ${modalMode === 'add' ? 'added' : 'updated'} successfully.`,
        color: 'green',
      });
      closePrimaryModal();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save primary location: ' + e.message,
        color: 'red',
      });
    };

  const handleSetAsPrimary = async (locationId) => {
    try {
      await update(ref(database, `camps/${campID}`), { activeLocationId: locationId });
      notifications.show({
        title: 'Success',
        message: 'Active location updated successfully.',
        color: 'green',
      });
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Failed to set active location: ' + e.message,
        color: 'red',
      });
    }

  const openDeleteConfirmModal = (
    type,
    id,
    name,
    primaryLocationId = null
  ) => {
    modals.openConfirmModal({
      title: `Delete ${name}`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this {type}? This action is irreversible.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: () => {
        if (type === 'primary location') {
          remove(ref(database, `camps/${campID}/campLocations/${selectedYear}/${id}`));
          if (campData.activeLocationId === id) {
            update(ref(database, `camps/${campID}`), { activeLocationId: null });
          }
        } else if (type === 'block location' && primaryLocationId) {
          remove(
            ref(
              database,
              `camps/${campID}/campLocations/${selectedYear}/${primaryLocationId}/secondaryLocations/${id}`
            )
          );
        } else if (type === 'truck') {
          remove(ref(database, `camps/${campID}/trucks/${id}`));
        }
      },
    });
  };

  // --- Handlers for Block (Secondary) Locations ---
  const handleOpenBlockModal = (primaryLocationId, mode, block = null) => {
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
      notifications.show({
        title: 'Error',
        message: 'All fields are required.',
        color: 'red',
      });
      return;
    }
    const blockData = {
      name: locationName,
      latLong: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
      },
    };
    const path = `camps/${campID}/campLocations/${selectedYear}/${editingLocation.primaryId}/secondaryLocations/${modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/campLocations/${selectedYear}/${editingLocation.primaryId}/secondaryLocations`)).key : editingLocation.id}`;
    try {
      await set(ref(database, path), blockData);
      notifications.show({
        title: 'Success',
        message: `Block location ${modalMode === 'add' ? 'added' : 'updated'} successfully.`,
        color: 'green',
      });
      closeBlockModal();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save block location: ' + e.message,
        color: 'red',
      });
    }
  };

  // --- Calendar Handlers ---
  const handleSaveSeasonDates = async () => {
    if (!campID || !seasonStartDate || !seasonEndDate) {
      notifications.show({
        title: 'Error',
        message: 'Please select both a start and end date for the season.',
        color: 'red',
      });
      return;
    }

    const seasonData = {
      startDate: seasonStartDate.toISOString().split('T')[0],
      endDate: seasonEndDate.toISOString().split('T')[0],
    };

    try {
      await update(ref(database, `camps/${campID}/seasonInfo`), seasonData);
      notifications.show({
        title: 'Success',
        message: 'Season dates saved successfully.',
        color: 'green',
      });
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save season dates: ' + e.message,
        color: 'red',
      });
    }
  };

  const handleUpdateCalendar = async (locationId) => {
    if (!campID || !locationStartDate || !locationEndDate || !shiftLength) {
      notifications.show({
        title: 'Error',
        message: 'Please set the camp start date, end date, and shift length first.',
        color: 'red',
      });
      return;
    }

    const currentCalendarConfig = campData?.campLocations?.[selectedYear]?.[locationId]?.calendarConfig;
    const currentCalendarData = campData?.calendar; // Assuming calendar data is directly under campID/calendar

    const newStartDate = locationStartDate.toISOString().split('T')[0];
    const newEndDate = locationEndDate.toISOString().split('T')[0];
    const newShiftLength = typeof shiftLength === 'string' ? parseInt(shiftLength, 10) : shiftLength;

    let calendarToUpdate = {};
    let startingShiftDay = 1;
    let startDateForGeneration = new Date(locationStartDate);

    const isExtending = (
      currentCalendarConfig &&
      currentCalendarData &&
      currentCalendarConfig.startDate === newStartDate &&
      new Date(newEndDate) > new Date(currentCalendarConfig.endDate)
    );

    const isShortening = (
      currentCalendarConfig &&
      currentCalendarData &&
      currentCalendarConfig.startDate === newStartDate &&
      new Date(newEndDate) < new Date(currentCalendarConfig.endDate)
    );

    if (isExtending) {
      // Extend existing calendar
      calendarToUpdate = { ...currentCalendarData };
      startDateForGeneration = new Date(currentCalendarConfig.endDate);
      startDateForGeneration.setDate(startDateForGeneration.getDate() + 1); // Start from the day after the old end date

      // Find the last shift day from the existing calendar
      const sortedDates = Object.keys(currentCalendarData).sort();
      if (sortedDates.length > 0) {
        const lastDate = sortedDates[sortedDates.length - 1];
        startingShiftDay = currentCalendarData[lastDate]?.shiftDay;
        // If the last day was a day off (0), the next day starts a new cycle (1)
        if (startingShiftDay === 0) {
          startingShiftDay = 1;
        } else if (startingShiftDay >= newShiftLength) {
          // If the last day was the end of a cycle, the next day is a day off (0)
          startingShiftDay = 0;
        } else {
          // Otherwise, increment the shift day
          startingShiftDay++;
        }
      }
    } else if (isShortening) {
      // Shorten existing calendar
      calendarToUpdate = {};
      for (const dateString in currentCalendarData) {
        if (new Date(dateString) <= new Date(newEndDate)) {
          calendarToUpdate[dateString] = currentCalendarData[dateString];
        }
      }
      notifications.show({
        title: 'Info',
        message: 'Shortening calendar. Dates beyond the new end date will be removed.',
        color: 'orange',
      });
    } else {
      // Generate new calendar from scratch
      notifications.show({
        title: 'Info',
        message: 'Generating new calendar. Existing calendar data will be overwritten.',
        color: 'orange',
      });
    }

    // Only proceed with date generation if not shortening or if extending
    if (!isShortening) {
      let currentDate = startDateForGeneration;
      let currentShiftDay = startingShiftDay;

      while (currentDate <= locationEndDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        calendarToUpdate[dateString] = { shiftDay: currentShiftDay };

        if (currentShiftDay === 0) {
          currentShiftDay = 1;
        } else if (currentShiftDay >= newShiftLength) {
          currentShiftDay = 0;
        } else {
          currentShiftDay++;
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }
    }

    const updatedCalendarConfig = {
      startDate: newStartDate,
      endDate: newEndDate,
      shiftLength: newShiftLength,
    };

    try {
      await update(ref(database, `camps/${campID}/calendar`), calendarToUpdate);
      await update(
        ref(database, `camps/${campID}/campLocations/${selectedYear}/${locationId}/calendarConfig`),
        updatedCalendarConfig
      );
      notifications.show({
        title: 'Success',
        message: `Calendar ${isExtending ? 'extended' : 'generated'} successfully!`,
        color: 'green',
      });
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: `Failed to ${isExtending ? 'extend' : 'generate'} calendar: ${e.message}`,
        color: 'red',
      });
    }
  };

  const handleAccordionChange = (value) => {
    setSelectedLocationId(value);
    if (value && campData?.campLocations?.[selectedYear]?.[value]?.calendarConfig) {
      const config = campData.campLocations[selectedYear][value].calendarConfig;
      setLocationStartDate(config.startDate ? new Date(config.startDate) : null);
      setLocationEndDate(config.endDate ? new Date(config.endDate + 'T12:00:00') : null);
      setShiftLength(config.shiftLength || 3);
    } else {
      setLocationStartDate(null);
      setLocationEndDate(null);
      setShiftLength(3);
    }
  };

  // --- Truck Handlers ---
  const handleOpenTruckModal = (mode, truck = null) => {
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
      notifications.show({
        title: 'Error',
        message: 'All truck fields are required.',
        color: 'red',
      });
      return;
    }

    const truckData = {
      name: truckName,
      capacity: typeof truckCapacity === 'string' ? parseInt(truckCapacity) : truckCapacity,
    };

    const path = `camps/${campID}/trucks/${modalMode === 'add' ? firebasePush(ref(database, `camps/${campID}/trucks`)).key : editingTruck.id}`;

    try {
      await set(ref(database, path), truckData);
      notifications.show({
        title: 'Success',
        message: `Truck ${modalMode === 'add' ? 'added' : 'updated'} successfully.`,
        color: 'green',
      });
      closeTruckModal();
    } catch (e) {
      notifications.show({
        title: 'Error',
        message: 'Failed to save truck: ' + e.message,
        color: 'red',
      });
    }
  };

  if (loading) return <Text>Loading Camp Data...</Text>;
  if (error)
    return (
      <Alert color="red" title="Error">
        {error}
      </Alert>
    );
  if (effectiveRole < 5)
    return (
      <Alert color="red" title="Access Denied">
        You do not have permission to view this page.
      </Alert>
    );

  const locationsForYear = campData?.campLocations?.[selectedYear] || {};
  const trucks = campData?.trucks
    ? Object.entries(campData.trucks).map(([id, data]) => ({ id, ...data }))
    : [];

  return (
    <Container size="md">
      <Title order={2} mb="xl">
        Camp Management
      </Title>

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
                <Button
                  onClick={() => handleOpenPrimaryModal('add')}
                  leftSection={<IconPlus size={16} />}
                >
                  Add New Primary Location
                </Button>
              )}
            </Group>
          </Paper>

          <Accordion chevron={<IconChevronDown />} mt="lg" onChange={handleAccordionChange}>
            {Object.entries(locationsForYear).map(([id, loc]) => (
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
                        <Title order={5} mb="sm">
                          Manage Primary Location
                        </Title>
                        <Group>
                          <Button
                            size="xs"
                            onClick={() => handleSetAsPrimary(id)}
                            disabled={campData.activeLocationId === id}
                          >
                            Set as Active
                          </Button>
                          <Button
                            size="xs"
                            variant="outline"
                            onClick={() => handleOpenPrimaryModal('edit', { id, ...loc })}
                          >
                            Edit
                          </Button>
                          <Button
                            size="xs"
                            color="red"
                            onClick={() =>
                              openDeleteConfirmModal('primary location', id, loc.campLocationName)
                            }
                          >
                            Delete
                          </Button>
                        </Group>
                      </Paper>
                    )}

                    <Paper p="sm" withBorder mb="md">
                      <Title order={5} mb="sm">
                        Calendar Configuration
                      </Title>
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
                        <Button
                          onClick={() => handleUpdateCalendar(id)}
                          leftSection={<IconCalendar size={16} />}
                        >
                          {isShortenMode ? 'Shorten Calendar' : (isExtendMode ? 'Extend Calendar' : 'Generate Calendar')}
                        </Button>
                      </Group>
                    </Paper>

                    <Paper p="sm" withBorder>
                      <Title order={5} mb="sm">
                        Block Locations
                      </Title>
                      {Object.entries(loc.secondaryLocations || {}).map(
                        ([blockId, block]) => (
                          <Paper key={blockId} p="xs" withBorder mb="xs">
                            <Group justify="space-between">
                              <Text>
                                {block.name} ({block.latLong.latitude}, {block.latLong.longitude})
                              </Text>
                              <Group gap="xs">
                                {effectiveRole >= 4 && (
                                  <ActionIcon
                                    variant="subtle"
                                    onClick={() =>
                                      handleOpenBlockModal(id, 'edit', { id: blockId, ...block })
                                    }
                                  >
                                    <IconPencil size={16} />
                                  </ActionIcon>
                                )}
                                {effectiveRole >= 5 && (
                                  <ActionIcon
                                    variant="subtle"
                                    color="red"
                                    onClick={() =>
                                      openDeleteConfirmModal(
                                        'block location',
                                        blockId,
                                        block.name,
                                        id
                                      )
                                    }
                                  >
                                    <IconTrash size={16} />
                                  </ActionIcon>
                                )}
                              </Group>
                            </Group>
                          </Paper>
                        )
                      )}
                      {effectiveRole >= 3 && (
                        <Button
                          size="xs"
                          mt="sm"
                          onClick={() => handleOpenBlockModal(id, 'add')}
                          leftSection={<IconPlus size={14} />}
                        >
                          Add New Block
                        </Button>
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
            <Title order={4} mb="md">
              Season Configuration
            </Title>
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
                <Button
                  onClick={() => handleOpenTruckModal('add')}
                  leftSection={<IconPlus size={16} />}
                >
                  Add New Truck
                </Button>
              )}
            </Group>
            <Stack mt="md">
              {trucks.length === 0 ? (
                <Text c="dimmed">No trucks added yet.</Text>
              ) : (
                trucks.map((truck) => (
                  <Paper key={truck.id} p="xs" withBorder>
                    <Group justify="space-between">
                      <Text>
                        {truck.name} (Capacity: {truck.capacity})
                      </Text>
                      <Group gap="xs">
                        {effectiveRole >= 5 && (
                          <ActionIcon
                            variant="subtle"
                            onClick={() => handleOpenTruckModal('edit', truck)}
                          >
                            <IconPencil size={16} />
                          </ActionIcon>
                        )}
                        {effectiveRole >= 5 && (
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => openDeleteConfirmModal('truck', truck.id, truck.name)}
                          >
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
            <Title order={4} mb="md">
              Users in this Camp
            </Title>
            <Stack mt="md">
              {campUsers.length === 0 ? (
                <Text c="dimmed">No users assigned to this camp.</Text>
              ) : (
                campUsers.map((user) => (
                  <Paper key={user.uid} p="xs" withBorder>
                    <Group justify="space-between">
                      <Text>
                        {user.name || user.email} ({ROLES[user.assignedCamps?.[campID]?.role]})
                      </Text>
                      {effectiveRole >= 5 && (
                        <Button
                          size="xs"
                          color="red"
                          leftSection={<IconUserMinus size={14} />}
                          onClick={() =>
                            handleRemoveUserFromCamp(user.uid, user.name || user.email)
                          }
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

      <Modal
        opened={primaryModalOpened}
        onClose={closePrimaryModal}
        title={`${modalMode === 'add' ? 'Add' : 'Edit'} Primary Location`}
      >
        <Stack>
          <TextInput
            label="Location Name"
            placeholder="e.g., Main Camp 2025"
            value={locationName}
            onChange={(e) => setLocationName(e.target.value)}
            required
          />
          <NumberInput
            label="Latitude"
            placeholder="e.g., 53.916943"
            value={latitude}
            onChange={setLatitude}
            decimalScale={6}
            required
          />
          <NumberInput
            label="Longitude"
            placeholder="e.g., -122.749443"
            value={longitude}
            onChange={setLongitude}
            decimalScale={6}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closePrimaryModal}>
              Cancel
            </Button>
            <Button onClick={handlePrimaryLocationSubmit}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={blockModalOpened}
        onClose={closeBlockModal}
        title={`${modalMode === 'add' ? 'Add' : 'Edit'} Block Location`}
      >
        <Stack>
          <TextInput
            label="Block Name"
            placeholder="e.g., Block 101"
            value={locationName}
            onChange={(e) => setLocationName(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Latitude"
            placeholder="e.g., 53.916943"
            value={latitude}
            onChange={setLatitude}
            decimalScale={6}
            required
          />
          <NumberInput
            label="Longitude"
            placeholder="e.g., -122.749443"
            value={longitude}
            onChange={setLongitude}
            decimalScale={6}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeBlockModal}>
              Cancel
            </Button>
            <Button onClick={handleBlockLocationSubmit}>Save</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal
        opened={truckModalOpened}
        onClose={closeTruckModal}
        title={`${modalMode === 'add' ? 'Add' : 'Edit'} Truck`}
      >
        <Stack>
          <TextInput
            label="Truck Name"
            placeholder="e.g., Ford F-150"
            value={truckName}
            onChange={(e) => setTruckName(e.currentTarget.value)}
            required
          />
          <NumberInput
            label="Capacity"
            placeholder="e.g., 6"
            value={truckCapacity}
            onChange={setTruckCapacity}
            min={1}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeTruckModal}>
              Cancel
            </Button>
            <Button onClick={handleSaveTruck}>Save</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default CampManagement;