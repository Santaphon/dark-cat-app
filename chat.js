// ==========================================
// 1. นำเข้า Firebase และตั้งค่า (Import & Config)
// ==========================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, query, orderBy, onSnapshot, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔴🔴🔴 ก๊อปปี้ firebaseConfig ของคุณมาทับตรงนี้ให้ครบถ้วนนะครับ! 🔴🔴🔴
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
let currentChatPartnerId = null; 
let unsubscribeChat = null; // ตัวแปรสำหรับหยุดดึงข้อความเวลาสลับคนคุย

// ฟังก์ชันสร้าง "รหัสห้องแชทลับ" ระหว่างคน 2 คน
function getChatId(uid1, uid2) {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

// ==========================================
// 2. เช็กสถานะล็อกอิน
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUserUid = user.uid;
        loadChatFriends(); 
    } else {
        window.location.href = "index.html"; 
    }
});

// ==========================================
// 3. ระบบดึงรายชื่อเพื่อน (ฝั่งซ้าย)
// ==========================================
async function loadChatFriends() {
    const friendsListContainer = document.getElementById('chat-friends-list');
    if (!friendsListContainer) return;

    try {
        const friendsRef = collection(db, "users", currentUserUid, "friends");
        const snapshot = await getDocs(friendsRef);

        friendsListContainer.innerHTML = ''; 

        if (snapshot.empty) {
            friendsListContainer.innerHTML = '<div style="text-align: center; color: #a8a8a8; margin-top: 20px;">ยังไม่มีเพื่อนเลย ลองไปเพิ่มเพื่อนที่หน้าหลักนะ 🔍</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const friend = docSnap.data();
            const friendId = docSnap.id;

            const friendEl = document.createElement('div');
            friendEl.style.cssText = "display: flex; align-items: center; gap: 15px; padding: 15px; cursor: pointer; border-radius: 10px; transition: background 0.2s; border-bottom: 1px solid #1a1a1a;";
            
            friendEl.innerHTML = `
                <img src="${friend.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                <div>
                    <strong style="display: block; font-size: 0.95rem; color: #f5f5f5;">${friend.name}</strong>
                    <span style="font-size: 0.75rem; color: #a8a8a8;">แตะเพื่อเริ่มแชท</span>
                </div>
            `;

            friendEl.addEventListener('mouseover', () => friendEl.style.background = '#1a1a1a');
            friendEl.addEventListener('mouseout', () => friendEl.style.background = 'transparent');

            // เมื่อคลิกชื่อเพื่อน เปิดห้องแชท
            friendEl.addEventListener('click', () => {
                openChatRoom(friendId, friend.name, friend.profilePic);
            });

            friendsListContainer.appendChild(friendEl);
        });
    } catch (error) {
        console.error("โหลดเพื่อนพัง:", error);
    }
}

// ==========================================
// 4. ระบบเปิดห้องสนทนา และดึงข้อความ (Real-time)
// ==========================================
function openChatRoom(friendId, friendName, friendPic) {
    currentChatPartnerId = friendId;

    document.getElementById('chat-header').style.display = 'flex';
    document.getElementById('chat-input-area').style.display = 'block';
    
    const placeholder = document.getElementById('chat-placeholder');
    if (placeholder) placeholder.style.display = 'none';

    document.getElementById('chat-partner-name').textContent = friendName;
    document.getElementById('chat-partner-img').src = friendPic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';

    const messagesContainer = document.getElementById('chat-messages');
    messagesContainer.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">กำลังโหลดข้อความ... 💬</div>';

    // สร้างรหัสห้องแชท
    const chatId = getChatId(currentUserUid, friendId);
    const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    // ถ้าเคยดึงข้อความของคนอื่นอยู่ ให้หยุดดึงก่อน (ป้องกันข้อความตีกัน)
    if (unsubscribeChat) {
        unsubscribeChat();
    }

    // 🌟 พระเอกของเรา: onSnapshot ดึงข้อมูลแบบ Real-time
    unsubscribeChat = onSnapshot(q, (snapshot) => {
        messagesContainer.innerHTML = ''; 

        if (snapshot.empty) {
            messagesContainer.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ทักทายเพื่อนของคุณเลย! 👋</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const msg = docSnap.data();
            const isMe = msg.senderId === currentUserUid; // เช็กว่าเราเป็นคนพิมพ์เองไหม

            const msgDiv = document.createElement('div');
            // แต่งสีกล่องข้อความ: ของเราสีชมพูอยู่ขวา ของเพื่อนสีเทาอยู่ซ้าย
            msgDiv.style.cssText = `
                max-width: 65%;
                padding: 10px 15px;
                border-radius: 20px;
                margin-bottom: 5px;
                word-wrap: break-word;
                font-size: 0.95rem;
                ${isMe ? 
                    'align-self: flex-end; background: #ec4899; color: white; border-bottom-right-radius: 5px;' : 
                    'align-self: flex-start; background: #262626; color: #f5f5f5; border-bottom-left-radius: 5px;'
                }
            `;
            msgDiv.textContent = msg.text;
            messagesContainer.appendChild(msgDiv);
        });

        // เลื่อนหน้าจอลงไปล่างสุดอัตโนมัติเมื่อมีข้อความใหม่
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    });
}

// ==========================================
// 5. ระบบส่งข้อความ 🚀
// ==========================================
const sendBtn = document.getElementById('send-msg-btn');
const chatInput = document.getElementById('chat-input');

async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || !currentChatPartnerId) return; // ถ้าไม่ได้พิมพ์อะไรก็ไม่ต้องส่ง

    chatInput.value = ''; // ล้างช่องพิมพ์ทันทีให้ดูไว

    const chatId = getChatId(currentUserUid, currentChatPartnerId);
    const messagesRef = collection(db, "chats", chatId, "messages");

    try {
        await addDoc(messagesRef, {
            senderId: currentUserUid,
            text: text,
            timestamp: serverTimestamp() // ใช้เวลาของเซิร์ฟเวอร์
        });
    } catch (error) {
        console.error("ส่งข้อความพัง:", error);
        alert("ส่งข้อความไม่สำเร็จครับ");
    }
}

// กดปุ่มส่ง
if (sendBtn) {
    sendBtn.addEventListener('click', sendMessage);
}

// กดปุ่ม Enter บนคีย์บอร์ดเพื่อส่งได้ด้วย
if (chatInput) {
    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendMessage();
    });
}

// ==========================================
// 6. ระบบออกจากระบบ
// ==========================================
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        });
    });
}