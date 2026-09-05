/* Admin settings. The "vault" holds your GitHub token encrypted with your admin
   password (AES-GCM, key derived with PBKDF2). It is written by admin.html during
   first-time setup. Never put a plain token in this file. */
window.ADMIN_CONFIG = {
  "repo": "minjoonjkim/mzkjack.com",
  "branch": "main",
  "contentPath": "content.js",
  "configPath": "admin-config.js",
  "vault": {
    "v": 1,
    "kdf": "PBKDF2-SHA256",
    "iterations": 600000,
    "salt": "yE1beRiAELE5+SSzYHXiEQ==",
    "iv": "g6SGgoOsflQ7rzuC",
    "data": "Wp+bbQOKYWEuGCvDvcQYNbBZs3zK8MqHIyi9sXJdev+xHB26JT9wbc+9XL7B526Q4GifkUffFLvAkpQ9HKGj4NkYGXCVyfiF1CoI+WhASHkZNTZAleeySSSzkvNvnhvn0n/phOCPRbS0zQX/rw=="
  }
};
