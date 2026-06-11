import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, updateProfile, sendPasswordResetEmail, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
// 🌟 นำเข้าเครื่องมือจัดการฐานข้อมูล Firestore สำหรับเซฟ Bio
import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
const db = getFirestore(app); // 🌟 เปิดใช้ฐานข้อมูล

// ผูกตัวแปรกับ HTML
const nameInput = document.getElementById('setting-name-input');
const photoInput = document.getElementById('setting-photo-input');
const bioInput = document.getElementById('setting-bio-input'); // 🌟 ตัวแปรช่อง Bio
const previewImg = document.getElementById('preview-profile-img');
const saveBtn = document.getElementById('save-settings-btn');

const rightName = document.getElementById('right-panel-name');
const rightBio = document.getElementById('right-panel-bio');
const rightImg = document.getElementById('right-panel-img');

// ==========================================
// 👤 ดึงข้อมูลเดิมมาแสดง
// ==========================================
onAuthStateChanged(auth, async (user) => { // 🌟 ใช้ async เพื่อรอข้อมูลจากฐานข้อมูล
    if (user) {
        let currentName = user.displayName;
        if (!currentName && user.email) {
            currentName = user.email.split('@')[0];
        }
        
        if (nameInput) nameInput.value = currentName;
        if (user.photoURL) {
            if (photoInput) photoInput.value = user.photoURL;
            if (previewImg) previewImg.src = user.photoURL;
        }

        if (rightName) rightName.innerText = currentName;
        if (rightImg) {
            rightImg.src = user.photoURL || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
        }

        // 🌟 ดึงข้อมูล Bio จากฐานข้อมูล Firestore มาโชว์
        try {
            const userDocRef = doc(db, "users", user.uid); // หาโฟลเดอร์ users ของบัญชีนี้
            const userDocSnap = await getDoc(userDocRef);
            
            if (userDocSnap.exists() && userDocSnap.data().bio) {
                const savedBio = userDocSnap.data().bio;
                if (bioInput) bioInput.value = savedBio;
                if (rightBio) rightBio.innerText = savedBio;
            } else {
                if (rightBio) rightBio.innerText = "ออนไลน์ 🟢";
            }
        } catch (error) {
            console.error("ดึงข้อมูล Bio พลาด: ", error);
            if (rightBio) rightBio.innerText = "ออนไลน์ 🟢";
        }

        loadFriendsList();
        // พรีวิวรูปโปรไฟล์ทันทีเมื่อวางลิงก์ใหม่
         if (photoInput) {
          photoInput.addEventListener('input', (e) => {
        if (previewImg) previewImg.src = e.target.value || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png";
    });
}
        // ==========================================
        // 💾 ระบบบันทึกข้อมูลทั้งหมด
        // ==========================================
        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const newName = nameInput.value.trim();
                const newPhoto = photoInput.value.trim();
                const newBio = bioInput ? bioInput.value.trim() : ""; // 🌟 ดึงค่า Bio ที่พิมพ์มา

                if (newName === "") {
                    alert("อย่าลืมตั้งชื่อเท่ๆ ของคุณนะครับ!");
                    return;
                }

                saveBtn.innerText = "กำลังบันทึกข้อมูล...";
                saveBtn.disabled = true;

                try {
                    // 1. เซฟชื่อและรูปลงระบบยืนยันตัวตน
                    await updateProfile(user, {
                        displayName: newName,
                        photoURL: newPhoto || "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png"
                    });

                    // 2. 🌟 เซฟ Bio ลงฐานข้อมูล Firestore (เซฟลง Collection "users")
                    await setDoc(doc(db, "users", user.uid), {
                        bio: newBio || "ออนไลน์ 🟢",
                        updatedAt: new Date()
                    }, { merge: true }); // merge:true แปลว่าถ้ามีข้อมูลอื่นอยู่จะไม่โดนลบทับ

                    alert("🎉 อัปเดตโปรไฟล์เรียบร้อยแล้ว!");
                    window.location.reload(); 

                } catch (error) {
                    console.error("เกิดข้อผิดพลาด: ", error);
                    alert("อ๊ะ! บันทึกไม่สำเร็จ ลองใหม่อีกครั้งนะครับ");
                    saveBtn.innerText = "💾 บันทึกการเปลี่ยนแปลง";
                    saveBtn.disabled = false;
                }
            });
        }
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
// ==========================================
// 🎨 ระบบเปลี่ยนสีธีม (Accent Color)
// ==========================================
const colorBtns = document.querySelectorAll('.color-btn');
// ค้นหาว่าผู้ใช้เคยเลือกสีไว้ไหม ถ้าไม่เคยให้ใช้สีชมพูตั้งต้น
let selectedColor = localStorage.getItem('themeColor') || '#ec4899';

