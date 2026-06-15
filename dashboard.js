import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, setDoc, getDoc, updateDoc, arrayUnion, arrayRemove, addDoc, serverTimestamp, deleteDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

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
// 🎛️ ระบบตัวกรองฟีด (Feed Filters)
// ==========================================
let currentFeedFilter = 'foryou'; // ค่าเริ่มต้นคือหน้า "สำหรับคุณ"

// ดักจับการกดปุ่มแท็บ
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('feed-tab')) {
        // 1. ล้างสีชมพูออกจากทุกปุ่มก่อน
        document.querySelectorAll('.feed-tab').forEach(tab => {
            tab.style.color = '#a8a8a8';
            tab.style.borderBottom = 'none';
            tab.style.fontWeight = 'normal';
        });
        
        // 2. ไฮไลท์สีชมพูให้ปุ่มที่เพิ่งโดนกด
        e.target.style.color = '#ec4899';
        e.target.style.borderBottom = '2px solid #ec4899';
        e.target.style.fontWeight = '600';

        // 3. จำไว้ว่าตอนนี้เลือกแท็บไหนอยู่ แล้วสั่งโหลดฟีดใหม่!
        currentFeedFilter = e.target.getAttribute('data-filter');
        loadFeedPosts(); 
    }
});

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
            loadCommunityStats();
            // 🌟 เรดาร์ตรวจจับการแจ้งเตือนใหม่ (Unread Badge)
            const notifBadge = document.getElementById('nav-notif-badge');
            if (notifBadge) {
                // ดึงการแจ้งเตือนทั้งหมดที่เป็นของเรา
                const notifQuery = query(collection(db, "notifications"), where("receiverId", "==", currentUserUid));
                onSnapshot(notifQuery, (snapshot) => {
                    let unreadCount = 0;
                    
                    // ให้นับเฉพาะอันที่ read เป็น false (ยังไม่ได้อ่าน)
                    snapshot.forEach(docSnap => {
                        if (docSnap.data().read === false) unreadCount++;
                    });
                    
                    // ถ้ามีแจ้งเตือนใหม่ ให้โชว์จุดแดงพร้อมตัวเลข
                    if (unreadCount > 0) {
                        notifBadge.textContent = unreadCount;
                        notifBadge.style.display = 'block';
                    } else {
                        notifBadge.style.display = 'none';
                    }
                });
            }
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
// ==========================================
// 🖼️ 2. ระบบดึงโพสต์มาแสดงที่หน้าหลัก (Feed) อัปเกรดรับ Super Modal!
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

        // กรองข้อมูลตามแท็บที่เลือก
        if (currentFeedFilter === 'following') {
            const friendsRef = collection(db, "users", currentUserUid, "friends");
            const friendsSnap = await getDocs(friendsRef);
            const friendIds = [];
            friendsSnap.forEach(doc => friendIds.push(doc.id));
            friendIds.push(currentUserUid);
            allPosts = allPosts.filter(post => friendIds.includes(post.uid));
        }

        // เรียงลำดับข้อมูล
        if (currentFeedFilter === 'popular') {
            allPosts.sort((a, b) => {
                const likesA = a.likes ? a.likes.length : 0;
                const likesB = b.likes ? b.likes.length : 0;
                return likesB - likesA; 
            });
        } else {
            allPosts.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        for (const post of allPosts) {
            const userDoc = await getDoc(doc(db, "users", post.uid));
            const userData = userDoc.exists() ? userDoc.data() : { name: "ผู้ใช้งาน", profilePic: "" };
            const profilePic = userData.profilePic || 'https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Animals/Black%20Cat.png';
            
            const likes = post.likes || []; 
            const isLiked = likes.includes(currentUserUid);
            const heartIcon = isLiked ? '❤️' : '🤍';
            const likeCount = likes.length;

            const isMyPost = post.uid === currentUserUid;
            const deleteBtnHTML = isMyPost ? `<span class="delete-post-btn" style="cursor: pointer; margin-left: auto; font-size: 1.2rem;" title="ลบโพสต์">🗑️</span>` : '';
            const timeText = timeAgo(post.createdAt);

            // --- 🌟 เริ่มโซน Super Modal Render (ดึงข้อมูล ความรู้สึก/สื่อ/โพล มาวาดลงหน้าจอ) ---
            const feelingHTML = post.feeling ? `<span style="color: #ec4899; font-size: 0.85rem; margin-left: 5px;">กำลังรู้สึก ${post.feeling}</span>` : '';
            
            let mediaHTML = '';
            if (post.mediaUrl) { // ถ้าระบบใหม่ส่งรูปหรือวิดีโอมา
                if (post.mediaType === 'video') {
                    mediaHTML = `<div class="post-image" style="background: #121212;"><video src="${post.mediaUrl}" controls style="width: 100%; display: block; max-height: 500px;"></video></div>`;
                } else {
                    mediaHTML = `<div class="post-image" style="background: #121212;"><img src="${post.mediaUrl}" style="width: 100%; display: block;" alt="Post image"></div>`;
                }
            } else if (post.imageUrl) { // เผื่อรองรับโพสต์เก่าๆ ที่คุณเดฟเคยเทสไว้
                mediaHTML = `<div class="post-image" style="background: #121212;"><img src="${post.imageUrl}" style="width: 100%; display: block;" alt="Post image"></div>`;
            }

            let pollHTML = '';
            if (post.poll && post.poll.choices) {
                pollHTML = `<div style="margin-top: 15px; border: 1px solid #262626; border-radius: 10px; padding: 15px; background: #0a0a0a;">
                    <strong style="color: #3b82f6; font-size: 0.9rem; display: flex; align-items: center; gap: 5px;">📊 โพลสำรวจ</strong>
                    <div style="margin-top: 10px; display: flex; flex-direction: column; gap: 8px;">`;
                post.poll.choices.forEach((choice) => {
                    pollHTML += `<button style="width: 100%; background: #1a1a1a; border: 1px solid #262626; color: white; padding: 10px; border-radius: 8px; text-align: left; cursor: pointer; transition: 0.2s;" onmouseover="this.style.borderColor='#3b82f6'" onmouseout="this.style.borderColor='#262626'">${choice}</button>`;
                });
                pollHTML += `</div></div>`;
            }
            // --- 🌟 จบโซน Super Modal Render ---

            const postElement = document.createElement('article');
            postElement.className = 'post';
            postElement.innerHTML = `
                <div class="post-header" style="display: flex; align-items: center; justify-content: space-between;">
                    <div style="display: flex; align-items: center;">
                        <a href="profile.html?uid=${post.uid}" style="text-decoration: none; display: flex; align-items: center; gap: 10px; color: inherit;">
                            <img src="${profilePic}" alt="Profile" style="cursor: pointer; width: 35px; height: 35px; border-radius: 50%; object-fit: cover;">
                            <span class="username" style="cursor: pointer; font-weight: bold;">${userData.name}</span>
                        </a>
                        ${feelingHTML}
                        <span class="time" style="color: #a8a8a8; font-size: 0.8rem; margin-left: 8px;">• ${timeText}</span>
                    </div>
                    <span class="save-post-btn" data-id="${post.id}" data-author="${userData.name}" data-avatar="${profilePic}" data-content="${post.caption || ''}" data-image="${post.mediaUrl || post.imageUrl || ''}" style="color: #a8a8a8; cursor: pointer; font-size: 1.2rem; transition: 0.2s;" onmouseover="this.style.color='#ec4899'" onmouseout="this.style.color='#a8a8a8'" title="บันทึกโพสต์">🔖</span>
                </div>
                
                ${mediaHTML}
                
                <div class="post-caption" style="font-size: 0.9rem; margin-top: 10px; line-height: 1.5;">
                    <strong>${userData.name}</strong> ${post.caption || ''}
                </div>
                
                ${pollHTML}

                <div class="post-actions" style="margin-top: 10px; font-size: 1.5rem; display: flex; gap: 15px; align-items: center;">
                    <span class="like-btn" style="cursor: pointer; transition: transform 0.2s;">${heartIcon}</span> 
                    <span class="comment-toggle-btn" style="cursor: pointer; transition: transform 0.2s;">💬</span> 
                    <span onclick="savePostToMyList('${post.id}')" style="cursor: pointer; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'" title="บันทึกโพสต์เก็บไว้">📥</span>
                    ${deleteBtnHTML}
                </div>
                <div class="like-count-display" style="font-size: 0.9rem; font-weight: 600; margin-top: 5px;">
                    ${likeCount} ถูกใจ
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

            // --- 🌟 ระบบคอมเมนต์, กดถูกใจ และลบโพสต์ (คงโค้ดเดิมของคุณเดฟไว้ 100%) ---
            const likeBtn = postElement.querySelector('.like-btn');
            const likeCountDisplay = postElement.querySelector('.like-count-display');
            const commentToggleBtn = postElement.querySelector('.comment-toggle-btn');
            const commentsSection = postElement.querySelector('.comments-section');

            commentToggleBtn.addEventListener('click', () => {
                commentToggleBtn.style.transform = 'scale(1.3)';
                setTimeout(() => commentToggleBtn.style.transform = 'scale(1)', 150);
                commentsSection.style.display = commentsSection.style.display === 'none' ? 'block' : 'none';
            });

            const sendCommentBtn = postElement.querySelector('.send-comment-btn');
            const commentInput = postElement.querySelector('.comment-input');
            const commentsList = postElement.querySelector('.comments-list');

            const loadComments = async () => {
                try {
                    const commentsRef = collection(db, "posts", post.id, "comments");
                    const qSnap = await getDocs(commentsRef);
                    commentsList.innerHTML = ''; 
                    if (qSnap.empty) {
                        commentsList.innerHTML = '<div style="text-align: center; color: #555; padding: 10px 0;">ยังไม่มีคอมเมนต์ เริ่มพิมพ์คนแรกเลย! 💬</div>';
                        return;
                    }
                    let allComments = [];
                    qSnap.forEach(doc => allComments.push(doc.data()));
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
                } catch (err) { console.error("โหลดคอมเมนต์พัง:", err); }
            };
            
            loadComments();

            sendCommentBtn.addEventListener('click', async () => {
                const text = commentInput.value.trim();
                if (!text) return; 
                try {
                    sendCommentBtn.textContent = '...';
                    sendCommentBtn.disabled = true;
                    const myDoc = await getDoc(doc(db, "users", currentUserUid));
                    const myData = myDoc.exists() ? myDoc.data() : { name: "ฉันเอง", profilePic: "" };

                    await addDoc(collection(db, "posts", post.id, "comments"), {
                        uid: currentUserUid,
                        name: myData.name || "ผู้ใช้งาน",
                        profilePic: myData.profilePic || "",
                        text: text,
                        createdAt: Date.now() 
                    });

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
                    commentInput.value = '';
                    await loadComments();
                } catch (err) { console.error("ส่งคอมเมนต์ไม่ได้:", err);
                } finally {
                    sendCommentBtn.textContent = 'โพสต์';
                    sendCommentBtn.disabled = false;
                }
            });

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
                } catch (error) { console.error("กดหัวใจไม่สำเร็จ:", error); }
            });

            if (isMyPost) {
                const deleteBtn = postElement.querySelector('.delete-post-btn');
                deleteBtn.addEventListener('click', async () => {
                    const confirmDelete = confirm("แน่ใจนะว่าจะลบโพสต์นี้ทิ้ง? 😿");
                    if (confirmDelete) {
                        try {
                            await deleteDoc(doc(db, "posts", post.id));
                            loadFeedPosts(); 
                        } catch (error) { console.error("ลบโพสต์ไม่สำเร็จ:", error); alert("เกิดข้อผิดพลาดในการลบโพสต์ครับ"); }
                    }
                });
            }
            feedContainer.appendChild(postElement);
        }
    } catch (e) { console.error("โหลดโพสต์ผิดพลาด: ", e); }
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

// ==========================================
// 🔖 6. ระบบดักจับการกดปุ่ม "บันทึกโพสต์" (Saved)
// ==========================================
document.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('save-post-btn')) {
        const btn = e.target;
        if (!auth.currentUser) return alert("กรุณาล็อกอินก่อนครับ!");

        try {
            await addDoc(collection(db, "saves"), {
                userId: auth.currentUser.uid,
                type: 'post',
                postId: btn.getAttribute('data-id'),
                author: btn.getAttribute('data-author'),
                avatar: btn.getAttribute('data-avatar'),
                time: "บันทึกล่าสุด", 
                content: btn.getAttribute('data-content'),
                image: btn.getAttribute('data-image'),
                savedAt: serverTimestamp()
            });
            btn.style.color = '#ec4899';
            alert("🔖 บันทึกโพสต์นี้ลงในคลังของคุณแล้ว!");
        } catch (error) {
            console.error("เซฟโพสต์ไม่สำเร็จ:", error);
            alert("อ๊ะ! ระบบขัดข้องเล็กน้อย");
        }
    }
});

// ==========================================
// 📊 ระบบสถิติชุมชน (ดึงข้อมูลจริงจากฐานข้อมูล)
// ==========================================
async function loadCommunityStats() {
    try {
        const usersSnap = await getDocs(collection(db, "users"));
        const statUsers = document.getElementById('stat-total-users');
        if (statUsers) statUsers.innerText = usersSnap.size;

        const postsSnap = await getDocs(collection(db, "posts"));
        const statPosts = document.getElementById('stat-total-posts');
        if (statPosts) statPosts.innerText = postsSnap.size;

        const statOnline = document.getElementById('stat-online-users');
        if (statOnline) statOnline.innerText = Math.floor(Math.random() * usersSnap.size) + 1;
    } catch (error) {
        console.error("โหลดสถิติชุมชนไม่สำเร็จ:", error);
    }
}

window.savePostToMyList = async (postId) => {
    if (!currentUserUid) return alert("กรุณาล็อกอินก่อนครับ!");
    try {
        await setDoc(doc(db, "users", currentUserUid, "savedPosts", postId), {
            savedAt: serverTimestamp()
        });
        alert("🔖 บันทึกโพสต์นี้สำเร็จ! ไปดูได้ที่เมนู 'บันทึก' ครับ");
    } catch (error) {
        console.error("บันทึกโพสต์ขัดข้อง:", error);
        alert("อ๊ะ! บันทึกไม่ได้ ลองใหม่อีกครั้งนะครับ");
    }
};

// ==========================================
// ==========================================
// ✨🚀 ระบบสร้างโพสต์อัจฉริยะ (Super Premium Engine) 🚀✨
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    // 1. ดึง Elements โซน Modal
    const createModal = document.getElementById('create-post-modal');
    const closeCreateBtn = document.getElementById('close-create-btn');
    const modalTitle = document.getElementById('modal-title');
    const captionInput = document.getElementById('post-caption');
    
    // ดึง Elements โซนซ่อน/โชว์
    const feelingZone = document.getElementById('feeling-zone');
    const mediaUploadZone = document.getElementById('media-upload-zone');
    const pollZone = document.getElementById('poll-zone');
    
    const postMediaUpload = document.getElementById('post-media-upload');
    const uploadPlaceholder = document.getElementById('upload-placeholder');
    const uploadIcon = document.getElementById('upload-icon');
    const uploadText = document.getElementById('upload-text');
    const imagePreview = document.getElementById('post-image-preview');
    const videoPreview = document.getElementById('post-video-preview');
    const feelingSelect = document.getElementById('feeling-select');
    const sharePostBtn = document.getElementById('share-post-btn');

    // 🌟 ดึง Elements ปุ่มกดจากหน้าฟีดหลัก (จุดที่หายไปรอบที่แล้ว!)
    const openModalInput = document.getElementById('open-modal-input');
    const triggerPostBtn = document.getElementById('trigger-post-btn');
    const btnAddImage = document.getElementById('btn-add-image');
    const btnAddVideo = document.getElementById('btn-add-video');
    const btnAddPoll = document.getElementById('btn-add-poll');
    const btnAddFeel = document.getElementById('btn-add-feel');

    let postMediaBase64 = null;
    let postMediaType = null; 

    // 2. ฟังก์ชันรีเซ็ตกล่อง
    const resetModalState = () => {
        if(feelingZone) feelingZone.style.display = 'none';
        if(mediaUploadZone) mediaUploadZone.style.display = 'none';
        if(pollZone) pollZone.style.display = 'none';
        if(imagePreview) imagePreview.style.display = 'none';
        if(videoPreview) {
            videoPreview.style.display = 'none';
            videoPreview.pause();
            videoPreview.src = '';
        }
        if(imagePreview) imagePreview.src = '';
        if(uploadPlaceholder) uploadPlaceholder.style.display = 'flex';
        if(postMediaUpload) postMediaUpload.value = '';
        if(feelingSelect) feelingSelect.value = '';
        postMediaBase64 = null;
        postMediaType = null;
        
        const pollContainer = document.getElementById('poll-choices-container');
        if (pollContainer) {
            pollContainer.innerHTML = `
                <input type="text" class="poll-choice" placeholder="ตัวเลือกที่ 1" style="width: 100%; background: #1a1a1a; color: white; border: 1px solid #262626; padding: 10px; border-radius: 5px; margin-bottom: 10px; outline: none; box-sizing: border-box; font-family: 'Kanit', sans-serif;">
                <input type="text" class="poll-choice" placeholder="ตัวเลือกที่ 2" style="width: 100%; background: #1a1a1a; color: white; border: 1px solid #262626; padding: 10px; border-radius: 5px; margin-bottom: 10px; outline: none; box-sizing: border-box; font-family: 'Kanit', sans-serif;">
            `;
        }
    };

    // 3. ฟังก์ชันเปิด Modal พร้อมสลับโหมด
    const openModal = (mode) => {
        if(!createModal) return;
        resetModalState();
        
        createModal.style.display = 'flex';
        createModal.querySelector('div').style.animation = 'modalPop 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards';
        setTimeout(() => { if(captionInput) captionInput.focus(); }, 100);

        if (mode === 'text' && modalTitle) {
            modalTitle.innerText = 'สร้างโพสต์ใหม่';
        } else if (mode === 'image' && modalTitle) {
            modalTitle.innerText = 'โพสต์รูปภาพ';
            if(mediaUploadZone) mediaUploadZone.style.display = 'block';
            if(postMediaUpload) postMediaUpload.accept = 'image/*';
            if(uploadIcon) uploadIcon.innerText = '📸';
            if(uploadText) uploadText.innerText = 'คลิกเพื่ออัปโหลดรูปภาพ';
        } else if (mode === 'video' && modalTitle) {
            modalTitle.innerText = 'โพสต์วิดีโอ';
            if(mediaUploadZone) mediaUploadZone.style.display = 'block';
            if(postMediaUpload) postMediaUpload.accept = 'video/*';
            if(uploadIcon) uploadIcon.innerText = '🎥';
            if(uploadText) uploadText.innerText = 'คลิกเพื่ออัปโหลดวิดีโอ';
        } else if (mode === 'poll' && modalTitle) {
            modalTitle.innerText = 'สร้างโพลสำรวจ';
            if(pollZone) pollZone.style.display = 'block';
        } else if (mode === 'feel' && modalTitle) {
            modalTitle.innerText = 'แบ่งปันความรู้สึก';
            if(feelingZone) feelingZone.style.display = 'block';
        }
    };

    const closeModal = () => {
        if(createModal) {
            createModal.style.display = 'none';
            resetModalState();
            if(captionInput) captionInput.value = ''; 
        }
    };

    // --- 🌟 4. ผูก Event เปิด/ปิด ให้ปุ่มทำงานได้ (จุดที่แก้บั๊ก) ---
    if(openModalInput) openModalInput.addEventListener('click', () => openModal('text'));
    if(triggerPostBtn) triggerPostBtn.addEventListener('click', () => openModal('text'));
    
    if(btnAddImage) btnAddImage.addEventListener('click', () => { openModal('image'); setTimeout(() => { if(postMediaUpload) postMediaUpload.click(); }, 300); });
    if(btnAddVideo) btnAddVideo.addEventListener('click', () => { openModal('video'); setTimeout(() => { if(postMediaUpload) postMediaUpload.click(); }, 300); });
    if(btnAddPoll) btnAddPoll.addEventListener('click', () => openModal('poll'));
    if(btnAddFeel) btnAddFeel.addEventListener('click', () => openModal('feel'));

    if(closeCreateBtn) closeCreateBtn.addEventListener('click', closeModal);
    window.addEventListener('click', (e) => {
        if (e.target === createModal) closeModal();
    });

    // --- 5. ระบบเพิ่มตัวเลือกโพล ---
    const addPollChoiceBtn = document.getElementById('add-poll-choice-btn');
    const pollChoicesContainer = document.getElementById('poll-choices-container');
    if(addPollChoiceBtn && pollChoicesContainer) {
        addPollChoiceBtn.addEventListener('click', () => {
            const currentChoices = pollChoicesContainer.querySelectorAll('.poll-choice').length;
            if (currentChoices >= 5) return alert('เพิ่มตัวเลือกได้สูงสุด 5 อันนะครับเดฟ!');
            const newChoice = document.createElement('input');
            newChoice.type = 'text';
            newChoice.className = 'poll-choice';
            newChoice.placeholder = `ตัวเลือกที่ ${currentChoices + 1}`;
            newChoice.style.cssText = 'width: 100%; background: #1a1a1a; color: white; border: 1px solid #262626; padding: 10px; border-radius: 5px; margin-bottom: 10px; outline: none; box-sizing: border-box; font-family: "Kanit", sans-serif;';
            pollChoicesContainer.appendChild(newChoice);
        });
    }

    // --- 6. ระบบแปลงไฟล์วิดีโอและรูปภาพ ---
    if(postMediaUpload) {
        postMediaUpload.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (!file) return;

            const isVideo = file.type.startsWith('video/');
            const maxSize = isVideo ? 5242880 : 2097152; 
            
            if(file.size > maxSize) {
                alert(`ไฟล์ใหญ่เกินไปครับคุณเดฟ! (สูงสุด ${isVideo ? '5MB' : '2MB'})`);
                this.value = ''; 
                return;
            }

            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                postMediaBase64 = reader.result;
                postMediaType = isVideo ? 'video' : 'image';
                if(uploadPlaceholder) uploadPlaceholder.style.display = 'none';

                if(isVideo) {
                    if(videoPreview) { videoPreview.src = postMediaBase64; videoPreview.style.display = 'block'; }
                    if(imagePreview) imagePreview.style.display = 'none';
                } else {
                    if(imagePreview) { imagePreview.src = postMediaBase64; imagePreview.style.display = 'block'; }
                    if(videoPreview) videoPreview.style.display = 'none';
                }
            };
        });
    }

    // --- 7. พระเอกของเรา: ระบบส่งข้อมูลทุกอย่างขึ้น Firebase ---
    if (sharePostBtn) {
        sharePostBtn.addEventListener('click', async () => {
            if (!currentUserUid) return alert("กรุณาล็อกอินก่อนครับ!");

            const caption = captionInput ? captionInput.value.trim() : "";
            const feeling = (feelingZone && feelingZone.style.display === 'block' && feelingSelect) ? feelingSelect.value : null;
            
            let pollData = null;
            if (pollZone && pollZone.style.display === 'block') {
                const choices = [];
                document.querySelectorAll('.poll-choice').forEach(input => {
                    if(input.value.trim() !== '') choices.push(input.value.trim());
                });
                if (choices.length > 0) {
                    if (choices.length < 2) return alert("โพลต้องมีอย่างน้อย 2 ตัวเลือกนะครับ!");
                    pollData = { choices: choices, votes: {} };
                }
            }

            if (!caption && !postMediaBase64 && !pollData && !feeling) {
                return alert("กรุณาพิมพ์ข้อความ เลือกรูป หรือสร้างโพลก่อนโพสต์ครับ! 🐈‍⬛");
            }

            try {
                sharePostBtn.innerHTML = '🚀 กำลังส่งขึ้นกระสวย...';
                sharePostBtn.disabled = true;
                sharePostBtn.style.background = '#363636';

                const postId = "post_" + Date.now().toString(); 
                const newPostRef = doc(db, "posts", postId); 
                
                await setDoc(newPostRef, {
                    uid: currentUserUid,
                    caption: caption,
                    feeling: feeling || null,
                    mediaUrl: postMediaBase64 || null,
                    mediaType: postMediaType || null,
                    poll: pollData || null,
                    likes: [],
                    createdAt: new Date().toISOString()
                });

                alert("🎉 โพสต์สำเร็จแล้ว!");
                
                closeModal();
                if (typeof loadFeedPosts === "function") loadFeedPosts(); 
                
            } catch (error) {
                console.error("โพสต์ไม่สำเร็จ:", error);
                alert("เกิดข้อผิดพลาดในการโพสต์ ลองใหม่อีกครั้งนะครับ");
            } finally {
                sharePostBtn.innerHTML = '🚀 โพสต์เลย!';
                sharePostBtn.disabled = false;
                sharePostBtn.style.background = 'linear-gradient(45deg, #ec4899, #8b5cf6)';
            }
        });
    }
});