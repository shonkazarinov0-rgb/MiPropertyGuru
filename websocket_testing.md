# WebSocket Testing Guide for ConstructConnect

## Test Suite for Socket.IO Chat

### Backend WebSocket Tests (python-socketio client)

1. **Connection Lifecycle**
   - Test successful connection to `/api/socket.io`
   - Test disconnect event
   - Test connection status tracking

2. **Room Management**
   - Test `join_room` event with valid room_id
   - Test `join_room` with missing room_id
   - Test multiple clients in same room

3. **Broadcasting & Real-time Sync**
   - Test `new_message` event received by all clients in same room
   - Test messages NOT received by clients in different rooms
   - Test `send_message` stores in DB and broadcasts

4. **Error Handling**
   - Test malformed room_id handling
   - Test rapid connect/disconnect cycles
   - Test behavior when emitting during disconnect

### Frontend WebSocket Tests (Playwright)

1. **Connection & UI State**
   - Test chat screen connects to WebSocket
   - Test messages display correctly

2. **Real-time Updates**
   - Test sending a message shows it in UI
   - Test receiving a message from server shows it

3. **Room Management**
   - Test joining room when opening chat
   - Test leaving room on page navigation
