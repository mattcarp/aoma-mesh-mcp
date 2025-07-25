# 🚀 Quick Start - Jira Upgrade Testing

## 🎯 **Goal: Help Irina + Showcase AOMA-Mesh-MCP**

This testing framework validates **Jira 9.12 LTS → 10.3 LTS** upgrade while demonstrating our intelligent automation capabilities.

### **UAT Environment**: https://jirauat.smedigitalapps.com/

---

## ⚡ **1. Setup Credentials (Required)**

Add Jira UAT credentials to your `.env` file:

```bash
# Add to .env file:
JIRA_USERNAME=your-username
JIRA_PASSWORD=your-password

# OR use API token (more secure):
JIRA_USERNAME=your-username  
JIRA_API_TOKEN=your-api-token
```

**💡 Contact Irina for UAT environment access if needed**

---

## ⚡ **2. Detect Current Environment**

```bash
# Test credentials and detect Java version
node jira-upgrade-testing/scripts/setup-credentials.cjs

# Manual detection (if creds already setup)
node jira-upgrade-testing/scripts/detect-environment.cjs
```

**This will tell us:**
- ✅ Current Jira version  
- ✅ Current Java version (8, 11, or 17?)
- ✅ Platform details
- ✅ Upgrade risk assessment

---

## ⚡ **3. Run Tests**

```bash
# Critical platform validation
npm run jira:test:platform-validation

# ITSM workflow testing (Irina's focus)
npm run jira:test:itsm-comprehensive

# UI/UX enhancements  
npm run jira:test:ui-enhancements

# Run everything
npm run jira:test:all
```

---

## 📊 **4. Reports & Intelligence**

### **For Irina**
- 📄 **Executive summaries** in `reports/executive-summary-for-irina.md`
- 📊 **Daily reports** with business impact analysis
- 🎯 **Go/No-Go recommendations** based on testing results

### **For AOMA-Mesh-MCP Showcase**
- 🤖 **Intelligent test generation** from knowledge bases
- 📈 **ML-based performance analysis** and baselines  
- 🧠 **Adaptive scenario creation** based on risk assessment
- 💬 **Stakeholder-specific reporting** (technical vs executive)

---

## 🎪 **What This Demonstrates**

### **Business Value**
✅ **Genuine help for Irina's upgrade validation**  
✅ **Risk mitigation** through comprehensive testing  
✅ **Timeline efficiency** with automated scenarios  
✅ **Decision support** with data-driven insights  

### **Technical Excellence**
✅ **Knowledge-based test generation** from documentation  
✅ **Intelligent risk assessment** and prioritization  
✅ **Adaptive performance baselines** using ML  
✅ **Contextual automation** tailored to ITSM workflows  

---

## 🔧 **Troubleshooting**

### **Credentials Issues**
```bash
# Check current .env setup
node jira-upgrade-testing/scripts/setup-credentials.cjs

# Test specific URL  
curl -u username:password https://jirauat.smedigitalapps.com/rest/api/2/serverInfo
```

### **Connection Issues**
- ✅ Verify UAT environment is accessible
- ✅ Check VPN requirements
- ✅ Validate user permissions for API access

### **Java Detection Issues**
- ⚠️ Java version detection requires admin access to Jira
- 💡 Basic Jira version always works via `/rest/api/2/serverInfo`
- 📞 Ask Irina for admin access if detailed system info needed

---

## 📞 **Next Steps**

1. **Immediate**: Setup credentials and run environment detection
2. **Today**: Execute critical path testing (platform + ITSM)  
3. **This Week**: Generate comprehensive reports for Irina
4. **Ongoing**: Daily automated monitoring and intelligence

**Ready to showcase both business value AND technical innovation! 🎉** 