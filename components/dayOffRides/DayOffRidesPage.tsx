'use client';
import { useState, useEffect } from 'react';
import { Button, Group, Box, Select, TextInput, Textarea, Tooltip, Stack, Radio, NumberInput, Alert, Text, Accordion, Checkbox, Divider, Card, Title, Badge } from '@mantine/core';
import { TimeInput, DatePickerInput } from '@mantine/dates';
import { useAuth } from '../../hooks/useAuth';
import { database } from '../../firebase/firebase';
import { ref, onValue, push, update, remove, query, orderByChild, startAt, endAt, get } from 'firebase/database';
import { IconTrash, IconPencil, IconCheck, IconX, IconClock, IconMapPin, IconCalendar, IconUser, IconCar, IconInfoCircle, IconCurrencyDollar, IconBus, IconUsers, IconNotes, IconBolt, IconPhone, IconChevronDown, IconChevronUp } from '@tabler/icons-react';
import { notifications } from '@mantine/notifications';
import { CustomDayOffDatePicker } from '../../components/dayOffRidePlanning/CustomDayOffDatePicker';
import { isWithinInterval, startOfDay, endOfDay, formatISO, parseISO, addDays, subDays } from 'date-fns';
import { DateInput } from '@mantine/dates';


interface RideOffer {
  id: string;
  driverId: string;
  driverName: string;
  departureDate: string;
  departureTime: string;
  departureLocation: string;
  destination: string;
  availableSeats: number;
  costPerPerson: number;
  notes?: string;
  passengers: { [key: string]: string }; // passengerId: passengerName
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  timestamp: string;
}

interface RideRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  departureTime: string;
  departureLocation: string;
  destination: string;
  numberOfPeople: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  offeredRideId?: string; // If matched with an offer
  timestamp: string;
}

interface PassengerDetails {
  name: string;
  contact: string;
}

interface Camp {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
}

// Define the props interface for DayOffRidesPage
interface DayOffRidesPageProps {
  campID: string | null;
  effectiveRole: number;
}

