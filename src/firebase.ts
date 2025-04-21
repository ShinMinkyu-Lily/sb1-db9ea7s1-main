// src/firebase.ts

import { initializeApp } from "firebase/app";
import { getFirestore }  from "firebase/firestore";
import { getAnalytics }  from "firebase/analytics"; 

const firebaseConfig = {
  apiKey:            "AIzaSyBjCzuynx9F-Xl9-5Gr1rNMaVV3XVdwFOw",
  authDomain:        "green-factory-7a20f.firebaseapp.com",
  projectId:         "green-factory-7a20f",
  storageBucket:     "green-factory-7a20f.appspot.com",
  messagingSenderId: "603064596166",
  appId:             "1:603064596166:web:87952e1fb86d779b7409c7",
  measurementId:     "G-00784W2H9R"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
