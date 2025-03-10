// firebase.js

'use client';

import { initializeApp } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "firebase/auth";
import { getDatabase, ref, set } from "firebase/database";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCuREPU2wVAoKNCJisvKlaz6xGCpHNCagQ",
    authDomain: "treeplanting-fefa5.firebaseapp.com",
    projectId: "treeplanting-fefa5",
    storageBucket: "treeplanting-fefa5.firebasestorage.app",
    messagingSenderId: "391625607665",
    appId: "1:391625607665:web:9f2e194c1224a18ec61c50"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

// Function to register a user (self-registration) with role initialized as 1
const registerUser = async (email, password, name) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await set(ref(database, `users/${user.uid}`), {
            email: user.email,
            name: name,
            role: 1, // Default role set to 1
            createdAt: new Date().toISOString()
        });

        alert(`Registration successful for ${user.email}`);
        return user;
    } catch (error) {
        alert("Registration error: " + error.message);
        return null;
    }
};

// Function to register another user with a selected role
const registerOtherUser = async (email, name, role) => {
    try {
        const defaultPassword = "password";
        const currentUser = auth.currentUser; // Store currently logged-in user

        const userCredential = await createUserWithEmailAndPassword(auth, email, defaultPassword);
        const newUser = userCredential.user;

        await set(ref(database, `users/${newUser.uid}`), {
            email: newUser.email,
            name: name,
            role: role,
            createdAt: new Date().toISOString()
        });

        alert(`User ${email} registered successfully with role ${role}`);

        // Restore original logged-in user
        if (currentUser) {
            await auth.updateCurrentUser(currentUser);
        }

        return newUser;
    } catch (error) {
        alert("Registration error: " + error.message);
        return null;
    }
};


// Function to log in a user
const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        console.log("User logged in:", userCredential.user);
        return userCredential.user;
    } catch (error) {
        console.error("Login error:", error.message);
        return null;
    }
};

// Function to log out a user
const logoutUser = async () => {
    try {
        await signOut(auth);
        console.log("User logged out");
    } catch (error) {
        console.error("Logout error:", error.message);
    }
};

// Export everything
export { app, auth, database, registerUser, registerOtherUser, loginUser, logoutUser, onAuthStateChanged };

