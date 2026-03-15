// Admin app logic

// --- Base Configuration ---
const getBaseUrl = () => {
    if (window.location.port === '3000' || window.location.port === '') return '';
    return 'http://localhost:3000';
};
window.GAPOSA_API_URL = getBaseUrl();
console.log(`[SYS] Admin API pointing to: ${window.GAPOSA_API_URL || 'Current Origin'}`);

document.addEventListener('DOMContentLoaded', () => {
    // Check auth
    if (localStorage.getItem('userType') !== 'admin') {
        window.location.href = 'admin.html';
        return;
    }

    // Set Admin info
    const adminId = localStorage.getItem('adminId') || 'Admin';
    document.getElementById('displayAdminId').textContent = adminId;

    // Apply saved theme
    const savedTheme = localStorage.getItem('gaposaTheme');
    if (savedTheme === 'dark') {
        document.body.setAttribute('data-theme', 'dark');
    }


    // Fetch live dashboard metrics and submissions
    fetchDashboardStats();
    fetchYellowFiles();
    fetchRecentDocuments();

    // Toggle IT Letter Template Editor
    const docTypeSelect = document.getElementById('docType');
    if (docTypeSelect) {
        const updateUI = () => {
            const configGroup = document.getElementById('itLetterConfigGroup');
            const fileGroup = document.getElementById('fileUploadGroup');
            const fileInput = document.getElementById('docFile');
            const uploadLabel = document.getElementById('uploadLabel');
            const submitBtn = document.getElementById('submitBtn');

            if (docTypeSelect.value === 'it_letter') {
                configGroup.style.display = 'block';
                fileGroup.style.display = 'block';
                uploadLabel.textContent = 'Upload Image Template (PNG/JPG)';
                fileInput.accept = 'image/png, image/jpeg';
                fileInput.required = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles" style="margin-right: 8px;"></i> Upload Template & Configure';
            } else {
                configGroup.style.display = 'none';
                fileGroup.style.display = 'block';
                uploadLabel.textContent = 'Attach File';
                fileInput.removeAttribute('accept');
                fileInput.required = true;
                submitBtn.innerHTML = '<i class="fa-solid fa-upload" style="margin-right: 8px;"></i> Upload & Disburse Document';
            }
        };

        docTypeSelect.addEventListener('change', updateUI);
        updateUI(); // Run once on load
    }

    // Check for notification permission on load
    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission();
    }

    // Set initial toggle state
    const notifEnabled = localStorage.getItem('gaposaNotifEnabled') !== 'false';
    const notifToggle = document.getElementById('notifToggle');
    if (notifToggle) {
        notifToggle.checked = notifEnabled;
    }

    // Sidebar Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const tabId = item.getAttribute('onclick')?.match(/'([^']+)'/)?.[1] || 
                          (item.textContent.toLowerCase().includes('overview') ? 'overview' : 
                           item.textContent.toLowerCase().includes('send') ? 'send-docs' : 
                           item.textContent.toLowerCase().includes('student') ? 'manage-students' : 
                           item.textContent.toLowerCase().includes('yellow') ? 'review-yellow' : '');
            
            if (tabId) {
                // If the user already has inline onclick, let it handle. 
                // But we'll add a robust manual handler here too.
                window.switchTab(tabId);
            }
        });
    });

    // Default to overview for safety
    window.switchTab('overview');
});

// Global Tab Switching Function
window.switchTab = function(tabId) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(sec => {
        sec.style.display = 'none';
    });

    // Show target section
    const target = document.getElementById(`section-${tabId}`);
    if (target) {
        target.style.display = 'block';
    }

    // Update Sidebar Active State
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        const onclickAttr = item.getAttribute('onclick') || '';
        if (onclickAttr.includes(tabId)) {
            item.classList.add('active');
        }
    });

    // Perspective-specific data fetching
    if (tabId === 'overview') {
        fetchDashboardStats();
        fetchYellowFiles();
        fetchRecentDocuments();
    } else if (tabId === 'review-yellow') {
        fetchYellowFiles();
    }
};

