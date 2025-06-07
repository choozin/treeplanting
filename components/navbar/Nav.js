'use client';
import { useState, useEffect, useRef, forwardRef } from "react";
import {
    registerUser,
    loginUser,
    logoutUser,
    auth,
    database,
    onAuthStateChanged
} from "../../firebase/firebase";
import { ref, get, onValue } from "firebase/database";

import Cookies from "js-cookie";

import { IconBulb, IconCheckbox, IconPlus, IconSearch, IconUser, IconInfoCircle } from "@tabler/icons-react";
import {
    Badge,
    Box,
    Group,
    Text,
    TextInput,
    UnstyledButton,
    Button,
    Popover,
    Overlay,
    Paper,
    Tooltip,
    Modal
} from "@mantine/core";

import classes from "./Navbar.module.css";

const SelfRegistrationAndLogin = ({ user, setUser, userData, setUserData, setNavIsOpen }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [passwordConfirm, setPasswordConfirm] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

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

    const confirmLogout = async () => {
        await logoutUser();
        setUser(null);
        setUserData(null);
        Cookies.remove("campID");
        if (setNavIsOpen) setNavIsOpen(false);
        setIsLogoutModalOpen(false);
    };

    if (user) {
        return (
            <>
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
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", fontSize: "16px", marginBottom: "8px", marginTop: "0px" }}>
                    <p style={{ margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flexGrow: 1 }}>
                        Welcome, <span style={{ fontWeight: "bold" }}>{userData ? `${userData.name}` : "User"}</span>
                    </p>
                    <button
                        onClick={() => setIsLogoutModalOpen(true)}
                        style={{
                            padding: "4px 8px",
                            backgroundColor: "var(--mantine-color-red-6, #FA5252)",
                            color: "#fff",
                            border: "none",
                            borderRadius: "var(--mantine-radius-sm, 4px)",
                            cursor: "pointer",
                            fontSize: "14px",
                            flexShrink: 0
                        }}
                    >
                        Logout
                    </button>
                </div>
            </>
        );
    }

    return (
        <div
            style={{
                position: "fixed",
                top: 0, right: 0, bottom: 0, left: 0,
                background: "rgba(0,0,0,0.85)",
                display: "flex", flexDirection: "column",
                justifyContent: "center", alignItems: "center",
                zIndex: 2000
            }}
        >
             <div
                style={{
                    width: '400px', maxWidth: '95vw', padding: '24px',
                    borderRadius: '8px', border: '1px solid #dee2e6',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    backgroundColor: '#fff'
                }}
            >
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
                        <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ marginRight: '4px' }}/>
                        Remember me
                    </label>
                    <Button type="submit" fullWidth style={{ backgroundColor: "brown" }} size="md">
                        {isRegistering ? "Register" : "Login"}
                    </Button>
                    <Button type="button" variant="default" fullWidth onClick={() => setIsRegistering(!isRegistering)} size="md">
                        {isRegistering ? "Already have an account? Login" : "Need an account? Register"}
                    </Button>
                    {error && <Text c="red" ta="center" size="sm" mt="xs">{error}</Text>}
                </form>
            </div>
        </div>
    );
};

