// firebase.js

'use client';

import { initializeApp, getApps } from "firebase/app";
import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged,
    updateProfile
} from "firebase/auth";
import { getDatabase, ref, set, update, get } from "firebase/database";
import { getStorage } from "firebase/storage";

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyCuREPU2wVAoKNCJisvKlaz6xGCpHNCagQ",
    authDomain: "treeplanting-fefa5.firebaseapp.com",
    projectId: "treeplanting-fefa5",
    storageBucket: "treeplanting-fefa5.appspot.com",
    messagingSenderId: "391625607665",
    appId: "1:391625607665:web:9f2e194c1224a18ec61c50"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const database = getDatabase(app);
const storage = getStorage(app);

// Function to register a user (self-registration) with role initialized as 1
const registerUser = async (email, password, name) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Ensure displayName is set on the auth object itself
        await updateProfile(user, { displayName: name });

        const updates = {};
        const userData = {
            email: user.email,
            name: name,
            role: 1, // Default global role set to 1
            createdAt: new Date().toISOString(),
            profile: {
                name: name,
                nickname: name,
            },
            // Default assignment for new users
            assignedCamps: {
                scooter: {
                    campName: "Scooter's Camp",
                    role: 2
                }
            },
            lastActiveCampID: 'scooter' // Set default last active camp
        };
        updates[`/users/${user.uid}`] = userData;
        updates[`/camps/scooter/users/${user.uid}`] = {
            role: 2
        };

        await update(ref(database), updates);

        return { user, defaultCampId: 'scooter' };
    } catch (error) {
        console.error("Registration error:", error.message);
        throw error;
    }
};

// Function to register another user with a selected role
const registerOtherUser = async (email, name, role) => {
    // This function is intended for admin use and does not log in the new user.
    // It creates the user with a temporary password and sets their data.
    try {
        const defaultPassword = "password"; // Users should be instructed to change this
        // NOTE: This creates a user but does not sign them in. The admin remains logged in.
        const userCredential = await createUserWithEmailAndPassword(auth, email, defaultPassword);
        const newUser = userCredential.user;

        // Set their profile data in the database
        await set(ref(database, `users/${newUser.uid}`), {
            email: newUser.email,
            name: name,
            role: role,
            createdAt: new Date().toISOString()
        });

        // It is NOT necessary to sign the admin back in. 
        // createUserWithEmailAndPassword does not affect the admin's auth state.
        
        return newUser;
    } catch (error) {
        console.error("Admin registration error:", error.message);
        throw error;
    }
};


// Function to log in a user
const loginUser = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userRef = ref(database, `users/${user.uid}`);
        const snapshot = await get(userRef);
        if (snapshot.exists()) {
            const userData = snapshot.val();
            user.activeCamp = userData.activeCamp;
        }
        return user;
    } catch (error) {
        console.error("Login error:", error.message);
        throw error;
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
export { app, auth, database, storage, registerUser, registerOtherUser, loginUser, logoutUser, onAuthStateChanged };