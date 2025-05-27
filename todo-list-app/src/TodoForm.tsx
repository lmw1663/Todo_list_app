import { useState } from "react";
import { db } from "./services/firebase";
import {collection, addDoc, serverTimestamp} from "firebase/firestore";
import {auth} from "./services/firebase";

export default function TodoForm({onTodoAdded}: {onTodoAdded: () => void}){
    const [title, setTitle] = useState("");
    const [content, setContent] = useState("");

    const handleSubmit = async(e: React.FormEvent) =>{
        e.preventDefault();
        const user = auth.currentUser;
        if(!user) return alert("로그인이 필요합니다.");
        
        const todosRef = collection(db, "users", user.uid, "todos");
        await addDoc(todosRef,{
            title,
            content,
            createdAt: serverTimestamp(),
        });
        setTitle("");
        setContent("");
        onTodoAdded(); //목록 새로고침 트리거
    }

    return(
        <form onSubmit={handleSubmit}>
            <input
                placeholder="제목"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
            />
            <br/>
            <textarea
                placeholder="내용"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                required
            />
            <br/>
            <button type="submit">추가</button>
        </form>
    )
}