const CampSelector = forwardRef(({ user, userData: globalUserData, campID, onCampSelect, onCampsLoaded }, forwardedRef) => {
    const [camps, setCamps] = useState({});
    const [selectedCampState, setSelectedCampState] = useState(campID || "");
    const [currentCampRole, setCurrentCampRole] = useState(null);
    const [loadingCamps, setLoadingCamps] = useState(true);
    const [errorCamps, setErrorCamps] = useState(null);

    useEffect(() => {
        if (campID !== selectedCampState) {
            setSelectedCampState(campID || "");
        }
    }, [campID, selectedCampState]);

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
                } else {
                    setErrorCamps("No assigned camps found in global user profile.");
                }
                if (onCampsLoaded) onCampsLoaded(snapshot.exists() && Object.keys(fetchedCampsData).length > 0);

                const storedCampID = Cookies.get("campID");
                if (storedCampID && fetchedCampsData[storedCampID]) {
                     if (selectedCampState !== storedCampID) {
                        setSelectedCampState(storedCampID);
                        if (campID !== storedCampID) {
                           onCampSelect(storedCampID);
                        }
                    }
                } else if (!storedCampID && selectedCampState) {
                    setSelectedCampState("");
                     if (campID !== "") {
                        onCampSelect("");
                    }
                }
            } catch (fetchError) {
                setErrorCamps("Error fetching assigned camps: " + fetchError.message);
                if (onCampsLoaded) onCampsLoaded(false);
            }
            setLoadingCamps(false);
        };
        fetchAssignedCamps();
    }, [user, onCampSelect, onCampsLoaded]);

    useEffect(() => {
        if (user && user.uid && selectedCampState) {
            const campUserRoleRef = ref(database, `camps/${selectedCampState}/users/${user.uid}/role`);
            const unsubscribe = onValue(campUserRoleRef, (snapshot) => {
                if (snapshot.exists()) {
                    setCurrentCampRole(snapshot.val());
                } else {
                    setCurrentCampRole(globalUserData?.assignedCamps?.[selectedCampState]?.role || null);
                    console.log(`No specific role found for user ${user.uid} in camp ${selectedCampState} at /camps/${selectedCampState}/users/${user.uid}/role. Using global definition if available.`);
                }
            }, (error) => {
                console.error("Error fetching camp-specific user role:", error);
                setCurrentCampRole(globalUserData?.assignedCamps?.[selectedCampState]?.role || null);
            });
            return () => unsubscribe();
        } else {
            setCurrentCampRole(null);
        }
    }, [user, selectedCampState, globalUserData]);

    const handleCampChange = (e) => {
        const newCampID = e.target.value;
        setSelectedCampState(newCampID);
        onCampSelect(newCampID);
        if (newCampID) {
            Cookies.set("campID", newCampID, { expires: 30 });
        } else {
            Cookies.remove("campID");
        }
    };

    const campEntries = Object.entries(camps);

    return (
        <div
            ref={forwardedRef}
            style={{ display: "flex", flexDirection: 'column', gap: "8px", width: '100%' }}
        >
            <select
                value={selectedCampState}
                onChange={handleCampChange}
                disabled={loadingCamps || campEntries.length === 0}
                style={{
                    padding: "10px 12px", fontSize: "16px", borderRadius: "4px",
                    border: `1px solid ${errorCamps ? '#FA5252' : '#ced4da'}`,
                    width: '100%', backgroundColor: '#fff', color: '#000',
                    cursor: (loadingCamps || campEntries.length === 0) ? 'not-allowed' : 'pointer'
                }}
                aria-label="Select a Camp"
            >
                <option value="">{loadingCamps ? "Loading camps..." : "Select a Camp"}</option>
                {campEntries.map(([id, campData]) => (
                    <option key={id} value={id}>
                        {campData.campName || `Unnamed Camp (${id})`}
                    </option>
                ))}
            </select>
            {selectedCampState && (
                <div style={{ fontSize: "14px", color: "#868e96" }}>
                    Camp Role: {currentCampRole !== null ? currentCampRole : (loadingCamps ? "Loading..." : "N/A")}
                </div>
            )}
            {errorCamps && campEntries.length === 0 && !loadingCamps && (
                 <Text c="red" size="xs" mt={4}>{errorCamps}</Text>
            )}
            {!loadingCamps && campEntries.length === 0 && !errorCamps && (
                <Text size="xs" c="dimmed" mt={4}>No camps assigned to your profile.</Text>
            )}
        </div>
    );
});
CampSelector.displayName = 'CampSelector';

