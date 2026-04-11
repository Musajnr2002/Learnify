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
        { name: 'Upload Materials', icon: 'upload-cloud', view: 'upload-view' },
        { name: 'Attendance', icon: 'users', view: 'attendance-view' },
        { name: 'Settings', icon: 'settings', view: 'settings-view' }
    ]
};

let currentUserData = null;

// --- GSAP ANIMATION ENGINE ---
const animateView = (target) => {
    if (window.gsap) {
        gsap.fromTo(target, 
            { opacity: 0, y: 20 }, 
            { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" }
        );
    }
};

document.addEventListener('DOMContentLoaded', () => {

    // --- 2. CORE UI FUNCTIONS ---
    
    function renderSidebar(role) {
        const nav = document.getElementById('sidebar-nav');
        if (!nav) return;

        const menu = menuTemplates[role] || menuTemplates.student;
        
        // Inject HTML with 'active' class on the first item
        nav.innerHTML = menu.map((item, index) => `
            <a href="#" class="nav-link ${index === 0 ? 'active' : ''}" data-view="${item.view}">
                <i data-lucide="${item.icon}"></i> ${item.name}
            </a>
        `).join('');
        
        if (window.lucide) lucide.createIcons();
        
        // GSAP: Improved entrance for sidebar links
        if (window.gsap) {
            gsap.fromTo(".nav-link", 
                { opacity: 0, x: -20 }, 
                { 
                    opacity: 1, 
                    x: 0, 
                    stagger: 0.1, 
                    duration: 0.4,
                    clearProps: "all" // Fixes the styling after animation
                }
            );
        }

        setupViewSwitching();
    }

    function setupViewSwitching() {
        const navLinks = document.querySelectorAll('.nav-link');
        const views = document.querySelectorAll('.view-section');

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetViewId = link.getAttribute('data-view');
                if (!targetViewId) return;

                // Switch Views
                views.forEach(v => v.style.display = 'none');
                const target = document.getElementById(targetViewId);
                
                if (target) {
                    target.style.display = 'block';
                    animateView(target);
                }

                // Update Active UI
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');
            });
        });
    }

    // --- 3. LIVE STATS ENGINE ---
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

    function updateProfileUI(data) {
        document.getElementById('user-name').innerText = data.name;
        document.getElementById('user-role').innerText = data.role || 'Student';
        
        const initials = data.name.split(' ').map(n => n[0]).join('').toUpperCase();
        document.getElementById('user-initials').innerText = initials;

        if (data.role === 'student' && document.getElementById('welcome-title')) {
            document.getElementById('welcome-title').innerText = `Ready to Learn, ${data.name.split(' ')[0]}? 🚀`;
        }
    }

    // --- 4. UPLOAD LOGIC ---
    const setupUploadForm = () => {
        const uploadForm = document.getElementById('upload-material-form');
        if (!uploadForm) return;

        // Clean up old listeners before adding a new one
        const newForm = uploadForm.cloneNode(true);
        uploadForm.parentNode.replaceChild(newForm, uploadForm);

        newForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = newForm.querySelector('button');
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
                newForm.reset();
                // Refresh stats immediately after upload
                updateLecturerStats(currentUserData.name);
            } catch (err) {
                console.error("Upload Error:", err);
                alert("Error uploading. Check your connection.");
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Post to Students";
            }
        });
    };

    // --- 5. AUTH WATCHER ---
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "index.html";
            return;
        }

        const userSnap = await getDoc(doc(db, "students", user.uid));
        if (userSnap.exists()) {
            currentUserData = userSnap.data();
            const role = currentUserData.role || 'student';

            updateProfileUI(currentUserData);
            renderSidebar(role);

            // Hide all views initially
            document.querySelectorAll('.view-section').forEach(v => v.style.display = 'none');

            if (role === 'lecturer') {
                const home = document.getElementById('lec-home-view');
                if (home) {
                    home.style.display = 'block';
                    animateView(home);
                }
                setupUploadForm();
                updateLecturerStats(currentUserData.name); // Load live numbers
            } else {
                const dash = document.getElementById('dashboard-view');
                if (dash) {
                    dash.style.display = 'block';
                    animateView(dash);
                }
            }
        }
    });

    // --- 6. LOGOUT ---
    document.getElementById('logout-btn')?.addEventListener('click', (e) => {
        e.preventDefault();
        signOut(auth).then(() => window.location.href = "index.html");
    });
});