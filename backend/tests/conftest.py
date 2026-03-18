import pytest
import requests
import os

# Base URL for all tests
BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.fixture
def api_client():
    """Shared requests session for all tests"""
    session = requests.Session()
    session.headers.update({"Content-Type": "application/json"})
    return session

@pytest.fixture
def demo_client_token(api_client):
    """Get auth token for demo client"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "client@demo.com",
        "password": "demo123"
    })
    if response.status_code == 200:
        return response.json().get('token')
    return None

@pytest.fixture
def demo_contractor_token(api_client):
    """Get auth token for demo contractor (Mike Johnson)"""
    response = api_client.post(f"{BASE_URL}/api/auth/login", json={
        "email": "mike.johnson@demo.com",
        "password": "demo123"
    })
    if response.status_code == 200:
        return response.json().get('token')
    return None

@pytest.fixture
def authenticated_client(api_client, demo_client_token):
    """API client authenticated as demo client"""
    if demo_client_token:
        api_client.headers.update({"Authorization": f"Bearer {demo_client_token}"})
    return api_client

@pytest.fixture
def authenticated_contractor(api_client, demo_contractor_token):
    """API client authenticated as demo contractor"""
    if demo_contractor_token:
        api_client.headers.update({"Authorization": f"Bearer {demo_contractor_token}"})
    return api_client
