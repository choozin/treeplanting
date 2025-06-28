const { onValueCreated } = require("firebase-functions/v2/database");
const { logger } = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.notifyOnNewClassifiedsPost = onValueCreated("/camps/{campId}/classifieds/{postId}", async (event) => {
    const post = event.data.val();
    const { campId, postId } = event.params;

    logger.log(`New post created: ${postId} in camp: ${campId}`);

    try {
        // Get all users who have notifications enabled for classifieds
        const usersSnapshot = await admin.database().ref('/users')
            .orderByChild('notificationPreferences/classifieds/enabled')
            .equalTo(true)
            .once('value');
            
        if (!usersSnapshot.exists()) {
            logger.log("No users with classifieds notifications enabled.");
            return null;
        }

        const users = usersSnapshot.val();
        const notificationPromises = [];

        for (const userId in users) {
            const user = users[userId];

            // Make sure user has preferences and subscriptions defined
            if (!user.notificationPreferences?.classifieds || !user.pushSubscriptions) {
                continue;
            }

            const prefs = user.notificationPreferences.classifieds;
            
            // Check if the post matches user's preferences
            const typeMatch = prefs.types?.includes(post.postType) ?? false;
            const categoryMatch = prefs.categories?.includes(post.category) ?? false;

            let keywordMatch = true; // Default to true if no keyword is set
            if (prefs.keyword && prefs.keyword.trim() !== '') {
                const keyword = prefs.keyword.toLowerCase();
                const title = (post.title || '').toLowerCase();
                const description = (post.description || '').toLowerCase();
                keywordMatch = title.includes(keyword) || description.includes(keyword);
            }
            
            // TODO: Add robust scope matching logic if Company/Regional scopes are implemented
            const scopeMatch = true; 

            logger.log(`Checking user ${userId}: typeMatch=${typeMatch}, categoryMatch=${categoryMatch}, keywordMatch=${keywordMatch}`);

            if (typeMatch && categoryMatch && keywordMatch && scopeMatch) {
                const payload = {
                    notification: {
                        title: `New Post: ${post.title}`,
                        body: post.description.substring(0, 100) + (post.description.length > 100 ? '...' : ''),
                        icon: '/icons/icon-192x192.png',
                    },
                    webpush: {
                        fcmOptions: {
                            link: `/classifieds`
                        }
                    }
                };
                
                const subscriptions = Object.values(user.pushSubscriptions);

                // Note: The original code used sendToDevice, which is for legacy FCM tokens.
                // For modern PWA push subscriptions, you send to the subscription endpoint.
                // However, without the full VAPID key setup, sending to a registration token is more direct.
                // We will assume for now that a registration token is stored.
                // A full implementation would require more frontend logic to get this token.
                
                subscriptions.forEach(sub => {
                    if (sub.fcm_token) { // Assuming a token is stored during subscription
                       notificationPromises.push(admin.messaging().sendToDevice(sub.fcm_token, payload));
                    }
                });
            }
        }

        if (notificationPromises.length > 0) {
            logger.log(`Sending ${notificationPromises.length} notifications.`);
            return Promise.all(notificationPromises);
        } else {
            logger.log("No users matched the criteria for this post.");
            return null;
        }

    } catch (error) {
        logger.error('Error sending notifications:', error);
        return null;
    }
});