import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';
import { 
    collection, getDocs, query, where, doc, getDoc, addDoc, serverTimestamp, getCountFromServer 
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

// --- 1. CONFIGURATION & TEMPLATES ---
const menuTemplates = {
    student: [
        { name: 'Dashboard', icon: 'layout-dashboard', view: 'dashboard-view' },
        { name: 'My Courses', icon: 'book-open', view: 'courses-view' },
        { name: 'Assignments', icon: 'clipboard-list', view: 'assignments-view' },
        { name: 'Settings', icon: 'settings', view: 'settings-view' }
    ],
    lecturer: [
        { name: 'Lec Dashboard', icon: 'bar-chart-3', view: 'lec-home-view' },
        { name: 'Upload Materials', icon: 'file-up', view: 'upload-view' },
        { name: 'Attendance', icon: 'users', view: 'attendance-view' },
        { name: 'Settings', icon: 'settings', view: 'settings-view' }
    ]
};

let currentUserData = null;

// --- GSAP ANIMATION ENGINE ---
const animateView = (target) => {
    if (window.gsap && target) {
        gsap.fromTo(target, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. CORE UI FUNCTIONS ---
    
    // UPDATED: Mobile Menu Toggle Logic
    function setupMobileMenu() {
        const menuBtn = document.getElementById('menu-toggle') || document.querySelector('.menu-btn');
        const sidebar = document.querySelector('.sidebar');
        const mainContent = document.querySelector('.main-content');
        
        if (menuBtn && sidebar) {
            // Remove old listeners to prevent "double firing"
            const newMenuBtn = menuBtn.cloneNode(true);
            menuBtn.parentNode.replaceChild(newMenuBtn, menuBtn);

            newMenuBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                sidebar.classList.toggle('active');
            });

            // Close when clicking main content
            if (mainContent) {
                mainContent.addEventListener('click', () => {
                    sidebar.classList.remove('active');
                });
            }
        }
    }

    function renderSidebar(role) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        const menu = menuTemplates[role] || menuTemplates.student;
        
        nav.innerHTML = menu.map((item, index) => `
            <a href="#" class="nav-link ${index === 0 ? 'active' : ''}" data-view="${item.view}">
                <i data-lucide="${item.icon}"></i> ${item.name}
            </a>
        `).join('');
        
        refreshIcons();
        
        if (window.gsap) {
            gsap.fromTo(".nav-link", 
                { opacity: 0, x: -20 }, 
                { opacity: 1, x: 0, stagger: 0.1, duration: 0.4, ease: "power2.out" }
            );
        }

        setupViewSwitching();
    }

    function refreshIcons() {
        if (window.lucide) {
            lucide.createIcons();
        }
    }

    function setupViewSwitching() {
        const navLinks = document.querySelectorAll('.nav-link');
        const views = document.querySelectorAll('.view-section');
        const welcomeBanner = document.querySelector('.welcome-banner');
        const sidebar = document.querySelector('.sidebar');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();

                // Close sidebar on mobile after selection
                if (window.innerWidth <= 768 && sidebar) {
                    sidebar.classList.remove('active');
                }

                const targetViewId = link.getAttribute('data-view');
                if (!targetViewId) return;

                views.forEach(v => v.style.display = 'none');
                
                if (targetViewId === 'lec-home-view' || targetViewId === 'dashboard-view') {
                    if (welcomeBanner) welcomeBanner.style.display = 'flex';
                } else {
                    if (welcomeBanner) welcomeBanner.style.display = 'none';
                }

                const target = document.getElementById(targetViewId);
                if (target) {
                    target.style.display = 'block';
                    animateView(target);
                    if(targetViewId === 'upload-view' && currentUserData) {
                        loadLecturerMaterials(currentUserData.name);
                    }
                }

                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    // --- 3. DATA FETCHING FUNCTIONS ---
    async function loadLecturerMaterials(userName) {
        const tbody = document.getElementById('materials-list-body');
        if (!tbody) return;

        try {
            const q = query(collection(db, "materials"), where("author", "==", userName));
            const querySnapshot = await getDocs(q);
            
            if (querySnapshot.empty) {
                tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding:20px; color:#666;">No materials uploaded yet.</td></tr>`;
                return;
            }

            tbody.innerHTML = querySnapshot.docs.map(doc => {
                const data = doc.data();
                return `
                    <tr style="border-bottom: 1px solid rgba(0,0,0,0.05);">
                        <td style="padding: 12px; color: #333;">${data.code}</td>
                        <td style="padding: 12px; color: #333;">${data.title}</td>
                        <td style="padding: 12px; color: #333;">${data.level}L</td>
                        <td style="padding: 12px;">
                            <a href="${data.url}" target="_blank" style="color: #2ecc71; text-decoration: none; font-weight:bold;">View</a>
                        </td>
                    </tr>
                `;
            }).join('');
        } catch (err) {
            console.error("Error loading materials:", err);
        }
    }

    async function updateLecturerStats(userName) {
        try {
            const materialsRef = collection(db, "materials");
            const q = query(materialsRef, where("author", "==", userName));
            const snapshot = await getCountFromServer(q);
            
            const countElement = document.getElementById('total-materials-count');
            if (countElement) {
                countElement.innerText = snapshot.data().count;
            }
        } catch (err) {
            console.error("Stats Error:", err);
        }
    }

    // UPDATED: Profile UI with Role Styling
    function updateProfileUI(data) {
        const nameEl = document.getElementById('user-name');
        const roleEl = document.getElementById('user-role');
        const initialEl = document.getElementById('user-initials');

        const displayName = data.name || "User";
        const role = (data.role || 'Student').toUpperCase();

        if (nameEl) nameEl.innerText = displayName;
        
        if (roleEl) {
            roleEl.innerText = role;
            // Style "LECTURER" differently than "STUDENT"
            roleEl.style.color = (role === 'LECTURER') ? '#2ecc71' : '#3498db';
            roleEl.style.fontWeight = 'bold';
        }
        
        if (initialEl) {
            const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase();
            initialEl.innerText = initials;
        }
    }

    const setupUploadForm = () => {
        const uploadForm = document.getElementById('upload-material-form');
        if (!uploadForm) return;

        uploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadForm.querySelector('button');
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing...";

            const materialData = {
                title: document.getElementById('mat-title').value,
                code: document.getElementById('mat-code').value,
                level: document.getElementById('mat-level').value,
                url: document.getElementById('mat-url').value,
                author: currentUserData.name,
                createdAt: serverTimestamp()
            };

            try {
                await addDoc(collection(db, "materials"), materialData);
                alert("Masha Allah! Material uploaded successfully.");
                uploadForm.reset();
                updateLecturerStats(currentUserData.name); 
                loadLecturerMaterials(currentUserData.name); 
            } catch (err) {
                console.error("Upload Error:", err);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Post to Students";
            }
        });
    };

    // --- 4. AUTH WATCHER ---
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const userSnap = await getDoc(doc(db, "users", user.uid));
        
        if (userSnap.exists()) {
            currentUserData = userSnap.data();
            const role = currentUserData.role || 'student';

            updateProfileUI(currentUserData);
            renderSidebar(role);
            setupMobileMenu(); // Initialize mobile menu toggle

            document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');

            if (role === 'lecturer') {
                const home = document.getElementById('lec-home-view');
                if (home) {
                    home.style.display = 'block';
                    animateView(home);
                }
                setupUploadForm();
                updateLecturerStats(currentUserData.name); 
                loadLecturerMaterials(currentUserData.name);
            } else {
                const dash = document.getElementById('dashboard-view');
                if (dash) {
                    dash.style.display = 'block';
                    animateView(dash);
                }
            }
        }
    });

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            signOut(auth).then(() => {
                window.location.href = "index.html";
            }).catch(err => console.error("Logout Failed:", err));
        });
    }
});