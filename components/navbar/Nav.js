'use client';
import { useState, useEffect, useRef, forwardRef } from "react";
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    registerUser,
    registerOtherUser,
    loginUser,
    logoutUser,
    auth,
    database,
    onAuthStateChanged
} from "../../firebase/firebase";
import { ref, get, onValue, set, update, push as firebasePush } from "firebase/database";

import Cookies from "js-cookie";
import { useWeather } from '../../hooks/useWeather';

import { IconCheckbox, IconPlus, IconUser, IconInfoCircle, IconMessage, IconX, IconLogout, IconAlertCircle } from "@tabler/icons-react";
import {
    Badge,
    Box,
    Group,
    Text,
    TextInput,
    UnstyledButton,
    Button,
    Popover,
    Paper,
    Tooltip,
    Modal,
    Burger,
    ActionIcon,
    Title,
    Select,
    Alert,
    Divider
} from "@mantine/core";

import classes from "./Navbar.module.css";
import WeatherNavWidget from '../weather/WeatherNavWidget';

// This new wrapper component will conditionally render the weather section
const WeatherSectionWrapper = () => {
    const { primary, preferences } = useWeather();

    // Only render the section if the widget is enabled and has data
    if (!preferences?.navWidget?.visible || !primary.data) {
        return null;
    }

    return (
        <div className={classes.navSection}>
            <WeatherNavWidget />
        </div>
    );
};

const SelfRegistrationAndLogin = ({ user, setUser, userData, setUserData, setNavIsOpen }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);

    useEffect(() => {
        const savedEmail = Cookies.get("rememberedEmail");
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        if (isRegistering) {
            if (password !== passwordConfirm) {
                setError("Passwords do not match.");
                return;
            }
            try {
                const userResult = await registerUser(email, password, name);
                if (userResult) {
                    setUser(userResult);
                    const userDataRef = ref(database, `users/${userResult.uid}`);
                    const snapshot = await get(userDataRef);
                    if (snapshot.exists()) {
                        setUserData(snapshot.val());
                    } else {
                        setError("No user data found for this account.");
                    }
                } else {
                    setError("Registration failed. Please try again.");
                }
            } catch (authError) {
                setError(authError.message);
            }
        } else {
            try {
                const userResult = await loginUser(email, password);
                if (userResult) {
                    setUser(userResult);
                    const userDataRef = ref(database, `users/${userResult.uid}`);
                    const snapshot = await get(userDataRef);
                    if (snapshot.exists()) {
                        setUserData(snapshot.val());
                    } else {
                        setError("No user data found for this account.");
                    }
                    if (rememberMe) {
                        Cookies.set("rememberedEmail", email, { expires: 30 });
                    } else {
                        Cookies.remove("rememberedEmail");
                    }
                } else {
                    setError("Login failed. Please check your credentials.");
                }
            } catch (authError) {
                setError(authError.message);
            }
        }
    };

    return (
        <div className={classes.loginContainer}>
            <Paper withBorder p="xl" radius="md" style={{ width: '400px', maxWidth: '95vw' }}>
                <Title order={2} ta="center" mb="xl">{isRegistering ? 'Create Account' : 'Welcome Back'}</Title>
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                    {isRegistering && (
                        <TextInput label="Name" placeholder="Your name" value={name} onChange={(event) => setName(event.currentTarget.value)} required size="md" />
                    )}
                    <TextInput label="Email" placeholder="your@email.com" value={email} onChange={(event) => setEmail(event.currentTarget.value)} required size="md" />
                    <TextInput label="Password" type="password" placeholder="Your password" value={password} onChange={(event) => setPassword(event.currentTarget.value)} required size="md" />
                    {isRegistering && (
                        <TextInput label="Repeat Password" type="password" placeholder="Repeat your password" value={passwordConfirm} onChange={(event) => setPasswordConfirm(event.currentTarget.value)} required size="md" />
                    )}
                    <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", color: "#868e96" }}>
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ marginRight: '4px' }} />
                        Remember me
                    </label>
                    <Button type="submit" fullWidth size="md">
                        {isRegistering ? "Register" : "Login"}
                    </Button>
                    <Button type="button" variant="default" fullWidth onClick={() => setIsRegistering(!isRegistering)} size="md">
                        {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
                    </Button>
                    {error && <Text c="red" ta="center" size="sm" mt="xs">{error}</Text>}
                </form>
            </Paper>
        </div>
    );
};

