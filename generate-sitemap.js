const fs = require("fs");

const OWNER = "BRICEWORLD";
const REPO = "BRICE-IMAGE";
const BRANCH = "main";

const BASE_URL =
  "https://briceworld.github.io/BRICE-IMAGE/";

const IMAGE_DIRECTORIES = [
  "images/ai",
  "images/branding",
  "images/hero",
  "images/profile/girls",
  "images/profile/boys",
  "images/tattoo",
  "images/wallpaper"
];

const CATEGORY_URLS = [
  "category.html?id=ai",
  "category.html?id=profile",
  "category.html?id=tattoo",
  "category.html?id=wallpaper",
  "category.html?id=branding",
  "category.html?id=hero"
];

const IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".gif"
];

function isImage(path) {
  const lower = path.toLowerCase();
  return IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext));
}

function encodePath(path) {
  return path
    .split("/")
    .map(part => encodeURIComponent(part))
    .join("/");
}

function getImageId(path) {
  return path
    .replace(/\//g, "-")
    .replace(/\.[^/.]+$/, "");
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function getRepositoryTree() {

  const url =
    `https://api.github.com/repos/${OWNER}/${REPO}/git/trees/${BRANCH}?recursive=1`;

  const headers = {
    "Accept": "application/vnd.github+json",
    "User-Agent": "BRICE-IMAGE-Sitemap"
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const response = await fetch(url, { headers });

  if (!response.ok) {
    throw new Error(
      `GitHub API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  if (data.truncated) {
    throw new Error(
      "GitHub repository tree is truncated. Sitemap generation stopped."
    );
  }

  return data.tree || [];
}

async function main() {

  console.log("🔎 Reading BRICE IMAGE repository...");

  const tree = await getRepositoryTree();

  const files = tree
    .filter(item => item.type === "blob")
    .filter(item =>
      IMAGE_DIRECTORIES.some(dir =>
        item.path.startsWith(dir + "/")
      )
    )
    .filter(item => isImage(item.path));

  console.log(`🖼️ Found ${files.length} images.`);

  const urls = [];

  // Homepage
  urls.push(`
  <url>
    <loc>${BASE_URL}</loc>
  </url>`);

  // Category pages
  for (const category of CATEGORY_URLS) {
    urls.push(`
  <url>
    <loc>${BASE_URL}${category}</loc>
  </url>`);
  }

  // Individual image pages
  for (const file of files) {

    const imageId = getImageId(file.path);

    const pageUrl =
      `${BASE_URL}image.html?id=${encodeURIComponent(imageId)}`;

    const imageUrl =
      `${BASE_URL}${encodePath(file.path)}`;

    urls.push(`
  <url>
    <loc>${escapeXml(pageUrl)}</loc>
    <image:image>
      <image:loc>${escapeXml(imageUrl)}</image:loc>
    </image:image>
  </url>`);
  }

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls.join("\n")}
</urlset>
`;

  fs.writeFileSync(
    "sitemap.xml",
    sitemap,
    "utf8"
  );

  console.log("✅ sitemap.xml created successfully.");
  console.log(`📊 Total URLs: ${urls.length}`);
}

main().catch(error => {
  console.error("❌ Sitemap generation failed:");
  console.error(error);
  process.exit(1);
});
