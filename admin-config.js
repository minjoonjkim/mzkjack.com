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
    "salt": "+fDCM6jEeu317VUpsUcwXw==",
    "iv": "8kZV84A5Yr54OP7K",
    "data": "V5J3uvWNc6nFwE/nq9FCBTrT+UGbkhcEEAAkmVj8uqN4W9i00uWnNNPds29GbtiMVQ9HPSxCHYsKQnmiILTQ2hocG5iFhlcO4Ujqx9+OLsVkwBDWw2TwPkVGXSbHn1p50bduMrFgJDn2PfBRhA=="
  }
};
