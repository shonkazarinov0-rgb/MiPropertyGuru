"""Review endpoint tests"""
import pytest
import os
import uuid

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestReviews:
    """Review creation and retrieval tests"""

    def test_create_review_and_verify(self, authenticated_client, api_client):
        """Test POST /api/reviews and verify persistence"""
        # Get a contractor ID
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        # Create review
        response = authenticated_client.post(f"{BASE_URL}/api/reviews", json={
            "contractor_id": contractor_id,
            "rating": 5,
            "comment": "TEST Excellent work! Very professional and on time."
        })
        assert response.status_code == 200, f"Review creation failed: {response.text}"
        
        data = response.json()
        assert "id" in data
        assert data["contractor_id"] == contractor_id
        assert data["rating"] == 5
        assert data["comment"] == "TEST Excellent work! Very professional and on time."
        assert "client_name" in data
        
        # Verify review appears in contractor's reviews
        reviews_response = api_client.get(f"{BASE_URL}/api/reviews/{contractor_id}")
        assert reviews_response.status_code == 200
        reviews = reviews_response.json()["reviews"]
        assert any(r["comment"] == "TEST Excellent work! Very professional and on time." for r in reviews)
        print(f"✓ Review created and verified for contractor {contractor_id}")

    def test_rating_clamped_to_valid_range(self, authenticated_client, api_client):
        """Test rating is clamped to 1-5 range"""
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][1]["id"]
        
        # Try rating > 5
        response = authenticated_client.post(f"{BASE_URL}/api/reviews", json={
            "contractor_id": contractor_id,
            "rating": 10,
            "comment": "TEST Great work"
        })
        assert response.status_code == 200
        assert response.json()["rating"] == 5
        print("✓ Rating clamped to maximum 5")

    def test_get_reviews_for_contractor(self, api_client):
        """Test GET /api/reviews/{contractor_id}"""
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        response = api_client.get(f"{BASE_URL}/api/reviews/{contractor_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "reviews" in data
        reviews = data["reviews"]
        
        if len(reviews) > 0:
            first = reviews[0]
            assert "rating" in first
            assert "comment" in first
            assert "client_name" in first
            assert "_id" not in first
        print(f"✓ Retrieved {len(reviews)} reviews")

    def test_review_requires_authentication(self, api_client):
        """Test unauthenticated review creation fails"""
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        response = api_client.post(f"{BASE_URL}/api/reviews", json={
            "contractor_id": contractor_id,
            "rating": 5,
            "comment": "Test review"
        })
        assert response.status_code == 401
        print("✓ Unauthenticated review rejected")
