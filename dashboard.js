import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    doc, getDoc, setDoc, collection, addDoc, serverTimestamp, 
    query, orderBy, onSnapshot, where, updateDoc, arrayUnion 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

        
document.addEventListener('DOMContentLoaded', () => {
    // --- 1. GSAP ENTRANCE ---
    gsap.from(".sidebar", { x: -100, opacity: 0, duration: 0.8, ease: "power2.out" });
    gsap.from(".main-content", { y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: "power2.out" });

    // --- 2. AUTH LOGIC & ROLE DETECTION ---
    onAuthStateChanged(auth, async (user) => {
        if (!user) { 
            if (!window.location.pathname.includes("index.html")) {
                window.location.href = "index.html"; 
            }
            return; 
        }

        try {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                const role = userData.role; 
                const userLevel = userData.level; 
                const currentPage = window.location.pathname;

                // ROUTING GUARD
                if (role === 'student' && currentPage.includes('lecturer')) {
                    alert("⛔ Access Denied: Staff Only Area.");
                    window.location.href = 'student-dashboard.html';
                    return;
                } 
                
                if (role === 'lecturer' && currentPage.includes('student')) {
                    window.location.href = 'lecturer-dashboard.html';
                    return;
                }

                // === UPDATE SYSTEM ROLE CARD SIDEBAR ===
                const roleElement = document.getElementById("system-role-text");
                if (roleElement) {
                    const formattedRole = role ? role.charAt(0).toUpperCase() + role.slice(1) : "User";
                    roleElement.innerText = formattedRole;
                }

                updateUserUI(userData);
                initNavigation(); 
                initMobileMenu(); // Setup Menu immediately upon authenticated render
                
                if (role === "lecturer") {
                    setupLecturerLogic();

                    // === LIVE DYNAMIC SEMESTER PROGRESS METRIC (0% to 100%) ===
                    const lecturerMatQ = query(
                        collection(db, "materials"), 
                        where("uploadedBy", "==", user.uid)
                    );

                    onSnapshot(lecturerMatQ, (snap) => {
                        const currentUploads = snap.size;
                        const targetGoal = 10; // Your semester target milestone count
                        
                        const percentage = Math.min(Math.round((currentUploads / targetGoal) * 100), 100);
                        
                        const progressText = document.getElementById("activity-percentage-text");
                        if (progressText) {
                            progressText.innerText = `${percentage}%`;
                        }

                        const progressCircle = document.querySelector(".progress-ring-circle");
                        if (progressCircle) {
                            progressCircle.style.background = `conic-gradient(#27ae60 ${percentage * 3.6}deg, #e2eaf1 0deg)`;
                        }
                    });

                } else {
                    setupStudentLogic(userLevel); 
                }
            }
        } catch (error) {
            console.error("Critical Auth Error:", error);
        }
    });

    // --- 3. UI INITIALIZATION ---
    function updateUserUI(data) {
        const nameEl = document.getElementById('user-name');
        const mobileNameEl = document.getElementById('mobile-user-name'); 
        const roleEl = document.getElementById('user-role');
        const initialEl = document.getElementById('user-initials');
        const mobileInitialEl = document.getElementById('mobile-user-initials');

        if (nameEl) nameEl.innerText = data.name;
        if (mobileNameEl) mobileNameEl.innerText = data.name; 
        
        if (data.name) {
            const names = data.name.trim().split(/\s+/);
            const initials = names.length > 1 
                ? (names[0][0] + names[1][0]).toUpperCase() 
                : names[0][0].toUpperCase();
            if (initialEl) initialEl.innerText = initials;
            if (mobileInitialEl) mobileInitialEl.innerText = initials;
        }
        if (window.lucide) lucide.createIcons();
    }

    // --- 4. NAVIGATION LOGIC ---
    function initNavigation() {
        const links = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.view-section');

        links.forEach(link => {
            link.addEventListener('click', (e) => {
                const targetId = link.getAttribute('data-view');
                if (!targetId || targetId === "#") return;
                e.preventDefault();

                gsap.to(".view-section:not([style*='display: none'])", { 
                    opacity: 0, y: -10, duration: 0.2, 
                    onComplete: () => {
                        sections.forEach(s => s.style.display = 'none');
                        const target = document.getElementById(targetId);
                        if (target) {
                            target.style.display = 'block';
                            gsap.fromTo(target, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.4 });
                        }
                    }
                });
                links.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    // --- 5. LECTURER SIDE ---
    function setupLecturerLogic() {
        // === 1. REAL-TIME SNAPSHOT LISTENER FOR MATERIALS ===
        const lecturerTable = document.getElementById('lecturer-materials-list-body');
        
        if (lecturerTable) {
            // Build the query to pull only materials posted by this logged-in lecturer
            const lecturerMatQ = query(
                collection(db, "materials"), 
                where("uploadedBy", "==", auth.currentUser.uid),
                orderBy("createdAt", "desc")
            );

           // Listen for changes dynamically
            onSnapshot(lecturerMatQ, (snap) => {
                // 1. UPDATE THE COUNTER IMMEDIATELY (Handles 0, 1, 2, etc. correctly)
                const totalCountElem = document.getElementById('lecturer-total-materials');
                if (totalCountElem) {
                    totalCountElem.innerText = snap.size; 
                }

                // 2. CHECK IF COLLECTION IS EMPTY
                if (snap.empty) {
                    lecturerTable.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #7f8c8d; padding: 20px;">No materials uploaded yet.</td></tr>`;
                    return; // Stops execution here if there are 0 documents
                }
                
                // 3. RENDER THE TABLES ROWS IF DOCUMENTS EXIST
                lecturerTable.innerHTML = snap.docs.map(doc => {
                    const d = doc.data();
                    const statusText = d.createdAt ? "Live ✓" : "Processing..."; 
                    
                    return `
                        <tr class="table-row-anim">
                            <td>${d.code || '---'}</td>
                            <td>${d.title || '---'}</td>
                            <td>${d.level || '---'}L</td>
                            <td style="color: #27ae60; font-weight: 600;">${statusText}</td>
                        </tr>
                    `;
                }).join('');
            });
        }

        // === 2. YOUR ORIGINAL MATERIAL UPLOAD FORM ===
        const uploadForm = document.getElementById('upload-material-form');
        if (uploadForm) {
            uploadForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = uploadForm.querySelector('button');
                btn.innerText = "Uploading...";
                btn.disabled = true;

                try {
                    await addDoc(collection(db, "materials"), {
                        title: document.getElementById('mat-title').value,
                        code: document.getElementById('mat-code').value.toUpperCase(), // Automatically uppercase code
                        level: document.getElementById('mat-level').value,
                        url: document.getElementById('mat-url').value,
                        uploadedBy: auth.currentUser.uid,
                        createdAt: serverTimestamp()
                    });
                    alert("Material Posted!");
                    uploadForm.reset();
                } catch (err) { alert(err.message); } 
                finally { btn.innerText = "Post to Students"; btn.disabled = false; }
            });
        }

        // === 3. YOUR ORIGINAL ATTENDANCE SESSION FORM ===
        const attendanceForm = document.getElementById('attendance-session-form');
        if (attendanceForm) {
            attendanceForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const btn = attendanceForm.querySelector('button');
                btn.disabled = true;
                btn.innerText = "Opening...";

                try {
                    await addDoc(collection(db, "attendance_sessions"), {
                        courseCode: document.getElementById('att-course-code').value.toUpperCase(),
                        level: document.getElementById('att-level').value,
                        lecturerId: auth.currentUser.uid,
                        lecturerName: document.getElementById('user-name').innerText,
                        status: "active",
                        createdAt: serverTimestamp()
                    });
                    alert("Session is LIVE!");
                    attendanceForm.reset();
                } catch (err) { alert(err.message); } 
                finally { btn.disabled = false; btn.innerText = "Open Attendance Session"; }
            });
        }
    }

    // --- 6. STUDENT SIDE ---
    function setupStudentLogic(studentLevel) {
        const materialTable = document.getElementById('student-materials-list-body');
        const materialQ = query(collection(db, "materials"), where("level", "==", studentLevel), orderBy("createdAt", "desc"));
        onSnapshot(materialQ, (snap) => {
            if (!materialTable) return;
            materialTable.innerHTML = snap.docs.map(doc => {
                const d = doc.data();
                return `<tr class="table-row-anim"><td>${d.code}</td><td>${d.title}</td><td>${d.level}L</td><td><a href="${d.url}" target="_blank" class="banner-btn">Download</a></td></tr>`;
            }).join('');
        });

        const activeCard = document.getElementById('active-class-card');
        const noSessionMsg = document.getElementById('no-session-msg');
        const markBtn = document.getElementById('mark-present-btn');

        let currentSessionId = null;

        const attendanceQ = query(
            collection(db, "attendance_sessions"),
            where("level", "==", studentLevel),
            where("status", "==", "active")
        );

        onSnapshot(attendanceQ, async (snap) => {
            if (snap.empty) {
                currentSessionId = null;
                if(activeCard) activeCard.style.display = 'none';
                if(noSessionMsg) noSessionMsg.style.display = 'block';
            } else {
                const sessionDoc = snap.docs[0];
                const sessionId = sessionDoc.id;
                const sessionData = sessionDoc.data();

                const durationLimit = 30 * 60 * 1000; 
                const startTime = sessionData.createdAt.toMillis();
                const isExpired = Date.now() - startTime > durationLimit;

                if(activeCard) activeCard.style.display = 'block';
                if(noSessionMsg) noSessionMsg.style.display = 'none';
               
                document.getElementById('active-course-code').innerText = sessionData.courseCode;
                document.getElementById('active-lecturer').innerText = `Lecturer: ${sessionData.lecturerName}`;

                const liveBadge = document.querySelector('.live-now-badge'); 

                if (isExpired) {
                    markBtn.disabled = true;
                    markBtn.innerText = "Session Expired";
                    markBtn.style.background = "#95a5a6";
                    if (liveBadge) liveBadge.style.display = 'none'; 
                } else {
                    if (liveBadge) liveBadge.style.display = 'inline-block';

                    const checkinRef = doc(db, "attendance_sessions", sessionId, "checkins", auth.currentUser.uid);
                    const checkinSnap = await getDoc(checkinRef);
                    
                    if (checkinSnap.exists()) {
                        markBtn.disabled = true;
                        markBtn.innerText = "Verified ✓";
                        markBtn.style.background = "#27ae60";
                    } else {
                        markBtn.disabled = false;
                        markBtn.innerText = "Mark Present";
                        markBtn.style.background = ""; 

                        markBtn.onclick = async () => {
                            markBtn.disabled = true;
                            markBtn.innerText = "Processing...";
                            try {
                                await setDoc(checkinRef, {
                                    uid: auth.currentUser.uid,
                                    name: document.getElementById('user-name').innerText,
                                    time: new Date().toLocaleTimeString(),
                                    status: "Present",
                                    timestamp: serverTimestamp()
                                });
                                markBtn.innerText = "Verified ✓";
                                markBtn.style.background = "#27ae60";
                                alert("Attendance marked successfully!");
                            } catch (err) {
                                console.error(err);
                                alert("Submission failed. Permissions or Network error.");
                                markBtn.disabled = false;
                                markBtn.innerText = "Mark Present";
                            }  
                        };
                    }
                }
            }
        });
    }

    // --- 7. MOBILE MENU LOGIC ---
    function initMobileMenu() {
        const menuBtn = document.getElementById('menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuBtn && sidebar) {
            menuBtn.onclick = null; 
            
            menuBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                sidebar.classList.toggle('active');
                console.log("Hamburger clicked. Sidebar active state is:", sidebar.classList.contains('active'));
            });

            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('active') && !sidebar.contains(e.target) && !menuBtn.contains(e.target)) {
                    sidebar.classList.remove('active');
                }
            });
        }
    }

    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.href = "index.html");
    });
});