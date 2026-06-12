import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBjXONUBgiJ9iys--Rk_pJwKtWu3EnTn9o",
    authDomain: "dark-cat-d4c19.firebaseapp.com",
    projectId: "dark-cat-d4c19",
    storageBucket: "dark-cat-d4c19.firebasestorage.app",
    messagingSenderId: "417221227867",
    appId: "1:417221227867:web:6b75faa273314c9a5ed67e"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 🔍 ดึงรหัสกลุ่มจาก URL (เช่น group-chat.html?id=12345)
const urlParams = new URLSearchParams(window.location.search);
const groupId = urlParams.get('id');

const msgInput = document.getElementById('msg-input');
const sendBtn = document.getElementById('send-btn');
const messagesArea = document.getElementById('messages-area');
const groupTitle = document.getElementById('group-title');
const groupMembersCount = document.getElementById('group-members-count');

let currentUser = null;
let myProfilePic = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
let myName = "ผู้ใช้งาน";

if (!groupId) {
    alert("ไม่พบรหัสกลุ่ม!");
    window.location.href = "groups.html";
}

onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUser = user;
        
        // 1. โหลดข้อมูลตัวเองเพื่อเอาชื่อกับรูปไปแปะตอนส่งแชท
        try {
            const myDoc = await getDoc(doc(db, "users", user.uid));
            if(myDoc.exists()) {
                myName = myDoc.data().name || user.email.split('@')[0];
                if(myDoc.data().profilePic) myProfilePic = myDoc.data().profilePic;
            }
        } catch(e){}

        // 2. โหลดชื่อกลุ่มมาแสดงบนหัวเว็บ
        try {
            const groupDoc = await getDoc(doc(db, "groups", groupId));
            if(groupDoc.exists()) {
                groupTitle.textContent = groupDoc.data().name;
                // เดาจำนวนสมาชิกแบบง่ายๆ (ถ้าคุณเดฟมี array members ก็ใช้ members.length ได้ครับ)
                groupMembersCount.textContent = `แชทกลุ่มรวม`; 
            } else {
                groupTitle.textContent = "กลุ่มปริศนา 🐱";
            }
        } catch(e){}

        // 3. เริ่มจับสัญญาณดึงข้อความแบบ Real-time
        loadGroupMessages();
    } else {
        window.location.href = "index.html";
    }
});

// ==========================================
// 📡 ดึงข้อความแชท
// ==========================================
function loadGroupMessages() {
    // เข้าไปที่โฟลเดอร์กลุ่ม -> โฟลเดอร์ย่อย messages
    const q = query(collection(db, "groups", groupId, "messages"), orderBy("createdAt", "asc"));
    
    onSnapshot(q, (snapshot) => {
        messagesArea.innerHTML = ''; // ล้างจอรอวาดใหม่
        
        if (snapshot.empty) {
            messagesArea.innerHTML = '<div style="text-align: center; color: #555; margin-top: auto; margin-bottom: auto;">พิมพ์ทักทายเพื่อนๆ เป็นคนแรกเลย! 👋</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const isMe = msg.senderId === currentUser.uid;
            
            const msgDiv = document.createElement('div');
            msgDiv.className = `msg-wrapper ${isMe ? 'me' : ''}`;
            msgDiv.innerHTML = `
                <img src="${msg.senderPic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" class="msg-avatar">
                <div>
                    <div class="sender-name">${msg.senderName}</div>
                    <div class="msg-bubble">${msg.text}</div>
                </div>
            `;
            messagesArea.appendChild(msgDiv);
        });

        // เลื่อนจอลงล่างสุดอัตโนมัติ
        messagesArea.scrollTop = messagesArea.scrollHeight;
    });
}

// ==========================================
// 🚀 ส่งข้อความ
// ==========================================
async function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || !currentUser) return;

    msgInput.value = ''; // ล้างช่องพิมพ์ทันทีให้ดูไว
    msgInput.focus();

    try {
        await addDoc(collection(db, "groups", groupId, "messages"), {
            senderId: currentUser.uid,
            senderName: myName,
            senderPic: myProfilePic,
            text: text,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error("ส่งข้อความไม่สำเร็จ:", error);
    }
}

// กดปุ่มส่ง หรือกดปุ่ม Enter ในคีย์บอร์ดก็ส่งได้
sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});