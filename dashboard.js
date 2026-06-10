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

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

let currentUserUid = null;
let postBase64Image = ""; 

// ==========================================
// 🕒 ฟังก์ชันคำนวณเวลาอัจฉริยะ (Smart Timestamps)
// ==========================================
function timeAgo(dateString) {
    if (!dateString) return "เพิ่งโพสต์";
    
    const postDate = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - postDate) / 1000);

    if (diffInSeconds < 60) return "เพิ่งโพสต์";
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) return `${diffInMinutes} นาทีที่แล้ว`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} ชั่วโมงที่แล้ว`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return "เมื่อวานนี้";
    if (diffInDays < 7) return `${diffInDays} วันที่แล้ว`;

    // ถ้าโพสต์นานกว่า 7 วัน ให้แสดงเป็น วัน/เดือน/ปี แทน
    return postDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

// หน้าจอโหลดหน้าเว็บ
const hideLoadingScreen = () => {
    const loader = document.getElementById('loading-screen');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => { loader.style.visibility = 'hidden'; }, 500);
    }
};

// 1. โหลดข้อมูลเมื่อเข้าสู่ระบบ
onAuthStateChanged(auth, async (user) => {
    if (user) {
        currentUserUid = user.uid;
        try {
            const docSnap = await getDoc(doc(db, "users", currentUserUid));
            if (docSnap.exists()) {
                const data = docSnap.data();
                const rightName = document.getElementById('right-panel-name');
                const rightBio = document.getElementById('right-panel-bio');
                const rightImg = document.getElementById('right-panel-img');
      
                if (rightName) rightName.textContent = data.name || user.email.split('@')[0];
                if (rightBio) rightBio.textContent = data.bio || "ยังไม่มีสถานะ";
                if (rightImg && data.profilePic) rightImg.src = data.profilePic;
            }
            hideLoadingScreen();
            loadFeedPosts(); 
            loadFriendsList();
        } catch (error) {
            console.error("โหลดข้อมูลพัง:", error);
            hideLoadingScreen();
        }
    } else {
        window.location.href = "index.html";
    }
});

// เข้าสู่ห้องแชท
const chatBtn = document.getElementById('go-chat-btn');
if (chatBtn) {
    chatBtn.addEventListener('click', () => {
        window.location.href = "chat.html";
    });
}

// ==========================================
// 🔍 1. ระบบค้นหาเพื่อนและเพิ่มเพื่อน
// ==========================================
const searchModal = document.getElementById('search-modal');
const searchResults = document.getElementById('search-results');
const searchBtn = document.getElementById('search-btn');
const closeModalBtn = document.getElementById('close-modal-btn');

if (closeModalBtn && searchModal) {
    closeModalBtn.addEventListener('click', () => {
        searchModal.style.display = 'none';
    });
}

if (searchBtn && searchModal && searchResults) {
    searchBtn.addEventListener('click', async () => {
        const keyword = document.getElementById('search-input').value.trim();
        if (!keyword) return;

        searchModal.style.display = 'flex';
        searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">กำลังค้นหา... 🐈‍⬛</div>';

        try {
            const usersRef = collection(db, "users");
            const q = query(usersRef, where("name", "==", keyword)); 
            const querySnapshot = await getDocs(q);
            
            searchResults.innerHTML = ''; 
            
            if (querySnapshot.empty) {
                searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ไม่พบผู้ใช้งานชื่อนี้ครับ</div>';
            } else {
                querySnapshot.forEach((docSnap) => {
                    const userData = docSnap.data();
                    const friendUid = docSnap.id;
                    
                    if(friendUid === currentUserUid) return;

                    const userCard = document.createElement('div');
                    userCard.style.display = 'flex';
                    userCard.style.alignItems = 'center';
                    userCard.style.justifyContent = 'space-between';

                    userCard.innerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <img src="${userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 44px; height: 44px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                            <div>
                                <strong style="display: block; font-size: 0.9rem;">${userData.name}</strong>
                                <span style="color: #a8a8a8; font-size: 0.8rem;">${userData.bio || 'ยังไม่มีสถานะ'}</span>
                            </div>
                        </div>
                    `;

                    const addBtn = document.createElement('button');
                    addBtn.textContent = 'เพิ่มเพื่อน';
                    addBtn.style.cssText = "background: #0095f6; color: white; border: none; padding: 6px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 0.85rem; transition: background 0.2s;";
                    
                    addBtn.onmouseover = () => { if(!addBtn.disabled) addBtn.style.background = '#1877f2'; };
                    addBtn.onmouseout = () => { if(!addBtn.disabled) addBtn.style.background = '#0095f6'; };

                    addBtn.addEventListener('click', async () => {
                        try {
                            addBtn.textContent = 'กำลังเพิ่ม...';
                            addBtn.style.background = '#363636';
                            addBtn.disabled = true;

                            const friendRef = doc(db, "users", currentUserUid, "friends", friendUid);
                            await setDoc(friendRef, {
                                name: userData.name,
                                profilePic: userData.profilePic || '',
                                addedAt: new Date()
                            });

                            addBtn.textContent = 'เป็นเพื่อนแล้ว';
                            addBtn.style.background = '#262626';
                            addBtn.style.color = '#a8a8a8';
                            addBtn.style.cursor = 'default';
                            loadFriendsList(); 
                        } catch (error) {
                            console.error("บันทึกเพื่อนไม่ได้: ", error);
                            addBtn.textContent = 'เพิ่มเพื่อน';
                            addBtn.style.background = '#0095f6';
                            addBtn.disabled = false;
                            alert("เกิดข้อผิดพลาด ลองใหม่อีกครั้งครับ");
                        }
                    });

                    userCard.appendChild(addBtn);
                    searchResults.appendChild(userCard);
                });
                
                if(searchResults.innerHTML === '') {
                     searchResults.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:20px;">ไม่พบผู้ใช้งานอื่นชื่อนี้ครับ</div>';
                }
            }
        } catch (e) {
            console.error("ค้นหาผิดพลาด: ", e);
            searchResults.innerHTML = '<div style="text-align:center; color:#ec4899; margin-top:20px;">เกิดข้อผิดพลาดในการเชื่อมต่อ</div>';
        }
    });
}

