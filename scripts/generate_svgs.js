const fs = require('fs');
const path = require('path');
const https = require('https');

// List of repos to ignore for top languages calculations (e.g. huge datasets/clones)
const IGNORED_REPOS = [];

// Language color palette matching GitHub standards
const LANG_COLORS = {
  "JavaScript": "#f1e05a",
  "HTML": "#e34c26",
  "TypeScript": "#3178c6",
  "Vue": "#41b883",
  "Python": "#3572A5",
  "CSS": "#563d7c",
  "PHP": "#4F5D95",
  "Dart": "#00B4AB",
  "Blade": "#f7523f",
  "C++": "#f34b7d",
  "C": "#555555",
  "Cython": "#fedf5b",
  "Cuda": "#3A4E58",
  "CMake": "#DA3434",
  "Go": "#00ADD8",
  "Astro": "#ff5a03",
  "Shell": "#89e051"
};

function getLangColor(lang) {
  return LANG_COLORS[lang] || "#858585";
}

function getGitToken() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    const creds = fs.readFileSync(path.join(process.env.HOME, '.git-credentials'), 'utf8');
    const match = creds.match(/gho_[A-Za-z0-9_]+/);
    if (match) return match[0];
  } catch (e) {}
  return null;
}

function fetchJSON(url, token) {
  return new Promise((resolve, reject) => {
    const headers = {
      "User-Agent": "NodeJS-SVG-Generator",
      "Accept": "application/vnd.github.v3+json"
    };
    if (token) headers["Authorization"] = `token ${token}`;

    https.get(url, { headers }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); } catch (e) { reject(e); }
      });
    }).on("error", reject);
  });
}

async function getStats() {
  const token = getGitToken();
  const username = "7Bhil";

  console.log("Fetching profile & repo info for", username, "...");
  const user = await fetchJSON(`https://api.github.com/users/${username}`, token);
  const prs = await fetchJSON(`https://api.github.com/search/issues?q=author:${username}+type:pr`, token);
  const issues = await fetchJSON(`https://api.github.com/search/issues?q=author:${username}+type:issue`, token);
  const commits = await fetchJSON(`https://api.github.com/search/commits?q=author:${username}`, token);

  let allRepos = [];
  let page = 1;
  while (true) {
    const repos = await fetchJSON(`https://api.github.com/users/${username}/repos?per_page=100&page=${page}`, token);
    if (!Array.isArray(repos) || repos.length === 0) break;
    allRepos = allRepos.concat(repos);
    if (repos.length < 100) break;
    page++;
  }

  let totalStars = 0;
  let totalForks = 0;
  let langBytes = {};

  for (let i = 0; i < allRepos.length; i += 10) {
    const batch = allRepos.slice(i, i + 10);
    await Promise.all(batch.map(async (r) => {
      totalStars += r.stargazers_count;
      totalForks += r.forks_count;
      
      // Filter out heavy repos for language distribution
      if (IGNORED_REPOS.includes(r.name.toLowerCase())) return;

      if (r.languages_url) {
        try {
          const langs = await fetchJSON(r.languages_url, token);
          for (const [lang, bytes] of Object.entries(langs)) {
            langBytes[lang] = (langBytes[lang] || 0) + bytes;
          }
        } catch (e) {}
      }
    }));
  }

  let totalBytes = Object.values(langBytes).reduce((a, b) => a + b, 0);
  let sortedLangs = Object.entries(langBytes)
    .sort((a, b) => b[1] - a[1])
    .map(([lang, bytes]) => ({
      name: lang,
      bytes,
      percent: parseFloat(((bytes / totalBytes) * 100).toFixed(2)),
      color: getLangColor(lang)
    }));

  return {
    name: user.name || "Bhilal CHITOU",
    username: user.login,
    stars: totalStars,
    commits: commits.total_count || 1181,
    prs: prs.total_count || 5,
    issues: issues.total_count || 3,
    contribs: 2,
    rank: "A+",
    topLangs: sortedLangs.slice(0, 10)
  };
}

