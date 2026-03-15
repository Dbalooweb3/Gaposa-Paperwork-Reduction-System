const fs = require('fs');
const path = 'public/admin.js';
let lines = fs.readFileSync(path, 'utf8').split(/\r?\n/);

// Update Config Object (Lines 195-200 in previous view_file)
const configStart = lines.findIndex(l => l.includes('const config = {') && l.includes('nameX:'));
if (configStart !== -1) {
    let configEnd = configStart;
    while (!lines[configEnd].includes('};')) configEnd++;
    
    const newConfigLines = [
        '            const config = {',
        "                nameX: document.getElementById('nameX').value,",
        "                nameY: document.getElementById('nameY').value,",
        "                matricX: document.getElementById('matricX').value,",
        "                matricY: document.getElementById('matricY').value,",
        "                name2X: document.getElementById('name2X').value,",
        "                name2Y: document.getElementById('name2Y').value,",
        "                deptX: document.getElementById('deptX').value,",
        "                deptY: document.getElementById('deptY').value",
        '            };'
    ];
    lines.splice(configStart, configEnd - configStart + 1, ...newConfigLines);
}

// Update Input Initializations (Lines 526-531)
const inputStart = lines.findIndex(l => l.includes("const nameXInput = document.getElementById('nameX');"));
if (inputStart !== -1) {
    const newInputLines = [
        "    const nameXInput = document.getElementById('nameX');",
        "    const nameYInput = document.getElementById('nameY');",
        "    const matricXInput = document.getElementById('matricX');",
        "    const matricYInput = document.getElementById('matricY');",
        "    const name2XInput = document.getElementById('name2X');",
        "    const name2YInput = document.getElementById('name2Y');",
        "    const deptXInput = document.getElementById('deptX');",
        "    const deptYInput = document.getElementById('deptY');",
        "",
        "    const dragName = document.getElementById('dragName');",
        "    const dragMatric = document.getElementById('dragMatric');",
        "    const dragName2 = document.getElementById('dragName2');",
        "    const dragDept = document.getElementById('dragDept');"
    ];
    // Find where the drag initialization ends (usually dragMatric)
    let inputEnd = inputStart;
    while (!lines[inputEnd].includes('const dragMatric =')) inputEnd++;
    lines.splice(inputStart, inputEnd - inputStart + 1, ...newInputLines);
}

// Update setupDraggable (Lines 576-577)
const setupStart = lines.findIndex(l => l.includes('setupDraggable(dragName, nameXInput, nameYInput);'));
if (setupStart !== -1) {
    const newSetupLines = [
        '    setupDraggable(dragName, nameXInput, nameYInput);',
        '    setupDraggable(dragMatric, matricXInput, matricYInput);',
        '    setupDraggable(dragName2, name2XInput, name2YInput);',
        '    setupDraggable(dragDept, deptXInput, deptYInput);'
    ];
    lines.splice(setupStart, 2, ...newSetupLines);
}

// Update sync array (Line 632)
const syncLineIndex = lines.findIndex(l => l.includes('const inputs = [nameXInput, nameYInput, matricXInput, matricYInput];'));
if (syncLineIndex !== -1) {
    lines[syncLineIndex] = '    const inputs = [nameXInput, nameYInput, matricXInput, matricYInput, name2XInput, name2YInput, deptXInput, deptYInput];';
}

// Update updateDraggablePositionsFromInputs (Lines 648-652)
const posStart = lines.findIndex(l => l.includes('dragName.style.left =') && l.includes('nameXInput.value'));
if (posStart !== -1) {
    const newPosLines = [
        "        dragName.style.left = (parseFloat(nameXInput.value || 0) / 100 * w) + 'px';",
        "        dragName.style.top = (parseFloat(nameYInput.value || 0) / 100 * h) + 'px';",
        "        ",
        "        dragMatric.style.left = (parseFloat(matricXInput.value || 0) / 100 * w) + 'px';",
        "        dragMatric.style.top = (parseFloat(matricYInput.value || 0) / 100 * h) + 'px';",
        "",
        "        dragName2.style.left = (parseFloat(name2XInput.value || 0) / 100 * w) + 'px';",
        "        dragName2.style.top = (parseFloat(name2YInput.value || 0) / 100 * h) + 'px';",
        "",
        "        dragDept.style.left = (parseFloat(deptXInput.value || 0) / 100 * w) + 'px';",
        "        dragDept.style.top = (parseFloat(deptYInput.value || 0) / 100 * h) + 'px';"
    ];
    let posEnd = posStart;
    while (!lines[posEnd].includes('dragMatric.style.top =')) posEnd++;
    lines.splice(posStart, posEnd - posStart + 1, ...newPosLines);
}

fs.writeFileSync(path, lines.join('\n'));
console.log('Successfully patched admin.js using flexible line matching');
