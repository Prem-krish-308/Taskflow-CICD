import pytest
import requests
from unittest.mock import patch, Mock
from app import app

@pytest.fixture
def client():
    app.config['TESTING'] = True
    return app.test_client()

def test_health(client):
    assert client.get('/health').json['status'] == 'ok'

def test_empty_stats(client):
    with patch(
        'app.requests.get',
        return_value=Mock(json=lambda: [], status_code=200)
    ):
        response = client.get('/api/stats')

    assert response.status_code == 200

    assert response.json == {
        'total': 0,
        'done': 0,
        'open': 0,
        'completion_rate': 0,
        'priority': {
            'low': 0,
            'medium': 0,
            'high': 0
        }
    }

def test_stats_calculation(client):
    data = [
        {'status': 'done', 'priority': 'low'},
        {'status': 'todo', 'priority': 'high'},
        {'status': 'in_progress', 'priority': 'medium'}
    ]

    with patch(
        'app.requests.get',
        return_value=Mock(json=lambda: data, status_code=200)
    ):
        response = client.get('/api/stats')

    assert response.status_code == 200

    assert response.json == {
        'total': 3,
        'done': 1,
        'open': 2,
        'completion_rate': 33.3,
        'priority': {
            'low': 1,
            'medium': 1,
            'high': 1
        }
    }

def test_upstream_failure(client):
    with patch('app.requests.get', side_effect=requests.Timeout):
        response = client.get('/api/stats')
    assert response.status_code == 503
    assert response.json['error'] == 'Task service unavailable'

def test_tasks_without_priority(client):
    data = [
        {'status': 'done'},
        {'status': 'todo'}
    ]

    with patch(
        'app.requests.get',
        return_value=Mock(json=lambda: data, status_code=200)
    ):
        response = client.get('/api/stats')

    assert response.status_code == 200

    assert response.json['priority'] == {
        'low': 0,
        'medium': 2,
        'high': 0
    }