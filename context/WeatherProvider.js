'use client';

import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import Cookies from "js-cookie";
import { ref, onValue, get } from 'firebase/database';
import { database, auth } from '../firebase/firebase';

export const WeatherContext = createContext(null);

// Helper to check if data is stale (older than 3 hours)
const isDataStale = (timestamp) => {
    if (!timestamp) return true;
    return (Date.now() - timestamp) > 3 * 60 * 60 * 1000; // 3 hours in milliseconds
};

// Helper to process hourly data into 6-hour chunks
const processSixHourForecast = (hourly) => {
    if (!hourly || !hourly.time || hourly.time.length === 0) return [];

    const chunks = {
        Morning: { times: [], temps: [], codes: [], precip: [] },     // 6am - 11am
        Afternoon: { times: [], temps: [], codes: [], precip: [] }, // 12pm - 5pm
        Evening: { times: [], temps: [], codes: [], precip: [] },   // 6pm - 11pm
        Overnight: { times: [], temps: [], codes: [], precip: [] }, // 12am - 5am
    };

    hourly.time.forEach((t, i) => {
        const hour = new Date(t).getHours();
        if (hour >= 6 && hour < 12) {
            chunks.Morning.temps.push(hourly.temperature_2m[i]);
            chunks.Morning.codes.push(hourly.weather_code[i]);
            chunks.Morning.precip.push(hourly.precipitation_probability[i]);
        } else if (hour >= 12 && hour < 18) {
            chunks.Afternoon.temps.push(hourly.temperature_2m[i]);
            chunks.Afternoon.codes.push(hourly.weather_code[i]);
            chunks.Afternoon.precip.push(hourly.precipitation_probability[i]);
        } else if (hour >= 18 && hour < 24) {
            chunks.Evening.temps.push(hourly.temperature_2m[i]);
            chunks.Evening.codes.push(hourly.weather_code[i]);
            chunks.Evening.precip.push(hourly.precipitation_probability[i]);
        } else {
            chunks.Overnight.temps.push(hourly.temperature_2m[i]);
            chunks.Overnight.codes.push(hourly.weather_code[i]);
            chunks.Overnight.precip.push(hourly.precipitation_probability[i]);
        }
    });

    return Object.entries(chunks).map(([name, data]) => {
        if (data.temps.length === 0) return null;
        const avgTemp = data.temps.reduce((a, b) => a + b, 0) / data.temps.length;
        const maxPrecip = Math.max(...data.precip);
        // Find the most frequent weather code
        const codeCounts = data.codes.reduce((acc, code) => {
            acc[code] = (acc[code] || 0) + 1;
            return acc;
        }, {});
        const dominantCode = Object.keys(codeCounts).reduce((a, b) => codeCounts[a] > codeCounts[b] ? a : b, data.codes[0]);

        return {
            name,
            temperature: Math.round(avgTemp),
            precipitation: maxPrecip,
            weatherCode: parseInt(dominantCode, 10),
        };
    }).filter(Boolean);
};


