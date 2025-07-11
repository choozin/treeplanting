'use client';

import React from 'react';
import Link from 'next/link';
import { Badge, Box, Tooltip } from '@mantine/core';
import classes from './Navbar.module.css';

const NavItem = ({ item, isCollectionLink = false, unreadCount, onNavigate }) => {
    const { key, label, icon: Icon, isFunctional, emoji } = item;
    const href = `/${key}`;

    const itemOnClick = (event) => {
        if (!isFunctional) {
            event.preventDefault();
            return;
        }
        // For appFeedback, we prevent default navigation and just trigger the modal
        if (key === 'appFeedback') {
            event.preventDefault();
        }
        onNavigate(); // Callback to close the navigation menu and/or open modal
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
                        {emoji}
                    </Box>
                ) : (
                    Icon && <Icon size={28} className={classes.mainLinkIcon} stroke={1.5} />
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
            <Tooltip label="Coming soon!" position="right" withArrow openDelay={300} withinPortal>
                {content}
            </Tooltip>
        );
    }
    return content;
};

export default NavItem;