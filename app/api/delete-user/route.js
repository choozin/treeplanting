import { NextResponse } from 'next/server';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Initialize Firebase Admin SDK only if not already initialized
if (!getApps().length) {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountString) {
        throw new Error('The FIREBASE_SERVICE_ACCOUNT environment variable is not set. Please add it to your Vercel project settings.');
    }

    try {
        const serviceAccount = JSON.parse(serviceAccountString);
        initializeApp({
            credential: cert(serviceAccount),
        });
    } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e);
        throw new Error('Failed to parse the FIREBASE_SERVICE_ACCOUNT. Make sure it is a valid JSON string.');
    }
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