const CampSelector = forwardRef(({ user, userData, campID, onCampSelect, onCampsLoaded, effectiveRole }, forwardedRef) => {
    const [camps, setCamps] = useState({});
    const [loadingCamps, setLoadingCamps] = useState(true);
    const [errorCamps, setErrorCamps] = useState(null);

    const handleCampChange = (value) => {
        onCampSelect(value);
        if (value && user) {
            Cookies.set(`campID_${user.uid}`, value, { expires: 30 });
        } else if (user) {
            Cookies.remove(`campID_${user.uid}`);
        }
        window.dispatchEvent(new Event('campChange'));
    };

    useEffect(() => {
        if (!user || !user.uid) {
            setLoadingCamps(false);
            if (onCampsLoaded) onCampsLoaded(false);
            return;
        }

        const fetchAssignedCamps = async () => {
            setLoadingCamps(true);
            setErrorCamps(null);
            try {
                const userAssignedCampsRef = ref(database, `users/${user.uid}/assignedCamps`);
                const snapshot = await get(userAssignedCampsRef);
                let fetchedCampsData = {};

                if (snapshot.exists()) {
                    fetchedCampsData = snapshot.val();
                    setCamps(fetchedCampsData);

                    const campKeys = Object.keys(fetchedCampsData);
                    if (campKeys.length === 1 && !campID) {
                        handleCampChange(campKeys[0]);
                    }
                } else {
                    setErrorCamps("You must be assigned to a camp to access camp-specific features.");
                }

                if (onCampsLoaded) {
                    onCampsLoaded(snapshot.exists() && Object.keys(fetchedCampsData).length > 0);
                }
            } catch (fetchError) {
                setErrorCamps("Error fetching assigned camps: " + fetchError.message);
                if (onCampsLoaded) onCampsLoaded(false);
            }
            setLoadingCamps(false);
        };

        fetchAssignedCamps();
    }, [user, onCampsLoaded]); // Note: handleCampChange is defined outside so it's stable

    const campOptions = Object.entries(camps).map(([id, campData]) => ({
        id,
        label: campData.campName || `Unnamed Camp (${id})`
    }));

    const roleName = effectiveRole > 0 ? (['Disabled', 'Visitor', 'Apprentice', 'Jr. Crew Member', 'Crew Member', 'Crew Boss', 'Camp Boss', 'Company Boss', 'Company Owner', 'App Admin', 'Super Admin'][effectiveRole] || 'Unknown') : 'N/A';

    return (
        <div ref={forwardedRef} style={{ width: '100%' }}>
            {loadingCamps ? (
                <Text>Loading camps...</Text>
            ) : campID ? (
                <>
                    <Title order={3} ta="center">{camps[campID]?.campName || 'Selected Camp'}</Title>
                    <Text size="sm" c="dimmed" ta="center">Effective Role: {roleName}</Text>
                    {campOptions.length > 1 && (
                        <>
                            <Divider my="sm" label="Switch Camp" labelPosition="center" />
                            <Group justify="center" gap="sm" className={classes.campBadgeContainer}>
                                {campOptions.map(camp => (
                                    <Badge
                                        key={camp.id}
                                        size="xl"
                                        radius="sm"
                                        variant={camp.id === campID ? "filled" : "light"}
                                        color={camp.id === campID ? "blue" : "gray"}
                                        onClick={() => handleCampChange(camp.id)}
                                        className={classes.campBadge}
                                    >
                                        {camp.label}
                                    </Badge>
                                ))}
                            </Group>
                        </>
                    )}
                </>
            ) : (
                <>
                    <Text ta="center" fw={500} size="lg">Please select your active camp:</Text>
                    <Group justify="center" gap="sm" className={classes.campBadgeContainer}>
                        {campOptions.length > 0 ? campOptions.map(camp => (
                            <Badge
                                key={camp.id}
                                size="xl"
                                radius="sm"
                                variant="light"
                                onClick={() => handleCampChange(camp.id)}
                                className={classes.campBadge}
                            >
                                {camp.label}
                            </Badge>
                        )) : (
                            <Text c="dimmed">{errorCamps || "You must be assigned to a camp to access camp-specific features."}</Text>
                        )}
                    </Group>
                </>
            )}
        </div>
    );
});
CampSelector.displayName = 'CampSelector';

