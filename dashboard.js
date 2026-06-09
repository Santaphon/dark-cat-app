// 1. นำเข้าฟังก์ชันเกี่ยวกับคอลเลกชันและการฟังข้อมูลแบบเรียลไทม์เพิ่มเติม
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// 2. กุญแจ Config ของคุณ
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

// ปิดหน้าจอโหลดเมื่อข้อมูลพร้อม
const hideLoadingScreen = () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
    }
};

// 3. โหลดข้อมูลเมื่อเข้าสู่ระบบ + เริ่มเปิดระบบฟังเสียงแชท
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        document.getElementById('user-email').textContent = user.email || user.displayName;

        // ดึงข้อมูลโปรไฟล์ตัวเองมาเก็บในตัวแปร เพื่อเอาไปใช้ตอนส่งแชท
        const docSnap = await getDoc(doc(db, "users", currentUserUid));
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.name) {
                document.getElementById('profile-name').value = data.name;
                currentUserName = data.name;
            }
            if (data.bio) document.getElementById('profile-bio').value = data.bio;
            if (data.profilePic) {
                document.getElementById('profile-img').src = data.profilePic;
                currentUserPic = data.profilePic;
            }
        }
        
        hideLoadingScreen(); 
        
        // 🔥 เริ่มเปิดหูรับฟังข้อความแชทจากคอลเลกชัน "chats" เรียงตามเวลาเก่าไปใหม่
        const chatQuery = query(collection(db, "chats"), orderBy("createdAt", "asc"));
        onSnapshot(chatQuery, (snapshot) => {
            const chatBox = document.getElementById('chat-box');
            chatBox.innerHTML = ""; // ล้างหน้าจอแชทเก่าออกก่อนเพื่อวาดใหม่

            snapshot.forEach((doc) => {
                const chatData = doc.data();
                
                // ตรวจสอบว่าเป็นข้อความของเราเองหรือของคนอื่น เพื่อจัดฝั่งซ้าย-ขวา
                const isMe = chatData.senderUid === currentUserUid;
                
                // สร้างกล่องข้อความแชท
                const messageElement = document.createElement('div');
                messageElement.style.display = 'flex';
                messageElement.style.alignItems = 'flex-start';
                messageElement.style.gap = '10px';
                messageElement.style.justifyContent = isMe ? 'flex-end' : 'flex-start';
                messageElement.style.width = '100%';

                // ดีไซน์กล่องข้อความแชท
                messageElement.innerHTML = `
                    ${!isMe ? `<img src="${chatData.senderPic}" style="width: 30px; height: 30px; border-radius: 50%; object-fit: cover; border: 1px solid #ec4899;">` : ''}
                    <div style="background: ${isMe ? 'linear-gradient(135deg, #ec4899, #8b5cf6)' : 'rgba(255,255,255,0.1)'}; padding: 8px 14px; border-radius: 12px; max-width: 70%; text-align: left; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
                        ${!isMe ? `<p style="font-size: 0.7rem; color: #ec4899; font-weight: 600; margin-bottom: 2px;">${chatData.senderName}</p>` : ''}
                        <p style="color: #fff; font-size: 0.85rem; word-break: break-word;">${chatData.text}</p>
                    </div>
                `;
                
                chatBox.appendChild(messageElement);
            });

            // เลื่อนหน้าจอลงไปล่างสุดของแชทอัตโนมัติเมื่อมีข้อความใหม่
            chatBox.scrollTop = chatBox.scrollHeight;
        });

    } else {
        window.location.href = "index.html";
    }
});

// 4. ฟังก์ชันสำหรับการส่งข้อความ
const sendMessage = async () => {
    const chatInput = document.getElementById('chat-input');
    const messageText = chatInput.value.trim();

    if (messageText === "" || !currentUserUid) return;

    try {
        // หยอดข้อความลงฐานข้อมูลกลางคอลเลกชัน "chats"
        await addDoc(collection(db, "chats"), {
            text: messageText,
            senderUid: currentUserUid,
            senderName: currentUserName,
            senderPic: currentUserPic,
            createdAt: serverTimestamp() // ใช้เวลาของเซิร์ฟเวอร์ Google ป้องกันคนโกงเวลาเครื่องคอมตัวเอง
        });

        chatInput.value = ""; // ส่งเสร็จแล้วเคลียร์ช่องพิมพ์ให้ว่าง
    } catch (error) {
        console.error("ส่งข้อความไม่สำเร็จ: ", error);
    }
};

// บันทึกการกดปุ่มส่ง หรือกดปุ่ม Enter บนคีย์บอร์ด
document.getElementById('send-chat-btn').addEventListener('click', sendMessage);
document.getElementById('chat-input').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

// 5. ระบบบันทึกโปรไฟล์ (ชื่อ/สถานะ)
document.getElementById('save-profile-btn').addEventListener('click', async () => {
    const nameInput = document.getElementById('profile-name').value;
    const bioInput = document.getElementById('profile-bio').value;
    if (!currentUserUid) return;

    try {
        await setDoc(doc(db, "users", currentUserUid), {
            name: nameInput,
            bio: bioInput
        }, { merge: true });
        
        // อัปเดตตัวแปรในเครื่องด้วยทันที
        currentUserName = nameInput;
        
        alert("บันทึกข้อมูลโปรไฟล์สำเร็จแล้ว! 🐈‍⬛✨");
    } catch (error) {
        alert("เกิดข้อผิดพลาด: " + error.message);
    }
});

// 6. ออกจากระบบ
document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));