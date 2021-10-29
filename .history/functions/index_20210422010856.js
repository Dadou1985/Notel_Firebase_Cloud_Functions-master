const functions = require('firebase-functions');
const admin = require('firebase-admin');

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });
admin.initializeApp()

const createNotifications = ((notification, documentId) => {
    const db = admin.firestore(); 
    return db.collection('hotels').doc(documentId).collection('notifications')
    .add(notification)
    .then(doc => console.log('nouvelle notitfication'))
})

exports.createUser = functions.https.onCall((data, context) => {
    const email = data.email
    const password = data.password
    const username = data.username
    return admin.auth().createUser({
        email: email,
        password: password,
        displayName: username
      })
})

exports.checkUserExists = functions.https

const deleteUser = (userId => {
    const auth = admin.auth();
    return auth.deleteUser(userId);
})

const updateRooms = ((documentId) => {
    const db = admin.firestore();
    const roomAvailable = db.collection("hotels").doc(documentId)
    .get()
    .then(function(doc) {
        const hotelDetails = doc.data()
        const roomStatus = hotelDetails.roomAvailable
        const updateRoomStatus = roomStatus - 1
        return updateRoomStatus
    })
    return roomAvailable 
})

const updateMood = ((mood, userId) => {
    const db = admin.firestore()
    return db.collection("IziLife")
    .doc("FunSpace")
    .collection("communIzi")
    .where("userId", "==", userId)
    .doc()
    .update({
        mood: mood
    })
})

exports.notificationOnCreateUser = functions.auth.user().onCreate((user) => {
    const notif = "Votre inscription a été validé avec succès, " + user.username + " ! Vous pouvez vous connecter à l'application."
    return createNotifications(notif, user.displayName)
});


exports.listenOverbooking = functions.firestore
.document('hotels/{hotelId}/overbooking/{tables}/overbookIn/{Id}')
.onCreate((doc, context) => {
 const overIn = doc.data()
 const hotelRef = context.params.hotelId
 const notification = {
    content: "Vous avez reçu une nouvelle demande d'accueil.",
    markup: Date.now()
 }

 return createNotifications(notification, hotelRef)
})

exports.listenOverbooking2 = functions.firestore
.document('hotels/{hotelId}/overbooking/{tables}/overbookOut/{Id}')
.onUpdate((change, context) => {
    const overOut = change.after.data()
    const status = overOut.status
    const hotel = overOut.hotelName
    const client = overOut.client
    const refHotel = overOut.refHotel
    if(status === "granted") {
        const notificationGranted = {
            content: "Votre demande de délogement vers l'hôtel " + hotel + " pour le compte de " + client + " a été acceptée.",
            markup: Date.now()}
        return createNotifications(notificationGranted, refHotel)
     }else if(status === "refused") {
        const notificationRejected = {
            content: "Votre demande de délogement vers l'hôtel " + hotel + " pour le compte de " + client + " a été refusée.",
            markup: Date.now()}
            return createNotifications(notificationRejected, refHotel)
     }else{
         console.log("Erreur fonctions notifications")
     }

})

exports.roomUpdate = functions.firestore
.document('hotels/{hotelId}/overbooking/{tables}/overbookIn/{Id}')
.onUpdate((change, context) => {
    const overIn = change.after.data()
    const status = overIn.status
    const refHotel = context.params.hotelId
    if(status === "granted") {
        return updateRooms(refHotel)
     }else{
         console.log("No changes")
     }

})

exports.updateUserMood = functions.firestore
    .document('iziUsers/{userID}')
    .onUpdate((change, context) => { 
      // Get an object with the previous document value (for update or delete)
      const nextUserDetails = change.after.data();
      const newMood = nextUserDetails.mood
      const userId = nextUserDetails.userId
        return updateMood(newMood, userId)
      // perform desired operations ...
    });

exports.userDelete = functions.firestore
.document('hotels/{hotelId}/Users/{userId}')
.onDelete((snap, contex) => {
    const deletedValue = snap.data();
    const userId = deletedValue.userId

    return deleteUser(userId);
})

exports.createIziUser = functions.firestore
.document('hotels/{hotelId}/users/{Id}')
.onCreate((snap, context) => {
    const userData = snap.data()
    const name = userData.id
    const userId = userData.userId
    const refHotel = userData.refHotel
    const db = admin.firestore()

    return db.collection("iziUsers")
    .doc(name)
    .set({
        userId: userId,
        refHotel: refHotel,
        isConnected: true,
        job: null,
        hotelName: null,
        mood: null,
        favoriteMovie: null
    })
})


