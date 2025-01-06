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

// ฟังก์ชันตรวจสอบ PIN
const PIN_ADD_EDIT_MOVE = "0000";
const PIN_DELETE = "8888";
const PIN_EXPIRY_HOURS = 6;

function getStoredPinTimestamp() {
    return localStorage.getItem('pinTimestamp');
}

function setStoredPinTimestamp() {
    const now = new Date().getTime();
    localStorage.setItem('pinTimestamp', now);
}

function isPinValid() {
    const storedTimestamp = getStoredPinTimestamp();
    if (!storedTimestamp) return false;
    const now = new Date().getTime();
    const expiryTime = parseInt(storedTimestamp) + (PIN_EXPIRY_HOURS * 60 * 60 * 1000);
    return now < expiryTime;
}

function promptPin(action, callback) {
    if (isPinValid()) {
        callback();
        return;
    }

    const requiredPin = action === 'delete' ? PIN_DELETE : PIN_ADD_EDIT_MOVE;
    const pin = prompt(`กรุณาป้อน PIN เพื่อ${action === 'delete' ? 'ลบ' : 'ดำเนินการ'}:`);
    if (pin === requiredPin) {
        setStoredPinTimestamp();
        callback();
    } else {
        alert('ท่านไม่มีสิทธิ์');
    }
}

function showStatus(message, isError = false) {
    const status = document.getElementById('status');
    status.textContent = message;
    status.style.display = 'block';
    status.className = 'status ' + (isError ? 'error' : 'success');
    setTimeout(() => status.style.display = 'none', 3000);
}

async function writeData() {
    const typeSelect = document.getElementById('typeSelect');
    const selectedType = typeSelect.value;
    const input = document.getElementById('inputData');
    const text = input.value.trim();
    
    if (!selectedType) {
        showStatus('กรุณาเลือกประเภทข้อมูล', true);
        return;
    }
    if (!text) {
        showStatus('กรุณากรอกข้อความ', true);
        return;
    }

    promptPin('add', async () => {
        try {
            const snapshot = await database.ref('items').once('value');
            const items = snapshot.val() || {};
            const maxOrder = Object.values(items).reduce((max, item) => 
                Math.max(max, item.order || 0), 0);

            const newDataRef = database.ref('items').push();
            await newDataRef.set({
                type: selectedType,
                text: text,
                timestamp: firebase.database.ServerValue.TIMESTAMP,
                order: maxOrder + 1000
            });

            showStatus('บันทึกข้อมูลสำเร็จ');
            typeSelect.value = '';
            input.value = '';
            input.focus();
            displayData(); // เรียก displayData เพื่อแสดงข้อมูลใหม่ทันที
        } catch (error) {
            showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
        }
    });
}

function startEdit(id, currentText, currentType) {
    promptPin('edit', () => {
        const itemDiv = document.getElementById(`item-${id}`);
        const contentDiv = itemDiv.querySelector('.item-content');
        contentDiv.innerHTML = `
            <div class="edit-form">
                <select id="edit-type-${id}">
                    <option value="บทบรรยาย" ${currentType === 'บทบรรยาย' ? 'selected' : ''}>บทบรรยาย</option>
                    <option value="บทสัมภาษณ์" ${currentType === 'บทสัมภาษณ์' ? 'selected' : ''}>บทสัมภาษณ์</option>
                    <option value="คำบรรยายเพิ่มเติม" ${currentType === 'คำบรรยายเพิ่มเติม' ? 'selected' : ''}>คำบรรยายเพิ่มเติม</option>
                </select>
                <input type="text" id="edit-${id}" value="${currentText}" class="edit-input">
                <div class="button-group">
                    <button class="edit-btn" onclick="saveEdit('${id}')">✏️</button>
                    <button class="cancel-btn" onclick="displayData()">ยกเลิก</button>
                </div>
            </div>
        `;
        document.getElementById(`edit-${id}`).focus();
    });
}

async function saveEdit(id) {
    const editType = document.getElementById(`edit-type-${id}`).value;
    const editInput = document.getElementById(`edit-${id}`);
    const newText = editInput.value.trim();
    
    if (!newText) {
        showStatus('กรุณากรอกข้อความ', true);
        return;
    }

    try {
        await database.ref(`items/${id}`).update({
            type: editType,
            text: newText,
            editedAt: firebase.database.ServerValue.TIMESTAMP
        });
        showStatus('แก้ไขข้อมูลสำเร็จ');
        displayData(); // เรียก displayData หลังจากแก้ไขข้อมูลเสร็จ
    } catch (error) {
        showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
    }
}

async function deleteData(id) {
    promptPin('delete', async () => {
        if (confirm('ต้องการลบข้อมูลนี้ใช่หรือไม่?')) {
            try {
                await database.ref('items/' + id).remove();
                showStatus('ลบข้อมูลสำเร็จ');
                displayData(); // เรียก displayData หลังจากลบข้อมูลเสร็จ
            } catch (error) {
                showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
            }
        }
    });
}

