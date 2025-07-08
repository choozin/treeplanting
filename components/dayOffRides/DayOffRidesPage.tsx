'use client';

import React, { useState, useEffect } from 'react';
import { Container, Title, Text, Paper, Group, Button, Stack, Loader, Modal, Select, NumberInput, Switch, Center, MultiSelect } from '@mantine/core';
import { TimeInput, DatePickerInput } from '@mantine/dates';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, push as firebasePush, set, remove, update } from 'firebase/database';
import { useDisclosure } from '@mantine/hooks';
import { IconClock, IconUsers, IconTrash, IconPencil } from '@tabler/icons-react';
import { useModals } from '@mantine/modals';

interface DayOffRidesPageProps {
  campID: string | null;
  effectiveRole: number;
}

interface Truck {
    id: string;
    name: string;
    capacity: number;
}

interface Ride {
    id: string;
    driverId: string;
    truckId: string;
    departureTime: string;
    expectedReturnTime: string | null;
    passengersCapacity: number;
    allowSignUps: boolean;
    passengers: { [key: string]: boolean };
    createdAt: string;
    rideDate: string; // New field to store the YYYY-MM-DD date of the ride
}

interface CalendarDay {
    shiftDay: number;
}

interface RideRequest {
    id: string;
    userId: string;
    requestedTime: string;
    rideDate: string;
    createdAt: string;
}

interface AppUser {
    id: string;
    name: string;
    nickname?: string;
    email: string;
    role: number;
}

