'use client';
import { useState, useEffect } from "react";
import {
    registerUser,
    registerOtherUser,
    loginUser,
    logoutUser,
    auth,
    database,
    onAuthStateChanged
} from "../../firebase/firebase";
import { ref, get, set, update } from "firebase/database"; // Import only what’s needed

import Cookies from "js-cookie";

import { IconBulb, IconCheckbox, IconPlus, IconSearch, IconUser } from "@tabler/icons-react";
import {
    ActionIcon,
    Badge,
    Box,
    Code,
    Group,
    Text,
    TextInput,
    Tooltip,
    UnstyledButton,
    Button
} from "@mantine/core";

import classes from "./Navbar.module.css";

// NOTE: registerUser, loginUser, and logoutUser should be defined/imported from your auth utils

const SelfRegistrationAndLogin = ({ user, setUser, userData, setUserData }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);

    // On mount, check if there's a remembered email in the cookies.
    useEffect(() => {
        const savedEmail = Cookies.get("rememberedEmail");
        if (savedEmail) {
            setEmail(savedEmail);
            setRememberMe(true);
        }
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            let userResult;
            if (isRegistering) {
                userResult = await registerUser(email, password, name);
            } else {
                userResult = await loginUser(email, password);
            }
            setUser(userResult);
            try {
                const userDataRef = ref(database, `users/${userResult.uid}`);
                const snapshot = await get(userDataRef);
                if (snapshot.exists()) {
                    setUserData(snapshot.val());
                } else {
                    setError("No user data found");
                    alert("No user data found");
                }
            } catch (error) {
                setError("Error getting user data: " + error.message);
                alert("Error getting user data: " + error.message);
            }

            // If "Remember me" is checked, store the email in a cookie for 30 days.
            if (rememberMe) {
                Cookies.set("rememberedEmail", email, { expires: 30 });
            } else {
                Cookies.remove("rememberedEmail");
            }
        } catch (error) {
            setError(error.message);
        }
    };

    const handleLogout = async () => {
        if (!window.confirm("Are you sure you want to logout?")) {
            return;
        }
        await logoutUser();
        setUser(null);
        setUserData(null);
    };

    // If user is logged in, display info with a logout button
    if (user) {
        return (
            <div style={{ display: "flex", alignItems: "center", gap: "12px", fontSize: "16px", marginBottom: "8px", marginTop: "-10px" }}>
                <p style={{ margin: 0 }}>
                    Welcome, <span style={{ fontWeight: "bold" }}>{userData ? `${userData.name}` : "Loading..."}</span>
                </p>
                <button
                    onClick={handleLogout}
                    style={{
                        padding: "0px 6px 3px 6px",
                        backgroundColor: "#222",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Logout
                </button>
            </div>
        );
    }

    // If not logged in, display a full-screen overlay login/register form
    return (
        <div
            style={{
                position: "fixed",
                width: "100vw",
                height: "100vh",
                top: 0,
                left: 0,
                background: "rgba(0,0,0,0.8)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                alignItems: "center",
                zIndex: 1000
            }}
        >
            <div
                style={{
                    width: "600px",
                    maxWidth: "90vw",
                    padding: "1.5rem",
                    backgroundColor: "tan",
                    borderRadius: "8px",
                    boxShadow: "0 4px 8px rgba(0,0,0,0.2)"
                }}
            >
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{
                            padding: "10px",
                            fontSize: "16px",
                            borderRadius: "4px",
                            border: "1px solid #ccc"
                        }}
                    />
                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{
                            padding: "10px",
                            fontSize: "16px",
                            borderRadius: "4px",
                            border: "1px solid #ccc"
                        }}
                    />
                    {isRegistering && (
                        <input
                            type="text"
                            placeholder="Name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            style={{
                                padding: "10px",
                                fontSize: "16px",
                                borderRadius: "4px",
                                border: "1px solid #ccc"
                            }}
                        />
                    )}
                    {/* Remember Me Checkbox */}
                    <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "14px" }}>
                        <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                        />
                        Remember me
                    </label>
                    <button
                        type="submit"
                        style={{
                            padding: "10px",
                            backgroundColor: "brown",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        }}
                    >
                        {isRegistering ? "Register" : "Login"}
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsRegistering(!isRegistering)}
                        style={{
                            padding: "10px",
                            backgroundColor: "gray",
                            color: "white",
                            border: "none",
                            borderRadius: "4px",
                            cursor: "pointer"
                        }}
                    >
                        {isRegistering ? "Switch to Login" : "Switch to Register"}
                    </button>
                    {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}
                </form>
            </div>
        </div>
    );
};

const CampSelector = ({ user, userData, campID, onCampSelect }) => {
    const [camps, setCamps] = useState({});
    const [selectedCamp, setSelectedCamp] = useState(campID);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user || !userData) return;
        const fetchCamps = async () => {
            setLoading(true);
            setError(null);
            try {
                const userRef = ref(database, `users/${user.uid}/assignedCamps`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setCamps(snapshot.val());
                } else {
                    setError("No assigned camps found");
                }
            } catch (error) {
                setError("Error fetching camps: " + error.message);
            }
            setLoading(false);
        };
        fetchCamps();
    }, [user, userData]);

    // On mount, check if there's a remembered campID in the cookies.
    useEffect(() => {
        const storedCampID = Cookies.get("campID");
        if (storedCampID) {
            setSelectedCamp(storedCampID);
            onCampSelect(storedCampID);
        }
    }, [onCampSelect]);

    const handleCampChange = (e) => {
        const newCampID = e.target.value;
        setSelectedCamp(newCampID);
        onCampSelect(newCampID);
        // Remember this campID in a cookie for 30 days
        Cookies.set("campID", newCampID, { expires: 30 });
    };

    if (loading)
        return <p style={{ margin: 0, fontSize: "16px" }}>Loading camps...</p>;
    if (error)
        return <p style={{ color: "red", margin: 0, fontSize: "16px" }}>{error}</p>;

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <select
                value={selectedCamp}
                onChange={handleCampChange}
                style={{
                    padding: "8px 12px",
                    fontSize: "16px",
                    borderRadius: "4px",
                    border: "1px solid #ccc"
                }}
            >
                <option value="">Select a Camp</option>
                {Object.entries(camps).map(([campID, campData]) => (
                    <option key={campID} value={campID}>
                        {campData.campName || `Unnamed Camp (${campID})`}
                    </option>
                ))}
            </select>
            {campID && userData && userData.assignedCamps[campID] && (
                <div style={{ fontSize: "16px" }}>
                    {userData.assignedCamps[campID].role
                        ? "Camp Role: " + userData.assignedCamps[campID].role
                        : "No Camp Role Assigned"}
                </div>
            )}
        </div>
    );
};

