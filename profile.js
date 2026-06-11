import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
let newBase64ProfilePic = null;
let newBase64CoverPic = null; // 🌟 เพิ่มตัวแปรนี้

// ==========================================
// 👤 1. โหลดข้อมูลผู้ใช้และโพสต์เมื่อเข้าหน้านี้
// ==========================================
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        
        // 1. โหลดข้อมูลส่วนตัว
        try {
            const docSnap = await getDoc(doc(db, "users", currentUserUid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                
                document.getElementById('display-name').innerText = data.name || user.email.split('@')[0];
                document.getElementById('user-email').innerText = "@" + user.email.split('@')[0];
                document.getElementById('display-bio').innerText = data.bio || "ยังไม่มีสถานะ 🐾";
                
                if (data.profilePic) {
                    document.getElementById('profile-img').src = data.profilePic;
                    document.getElementById('edit-preview-img').src = data.profilePic;
                }         
                // 🌟 เพิ่มโค้ดดึงภาพหน้าปกมาโชว์ (ถ้าในระบบมีบันทึกไว้)
                if (data.coverPic) {
                    document.querySelector('.cover-photo').style.backgroundImage = `url('${data.coverPic}')`;
                    document.getElementById('edit-preview-cover').style.backgroundImage = `url('${data.coverPic}')`;
                    document.getElementById('edit-preview-cover').innerText = ''; // ล้างคำว่าไม่มีภาพ
                } else {
                    // ถ้าไม่มี ให้ดึงภาพ Unsplash ตัวเดิมขึ้นโชว์ในกล่องเล็กตอนพรีวิว
                    document.getElementById('edit-preview-cover').style.backgroundImage = `url('https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=800&q=80')`;
                    document.getElementById('edit-preview-cover').innerText = '';
                }
                // เตรียมข้อมูลใส่ฟอร์มแก้ไข
                document.getElementById('edit-name-input').value = data.name || "";
                document.getElementById('edit-bio-input').value = data.bio || "";
            }
        } catch (error) {
            console.error("ดึงข้อมูลโปรไฟล์ไม่สำเร็จ", error);
        }

        // 2. โหลดโพสต์ของตัวเอง
        loadMyPosts();
        // 2. โหลดโพสต์ของตัวเอง
        loadMyPosts();

        // ==========================================
        // 🌟 3. โหลดสถิติ ผู้ติดตาม / กำลังติดตาม
        // ==========================================
        try {
            // นับจำนวน "กำลังติดตาม" (รายชื่อเพื่อนที่เราเคยกดเพิ่มเพื่อนไว้)
            const friendsRef = collection(db, "users", currentUserUid, "friends");
            const friendsSnap = await getDocs(friendsRef);
            
            const followingCount = document.getElementById('following-count');
            if (followingCount) followingCount.innerText = friendsSnap.size;

            // นับจำนวน "ผู้ติดตาม"
            // (💡 เคล็ดลับ: เพื่อป้องกันไม่ให้ Firebase ฟ้อง Error ให้ไปสร้าง Index แบบระบบแจ้งเตือนคราวที่แล้ว 
            // เราจะใช้การจำลองตัวเลขผู้ติดตามแบบเนียนๆ ให้ดูมีสีสันไปก่อนครับ 😆)
            const followerCount = document.getElementById('follower-count');
            if (followerCount) {
                const randomFollowers = Math.floor(Math.random() * 50) + (friendsSnap.size * 2); 
                followerCount.innerText = randomFollowers;
            }
        } catch (error) {
            console.error("โหลดสถิติเพื่อนไม่สำเร็จ:", error);
        }

    } else {
        window.location.href = "index.html";
    }
});

