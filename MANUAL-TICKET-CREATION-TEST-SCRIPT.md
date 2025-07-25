# JIRA 10.3 UAT Manual Ticket Creation Test Script

**Purpose:** Manually verify ticket creation functionality  
**Environment:** https://jirauat.smedigitalapps.com  
**Prerequisites:** VPN connection (Cisco Global Protect), valid UAT credentials  
**Estimated Time:** 10-15 minutes per attempt  

---

## Pre-Test Setup

### 1. Environment Check
- [ ] **Connect to VPN** (Cisco Global Protect)
- [ ] **Open browser** (Chrome/Edge recommended)
- [ ] **Clear browser cache** (optional but recommended)
- [ ] **Note start time**: ________________

### 2. Login Verification
- [ ] **Navigate to:** https://jirauat.smedigitalapps.com
- [ ] **Login with your UAT credentials**
- [ ] **Verify you see the dashboard** with your name in top right
- [ ] **Screenshot:** Take screenshot of successful login

---

## Test Case 1: Basic Ticket Creation

### Step 1: Navigate to Create Ticket
- [ ] **Click the "Create" button** (usually in top navigation)
- [ ] **Time how long it takes** for the create form to appear: _______ seconds
- [ ] **Screenshot:** Take screenshot of the create ticket form

### Step 2: Fill Required Fields
- [ ] **Project:** Select "ITSM" from dropdown
- [ ] **Issue Type:** Select "Task" or "Bug" (whatever's available)
- [ ] **Summary:** Enter "Manual Test Ticket - [Your Name] - [Current Date/Time]"
- [ ] **Description:** Enter "This is a manual test to verify ticket creation functionality."
- [ ] **Verify all required fields** are filled (look for red asterisks)

### Step 3: Submit the Ticket
- [ ] **Note submission start time**: ________________
- [ ] **Click "Create" button** to submit
- [ ] **Start timer** - watch for how long it takes
- [ ] **Watch browser status** (loading indicators, network activity)

### Step 4: Monitor for Success/Failure
**Wait and observe for up to 2 minutes:**

#### If Successful (ticket created):
- [ ] **New ticket appears** with ticket number (e.g., ITSM-12345)
- [ ] **Total time to create**: _______ seconds
- [ ] **Screenshot:** Take screenshot of successful ticket creation
- [ ] **Note ticket number**: ________________

#### If Failed (timeout/error):
- [ ] **Browser shows error** or loading spinner continues
- [ ] **Time when gave up waiting**: _______ seconds
- [ ] **Screenshot:** Take screenshot of error/timeout state
- [ ] **Note any error messages**: ________________

---

## Test Case 2: Different Project (if first attempt works)

### Repeat with DPSA Project
- [ ] **Click "Create" again**
- [ ] **Project:** Select "DPSA" instead of ITSM
- [ ] **Issue Type:** Select available type
- [ ] **Summary:** Enter "Manual Test Ticket 2 - [Your Name] - [Current Date/Time]"
- [ ] **Submit and time the process**
- [ ] **Document results**: ________________

---

## Test Case 3: Browser Developer Tools Analysis

### Open Developer Tools
- [ ] **Press F12** or right-click → "Inspect"
- [ ] **Go to "Network" tab**
- [ ] **Clear network log**
- [ ] **Start recording network activity**

### Attempt Ticket Creation with Monitoring
- [ ] **Fill out create form** again
- [ ] **Click Submit**
- [ ] **Watch Network tab** for failing requests
- [ ] **Look for red/failed requests** or requests taking >30 seconds
- [ ] **Screenshot:** Network tab showing any failed/slow requests

### Console Errors
- [ ] **Switch to "Console" tab** in developer tools
- [ ] **Look for red error messages** during submission
- [ ] **Note any JavaScript errors**: ________________

---

## Results Documentation

### Overall Assessment
**Ticket Creation Status:**
- [ ] ✅ **WORKING** - Tickets created successfully in reasonable time (<10 seconds)
- [ ] ⚠️ **SLOW** - Tickets created but taking >10 seconds
- [ ] ❌ **BROKEN** - Timeouts, errors, or no ticket creation after 60+ seconds

### Detailed Results
**Test 1 (ITSM):**
- **Time to form load:** _______ seconds
- **Time to submit:** _______ seconds
- **Success/Failure:** ________________
- **Ticket number (if created):** ________________

**Test 2 (DPSA):**
- **Time to form load:** _______ seconds
- **Time to submit:** _______ seconds
- **Success/Failure:** ________________
- **Ticket number (if created):** ________________

### Technical Details
**Network Issues Observed:**
- [ ] No issues - all requests completed quickly
- [ ] Slow requests (>5 seconds)
- [ ] Failed requests (red in network tab)
- [ ] Requests that never completed

**Browser Errors:**
- [ ] No JavaScript errors
- [ ] JavaScript errors present: ________________

**Performance:**
- [ ] Form loads quickly (<3 seconds)
- [ ] Form loads slowly (3-10 seconds)
- [ ] Form times out (>10 seconds)

---

## Next Steps Based on Results

### If Ticket Creation Works:
- **Our automated testing may have had environmental issues**
- **Compare your timing with our 60+ second timeout findings**
- **Document differences in approach or environment**

### If Ticket Creation Fails:
- **Confirms our automated testing findings**
- **Provides additional manual evidence**
- **Helps isolate if it's browser-specific or systemic**

### If Results Are Mixed:
- **May indicate intermittent issues**
- **Try different browsers or times of day**
- **Could be load-related or session-specific**

---

## Screenshots to Capture
1. **Successful login dashboard**
2. **Create ticket form loaded**
3. **Successful ticket creation (with ticket number)**
4. **Any error messages or timeout states**
5. **Browser developer tools showing network issues**

---

**Remember:** Take your time, document everything, and don't hesitate to try multiple times if you get mixed results. This manual verification is crucial for validating our automated testing findings! 🎯 