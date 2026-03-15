const fs = require('fs');
const path = 'public/admin.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Update Config Object in Payload (near line 195)
const oldConfig = `                name2Y: document.getElementById('name2Y').value,
                deptX: document.getElementById('deptX').value,
                deptY: document.getElementById('deptY').value
            };`;

const newConfig = `                name2Y: document.getElementById('name2Y').value,
                deptX: document.getElementById('deptX').value,
                deptY: document.getElementById('deptY').value,
                fontFamily: document.getElementById('fontFamily').value,
                fontSize: document.getElementById('fontSize').value
            };`;

// 2. Update Input Initializations (near line 526)
const oldInputs = `    const deptXInput = document.getElementById('deptX');
    const deptYInput = document.getElementById('deptY');

    const dragName = document.getElementById('dragName');`;

const newInputs = `    const deptXInput = document.getElementById('deptX');
    const deptYInput = document.getElementById('deptY');
    const fontFamilyInput = document.getElementById('fontFamily');
    const fontSizeInput = document.getElementById('fontSize');

    const dragName = document.getElementById('dragName');`;

// 3. Update sync array (near line 632)
const oldSync = `    const inputs = [nameXInput, nameYInput, matricXInput, matricYInput, name2XInput, name2YInput, deptXInput, deptYInput];`;

const newSync = `    const inputs = [nameXInput, nameYInput, matricXInput, matricYInput, name2XInput, name2YInput, deptXInput, deptYInput, fontFamilyInput, fontSizeInput];`;

// 4. Update updateDraggablePositionsFromInputs to apply styles (near line 639)
const oldPosStart = `    function updateDraggablePositionsFromInputs() {`;

const newPosStart = `    function updateDraggablePositionsFromInputs() {
        const font = fontFamilyInput.value;
        const size = fontSizeInput.value + 'px';
        
        [dragName, dragMatric, dragName2, dragDept].forEach(el => {
            if (el) {
                el.style.fontFamily = font;
                el.style.fontSize = size;
            }
        });`;

content = content.replace(oldConfig, newConfig);
content = content.replace(oldInputs, newInputs);
content = content.replace(oldSync, newSync);
content = content.replace(oldPosStart, newPosStart);

fs.writeFileSync(path, content);
console.log('Successfully patched admin.js for font customization');
