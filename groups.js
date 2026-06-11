import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBjXONUBgiJ9iys--Rk_pJwKtWu3EnTn9o",
  authDomain: "dark-cat-d4c19.firebaseapp.com",
  projectId: "dark-cat-d4c19",
  storageBucket: "dark-cat-d4c19.firebasestorage.app",
  messagingSenderId: "417221227867",
  appId: "1:417221227867:web:6b75faa273314c9a5ed67e",
  measurementId: "G-65CLM2SJ46"
};

// สั่งเปิดใช้งานแอปและฐานข้อมูล
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // 🌟 ตรงนี้แหละครับที่จะทำให้ระบบรู้จักคำว่า db!
// ==========================================
// 🧠 ระบบเปิด/ปิด Pop-up สร้างกลุ่ม
// ==========================================
const createBtn = document.getElementById('create-group-btn');
const modal = document.getElementById('create-group-modal');
const closeBtn = document.getElementById('close-group-modal-btn');
const submitBtn = document.getElementById('submit-new-group-btn');

// 1. กดปุ่มเปิด Pop-up
if (createBtn) {
    createBtn.addEventListener('click', () => {
        modal.style.display = 'flex'; // สั่งให้แสดงผล
    });
}

// 2. กดปุ่ม (X) ปิด Pop-up
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none'; // สั่งให้ซ่อน
    });
}

// 3. กดคลิกพื้นที่สีดำรอบนอกเพื่อปิด Pop-up แบบเนียนๆ
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// ==========================================
// 💾 ระบบส่งข้อมูลสร้างกลุ่มเข้า Firebase จริง!
// ==========================================
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const groupName = document.getElementById('new-group-name').value;
        const groupDesc = document.getElementById('new-group-desc').value;

        // เช็กว่าพิมพ์ครบไหม
        if (groupName.trim() === "" || groupDesc.trim() === "") {
            alert("กรุณากรอกชื่อและคำอธิบายกลุ่มให้ครบถ้วนนะครับเดฟ!");
            return;
        }

        try {
            // เปลี่ยนข้อความปุ่มเป็นสถานะกำลังโหลด
            submitBtn.innerText = "กำลังสร้างคอมมูนิตี้...";
            submitBtn.disabled = true;

            // 🚀 สั่งยิงข้อมูลเข้าฐานข้อมูล Firestore (สร้าง Collection ใหม่ชื่อ "groups")
            await addDoc(collection(db, "groups"), {
                name: groupName,
                description: groupDesc,
                memberCount: 1, // เริ่มต้นด้วยตัวเราเอง 1 คน
                createdAt: serverTimestamp() // ประทับเวลาจาก Server
            });

            // แจ้งเตือนเมื่อสำเร็จ
            alert(`🎉 สร้างกลุ่ม "${groupName}" ลงฐานข้อมูลสำเร็จแล้ว!`);
            
            // ล้างค่าในช่องกรอก คืนค่าปุ่ม และปิด Pop-up
            document.getElementById('new-group-name').value = '';
            document.getElementById('new-group-desc').value = '';
            submitBtn.innerText = "ยืนยันการสร้างกลุ่ม";
            submitBtn.disabled = false;
            modal.style.display = 'none';
            fetchGroups();

            // ทริค: สั่งให้รีเฟรชหน้าเว็บ หรือดึงข้อมูลใหม่มาแสดงตรงนี้ได้เลย

        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการสร้างกลุ่ม: ", error);
            alert("อ๊ะ! ระบบขัดข้องเล็กน้อย ลองใหม่อีกครั้งนะครับ");
            
            // คืนค่าปุ่มกลับมาให้กดใหม่ได้
            submitBtn.innerText = "ยืนยันการสร้างกลุ่ม";
            submitBtn.disabled = false;
        }
    });
}
// ==========================================
// 🔄 ระบบดึงข้อมูลกลุ่มจาก Firebase มาแสดงผล
// ==========================================
const groupsContainer = document.getElementById('groups-list-container');

