# Manual MCP Server Testing Checklist

## 🎯 **Complete MCP Server Testing Guide**

### **Phase 1: Setup & Build**
- [ ] Build MCP server: `pnpm mcp:build`
- [ ] Verify environment variables are loaded
- [ ] Check all dependencies are installed

### **Phase 2: Claude Desktop Integration** 
- [ ] Copy `claude-desktop-config.json` to Claude Desktop config location
- [ ] Restart Claude Desktop
- [ ] Verify MCP server appears in Claude Desktop
- [ ] Test basic connection

**Claude Desktop Config Location:**
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

### **Phase 3: Core Functionality Tests**

#### **Agent Management (6 tools)**
- [ ] `create_coordinator_agent` - Create a test agent
- [ ] `list_active_agents` - Verify agent appears in list
- [ ] `get_agent_status` - Check agent status
- [ ] `get_agent_events` - View agent events
- [ ] `submit_agent_feedback` - Provide feedback to agent
- [ ] `terminate_agent` - Clean up test agent

#### **Jira Integration (Critical)**
- [ ] `query_jira_tickets` with "digital exchange" - Should find ~3-5 tickets
- [ ] `query_jira_tickets` with "authentication" - Should find relevant tickets
- [ ] `query_jira_tickets` with "access" - Should find user access requests
- [ ] Verify ticket details include: key, summary, metadata
- [ ] Test different search terms and filters

#### **Development Tools**
- [ ] `analyze_code_quality` - Test on a TypeScript file
- [ ] `analyze_architecture` - Test on project root
- [ ] `suggest_refactoring` - Test on a complex file
- [ ] `search_codebase` - Search for specific patterns
- [ ] `generate_documentation` - Generate docs for a component
- [ ] `analyze_dependencies` - Check package.json security

#### **Git Integration**
- [ ] `analyze_git_repository` - Test repository analysis
- [ ] Verify Git agent can read repository structure
- [ ] Test code search functionality

#### **Test Generation**
- [ ] `generate_test_plan` - Create test plan for a feature
- [ ] Verify test plan includes multiple test types
- [ ] Check if generated tests are relevant and comprehensive

#### **Diagram Creation**
- [ ] `create_diagram` - Generate a flowchart
- [ ] `create_diagram` - Generate architecture diagram
- [ ] Verify diagrams are created via OpenAI DALL-E

### **Phase 4: Advanced Testing**

#### **Multi-Agent Workflows**
- [ ] Create coordinator agent with complex task
- [ ] Have agent use multiple sub-tools
- [ ] Test agent collaboration and consensus
- [ ] Verify human-in-the-loop feedback works

#### **Error Handling**
- [ ] Test with invalid parameters
- [ ] Test with missing required fields
- [ ] Test with non-existent agent IDs
- [ ] Verify graceful error messages

#### **Performance Testing**
- [ ] Test concurrent tool calls
- [ ] Measure response times for each tool
- [ ] Test with large datasets (if applicable)
- [ ] Monitor memory usage during operation

### **Phase 5: Real-World Scenarios**

#### **Development Workflow Test**
1. [ ] Search Jira for authentication issues
2. [ ] Analyze related code files
3. [ ] Generate test plan based on findings
4. [ ] Create architecture diagram
5. [ ] Get refactoring suggestions

#### **Documentation Generation Test**
1. [ ] Analyze project architecture
2. [ ] Generate component documentation
3. [ ] Create system diagrams
4. [ ] Search codebase for patterns

#### **Quality Assurance Test**
1. [ ] Run code quality analysis on multiple files
2. [ ] Check dependency security
3. [ ] Generate comprehensive test plans
4. [ ] Review suggested refactoring

### **Phase 6: Integration Testing**

#### **Claude Desktop Conversation Test**
Test these sample prompts in Claude Desktop:

```
1. "Search our Jira tickets for any issues related to digital exchange access"

2. "Analyze the architecture of our Next.js project and create a diagram"

3. "Find authentication-related code in our codebase and suggest improvements"

4. "Create a comprehensive test plan for our Jira integration feature"

5. "Generate documentation for our MCP server implementation"
```

#### **Multi-Step Workflow Test**
```
"I need to investigate authentication issues:
1. Search Jira for authentication problems
2. Analyze our auth code for quality issues  
3. Generate a test plan to validate the fixes
4. Create a diagram showing the auth flow"
```

### **Phase 7: Validation Checklist**

#### **Success Criteria**
- [ ] ✅ All 18 MCP tools respond without errors
- [ ] ✅ Jira search returns relevant results from 6000+ records
- [ ] ✅ Agent creation and management works smoothly
- [ ] ✅ Code analysis provides meaningful insights
- [ ] ✅ Documentation generation produces useful output
- [ ] ✅ Error handling is graceful and informative
- [ ] ✅ Response times are reasonable (<30s for complex operations)
- [ ] ✅ Claude Desktop integration is seamless

#### **Quality Indicators**
- [ ] Search results are relevant and accurate
- [ ] Generated content is helpful and actionable
- [ ] Error messages are clear and helpful
- [ ] Tool responses include proper context
- [ ] Multi-agent coordination works effectively

### **Phase 8: Production Readiness**

#### **Final Checks**
- [ ] All environment variables properly configured
- [ ] API keys have appropriate permissions
- [ ] Error logging is comprehensive
- [ ] Performance is acceptable for daily use
- [ ] Security considerations addressed
- [ ] Documentation is complete and accurate

#### **Deployment Verification**
- [ ] MCP server starts reliably
- [ ] All external dependencies are accessible
- [ ] Resource usage is reasonable
- [ ] Backup and recovery procedures tested

---

## 🎯 **Quick Test Commands**

### **Automated Test Suite**
```bash
cd mcp-server
npx tsx comprehensive-mcp-test.ts
```

### **Individual Tool Tests**
```bash
# Test Jira search
npx tsx -e "/* Jira search test code */"

# Test agent creation
npx tsx -e "/* Agent creation test code */"
```

### **Claude Desktop Setup**
1. Copy config: `cp claude-desktop-config.json ~/Library/Application\ Support/Claude/claude_desktop_config.json`
2. Restart Claude Desktop
3. Test with sample prompts

---

## 📊 **Expected Results**

### **Jira Search Results**
- "digital exchange" → 3-5 tickets about Digital Exchange access
- "authentication" → Multiple auth-related tickets
- "access" → User access request tickets

### **Performance Benchmarks**
- Simple queries: <5 seconds
- Complex analysis: <30 seconds  
- Agent creation: <10 seconds
- Jira search: <15 seconds

### **Quality Metrics**
- Tool success rate: >90%
- Error handling: 100% graceful
- Response relevance: >80%
- Documentation usefulness: High