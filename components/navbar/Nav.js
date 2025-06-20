'use client';
import { useState, useEffect, useRef, forwardRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutUser, loginUser, registerUser, auth, database } from '../../firebase/firebase';
import { ref, get, onValue, update, push, serverTimestamp } from 'firebase/database';
import { ROLES, PAGE_TITLES, MAIN_LINKS, ALL_COLLECTIONS } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';

import Cookies from 'js-cookie';
import { useWeather } from '../../hooks/useWeather';
import { notifications } from '@mantine/notifications';

import {
    Badge,
    Box,
    Group,
    Text,
    UnstyledButton,
    Button,
    Paper,
    Tooltip,
    Modal,
    Burger,
    ActionIcon,
    Title,
    Divider,
    Tabs,
    TextInput,
    PasswordInput,
    Stack,
    Collapse,
} from '@mantine/core';
import {
    IconX,
    IconLogout,
    IconLayoutDashboard,
    IconChevronDown,
    IconChevronUp,
} from '@tabler/icons-react';

import classes from './Navbar.module.css';
import WeatherNavWidget from '../weather/WeatherNavWidget';
import ComposeMessage from '../messages/ComposeMessage';

const AuthFlow = ({ setNavIsOpen }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuthSuccess = () => {
        notifications.show({
            title: activeTab === 'login' ? 'Login Successful' : 'Registration Successful',
            message: "Welcome to your camp's hub!",
            color: 'green',
        });
        setNavIsOpen(false);
        if (pathname === '/') {
            router.push('/dashboard');
        }
    };

    const handleAuthError = (error) => {
        notifications.show({
            title: 'Authentication Failed',
            message: error.message.replace('Firebase: ', ''),
            color: 'red',
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let userCredential = null;
            if (activeTab === 'login') {
                userCredential = await loginUser(email, password);
            } else {
                if (!name) {
                    throw new Error('Name is required for registration.');
                }
                userCredential = await registerUser(email, password, name);
            }

            if (userCredential) {
                handleAuthSuccess();
            } else {
                throw new Error('Invalid credentials or user does not exist.');
            }
        } catch (error) {
            handleAuthError(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={classes.loginContainer}>
            <Paper withBorder p="xl" radius="md" style={{ width: '400px', maxWidth: '95vw' }}>
                <Title order={2} ta="center" mb="xl">
                    Welcome
                </Title>
                <Tabs value={activeTab} onChange={setActiveTab}>
                    <Tabs.List grow>
                        <Tabs.Tab value="login">Login</Tabs.Tab>
                        <Tabs.Tab value="register">Register</Tabs.Tab>
                    </Tabs.List>

                    <form onSubmit={handleSubmit}>
                        <Tabs.Panel value="login" pt="lg">
                            <Stack>
                                <TextInput
                                    label="Email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.currentTarget.value)}
                                    required
                                />
                                <PasswordInput
                                    label="Password"
                                    placeholder="Your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                    required
                                />
                                <Button type="submit" mt="md" loading={loading}>
                                    Login
                                </Button>
                            </Stack>
                        </Tabs.Panel>

                        <Tabs.Panel value="register" pt="lg">
                            <Stack>
                                <TextInput
                                    label="Name"
                                    placeholder="Your full name"
                                    value={name}
                                    onChange={(e) => setName(e.currentTarget.value)}
                                    required
                                />
                                <TextInput
                                    label="Email"
                                    type="email"
                                    placeholder="your@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.currentTarget.value)}
                                    required
                                />
                                <PasswordInput
                                    label="Password"
                                    placeholder="Choose a password"
                                    value={password}
                                    onChange={(e) => setPassword(e.currentTarget.value)}
                                    required
                                />
                                <Button type="submit" mt="md" loading={loading}>
                                    Register
                                </Button>
                            </Stack>
                        </Tabs.Panel>
                    </form>
                </Tabs>
            </Paper>
        </div>
    );
};

const WeatherSectionWrapper = () => {
    const { primary, preferences } = useWeather();
    if (!preferences?.navWidget?.visible || !primary.data) {
        return null;
    }
    return (
        <div className={classes.weatherWidgetContainer}>
            <WeatherNavWidget />
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
                    setErrorCamps('You must be assigned to a camp to access camp-specific features.');
                }
            } catch (fetchError) {
                setErrorCamps('Error fetching assigned camps: ' + fetchError.message);
            }
            setLoadingCamps(false);
        };

        fetchAssignedCamps();
    }, [user]);

    const campOptions = Object.entries(camps).map(([id, campData]) => ({
        id,
        label: campData.campName || `Unnamed Camp (${id})`,
    }));

    const roleTitle = effectiveRole > 0 ? ROLES[effectiveRole] || 'Member' : 'N/A';
    const displayName = userData?.profile?.nickname || userData?.name;

    return (
        <div ref={forwardedRef} style={{ width: '100%' }}>
            {loadingCamps ? (
                <Text>Loading camps...</Text>
            ) : campID ? (
                <>
                    <Title order={3} ta="center" className={classes.campTitle}>
                        {camps[campID]?.campName || 'Selected Camp'}
                    </Title>
                    <Text size="sm" c="dimmed" ta="center">
                        Welcome, {roleTitle} {displayName}
                    </Text>
                    {campOptions.length > 1 && (
                        <>
                            <Divider my="sm" label="Switch Camp" labelPosition="center" />
                            <Group justify="center" gap="sm" className={classes.campBadgeContainer}>
                                {campOptions.map((camp) => (
                                    <Badge
                                        key={camp.id}
                                        size="xl"
                                        radius="sm"
                                        variant={camp.id === campID ? 'filled' : 'light'}
                                        color={camp.id === campID ? 'blue' : 'gray'}
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
                    <Text ta="center" fw={500} size="lg">
                        Please select your active camp:
                    </Text>
                    <Group justify="center" gap="sm" className={classes.campBadgeContainer}>
                        {campOptions.length > 0 ? (
                            campOptions.map((camp) => (
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
                            ))
                        ) : (
                            <Text c="dimmed">
                                {errorCamps || 'You must be assigned to a camp to access camp-specific features.'}
                            </Text>
                        )}
                    </Group>
                </>
            )}
        </div>
    );
});
CampSelector.displayName = 'CampSelector';

export default function Nav() {
    const {
        user,
        userData,
        campID,
        setCampID,
        effectiveRole,
        isComposeModalOpen,
        closeComposeModal,
        composeInitialState,
    } = useAuth();
    const pathname = usePathname();
    const [navIsOpen, setNavIsOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [widgetsOpen, setWidgetsOpen] = useState(false);

    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (user === null) {
            setNavIsOpen(false);
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
            const unreadMessages = Object.values(inboxData).filter((msg) => !msg.isRead);
            setUnreadCount(unreadMessages.length);
        });

        return () => unsubscribe();
    }, [user]);

    const confirmLogout = async () => {
        if (user) Cookies.remove(`campID_${user.uid}`);
        await logoutUser();
        setIsLogoutModalOpen(false);
        setNavIsOpen(false);
    };

    const getPageTitle = () => {
        const routeKey = pathname.substring(1);
        if (!routeKey || routeKey === 'dashboard') return 'plantcamp';
        return PAGE_TITLES[routeKey] || 'plantcamp';
    };

    const handleComposeSubmit = async (messageData) => {
        const { recipients, ...rest } = messageData;
        const newMessageRef = push(ref(database, 'messages'));
        const messageId = newMessageRef.key;

        const messageContent = {
            ...rest,
            senderId: user.uid,
            sentAt: serverTimestamp(),
            threadId: messageId,
            liveCopies: recipients.length,
            recipients: recipients.reduce((acc, uid) => ({ ...acc, [uid]: true }), {}),
        };

        const fanOutUpdates = {};
        fanOutUpdates[`/messages/${messageId}`] = messageContent;

        const senderName = userData?.name || user.email;

        recipients.forEach((uid) => {
            fanOutUpdates[`/user-inboxes/${uid}/${messageId}`] = {
                isRead: false,
                senderName,
                subject: messageContent.subject,
                sentAt: serverTimestamp(),
                messageType: messageContent.messageType,
                recipientCount: recipients.length,
                areRecipientsVisible: messageContent.areRecipientsVisible,
            };
        });

        try {
            await update(ref(database), fanOutUpdates);
        } catch (err) {
            console.error('Failed to send message:', err);
            notifications.show({
                title: 'Error',
                message: 'Could not send message.',
                color: 'red',
            });
        }
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
                        <Box component="span" mr={9} fz="1.75rem">
                            {item.emoji}
                        </Box>
                    ) : (
                        <Icon size={28} className={classes.mainLinkIcon} stroke={1.5} />
                    )}
                    <span>{label}</span>
                </div>
                {key === 'messages' && unreadCount > 0 && (
                    <Badge size="lg" variant="filled" className={classes.mainLinkBadge}>
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

    const mainLinks = MAIN_LINKS.map((item) => renderNavItem(item));
    const collectionLinks = ALL_COLLECTIONS.map((item) => renderNavItem(item, true));

    const overlayVariants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 },
    };

    return (
        <>
            <header className={classes.appHeader}>
                <Image
                    src="/icons/icon-192x192.png"
                    alt="App Logo"
                    width={40}
                    height={40}
                    className={classes.logo}
                />
                <Title order={4} className={classes.headerTitle}>
                    {getPageTitle()}
                </Title>
                <Burger
                    opened={navIsOpen}
                    onClick={() => setNavIsOpen((o) => !o)}
                    color="white"
                    aria-label="Toggle navigation"
                    className={classes.menuButton}
                />
            </header>

            <ComposeMessage
                opened={isComposeModalOpen}
                onClose={closeComposeModal}
                onSubmit={handleComposeSubmit}
                currentUser={user}
                effectiveRole={effectiveRole}
                campID={campID}
                initialState={composeInitialState}
            />

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
                                <ActionIcon
                                    onClick={() => setNavIsOpen(false)}
                                    variant="transparent"
                                    size="xl"
                                    aria-label="Close menu"
                                >
                                    <IconX size={36} color="white" />
                                </ActionIcon>
                            </div>

                            {!user ? (
                                <AuthFlow setNavIsOpen={setNavIsOpen} />
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

                                    <div
                                        className={classes.navSection}
                                        style={{
                                            padding: widgetsOpen ? 'var(--mantine-spacing-md)' : 'var(--mantine-spacing-xs)',
                                            backgroundColor: widgetsOpen ? 'rgba(255, 255, 255, 0.85)' : 'rgba(233, 236, 239, 0.85)',
                                        }}
                                    >
                                        <Group justify="space-between" mb={widgetsOpen ? 'sm' : 0}>
                                            <Text fw={500} c="dimmed">
                                                Widgets
                                            </Text>
                                            <ActionIcon variant="transparent" onClick={() => setWidgetsOpen((o) => !o)}>
                                                {widgetsOpen ? <IconChevronUp /> : <IconChevronDown />}
                                            </ActionIcon>
                                        </Group>
                                        <Collapse in={widgetsOpen}>
                                            <WeatherSectionWrapper />
                                        </Collapse>
                                    </div>

                                    <div className={classes.navSection}>
                                        <Link href="/dashboard" onClick={() => setNavIsOpen(false)} className={classes.dashboardLink}>
                                            <div className={classes.mainLinkInner}>
                                                <IconLayoutDashboard size={28} className={classes.mainLinkIcon} stroke={1.5} />
                                                <span>Dashboard</span>
                                            </div>
                                        </Link>
                                        <Divider my="xs" />
                                        <div className={classes.mainLinks}>{mainLinks}</div>
                                    </div>

                                    {campID && (
                                        <div className={classes.navSection}>
                                            <Group className={classes.collectionsHeader} justify="space-between">
                                                <Text size="sm" fw={500} c="dimmed">
                                                    Camp Tools
                                                </Text>
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