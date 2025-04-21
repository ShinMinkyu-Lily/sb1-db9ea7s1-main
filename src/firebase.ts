// src/firebase.ts

// 1) Firebase core
import { initializeApp }    from "firebase/app";
// 2) Firestore 모듈
import { getFirestore }     from "firebase/firestore";
// (선택) Analytics가 필요하면
import { getAnalytics }     from "firebase/analytics";

const firebaseConfig = {
  apiKey:            "AIzaSyBjCzuynx9F-Xl9-5Gr1rNMaVV3XVdwFOw",
  authDomain:        "green-factory-7a20f.firebaseapp.com",
  projectId:         "green-factory-7a20f",
  storageBucket:     "green-factory-7a20f.appspot.com",
  messagingSenderId: "603064596166",
  appId:             "1:603064596166:web:87952e1fb86d779b7409c7",
  measurementId:     "G-00784W2H9R"
};

// Firebase 앱 초기화
const app = initializeApp(firebaseConfig);

// 3) Firestore 인스턴스 생성 후 export
export const db = getFirestore(app);

// (선택) Analytics export
export const analytics = getAnalytics(app);
