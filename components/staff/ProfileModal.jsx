'use client';

import React, { useState } from 'react';
import {
  IconBrandFacebook,
  IconBrandInstagram,
  IconBrandSnapchat,
  IconBrandSpotify,
  IconBrandTiktok,
  IconBrandTwitter,
  IconBrandYoutube,
  IconMessageCircle,
} from '@tabler/icons-react';
import {
  Avatar,
  Badge,
  Button,
  Divider,
  Group,
  Image,
  Modal,
  Paper,
  SimpleGrid,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import classes from './Staff.module.css';



const ProfileModal = ({ user, crewName, opened, onClose, onMessage, }) => {
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!user) {
    return null;
  }

  const displayName = user.profile?.nickname || user.name;
  const roleTitle = ROLES[user.role] || 'Unknown Role';

  const socialLinks = [
    { platform: 'instagram', icon: IconBrandInstagram, base_url: 'https://instagram.com/' },
    { platform: 'twitter', icon: IconBrandTwitter, base_url: 'https://x.com/' },
    { platform: 'tiktok', icon: IconBrandTiktok, base_url: 'https://tiktok.com/@' },
    { platform: 'snapchat', icon: IconBrandSnapchat, base_url: 'https://snapchat.com/add/' },
    { platform: 'facebook', icon: IconBrandFacebook, base_url: '' },
    { platform: 'youtube', icon: IconBrandYoutube, base_url: '' },
    { platform: 'spotify', icon: IconBrandSpotify, base_url: '' },
  ];

  return (
    <>
      <Modal
        opened={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        size="xl"
        centered
        withCloseButton={false}
        padding={0}
        zIndex={2000} // Ensure this is higher than the main modal's z-index
      >
        <Image src={user.profileImageURL} alt={displayName} />
      </Modal>

      <Modal
        opened={opened}
        onClose={onClose}
        size="lg"
        centered
        withCloseButton={false}
        padding={0}
        radius="lg"
        lockScroll={false}
        overlayProps={{
          backgroundOpacity: 0.5,
          blur: 10,
        }}
      >
        <Paper className={classes.profileModalContent}>
          <Stack align="center" mt="-xl">
            <Avatar
              src={user.profileImageURL}
              size={150}
              radius="100%"
              className={classes.profileAvatar}
              onClick={() => user.profileImageURL && setIsImageModalOpen(true)}
            />
            <Title order={2}>{displayName}</Title>
            <Group>
              <Badge variant="light">{roleTitle}</Badge>
              <Badge color="blue" variant="light">
                {crewName}
              </Badge>
            </Group>
          </Stack>

          <Divider my="lg" />

          <Stack gap="md">
            {user.profile?.bio && (
              <Text ta="center" c="dimmed">
                "{user.profile.bio}"
              </Text>
            )}

            {user.profile?.isEmailVisible && user.email && (
              <Text size="sm" ta="center" c="dimmed">
                {user.email}
              </Text>
            )}

            <SimpleGrid cols={2} spacing="lg">
              {user.profile?.firstAidLevel && (
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    First Aid
                  </Text>
                  <Text fw={500}>{user.profile.firstAidLevel}</Text>
                </Paper>
              )}
              {user.profile?.plantingAnthem?.title && (
                <Paper withBorder p="sm" radius="md">
                  <Text size="xs" c="dimmed">
                    Planting Anthem
                  </Text>
                  <Text fw={500} truncate>
                    {user.profile.plantingAnthem.title}
                  </Text>
                  <Text size="xs">{user.profile.plantingAnthem.artist}</Text>
                </Paper>
              )}
            </SimpleGrid>

            <Group justify="center" gap="xs" my={0}>
              {socialLinks.map(({ platform, icon: Icon, base_url }) => {
                const handle = user.profile?.socials?.[platform];
                if (!handle) return null;
                const url = base_url ? `${base_url}${handle}` : handle;
                return (
                  <Button
                    component="a"
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    key={platform}
                    variant="subtle"
                    className={classes.socialIcon}
                  >
                    <Icon size={28} />
                  </Button>
                );
              })}
            </Group>

            <Button
              onClick={() => onMessage(user)}
              fullWidth
              mt="md"
              size="lg"
              leftSection={<IconMessageCircle />}
              variant="gradient"
            >
              Message {displayName}
            </Button>
          </Stack>
        </Paper>
      </Modal>
    </>
  );
};

export default ProfileModal;
