'use client';
import { useState, useEffect, useRef, forwardRef } from "react";
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutUser, auth, database } from "../../firebase/firebase";
import { ref, get, onValue } from "firebase/database";
import { ROLES, PAGE_TITLES, MAIN_LINKS, ALL_COLLECTIONS } from "../../lib/constants";
import { useAuth } from '../../hooks/useAuth';

import Cookies from "js-cookie";
import { useWeather } from '../../hooks/useWeather';

import {
    Badge,
    Box,
    Group,
    Text,
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
import { IconX, IconLogout } from "@tabler/icons-react";

import classes from "./Navbar.module.css";
import WeatherNavWidget from '../weather/WeatherNavWidget';

const WeatherSectionWrapper = () => {
    const { primary, preferences } = useWeather();
    if (!preferences?.navWidget?.visible || !primary.data) {
        return null;
    }
    return (
        <div className={classes.navSection}>
            <WeatherNavWidget />
        </div>
    );
};

const SelfRegistrationAndLogin = ({ setNavIsOpen }) => {
    return (
        <div className={classes.loginContainer}>
            <Paper withBorder p="xl" radius="md" style={{ width: '400px', maxWidth: '95vw' }}>
                <Title order={2} ta="center" mb="xl">Welcome</Title>
                <Text ta="center">Please log in to continue.</Text>
            </Paper>
        </div>
    );
};

const CampSelector = forwardRef(({ user, userData, campID, onCampSelect, effectiveRole }, forwardedRef) => {
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
                    setErrorCamps("You must be assigned to a camp to access camp-specific features.");
                }
            } catch (fetchError) {
                setErrorCamps("Error fetching assigned camps: " + fetchError.message);
            }
            setLoadingCamps(false);
        };

        fetchAssignedCamps();
    }, [user]);

    const campOptions = Object.entries(camps).map(([id, campData]) => ({
        id,
        label: campData.campName || `Unnamed Camp (${id})`
    }));

    const roleName = effectiveRole > 0 ? (ROLES[effectiveRole] || 'Unknown') : 'N/A';

    return (
        <div ref={forwardedRef} style={{ width: '100%' }}>
            {loadingCamps ? (
                <Text>Loading camps...</Text>
            ) : campID ? (
                <>
                    <Title order={3} ta="center" className={classes.campTitle}>{camps[campID]?.campName || 'Selected Camp'}</Title>
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

export default function Nav() {
    const { user, userData, campID, setCampID, effectiveRole } = useAuth();
    const pathname = usePathname();
    const [navIsOpen, setNavIsOpen] = useState(true);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

    const [unreadCount, setUnreadCount] = useState(0);
    const [badgeColor, setBadgeColor] = useState('blue');

    useEffect(() => {
        if (user === null) {
            setNavIsOpen(true);
        }
    }, [user]);

    useEffect(() => {
        if (!user) {
            setUnreadCount(0);
            return;
        }

        const userInboxRef = ref(database, `user-inboxes/${user.uid}`);
        const unsubscribe = onValue(userInboxRef, (snapshot) => {
            if (!snapshot.exists()) {
                setUnreadCount(0);
                return;
            }

            const inboxData = snapshot.val();
            const unreadMessages = Object.values(inboxData).filter(msg => !msg.isRead);
            setUnreadCount(unreadMessages.length);
        });

        return () => unsubscribe();
    }, [user]);

    const confirmLogout = async () => {
        if (user) Cookies.remove(`campID_${user.uid}`);
        await logoutUser();
        setIsLogoutModalOpen(false);
        setNavIsOpen(true);
    };

    const getPageTitle = () => {
        const routeKey = pathname.substring(1);
        if (!routeKey) return 'Plantiful';
        return PAGE_TITLES[routeKey] || 'Plantiful';
    };

    const renderNavItem = (item, isCollectionLink = false) => {
        const { key, label, icon: Icon, isFunctional } = item;
        const href = `/${key}`;

        const itemOnClick = (event) => {
            if (!isFunctional) {
                event.preventDefault();
                return;
            }
            setNavIsOpen(false);
        };

        const content = (
            <Link
                href={href}
                onClick={itemOnClick}
                className={isCollectionLink ? classes.collectionLink : classes.mainLink}
                style={{ opacity: isFunctional ? 1 : 0.5, cursor: isFunctional ? 'pointer' : 'not-allowed' }}
            >
                <div className={classes.mainLinkInner}>
                    {isCollectionLink ? (
                        <Box component="span" mr={9} fz="1.75rem">{item.emoji}</Box>
                    ) : (
                        <Icon size={28} className={classes.mainLinkIcon} stroke={1.5} />
                    )}
                    <span>{label}</span>
                </div>
                {key === 'messages' && unreadCount > 0 && (
                    <Badge size="lg" variant="filled" className={classes.mainLinkBadge} color={badgeColor}>
                        {unreadCount}
                    </Badge>
                )}
            </Link>
        );

        if (!isFunctional) {
            return (
                <Tooltip label="Coming soon!" key={key} position="right" withArrow openDelay={300} withinPortal>
                    {content}
                </Tooltip>
            );
        }
        return <div key={key}>{content}</div>;
    };

    const mainLinks = MAIN_LINKS.map(item => renderNavItem(item));
    const collectionLinks = ALL_COLLECTIONS.map(item => renderNavItem(item, true));

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    return (
        <>
            <header className={classes.appHeader}>
                <Image src="/icons/icon-192x192.png" alt="App Logo" width={40} height={40} className={classes.logo} />
                <Title order={4} className={classes.headerTitle}>{getPageTitle()}</Title>
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
                            {pathname !== '/' && (
                                <div className={classes.closeButtonContainer}>
                                    <ActionIcon onClick={() => setNavIsOpen(false)} variant="transparent" size="xl" aria-label="Close menu">
                                        <IconX color="#495057" size={36} />
                                    </ActionIcon>
                                </div>
                            )}

                            {!user ? (
                                <SelfRegistrationAndLogin setNavIsOpen={setNavIsOpen} />
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