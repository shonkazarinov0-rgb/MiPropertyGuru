"""Authentication and authorization tests"""
import pytest
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestAuth:
    """Authentication endpoint tests"""

    def test_login_demo_client_success(self, api_client):
        """Test login with demo client credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "client@demo.com",
            "password": "demo123"
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        
        data = response.json()
        assert "token" in data, "Response missing token"
        assert "user" in data, "Response missing user"
        assert data["user"]["email"] == "client@demo.com"
        assert data["user"]["role"] == "client"
        print("✓ Demo client login successful")

    def test_login_demo_contractor_success(self, api_client):
        """Test login with demo contractor credentials"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "mike.johnson@demo.com",
            "password": "demo123"
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["role"] == "contractor"
        assert data["user"]["contractor_type"] == "Electrician"
        print("✓ Demo contractor login successful")

    def test_login_invalid_credentials(self, api_client):
        """Test login with invalid credentials returns 401"""
        response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": "invalid@example.com",
            "password": "wrongpassword"
        })
        assert response.status_code == 401
        print("✓ Invalid credentials rejected")

    def test_register_client_success(self, api_client):
        """Test client registration and verify persistence"""
        test_email = f"TEST_client_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST Client User",
            "email": test_email,
            "phone": "+15551234567",
            "password": "testpass123",
            "role": "client"
        })
        assert response.status_code == 200, f"Registration failed: {response.text}"
        
        data = response.json()
        assert "token" in data
        assert "user" in data
        assert data["user"]["email"] == test_email
        assert data["user"]["role"] == "client"
        assert data["user"]["subscription_status"] == "free"
        
        # Verify persistence by logging in
        login_response = api_client.post(f"{BASE_URL}/api/auth/login", json={
            "email": test_email,
            "password": "testpass123"
        })
        assert login_response.status_code == 200
        print(f"✓ Client registration and login verified: {test_email}")

    def test_register_contractor_success(self, api_client):
        """Test contractor registration with required fields"""
        test_email = f"TEST_contractor_{uuid.uuid4().hex[:8]}@test.com"
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST Contractor User",
            "email": test_email,
            "phone": "+15559876543",
            "password": "testpass123",
            "role": "contractor",
            "contractor_type": "Plumber",
            "bio": "Test plumber bio",
            "hourly_rate": 85.0
        })
        assert response.status_code == 200, f"Contractor registration failed: {response.text}"
        
        data = response.json()
        assert data["user"]["role"] == "contractor"
        assert data["user"]["contractor_type"] == "Plumber"
        assert data["user"]["hourly_rate"] == 85.0
        assert data["user"]["subscription_status"] == "pending"
        assert data["user"]["subscription_fee"] == 25.0
        print(f"✓ Contractor registration verified: {test_email}")

    def test_register_contractor_without_type_fails(self, api_client):
        """Test contractor registration fails without contractor_type"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "TEST No Type",
            "email": f"TEST_notype_{uuid.uuid4().hex[:8]}@test.com",
            "phone": "+15551111111",
            "password": "testpass123",
            "role": "contractor"
        })
        assert response.status_code == 400
        print("✓ Contractor registration without type rejected")

    def test_register_duplicate_email_fails(self, api_client):
        """Test registration with existing email fails"""
        response = api_client.post(f"{BASE_URL}/api/auth/register", json={
            "name": "Duplicate User",
            "email": "client@demo.com",
            "phone": "+15551234567",
            "password": "testpass123",
            "role": "client"
        })
        assert response.status_code == 400
        print("✓ Duplicate email registration rejected")

    def test_get_me_authenticated(self, authenticated_client):
        """Test GET /api/auth/me with valid token"""
        response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 200
        
        data = response.json()
        assert "email" in data
        assert "password_hash" not in data, "Password hash should not be exposed"
        print("✓ /api/auth/me returns user data")

    def test_get_me_unauthenticated(self, api_client):
        """Test GET /api/auth/me without token returns 401"""
        response = api_client.get(f"{BASE_URL}/api/auth/me")
        assert response.status_code == 401
        print("✓ Unauthenticated access rejected")
