// import { useEffect, useState } from "react";
// import { auth, provider } from "./firebase";
// import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
// import { doc, getDoc, setDoc } from "firebase/firestore";
// import { db } from "./firebase";
// import TodoForm from "./TodoForm";
// import TodoList from "./TodoList";

// function App() {
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true); // 초기 로딩 체크
//   const [refresh, setRefresh] = useState(false);
//   useEffect(() => {
//     // 로그인 상태 감지
//     const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
//       setUser(currentUser);
//       setLoading(false);
//     });
//     return () => unsubscribe(); // cleanup
//   }, []);

//   const handleLogin = async () => {
//     try {
//       const result = await signInWithPopup(auth, provider);
//       const user = result.user;
//       // 🔥 Firestore에 사용자 정보 저장 (이미 있으면 생략)
//       const userRef = doc(db, "users", user.uid);
//       const docSnap = await getDoc(userRef);

//       if (!docSnap.exists()) {
//         await setDoc(userRef, {
//           uid: user.uid,
//           name: user.displayName,
//           email: user.email,
//           photoURL: user.photoURL,
//           createdAt: new Date(),
//         });
//         console.log("Firestore에 사용자 정보 저장 완료");
//       } else {
//         console.log("이미 사용자 정보가 존재함");
//       }
//     } catch (err) {
//       console.error("로그인 실패:", err);
//     }
//   };

//   const handleLogout = async () => {
//     await signOut(auth);
//   };

//   if (loading) return <div>로딩 중...</div>;

//   return (
//     <div style={{ padding: 20 }}>
//         {user ? (
//           <>
//           <TodoForm onTodoAdded={() => setRefresh((r) => !r)} />
//           <TodoList refresh={refresh} />
//           <button onClick={handleLogout}>로그아웃</button>
//         </>
//       ) : (
//         <>
//           <button onClick={handleLogin}>Google 로그인</button>
//         </>
//       )}
//     </div>
//   );
// }

// export default App;

// import { useEffect, useState } from "react";
// import { auth } from "./services/firebase";
// import { onAuthStateChanged } from "firebase/auth";
import AppRouter from "./routes/AppRouter";
import { useAuth } from "./hooks/useAuth";

function App() {
  const { user, loading } = useAuth();

  if (loading) return <div>로딩 중...</div>;

  return (
    <div className="app">
      <AppRouter />
    </div>
  );
}

export default App;