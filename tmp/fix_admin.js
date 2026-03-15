const fs = require('fs');
const path = 'public/admin.js';
let content = fs.readFileSync(path, 'utf8');

// Replacement 1: Config object
const oldConfig = `        if (docTypeStr === 'it_letter') {
            const config = {
                nameX: document.getElementById('nameX').value,
                nameY: document.getElementById('nameY').value,
                matricX: document.getElementById('matricX').value,
                matricY: document.getElementById('matricY').value
            };
            payload.configJson = JSON.stringify(config);
        }`;

const newConfig = `        if (docTypeStr === 'it_letter') {
            const config = {
                nameX: document.getElementById('nameX').value,
                nameY: document.getElementById('nameY').value,
                matricX: document.getElementById('matricX').value,
                matricY: document.getElementById('matricY').value,
                name2X: document.getElementById('name2X').value,
                name2Y: document.getElementById('name2Y').value,
                deptX: document.getElementById('deptX').value,
                deptY: document.getElementById('deptY').value
            };
            payload.configJson = JSON.stringify(config);
        }`;

// Replacement 2: Inputs initialization
const oldInputs = `    const nameXInput = document.getElementById('nameX');
    const nameYInput = document.getElementById('nameY');
    const matricXInput = document.getElementById('matricX');
    const matricYInput = document.getElementById('matricY');
    const dragName = document.getElementById('dragName');
    const dragMatric = document.getElementById('dragMatric');`;

const newInputs = `    const nameXInput = document.getElementById('nameX');
    const nameYInput = document.getElementById('nameY');
    const matricXInput = document.getElementById('matricX');
    const matricYInput = document.getElementById('matricY');
    const name2XInput = document.getElementById('name2X');
    const name2YInput = document.getElementById('name2Y');
    const deptXInput = document.getElementById('deptX');
    const deptYInput = document.getElementById('deptY');

    const dragName = document.getElementById('dragName');
    const dragMatric = document.getElementById('dragMatric');
    const dragName2 = document.getElementById('dragName2');
    const dragDept = document.getElementById('dragDept');`;

// Replacement 3: setupDraggable
const oldDraggable = `    // Make elements draggable visually
    setupDraggable(dragName, nameXInput, nameYInput);
    setupDraggable(dragMatric, matricXInput, matricYInput);`;

const newDraggable = `    // Make elements draggable visually
    setupDraggable(dragName, nameXInput, nameYInput);
    setupDraggable(dragMatric, matricXInput, matricYInput);
    setupDraggable(dragName2, name2XInput, name2YInput);
    setupDraggable(dragDept, deptXInput, deptYInput);`;

// Replacement 4: loop inputs
const oldLoop = `    // Two-way sync: If admin types in the inputs, move the boxes!
    const inputs = [nameXInput, nameYInput, matricXInput, matricYInput];`;

const newLoop = `    // Two-way sync: If admin types in the inputs, move the boxes!
    const inputs = [nameXInput, nameYInput, matricXInput, matricYInput, name2XInput, name2YInput, deptXInput, deptYInput];`;

// Replacement 5: updateDraggablePositionsFromInputs
const oldUpdate = `        dragMatric.style.left = (parseFloat(matricXInput.value || 0) / 100 * w) + 'px';
        dragMatric.style.top = (parseFloat(matricYInput.value || 0) / 100 * h) + 'px';`;

const newUpdate = `        dragMatric.style.left = (parseFloat(matricXInput.value || 0) / 100 * w) + 'px';
        dragMatric.style.top = (parseFloat(matricYInput.value || 0) / 100 * h) + 'px';

        dragName2.style.left = (parseFloat(name2XInput.value || 0) / 100 * w) + 'px';
        dragName2.style.top = (parseFloat(name2YInput.value || 0) / 100 * h) + 'px';

        dragDept.style.left = (parseFloat(deptXInput.value || 0) / 100 * w) + 'px';
        dragDept.style.top = (parseFloat(deptYInput.value || 0) / 100 * h) + 'px';`;

content = content.replace(oldConfig, newConfig);
content = content.replace(oldInputs, newInputs);
content = content.replace(oldDraggable, newDraggable);
content = content.replace(oldLoop, newLoop);
content = content.replace(oldUpdate, newUpdate);

fs.writeFileSync(path, content);
console.log('Successfully patched admin.js');
