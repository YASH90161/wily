import firebase from 'firebase'
require('@firebase/firestore')

const firebaseConfig = {
    apiKey: "AIzaSyB_7OPJucY0vDxumR1JLpQ_5ov3fOvuMtU",
    authDomain: "wily-1f134.firebaseapp.com",
    projectId: "wily-1f134",
    storageBucket: "wily-1f134.appspot.com",
    messagingSenderId: "753196283706",
    appId: "1:753196283706:web:30bff4c997541ce2ed0203"
  };
  
  // Initialize Firebase
  const app = initializeApp(firebaseConfig);

  export default firebase.firestore()