const PrintDBButton = () => {
    const [dbData, setDbData] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const styles = {
        popup: {
            position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000,
        },
        popupContent: {
            backgroundColor: "white", padding: "20px", borderRadius: "10px", width: "80%", maxWidth: "600px", position: "relative",
        },
        closeButton: {
            position: "absolute", top: "10px", right: "10px", background: "red", color: "white",
            border: "none", cursor: "pointer", padding: "5px", fontSize: "16px", borderRadius: "5px",
        },
        copyButton: {
            background: "#007BFF", color: "white", border: "none", cursor: "pointer",
            padding: "8px 12px", fontSize: "14px", borderRadius: "5px", marginBottom: "10px",
        },
        copySuccess: { marginLeft: "10px", color: "green", fontWeight: "bold" },
        textarea: { width: "100%", height: "300px", resize: "none", fontFamily: "monospace", fontSize: "14px", padding: "10px", border: "1px solid #ccc", borderRadius: "5px" },
    };

    const handlePrintDB = async () => {
        try {
            const dbRef = ref(database, "/");
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                setDbData(JSON.stringify(snapshot.val(), null, 2));
                setShowPopup(true);
            } else {
                alert("Database is empty.");
            }
        } catch (error) {
            alert("Error fetching database: " + error.message);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(dbData)
            .then(() => { setCopySuccess(true); setTimeout(() => setCopySuccess(false), 2000); })
            .catch((err) => console.error("Copy failed:", err));
    };

    return (
        <>
            <button onClick={handlePrintDB}>Print DB</button>
            {showPopup && (
                <div style={styles.popup}>
                    <div style={styles.popupContent}>
                        <button style={styles.closeButton} onClick={() => setShowPopup(false)}>✖</button>
                        <h3>Database Output</h3>
                        <button style={styles.copyButton} onClick={handleCopyToClipboard}>
                            📋 Copy to Clipboard
                        </button>
                        {copySuccess && <span style={styles.copySuccess}>✔ Copied!</span>}
                        <textarea readOnly value={dbData} style={styles.textarea} />
                    </div>
                </div>
            )}
        </>
    );
};

const RegisterOtherUser = ({ user, setUser }) => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleRegistration = async (e) => {
        e.preventDefault();
        try {
            const user = await registerOtherUser(email, name, role);
            setUser(user);
        } catch (error) {
            setError(error.message);
        }
    };

    return (
        <div style={{ marginBottom: "20px" }}>
            {isOpen && (
                <div style={{
                    position: 'fixed',
                    width: '100vw',
                    height: '100vh',
                    top: 0,
                    left: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <div
                        style={{
                            width: '600px',
                            maxWidth: '98vw',
                            padding: '1rem',
                            backgroundColor: 'tan',
                            position: 'relative'
                        }}
                    >
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'red',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '5px',
                                fontSize: '16px',
                                borderRadius: '5px'
                            }}
                        >
                            ✖
                        </button>
                        <form onSubmit={handleRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            />
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            >
                                <option value="">Select a role</option>
                                <option value="9">App Creator</option>
                                <option value="8">App Manager</option>
                                <option value="7">Client</option>
                                <option value="6">Camp Boss</option>
                                <option value="5">Foreman</option>
                                <option value="4">Employee</option>
                                <option value="3">Trainee</option>
                                <option value="2">Visitor</option>
                            </select>
                            <button type="submit" style={{
                                padding: '10px',
                                backgroundColor: 'brown',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                            }}>
                                Register
                            </button>
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                        </form>
                    </div>
                </div>
            )}
            <button onClick={() => setIsOpen(true)}>Register Other User</button>
        </div>
    );
};

