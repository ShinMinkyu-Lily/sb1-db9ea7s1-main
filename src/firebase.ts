// src/firebase.ts
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";
import "firebase/compat/analytics";

const firebaseConfig = {
  apiKey:            "AIzaSyBjCzuynx9F-Xl9-5Gr1rNMaVV3XVdwFOw",
  authDomain:        "green-factory-7a20f.firebaseapp.com",
  projectId:         "green-factory-7a20f",
  storageBucket:     "green-factory-7a20f.appspot.com",
  messagingSenderId: "603064596166",
  appId:             "1:603064596166:web:87952e1fb86d779b7409c7",
  measurementId:     "G-00784W2H9R"
};

// 초기화 (firebase 네임스페이스에 설정)
firebase.initializeApp(firebaseConfig);

// 내보내기
export const auth      = firebase.auth();
export const db        = firebase.firestore();
export const analytics = firebase.analytics();
