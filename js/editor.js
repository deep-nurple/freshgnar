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
const toolPencil = document.getElementById('toolPencil');
const toolEraser = document.getElementById('toolEraser');

function setTool(name) {
  tool = name;
  toolPencil.classList.toggle('active', name === 'pencil');
  toolEraser.classList.toggle('active', name === 'eraser');
}

toolPencil.addEventListener('click', () => setTool('pencil'));
toolEraser.addEventListener('click', () => setTool('eraser'));
document.getElementById('clearBtn').addEventListener('click', clearCanvas);

function getPos(e) {
  const rect = canvas.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: (clientX - rect.left) * (canvas.width / rect.width),
    y: (clientY - rect.top) * (canvas.height / rect.height)
  };
}

function startDraw(e) {
  drawing = true;
  const pos = getPos(e);
  lastX = pos.x;
  lastY = pos.y;
  e.preventDefault();
}

function stopDraw() {
  drawing = false;
}

function draw(e) {
  if (!drawing) return;
  const pos = getPos(e);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.lineWidth = brushSize.value;
  ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : colorPicker.value;
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();
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
