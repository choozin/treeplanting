import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only if not already initialized
if (!getApps().length) {
    // IMPORTANT: Replace with your Firebase service account key
    // You should store this securely, e.g., in an environment variable
    // For Vercel, you can add it as an environment variable (e.g., FIREBASE_SERVICE_ACCOUNT)
    // and parse it as JSON.
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}');

    initializeApp({
        credential: cert(serviceAccount),
    });
}

export async function POST(request) {
    try {
        const { uid } = await request.json();

        if (!uid) {
            return NextResponse.json({ message: 'UID is required' }, { status: 400 });
        }

        await getAuth().deleteUser(uid);
        return NextResponse.json({ message: `User ${uid} deleted successfully from Firebase Auth` });

    } catch (error) {
        console.error('Error deleting user from Firebase Auth:', error);
        if (error.code === 'auth/user-not-found') {
            return NextResponse.json({ message: 'User not found in Firebase Auth' }, { status: 404 });
        } else {
            return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
        }
    }
}