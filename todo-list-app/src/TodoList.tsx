import { useState, useEffect } from "react";
import { db,auth } from "./firebase";
import {
    collection,
    getDocs,
    deleteDoc,
    doc,
    orderBy,
    query,
}from "firebase/firestore";

interface Todo{
    id: string;
    title: string;
    content: string;
    createdAt: Date;
}
export default function TodoList({refresh}: {refresh: boolean}){
    const [todos, setTodos] = useState<Todo[]>([]);
    useEffect(() =>{
        const fetchTodos = async() =>{
            const user = auth.currentUser;
            if(!user) return;

            const todosRef = collection(db, "users", user.uid, "todos");
            const q = query(todosRef, orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map((doc) => ({
                id:doc.id,
                ...doc.data(),
            })) as Todo[];

            setTodos(list);
        };
        fetchTodos();
    },[refresh]);

    const handleDelete = async(id: string) =>{
        const user = auth.currentUser;
        if(!user) return;

        await deleteDoc(doc(db,"users",user.uid,"todos",id));
        setTodos((prev) => prev.filter((todo) => todo.id !== id));
    };

    return(
        <div>
            {todos.map((todo) => (
                <div key={todo.id} style={{border: "1px solid #ccc", margin:10,padding:10}}>
                <h4>{todo.title}</h4>
                <p>{todo.content}</p>
                <button onClick={() => handleDelete(todo.id)}>삭제</button>
                </div>
            ))}
        </div>
    );
}

