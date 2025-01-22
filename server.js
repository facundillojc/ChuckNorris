require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const { CronJob, CronTime } = require('cron');
const lowdb = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');

const app = express();
const port = process.env.PORT || 3000;

// Database setup
const adapter = new FileSync('db.json');
const db = lowdb(adapter);
db.defaults({ schedule: { time: '09:00', enabled: false } }).write();

app.use(cors());
app.use(express.json());

// Function to get and translate joke
async function getAndTranslateJoke() {
  try {
    // Get joke
    const jokeResponse = await fetch('https://api.chucknorris.io/jokes/random');
    const jokeData = await jokeResponse.json();
    const jokeEn = jokeData.value;

    // Translate joke
    const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(jokeEn)}&langpair=en|es`;
    const translateResponse = await fetch(translateUrl);
    const translateData = await translateResponse.json();
    const jokeEs = translateData.responseData.translatedText;

    return { jokeEn, jokeEs };
  } catch (error) {
    console.error('Error getting/translating joke:', error);
    throw error;
  }
}

// Function to send joke to Discord
async function sendToDiscord(jokeEn, jokeEs) {
  const webhookURL = process.env.WEBHOOK_URL;
  const emojis = ['🤠', '💪', '👊', '🥋', '🎯', '⚡', '🔥', '💥', '🌟', '🦾'];
  const randomEmojis = [
    emojis[Math.floor(Math.random() * emojis.length)],
    emojis[Math.floor(Math.random() * emojis.length)]
  ];

  try {
    await fetch(webhookURL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: `${randomEmojis[0]} **Chuck Norris Joke** ${randomEmojis[0]}\n${jokeEn}\n\n${randomEmojis[1]} **Chiste de Chuck Norris** ${randomEmojis[1]}\n${jokeEs}`
      })
    });
  } catch (error) {
    console.error('Error sending to Discord:', error);
    throw error;
  }
}

// Initialize cron job
let job = new CronJob('0 9 * * *', async () => {
  if (db.get('schedule.enabled').value()) {
    try {
      const { jokeEn, jokeEs } = await getAndTranslateJoke();
      await sendToDiscord(jokeEn, jokeEs);
    } catch (error) {
      console.error('Error in cron job:', error);
    }
  }
});

job.start();

// Update schedule endpoint
app.post('/update-cron', (req, res) => {
  const { newTime, enabled } = req.body;
  const [hours, minutes] = newTime.split(':');
  const cronExpression = `${minutes} ${hours} * * *`;

  try {
    job.stop();
    job = new CronJob(cronExpression, async () => {
      if (enabled) {
        try {
          const { jokeEn, jokeEs } = await getAndTranslateJoke();
          await sendToDiscord(jokeEn, jokeEs);
        } catch (error) {
          console.error('Error in cron job:', error);
        }
      }
    });
    job.start();

    // Save to database
    db.set('schedule.time', newTime)
      .set('schedule.enabled', enabled)
      .write();

    res.status(200).json({ message: 'Schedule updated successfully' });
  } catch (error) {
    console.error('Error updating schedule:', error);
    res.status(500).json({ error: 'Failed to update schedule' });
  }
});

// Manual trigger endpoint
app.post('/send-message', async (req, res) => {
  try {
    const { jokeEn, jokeEs } = await getAndTranslateJoke();
    await sendToDiscord(jokeEn, jokeEs);
    res.status(200).json({ message: 'Joke sent successfully' });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});