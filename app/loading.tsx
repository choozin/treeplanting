'use client';

import { Box } from '@mantine/core';
import CustomLoader from '../components/common/CustomLoader';

export default function Loading() {
  const overlayStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(4px)',
    WebkitBackdropFilter: 'blur(4px)', // For Safari support
    zIndex: 2001,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  return (
    <Box style={overlayStyles}>
      <CustomLoader />
    </Box>
  );
}
