# 🛡️ Automated Security Testing Framework

**Enterprise-grade OWASP security testing automation for JIRA 10.3 upgrade validation**

## 🌟 **What Makes This Framework Amazing**

✅ **Complete OWASP TOP 10 Coverage** - Automated vulnerability scanning  
✅ **CI/CD Integration** - GitHub Actions, Docker, and custom pipelines  
✅ **Multi-Environment Support** - UAT, Staging, Production configurations  
✅ **Intelligent Session Management** - Manual + automated authentication  
✅ **Comprehensive Reporting** - JSON, HTML, Markdown, JUnit formats  
✅ **Real-time Notifications** - Slack, Email, GitHub status updates  
✅ **Performance Monitoring** - Built-in performance tracking  
✅ **Security Gates** - Fail pipelines on threshold violations  

---

## 🚀 **Quick Start**

### **1. Installation**
```bash
# Clone and setup
git clone <repository-url>
cd aoma-mesh-mcp
npm run setup

# Install globally for CLI access
npm install -g task-master-ai
```

### **2. Basic Usage**
```bash
# Run security tests in UAT
npm run security:test:uat

# Capture authentication session manually
npm run security:capture-session

# Run specific test suites
npm run security:scan:vulnerability
npm run security:scan:access-control
npm run security:scan:authentication
```

### **3. View Results**
```bash
# Open reports directory
npm run security:reports

# Latest results are in:
# - reports/security/ (HTML, JSON, Markdown)
# - Screenshots and artifacts
```

---

## 🏗️ **Architecture Overview**

```
🎯 AutomatedSecurityTestFramework
├── 🔐 Authentication Layer (Session Management)
├── 🧪 Test Orchestration (OWASP Suites)
├── 📊 Reporting Engine (Multi-format)
├── 🚨 Notification System (Slack, GitHub)
├── ⚖️ Security Gates (Threshold Enforcement)
└── 🔄 CI/CD Integration (GitHub Actions)
```

### **Core Components**

1. **`automated-security-test-framework.ts`** - Main orchestration engine
2. **`owasp-vulnerability-scanner.ts`** - OWASP TOP 10 vulnerability detection
3. **`manual-access-control-validator.ts`** - Access control validation
4. **`manual-authentication-validator.ts`** - Authentication security testing
5. **`manual-login-session-capture.ts`** - Session capture utility

---

## 🛠️ **Configuration**

### **Environment-Specific Configs**

```typescript
// UAT Configuration
const uatConfig = {
  environment: 'uat',
  baseUrl: 'https://jirauat.smedigitalapps.com/jira',
  authenticationMethod: 'session',
  testSuites: ['vulnerability_scan', 'access_control', 'authentication'],
  reportFormats: ['json', 'html', 'markdown'],
  securityThresholds: {
    critical: 0,    // No critical vulnerabilities allowed
    high: 3,        // Max 3 high-severity issues
    medium: 10      // Max 10 medium-severity issues
  }
}
```

### **Environment Variables**

```bash
# Required
SECURITY_TEST_ENV=uat              # Target environment
JIRA_UAT_URL=https://jirauat.smedigitalapps.com/jira

# Optional - Notifications
SLACK_WEBHOOK=https://hooks.slack.com/...
GITHUB_TOKEN=ghp_xxxxxxxxxxxx
EMAIL_USERNAME=security@company.com
EMAIL_PASSWORD=app_password_here

# Optional - Debugging
DEBUG=true
NODE_ENV=development
```

---

## 🎯 **Test Suites**

### **1. Vulnerability Scanning (`vulnerability_scan`)**
- **OWASP TOP 10 (2021)** automated detection
- **Session cookie security** analysis
- **Input validation** testing (XSS, SQL injection)
- **Security headers** validation
- **Access control bypass** detection

### **2. Access Control Testing (`access_control`)**
- **Administrative URL** access validation
- **Role-based access** enforcement
- **Direct object reference** testing
- **Privilege escalation** detection
- **Evidence capture** with screenshots

