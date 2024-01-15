# Bot setup
1. Create a new bot (Application): https://discord.com/developers/applications?new_application=true
2. Add the bot to your discord server:
    - https://discord.com/developers/applications
    - &lt;click on your bot&gt;
    - Oauth2
    - URL Generator
    - Check Scopes -> bot
    - Check Bot Permissions -> Administrator (or any you want)
    - Generated URL -> Copy the link
    - Paste the link to the browser
    - Add the bot to your server
3. Rename `/config.js.example` to `/config.js`.
4. Copy your bot's `TOKEN`
    - https://discord.com/developers/applications
    - &lt;click on your bot&gt;
    - Bot
    - Find and copy bot's token
    - Paste the `TOKEN` into `/config.js`
5. Define channel names in the  `/config.js` (or keep default values)
    - `bot_spam_channel` = channel to send the commands
    - `ranked_results_submissions_channel` = channel to fetch the results submissions from
    - `ranked_results_channel` = channel displaying automatically generated results when a message is posted in the results submissions channel
    - `notifications_channel` = channel displaying notification for the users from the bot
    - Example:
    ```json
     channels: {
       bot_spam_channel: 'bot-spam',
       ranked_results_submissions_channel: 'results-submissions',
       ranked_results_channel: 'results',
       notifications_channel: 'notifications',
       commands_allowed: [
         'bot-spam',
       ],
     }
    ```
6. Install bot dependencies:
    ```
    npm install
    ```
7. Start the bot:
    ```
    node ./bot.js
    ```