export default function Nav({ user, setUser, userData, setUserData, campID, setCampID, navIsOpen, setNavIsOpen, handleComponentChange, isCalendarVisible, setIsCalendarVisible, isRecipesListVisible, setIsRecipesListVisible }) {

    const links = [
        { icon: IconBulb, label: "Messages", notifications: 3 },
        { icon: IconCheckbox, label: "Tasks", notifications: 4 },
        { icon: IconUser, label: "Calendar", onClick: () => handleComponentChange('calendar') },
    ];

    const collections = [
        { emoji: "👍", label: "Feedback", onClick: () => console.log("Feedback clicked") },
        { emoji: "📦", label: "Inventory", onClick: () => console.log("Inventory clicked") },
        { emoji: "🍲", label: "Recipes", onClick: () => handleComponentChange('recipes') },
        { emoji: "🛒", label: "Orders", onClick: () => console.log("Orders clicked") },
        { emoji: "🚚", label: "Deliveries", onClick: () => console.log("Deliveries clicked") },
        { emoji: "💸", label: "Budget", onClick: () => console.log("Budget clicked") },
        { emoji: "📊", label: "Reports", onClick: () => console.log("Reports clicked") },
        { emoji: "🎂", label: "Birthdays", onClick: () => console.log("Birthdays clicked") },
        { emoji: "📋", label: "Staff List", onClick: () => console.log("Staff List clicked") },
        { emoji: "👤", label: "User Management", onClick: () => console.log("User Management clicked") },
    ];

    // Build main links using Mantine's UnstyledButton and your CSS modules
    const mainLinks = links.map((link) => (
        <UnstyledButton key={link.label} className={classes.mainLink}
            onClick={(event) => {
                event.preventDefault();
                if (link.onClick) {
                    link.onClick();
                }
            }}>
            <div className={classes.mainLinkInner}>
                <link.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
                <span>{link.label}</span>
            </div>
            {link.notifications && (
                <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
                    {link.notifications}
                </Badge>
            )}
        </UnstyledButton>
    ));

    const collectionLinks = collections.map((collection) => (
        <a
            href="#"
            key={collection.label}
            onClick={(event) => {
                event.preventDefault();
                if (collection.onClick) {
                    collection.onClick();
                }
            }}
            className={classes.collectionLink}
        >
            <Box component="span" mr={9} fz={16}>
                {collection.emoji}
            </Box>
            {collection.label}
        </a>
    ));

    return (
        <>
            {navIsOpen && (
                <>
                    {/* Dark overlay covers the entire screen */}
                    <div
                        onClick={() => setNavIsOpen(false)}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            width: "100%",
                            height: "100%",
                            background: "rgba(0, 0, 0, 0.5)",
                            zIndex: 998
                        }}
                    />
                    {/* Nav sidebar positioned on top of all content */}
                    <nav
                        className={classes.navbar}
                        style={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            zIndex: 999,
                            height: "100%",
                            width: "300px", // Adjust width as needed
                            background: "#fff",
                            overflowY: "auto",
                            padding: "16px",
                            display: "flex",
                            flexDirection: "column"
                        }}
                    >
                        <div className={classes.section}>
                            <SelfRegistrationAndLogin
                                user={user}
                                setUser={setUser}
                                userData={userData}
                                setUserData={setUserData}
                            />
                        </div>

                        <div className={classes.section}>
                            <CampSelector
                                user={user}
                                userData={userData}
                                campID={campID}
                                onCampSelect={setCampID}
                            />
                        </div>

                        <TextInput
                            placeholder="Search"
                            size="xs"
                            leftSection={<IconSearch size={12} stroke={1.5} />}
                            styles={{ section: { pointerEvents: "none" } }}
                            mb="sm"
                        />

                        <div className={classes.section}>
                            <div className={classes.mainLinks}>{mainLinks}</div>
                        </div>

                        <div className={classes.section}>
                            <div className={classes.collections}>{collectionLinks}</div>
                        </div>

                        {/* "Close Menu" button at the bottom */}
                        <div className={classes.section} style={{ marginTop: "auto", padding: "16px" }}>
                            <Button fullWidth onClick={() => setNavIsOpen(false)}>
                                Close Menu
                            </Button>
                        </div>
                    </nav>
                </>
            )}

            {/* Fixed "Menu" button displayed when nav is closed */}
            {!navIsOpen && (
                <button
                    onClick={() => setNavIsOpen(true)}
                    style={{
                        position: "fixed",
                        top: "16px",
                        right: "16px",
                        zIndex: 1000,
                        padding: "8px 12px",
                        backgroundColor: "#333",
                        color: "#fff",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Menu
                </button>
            )}
        </>
    );
}