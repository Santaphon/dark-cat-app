import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, addDoc, serverTimestamp, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
// 🎨 ดึงสีธีมที่ผู้ใช้เคยตั้งค่าไว้จากหน้า Settings
// ==========================================
const savedThemeColor = localStorage.getItem('themeColor') || '#ec4899';
document.getElementById('create-event-btn').style.background = savedThemeColor;
document.getElementById('submit-new-event-btn').style.background = savedThemeColor;

// ==========================================
// 🧠 ระบบเปิด/ปิด Pop-up สร้างกิจกรรม
// ==========================================
const modal = document.getElementById('create-event-modal');
const openBtn = document.getElementById('create-event-btn');
const closeBtn = document.getElementById('close-event-modal-btn');

if (openBtn) openBtn.addEventListener('click', () => modal.style.display = 'flex');
if (closeBtn) closeBtn.addEventListener('click', () => modal.style.display = 'none');
window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });

// ==========================================
// 💾 ระบบบันทึกกิจกรรมใหม่ลง Firestore
// ==========================================
const submitBtn = document.getElementById('submit-new-event-btn');
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const name = document.getElementById('new-event-name').value;
        const dateInput = document.getElementById('new-event-date').value;
        const location = document.getElementById('new-event-location').value;
        const imageUrl = document.getElementById('new-event-image').value;
        const desc = document.getElementById('new-event-desc').value;

        // เช็กว่ากรอกข้อมูลสำคัญครบไหม
        if (!name || !dateInput) {
            alert("กรุณากรอกชื่องานและวันเวลาให้ครบนะครับเดฟ!");
            return;
        }

        submitBtn.innerText = "กำลังสร้างกิจกรรม...";
        submitBtn.disabled = true;

        // ถ้าไม่มีรูป ให้ใช้รูปพลุปาร์ตี้แทน
        const finalImage = imageUrl.trim() !== "" ? imageUrl.trim() : "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Party%20Popper.png";
        
        // แปลงรูปแบบเวลาให้สวยขึ้นนิดนึง (เช่น เปลี่ยนตัว T เป็นคำว่า เวลา)
        const formattedDate = dateInput.replace('T', ' เวลา ') + ' น.';

        try {
            // 🚀 ยิงข้อมูลเข้าฐานข้อมูลโฟลเดอร์ "events"
            await addDoc(collection(db, "events"), {
                name: name,
                date: formattedDate,
                location: location || "ไม่ระบุสถานที่",
                imageUrl: finalImage,
                description: desc,
                attendeesCount: 1, // คนสร้างนับเป็น 1 คนแรก
                createdAt: serverTimestamp()
            });

            alert(`🎉 สร้างกิจกรรม "${name}" สำเร็จ!`);
            modal.style.display = 'none';
            submitBtn.innerText = "ประกาศกิจกรรม!";
            submitBtn.disabled = false;
            
            // ล้างค่าในช่องกรอก
            document.getElementById('new-event-name').value = '';
            document.getElementById('new-event-date').value = '';
            document.getElementById('new-event-location').value = '';
            document.getElementById('new-event-image').value = '';
            document.getElementById('new-event-desc').value = '';
            
            fetchEvents(); // ดึงข้อมูลมาโชว์ใหม่ทันที

        } catch (error) {
            console.error("เกิดข้อผิดพลาด: ", error);
            alert("อ๊ะ! ระบบขัดข้องเล็กน้อยในการสร้างกิจกรรม");
            submitBtn.innerText = "ประกาศกิจกรรม!";
            submitBtn.disabled = false;
        }
    });
}

// ==========================================
// 🔄 ระบบดึงกิจกรรมมาแสดงผลแบบการ์ด
// ==========================================
const eventsContainer = document.getElementById('events-list-container');

