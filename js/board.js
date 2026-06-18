async function loadThreads() {
  const threadList = document.getElementById('threadList');
  threadList.innerHTML = '<p>Loading threads...</p>';

  const { data: threads, error } = await sb
    .from('threads')
    .select('id, created_at')
    .order('created_at', { ascending: false });

  if (error) {
    threadList.innerHTML = `<p class="error">Could not load threads: ${error.message}</p>`;
    return;
  }

  if (!threads || threads.length === 0) {
    threadList.innerHTML = '<p>No threads yet. Start one!</p>';
    return;
  }

  threadList.innerHTML = '';

  for (const thread of threads) {
    const { data: panels } = await sb
      .from('drawings')
      .select('image_url, sequence_order')
      .eq('thread_id', thread.id)
      .order('sequence_order', { ascending: true });

    const card = document.createElement('a');
    card.className = 'thread-card';
    card.href = `thread.html?id=${thread.id}`;

    const thumb = document.createElement('div');
    thumb.className = 'thread-thumb';
    if (panels && panels.length > 0) {
      const img = document.createElement('img');
      img.src = panels[0].image_url;
      img.alt = 'Thread thumbnail';
      thumb.appendChild(img);
    } else {
      thumb.textContent = 'No panels yet';
    }

    const meta = document.createElement('div');
    meta.className = 'thread-meta';
    const panelCount = panels ? panels.length : 0;
    meta.innerHTML = `
      <span class="panel-count">${panelCount} panel${panelCount === 1 ? '' : 's'}</span>
      <span class="thread-date">${new Date(thread.created_at).toLocaleString()}</span>
    `;

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'thread-delete-btn delete-btn';
    deleteBtn.type = 'button';
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      deleteThread(thread.id);
    });

    card.appendChild(thumb);
    card.appendChild(meta);
    card.appendChild(deleteBtn);
    threadList.appendChild(card);
  }
}

async function deleteThread(threadId) {
  if (!window.confirm('Delete this entire thread and all its panels? This cannot be undone.')) return;

  const { data: drawings, error: fetchError } = await sb
    .from('drawings')
    .select('image_url')
    .eq('thread_id', threadId);

  if (fetchError) {
    window.alert('Could not load this thread\'s panels: ' + fetchError.message);
    return;
  }

  const paths = (drawings || []).map((d) => storagePathFromUrl(d.image_url)).filter(Boolean);
  if (paths.length > 0) {
    const { error: removeError } = await sb.storage.from('drawings').remove(paths);
    if (removeError) console.error('Could not remove some drawing files:', removeError);
  }

  const { error: drawingsError } = await sb.from('drawings').delete().eq('thread_id', threadId);
  if (drawingsError) {
    window.alert('Could not delete this thread\'s panels: ' + drawingsError.message);
    return;
  }

  const { error: threadError } = await sb.from('threads').delete().eq('id', threadId);
  if (threadError) {
    window.alert('Could not delete thread: ' + threadError.message);
    return;
  }

  loadThreads();
}

loadThreads();
