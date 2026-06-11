import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, query, where, onSnapshot, getDoc, doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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

const list = document.getElementById('notifications-list');

onAuthStateChanged(auth, (user) => {
    if (!user) return window.location.href = "index.html";

    // 🌟 ดึงข้อมูลแจ้งเตือนที่เป็นของเรา (ไม่มีคำสั่ง orderBy ให้ติดบั๊ก)
    const q = query(collection(db, "notifications"), where("receiverId", "==", user.uid));

    onSnapshot(q, async (snapshot) => {
        if (snapshot.empty) {
            list.innerHTML = `
                <div style="text-align: center; color: #a8a8a8; margin-top: 50px; font-family: 'Kanit', sans-serif;">
                    <span style="font-size: 3rem;">📭</span>
                    <p>ยังไม่มีการแจ้งเตือนใหม่ครับ</p>
                </div>`;
            return;
        }

        // 1. ดึงข้อมูลทั้งหมดมาเก็บในกล่อง (Array) ก่อน
        let notifs = [];
        snapshot.forEach((docSnap) => {
            notifs.push({ id: docSnap.id, ...docSnap.data() });
        });

        // 2. 🌟 ให้ JavaScript เรียงลำดับเวลาให้แทน (ใหม่ไปเก่า)
        notifs.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt ? b.createdAt.toMillis() : 0;
            return timeB - timeA; 
        });

        // 3. เริ่มวาดข้อมูลลงหน้าเว็บ
        list.innerHTML = '';
        for (const notif of notifs) {
            // ค้นหาชื่อของคนที่มากดไลก์/คอมเมนต์
            let senderName = "เพื่อนของคุณ";
            try {
                const senderDoc = await getDoc(doc(db, "users", notif.senderId));
                if (senderDoc.exists() && senderDoc.data().name) {
                    senderName = senderDoc.data().name;
                }
            } catch (e) { 
                console.log("ดึงชื่อไม่ได้"); 
            }

            // จัดรูปแบบเวลา
            let timeText = "เพิ่งเกิดขึ้น";
            if (notif.createdAt) {
                const dateObj = notif.createdAt.toDate();
                timeText = dateObj.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' }) + ' น.';
            }

            // แยกประเภท (ไลก์ หรือ คอมเมนต์)
            const isLike = notif.type === 'like';
            const icon = isLike ? '❤️' : '💬';
            const actionText = isLike ? 'ถูกใจโพสต์ของคุณ' : 'แสดงความคิดเห็นในโพสต์ของคุณ';
            const highlightColor = isLike ? '#ec4899' : '#0095f6';

            // สร้างกล่องการแจ้งเตือน
            // เช็กว่าอันนี้ยังไม่ได้อ่านใช่ไหม? (ถ้าใช่ จะสร้างจุดแดง)
            const isUnread = notif.read === false;
            const unreadDot = isUnread ? `<div style="width: 10px; height: 10px; background: #ff4d4f; border-radius: 50%; margin-left: auto; box-shadow: 0 0 5px #ff4d4f;"></div>` : '';

            // สร้างกล่องการแจ้งเตือน
            const card = document.createElement('div');
            card.className = 'notify-item';
            card.style.cursor = 'pointer'; // 🌟 เปลี่ยนเมาส์ให้เป็นรูปนิ้วคลิก
            card.innerHTML = `
                <div class="notify-icon">${icon}</div>
                <div class="notify-text">
                    <strong style="color: ${highlightColor};">${senderName}</strong> ${actionText}
                    <div class="notify-time">${timeText}</div>
                </div>
                ${unreadDot} `;

            // 🌟 เพิ่มคำสั่ง "เมื่อคลิก" กล่องแจ้งเตือน
            card.addEventListener('click', async () => {
                // ถ้ายังไม่ได้อ่าน ให้เปลี่ยนสถานะใน Database เป็น "อ่านแล้ว" (read: true)
                if (isUnread) {
                    try {
                        await updateDoc(doc(db, "notifications", notif.id), { read: true });
                    } catch(e) { console.error("อัปเดตสถานะการอ่านไม่ได้"); }
                }
                
                // พาวาร์ปไปที่หน้า Dashboard
                window.location.href = "dashboard.html";
            });

            list.appendChild(card);
        }
    });
});