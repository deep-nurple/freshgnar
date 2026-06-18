const ADMIN_PASSWORD = 'freshgnar99';

function isAdmin() {
  return sessionStorage.getItem('isAdmin') === 'true';
}

function setAdminMode(on) {
  if (on) {
    sessionStorage.setItem('isAdmin', 'true');
  } else {
    sessionStorage.removeItem('isAdmin');
  }
  document.body.classList.toggle('admin-mode', on);
}

function adminLinkLabel() {
  return isAdmin() ? 'admin (log out)' : 'admin';
}

function initAdminWidget() {
  const link = document.createElement('button');
  link.id = 'adminLink';
  link.type = 'button';
  link.className = 'admin-link';
  link.textContent = adminLinkLabel();

  link.addEventListener('click', () => {
    if (isAdmin()) {
      setAdminMode(false);
    } else {
      const input = window.prompt('Admin password:');
      if (input === null) return;
      if (input === ADMIN_PASSWORD) {
        setAdminMode(true);
      } else {
        window.alert('Incorrect password.');
      }
    }
    link.textContent = adminLinkLabel();
  });

  document.body.appendChild(link);
  document.body.classList.toggle('admin-mode', isAdmin());
}

initAdminWidget();