async function fetchEvents() {
    if (!eventsContainer) return;
    try {
        const querySnapshot = await getDocs(collection(db, "events"));
        eventsContainer.innerHTML = '';

        if (querySnapshot.empty) {
            eventsContainer.innerHTML = '<p style="color: #a8a8a8; text-align: center;">ยังไม่มีกิจกรรมในเร็วๆ นี้ครับ เป็นเจ้าภาพจัดงานแรกเลยไหม!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const event = doc.data();
            
            // สร้างหน้าตาการ์ดกิจกรรม
            const card = `
                <div style="background: #0d0d0d; border: 1px solid #262626; border-radius: 12px; padding: 15px; display: flex; gap: 15px; transition: 0.3s;" onmouseover="this.style.borderColor='${savedThemeColor}'" onmouseout="this.style.borderColor='#262626'">
                   <img src="${event.imageUrl}" onerror="this.src='https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Party%20Popper.png'" style="width: 90px; height: 90px; border-radius: 10px; object-fit: cover; border: 1px solid #262626; background: #1a1a1a; padding: 5px;">
                    <div style="flex: 1;">
                        <h3 style="color: white; margin: 0 0 5px 0; font-size: 1.1rem; font-family: 'Kanit', sans-serif;">${event.name}</h3>
                        <p style="color: ${savedThemeColor}; margin: 0 0 5px 0; font-size: 0.85rem; font-weight: bold;">⏰ ${event.date}</p>
                        <p style="color: #a8a8a8; margin: 0 0 5px 0; font-size: 0.85rem;">📍 ${event.location}</p>
                        <p style="color: #f5f5f5; margin: 0 0 0 0; font-size: 0.8rem;">${event.description}</p>
                    </div>
                    
                    <div style="display: flex; flex-direction: column; justify-content: center; align-items: center; min-width: 80px; border-left: 1px dashed #262626; padding-left: 15px;">
                        <span style="color: white; font-weight: bold; font-size: 1.5rem;">${event.attendeesCount || 1}</span>
                        <span style="color: #a8a8a8; font-size: 0.75rem;">เข้าร่วม</span>
                        <button class="join-event-btn" data-id="${doc.id}" data-count="${event.attendeesCount || 1}" 
                        style="margin-top: 10px; background: #1a1a1a; color: ${savedThemeColor}; border: 1px solid ${savedThemeColor}; padding: 5px 10px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'Kanit', sans-serif;">
                       ลงชื่อ
                         </button>
                    </div>
                </div>
            `;
            eventsContainer.innerHTML += card;
        });
    } catch (error) {
        console.error("ดึงข้อมูลพลาด: ", error);
        eventsContainer.innerHTML = '<p style="color: #ff4d4f; text-align: center;">โหลดข้อมูลไม่สำเร็จ ลองรีเฟรชใหม่นะครับ</p>';
    }
}

fetchEvents();

// ==========================================
// 👤 แผงด้านขวา (โปรไฟล์และรายชื่อเพื่อน)
// ==========================================
const rightName = document.getElementById('right-panel-name');
const rightBio = document.getElementById('right-panel-bio');
const rightImg = document.getElementById('right-panel-img');

onAuthStateChanged(auth, async (user) => {
    if (user) {
        let currentName = user.displayName;
        if (!currentName && user.email) currentName = user.email.split('@')[0];
        
        if (rightName) rightName.innerText = currentName;
        if (rightImg) {
            rightImg.src = user.photoURL || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
            rightImg.style.borderColor = savedThemeColor; // กรอบรูปเป็นสีตามธีม
        }

        // ดึง Bio จากฐานข้อมูล Firestore
        try {
            const userDocSnap = await getDoc(doc(db, "users", user.uid));
            if (userDocSnap.exists() && userDocSnap.data().bio) {
                if (rightBio) rightBio.innerText = userDocSnap.data().bio;
            } else {
                if (rightBio) rightBio.innerText = "ออนไลน์ 🟢";
            }
        } catch (error) {
            if (rightBio) rightBio.innerText = "ออนไลน์ 🟢";
        }

        loadFriendsList();
    } else {
        window.location.href = "index.html"; // ถ้ายังไม่ล็อกอิน เตะกลับหน้าแรก
    }
});

function loadFriendsList() {
    const friendsContainer = document.getElementById('friends-list-container');
    if (friendsContainer) {
        friendsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Standing.png" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid #262626;">
                <div>
                    <strong style="font-size: 0.85rem; color: #f5f5f5; display: block;">เบนซ์</strong>
                    <span style="font-size: 0.75rem; color: ${savedThemeColor};">เป็นเพื่อนกันแล้ว</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien.png" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid #262626;">
                <div>
                    <strong style="font-size: 0.85rem; color: #f5f5f5; display: block;">Dark_King 👑</strong>
                    <span style="font-size: 0.75rem; color: #a8a8a8;">กำลังเล่นเกม...</span>
                </div>
            </div>
        `;
    }
}
// ==========================================
// ⚡ ระบบดักจับการกดปุ่ม "ลงชื่อ" (RSVP)
// ==========================================
document.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('join-event-btn')) {
        const eventId = e.target.getAttribute('data-id');
        const currentCount = parseInt(e.target.getAttribute('data-count'));
        
        try {
            const eventRef = doc(db, "events", eventId);
            // สั่งอัปเดตเลขคนเข้าร่วมในฐานข้อมูล +1
            await updateDoc(eventRef, {
                attendeesCount: currentCount + 1
            });
            
            alert("🎉 ลงชื่อเข้าร่วมกิจกรรมเรียบร้อยแล้วครับ!");
            fetchEvents(); // รีเฟรชหน้าจอโชว์เลขใหม่
        } catch (error) {
            console.error("ลงชื่อไม่สำเร็จ: ", error);
            alert("อ๊ะ! ระบบขัดข้องเล็กน้อย");
        }
    }
});