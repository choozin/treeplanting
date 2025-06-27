'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { loginUser, registerUser } from '../../firebase/firebase';
import { notifications } from '@mantine/notifications';
import {
    Button,
    Paper,
    Title,
    Tabs,
    TextInput,
    PasswordInput,
    Stack,
    Group,
} from '@mantine/core';

import classes from './Navbar.module.css';

const AuthFlow = ({ setNavIsOpen }) => {
    const router = useRouter();
    const pathname = usePathname();
    const [activeTab, setActiveTab] = useState('login');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // The name state is now managed by the tab change handler
    const [name, setName] = useState('Name'); 
    const [loading, setLoading] = useState(false);

    const handleTabChange = (value) => {
        const newTab = value || 'login';
        setActiveTab(newTab);
        if (newTab === 'login') {
            setName('Name');
        } else {
            setName('');
        }
    };

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
                if (activeTab === 'login') {
                    throw new Error('Login failed. Please check your credentials.');
                }
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
                <Tabs value={activeTab} onChange={handleTabChange}>
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

export default AuthFlow;
