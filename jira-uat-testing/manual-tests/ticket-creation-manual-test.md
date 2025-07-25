# 🎫 JIRA Ticket Creation - Manual Test Script

## 🎯 **TEST OBJECTIVE**
Verify that users can create tickets in JIRA after the upgrade - **THIS IS CRITICAL FUNCTIONALITY**

## ⚠️ **IMPORTANCE LEVEL: CRITICAL** 
If this test fails, users cannot perform their primary job function. This would be a **SHOW-STOPPER** issue.

---

## 📋 **PRE-TEST CHECKLIST**
- [ ] You have access to JIRA UAT environment (can log in)
- [ ] You have the JIRA UAT URL: **https://jirauat.smedigitalapps.com** (UAT environment - NOT production!)
- [ ] You have permission to create tickets in the **ITSM project** (this is critical!)
- [ ] You can access the ITSM project (ask admin if you can't see it)
- [ ] Browser is ready (Chrome, Firefox, Safari, or Edge)

---

## 🚀 **TEST STEPS**

### **Step 1: Access JIRA UAT Dashboard**
1. Open your web browser
2. Go to the JIRA UAT URL: **https://jirauat.smedigitalapps.com** (UAT environment)
3. Log in with your UAT credentials (may be different from production!)
4. **✅ EXPECTED:** You should see the JIRA UAT dashboard
5. **❌ IF FAILED:** Contact IT immediately - authentication issue or wrong URL

### **Step 2: Find the Create Button**
1. Look for a **"Create"** button on the screen
   - Usually in the top navigation bar
   - Might be blue or prominent color
   - Could say "Create Issue" or just "Create"
2. **✅ EXPECTED:** You can see a Create button
3. **❌ IF FAILED:** This is a CRITICAL issue - report immediately

### **Step 3: Click Create Button**
1. Click the **Create** button
2. Wait for the page to load (should be quick)
3. **✅ EXPECTED:** A form opens for creating a new ticket
4. **❌ IF FAILED:** Note any error messages and report immediately

### **Step 4: Fill Out Basic Ticket Information**
1. **Project:** Select **"ITSM"** (this is the specific project we're testing - CRITICAL!)
2. **Issue Type:** Choose "Task" or "Bug" (whatever is available)
3. **Summary:** Type: "UAT Test - Manual Ticket Creation Test"
4. **Description:** Type: "This is a test ticket created during UAT to verify ticket creation works after JIRA upgrade in the ITSM project."
5. **✅ EXPECTED:** You can fill in all required fields without errors
6. **❌ IF FAILED:** Note which fields cause problems

### **Step 5: Check Required Fields**
1. Look for any fields marked with red asterisks (*) - these are required
2. Make sure all required fields are filled
3. **✅ EXPECTED:** All required fields can be completed
4. **❌ IF FAILED:** Note which required fields are problematic

### **Step 6: Attempt to Create the Ticket**
1. Look for a **"Create"** or **"Submit"** button at the bottom of the form
2. Click the button
3. **✅ EXPECTED:** Ticket is created successfully and you see a confirmation
4. **❌ IF FAILED:** This is CRITICAL - note the exact error message

---

## 📊 **RESULTS TRACKING**

### **Test Result:** 
- [ ] ✅ **PASS** - Ticket created successfully
- [ ] ❌ **FAIL** - Could not create ticket

### **If FAILED, what went wrong?**
- [ ] Could not access JIRA dashboard
- [ ] Could not find Create button
- [ ] Create button didn't work (error/404)
- [ ] Form had missing or broken fields
- [ ] Could not submit the ticket
- [ ] Other: ________________

### **Error Details (if any):**
```
Write any error messages you saw here:


```

### **Screenshots (if possible):**
- Take a screenshot of any errors
- Take a screenshot of successful ticket creation

---

## 🚨 **ESCALATION CRITERIA**

**IMMEDIATELY ESCALATE IF:**
- Cannot find or click Create button
- Get 404 or "Not Found" errors
- Cannot submit ticket after filling form
- Any error that prevents ticket creation

**Contact:** [Your IT Team/Project Manager]
**Priority:** CRITICAL - this blocks daily work

---

## 📝 **ADDITIONAL NOTES**

**Tester Name:** ________________  
**Date/Time:** ________________  
**Browser Used:** ________________  
**JIRA Version:** ________________  

**Additional Comments:**
```


```

---

## 🎯 **SUCCESS CRITERIA**
- User can access JIRA dashboard ✅
- User can find and click Create button ✅  
- User can fill out ticket form ✅
- User can successfully submit ticket ✅
- Ticket appears in JIRA with correct information ✅

**If ALL criteria are met: TEST PASSES ✅**  
**If ANY criteria fails: TEST FAILS ❌ - ESCALATE IMMEDIATELY**
