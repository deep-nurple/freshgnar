const threadParams = new URLSearchParams(window.location.search);
const threadId = threadParams.get('id');

if (!threadId) {
  window.location.href = 'index.html';
}

document.getElementById('addPanelLink').href = `draw.html?thread_id=${threadId}`;

const lightbox = document.getElementById('lightbox');
const lightboxImg = document.getElementById('lightboxImg');
const lightboxClose = document.getElementById('lightboxClose');
const lightboxDownload = document.getElementById('lightboxDownload');
let currentLightboxUrl = null;

function openLightbox(imageUrl, panelNumber) {
  currentLightboxUrl = imageUrl;
  lightboxImg.src = imageUrl;
  lightboxImg.alt = `Panel ${panelNumber}`;
  lightbox.hidden = false;
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = '';
  currentLightboxUrl = null;
}

async function downloadCurrentImage() {
  if (!currentLightboxUrl) return;
  try {
    const response = await fetch(currentLightboxUrl);
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = `panel-${Date.now()}.png`;
    link.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    window.open(currentLightboxUrl, '_blank');
  }
}

lightboxClose.addEventListener('click', closeLightbox);
lightboxDownload.addEventListener('click', downloadCurrentImage);
lightbox.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

async function loadThread() {
  const stripEl = document.getElementById('panelStrip');
  const titleEl = document.getElementById('threadTitle');

  const { data: thread, error: threadError } = await sb
    .from('threads')
    .select('id, created_at')
    .eq('id', threadId)
    .single();

  if (threadError || !thread) {
    titleEl.textContent = 'Thread not found';
    stripEl.innerHTML = '';
    return;
  }

  titleEl.textContent = `Thread started ${new Date(thread.created_at).toLocaleString()}`;

  const { data: panels, error: panelsError } = await sb
    .from('drawings')
    .select('id, image_url, sequence_order')
    .eq('thread_id', threadId)
    .order('sequence_order', { ascending: true });

  if (panelsError) {
    stripEl.innerHTML = `<p class="error">Could not load panels: ${panelsError.message}</p>`;
    return;
  }

  if (!panels || panels.length === 0) {
    stripEl.innerHTML = '<p>This thread has no panels yet. Be the first to add one.</p>';
    return;
  }

  stripEl.innerHTML = '';
  panels.forEach((panel, index) => {
    const frame = document.createElement('div');
    frame.className = 'panel-frame';

    const num = document.createElement('span');
    num.className = 'panel-number';
    num.textContent = `#${index + 1}`;

    const img = document.createElement('img');
    img.src = panel.image_url;
    img.alt = `Panel ${index + 1}`;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'panel-delete-btn delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deleteDrawing(panel.id, panel.image_url);
    });

    frame.appendChild(img);
    frame.appendChild(num);
    frame.appendChild(deleteBtn);
    frame.addEventListener('click', () => openLightbox(panel.image_url, index + 1));
    stripEl.appendChild(frame);
  });
}

async function deleteDrawing(drawingId, imageUrl) {
  if (!window.confirm('Delete this panel? This cannot be undone.')) return;

  const path = storagePathFromUrl(imageUrl);
  if (path) {
    const { error: removeError } = await sb.storage.from('drawings').remove([path]);
    if (removeError) console.error('Could not remove drawing file:', removeError);
  }

  const { error } = await sb.from('drawings').delete().eq('id', drawingId);
  if (error) {
    window.alert('Could not delete panel: ' + error.message);
    return;
  }

  loadThread();
}

loadThread();
