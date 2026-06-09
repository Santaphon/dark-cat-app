import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjXONUBgiJ9iys--Rk_pJwKtWu3EnTn9o",
  authDomain: "dark-cat-d4c19.firebaseapp.com",
  projectId: "dark-cat-d4c19",
  storageBucket: "dark-cat-d4c19.firebasestorage.app",
  messagingSenderId: "417221227867",
  appId: "1:417221227867:web:6b75faa273314c9a5ed67e",
  measurementId: "G-65CLM2SJ46"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserUid = null;
let currentUserName = "ผู้ใช้ไร้นาม";
let currentUserPic = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";

// กลับหน้าโปรไฟล์
document.getElementById('back-btn').addEventListener('click', () => {
    window.location.href = "dashboard.html";
});

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        
        // ดึงข้อมูลตัวเองมาเตรียมไว้สำหรับส่งแชท
        const docSnap = await getDoc(doc(db, "users", currentUserUid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) currentUserName = data.name;
            if (data.profilePic) currentUserPic = data.profilePic;
        }

        // ปิดหน้าจอโหลด
        const loader = document.getElementById('loading-screen');
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);

        // ระบบดึงข้อความแชท (โค้ดเดิมของคุณเลยครับ)
        const chatQuery = query(collection(db, "chats"), orderBy("createdAt", "asc"));
        onSnapshot(chatQuery, (snapshot) => {
            const chatBox = document.getElementById('chat-box');
            chatBox.innerHTML = ""; 

            snapshot.forEach((chatDoc) => {
                const chatData = chatDoc.data();
                const isMe = chatData.senderUid === currentUserUid;
                
                const messageElement = document.createElement('div');
                messageElement.style.display = 'flex';
                messageElement.style.alignItems = 'flex-start';
                messageElement.style.gap = '10px';
                messageElement.style.justifyContent = isMe ? 'flex-end' : 'flex-start';
                messageElement.style.width = '100%';

                messageElement.innerHTML = `
                    ${!isMe ? `<img src="${chatData.senderPic}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #ec4899;">` : ''}
                    <div style="background: ${isMe ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(255,255,255,0.1)'}; padding: 8px 14px; border-radius: 12px; max-width: 70%; text-align: left; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        ${!isMe ? `<p style="font-size: 0.7rem; color: #ec4899; font-weight: 600; margin-bottom: 2px;">${chatData.senderName}</p>` : ''}
                        <p style="color: #fff; font-size: 0.85rem; word-break: break-word;">${chatData.text}</p>
                    </div>
                `;
                chatBox.appendChild(messageElement);
            });
            chatBox.scrollTop = chatBox.scrollHeight;
        });
    } else {
        window.location.href = "index.html";
    }
});

// ฟังก์ชันส่งข้อความ
const sendMessage = async () => {
    const chatInput = document.getElementById('chat-input');
    const messageText = chatInput.value.trim();
    if (messageText === "" || !currentUserUid) return;

    try {
        await addDoc(collection(db, "chats"), {
            text: messageText,
            senderUid: currentUserUid,
            senderName: currentUserName,
            senderPic: currentUserPic,
            createdAt: serverTimestamp()
        });
        chatInput.value = ""; 
    } catch (error) {
        console.error("ส่งข้อความไม่สำเร็จ: ", error);
    }
};

document.getElementById('send-chat-btn').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});