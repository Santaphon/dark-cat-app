import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, updateDoc, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app);

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
        modal.style.display = 'flex'; 
    });
}

// 2. กดปุ่ม (X) ปิด Pop-up
if (closeBtn) {
    closeBtn.addEventListener('click', () => {
        modal.style.display = 'none'; 
    });
}

// 3. กดคลิกพื้นที่สีดำรอบนอกเพื่อปิด Pop-up แบบเนียนๆ
window.addEventListener('click', (e) => {
    if (e.target === modal) {
        modal.style.display = 'none';
    }
});

// ==========================================
// 💾 ระบบส่งข้อมูลสร้างกลุ่มเข้า Firebase (ฉบับสายฟรี)
// ==========================================
if (submitBtn) {
    submitBtn.addEventListener('click', async () => {
        const groupName = document.getElementById('new-group-name').value;
        const groupDesc = document.getElementById('new-group-desc').value;
        const imageUrlInput = document.getElementById('new-group-image-url').value; 

        // เช็กว่าพิมพ์ครบไหม
        if (groupName.trim() === "" || groupDesc.trim() === "") {
            alert("กรุณากรอกชื่อและคำอธิบายกลุ่มให้ครบถ้วนนะครับเดฟ!");
            return;
        }

        try {
            submitBtn.innerText = "กำลังสร้างคอมมูนิตี้...";
            submitBtn.disabled = true;

            // เช็กว่ามีการวางลิงก์รูปไหม? ถ้าไม่มี ให้ใช้รูปแมวดำแทน
            let finalImageUrl = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
            if (imageUrlInput.trim() !== "") {
                finalImageUrl = imageUrlInput.trim();
            }

            // สั่งยิงข้อมูลเข้าฐานข้อมูล Firestore
            await addDoc(collection(db, "groups"), {
                name: groupName,
                description: groupDesc,
                imageUrl: finalImageUrl, 
                memberCount: 1,
                createdAt: serverTimestamp()
            });

            alert(`🎉 สร้างกลุ่ม "${groupName}" สำเร็จ!`);
            
            // ล้างค่าในช่องกรอก และปิด Pop-up
            document.getElementById('new-group-name').value = '';
            document.getElementById('new-group-desc').value = '';
            document.getElementById('new-group-image-url').value = ''; 
            submitBtn.innerText = "ยืนยันการสร้างกลุ่ม";
            submitBtn.disabled = false;
            modal.style.display = 'none';
            fetchGroups(); 

        } catch (error) {
            console.error("เกิดข้อผิดพลาดในการสร้างกลุ่ม: ", error);
            alert("อ๊ะ! ระบบขัดข้องเล็กน้อย ลองใหม่อีกครั้งนะครับ");
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
        const querySnapshot = await getDocs(collection(db, "groups"));
        groupsContainer.innerHTML = '';
        
        if (querySnapshot.empty) {
            groupsContainer.innerHTML = '<p style="color: #a8a8a8; text-align: center;">ยังไม่มีกลุ่มในระบบเลยครับ มาสร้างกลุ่มแรกกันเถอะ!</p>';
            return;
        }

        querySnapshot.forEach((doc) => {
            const groupData = doc.data();
            const groupId = doc.id;
            
            const groupCard = `
                    <div class="group-card" style="background: #0d0d0d; border: 1px solid #262626; border-radius: 12px; padding: 15px; display: flex; align-items: center; gap: 15px; transition: 0.3s; cursor: pointer;" onmouseover="this.style.borderColor='#ec4899'; this.style.transform='translateY(-2px)';" onmouseout="this.style.borderColor='#262626'; this.style.transform='translateY(0)';">
                    <img src="${groupData.imageUrl || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 50px; height: 50px; border-radius: 10px; background: #1a1a1a; padding: 5px; object-fit: cover;">
                    <div style="flex: 1;">
                        <h3 style="color: white; margin: 0 0 5px 0; font-size: 1rem; font-family: 'Kanit', sans-serif;">${groupData.name}</h3>
                        <p style="color: #a8a8a8; margin: 0; font-size: 0.8rem; font-family: 'Kanit', sans-serif;">${groupData.description}</p>
                        <p style="color: #ec4899; margin: 5px 0 0 0; font-size: 0.75rem; font-weight: bold;">สมาชิก ${groupData.memberCount || 1} คน</p>
                    </div>
                    <button class="join-btn" data-id="${groupId}" data-count="${groupData.memberCount || 1}" style="background: #1a1a1a; color: #ec4899; border: 1px solid #ec4899; padding: 5px 15px; border-radius: 6px; cursor: pointer; font-weight: bold; font-family: 'Kanit', sans-serif;">
                        เข้าร่วม
                    </button>
                </div>
            `;
            groupsContainer.innerHTML += groupCard;
        });

    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการดึงข้อมูล: ", error);
        groupsContainer.innerHTML = '<p style="color: #ff4d4f; text-align: center;">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่</p>';
    }
}

fetchGroups();

// ==========================================
// 👤 ระบบโหลดข้อมูลโปรไฟล์และเพื่อน (แผงด้านขวา)
// ==========================================
const auth = getAuth(app); 

onAuthStateChanged(auth, (user) => {
    if (user) {
        const nameElement = document.getElementById('right-panel-name');
        const bioElement = document.getElementById('right-panel-bio');
        const imgElement = document.getElementById('right-panel-img');

        let userName = user.displayName;
        if (!userName && user.email) {
            userName = user.email.split('@')[0]; 
        }

        if (nameElement) nameElement.innerText = userName || "ผู้ใช้งานนิรนาม";
        if (bioElement) bioElement.innerText = "ออนไลน์ 🟢";
        if (imgElement) {
            imgElement.src = user.photoURL || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
        }
        
        loadFriendsList();
    } else {
        window.location.href = "index.html";
    }
});

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
}

// ฟังก์ชันสำหรับกดเข้าร่วมกลุ่ม
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

// ดักจับการกดปุ่มเข้าร่วมแบบ Event Delegation
document.addEventListener('click', function(e) {
    if (e.target && e.target.classList.contains('join-btn')) {
        const id = e.target.getAttribute('data-id');
        const count = parseInt(e.target.getAttribute('data-count'));
        joinGroup(id, count);
    }
});
// ==========================================
// 🔍 ระบบค้นหากลุ่ม (Real-time Search)
// ==========================================
const searchInput = document.getElementById('search-group-input');

if (searchInput) {
    // ใช้ 'input' event เพื่อให้มันทำงานทันทีทุกครั้งที่พิมพ์หรือลบตัวอักษร
    searchInput.addEventListener('input', function(e) {
        // แปลงข้อความที่พิมพ์ให้เป็นตัวพิมพ์เล็กทั้งหมด จะได้ค้นหาได้แม่นยำขึ้น
        const searchTerm = e.target.value.toLowerCase(); 
        
        // กวาดหาการ์ดกลุ่มทั้งหมดที่มีอยู่บนหน้าเว็บ
        const groupCards = document.querySelectorAll('.group-card');

        groupCards.forEach(card => {
            // ดึงชื่อกลุ่มจากแท็ก <h3> มาเช็ก
            const groupName = card.querySelector('h3').innerText.toLowerCase();
            
            // ถ้าชื่อกลุ่มมีตัวอักษรที่เราพิมพ์อยู่ ให้แสดงผล ถ้าไม่มีให้ซ่อนไปเลย
            if (groupName.includes(searchTerm)) {
                card.style.display = 'flex'; 
            } else {
                card.style.display = 'none'; 
            }
        });
    });
}
// ==========================================
// 📊 ระบบสถิติชุมชน (ดึงข้อมูลจริงจากฐานข้อมูล)
// ==========================================
async function loadCommunityStats() {
    try {
        // 1. นับจำนวนสมาชิกทั้งหมด
        const usersSnap = await getDocs(collection(db, "users"));
        const statUsers = document.getElementById('stat-total-users');
        if (statUsers) statUsers.innerText = usersSnap.size;

        // 2. นับจำนวนโพสต์ทั้งหมด
        const postsSnap = await getDocs(collection(db, "posts"));
        const statPosts = document.getElementById('stat-total-posts');
        if (statPosts) statPosts.innerText = postsSnap.size;

        // 3. สุ่มคนออนไลน์
        const statOnline = document.getElementById('stat-online-users');
        if (statOnline) {
            const randomOnline = Math.floor(Math.random() * usersSnap.size) + 1;
            statOnline.innerText = randomOnline;
        }

        // 4. นับจำนวนกลุ่ม (ถ้าคุณเดฟสร้าง Collection "groups" ไว้แล้ว)
        try {
            const groupsSnap = await getDocs(collection(db, "groups"));
            const statGroups = document.getElementById('stat-total-groups');
            if (statGroups) statGroups.innerText = groupsSnap.size > 0 ? groupsSnap.size : 3; 
        } catch(e) {}

    } catch (error) {
        console.error("โหลดสถิติชุมชนไม่สำเร็จ:", error);
    }
}

// สั่งให้ทำงานทันทีเมื่อเปิดหน้านี้
loadCommunityStats();