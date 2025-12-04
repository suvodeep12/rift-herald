# 👾 Rift Herald

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-v16.9.0+-green.svg)
![Discord.js](https://img.shields.io/badge/discord.js-v14-5865F2.svg)

**Rift Herald** is a professional-grade Discord bot designed to track League of Legends ranked progress. It provides automated daily LP updates, live server leaderboards, and detailed profile lookups with a focus on visual elegance and reliability.

Unlike basic bots, Rift Herald tracks players by their **PUUID**, meaning it never breaks—even if a player changes their Riot ID.

---

## ✨ Key Features

- **🔄 Automated Daily Updates:** Automatically posts LP gains/losses, promotions, and demotions to a configured channel every day.
- **🏆 Live Leaderboard:** A real-time, sorted leaderboard for your server, complete with rank icons and win rates.
- **🆔 PUUID Tracking:** Tracks the _account_, not the name. Handles name changes automatically.
- **🏢 Multi-Guild Support:** Works across multiple Discord servers with independent tracking lists.
- **🎨 Visual Elegance:** Uses custom server emojis for Rank Icons (Iron - Challenger) and dynamic color-coded embeds.
- **⚡ Rate Limit Handling:** Smart queuing system to respect Riot API limits.

---

## 🛠️ Prerequisites

- **Node.js** (v16.9.0 or higher)
- **NPM** or **Yarn**
- **Discord Bot Token** ([Get it here](https://discord.com/developers/applications))
- **Riot Games API Key** ([Get it here](https://developer.riotgames.com/))

---

## 🚀 Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/rift-herald.git
cd rift-herald
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment

Create a `.env` file in the root directory:

```bash
touch .env
```

Open it and paste the following configuration:

```env
# Discord Configuration
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_discord_application_id

# Riot Games Configuration
RIOT_API_KEY=your_riot_api_key

# Cron Schedule (Default: Daily at 8:00 PM Asia/Kolkata)
CRON_SCHEDULE=0 20 * * *
CRON_TIMEZONE=Asia/Kolkata
```

### 4. Deploy Slash Commands

Register the commands with Discord:

```bash
node deploy-commands.js
```

### 5. Start the Bot

```bash
node src/index.js
```

_(For production, use PM2: `pm2 start src/index.js --name "rift-herald"`)_

---

## 🎨 Visual Setup (Important)

For the **Leaderboard** and **Rank Updates** to look 10/10, you must upload custom emojis to your Discord server.

1.  Go to **Server Settings > Emoji**.
2.  Upload rank icons (download them from the LoL Wiki or similar).
3.  **Name them exactly like this:**
    - `iron`, `bronze`, `silver`, `gold`, `platinum`, `emerald`, `diamond`, `master`, `grandmaster`, `challenger`.

The bot automatically detects these emojis and renders them in the embeds.

---

## 🎮 Commands

| Command                                         | Description                                           |
| :---------------------------------------------- | :---------------------------------------------------- |
| `/setup channel:<#channel>`                     | **(Admin)** Configure where daily updates are posted. |
| `/track riot_id:<Name#Tag> region:<SG2/NA1...>` | Start tracking a player's ranked progress.            |
| `/untrack player:<Select from list>`            | Stop tracking a player (Autocomplete supported).      |
| `/lolranking`                                   | Show the server's live ranked leaderboard.            |
| `/lolprofile riot_id:<Name#Tag>`                | Lookup a player's current rank and stats instantly.   |

---

## 📂 Project Structure

```text
rift-herald/
├── data/                  # SQLite Database storage
├── src/
│   ├── commands/          # Slash Command definitions
│   ├── core/              # Database & Riot API Logic
│   ├── events/            # Discord Event Handlers
│   ├── tasks/             # Cron Jobs (Daily LP Check)
│   ├── utils/             # Embed builders & helpers
│   └── index.js           # Entry point
├── .env                   # Secrets
└── deploy-commands.js     # Command registration script
```

---

## ⚠️ Maintenance Note

If you are using a standard **Riot Development Key**, it expires every **24 hours**.
If the bot starts throwing `403 Forbidden` errors:

1.  Go to [Riot Developer Portal](https://developer.riotgames.com/).
2.  Regenerate Key.
3.  Update `.env`.
4.  Restart Bot.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**Built with ❤️ by [Your Name]**

```

```
