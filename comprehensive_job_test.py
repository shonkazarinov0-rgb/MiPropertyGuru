#!/usr/bin/env python3
"""
Comprehensive Job Matching Test - Final Verification
Testing all scenarios mentioned in the review request:
1. Login as a contractor with "Carpenter" trade
2. Call GET /api/jobs/available with auth token  
3. Verify jobs requiring "Carpenter" are returned (both trades_required array AND trade_required string)
4. Verify jobs posted by same user are NOT returned
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "https://local-trades-12.preview.emergentagent.com/api"

class ComprehensiveJobMatchingTest:
    def __init__(self):
        self.carpenter_token = None
        self.carpenter_user_id = None
        self.client_token = None
        self.client_user_id = None
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
    
    def test_carpenter_login(self):
        """Test 1: Login as a contractor with 'Carpenter' trade"""
        print("\n=== Test 1: Login as Carpenter Contractor ===")
        
        data = {
            "email": "carlos.rodriguez@demo.com",
            "password": "demo123"
        }
        
        response, error = self.make_request("POST", "/auth/login", data)
        
        if error:
            self.log_result("Carpenter Login", False, f"Login failed: {error}")
            return False
        
        if "token" not in response or "user" not in response:
            self.log_result("Carpenter Login", False, "Missing token or user in response")
            return False
        
        user = response["user"]
        user_trades = user.get("trades", [])
        
        if "Carpenter" not in user_trades:
            self.log_result("Carpenter Login", False, f"User does not have Carpenter trade. Trades: {user_trades}")
            return False
        
        self.carpenter_token = response["token"]
        self.carpenter_user_id = user["id"]
        
        self.log_result("Carpenter Login", True, f"Successfully logged in as Carpenter: {user.get('name', 'Unknown')}")
        print(f"   User ID: {self.carpenter_user_id}")
        print(f"   Trades: {user_trades}")
        print(f"   Contractor Type: {user.get('contractor_type', 'None')}")
        return True
    
    def test_client_login_and_post_jobs(self):
        """Setup: Login as client and post test jobs"""
        print("\n=== Setup: Client Login and Job Posting ===")
        
        # Client login
        data = {"email": "client@demo.com", "password": "demo123"}
        response, error = self.make_request("POST", "/auth/login", data)
        
        if error:
            self.log_result("Client Setup", False, f"Client login failed: {error}")
            return False
        
        self.client_token = response["token"]
        self.client_user_id = response["user"]["id"]
        
        # Post test jobs as specified in review request
        test_jobs = [
            {
                "title": "Cabinet Installation - trades_required array with Carpenter",
                "trade_required": "General Contractor",
                "trades_required": ["Carpenter", "Handyman"],
                "description": "Install kitchen cabinets",
                "location": "Toronto, ON",
                "budget": "$2000"
            },
            {
                "title": "Home Renovation - trades_required array with multiple including Carpenter", 
                "trade_required": "General Contractor",
                "trades_required": ["Carpenter", "Plumber", "Electrician"],
                "description": "Complete home renovation",
                "location": "Toronto, ON",
                "budget": "$15000"
            },
            {
                "title": "Custom Furniture - trade_required string Carpenter",
                "trade_required": "Carpenter",
                "trades_required": [],
                "description": "Build custom furniture",
                "location": "Toronto, ON", 
                "budget": "$1500"
            },
            {
                "title": "Plumbing Only - should NOT match Carpenter",
                "trade_required": "Plumber",
                "trades_required": ["Plumber"],
                "description": "Fix plumbing issues",
                "location": "Toronto, ON",
                "budget": "$500"
            }
        ]
        
        posted_count = 0
        for job_data in test_jobs:
            response, error = self.make_request("POST", "/jobs/post", job_data, self.client_token)
            if not error and "job" in response:
                posted_count += 1
                print(f"   ✅ Posted: {job_data['title']}")
        
        if posted_count == len(test_jobs):
            self.log_result("Client Setup", True, f"Successfully posted {posted_count} test jobs")
            return True
        else:
            self.log_result("Client Setup", False, f"Only posted {posted_count}/{len(test_jobs)} jobs")
            return False
    
    def test_carpenter_post_own_job(self):
        """Post a job as the carpenter to test exclusion"""
        print("\n=== Setup: Carpenter Posts Own Job ===")
        
        job_data = {
            "title": "Carpenter's Own Job - Should NOT appear in available jobs",
            "trade_required": "Carpenter", 
            "trades_required": ["Carpenter"],
            "description": "This job posted by carpenter should not appear in their available jobs",
            "location": "Toronto, ON",
            "budget": "$1000"
        }
        
        response, error = self.make_request("POST", "/jobs/post", job_data, self.carpenter_token)
        
        if error:
            self.log_result("Carpenter Own Job", False, f"Failed to post own job: {error}")
            return False
        
        self.log_result("Carpenter Own Job", True, "Carpenter posted own job for exclusion testing")
        return True
    
    def test_available_jobs_api(self):
        """Test 2: Call GET /api/jobs/available with auth token"""
        print("\n=== Test 2: GET /api/jobs/available with Auth Token ===")
        
        if not self.carpenter_token:
            self.log_result("Available Jobs API", False, "No carpenter token available")
            return False
        
        response, error = self.make_request("GET", "/jobs/available", token=self.carpenter_token)
        
        if error:
            self.log_result("Available Jobs API", False, f"API call failed: {error}")
            return False
        
        if "jobs" not in response:
            self.log_result("Available Jobs API", False, "Missing 'jobs' field in response")
            return False
        
        jobs = response["jobs"]
        self.log_result("Available Jobs API", True, f"Successfully retrieved {len(jobs)} available jobs")
        return jobs
    
    def test_carpenter_job_matching(self, available_jobs):
        """Test 3 & 4: Verify job matching logic"""
        print("\n=== Test 3 & 4: Verify Job Matching Logic ===")
        
        # Expected matches based on review request
        expected_matches = [
            "trades_required: ['Carpenter', 'Handyman']",
            "trades_required: ['Carpenter', 'Plumber', 'Electrician']", 
            "trade_required: 'Carpenter'"
        ]
        
        # Find our test jobs
        cabinet_job = None
        renovation_job = None
        furniture_job = None
        plumbing_job = None
        own_job = None
        
        for job in available_jobs:
            title = job.get("title", "")
            if "Cabinet Installation" in title:
                cabinet_job = job
            elif "Home Renovation" in title:
                renovation_job = job
            elif "Custom Furniture" in title:
                furniture_job = job
            elif "Plumbing Only" in title:
                plumbing_job = job
            elif "Carpenter's Own Job" in title:
                own_job = job
        
        # Test results
        results = []
        
        # Test 1: trades_required array with Carpenter + Handyman
        if cabinet_job:
            results.append(("✅", "trades_required: ['Carpenter', 'Handyman'] - FOUND"))
            print(f"   ✅ Found: {cabinet_job['title']}")
            print(f"      trades_required: {cabinet_job.get('trades_required', [])}")
        else:
            results.append(("❌", "trades_required: ['Carpenter', 'Handyman'] - MISSING"))
        
        # Test 2: trades_required array with multiple trades including Carpenter
        if renovation_job:
            results.append(("✅", "trades_required: ['Carpenter', 'Plumber', 'Electrician'] - FOUND"))
            print(f"   ✅ Found: {renovation_job['title']}")
            print(f"      trades_required: {renovation_job.get('trades_required', [])}")
        else:
            results.append(("❌", "trades_required: ['Carpenter', 'Plumber', 'Electrician'] - MISSING"))
        
        # Test 3: trade_required string = Carpenter
        if furniture_job:
            results.append(("✅", "trade_required: 'Carpenter' - FOUND"))
            print(f"   ✅ Found: {furniture_job['title']}")
            print(f"      trade_required: '{furniture_job.get('trade_required', '')}'")
        else:
            results.append(("❌", "trade_required: 'Carpenter' - MISSING"))
        
        # Test 4: Jobs NOT requiring Carpenter should NOT appear
        if plumbing_job:
            results.append(("❌", "Plumber-only job incorrectly included"))
            print(f"   ❌ Incorrectly found: {plumbing_job['title']}")
        else:
            results.append(("✅", "Plumber-only job correctly excluded"))
            print(f"   ✅ Plumber-only job correctly excluded")
        
        # Test 5: Own jobs should NOT appear
        if own_job:
            results.append(("❌", "Own job incorrectly included"))
            print(f"   ❌ Own job incorrectly found: {own_job['title']}")
        else:
            results.append(("✅", "Own job correctly excluded"))
            print(f"   ✅ Own job correctly excluded")
        
        # Summary
        passed = len([r for r in results if r[0] == "✅"])
        total = len(results)
        
        success = passed == total
        self.log_result("Job Matching Logic", success, f"Job matching verification: {passed}/{total} tests passed")
        
        print(f"\n   📊 Detailed Results:")
        for status, message in results:
            print(f"      {status} {message}")
        
        return success
    
    def run_comprehensive_test(self):
        """Run all tests as specified in review request"""
        print("🚀 Starting Comprehensive Job Matching Test")
        print("Testing scenarios from review request:")
        print("1. Login as contractor with 'Carpenter' trade")
        print("2. Call GET /api/jobs/available with auth token")
        print("3. Verify jobs requiring 'Carpenter' are returned")
        print("4. Verify jobs posted by same user are NOT returned")
        print("=" * 80)
        
        tests_passed = 0
        tests_total = 0
        
        # Test 1: Login as Carpenter
        tests_total += 1
        if self.test_carpenter_login():
            tests_passed += 1
        else:
            print("\n❌ Critical test failed. Stopping execution.")
            return False
        
        # Setup: Client posts test jobs
        tests_total += 1
        if self.test_client_login_and_post_jobs():
            tests_passed += 1
        else:
            print("\n❌ Setup failed. Stopping execution.")
            return False
        
        # Setup: Carpenter posts own job
        tests_total += 1
        if self.test_carpenter_post_own_job():
            tests_passed += 1
        
        # Test 2: Call available jobs API
        tests_total += 1
        available_jobs = self.test_available_jobs_api()
        if available_jobs is not False:
            tests_passed += 1
        else:
            print("\n❌ API test failed. Stopping execution.")
            return False
        
        # Test 3 & 4: Verify matching logic
        tests_total += 1
        if self.test_carpenter_job_matching(available_jobs):
            tests_passed += 1
        
        # Final summary
        print("\n" + "=" * 80)
        print("🏁 COMPREHENSIVE TEST SUMMARY")
        print("=" * 80)
        print(f"✅ Passed: {tests_passed}")
        print(f"❌ Failed: {tests_total - tests_passed}")
        print(f"📊 Total: {tests_total}")
        
        if tests_passed == tests_total:
            print("\n🎉 ALL TESTS PASSED!")
            print("✅ Job matching API bug fix is working correctly")
            print("✅ Contractors can see jobs matching their trades")
            print("✅ Both trades_required array and trade_required string matching work")
            print("✅ Own jobs are correctly excluded")
            print("✅ Non-matching jobs are correctly excluded")
        else:
            print(f"\n⚠️  {tests_total - tests_passed} test(s) failed.")
            print("❌ Job matching API needs further investigation")
        
        return tests_passed == tests_total

def main():
    """Main test execution"""
    tester = ComprehensiveJobMatchingTest()
    success = tester.run_comprehensive_test()
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()