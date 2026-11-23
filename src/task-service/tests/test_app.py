import pytest
from app import app, tasks

@pytest.fixture
def client():
    app.config['TESTING'] = True
    tasks.clear()
    with app.test_client() as client:
        yield client
    tasks.clear()

def test_health(client):
    response = client.get('/health')
    assert response.status_code == 200
    assert response.json['status'] == 'ok'

def test_task_lifecycle(client):
    assert client.get('/api/tasks').json == []
    created = client.post('/api/tasks', json={'title': '  Learn CI  '})
    assert created.status_code == 201
    task = created.json
    assert task['title'] == 'Learn CI'
    assert task['status'] == 'todo'
    assert len(client.get('/api/tasks').json) == 1
    changed = client.patch(f"/api/tasks/{task['id']}", json={'status': 'done'})
    assert changed.status_code == 200
    assert changed.json['status'] == 'done'
    assert client.delete(f"/api/tasks/{task['id']}").json == {'deleted': True}
    assert client.get('/api/tasks').json == []

def test_invalid_input(client):
    assert client.post('/api/tasks', json={'title': ' '}).status_code == 400
    assert client.post('/api/tasks', json={'title': 'x' * 121}).status_code == 400
    assert client.patch('/api/tasks/missing', json={'status': 'bad'}).status_code == 400
    assert client.patch('/api/tasks/missing', json={'status': 'done'}).status_code == 404
    assert client.delete('/api/tasks/missing').status_code == 404
