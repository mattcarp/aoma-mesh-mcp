# 🏗️ Project Structure: Un-Fucking the Meta-Confusion

## 🤯 **THE PROBLEM WE SOLVED**
We had dangerous meta-confusion between:
- Testing **AOMA** (the app) vs Testing **JIRA** (the platform)
- Which environment to use for which purpose
- Hundreds of files with mixed/wrong URLs

## 🎯 **THE SOLUTION: COMPLETE SEPARATION**

```
/aoma-mesh-mcp/
├── aoma-testing/              # 🤖 Tests AOMA app functionality
│   ├── README.md              # Purpose: Test AOMA app
│   ├── tests/                 # AOMA functionality tests
│   ├── data-extraction/       # AOMA data gathering tests
│   ├── knowledge-analysis/    # AOMA intelligence tests
│   └── mcp-server-tests/      # MCP server functionality
│   
└── jira-uat-testing/          # 🎫 Tests JIRA platform upgrade
    ├── README.md              # Purpose: Test JIRA upgrade
    ├── tests/                 # JIRA functionality tests
    ├── manual-tests/          # Human-readable test scripts
    ├── screenshots/           # Test evidence
    └── performance-reports/   # JIRA performance data
```

## 🌐 **ENVIRONMENT MAPPING**

### 🤖 **AOMA Testing**
- **Purpose**: Test if AOMA app works
- **AOMA Version**: UAT (the app being tested)
- **Data Source**: **Production JIRA** (`jira.smedigitalapps.com`)
- **Logic**: AOMA-UAT → reads from → JIRA-PROD
- **Activities**: Read-only data extraction, analysis, knowledge gathering

### 🎫 **JIRA UAT Testing**  
- **Purpose**: Test if JIRA upgrade works
- **JIRA Version**: UAT (`jirauat.smedigitalapps.com`)
- **Data Source**: UAT JIRA (same as target)
- **Logic**: Test Scripts → test → JIRA-UAT
- **Activities**: Ticket creation, navigation, workflows, performance

## ✅ **CORRECT URL USAGE**

| Project | Correct URL | Wrong URL | Why |
|---------|-------------|-----------|-----|
| `aoma-testing/` | `jira.smedigitalapps.com` | `jirauat.smedigitalapps.com` | AOMA needs real business data |
| `jira-uat-testing/` | `jirauat.smedigitalapps.com` | `jira.smedigitalapps.com` | Testing JIRA upgrade safely |

## 🚨 **SAFETY BENEFITS**
- **Impossible to mix up**: Each project has single, clear purpose
- **No URL confusion**: Each project uses only one environment
- **Prevents accidents**: Can't accidentally test wrong thing
- **Clear documentation**: Each README explains its purpose
- **Separate dependencies**: No shared configuration conflicts

## 🎪 **MIGRATION STRATEGY**
1. ✅ Created separate directories
2. ✅ Moved JIRA UAT files to `jira-uat-testing/`
3. ✅ Created clear README files
4. 🔄 **Next**: Move AOMA-related files to `aoma-testing/`
5. 🔄 **Next**: Update all URLs within each project
6. 🔄 **Next**: Update task management to reflect separation

## 🧠 **MENTAL MODEL**
- **AOMA Testing**: "Does our app work with real JIRA data?"
- **JIRA UAT Testing**: "Does the JIRA upgrade work for users?"

**Never the twain shall meet!** 🎭
