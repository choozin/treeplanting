'use client';

import React, {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { User } from 'firebase/auth';
import { get, onValue, ref } from 'firebase/database';
import Cookies from 'js-cookie';
import { auth, database } from '../firebase/firebase';

// --- TypeScript Interfaces ---

interface WeatherLocation {
  name: string;
  latitude: number;
  longitude: number;
}

interface SixHourChunk {
  name: 'Morning' | 'Afternoon' | 'Evening' | 'Overnight';
  temperature: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number; // Added wind speed
}

interface WeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    apparent_temperature: number;
    precipitation: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    // Added current data points
    pressure_msl: number;
    cloudcover: number;
    visibility: number;
    dewpoint_2m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
    is_day: number; // 0 for night, 1 for day
    uv_index: number;
    snowfall: number;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
    weather_code: number[];
    wind_speed_10m: number[];
    // Added hourly data points
    pressure_msl: number[];
    cloudcover: number[];
    visibility: number[];
    dewpoint_2m: number[];
    wind_direction_10m: number[];
    wind_gusts_10m: number[];
    is_day: number[];
    uv_index: number[];
    snowfall: number[];
  };
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    sunrise: string[];
    sunset: string[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[]; // Added daily wind speed
    // Added daily data points
    uv_index_max: number[];
    wind_direction_10m_dominant: number[];
    wind_gusts_10m_max: number[];
    shortwave_radiation_sum: number[];
  };
  sixHourForecast?: SixHourChunk[];
}

interface PersonalLocation extends WeatherLocation {
  id: string;
}

interface WeatherState {
  data: WeatherData | null;
  loading: boolean;
  error: string | null;
  lastFetched?: number | null;
  status?: 'loading' | 'ok' | 'no_user' | 'no_camp_selected' | 'using_default_location' | 'error';
}

interface WeatherContextType {
  primary: WeatherState & { location: WeatherLocation | null; primaryLocationId?: string | null }; // Primary Location ID exposed
  secondary: WeatherState & { location: WeatherLocation | null };
  temporary: WeatherState;
  personal: WeatherState & { location: PersonalLocation | null };
  personalLocations: PersonalLocation[];
  preferences: any;
  campID: string | null;
  refresh: () => void;
  fetchTemporaryWeather: (lat: number, long: number) => void;
  fetchWeatherForPersonalLocation: (location: PersonalLocation) => void;
  clearTemporaryWeather: () => void;
}

// --- Context Definition ---
export const WeatherContext = createContext<WeatherContextType | null>(null);

// --- Helper Functions ---
const isDataStale = (timestamp: number | null | undefined): boolean => {
  if (!timestamp) return true;
  return Date.now() - timestamp > 3 * 60 * 60 * 1000; // 3 hours
};

const processSixHourForecast = (hourly: WeatherData['hourly']): SixHourChunk[] => {
  if (!hourly || !hourly.time || hourly.time.length === 0) return [];

  const chunks: Record<
    string,
    { temps: number[]; codes: number[]; precip: number[]; winds: number[] }
  > = {
    Morning: { temps: [], codes: [], precip: [], winds: [] },
    Afternoon: { temps: [], codes: [], precip: [], winds: [] },
    Evening: { temps: [], codes: [], precip: [], winds: [] },
    Overnight: { temps: [], codes: [], precip: [], winds: [] },
  };

  const safeHourly = {
    time: hourly.time || [],
    temperature_2m: hourly.temperature_2m || [],
    weather_code: hourly.weather_code || [],
    precipitation_probability: hourly.precipitation_probability || [],
    wind_speed_10m: hourly.wind_speed_10m || [],
  };

  safeHourly.time.forEach((t, i) => {
    const hour = new Date(t).getHours();
    const period =
      hour >= 6 && hour < 12
        ? 'Morning'
        : hour >= 12 && hour < 18
          ? 'Afternoon'
          : hour >= 18 && hour < 24
            ? 'Evening'
            : 'Overnight';
    // Only push if the data for that index exists
    if (safeHourly.temperature_2m[i] !== undefined)
      chunks[period].temps.push(safeHourly.temperature_2m[i]);
    if (safeHourly.weather_code[i] !== undefined)
      chunks[period].codes.push(safeHourly.weather_code[i]);
    if (safeHourly.precipitation_probability[i] !== undefined)
      chunks[period].precip.push(safeHourly.precipitation_probability[i]);
    if (safeHourly.wind_speed_10m[i] !== undefined)
      chunks[period].winds.push(safeHourly.wind_speed_10m[i]);
  });

  return Object.entries(chunks)
    .map(([name, data]) => {
      if (data.temps.length === 0) return null; // If no data for this chunk, return null

      const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
      const maxPrecip = data.precip.length > 0 ? Math.max(...data.precip) : 0;
      const avgWind =
        data.winds.length > 0 ? data.winds.reduce((a, b) => a + b, 0) / data.winds.length : 0;

      const codeCounts = data.codes.reduce(
        (acc, code) => {
          acc[code] = (acc[code] || 0) + 1;
          return acc;
        },
        {} as Record<number, number>
      );
      const dominantCode =
        data.codes.length > 0
          ? Object.keys(codeCounts).reduce(
              (a, b) => (codeCounts[Number(a)] > codeCounts[Number(b)] ? a : b),
              String(data.codes[0])
            )
          : 0; // Default to 0 if no codes

      return {
        name: name as SixHourChunk['name'],
        temperature: Math.round(avgTemp),
        precipitation: maxPrecip,
        weatherCode: parseInt(dominantCode.toString(), 10), // Ensure it's a number
        windSpeed: Math.round(avgWind),
      };
    })
    .filter((chunk): chunk is SixHourChunk => chunk !== null); // Filter out null chunks
};