export const WeatherProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [weatherPreferences, setWeatherPreferences] = useState(null);
    const [locations, setLocations] = useState({ primary: null, secondary: null });
    const [campID, setCampID] = useState(null);

    const [primaryWeatherData, setPrimaryWeatherData] = useState({ data: null, loading: true, error: null, lastFetched: null, status: 'loading' });
    const [secondaryWeatherData, setSecondaryWeatherData] = useState({ data: null, loading: true, error: null, lastFetched: null, status: 'loading' });
    const [temporaryWeatherData, setTemporaryWeatherData] = useState({ data: null, loading: false, error: null });

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(setUser);
        return () => unsubscribe();
    }, []);

    const updateActiveCampAndLocation = useCallback(async () => {
        if (!user) {
            setCampID(null);
            setLocations({ primary: null, secondary: null });
            setPrimaryWeatherData({ data: null, loading: false, error: null, lastFetched: null, status: 'no_user' });
            return;
        }

        const userRef = ref(database, `users/${user.uid}`);
        const campsRef = ref(database, 'camps');
        const defaultLocation = { name: "Prince George, BC (Default)", latitude: 53.916943, longitude: -122.749443 };

        try {
            const [userSnap, campsSnap] = await Promise.all([get(userRef), get(campsRef)]);
            const userData = userSnap.val();
            const campsData = campsSnap.val();
            const storedCampID = Cookies.get("campID");

            const activeCampID = (campsData && userData?.assignedCamps && storedCampID && userData.assignedCamps[storedCampID])
                ? storedCampID
                : null;

            setCampID(activeCampID);

            if (activeCampID) {
                const camp = campsData[activeCampID];
                const activeLocationId = camp.activeLocationId;
                const year = new Date().getFullYear();

                if (activeLocationId && camp.campLocations?.[year]?.[activeLocationId]) {
                    const primaryLoc = camp.campLocations[year][activeLocationId];
                    const secondaryLocKey = weatherPreferences?.secondaryLocationKey;
                    const secondaryLoc = secondaryLocKey ? primaryLoc.secondaryLocations?.[secondaryLocKey] : null;

                    setLocations({
                        primary: { name: primaryLoc.campLocationName, ...primaryLoc.latLong },
                        secondary: secondaryLoc ? { name: secondaryLoc.name, ...secondaryLoc.latLong } : null
                    });
                    setPrimaryWeatherData(prev => ({ ...prev, status: 'ok' }));
                } else {
                    setLocations({ primary: defaultLocation, secondary: null });
                    setPrimaryWeatherData(prev => ({ ...prev, status: 'using_default_location' }));
                }
            } else {
                setLocations({ primary: null, secondary: null });
                setPrimaryWeatherData({ data: null, loading: false, error: null, lastFetched: null, status: 'no_camp_selected' });
            }
        } catch (e) {
            console.error("Error updating active camp:", e);
        }
    }, [user, weatherPreferences?.secondaryLocationKey]);

    useEffect(() => {
        updateActiveCampAndLocation();
        window.addEventListener('campChange', updateActiveCampAndLocation);

        const prefsRef = ref(database, `users/${user?.uid}/weatherPreferences`);
        const unsubPrefs = onValue(prefsRef, (snapshot) => {
            setWeatherPreferences(snapshot.val());
        });

        return () => {
            window.removeEventListener('campChange', updateActiveCampAndLocation);
            unsubPrefs();
        };
    }, [user, updateActiveCampAndLocation]);

    const fetchWeatherData = useCallback(async (location, setter, isTemporary = false) => {
        if (!location || !location.latitude || !location.longitude) {
            setter({ data: null, loading: false, error: "Invalid location", lastFetched: Date.now() });
            return;
        }

        setter(prev => ({ ...prev, loading: true, error: null }));

        const params = new URLSearchParams({
            latitude: location.latitude,
            longitude: location.longitude,
            current: "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,relative_humidity_2m",
            hourly: "temperature_2m,precipitation_probability,weather_code,wind_speed_10m",
            daily: "weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_sum,precipitation_probability_max",
            timezone: "auto"
        });

        try {
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();

            const processedData = { ...data, sixHourForecast: processSixHourForecast(data.hourly) };

            if (isTemporary) {
                setTemporaryWeatherData({ data: processedData, loading: false, error: null });
            } else {
                setter(prev => ({ ...prev, data: processedData, loading: false, error: null, lastFetched: Date.now() }));
            }
        } catch (error) {
            console.error("Failed to fetch weather data:", error);
            const errorState = { data: null, loading: false, error: error.message, lastFetched: Date.now(), status: 'error' };
            if (isTemporary) {
                setTemporaryWeatherData(errorState);
            } else {
                setter(errorState);
            }
        }
    }, []);

    useEffect(() => {
        if (locations.primary && (isDataStale(primaryWeatherData.lastFetched) || primaryWeatherData.status === 'using_default_location' && !primaryWeatherData.data)) {
            fetchWeatherData(locations.primary, setPrimaryWeatherData, false);
        }
    }, [locations.primary, primaryWeatherData.lastFetched, primaryWeatherData.data, primaryWeatherData.status, fetchWeatherData]);

    useEffect(() => {
        if (locations.secondary && isDataStale(secondaryWeatherData.lastFetched)) {
            fetchWeatherData(locations.secondary, setSecondaryWeatherData, false);
        } else if (!locations.secondary) {
            setSecondaryWeatherData({ data: null, loading: false, error: null, lastFetched: null });
        }
    }, [locations.secondary, secondaryWeatherData.lastFetched, fetchWeatherData]);

    const fetchTemporaryWeather = useCallback((lat, long) => {
        fetchWeatherData({ latitude: lat, longitude: long, name: "Manual Entry" }, setTemporaryWeatherData, true);
    }, [fetchWeatherData]);

    const value = useMemo(() => ({
        primary: { ...primaryWeatherData, location: locations.primary },
        secondary: { ...secondaryWeatherData, location: locations.secondary },
        temporary: temporaryWeatherData,
        preferences: weatherPreferences,
        campID: campID,
        refresh: () => {
            if (locations.primary) fetchWeatherData(locations.primary, setPrimaryWeatherData, false);
            if (locations.secondary) fetchWeatherData(locations.secondary, setSecondaryWeatherData, false);
        },
        fetchTemporaryWeather,
        clearTemporaryWeather: () => setTemporaryWeatherData({ data: null, loading: false, error: null }),
    }), [primaryWeatherData, secondaryWeatherData, temporaryWeatherData, locations, weatherPreferences, campID, fetchWeatherData, fetchTemporaryWeather]);

    return (
        <WeatherContext.Provider value={value}>
            {children}
        </WeatherContext.Provider>
    );
};