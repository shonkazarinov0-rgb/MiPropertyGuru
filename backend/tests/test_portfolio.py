"""Portfolio endpoint tests"""
import pytest
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestPortfolio:
    """Portfolio creation and retrieval tests"""

    def test_create_portfolio_item_and_verify(self, authenticated_contractor):
        """Test POST /api/portfolio and verify persistence"""
        # Get contractor ID from auth/me
        me_response = authenticated_contractor.get(f"{BASE_URL}/api/auth/me")
        contractor_id = me_response.json()["id"]
        
        # Create portfolio item
        response = authenticated_contractor.post(f"{BASE_URL}/api/portfolio", json={
            "title": "TEST Kitchen Renovation",
            "description": "TEST Complete kitchen remodel with custom cabinets and granite countertops",
            "image_base64": None
        })
        assert response.status_code == 200, f"Portfolio creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["title"] == "TEST Kitchen Renovation"
        assert data["description"] == "TEST Complete kitchen remodel with custom cabinets and granite countertops"
        assert data["contractor_id"] == contractor_id
        
        # Verify portfolio item appears in GET
        portfolio_response = authenticated_contractor.get(f"{BASE_URL}/api/portfolio/{contractor_id}")
        assert portfolio_response.status_code == 200
        portfolio = portfolio_response.json()["portfolio"]
        assert any(p["title"] == "TEST Kitchen Renovation" for p in portfolio)
        print(f"✓ Portfolio item created and verified")

    def test_get_portfolio_for_contractor(self, api_client):
        """Test GET /api/portfolio/{contractor_id}"""
        # Get a contractor with portfolio
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/portfolio/{contractor_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "portfolio" in data
        portfolio = data["portfolio"]
        
        if len(portfolio) > 0:
            first = portfolio[0]
            assert "title" in first
            assert "description" in first
            assert "contractor_id" in first
            assert "_id" not in first
        print(f"✓ Retrieved {len(portfolio)} portfolio items")

    def test_client_cannot_create_portfolio(self, authenticated_client):
        """Test client role cannot create portfolio items"""
        response = authenticated_client.post(f"{BASE_URL}/api/portfolio", json={
            "title": "TEST Item",
            "description": "TEST Description"
        })
        assert response.status_code == 403
        print("✓ Client blocked from creating portfolio")

    def test_portfolio_requires_authentication(self, api_client):
        """Test unauthenticated portfolio creation fails"""
        response = api_client.post(f"{BASE_URL}/api/portfolio", json={
            "title": "TEST Item",
            "description": "TEST Description"
        })
        assert response.status_code == 401
        print("✓ Unauthenticated portfolio creation rejected")
