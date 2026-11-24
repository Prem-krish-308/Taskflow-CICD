const columns = {
    todo: document.getElementById('todo'),
    in_progress: document.getElementById('in_progress'),
    done: document.getElementById('done-list')
};

const errorBox = document.getElementById('error');

async function api(path, options = {}) {
    const response = await fetch(path, options);

    if (!response.ok) {
        throw new Error(`Request failed (${response.status})`);
    }

    return response.json();
}

async function updateTask(taskId, data) {
    try {
        await api(`/api/tasks/${taskId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });

        await refresh();

    } catch (e) {
        showError(e);
    }
}

async function refresh() {
    try {
        const [tasks, stats] = await Promise.all([
            api('/api/tasks'),
            api('/api/stats')
        ]);

        for (const column of Object.values(columns)) {
            column.replaceChildren();
        }

        for (const task of tasks) {
            const card = document.createElement('div');
            card.className = 'task';

            const title = document.createElement('p');
            title.textContent = task.title;

            const priority = task.priority || 'medium';

            // Priority badge
            const badge = document.createElement('span');
            badge.className = `priority-badge ${priority}`;
            badge.textContent = priority.toUpperCase();

            const actions = document.createElement('div');
            actions.className = 'task-actions';

            // Status dropdown
            const statusSelect = document.createElement('select');
            statusSelect.setAttribute('aria-label', 'Task status');

            for (const [value, label] of [
                ['todo', 'To do'],
                ['in_progress', 'In progress'],
                ['done', 'Done']
            ]) {
                statusSelect.add(new Option(label, value));
            }

            statusSelect.value = task.status;

            statusSelect.addEventListener('change', async () => {
                await updateTask(task.id, {
                    status: statusSelect.value
                });
            });

            // Priority dropdown
            const prioritySelect = document.createElement('select');
            prioritySelect.setAttribute('aria-label', 'Task priority');

            for (const [value, label] of [
                ['low', 'Low'],
                ['medium', 'Medium'],
                ['high', 'High']
            ]) {
                prioritySelect.add(new Option(label, value));
            }

            prioritySelect.value = priority;

            prioritySelect.addEventListener('change', async () => {
                await updateTask(task.id, {
                    priority: prioritySelect.value
                });
            });

            // Delete button
            const remove = document.createElement('button');
            remove.textContent = 'Delete';

            remove.addEventListener('click', async () => {
                try {
                    await api(`/api/tasks/${task.id}`, {
                        method: 'DELETE'
                    });

                    await refresh();

                } catch (e) {
                    showError(e);
                }
            });

            actions.append(
                statusSelect,
                prioritySelect,
                remove
            );

            card.append(title, badge, actions);

            columns[task.status]?.append(card);
        }

        // Existing statistics
        for (const [id, key] of [
            ['total', 'total'],
            ['open', 'open'],
            ['done', 'done']
        ]) {
            document.getElementById(id).textContent = stats[key];
        }

        document.getElementById('rate').textContent =
            `${stats.completion_rate}%`;

        // New priority statistics
        const priorityStats = stats.priority || {
            low: tasks.filter(t => t.priority === 'low').length,
            medium: tasks.filter(
                t => (t.priority || 'medium') === 'medium'
            ).length,
            high: tasks.filter(t => t.priority === 'high').length
        };

        document.getElementById('low-count').textContent =
            priorityStats.low;

        document.getElementById('medium-count').textContent =
            priorityStats.medium;

        document.getElementById('high-count').textContent =
            priorityStats.high;

        document.getElementById('health').textContent = 'Connected';

        errorBox.textContent = '';

    } catch (e) {
        document.getElementById('health').textContent =
            'Service unavailable';

        showError(e);
    }
}

function showError(error) {
    errorBox.textContent = error.message;
}

document.getElementById('new-task')
    .addEventListener('submit', async (event) => {

        event.preventDefault();

        const input = document.getElementById('title');
        const priorityInput = document.getElementById('priority');

        try {
            await api('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: input.value,
                    priority: priorityInput.value
                })
            });

            input.value = '';
            priorityInput.value = 'medium';

            await refresh();

        } catch (e) {
            showError(e);
        }
    });

refresh();
setInterval(refresh, 10000);