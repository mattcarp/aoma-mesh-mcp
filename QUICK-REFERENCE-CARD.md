# AOMA Mesh MCP Server - Quick Reference Card

**🎯 Version 2.0.0 | Production Ready | Print & Keep Handy**

---

## 🚀 Installation (One-Time Setup)

```bash
cd mc-tk/mcp-server
npm install && npm run build
```

## ⚡ Daily Commands

```bash
npm run health-check        # Check if everything is working
npm run dev                # Start in development mode  
npm run start              # Start production server
npm test                   # Run all tests
```

## 🔧 Environment Setup (Required)

```bash
# Add to .env.local in project root:
OPENAI_API_KEY=sk-your-key-here
AOMA_ASSISTANT_ID=your-assistant-id-here
NEXT_PUBLIC_SUPABASE_URL=https://kfxetwuuzljhybfgmpuc.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-key
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 🖥️ Client Setup

### Claude Desktop
```bash
cp configs/claude-desktop.json ~/.config/claude-desktop/claude_desktop_config.json
# Edit file to add your API keys, then restart Claude Desktop
```

### Windsurf  
```bash
cp configs/windsurf.json ~/.config/windsurf/mcp-servers.json
# Set environment variables, then restart Windsurf
```

### VS Code
```bash
cp configs/vscode-settings.json .vscode/settings.json
# Install MCP extension, then reload VS Code
```

## 🛠️ Main Tools (What You Can Ask For)

| Tool | What It Does | Example Query |
|------|--------------|---------------|
| **AOMA Knowledge** | Access 1000+ Enterprise docs | "How do I deploy AOMA to production?" |
| **Jira Search** | Find tickets with AI | "Show authentication bugs from last month" |
| **Context Analysis** | Analyze current code issue | "Help debug this API timeout error" |
| **Health Check** | Server status & metrics | "Is everything working properly?" |
| **Capabilities** | List all available features | "What can this server do?" |

## 🔍 Quick Diagnostics

```bash
# Is the server healthy?
npm run health-check

# Detailed diagnostics  
npm run health-check --detailed

# View real-time metrics
curl -s localhost:3001/metrics | jq

# Check specific service
curl -s localhost:3001/health | jq '.services.openai'
```

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| **"Environment validation failed"** | Check `.env.local` has all required vars |
| **"OpenAI API error"** | Verify `OPENAI_API_KEY` is correct |
| **"Supabase connection failed"** | Check Supabase URL and keys |
| **"Build failed"** | Run `npm run clean && npm run build` |
| **"Tests failing"** | Check environment setup first |

## 📊 Health Status

| Symbol | Meaning | Action |
|--------|---------|--------|
| 🟢 **healthy** | All good | None needed |
| 🟡 **degraded** | Some issues | Monitor closely |
| 🔴 **unhealthy** | Critical problems | Fix immediately |

## 🎯 Success Checklist

- [ ] `npm run health-check` shows 🟢 healthy
- [ ] Can query AOMA knowledge
- [ ] Can search Jira tickets  
- [ ] Client connects (Claude Desktop/Windsurf/etc.)
- [ ] Response times under 3 seconds

## 📞 Getting Help

1. **Check Health**: `npm run health-check --detailed`
2. **View Logs**: Check console output for errors
3. **Run Tests**: `npm test` to validate functionality
4. **Documentation**: Read `PRODUCTION-DEPLOYMENT.md`

## 📂 Key Files

```
mcp-server/
├── src/aoma-mesh-server.ts          # Main server code
├── src/health-check.ts              # Health validation
├── PRODUCTION-DEPLOYMENT.md         # Full guide
├── PRINTABLE-SUMMARY.md            # Overview
├── configs/                        # Client configurations
│   ├── claude-desktop.json
│   ├── windsurf.json
│   └── vscode-settings.json
└── src/__tests__/                  # 55+ tests
```

---

**💡 Pro Tips:**
- Run `npm run health-check` before starting work
- Use `--detailed` flag for debugging
- Keep this card handy for quick reference
- Print `PRODUCTION-DEPLOYMENT.md` for complete guide

**🚀 Status: READY FOR PRODUCTION USE**

*Print this card and keep it at your desk for quick reference*