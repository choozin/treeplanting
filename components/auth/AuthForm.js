"use client";

import { useState, useEffect } from "react";
import { registerUser, registerOtherUser, loginUser, logoutUser, auth, database, onAuthStateChanged } from "../../firebase/firebase";
import { ref, get, set, update } from "firebase/database"; // ✅ Import get and set functions

const PrintDBButton = () => {
    const [dbData, setDbData] = useState(null);
    const [showPopup, setShowPopup] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);

    const styles = {
        popup: {
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1000,
        },
        popupContent: {
            backgroundColor: "white",
            padding: "20px",
            borderRadius: "10px",
            width: "80%",
            maxWidth: "600px",
            position: "relative",
        },
        closeButton: {
            position: "absolute",
            top: "10px",
            right: "10px",
            background: "red",
            color: "white",
            border: "none",
            cursor: "pointer",
            padding: "5px",
            fontSize: "16px",
            borderRadius: "5px",
        },
        copyButton: {
            background: "#007BFF",
            color: "white",
            border: "none",
            cursor: "pointer",
            padding: "8px 12px",
            fontSize: "14px",
            borderRadius: "5px",
            marginBottom: "10px",
        },
        copySuccess: {
            marginLeft: "10px",
            color: "green",
            fontWeight: "bold",
        },
        textarea: {
            width: "100%",
            height: "300px",
            resize: "none",
            fontFamily: "monospace",
            fontSize: "14px",
            padding: "10px",
            border: "1px solid #ccc",
            borderRadius: "5px",
        },
    };

    const handlePrintDB = async () => {
        try {
            const dbRef = ref(database, "/"); // Root reference
            const snapshot = await get(dbRef);

            if (snapshot.exists()) {
                setDbData(JSON.stringify(snapshot.val(), null, 2)); // Pretty-print JSON
                setShowPopup(true);
            } else {
                alert("Database is empty.");
            }
        } catch (error) {
            alert("Error fetching database: " + error.message);
        }
    };

    const handleCopyToClipboard = () => {
        navigator.clipboard.writeText(dbData)
            .then(() => {
                setCopySuccess(true);
                setTimeout(() => setCopySuccess(false), 2000); // Reset message after 2 seconds
            })
            .catch((err) => console.error("Copy failed:", err));
    };

    return (
        <>
            <button onClick={handlePrintDB}>Print DB</button>

            {showPopup && (
                <div style={styles.popup}>
                    <div style={styles.popupContent}>
                        <button style={styles.closeButton} onClick={() => setShowPopup(false)}>✖</button>
                        <h3>Database Output</h3>
                        <button style={styles.copyButton} onClick={handleCopyToClipboard}>
                            📋 Copy to Clipboard
                        </button>
                        {copySuccess && <span style={styles.copySuccess}>✔ Copied!</span>}
                        <textarea
                            readOnly
                            value={dbData}
                            style={styles.textarea}
                        />
                    </div>
                </div>
            )}
        </>
    );
};