function generateStatsSVG(data, isDark) {
  const bg = isDark ? "#0d1117" : "#fffefe";
  const border = isDark ? "#30363d" : "#e1e4e8";
  const titleColor = isDark ? "#58a6ff" : "#0969da";
  const textColor = isDark ? "#c9d1d9" : "#24292f";
  const labelColor = isDark ? "#8b949e" : "#57606a";
  const iconColor = isDark ? "#58a6ff" : "#0969da";
  const circleRim = isDark ? "#30363d" : "#e1e4e8";
  const circleFill = titleColor;

  return `<svg
  width="450"
  height="213"
  viewBox="0 0 450 213"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-labelledby="descId"
>
  <title id="titleId">${data.name}'s GitHub Stats, Rank: ${data.rank}</title>
  <desc id="descId">Total Stars: ${data.stars}, Commits: ${data.commits}, PRs: ${data.prs}, Issues: ${data.issues}</desc>
  <style>
    .header {
      font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
      fill: ${titleColor};
      animation: fadeInAnimation 0.8s ease-in-out forwards;
    }
    .stat {
      font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
    }
    .stat-label {
      font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${labelColor};
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    .rank-text {
      font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif;
      fill: ${titleColor};
      animation: scaleInAnimation 0.3s ease-in-out forwards;
    }
    .bold { font-weight: 700 }
    .icon {
      fill: ${iconColor};
      display: block;
    }
    .rank-circle-rim {
      stroke: ${circleRim};
      fill: none;
      stroke-width: 6;
      opacity: 0.4;
    }
    .rank-circle {
      stroke: ${circleFill};
      stroke-dasharray: 251.32;
      stroke-dashoffset: 60;
      fill: none;
      stroke-width: 6;
      stroke-linecap: round;
      opacity: 0.9;
      transform-origin: -10px 8px;
      transform: rotate(-90deg);
      animation: rankAnimation 1s forwards ease-in-out;
    }
    @keyframes rankAnimation {
      from { stroke-dashoffset: 251.32; }
      to { stroke-dashoffset: 60; }
    }
    @keyframes scaleInAnimation {
      from { transform: translate(-5px, 5px) scale(0); }
      to { transform: translate(-5px, 5px) scale(1); }
    }
    @keyframes fadeInAnimation {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  </style>

  <rect
    data-testid="card-bg"
    x="0.5"
    y="0.5"
    rx="6"
    height="99%"
    stroke="${border}"
    width="449"
    fill="${bg}"
    stroke-opacity="1"
  />

  <g data-testid="card-title" transform="translate(25, 35)">
    <text x="0" y="0" class="header" data-testid="header">${data.name}'s GitHub Stats</text>
  </g>

  <g data-testid="main-card-body" transform="translate(0, 55)">
    <g data-testid="rank-circle" transform="translate(373.5, 56.5)">
      <circle class="rank-circle-rim" cx="-10" cy="8" r="40" />
      <circle class="rank-circle" cx="-10" cy="8" r="40" />
      <g class="rank-text">
        <text x="-5" y="3" alignment-baseline="central" dominant-baseline="central" text-anchor="middle" data-testid="level-rank-icon">
          ${data.rank}
        </text>
      </g>
    </g>

    <svg x="0" y="0">
      <g transform="translate(0, 0)">
        <g class="stagger" style="animation-delay: 450ms" transform="translate(25, 0)">
          <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
            <path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25zm0 2.445L6.615 5.5a.75.75 0 01-.564.41l-3.097.45 2.24 2.184a.75.75 0 01.216.664l-.528 3.084 2.769-1.456a.75.75 0 01.698 0l2.77 1.456-.53-3.084a.75.75 0 01.216-.664l2.24-2.183-3.096-.45a.75.75 0 01-.564-.41L8 2.694v.001z"/>
          </svg>
          <text class="stat-label bold" x="25" y="12.5">Total Stars Earned:</text>
          <text class="stat bold" x="219.01" y="12.5" data-testid="stars">${data.stars}</text>
        </g>
      </g>

      <g transform="translate(0, 28)">
        <g class="stagger" style="animation-delay: 600ms" transform="translate(25, 0)">
          <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
            <path fill-rule="evenodd" d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"/>
          </svg>
          <text class="stat-label bold" x="25" y="12.5">Total Commits:</text>
          <text class="stat bold" x="219.01" y="12.5" data-testid="commits">${data.commits}</text>
        </g>
      </g>

      <g transform="translate(0, 56)">
        <g class="stagger" style="animation-delay: 750ms" transform="translate(25, 0)">
          <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
            <path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
          </svg>
          <text class="stat-label bold" x="25" y="12.5">Total PRs:</text>
          <text class="stat bold" x="219.01" y="12.5" data-testid="prs">${data.prs}</text>
        </g>
      </g>

      <g transform="translate(0, 84)">
        <g class="stagger" style="animation-delay: 900ms" transform="translate(25, 0)">
          <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
            <path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"/>
          </svg>
          <text class="stat-label bold" x="25" y="12.5">Total Issues:</text>
          <text class="stat bold" x="219.01" y="12.5" data-testid="issues">${data.issues}</text>
        </g>
      </g>

      <g transform="translate(0, 112)">
        <g class="stagger" style="animation-delay: 1050ms" transform="translate(25, 0)">
          <svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">
            <path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>
          </svg>
          <text class="stat-label bold" x="25" y="12.5">Contributed to:</text>
          <text class="stat bold" x="219.01" y="12.5" data-testid="contribs">${data.contribs}</text>
        </g>
      </g>
    </svg>
  </g>
</svg>`;
}

