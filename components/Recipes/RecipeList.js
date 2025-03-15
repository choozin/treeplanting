"use client";

import React, {
    useState,
    useEffect,
    useMemo,
    useRef,
    forwardRef,
    useImperativeHandle,
} from "react";
import {
    ref,
    onValue,
    get,
    push,
    update,
    remove,
    set,
} from "firebase/database";
import { auth, database, logoutUser } from "../../firebase/firebase";
import {
    Modal,
    Button,
    TextInput,
    NumberInput,
    Group,
    Checkbox,
    Select,
    Textarea,
} from "@mantine/core";
import {
    IconEdit,
    IconTrash,
    IconPlus,
    IconFilter,
    IconUpload,
    IconCheck,
    IconX,
    IconChevronUp,
    IconChevronDown,
} from "@tabler/icons-react";

// Full originalRecipes array
const originalRecipes = [
    {
        recipeName: "Penne Bake w/ Italian Sausage",
        difficulty: 1,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Penne Pasta", form: "Dry (packaged)", quantity: "40 lb" },
            { name: "Italian Sausage", form: "Fresh (in casing)", quantity: "30 lb" },
        ],
        notes:
            "A hearty pasta bake with a rich tomato sauce. Ideal for a large family dinner.",
        vegan: "Plant‐based sausage (1 lb)",
        vegetarian: "Roasted mixed vegetables and mushrooms (1 lb)",
        glutenFree: "Gluten‐free pasta (1 lb)",
        recommendedSides: "Garlic Bread",
        recommendedBread: "",
        recommendedSalad: "Caesar Salad",
        recommendedDessert: "Tiramisu",
        createdBy: "",
    },
    {
        recipeName: "Spaghetti w/ Bolognese",
        difficulty: 1,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Spaghetti", form: "Dry (packaged)", quantity: "40 lb" },
            { name: "Ground Beef", form: "Fresh (ground)", quantity: "20 lb" },
            { name: "Tomato Sauce", form: "Canned", quantity: "80 cups" },
            { name: "Onion", form: "Fresh", quantity: "40 cups" },
        ],
        notes:
            "A classic spaghetti with a hearty meat sauce suitable for large groups.",
        vegan: "Lentils (1 lb)",
        vegetarian: "Mushrooms and lentils (1 lb)",
        glutenFree: "Gluten‐free spaghetti (1 lb)",
        recommendedSides: "Garlic Bread",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Lasagna",
        difficulty: 4,
        cost: 4,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Lasagna Noodles", form: "Dry (packaged)", quantity: "480 pieces" },
            { name: "Ricotta", form: "Fresh", quantity: "80 cups" },
            { name: "Mozzarella", form: "Pre‐shredded", quantity: "80 cups" },
            { name: "Ground Beef", form: "Fresh (ground)", quantity: "40 lb" },
        ],
        notes:
            "Layers of pasta, meat, and cheese baked to perfection for a crowd.",
        vegan: "Vegan cheese (1 lb) and grilled vegetables (1 lb)",
        vegetarian: "Mushrooms and spinach (1 lb)",
        glutenFree: "Gluten‐free lasagna noodles (17 pieces)",
        recommendedSides: "Garlic Bread",
        recommendedBread: "",
        recommendedSalad: "Green Salad",
        recommendedDessert: "Cannoli",
        createdBy: "",
    },
    {
        recipeName: "Chicken Parm",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Chicken Breast", form: "Fresh (skinless, boneless)", quantity: "80 pieces" },
            { name: "Marinara Sauce", form: "Canned", quantity: "40 cups" },
            { name: "Mozzarella", form: "Pre‐sliced", quantity: "20 lb" },
        ],
        notes:
            "Classic chicken parmesan with breaded chicken and melted cheese.",
        vegan: "Eggplant slices or tofu (3 pieces) and vegan cheese (1 lb)",
        vegetarian: "Eggplant or portobello mushrooms (3 pieces)",
        glutenFree: "Gluten‑free breadcrumbs (as per recipe)",
        recommendedSides: "",
        recommendedBread: "",
        recommendedSalad: "Caesar Salad",
        recommendedDessert: "Gelato",
        createdBy: "",
    },
    {
        recipeName: "Cold Cut/Meatball Subs",
        difficulty: 1,
        cost: 2,
        month: 7,
        meal: "dinner",
        ingredients: [
            { name: "Italian Cold Cuts", form: "Assorted (deli style)", quantity: "20 lb" },
            { name: "Meatballs", form: "Pre‐cooked", quantity: "160 pieces" },
            { name: "Sub Rolls", form: "Fresh bakery", quantity: "160 rolls" },
            { name: "Lettuce", form: "Fresh", quantity: "40 cups" },
            { name: "Tomato", form: "Fresh", quantity: "40 tomatoes" },
            { name: "Onion", form: "Fresh", quantity: "40 onions" },
        ],
        notes:
            "Delicious subs loaded with cold cuts and meatballs, perfect for lunch.",
        vegan: "Plant‐based deli slices (1 lb) and vegan meatballs (6 pieces)",
        vegetarian: "Grilled vegetables and cheese (1 lb)",
        glutenFree: "Gluten‑free sub rolls (6 rolls)",
        recommendedSides: "Chips",
        recommendedBread: "",
        recommendedSalad: "Coleslaw",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Pulled Pork Sandwiches w/ Roasted Potatoes & Veg",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Pulled Pork", form: "Fresh (slow‐cooked)", quantity: "40 lb" },
            { name: "Potatoes", form: "Fresh (raw)", quantity: "80 lb" },
            { name: "Mixed Vegetables", form: "Fresh", quantity: "40 lb" },
        ],
        notes:
            "Tender pulled pork served with crispy roasted potatoes and steamed veggies.",
        vegan: "Jackfruit or BBQ tofu (1 lb)",
        vegetarian: "Portobello mushrooms (1 lb)",
        glutenFree: "",
        recommendedSides: "Coleslaw",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Brownies",
        createdBy: "",
    },
    {
        recipeName: "Hamburgers/Hot Dogs w/ Fries & Onion Rings",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Hamburger Patties", form: "Fresh (ground beef)", quantity: "160 patties" },
            { name: "Hot Dogs", form: "Packaged", quantity: "160 hot dogs" },
            { name: "Fries", form: "Frozen", quantity: "40 lb" },
            { name: "Onion Rings", form: "Frozen", quantity: "40 servings" },
        ],
        notes:
            "A fun mix of burgers, hot dogs, fries, and onion rings perfect for a crowd.",
        vegan: "Plant‐based patties (6 patties) and vegan hot dogs (6 pieces)",
        vegetarian: "Veggie patties (6 patties)",
        glutenFree: "",
        recommendedSides: "Pickles",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Ice Cream",
        createdBy: "",
    },
    {
        recipeName: "Sloppy Joes on Fresh Buns",
        difficulty: 2,
        cost: 2,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Ground Beef", form: "Fresh (ground)", quantity: "40 lb" },
            { name: "Sloppy Joe Sauce", form: "Canned", quantity: "40 cups" },
            { name: "Fresh Buns", form: "Bakery", quantity: "160 buns" },
        ],
        notes: "Messy and delicious sloppy joes that are easy to serve.",
        vegan: "Textured vegetable protein (1 lb)",
        vegetarian: "Lentils and mushrooms (1 lb)",
        glutenFree: "Gluten‑free buns (6 buns)",
        recommendedSides: "Potato Chips",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "(Vegetarian) Chilli Cheese Dogs",
        difficulty: 2,
        cost: 2,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Veggie Dogs", form: "Packaged", quantity: "160 veggie dogs" },
            { name: "Chilli", form: "Canned", quantity: "40 cups" },
            { name: "Cheddar Cheese", form: "Pre‐shredded", quantity: "40 cups" },
        ],
        notes:
            "A twist on hot dogs featuring a spicy chilli and melted cheese.",
        vegan: "Soy‐based veggie dogs (6 pieces) and vegan cheese (1 cup)",
        vegetarian: "Already vegetarian",
        glutenFree: "",
        recommendedSides: "Fries",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Korean Beef w/ Shredded Carrot, Rice & Bok Choi",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Beef", form: "Fresh (sliced, marinated)", quantity: "40 lb" },
            { name: "Carrot", form: "Fresh", quantity: "40 cups" },
            { name: "Rice", form: "Dry (packaged)", quantity: "80 cups" },
            { name: "Bok Choi", form: "Fresh", quantity: "40 bunches" },
        ],
        notes:
            "A flavorful dish with marinated beef and crisp vegetables.",
        vegan: "Marinated tofu (1 lb)",
        vegetarian: "Mushrooms and tofu (1 lb)",
        glutenFree: "",
        recommendedSides: "Kimchi",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Mochi",
        createdBy: "",
    },
    {
        recipeName:
            "Cabbage & Sweet & Salty (Ground) Pork on Rice w/ Shredded Carrot",
        difficulty: 3,
        cost: 2,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Ground Pork", form: "Fresh (raw)", quantity: "40 lb" },
            { name: "Cabbage", form: "Fresh", quantity: "80 cups" },
            { name: "Carrot", form: "Fresh", quantity: "40 cups" },
            { name: "Rice", form: "Dry (packaged)", quantity: "80 cups" },
        ],
        notes: "A sweet and salty pork dish served over rice.",
        vegan: "Soy protein (1 lb)",
        vegetarian: "Mushrooms and lentils (1 lb)",
        glutenFree: "",
        recommendedSides: "Pickled Vegetables",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Chicken Chow Mein w/ carrot, beansprout, something else green?",
        difficulty: 2,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Chicken", form: "Fresh (sliced)", quantity: "40 lb" },
            { name: "Chow Mein Noodles", form: "Dry (packaged)", quantity: "20 lb" },
            { name: "Carrot", form: "Fresh", quantity: "40 carrots" },
            { name: "Beansprouts", form: "Fresh", quantity: "80 cups" },
            { name: "Green Pepper", form: "Fresh", quantity: "40 peppers" },
        ],
        notes:
            "A stir‐fried noodle dish with crisp vegetables and tender chicken.",
        vegan: "Tofu (1 lb)",
        vegetarian: "Tofu and mushrooms (1 lb)",
        glutenFree: "Gluten‑free noodles (1 lb)",
        recommendedSides: "Egg Roll",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Fortune Cookie",
        createdBy: "",
    },
    {
        recipeName: "Beef & Broccoli w/ egg fried rice",
        difficulty: 4,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Beef", form: "Fresh (sliced)", quantity: "40 lb" },
            { name: "Broccoli", form: "Fresh", quantity: "80 cups" },
            { name: "Egg Fried Rice", form: "Prepared", quantity: "120 cups" },
        ],
        notes:
            "A classic combination of beef, broccoli, and savory fried rice.",
        vegan: "Tofu (1 lb) and vegan egg substitute (1 lb)",
        vegetarian: "Extra vegetables and tofu (1 lb)",
        glutenFree: "Gluten‑free soy sauce (as needed)",
        recommendedSides: "Spring Rolls",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Dumplings",
        difficulty: 4,
        cost: 2,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Ground Pork", form: "Fresh (seasoned)", quantity: "20 lb" },
            { name: "Cabbage", form: "Fresh", quantity: "40 cups" },
            { name: "Dumpling Wrappers", form: "Dry (packaged)", quantity: "960 pieces" },
        ],
        notes:
            "Steamed dumplings filled with a savory pork mixture.",
        vegan: "Mushrooms and tofu (1 lb)",
        vegetarian: "Vegetables and tofu (1 lb)",
        glutenFree: "Gluten‑free dumpling wrappers (34 pieces)",
        recommendedSides: "Soy Sauce",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Fortune Cookie",
        createdBy: "",
    },
    {
        recipeName: "Chicken, Broccoli, Cheesy Scalloped Potatoes",
        difficulty: 4,
        cost: 3,
        month: 5,
        meal: "dinner",
        ingredients: [
            { name: "Chicken", form: "Fresh (diced)", quantity: "40 lb" },
            { name: "Broccoli", form: "Fresh", quantity: "80 cups" },
            { name: "Scalloped Potatoes", form: "Prepared", quantity: "120 cups" },
        ],
        notes:
            "A hearty dish combining tender chicken, broccoli, and cheesy potatoes.",
        vegan: "Chickpeas (1 lb) and vegan cheese (1 lb)",
        vegetarian: "Extra potatoes and vegetables (1 lb)",
        glutenFree: "",
        recommendedSides: "",
        recommendedBread: "",
        recommendedSalad: "Green Salad",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Chili con Carne & Loaded Baked Potatoes",
        difficulty: 3,
        cost: 3,
        month: 5,
        meal: "dinner",
        ingredients: [
            { name: "Ground Beef", form: "Fresh (ground)", quantity: "40 lb" },
            { name: "Chili", form: "Canned", quantity: "80 cups" },
            { name: "Baked Potatoes", form: "Fresh", quantity: "160 potatoes" },
        ],
        notes:
            "A spicy and filling chili served with loaded baked potatoes.",
        vegan: "Lentils (1 lb)",
        vegetarian: "Beans and vegetables (1 lb)",
        glutenFree: "",
        recommendedSides: "Sour Cream",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Cornbread",
        createdBy: "",
    },
    {
        recipeName: "Macaroni & Cheese w/ Sliced Hot Dog & Cous Cous Salad",
        difficulty: 1,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Macaroni", form: "Dry (packaged)", quantity: "40 lb" },
            { name: "Cheddar Cheese", form: "Pre‐shredded", quantity: "80 cups" },
            { name: "Sliced Hot Dog", form: "Packaged", quantity: "160 pieces" },
            { name: "Cous Cous", form: "Dry (packaged)", quantity: "40 cups" },
        ],
        notes:
            "A fun twist on mac & cheese with hot dogs and a refreshing cous cous salad.",
        vegan: "Vegan sausages (6 pieces) and vegan cheese (3 cups)",
        vegetarian: "Vegetable medley (1 lb)",
        glutenFree:
            "Gluten‑free macaroni (1 lb) and gluten‑free cous cous (1 cup)",
        recommendedSides: "Breadsticks",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Shepards Pie",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Ground Lamb", form: "Fresh (ground)", quantity: "40 lb" },
            { name: "Mixed Vegetables", form: "Fresh (diced)", quantity: "80 cups" },
            { name: "Mashed Potatoes", form: "Prepared", quantity: "120 cups" },
        ],
        notes:
            "A comforting shepherd's pie with a savory lamb filling and mashed potato topping.",
        vegan: "Lentils (1 lb) and mashed cauliflower (1 lb)",
        vegetarian: "Lentils and extra vegetables (1 lb)",
        glutenFree: "",
        recommendedSides: "",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName:
            "Chicken Noodle Soup & Grilled Cheese & Bacon Sandwiches (disposable bowls)",
        difficulty: 1,
        cost: 2,
        month: 5,
        meal: "dinner",
        ingredients: [
            { name: "Chicken Noodle Soup", form: "Prepared", quantity: "80 cups" },
            { name: "Grilled Cheese", form: "Prepared", quantity: "80 sandwiches" },
            { name: "Bacon Sandwiches", form: "Prepared", quantity: "80 sandwiches" },
        ],
        notes:
            "Comforting soup with grilled cheese and bacon sandwiches served in disposable bowls.",
        vegan:
            "Vegetable soup (3 cups), vegan grilled cheese (3 sandwiches), and vegan bacon (3 pieces)",
        vegetarian:
            "Tomato‐based grilled cheese (3 sandwiches) and smoked tofu (3 pieces)",
        glutenFree: "Gluten‑free bread (as per recipe)",
        recommendedSides: "Saltine Crackers",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName:
            "BBQ Chicken Drumsticks/Thighs w/ corn on the cob & potato salad",
        difficulty: 3,
        cost: 3,
        month: 7,
        meal: "dinner",
        ingredients: [
            { name: "BBQ Chicken Drumsticks", form: "Fresh", quantity: "240 pieces" },
            { name: "Corn on the Cob", form: "Fresh", quantity: "160 cobs" },
            { name: "Potato Salad", form: "Prepared", quantity: "80 cups" },
        ],
        notes:
            "Smoky BBQ chicken paired with corn and a creamy potato salad.",
        vegan: "BBQ jackfruit (9 pieces) and vegan potato salad (3 cups)",
        vegetarian: "Grilled tofu (9 pieces)",
        glutenFree: "",
        recommendedSides: "Coleslaw",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Tacos",
        difficulty: 2,
        cost: 2,
        month: 7,
        meal: "dinner",
        ingredients: [
            { name: "Taco Shells", form: "Hard (packaged)", quantity: "320 shells" },
            { name: "Seasoned Beef", form: "Fresh (ground)", quantity: "40 lb" },
            { name: "Lettuce", form: "Fresh", quantity: "40 cups" },
            { name: "Cheddar Cheese", form: "Pre‐shredded", quantity: "40 cups" },
            { name: "Tomato", form: "Fresh", quantity: "40 tomatoes" },
        ],
        notes:
            "Crunchy tacos loaded with seasoned beef and fresh toppings.",
        vegan: "Black beans (1 lb)",
        vegetarian: "Beans and grilled vegetables (1 lb)",
        glutenFree: "Gluten‑free taco shells (11 shells)",
        recommendedSides: "Guacamole",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Churros",
        createdBy: "",
    },
    {
        recipeName: "Burritos",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Flour Tortillas", form: "Packaged", quantity: "240 tortillas" },
            { name: "Refried Beans", form: "Canned", quantity: "40 cups" },
            { name: "Rice", form: "Dry (packaged)", quantity: "80 cups" },
            { name: "Cheese", form: "Pre‐shredded", quantity: "40 cups" },
            { name: "Salsa", form: "Fresh", quantity: "40 cups" },
        ],
        notes:
            "A filling burrito with hearty beans, rice, and cheese.",
        vegan: "Vegan cheese (1 cup)",
        vegetarian: "Already vegetarian",
        glutenFree: "Gluten‑free tortillas (9 tortillas)",
        recommendedSides: "Nachos",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Fajitas",
        difficulty: 3,
        cost: 4,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Chicken or Beef", form: "Fresh (sliced)", quantity: "40 lb" },
            { name: "Bell Peppers", form: "Fresh", quantity: "80 peppers" },
            { name: "Onions", form: "Fresh", quantity: "40 onions" },
            { name: "Fajita Seasoning", form: "Packaged", quantity: "to taste" },
            { name: "Lime", form: "Fresh", quantity: "40 limes" },
        ],
        notes:
            "Sizzling fajitas with vibrant peppers, onions, and tender meat.",
        vegan: "Portobello mushrooms and tofu (1 lb)",
        vegetarian: "Extra vegetables and tofu (1 lb)",
        glutenFree: "",
        recommendedSides: "Guacamole",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Flan",
        createdBy: "",
    },
    {
        recipeName: "Quesadillas & Mexican Salad",
        difficulty: 2,
        cost: 2,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Tortillas", form: "Packaged", quantity: "160 tortillas" },
            { name: "Cheese", form: "Melted", quantity: "80 cups" },
            { name: "Chicken", form: "Fresh (diced)", quantity: "40 lb" },
            { name: "Mexican Salad", form: "Fresh", quantity: "40 bowls" },
        ],
        notes:
            "Cheesy quesadillas paired with a zesty Mexican salad.",
        vegan: "Seasoned tofu (1 lb) and vegan cheese (3 cups)",
        vegetarian: "Extra vegetables (1 lb)",
        glutenFree: "Gluten‑free tortillas (6 tortillas)",
        recommendedSides: "Sour Cream",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName:
            "Murgh Saagwala (Chicken curry with tomato/onion base and leafy greens)",
        difficulty: 3,
        cost: 3,
        month: 5,
        meal: "dinner",
        ingredients: [
            { name: "Chicken", form: "Fresh (diced)", quantity: "40 lb" },
            { name: "Tomato", form: "Canned (pureed)", quantity: "80 cups" },
            { name: "Onion", form: "Fresh (chopped)", quantity: "40 cups" },
            { name: "Spinach", form: "Fresh", quantity: "120 cups" },
            { name: "Curry Spices", form: "Mixed (packaged)", quantity: "80 tbsp" },
        ],
        notes:
            "A fragrant chicken curry with a rich, spicy tomato base.",
        vegan: "Chickpeas (1 lb)",
        vegetarian: "Paneer or tofu (1 lb)",
        glutenFree: "",
        recommendedSides: "Naan",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Gulab Jamun",
        createdBy: "",
    },
    {
        recipeName: "Chicken Souvlaki wraps",
        difficulty: 2,
        cost: 3,
        month: 7,
        meal: "dinner",
        ingredients: [
            { name: "Chicken", form: "Fresh (marinated)", quantity: "40 lb" },
            { name: "Pita Bread", form: "Packaged", quantity: "160 pitas" },
            { name: "Tzatziki Sauce", form: "Prepared", quantity: "40 cups" },
            { name: "Lettuce", form: "Fresh", quantity: "40 cups" },
            { name: "Tomato", form: "Fresh (sliced)", quantity: "40 tomatoes" },
        ],
        notes:
            "Greek‐style wraps bursting with flavor and fresh veggies.",
        vegan: "Marinated portobello mushrooms (1 lb) and vegan tzatziki (1 cup)",
        vegetarian: "Grilled vegetables (1 lb)",
        glutenFree: "Gluten‑free pita (6 pitas)",
        recommendedSides: "",
        recommendedBread: "",
        recommendedSalad: "Greek Salad",
        recommendedDessert: "",
        createdBy: "",
    },
    {
        recipeName: "Tandoori Chicken w/ Curried Lentils & Roasted Vegetables",
        difficulty: 3,
        cost: 3,
        month: 6,
        meal: "dinner",
        ingredients: [
            { name: "Tandoori Chicken", form: "Fresh (spiced)", quantity: "40 lb" },
            { name: "Curried Lentils", form: "Prepared", quantity: "80 cups" },
            { name: "Roasted Vegetables", form: "Fresh", quantity: "80 cups" },
        ],
        notes:
            "An Indian‐inspired dish with spiced chicken and aromatic lentils.",
        vegan: "BBQ tofu (1 lb) and curried chickpeas (3 cups)",
        vegetarian: "Extra lentils and vegetables (1 lb)",
        glutenFree: "",
        recommendedSides: "Naan",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "Rice Pudding",
        createdBy: "",
    },
];