async function fetchGroups() {
    if (!groupsContainer) return;
    
    try {
        // ไปดึงข้อมูลทั้งหมดจาก Collection "groups"
        const querySnapshot = await getDocs(collection(db, "groups"));
        
        // ล้างคำว่า "กำลังโหลด..." ออกก่อน
        groupsContainer.innerHTML = ''; 
        
        if (querySnapshot.empty) {
            groupsContainer.innerHTML = '<p style="color: #a8a8a8; text-align: center;">ยังไม่มีกลุ่มในระบบเลยครับ มาสร้างกลุ่มแรกกันเถอะ!</p>';
            return;
        }

        // เอาข้อมูลที่ได้มา วนลูปสร้างเป็นการ์ด HTML ทีละอัน
        querySnapshot.forEach((doc) => {
            const groupData = doc.data();
            const groupId = doc.id;
            
            // สร้างหน้าตาการ์ดโดยใส่ข้อมูลจริงลงไป (${groupData.name})
            const groupCard = `
                <div style="background: #0d0d0d; border: 1px solid #262626; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; transition: 0.3s; cursor: pointer;" onmouseover="this.style.borderColor='#ec4899'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#262626'; this.style.transform='translateY(0)';">
                    <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png" style="width: 50px; height: 50px; border-radius: 10px; background: #1a1a1a; padding: 5px;">
                    <div style="flex: 1;">
                        <h3 style="color: white; margin: 0 0 5px 0; font-size: 1rem; font-family: 'Kanit', sans-serif;">${groupData.name}</h3>
                        <p style="color: #a8a8a8; margin: 0; font-size: 0.8rem; font-family: 'Kanit', sans-serif;">${groupData.description}</p>
                        <p style="color: #ec4899; margin: 5px 0 0 0; font-size: 0.75rem; font-weight: bold;">สมาชิก ${groupData.memberCount || 1} คน</p>
                    </div>
                    <button onclick="joinGroup('${groupId}', ${groupData.memberCount || 1})" 
        style="background: #1a1a1a; color: #ec4899; border: 1px solid #ec4899; padding: 5px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'Kanit', sans-serif;">
    เข้าร่วม
</button>
                </div>
            `;
            // ยัดการ์ดที่สร้างเสร็จแล้วเข้าไปในกล่อง HTML
            groupsContainer.innerHTML += groupCard;
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล: ", error);
        groupsContainer.innerHTML = '<p style="color: #ff4d4f; text-align: center;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>';
    }
}

// 🚀 สั่งให้ดึงข้อมูลทันทีที่เปิดหน้าเว็บขึ้นมา
fetchGroups();
// ==========================================
// 👤 ระบบโหลดข้อมูลโปรไฟล์และเพื่อน (แผงด้านขวา)
// ==========================================
const auth = getAuth(app); // เรียกใช้ระบบยืนยันตัวตน

onAuthStateChanged(auth, (user) => {
    if (user) {
        // 1. อัปเดตข้อมูลโปรไฟล์ตัวเอง (แบบดึงข้อมูลจริงจากคนล็อกอิน)
        const nameElement = document.getElementById('right-panel-name');
        const bioElement = document.getElementById('right-panel-bio');
        const imgElement = document.getElementById('right-panel-img');

        // ทริคฉลาดๆ: ถ้าไม่มีชื่อ Display Name ให้เอาอีเมลมาใช้แทน (เช่น braven@email.com จะกลายเป็น braven)
        let userName = user.displayName;
        if (!userName && user.email) {
            userName = user.email.split('@')[0]; 
        }

        if (nameElement) nameElement.innerText = userName || "ผู้ใช้งานนิรนาม";
        if (bioElement) bioElement.innerText = "ออนไลน์ 🟢";
        
        // ถ้าระบบมีรูปโปรไฟล์ให้ใช้รูปนั้น ถ้าไม่มีให้ใช้รูปโปรไฟล์ตั้งต้น
        if (imgElement) {
            imgElement.src = user.photoURL || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
        }
        // 2. เรียกฟังก์ชันโหลดรายชื่อเพื่อน
        loadFriendsList();
    } else {
        // ถ้ายังไม่ล็อกอิน เด้งกลับไปหน้าแรก
        window.location.href = "index.html";
    }
});

// ฟังก์ชันโหลดรายชื่อเพื่อน
function loadFriendsList() {
    const friendsContainer = document.getElementById('friends-list-container');
    if (friendsContainer) {
        friendsContainer.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px; transition: 0.2s; cursor: pointer;">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/People/Man%20Standing.png" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid #262626;">
                <div>
                    <strong style="font-size: 0.85rem; color: #f5f5f5; display: block;">เบนซ์</strong>
                    <span style="font-size: 0.75rem; color: #ec4899;">เป็นเพื่อนกันแล้ว</span>
                </div>
            </div>
            <div style="display: flex; align-items: center; gap: 10px; transition: 0.2s; cursor: pointer;">
                <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Alien.png" style="width: 35px; height: 35px; border-radius: 50%; border: 1px solid #262626;">
                <div>
                    <strong style="font-size: 0.85rem; color: #f5f5f5; display: block;">Dark_King 👑</strong>
                    <span style="font-size: 0.75rem; color: #a8a8a8;">กำลังเล่นเกม...</span>
                </div>
            </div>
        `;
    }
} // ปิดฟังก์ชัน loadFriendsList แค่ตรงนี้ครับ

// ฟังก์ชันสำหรับกดเข้าร่วมกลุ่ม (วางไว้นอกฟังก์ชันอื่น)
async function joinGroup(groupId, currentMemberCount) {
    try {
        const groupRef = doc(db, "groups", groupId);
        await updateDoc(groupRef, {
            memberCount: currentMemberCount + 1
        });
        alert("🎉 ยินดีด้วย! คุณได้เข้าร่วมกลุ่มนี้เรียบร้อยแล้ว");
        fetchGroups(); 
    } catch (error) {
        console.error("เข้าร่วมกลุ่มไม่สำเร็จ: ", error);
        alert("อ๊ะ! ระบบขัดข้องเล็กน้อย");
    }
}