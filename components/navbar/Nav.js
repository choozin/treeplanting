'use client';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { logoutUser, database } from '../../firebase/firebase';
import { ref, onValue, update, push, serverTimestamp } from 'firebase/database';
import { PAGE_TITLES, MAIN_LINKS, ALL_COLLECTIONS } from '../../lib/constants';
import { useAuth } from '../../hooks/useAuth';
import Cookies from 'js-cookie';
import { useWeather } from '../../hooks/useWeather';
import { notifications } from '@mantine/notifications';

import {
    Box,
    Group,
    Text,
    Button,
    Modal,
    Burger,
    ActionIcon,
    Title,
    Divider,
} from '@mantine/core';
import {
    IconX,
    IconLogout,
    IconLayoutDashboard,
} from '@tabler/icons-react';

import classes from './Navbar.module.css';
import ComposeMessage from '../messages/ComposeMessage';
import AuthFlow from './AuthFlow';
import CampSelector from './CampSelector';
import NavItem from './NavItem';
import WidgetWrapper from './WidgetWrapper';


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
        openFeedbackModal,
    } = useAuth();
    const { primary, preferences } = useWeather();
    const pathname = usePathname();
    const [navIsOpen, setNavIsOpen] = useState(false);
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [widgetsOpen, setWidgetsOpen] = useState(false);

    const [unreadCount, setUnreadCount] = useState(0);
    const [crews, setCrews] = useState([]);

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

        let unsubscribeCrews = null;
        if (campID) {
            const crewsRef = ref(database, `camps/${campID}/crews`);
            unsubscribeCrews = onValue(crewsRef, (snapshot) => {
                const crewsVal = snapshot.val();
                const loadedCrews = crewsVal ? Object.keys(crewsVal).map(key => ({ id: key, ...crewsVal[key] })) : [];
                setCrews(loadedCrews);
            });
        }

        return () => {
            unsubscribe();
            if (unsubscribeCrews) unsubscribeCrews();
        };
    }, [user, campID]);

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

    const handleNavigation = () => {
        setNavIsOpen(false);
    };

    const mainLinks = MAIN_LINKS.map((item) => (
        <NavItem key={item.key} item={item} unreadCount={unreadCount} onNavigate={handleNavigation} />
    ));
    const collectionLinks = ALL_COLLECTIONS.map((item) => {
        if (item.key === 'appFeedback') {
            return (
                <NavItem
                    key={item.key}
                    item={item}
                    isCollectionLink={true}
                    onNavigate={() => {
                        openFeedbackModal();
                        handleNavigation(); // Close the nav after opening modal
                    }}
                />
            );
        }
        return (
            <NavItem key={item.key} item={item} isCollectionLink={true} onNavigate={handleNavigation} />
        );
    });

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
                        {/* Reverted: Close button back in its container */}
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

                        <div className={classes.overlayContent}>
                            {!user ? (
                                <AuthFlow setNavIsOpen={setNavIsOpen} />
                            ) : (
                                <Box mt={0} style={{ width: '100%', maxWidth: '800px', margin: 'auto' }}>
                                    <div className={classes.navSection}>
                                        <CampSelector
                                            user={user}
                                            userData={userData}
                                            campID={campID}
                                            onCampSelect={setCampID}
                                            effectiveRole={effectiveRole}
                                            crews={crews}
                                        />
                                    </div>

                                    <WidgetWrapper
                                        widgetsOpen={widgetsOpen}
                                        setWidgetsOpen={setWidgetsOpen}
                                        primary={primary}
                                        preferences={preferences}
                                    />

                                    <div className={classes.navSection}>
                                        <Link href="/" onClick={handleNavigation} className={classes.dashboardLink}>
                                            <div className={classes.mainLinkInner}>
                                                <IconLayoutDashboard size={28} className={classes.mainLinkIcon} stroke={1.5} />
                                                <span>Dashboard</span>
                                            </div>
                                        </Link>
                                        <Divider my="xs" />
                                        <div className={classes.mainLinks}>{mainLinks}</div>
                                        {campID && <div className={classes.collections}>{collectionLinks}</div>}
                                    </div>

                                    <div className={classes.navSection}>
                                        <Text size="xs" c="dimmed" ta="center" mb="sm">v0.1.0</Text>
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