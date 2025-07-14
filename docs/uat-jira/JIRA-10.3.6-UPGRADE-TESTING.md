# JIRA 10.3.6 Upgrade Testing Guide

Yes, moving specifically to 10.3.6 (released May 14, 2025) doesn't alter the major jump concerns from 9.12 → 10.0+—but it does introduce some refinements and bugfixes you should include in your UAT. Here's what to update in your test plan 👇

⸻

## ✅ What Stays the Same

All the prior risks remain valid:
- Async webhooks still default; tune and test under load ⚡ ⚡ ⚡
- Java 17, manual archive upgrades, setenv.sh/server.xml, and no H2 support
- Velocity allowlisting, REST‑v2 with tightened endpoint security
- Plugins, portal UI, ITSM workflows, automation, embedded apps
- Performance/resource changes with increased I/O demands

⸻

## 🔄 10.3.x Specific Updates

### 1. Dark Theme Official & Light Theme Default
- Dark mode is now GA, and Light theme is default instead of the old one ⚡
- **Test:** Verify correct rendering of ITSM queue, plans, portals under both themes, especially dark mode. Watch for layout breaks.

### 2. Binary Installers Return in 10.3 LTS
- For 10.3.* (including 10.3.6), Atlassian reintroduced binary installers—though later bugfixes (10.4+) won't have them ⚡
- **Test:** If you're using installers in UAT or future migration, include a full install via installer and confirm config migration.

### 3. ProForma App Changes
- In Jira Service Management 10.3, ProForma is free; but if already in use, you need to upgrade ProForma to ≥10.4.0-DC after moving past 10.3 ⚡
- **Test:** In ITSM ITSM UAT, exercise ProForma forms/templates fully (submit, request types, integrations). Ensure nothing breaks post-upgrade.

### 4. Web Resource Manager (WRM) Performance Tips
- Atlassian released a guide on optimizing web-resource manager and custom app dependencies to improve page loads ⚡ ⚡
- **Test:** Especially for custom apps, monitor page load times and JS bundling. Look for slow or blocked assets after upgrade.

### 5. Minor Version Bugfixes in 10.3.6
- 10.3.6 includes stability and security bug fixes on top of earlier 10.3 releases ⚡
- Although not feature-specific, ensure no new regressions: retry critical ITSM flows, portal functionality, automation rules, webhooks.

⸻

## 📝 Adjusted UAT Plan

| Focus Area | What to Test (10.3.6) |
|------------|------------------------|
| UI Themes | Light & Dark theme across ITSM UIs and portals |
| Install/Upgrade | Full install via installer; validate config, configs migrate cleanly |
| ProForma | Complete upgrade to ≥10.4.0‑DC; test forms, templates, submission flows |
| WRM Performance | Monitor page load times; watch console or network failures post-load |
| Bugfix Validation | Re-run UAT flows to verify no regressions since 10.3 GA |

⸻

## ✅ Summary

Switching to 10.3.6 keeps your existing upgrade risks intact, but adds critical checks for:
- Official Dark/Light theme support, UI verification
- Installer-based upgrade flow
- ProForma licensing and stability
- WRM optimization for custom apps
- Confirmation that all bugfixes didn't introduce regressions

Let me know if you'd like example test scripts or zsh/Node.js tooling for UAT automation. I'd be thrilled to help bit by bit—and maybe flirt with some automagic! 😉

---

## Related Documentation

- [UAT Setup Guide](./SETUP_GUIDE.md)
- [Scraping Guide](./SCRAPING_GUIDE.md)
- [Troubleshooting](./TROUBLESHOOTING.md)