// --- Provider Component ---
const WeatherProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [weatherPreferences, setWeatherPreferences] = useState<any>(null);
  const [locations, setLocations] = useState<{
    primary: WeatherLocation | null;
    secondary: WeatherLocation | null;
  }>({ primary: null, secondary: null });
  const [campID, setCampID] = useState<string | null>(null);
  const [activePrimaryLocationId, setActivePrimaryLocationId] = useState<string | null>(null); // New state for primary location ID

  const initialWeatherState: WeatherState = {
    data: null,
    loading: true,
    error: null,
    lastFetched: null,
    status: 'loading',
  };
  const [primaryWeatherData, setPrimaryWeatherData] = useState<WeatherState>(initialWeatherState);
  const [secondaryWeatherData, setSecondaryWeatherData] =
    useState<WeatherState>(initialWeatherState);
  const [temporaryWeatherData, setTemporaryWeatherData] = useState<WeatherState>({
    ...initialWeatherState,
    loading: false,
  });

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(setUser);
    return () => unsubscribe();
  }, []);

  const updateActiveCampAndLocation = useCallback(async () => {
    if (!user) {
      setCampID(null);
      setLocations({ primary: null, secondary: null });
      setActivePrimaryLocationId(null); // Clear active primary location ID
      setPrimaryWeatherData({
        data: null,
        loading: false,
        error: null,
        lastFetched: null,
        status: 'no_user',
      });
      return;
    }

    const userRef = ref(database, `users/${user.uid}`);
    const campsRef = ref(database, 'camps');
    const defaultLocation: WeatherLocation = {
      name: 'Prince George, BC (Default)',
      latitude: 53.916943,
      longitude: -122.749443,
    };

    try {
      const [userSnap, campsSnap] = await Promise.all([get(userRef), get(campsRef)]);
      const userData = userSnap.val();
      const campsData = campsSnap.val();
      const storedCampID = Cookies.get(`campID_${user.uid}`);

      const activeCampID =
        campsData && userData?.assignedCamps && storedCampID && userData.assignedCamps[storedCampID]
          ? storedCampID
          : null;

      setCampID(activeCampID);

      if (activeCampID) {
        const camp = campsData[activeCampID];
        const currentYear = new Date().getFullYear();
        const activeLocationId = camp.activeLocationId; // Get activeLocationId from camp

        setActivePrimaryLocationId(activeLocationId); // Set active primary location ID

        if (activeLocationId && camp.campLocations?.[currentYear]?.[activeLocationId]) {
          const primaryLocData = camp.campLocations[currentYear][activeLocationId];
          const secondaryLocKey = weatherPreferences?.secondaryLocationKey;
          const secondaryLocData = secondaryLocKey
            ? primaryLocData.secondaryLocations?.[secondaryLocKey]
            : null;

          setLocations({
            primary: { name: primaryLocData.campLocationName, ...primaryLocData.latLong },
            secondary: secondaryLocData
              ? { name: secondaryLocData.name, ...secondaryLocData.latLong }
              : null,
          });
          setPrimaryWeatherData((prev) => ({ ...prev, status: 'ok' }));
        } else {
          setLocations({ primary: defaultLocation, secondary: null });
          setPrimaryWeatherData((prev) => ({ ...prev, status: 'using_default_location' }));
        }
      } else {
        setLocations({ primary: null, secondary: null });
        setActivePrimaryLocationId(null); // Clear active primary location ID
        setPrimaryWeatherData({
          data: null,
          loading: false,
          error: null,
          lastFetched: null,
          status: 'no_camp_selected',
        });
      }
    } catch (e) {
      console.error('Error updating active camp:', e);
    }
  }, [user, weatherPreferences?.secondaryLocationKey]);

  useEffect(() => {
    updateActiveCampAndLocation();
    window.addEventListener('campChange', updateActiveCampAndLocation);

    if (user) {
      const prefsRef = ref(database, `users/${user.uid}/weatherPreferences`);
      const defaultPrefs = {
        secondaryLocationKey: '',
        navWidget: { visible: true, displayMode: 'hourly' },
        homescreenWidget: {
          visible: true,
          showSecondaryLocation: true,
          hourlyForecastHours: 6,
          dailyForecastDays: 3,
        },
      };

      const unsubPrefs = onValue(prefsRef, (snapshot) => {
        const fetchedPrefs = snapshot.val();
        if (fetchedPrefs) {
          setWeatherPreferences({
            ...defaultPrefs,
            ...fetchedPrefs,
            navWidget: { ...defaultPrefs.navWidget, ...(fetchedPrefs.navWidget || {}) },
            homescreenWidget: {
              ...defaultPrefs.homescreenWidget,
              ...(fetchedPrefs.homescreenWidget || {}),
            },
          });
        } else {
          setWeatherPreferences(defaultPrefs);
        }
      });
      return () => {
        window.removeEventListener('campChange', updateActiveCampAndLocation);
        unsubPrefs();
      };
    }
  }, [user, updateActiveCampAndLocation]);

  const fetchWeatherData = useCallback(
    async (
      location: WeatherLocation,
      setter: React.Dispatch<React.SetStateAction<WeatherState>>,
      isTemporary: boolean = false
    ) => {
      if (!location || !location.latitude || !location.longitude) {
        setter({ data: null, loading: false, error: 'Invalid location', lastFetched: Date.now() });
        return;
      }

      setter((prev) => ({ ...prev, loading: true, error: null }));

      const params = new URLSearchParams({
        latitude: String(location.latitude),
        longitude: String(location.longitude),
        current:
          'temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m,pressure_msl,cloudcover,visibility,dewpoint_2m,wind_direction_10m,wind_gusts_10m,is_day,uv_index,snowfall', // Added more parameters for full info
        hourly:
          'temperature_2m,precipitation_probability,weather_code,wind_speed_10m,pressure_msl,cloudcover,visibility,dewpoint_2m,wind_direction_10m,wind_gusts_10m,is_day,uv_index,snowfall', // Added more parameters for full info
        daily:
          'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,wind_direction_10m_dominant,wind_gusts_10m_max,shortwave_radiation_sum', // Added more parameters for full info
        timezone: 'auto',
        forecast_days: '7', // Ensure 7 days of daily forecast
        past_hours: '1', // Get a bit of past data for current if needed
      });

      try {
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
        if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
        const data = await response.json();

        const processedData: WeatherData = {
          ...data,
          sixHourForecast: processSixHourForecast(data.hourly),
        };

        if (isTemporary) {
          setTemporaryWeatherData({
            data: processedData,
            loading: false,
            error: null,
            lastFetched: null,
          });
        } else {
          setter((prev) => ({
            ...prev,
            data: processedData,
            loading: false,
            error: null,
            lastFetched: Date.now(),
          }));
        }
      } catch (error) {
        console.error('Failed to fetch weather data:', error);
        const errorState: WeatherState = {
          data: null,
          loading: false,
          error: (error as Error).message,
          lastFetched: Date.now(),
          status: 'error',
        };
        if (isTemporary) {
          setTemporaryWeatherData(errorState);
        } else {
          setter(errorState);
        }
      }
    },
    []
  ); // Empty dependency array, assuming it's stable and does not cause re-renders. Removed initialWeatherState.

  useEffect(() => {
    if (
      locations.primary &&
      (isDataStale(primaryWeatherData.lastFetched) ||
        (primaryWeatherData.status === 'using_default_location' && !primaryWeatherData.data))
    ) {
      fetchWeatherData(locations.primary, setPrimaryWeatherData, false);
    }
  }, [
    locations.primary,
    primaryWeatherData.lastFetched,
    primaryWeatherData.data,
    primaryWeatherData.status,
    fetchWeatherData,
  ]);

  useEffect(() => {
    if (locations.secondary && isDataStale(secondaryWeatherData.lastFetched)) {
      fetchWeatherData(locations.secondary, setSecondaryWeatherData, false);
    } else if (!locations.secondary) {
      setSecondaryWeatherData({ data: null, loading: false, error: null, lastFetched: null });
    }
  }, [locations.secondary, secondaryWeatherData.lastFetched, fetchWeatherData]);

  const fetchTemporaryWeather = useCallback(
    (lat: number, long: number) => {
      fetchWeatherData(
        { latitude: lat, longitude: long, name: 'Manual Entry' },
        setTemporaryWeatherData,
        true
      );
    },
    [fetchWeatherData]
  );

  const [personalLocations, setPersonalLocations] = useState<PersonalLocation[]>([]);
  const [personalWeatherData, setPersonalWeatherData] = useState<WeatherState & { location: PersonalLocation | null }>({ ...initialWeatherState, location: null });

  useEffect(() => {
    if (!user) {
      setPersonalLocations([]);
      return;
    }

    const personalLocationsRef = ref(database, `users/${user.uid}/customLocations`);
    const unsubscribe = onValue(personalLocationsRef, (snapshot) => {
      if (snapshot.exists()) {
        const locations = snapshot.val();
        console.log('WeatherProvider: Personal locations raw data:', locations);
        const personalLocations = Object.keys(locations).map((id) => ({
          id,
          ...locations[id],
        }));
        console.log('WeatherProvider: Personal locations processed:', personalLocations);
        setPersonalLocations(personalLocations);
      } else {
        console.log('WeatherProvider: No personal locations found.');
        setPersonalLocations([]);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const fetchWeatherForPersonalLocation = useCallback(
    (location: PersonalLocation) => {
      console.log('WeatherProvider: Fetching weather for personal location:', location);
      const personalSetter: React.Dispatch<React.SetStateAction<WeatherState>> = (newState) => {
        if (typeof newState === 'function') {
          setPersonalWeatherData(prev => {
            const updatedState = newState(prev); // Apply the function from fetchWeatherData
            return { ...updatedState, location };
          });
        } else {
          setPersonalWeatherData({ ...newState, location });
        }
      };
      fetchWeatherData(location, personalSetter, false);
    }, [fetchWeatherData]);

  const value = useMemo(
    () => ({
      primary: {
        ...primaryWeatherData,
        location: locations.primary,
        primaryLocationId: activePrimaryLocationId,
      },
      secondary: { ...secondaryWeatherData, location: locations.secondary },
      temporary: temporaryWeatherData,
      personal: personalWeatherData,
      personalLocations,
      preferences: weatherPreferences,
      campID: campID,
      refresh: () => {
        if (locations.primary) fetchWeatherData(locations.primary, setPrimaryWeatherData, false);
        if (locations.secondary)
          fetchWeatherData(locations.secondary, setSecondaryWeatherData, false);
      },
      fetchTemporaryWeather,
      fetchWeatherForPersonalLocation,
      clearTemporaryWeather: () =>
        setTemporaryWeatherData({ data: null, loading: false, error: null, lastFetched: null }),
    }),
    [
      primaryWeatherData,
      secondaryWeatherData,
      temporaryWeatherData,
      locations,
      weatherPreferences,
      campID,
      fetchWeatherData,
      fetchTemporaryWeather,
      activePrimaryLocationId,
      personalWeatherData,
      personalLocations,
      fetchWeatherForPersonalLocation,
    ]
  );

  return <WeatherContext.Provider value={value}>{children}</WeatherContext.Provider>;
};

export default WeatherProvider;
