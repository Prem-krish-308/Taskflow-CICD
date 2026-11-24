import os
import threading
from uuid import uuid4
from flask import Flask, jsonify, request

app = Flask(__name__)
tasks = {}
lock = threading.Lock()
VALID_STATUSES = {'todo', 'in_progress', 'done'}
VALID_PRIORITIES = {'low', 'medium', 'high'}

@app.get('/health')
def health():
    return jsonify(status='ok', service='task-service')

@app.get('/api/tasks')
def list_tasks():
    with lock:
        return jsonify(list(tasks.values()))

@app.post('/api/tasks')
def create_task():
    data = request.get_json(silent=True) or {}
    title = data.get('title')
    priority = data.get('priority', 'medium')

    if not isinstance(title, str) or not title.strip() or len(title) > 120:
        return jsonify(error='Title must contain 1-120 characters'), 400

    if not isinstance(priority, str) or priority not in VALID_PRIORITIES:
        return jsonify(error='Invalid priority'), 400

    task = {
        'id': str(uuid4()),
        'title': title.strip(),
        'status': 'todo',
        'priority': priority
    }

    with lock:
        tasks[task['id']] = task

    return jsonify(task), 201

@app.patch('/api/tasks/<task_id>')
def update_task(task_id):
    data = request.get_json(silent=True) or {}

    if 'status' not in data and 'priority' not in data:
        return jsonify(error='No valid fields to update'), 400

    if 'status' in data:
        status = data['status']

        if not isinstance(status, str) or status not in VALID_STATUSES:
            return jsonify(error='Invalid status'), 400

    if 'priority' in data:
        priority = data['priority']

        if not isinstance(priority, str) or priority not in VALID_PRIORITIES:
            return jsonify(error='Invalid priority'), 400

    with lock:
        if task_id not in tasks:
            return jsonify(error='Task not found'), 404

        if 'status' in data:
            tasks[task_id]['status'] = status

        if 'priority' in data:
            tasks[task_id]['priority'] = priority

        return jsonify(tasks[task_id])    
@app.delete('/api/tasks/<task_id>')
def delete_task(task_id):
    with lock:
        if task_id not in tasks:
            return jsonify(error='Task not found'), 404
        del tasks[task_id]
    return jsonify(deleted=True)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5001')))