// ==========================================
// 🖼️ 2. ระบบดึงโพสต์มาแสดงที่หน้าหลัก (Feed)
// ==========================================
async function loadFeedPosts() {
    const feedContainer = document.querySelector('.feed');
    if (!feedContainer || !currentUserUid) return;

    try {
        const postsRef = collection(db, "posts");
        const postSnapshot = await getDocs(postsRef);

        feedContainer.innerHTML = ''; 

        if (postSnapshot.empty) {
            feedContainer.innerHTML = '<div style="text-align:center; color:#a8a8a8; margin-top:50px;">ยังไม่มีโพสต์เลย เริ่มสร้างโพสต์แรกของคุณสิ! 🐈‍⬛</div>';
            return;
        }

        let allPosts = [];
        postSnapshot.forEach((docSnap) => {
            allPosts.push({ id: docSnap.id, ...docSnap.data() });
        });
        allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        for (const post of allPosts) {
            const userDoc = await getDoc(doc(db, "users", post.uid));
            const userData = userDoc.exists() ? userDoc.data() : { name: "ผู้ใช้งาน", profilePic: "" };
            const profilePic = userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';
            
            const likes = post.likes || []; 
            const isLiked = likes.includes(currentUserUid);
            const heartIcon = isLiked ? '❤️' : '🤍';
        const likeCount = likes.length;

        // 🌟 เช็กว่าเป็นโพสต์ของเราไหม ถ้าใช่ให้สร้างปุ่มถังขยะ
        const isMyPost = post.uid === currentUserUid;
        const deleteBtnHTML = isMyPost ? `<span class="delete-post-btn" style="cursor: pointer; margin-left: auto; font-size: 1.2rem;" title="ลบโพสต์">🗑️</span>` : '';

        const timeText = timeAgo(post.createdAt); // คำนวณเวลาของโพสต์นี้
        const postElement = document.createElement('article');
        
        postElement.className = 'post';
        postElement.innerHTML = `
                <div class="post-header" style="display: flex; align-items: center;">
                    <a href="profile.html?uid=${post.uid}" style="text-decoration: none; display: flex; align-items: center; gap: 10px; color: inherit;">
                        <img src="${profilePic}" alt="Profile" style="cursor: pointer;">
                        <span class="username" style="cursor: pointer;">${userData.name}</span>
                    </a>
                    <span class="time" style="color: #a8a8a8; font-size: 0.8rem; margin-left: 8px;">• ${timeText}</span>
                </div>
                
                <div class="post-image" style="background: #121212;">
                    <img src="${post.imageUrl}" style="width: 100%; display: block;" alt="Post image">
                </div>
                <div class="post-actions" style="margin-top: 10px; font-size: 1.5rem; display: flex; gap: 15px; align-items: center;">
                    <span class="like-btn" style="cursor: pointer; transition: transform 0.2s;">${heartIcon}</span> 
                    <span class="comment-toggle-btn" style="cursor: pointer; transition: transform 0.2s;">💬</span> 
                    <span style="cursor: pointer;">📤</span>
                    ${deleteBtnHTML}
                </div>
                <div class="like-count-display" style="font-size: 0.9rem; font-weight: 600; margin-top: 5px;">
                    ${likeCount} ถูกใจ
                </div>
                <div class="post-caption" style="font-size: 0.9rem; margin-top: 5px; line-height: 1.5;">
                    <strong>${userData.name}</strong> ${post.caption}
                </div>

                <div class="comments-section" style="display: none; margin-top: 15px; border-top: 1px solid #262626; padding-top: 15px;">
                    <div class="comments-list" style="max-height: 150px; overflow-y: auto; margin-bottom: 10px; font-size: 0.85rem; display: flex; flex-direction: column; gap: 8px;">
                        <div style="text-align: center; color: #a8a8a8;">กำลังเตรียมช่องคอมเมนต์...</div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <input type="text" class="comment-input" placeholder="แสดงความคิดเห็น..." style="flex: 1; padding: 8px 15px; border-radius: 20px; border: 1px solid #363636; background: #121212; color: white; outline: none; font-size: 0.85rem;">
                        <button class="send-comment-btn" style="background: transparent; color: #0095f6; border: none; font-weight: bold; cursor: pointer; padding: 0 10px;">โพสต์</button>
                    </div>
                </div>
            `;

            // ดึงปุ่มต่างๆ บนโพสต์มาเตรียมไว้
            const likeBtn = postElement.querySelector('.like-btn');
            const likeCountDisplay = postElement.querySelector('.like-count-display');
            
            // 🌟 แทรกโค้ดดึงปุ่มคอมเมนต์เพิ่มตรงนี้ครับ! 🌟
            const commentToggleBtn = postElement.querySelector('.comment-toggle-btn');
            const commentsSection = postElement.querySelector('.comments-section');

            // 🌟 คำสั่งเมื่อกดปุ่มไอคอนแชท 💬 ให้เปิด/ปิดกล่องคอมเมนต์
            commentToggleBtn.addEventListener('click', () => {
                // ใส่เอฟเฟกต์เด้งดึ๋งให้ปุ่มน่ารักๆ
                commentToggleBtn.style.transform = 'scale(1.3)';
                setTimeout(() => commentToggleBtn.style.transform = 'scale(1)', 150);

                // สลับโชว์/ซ่อน กล่องคอมเมนต์
                if (commentsSection.style.display === 'none') {
                    commentsSection.style.display = 'block';
                } else {
                    commentsSection.style.display = 'none';
                }
            });
            // ==========================================
            // 🌟 3. ระบบดึงและส่งคอมเมนต์ 🌟
            // ==========================================
            const sendCommentBtn = postElement.querySelector('.send-comment-btn');
            const commentInput = postElement.querySelector('.comment-input');
            const commentsList = postElement.querySelector('.comments-list');

            // 3.1 ฟังก์ชันดึงคอมเมนต์มาแสดง
            const loadComments = async () => {
                try {
                    // เข้าไปที่โฟลเดอร์ comments ย่อยของโพสต์นั้นๆ
                    const commentsRef = collection(db, "posts", post.id, "comments");
                    const qSnap = await getDocs(commentsRef);
                    
                    commentsList.innerHTML = ''; // ล้างคำว่ากำลังเตรียมช่องคอมเมนต์
                    
                    if (qSnap.empty) {
                        commentsList.innerHTML = '<div style="text-align: center; color: #555; padding: 10px 0;">ยังไม่มีคอมเมนต์ เริ่มพิมพ์คนแรกเลย! 💬</div>';
                        return;
                    }

                    let allComments = [];
                    qSnap.forEach(doc => allComments.push(doc.data()));
                    // เรียงเวลาจากเก่าไปใหม่ (บนลงล่าง)
                    allComments.sort((a, b) => a.createdAt - b.createdAt);

                    allComments.forEach(c => {
                        const cEl = document.createElement('div');
                        cEl.style.cssText = "display: flex; gap: 10px; margin-bottom: 8px; align-items: flex-start;";
                        cEl.innerHTML = `
                            <img src="${c.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 24px; height: 24px; border-radius: 50%; object-fit: cover; border: 1px solid #262626; margin-top: 2px;">
                            <div style="background: #1a1a1a; padding: 6px 12px; border-radius: 15px; border-top-left-radius: 4px; max-width: 85%;">
                                <strong style="color: #f5f5f5; font-size: 0.8rem; display: block; margin-bottom: 2px;">${c.name}</strong> 
                                <span style="color: #ccc; font-size: 0.85rem; line-height: 1.4;">${c.text}</span>
                            </div>
                        `;
                        commentsList.appendChild(cEl);
                    });
                } catch (err) {
                    console.error("โหลดคอมเมนต์พัง:", err);
                }
            };

            // สั่งให้โหลดคอมเมนต์ทันทีที่หน้าฟีดโชว์ขึ้นมา
            loadComments();

            // 3.2 คำสั่งตอนกดปุ่ม "โพสต์" เพื่อส่งคอมเมนต์
            sendCommentBtn.addEventListener('click', async () => {
                const text = commentInput.value.trim();
                if (!text) return; // ถ้าพิมพ์ช่องว่างเฉยๆ ไม่ต้องส่ง
                
                try {
                    sendCommentBtn.textContent = '...';
                    sendCommentBtn.disabled = true;

                    // เอาข้อมูลชื่อและรูปเราไปแปะในคอมเมนต์ด้วย จะได้โชว์ได้ทันที
                    const myDoc = await getDoc(doc(db, "users", currentUserUid));
                    const myData = myDoc.exists() ? myDoc.data() : { name: "ฉันเอง", profilePic: "" };

                    // บันทึกลงฐานข้อมูล
                    await addDoc(collection(db, "posts", post.id, "comments"), {
                        uid: currentUserUid,
                        name: myData.name || "ผู้ใช้งาน",
                        profilePic: myData.profilePic || "",
                        text: text,
                        createdAt: Date.now() 
                    });

                    // 🌟 ส่งแจ้งเตือนหาเจ้าของโพสต์ด้วย (ถ้าไม่ใช่โพสต์เราเอง)
                    if (post.uid !== currentUserUid) {
                        await addDoc(collection(db, "notifications"), {
                            receiverId: post.uid,
                            senderId: currentUserUid,
                            type: "comment",
                            postId: post.id,
                            createdAt: serverTimestamp(),
                            read: false
                        });
                    }

                    commentInput.value = ''; // ล้างช่องพิมพ์
                    await loadComments(); // รีเฟรชคอมเมนต์ใหม่ให้โชว์เด้งขึ้นมาเลย

                } catch (err) {
                    console.error("ส่งคอมเมนต์ไม่ได้:", err);
                } finally {
                    sendCommentBtn.textContent = 'โพสต์';
                    sendCommentBtn.disabled = false;
                }
            });
            // ฟังก์ชันกดหัวใจ (มีระบบส่งแจ้งเตือนในตัวแบบสมบูรณ์)
            likeBtn.addEventListener('click', async () => {
                likeBtn.style.transform = 'scale(1.3)';
                setTimeout(() => likeBtn.style.transform = 'scale(1)', 150);

                const postRef = doc(db, "posts", post.id);
                try {
                    if (likeBtn.textContent === '🤍') {
                        likeBtn.textContent = '❤️';
                        likes.push(currentUserUid);
                        likeCountDisplay.textContent = `${likes.length} ถูกใจ`;
                        
                        await updateDoc(postRef, { likes: arrayUnion(currentUserUid) });

                        // 🌟 ส่งสัญญาณแจ้งเตือนไปที่คอลเล็กชัน notifications
                        await addDoc(collection(db, "notifications"), {
                            receiverId: post.uid,         
                            senderId: currentUserUid,     
                            type: "like",
                            postId: post.id,
                            createdAt: serverTimestamp(),
                            read: false
                        });

                    } else {
                        likeBtn.textContent = '🤍';
                        const index = likes.indexOf(currentUserUid);
                        if (index > -1) likes.splice(index, 1);
                        likeCountDisplay.textContent = `${likes.length} ถูกใจ`;
                        
                        await updateDoc(postRef, { likes: arrayRemove(currentUserUid) });
                    }
                } catch (error) {
                    console.error("กดหัวใจไม่สำเร็จ:", error);
                }
            });
             // 🌟 ระบบกดปุ่มลบโพสต์
        if (isMyPost) {
            const deleteBtn = postElement.querySelector('.delete-post-btn');
            deleteBtn.addEventListener('click', async () => {
                const confirmDelete = confirm("แน่ใจนะว่าจะลบโพสต์นี้ทิ้ง? 😿");
                if (confirmDelete) {
                    try {
                        // ลบข้อมูลออกจากฐานข้อมูล Firebase
                        await deleteDoc(doc(db, "posts", post.id));
                        // รีเฟรชหน้าจอใหม่ให้โพสต์หายไป
                        loadFeedPosts(); 
                    } catch (error) {
                        console.error("ลบโพสต์ไม่สำเร็จ:", error);
                        alert("เกิดข้อผิดพลาดในการลบโพสต์ครับ");
                    }
                }
            });
        }
            feedContainer.appendChild(postElement);
        }
    } catch (e) {
        console.error("โหลดโพสต์ผิดพลาด: ", e);
    }
}

