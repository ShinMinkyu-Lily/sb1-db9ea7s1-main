// src/firebase.ts
// v9 모듈형이 아니라, v9 compat 빌드를 가져옵니다.
import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import "firebase/compat/auth";
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

// 초기화
const app = firebase.initializeApp(firebaseConfig);
export const auth = app.auth();
export const db   = app.firestore();
export const analytics = firebase.analytics();