### **3. Authentication Testing (`authentication`)**
- **Microsoft SSO** integration validation
- **Session timeout** enforcement
- **Cookie security** analysis
- **Multi-factor authentication** flow
- **Password policy** enforcement

### **4. Full Security Suite (`full_security`)**
- **All test suites** in sequence
- **Comprehensive reporting**
- **Cross-test correlation**
- **Risk assessment** summary

---

## 📊 **Reporting Features**

### **Multi-Format Reports**
- **📄 HTML Reports** - Interactive dashboards with charts
- **📋 JSON Reports** - Machine-readable for integrations
- **📝 Markdown Reports** - Human-readable for documentation
- **🧪 JUnit XML** - CI/CD test result integration

### **Report Contents**
- **Executive Summary** - High-level security posture
- **Detailed Findings** - Vulnerability descriptions and evidence
- **OWASP Compliance** - Mapping to OWASP TOP 10 categories
- **Risk Assessment** - Prioritized remediation recommendations
- **Performance Metrics** - Test execution times and trends

### **Sample Report Structure**
```
📁 reports/security/
├── security-pipeline-2024-01-15.html     # Interactive dashboard
├── security-pipeline-2024-01-15.json     # Raw data
├── security-pipeline-2024-01-15.md       # Documentation
├── security-pipeline-2024-01-15.xml      # JUnit results
└── screenshots/                          # Evidence artifacts
    ├── vulnerability-evidence-*.png
    └── access-control-test-*.png
```

---

## 🚀 **CI/CD Integration**

### **GitHub Actions Integration**

The framework includes a complete **GitHub Actions workflow** (`.github/workflows/security-testing.yml`):

```yaml
# Automated triggers
on:
  push: [main, develop, staging]     # Every push
  pull_request: [main]               # Every PR
  schedule: '0 2 * * *'              # Daily at 2 AM
  workflow_dispatch: {}              # Manual trigger
```

**Workflow Features:**
- ✅ **Multi-environment** testing (UAT, Staging, Production)
- ✅ **Parallel execution** for faster results
- ✅ **Artifact upload** for persistent reports
- ✅ **PR comments** with security results
- ✅ **Slack notifications** on failures
- ✅ **Security gates** that fail pipelines
- ✅ **Email reports** for daily summaries

### **Other CI/CD Systems**

```bash
# Jenkins Pipeline
pipeline {
  stage('Security Testing') {
    steps {
      sh 'npm run security:test:staging'
      publishHTML([allowMissing: false, 
                   reportDir: 'reports/security', 
                   reportFiles: '*.html'])
    }
  }
}

# GitLab CI
security_testing:
  stage: test
  script:
    - npm run security:test:uat
  artifacts:
    reports:
      junit: reports/security/*.xml
    paths:
      - reports/security/
```

---

## 🐳 **Docker Deployment**

### **Quick Docker Run**
```bash
# Build and run
docker build -f Dockerfile.security-testing -t security-testing .
docker run -e SECURITY_TEST_ENV=uat security-testing

# Using Docker Compose
docker-compose -f docker-compose.security.yml up
```

### **Production Deployment**
```bash
# With persistent volumes and monitoring
docker-compose -f docker-compose.security.yml up -d

# View reports at http://localhost:8080
# Monitor metrics at http://localhost:9090
```

---

## 🔧 **Advanced Usage**

### **Custom Test Configurations**

```typescript
// Create custom configuration
const customConfig: SecurityTestConfig = {
  environment: 'staging',
  baseUrl: 'https://staging.example.com',
  testSuites: ['vulnerability_scan', 'custom_tests'],
  securityThresholds: { critical: 0, high: 1, medium: 3 },
  reportFormats: ['json', 'slack'],
  slackWebhook: process.env.SLACK_WEBHOOK
};

// Run with custom config
const framework = new AutomatedSecurityTestFramework(customConfig);
await framework.runSecurityPipeline();
```

### **Session Management**