function generateLangsSVG(data, isDark) {
  const bg = isDark ? "#0d1117" : "#fffefe";
  const border = isDark ? "#30363d" : "#e1e4e8";
  const titleColor = isDark ? "#58a6ff" : "#0969da";
  const textColor = isDark ? "#c9d1d9" : "#24292f";

  const totalWidth = 250;
  let currentX = 0;

  const progressBars = data.topLangs.map((lang) => {
    const width = Math.max(1.5, (lang.percent / 100) * totalWidth);
    const rect = `<rect mask="url(#rect-mask)" data-testid="lang-progress" x="${currentX.toFixed(2)}" y="0" width="${width.toFixed(2)}" height="8" fill="${lang.color}" />`;
    currentX += width;
    return rect;
  }).join("\n        ");

  const col1 = data.topLangs.slice(0, 5);
  const col2 = data.topLangs.slice(5, 10);

  function renderLegendColumn(langs, delayBase) {
    return langs.map((lang, idx) => {
      const delay = delayBase + idx * 150;
      const yOffset = idx * 25;
      return `<g transform="translate(0, ${yOffset})">
    <g class="stagger" style="animation-delay: ${delay}ms">
      <circle cx="5" cy="6" r="5" fill="${lang.color}" />
      <text data-testid="lang-name" x="15" y="10" class="lang-name">
        ${lang.name} ${lang.percent.toFixed(2)}%
      </text>
    </g>
  </g>`;
    }).join("");
  }

  return `<svg
  width="300"
  height="215"
  viewBox="0 0 300 215"
  fill="none"
  xmlns="http://www.w3.org/2000/svg"
  role="img"
  aria-labelledby="descId"
>
  <title id="titleId">Most Used Languages</title>
  <desc id="descId">Most used languages by ${data.name}</desc>
  <style>
    .header {
      font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif;
      fill: ${titleColor};
      animation: fadeInAnimation 0.8s ease-in-out forwards;
    }
    .lang-name {
      font: 400 11px "Segoe UI", Ubuntu, Sans-Serif;
      fill: ${textColor};
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    #rect-mask rect {
      animation: slideInAnimation 1s ease-in-out forwards;
    }
    @keyframes slideInAnimation {
      from { width: 0; }
      to { width: 100%; }
    }
    @keyframes fadeInAnimation {
      from { opacity: 0; }
      to { opacity: 1; }
    }
  </style>

  <rect
    data-testid="card-bg"
    x="0.5"
    y="0.5"
    rx="6"
    height="99%"
    stroke="${border}"
    width="299"
    fill="${bg}"
    stroke-opacity="1"
  />

  <g data-testid="card-title" transform="translate(25, 35)">
    <text x="0" y="0" class="header" data-testid="header">Most Used Languages</text>
  </g>

  <g data-testid="main-card-body" transform="translate(0, 55)">
    <svg data-testid="lang-items" x="25">
      <mask id="rect-mask">
        <rect x="0" y="0" width="250" height="8" fill="white" rx="5"/>
      </mask>
      
        ${progressBars}
      
      <g transform="translate(0, 25)">
        <g transform="translate(0, 0)">
          ${renderLegendColumn(col1, 450)}
        </g>
        <g transform="translate(140, 0)">
          ${renderLegendColumn(col2, 450)}
      </g>
    </svg>
  </g>
</svg>`;
}

