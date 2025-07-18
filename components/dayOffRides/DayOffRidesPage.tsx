'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  IconCalendar,
  IconCheck,
  IconClock,
  IconMapPin,
  IconNotes,
  IconPencil,
  IconTrash,
  IconUser,
  IconUsers,
  IconX,
} from '@tabler/icons-react';
import {
  addDays,
  endOfDay,
  formatISO,
  isWithinInterval,
  parseISO,
  startOfDay,
  subDays,
} from 'date-fns';
import { get, onValue, push, ref, remove, update } from 'firebase/database';
import {
  Accordion,
  Badge,
  Box,
  Button,
  Card,
  Checkbox,
  Group,
  Modal,
  NumberInput,
  Select,
  Stack,
  Tabs,
  Text,
  Textarea,
  TextInput,
  Title,
  Tooltip,
} from '@mantine/core';
import { DatePickerInput, TimeInput } from '@mantine/dates';
import { useModals } from '@mantine/modals';
import { notifications } from '@mantine/notifications';
import { database } from '../../firebase/firebase';
import { useAuth } from '../../hooks/useAuth';
import { ROLES } from '../../lib/constants';

interface RideOffer {
  id: string;
  driverId: string;
  driverName: string;
  departureDate: string;
  departureTime: string;
  destination: string;
  availableSeats: number;
  notes?: string;
  truckId?: string;
  requiredReturnTime?: string;
  allowAutoJoin?: boolean;
  passengers: { [key: string]: number }; // passengerId: numberOfPeople
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  timestamp: string;
}

