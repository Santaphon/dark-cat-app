import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

// ==========================================
// 📌 ตัวแปรควบคุมหน้าจอแชท
// ==========================================
let currentUser = null;
let currentChatPartnerId = null; // กำลังคุยกับใครอยู่
let currentChatId = null;        // รหัสห้องแชท
let unsubscribeMessages = null;  // ตัวยกเลิกเรดาร์ดักจับข้อความ (กันบั๊กข้อความเด้งซ้ำ)

const savedThemeColor = localStorage.getItem('themeColor') || '#ec4899';

// ตัวแปรเชื่อมต่อ UI
const friendsListContainer = document.getElementById('chat-friends-list');
const messagesContainer = document.getElementById('chat-messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-msg-btn');
const activeChatName = document.getElementById('active-chat-name');
const activeChatAvatar = document.getElementById('active-chat-avatar');
const activeChatStatus = document.getElementById('active-chat-status');

// ==========================================
// 👤 1. ตรวจสอบผู้ใช้และโหลดรายชื่อเพื่อน
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        loadFriends();
    } else {
        window.location.href = "index.html";
    }
});

async function loadFriends() {
    friendsListContainer.innerHTML = '<p style="color: #a8a8a8; font-size: 0.85rem; text-align: center;">กำลังโหลดเพื่อน...</p>';
    try {
        // ดึงเพื่อนจาก subcollection "friends" ของเรา
        const friendsRef = collection(db, "users", currentUser.uid, "friends");
        const snapshot = await getDocs(friendsRef);

        friendsListContainer.innerHTML = '';

        if (snapshot.empty) {
            friendsListContainer.innerHTML = '<p style="color: #a8a8a8; font-size: 0.85rem; text-align: center;">คุณยังไม่มีเพื่อนเลย ลองไปเพิ่มเพื่อนในหน้าหลักนะ 😿</p>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const friend = docSnap.data();
            const friendId = docSnap.id;

            // สร้างปุ่มเพื่อนด้านขวา
            const friendItem = document.createElement('div');
            friendItem.className = 'friend-chat-item';
            friendItem.innerHTML = `
                <img src="${friend.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 40px; height: 40px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                <div style="flex: 1; min-width: 0;">
                    <strong style="color: white; font-size: 0.9rem; display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${friend.name}</strong>
                    <span style="color: #a8a8a8; font-size: 0.75rem;">แตะเพื่อเริ่มแชท</span>
                </div>
            `;

            // เมื่อกดเลือกเพื่อนคนนี้
            friendItem.addEventListener('click', () => {
                // ลบไฮไลท์คนเก่า ไฮไลท์คนใหม่
                document.querySelectorAll('.friend-chat-item').forEach(el => el.classList.remove('active'));
                friendItem.classList.add('active');

                // เปลี่ยนข้อมูลด้านบน (Header)
                activeChatName.innerText = friend.name;
                activeChatAvatar.src = friend.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';
                activeChatStatus.innerText = "กำลังพิมพ์... 💬"; // ลูกเล่นขำๆ

                // เปิดห้องแชท
                openChatRoom(friendId, friend.name);
            });

            friendsListContainer.appendChild(friendItem);
        });

    } catch (error) {
        console.error("โหลดเพื่อนไม่สำเร็จ:", error);
        friendsListContainer.innerHTML = '<p style="color: #ff4d4f; font-size: 0.85rem; text-align: center;">โหลดข้อมูลล้มเหลว</p>';
    }
}

// ==========================================
// 💬 2. ระบบเปิดห้องแชทและดักจับข้อความ (Real-time)
// ==========================================
function openChatRoom(friendId, friendName) {
    currentChatPartnerId = friendId;
    
    // 🌟 เคล็ดลับวิชา: สร้างชื่อห้องแชทแบบพิเศษ! 
    // โดยเอา UID ของเรากับเพื่อนมาต่อกัน (เรียงตามตัวอักษร) เพื่อให้ทั้งสองคนเข้ามาเจอห้องเดียวกันเสมอ
    currentChatId = currentUser.uid < friendId ? `${currentUser.uid}_${friendId}` : `${friendId}_${currentUser.uid}`;

    // เปิดให้พิมพ์ข้อความได้
    messageInput.disabled = false;
    sendBtn.disabled = false;
    messageInput.focus();
    messagesContainer.innerHTML = '<p style="color: #a8a8a8; text-align: center; margin-top: auto; margin-bottom: auto;">กำลังโหลดข้อความเก่า...</p>';

    // ถ้าเคยเปิดเรดาร์ห้องอื่นไว้ ให้ปิดก่อน (จะได้ไม่โหลดข้อความมั่วซั่ว)
    if (unsubscribeMessages) {
        unsubscribeMessages();
    }

    // 📡 เปิดเรดาร์ onSnapshot ดักจับข้อความในห้องนี้
    const messagesRef = collection(db, "chats", currentChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc")); // เรียงจากเก่าไปใหม่ (บนลงล่าง)

    unsubscribeMessages = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = ''; // ล้างข้อความเก่าทิ้งก่อนวาดใหม่

        if (snapshot.empty) {
            messagesContainer.innerHTML = `
                <div style="text-align: center; color: #a8a8a8; margin-top: auto; margin-bottom: auto; font-family: 'Kanit', sans-serif;">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Cat%20with%20Wry%20Smile.png" style="width: 60px; margin-bottom: 10px;">
                    <p>ยังไม่มีข้อความ... ทักทาย ${friendName} เลย!</p>
                </div>
            `;
            return;
        }

        snapshot.forEach((doc) => {
            const msg = doc.data();
            const isMe = msg.senderId === currentUser.uid; // เช็กว่าเราส่งเองไหม
            
            // จัดฟอร์แมตเวลา
            let timeStr = "กำลังส่ง...";
            if (msg.createdAt) {
                const dateObj = msg.createdAt.toDate();
                timeStr = dateObj.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
            }

            // สร้างลูกโป่งข้อความ
            const msgEl = document.createElement('div');
            msgEl.className = `message ${isMe ? 'sent' : 'received'}`;
            // ถ้าเราส่งเอง ให้เปลี่ยนสีพื้นหลังเป็นสีธีมที่เซฟไว้
            if (isMe) msgEl.style.background = savedThemeColor;

            msgEl.innerHTML = `${msg.text} <span class="msg-time">${timeStr}</span>`;
            messagesContainer.appendChild(msgEl);
        });

        // เลื่อนหน้าจอลงไปล่างสุดอัตโนมัติเวลามีข้อความใหม่
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ==========================================
// 🚀 3. ระบบส่งข้อความ
// ==========================================
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentChatId) return;

    // เคลียร์ช่องพิมพ์ทันทีให้รู้สึกว่าลื่นไหล
    messageInput.value = '';
    messageInput.focus();

    try {
        // สร้างเอกสารห้องแชทเผื่อไว้ (ถ้ายังไม่เคยมี) เพื่อไม่ให้ Firebase งงโครงสร้าง
        await setDoc(doc(db, "chats", currentChatId), { lastUpdated: serverTimestamp() }, { merge: true });

        // ยิงข้อความเข้า subcollection "messages"
        await addDoc(collection(db, "chats", currentChatId, "messages"), {
            senderId: currentUser.uid,
            text: text,
            createdAt: serverTimestamp()
        });

    } catch (error) {
        console.error("ส่งข้อความพลาด:", error);
        alert("ส่งข้อความไม่สำเร็จครับ");
    }
}

// ผูกระบบส่งข้อความเข้ากับปุ่มกดและปุ่ม Enter
sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') sendMessage();
});