console.log("[SYS] App.js initializing (v2.4 Stable)...");

document.addEventListener('DOMContentLoaded', () => {
    try {
        // Check auth
        if (localStorage.getItem('userType') !== 'student') {
            window.location.href = 'index.html';
            return;
        }

        // Set Profile info
        const name = localStorage.getItem('studentName') || 'Student';
        const matric = localStorage.getItem('matricNumber') || 'F/HD/XX/XXXX';
        const dept = localStorage.getItem('department') || 'COMPUTER SCIENCE';

        if (document.getElementById('displayStudentName')) document.getElementById('displayStudentName').textContent = name;
        if (document.getElementById('displayMatricNumber')) document.getElementById('displayMatricNumber').textContent = matric;
        if (document.getElementById('displayDepartment')) document.getElementById('displayDepartment').textContent = dept;
        if (document.getElementById('chatGreetingName')) document.getElementById('chatGreetingName').textContent = name;
        document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();

        // Apply saved theme
        const savedTheme = localStorage.getItem('gaposaTheme');
        if (savedTheme === 'dark') {
            document.body.setAttribute('data-theme', 'dark');
        }

        // Scroll to bottom
        scrollToBottom();

        // Fetch official documents from backend after a tiny delay
        setTimeout(fetchDocuments, 1500);

        // Check for notification permission
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    } catch (e) {
        console.error("Dashboard Initialization Error:", e);
    }
});

// Cache for storing base64 strings securely without crowding the DOM
// --- Base Configuration ---
const getBaseUrl = () => {
    // If we are running on Render (no port or standard 80/443), use relative paths
    // If we are on port 3000, use relative paths
    if (window.location.port === '3000' || window.location.port === '') return '';
    // Fail-safe for local dev environments (like Live Server)
    return 'http://localhost:3000';
};
window.GAPOSA_API_URL = getBaseUrl();
console.log(`[SYS] GAPOSA API pointing to: ${window.GAPOSA_API_URL || 'Current Origin'}`);

window.cachedDocuments = {};

window.logout = function () {
    localStorage.removeItem('userType');
    localStorage.removeItem('studentName');
    localStorage.removeItem('matricNumber');
    localStorage.removeItem('department');
    window.location.href = 'index.html';
}

window.toggleTheme = function () {
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.body.removeAttribute('data-theme');
        localStorage.setItem('gaposaTheme', 'light');
    } else {
        document.body.setAttribute('data-theme', 'dark');
        localStorage.setItem('gaposaTheme', 'dark');
    }
}

function scrollToBottom() {
    const chatArea = document.getElementById('chatArea');
    chatArea.scrollTop = chatArea.scrollHeight;
}

function getCurrentTime() {
    const now = new Date();
    let hours = now.getHours();
    let minutes = now.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    minutes = minutes < 10 ? '0' + minutes : minutes;
    return `Today, ${hours}:${minutes} ${ampm}`;
}

