// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA5c5nHaw6s1X1quiybFD_zq7vB4tIfIVQ",
    authDomain: "eventcost-pro.firebaseapp.com",
    databaseURL: "https://eventcost-pro-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "eventcost-pro",
    storageBucket: "eventcost-pro.firebasestorage.app",
    messagingSenderId: "114353067568",
    appId: "1:114353067568:web:1b444a5cb44d0f73e8bff5"
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let draggedItem = null;
let currentProjectId = null; // เก็บ ID ของโครงการที่กำลังแก้ไข

// ฟังก์ชันเปิด Modal สำหรับสร้าง/แก้ไขโครงการ
function openCreateProjectModal(projectId = null) {
    const modal = document.getElementById('projectModal');
    const modalTitle = document.getElementById('modalTitle');
    const projectForm = document.getElementById('projectForm');

    if (projectId) {
        // โหมดแก้ไขโครงการ
        modalTitle.textContent = 'แก้ไขโครงการ';
        currentProjectId = projectId;
        loadProjectData(projectId);
    } else {
        // โหมดสร้างโครงการใหม่
        modalTitle.textContent = 'สร้างโครงการใหม่';
        currentProjectId = null;
        projectForm.reset();
    }

    modal.style.display = 'flex';
}

// ฟังก์ชันปิด Modal
function closeProjectModal() {
    const modal = document.getElementById('projectModal');
    modal.style.display = 'none';
}

// ฟังก์ชันโหลดข้อมูลโครงการสำหรับแก้ไข
function loadProjectData(projectId) {
    database.ref(`projects/${projectId}`).once('value').then(snapshot => {
        const project = snapshot.val();
        if (project) {
            document.getElementById('projectName').value = project.name;
            document.getElementById('projectDescription').value = project.description;
            document.getElementById('projectStartDate').value = project.startDate;
            document.getElementById('projectEndDate').value = project.endDate;
        }
    });
}

// ฟังก์ชันบันทึกโครงการ (สร้างหรือแก้ไข)
document.getElementById('projectForm').addEventListener('submit', e => {
    e.preventDefault();

    const projectName = document.getElementById('projectName').value.trim();
    const projectDescription = document.getElementById('projectDescription').value.trim();
    const projectStartDate = document.getElementById('projectStartDate').value;
    const projectEndDate = document.getElementById('projectEndDate').value;

    if (!projectName || !projectDescription || !projectStartDate || !projectEndDate) {
        alert('กรุณากรอกข้อมูลให้ครบถ้วน');
        return;
    }

    const projectData = {
        name: projectName,
        description: projectDescription,
        startDate: projectStartDate,
        endDate: projectEndDate,
        createdAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (currentProjectId) {
        // แก้ไขโครงการ
        database.ref(`projects/${currentProjectId}`).update(projectData)
            .then(() => {
                showStatus('แก้ไขโครงการสำเร็จ');
                closeProjectModal();
                displayProjects();
            })
            .catch(error => {
                showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
            });
    } else {
        // สร้างโครงการใหม่
        database.ref('projects').push(projectData)
            .then(() => {
                showStatus('สร้างโครงการสำเร็จ');
                closeProjectModal();
                displayProjects();
            })
            .catch(error => {
                showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
            });
    }
});

// ฟังก์ชันลบโครงการ
function deleteProject(projectId) {
    if (confirm('ต้องการลบโครงการนี้ใช่หรือไม่?')) {
        database.ref(`projects/${projectId}`).remove()
            .then(() => {
                showStatus('ลบโครงการสำเร็จ');
                displayProjects();
            })
            .catch(error => {
                showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
            });
    }
}

// ฟังก์ชันแสดงรายการโครงการ
function displayProjects() {
    const projectList = document.getElementById('projectList');
    projectList.innerHTML = '';

    database.ref('projects').once('value').then(snapshot => {
        snapshot.forEach(child => {
            const project = child.val();
            const projectId = child.key;

            const projectItem = document.createElement('div');
            projectItem.className = 'project-item';
            projectItem.innerHTML = `
                <div>
                    <h3>${project.name}</h3>
                    <p>${project.description}</p>
                    <p>วันที่เริ่มต้น: ${project.startDate}</p>
                    <p>วันที่สิ้นสุด: ${project.endDate}</p>
                </div>
                <div class="actions">
                    <button class="edit-btn" onclick="openCreateProjectModal('${projectId}')">แก้ไข</button>
                    <button class="delete-btn" onclick="deleteProject('${projectId}')">ลบ</button>
                </div>
            `;

            projectList.appendChild(projectItem);
        });
    });
}

// เริ่มแสดงรายการโครงการเมื่อโหลดหน้าเว็บ
displayProjects();

// ฟังก์ชันสลับ Tab
function showTab(tabId) {
    // ซ่อนทุก Tab
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // แสดง Tab ที่เลือก
    document.getElementById(tabId).classList.add('active');

    // ตั้งค่า Active State ให้ปุ่ม Tab
    document.querySelectorAll('.tabs button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelector(`.tabs button[onclick="showTab('${tabId}')"]`).classList.add('active');
}

// แสดง Tab เริ่มต้น (Dashboard)
showTab('dashboard');