async function updateOrder(id, newOrder) {
    try {
        await database.ref(`items/${id}`).update({
            order: newOrder,
            updatedAt: firebase.database.ServerValue.TIMESTAMP
        });
    } catch (error) {
        showStatus('เกิดข้อผิดพลาดในการอัพเดทลำดับ: ' + error.message, true);
    }
}

async function moveItem(id, direction) {
    promptPin('move', async () => {
        try {
            const snapshot = await database.ref('items').orderByChild('order').once('value');
            const items = [];
            snapshot.forEach(child => {
                items.push({ id: child.key, ...child.val() });
            });
            items.sort((a, b) => a.order - b.order);

            const currentIndex = items.findIndex(item => item.id === id);
            const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

            if (newIndex >= 0 && newIndex < items.length) {
                const newOrder = direction === 'up'
                    ? items[newIndex].order - 1
                    : items[newIndex].order + 1;
                await updateOrder(id, newOrder);
                displayData(); // เรียก displayData หลังจากย้ายตำแหน่งเสร็จ
            }
        } catch (error) {
            showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
        }
    });
}

async function handleDropLogic(draggedId, targetId) {
    promptPin('move', async () => {
        try {
            const snapshot = await database.ref('items').orderByChild('order').once('value');
            const items = [];
            snapshot.forEach(child => {
                items.push({ id: child.key, ...child.val() });
            });
            items.sort((a, b) => a.order - b.order);

            const draggedIndex = items.findIndex(item => item.id === draggedId);
            const targetIndex = items.findIndex(item => item.id === targetId);

            if (draggedIndex !== -1 && targetIndex !== -1) {
                const newOrder = targetIndex > draggedIndex
                    ? items[targetIndex].order + 1
                    : items[targetIndex].order - 1;

                await database.ref(`items/${draggedId}`).update({ order: newOrder });
                displayData(); // เรียก displayData หลังจากอัปเดตข้อมูลเสร็จ
            }
        } catch (error) {
            showStatus('เกิดข้อผิดพลาด: ' + error.message, true);
        }
    });
}

function handleDragStart(e) {
    draggedItem = this;
    setTimeout(() => this.classList.add('dragging'), 0);
}

function handleDragEnd() {
    this.classList.remove('dragging');
    draggedItem = null;
}

function handleDragOver(e) {
    e.preventDefault();
    if (draggedItem !== this) {
        this.classList.add('drag-over');
    }
}

function handleDragLeave() {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    e.preventDefault();
    const targetId = this.id.replace('item-', '');
    if (draggedItem && draggedItem.id !== this.id) {
        handleDropLogic(draggedItem.id.replace('item-', ''), targetId);
    }
    this.classList.remove('drag-over');
}

function displayData() {
    const dataList = document.getElementById('dataList');
    dataList.innerHTML = ''; // เคลียร์ข้อมูลเก่าก่อนแสดงใหม่
    
    database.ref('items').orderByChild('order').once('value', snapshot => {
        const items = [];
        snapshot.forEach(child => {
            items.push({ id: child.key, ...child.val() });
        });
        
        items.sort((a, b) => a.order - b.order); // เรียงลำดับตาม order
        
        items.forEach((data, index) => {
            const div = document.createElement('div');
            div.id = `item-${data.id}`;
            div.className = 'item';
            div.draggable = true;
            div.setAttribute('data-type', data.type); // เพิ่ม data-type เพื่อกำหนดสีพื้นหลัง
            
            const date = new Date(data.timestamp);
            let timeText = date.toLocaleString('th-TH');
            if (data.editedAt) {
                const editDate = new Date(data.editedAt);
                timeText += ` (แก้ไขเมื่อ ${editDate.toLocaleString('th-TH')})`;
            }

            div.innerHTML = `
                <div class="drag-handle">⋮⋮</div>
                <div class="item-content">
                    <div class="type-label">[ ${data.type} ]</div>
                    <div style="font-size: 16px;">${data.text}</div>
                    <div class="timestamp">${timeText}</div>
                </div>
                <div class="item-buttons">
                    <button class="edit-btn" onclick="startEdit('${data.id}', '${data.text}', '${data.type}')">✏️</button>
                    <button class="delete-btn" onclick="deleteData('${data.id}')">✕</button>
                </div>
            `;

            // เพิ่ม Event Listener สำหรับ Drag and Drop
            div.addEventListener('dragstart', handleDragStart);
            div.addEventListener('dragend', handleDragEnd);
            div.addEventListener('dragover', handleDragOver);
            div.addEventListener('dragleave', handleDragLeave);
            div.addEventListener('drop', handleDrop);

            dataList.appendChild(div);
        });
    });
}

// เริ่มแสดงข้อมูลเมื่อโหลดหน้าเว็บ
displayData();

// รับการกด Enter ที่ช่อง input
document.getElementById('inputData').addEventListener('keypress', e => {
    if (e.key === 'Enter') writeData();
});

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
