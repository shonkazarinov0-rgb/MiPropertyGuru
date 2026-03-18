"""Conversations and messaging tests"""
import pytest
import os

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

class TestMessaging:
    """Conversation and message endpoint tests"""

    def test_create_conversation_and_verify(self, authenticated_client, api_client):
        """Test POST /api/conversations creates conversation"""
        # Get a contractor ID to message
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        # Create conversation
        response = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": contractor_id
        })
        assert response.status_code == 200
        
        data = response.json()
        assert "id" in data
        assert "participant_1" in data
        assert "participant_2" in data
        conv_id = data["id"]
        
        # Verify conversation persists by listing
        list_response = authenticated_client.get(f"{BASE_URL}/api/conversations")
        assert list_response.status_code == 200
        conversations = list_response.json()["conversations"]
        assert any(c["id"] == conv_id for c in conversations)
        print(f"✓ Conversation created and verified: {conv_id}")

    def test_create_duplicate_conversation_returns_existing(self, authenticated_client, api_client):
        """Test creating duplicate conversation returns existing one"""
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        # Create first
        response1 = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": contractor_id
        })
        conv1 = response1.json()
        
        # Create duplicate
        response2 = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": contractor_id
        })
        conv2 = response2.json()
        
        assert conv1["id"] == conv2["id"]
        print("✓ Duplicate conversation returns existing")

    def test_list_conversations(self, authenticated_client):
        """Test GET /api/conversations"""
        response = authenticated_client.get(f"{BASE_URL}/api/conversations")
        assert response.status_code == 200
        
        data = response.json()
        assert "conversations" in data
        conversations = data["conversations"]
        
        if len(conversations) > 0:
            first = conversations[0]
            assert "id" in first
            assert "participant_1" in first
            assert "participant_2" in first
            assert "last_message" in first
        print(f"✓ Listed {len(conversations)} conversations")

    def test_get_messages_for_conversation(self, authenticated_client, api_client):
        """Test GET /api/messages/{conversation_id}"""
        # Create a conversation first
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        conv_response = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": contractor_id
        })
        conv_id = conv_response.json()["id"]
        
        # Get messages (should be empty initially)
        response = authenticated_client.get(f"{BASE_URL}/api/messages/{conv_id}")
        assert response.status_code == 200
        
        data = response.json()
        assert "messages" in data
        assert isinstance(data["messages"], list)
        print(f"✓ Retrieved messages for conversation {conv_id}")

    def test_create_conversation_with_invalid_user_fails(self, authenticated_client):
        """Test conversation with non-existent user returns 404"""
        response = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": "invalid-user-id-12345"
        })
        assert response.status_code == 404
        print("✓ Invalid participant ID rejected")

    def test_conversations_require_auth(self, api_client):
        """Test unauthenticated access to conversations fails"""
        response = api_client.get(f"{BASE_URL}/api/conversations")
        assert response.status_code == 401
        print("✓ Unauthenticated conversation access rejected")
