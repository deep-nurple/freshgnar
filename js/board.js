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

    card.appendChild(thumb);
    card.appendChild(meta);
    threadList.appendChild(card);
  }
}

loadThreads();