export default function Nav({ user, setUser, userData, setUserData, campID, setCampID, navIsOpen, setNavIsOpen, handleComponentChange }) {
    const [showCampGuide, setShowCampGuide] = useState(false);
    const [campsAvailableForGuide, setCampsAvailableForGuide] = useState(false);
    const campSelectorWrapperRef = useRef(null);

    useEffect(() => {
        const storedCampID = Cookies.get("campID");
        if (user && userData && navIsOpen && campsAvailableForGuide && !storedCampID && !campID) {
            const timer = setTimeout(() => {
                if (campSelectorWrapperRef.current) {
                    setShowCampGuide(true);
                }
            }, 150);
            return () => clearTimeout(timer);
        } else {
            setShowCampGuide(false);
        }
    }, [user, userData, navIsOpen, campsAvailableForGuide, campID]);

    useEffect(() => {
        if (campID) {
            setShowCampGuide(false);
        }
    }, [campID]);

    const handleCampsLoadedForGuide = (hasCamps) => {
        setCampsAvailableForGuide(hasCamps);
    };

    const handleCampSelectedAndCloseGuide = (selectedCampID) => {
        setCampID(selectedCampID);
        setShowCampGuide(false);
    };

    const links = [
        { icon: IconBulb, label: "Messages", notifications: 3, onClick: () => { handleComponentChange('messages'); setNavIsOpen(false); }, section: "messages", isFunctional: false },
        { icon: IconCheckbox, label: "Tasks", notifications: 4, onClick: () => { handleComponentChange('tasks'); setNavIsOpen(false); }, section: "tasks", isFunctional: false },
        { icon: IconUser, label: "Calendar", onClick: () => { handleComponentChange('calendar'); setNavIsOpen(false); }, section: "calendar", isFunctional: true },
    ];

    const collections = [
        { emoji: "👍", label: "Feedback", onClick: () => { handleComponentChange('feedback'); setNavIsOpen(false); }, section: "feedback", isFunctional: false },
        { emoji: "📊", label: "Polls", onClick: () => { handleComponentChange('polls'); setNavIsOpen(false); }, section: "polls", isFunctional: true },
        { emoji: "📦", label: "Inventory", onClick: () => { handleComponentChange('inventory'); setNavIsOpen(false); }, section: "inventory", isFunctional: false },
        { emoji: "🍲", label: "Recipes", onClick: () => { handleComponentChange('recipes'); setNavIsOpen(false); }, section: "recipes", isFunctional: true},
        { emoji: "🛒", label: "Orders", onClick: () => { handleComponentChange('orders'); setNavIsOpen(false); }, section: "orders", isFunctional: false },
        { emoji: "🚚", label: "Deliveries", onClick: () => { handleComponentChange('deliveries'); setNavIsOpen(false); }, section: "deliveries", isFunctional: false },
        { emoji: "💸", label: "Budget", onClick: () => { handleComponentChange('budget'); setNavIsOpen(false); }, section: "budget", isFunctional: false },
        { emoji: "📊", label: "Reports", onClick: () => { handleComponentChange('reports'); setNavIsOpen(false); }, section: "reports", isFunctional: false },
        { emoji: "🎂", label: "Birthdays", onClick: () => { handleComponentChange('birthdays'); setNavIsOpen(false); }, section: "birthdays", isFunctional: true },
        { emoji: "📋", label: "Staff List", onClick: () => { handleComponentChange('staff'); setNavIsOpen(false); }, section: "staff", isFunctional: false },
        { emoji: "👤", label: "My Account", onClick: () => { handleComponentChange('myAccount'); setNavIsOpen(false); }, section: "myAccount", isFunctional: true },
        { emoji: "👥", label: "User Management", onClick: () => { handleComponentChange('userManagement'); setNavIsOpen(false); }, section: "userManagement", isFunctional: true },
    ];

    const renderNavItem = (item, isCollectionLink = false) => {
        const itemBaseStyle = {
            opacity: showCampGuide ? 0.3 : 1,
            transition: 'opacity 0.3s ease',
        };

        const functionalStyle = {
            ...itemBaseStyle,
            opacity: item.isFunctional ? itemBaseStyle.opacity : Math.min(itemBaseStyle.opacity, 0.5),
            cursor: item.isFunctional ? 'pointer' : 'not-allowed',
        };

        const itemOnClick = (event) => {
            event.preventDefault();
            if (item.isFunctional && item.onClick) {
                item.onClick();
            } else if (!item.isFunctional) {
                console.log(`${item.label} is coming soon!`);
            }
        };

        const content = isCollectionLink ? (
            <a href="#" onClick={itemOnClick} className={classes.collectionLink} style={functionalStyle}>
                <Box component="span" mr={9} fz={16}>{item.emoji}</Box>
                {item.label}
            </a>
        ) : (
            <UnstyledButton onClick={itemOnClick} className={classes.mainLink} style={functionalStyle}>
                <div className={classes.mainLinkInner}>
                    <item.icon size={20} className={classes.mainLinkIcon} stroke={1.5} />
                    <span>{item.label}</span>
                </div>
                {item.notifications && (
                    <Badge size="sm" variant="filled" className={classes.mainLinkBadge}>
                        {item.notifications}
                    </Badge>
                )}
            </UnstyledButton>
        );

        if (!item.isFunctional) {
            return (
                <Tooltip label="Coming soon!" key={item.label} position="right" withArrow openDelay={300} withinPortal>
                     <div style={{ display: 'block', cursor: 'not-allowed' }}
                        onClick={(e) => { if (!item.isFunctional) e.stopPropagation(); }}
                     >{content}</div>
                </Tooltip>
            );
        }
        return content;
    };

    const mainLinks = links.map(link => <div key={link.label}>{renderNavItem(link)}</div>);
    const collectionLinks = collections.map(collection => <div key={collection.label}>{renderNavItem(collection, true)}</div>);

    const handleOverlayClickForNav = () => {
        if (!showCampGuide) {
            setNavIsOpen(false);
        }
    };

    return (
        <>
            {navIsOpen && (
                <Overlay
                    color="#000"
                    opacity={showCampGuide ? 0.85 : 0.6}
                    zIndex={1000}
                    onClick={handleOverlayClickForNav}
                    style={{ position: 'fixed' }}
                />
            )}

            {!navIsOpen && (
                <Button
                    onClick={() => setNavIsOpen(true)}
                    style={{
                        position: "fixed", top: "16px", right: "16px", zIndex: 1000,
                        padding: "10px 15px", backgroundColor: "#228BE6",
                        color: "#fff", border: "none", borderRadius: "4px",
                        cursor: "pointer", boxShadow: "0 2px 5px rgba(0,0,0,0.2)"
                    }}
                    aria-label="Open menu"
                >
                    Menu
                </Button>
            )}

            <nav
                className={classes.navbar}
                style={{
                    position: "fixed", top: 0, left: navIsOpen ? 0 : "-310px",
                    zIndex: 1001, height: "100%", width: "300px",
                    background: "#fff", overflowY: "auto",
                    padding: "16px", paddingTop: "8px",
                    display: "flex", flexDirection: "column",
                    transition: "left 0.3s ease-in-out", boxShadow: "2px 0 10px rgba(0,0,0,0.1)"
                }}
            >
                {!user && navIsOpen ? (
                     <div className={classes.section} style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <SelfRegistrationAndLogin
                            user={user} setUser={setUser} userData={userData} setUserData={setUserData}
                            setNavIsOpen={setNavIsOpen}
                        />
                        <Button fullWidth onClick={() => setNavIsOpen(false)} mt="md" variant="default" size="md">
                            Cancel
                        </Button>
                    </div>
                ) : user ? (
                    <>
                        <div className={classes.section}>
                            <SelfRegistrationAndLogin
                                user={user} setUser={setUser} userData={userData} setUserData={setUserData}
                                setNavIsOpen={setNavIsOpen}
                            />
                        </div>

                        <div
                            className={classes.section}
                            ref={campSelectorWrapperRef}
                            style={{
                                position: 'relative', zIndex: showCampGuide ? 1003 : 'auto',
                                padding: showCampGuide ? '8px' : undefined,
                                marginLeft: showCampGuide ? `-8px` : undefined,
                                marginRight: showCampGuide ? `-8px` : undefined,
                                marginBottom: showCampGuide ? '16px' : undefined,
                                backgroundColor: showCampGuide ? '#fff9db' : 'transparent',
                                border: showCampGuide ? '2px solid #fab005' : 'none',
                                borderRadius: showCampGuide ? '8px' : '0',
                                transition: 'all 0.2s ease-in-out',
                            }}
                        >
                            <CampSelector
                                user={user}
                                userData={userData}
                                campID={campID}
                                onCampSelect={handleCampSelectedAndCloseGuide}
                                onCampsLoaded={handleCampsLoadedForGuide}
                            />
                        </div>
                        {showCampGuide && campSelectorWrapperRef.current && (
                            <Popover
                                opened={showCampGuide}
                                target={campSelectorWrapperRef.current}
                                width={280} position="right" withArrow shadow="xl" zIndex={1004}
                                closeOnClickOutside={false} trapFocus={false}
                                transitionProps={{ transition: 'pop-top-right', duration: 200 }}
                            >
                                <Popover.Dropdown>
                                    <div style={{padding: '16px', borderRadius: '8px'}}>
                                        <Group gap="xs" mb="xs" align="center">
                                            <IconInfoCircle size={28} style={{ color: "#228BE6" }} />
                                            <Text fw={700} size="lg">Camp Selection Required</Text>
                                        </Group>
                                        <Text size="sm" mb="sm" style={{ lineHeight: 1.55 }}>
                                            You'll need to select a camp from the menu in order to view camp-specific tools and information.
                                        </Text>
                                        <Text size="xs" c="dimmed" mb="lg" style={{ lineHeight: 1.45 }}>
                                            If you don't see any camps available, please tell Cam and he'll add you to your camp roster.
                                        </Text>
                                        <Button fullWidth onClick={() => setShowCampGuide(false)} size="sm" variant="light" color="blue">
                                            Okay, Got it!
                                        </Button>
                                    </div>
                                </Popover.Dropdown>
                            </Popover>
                        )}

                        <TextInput
                            placeholder="Search" size="xs" leftSection={<IconSearch size={12} stroke={1.5} />}
                            styles={{ section: { pointerEvents: "none" }, wrapper: { opacity: showCampGuide ? 0.3 : 1, pointerEvents: showCampGuide ? 'none' : 'auto', transition: 'opacity 0.3s ease'}}}
                            mb="sm"
                        />
                        <div className={classes.section} style={{ opacity: showCampGuide ? 0.3 : 1, pointerEvents: showCampGuide ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
                            <div className={classes.mainLinks}>{mainLinks}</div>
                        </div>

                        {campID ? (
                             <div className={classes.section} style={{ opacity: showCampGuide ? 0.3 : 1, pointerEvents: showCampGuide ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
                                <Group className={classes.collectionsHeader} justify="space-between">
                                    <Text size="xs" fw={500} c="dimmed">Camp Tools</Text>
                                </Group>
                                <div className={classes.collections}>{collectionLinks}</div>
                            </div>
                        ) : (
                            <div style={{ padding: '20px', textAlign: 'center', color: '#868e96', marginTop: '20px', borderTop: '1px solid #e9ecef' }}>
                                <Text size="sm">Please select a camp to access camp-specific tools.</Text>
                            </div>
                        )}

                         <div className={classes.section} style={{ marginTop: "auto", paddingTop: "16px", opacity: showCampGuide ? 0.3 : 1, pointerEvents: showCampGuide ? 'none' : 'auto', transition: 'opacity 0.3s ease' }}>
                            <Button fullWidth onClick={() => setNavIsOpen(false)} size="md">Close Menu</Button>
                        </div>
                    </>
                ) : null }
            </nav>
        </>
    );
}