// ==========================================
//👥 3. ฟังก์ชันดึงรายชื่อเพื่อนมาแสดงที่แผงด้านขวา
// ==========================================
async function loadFriendsList() {
    const friendsContainer = document.getElementById('friends-list-container');
    if (!friendsContainer || !currentUserUid) return;

    try {
        const friendsRef = collection(db, "users", currentUserUid, "friends");
        const snapshot = await getDocs(friendsRef);

        friendsContainer.innerHTML = ''; 

        if (snapshot.empty) {
            friendsContainer.innerHTML = '<div style="text-align: center; color: #a8a8a8; font-size: 0.8rem;">ยังไม่มีเพื่อน ลองค้นหาเพื่อนดูสิ! 🔍</div>';
            return;
        }

        snapshot.forEach((docSnap) => {
            const friend = docSnap.data();
            const friendElement = document.createElement('div');
            friendElement.style.cssText = "display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;";
            
            friendElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <img src="${friend.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png'}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover; border: 1px solid #262626;">
                    <div style="display: flex; flex-direction: column;">
                        <strong style="font-size: 0.85rem; color: #f5f5f5;">${friend.name}</strong>
                        <span style="font-size: 0.75rem; color: #a8a8a8;">เป็นเพื่อนกันแล้ว</span>
                    </div>
                </div>
                <a href="chat.html" style="background: transparent; color: #0095f6; border: none; font-size: 0.75rem; font-weight: 600; cursor: pointer; text-decoration: none;">แชท</a>
            `;
            friendsContainer.appendChild(friendElement);
        });
    } catch (error) {
        console.error("โหลดรายชื่อเพื่อนผิดพลาด:", error);
        friendsContainer.innerHTML = '<div style="color: #ec4899; font-size: 0.8rem; text-align: center;">โหลดข้อมูลล้มเหลว</div>';
    }
}

// ==========================================
// 📸 4. ระบบสร้างโพสต์ (Create Post)
// ==========================================
const createBtn = document.getElementById('create-nav-btn');
const createModal = document.getElementById('create-post-modal');
const closeCreateBtn = document.getElementById('close-create-btn');
const postImageUpload = document.getElementById('post-image-upload');
const postImagePreview = document.getElementById('post-image-preview');
const uploadPlaceholder = document.getElementById('upload-placeholder');

if (createBtn && createModal) {
    createBtn.addEventListener('click', (e) => {
        e.preventDefault();
        createModal.style.display = 'flex';
    });
}
if (closeCreateBtn && createModal) {
    closeCreateBtn.addEventListener('click', () => {
        createModal.style.display = 'none';
    });
}

if (postImageUpload) {
    postImageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        if (file.size > 1024 * 1024) {
            alert("ไฟล์รูปใหญ่เกินไปครับ! (ขอไม่เกิน 1MB นะ)");
            return;
        }
        const reader = new FileReader();
        reader.readAsDataURL(file); 
        reader.onload = () => {
            postBase64Image = reader.result; 
            if(postImagePreview && uploadPlaceholder) {
                postImagePreview.src = postBase64Image;
                postImagePreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            }
        };
    });
}

const sharePostBtn = document.getElementById('share-post-btn');
if (sharePostBtn) {
    sharePostBtn.addEventListener('click', async () => {
        const caption = document.getElementById('post-caption').value.trim();
        if (!postBase64Image) {
            alert("กรุณาเลือกรูปภาพก่อนครับ!");
            return;
        }
        try {
            sharePostBtn.textContent = 'กำลังแชร์...';
            sharePostBtn.style.background = '#363636';
            sharePostBtn.disabled = true;

            const postId = "post_" + Date.now().toString(); 
            const newPostRef = doc(db, "posts", postId); 
            
            await setDoc(newPostRef, {
                uid: currentUserUid,
                imageUrl: postBase64Image,
                caption: caption,
                likes: [],
                createdAt: new Date().toISOString()
            });

            alert("แชร์โพสต์สำเร็จ! 🎉");
            if(createModal) createModal.style.display = 'none';
            
            postBase64Image = "";
            if(postImagePreview) {
                postImagePreview.src = "";
                postImagePreview.style.display = 'none';
            }
            if(uploadPlaceholder) uploadPlaceholder.style.display = 'block';
            const captionInput = document.getElementById('post-caption');
            if (captionInput) captionInput.value = '';

            loadFeedPosts(); 
        } catch (error) {
            console.error("สร้างโพสต์ไม่ได้: ", error);
            alert("เกิดข้อผิดพลาดในการแชร์โพสต์");
        } finally {
            sharePostBtn.textContent = 'แชร์โพสต์';
            sharePostBtn.style.background = '#ec4899';
            sharePostBtn.disabled = false;
        }
    });
}

// ==========================================
// 🚪 5. ระบบออกจากระบบ (Logout)
// ==========================================
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
        signOut(auth).then(() => {
            window.location.href = "index.html";
        }).catch((error) => console.error("ออกจากระบบไม่ได้:", error));
    });
}