const SelectAUserDropdown = ({ onUserSelected }) => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const usersRef = ref(database, 'users');
        get(usersRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const userArray = Object.entries(data).map(([userID, userInfo]) => ({
                        id: userID,
                        name: userInfo.name || userInfo.email || `Unnamed User (${userID})`,
                    }));
                    setUsers(userArray);
                } else {
                    setUsers([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
            });
    }, []);

    const handleChange = (event) => {
        const selectedUserId = event.target.value;
        onUserSelected(selectedUserId);
    };

    return (
        <div>
            <label htmlFor="userSelect">Select a User Account to Modify:</label>
            <select id="userSelect" onChange={handleChange}>
                <option value="">-- Select --</option>
                {users.map((user) => (
                    <option key={user.id} value={user.id}>
                        {user.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

const SelectACampDropdown = ({ onCampSelected }) => {
    const [camps, setCamps] = useState([]);

    useEffect(() => {
        const campsRef = ref(database, 'camps');

        get(campsRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const campArray = Object.entries(data).map(([campID, campInfo]) => ({
                        id: campID,
                        name: campInfo.campName || `Unnamed Camp (${campID})`,
                    }));
                    setCamps(campArray);
                } else {
                    setCamps([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching camps:", error);
            });
    }, []);

    const handleChange = (event) => {
        const selectedCampID = event.target.value;
        const selectedCamp = camps.find(camp => camp.id === selectedCampID) || null;
        onCampSelected(selectedCamp);
    };

    return (
        <div>
            <label htmlFor="campSelect">Select a camp: // still need to have this update the camp's user list too</label>
            <select id="campSelect" onChange={handleChange}>
                <option value="">-- Select --</option>
                {camps.map((camp) => (
                    <option key={camp.id} value={camp.id}>
                        {camp.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

const AddUserToCamp = ({ selectedUserID, currentUserRole }) => {
    const [selectedCamp, setSelectedCamp] = useState(null);
    const [selectedRole, setSelectedRole] = useState(1);
    const maxAssignableRole = currentUserRole ? Math.max(currentUserRole, 1) : 1;
    const roleOptions = [];
    const labels = ["", "Unassigned", "Visitor", "Trainee", "Employee", "Foreman", "Camp Boss", "Client", "App Manager", "App Creator"];
    for (let i = 1; i <= maxAssignableRole && i <= 9; i++) {
        roleOptions.push({ role: i, label: labels[i] });
    }

    const handleAssign = async () => {
        if (!selectedUserID || !selectedCamp) {
            alert("Please select a camp and a role.");
            return;
        }
        try {
            const updates = {};
            updates[`users/${selectedUserID}/assignedCamps/${selectedCamp.id}`] = { role: selectedRole, campName: selectedCamp.name };
            updates[`camps/${selectedCamp.id}/users/${selectedUserID}`] = { role: selectedRole, };
            await update(ref(database), updates);
            alert(`User assigned to ${selectedCamp.name} with role ${selectedRole}`);
        } catch (error) { console.error('Error assigning user to camp:', error); }
    };

    return (
        <div>
            <h4>Assign User to Camp</h4>
            <SelectACampDropdown onCampSelected={setSelectedCamp} />
            <div style={{ marginTop: "10px" }}>
                <label htmlFor="roleSelect">Select Role:</label>
                <select id="roleSelect" value={selectedRole} onChange={(e) => setSelectedRole(parseInt(e.target.value, 10))}>
                    {roleOptions.map((roleOption) => (<option key={roleOption.role} value={roleOption.role}>{roleOption.label}</option>))}
                </select>
            </div>
            <button onClick={handleAssign} style={{ marginTop: "10px" }}>Assign User to Camp</button>
        </div>
    );
};

const UserManagement = ({ currentUserRole }) => {
    const [isRegisterOtherUserOpen, setIsRegisterOtherUserOpen] = useState(false);
    const [selectedUserID, setSelectedUserID] = useState(null);
    const [assignedCamps, setAssignedCamps] = useState(null);

    useEffect(() => {
        if (selectedUserID) {
            const assignedCampsRef = ref(database, `users/${selectedUserID}/assignedCamps`);
            get(assignedCampsRef)
                .then((snapshot) => { setAssignedCamps(snapshot.exists() ? snapshot.val() : {}); })
                .catch((error) => { console.error("Error fetching assigned camps:", error); setAssignedCamps({}); });
        } else {
            setAssignedCamps(null);
        }
    }, [selectedUserID]);

    return (
        <div style={{ border: 'solid 1px red', padding: '48px', width: '100%', marginTop: "10px" }}>
            <h2>User Accounts Management</h2>
            <RegisterOtherUser />
            <SelectAUserDropdown onUserSelected={setSelectedUserID} />
            {selectedUserID && (
                <>
                    <AddUserToCamp selectedUserID={selectedUserID} currentUserRole={currentUserRole} />
                    <div style={{ marginTop: "16px" }}>
                        <h4>Assigned Camps for Selected User:</h4>
                        {assignedCamps && Object.keys(assignedCamps).length > 0 ? (
                            <ul>
                                {Object.entries(assignedCamps).map(([campID, campData]) => (
                                    <li key={campID}>
                                        {campData.campName} (Role: {campData.role})
                                    </li>
                                ))}
                            </ul>
                        ) : (<p>No assigned camps.</p>)}
                    </div>
                </>
            )}
        </div>
    );
};

const AuthForm = ({ user, setUser, userData, setUserData, campID, setCampID }) => {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") { setIsHydrated(true); }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                try {
                    const userRef = ref(database, `users/${currentUser.uid}`);
                    const snapshot = await get(userRef);
                    setUserData(snapshot.exists() ? snapshot.val() : null);
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserData(null);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
        });
        return () => unsubscribe();
    }, [isHydrated, setUser, setUserData]);

    if (!isHydrated || user === undefined || userData === undefined) return null;

    return (
        <div>
            test
            <PrintDBButton />
            <UserManagement currentUserRole={userData ? userData.role : 9} />
            <CampSelector user={user} userData={userData} campID={campID} onCampSelect={setCampID} />
        </div>
    );
}

export default function Nav({ user, setUser, userData, setUserData, campID, setCampID, handleComponentChange, effectiveRole, unreadCount, badgeColor, visibleComponent }) {
    const [navIsOpen, setNavIsOpen] = useState(true);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    useEffect(() => {
        if (user === null || visibleComponent === null) {
            setNavIsOpen(true);
        }
    }, [user, visibleComponent]);

    const confirmLogout = async () => {
        if (user) {
            Cookies.remove(`campID_${user.uid}`);
        }
        await logoutUser();
        setUser(null);
        setUserData(null);
        setCampID(null);
        setIsLogoutModalOpen(false);
        setNavIsOpen(true);
        handleComponentChange(null);
    };

    const getPageTitle = (component) => {
        if (!component) return 'Plantiful';
        const componentMap = {
            messages: 'Messages',
            tasks: 'Tasks',
            calendar: 'Calendar',
            appFeedback: 'App Feedback',
            weather: 'Weather',
            polls: 'Polls',
            trade: 'Buy/Sell/Trade',
            music: 'Planting Music',
            birthdays: 'Birthdays',
            myAccount: 'My Account',
            userManagement: 'User Management',
            campManagement: 'Camp Management',
            crewManagement: 'Crew Management',
            inventory: 'Inventory',
            recipes: 'Recipes',
            orders: 'Orders',
            deliveries: 'Deliveries',
            budget: 'Budget',
            reports: 'Reports',
            staff: 'Staff List',
        };
        return componentMap[component] || 'Plantiful';
    };

    const links = [
        { icon: IconMessage, label: "Messages", notifications: unreadCount, color: badgeColor, onClick: () => { handleComponentChange('messages'); setNavIsOpen(false); }, section: "messages", isFunctional: true },
        { icon: IconCheckbox, label: "Tasks", notifications: 0, onClick: () => { handleComponentChange('tasks'); setNavIsOpen(false); }, section: "tasks", isFunctional: false },
        { icon: IconUser, label: "Calendar", onClick: () => { handleComponentChange('calendar'); setNavIsOpen(false); }, section: "calendar", isFunctional: true },
    ];

    const allCollections = [
        { emoji: "💡", label: "App Feedback", onClick: () => { handleComponentChange('appFeedback'); setNavIsOpen(false); }, section: "appFeedback", isFunctional: false },
        { emoji: "🌦️", label: "Weather", onClick: () => { handleComponentChange('weather'); setNavIsOpen(false); }, section: "weather", isFunctional: true },
        { emoji: "📊", label: "Polls", onClick: () => { handleComponentChange('polls'); setNavIsOpen(false); }, section: "polls", isFunctional: true },
        { emoji: "🤝", label: "Buy/Sell/Trade", onClick: () => { handleComponentChange('trade'); setNavIsOpen(false); }, section: "trade", isFunctional: false },
        { emoji: "🎵", label: "Planting Music", onClick: () => { handleComponentChange('music'); setNavIsOpen(false); }, section: "music", isFunctional: false },
        { emoji: "🎂", label: "Birthdays", onClick: () => { handleComponentChange('birthdays'); setNavIsOpen(false); }, section: "birthdays", isFunctional: true },
        { emoji: "👤", label: "My Account", onClick: () => { handleComponentChange('myAccount'); setNavIsOpen(false); }, section: "myAccount", isFunctional: true },
        { emoji: "👥", label: "User Management", onClick: () => { handleComponentChange('userManagement'); setNavIsOpen(false); }, section: "userManagement", isFunctional: true },
        { emoji: "🏕️", label: "Camp Management", onClick: () => { handleComponentChange('campManagement'); setNavIsOpen(false); }, section: "campManagement", isFunctional: true },
        { emoji: "👨‍👩‍👧‍👦", label: "Crew Management", onClick: () => { handleComponentChange('crewManagement'); setNavIsOpen(false); }, section: "crewManagement", isFunctional: true },
        { emoji: "📦", label: "Inventory", onClick: () => { handleComponentChange('inventory'); setNavIsOpen(false); }, section: "inventory", isFunctional: false },
        { emoji: "🍲", label: "Recipes", onClick: () => { handleComponentChange('recipes'); setNavIsOpen(false); }, section: "recipes", isFunctional: false },
        { emoji: "🛒", label: "Orders", onClick: () => { handleComponentChange('orders'); setNavIsOpen(false); }, section: "orders", isFunctional: false },
        { emoji: "🚚", label: "Deliveries", onClick: () => { handleComponentChange('deliveries'); setNavIsOpen(false); }, section: "deliveries", isFunctional: false },
        { emoji: "💸", label: "Budget", onClick: () => { handleComponentChange('budget'); setNavIsOpen(false); }, section: "budget", isFunctional: false },
        { emoji: "📊", label: "Reports", onClick: () => { handleComponentChange('reports'); setNavIsOpen(false); }, section: "reports", isFunctional: false },
        { emoji: "📋", label: "Staff List", onClick: () => { handleComponentChange('staff'); setNavIsOpen(false); }, section: "staff", isFunctional: false },
    ];

    const collections = [
        ...allCollections.filter(item => item.isFunctional),
        ...allCollections.filter(item => !item.isFunctional)
    ];

    const renderNavItem = (item, isCollectionLink = false) => {
        const itemOnClick = (event) => {
            event.preventDefault();
            if (item.isFunctional && item.onClick) {
                item.onClick();
            } else if (!item.isFunctional) {
                console.log(`${item.label} is coming soon!`);
            }
        };

        const content = isCollectionLink ? (
            <a href="#" onClick={itemOnClick} className={classes.collectionLink} style={{ opacity: item.isFunctional ? 1 : 0.5, cursor: item.isFunctional ? 'pointer' : 'not-allowed' }}>
                <Box component="span" mr={9} fz={16}>{item.emoji}</Box>
                {item.label}
            </a>
        ) : (
            <UnstyledButton onClick={itemOnClick} className={classes.mainLink} style={{ opacity: item.isFunctional ? 1 : 0.5, cursor: item.isFunctional ? 'pointer' : 'not-allowed' }}>
                <div className={classes.mainLinkInner}>
                    <item.icon size={22} className={classes.mainLinkIcon} stroke={1.5} />
                    <span>{item.label}</span>
                </div>
                {item.notifications > 0 && (
                    <Badge size="lg" variant="filled" className={classes.mainLinkBadge} color={item.color || 'blue'}>
                        {item.notifications}
                    </Badge>
                )}
            </UnstyledButton>
        );

        if (!item.isFunctional) {
            return (
                <Tooltip label="Coming soon!" key={item.label} position="right" withArrow openDelay={300} withinPortal>
                    <div style={{ display: 'block' }} onClick={(e) => { if (!item.isFunctional) e.stopPropagation(); }}>{content}</div>
                </Tooltip>
            );
        }
        return <div key={item.label}>{content}</div>;
    };

    const mainLinks = links.map(link => renderNavItem(link));
    const collectionLinks = collections.map(collection => renderNavItem(collection, true));

    const overlayVariants = {
        hidden: { opacity: 0, transition: { duration: 0.2 } },
        visible: { opacity: 1, transition: { duration: 0.2 } },
    };

    return (
        <>
            <header className={classes.appHeader}>
                <Image src="/icons/icon-192x192.png" alt="App Logo" width={40} height={40} className={classes.logo} />
                <Title order={4} className={classes.headerTitle}>{getPageTitle(visibleComponent)}</Title>
                <Burger opened={navIsOpen} onClick={() => setNavIsOpen((o) => !o)} color="white" aria-label="Toggle navigation" className={classes.menuButton} />
            </header>

            <AnimatePresence>
                {navIsOpen && (
                    <motion.div
                        className={classes.overlay}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        variants={overlayVariants}
                        transition={{ duration: 0.3, ease: 'easeInOut' }}
                    >
                        <div className={classes.overlayContent}>
                            <div className={classes.closeButtonContainer}>
                                <ActionIcon onClick={() => setNavIsOpen(false)} variant="transparent" size="xl" aria-label="Close menu">
                                    <IconX color="#495057" size={36} />
                                </ActionIcon>
                            </div>

                            {!user ? (
                                <SelfRegistrationAndLogin
                                    user={user} setUser={setUser} userData={userData} setUserData={setUserData} setNavIsOpen={setNavIsOpen}
                                />
                            ) : (
                                <Box mt={40} style={{ width: '100%', maxWidth: '800px', margin: 'auto' }}>
                                    <div className={classes.navSection}>
                                        <CampSelector
                                            user={user}
                                            userData={userData}
                                            campID={campID}
                                            onCampSelect={setCampID}
                                            effectiveRole={effectiveRole}
                                        />
                                    </div>

                                    <WeatherSectionWrapper />

                                    <div className={classes.navSection}>
                                        <div className={classes.mainLinks}>{mainLinks}</div>
                                    </div>

                                    {campID && (
                                        <div className={classes.navSection}>
                                            <Group className={classes.collectionsHeader} justify="space-between">
                                                <Text size="sm" fw={500} c="dimmed">Camp Tools</Text>
                                            </Group>
                                            <div className={classes.collections}>{collectionLinks}</div>
                                        </div>
                                    )}

                                    <div className={classes.navSection}>
                                        <Button
                                            fullWidth
                                            variant="light"
                                            color="red"
                                            leftSection={<IconLogout size={18} />}
                                            onClick={() => setIsLogoutModalOpen(true)}
                                        >
                                            Logout
                                        </Button>
                                    </div>
                                </Box>
                            )}
                        </div>
                        <Modal
                            opened={isLogoutModalOpen}
                            onClose={() => setIsLogoutModalOpen(false)}
                            title="Confirm Logout"
                            centered
                            zIndex={3000}
                        >
                            <Text>Are you sure you want to log out?</Text>
                            <Group mt="xl" justify="flex-end">
                                <Button variant="default" onClick={() => setIsLogoutModalOpen(false)}>
                                    Cancel
                                </Button>
                                <Button color="red" onClick={confirmLogout}>
                                    Logout
                                </Button>
                            </Group>
                        </Modal>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}