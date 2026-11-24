import os
import requests
from flask import Flask, jsonify

app = Flask(__name__)
TASK_SERVICE_URL = os.getenv('TASK_SERVICE_URL', 'http://localhost:5001').rstrip('/')

@app.get('/health')
def health():
    return jsonify(status='ok', service='analytics-service')

@app.get('/api/stats')
def stats():
    try:
        response = requests.get(
            f'{TASK_SERVICE_URL}/api/tasks',
            timeout=3
        )
        response.raise_for_status()
        tasks = response.json()

    except (requests.RequestException, ValueError):
        return jsonify(error='Task service unavailable'), 503

    total = len(tasks)
    done = sum(task['status'] == 'done' for task in tasks)

    priority_counts = {
        'low': 0,
        'medium': 0,
        'high': 0
    }

    for task in tasks:
        priority = task.get('priority', 'medium')

        if priority in priority_counts:
            priority_counts[priority] += 1

    return jsonify(
        total=total,
        done=done,
        open=total - done,
        completion_rate=round(done / total * 100, 1) if total else 0,
        priority=priority_counts
    )

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', '5002')))