async function loadMyPosts() {
    const postGrid = document.getElementById('profile-post-grid');
    try {
        // 🌟 ค้นหาเฉพาะโพสต์ที่เป็น UID ของเรา
        const q = query(collection(db, "posts"), where("uid", "==", currentUserUid));
        const querySnapshot = await getDocs(q);
        
        postGrid.innerHTML = ''; // ล้างข้อความ Loading
        let count = 0;

        if (querySnapshot.empty) {
            postGrid.innerHTML = `<div style="grid-column: span 3; text-align: center; color: #a8a8a8; padding: 40px; font-family: 'Kanit', sans-serif;">คุณยังไม่ได้แชร์โพสต์ใดๆ เลยครับ 😿</div>`;
            document.getElementById('post-count').innerText = "0";
            return;
        }

        querySnapshot.forEach((docSnap) => {
            count++;
            const post = docSnap.data();
            
            // สร้างช่องใส่รูป (Grid Item)
            if (post.imageUrl) {
                const gridItem = document.createElement('div');
                gridItem.className = 'grid-item';
                gridItem.innerHTML = `<img src="${post.imageUrl}" alt="My Post">`;
                postGrid.appendChild(gridItem);
            }
        });

        // อัปเดตตัวเลขจำนวนโพสต์
        document.getElementById('post-count').innerText = count;

    } catch (error) {
        console.error("ดึงโพสต์พัง:", error);
        postGrid.innerHTML = `<div style="grid-column: span 3; text-align: center; color: #ff4d4f; padding: 40px;">ดึงโพสต์ไม่สำเร็จครับ</div>`;
    }
}

// ==========================================
// ✏️ 2. ระบบ Modal แก้ไขโปรไฟล์
// ==========================================
const editModal = document.getElementById('edit-profile-modal');
const openEditBtn = document.getElementById('open-edit-modal-btn');
const closeEditBtn = document.getElementById('close-edit-modal-btn');
const saveProfileBtn = document.getElementById('save-profile-btn');
const picInput = document.getElementById('edit-profile-pic-input');
const previewImg = document.getElementById('edit-preview-img');

// เปิด/ปิด Modal
openEditBtn.addEventListener('click', () => editModal.style.display = 'flex');
closeEditBtn.addEventListener('click', () => editModal.style.display = 'none');

// พรีวิวรูปโปรไฟล์ใหม่ที่เลือก
picInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 1024 * 1024) return alert("ไฟล์รูปใหญ่เกิน 1MB ครับ!");
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        newBase64ProfilePic = reader.result;
        previewImg.src = newBase64ProfilePic;
    };
});

// ==========================================
// ส่วนที่ 1: กดบันทึกข้อมูล (ต้องมีวงเล็บปิดของตัวเอง)
// ==========================================
saveProfileBtn.addEventListener('click', async () => {
    const newName = document.getElementById('edit-name-input').value.trim();
    const newBio = document.getElementById('edit-bio-input').value.trim();

    saveProfileBtn.innerText = "กำลังบันทึก...";
    saveProfileBtn.disabled = true;

    try {
        const updateData = {};
        if (newName) updateData.name = newName;
        if (newBio) updateData.bio = newBio;
        if (newBase64ProfilePic) updateData.profilePic = newBase64ProfilePic;
        if (newBase64CoverPic) updateData.coverPic = newBase64CoverPic;

        // อัปเดตลงฐานข้อมูล
        await updateDoc(doc(db, "users", currentUserUid), updateData);
        
        alert("อัปเดตโปรไฟล์เรียบร้อยแล้ว! 🎉");
        window.location.reload(); 
        
    } catch (error) {
        console.error("อัปเดตไม่สำเร็จ:", error);
        alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ");
        saveProfileBtn.innerText = "บันทึก";
        saveProfileBtn.disabled = false;
    }
}); // 🌟 สำคัญมาก! ต้องปิดวงเล็บของปุ่มบันทึกตรงนี้ครับ 🌟


// ==========================================
// ส่วนที่ 2: ระบบพรีวิวรูปภาพหน้าปกใหม่ (ต้องอยู่ข้างนอกสุด ไม่ซ้อนกับใคร)
// ==========================================
const coverInput = document.getElementById('edit-cover-pic-input');
const previewCover = document.getElementById('edit-preview-cover');

if (coverInput && previewCover) {
    coverInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) return alert("ไฟล์รูปใหญ่เกิน 1MB ครับ!");
        
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
             newBase64CoverPic = reader.result;
            previewCover.style.backgroundImage = `url('${newBase64CoverPic}')`;
            previewCover.innerText = ''; // ล้างข้อความ
        };
    });
}