const SelfRegistrationAndLogin = ({ user, setUser, userData, setUserData }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [isRegistering, setIsRegistering] = useState(false);
    const [error, setError] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isRegistering) {
            try {
                const user = await registerUser(email, password, name);
                setUser(user);
                try {
                    const userDataRef = ref(database, `users/${user.uid}`);
                    const snapshot = await get(userDataRef);

                    if (snapshot.exists()) {
                        setUserData(snapshot.val());
                        alert("User data found: " + JSON.stringify(snapshot.val()));
                    } else {
                        setError("No user data found");
                        alert("No user data found");
                    }
                } catch (error) {
                    setError("Error getting user data: " + error.message);
                    alert("Error getting user data: " + error.message);
                }
            } catch (error) {
                setError(error.message);
            }
        } else {
            try {
                const user = await loginUser(email, password);
                setUser(user);
                try {
                    const userDataRef = ref(database, `users/${user.uid}`);
                    const snapshot = await get(userDataRef);

                    if (snapshot.exists()) {
                        setUserData(snapshot.val());
                        alert("User data found: " + JSON.stringify(snapshot.val()));
                    } else {
                        setError("No user data found");
                        alert("No user data found");
                    }
                } catch (error) {
                    setError("Error getting user data: " + error.message);
                    alert("Error getting user data: " + error.message);
                }
            } catch (error) {
                setError(error.message);
            }
        }
    };

    const handleLogout = async () => {
        await logoutUser();
        setUser(null);
        setUserData(null);
    };

    return (
        <div style={{ marginBottom: "20px" }}>
            {user ? (
                <div>
                    <p>
                        Logged in as: {userData ? userData.name + ' ' + userData.email + ' ' : "Loading..."}
                    </p>
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
                        }}
                    >
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
                            {isRegistering && (
                                <>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        required
                                        style={{ padding: '8px', fontSize: '16px' }}
                                    />
                                </>
                            )}
                            <button type="submit" style={{
                                padding: '10px',
                                backgroundColor: 'brown',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
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
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

const RegisterOtherUser = ({ user, setUser }) => {
    const [email, setEmail] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState("");
    const [error, setError] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    const handleRegistration = async (e) => {
        e.preventDefault();
        try {
            const user = await registerOtherUser(email, name, role);
            setUser(user);
        } catch (error) {
            setError(error.message);
        }

    };

    return (
        <div style={{ marginBottom: "20px" }}>
            {isOpen && (
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
                            backgroundColor: 'tan',
                            position: 'relative' // Ensures button is positioned inside the modal
                        }}
                    >
                        {/* Close Button */}
                        <button
                            onClick={() => setIsOpen(false)}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                background: 'red',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '5px',
                                fontSize: '16px',
                                borderRadius: '5px'
                            }}
                        >
                            ✖
                        </button>

                        <form onSubmit={handleRegistration} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <input
                                type="email"
                                placeholder="Email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            />
                            <input
                                type="text"
                                placeholder="Name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            />
                            <select
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                required
                                style={{ padding: '8px', fontSize: '16px' }}
                            >
                                <option value="">Select a role</option>
                                <option value="9">App Creator</option>
                                <option value="8">App Manager</option>
                                <option value="7">Client</option>
                                <option value="6">Camp Boss</option>
                                <option value="5">Foreman</option>
                                <option value="4">Employee</option>
                                <option value="3">Trainee</option>
                                <option value="2">Visitor</option>
                            </select>
                            <button type="submit" style={{
                                padding: '10px',
                                backgroundColor: 'brown',
                                color: 'white',
                                border: 'none',
                                cursor: 'pointer',
                            }}>
                                Register
                            </button>
                            {error && <p style={{ color: 'red' }}>{error}</p>}
                        </form>
                    </div>
                </div>
            )}
            <button onClick={() => setIsOpen(true)}>Register Other User</button>

        </div>
    );
};

