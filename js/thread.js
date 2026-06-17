const threadParams = new URLSearchParams(window.location.search);
const threadId = threadParams.get('id');

if (!threadId) {
  window.location.href = 'index.html';
}

document.getElementById('addPanelLink').href = `draw.html?thread_id=${threadId}`;

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

    frame.appendChild(img);
    frame.appendChild(num);
    stripEl.appendChild(frame);
  });
}

loadThread();
