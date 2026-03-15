const fs = require('fs');
const path = 'public/admin.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update Config Object in Payload
const oldConfig = `                deptY: document.getElementById('deptY').value,
                fontFamily: document.getElementById('fontFamily').value,
                fontSize: document.getElementById('fontSize').value
            };`;

const newConfig = `                deptY: document.getElementById('deptY').value,
                nameFont: document.getElementById('nameFont').value,
                nameSize: document.getElementById('nameSize').value,
                matricFont: document.getElementById('matricFont').value,
                matricSize: document.getElementById('matricSize').value,
                name2Font: document.getElementById('name2Font').value,
                name2Size: document.getElementById('name2Size').value,
                deptFont: document.getElementById('deptFont').value,
                deptSize: document.getElementById('deptSize').value
            };`;

// 2. Update Input Initializations
const oldInputs = `    const deptXInput = document.getElementById('deptX');
    const deptYInput = document.getElementById('deptY');
    const fontFamilyInput = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');`;

const newInputs = `    const deptXInput = document.getElementById('deptX');
    const deptYInput = document.getElementById('deptY');
    
    // Per-field typography inputs
    const nameFontInput = document.getElementById('nameFont');
    const nameSizeInput = document.getElementById('nameSize');
    const matricFontInput = document.getElementById('matricFont');
    const matricSizeInput = document.getElementById('matricSize');
    const name2FontInput = document.getElementById('name2Font');
    const name2SizeInput = document.getElementById('name2Size');
    const deptFontInput = document.getElementById('deptFont');
    const deptSizeInput = document.getElementById('deptSize');`;

// 3. Update sync array
const oldSync = `    const inputs = [nameXInput, nameYInput, matricXInput, matricYInput, name2XInput, name2YInput, deptXInput, deptYInput, fontFamilyInput, fontSizeInput];`;

const newSync = `    const inputs = [
        nameXInput, nameYInput, nameFontInput, nameSizeInput,
        matricXInput, matricYInput, matricFontInput, matricSizeInput,
        name2XInput, name2YInput, name2FontInput, name2SizeInput,
        deptXInput, deptYInput, deptFontInput, deptSizeInput
    ];`;

// 4. Update updateDraggablePositionsFromInputs
const oldPosStart = `    function updateDraggablePositionsFromInputs() {
        const font = fontFamilyInput.value;
        const size = fontSizeInput.value + 'px';
        
        [dragName, dragMatric, dragName2, dragDept].forEach(el => {
            if (el) {
                el.style.fontFamily = font;
                el.style.fontSize = size;
            }
        });`;

const newPosStart = `    function updateDraggablePositionsFromInputs() {
        // Individual styles
        if (dragName) {
            dragName.style.fontFamily = nameFontInput.value;
            dragName.style.fontSize = nameSizeInput.value + 'px';
        }
        if (dragMatric) {
            dragMatric.style.fontFamily = matricFontInput.value;
            dragMatric.style.fontSize = matricSizeInput.value + 'px';
        }
        if (dragName2) {
            dragName2.style.fontFamily = name2FontInput.value;
            dragName2.style.fontSize = name2SizeInput.value + 'px';
        }
        if (dragDept) {
            dragDept.style.fontFamily = deptFontInput.value;
            dragDept.style.fontSize = deptSizeInput.value + 'px';
        }
        
        // Handle Preview Mode Content
        const isPreview = document.body.classList.contains('preview-mode');
        if (dragName) dragName.textContent = isPreview ? "SAMPSON BALOGUN EMMANUEL" : "[STUDENT NAME 1]";
        if (dragMatric) dragMatric.textContent = isPreview ? "21010211100" : "[MATRIC NUMBER]";
        if (dragName2) dragName2.textContent = isPreview ? "SAMPSON BALOGUN EMMANUEL" : "[STUDENT NAME 2]";
        if (dragDept) dragDept.textContent = isPreview ? "COMPUTER SCIENCE" : "[DEPARTMENT/COURSE]";`;

// 5. Implement togglePreviewMode (before the end of content)
const toggleLogic = `
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

    // Handle screen resizes breaking visual locations`;

content = content.replace(oldConfig, newConfig);
content = content.replace(oldInputs, newInputs);
content = content.replace(oldSync, newSync);
content = content.replace(oldPosStart, newPosStart);
content = content.replace(`    // Handle screen resizes breaking visual locations`, toggleLogic);

fs.writeFileSync(path, content);
console.log('Successfully patched admin.js for granular typography and instant preview');