const UploadOriginalRecipeButton = ({ campID }) => {
    const [uploaded, setUploaded] = useState(false);

    const handleUpload = async () => {
        const proceed = window.confirm(
            "Only Cam should be pushing this button because it's for testing purposes. Do you wish to proceed?"
        );
        if (!proceed) return;
        const password = window.prompt("Enter password to proceed:");
        if (password !== "password") {
            alert("Incorrect password. Upload aborted.");
            return;
        }
        try {
            const currentUser = auth.currentUser;
            const userId = currentUser ? currentUser.uid : "";
            await set(ref(database, `/camps/${campID}/recipes`), null);
            for (let recipe of originalRecipes) {
                const recipeToUpload = { ...recipe, createdBy: userId };
                await push(ref(database, `/camps/${campID}/recipes`), recipeToUpload);
            }
            setUploaded(true);
            alert("Original recipes uploaded successfully.");
        } catch (error) {
            console.error("Error uploading recipes:", error);
            alert("Error uploading recipes: " + error);
        }
    };

    return (
        <Button
            onClick={handleUpload}
            disabled={uploaded}
            variant="outline"
            className="no-print"
            style={{ marginRight: "8px" }}
        >
            <IconUpload style={{ marginRight: "8px" }} />
            Upload Original Recipes
        </Button>
    );
};

