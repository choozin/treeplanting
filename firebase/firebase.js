// firebase.js

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

// Function to register a user and store their info in Realtime Database
const registerUser = async (email, password, isAdmin = false) => {
  try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Assign role based on isAdmin flag
      const role = isAdmin ? "admin" : "user";

      // Store user in database using UID as the key
      await set(ref(database, `users/${user.uid}`), {
          email: user.email,
          role: role, // Assign role
          createdAt: new Date().toISOString()
      });

      console.log(`User registered: ${user.email} as ${role}`);
      return user;
  } catch (error) {
      console.error("Registration error:", error.message);
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
export { app, auth, database, registerUser, loginUser, logoutUser, onAuthStateChanged };

