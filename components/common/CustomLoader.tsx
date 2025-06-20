'use client';

import { Loader, Box, Image } from '@mantine/core';

export default function CustomLoader() {
    const loaderContainerStyles: React.CSSProperties = {
        position: 'relative',
        width: '80px',
        height: '80px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
    };

    const logoStyles: React.CSSProperties = {
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        objectFit: 'contain',
    };

    return (
        <Box style={loaderContainerStyles}>
            <Loader size="xl" type="oval" color="#86a389" />
            <Image
                src="/icons/icon-192x192.png"
                alt="App Logo"
                width={30}
                height={30}
                radius="50%" // Use the radius prop for a perfect circle
                style={logoStyles}
            />
        </Box>
    );
}