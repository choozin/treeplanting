'use client';

import React, { useState, useEffect } from 'react';
import { Paper, Text, Avatar, Stack } from '@mantine/core';
import { ROLES } from '../../lib/constants';
import classes from './Staff.module.css';
import { motion } from 'framer-motion';

const sharpieColors = ['#FF4500', '#FF0000', '#FF69B4', '#800080', '#1E90FF'];
const fontClasses = [classes.fontCaveat, classes.fontPatrickHand, classes.fontRockSalt];

// To ensure better randomness, we'll keep track of the last tilt direction
let lastTiltDirection = 1;

interface StaffCardProps {
    user: {
        id: string;
        name: string;
        profileImageURL?: string;
        profile?: {
            nickname?: string;
        };
    };
}

const StaffCard: React.FC<StaffCardProps> = ({ user }) => {
    const displayName = user.profile?.nickname || user.name;

    const [style, setStyle] = useState({ rotate: 0, zIndex: 1 });
    const [textColor] = useState(sharpieColors[Math.floor(Math.random() * sharpieColors.length)]);
    const [fontClass] = useState(fontClasses[Math.floor(Math.random() * fontClasses.length)]);

    useEffect(() => {
        const tilt = (Math.random() * 8 + 4) * lastTiltDirection; // Random tilt between 4 and 12 degrees
        lastTiltDirection *= -1; // Alternate direction for the next card
        
        const zIndex = Math.floor(Math.random() * 11) + 40;
        
        setStyle({
            rotate: tilt,
            zIndex: zIndex,
        });
    }, []);

    return (
        <motion.div
            className={classes.cardWrapper}
            style={{ zIndex: style.zIndex, rotate: style.rotate }}
            whileHover={{ y: -10, scale: 1.25, rotate: 0, zIndex: 100 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
        >
             <Paper withBorder className={classes.staffCard}>
                <div className={`${classes.cardShine} ${classes.defaultShine}`} />
                <div className={`${classes.cardShine} ${classes.hoverShine}`} />
                <div className={classes.imageContainer}>
                    <Avatar 
                        src={user.profileImageURL} 
                        size="100%" 
                        radius={0} 
                        className={classes.avatar}
                    />
                </div>
                <Stack align="center" gap={0} mt="sm">
                    <Text fw={700} ta="center" lh={1.2} className={`${classes.polaroidText} ${fontClass}`} style={{ color: textColor }}>
                        {displayName}
                    </Text>
                </Stack>
            </Paper>
        </motion.div>
    );
};

export default StaffCard;