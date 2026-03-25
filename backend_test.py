#!/usr/bin/env python3
"""
Backend API Testing for MiPropertyGuru Job Interaction Flow
Testing the specific APIs mentioned in the review request
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://local-trades-12.preview.emergentagent.com/api"

# Test credentials
CLIENT_EMAIL = "client@demo.com"
CLIENT_PASSWORD = "demo123"
CONTRACTOR_EMAIL = "carlos.rodriguez@demo.com"
CONTRACTOR_PASSWORD = "demo123"

class APITester:
    def __init__(self):
        self.client_token = None
        self.contractor_token = None
        self.client_user_id = None
        self.contractor_user_id = None
        self.job_id = None
        self.conversation_id = None
        self.test_results = []
        
    def log_result(self, test_name, success, message, details=None):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}: {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
    
    def make_request(self, method, endpoint, data=None, token=None, expected_status=200):
        """Make HTTP request with error handling"""
        url = f"{BASE_URL}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, timeout=30)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data, timeout=30)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data, timeout=30)
            else:
                return None, f"Unsupported method: {method}"
            
            if response.status_code != expected_status:
                return None, f"Expected {expected_status}, got {response.status_code}: {response.text}"
            
            return response.json(), None
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
        except json.JSONDecodeError as e:
            return None, f"Invalid JSON response: {str(e)}"
    
    def test_client_login(self):
        """Test client login"""
        print("\n=== Testing Client Login ===")
        
        data = {
            "email": CLIENT_EMAIL,
            "password": CLIENT_PASSWORD
        }
        
        response, error = self.make_request("POST", "/auth/login", data)
        
        if error:
            self.log_result("Client Login", False, f"Login failed: {error}")
            return False
        
        if "token" not in response or "user" not in response:
            self.log_result("Client Login", False, "Missing token or user in response")
            return False
        
        self.client_token = response["token"]
        self.client_user_id = response["user"]["id"]
        
        self.log_result("Client Login", True, f"Successfully logged in as {CLIENT_EMAIL}")
        print(f"   Client User ID: {self.client_user_id}")
        return True
    
    def test_contractor_login(self):
        """Test contractor login"""
        print("\n=== Testing Contractor Login ===")
        
        data = {
            "email": CONTRACTOR_EMAIL,
            "password": CONTRACTOR_PASSWORD
        }
        
        response, error = self.make_request("POST", "/auth/login", data)
        
        if error:
            self.log_result("Contractor Login", False, f"Login failed: {error}")
            return False
        
        if "token" not in response or "user" not in response:
            self.log_result("Contractor Login", False, "Missing token or user in response")
            return False
        
        self.contractor_token = response["token"]
        self.contractor_user_id = response["user"]["id"]
        contractor_type = response["user"].get("contractor_type", "Unknown")
        
        self.log_result("Contractor Login", True, f"Successfully logged in as {CONTRACTOR_EMAIL}")
        print(f"   Contractor User ID: {self.contractor_user_id}")
        print(f"   Contractor Type: {contractor_type}")
        return True
    
    def test_post_job(self):
        """Test POST /api/jobs/post - Client posts a job"""
        print("\n=== Testing Job Posting ===")
        
        if not self.client_token:
            self.log_result("Job Posting", False, "No client token available")
            return False
        
        job_data = {
            "title": "Plumbing Repair Needed",
            "trade_required": "Plumber",
            "description": "Kitchen sink is leaking and needs immediate repair. Water damage is getting worse.",
            "location": "Toronto, ON",
            "budget": "$500"
        }
        
        response, error = self.make_request("POST", "/jobs/post", job_data, self.client_token)
        
        if error:
            self.log_result("Job Posting", False, f"Failed to post job: {error}")
            return False
        
        if "job" not in response or "id" not in response["job"]:
            self.log_result("Job Posting", False, "Missing job or job ID in response")
            return False
        
        self.job_id = response["job"]["id"]
        job_title = response["job"]["title"]
        trade_required = response["job"]["trade_required"]
        
        self.log_result("Job Posting", True, f"Successfully posted job: {job_title}")
        print(f"   Job ID: {self.job_id}")
        print(f"   Trade Required: {trade_required}")
        print(f"   Posted by: {response['job']['posted_by_name']}")
        return True
    
    def test_get_available_jobs(self):
        """Test GET /api/jobs/available - Contractor sees available jobs"""
        print("\n=== Testing Available Jobs ===")
        
        if not self.contractor_token:
            self.log_result("Available Jobs", False, "No contractor token available")
            return False
        
        response, error = self.make_request("GET", "/jobs/available", token=self.contractor_token)
        
        if error:
            self.log_result("Available Jobs", False, f"Failed to get available jobs: {error}")
            return False
        
        if "jobs" not in response:
            self.log_result("Available Jobs", False, "Missing jobs in response")
            return False
        
        jobs = response["jobs"]
        job_found = False
        
        # Check if our posted job appears in the list
        for job in jobs:
            if job.get("id") == self.job_id:
                job_found = True
                print(f"   Found posted job: {job['title']}")
                print(f"   Trade Required: {job['trade_required']}")
                print(f"   Posted by: {job['posted_by_name']}")
                break
        
        if not job_found and self.job_id:
            self.log_result("Available Jobs", False, f"Posted job {self.job_id} not found in available jobs")
            return False
        
        self.log_result("Available Jobs", True, f"Retrieved {len(jobs)} available jobs")
        if job_found:
            print(f"   ✅ Posted job appears in contractor's available jobs")
        return True
    
    def test_dismiss_job(self):
        """Test POST /api/jobs/{job_id}/dismiss - Contractor dismisses a job"""
        print("\n=== Testing Job Dismissal ===")
        
        if not self.contractor_token or not self.job_id:
            self.log_result("Job Dismissal", False, "Missing contractor token or job ID")
            return False
        
        response, error = self.make_request("POST", f"/jobs/{self.job_id}/dismiss", {}, self.contractor_token)
        
        if error:
            self.log_result("Job Dismissal", False, f"Failed to dismiss job: {error}")
            return False
        
        if "message" not in response:
            self.log_result("Job Dismissal", False, "Missing message in response")
            return False
        
        self.log_result("Job Dismissal", True, f"Successfully dismissed job: {response['message']}")
        return True
    
    def test_available_jobs_after_dismiss(self):
        """Test that dismissed job no longer appears in available jobs"""
        print("\n=== Testing Available Jobs After Dismissal ===")
        
        if not self.contractor_token:
            self.log_result("Jobs After Dismissal", False, "No contractor token available")
            return False
        
        response, error = self.make_request("GET", "/jobs/available", token=self.contractor_token)
        
        if error:
            self.log_result("Jobs After Dismissal", False, f"Failed to get available jobs: {error}")
            return False
        
        if "jobs" not in response:
            self.log_result("Jobs After Dismissal", False, "Missing jobs in response")
            return False
        
        jobs = response["jobs"]
        job_found = False
        
        # Check if our dismissed job still appears in the list
        for job in jobs:
            if job.get("id") == self.job_id:
                job_found = True
                break
        
        if job_found:
            self.log_result("Jobs After Dismissal", False, "Dismissed job still appears in available jobs")
            return False
        
        self.log_result("Jobs After Dismissal", True, f"Dismissed job correctly excluded from {len(jobs)} available jobs")
        return True
    
    def test_post_another_job(self):
        """Post another job for conversation testing"""
        print("\n=== Testing Second Job Posting ===")
        
        if not self.client_token:
            self.log_result("Second Job Posting", False, "No client token available")
            return False
        
        job_data = {
            "title": "Bathroom Plumbing Installation",
            "trade_required": "Plumber",
            "description": "Need to install new bathroom fixtures including toilet, sink, and shower.",
            "location": "Toronto, ON",
            "budget": "$1200"
        }
        
        response, error = self.make_request("POST", "/jobs/post", job_data, self.client_token)
        
        if error:
            self.log_result("Second Job Posting", False, f"Failed to post second job: {error}")
            return False
        
        if "job" not in response or "id" not in response["job"]:
            self.log_result("Second Job Posting", False, "Missing job or job ID in response")
            return False
        
        # Update job_id to the new job for conversation testing
        self.job_id = response["job"]["id"]
        job_title = response["job"]["title"]
        
        self.log_result("Second Job Posting", True, f"Successfully posted second job: {job_title}")
        print(f"   New Job ID: {self.job_id}")
        return True
    
    def test_create_conversation(self):
        """Test POST /api/conversations - Contractor contacts client"""
        print("\n=== Testing Conversation Creation ===")
        
        if not self.contractor_token or not self.client_user_id:
            self.log_result("Conversation Creation", False, "Missing contractor token or client user ID")
            return False
        
        conversation_data = {
            "participant_id": self.client_user_id
        }
        
        response, error = self.make_request("POST", "/conversations", conversation_data, self.contractor_token)
        
        if error:
            self.log_result("Conversation Creation", False, f"Failed to create conversation: {error}")
            return False
        
        if "id" not in response:
            self.log_result("Conversation Creation", False, "Missing conversation ID in response")
            return False
        
        self.conversation_id = response["id"]
        participant_1_name = response.get("participant_1_name", "Unknown")
        participant_2_name = response.get("participant_2_name", "Unknown")
        
        self.log_result("Conversation Creation", True, f"Successfully created conversation")
        print(f"   Conversation ID: {self.conversation_id}")
        print(f"   Participants: {participant_1_name} <-> {participant_2_name}")
        return True
    
    def run_all_tests(self):
        """Run all tests in sequence"""
        print("🚀 Starting Job Interaction Flow API Tests")
        print("=" * 60)
        
        # Test sequence as specified in review request
        tests = [
            ("Client Login", self.test_client_login),
            ("Contractor Login", self.test_contractor_login),
            ("Job Posting", self.test_post_job),
            ("Available Jobs", self.test_get_available_jobs),
            ("Job Dismissal", self.test_dismiss_job),
            ("Jobs After Dismissal", self.test_available_jobs_after_dismiss),
            ("Second Job Posting", self.test_post_another_job),
            ("Conversation Creation", self.test_create_conversation),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
            except Exception as e:
                self.log_result(test_name, False, f"Test crashed: {str(e)}")
                failed += 1
        
        # Summary
        print("\n" + "=" * 60)
        print("🏁 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! Job Interaction Flow APIs are working correctly.")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please check the details above.")
        
        return failed == 0

def main():
    """Main test execution"""
    tester = APITester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()