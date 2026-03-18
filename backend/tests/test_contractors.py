"""Contractor endpoints tests"""
import pytest
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestContractors:
    """Contractor listing and detail tests"""

    def test_list_all_contractors(self, api_client):
        """Test GET /api/contractors returns all contractors"""
        response = api_client.get(f"{BASE_URL}/api/contractors")
        assert response.status_code == 200
        
        data = response.json()
        contractors = data["contractors"]
        assert len(contractors) >= 20
        
        # Verify contractor has required fields
        first = contractors[0]
        assert "id" in first
        assert "name" in first
        assert "contractor_type" in first
        assert "hourly_rate" in first
        assert "rating" in first
        assert "_id" not in first, "MongoDB _id should be excluded"
        print(f"✓ Listed {len(contractors)} contractors")

    def test_filter_contractors_by_category(self, api_client):
        """Test GET /api/contractors?category=Electrician"""
        response = api_client.get(f"{BASE_URL}/api/contractors?category=Electrician")
        assert response.status_code == 200
        
        data = response.json()
        contractors = data["contractors"]
        assert len(contractors) > 0
        
        # Verify all are electricians
        for c in contractors:
            assert c["contractor_type"] == "Electrician"
        print(f"✓ Filtered to {len(contractors)} Electricians")

    def test_contractors_with_location_params(self, api_client):
        """Test GET /api/contractors with lat/lng returns distance"""
        response = api_client.get(f"{BASE_URL}/api/contractors?lat=40.7128&lng=-74.0060")
        assert response.status_code == 200
        
        data = response.json()
        contractors = data["contractors"]
        assert len(contractors) > 0
        
        # Verify distance is calculated
        for c in contractors:
            assert "distance" in c
            assert isinstance(c["distance"], (int, float))
        print(f"✓ Distance calculated for {len(contractors)} contractors")

    def test_get_contractor_detail(self, api_client):
        """Test GET /api/contractors/{id} returns full details"""
        # First get a contractor ID
        list_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractors = list_response.json()["contractors"]
        contractor_id = contractors[0]["id"]
        
        # Get detail
        response = api_client.get(f"{BASE_URL}/api/contractors/{contractor_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "contractor" in data
        assert "reviews" in data
        assert "portfolio" in data
        
        contractor = data["contractor"]
        assert contractor["id"] == contractor_id
        assert "name" in contractor
        assert "bio" in contractor
        print(f"✓ Contractor detail loaded for {contractor['name']}")

    def test_get_nonexistent_contractor_404(self, api_client):
        """Test GET /api/contractors/{invalid_id} returns 404"""
        response = api_client.get(f"{BASE_URL}/api/contractors/invalid-id-12345")
        assert response.status_code == 404
        print("✓ Non-existent contractor returns 404")

    def test_update_contractor_location(self, authenticated_contractor):
        """Test PUT /api/contractors/location"""
        response = authenticated_contractor.put(f"{BASE_URL}/api/contractors/location", json={
            "live_location_enabled": True,
            "current_lat": 40.7589,
            "current_lng": -73.9851,
            "work_locations": [
                {"name": "TEST Area 1", "lat": 40.7589, "lng": -73.9851}
            ]
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "message" in data
        print("✓ Contractor location updated")

    def test_update_contractor_profile(self, authenticated_contractor):
        """Test PUT /api/contractors/profile and verify persistence"""
        response = authenticated_contractor.put(f"{BASE_URL}/api/contractors/profile", json={
            "bio": "TEST Updated bio for testing",
            "hourly_rate": 95.0
        })
        assert response.status_code == 200
        
        data = response.json()
        assert data["bio"] == "TEST Updated bio for testing"
        assert data["hourly_rate"] == 95.0
        
        # Verify persistence with GET /auth/me
        me_response = authenticated_contractor.get(f"{BASE_URL}/api/auth/me")
        me_data = me_response.json()
        assert me_data["bio"] == "TEST Updated bio for testing"
        print("✓ Contractor profile updated and persisted")

    def test_client_cannot_update_location(self, authenticated_client):
        """Test client role cannot update contractor location"""
        response = authenticated_client.put(f"{BASE_URL}/api/contractors/location", json={
            "live_location_enabled": True
        })
        assert response.status_code == 403
        print("✓ Client blocked from updating contractor location")