const DayOffRidesPage: React.FC<DayOffRidesPageProps> = ({ campID, effectiveRole }) => {
  const { user } = useAuth();
  const modals = useModals();
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);
  const [calendarData, setCalendarData] = useState<{[key: string]: CalendarDay} | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [users, setUsers] = useState<AppUser[]>([]); // New state for all users
  const [loadingTrucks, setLoadingTrucks] = useState(true);
  const [loadingDriverStatus, setLoadingDriverStatus] = useState(true);
  const [loadingRides, setLoadingRides] = useState(true);
  const [loadingCalendar, setLoadingCalendar] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true); // New loading state for users
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]); // New state for ride requests
  const [loadingRideRequests, setLoadingRideRequests] = useState(true); // New loading state for ride requests

  // Ride creation modal state
  const [createRideModalOpened, { open: openCreateRideModal, close: closeCreateRideModal }] = useDisclosure(false);
  const [selectedTruckId, setSelectedTruckId] = useState<string | null>(null);
  const [departureTime, setDepartureTime] = useState<string>('');
  const [expectedReturnTime, setExpectedReturnTime] = useState<string>('');
  const [passengersCapacity, setPassengersCapacity] = useState<number>(6);
  const [allowSignUps, setAllowSignUps] = useState<boolean>(true);
  const [selectedRideDate, setSelectedRideDate] = useState<Date | null>(null);
  const [availableDayOffDates, setAvailableDayOffDates] = useState<Date[]>([]);

  // Ride Request modal state
  const [requestRideModalOpened, { open: openRequestRideModal, close: closeRequestRideModal }] = useDisclosure(false);
  const [requestedDepartureTime, setRequestedDepartureTime] = useState<string>('');

  // Ride Edit modal state
  const [editRideModalOpened, { open: openEditRideModal, close: closeEditRideModal }] = useDisclosure(false);
  const [editingRide, setEditingRide] = useState<Ride | null>(null);
  const [editDepartureTime, setEditDepartureTime] = useState<string>('');
  const [editExpectedReturnTime, setEditExpectedReturnTime] = useState<string | null>(null);
  const [editAllowSignUps, setEditAllowSignUps] = useState<boolean>(true);
  const [passengersToKeep, setPassengersToKeep] = useState<string[]>([]);

  // Helper to format UTC dates consistently as YYYY-MM-DD
  const formatUTCDate = (date: Date | null) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (!campID) {
        setLoadingTrucks(false);
        setLoadingRides(false);
        setLoadingCalendar(false);
        return;
    }

    const trucksRef = ref(database, `camps/${campID}/trucks`);
    const ridesRef = ref(database, `camps/${campID}/dayOffRides`);
    const calendarRef = ref(database, `camps/${campID}/calendar`);
    const usersRef = ref(database, 'users');
    const rideRequestsRef = ref(database, `camps/${campID}/rideRequests`);

    const unsubs: (() => void)[] = [];

    unsubs.push(onValue(trucksRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const loadedTrucks: Truck[] = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            setTrucks(loadedTrucks);
        } else {
            setTrucks([]);
        }
        setLoadingTrucks(false);
    }));

    unsubs.push(onValue(ridesRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            const loadedRides: Ride[] = Object.keys(data).map(key => ({
                id: key,
                ...data[key]
            }));
            setRides(loadedRides);
        } else {
            setRides([]);
        }
        setLoadingRides(false);
    }));

    unsubs.push(onValue(calendarRef, (snapshot) => {
        const calData = snapshot.val();
        setCalendarData(calData);
        setLoadingCalendar(false);

        // Populate available day off dates
        if (calData) {
            const today = new Date();
            // Set today to midnight UTC to ensure consistent comparison
            const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
            
            const dates: Date[] = [];
            const sortedDates = Object.keys(calData).sort();
            for (const dateString of sortedDates) {
                // Create date objects as UTC to avoid timezone issues
                const date = new Date(dateString + 'T00:00:00Z'); 
                if (date >= todayUTC && calData[dateString].shiftDay === 0) {
                    dates.push(date);
                }
            }
            setAvailableDayOffDates(dates);
            if (dates.length > 0) {
                setSelectedRideDate(dates[0]); // Set default to the first available day off
            }
        }
    }));

    unsubs.push(onValue(usersRef, (snapshot) => {
        const usersData = snapshot.val() || {};
        const usersArray = Object.keys(usersData).map(id => ({ id, ...usersData[id] }));
        setUsers(usersArray);
        setLoadingUsers(false);
    }));

    unsubs.push(onValue(rideRequestsRef, (snapshot) => {
        const requestsData = snapshot.val() || {};
        const requestsArray = Object.keys(requestsData).map(id => ({
            id: id,
            ...requestsData[id]
        }));
        setRideRequests(requestsArray);
        setLoadingRideRequests(false);
    }));

    return () => unsubs.forEach(unsub => unsub());
  }, [campID]);

  useEffect(() => {
    if (!user || !campID) {
        setLoadingDriverStatus(false);
        return;
    }

    const userRef = ref(database, `users/${user.uid}/assignedCamps/${campID}`);
    const unsubscribeUser = onValue(userRef, (snapshot) => {
        const assignedCampData = snapshot.val();
        if (assignedCampData && assignedCampData.crewId) {
            const crewRef = ref(database, `camps/${campID}/crews/${assignedCampData.crewId}`);
            const unsubscribeCrew = onValue(crewRef, (crewSnapshot) => {
                const crewData = crewSnapshot.val();
                if (crewData && crewData.crewType === 'Drivers') {
                    setIsDriver(true);
                } else {
                    setIsDriver(false);
                }
                setLoadingDriverStatus(false);
            });
            return () => unsubscribeCrew();
        } else {
            setIsDriver(false);
            setLoadingDriverStatus(false);
        }
    });

    return () => unsubscribeUser();
  }, [user, campID]);

  const handleCreateRide = async () => {
    if (!selectedTruckId || !departureTime || !user || !selectedRideDate) {
      alert("Please select a truck, departure time, and ride date.");
      return;
    }

    const newRide = {
      driverId: user.uid,
      truckId: selectedTruckId,
      departureTime: departureTime,
      expectedReturnTime: expectedReturnTime || null,
      passengersCapacity: passengersCapacity,
      allowSignUps: allowSignUps,
      passengers: { [user.uid]: true }, // Driver is automatically a passenger
      createdAt: new Date().toISOString(), // Keep for general record, but use rideDate for filtering
      rideDate: selectedRideDate.toISOString().split('T')[0],
    };

    try {
      const ridesRef = ref(database, `camps/${campID}/dayOffRides`);
      await firebasePush(ridesRef, newRide);
      alert("Ride created successfully!");
      closeCreateRideModal();
      // Reset form fields
      setSelectedTruckId(null);
      setDepartureTime('');
      setExpectedReturnTime('');
      setPassengersCapacity(6);
      setAllowSignUps(true);
      // setSelectedRideDate(null); // Don't reset, keep the current selected date
    } catch (error) {
      console.error("Error creating ride:", error);
      alert("Failed to create ride.");
    }
  };

  const getTruckName = (truckId: string) => {
    const truck = trucks.find(t => t.id === truckId);
    return truck ? truck.name : 'Unknown Truck';
  };

  const getUserDisplayName = (userId: string) => {
    const appUser = users.find(u => u.id === userId);
    return appUser ? (appUser.nickname || appUser.name) : 'Unknown User';
  };

  const formatTime12Hour = (time24: string | null, ish: boolean = false) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes);
    
    if (ish) {
      return date.toLocaleTimeString([], { hour: 'numeric' }) + '-ish';
    } else {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
  };

  const convert12HourTo24Hour = (time12: string) => {
    const [time, ampm] = time12.split(' ');
    let [hours] = time.split(':').map(Number);

    if (ampm === 'PM' && hours !== 12) {
      hours += 12;
    } else if (ampm === 'AM' && hours === 12) {
      hours = 0;
    }
    return `${hours.toString().padStart(2, '0')}:00`;
  };

  const handleSignUp = async (rideId: string) => {
    if (!user || !campID) return;
    try {
      const rideRef = ref(database, `camps/${campID}/dayOffRides/${rideId}/passengers/${user.uid}`);
      await set(rideRef, true);
      alert("Signed up for ride!");
    } catch (error) {
      console.error("Error signing up for ride:", error);
      alert("Failed to sign up for ride.");
    }
  };

  const handleCancelSignUp = async (rideId: string) => {
    if (!user || !campID) return;
    try {
      const rideRef = ref(database, `camps/${campID}/dayOffRides/${rideId}/passengers/${user.uid}`);
      await set(rideRef, null);
      alert("Cancelled ride sign-up.");
    } catch (error) {
      console.error("Error cancelling ride sign-up:", error);
      alert("Failed to cancel ride sign-up.");
    }
  };

  const handleRequestRide = async () => {
    if (!user || !campID || !requestedDepartureTime || !selectedRideDate) {
      alert("Please select a departure time and a ride date.");
      return;
    }

    const newRequest = {
      userId: user.uid,
      requestedTime: requestedDepartureTime,
      rideDate: formatUTCDate(selectedRideDate),
      createdAt: new Date().toISOString(),
    };

    try {
      const requestsRef = ref(database, `camps/${campID}/rideRequests`);
      await firebasePush(requestsRef, newRequest);
      alert("Ride request submitted successfully!");
      closeRequestRideModal();
      setRequestedDepartureTime(''); // Reset form field
    } catch (error) {
      console.error("Error submitting ride request:", error);
      alert("Failed to submit ride request.");
    }
  };

  const handleEditRide = (ride: Ride) => {
    setEditingRide(ride);
    setEditDepartureTime(ride.departureTime);
    setEditExpectedReturnTime(ride.expectedReturnTime || null);
    setEditAllowSignUps(ride.allowSignUps);
    setPassengersToKeep(Object.keys(ride.passengers || {}));
    openEditRideModal();
  };

  const handleSaveEditedRide = async () => {
    if (!editingRide || !campID || !editDepartureTime) {
      alert("Missing ride data or departure time.");
      return;
    }

    try {
      const rideRef = ref(database, `camps/${campID}/dayOffRides/${editingRide.id}`);
      await update(rideRef, {
        departureTime: editDepartureTime,
        expectedReturnTime: editExpectedReturnTime === '' ? null : editExpectedReturnTime,
        allowSignUps: editAllowSignUps,
      });

      // Determine which passengers were removed
      const originalPassengers = Object.keys(editingRide.passengers || {});
      const passengersRemoved = originalPassengers.filter(
        (passengerId) => !passengersToKeep.includes(passengerId)
      );

      for (const passengerId of passengersRemoved) {
        // Remove from ride
        await remove(ref(database, `camps/${campID}/dayOffRides/${editingRide.id}/passengers/${passengerId}`));

        // Re-add to ride requests
        const newRequest = {
          userId: passengerId,
          requestedTime: editingRide.departureTime, // Use original departure time for request
          rideDate: editingRide.rideDate,
          createdAt: new Date().toISOString(),
        };
        await firebasePush(ref(database, `camps/${campID}/rideRequests`), newRequest);
      }

      alert("Ride updated successfully!");
      closeEditRideModal();
      setEditingRide(null);
    } catch (error) {
      console.error("Error saving edited ride:", error);
      alert("Failed to save edited ride.");
    }
  };

  const handleDeleteRide = (ride: Ride) => {
    modals.openConfirmModal({
      title: `Delete Ride for ${formatUTCDate(selectedRideDate)}?`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete this ride? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete Ride', cancel: "Cancel" },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        if (!campID) return;
        try {
          // Remove the ride itself
          await remove(ref(database, `camps/${campID}/dayOffRides/${ride.id}`));

          // Remove passengers from the ride (optional, as ride is deleted, but good for data consistency)
          if (ride.passengers) {
            const passengerUpdates: Record<string, any> = {};
            Object.keys(ride.passengers).forEach(passengerId => {
              passengerUpdates[`camps/${campID}/dayOffRides/${ride.id}/passengers/${passengerId}`] = null;
            });
            await update(ref(database), passengerUpdates);
          }
          alert("Ride deleted successfully!");
        } catch (error) {
          console.error("Error deleting ride:", error);
          alert("Failed to delete ride. Please check console for details.");
        }
      },
    });
  };

  const handleAddPassengerToRide = async (passengerId: string, requestId: string) => {
    if (!user || !campID || !currentDriverRide) {
      alert("You must have an active ride to add passengers.");
      return;
    }

    // Check if the ride has capacity
    const currentPassengersCount = Object.keys(currentDriverRide.passengers || {}).length;
    if (currentPassengersCount >= currentDriverRide.passengersCapacity) {
      alert("Your ride is full.");
      return;
    }

    try {
      // Add passenger to the driver's current ride
      const ridePassengersRef = ref(database, `camps/${campID}/dayOffRides/${currentDriverRide.id}/passengers/${passengerId}`);
      await set(ridePassengersRef, true);

      // Remove the ride request
      const requestRef = ref(database, `camps/${campID}/rideRequests/${requestId}`);
      try {
        await remove(requestRef);
      } catch (removeError) {
        console.error("Error removing ride request:", removeError);
        alert("Failed to remove ride request. Please remove it manually if necessary.");
      }

      alert(`${getUserDisplayName(passengerId)} added to your ride and request removed.`);
    } catch (error) {
      console.error("Error adding passenger to ride:", error);
      alert("Failed to add passenger to ride. Please check console for details.");
    }
  };

  const handleDeleteRequest = (request: RideRequest) => {
    modals.openConfirmModal({
      title: `Delete Ride Request?`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to delete your ride request? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete Request', cancel: "Cancel" },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        if (!campID) return;
        try {
          await remove(ref(database, `camps/${campID}/rideRequests/${request.id}`));
          alert("Ride request deleted successfully!");
        } catch (error) {
          console.error("Error deleting ride request:", error);
          alert("Failed to delete ride request. Please check console for details.");
        }
      },
    });
  };

  const filteredRides = rides.filter(ride => {
    return ride.rideDate === formatUTCDate(selectedRideDate);
  });

  const filteredRideRequests = rideRequests.filter(request => {
    return request.rideDate === formatUTCDate(selectedRideDate);
  });

  const getAvailableTrucks = () => {
    if (!selectedRideDate) return [];
    const selectedDateString = formatUTCDate(selectedRideDate);
    const trucksWithRides = new Set(rides
      .filter(ride => ride.rideDate === selectedDateString)
      .map(ride => ride.truckId));
    return trucks.filter(truck => !trucksWithRides.has(truck.id));
  };

  const currentDriverRide = rides.find(ride => 
    ride.driverId === user?.uid && ride.rideDate === formatUTCDate(selectedRideDate)
  );

  if (!campID) {
    return (
      <Container size="md">
        <Title order={2} mb="xl">Day Off Rides</Title>
        <Text>Please select a camp to view day off rides.</Text>
      </Container>
    );
  }

  if (loadingTrucks || loadingDriverStatus || loadingRides || loadingCalendar || loadingUsers || loadingRideRequests) {
    return (
      <Container size="md">
        <Title order={2} mb="xl">Day Off Rides</Title>
        <Center style={{ height: '80vh' }}><Loader /></Center>
      </Container>
    );
  }

  return (
    <Container size="md">
      <Title order={2} mb="xl">Day Off Rides</Title>
      
      <Group justify="space-between" mb="lg">
        <Select
          label="View Rides For"
          placeholder="Select a day off date"
          data={availableDayOffDates.map(date => ({
            value: formatUTCDate(date),
            label: formatUTCDate(date)
          }))}
          value={formatUTCDate(selectedRideDate) || ''}
          onChange={(value) => {
            if (value) {
              setSelectedRideDate(new Date(value + 'T00:00:00Z'));
            }
          }}
          clearable={false}
          style={{ flexGrow: 1 }}
        />
        {user && (
          <Button onClick={openRequestRideModal}>Request a Ride</Button>
        )}
      </Group>

      <Paper withBorder p="md" shadow="sm" mb="lg">
        <Group justify="space-between" align="center" mb="md">
          <Title order={4}>Available Trucks for {formatUTCDate(selectedRideDate) || 'the selected date'}</Title>
        </Group>
        <Stack>
          {getAvailableTrucks().length === 0 ? (
            <Text c="dimmed">No trucks available for {selectedRideDate?.toDateString() || 'the selected date'}.</Text>
          ) : (
            getAvailableTrucks().map(truck => (
              <Paper key={truck.id} p="xs" withBorder>
                <Group justify="space-between">
                  <Text>{truck.name} (Capacity: {truck.capacity})</Text>
                  {isDriver && (
                    <Button size="xs" onClick={() => {
                      setSelectedTruckId(truck.id);
                      openCreateRideModal();
                    }}>Create Ride</Button>
                  )}
                </Group>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md" shadow="sm" mb="lg">
        <Title order={4} mb="md">Planned Rides for {formatUTCDate(selectedRideDate) || 'N/A'}</Title>
        <Stack>
          {filteredRides.length === 0 ? (
            <Text c="dimmed">No rides planned for the day off.</Text>
          ) : (
            filteredRides.map(ride => (
              <Paper key={ride.id} p="xs" withBorder>
                <Stack>
                  <Text>Truck: {getTruckName(ride.truckId)}</Text>
                  <Text>Driver: {getUserDisplayName(ride.driverId)}</Text>
                  <Text>Departure: {formatTime12Hour(ride.departureTime)}</Text>
                  {ride.expectedReturnTime && <Text>Return: {formatTime12Hour(ride.expectedReturnTime)}</Text>}
                  <Text>Passengers: {Object.keys(ride.passengers || {}).length} / {ride.passengersCapacity} ({Object.keys(ride.passengers || {}).map(passengerId => getUserDisplayName(passengerId)).join(', ')})</Text>
                  <Text>Sign-ups: {ride.allowSignUps ? 'Allowed' : 'Not Allowed'}</Text>
                  <Group mt="xs">
                    {ride.allowSignUps && user && !ride.passengers?.[user.uid] && (
                      <Button size="xs" onClick={() => handleSignUp(ride.id)}>Sign Up</Button>
                    )}
                    {ride.allowSignUps && user && ride.passengers?.[user.uid] && ride.driverId !== user.uid && (
                      <Button size="xs" variant="outline" onClick={() => handleCancelSignUp(ride.id)}>Cancel Sign Up</Button>
                    )}
                    {user && ride.driverId === user.uid && (
                      <Button size="xs" variant="outline" onClick={() => handleEditRide(ride)}>Edit My Ride</Button>
                    )}
                    {user && ride.driverId === user.uid && (
                      <Button size="xs" color="red" variant="outline" leftSection={<IconTrash size={14} />} onClick={() => handleDeleteRide(ride)}>Delete My Ride</Button>
                    )}
                  </Group>
                </Stack>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Paper withBorder p="md" shadow="sm" mb="lg">
        <Title order={4} mb="md">Ride Requests for {formatUTCDate(selectedRideDate) || 'N/A'}</Title>
        <Stack>
          {filteredRideRequests.length === 0 ? (
            <Text c="dimmed">No ride requests for the day off.</Text>
          ) : (
            filteredRideRequests.map(request => (
              <Paper key={request.id} p="xs" withBorder>
                <Group justify="space-between">
                  <Stack gap={0}>
                    <Text>{getUserDisplayName(request.userId)}</Text>
                    <Text size="sm" c="dimmed">Preferred: {formatTime12Hour(request.requestedTime, true)}</Text>
                  </Stack>
                  <Group>
                    {isDriver && (
                      <Button size="xs" onClick={() => handleAddPassengerToRide(request.userId, request.id)}>Add to Ride</Button>
                    )}
                    {user && request.userId === user.uid && (
                      <Button size="xs" color="red" variant="outline" leftSection={<IconTrash size={14} />} onClick={() => handleDeleteRequest(request)}>Delete Request</Button>
                    )}
                  </Group>
                </Group>
              </Paper>
            ))
          )}
        </Stack>
      </Paper>

      <Modal opened={createRideModalOpened} onClose={closeCreateRideModal} title="Create New Ride">
        <Stack>
          <Group justify="center" align="center" mb="md">
            <Button 
              onClick={() => {
                const currentIndex = availableDayOffDates.findIndex(d => d.toISOString().split('T')[0] === selectedRideDate?.toISOString().split('T')[0]);
                if (currentIndex > 0) {
                  setSelectedRideDate(availableDayOffDates[currentIndex - 1]);
                }
              }}
              disabled={!selectedRideDate || availableDayOffDates.findIndex(d => d.toISOString().split('T')[0] === selectedRideDate?.toISOString().split('T')[0]) === 0}
            >Previous Day Off</Button>
            <Text size="lg" fw={700}>{formatUTCDate(selectedRideDate) || 'Select a Date'}</Text>
            <Button 
              onClick={() => {
                const currentIndex = availableDayOffDates.findIndex(d => formatUTCDate(d) === formatUTCDate(selectedRideDate));
                if (currentIndex < availableDayOffDates.length - 1) {
                  setSelectedRideDate(availableDayOffDates[currentIndex + 1]);
                }
              }}
              disabled={!selectedRideDate || availableDayOffDates.findIndex(d => formatUTCDate(d) === formatUTCDate(selectedRideDate)) === availableDayOffDates.length - 1}
            >Next Day Off</Button>
          </Group>
          <Select
            label="Select Truck"
            placeholder="Choose a truck"
            data={getAvailableTrucks().map(truck => ({
              value: truck.id,
              label: `${truck.name} (Capacity: ${truck.capacity})`
            }))}
            value={selectedTruckId}
            onChange={setSelectedTruckId}
            required
          />
          <TimeInput
            label="Departure Time"
            placeholder="Select departure time"
            value={departureTime}
            onChange={(event) => setDepartureTime(event.currentTarget.value)}
            icon={<IconClock size={16} />}
            required
          />
          <TimeInput
            label="Expected Return Time (Optional)"
            placeholder="Select return time"
            value={expectedReturnTime}
            onChange={(event) => setExpectedReturnTime(event.currentTarget.value)}
            icon={<IconClock size={16} />}
          />
          <NumberInput
            label="Passengers Capacity (including yourself)"
            value={passengersCapacity}
            onChange={(val) => setPassengersCapacity(val || 1)}
            min={1}
            icon={<IconUsers size={16} />}
          />
          <Switch
            label="Allow others to sign up for this ride"
            checked={allowSignUps}
            onChange={(event) => setAllowSignUps(event.currentTarget.checked)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeCreateRideModal}>Cancel</Button>
            <Button onClick={handleCreateRide}>Create Ride</Button>
          </Group>
        </Stack>
      </Modal>

      <Modal opened={requestRideModalOpened} onClose={closeRequestRideModal} title="Request a Ride">
        <Stack>
          <Text>Looking for a ride on {formatUTCDate(selectedRideDate)}?</Text>
          <Select
            label="Preferred Departure Time"
            placeholder="Select preferred time"
            data={Array.from({ length: 12 }, (_, i) => {
              const hour = i === 0 ? 12 : i; // 0 becomes 12 AM, others are 1-11
              const ampm = i < 12 ? 'AM' : 'PM';
              return `${hour} ${ampm}`;
            }).concat(Array.from({ length: 12 }, (_, i) => {
              const hour = i === 0 ? 12 : i; // 0 becomes 12 PM, others are 1-11
              const ampm = i < 12 ? 'PM' : 'AM'; // This is wrong, should be 12 PM, 1 PM, ..., 11 PM
              return `${hour} ${ampm}`;
            }).slice(12, 23).map((time, index) => {
                const hour = index + 1;
                return `${hour} PM`;
            }).concat(["12 PM"]).sort((a, b) => {
                const aHour = parseInt(a.split(' ')[0]);
                const bHour = parseInt(b.split(' ')[0]);
                const aAmPm = a.split(' ')[1];
                const bAmPm = b.split(' ')[1];

                if (aAmPm === bAmPm) {
                    if (aHour === 12) return -1;
                    if (bHour === 12) return 1;
                    return aHour - bHour;
                } else {
                    return aAmPm === 'AM' ? -1 : 1;
                }
            }))}
            value={requestedDepartureTime}
            onChange={(value) => setRequestedDepartureTime(value || '')}
            required
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeRequestRideModal}>Cancel</Button>
            <Button onClick={handleRequestRide}>Submit Request</Button>
          </Group>
        </Stack>
      </Modal>
    <Modal opened={editRideModalOpened} onClose={closeEditRideModal} title="Edit Ride">
        <Stack>
          <TimeInput
            label="Departure Time"
            placeholder="Select departure time"
            value={editDepartureTime}
            onChange={(event) => setEditDepartureTime(event.currentTarget.value)}
            icon={<IconClock size={16} />}
            required
          />
          <TimeInput
            label="Expected Return Time (Optional)"
            placeholder="Select return time"
            value={editExpectedReturnTime}
            onChange={(event) => setEditExpectedReturnTime(event.currentTarget.value || null)}
            icon={<IconClock size={16} />}
          />
          <Switch
            label="Allow others to sign up for this ride"
            checked={editAllowSignUps}
            onChange={(event) => setEditAllowSignUps(event.currentTarget.checked)}
          />
          <MultiSelect
            label="Current Passengers"
            placeholder="Select passengers to keep"
            data={Object.keys(editingRide?.passengers || {}).map(pId => ({ value: pId, label: getUserDisplayName(pId) }))}
            value={passengersToKeep}
            onChange={setPassengersToKeep}
            searchable
          />
          <Group justify="flex-end" mt="md">
            <Button variant="default" onClick={closeEditRideModal}>Cancel</Button>
            <Button onClick={handleSaveEditedRide}>Save Changes</Button>
          </Group>
        </Stack>
      </Modal>
    </Container>
  );
};

export default DayOffRidesPage;
