const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.createChatChannelsAfterUserCreation = functions.database
    .ref("users/{userId}")
    .onCreate((snapshot, context) => {
      const newUserRef = admin
          .database()
          .ref(`/users/${context.params.userId}/channels`);
      const usersRef = admin.database().ref(`/users`);

      const newUserDisplayName = snapshot.val().displayName;
      const newUserId = context.params.userId;

      console.log(
          "Creating chat channels for user",
          newUserDisplayName,
          newUserId,
      );

      return usersRef.once("value").then((snapshot) => {
        const promises = [];
        snapshot.forEach((childSnapshot) => {
          const uid = childSnapshot.key;
          const displayName = childSnapshot.val().displayName;
          console.log("Found user", uid, displayName);

          // User cant create a channel with themselves
          if (uid === context.params.userId) return null;

          const channelData = {
            createdAt: admin.database.ServerValue.TIMESTAMP,
            users: {
              [newUserId]: newUserDisplayName,
              [uid]: displayName,
            },
          };

          console.log("Creating chat channel", channelData);

          // Create a new channel for each existing user and the new user
          const newChannelRef = admin.database().ref("/channels").push();
          const channelKey = newChannelRef.key;

          promises.push(newChannelRef.set(channelData));
          promises.push(newUserRef.child(channelKey).set(true));
          promises.push(
              childSnapshot.ref.child("channels").child(channelKey).set(true),
          );
        });
        // Wait for all promises to resolve
        return Promise.all(promises);
      });
    });