window.appendMessage = function (text, isBot = true, isDocument = false, docData = null) {
    const chatArea = document.getElementById('chatArea');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isBot ? 'bot' : 'user'}`;

    let contentHtml = `<div class="msg-bubble">${text}`;

    if (isDocument && docData) {
        const doc = window.cachedDocuments[docData.id];
        
        contentHtml += `
            <div class="doc-card" style="margin-top: 10px; background: rgba(255,255,255,0.7); padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; align-items: center; justify-content: space-between;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <i class="fa-solid fa-file-contract" style="color: #1e3a8a; font-size: 1.2rem;"></i>
                    <div style="text-align: left;">
                        <div style="font-weight: 600; font-size: 0.85rem; color: #1e293b;">${docData.name}</div>
                        <div style="font-size: 0.75rem; color: #64748b;">${docData.size}</div>
                    </div>
                </div>
                <button onclick="viewDocument('${docData.id}')" 
                        style="background: #1e3a8a; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.8rem; font-weight: 600;">
                    Preview & View
                </button>
            </div>
        `;
    }


    contentHtml += `</div><div class="msg-time">${getCurrentTime()}</div>`;
    msgDiv.innerHTML = contentHtml;
    chatArea.appendChild(msgDiv);
    scrollToBottom();
}

window.sendQuickMessage = function (msg) {
    document.getElementById('messageInput').value = msg;
    window.sendMessage();
}

function handleEnter(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
}

// --- Yellow File Modal Logic ---

window.openYellowFileModal = function () {
    document.getElementById('yellowFileModal').style.display = 'flex';
}

window.closeYellowFileModal = function () {
    document.getElementById('yellowFileModal').style.display = 'none';
    document.getElementById('levelSelect').value = '';
    document.getElementById('uploadFieldsContainer').innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Please select your program level to view required documents.</div>';

    const btn = document.getElementById('submitBundleBtn');
    btn.disabled = true;
    btn.textContent = 'Select Level First';
}

const ND_DOCS = [
    { id: 'nd_biodata', label: 'Application Biodata' },
    { id: 'nd_admission', label: 'School Admission Letter' },
    { id: 'nd_olevel', label: "O'Level Result" },
    { id: 'nd_jamb', label: 'Jamb Admission Letter' },
    { id: 'nd_birth', label: 'Birth Certificate' },
    { id: 'nd_origin', label: 'State of Origin' },
    { id: 'nd_medical', label: 'Original Medical Form' },
    { id: 'nd_reference', label: 'Reference Letter' },
    { id: 'nd_tax', label: 'Verified Tax clearance' },
    { id: 'nd_course', label: 'Course Registration form' },
    { id: 'nd_oath', label: 'Matric Oath' }
];

const HND_DOCS = [
    { id: 'hnd_biodata', label: 'Application Biodata' },
    { id: 'hnd_admission', label: 'School Admission Letter' },
    { id: 'hnd_olevel', label: "O'Level Result" },
    { id: 'hnd_jamb', label: 'Jamb Admission Letter' },
    { id: 'hnd_notification', label: 'Notification of result' },
    { id: 'hnd_it', label: 'I.T Completion Letter' },
    { id: 'hnd_birth', label: 'Birth Certification' },
    { id: 'hnd_origin', label: 'State of Origin' },
    { id: 'hnd_medical', label: 'Original Medical Form' },
    { id: 'hnd_reference', label: 'Reference Letter' },
    { id: 'hnd_tax', label: 'Verified Tax clearance' },
    { id: 'hnd_course', label: 'Course Registration form' },
    { id: 'hnd_oath', label: 'Matric Oath Form' }
];

window.generateUploadFields = function () {
    const level = document.getElementById('levelSelect').value;
    const container = document.getElementById('uploadFieldsContainer');
    const btn = document.getElementById('submitBundleBtn');

    if (!level) {
        container.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;">Please select your program level to view required documents.</div>';
        btn.disabled = true;
        btn.textContent = 'Select Level First';
        return;
    }

    const docs = level === 'ND' ? ND_DOCS : HND_DOCS;

    let html = `<div style="font-weight: 500; margin-bottom: 12px; color: #0f766e;">Required Documents for ${level}:</div>`;

    docs.forEach(doc => {
        html += `
            <div style="margin-bottom: 15px; background: #f8fafc; padding: 10px; border-radius: 8px; border: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center;">
                <label style="font-size: 0.9rem; font-weight: 500;">${doc.label} <span style="color: red;">*</span></label>
                <input type="file" id="${doc.id}" class="yellow-file-doc" data-label="${doc.label}" accept="image/*,.pdf" style="font-size: 0.8rem; width: 200px;">
            </div>
        `;
    });

    container.innerHTML = html;

    btn.disabled = false;
    btn.textContent = 'Submit Bundle';
}

window.submitYellowFileBundle = async function () {
    const level = document.getElementById('levelSelect').value;
    const inputs = document.querySelectorAll('.yellow-file-doc');
    const matric = localStorage.getItem('matricNumber');
    const btn = document.getElementById('submitBundleBtn');

    // 1. Validation: Ensure all files are selected
    let allFilled = true;
    inputs.forEach(input => {
        if (!input.files || input.files.length === 0) {
            allFilled = false;
        }
    });

    if (!allFilled) {
        alert("Please attach all required documents before submitting your Yellow File.");
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Uploading... Please wait';

    try {
        // 2. Read all files into Base64 format asynchronously
        const documentBundle = [];

        for (let i = 0; i < inputs.length; i++) {
            const input = inputs[i];
            const file = input.files[0];
            const label = input.getAttribute('data-label');

            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });

            documentBundle.push({
                label: label,
                fileName: file.name,
                fileType: file.type,
                fileData: base64Data
            });
        }

        // 3. POST the bundle to the new backend
        const response = await fetch(window.GAPOSA_API_URL + '/api/yellow-files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                matric: matric,
                level: level,
                documents: documentBundle // Sending the full array
            })
        });

        const data = await response.json();

        closeYellowFileModal();

        if (data.success) {
            appendMessage(`✅ Thank you. Your ${level} Yellow File bundle containing ${documentBundle.length} documents has been securely submitted to the Admin office.`);
        } else {
            appendMessage("❌ Error submitting file: " + (data.message || 'Unknown error.'));
        }

    } catch (err) {
        console.error("Bundle Error:", err);
        appendMessage("❌ Network error connecting to school database. Please try again or upload smaller files.");
        window.closeYellowFileModal();
    }
}

// --- Profile Management Logic ---

window.openProfileModal = function() {
    document.getElementById('profileName').value = localStorage.getItem('studentName') || '';
    
    const currentDept = (localStorage.getItem('department') || '').toUpperCase().trim();
    const deptSelect = document.getElementById('profileDept');
    if (deptSelect) {
        // Try to match current dept to a dropdown option
        let matched = false;
        for (let i = 0; i < deptSelect.options.length; i++) {
            if (deptSelect.options[i].value === currentDept) {
                deptSelect.selectedIndex = i;
                matched = true;
                break;
            }
        }
        if (!matched) deptSelect.selectedIndex = 0; // Default to first option
    }
    
    document.getElementById('profileModal').style.display = 'flex';
}

window.closeProfileModal = function() {
    document.getElementById('profileModal').style.display = 'none';
}

window.testAPIConnection = async function() {
    const rootUrl = window.GAPOSA_API_URL + '/ping';
    const apiHealth = window.GAPOSA_API_URL + '/api/health';
    
    console.log(`[DIAG] Testing connection to ${rootUrl} and ${apiHealth}`);
    
    try {
        const pingRes = await fetch(rootUrl);
        const pingData = await pingRes.json();
        
        const healthRes = await fetch(apiHealth);
        const healthData = await healthRes.json();
        
        alert(`✅ CONNECTION SUCCESS!\n\nRoot Ping (v2.4): ${pingData.message}\nAPI Health: ${healthData.message}\n\nServer Time: ${pingData.time}\n\nServer is fully responsive!`);
    } catch (err) {
        alert(`❌ CONNECTION FAILED\n\nTarget: ${window.GAPOSA_API_URL}\nError: ${err.message}\n\nThis usually means the backend server is NOT running. Please check your terminal.`);
    }
}

window.saveProfile = async function() {
    const name = document.getElementById('profileName').value.trim();
    const department = document.getElementById('profileDept').value.trim();
    const matric = localStorage.getItem('matricNumber');

    if (!matric) {
        alert("Session Error: Matriculation number missing. Please log in again.");
        return;
    }

    if (!name) {
        alert("Please enter your full name.");
        return;
    }

    try {
        const response = await fetch(`${window.GAPOSA_API_URL}/api/student-profile-v2`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ matric, name, department })
        });

        if (!response.ok) {
            const contentType = response.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
                const errData = await response.json();
                throw new Error(errData.message || `Server Error ${response.status}`);
            } else {
                const errText = await response.text();
                console.error("Non-JSON Error Response:", errText);
                throw new Error(`Critical Server Error (${response.status}). Please check your backend terminal logs.`);
            }
        }

        const data = await response.json();
        if (data.success) {
            localStorage.setItem('studentName', data.user.name);
            localStorage.setItem('department', data.user.department);
            
            // Update UI
            if (document.getElementById('displayStudentName')) document.getElementById('displayStudentName').textContent = data.user.name;
            if (document.getElementById('displayDepartment')) document.getElementById('displayDepartment').textContent = data.user.department;
            if (document.getElementById('chatGreetingName')) document.getElementById('chatGreetingName').textContent = data.user.name.split(' ')[0];
            
            alert("Profile updated successfully!");
            closeProfileModal();
        } else {
            alert("Update Failed: " + data.message);
        }
    } catch (err) {
        console.error("Profile Save Error:", err);
        alert(`Update Error: ${err.message || 'Network connection failed'}`);
    }
}

window.sendMessage = function () {
    const input = document.getElementById('messageInput');
    const text = input.value.trim();

    if (!text) return;

    // Add user message
    appendMessage(text, false);
    input.value = '';

    // Simulate Bot Response
    setTimeout(() => {
        processBotResponse(text);
    }, 1000);
}

function processBotResponse(text) {
    const lowerText = text.toLowerCase();

    if (lowerText.includes('it letter') || lowerText.includes('placement')) {
        appendMessage("I have received your request for an IT Placement Letter. This document must be manually processed and issued by the School Administrator. Please wait while it is reviewed; you will be notified when the admin has disbursed it to you.");
    }
    else if (lowerText.includes('memo') || lowerText.includes('circular') || lowerText.includes('document')) {
        appendMessage("Let me check the database for your official documents...");
        setTimeout(fetchDocuments, 1000);
    }
    else if (lowerText.includes('yellow file')) {
        appendMessage("To submit your Yellow file, please use the attachment 'paperclip' icon next to the chat box to upload your scanned document.");
    }
    else {
        appendMessage("I'm sorry, I process mainly Paperwork like IT Letters, Memos, and Yellow Files. Try asking for 'My IT Letter' or 'Submit Yellow File'.");
    }
}

async function fetchDocuments() {
    const matric = localStorage.getItem('matricNumber');
    try {
        const response = await fetch(`${window.GAPOSA_API_URL}/api/documents?matric=${encodeURIComponent(matric)}`);
        const data = await response.json();

        if (data.success && data.documents.length > 0) {
            // Check if we have new documents to notify about
            const lastCount = parseInt(localStorage.getItem('gaposa_doc_count') || '0');
            if (data.documents.length > lastCount) {
                showBrowserNotif("New Document Received", `Admin has sent you ${data.documents.length - lastCount} new document(s).`);
                localStorage.setItem('gaposa_doc_count', data.documents.length);
            }

            appendMessage(`I found ${data.documents.length} official document(s) for you:`);

            data.documents.forEach(doc => {
                // Calculate rough file size from base64 string length
                const sizeKb = Math.round((doc.file_data.length * 0.75) / 1024);
                window.cachedDocuments[doc.id] = doc;

                appendMessage(`[${doc.doc_type.toUpperCase()}] ${doc.title}`, false, true, {
                    id: doc.id,
                    name: doc.file_name,
                    size: sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB'
                });
            });
        } else if (data.success && data.documents.length === 0) {
            appendMessage("You currently have no new documents or memos pending in your file.");
        }
    } catch (err) {
        console.error("Error fetching documents:", err);
        appendMessage("Sorry, I could not connect to the school database to check your documents.");
    }
}

function downloadFile(docId) {
    const doc = window.cachedDocuments[docId];
    if (!doc) {
        alert("Sorry, this document no longer exists or could not be verified.");
        return;
    }

    const a = document.createElement('a');
    a.href = doc.file_data; 
    a.download = doc.file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function viewDocument(docId) {
    const doc = window.cachedDocuments[docId];
    if (!doc) {
        alert("Document not found.");
        return;
    }

    if (doc.doc_type === 'it_letter') {
        renderTemplateLetter(doc);
    } else {
        renderGenericPreview(doc);
    }
}

function renderGenericPreview(doc) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.style.zIndex = '10000';
    
    let previewHtml = '';
    if (doc.file_type.startsWith('image/')) {
        previewHtml = `<img src="${doc.file_data}" style="max-width: 100%; max-height: 100%; object-fit: contain; box-shadow: 0 10px 25px rgba(0,0,0,0.2);">`;
    } else if (doc.file_type === 'application/pdf' || doc.file_data.startsWith('data:application/pdf')) {
        previewHtml = `<iframe src="${doc.file_data}" style="width: 100%; height: 100%; border: none; box-shadow: 0 10px 25px rgba(0,0,0,0.1);"></iframe>`;
    } else if (doc.doc_type === 'system') {
        previewHtml = `
            <div style="background: white; padding: 40px; border-radius: 12px; text-align: center; max-width: 500px;">
                <i class="fa-solid fa-circle-info" style="font-size: 3rem; color: #0f766e; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px;">System Notification</h3>
                <p style="color: #475569; line-height: 1.6;">${doc.file_name}</p>
                <button onclick="this.closest('.modal-overlay').remove()" style="margin-top: 25px; padding: 10px 25px; background: #0f766e; color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
            </div>
        `;
    } else {
        previewHtml = `
            <div style="background: white; padding: 40px; border-radius: 12px; text-align: center;">
                <i class="fa-solid fa-file-circle-exclamation" style="font-size: 3rem; color: #94a3b8; margin-bottom: 20px;"></i>
                <h3>Preview Not Supported</h3>
                <p style="color: #64748b;">This file type (${doc.file_type}) cannot be previewed in the browser.</p>
                <button onclick="downloadFile('${doc.id}')" style="margin-top: 20px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer;">Download instead</button>
            </div>
        `;
    }

    modal.innerHTML = `
        <div style="background: white; width: 95%; max-width: 1000px; height: 90vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="padding: 15px 25px; background: #1e293b; color: white; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif;">${doc.title}</h3>
                <div style="display: flex; gap: 10px;">
                    ${doc.doc_type !== 'system' ? `
                    <button onclick="downloadFile('${doc.id}')" style="background: #0ea5e9; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 600; display: flex; align-items: center; gap: 8px;">
                        <i class="fa-solid fa-download"></i> Download
                    </button>` : ''}
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">&times;</button>
                </div>
            </div>
            <div style="flex: 1; overflow: auto; background: #f1f5f9; display: flex; justify-content: center; align-items: center; padding: 20px;">
                ${previewHtml}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