const RecipeList = ({
    isRecipesListVisible,
    setIsRecipesListVisible,
    handleComponentChange,
    campID,
}) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [recipes, setRecipes] = useState([]);
    const [loading, setLoading] = useState(true);
    const [firebaseError, setFirebaseError] = useState(null);
    const [mealFilter, setMealFilter] = useState("dinner");

    const [selectedDifficulties, setSelectedDifficulties] = useState([1, 2, 3, 4, 5]);
    const [selectedMonths, setSelectedMonths] = useState([5, 6, 7]);
    const [selectedExcitement, setSelectedExcitement] = useState([1, 2, 3, 4, 5]);
    const [showFilterModal, setShowFilterModal] = useState(false);

    const [showAddModal, setShowAddModal] = useState(false);
    const [newRecipe, setNewRecipe] = useState({
        recipeName: "",
        difficulty: 1,
        cost: 1,
        month: 6,
        meal: "dinner",
        ingredients: [],
        notes: "",
        vegan: "",
        vegetarian: "",
        glutenFree: "",
        otherDietary: "",
        recommendedSides: "",
        recommendedBread: "",
        recommendedSalad: "",
        recommendedDessert: "",
        createdBy: "",
    });

    const [newIngredient, setNewIngredient] = useState({
        name: "",
        form: "",
        quantity: "",
    });
    const ingredientNameInputRef = useRef(null);

    const [editingRecipeId, setEditingRecipeId] = useState(null);
    const [editedRecipe, setEditedRecipe] = useState({});
    const [expandedRecipeIds, setExpandedRecipeIds] = useState([]);
    const [usersMap, setUsersMap] = useState({});

    const [inlineNewIngredient, setInlineNewIngredient] = useState({
        name: "",
        form: "",
        quantity: "",
    });

    // NEW: state to toggle export behavior.
    const [onlyExportExpanded, setOnlyExportExpanded] = useState(false);

    const tableRef = useRef(null);

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

        const dataRef = ref(database, `/camps/${campID}/recipes`);
        const unsubscribeData = onValue(
            dataRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const dataObject = snapshot.val();
                    const dataArray = Object.keys(dataObject).map((key) => ({
                        id: key,
                        ...dataObject[key],
                    }));
                    setRecipes(dataArray);
                    setLoading(false);
                } else {
                    setLoading(false);
                }
            },
            (error) => {
                setLoading(false);
                setFirebaseError("Firebase connection error: " + error);
            }
        );

        return () => {
            unsubscribeAuth();
            unsubscribeData();
        };
    }, [campID]);

    useEffect(() => {
        const usersRef = ref(database, "/users");
        const unsubscribeUsers = onValue(usersRef, (snapshot) => {
            if (snapshot.exists()) {
                setUsersMap(snapshot.val());
            }
        });
        return () => unsubscribeUsers();
    }, []);

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
    };

    const getShortNotes = (notes) => {
        if (!notes) return "";
        return notes.length > 80 ? notes.substring(0, 80) + "…" : notes;
    };

    const formatIngredients = (ingredients) => {
        if (!ingredients || ingredients.length === 0) return "";
        return ingredients
            .map((ing) => `${ing.name}, ${ing.form}, ${ing.quantity}`)
            .join("\n");
    };

    const hasAdditional = (recipe) => {
        return (
            (recipe.ingredients && recipe.ingredients.length > 0) ||
            (recipe.notes && recipe.notes.trim() !== "") ||
            (recipe.vegan && recipe.vegan.trim() !== "") ||
            (recipe.vegetarian && recipe.vegetarian.trim() !== "") ||
            (recipe.glutenFree && recipe.glutenFree.trim() !== "") ||
            (recipe.otherDietary && recipe.otherDietary.trim() !== "") ||
            (recipe.recommendedSides && recipe.recommendedSides.trim() !== "") ||
            (recipe.recommendedBread && recipe.recommendedBread.trim() !== "") ||
            (recipe.recommendedSalad && recipe.recommendedSalad.trim() !== "") ||
            (recipe.recommendedDessert && recipe.recommendedDessert.trim() !== "")
        );
    };

    const filteredRecipes = recipes.filter(
        (recipe) =>
            recipe.meal === mealFilter &&
            selectedDifficulties.includes(recipe.difficulty) &&
            selectedMonths.includes(recipe.month) &&
            selectedExcitement.includes(recipe.difficulty)
    );

    // Modified CSV download function
    const handleDownloadCSV = () => {
        const sortedData =
            (tableRef.current && tableRef.current.getSortedData()) || filteredRecipes;
        const dataToExport = onlyExportExpanded
            ? sortedData.filter((row) => expandedRecipeIds.includes(row.id))
            : sortedData;
        const headers = [
            "Recipe Name",
            "Difficulty",
            "Weather",
            "Notes",
            "Ingredients",
            "Vegan",
            "Vegetarian",
            "Gluten Free",
            "Other Dietary",
            "Recommended Sides",
            "Recommended Bread",
            "Recommended Salad",
            "Recommended Dessert",
            "Added By",
        ];
        const csvRows = [];
        csvRows.push(headers.join(","));
        dataToExport.forEach((row) => {
            const rowData = [
                row.recipeName,
                row.difficulty,
                getWeather(row.month),
                row.notes || "",
                formatIngredients(row.ingredients),
                row.vegan || "",
                row.vegetarian || "",
                row.glutenFree || "",
                row.otherDietary || "",
                row.recommendedSides || "",
                row.recommendedBread || "",
                row.recommendedSalad || "",
                row.recommendedDessert || "",
                row.createdBy && usersMap[row.createdBy]
                    ? usersMap[row.createdBy].name
                    : "",
            ];
            const csvRow = rowData
                .map((field) => `"${String(field).replace(/"/g, '""')}"`)
                .join(",");
            csvRows.push(csvRow);
        });
        const csvString = csvRows.join("\n");
        const blob = new Blob([csvString], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "table-data.csv";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    // Modified print function: if onlyExportExpanded is true, open a new window with a filtered table.
    const handlePrint = () => {
        const sortedData =
            (tableRef.current && tableRef.current.getSortedData()) || filteredRecipes;
        const dataToPrint = onlyExportExpanded
            ? sortedData.filter((row) => expandedRecipeIds.includes(row.id))
            : sortedData;

        if (!onlyExportExpanded) {
            window.print();
            return;
        }

        let printWindow = window.open("", "", "width=800,height=600");
        printWindow.document.write("<html><head><title>Print Recipes</title>");
        printWindow.document.write(
            `<style>
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
      </style>`
        );
        printWindow.document.write("</head><body>");
        printWindow.document.write("<table>");
        printWindow.document.write("<tr>");
        printWindow.document.write("<th>Recipe Name</th>");
        printWindow.document.write("<th>Difficulty</th>");
        printWindow.document.write("<th>Weather</th>");
        printWindow.document.write("<th>Notes</th>");
        printWindow.document.write("<th>Added By</th>");
        printWindow.document.write("</tr>");
        dataToPrint.forEach((row) => {
            printWindow.document.write("<tr>");
            printWindow.document.write(`<td>${row.recipeName}</td>`);
            printWindow.document.write(`<td>${row.difficulty}</td>`);
            printWindow.document.write(`<td>${getWeather(row.month)}</td>`);
            printWindow.document.write(`<td>${row.notes || ""}</td>`);
            printWindow.document.write(
                `<td>${row.createdBy && usersMap[row.createdBy]
                    ? usersMap[row.createdBy].name
                    : ""
                }</td>`
            );
            printWindow.document.write("</tr>");
        });
        printWindow.document.write("</table>");
        printWindow.document.write("</body></html>");
        printWindow.document.close();
        printWindow.focus();

        // Use onafterprint event to close the window after printing
        printWindow.onafterprint = () => {
            printWindow.close();
        };

        printWindow.print();
    };

    const toggleMealFilter = () => {
        setMealFilter((prev) => (prev === "dinner" ? "breakfast" : "dinner"));
    };

    const handleAddRecipeChange = (field, value) => {
        setNewRecipe((prev) => ({ ...prev, [field]: value }));
    };

    const handleAddRecipeSubmit = async () => {
        try {
            const recipeToAdd = { ...newRecipe, createdBy: user ? user.uid : "" };
            await push(ref(database, `/camps/${campID}/recipes`), recipeToAdd);
            setShowAddModal(false);
            setNewRecipe({
                recipeName: "",
                difficulty: 1,
                cost: 1,
                month: 6,
                meal: "dinner",
                ingredients: [],
                notes: "",
                vegan: "",
                vegetarian: "",
                glutenFree: "",
                otherDietary: "",
                recommendedSides: "",
                recommendedBread: "",
                recommendedSalad: "",
                recommendedDessert: "",
                createdBy: "",
            });
            setNewIngredient({ name: "", form: "", quantity: "" });
        } catch (error) {
            alert("Error adding recipe: " + error);
        }
    };

    const handleAddIngredient = () => {
        if (!newIngredient.name.trim()) return;
        const updatedIngredients = [...newRecipe.ingredients, newIngredient];
        handleAddRecipeChange("ingredients", updatedIngredients);
        setNewIngredient({ name: "", form: "", quantity: "" });
        if (ingredientNameInputRef.current) {
            ingredientNameInputRef.current.focus();
        }
    };

    const handleInlineIngredientChange = (index, field, value) => {
        const updatedIngredients = [...(editedRecipe.ingredients || [])];
        updatedIngredients[index] = { ...updatedIngredients[index], [field]: value };
        setEditedRecipe({ ...editedRecipe, ingredients: updatedIngredients });
    };

    const handleInlineAddIngredient = () => {
        const currentIngredients = editedRecipe.ingredients || [];
        if (!inlineNewIngredient.name.trim()) return;
        const updated = [...currentIngredients, inlineNewIngredient];
        setEditedRecipe({ ...editedRecipe, ingredients: updated });
        setInlineNewIngredient({ name: "", form: "", quantity: "" });
    };

    const handleInlineDeleteIngredient = (index) => {
        const currentIngredients = editedRecipe.ingredients || [];
        const updated = currentIngredients.filter((_, i) => i !== index);
        setEditedRecipe({ ...editedRecipe, ingredients: updated });
    };

    const handleEditIngredient = (index) => {
        const ingredientToEdit = newRecipe.ingredients[index];
        const updatedIngredients = newRecipe.ingredients.filter((_, i) => i !== index);
        handleAddRecipeChange("ingredients", updatedIngredients);
        setNewIngredient(ingredientToEdit);
        if (ingredientNameInputRef.current) {
            ingredientNameInputRef.current.focus();
        }
    };

    const handleDeleteIngredient = (index) => {
        const updatedIngredients = newRecipe.ingredients.filter((_, i) => i !== index);
        handleAddRecipeChange("ingredients", updatedIngredients);
    };

    const handleEditClick = (recipe) => {
        setEditingRecipeId(recipe.id);
        setEditedRecipe(recipe);
    };

    const handleEditChange = (field, value) => {
        setEditedRecipe((prev) => ({ ...prev, [field]: value }));
    };

    const handleEditSave = async (id) => {
        try {
            await update(ref(database, `/camps/${campID}/recipes/${id}`), editedRecipe);
            setEditingRecipeId(null);
            setEditedRecipe({});
        } catch (error) {
            alert("Error updating recipe: " + error);
        }
    };

    const handleEditCancel = () => {
        setEditingRecipeId(null);
        setEditedRecipe({});
    };

    const handleDelete = async (id) => {
        if (window.confirm("Are you sure you want to delete this recipe?")) {
            try {
                await remove(ref(database, `/camps/${campID}/recipes/${id}`));
            } catch (error) {
                alert("Error deleting recipe: " + error);
            }
        }
    };

    const handleSelectAllFilters = () => {
        setSelectedDifficulties([1, 2, 3, 4, 5]);
        setSelectedMonths([5, 6, 7]);
        setSelectedExcitement([1, 2, 3, 4, 5]);
    };

    const handleSelectNoneFilters = () => {
        setSelectedDifficulties([]);
        setSelectedMonths([]);
        setSelectedExcitement([]);
    };

    const toggleExpanded = (id, recipe) => {
        if (!hasAdditional(recipe)) return;
        setExpandedRecipeIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
        );
    };

    const totalColumns = role >= 5 ? 7 : 5;

    const SortableTable = forwardRef(({ data }, ref) => {
        const [sortConfig, setSortConfig] = useState({
            key: "month",
            direction: "ascending",
        });

        const sortedData = useMemo(() => {
            const sortableData = [...data];
            if (sortConfig.key !== "") {
                sortableData.sort((a, b) => {
                    let aValue = a[sortConfig.key];
                    let bValue = b[sortConfig.key];
                    if (sortConfig.key === "recipeName") {
                        aValue = String(aValue).toLowerCase();
                        bValue = String(bValue).toLowerCase();
                        if (aValue < bValue)
                            return sortConfig.direction === "ascending" ? -1 : 1;
                        if (aValue > bValue)
                            return sortConfig.direction === "ascending" ? 1 : -1;
                        return 0;
                    } else {
                        return sortConfig.direction === "ascending" ? aValue - bValue : bValue - aValue;
                    }
                });
            }
            return sortableData;
        }, [data, sortConfig]);

        const requestSort = (key) => {
            let direction = "ascending";
            if (sortConfig.key === key && sortConfig.direction === "ascending") {
                direction = "descending";
            }
            setSortConfig({ key, direction });
        };

        const getSortIndicator = (key) => {
            if (sortConfig.key === key) {
                return (
                    <span style={{ display: "inline-block", minWidth: "20px" }}>
                        {sortConfig.direction === "ascending" ? "▲" : "▼"}
                    </span>
                );
            }
            return <div style={{ display: "inline-block", minWidth: "20px" }}> </div>;
        };

        useImperativeHandle(ref, () => ({
            getSortedData: () => sortedData,
        }));

        return (
            <div style={{ overflowX: "auto", width: "100%" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                    <thead>
                        <tr>
                            <th
                                style={{
                                    cursor: "pointer",
                                    borderBottom: "2px solid #ccc",
                                    padding: "8px",
                                    paddingLeft: "28px",
                                    minWidth: "200px",
                                }}
                                onClick={() => requestSort("recipeName")}
                            >
                                <strong>Recipe Name</strong>
                                {getSortIndicator("recipeName")}
                            </th>
                            <th
                                style={{
                                    cursor: "pointer",
                                    borderBottom: "2px solid #ccc",
                                    padding: "8px",
                                    paddingLeft: "24px",
                                    minWidth: "100px",
                                }}
                                onClick={() => requestSort("difficulty")}
                            >
                                Difficulty{getSortIndicator("difficulty")}
                            </th>
                            <th
                                style={{
                                    cursor: "pointer",
                                    borderBottom: "2px solid #ccc",
                                    padding: "8px",
                                    paddingLeft: "24px",
                                    minWidth: "100px",
                                }}
                                onClick={() => requestSort("month")}
                            >
                                Weather{getSortIndicator("month")}
                            </th>
                            <th
                                style={{
                                    cursor: "pointer",
                                    borderBottom: "2px solid #ccc",
                                    padding: "8px",
                                    paddingLeft: "24px",
                                    minWidth: "150px",
                                }}
                                onClick={() => requestSort("notes")}
                            >
                                Notes{getSortIndicator("notes")}
                            </th>
                            <th
                                style={{
                                    borderBottom: "2px solid #ccc",
                                    padding: "8px",
                                    minWidth: "100px",
                                }}
                            >
                                Added By
                            </th>
                            {role >= 5 && (
                                <>
                                    <th
                                        className="no-print"
                                        style={{
                                            borderBottom: "2px solid #ccc",
                                            padding: "8px",
                                            minWidth: "50px",
                                        }}
                                    >
                                        Edit
                                    </th>
                                    <th
                                        className="no-print"
                                        style={{
                                            borderBottom: "2px solid #ccc",
                                            padding: "8px",
                                            minWidth: "50px",
                                        }}
                                    >
                                        Delete
                                    </th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody style={{ textAlign: "center" }}>
                        {sortedData.map((row, index) => {
                            const isExpanded = expandedRecipeIds.includes(row.id);
                            const additional = hasAdditional(row);
                            const rowStyle = !additional ? { backgroundColor: "#f0f0f0" } : {};
                            return (
                                <React.Fragment key={row.id || index}>
                                    <tr
                                        className="primary-row"
                                        style={{
                                            borderTop: "2px solid #ccc",
                                            borderBottom: "1px solid #eee",
                                            ...rowStyle,
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "8px",
                                                minWidth: "200px",
                                                cursor: additional ? "pointer" : "default",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "space-between",
                                            }}
                                            onClick={() => toggleExpanded(row.id, row)}
                                        >
                                            <span>
                                                {editingRecipeId === row.id ? (
                                                    <TextInput
                                                        value={editedRecipe.recipeName}
                                                        onChange={(e) =>
                                                            handleEditChange("recipeName", e.target.value)
                                                        }
                                                    />
                                                ) : (
                                                    <strong>{row.recipeName}</strong>
                                                )}
                                            </span>
                                            {hasAdditional(row) &&
                                                (isExpanded ? (
                                                    <IconChevronUp size={16} />
                                                ) : (
                                                    <IconChevronDown size={16} />
                                                ))}
                                        </td>
                                        <td style={{ padding: "8px", minWidth: "100px" }}>
                                            {editingRecipeId === row.id ? (
                                                <NumberInput
                                                    value={editedRecipe.difficulty}
                                                    onChange={(value) =>
                                                        handleEditChange("difficulty", value)
                                                    }
                                                />
                                            ) : (
                                                row.difficulty
                                            )}
                                        </td>
                                        <td style={{ padding: "8px", minWidth: "100px" }}>
                                            {editingRecipeId === row.id ? (
                                                <NumberInput
                                                    value={editedRecipe.month}
                                                    onChange={(value) =>
                                                        handleEditChange("month", value)
                                                    }
                                                />
                                            ) : (
                                                getWeather(row.month)
                                            )}
                                        </td>
                                        <td style={{ padding: "8px", minWidth: "150px" }}>
                                            {editingRecipeId === row.id ? (
                                                <Textarea
                                                    value={editedRecipe.notes}
                                                    onChange={(e) => handleEditChange("notes", e.target.value)}
                                                />
                                            ) : (
                                                getShortNotes(row.notes)
                                            )}
                                        </td>
                                        <td style={{ padding: "8px", minWidth: "100px" }}>
                                            {row.createdBy && usersMap[row.createdBy]
                                                ? usersMap[row.createdBy].name
                                                : ""}
                                        </td>
                                        {role >= 5 && (
                                            <>
                                                <td
                                                    className="no-print"
                                                    style={{ padding: "8px", minWidth: "50px" }}
                                                >
                                                    {editingRecipeId === row.id ? (
                                                        <Group spacing="xs" position="center">
                                                            <Button
                                                                variant="outline"
                                                                size="xs"
                                                                onClick={() => handleEditSave(row.id)}
                                                            >
                                                                <IconCheck size={16} />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="xs"
                                                                onClick={handleEditCancel}
                                                            >
                                                                <IconX size={16} />
                                                            </Button>
                                                        </Group>
                                                    ) : (
                                                        <Button
                                                            variant="subtle"
                                                            size="xs"
                                                            onClick={() => handleEditClick(row)}
                                                        >
                                                            <IconEdit size={16} />
                                                        </Button>
                                                    )}
                                                </td>
                                                <td
                                                    className="no-print"
                                                    style={{ padding: "8px", minWidth: "50px" }}
                                                >
                                                    <Button
                                                        variant="subtle"
                                                        size="xs"
                                                        onClick={() => handleDelete(row.id)}
                                                    >
                                                        <IconTrash size={16} />
                                                    </Button>
                                                </td>
                                            </>
                                        )}
                                    </tr>
                                    {isExpanded && (
                                        <tr
                                            className="expanded-row"
                                            style={{ borderBottom: "1px solid #eee" }}
                                        >
                                            <td
                                                colSpan={totalColumns}
                                                style={{ textAlign: "left", padding: "16px" }}
                                            >
                                                <div
                                                    style={{
                                                        display: "flex",
                                                        flexWrap: "wrap",
                                                        gap: "16px",
                                                    }}
                                                >
                                                    <div style={{ flex: "1 1 200px" }}>
                                                        <strong>Ingredients:</strong>
                                                        {editingRecipeId === row.id ? (
                                                            <div>
                                                                {editedRecipe.ingredients &&
                                                                    editedRecipe.ingredients.length > 0 && (
                                                                        <div>
                                                                            {editedRecipe.ingredients.map((ing, index) => (
                                                                                <div
                                                                                    key={index}
                                                                                    style={{
                                                                                        marginBottom: "8px",
                                                                                        display: "flex",
                                                                                        flexDirection: "column",
                                                                                        border: "1px solid #ddd",
                                                                                        padding: "8px",
                                                                                    }}
                                                                                >
                                                                                    <TextInput
                                                                                        label="Name"
                                                                                        value={ing.name}
                                                                                        onChange={(e) =>
                                                                                            handleInlineIngredientChange(index, "name", e.target.value)
                                                                                        }
                                                                                    />
                                                                                    <TextInput
                                                                                        label="Form"
                                                                                        value={ing.form}
                                                                                        onChange={(e) =>
                                                                                            handleInlineIngredientChange(index, "form", e.target.value)
                                                                                        }
                                                                                    />
                                                                                    <TextInput
                                                                                        label="Qty"
                                                                                        value={ing.quantity}
                                                                                        onChange={(e) =>
                                                                                            handleInlineIngredientChange(index, "quantity", e.target.value)
                                                                                        }
                                                                                    />
                                                                                    <Button
                                                                                        variant="subtle"
                                                                                        size="xs"
                                                                                        onClick={() => handleInlineDeleteIngredient(index)}
                                                                                        title="Delete ingredient"
                                                                                    >
                                                                                        <IconTrash size={16} />
                                                                                    </Button>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                <div
                                                                    style={{
                                                                        marginTop: "8px",
                                                                        display: "flex",
                                                                        flexDirection: "column",
                                                                        gap: "8px",
                                                                    }}
                                                                >
                                                                    <TextInput
                                                                        label="Name"
                                                                        value={inlineNewIngredient.name}
                                                                        onChange={(e) =>
                                                                            setInlineNewIngredient({
                                                                                ...inlineNewIngredient,
                                                                                name: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                    <TextInput
                                                                        label="Form"
                                                                        value={inlineNewIngredient.form}
                                                                        onChange={(e) =>
                                                                            setInlineNewIngredient({
                                                                                ...inlineNewIngredient,
                                                                                form: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                    <TextInput
                                                                        label="Qty"
                                                                        value={inlineNewIngredient.quantity}
                                                                        onChange={(e) =>
                                                                            setInlineNewIngredient({
                                                                                ...inlineNewIngredient,
                                                                                quantity: e.target.value,
                                                                            })
                                                                        }
                                                                    />
                                                                    <Button onClick={handleInlineAddIngredient} title="Add Ingredient">
                                                                        <IconPlus size={16} />
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            row.ingredients &&
                                                            row.ingredients.length > 0 && (
                                                                <div>
                                                                    {row.ingredients.map((ing, idx) => (
                                                                        <div key={idx} style={{ display: "flex", alignItems: "center", marginBottom: "4px" }}>
                                                                            <span style={{ flexGrow: 1 }}>
                                                                                {ing.name}, {ing.form} ({ing.quantity})
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            )
                                                        )}
                                                    </div>
                                                    <div style={{ flex: "1 1 200px" }}>
                                                        <strong>Full Notes:</strong>
                                                        {editingRecipeId === row.id ? (
                                                            <Textarea
                                                                value={editedRecipe.notes}
                                                                onChange={(e) => handleEditChange("notes", e.target.value)}
                                                            />
                                                        ) : (
                                                            row.notes && <p style={{ margin: "4px 0" }}>{row.notes}</p>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: "1 1 200px" }}>
                                                        <strong>Dietary Info:</strong>
                                                        {editingRecipeId === row.id ? (
                                                            <>
                                                                <TextInput
                                                                    label="Vegan"
                                                                    value={editedRecipe.vegan}
                                                                    onChange={(e) => handleEditChange("vegan", e.target.value)}
                                                                />
                                                                <TextInput
                                                                    label="Vegetarian"
                                                                    value={editedRecipe.vegetarian}
                                                                    onChange={(e) => handleEditChange("vegetarian", e.target.value)}
                                                                />
                                                                <TextInput
                                                                    label="Gluten Free"
                                                                    value={editedRecipe.glutenFree}
                                                                    onChange={(e) => handleEditChange("glutenFree", e.target.value)}
                                                                />
                                                                <TextInput
                                                                    label="Other Dietary"
                                                                    value={editedRecipe.otherDietary}
                                                                    onChange={(e) => handleEditChange("otherDietary", e.target.value)}
                                                                />
                                                            </>
                                                        ) : (
                                                            <p style={{ margin: "4px 0" }}>
                                                                {row.vegan && `Vegan: ${row.vegan}; `}
                                                                {row.vegetarian && `Vegetarian: ${row.vegetarian}; `}
                                                                {row.glutenFree && `Gluten Free: ${row.glutenFree}; `}
                                                                {row.otherDietary && `Other: ${row.otherDietary}`}
                                                            </p>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: "1 1 200px" }}>
                                                        <strong>Recommendations:</strong>
                                                        {editingRecipeId === row.id ? (
                                                            <>
                                                                <TextInput
                                                                    label="Sides"
                                                                    value={editedRecipe.recommendedSides}
                                                                    onChange={(e) => handleEditChange("recommendedSides", e.target.value)}
                                                                />
                                                                <TextInput
                                                                    label="Bread"
                                                                    value={editedRecipe.recommendedBread}
                                                                    onChange={(e) => handleEditChange("recommendedBread", e.target.value)}
                                                                />
                                                                <TextInput
                                                                    label="Salad"
                                                                    value={editedRecipe.recommendedSalad}
                                                                    onChange={(e) => handleEditChange("recommendedSalad", e.target.value)}
                                                                />
                                                                <TextInput
                                                                    label="Dessert"
                                                                    value={editedRecipe.recommendedDessert}
                                                                    onChange={(e) => handleEditChange("recommendedDessert", e.target.value)}
                                                                />
                                                            </>
                                                        ) : (
                                                            <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>
                                                                {row.recommendedSides && (
                                                                    <span style={{ margin: "0 8px" }}>
                                                                        Sides: <b>{row.recommendedSides}</b>
                                                                    </span>
                                                                )}
                                                                {row.recommendedBread && (
                                                                    <span style={{ margin: "0 8px" }}>
                                                                        Bread: <b>{row.recommendedBread}</b>
                                                                    </span>
                                                                )}
                                                                {row.recommendedSalad && (
                                                                    <span style={{ margin: "0 8px" }}>
                                                                        Salad: <b>{row.recommendedSalad}</b>
                                                                    </span>
                                                                )}
                                                                {row.recommendedDessert && (
                                                                    <span style={{ margin: "0 8px" }}>
                                                                        Dessert: <b>{row.recommendedDessert}</b>
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    });

    return (
        <div>
            <div style={{ marginBottom: "16px" }}>
                <Button
                    onClick={handlePrint}
                    variant="outline"
                    style={{ marginRight: "8px" }}
                    className="no-print"
                >
                    Print Table
                </Button>
                <Button
                    onClick={handleDownloadCSV}
                    variant="outline"
                    style={{ marginRight: "8px" }}
                    className="no-print"
                >
                    Download CSV
                </Button>
                {/* Toggle button for exporting only expanded rows */}
                <Button
                    onClick={() => setOnlyExportExpanded((prev) => !prev)}
                    variant="outline"
                    style={{ marginRight: "8px" }}
                    className="no-print"
                >
                    {onlyExportExpanded
                        ? "Export/Print All Rows"
                        : "Only Export Expanded Recipes"}
                </Button>
                <Button
                    onClick={toggleMealFilter}
                    variant="outline"
                    style={{ marginRight: "8px" }}
                    className="no-print"
                >
                    {mealFilter === "dinner"
                        ? "Change to Breakfast"
                        : "Change to Dinner"}
                </Button>
                <Button
                    onClick={() => setShowFilterModal(true)}
                    variant="outline"
                    style={{ marginRight: "8px" }}
                    className="no-print"
                >
                    <IconFilter size={16} style={{ marginRight: "4px" }} />
                    Filters
                </Button>
                {role >= 5 && (
                    <>
                        <UploadOriginalRecipeButton campID={campID} />
                        <Button
                            onClick={() => setShowAddModal(true)}
                            variant="outline"
                            style={{ marginRight: "8px" }}
                            className="no-print"
                        >
                            <IconPlus size={16} style={{ marginRight: "4px" }} />
                            Add Recipe
                        </Button>
                    </>
                )}
                <Button
                    onClick={() => setIsRecipesListVisible(false)}
                    variant="outline"
                    className="no-print"
                >
                    Close Recipe List
                </Button>
            </div>

            {loading && <div>Loading recipes...</div>}
            {firebaseError && <div>{firebaseError}</div>}

            <div id="printable">
                <SortableTable data={filteredRecipes} ref={tableRef} />
            </div>

            <Modal opened={showFilterModal} onClose={() => setShowFilterModal(false)} title="Filter Recipes">
                <div>
                    <Group position="apart" mb="sm">
                        <Button onClick={handleSelectAllFilters} size="xs">
                            Select All
                        </Button>
                        <Button onClick={handleSelectNoneFilters} size="xs">
                            Select None
                        </Button>
                    </Group>
                    <div>
                        <div>
                            <strong>Difficulty:</strong>
                        </div>
                        {[1, 2, 3, 4, 5].map((level) => (
                            <Checkbox
                                key={`diff-${level}`}
                                label={level.toString()}
                                checked={selectedDifficulties.includes(level)}
                                onChange={(e) => {
                                    if (e.currentTarget.checked) {
                                        setSelectedDifficulties((prev) => [...prev, level]);
                                    } else {
                                        setSelectedDifficulties((prev) =>
                                            prev.filter((item) => item !== level)
                                        );
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ marginTop: "16px" }}>
                        <div>
                            <strong>Month (Weather):</strong>
                        </div>
                        {[5, 6, 7].map((month) => (
                            <Checkbox
                                key={`month-${month}`}
                                label={getWeather(month)}
                                checked={selectedMonths.includes(month)}
                                onChange={(e) => {
                                    if (e.currentTarget.checked) {
                                        setSelectedMonths((prev) => [...prev, month]);
                                    } else {
                                        setSelectedMonths((prev) =>
                                            prev.filter((item) => item !== month)
                                        );
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <div style={{ marginTop: "16px" }}>
                        <div>
                            <strong>Excitement (dummy filter):</strong>
                        </div>
                        {[1, 2, 3, 4, 5].map((level) => (
                            <Checkbox
                                key={`excitement-${level}`}
                                label={level.toString()}
                                checked={selectedExcitement.includes(level)}
                                onChange={(e) => {
                                    if (e.currentTarget.checked) {
                                        setSelectedExcitement((prev) => [...prev, level]);
                                    } else {
                                        setSelectedExcitement((prev) =>
                                            prev.filter((item) => item !== level)
                                        );
                                    }
                                }}
                            />
                        ))}
                    </div>
                    <Group position="right" mt="md">
                        <Button onClick={() => setShowFilterModal(false)}>Apply Filters</Button>
                    </Group>
                </div>
            </Modal>

            <Modal opened={showAddModal} onClose={() => setShowAddModal(false)} title="Add New Recipe">
                <div>
                    <TextInput
                        label="Recipe Name"
                        value={newRecipe.recipeName}
                        onChange={(e) => handleAddRecipeChange("recipeName", e.target.value)}
                        required
                    />
                    <NumberInput
                        label="Difficulty"
                        value={newRecipe.difficulty}
                        onChange={(value) => handleAddRecipeChange("difficulty", value)}
                        min={1}
                        max={5}
                        required
                    />
                    <NumberInput
                        label="Cost"
                        value={newRecipe.cost}
                        onChange={(value) => handleAddRecipeChange("cost", value)}
                        min={1}
                        max={5}
                        required
                    />
                    <NumberInput
                        label="Month"
                        value={newRecipe.month}
                        onChange={(value) => handleAddRecipeChange("month", value)}
                        min={1}
                        max={12}
                        required
                    />
                    <Select
                        label="Meal"
                        value={newRecipe.meal}
                        onChange={(value) => handleAddRecipeChange("meal", value)}
                        data={[
                            { value: "breakfast", label: "Breakfast" },
                            { value: "dinner", label: "Dinner" },
                            { value: "side", label: "Side" },
                            { value: "dessert", label: "Dessert" },
                            { value: "salad", label: "Salad" },
                            { value: "soup", label: "Soup" },
                            { value: "bread", label: "Bread" },
                        ]}
                        required
                    />

                    <div style={{ marginTop: "16px" }}>
                        <strong>Ingredients:</strong>
                        {newRecipe.ingredients && newRecipe.ingredients.length > 0 && (
                            <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>
                                {newRecipe.ingredients.map((ing, index) => (
                                    <li key={index} style={{ display: "flex", alignItems: "center" }}>
                                        <span style={{ flexGrow: 1 }}>
                                            {ing.name}, {ing.form} ({ing.quantity})
                                        </span>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={() => handleEditIngredient(index)}
                                            title="Edit ingredient"
                                            style={{ marginRight: "4px" }}
                                        >
                                            <IconEdit size={16} />
                                        </Button>
                                        <Button
                                            variant="subtle"
                                            size="xs"
                                            onClick={() => handleDeleteIngredient(index)}
                                            title="Delete ingredient"
                                        >
                                            <IconTrash size={16} />
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                            <TextInput
                                label="Name"
                                value={newIngredient.name}
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({ ...prev, name: e.target.value }))
                                }
                                ref={ingredientNameInputRef}
                            />
                            <TextInput
                                label="Form"
                                value={newIngredient.form}
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({ ...prev, form: e.target.value }))
                                }
                            />
                            <TextInput
                                label="Qty"
                                value={newIngredient.quantity}
                                onChange={(e) =>
                                    setNewIngredient((prev) => ({ ...prev, quantity: e.target.value }))
                                }
                            />
                            <Button onClick={handleAddIngredient} title="Add Ingredient">
                                <IconPlus size={16} />
                            </Button>
                        </div>
                    </div>

                    <Textarea
                        label="Full Notes"
                        value={newRecipe.notes}
                        onChange={(e) => handleAddRecipeChange("notes", e.target.value)}
                    />
                    <TextInput
                        label="Vegan"
                        value={newRecipe.vegan}
                        onChange={(e) => handleAddRecipeChange("vegan", e.target.value)}
                    />
                    <TextInput
                        label="Vegetarian"
                        value={newRecipe.vegetarian}
                        onChange={(e) => handleAddRecipeChange("vegetarian", e.target.value)}
                    />
                    <TextInput
                        label="Gluten Free"
                        value={newRecipe.glutenFree}
                        onChange={(e) => handleAddRecipeChange("glutenFree", e.target.value)}
                    />
                    <TextInput
                        label="Other Dietary"
                        value={newRecipe.otherDietary}
                        onChange={(e) => handleAddRecipeChange("otherDietary", e.target.value)}
                    />
                    <TextInput
                        label="Recommended Sides"
                        value={newRecipe.recommendedSides}
                        onChange={(e) => handleAddRecipeChange("recommendedSides", e.target.value)}
                    />
                    <TextInput
                        label="Recommended Bread"
                        value={newRecipe.recommendedBread}
                        onChange={(e) => handleAddRecipeChange("recommendedBread", e.target.value)}
                    />
                    <TextInput
                        label="Recommended Salad"
                        value={newRecipe.recommendedSalad}
                        onChange={(e) => handleAddRecipeChange("recommendedSalad", e.target.value)}
                    />
                    <TextInput
                        label="Recommended Dessert"
                        value={newRecipe.recommendedDessert}
                        onChange={(e) => handleAddRecipeChange("recommendedDessert", e.target.value)}
                    />
                    <Group position="right" mt="md">
                        <Button onClick={handleAddRecipeSubmit}>Add Recipe</Button>
                    </Group>
                </div>
            </Modal>

            <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable,
          #printable * {
            visibility: visible;
          }
          #printable {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
          .expanded-row {
            background-color: transparent !important;
          }
          tr.primary-row {
            border-bottom: none !important;
          }
        }
      `}</style>
        </div>
    );
};

export default RecipeList;