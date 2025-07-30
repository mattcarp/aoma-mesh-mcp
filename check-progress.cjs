const fs = require('fs');
const { exec } = require('child_process');

console.log('🔍 SMART TEST RUNNER PROGRESS CHECK');
console.log('===================================');

// Check if smart runner is still running
exec('pgrep -f "smart-test-runner"', (error, stdout) => {
  if (stdout.trim()) {
    console.log('✅ Smart Test Runner: ACTIVE (PID:', stdout.trim(), ')');
  } else {
    console.log('❌ Smart Test Runner: NOT RUNNING');
  }
});

// Check Playwright activity
exec('pgrep -f "playwright.*test" | wc -l', (error, stdout) => {
  const count = parseInt(stdout.trim());
  console.log(`🎭 Playwright Processes: ${count} active`);
});

// Check for recent results
const testResultsDir = 'test-results';
if (fs.existsSync(testResultsDir)) {
  const files = fs.readdirSync(testResultsDir);
  const recentFiles = files.filter(f => {
    if (!f.includes('smart-runner')) return false;
    try {
      const stats = fs.statSync(`${testResultsDir}/${f}`);
      const ageMinutes = (Date.now() - stats.mtime.getTime()) / 1000 / 60;
      return ageMinutes < 10; // Files modified in last 10 minutes
    } catch {
      return false;
    }
  });
  
  console.log(`📊 Recent Results: ${recentFiles.length} files`);
  recentFiles.forEach(f => console.log(`   📄 ${f}`));
}

// Check current session status
if (fs.existsSync('current-session.json')) {
  try {
    const session = JSON.parse(fs.readFileSync('current-session.json', 'utf8'));
    const cookieCount = session.cookies ? session.cookies.length : 0;
    console.log(`🔐 Session Status: ${cookieCount} cookies available`);
  } catch {
    console.log('🔐 Session Status: Invalid session file');
  }
} else {
  console.log('🔐 Session Status: No session file found');
}

// Check disk space
exec('df -h | grep "/System/Volumes/Data"', (error, stdout) => {
  if (stdout) {
    const match = stdout.match(/(\d+)%.*(\d+Gi)/);
    if (match) {
      console.log(`💾 Disk Space: ${match[1]}% used, ${match[2]} available`);
    }
  }
});

console.log('\n🚀 Tests are running in background...');
console.log('Run this script again to check progress!'); 