import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
const firebaseConfig = {
    apiKey: "AIzaSyChcGZonMju-2r9g-YY7K_Tc_omzsLQkA0",
    authDomain: "todolistapp-e3641.firebaseapp.com",
    projectId: "todolistapp-e3641",
    storageBucket: "todolistapp-e3641.firebasestorage.app",
    messagingSenderId: "168244221281",
    appId: "1:168244221281:web:83cd8d26fe9d80b624e120",
    measurementId: "G-YX73GEWY69"
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app); // ✅ Firestore 인스턴스

export { auth, provider, db };