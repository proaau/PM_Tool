const state = {
  revision: 0,
  currentProjectId: null,
  projects: [],
  timelineView: 'day'
};

const dom = {
  projectSelect: document.getElementById('projectSelect'),
  newProjectBtn: document.getElementById('newProjectBtn'),
  deleteProjectBtn: document.getElementById('deleteProjectBtn'),
  nameInput: document.getElementById('nameInput'),
  descInput: document.getElementById('descInput'),
  saveProjectBtn: document.getElementById('saveProjectBtn'),
  taskForm: document.getElementById('taskForm'),
  taskBody: document.getElementById('taskBody'),
  timeline: document.getElementById('timeline'),
  timelineViewSelect: document.getElementById('timelineViewSelect'),
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
  dom.timelineViewSelect.value = state.timelineView;
  dom.projectName.textContent = currentProject.name || 'Prognos Projektmanagement';
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

function getScaleConfig(mode) {
  if (mode === 'week') {
    return {
      unitLabel: 'Wochen',
      toUnit: (days) => Math.max(1, Math.round(days / 7))
    };
  }

  if (mode === 'month') {
    return {
      unitLabel: 'Monate',
      toUnit: (days) => Math.max(1, Math.round(days / 30))
    };
  }

  return {
    unitLabel: 'Tage',
    toUnit: (days) => Math.max(1, Math.round(days))
  };
}

function renderTimeline(tasksInput) {
  dom.timeline.innerHTML = '';
  const tasks = [...tasksInput].sort((a, b) => new Date(a.start) - new Date(b.start));

  if (tasks.length === 0) {
    dom.timeline.innerHTML = '<p>Noch keine Aufgaben vorhanden.</p>';
    return;
  }

  const scale = getScaleConfig(state.timelineView);
  const minStart = new Date(Math.min(...tasks.map((t) => new Date(t.start))));
  const maxEnd = new Date(Math.max(...tasks.map((t) => new Date(t.due))));
  const totalDays = Math.max(1, Math.round((maxEnd - minStart) / 86400000));
  const fullSpan = Math.max(1, scale.toUnit(totalDays));

  const info = document.createElement('p');
  info.textContent = `Ansicht: ${scale.unitLabel}`;
  dom.timeline.appendChild(info);

  for (const task of tasks) {
    const row = document.createElement('div');
    row.className = 'timeline-row';
    const label = document.createElement('div');
    label.textContent = `${task.title} (${task.owner})`;

    const track = document.createElement('div');
    track.className = 'bar-track';

    const startDays = Math.round((new Date(task.start) - minStart) / 86400000);
    const durationDays = Math.max(1, Math.round((new Date(task.due) - new Date(task.start)) / 86400000) + 1);

    const startOffset = scale.toUnit(startDays);
    const duration = scale.toUnit(durationDays);

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

async function deleteCurrentProject() {
  if (state.projects.length <= 1) {
    alert('Mindestens ein Projekt muss vorhanden sein.');
    return;
  }

  const currentProject = getCurrentProject();
  if (!window.confirm(`Projekt "${currentProject.name}" wirklich löschen?`)) {
    return;
  }

  state.projects = state.projects.filter((project) => project.id !== state.currentProjectId);
  state.currentProjectId = state.projects[0].id;

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

dom.timelineViewSelect.addEventListener('change', (event) => {
  state.timelineView = event.target.value;
  render();
});

dom.newProjectBtn.addEventListener('click', createProject);
dom.deleteProjectBtn.addEventListener('click', deleteCurrentProject);

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