const DayOffRidesPage = ({ campID, effectiveRole }: DayOffRidesPageProps) => {
  const { user, profile } = useAuth();
  const [activeTab, setActiveTab] = useState<string | null>('ride-offers');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Ride Offer State
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState('');
  const [departureLocation, setDepartureLocation] = useState('');
  const [destination, setDestination] = useState('');
  const [availableSeats, setAvailableSeats] = useState<number | ''>('');
  const [costPerPerson, setCostPerPerson] = useState<number | ''>(0);
  const [offerNotes, setOfferNotes] = useState('');
  const [editingOffer, setEditingOffer] = useState<RideOffer | null>(null);

  // Ride Request State
  const [requestDate, setRequestDate] = useState<Date | null>(null);
  const [requestDepartureTime, setRequestDepartureTime] = useState('');
  const [requestDepartureLocation, setRequestDepartureLocation] = useState('');
  const [requestDestination, setRequestDestination] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number | ''>('');
  const [requestNotes, setRequestNotes] = useState('');
  const [editingRequest, setEditingRequest] = useState<RideRequest | null>(null);

  // Data lists
  const [rideOffers, setRideOffers] = useState<RideOffer[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [pastRides, setPastRides] = useState<RideOffer[]>([]);
  const [passengerDetailsModalOpen, setPassengerDetailsModalOpen] = useState(false);
  const [currentPassengers, setCurrentPassengers] = useState<{ [key: string]: string }>({});
  const [allUsers, setAllUsers] = useState<any[]>([]); // To get user names for passengers
  const [camps, setCamps] = useState<Camp[]>([]);

  // Filtering and Sorting
  const [offerDateRange, setOfferDateRange] = useState<[Date | null, Date | null]>([new Date(), addDays(new Date(), 30)]);
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null]>([new Date(), addDays(new Date(), 30)]);
  const [pastDateRange, setPastDateRange] = useState<[Date | null, Date | null]>([subDays(new Date(), 30), new Date()]);

  const [offerSortKey, setOfferSortKey] = useState<string | null>(null);
  const [offerSortOrder, setOfferSortOrder] = useState<'asc' | 'desc'>('asc');
  const [requestSortKey, setRequestSortKey] = useState<string | null>(null);
  const [requestSortOrder, setRequestSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pastSortKey, setPastSortKey] = useState<string | null>(null);
  const [pastSortOrder, setPastSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!user) return;

    const offersRef = ref(database, 'dayOffRides/offers');
    const requestsRef = ref(database, 'dayOffRides/requests');
    const usersRef = ref(database, 'Users');
    const campsRef = ref(database, 'camps');

    const unsubscribeOffers = onValue(offersRef, (snapshot) => {
      const offersVal = snapshot.val();
      const loadedOffers: RideOffer[] = offersVal ? Object.keys(offersVal).map(key => ({ id: key, ...offersVal[key] })) : [];
      const upcoming = loadedOffers.filter(offer => parseISO(offer.departureDate) >= startOfDay(new Date()));
      const past = loadedOffers.filter(offer => parseISO(offer.departureDate) < startOfDay(new Date()));
      setRideOffers(upcoming);
      setPastRides(past);
    });

    const unsubscribeRequests = onValue(requestsRef, (snapshot) => {
      const requestsVal = snapshot.val();
      const loadedRequests: RideRequest[] = requestsVal ? Object.keys(requestsVal).map(key => ({ id: key, ...requestsVal[key] })) : [];
      setRideRequests(loadedRequests.filter(req => parseISO(req.requestDate) >= startOfDay(new Date())));
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const usersVal = snapshot.val();
      const loadedUsers: any[] = [];
      if (usersVal) {
        Object.keys(usersVal).forEach(uid => {
          loadedUsers.push({ id: uid, ...usersVal[uid].profile });
        });
      }
      setAllUsers(loadedUsers);
    });

    const unsubscribeCamps = onValue(campsRef, (snapshot) => {
      const campsVal = snapshot.val();
      const loadedCamps: Camp[] = campsVal ? Object.keys(campsVal).map(key => ({ id: key, ...campsVal[key] })) : [];
      setCamps(loadedCamps.filter(camp => camp.isActive));
    });

    return () => {
      unsubscribeOffers();
      unsubscribeRequests();
      unsubscribeUsers();
      unsubscribeCamps();
    };
  }, [user]);

  const campOptions = camps.map(camp => ({ value: camp.name, label: camp.name }));

  const openOfferModal = (offer: RideOffer | null = null) => {
    if (offer) {
      setEditingOffer(offer);
      setDepartureDate(parseISO(offer.departureDate));
      setDepartureTime(offer.departureTime);
      setDepartureLocation(offer.departureLocation);
      setDestination(offer.destination);
      setAvailableSeats(offer.availableSeats);
      setCostPerPerson(offer.costPerPerson);
      setOfferNotes(offer.notes || '');
    } else {
      setEditingOffer(null);
      setDepartureDate(null);
      setDepartureTime('');
      setDepartureLocation('');
      setDestination('');
      setAvailableSeats('');
      setCostPerPerson(0);
      setOfferNotes('');
    }
    setOfferModalOpen(true);
  };

  const openRequestModal = (request: RideRequest | null = null) => {
    if (request) {
      setEditingRequest(request);
      setRequestDate(parseISO(request.requestDate));
      setRequestDepartureTime(request.departureTime);
      setRequestDepartureLocation(request.departureLocation);
      setRequestDestination(request.destination);
      setNumberOfPeople(request.numberOfPeople);
      setRequestNotes(request.notes || '');
    } else {
      setEditingRequest(null);
      setRequestDate(null);
      setRequestDepartureTime('');
      setRequestDepartureLocation('');
      setRequestDestination('');
      setNumberOfPeople('');
      setRequestNotes('');
    }
    setRequestModalOpen(true);
  };

  const handleOfferSubmit = async () => {
    if (!user || !profile || !departureDate || !departureTime || !departureLocation || !destination || availableSeats === '' || costPerPerson === '') {
      notifications.show({ title: 'Error', message: 'Please fill all required offer fields.', color: 'red' });
      return;
    }

    const offerData: Omit<RideOffer, 'id' | 'passengers' | 'status' | 'timestamp' | 'driverId'> & { driverId: string } = {
      driverId: user.uid,
      driverName: profile.name,
      departureDate: formatISO(departureDate, { representation: 'date' }),
      departureTime,
      departureLocation,
      destination,
      availableSeats: Number(availableSeats),
      costPerPerson: Number(costPerPerson),
      notes: offerNotes,
    };

    try {
      if (editingOffer) {
        await update(ref(database, `dayOffRides/offers/${editingOffer.id}`), offerData);
        notifications.show({ title: 'Success', message: 'Ride offer updated successfully!', color: 'green' });
      } else {
        await push(ref(database, 'dayOffRides/offers'), { ...offerData, passengers: {}, status: 'pending', timestamp: formatISO(new Date()) });
        notifications.show({ title: 'Success', message: 'Ride offer created successfully!', color: 'green' });
      }
      setOfferModalOpen(false);
    } catch (error: any) {
      notifications.show({ title: 'Error', message: `Failed to save offer: ${error.message}`, color: 'red' });
    }
  };

  const handleRequestSubmit = async () => {
    if (!user || !profile || !requestDate || !requestDepartureTime || !requestDepartureLocation || !requestDestination || numberOfPeople === '') {
      notifications.show({ title: 'Error', message: 'Please fill all required request fields.', color: 'red' });
      return;
    }

    const requestData: Omit<RideRequest, 'id' | 'status' | 'offeredRideId' | 'timestamp' | 'requesterId'> & { requesterId: string } = {
      requesterId: user.uid,
      requesterName: profile.name,
      requestDate: formatISO(requestDate, { representation: 'date' }),
      departureTime: requestDepartureTime,
      departureLocation: requestDepartureLocation,
      destination: requestDestination,
      numberOfPeople: Number(numberOfPeople),
      notes: requestNotes,
    };

    try {
      if (editingRequest) {
        await update(ref(database, `dayOffRides/requests/${editingRequest.id}`), requestData);
        notifications.show({ title: 'Success', message: 'Ride request updated successfully!', color: 'green' });
      } else {
        await push(ref(database, 'dayOffRides/requests'), { ...requestData, status: 'pending', timestamp: formatISO(new Date()) });
        notifications.show({ title: 'Success', message: 'Ride request created successfully!', color: 'green' });
      }
      setRequestModalOpen(false);
    } catch (error: any) {
      notifications.show({ title: 'Error', message: `Failed to save request: ${error.message}`, color: 'red' });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    if (window.confirm('Are you sure you want to delete this ride offer?')) {
      try {
        await remove(ref(database, `dayOffRides/offers/${offerId}`));
        notifications.show({ title: 'Success', message: 'Ride offer deleted.', color: 'green' });
      } catch (error: any) {
        notifications.show({ title: 'Error', message: `Failed to delete offer: ${error.message}`, color: 'red' });
      }
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    if (window.confirm('Are you sure you want to delete this ride request?')) {
      try {
        await remove(ref(database, `dayOffRides/requests/${requestId}`));
        notifications.show({ title: 'Success', message: 'Ride request deleted.', color: 'green' });
      } catch (error: any) {
        notifications.show({ title: 'Error', message: `Failed to delete request: ${error.message}`, color: 'red' });
      }
    }
  };

  const handleJoinRide = async (offer: RideOffer) => {
    if (!user || !profile) {
      notifications.show({ title: 'Error', message: 'You must be logged in to join a ride.', color: 'red' });
      return;
    }
    if (offer.driverId === user.uid) {
      notifications.show({ title: 'Info', message: 'You cannot join your own ride offer.', color: 'blue' });
      return;
    }
    if (offer.availableSeats <= 0) {
      notifications.show({ title: 'Error', message: 'No available seats on this ride.', color: 'red' });
      return;
    }
    if (offer.passengers && offer.passengers[user.uid]) {
      notifications.show({ title: 'Info', message: 'You have already joined this ride.', color: 'blue' });
      return;
    }

    try {
      const newPassengers = { ...(offer.passengers || {}), [user.uid]: profile.name };
      await update(ref(database, `dayOffRides/offers/${offer.id}`), {
        passengers: newPassengers,
        availableSeats: offer.availableSeats - 1,
      });
      notifications.show({ title: 'Success', message: 'Joined ride successfully!', color: 'green' });
    } catch (error: any) {
      notifications.show({ title: 'Error', message: `Failed to join ride: ${error.message}`, color: 'red' });
    }
  };

  const handleLeaveRide = async (offer: RideOffer) => {
    if (!user || !profile) return;
    if (!offer.passengers || !offer.passengers[user.uid]) {
      notifications.show({ title: 'Info', message: 'You are not a passenger on this ride.', color: 'blue' });
      return;
    }

    if (window.confirm('Are you sure you want to leave this ride?')) {
      try {
        const newPassengers = { ...offer.passengers };
        delete newPassengers[user.uid];
        await update(ref(database, `dayOffRides/offers/${offer.id}`), {
          passengers: newPassengers,
          availableSeats: offer.availableSeats + 1,
        });
        notifications.show({ title: 'Success', message: 'Left ride successfully!', color: 'green' });
      } catch (error: any) {
        notifications.show({ title: 'Error', message: `Failed to leave ride: ${error.message}`, color: 'red' });
      }
    }
  };

  const handleMatchRequest = async (offer: RideOffer, request: RideRequest) => {
    if (offer.availableSeats < request.numberOfPeople) {
      notifications.show({ title: 'Error', message: 'Not enough seats available in the offer for this request.', color: 'red' });
      return;
    }

    if (window.confirm(`Match request from ${request.requesterName} (${request.numberOfPeople} people) with your ride offer?`)) {
      try {
        // Update offer: reduce seats, add request as passenger (simplified for now)
        const newPassengers = { ...(offer.passengers || {}), [request.requesterId]: request.requesterName };
        await update(ref(database, `dayOffRides/offers/${offer.id}`), {
          availableSeats: offer.availableSeats - request.numberOfPeople,
          passengers: newPassengers, // This assumes a single requester fills multiple spots, might need refinement
          status: offer.availableSeats - request.numberOfPeople === 0 ? 'confirmed' : 'pending'
        });

        // Update request: set status to confirmed, link to offer
        await update(ref(database, `dayOffRides/requests/${request.id}`), {
          status: 'confirmed',
          offeredRideId: offer.id
        });
        notifications.show({ title: 'Success', message: 'Request matched successfully!', color: 'green' });
      } catch (error: any) {
        notifications.show({ title: 'Error', message: `Failed to match request: ${error.message}`, color: 'red' });
      }
    }
  };

  const showPassengerDetails = (passengers: { [key: string]: string }) => {
    setCurrentPassengers(passengers);
    setPassengerDetailsModalOpen(true);
  };

  const getPassengerContact = (passengerId: string) => {
    const passengerUser = allUsers.find(u => u.id === passengerId);
    return passengerUser ? passengerUser.phoneNumber || passengerUser.email || 'N/A' : 'N/A';
  };

  const Th = ({ children, sorted, reversed, onSort }: { children: React.ReactNode, sorted: boolean, reversed: boolean, onSort: () => void }) => (
    <th>
      <UnstyledButton onClick={onSort} >
        <Group justify="space-between">
          <Text fw={500} fz="sm">{children}</Text>
          {sorted && (reversed ? <IconChevronUp /> : <IconChevronDown />)}
        </Group>
      </UnstyledButton>
    </th>
  );

  const filterAndSort = (data: any[], dateRange: [Date | null, Date | null], sortKey: string | null, sortOrder: 'asc' | 'desc') => {
    const [startDate, endDate] = dateRange;
    let filteredData = data;

    if (startDate && endDate) {
      filteredData = data.filter(item => {
        const itemDate = parseISO(item.departureDate || item.requestDate);
        return isWithinInterval(itemDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
      });
    }

    if (sortKey) {
      return [...filteredData].sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        return 0;
      });
    }
    return filteredData;
  };


  const filteredAndSortedOffers = filterAndSort(rideOffers, offerDateRange, offerSortKey, offerSortOrder);
  const filteredAndSortedRequests = filterAndSort(rideRequests, requestDateRange, requestSortKey, requestSortOrder);
  const filteredAndSortedPastRides = filterAndSort(pastRides, pastDateRange, pastSortKey, pastSortOrder);

  return (
    <Box style={{ padding: '20px' }}>
      <Title order={2} mb="lg">Day Off Ride Board</Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="ride-offers">Ride Offers</Tabs.Tab>
          <Tabs.Tab value="ride-requests">Ride Requests</Tabs.Tab>
          <Tabs.Tab value="past-rides">Past Rides</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="ride-offers" pt="xs">
          <Group mt="md">
            <Button onClick={() => openOfferModal()}>Create New Ride Offer</Button>
            <DatePickerInput
              type="range"
              label="Filter by Date Range"
              placeholder="Pick dates"
              value={offerDateRange}
              onChange={setOfferDateRange}
            />
          </Group>

          <Stack mt="lg">
            {filteredAndSortedOffers.length === 0 ? (
              <Text>No ride offers available for the selected dates.</Text>
            ) : (
              <Accordion defaultValue={null} >
                {filteredAndSortedOffers.map((offer) => (
                  <Accordion.Item key={offer.id} value={offer.id}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={700}>
                          {offer.departureDate} | {offer.departureTime} from {offer.departureLocation} to {offer.destination}
                        </Text>
                        <Group>
                          <Badge color={offer.availableSeats > 0 ? 'green' : 'red'}>
                            Seats: {offer.availableSeats}
                          </Badge>
                          <Badge color="blue">
                            ${offer.costPerPerson.toFixed(2)}/person
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        <Group>
                          <IconUser size={16} /><Text size="sm">Driver: {offer.driverName}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} /><Text size="sm">Date: {offer.departureDate}</Text>
                        </Group>
                        <Group>
                          <IconClock size={16} /><Text size="sm">Time: {offer.departureTime}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} /><Text size="sm">From: {offer.departureLocation}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} /><Text size="sm">To: {offer.destination}</Text>
                        </Group>
                        <Group>
                          <IconUsers size={16} /><Text size="sm">Available Seats: {offer.availableSeats}</Text>
                        </Group>
                        <Group>
                          <IconCurrencyDollar size={16} /><Text size="sm">Cost Per Person: ${offer.costPerPerson.toFixed(2)}</Text>
                        </Group>
                        {offer.notes && (
                          <Group>
                            <IconNotes size={16} /><Text size="sm">Notes: {offer.notes}</Text>
                          </Group>
                        )}
                        <Group>
                          <Text size="sm">Passengers:</Text>
                          {Object.keys(offer.passengers || {}).length > 0 ? (
                            <Button variant="light" size="xs" onClick={() => showPassengerDetails(offer.passengers)}>View Passengers</Button>
                          ) : (
                            <Text size="sm" c="dimmed">None yet.</Text>
                          )}
                        </Group>

                        <Group mt="md">
                          {user && offer.driverId === user.uid ? (
                            <>
                              <Button leftSection={<IconPencil size={16} />} onClick={() => openOfferModal(offer)} size="sm">Edit Offer</Button>
                              <Button leftSection={<IconTrash size={16} />} color="red" onClick={() => handleDeleteOffer(offer.id)} size="sm">Delete Offer</Button>
                            </>
                          ) : (
                            <>
                              {user && offer.passengers && offer.passengers[user.uid] ? (
                                <Button leftSection={<IconX size={16} />} color="orange" onClick={() => handleLeaveRide(offer)} size="sm">Leave Ride</Button>
                              ) : (
                                <Button leftSection={<IconCheck size={16} />} onClick={() => handleJoinRide(offer)} size="sm" disabled={offer.availableSeats <= 0}>Join Ride</Button>
                              )}
                            </>
                          )}
                        </Group>

                        {user && offer.driverId === user.uid && (
                          <Box mt="md">
                            <Title order={5}>Matching Requests:</Title>
                            {rideRequests.filter(req => req.destination === offer.destination && req.requestDate === offer.departureDate && req.status === 'pending').length === 0 ? (
                              <Text size="sm" c="dimmed">No pending requests matching this offer's destination and date.</Text>
                            ) : (
                              <Stack>
                                {rideRequests.filter(req => req.destination === offer.destination && req.requestDate === offer.departureDate && req.status === 'pending').map(req => (
                                  <Card key={req.id} shadow="sm" padding="sm" radius="md" withBorder>
                                    <Text size="sm" fw={500}>{req.requesterName} ({req.numberOfPeople} people) from {req.departureLocation}</Text>
                                    <Text size="xs" c="dimmed">{req.requestDate} at {req.departureTime}</Text>
                                    {req.notes && <Text size="xs" c="dimmed">Notes: {req.notes}</Text>}
                                    <Button size="xs" mt="xs" onClick={() => handleMatchRequest(offer, req)}>Match Request</Button>
                                  </Card>
                                ))}
                              </Stack>
                            )}
                          </Box>
                        )}
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="ride-requests" pt="xs">
          <Group mt="md">
            <Button onClick={() => openRequestModal()}>Create New Ride Request</Button>
            <DatePickerInput
              type="range"
              label="Filter by Date Range"
              placeholder="Pick dates"
              value={requestDateRange}
              onChange={setRequestDateRange}
            />
          </Group>

          <Stack mt="lg">
            {filteredAndSortedRequests.length === 0 ? (
              <Text>No ride requests available for the selected dates.</Text>
            ) : (
              <Accordion defaultValue={null}>
                {filteredAndSortedRequests.map((request) => (
                  <Accordion.Item key={request.id} value={request.id}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={700}>
                          {request.requestDate} | {request.departureTime} for {request.numberOfPeople} people to {request.destination}
                        </Text>
                        <Badge color={request.status === 'pending' ? 'orange' : 'green'}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        <Group>
                          <IconUser size={16} /><Text size="sm">Requester: {request.requesterName}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} /><Text size="sm">Date: {request.requestDate}</Text>
                        </Group>
                        <Group>
                          <IconClock size={16} /><Text size="sm">Time: {request.departureTime}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} /><Text size="sm">From: {request.departureLocation}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} /><Text size="sm">To: {request.destination}</Text>
                        </Group>
                        <Group>
                          <IconUsers size={16} /><Text size="sm">Number of People: {request.numberOfPeople}</Text>
                        </Group>
                        {request.notes && (
                          <Group>
                            <IconNotes size={16} /><Text size="sm">Notes: {request.notes}</Text>
                          </Group>
                        )}
                        <Group mt="md">
                          {user && request.requesterId === user.uid ? (
                            <>
                              <Button leftSection={<IconPencil size={16} />} onClick={() => openRequestModal(request)} size="sm">Edit Request</Button>
                              <Button leftSection={<IconTrash size={16} />} color="red" onClick={() => handleDeleteRequest(request.id)} size="sm">Delete Request</Button>
                            </>
                          ) : (
                            <Text size="sm" c="dimmed">Contact {request.requesterName} to offer a ride.</Text>
                          )}
                        </Group>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="past-rides" pt="xs">
          <Group mt="md">
            <DatePickerInput
              type="range"
              label="Filter by Date Range"
              placeholder="Pick dates"
              value={pastDateRange}
              onChange={setPastDateRange}
            />
          </Group>
          <Stack mt="lg">
            {filteredAndSortedPastRides.length === 0 ? (
              <Text>No past rides available for the selected dates.</Text>
            ) : (
              <Accordion defaultValue={null}>
                {filteredAndSortedPastRides.map((offer) => (
                  <Accordion.Item key={offer.id} value={offer.id}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={700}>
                          {offer.departureDate} | {offer.departureTime} from {offer.departureLocation} to {offer.destination}
                        </Text>
                        <Group>
                          <Badge color="gray">
                            Completed
                          </Badge>
                          <Badge color="blue">
                            ${offer.costPerPerson.toFixed(2)}/person
                          </Badge>
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        <Group>
                          <IconUser size={16} /><Text size="sm">Driver: {offer.driverName}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} /><Text size="sm">Date: {offer.departureDate}</Text>
                        </Group>
                        <Group>
                          <IconClock size={16} /><Text size="sm">Time: {offer.departureTime}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} /><Text size="sm">From: {offer.departureLocation}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} /><Text size="sm">To: {offer.destination}</Text>
                        </Group>
                        <Group>
                          <IconUsers size={16} /><Text size="sm">Original Seats: {offer.availableSeats + Object.keys(offer.passengers || {}).length}</Text>
                        </Group>
                        <Group>
                          <IconCurrencyDollar size={16} /><Text size="sm">Cost Per Person: ${offer.costPerPerson.toFixed(2)}</Text>
                        </Group>
                        {offer.notes && (
                          <Group>
                            <IconNotes size={16} /><Text size="sm">Notes: {offer.notes}</Text>
                          </Group>
                        )}
                        <Group>
                          <Text size="sm">Passengers:</Text>
                          {Object.keys(offer.passengers || {}).length > 0 ? (
                            <Button variant="light" size="xs" onClick={() => showPassengerDetails(offer.passengers)}>View Passengers</Button>
                          ) : (
                            <Text size="sm" c="dimmed">None.</Text>
                          )}
                        </Group>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                ))}
              </Accordion>
            )}
          </Stack>
        </Tabs.Panel>
      </Tabs>

      {/* Ride Offer Modal */}
      <Modal opened={offerModalOpen} onClose={() => setOfferModalOpen(false)} title={editingOffer ? "Edit Ride Offer" : "Create New Ride Offer"}>
        <Stack>
          <DatePickerInput
            label="Departure Date"
            placeholder="Pick date"
            value={departureDate}
            onChange={setDepartureDate}
            required
          />
          <TimeInput
            label="Departure Time"
            placeholder="Select time"
            value={departureTime}
            onChange={(event) => setDepartureTime(event.currentTarget.value)}
            required
          />
          <Select
            label="Departure Location"
            placeholder="Select or type departure location"
            data={campOptions}
            searchable
            creatable
            getCreateLabel={(query) => `+ Create ${query}`}
            onCreate={(query) => {
              const item = { value: query, label: query };
              setCamps((current) => [...current, { id: query, name: query, location: query, isActive: true }]);
              return item;
            }}
            value={departureLocation}
            onChange={(value) => setDepartureLocation(value || '')}
            required
          />
          <TextInput
            label="Destination"
            placeholder="e.g. Town, City, Home"
            value={destination}
            onChange={(event) => setDestination(event.currentTarget.value)}
            required
          />
          <NumberInput
            label="Available Seats"
            placeholder="e.g. 3"
            value={availableSeats}
            onChange={(val) => setAvailableSeats(val)}
            min={1}
            required
          />
          <NumberInput
            label="Cost Per Person ($)"
            placeholder="e.g. 20.00"
            value={costPerPerson}
            onChange={(val) => setCostPerPerson(val)}
            min={0}
            precision={2}
            step={0.01}
            required
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Any additional information, e.g., 'Will stop in ABC town', 'Luggage space limited'"
            value={offerNotes}
            onChange={(event) => setOfferNotes(event.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>Cancel</Button>
            <Button onClick={handleOfferSubmit}>{editingOffer ? "Update Offer" : "Create Offer"}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Ride Request Modal */}
      <Modal opened={requestModalOpen} onClose={() => setRequestModalOpen(false)} title={editingRequest ? "Edit Ride Request" : "Create New Ride Request"}>
        <Stack>
          <DatePickerInput
            label="Request Date"
            placeholder="Pick date"
            value={requestDate}
            onChange={setRequestDate}
            required
          />
          <TimeInput
            label="Desired Departure Time"
            placeholder="Select time"
            value={requestDepartureTime}
            onChange={(event) => setRequestDepartureTime(event.currentTarget.value)}
            required
          />
          <Select
            label="Departure Location"
            placeholder="Select or type departure location"
            data={campOptions}
            searchable
            creatable
            getCreateLabel={(query) => `+ Create ${query}`}
            onCreate={(query) => {
              const item = { value: query, label: query };
              setCamps((current) => [...current, { id: query, name: query, location: query, isActive: true }]);
              return item;
            }}
            value={requestDepartureLocation}
            onChange={(value) => setRequestDepartureLocation(value || '')}
            required
          />
          <TextInput
            label="Destination"
            placeholder="e.g. Town, City, Home"
            value={requestDestination}
            onChange={(event) => setRequestDestination(event.currentTarget.value)}
            required
          />
          <NumberInput
            label="Number of People"
            placeholder="e.g. 1"
            value={numberOfPeople}
            onChange={(val) => setNumberOfPeople(val)}
            min={1}
            required
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Any additional information, e.g., 'Flexible on time', 'Have luggage for 2 people'"
            value={requestNotes}
            onChange={(event) => setRequestNotes(event.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setRequestModalOpen(false)}>Cancel</Button>
            <Button onClick={handleRequestSubmit}>{editingRequest ? "Update Request" : "Create Request"}</Button>
          </Group>
        </Stack>
      </Modal>

      {/* Passenger Details Modal */}
      <Modal opened={passengerDetailsModalOpen} onClose={() => setPassengerDetailsModalOpen(false)} title="Passenger Details">
        {Object.keys(currentPassengers).length === 0 ? (
          <Text>No passengers for this ride.</Text>
        ) : (
          <Stack>
            {Object.entries(currentPassengers).map(([id, name]) => (
              <Card key={id} shadow="sm" padding="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Text fw={500}>{name}</Text>
                  <Text size="sm" c="dimmed">Contact: {getPassengerContact(id)}</Text>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default DayOffRidesPage;