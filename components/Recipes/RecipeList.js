"use client";

import { useState, useEffect, useMemo } from 'react';
import { ref, onValue, get } from "firebase/database";
import { auth, database, logoutUser } from "../../firebase/firebase";

import SortableTable from "./SortableTable";


const RecipeList = () => {

    const originalRecipes = [
        {
            "recipeName": "Penne Bake w/ Italian Sausage",
            "difficulty": 1,
            "cost": 3,
            "excitement": 4,
            "month": 6
        },
        {
            "recipeName": "Spaghetti w/ Bolognese",
            "difficulty": 1,
            "cost": 3,
            "excitement": 4,
            "month": 6
        },
        {
            "recipeName": "Lasagna",
            "difficulty": 4,
            "cost": 4,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Chicken Parm",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Cold Cut/Meatball Subs (w/ lettuce, onion, tomato, cucumber, spinach, etc.)",
            "difficulty": 1,
            "cost": 2,
            "excitement": 3,
            "month": 7
        },
        {
            "recipeName": "Pulled Pork Sandwiches w/ Roasted Potatoes & Veg",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Hamburgers/Hot Dogs w/ Fries & Onion Rings",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Sloppy Joes on Fresh Buns",
            "difficulty": 2,
            "cost": 2,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "(Vegetarian) Chilli Cheese Dogs",
            "difficulty": 2,
            "cost": 2,
            "excitement": 4,
            "month": 6
        },
        {
            "recipeName": "Korean Beef w/ Shredded Carrot, Rice & Bok Choi",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Cabbage & Sweet & Salty (Ground) Pork on Rice w/ Shredded Carrot",
            "difficulty": 3,
            "cost": 2,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Chicken Chow Mein w/ carrot, beansprout, something else green?",
            "difficulty": 2,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Beef & Broccoli w/ egg fried rice",
            "difficulty": 4,
            "cost": 3,
            "excitement": 4,
            "month": 6
        },
        {
            "recipeName": "Dumplings",
            "difficulty": 4,
            "cost": 2,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Chicken, Broccoli, Cheesy Scalloped Potatoes",
            "difficulty": 4,
            "cost": 3,
            "excitement": 4,
            "month": 5
        },
        {
            "recipeName": "Chili con Carne & Loaded Baked Potatoes",
            "difficulty": 3,
            "cost": 3,
            "excitement": 4,
            "month": 5
        },
        {
            "recipeName": "Macaroni & Cheese w/ Sliced Hot Dog & Cous Cous Salad",
            "difficulty": 1,
            "cost": 3,
            "excitement": 4,
            "month": 6
        },
        {
            "recipeName": "Shepards Pie",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Chicken Noodle Soup & Grilled Cheese & Bacon Sandwiches (disposable bowls)",
            "difficulty": 1,
            "cost": 2,
            "excitement": 4,
            "month": 5
        },
        {
            "recipeName": "BBQ Chicken Drumsticks/Thighs w/ corn on the cob & potato salad",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 7
        },
        {
            "recipeName": "Tacos",
            "difficulty": 2,
            "cost": 2,
            "excitement": 3,
            "month": 7
        },
        {
            "recipeName": "Burritos",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Fajitas",
            "difficulty": 3,
            "cost": 4,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Quesadillas & Mexican Salad",
            "difficulty": 2,
            "cost": 2,
            "excitement": 3,
            "month": 6
        },
        {
            "recipeName": "Murgh Saagwala (Chicken curry with tomato/onion base and leafy greens)",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 5
        },
        {
            "recipeName": "Chicken Souvlaki wraps",
            "difficulty": 2,
            "cost": 3,
            "excitement": 3,
            "month": 7
        },
        {
            "recipeName": "Tandoori Chicken w/ Curried Lentils & Roasted Vegetables",
            "difficulty": 3,
            "cost": 3,
            "excitement": 3,
            "month": 6
        }
    ];

    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [recipes, setRecipes] = useState(originalRecipes)

    useEffect(() => {

        const unsubscribeAuth = auth.onAuthStateChanged(async (currentUser) => {
            setUser(currentUser);
            if (currentUser) {
                const userRef = ref(database, `users/${currentUser.uid}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    setRole(snapshot.val().role);
                }
            } else {
                setRole(null);
            }
        });

        const dataRef = ref(database, '/recipes');
        const unsubscribeData = onValue(dataRef, (snapshot) => {
            if (snapshot.exists()) {
                const dataObject = snapshot.val();

                // Convert object to array
                const dataArray = Object.keys(dataObject).map((key) => ({
                    id: key,
                    ...dataObject[key]
                }));

                setRecipes(dataArray);
            } else {
                alert("Connected to Firebase, but no data found.");
                console.log("Connected to Firebase, but no data found.");
            }
        }, (error) => {
            alert("Firebase connection error:" + error);
            console.error("Firebase connection error:", error);
        });

        return () => {
            unsubscribeAuth();
            unsubscribeData();
        }
    }, []);




    const SortableTable = ({ data }) => {

        // sortConfig holds the key and direction for sorting
        const [sortConfig, setSortConfig] = useState({
            key: 'month',
            direction: 'ascending',
        });

        // Memoized sorted data so we only re-sort when data or sortConfig changes
        const sortedData = useMemo(() => {
            const sortableData = [...recipes];
            if (sortConfig.key !== '') {
                sortableData.sort((a, b) => {
                    let aValue = a[sortConfig.key];
                    let bValue = b[sortConfig.key];

                    // For Recipe Name, do alphabetical (case-insensitive) sorting
                    if (sortConfig.key === 'recipeName') {
                        aValue = String(aValue).toLowerCase();
                        bValue = String(bValue).toLowerCase();
                        if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
                        if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
                        return 0;
                    } else {
                        // For numeric fields (difficulty, cost, excitement, month)
                        return sortConfig.direction === 'ascending'
                            ? aValue - bValue
                            : bValue - aValue;
                    }
                });
            }
            return sortableData;
        }, [data, sortConfig]);

        // Toggles sorting for a column
        const requestSort = (key) => {
            let direction = 'ascending';
            if (sortConfig.key === key && sortConfig.direction === 'ascending') {
                direction = 'descending';
            }
            setSortConfig({ key, direction });
        };

        // Helper to render an arrow for the sorted column
        const getSortIndicator = (key) => {
            if (sortConfig.key === key) {
                return (
                    <span style={{ display: 'inline-block', minWidth: '20px' }}>
                        {sortConfig.direction === 'ascending' ? '▲' : '▼'}
                    </span>
                )
            }
            return (
                <div style={{ display: 'inline-block', minWidth: '20px' }}> </div>
            );
        };

        const getWeather = (month) => {
            switch (month) {
                case 5:
                    return "Cold";
                case 6:
                    return "Anytime";
                case 7:
                    return "Hot";
                default:
                    return "Invalid month";
            }
        }

        const getNotes = (excitement) => {
            switch (excitement) {
                case 1:
                    return "None";
                case 2:
                    return "Some";
                case 3:
                    return "";
                case 4:
                    return "Of Note";
                case 5:
                    return "All";
                default:
                    return "Invalid month";
            }
        }

        return (
            <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th
                                style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px', paddingLeft: '28px' }}
                                onClick={() => requestSort('recipeName')}
                            >
                                Recipe Name{getSortIndicator('recipeName')}
                            </th>
                            <th
                                style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px', paddingLeft: '24px' }}
                                onClick={() => requestSort('difficulty')}
                            >
                                Difficulty{getSortIndicator('difficulty')}
                            </th>
                            <th
                                style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px', paddingLeft: '24px' }}
                                onClick={() => requestSort('month')}
                            >
                                Weather{getSortIndicator('month')}
                            </th>
                            <th
                                style={{ cursor: 'pointer', borderBottom: '2px solid #ccc', padding: '8px', paddingLeft: '24px' }}
                                onClick={() => requestSort('excitement')}
                            >
                                Notes{getSortIndicator('excitement')}
                            </th>
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: 'center' }}>
                        {sortedData.map((row, index) => (
                            <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                <td style={{ padding: '8px' }}>{row.recipeName}</td>
                                <td style={{ padding: '8px' }}>{row.difficulty}</td>
                                <td style={{ padding: '8px' }}>{getWeather(row.month)}</td>
                                <td style={{ padding: '8px' }}>{getNotes(row.excitement)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };


    return (
        <div>
            <SortableTable data={recipes} />
        </div>
    )
}

export default RecipeList;