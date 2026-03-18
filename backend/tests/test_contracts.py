"""Contract generation tests"""
import pytest
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

class TestContracts:
    """AI contract generation tests"""

    def test_generate_contract_success(self, authenticated_contractor):
        """Test POST /api/contracts/generate with AI"""
        if not EMERGENT_LLM_KEY:
            pytest.skip("EMERGENT_LLM_KEY not configured")
        
        response = authenticated_contractor.post(f"{BASE_URL}/api/contracts/generate", json={
            "contractor_name": "TEST Mike Johnson",
            "client_name": "TEST John Smith",
            "job_description": "Complete bathroom remodel including plumbing, tiling, and fixtures",
            "job_location": "123 Main St, New York, NY",
            "start_date": "March 1, 2026",
            "estimated_duration": "2 weeks",
            "total_amount": 5000.0,
            "payment_terms": "50% upfront, 50% on completion"
        })
        assert response.status_code == 200, f"Contract generation failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert "contract_text" in data
        assert len(data["contract_text"]) > 100, "Contract text should be substantial"
        assert data["contractor_name"] == "TEST Mike Johnson"
        assert data["client_name"] == "TEST John Smith"
        assert data["status"] == "draft"
        print(f"✓ Contract generated: {len(data['contract_text'])} characters")

    def test_list_contracts(self, authenticated_contractor):
        """Test GET /api/contracts"""
        response = authenticated_contractor.get(f"{BASE_URL}/api/contracts")
        assert response.status_code == 200
        
        data = response.json()
        assert "contracts" in data
        contracts = data["contracts"]
        
        if len(contracts) > 0:
            first = contracts[0]
            assert "contractor_name" in first
            assert "client_name" in first
            assert "contract_text" in first
            assert "_id" not in first
        print(f"✓ Listed {len(contracts)} contracts")

    def test_contracts_require_authentication(self, api_client):
        """Test unauthenticated contract generation fails"""
        response = api_client.post(f"{BASE_URL}/api/contracts/generate", json={
            "contractor_name": "Test",
            "client_name": "Test",
            "job_description": "Test",
            "job_location": "Test",
            "start_date": "Test",
            "estimated_duration": "Test",
            "total_amount": 1000.0,
            "payment_terms": "Test"
        })
        assert response.status_code == 401
        print("✓ Unauthenticated contract generation rejected")