// Cache for storing base64 strings securely without crowding the DOM
window.cachedYellowFiles = {};

window.handleNotifToggle = function (checkbox) {
    localStorage.setItem('gaposaNotifEnabled', checkbox.checked);
};

window.showBrowserNotif = function (title, body) {
    if (localStorage.getItem('gaposaNotifEnabled') !== 'false' && "Notification" in window && Notification.permission === "granted") {
        new Notification(title, {
            body: body,
            icon: 'logo.png'
        });
    }
};

async function fetchDashboardStats() {
    try {
        const response = await fetch(window.GAPOSA_API_URL + '/api/stats');
        const data = await response.json();

        if (data.success) {
            document.getElementById('statItLetters').textContent = data.stats.itLetters;
            document.getElementById('statYellowFiles').textContent = data.stats.pendingYellowFiles;
            document.getElementById('statStudents').textContent = data.stats.students.toLocaleString();
        }
    } catch (err) {
        console.error("Failed to load dashboard statistics:", err);
    }
}

window.logout = function () {
    localStorage.removeItem('userType');
    localStorage.removeItem('adminId');
    window.location.href = 'admin.html';
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

window.handleAdminSubmit = async function (e) {
    e.preventDefault();

    const docTypeSelect = document.getElementById('docType');
    const docTypeStr = docTypeSelect.value;
    const targetMatric = document.getElementById('targetMatric').value.trim() || 'ALL';
    const fileInput = document.getElementById('docFile');

    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn.innerHTML;

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';
    btn.disabled = true;

    try {
        if (!fileInput.files[0]) {
            alert("Please attach a file.");
            btn.innerHTML = originalText;
            btn.disabled = false;
            return;
        }

        const file = fileInput.files[0];
        let base64 = "";

        // If the file is a PDF, we must render it to a Canvas first to get an image for our email/PDF system.
        if (file.type === 'application/pdf' && docTypeStr === 'it_letter') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            
            // Standard A4 aspect ratio scaling
            const viewport = page.getViewport({ scale: 3.0 }); // High scale for clarity
            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext('2d');
            
            await page.render({ canvasContext: ctx, viewport: viewport }).promise;
            base64 = canvas.toDataURL('image/jpeg', 0.9);
        } else {
            // Standard Image upload
            base64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(file);
            });
        }

        // Auto-resize IT Letters to strictly 2480 x 3508 (A4 300dpi) before sending to backend
        if (docTypeStr === 'it_letter') {
            base64 = await new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    canvas.width = 2480;
                    canvas.height = 3508;
                    const ctx = canvas.getContext('2d');
                    // Draw image scaled to A4, effectively forcing the template size
                    ctx.drawImage(img, 0, 0, 2480, 3508);
                    resolve(canvas.toDataURL('image/jpeg', 0.9));
                };
                img.src = base64;
            });
        }

        let payload = {
            targetMatric: targetMatric,
            docType: docTypeStr,
            title: docTypeSelect.options[docTypeSelect.selectedIndex].text,
            fileName: file.name,
            fileType: 'image/jpeg', // Force jpeg if we resized
            fileData: base64
        };

        if (docTypeStr === 'it_letter') {
            const config = {
                nameX: parseFloat(document.getElementById('nameX').value),
                nameY: parseFloat(document.getElementById('nameY').value),
                matricX: parseFloat(document.getElementById('matricX').value),
                matricY: parseFloat(document.getElementById('matricY').value),
                name2X: parseFloat(document.getElementById('name2X').value),
                name2Y: parseFloat(document.getElementById('name2Y').value),
                deptX: parseFloat(document.getElementById('deptX').value),
                deptY: parseFloat(document.getElementById('deptY').value),
                nameFont: document.getElementById('nameFont').value,
                nameSize: document.getElementById('nameSize').value,
                matricFont: document.getElementById('matricFont').value,
                matricSize: document.getElementById('matricSize').value,
                name2Font: document.getElementById('name2Font').value,
                name2Size: document.getElementById('name2Size').value,
                deptFont: document.getElementById('deptFont').value,
                deptSize: document.getElementById('deptSize').value
            };
            payload.configJson = JSON.stringify(config);
        }

        const response = await fetch(window.GAPOSA_API_URL + '/api/documents', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();
        if (data.success) {
            const displayName = targetMatric === 'ALL' ? 'ALL STUDENTS' : targetMatric;
            alert(`Success! Document has been disbursed successfully to ${displayName}`);
            e.target.reset();
            fetchDashboardStats();
            fetchYellowFiles();
            fetchRecentDocuments();
        } else {
            alert(data.message || 'Failed to disburse document.');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('A network error occurred.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
};

async function fetchYellowFiles() {
    try {
        const response = await fetch(window.GAPOSA_API_URL + '/api/yellow-files');
        const data = await response.json();
        const overviewList = document.getElementById('yellowFilesList');
        const fullList = document.getElementById('fullYellowFilesList');

        if (data.success && data.yellowFiles.length > 0) {
            // Notification logic for Admin
            const lastFileCount = parseInt(localStorage.getItem('gaposa_last_yellow_file_count') || '0');
            if (data.yellowFiles.length > lastFileCount) {
                window.showBrowserNotif("New Student Submission", `There are ${data.yellowFiles.length - lastFileCount} new yellow file(s) pending review.`);
                localStorage.setItem('gaposa_last_yellow_file_count', data.yellowFiles.length);
            } else if (data.yellowFiles.length < lastFileCount) {
                 localStorage.setItem('gaposa_last_yellow_file_count', data.yellowFiles.length);
            }

            if (overviewList) overviewList.innerHTML = '';
            if (fullList) fullList.innerHTML = '';

            data.yellowFiles.forEach(file => {
                window.cachedYellowFiles[file.id] = file;
                const docsCount = file.documents_json ? JSON.parse(file.documents_json).length : 0;

                const fileHtml = `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 15px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="background: rgba(245, 158, 11, 0.1); color: #b45309; padding: 12px; border-radius: 10px;">
                            <i class="fa-solid fa-folder-open"></i>
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #1e293b;">${file.student_name} (${file.matric_number}) <span style="font-size: 0.8rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 8px;">${file.level}</span></div>
                            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">
                                ${new Date(file.submitted_at).toLocaleDateString()}
                                • ${docsCount} Documents Attached
                            </div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 10px;">
                        <button onclick="window.openReviewModal('${file.id}')" style="background: #0ea5e9; color: white; border: none; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-weight: 500; transition: background 0.2s;">
                            <i class="fa-solid fa-magnifying-glass" style="margin-right: 5px;"></i> Review
                        </button>
                    </div>
                </div>
                `;

                if (overviewList) overviewList.innerHTML += fileHtml;
                if (fullList) fullList.innerHTML += fileHtml;
            });

        } else if (data.success) {
            const noData = '<div style="color: #64748b; font-size: 0.9rem; text-align: center; padding: 20px;">No pending yellow file submissions found.</div>';
            if (overviewList) overviewList.innerHTML = noData;
            if (fullList) fullList.innerHTML = noData;
        }
    } catch (err) {
        console.error("Failed to fetch yellow files:", err);
        const errData = '<div style="color: #ef4444; font-size: 0.9rem; text-align: center; padding: 20px;">Error securely connecting to database.</div>';
        if (overviewList) overviewList.innerHTML = errData;
        if (fullList) fullList.innerHTML = errData;
    }
}

let activeReviewBundle = null;

window.openReviewModal = function (bundleId) {
    const bundle = window.cachedYellowFiles[bundleId];
    if (!bundle || !bundle.documents_json) {
        alert("Sorry, bundle data is corrupted or missing from the database.");
        return;
    }

    activeReviewBundle = bundle; // Store for the "Download All" button
    const docs = JSON.parse(bundle.documents_json);

    document.getElementById('bundleStudentInfo').textContent = `${bundle.student_name} (${bundle.matric_number}) - ${bundle.level} Program`;

    const listDiv = document.getElementById('bundleDocumentsList');
    listDiv.innerHTML = '';

    docs.forEach((doc, index) => {
        const sizeKb = doc.fileData ? Math.round((doc.fileData.length * 0.75) / 1024) : 0;
        const displaySize = sizeKb > 1024 ? (sizeKb / 1024).toFixed(1) + ' MB' : sizeKb + ' KB';

        listDiv.innerHTML += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                <div>
                    <div style="font-weight: 500; font-size: 0.95rem;">${doc.label}</div>
                    <div style="font-size: 0.8rem; color: #64748b; margin-top: 3px;">${doc.fileName} • ${displaySize}</div>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="window.previewDocument('${bundleId}', ${index})" style="background: #0f766e; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                        <i class="fa-solid fa-eye"></i> View
                    </button>
                    <button onclick="window.downloadSingleDocument('${bundleId}', ${index})" style="background: #f8fafc; border: 1px solid #cbd5e1; color: #0f172a; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">
                        <i class="fa-solid fa-cloud-arrow-down"></i>
                    </button>
                </div>
            </div>
        `;
    });

    const actionHtml = `
        <div style="display: flex; justify-content: space-between; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 15px;">
            <button onclick="window.processYellowFile('${bundleId}', 'rejected')" style="background: #ef4444; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                <i class="fa-solid fa-xmark"></i> Reject & Notify Student
            </button>
            <button onclick="window.processYellowFile('${bundleId}', 'accepted')" style="background: #10b981; color: white; border: none; padding: 10px 15px; border-radius: 8px; cursor: pointer; font-weight: 500;">
                <i class="fa-solid fa-check"></i> Accept & Verify Bundle
            </button>
        </div>
    `;
    listDiv.innerHTML += actionHtml;

    document.getElementById('reviewBundleModal').style.display = 'flex';
}

window.closeReviewModal = function () {
    document.getElementById('reviewBundleModal').style.display = 'none';
    activeReviewBundle = null;
}

window.downloadSingleDocument = function (bundleId, docIndex) {
    const bundle = window.cachedYellowFiles[bundleId];
    const docs = JSON.parse(bundle.documents_json);
    const doc = docs[docIndex];

    const a = document.createElement('a');
    a.href = doc.fileData; // base64 payload
    a.download = `${bundle.matric_number.replace(/\//g, '-')}_${doc.label.replace(/\\s+/g, '_')}_${doc.fileName}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

window.downloadAllInBundle = function () {
    if (!activeReviewBundle) return;

    const docs = JSON.parse(activeReviewBundle.documents_json);

    // We add a slight delay between downloads so the browser doesn't block them
    docs.forEach((doc, index) => {
        setTimeout(() => {
            window.downloadSingleDocument(activeReviewBundle.id, index);
        }, index * 800);
    });
}

// ---------------------------------------------------------
// DOCUMENT PREVIEW LOGIC
// ---------------------------------------------------------

window.previewDocument = function (bundleId, docIndex) {
    const bundle = window.cachedYellowFiles[bundleId];
    const docs = JSON.parse(bundle.documents_json);
    const doc = docs[docIndex];

    const previewModal = document.getElementById('previewModal');
    const previewContent = document.getElementById('previewContent');
    const previewTitle = document.getElementById('previewTitle');

    previewTitle.textContent = `Viewing: ${doc.label} (${doc.fileName})`;
    previewContent.innerHTML = '<div style="color: #64748b;"><i class="fa-solid fa-spinner fa-spin"></i> Rendering preview...</div>';
    previewModal.style.display = 'flex';

    setTimeout(() => {
        if (doc.fileType.startsWith('image/')) {
            previewContent.innerHTML = `<img src="${doc.fileData}" alt="${doc.fileName}">`;
        } else if (doc.fileType === 'application/pdf') {
            previewContent.innerHTML = `<iframe src="${doc.fileData}"></iframe>`;
        } else {
            previewContent.innerHTML = `
                <div style="text-align: center; color: #1e293b;">
                    <i class="fa-solid fa-file-circle-exclamation" style="font-size: 3rem; color: #94a3b8; margin-bottom: 15px;"></i>
                    <h3>Preview Not Available</h3>
                    <p>Browser cannot render this file type directy.</p>
                    <button onclick="window.downloadSingleDocument('${bundleId}', ${docIndex})" style="margin-top: 15px; padding: 10px 20px; background: #0ea5e9; color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Download to View
                    </button>
                </div>
            `;
        }
    }, 300);
}

window.closePreview = function () {
    document.getElementById('previewModal').style.display = 'none';
    document.getElementById('previewContent').innerHTML = '';
}

// ---------------------------------------------------------
// RECENT DOCUMENTS / DELETE MEMOS
// ---------------------------------------------------------

async function fetchRecentDocuments() {
    try {
        // In a real app we'd paginate this or restrict to admin-uploaded docs
        const response = await fetch(window.GAPOSA_API_URL + '/api/documents');
        const data = await response.json();
        const listDiv = document.getElementById('recentDocumentsList');

        // We need to add an HTML container for this on the admin dashboard if it doesn't exist
        if (!listDiv) return;

        if (data.success && data.documents.length > 0) {
            listDiv.innerHTML = '';

            // Only show the 10 most recent to avoid clutter
            const recentDocs = data.documents.slice(0, 10);

            recentDocs.forEach(doc => {
                const targetText = doc.target_matric === 'ALL' ? 'All Students' : doc.target_matric;
                const icon = doc.doc_type === 'memo' ? 'fa-file-lines' : (doc.doc_type === 'system' ? 'fa-robot' : 'fa-briefcase');

                listDiv.innerHTML += `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px; border-bottom: 1px solid #f1f5f9;">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <div style="background: #f1f5f9; padding: 8px; border-radius: 8px; color: #475569;">
                                <i class="fa-solid ${icon}"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500; font-size: 0.95rem;">${doc.title} <span style="font-size: 0.75rem; background: #e2e8f0; padding: 2px 6px; border-radius: 4px; margin-left: 6px;">${doc.doc_type.toUpperCase()}</span></div>
                                <div style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">Target: ${targetText} • ${new Date(doc.uploaded_at).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <button onclick="window.deleteDocument('${doc.id}')" style="background: #fee2e2; color: #ef4444; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; transition: background 0.2s;" onmouseover="this.style.background='#fecaca'" onmouseout="this.style.background='#fee2e2'">
                            <i class="fa-solid fa-trash-can"></i> Delete
                        </button>
                    </div>
                `;
            });
        } else if (data.success) {
            listDiv.innerHTML = '<div style="color: #64748b; font-size: 0.9rem; text-align: center; padding: 20px;">No documents sent yet.</div>';
        }
    } catch (err) {
        console.error("Failed to fetch recent documents:", err);
    }
}

window.deleteDocument = async function (docId) {
    if (!confirm("Are you sure you want to completely delete this document/memo? It will be removed from all student inboxes.")) return;

    try {
        const response = await fetch(`${window.GAPOSA_API_URL}/api/documents/${docId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            fetchRecentDocuments();
            fetchDashboardStats();
        } else {
            alert("Error deleting document: " + data.message);
        }
    } catch (err) {
        console.error("Delete Error:", err);
        alert("A network error occurred.");
    }
}

window.processYellowFile = async function (bundleId, actionStatus) {
    const confirmationText = actionStatus === 'accepted' ? 'ACCEPT' : 'REJECT';
    if (!confirm(`Are you sure you want to ${confirmationText} this Yellow File bundle? This action cannot be undone and will notify the student.`)) return;

    try {
        const response = await fetch(`${window.GAPOSA_API_URL}/api/yellow-files/${bundleId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: actionStatus })
        });

        const data = await response.json();
        if (data.success) {
            alert(`Yellow File ${actionStatus.toUpperCase()} successfully.`);
            window.closeReviewModal();
            fetchDashboardStats();
            fetchYellowFiles(); // Refresh list to remove it
        } else {
            alert("Error: " + data.message);
        }
    } catch (err) {
        console.error("Processing Error:", err);
        alert("A network error occurred connecting to the database.");
    }
}
// ----------------------------------------------------
// Drag and Drop Interactive Template Logic
// ----------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    const fileInput = document.getElementById('docFile');
    const docTypeSelect = document.getElementById('docType');
    const previewContainer = document.getElementById('templatePreviewContainer');
    const previewImg = document.getElementById('templatePreviewImg');
    const nameXInput = document.getElementById('nameX');
    const nameYInput = document.getElementById('nameY');
    const matricXInput = document.getElementById('matricX');
    const matricYInput = document.getElementById('matricY');
    const name2XInput = document.getElementById('name2X');
    const name2YInput = document.getElementById('name2Y');
    const deptXInput = document.getElementById('deptX');
    const deptYInput = document.getElementById('deptY');
    
    // Per-field typography inputs
    const nameFontInput = document.getElementById('nameFont');
    const nameSizeInput = document.getElementById('nameSize');
    const matricFontInput = document.getElementById('matricFont');
    const matricSizeInput = document.getElementById('matricSize');
    const name2FontInput = document.getElementById('name2Font');
    const name2SizeInput = document.getElementById('name2Size');
    const deptFontInput = document.getElementById('deptFont');
    const deptSizeInput = document.getElementById('deptSize');

    const dragName = document.getElementById('dragName');
    const dragMatric = document.getElementById('dragMatric');
    const dragName2 = document.getElementById('dragName2');
    const dragDept = document.getElementById('dragDept');

    // Handle File Upload Preview
    fileInput.addEventListener('change', async (e) => {
        if (docTypeSelect.value !== 'it_letter') return;
        const file = e.target.files[0];
        if (!file) {
            previewContainer.style.display = 'none';
            return;
        }

        let base64 = "";
        try {
            if (file.type === 'application/pdf') {
                const arrayBuffer = await file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                const page = await pdf.getPage(1);
                const viewport = page.getViewport({ scale: 2.0 });
                const canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                const ctx = canvas.getContext('2d');
                await page.render({ canvasContext: ctx, viewport: viewport }).promise;
                base64 = canvas.toDataURL('image/jpeg', 0.8);
            } else {
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.readAsDataURL(file);
                });
            }

            // Reveal the interactive canvas bounds mapping tool
            previewImg.src = base64;
            previewImg.onload = () => {
                previewContainer.style.display = 'block';
                updateDraggablePositionsFromInputs(); // Sync the absolute pixels based on initial % Inputs
            };
        } catch (err) {
            console.error("Preview render error:", err);
            alert("Failed to render file preview. Ensure it is a valid image or PDF.");
        }
    });

    // Make elements draggable visually
    setupDraggable(dragName, nameXInput, nameYInput, nameSizeInput);
    setupDraggable(dragMatric, matricXInput, matricYInput, matricSizeInput);
    setupDraggable(dragName2, name2XInput, name2YInput, name2SizeInput);
    setupDraggable(dragDept, deptXInput, deptYInput, deptSizeInput);

    function setupDraggable(element, xInput, yInput, sizeInput) {
        let isDragging = false;
        let isResizing = false;
        let startMouseX, startMouseY;
        let startPosX, startPosY;
        let startFontSize;

        // Visual feedback
        element.addEventListener('mousedown', (e) => {
            // Check if clicking resize handle
            if (e.target.classList.contains('resize-handle')) {
                isResizing = true;
                startFontSize = parseFloat(sizeInput.value) || 14;
            } else {
                isDragging = true;
            }

            element.classList.add('active');
            if (isDragging) element.classList.add('dragging');
            
            startPosX = parseFloat(element.style.left) || 0;
            startPosY = parseFloat(element.style.top) || 0;
            startMouseX = e.clientX;
            startMouseY = e.clientY;
            
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging && !isResizing) return;

            const dx = e.clientX - startMouseX;
            const dy = e.clientY - startMouseY;

            const w = 794;
            const h = 1123;

            if (isDragging) {
                let newX = startPosX + dx;
                let newY = startPosY + dy;

                if (newX < 0) newX = 0;
                if (newX > w) newX = w;
                if (newY < 0) newY = 0;
                if (newY > h) newY = h;

                element.style.left = newX + 'px';
                element.style.top = newY + 'px';

                xInput.value = ((newX / w) * 100).toFixed(3);
                yInput.value = ((newY / h) * 100).toFixed(3);
            } 
            else if (isResizing) {
                // Diagonal drag calculates new font size
                // We use the larger of dx or dy to determine growth
                const delta = Math.max(dx, dy);
                const newSize = Math.max(6, Math.min(72, startFontSize + (delta / 5)));
                
                sizeInput.value = Math.round(newSize);
                element.style.fontSize = Math.round(newSize) + 'pt';
            }
        });

        document.addEventListener('mouseup', () => {
            isDragging = false;
            isResizing = false;
            element.classList.remove('active');
            element.classList.remove('dragging');
        });

        // Mouse Wheel Scaling
        element.addEventListener('wheel', (e) => {
            e.preventDefault();
            let currentSize = parseFloat(sizeInput.value) || 14;
            const step = e.deltaY < 0 ? 1 : -1;
            const newSize = Math.max(6, Math.min(72, currentSize + step));
            
            sizeInput.value = newSize;
            element.style.fontSize = newSize + 'pt';
        }, { passive: false });
    }

    // Two-way sync: If admin types in the inputs, move the boxes!
    const inputs = [
        nameXInput, nameYInput, nameFontInput, nameSizeInput,
        matricXInput, matricYInput, matricFontInput, matricSizeInput,
        name2XInput, name2YInput, name2FontInput, name2SizeInput,
        deptXInput, deptYInput, deptFontInput, deptSizeInput
    ];
    inputs.forEach(input => {
        if(input) {
            input.addEventListener('input', updateDraggablePositionsFromInputs);
        }
    });

    function updateDraggablePositionsFromInputs() {
        // Individual styles & Content sync for WYSIWYG
        const isPreview = document.body.classList.contains('preview-mode');
        
        const syncField = (el, font, size, x, y, sample) => {
            if (!el) return;
            el.style.fontFamily = font;
            el.style.fontSize = size + 'pt';
            el.textContent = isPreview ? sample : el.getAttribute('data-placeholder') || el.textContent;
            
            // Position based on fixed 794x1123
            el.style.left = (parseFloat(x || 0) / 100 * 794) + 'px';
            el.style.top = (parseFloat(y || 0) / 100 * 1123) + 'px';
        };

        syncField(dragName, nameFontInput.value, nameSizeInput.value, nameXInput.value, nameYInput.value, "SAMPSON BALOGUN EMMANUEL");
        syncField(dragMatric, matricFontInput.value, matricSizeInput.value, matricXInput.value, matricYInput.value, "21010211100");
        syncField(dragName2, name2FontInput.value, name2SizeInput.value, name2XInput.value, name2YInput.value, "SAMPSON BALOGUN EMMANUEL");
        syncField(dragDept, deptFontInput.value, deptSizeInput.value, deptXInput.value, deptYInput.value, "COMPUTER SCIENCE");
    }


window.togglePreviewMode = function() {
    const body = document.body;
    const btn = document.getElementById('previewModeBtn');
    const isNowPreview = body.classList.toggle('preview-mode');
    
    if (isNowPreview) {
        btn.innerHTML = '<i class="fa-solid fa-eye-slash" style="margin-right: 5px;"></i> Preview Mode: ON';
        btn.style.background = '#475569';
    } else {
        btn.innerHTML = '<i class="fa-solid fa-eye" style="margin-right: 5px;"></i> Preview Mode: OFF';
        btn.style.background = '#0ea5e9';
    }
    
    // Call update to refresh text content and styles
    if (window.updateDraggablePositionsFromInputs) {
        window.updateDraggablePositionsFromInputs();
    }
};

// Expose updateDraggablePositionsFromInputs to global scope so toggle can call it
window.updateDraggablePositionsFromInputs = updateDraggablePositionsFromInputs;

    // Handle screen resizes breaking visual locations
    window.addEventListener('resize', updateDraggablePositionsFromInputs);

    window.generateTestPreview = async function () {
        if (!previewImg || !previewImg.src || previewContainer.style.display === 'none') {
            alert("Please upload a template first.");
            return;
        }

        const config = {
            nameX: document.getElementById('nameX').value,
            nameY: document.getElementById('nameY').value,
            matricX: document.getElementById('matricX').value,
            matricY: document.getElementById('matricY').value,
            name2X: document.getElementById('name2X').value,
            name2Y: document.getElementById('name2Y').value,
            deptX: document.getElementById('deptX').value,
            deptY: document.getElementById('deptY').value,
            nameFont: document.getElementById('nameFont').value,
            nameSize: document.getElementById('nameSize').value,
            matricFont: document.getElementById('matricFont').value,
            matricSize: document.getElementById('matricSize').value,
            name2Font: document.getElementById('name2Font').value,
            name2Size: document.getElementById('name2Size').value,
            deptFont: document.getElementById('deptFont').value,
            deptSize: document.getElementById('deptSize').value
        };

        const btn = document.querySelector('button[onclick="window.generateTestPreview()"]');
        const originalText = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;
        try {
            console.log("Rendering Live HTML Preview...");
            
            // 1. Get current configuration
            const getFont = (f) => f || "'Times New Roman', serif";
            const getSize = (s) => parseInt(s) || 12;

            // 2. Build the HTML Preview content (No Iframe, No Network Request)
            const previewHTML = `
                <div style="width: 100%; height: 75vh; border-radius: 8px; overflow-y: auto; overflow-x: hidden; background: #94a3b8; padding: 40px 20px; display: flex; flex-direction: column; align-items: center;">
                    <div id="previewScaler" style="transform: scale(0.65); transform-origin: top center; margin-bottom: -400px;">
                        <div id="htmlPreviewA4" class="a4-drawing-board" style="background-image: url('${previewImg.src}'); background-size: 100% 100%;">
                            <!-- Overlay elements -->
                            <div style="position: absolute; left: ${config.nameX}%; top: ${config.nameY}%; font-family: ${getFont(config.nameFont)}; font-size: ${getSize(config.nameSize)}pt; font-weight: bold; white-space: nowrap; line-height: 1.0;">SAMPLE NAME</div>
                            <div style="position: absolute; left: ${config.matricX}%; top: ${config.matricY}%; font-family: ${getFont(config.matricFont)}; font-size: ${getSize(config.matricSize)}pt; font-weight: bold; white-space: nowrap; line-height: 1.0;">2024/000000</div>
                            <div style="position: absolute; left: ${config.name2X}%; top: ${config.name2Y}%; font-family: ${getFont(config.name2Font)}; font-size: ${getSize(config.name2Size)}pt; font-weight: bold; white-space: nowrap; line-height: 1.0;">SAMPLE NAME</div>
                            <div style="position: absolute; left: ${config.deptX}%; top: ${config.deptY}%; font-family: ${getFont(config.deptFont)}; font-size: ${getSize(config.deptSize)}pt; font-weight: bold; white-space: nowrap; line-height: 1.0;">COMPUTER SCIENCE</div>
                        </div>
                    </div>
                </div>
                <p style="text-align: center; color: #1e293b; margin-top: 15px; font-weight: 600;"><i class="fa-solid fa-circle-info"></i> This is a Live HTML Preview. Scroll to see the full page.</p>
            `;

            // 3. Update Modal
            const previewModal = document.getElementById('previewModal');
            const previewContent = document.getElementById('previewContent');
            const previewTitle = document.getElementById('previewTitle');

            previewTitle.textContent = "Live Layout Preview (Sample Content)";
            previewContent.innerHTML = previewHTML;
            previewModal.style.display = 'flex';

        } catch (error) {
            console.error('Preview error:', error);
            alert('An error occurred while generating the preview.');
        } finally {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    };

    window.closePreview = function () {
        const previewModal = document.getElementById('previewModal');
        previewModal.style.display = 'none';
        // Clear iframe to prevent memory leaks or audio playback from iframes if any
        document.getElementById('previewContent').innerHTML = '';
    };
});
