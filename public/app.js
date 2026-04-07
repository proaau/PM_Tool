const state = {
  revision: 0,
  currentProjectId: null,
  projects: []
};

const dom = {
  projectSelect: document.getElementById('projectSelect'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  nameInput: document.getElementById('nameInput'),
  descInput: document.getElementById('descInput'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  taskForm: document.getElementById('taskForm'),
  taskBody: document.getElementById('taskBody'),
  timeline: document.getElementById('timeline'),
  reloadBtn: document.getElementById('reloadBtn'),
  projectName: document.getElementById('projectName'),
  presenceText: document.getElementById('presenceText'),
  presenceDot: document.getElementById('presenceDot'),
  taskRowTemplate: document.getElementById('taskRowTemplate')
};

const sessionId = crypto.randomUUID();
const userName = window.prompt('Name für die gemeinsame Bearbeitung:', 'Teammitglied') || 'Teammitglied';

function getCurrentProject() {
  return state.projects.find((project) => project.id === state.currentProjectId) || null;
}

async function api(path, options = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Unerwarteter Fehler');
  }
  return data;
}

function renderProjectSelector() {
  dom.projectSelect.innerHTML = '';
  for (const project of state.projects) {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name || '(ohne Namen)';
    dom.projectSelect.appendChild(option);
  }
  dom.projectSelect.value = state.currentProjectId;
}

function render() {
  const currentProject = getCurrentProject();
  if (!currentProject) {
    return;
  }

  renderProjectSelector();
  dom.projectName.textContent = currentProject.name || 'Prognos Zeitplaner';
  dom.nameInput.value = currentProject.name;
  dom.descInput.value = currentProject.description;

  dom.taskBody.innerHTML = '';
  for (const task of currentProject.tasks) {
    const row = dom.taskRowTemplate.content.cloneNode(true);
    row.querySelector('.title').textContent = task.title;
    row.querySelector('.owner').textContent = task.owner;
    row.querySelector('.start').textContent = task.start;
    row.querySelector('.due').textContent = task.due;
    row.querySelector('.status').textContent = task.status;
    row.querySelector('.priority').textContent = task.priority;
    row.querySelector('.delete').addEventListener('click', () => removeTask(task.id));
    dom.taskBody.appendChild(row);
  }

  renderTimeline(currentProject.tasks);
}

function renderTimeline(tasksInput) {
  dom.timeline.innerHTML = '';
  const tasks = [...tasksInput].sort((a, b) => new Date(a.start) - new Date(b.start));

  if (tasks.length === 0) {
    dom.timeline.innerHTML = '<p>Noch keine Aufgaben vorhanden.</p>';
    return;
  }

  const minStart = new Date(Math.min(...tasks.map((t) => new Date(t.start))));
  const maxEnd = new Date(Math.max(...tasks.map((t) => new Date(t.due))));
  const fullSpan = Math.max(1, Math.round((maxEnd - minStart) / 86400000));

  for (const task of tasks) {
    const row = document.createElement('div');
    row.className = 'timeline-row';
    const label = document.createElement('div');
    label.textContent = `${task.title} (${task.owner})`;

    const track = document.createElement('div');
    track.className = 'bar-track';

    const startOffset = Math.round((new Date(task.start) - minStart) / 86400000);
    const duration = Math.max(1, Math.round((new Date(task.due) - new Date(task.start)) / 86400000) + 1);

    const bar = document.createElement('div');
    bar.className = 'bar';
    bar.style.left = `${(startOffset / fullSpan) * 100}%`;
    bar.style.width = `${Math.max(5, (duration / fullSpan) * 100)}%`;
    bar.textContent = `${task.start} → ${task.due}`;

    track.appendChild(bar);
    row.append(label, track);
    dom.timeline.appendChild(row);
  }
}

async function loadState() {
  const serverState = await api('/api/state');
  state.revision = serverState.revision;
  state.currentProjectId = serverState.currentProjectId;
  state.projects = serverState.projects;
  render();
}

async function saveState() {
  const payload = {
    baseRevision: state.revision,
    currentProjectId: state.currentProjectId,
    projects: state.projects
  };

  const result = await api('/api/state', {
    method: 'PUT',
    body: JSON.stringify(payload)
  });

  state.revision = result.revision;
}

async function removeTask(taskId) {
  const currentProject = getCurrentProject();
  currentProject.tasks = currentProject.tasks.filter((task) => task.id !== taskId);
  try {
    await saveState();
    render();
  } catch (error) {
    alert(`${error.message}\nDie Daten werden neu geladen.`);
    await loadState();
  }
}

async function createProject() {
  const name = window.prompt('Name des neuen Projekts:', 'Neues Projekt');
  if (!name) {
    return;
  }

  const project = {
    id: crypto.randomUUID(),
    name: name.trim(),
    description: '',
    tasks: []
  };

  state.projects.push(project);
  state.currentProjectId = project.id;

  try {
    await saveState();
    render();
  } catch (error) {
    alert(`${error.message}\nDie Daten werden neu geladen.`);
    await loadState();
  }
}

dom.projectSelect.addEventListener('change', async (event) => {
  state.currentProjectId = event.target.value;

  try {
    await saveState();
    render();
  } catch (error) {
    alert(`${error.message}\nDie Daten werden neu geladen.`);
    await loadState();
  }
});

dom.newProjectBtn.addEventListener('click', createProject);

dom.saveProjectBtn.addEventListener('click', async () => {
  const currentProject = getCurrentProject();
  currentProject.name = dom.nameInput.value.trim();
  currentProject.description = dom.descInput.value.trim();

  try {
    await saveState();
    render();
  } catch (error) {
    alert(`${error.message}\nBitte erneut versuchen.`);
  }
});

dom.taskForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(event.target);
  const task = {
    id: crypto.randomUUID(),
    title: formData.get('title').toString().trim(),
    owner: formData.get('owner').toString().trim(),
    start: formData.get('start').toString(),
    due: formData.get('due').toString(),
    status: formData.get('status').toString(),
    priority: formData.get('priority').toString(),
    notes: formData.get('notes').toString().trim()
  };

  const currentProject = getCurrentProject();
  currentProject.tasks.push(task);

  try {
    await saveState();
    render();
    event.target.reset();
  } catch (error) {
    alert(`${error.message}\nDie Daten werden neu geladen.`);
    await loadState();
  }
});

dom.reloadBtn.addEventListener('click', loadState);

async function syncPresence() {
  try {
    const result = await api('/api/presence', {
      method: 'POST',
      body: JSON.stringify({ sessionId, userName })
    });
    dom.presenceDot.style.background = 'var(--ok)';
    dom.presenceText.textContent = `${result.count} aktiv: ${result.users.join(', ')}`;
  } catch {
    dom.presenceDot.style.background = 'var(--accent)';
    dom.presenceText.textContent = 'Offline / keine Verbindung';
  }
}

async function init() {
  await loadState();
  await syncPresence();

  setInterval(async () => {
    const before = state.revision;
    await loadState();
    if (state.revision !== before) {
      dom.presenceText.textContent = 'Projekt aktualisiert – neueste Version geladen';
    }
  }, 5000);

  setInterval(syncPresence, 8000);
}

init();