// produces a list of ALL users in the DB
const SelectAUserDropdown = ({ onUserSelected }) => {
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const usersRef = ref(database, 'users');

        // Fetch the data once using get()
        get(usersRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const userArray = Object.entries(data).map(([userID, userInfo]) => ({
                        id: userID,
                        name: userInfo.name || userInfo.email || `Unnamed User (${userID})`,
                    }));
                    setUsers(userArray);
                } else {
                    setUsers([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching users:", error);
            });
    }, []);

    const handleChange = (event) => {
        const selectedUserId = event.target.value;
        onUserSelected(selectedUserId);
    };

    return (
        <div>
            <label htmlFor="userSelect">Select a User Account to Modify:</label>
            <select id="userSelect" onChange={handleChange}>
                <option value="">-- Select --</option>
                {users.map((user) => (
                    <option key={user.id} value={user.id}>
                        {user.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

// produces a list of ALL camps in the DB (modified to return the full camp object)
const SelectACampDropdown = ({ onCampSelected }) => {
    const [camps, setCamps] = useState([]);

    useEffect(() => {
        const campsRef = ref(database, 'camps');

        get(campsRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.val();
                    const campArray = Object.entries(data).map(([campID, campInfo]) => ({
                        id: campID,
                        name: campInfo.campName || `Unnamed Camp (${campID})`,
                    }));
                    setCamps(campArray);
                } else {
                    setCamps([]);
                }
            })
            .catch((error) => {
                console.error("Error fetching camps:", error);
            });
        // No listener cleanup is needed since get() is a one-time read.
    }, []);

    const handleChange = (event) => {
        const selectedCampID = event.target.value;
        // Find the full camp object from the list
        const selectedCamp = camps.find(camp => camp.id === selectedCampID) || null;
        onCampSelected(selectedCamp);
    };

    return (
        <div>
            <label htmlFor="campSelect">Select a camp: // still need to have this update the camp's user list too</label>
            <select id="campSelect" onChange={handleChange}>
                <option value="">-- Select --</option>
                {camps.map((camp) => (
                    <option key={camp.id} value={camp.id}>
                        {camp.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

// Allows the user to select a camp and a role, then assign the user to that camp
// Expects props:
//   - selectedUserID: the ID of the user to assign
//   - currentUserRole: the role of the currently logged-in user (from userData.role)
//     (the maximum assignable role will be currentUserRole - 1)
// 
const AddUserToCamp = ({ selectedUserID, currentUserRole }) => {
    const [selectedCamp, setSelectedCamp] = useState(null);
    const [selectedRole, setSelectedRole] = useState(1); // Default role value is 1

    // Create an array of possible roles from 1 up to currentUserRole - 1
    const maxAssignableRole = currentUserRole ? Math.max(currentUserRole, 1) : 1; 
    const roleOptions = [];
    const labels = [
        "",
        "Unassigned",
        "Visitor",
        "Trainee",
        "Employee",
        "Foreman",
        "Camp Boss",
        "Client",
        "App Manager",
        "App Creator",
    ]
    for (let i = 1; i <= maxAssignableRole && i <= 9; i++) {
        roleOptions.push({ role: i, label: labels[i] });
    }



    const handleAssign = async () => {
        if (!selectedUserID || !selectedCamp) {
            alert("Please select a camp and a role.");
            return;
        }

        try {
            // Prepare multi-location updates
            const updates = {};
            updates[`users/${selectedUserID}/assignedCamps/${selectedCamp.id}`] = {
                role: selectedRole,
                campName: selectedCamp.name
            };
            updates[`camps/${selectedCamp.id}/users/${selectedUserID}`] = {
                role: selectedRole,
            };

            // Atomically update both paths
            await update(ref(database), updates);
            alert(`User assigned to ${selectedCamp.name} with role ${selectedRole}`);
        } catch (error) {
            console.error('Error assigning user to camp:', error);
        }
    };

    return (
        <div>
            <h4>Assign User to Camp</h4>
            <SelectACampDropdown onCampSelected={setSelectedCamp} />
            <div style={{ marginTop: "10px" }}>
                <label htmlFor="roleSelect">Select Role:</label>
                <select
                    id="roleSelect"
                    value={selectedRole}
                    onChange={(e) => setSelectedRole(parseInt(e.target.value, 10))}
                >
                    {roleOptions.map((roleOption) => (
                        <option key={roleOption.role} value={roleOption.role}>
                            {roleOption.label}
                        </option>
                    ))}
                </select>
            </div>
            <button onClick={handleAssign} style={{ marginTop: "10px" }}>
                Assign User to Camp
            </button>
        </div>
    );
};

const UserManagement = ({ currentUserRole }) => {
    const [isRegisterOtherUserOpen, setIsRegisterOtherUserOpen] = useState(false);
    const [selectedUserID, setSelectedUserID] = useState(null);
    const [assignedCamps, setAssignedCamps] = useState(null);

    // Whenever a user is selected, fetch their assigned camps.
    useEffect(() => {
        if (selectedUserID) {
            const assignedCampsRef = ref(database, `users/${selectedUserID}/assignedCamps`);
            get(assignedCampsRef)
                .then((snapshot) => {
                    if (snapshot.exists()) {
                        setAssignedCamps(snapshot.val());
                    } else {
                        setAssignedCamps({});
                    }
                })
                .catch((error) => {
                    console.error("Error fetching assigned camps:", error);
                    setAssignedCamps({});
                });
        } else {
            setAssignedCamps(null);
        }
    }, [selectedUserID]);

    return (
        <div style={{ border: 'solid 1px red', padding: '48px', width: '100%', marginTop: "10px" }}>
            <h2>User Accounts Management</h2>
            <RegisterOtherUser />
            <SelectAUserDropdown onUserSelected={setSelectedUserID} />
            {selectedUserID && (
                <>
                    <AddUserToCamp selectedUserID={selectedUserID} currentUserRole={currentUserRole} />
                    <div style={{ marginTop: "16px" }}>
                        <h4>Assigned Camps for Selected User:</h4>
                        {assignedCamps && Object.keys(assignedCamps).length > 0 ? (
                            <ul>
                                {Object.entries(assignedCamps).map(([campID, campData]) => (
                                    <li key={campID}>
                                        {campData.campName} (Role: {campData.role})
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p>No assigned camps.</p>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

const CampSelector = ({ user, userData, campID, onCampSelect }) => {
    const [camps, setCamps] = useState({});
    const [selectedCamp, setSelectedCamp] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!user || !userData) return; // Prevent premature execution

        const fetchCamps = async () => {
            setLoading(true);
            setError(null);

            try {
                const userRef = ref(database, `users/${user.uid}/assignedCamps`);
                const snapshot = await get(userRef);

                if (snapshot.exists()) {
                    setCamps(snapshot.val());
                } else {
                    setError("No assigned camps found");
                }
            } catch (error) {
                setError("Error fetching camps: " + error.message);
            }

            setLoading(false);
        };

        fetchCamps();
    }, [user, userData]); // Runs only when user and userData are available

    const handleCampChange = (e) => {
        const campID = e.target.value;
        setSelectedCamp(campID);
        onCampSelect(campID);
    };

    if (loading) return <p>Loading camps...</p>;
    if (error) return <p style={{ color: "red" }}>{error}</p>;

    return (
        <div style={{ padding: '10px' }}>
            <label>Select a Camp:</label>
            <select value={selectedCamp} onChange={handleCampChange}>
                <option value="">-- Choose a Camp --</option>
                {Object.entries(camps).map(([campID, campData]) => (
                    <option key={campID} value={campID}>
                        {campData.campName || `Unnamed Camp (${campID})`}
                    </option>
                ))}
            </select>
            <div>{campID ? "Camp ID: " + campID : "No Camp ID "}</div>
            <div>{campID && userData && userData.assignedCamps[campID].role ? "Camp Role: " + userData.assignedCamps[campID].role : "No Camp Role Assigned "}</div>
        </div>
    );
};

const AuthForm = ({ user, setUser, userData, setUserData, campID, setCampID }) => {
    const [isHydrated, setIsHydrated] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            setIsHydrated(true);
        }
    }, []);

    useEffect(() => {
        if (!isHydrated) return;

        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                try {
                    const userRef = ref(database, `users/${currentUser.uid}`);
                    const snapshot = await get(userRef);

                    if (snapshot.exists()) {
                        setUserData(snapshot.val());
                    } else {
                        setUserData(null);
                    }
                } catch (error) {
                    console.error("Error fetching user data:", error);
                    setUserData(null);
                }
            } else {
                setUser(null);
                setUserData(null);
            }
        });

        return () => unsubscribe(); // Cleanup listener on unmount
    }, [isHydrated]);

    if (!isHydrated || user === undefined || userData === undefined) return null; // Prevent hydration mismatch

    return (
        <div>
            test
            <PrintDBButton />
            <UserManagement currentUserRole={userData ? userData.role : 9} />
            <CampSelector user={user} userData={userData} campID={campID} onCampSelect={setCampID} />
        </div>
    );
}

export default AuthForm;
