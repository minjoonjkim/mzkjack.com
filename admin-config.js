/* Admin settings. The "vault" holds your GitHub token encrypted with your admin
   password (AES-GCM, key derived with PBKDF2). It is written by admin.html during
   first-time setup. Never put a plain token in this file. */
window.ADMIN_CONFIG = {
  "repo": "minjoonkimzk/mzkjack.com",
  "branch": "main",
  "contentPath": "content.js",
  "configPath": "admin-config.js",
  "vault": null
};