```bash
# Capture new session manually
npm run security:capture-session

# Use existing session (framework auto-detects latest)
npm run security:test:uat

# Debug session issues
DEBUG=true npm run security:capture-session
```

### **Selective Test Execution**

```bash
# Environment variable method
SECURITY_TEST_SUITES=vulnerability_scan,access_control npm run security:test

# Direct script execution
npx tsx automated-security-test-framework.ts
```

---

## 📈 **Performance & Monitoring**

### **Built-in Performance Tracking**
- **Test execution times** - Track performance trends
- **Memory usage** - Monitor resource consumption
- **Success rates** - Track reliability metrics
- **Vulnerability trends** - Historical security posture

### **Integration with Monitoring Tools**
```typescript
// DataDog integration example
const performanceData = {
  'security.test.duration': framework.getTotalDuration(),
  'security.vulnerabilities.critical': results.criticalCount,
  'security.test.success': results.success ? 1 : 0
};
```

---

## 🛡️ **Security Best Practices**

### **Framework Security**
✅ **Containerized execution** - Isolated test environment  
✅ **Non-root containers** - Security-hardened Docker images  
✅ **Encrypted session storage** - Secure credential handling  
✅ **Audit logging** - Complete test activity logs  
✅ **Access control** - Role-based framework permissions  

### **Test Data Security**
✅ **UAT environment** - No production data exposure  
✅ **Session rotation** - Regular authentication refresh  
✅ **Evidence redaction** - Sensitive data protection  
✅ **Compliance reporting** - SOC2, PCI, GDPR alignment  

---

## 🚨 **Troubleshooting**

### **Common Issues**

**❌ Authentication Failures**
```bash
# Solution: Recapture session
npm run security:capture-session
```

**❌ Browser Launch Errors**
```bash
# Solution: Install Playwright browsers
npm run playwright:install
```

**❌ High Memory Usage**
```bash
# Solution: Limit parallel tests
PLAYWRIGHT_WORKERS=1 npm run security:test
```

**❌ Network Timeouts**
```bash
# Solution: Increase timeout
PLAYWRIGHT_TIMEOUT=60000 npm run security:test
```

### **Debug Mode**
```bash
# Enable verbose logging
DEBUG=true npm run security:test:uat

# Headed browser for debugging
HEADED=true npm run security:capture-session
```

---

## 🎯 **Framework Extension**

### **Adding Custom Test Suites**

```typescript
// Extend the framework
class CustomSecurityTester extends AutomatedSecurityTestFramework {
  async runCustomTestSuite(): Promise<SecurityTestResult> {
    // Your custom security tests here
    return {
      testSuite: 'custom_suite',
      testType: 'custom',
      passed: true,
      // ... other properties
    };
  }
}
```

### **Custom Reporting**

```typescript
// Add custom report format
private generatePDFReport(): string {
  // Generate PDF report
  return '/path/to/custom-report.pdf';
}
```

---

## 📞 **Support & Contributing**

### **Getting Help**
- 📧 **Email**: security-testing@company.com
- 💬 **Slack**: #security-automation
- 🐛 **Issues**: [GitHub Issues](https://github.com/your-org/aoma-mesh-mcp/issues)

### **Contributing**
1. **Fork** the repository
2. **Create** feature branch: `git checkout -b feature/amazing-security-test`
3. **Commit** changes: `git commit -m 'Add amazing security test'`
4. **Push** branch: `git push origin feature/amazing-security-test`
5. **Create** Pull Request

---

## 📋 **Changelog**

### **v1.0.0** - Initial Release
- ✅ OWASP TOP 10 automated scanning
- ✅ Multi-environment support
- ✅ CI/CD integration
- ✅ Comprehensive reporting
- ✅ Docker containerization

### **Roadmap**
- 🔄 **v1.1.0** - ZAP integration
- 🔄 **v1.2.0** - API security testing
- 🔄 **v1.3.0** - ML-powered vulnerability detection

---

## 📄 **License**

MIT License - see [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by the Security Testing Team**  
*Making security testing automation fun and effective!* 🚀🛡️ 