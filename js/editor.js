const editorParams = new URLSearchParams(window.location.search);
let threadId = editorParams.get('thread_id');
const isNew = editorParams.get('new') === 'true' || !threadId;

if (!threadId && !isNew) {
  window.location.href = 'index.html';
}

document.getElementById('editor-title').textContent = threadId
  ? 'Draw the next panel'
  : 'Draw the first panel';
document.getElementById('cancelLink').href = threadId
  ? `thread.html?id=${threadId}`
  : 'index.html';

const canvas = document.getElementById('paintCanvas');
const ctx = canvas.getContext('2d');

function clearCanvas() {
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}
clearCanvas();

let drawing = false;
let tool = 'pencil';
let lastX = 0;
let lastY = 0;

const colorPicker = document.getElementById('colorPicker');
const brushSize = document.getElementById('brushSize');
const brushShape = document.getElementById('brushShape');
const toolPencil = document.getElementById('toolPencil');
const toolEraser = document.getElementById('toolEraser');
const toolFill = document.getElementById('toolFill');
const undoBtn = document.getElementById('undoBtn');

const UNDO_LIMIT = 7;
const undoStack = [];

function updateUndoBtn() {
  undoBtn.disabled = undoStack.length === 0;
}

function saveUndoState() {
  undoStack.push(ctx.getImageData(0, 0, canvas.width, canvas.height));
  if (undoStack.length > UNDO_LIMIT) {
    undoStack.shift();
  }
  updateUndoBtn();
}

function undo() {
  if (undoStack.length === 0) return;
  ctx.putImageData(undoStack.pop(), 0, 0);
  updateUndoBtn();
}

undoBtn.addEventListener('click', undo);
window.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
    e.preventDefault();
    undo();
  }
});

function setTool(name) {
  tool = name;
  toolPencil.classList.toggle('active', name === 'pencil');
  toolEraser.classList.toggle('active', name === 'eraser');
  toolFill.classList.toggle('active', name === 'fill');
}

toolPencil.addEventListener('click', () => setTool('pencil'));
toolEraser.addEventListener('click', () => setTool('eraser'));
toolFill.addEventListener('click', () => setTool('fill'));
document.getElementById('clearBtn').addEventListener('click', () => {
  saveUndoState();
  clearCanvas();
});

function hexToRgba(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
    255
  ];
}

function colorsMatch(a, b, tolerance) {
  return Math.abs(a[0] - b[0]) <= tolerance &&
    Math.abs(a[1] - b[1]) <= tolerance &&
    Math.abs(a[2] - b[2]) <= tolerance &&
    Math.abs(a[3] - b[3]) <= tolerance;
}

function floodFill(startX, startY, fillColor) {
  const width = canvas.width;
  const height = canvas.height;
  startX = Math.floor(startX);
  startY = Math.floor(startY);
  if (startX < 0 || startX >= width || startY < 0 || startY >= height) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  const startIdx = (startY * width + startX) * 4;
  const startColor = [data[startIdx], data[startIdx + 1], data[startIdx + 2], data[startIdx + 3]];
  if (colorsMatch(startColor, fillColor, 0)) return;

  const tolerance = 32;
  const visited = new Uint8Array(width * height);
  const stack = [[startX, startY]];

  while (stack.length) {
    const [x, y] = stack.pop();
    if (x < 0 || x >= width || y < 0 || y >= height) continue;
    const pixelIdx = y * width + x;
    if (visited[pixelIdx]) continue;

    const dataIdx = pixelIdx * 4;
    const current = [data[dataIdx], data[dataIdx + 1], data[dataIdx + 2], data[dataIdx + 3]];
    if (!colorsMatch(current, startColor, tolerance)) continue;

    visited[pixelIdx] = 1;
    data[dataIdx] = fillColor[0];
    data[dataIdx + 1] = fillColor[1];
    data[dataIdx + 2] = fillColor[2];
    data[dataIdx + 3] = fillColor[3];

    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
  }

  ctx.putImageData(imgData, 0, 0);
}

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function sprayAt(x, y, size, color) {
  const radius = size / 2 + 4;
  const density = Math.max(4, Math.floor(size * 1.5));
  ctx.fillStyle = color;
  for (let i = 0; i < density; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    ctx.fillRect(x + Math.cos(angle) * r, y + Math.sin(angle) * r, 1, 1);
  }
}

function stampAt(x, y) {
  const size = parseFloat(brushSize.value);
  const color = tool === 'eraser' ? '#ffffff' : colorPicker.value;

  if (brushShape.value === 'spray') {
    sprayAt(x, y, size, color);
    return;
  }

  ctx.fillStyle = color;
  if (brushShape.value === 'square') {
    ctx.fillRect(x - size / 2, y - size / 2, size, size);
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function stampLine(x0, y0, x1, y1) {
  const size = parseFloat(brushSize.value);
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const step = Math.max(1, size / 4);
  const steps = Math.max(1, Math.ceil(dist / step));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    stampAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
  }
}

function startDraw(e) {
  const pos = getPos(e);
  if (tool === 'fill') {
    saveUndoState();
    floodFill(pos.x, pos.y, hexToRgba(colorPicker.value));
    e.preventDefault();
    return;
  }
  saveUndoState();
  drawing = true;
  lastX = pos.x;
  lastY = pos.y;
  stampAt(pos.x, pos.y);
  e.preventDefault();
}

function stopDraw() {
  drawing = false;
}

function draw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  stampLine(lastX, lastY, pos.x, pos.y);
  lastX = pos.x;
  lastY = pos.y;
  e.preventDefault();
}

canvas.addEventListener('mousedown', startDraw);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDraw);
canvas.addEventListener('mouseleave', stopDraw);

canvas.addEventListener('touchstart', startDraw);
canvas.addEventListener('touchmove', draw);
canvas.addEventListener('touchend', stopDraw);

async function loadPreviousPanel() {
  if (!threadId) return;

  const { data, error } = await sb
    .from('drawings')
    .select('image_url')
    .eq('thread_id', threadId)
    .order('sequence_order', { ascending: false })
    .limit(1);

  if (!error && data && data.length > 0) {
    document.getElementById('prevPanelImg').src = data[0].image_url;
    document.getElementById('prevPanelWrap').hidden = false;
  }
}

async function savePanel() {
  const statusMsg = document.getElementById('statusMsg');
  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled = true;
  statusMsg.textContent = 'Saving...';

  try {
    if (!threadId) {
      const { data: newThread, error: threadError } = await sb
        .from('threads')
        .insert({})
        .select()
        .single();
      if (threadError) throw threadError;
      threadId = newThread.id;
    }

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('Could not export canvas image');

    const fileName = `${threadId}/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await sb.storage.from('drawings').upload(fileName, blob, {
      contentType: 'image/png'
    });
    if (uploadError) throw uploadError;

    const { data: urlData } = sb.storage.from('drawings').getPublicUrl(fileName);
    const imageUrl = urlData.publicUrl;

    const { count, error: countError } = await sb
      .from('drawings')
      .select('id', { count: 'exact', head: true })
      .eq('thread_id', threadId);
    if (countError) throw countError;

    const { error: insertError } = await sb.from('drawings').insert({
      thread_id: threadId,
      image_url: imageUrl,
      sequence_order: count ?? 0
    });
    if (insertError) throw insertError;

    window.location.href = `thread.html?id=${threadId}`;
  } catch (err) {
    console.error(err);
    statusMsg.textContent = 'Error saving panel: ' + (err.message || err);
    saveBtn.disabled = false;
  }
}

document.getElementById('saveBtn').addEventListener('click', savePanel);

loadPreviousPanel();
