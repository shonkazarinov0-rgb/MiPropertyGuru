#!/usr/bin/env python3
"""
Job Matching API Test for Carpenter Trade
Testing the specific bug fix for job matching where contractors weren't seeing jobs
that matched their trades because the query was using trade_required string instead of trades_required array
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://local-trades-12.preview.emergentagent.com/api"

class JobMatchingTester:
    def __init__(self):
        self.carpenter_token = None
        self.carpenter_user_id = None
        self.client_token = None
        self.client_user_id = None
        self.test_job_ids = []
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
            else:
                return None, f"Unsupported method: {method}"
            
            if response.status_code != expected_status:
                return None, f"Expected {expected_status}, got {response.status_code}: {response.text}"
            
            return response.json(), None
        except requests.exceptions.RequestException as e:
            return None, f"Request failed: {str(e)}"
        except json.JSONDecodeError as e:
            return None, f"Invalid JSON response: {str(e)}"
    
    def find_carpenter_user(self):
        """Find a contractor with Carpenter trade (looking for Popi Loli or any Carpenter)"""
        print("\n=== Finding Carpenter Contractor ===")
        
        # Try to find a contractor with Carpenter trade
        test_credentials = [
            {"email": "carlos.rodriguez@demo.com", "password": "demo123"},  # Updated to have Carpenter trade
            {"email": "popi.loli@demo.com", "password": "demo123"},
            {"email": "carpenter@demo.com", "password": "demo123"}
        ]
        
        for cred in test_credentials:
            data = {
                "email": cred["email"],
                "password": cred["password"]
            }
            
            response, error = self.make_request("POST", "/auth/login", data)
            
            if not error and response:
                user = response.get("user", {})
                user_trades = user.get("trades", [])
                contractor_type = user.get("contractor_type", "")
                
                # Check if user has Carpenter trade
                if "Carpenter" in user_trades or contractor_type == "Carpenter":
                    self.carpenter_token = response["token"]
                    self.carpenter_user_id = user["id"]
                    self.log_result("Find Carpenter", True, f"Found Carpenter contractor: {user.get('name', 'Unknown')} ({cred['email']})")
                    print(f"   User ID: {self.carpenter_user_id}")
                    print(f"   Trades: {user_trades}")
                    print(f"   Contractor Type: {contractor_type}")
                    return True
        
        self.log_result("Find Carpenter", False, "No Carpenter contractor found with test credentials")
        return False
    
    def login_as_client(self):
        """Login as a client to post test jobs"""
        print("\n=== Client Login ===")
        
        data = {
            "email": "client@demo.com",
            "password": "demo123"
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
        
        self.log_result("Client Login", True, f"Successfully logged in as client")
        return True
    
    def post_test_jobs(self):
        """Post test jobs with different trade requirements"""
        print("\n=== Posting Test Jobs ===")
        
        if not self.client_token:
            self.log_result("Post Test Jobs", False, "No client token available")
            return False
        
        # Test jobs to create
        test_jobs = [
            {
                "title": "Kitchen Cabinet Installation",
                "trade_required": "Carpenter",
                "trades_required": [],  # Old style - single trade in string
                "description": "Need custom kitchen cabinets installed",
                "location": "Toronto, ON",
                "budget": "$2000"
            },
            {
                "title": "Deck Building Project", 
                "trade_required": "General Contractor",
                "trades_required": ["Carpenter", "Handyman"],  # New style - array with Carpenter
                "description": "Build a new deck in backyard",
                "location": "Toronto, ON", 
                "budget": "$3000"
            },
            {
                "title": "Complete Home Renovation",
                "trade_required": "General Contractor",
                "trades_required": ["Carpenter", "Plumber", "Electrician"],  # Array with multiple trades including Carpenter
                "description": "Full home renovation project",
                "location": "Toronto, ON",
                "budget": "$15000"
            },
            {
                "title": "Plumbing Repair Only",
                "trade_required": "Plumber", 
                "trades_required": ["Plumber"],  # Should NOT match Carpenter
                "description": "Fix leaking pipes",
                "location": "Toronto, ON",
                "budget": "$500"
            }
        ]
        
        posted_jobs = 0
        for job_data in test_jobs:
            response, error = self.make_request("POST", "/jobs/post", job_data, self.client_token)
            
            if error:
                print(f"   ❌ Failed to post job '{job_data['title']}': {error}")
                continue
            
            if "job" in response and "id" in response["job"]:
                job_id = response["job"]["id"]
                self.test_job_ids.append({
                    "id": job_id,
                    "title": job_data["title"],
                    "trade_required": job_data["trade_required"],
                    "trades_required": job_data["trades_required"],
                    "should_match_carpenter": "Carpenter" in job_data["trades_required"] or job_data["trade_required"] == "Carpenter"
                })
                posted_jobs += 1
                print(f"   ✅ Posted: {job_data['title']} (ID: {job_id})")
        
        if posted_jobs > 0:
            self.log_result("Post Test Jobs", True, f"Successfully posted {posted_jobs} test jobs")
            return True
        else:
            self.log_result("Post Test Jobs", False, "Failed to post any test jobs")
            return False
    
    def test_job_matching(self):
        """Test the job matching API for Carpenter contractor"""
        print("\n=== Testing Job Matching for Carpenter ===")
        
        if not self.carpenter_token:
            self.log_result("Job Matching", False, "No carpenter token available")
            return False
        
        response, error = self.make_request("GET", "/jobs/available", token=self.carpenter_token)
        
        if error:
            self.log_result("Job Matching", False, f"Failed to get available jobs: {error}")
            return False
        
        if "jobs" not in response:
            self.log_result("Job Matching", False, "Missing jobs in response")
            return False
        
        available_jobs = response["jobs"]
        print(f"   Found {len(available_jobs)} available jobs")
        
        # Check each test job
        matches_found = 0
        expected_matches = 0
        
        for test_job in self.test_job_ids:
            job_found = False
            should_match = test_job["should_match_carpenter"]
            
            if should_match:
                expected_matches += 1
            
            for available_job in available_jobs:
                if available_job.get("id") == test_job["id"]:
                    job_found = True
                    matches_found += 1
                    print(f"   ✅ Found matching job: {test_job['title']}")
                    print(f"      Trade Required: {test_job['trade_required']}")
                    print(f"      Trades Required: {test_job['trades_required']}")
                    break
            
            if should_match and not job_found:
                print(f"   ❌ Missing expected job: {test_job['title']}")
                print(f"      Trade Required: {test_job['trade_required']}")
                print(f"      Trades Required: {test_job['trades_required']}")
            elif not should_match and job_found:
                print(f"   ❌ Unexpected job found: {test_job['title']} (should not match Carpenter)")
        
        # Verify no jobs posted by the same user appear
        own_jobs_found = 0
        for job in available_jobs:
            if job.get("posted_by") == self.carpenter_user_id:
                own_jobs_found += 1
                print(f"   ❌ Found own job in available jobs: {job.get('title', 'Unknown')}")
        
        # Summary
        success = (matches_found == expected_matches and own_jobs_found == 0)
        
        if success:
            self.log_result("Job Matching", True, f"Job matching working correctly: {matches_found}/{expected_matches} expected matches found, no own jobs")
        else:
            self.log_result("Job Matching", False, f"Job matching issues: {matches_found}/{expected_matches} matches, {own_jobs_found} own jobs found")
        
        # Detailed verification
        print(f"\n   📊 Matching Results:")
        print(f"      Expected Carpenter matches: {expected_matches}")
        print(f"      Actual matches found: {matches_found}")
        print(f"      Own jobs incorrectly shown: {own_jobs_found}")
        
        return success
    
    def run_all_tests(self):
        """Run all job matching tests"""
        print("🚀 Starting Job Matching API Tests for Carpenter Trade")
        print("=" * 70)
        
        tests = [
            ("Find Carpenter Contractor", self.find_carpenter_user),
            ("Client Login", self.login_as_client),
            ("Post Test Jobs", self.post_test_jobs),
            ("Test Job Matching", self.test_job_matching),
        ]
        
        passed = 0
        failed = 0
        
        for test_name, test_func in tests:
            try:
                if test_func():
                    passed += 1
                else:
                    failed += 1
                    # Stop on critical failures
                    if test_name in ["Find Carpenter Contractor", "Client Login"]:
                        print(f"\n❌ Critical test failed: {test_name}. Stopping execution.")
                        break
            except Exception as e:
                self.log_result(test_name, False, f"Test crashed: {str(e)}")
                failed += 1
        
        # Summary
        print("\n" + "=" * 70)
        print("🏁 JOB MATCHING TEST SUMMARY")
        print("=" * 70)
        print(f"✅ Passed: {passed}")
        print(f"❌ Failed: {failed}")
        print(f"📊 Total: {passed + failed}")
        
        if failed == 0:
            print("\n🎉 ALL TESTS PASSED! Job matching for Carpenter trade is working correctly.")
            print("✅ Both trades_required array and trade_required string matching work")
            print("✅ Own jobs are correctly excluded")
        else:
            print(f"\n⚠️  {failed} test(s) failed. Please check the details above.")
        
        return failed == 0

def main():
    """Main test execution"""
    tester = JobMatchingTester()
    success = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()