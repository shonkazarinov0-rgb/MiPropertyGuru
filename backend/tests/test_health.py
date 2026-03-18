"""Health check and connectivity tests"""
import pytest
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestConnectivity:
    """Basic connectivity and seeded data verification"""

    def test_base_url_configured(self):
        """Verify BASE_URL is set from environment"""
        assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL not configured"
        assert BASE_URL.startswith('https://'), "BASE_URL should use HTTPS"
        print(f"✓ BASE_URL configured: {BASE_URL}")

    def test_contractors_endpoint_accessible(self, api_client):
        """Test GET /api/contractors returns seeded data"""
        response = api_client.get(f"{BASE_URL}/api/contractors")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}"
        
        data = response.json()
        assert "contractors" in data, "Response missing 'contractors' key"
        assert len(data["contractors"]) > 0, "No contractors found in seeded data"
        assert len(data["contractors"]) >= 20, f"Expected at least 20 contractors, got {len(data['contractors'])}"
        print(f"✓ Found {len(data['contractors'])} seeded contractors")

    def test_contractor_types_endpoint(self, api_client):
        """Test GET /api/contractor-types returns list"""
        response = api_client.get(f"{BASE_URL}/api/contractor-types")
        assert response.status_code == 200
        
        data = response.json()
        assert "types" in data
        assert len(data["types"]) > 0
        assert "Electrician" in data["types"]
        print(f"✓ Found {len(data['types'])} contractor types")
