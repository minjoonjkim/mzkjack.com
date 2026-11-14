/* Admin settings. The "vault" holds your GitHub token encrypted with your admin
   password (AES-GCM, key derived with PBKDF2). It is written by admin.html during
   first-time setup. Never put a plain token in this file. */
window.ADMIN_CONFIG = {
  "repo": "minjoonjkim/mzkjack.com",
  "branch": "main",
  "contentPath": "content.js",
  "contentPathKo": "content.ko.js",
  "configPath": "admin-config.js",
  "vault": {
    "v": 1,
    "kdf": "PBKDF2-SHA256",
    "iterations": 600000,
    "salt": "VBPb54tNUFH74oYAxZxClg==",
    "iv": "FbltMMPiK0POHTbG",
    "data": "axXUhBe8CgfJKZNNPCa85i/Zrq9fycQmI9kx+ER5HG7XAbEgFqgwpzPi4BRbjnDTkJAPM4p9HFiOMeXqv2RwEJw/Sx6nOG2EZwn99FA0TXP1gNsgQQQFqM8BDODNzLMFiVSZapY8hwVYyWPfBw=="
  }
};
