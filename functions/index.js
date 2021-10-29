const functions = require('firebase-functions');
const moment = require('moment');
const dayjs = require('dayjs')

// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions
//
// exports.helloWorld = functions.https.onRequest((request, response) => {
//  response.send("Hello from Firebase!");
// });

const admin = require("firebase-admin");

const serviceAccount = require("./privateKey.json");

const bodyParser = require('body-parser');

const webPush = require('web-push');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://notel-765b1.firebaseio.com"
});

const createNotifications = ((notification, documentId) => {
    const db = admin.firestore(); 
    return db.collection('hotels').doc(documentId).collection('notifications')
    .add(notification)
    .then(doc => console.log('nouvelle notitfication'))
})

const deleteGuest = (guestId) => {
    const db = admin.firestore(); 
    return db.collection('guestUsers')
    .doc(guestId)
    .update({
      checkoutDate: "",
      hotelId: "",
      hotelName: "",
      hotelDept: "",
      hotelRegion: "",
      room: "",
      phone: "",
      city: "",
      classement: "",
      babyBed: false,
      blanket: false,
      hairDryer: false,
      iron: false,
      pillow: false,
      toiletPaper: false,
      towel: false,
      soap: false
    })
   }

exports.sendCheckoutMail = functions.firestore
.document('guestUsers/{guestId}')
.onUpdate((change) => {
    const previousData = change.before.data()
    const newData = change.after.data()
    const hotelName = previousData.hotelName
    const logo = previousData.logo
    const checkoutDate = newData.checkoutDate
    const email = previousData.email

    if(checkoutDate === "") {
      return admin.firestore().collection("mail")
      .add({
          from: `${hotelName} <contact@mysweethotel.com>`,
          to: [email],
          template: {
              name: "checkOut",
              data: {
                logo: logo,
                hotelName: hotelName
              }
          }
      })
     }

})

   const deleteListGuest = () => {
    const db = admin.firestore(); 
      return db.collection('guestUsers')
        .where("checkoutDate", "==", dayjs().format('DD/MM/YYYY'))
        .get()
        .then((querySnapshot) => {
         const snapInfo = []
         querySnapshot.forEach((doc) => {          
             snapInfo.push({
                 id: doc.id,
                 ...doc.data()
               })        
             });
             return snapInfo.map(guest => {
               return deleteGuest(guest.id)
             })
           });
   }

exports.scheduledDeleteUser = functions.pubsub.schedule('0 14 * * *')
   .timeZone('Europe/Berlin')
   .onRun((context) => {
      return deleteListGuest()
 });

exports.sendNotification = functions.https.onCall((data, context) => {
  const icon = data.icon
  const token = data.token
  const body = data.body

  const message = {
    notification: {
      title: "Chat Reception",
      body: body,
      imageUrl: icon
    },
    token: token
  }

  return admin.messaging().send(message)
})

exports.sendCheckinMail = functions.https.onCall((data, context) => {
  const hotelName= data.hotelName
  const emails = data.emails
  const appLink = data.appLink
  const logo = data.logo

  return admin.firestore().collection("mail")
    .add({
        from: `${hotelName} <contact@mysweethotel.com>`,
        to: emails,
        template: {
            name: "checkIn",
            data: {
              appLink: appLink,
              logo: logo,
              hotelName: hotelName
            }
        }
    })
})

exports.sendPushNotification = functions.https.onCall(async(data, context) => {

  const pushSubscription = data.payload.token
  const icon = data.payload.logo
  const language = data.payload.language
  const title = data.payload.hotelName
  const hotelId = data.payload.hotelId
  const guestStatus = data.payload.isChatting

  const vapidPublicKey = "BMSSazlbQtYWLKQKC-vr8gQcaX1piG2geiTDGBJXzQT_wW6dGdHbwnGReCH-6r_HcWVNE4vvBZG7VF059Hre-Bk"

  const vapidPrivateKey = "Pz_eIme7ErLghd0i14HoV9xtPPM-05iEEkQuGTmy7ns"

  let body

    switch (language) {
      case 'fr':
        body = "Vous avez un nouveau message !"
      break;
      case 'en':
        body = "You have a new message !"
      break;
      case 'de':
        body = "Du hast eine neue Nachricht !"
      break;
      case 'it':
        body = "Hai un nuovo messaggio!"
      break;
      case 'pt':
        body = "Você tem uma nova mensagem !"
      break;
      case 'es':
        body = "Tienes un nuevo mensaje !"
      break;
      default:
      break;
    }
  
  const message = {
    title: title,
    body: body,
    icon: icon,
    hotelId: hotelId,
    guestStatus: guestStatus
  };

const payload = JSON.stringify(message)

const options = {
  gcmAPIKey: "AAAArcsD5Yk:APA91bFbvLMKJOajrLQQCwJG92E4M5hjciSmTtX7RCIqAiCTnOTaj43ODkq425tc6ECexVFLVcI38f8Mx82RZ0rqAqXokA465E3L_MLLbdHtZt3RZYa1Yw4Lg6FuLi2Hvz2Ee5trybnD",
  vapidDetails: {
    subject: 'mailto:david.simba1985@gmail.com',
    publicKey: vapidPublicKey,
    privateKey: vapidPrivateKey
  },
  TTL: 60,
}

await webPush.sendNotification(
    pushSubscription,
    payload,
    options
  );
})


 
exports.createUser = functions.https.onCall((data, context) => {
    const email = data.email
    const password = data.password
    const username = data.username
    const uid = data.uid
    return admin.auth().createUser({
        email: email,
        password: password,
        displayName: username,
        uid: uid
      })
})

exports.checkUserExists = functions.https.onCall((data, context) => {
    const email = data.email
    return admin.auth().getUserByEmail(email).then((userRecord) => {
        return userRecord.toJSON()
      })
      .catch((error) => {
        console.log('Error fetching user data:', error);
      });
})

exports.deleteUser = functions.https.onCall((data, context) => {
    const uid = data.uid
    return admin.auth().deleteUser(uid)
})

const updateRooms = ((documentId) => {
    const db = admin.firestore();
    const roomAvailable = db.collection("hotels").doc(documentId)
    .get()
    .then((doc) => {
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


