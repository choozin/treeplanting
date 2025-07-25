import React from 'react';
import { IconTrash } from '@tabler/icons-react';
import { ref, remove } from 'firebase/database';
import { ActionIcon, Badge, Group, Paper, Stack, Table, Text, Title } from '@mantine/core';
import { useModals } from '@mantine/modals';
import { database } from '../../firebase/firebase';
import { ROLES } from '../../lib/constants';



const getRoleName = (level) => ROLES[level] || 'Unknown Role';

const AdminUserList = ({ allUsers, allCamps }) => {
  const modals = useModals();

  const handleDeleteUser = (user) => {
    modals.openConfirmModal({
      title: `Delete ${user.name}`,
      centered: true,
      children: (
        <Text size="sm">
          Are you sure you want to permanently delete {user.name} ({user.email})? This action will
          remove their data from the database and attempt to delete their Firebase Authentication
          account. This action is irreversible.
        </Text>
      ),
      labels: { confirm: 'Delete', cancel: 'Cancel' },
      confirmProps: { color: 'red' },
      onConfirm: async () => {
        try {
          // 1. Delete user data from Realtime Database
          await remove(ref(database, `users/${user.id}`));
          notifications.show({
            title: 'User Data Deleted',
            message: `User ${user.id} data deleted from Realtime Database.`,
            color: 'green',
          });

          // 2. Attempt to delete user from Firebase Authentication (requires server-side)
          // We will call a Next.js API route for this
          const response = await fetch('/api/delete-user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ uid: user.id }),
          });

          if (response.ok) {
            notifications.show({
              title: 'User Deleted',
              message: `${user.name} has been permanently deleted.`,
              color: 'green',
            });
          } else {
            const errorData = await response.json();
            notifications.show({
              title: 'Deletion Failed',
              message: `Failed to delete ${user.name} from Firebase Auth: ${errorData.message || response.statusText}`,
              color: 'red',
            });
            notifications.show({
              title: 'Error',
              message: `Failed to delete user ${user.id} from Firebase Auth: ${JSON.stringify(errorData)}`,
              color: 'red',
            });
          }
        } catch (e) {
          notifications.show({
            title: 'Error',
            message: `An error occurred during user deletion: ${e.message}`,
            color: 'red',
          });
        }
      },
    });
  };

  return (
    <Paper withBorder shadow="md" p="md">
      <Title order={4} mb="md">
        All Users
      </Title>
      <Table striped highlightOnHover verticalSpacing="sm">
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Name</Table.Th>
            <Table.Th>Email</Table.Th>
            <Table.Th>Global Role</Table.Th>
            <Table.Th>Assigned Camps & Roles</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {allUsers.map((user) => (
            <Table.Tr key={user.id}>
              <Table.Td>{user.name}</Table.Td>
              <Table.Td>{user.email}</Table.Td>
              <Table.Td>
                {getRoleName(user.role)} ({user.role})
              </Table.Td>
              <Table.Td>
                <Stack spacing="xs">
                  {user.assignedCamps && Object.keys(user.assignedCamps).length > 0 ? (
                    Object.entries(user.assignedCamps).map(([campId, campInfo]) => (
                      <Group key={campId} spacing="xs">
                        <Badge variant="filled" color="blue">
                          {allCamps[campId]?.campName || campId}
                        </Badge>
                        <Text size="xs">({getRoleName(campInfo.role)})</Text>
                      </Group>
                    ))
                  ) : (
                    <Text size="xs" c="dimmed">
                      No assigned camps
                    </Text>
                  )}
                </Stack>
              </Table.Td>
              <Table.Td>
                <ActionIcon color="red" onClick={() => handleDeleteUser(user)} title="Delete User">
                  <IconTrash size={16} />
                </ActionIcon>
              </Table.Td>
            </Table.Tr>
          ))}
        </Table.Tbody>
      </Table>
    </Paper>
  );
};

export default AdminUserList;