// ฟังก์ชันเปลี่ยนสีองค์ประกอบต่างๆ ในหน้าจอ
function applyThemeColor(color) {
    if (saveBtn) saveBtn.style.background = color; // เปลี่ยนสีปุ่ม
    if (previewImg) previewImg.style.borderColor = color; // เปลี่ยนกรอบรูปซ้าย
    if (rightImg) rightImg.style.borderColor = color; // เปลี่ยนกรอบรูปขวา
     
    // เปลี่ยนสีเงาของเมนูตั้งค่าด้านซ้ายให้ตรงกับธีม
    const activeNav = document.querySelector('.nav-item[href="settings.html"]');
    if (activeNav) {
        activeNav.style.boxShadow = `0 0 15px ${color}66`; // 66 คือความโปร่งใส
    }

    // อัปเดตไฮไลท์วงกลมว่ากำลังเลือกสีไหนอยู่
    colorBtns.forEach(btn => {
        if (btn.getAttribute('data-color') === color) {
            btn.style.border = '2px solid white';
            btn.style.boxShadow = `0 0 10px ${color}`;
        } else {
            btn.style.border = '2px solid transparent';
            btn.style.boxShadow = 'none';
        }
    });
}

// 1. โหลดสีเดิมขึ้นมาแสดงผลทันทีที่เปิดหน้าเว็บ
applyThemeColor(selectedColor);

// 2. ดักจับการกดเลือกสีใหม่
colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        selectedColor = e.target.getAttribute('data-color');
        applyThemeColor(selectedColor); // เปลี่ยนสีหน้าจอสดๆ
        localStorage.setItem('themeColor', selectedColor); // 💾 แอบเซฟลงเครื่องผู้ใช้
    });
});
// ==========================================
// ⚠️ โซนอันตราย (เปลี่ยนรหัสผ่าน / ลบบัญชี)
// ==========================================
onAuthStateChanged(auth, (user) => {
    if (user) {
        const resetPwdBtn = document.getElementById('reset-password-btn');
        const deleteAccBtn = document.getElementById('delete-account-btn');

        // 1. ระบบส่งอีเมลรีเซ็ตรหัสผ่าน
        if (resetPwdBtn) {
            resetPwdBtn.addEventListener('click', async () => {
                if (confirm(`ระบบจะส่งลิงก์เปลี่ยนรหัสผ่านไปที่อีเมล: ${user.email}\nคุณต้องการดำเนินการต่อหรือไม่?`)) {
                    try {
                        await sendPasswordResetEmail(auth, user.email);
                        alert("📧 ส่งลิงก์เปลี่ยนรหัสผ่านไปที่อีเมลของคุณแล้ว! (ลองเช็กในกล่องจดหมาย หรือ Junk Mail ดูนะครับ)");
                    } catch (error) {
                        console.error("ส่งอีเมลไม่สำเร็จ: ", error);
                        alert("อ๊ะ! ระบบส่งอีเมลขัดข้อง หรือบัญชีนี้อาจไม่ได้สมัครด้วยรหัสผ่านครับ");
                    }
                }
            });
        }

        // 2. ระบบลบบัญชีทิ้ง
        if (deleteAccBtn) {
            deleteAccBtn.addEventListener('click', async () => {
                if (confirm("🚨 คำเตือนขั้นสุด! การลบบัญชีจะไม่สามารถกู้ข้อมูลกลับมาได้อีก\nคุณแน่ใจ 100% แล้วใช่ไหมครับที่จะบอกลา DARK CAT?")) {
                    try {
                        await deleteUser(user);
                        alert("👋 ลบบัญชีเรียบร้อยแล้ว หวังว่าจะได้พบกันใหม่นะครับคุณเดฟ!");
                        window.location.href = "index.html"; // เตะกลับหน้าแรกทันที
                    } catch (error) {
                        console.error("ลบบัญชีไม่สำเร็จ: ", error);
                        // ระบบความปลอดภัยของ Firebase: ถ้าล็อกอินค้างไว้นานๆ จะลบไม่ได้ ต้องบังคับให้ล็อกอินใหม่ก่อน
                        alert("🔒 ระบบความปลอดภัยทำงาน: โปรด 'ออกจากระบบ' แล้ว 'เข้าสู่ระบบใหม่' อีกครั้งก่อนทำการกดลบบัญชีครับ");
                    }
                }
            });
        }
    }
});
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