"""WebSocket (Socket.IO) tests"""
import pytest
import os
import socketio
import time
import asyncio

BASE_URL = os.environ.get('EXPO_PUBLIC_BACKEND_URL', '').rstrip('/')

@pytest.mark.asyncio
class TestWebSocket:
    """Socket.IO WebSocket connection and messaging tests"""

    async def test_socket_connection_lifecycle(self):
        """Test Socket.IO connection and disconnection"""
        sio = socketio.AsyncClient()
        
        try:
            # Connect to WebSocket endpoint
            await sio.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            assert sio.connected, "Socket should be connected"
            print("✓ WebSocket connected successfully")
            
            # Disconnect
            await sio.disconnect()
            assert not sio.connected, "Socket should be disconnected"
            print("✓ WebSocket disconnected successfully")
        except Exception as e:
            pytest.fail(f"Connection test failed: {e}")

    async def test_socket_authenticate(self):
        """Test authenticate event with user_id"""
        sio = socketio.AsyncClient()
        
        try:
            await sio.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            
            # Send authenticate event
            await sio.emit('authenticate', {'user_id': 'test-user-123'})
            await asyncio.sleep(0.5)  # Wait for server processing
            
            print("✓ Authenticate event sent")
            await sio.disconnect()
        except Exception as e:
            pytest.fail(f"Authenticate test failed: {e}")

    async def test_socket_join_room(self):
        """Test join_room event with room_id"""
        sio = socketio.AsyncClient()
        
        try:
            await sio.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            
            # Join room
            await sio.emit('join_room', {'room_id': 'test-room-123'})
            await asyncio.sleep(0.5)
            
            print("✓ Join room event sent")
            await sio.disconnect()
        except Exception as e:
            pytest.fail(f"Join room test failed: {e}")

    async def test_socket_send_and_receive_message(self, api_client, authenticated_client):
        """Test send_message and new_message broadcast"""
        # Create a conversation first via REST API
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        conv_response = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": contractor_id
        })
        conv_id = conv_response.json()["id"]
        
        # Get user ID
        me_response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        user_id = me_response.json()["id"]
        
        # Connect WebSocket
        sio = socketio.AsyncClient()
        received_messages = []
        
        @sio.on('new_message')
        def on_new_message(data):
            received_messages.append(data)
            print(f"✓ Received message: {data['text']}")
        
        try:
            await sio.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            
            # Authenticate and join room
            await sio.emit('authenticate', {'user_id': user_id})
            await sio.emit('join_room', {'room_id': conv_id})
            await asyncio.sleep(0.5)
            
            # Send message
            test_message = "TEST WebSocket message from pytest"
            await sio.emit('send_message', {
                'conversation_id': conv_id,
                'text': test_message
            })
            
            # Wait for broadcast
            await asyncio.sleep(2)
            
            # Verify message was received
            assert len(received_messages) > 0, "Should receive new_message event"
            assert received_messages[0]['text'] == test_message
            assert received_messages[0]['conversation_id'] == conv_id
            print(f"✓ Message sent and received via WebSocket")
            
            # Verify message was persisted in DB via REST API
            messages_response = authenticated_client.get(f"{BASE_URL}/api/messages/{conv_id}")
            messages = messages_response.json()["messages"]
            assert any(m['text'] == test_message for m in messages)
            print("✓ Message persisted in database")
            
            await sio.disconnect()
        except Exception as e:
            await sio.disconnect()
            pytest.fail(f"Send/receive message test failed: {e}")

    async def test_socket_typing_event(self):
        """Test typing event"""
        sio = socketio.AsyncClient()
        typing_events = []
        
        @sio.on('user_typing')
        def on_typing(data):
            typing_events.append(data)
        
        try:
            await sio.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            
            await sio.emit('authenticate', {'user_id': 'test-user-typing'})
            await sio.emit('join_room', {'room_id': 'test-room-typing'})
            await asyncio.sleep(0.5)
            
            # Send typing event
            await sio.emit('typing', {
                'conversation_id': 'test-room-typing'
            })
            await asyncio.sleep(0.5)
            
            print("✓ Typing event sent")
            await sio.disconnect()
        except Exception as e:
            pytest.fail(f"Typing event test failed: {e}")

    async def test_multiple_clients_same_room(self, api_client, authenticated_client):
        """Test message broadcast to multiple clients in same room"""
        # Create conversation
        contractors_response = api_client.get(f"{BASE_URL}/api/contractors")
        contractor_id = contractors_response.json()["contractors"][0]["id"]
        
        conv_response = authenticated_client.post(f"{BASE_URL}/api/conversations", json={
            "participant_id": contractor_id
        })
        conv_id = conv_response.json()["id"]
        
        me_response = authenticated_client.get(f"{BASE_URL}/api/auth/me")
        user_id = me_response.json()["id"]
        
        # Create two clients
        sio1 = socketio.AsyncClient()
        sio2 = socketio.AsyncClient()
        client1_messages = []
        client2_messages = []
        
        @sio1.on('new_message')
        def client1_msg(data):
            client1_messages.append(data)
        
        @sio2.on('new_message')
        def client2_msg(data):
            client2_messages.append(data)
        
        try:
            # Connect both clients
            await sio1.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            await sio2.connect(BASE_URL, socketio_path='/api/socket.io', transports=['websocket', 'polling'])
            
            # Both join same room
            await sio1.emit('authenticate', {'user_id': user_id})
            await sio1.emit('join_room', {'room_id': conv_id})
            await sio2.emit('authenticate', {'user_id': contractor_id})
            await sio2.emit('join_room', {'room_id': conv_id})
            await asyncio.sleep(0.5)
            
            # Client 1 sends message
            test_msg = "TEST Broadcast to multiple clients"
            await sio1.emit('send_message', {
                'conversation_id': conv_id,
                'text': test_msg
            })
            
            await asyncio.sleep(2)
            
            # Both clients should receive the message
            assert len(client1_messages) > 0, "Client 1 should receive message"
            assert len(client2_messages) > 0, "Client 2 should receive message"
            assert client1_messages[0]['text'] == test_msg
            assert client2_messages[0]['text'] == test_msg
            print("✓ Message broadcast to multiple clients in same room")
            
            await sio1.disconnect()
            await sio2.disconnect()
        except Exception as e:
            await sio1.disconnect()
            await sio2.disconnect()
            pytest.fail(f"Multiple clients test failed: {e}")