interface RideRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  requestDate: string;
  departureTime: string;
  destination: string;
  numberOfPeople: number;
  notes?: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  offeredRideId?: string; // If matched with an offer
  timestamp: string;
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
  const { user, userData, loading } = useAuth(); // Changed from `profile` to `userData`
  const modals = useModals();
  const profile = userData?.profile; // Access profile from userData
  const [activeTab, setActiveTab] = useState<string | null>('ride-offers');
  const [offerModalOpen, setOfferModalOpen] = useState(false);
  const [requestModalOpen, setRequestModalOpen] = useState(false);

  // Ride Offer State
  const [departureDate, setDepartureDate] = useState<Date | null>(null);
  const [departureTime, setDepartureTime] = useState('');
  const [destination, setDestination] = useState('');
  const [availableSeats, setAvailableSeats] = useState<number | ''>('');
  const [offerNotes, setOfferNotes] = useState('');
  const [editingOffer, setEditingOffer] = useState<RideOffer | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedTruck, setSelectedTruck] = useState('');
  const [requiredReturnTime, setRequiredReturnTime] = useState('');
  const [allowAutoJoin, setAllowAutoJoin] = useState(false);

  // Join Modal State
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [joinModalStep, setJoinModalStep] = useState('initial'); // 'initial' or 'withOthers'
  const [otherPeopleJoining, setOtherPeopleJoining] = useState<number | ''>('');
  const [selectedOfferToJoin, setSelectedOfferToJoin] = useState<RideOffer | null>(null);

  // Ride Request State
  const [requestDate, setRequestDate] = useState<Date | null>(null);
  const [requestDepartureTime, setRequestDepartureTime] = useState('');
  const [requestDestination, setRequestDestination] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState<number | ''>('');
  const [requestNotes, setRequestNotes] = useState('');
  

  // Data lists
  const [rideOffers, setRideOffers] = useState<RideOffer[]>([]);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [pastRides, setPastRides] = useState<RideOffer[]>([]);
  const [passengerDetailsModalOpen, setPassengerDetailsModalOpen] = useState(false);
  const [currentPassengers, setCurrentPassengers] = useState<{ [key: string]: string }>({});
  const [allUsers, setAllUsers] = useState<any[]>([]); // To get user names for passengers
  const [camps, setCamps] = useState<Camp[]>([]);
  const [calendarData, setCalendarData] = useState<any>(null);
  const [crews, setCrews] = useState<any[]>([]);
  const [trucks, setTrucks] = useState<any[]>([]);

  // Filtering and Sorting
  const [offerDateRange, setOfferDateRange] = useState<[Date | null, Date | null]>([
    new Date(),
    addDays(new Date(), 30),
  ]);
  const [requestDateRange, setRequestDateRange] = useState<[Date | null, Date | null]>([
    new Date(),
    addDays(new Date(), 30),
  ]);
  const [pastDateRange, setPastDateRange] = useState<[Date | null, Date | null]>([
    subDays(new Date(), 30),
    new Date(),
  ]);

  const [offerSortKey, setOfferSortKey] = useState<string | null>(null);
  const [offerSortOrder, setOfferSortOrder] = useState<'asc' | 'desc'>('asc');
  const [requestSortKey, setRequestSortKey] = useState<string | null>(null);
  const [requestSortOrder, setRequestSortOrder] = useState<'asc' | 'desc'>('asc');
  const [pastSortKey, setPastSortKey] = useState<string | null>(null);
  const [pastSortOrder, setPastSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!user) {
      return;
    }

    const offersRef = ref(database, `camps/${campID}/dayOffRides/offers`);
    const requestsRef = ref(database, `camps/${campID}/dayOffRides/requests`);
    const usersRef = ref(database, 'users');
    const campsRef = ref(database, 'camps');

    const unsubscribeOffers = onValue(offersRef, (snapshot) => {
      const offersVal = snapshot.val();
      const loadedOffers: RideOffer[] = offersVal
        ? Object.keys(offersVal).map((key) => ({ id: key, ...offersVal[key] }))
        : [];
      const upcoming = loadedOffers.filter(
        (offer) => parseISO(offer.departureDate) >= startOfDay(new Date())
      );
      const past = loadedOffers.filter(
        (offer) => parseISO(offer.departureDate) < startOfDay(new Date())
      );
      setRideOffers(upcoming);
      setPastRides(past);
    });

    const unsubscribeRequests = onValue(requestsRef, (snapshot) => {
      const requestsVal = snapshot.val();
      const loadedRequests: RideRequest[] = requestsVal
        ? Object.keys(requestsVal).map((key) => ({ id: key, ...requestsVal[key] }))
        : [];
      setRideRequests(
        loadedRequests.filter((req) => parseISO(req.requestDate) >= startOfDay(new Date()))
      );
    });

    const unsubscribeUsers = onValue(usersRef, (snapshot) => {
      const usersVal = snapshot.val();
      const loadedUsers: any[] = [];
      if (usersVal) {
        Object.keys(usersVal).forEach((uid) => {
          loadedUsers.push({ id: uid, ...usersVal[uid] });
        });
      }
      setAllUsers(loadedUsers);
    });

    const unsubscribeCamps = onValue(campsRef, (snapshot) => {
      const campsVal = snapshot.val();
      const loadedCamps: Camp[] = campsVal
        ? Object.keys(campsVal).map((key) => ({ id: key, ...campsVal[key] }))
        : [];
      setCamps(loadedCamps.filter((camp) => camp.isActive));
    });

    let unsubscribeCalendar: (() => void) | undefined;
    let unsubscribeCrews: (() => void) | undefined;
    let unsubscribeTrucks: (() => void) | undefined;

    if (campID) {
      const calendarRef = ref(database, `camps/${campID}/calendar`);
      unsubscribeCalendar = onValue(calendarRef, (snapshot) => {
        setCalendarData(snapshot.val());
      });

      const crewsRef = ref(database, `camps/${campID}/crews`);
      unsubscribeCrews = onValue(crewsRef, (snapshot) => {
        const crewsVal = snapshot.val();
        const loadedCrews: any[] = crewsVal
          ? Object.keys(crewsVal).map((key) => ({ id: key, ...crewsVal[key] }))
          : [];
        setCrews(loadedCrews);
      });

      const trucksRef = ref(database, `camps/${campID}/trucks`);
      unsubscribeTrucks = onValue(trucksRef, (snapshot) => {
        const trucksVal = snapshot.val();
        const loadedTrucks: any[] = trucksVal
          ? Object.keys(trucksVal).map((key) => ({ id: key, ...trucksVal[key] }))
          : [];
        setTrucks(loadedTrucks);
      });
    }

    return () => {
      unsubscribeOffers();
      unsubscribeRequests();
      unsubscribeUsers();
      unsubscribeCamps();
      if (unsubscribeCalendar) unsubscribeCalendar();
      if (unsubscribeCrews) unsubscribeCrews();
      if (unsubscribeTrucks) unsubscribeTrucks();
    };
  }, [user, campID]);

  const campOptions = camps.map((camp) => ({ value: camp.name, label: camp.name }));

  const openOfferModal = (offer: RideOffer | null = null) => {
    if (offer) {
      setEditingOffer(offer);
      setDepartureDate(parseISO(offer.departureDate));
      setDepartureTime(offer.departureTime);
      setDestination(offer.destination);
      setAvailableSeats(offer.availableSeats);
      setSelectedTruck(offer.truckId || '');
      setRequiredReturnTime(offer.requiredReturnTime || '');
      setAllowAutoJoin(offer.allowAutoJoin || false);
    } else {
      setEditingOffer(null);

      let nextDayOff: Date | null = null;
      if (calendarData) {
        const sortedDates = Object.keys(calendarData).sort();
        const today = startOfDay(new Date());

        for (const dateString of sortedDates) {
          const date = parseISO(dateString);
          if (date >= today && calendarData[dateString]?.shiftDay === 0) {
            nextDayOff = date;
            break;
          }
        }
      }
      setDepartureDate(nextDayOff || addDays(new Date(), 1)); // Default to tomorrow if no day off found
      setDepartureTime('');
      setDestination('');
      setAvailableSeats('');
      setOfferNotes('');
      setSelectedDriverId(canCreateRideOffer ? user?.uid || null : null);
      setSelectedTruck('');
      setRequiredReturnTime('');
      setAllowAutoJoin(true);
    }
    setOfferModalOpen(true);
  };

  const openRequestModal = () => {
    let nextDayOff: Date | null = null;
    if (calendarData) {
      const sortedDates = Object.keys(calendarData).sort();
      const today = startOfDay(new Date());

      for (const dateString of sortedDates) {
        const date = parseISO(dateString);
        if (date >= today && calendarData[dateString]?.shiftDay === 0) {
          nextDayOff = date;
          break;
        }
      }
    }
    setRequestDate(nextDayOff || addDays(new Date(), 1)); // Default to tomorrow if no day off found
    setRequestDepartureTime('');
    setRequestDestination('');
    setNumberOfPeople('');
    setRequestNotes('');
    setRequestModalOpen(true);
  };

  const handleOfferSubmit = async () => {
    if (
      !user ||
      !profile ||
      !departureDate ||
      !departureTime ||
      !destination ||
      availableSeats === '' ||
      !selectedDriverId ||
      !selectedTruck
    ) {
      notifications.show({
        title: 'Error',
        message: 'Please fill all required offer fields.',
        color: 'red',
      });
      return;
    }

    const selectedDriver = allUsers.find((u) => u.id === selectedDriverId);
    if (!selectedDriver) {
      notifications.show({ title: 'Error', message: 'Selected driver not found.', color: 'red' });
      return;
    }

    const offerData: Omit<RideOffer, 'id' | 'passengers' | 'status' | 'timestamp'> = {
      driverId: selectedDriverId,
      driverName: selectedDriver.name,
      departureDate: formatISO(departureDate, { representation: 'date' }),
      departureTime,
      destination,
      availableSeats: Number(availableSeats),
      notes: offerNotes,
      truckId: selectedTruck,
      requiredReturnTime,
      allowAutoJoin,
    };

    try {
      if (editingOffer) {
        await update(
          ref(database, `camps/${campID}/dayOffRides/offers/${editingOffer.id}`),
          offerData
        );
        notifications.show({
          title: 'Success',
          message: 'Ride offer updated successfully!',
          color: 'green',
        });
      } else {
        await push(ref(database, `camps/${campID}/dayOffRides/offers`), {
          ...offerData,
          passengers: {},
          status: 'pending',
          timestamp: formatISO(new Date()),
        });
        notifications.show({
          title: 'Success',
          message: 'Ride offer created successfully!',
          color: 'green',
        });
      }
      setOfferModalOpen(false);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: `Failed to save offer: ${error.message}`,
        color: 'red',
      });
    }
  };

  const handleRequestSubmit = async () => {
    if (
      !user ||
      !profile ||
      !requestDate ||
      !requestDepartureTime ||
      !requestDestination ||
      numberOfPeople === ''
    ) {
      notifications.show({
        title: 'Error',
        message: 'Please fill all required request fields.',
        color: 'red',
      });
      return;
    }

    const requestData: Omit<
      RideRequest,
      'id' | 'status' | 'offeredRideId' | 'timestamp' | 'requesterId'
    > & { requesterId: string } = {
      requesterId: user.uid,
      requesterName: profile.name,
      requestDate: formatISO(requestDate, { representation: 'date' }),
      departureTime: requestDepartureTime,
      destination: requestDestination,
      numberOfPeople: Number(numberOfPeople),
      notes: requestNotes,
    };

    try {
      await push(ref(database, `camps/${campID}/dayOffRides/requests`), {
        ...requestData,
        status: 'pending',
        timestamp: formatISO(new Date()),
      });
      notifications.show({
        title: 'Success',
        message: 'Ride request created successfully!',
        color: 'green',
      });
      setRequestModalOpen(false);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: `Failed to save request: ${error.message}`,
        color: 'red',
      });
    }
  };

  const handleDeleteOffer = async (offerId: string) => {
    modals.openConfirmModal({
      title: 'Delete Ride Offer',
      children: (
        <Text size="sm">
          Are you sure you want to delete this ride offer? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          await remove(ref(database, `camps/${campID}/dayOffRides/offers/${offerId}`));
          notifications.show({ title: 'Success', message: 'Ride offer deleted.', color: 'green' });
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: `Failed to delete offer: ${error.message}`,
            color: 'red',
          });
        }
      },
    });
  };

  const handleDeleteRequest = async (request: RideRequest) => {
    modals.openConfirmModal({
      title: 'Delete Ride Request',
      children: (
        <Text size="sm">
          Are you sure you want to delete this ride request? This action cannot be undone.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          if (request.status === 'confirmed' && request.offeredRideId) {
            // Fetch the associated ride offer
            const offerSnapshot = await get(ref(database, `camps/${campID}/dayOffRides/offers/${request.offeredRideId}`));
            if (offerSnapshot.exists()) {
              const offer: RideOffer = offerSnapshot.val();
              const newPassengers = { ...offer.passengers };
              delete newPassengers[request.requesterId];

              await update(ref(database, `camps/${campID}/dayOffRides/offers/${request.offeredRideId}`), {
                passengers: newPassengers,
                availableSeats: offer.availableSeats + request.numberOfPeople,
              });
              notifications.show({
                title: 'Ride Offer Updated',
                message: `Seats returned to offer ${offer.id}.`,
                color: 'blue',
              });
            }
          }
          await remove(ref(database, `camps/${campID}/dayOffRides/requests/${request.id}`));
          notifications.show({
            title: 'Success',
            message: 'Ride request deleted.',
            color: 'green',
          });
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: `Failed to delete request: ${error.message}`,
            color: 'red',
          });
        }
      },
    });
  };

  const handleJoinRide = async (offer: RideOffer) => {
    if (loading) {
      notifications.show({
        title: 'Info',
        message: 'Verifying login status. Please wait a moment.',
        color: 'blue',
      });
      return;
    }
    if (!user || !profile) {
      notifications.show({
        title: 'Error',
        message: 'You must be logged in to join a ride.',
        color: 'red',
      });
      return;
    }
    if (offer.driverId === user.uid) {
      notifications.show({
        title: 'Info',
        message: 'You cannot join your own ride offer.',
        color: 'blue',
      });
      return;
    }
    if (offer.availableSeats <= 0) {
      notifications.show({
        title: 'Error',
        message: 'No available seats on this ride.',
        color: 'red',
      });
      return;
    }
    if (offer.passengers && offer.passengers[user.uid]) {
      notifications.show({
        title: 'Info',
        message: 'You have already joined this ride.',
        color: 'blue',
      });
      return;
    }

    setSelectedOfferToJoin(offer);
    setJoinModalStep('initial');
    setOtherPeopleJoining('');
    setJoinModalOpen(true);
  };

  const handleLeaveRide = async (offer: RideOffer) => {
    if (!user || !profile) {
      return;
    }
    if (!offer.passengers || !offer.passengers[user.uid]) {
      notifications.show({
        title: 'Info',
        message: 'You are not a passenger on this ride.',
        color: 'blue',
      });
      return;
    }

    modals.openConfirmModal({
      title: 'Leave Ride',
      children: <Text size="sm">Are you sure you want to leave this ride?</Text>,
      labels: { confirm: 'Leave', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          const newPassengers = { ...offer.passengers };
          delete newPassengers[user.uid];
          await update(ref(database, `camps/${campID}/dayOffRides/offers/${offer.id}`), {
            passengers: newPassengers,
            availableSeats: offer.availableSeats + 1,
          });
          notifications.show({
            title: 'Success',
            message: 'Left ride successfully!',
            color: 'green',
          });
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: `Failed to leave ride: ${error.message}`,
            color: 'red',
          });
        }
      },
    });
  };

  const handleMatchRequest = async (offer: RideOffer, request: RideRequest) => {
    if (offer.availableSeats < request.numberOfPeople) {
      notifications.show({
        title: 'Error',
        message: 'Not enough seats available in the offer for this request.',
        color: 'red',
      });
      return;
    }

    modals.openConfirmModal({
      title: 'Match Ride Request',
      children: (
        <Text size="sm">
          `Match request from ${request.requesterName} (${request.numberOfPeople} people) with your
          ride offer?`
        </Text>
      ),
      labels: { confirm: 'Match', cancel: 'Cancel' },
      onConfirm: async () => {
        try {
          // Update offer: reduce seats, add request as passenger (simplified for now)
          const newPassengers = {
            ...(offer.passengers || {}),
            [request.requesterId]: request.numberOfPeople,
          };
          await update(ref(database, `camps/${campID}/dayOffRides/offers/${offer.id}`), {
            availableSeats: offer.availableSeats - request.numberOfPeople,
            passengers: newPassengers, // This assumes a single requester fills multiple spots, might need refinement
            status: offer.availableSeats - request.numberOfPeople === 0 ? 'confirmed' : 'pending',
          });

          // Update request: set status to confirmed, link to offer
          await update(ref(database, `camps/${campID}/dayOffRides/requests/${request.id}`), {
            status: 'confirmed',
            offeredRideId: offer.id,
          });
          notifications.show({
            title: 'Success',
            message: 'Request matched successfully!',
            color: 'green',
          });
        } catch (error: any) {
          notifications.show({
            title: 'Error',
            message: `Failed to match request: ${error.message}`,
            color: 'red',
          });
        }
      },
    });
  };

  const handleConfirmJoin = async (offer: RideOffer, additionalPeople: number) => {
    if (!user || !profile) {
      notifications.show({
        title: 'Error',
        message: 'You must be logged in to join a ride.',
        color: 'red',
      });
      return;
    }

    const totalPeople = 1 + additionalPeople;

    if (offer.availableSeats < totalPeople) {
      notifications.show({
        title: 'Error',
        message: `Not enough seats available. Only ${offer.availableSeats} seat(s) left.`,
        color: 'red',
      });
      return;
    }

    try {
      const newPassengers = { ...(offer.passengers || {}), [user.uid]: totalPeople };
      await update(ref(database, `camps/${campID}/dayOffRides/offers/${offer.id}`), {
        passengers: newPassengers,
        availableSeats: offer.availableSeats - totalPeople,
      });
      notifications.show({
        title: 'Success',
        message: 'Joined ride successfully!',
        color: 'green',
      });
      setJoinModalOpen(false);
    } catch (error: any) {
      notifications.show({
        title: 'Error',
        message: `Failed to join ride: ${error.message}`,
        color: 'red',
      });
    }
  };

  const showPassengerDetails = (passengers: { [key: string]: string }) => {
    setCurrentPassengers(passengers);
    setPassengerDetailsModalOpen(true);
  };

  const getPassengerContact = (passengerId: string) => {
    const passengerUser = allUsers.find((u) => u.id === passengerId);
    return passengerUser ? passengerUser.phoneNumber || passengerUser.email || 'N/A' : 'N/A';
  };

  const filterAndSort = (
    data: any[],
    dateRange: [Date | null, Date | null],
    sortKey: string | null,
    sortOrder: 'asc' | 'desc'
  ) => {
    const [startDate, endDate] = dateRange;
    let filteredData = data;

    if (startDate && endDate) {
      filteredData = data.filter((item) => {
        const itemDate = parseISO(item.departureDate || item.requestDate);
        return isWithinInterval(itemDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
      });
    }

    if (sortKey) {
      return [...filteredData].sort((a, b) => {
        let aVal = a[sortKey!];
        let bVal = b[sortKey!];

        // Handle date sorting specifically if the sortKey is a date field
        if (sortKey === 'departureDate' || sortKey === 'requestDate') {
          aVal = parseISO(a.departureDate || a.requestDate);
          bVal = parseISO(b.departureDate || b.requestDate);
        }

        // Handle cases where values might be undefined or null
        if (aVal === undefined || aVal === null) {
          return sortOrder === 'asc' ? 1 : -1;
        }
        if (bVal === undefined || bVal === null) {
          return sortOrder === 'asc' ? -1 : 1;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
        }
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
        }
        // Fallback for other types or if types don't match
        return 0;
      });
    }
    return filteredData;
  };

  const filteredAndSortedOffers = filterAndSort(
    rideOffers,
    offerDateRange,
    offerSortKey,
    offerSortOrder
  );
  const filteredAndSortedRequests = filterAndSort(
    rideRequests,
    requestDateRange,
    requestSortKey,
    requestSortOrder
  );
  const filteredAndSortedPastRides = filterAndSort(
    pastRides,
    pastDateRange,
    pastSortKey,
    pastSortOrder
  );

  const userCrewIds = useMemo(() => {
    if (!userData || !campID) {
      return [];
    }
    const assignedCamp = userData.assignedCamps?.[campID];
    if (!assignedCamp || !assignedCamp.crewId) {
      return [];
    }
    return Array.isArray(assignedCamp.crewId) ? assignedCamp.crewId : [assignedCamp.crewId];
  }, [userData, campID]);

  const isDriverCrew = userCrewIds.some((crewId) => {
    const crew = crews.find((c) => c.id === crewId);
    return crew?.crewType === 'Drivers';
  });
  const isCrewModerator = effectiveRole === 4;
  const isCrewBoss = effectiveRole === 3;

  const canCreateRideOffer = isDriverCrew || isCrewModerator || isCrewBoss;

  const availableTrucks = useMemo(() => {
    if (!departureDate) return trucks; // If no date selected, all trucks are potentially available

    const offersOnSelectedDate = rideOffers.filter(
      (offer) => offer.departureDate === formatISO(departureDate, { representation: 'date' })
    );

    const assignedTruckIds = new Set(offersOnSelectedDate.map((offer) => offer.truckId));

    return trucks.filter((truck) => !assignedTruckIds.has(truck.id) || (editingOffer && truck.id === editingOffer.truckId));
  }, [trucks, departureDate, rideOffers, editingOffer]);

  return (
    <Box style={{ padding: '20px' }}>
      <Title order={2} mb="lg">
        Day Off Ride Board
      </Title>

      <Tabs value={activeTab} onChange={setActiveTab}>
        <Tabs.List>
          <Tabs.Tab value="ride-offers">Ride Offers</Tabs.Tab>
          <Tabs.Tab value="ride-requests">Ride Requests</Tabs.Tab>
          {effectiveRole >= 5 && (
            <Tabs.Tab value="past-rides">Past Rides</Tabs.Tab>
          )}
        </Tabs.List>

        <Tabs.Panel value="ride-offers" pt="xs">
          <Group mt="md">
            <Tooltip
              label="Only Drivers, Crew Moderators or Bosses can create a new ride."
              disabled={canCreateRideOffer}
              withArrow
            >
              <Button onClick={() => openOfferModal()} disabled={!canCreateRideOffer}>
                Create New Ride Offer
              </Button>
            </Tooltip>
            <DatePickerInput
              type="range"
              label="Filter by Date Range"
              placeholder="Pick dates"
              value={offerDateRange}
              onChange={setOfferDateRange}
            />
            <Select
              label="Sort By"
              placeholder="Select field to sort"
              data={[
                { value: 'departureDate', label: 'Departure Date' },
                { value: 'departureTime', label: 'Departure Time' },
                { value: 'destination', label: 'Destination' },
                { value: 'availableSeats', label: 'Available Seats' },
              ]}
              value={offerSortKey}
              onChange={setOfferSortKey}
              clearable
            />
            <Select
              label="Sort Order"
              placeholder="Select order"
              data={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
              ]}
              value={offerSortOrder}
              onChange={(value) => setOfferSortOrder(value as 'asc' | 'desc')}
              clearable
            />
          </Group>

          <Stack mt="lg">
            {filteredAndSortedOffers.length === 0 ? (
              <Text>No ride offers available for the selected dates.</Text>
            ) : (
              <Accordion defaultValue={null}>
                {filteredAndSortedOffers.map((offer) => (
                  <Accordion.Item key={offer.id} value={offer.id}>
                    <Accordion.Control>
                      <Group justify="space-between">
                        <Text fw={700}>
                          {offer.departureDate} | {offer.departureTime} to {offer.destination}
                        </Text>
                        <Group>
                          <Badge color={offer.availableSeats > 0 ? 'green' : 'red'}>
                            Seats: {offer.availableSeats}
                          </Badge>
                          {user && offer.passengers && offer.passengers[user.uid] && (
                            <Badge color="blue" variant="filled">
                              Joined
                            </Badge>
                          )}
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        <Group>
                          <IconUser size={16} />
                          <Text size="sm">Driver: {offer.driverName}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} />
                          <Text size="sm">Date: {offer.departureDate}</Text>
                        </Group>
                        <Group>
                          <IconClock size={16} />
                          <Text size="sm">Time: {offer.departureTime}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} />
                          <Text size="sm">To: {offer.destination}</Text>
                        </Group>
                        <Group>
                          <IconUsers size={16} />
                          <Text size="sm">Available Seats: {offer.availableSeats}</Text>
                        </Group>
                        {offer.notes && (
                          <Group>
                            <IconNotes size={16} />
                            <Text size="sm">Notes: {offer.notes}</Text>
                          </Group>
                        )}
                        <Group>
                          <Text size="sm">Passengers:</Text>
                          {offer.passengers && Object.keys(offer.passengers).length > 0 ? (
                            <Text size="sm">
                              {Object.keys(offer.passengers)
                                .map((passengerId) => {
                                  const passengerUser = allUsers.find((u) => u.id === passengerId);
                                  const numPeople = offer.passengers[passengerId];
                                  const name = passengerUser?.profile?.nickname || passengerUser?.profile?.name || 'Name N/A';
                                  return numPeople > 1 ? `${name} (+${numPeople - 1})` : name;
                                })
                                .join(', ')}}
                            </Text>
                          ) : (
                            <Text size="sm" c="dimmed">
                              None yet.
                            </Text>
                          )}
                        </Group>

                        <Group mt="md">
                          {user && offer.driverId === user.uid ? (
                            <>
                              <Button
                                leftSection={<IconPencil size={16} />}
                                onClick={() => openOfferModal(offer)}
                                size="sm"
                              >
                                Edit Offer
                              </Button>
                              <Button
                                leftSection={<IconTrash size={16} />}
                                color="red"
                                onClick={() => handleDeleteOffer(offer.id)}
                                size="sm"
                              >
                                Delete Offer
                              </Button>
                            </>
                          ) : (
                            <>
                              {user && offer.passengers && offer.passengers[user.uid] ? (
                                <Button
                                  leftSection={<IconX size={16} />}
                                  color="orange"
                                  onClick={() => handleLeaveRide(offer)}
                                  size="sm"
                                >
                                  Leave Ride
                                </Button>
                              ) : (
                                <Button
                                  leftSection={<IconCheck size={16} />}
                                  onClick={() => handleJoinRide(offer)}
                                  size="sm"
                                  disabled={offer.availableSeats <= 0}
                                >
                                  Join Ride
                                </Button>
                              )}
                            </>
                          )}
                        </Group>

                        {user && offer.driverId === user.uid && (
                          <Box mt="md">
                            <Title order={5}>Matching Requests:</Title>
                            {rideRequests.filter(
                              (req) =>
                                req.destination === offer.destination &&
                                req.requestDate === offer.departureDate &&
                                req.status === 'pending'
                            ).length === 0 ? (
                              <Text size="sm" c="dimmed">
                                No pending requests matching this offer's destination and date.
                              </Text>
                            ) : (
                              <Stack>
                                {rideRequests
                                  .filter(
                                    (req) =>
                                      req.destination === offer.destination &&
                                      req.requestDate === offer.departureDate &&
                                      req.status === 'pending'
                                  )
                                  .map((req) => (
                                    <Card
                                      key={req.id}
                                      shadow="sm"
                                      padding="sm"
                                      radius="md"
                                      withBorder
                                    >
                                      <Text size="sm" fw={500}>
                                        {req.requesterName} ({req.numberOfPeople} people)
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {req.requestDate} at {req.departureTime}
                                      </Text>
                                      {req.notes && (
                                        <Text size="xs" c="dimmed">
                                          Notes: {req.notes}
                                        </Text>
                                      )}
                                      <Button
                                        size="xs"
                                        mt="xs"
                                        onClick={() => handleMatchRequest(offer, req)}
                                      >
                                        Match Request
                                      </Button>
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
            <Select
              label="Sort By"
              placeholder="Select field to sort"
              data={[
                { value: 'requestDate', label: 'Request Date' },
                { value: 'departureTime', label: 'Departure Time' },
                { value: 'destination', label: 'Destination' },
                { value: 'numberOfPeople', label: 'Number of People' },
              ]}
              value={requestSortKey}
              onChange={setRequestSortKey}
              clearable
            />
            <Select
              label="Sort Order"
              placeholder="Select order"
              data={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
              ]}
              value={requestSortOrder}
              onChange={(value) => setRequestSortOrder(value as 'asc' | 'desc')}
              clearable
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
                          {request.requestDate} | {request.departureTime} for{' '}
                          {request.numberOfPeople} people to {request.destination}
                        </Text>
                        <Badge color={request.status === 'pending' ? 'orange' : 'green'}>
                          {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                        </Badge>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        <Group>
                          <IconUser size={16} />
                          <Text size="sm">Requester: {request.requesterName}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} />
                          <Text size="sm">Date: {request.requestDate}</Text>
                        </Group>
                        <Group>
                          <IconClock size={16} />
                          <Text size="sm">Time: {request.departureTime}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} />
                          <Text size="sm">To: {request.destination}</Text>
                        </Group>
                        <Group>
                          <IconUsers size={16} />
                          <Text size="sm">Number of People: {request.numberOfPeople}</Text>
                        </Group>
                        {request.notes && (
                          <Group>
                            <IconNotes size={16} />
                            <Text size="sm">Notes: {request.notes}</Text>
                          </Group>
                        )}
                        <Group mt="md">
                          {user && request.requesterId === user.uid ? (
                            <>
                              <Button
                                leftSection={<IconTrash size={16} />}
                                color="red"
                                onClick={() => handleDeleteRequest(request)}
                                size="sm"
                              >
                                Delete Request
                              </Button>
                            </>
                          ) : (
                            <Text size="sm" c="dimmed">
                              Contact {request.requesterName} to offer a ride.
                            </Text>
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
            <Select
              label="Sort By"
              placeholder="Select field to sort"
              data={[
                { value: 'departureDate', label: 'Departure Date' },
                { value: 'departureTime', label: 'Departure Time' },
                { value: 'destination', label: 'Destination' },
              ]}
              value={pastSortKey}
              onChange={setPastSortKey}
              clearable
            />
            <Select
              label="Sort Order"
              placeholder="Select order"
              data={[
                { value: 'asc', label: 'Ascending' },
                { value: 'desc', label: 'Descending' },
              ]}
              value={pastSortOrder}
              onChange={(value) => setPastSortOrder(value as 'asc' | 'desc')}
              clearable
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
                          {offer.departureDate} | {offer.departureTime}
                        </Text>
                        <Group>
                          <Badge color={offer.availableSeats > 0 ? 'green' : 'red'}>
                            Seats: {offer.availableSeats}
                          </Badge>
                          {user && offer.passengers && offer.passengers[user.uid] && (
                            <Badge color="blue" variant="filled">
                              Joined
                            </Badge>
                          )}
                        </Group>
                      </Group>
                    </Accordion.Control>
                    <Accordion.Panel>
                      <Stack gap="sm">
                        <Group>
                          <IconUser size={16} />
                          <Text size="sm">Driver: {offer.driverName}</Text>
                        </Group>
                        <Group>
                          <IconCalendar size={16} />
                          <Text size="sm">Date: {offer.departureDate}</Text>
                        </Group>
                        <Group>
                          <IconClock size={16} />
                          <Text size="sm">Time: {offer.departureTime}</Text>
                        </Group>
                        <Group>
                          <IconMapPin size={16} />
                          <Text size="sm">To: {offer.destination}</Text>
                        </Group>
                        <Group>
                          <IconUsers size={16} />
                          <Text size="sm">
                            Original Seats:{' '}
                            {offer.availableSeats + Object.keys(offer.passengers || {}).length}
                          </Text>
                        </Group>
                        {offer.notes && (
                          <Group>
                            <IconNotes size={16} />
                            <Text size="sm">Notes: {offer.notes}</Text>
                          </Group>
                        )}
                        <Group>
                          <Text size="sm">Passengers:</Text>
                          {Object.keys(offer.passengers || {}).length > 0 ? (
                            <Button
                              variant="light"
                              size="xs"
                              onClick={() => showPassengerDetails(offer.passengers)}
                            >
                              View Passengers
                            </Button>
                          ) : (
                            <Text size="sm" c="dimmed">
                              None.
                            </Text>
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
      <Modal
        opened={offerModalOpen}
        onClose={() => setOfferModalOpen(false)}
        title={editingOffer ? 'Edit Ride Offer' : 'Create New Ride Offer'}
      >
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
            label="Driver"
            placeholder="Select a driver"
            data={(() => {
              const driverUsers = allUsers
                .filter((u) => {
                  const userCrewIds = Array.isArray(u.assignedCamps?.[campID]?.crewId)
                    ? u.assignedCamps[campID].crewId
                    : u.assignedCamps?.[campID]?.crewId
                      ? [u.assignedCamps[campID].crewId]
                      : [];
                  return userCrewIds.some((crewId) => {
                    const crew = crews.find((c) => c.id === crewId);
                    return crew?.crewType === 'Drivers';
                  }) || (editingOffer && u.id === editingOffer.driverId); // Include current driver if editing
                })
                .map((u) => ({ value: u.id, label: u.profile?.nickname || u.name }));
              return driverUsers;
            })()}
            value={selectedDriverId}
            onChange={(value) => setSelectedDriverId(value)}
            required
          />
          <Select
            label="Truck"
            placeholder="Select a truck"
            data={availableTrucks.map((truck) => ({ value: truck.id, label: truck.name }))}
            value={selectedTruck}
            onChange={(value) => setSelectedTruck(value || '')}
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
          <TimeInput
            label="Required Return Time (optional)"
            placeholder="Select time"
            value={requiredReturnTime}
            onChange={(event) => setRequiredReturnTime(event.currentTarget.value)}
          />
          <Checkbox
            label="Allow people to join your ride without your approval?"
            checked={allowAutoJoin}
            onChange={(event) => setAllowAutoJoin(event.currentTarget.checked)}
          />

          <Textarea
            label="Notes (optional)"
            placeholder="Any additional information, e.g., 'Will stop in ABC town', 'Luggage space limited'"
            value={offerNotes}
            onChange={(event) => setOfferNotes(event.currentTarget.value)}
          />
          <Group justify="flex-end" mt="md">
            <Button variant="outline" onClick={() => setOfferModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleOfferSubmit}>
              {editingOffer ? 'Update Offer' : 'Create Offer'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Ride Request Modal */}
      <Modal
        opened={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title={'Create New Ride Request'}
      >
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
            <Button variant="outline" onClick={() => setRequestModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRequestSubmit}>
              {'Create Request'}
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Passenger Details Modal */}
      <Modal
        opened={passengerDetailsModalOpen}
        onClose={() => setPassengerDetailsModalOpen(false)}
        title="Passenger Details"
      >
        {Object.keys(currentPassengers).length === 0 ? (
          <Text>No passengers for this ride.</Text>
        ) : (
          <Stack>
            {Object.entries(currentPassengers).map(([id, name]) => (
              <Card key={id} shadow="sm" padding="sm" radius="md" withBorder>
                <Group justify="space-between">
                  <Text fw={500}>{name}</Text>
                  <Text size="sm" c="dimmed">
                    Contact: {getPassengerContact(id)}
                  </Text>
                </Group>
              </Card>
            ))}
          </Stack>
        )}
      </Modal>

      {/* Join Ride Modal */}
      <Modal
        opened={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title="Join Ride"
      >
        {selectedOfferToJoin && joinModalStep === 'initial' && (
          <Stack>
            <Text>How many people are joining this ride?</Text>
            <Group grow>
              <Button onClick={() => handleConfirmJoin(selectedOfferToJoin, 0)}>
                Only Me Joining
              </Button>
              <Button onClick={() => setJoinModalStep('withOthers')}>
                Me and Other People Joining
              </Button>
            </Group>
          </Stack>
        )}

        {selectedOfferToJoin && joinModalStep === 'withOthers' && (
          <Stack>
            <NumberInput
              label="Number of other people joining with you"
              placeholder="e.g., 2"
              value={otherPeopleJoining}
              onChange={(val) => setOtherPeopleJoining(val)}
              min={1}
              required
            />
            <Group justify="flex-end">
              <Button variant="default" onClick={() => setJoinModalStep('initial')}>
                Back
              </Button>
              <Button
                onClick={() => handleConfirmJoin(selectedOfferToJoin, Number(otherPeopleJoining))}
                disabled={!otherPeopleJoining || Number(otherPeopleJoining) <= 0}
              >
                Join with Others
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </Box>
  );
};

export default DayOffRidesPage;
