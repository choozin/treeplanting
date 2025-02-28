"use client";

import { useState, useEffect } from "react";
import { registerUser, loginUser, logoutUser, auth, database, onAuthStateChanged } from "../../firebase/firebase";
import { ref, get, child } from "firebase/database"; // ✅ Import get function

const AuthForm = () => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [isRegistering, setIsRegistering] = useState(false);

    // Listen for authentication changes and fetch role
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                try {
                    // Correct way to use `get()`
                    const userRef = ref(database);
                    const snapshot = await get(child(userRef, `users/${currentUser.uid}`)); // ✅ Fix get() usage

                    if (snapshot.exists()) {
                        setRole(snapshot.val().role);
                    } else {
                        console.log("User role not found");
                    }
                } catch (error) {
                    console.error("Error fetching role:", error);
                }
            } else {
                setRole(null);
            }
        });

        return () => unsubscribe();
    }, []);


    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isRegistering) {
            await registerUser(email, password);
        } else {
            await loginUser(email, password);
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        setRole(null);
    };

    return (
        <div style={{ marginBottom: "20px" }}>
            {user ? (
                <div>
                    <p>Logged in as: {user.email} ({role})</p>
                    <button onClick={handleLogout}>Logout</button>
                </div>
            ) : (
                <div style={{
                    position: 'fixed',
                    width: '100vw',
                    height: '100vh',
                    top: 0,
                    left: 0,
                    background: 'rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                    <div
                        style={{
                            width: '600px',
                            maxWidth: '98vw',
                            padding: '1rem',
                            backgroundColor: 'tan'
                        }}>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            />
                            <button type="submit" style={{
                                padding: '10px',
                                backgroundColor: 'brown',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer'
                            }}>
                                {isRegistering ? "Register" : "Login"}
                            </button>
                            <button type="button" onClick={() => setIsRegistering(!isRegistering)} style={{
                                padding: '10px',
                                backgroundColor: 'gray',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer'
                            }}>
                                {isRegistering ? "Switch to Login" : "Switch to Register"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AuthForm;