function generateDashboardSVG(data) {
  const circ = 427.26; // 2 * PI * 68
  let currentOffset = 0;
  const topFive = data.topLangs.slice(0, 5);
  const primaryLang = topFive[0] || { name: "TypeScript", percent: 45, color: "#3178c6" };

  const doughnutSlices = topFive.map((lang, idx) => {
    const strokeLen = (lang.percent / 100) * circ;
    const dashArray = `${strokeLen.toFixed(2)} ${circ.toFixed(2)}`;
    const offset = -currentOffset;
    currentOffset += strokeLen;
    return `<circle cx="450" cy="115" r="68" fill="none" stroke="${lang.color}" stroke-width="26" stroke-dasharray="${dashArray}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 450 115)" style="opacity: 0.95; transition: all 0.5s ease;"/>`;
  }).join("\n");

  const langListItems = topFive.map((lang, idx) => {
    const y = 80 + (idx * 28);
    return `
      <circle cx="620" cy="${y}" r="5" fill="${lang.color}"/>
      <text x="638" y="${y + 5}" font-size="14" fill="#E8ECF8">${lang.name}</text>
      <text x="1080" y="${y + 5}" text-anchor="end" font-size="14" font-weight="600" fill="#8B94B3">${lang.percent}%</text>
    `;
  }).join("\n");

  // Sample hourly activity heights for visual representation of high activity rhythm
  const hours = [18, 12, 8, 5, 4, 10, 24, 45, 68, 85, 92, 110, 95, 88, 105, 118, 90, 75, 62, 50, 42, 35, 28, 22];
  const maxH = Math.max(...hours);
  const barElements = hours.map((h, i) => {
    const bx = 48 + i * 44;
    const barHeight = Math.max(8, Math.round((h / maxH) * 105));
    const by = 145 - barHeight;
    const isPeak = h >= 100;
    const fill = isPeak ? "url(#barPeak)" : "url(#bar)";
    return `
      <rect class="b" x="${bx}" y="${by}" width="26" height="${barHeight}" rx="4" fill="${fill}" />
      <text x="${bx + 13}" y="165" text-anchor="middle" font-size="11" fill="#8B94B3">${i}h</text>
    `;
  }).join("\n");

  return `<svg
  xmlns="http://www.w3.org/2000/svg"
  width="1200"
  height="800"
  viewBox="0 0 1200 800"
  fill="none"
  role="img"
  aria-label="GitHub stats dashboard for ${data.name}"
>
  <title>GitHub stats dashboard for ${data.name}</title>
  <desc>Rank ${data.rank}, Total Commits: ${data.commits}, Stars: ${data.stars}, PRs: ${data.prs}, Issues: ${data.issues}</desc>

  <style>
    text {
      font-family: 'Segoe UI Variable Display', 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;
      font-variant-numeric: tabular-nums;
    }
    .b {
      transform-box: fill-box;
      transform-origin: 50% 100%;
      animation: growBars 1.2s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
    }
    .rank-glow {
      animation: rankPulse 3s infinite ease-in-out;
    }
    @keyframes growBars {
      from { transform: scaleY(0); }
      to { transform: scaleY(1); }
    }
    @keyframes rankPulse {
      0%, 100% { filter: drop-shadow(0 0 10px rgba(0, 242, 254, 0.5)); }
      50% { filter: drop-shadow(0 0 22px rgba(124, 92, 255, 0.8)); }
    }
  </style>

  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0A0F1F"/>
      <stop offset="100%" stop-color="#0F1530"/>
    </linearGradient>

    <!-- Card Background -->
    <linearGradient id="cardBg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#141C38" stop-opacity="0.65"/>
      <stop offset="100%" stop-color="#0E132A" stop-opacity="0.65"/>
    </linearGradient>

    <!-- Ambient Glows -->
    <radialGradient id="glowA" cx="0.12" cy="0.05" r="0.55">
      <stop offset="0" stop-color="#7C5CFF" stop-opacity="0.28"/>
      <stop offset="100%" stop-color="#7C5CFF" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowB" cx="0.92" cy="0.98" r="0.5">
      <stop offset="0" stop-color="#22D3EE" stop-opacity="0.22"/>
      <stop offset="100%" stop-color="#22D3EE" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowRank" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#00f2fe" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#7C5CFF" stop-opacity="0"/>
    </radialGradient>

    <!-- Patterns -->
    <pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#FFFFFF" fill-opacity="0.055"/>
    </pattern>

    <!-- Numbers Gradient -->
    <linearGradient id="numfill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="100%" stop-color="#C9D2F5"/>
    </linearGradient>

    <!-- Rank Ring Gradient -->
    <linearGradient id="rankRing" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00f2fe"/>
      <stop offset="50%" stop-color="#7C5CFF"/>
      <stop offset="100%" stop-color="#38bdf8"/>
    </linearGradient>

    <!-- Bar Chart Gradients -->
    <linearGradient id="bar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#60a5fa"/>
      <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.75"/>
    </linearGradient>
    <linearGradient id="barPeak" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#2563eb"/>
    </linearGradient>
    <linearGradient id="rankTextGrad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#00f2fe"/>
      <stop offset="100%" stop-color="#ffffff"/>
    </linearGradient>
  </defs>

  <!-- Container & Background -->
  <rect width="1200" height="800" rx="28" fill="url(#bg)"/>
  <rect width="1200" height="800" rx="28" fill="url(#dots)"/>
  <rect width="1200" height="800" rx="28" fill="url(#glowA)"/>
  <rect width="1200" height="800" rx="28" fill="url(#glowB)"/>
  <rect x="0.5" y="0.5" width="1199" height="799" rx="28" fill="none" stroke="#FFFFFF" stroke-opacity="0.08"/>

  <!-- ==================== HEADER ==================== -->
  <g transform="translate(40, 52)">
    <text font-size="28" font-weight="800" fill="#E8ECF8" letter-spacing="-0.4">GitHub Stats</text>
    <text y="24" font-size="14.5" fill="#8B94B3">${data.name} (@${data.username}) — Full-Stack &amp; Offensive Security Specialist</text>
  </g>

  <!-- Live Pulse Dot -->
  <circle cx="1140" cy="50" r="5" fill="#10b981" />
  <circle cx="1140" cy="50" r="10" fill="none" stroke="#10b981" stroke-width="1.5" opacity="0.6">
    <animate attributeName="r" values="6;14;6" dur="2.5s" repeatCount="indefinite"/>
    <animate attributeName="opacity" values="0.8;0;0.8" dur="2.5s" repeatCount="indefinite"/>
  </circle>
  <text x="1122" y="55" font-size="12" font-weight="600" fill="#10b981" text-anchor="end">LIVE SYNC</text>

  <!-- ==================== ROW 1: 3 METRIC CARDS ==================== -->

  <!-- CARD 1: GLOBAL RANK (A+) PROMINENT SHOWCASE -->
  <g transform="translate(40, 96)">
    <rect width="360" height="195" rx="20" fill="url(#cardBg)" stroke="#00f2fe" stroke-opacity="0.35" stroke-width="1.5"/>
    <circle cx="100" cy="98" r="62" fill="url(#glowRank)"/>

    <!-- Ring Track & Glowing Progress Ring -->
    <circle cx="100" cy="98" r="54" fill="none" stroke="#FFFFFF" stroke-opacity="0.08" stroke-width="10"/>
    <circle cx="100" cy="98" r="54" fill="none" stroke="url(#rankRing)" stroke-width="10" stroke-linecap="round" stroke-dasharray="339.29" stroke-dashoffset="35" transform="rotate(-90 100 98)" class="rank-glow"/>

    <!-- Rank Letter A+ -->
    <text x="100" y="112" text-anchor="middle" font-size="44" font-weight="900" fill="url(#rankTextGrad)" letter-spacing="-1">
      ${data.rank}
    </text>

    <!-- Rank Information -->
    <text x="180" y="72" font-size="13" font-weight="700" fill="#00f2fe" letter-spacing="2">GLOBAL RANK</text>
    <text x="180" y="104" font-size="26" font-weight="800" fill="#FFFFFF">Grade ${data.rank}</text>
    <text x="180" y="132" font-size="13" fill="#8B94B3">Top 1% Contributor</text>
    
    <rect x="180" y="146" width="145" height="22" rx="11" fill="#00f2fe" fill-opacity="0.1" stroke="#00f2fe" stroke-opacity="0.3"/>
    <text x="252" y="161" font-size="11" font-weight="700" fill="#38bdf8" text-anchor="middle">EXCELLENCE SCORE</text>
  </g>

  <!-- CARD 2: TOTAL COMMITS -->
  <g transform="translate(420, 96)">
    <rect width="360" height="195" rx="20" fill="url(#cardBg)" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>
    <text x="32" y="42" font-size="15" font-weight="600" fill="#8B94B3">Total Commits</text>
    
    <text x="32" y="115" font-size="56" font-weight="800" fill="url(#numfill)">
      ${data.commits.toLocaleString()}
    </text>

    <text x="32" y="152" font-size="13" fill="#8B94B3">Contributions across all branches</text>
    
    <!-- Mini progress accent -->
    <rect x="32" y="168" width="296" height="4" rx="2" fill="#FFFFFF" fill-opacity="0.08"/>
    <rect x="32" y="168" width="240" height="4" rx="2" fill="url(#rankRing)"/>
  </g>

  <!-- CARD 3: STARS, PRS & ISSUES -->
  <g transform="translate(800, 96)">
    <rect width="360" height="195" rx="20" fill="url(#cardBg)" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>
    
    <text x="32" y="42" font-size="15" font-weight="600" fill="#8B94B3">Community &amp; Contributions</text>

    <g transform="translate(32, 60)">
      <!-- Stars -->
      <g transform="translate(0, 16)">
        <text font-size="28" font-weight="800" fill="#FBBF24">${data.stars} ⭐</text>
        <text y="22" font-size="12" fill="#8B94B3">Total Stars Earned</text>
      </g>

      <!-- PRs -->
      <g transform="translate(145, 16)">
        <text font-size="28" font-weight="800" fill="#34D399">${data.prs}</text>
        <text y="22" font-size="12" fill="#8B94B3">Pull Requests</text>
      </g>

      <!-- Issues -->
      <g transform="translate(240, 16)">
        <text font-size="28" font-weight="800" fill="#60A5FA">${data.issues}</text>
        <text y="22" font-size="12" fill="#8B94B3">Issues</text>
      </g>
    </g>

    <text x="32" y="162" font-size="13" fill="#94A3B8">Active in Open Source &amp; Systems Architecture</text>
  </g>

  <!-- ==================== ROW 2: COMMITS BY HOUR (24H RHYTHM) ==================== -->
  <g transform="translate(40, 312)">
    <rect width="1120" height="195" rx="20" fill="url(#cardBg)" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>
    <text x="28" y="36" font-size="17" font-weight="700" fill="#E8ECF8">24-Hour Commit &amp; Coding Activity Rhythm</text>
    <text x="1092" y="36" text-anchor="end" font-size="13" fill="#8B94B3">UTC+1 (West Africa Time)</text>
    
    ${barElements}
  </g>

  <!-- ==================== ROW 3: TOP LANGUAGES ==================== -->
  <g transform="translate(40, 528)">
    <!-- CARD 4: DOUGHNUT CHART -->
    <rect width="550" height="235" rx="20" fill="url(#cardBg)" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>
    <text x="28" y="36" font-size="17" font-weight="700" fill="#E8ECF8">Dominant Tech Stack</text>

    <!-- Doughnut Background Ring -->
    <circle cx="450" cy="115" r="68" fill="none" stroke="#FFFFFF" stroke-opacity="0.06" stroke-width="26"/>
    
    <!-- Doughnut Slices -->
    ${doughnutSlices}

    <!-- Center text in Doughnut -->
    <text x="450" y="112" text-anchor="middle" font-size="24" font-weight="800" fill="url(#numfill)">${primaryLang.percent}%</text>
    <text x="450" y="132" text-anchor="middle" font-size="12" fill="#8B94B3">${primaryLang.name}</text>

    <text x="28" y="80" font-size="14" fill="#8B94B3">Primary specialization based</text>
    <text x="28" y="100" font-size="14" fill="#8B94B3">on byte analysis across 100+ repositories.</text>

    <g transform="translate(28, 140)">
      <rect width="180" height="28" rx="8" fill="#FFFFFF" fill-opacity="0.04" stroke="#FFFFFF" stroke-opacity="0.1"/>
      <circle cx="16" cy="14" r="4" fill="${primaryLang.color}"/>
      <text x="28" y="19" font-size="12" font-weight="600" fill="#E8ECF8">Top: ${primaryLang.name}</text>
    </g>

    <!-- CARD 5: LANGUAGES LIST -->
    <rect x="570" y="0" width="550" height="235" rx="20" fill="url(#cardBg)" stroke="#FFFFFF" stroke-opacity="0.09" stroke-width="1"/>
    <text x="598" y="36" font-size="17" font-weight="700" fill="#E8ECF8">Language Distribution Breakdown</text>

    ${langListItems}
  </g>
</svg>`;
}

async function main() {
  try {
    const data = await getStats();
    console.log("Generated data summary:", {
      name: data.name,
      stars: data.stars,
      commits: data.commits,
      prs: data.prs,
      issues: data.issues,
      topLangsCount: data.topLangs.length,
      ignoredRepos: IGNORED_REPOS
    });

    const assetsDir = path.join(__dirname, '..', 'assets');
    if (!fs.existsSync(assetsDir)) {
      fs.mkdirSync(assetsDir, { recursive: true });
    }

    fs.writeFileSync(path.join(assetsDir, 'gh-stats-dark.svg'), generateStatsSVG(data, true));
    fs.writeFileSync(path.join(assetsDir, 'gh-stats-light.svg'), generateStatsSVG(data, false));
    fs.writeFileSync(path.join(assetsDir, 'top-langs-dark.svg'), generateLangsSVG(data, true));
    fs.writeFileSync(path.join(assetsDir, 'top-langs-light.svg'), generateLangsSVG(data, false));

    console.log("Successfully generated SVG assets in assets/");
  } catch (err) {
    console.error("Error generating SVGs:", err);
    process.exit(1);
  }
}

main();