async function renderTemplateLetter(doc) {
    const matric = localStorage.getItem('matricNumber');
    const pdfUrl = `${window.GAPOSA_API_URL}/api/documents/${doc.id}/generate-pdf?matric=${encodeURIComponent(matric)}`;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.cssText = 'display:flex; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); z-index:10000; align-items:center; justify-content:center;';
    modal.innerHTML = `
        <div style="background: white; width: 95%; max-width: 1000px; height: 95vh; border-radius: 12px; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="padding: 15px 25px; background: #0f766e; color: white; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="margin: 0; font-family: 'Inter', sans-serif;">Official Placement Letter</h3>
                <div style="display: flex; gap: 10px;">
                    <a href="${pdfUrl}" download="IT_Placement_Letter.pdf" style="background: #fbbf24; color: #1e293b; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 700; font-family: 'Inter', sans-serif; text-decoration: none; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-download"></i> Download PDF
                    </a>
                    <button onclick="window.print()" style="background: #14b8a6; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 700; font-family: 'Inter', sans-serif; display:flex; align-items:center; gap:8px;">
                        <i class="fa-solid fa-print"></i> Print Letter
                    </button>
                    <button onclick="this.closest('.modal-overlay').remove()" style="background: rgba(255,255,255,0.2); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;">&times;</button>
                </div>
            </div>
            <div id="itPreviewContainer${doc.id}" style="flex: 1; overflow: auto; background: #94a3b8; display: flex; justify-content: center; align-items: flex-start; padding: 30px;">
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; gap:15px;">
                    <i class="fa-solid fa-spinner fa-spin" style="font-size: 2.5rem;"></i>
                    <p>Preparing your letter preview...</p>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    try {
        const config = JSON.parse(doc.config_json || '{}');
        const getFont = (f) => f || "'Times New Roman', serif";
        const getSize = (s) => parseInt(s) || 12;

        const studentName = (localStorage.getItem('studentName') || 'STUDENT NAME').toUpperCase();
        const dept = (localStorage.getItem('department') || 'COMPUTER SCIENCE').toUpperCase();

        const container = document.getElementById(`itPreviewContainer${doc.id}`);
        if (!container) return;
        container.innerHTML = `
            <div style="display:flex; flex-direction:column; align-items:center; width:100%;">
                <div style="transform: scale(0.65); transform-origin: top center; margin-bottom: -400px;">
                    <div class="a4-drawing-board" style="background-image: url('${doc.file_data}'); background-size: 100% 100%;">
                        <div style="position:absolute; left:${config.nameX}%; top:${config.nameY}%; font-family:${getFont(config.nameFont)}; font-size:${getSize(config.nameSize)}pt; font-weight:bold; white-space:nowrap;">${studentName}</div>
                        <div style="position:absolute; left:${config.matricX}%; top:${config.matricY}%; font-family:${getFont(config.matricFont)}; font-size:${getSize(config.matricSize)}pt; font-weight:bold; white-space:nowrap;">${matric}</div>
                        <div style="position:absolute; left:${config.name2X}%; top:${config.name2Y}%; font-family:${getFont(config.name2Font)}; font-size:${getSize(config.name2Size)}pt; font-weight:bold; white-space:nowrap;">${studentName}</div>
                        <div style="position:absolute; left:${config.deptX}%; top:${config.deptY}%; font-family:${getFont(config.deptFont)}; font-size:${getSize(config.deptSize)}pt; font-weight:bold; white-space:nowrap;">${dept}</div>
                    </div>
                </div>
                <div style="margin-top:30px; padding:20px; background:#f8fafc; border-radius:8px; text-align:center;">
                    <p style="color:#64748b; margin-bottom:15px;"><i class="fa-solid fa-circle-check" style="color:#10b981;"></i> Live preview of your official letter</p>
                    <div style="display:flex; gap:15px; justify-content:center;">
                        <a href="${pdfUrl}" download="IT_Letter.pdf"
                           onclick="this.textContent='Preparing PDF...'; setTimeout(()=>this.innerHTML='<i class=\'fa-solid fa-download\'></i> Download Official PDF',5000)"
                           style="background:#0f766e; color:white; padding:12px 25px; border-radius:8px; font-weight:700; text-decoration:none; display:inline-flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-download"></i> Download Official PDF
                        </a>
                        <button onclick="window.print()"
                           style="background:#14b8a6; color:white; padding:12px 25px; border:none; border-radius:8px; font-weight:700; cursor:pointer; display:inline-flex; align-items:center; gap:10px;">
                            <i class="fa-solid fa-print"></i> Print Now
                        </button>
                    </div>
                </div>
            </div>
        `;
    } catch (err) {
        console.error('Preview Render Error:', err);
        const container = document.getElementById(`itPreviewContainer${doc.id}`);
        if (container) {
            container.innerHTML = `<div style="background:white; padding:30px; border-radius:12px; text-align:center;">
                <i class="fa-solid fa-triangle-exclamation" style="font-size:3rem; color:#f59e0b; margin-bottom:15px;"></i>
                <h3>Preview Error</h3>
                <p style="color:#64748b;">Could not render preview: ${err.message}</p>
                <a href="${pdfUrl}" download style="margin-top:15px; display:inline-block; padding:10px 20px; background:#0f766e; color:white; border-radius:8px; text-decoration:none;">Download PDF Instead</a>
            </div>`;
        }
    }
}

function showBrowserNotif(title, body) {
    if ("Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'logo.png'
        });
    }
}
