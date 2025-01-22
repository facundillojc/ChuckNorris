async function getChuckNorrisJoke() {
  try {
    const response = await fetch('https://api.chucknorris.io/jokes/random');
    const data = await response.json();
    return data.value;
  } catch (error) {
    console.error('Error fetching joke:', error);
    return 'Failed to fetch joke. Please try again.';
  }
}

async function translateToSpanish(text) {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|es`;
    const response = await fetch(url);
    const data = await response.json();
    return data.responseData.translatedText;
  } catch (error) {
    console.error('Error translating:', error);
    return 'Error en la traducción. Por favor intente de nuevo.';
  }
}

async function sendToDiscord(webhookUrl, jokeEn, jokeEs) {
  const emojis = ['🤠', '💪', '👊', '🥋', '🎯', '⚡', '🔥', '💥', '🌟', '🦾'];
  const randomEmojis = [
    emojis[Math.floor(Math.random() * emojis.length)],
    emojis[Math.floor(Math.random() * emojis.length)]
  ];
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: `${randomEmojis[0]} **Chuck Norris Joke** ${randomEmojis[0]}\n${jokeEn}\n\n${randomEmojis[1]} **Chiste de Chuck Norris** ${randomEmojis[1]}\n${jokeEs}`,
      }),
    });
    
    if (!response.ok) throw new Error('Failed to send message to Discord');
    return true;
  } catch (error) {
    console.error('Error sending to Discord:', error);
    return false;
  }
}

let currentJoke = '';
let currentJokeEs = '';

async function updateJoke() {
  const jokeTextEn = document.getElementById('jokeTextEn');
  const jokeTextEs = document.getElementById('jokeTextEs');
  const button = document.getElementById('getJoke');
  const sendToDiscordBtn = document.getElementById('sendToDiscord');
  
  button.disabled = true;
  button.textContent = 'Loading...';
  
  try {
    currentJoke = await getChuckNorrisJoke();
    jokeTextEn.textContent = currentJoke;
    
    currentJokeEs = await translateToSpanish(currentJoke);
    jokeTextEs.textContent = currentJokeEs;
    
    const webhookUrl = document.getElementById('webhookUrl').value;
    sendToDiscordBtn.disabled = !webhookUrl;
  } catch (error) {
    console.error('Error:', error);
    jokeTextEn.textContent = 'An error occurred. Please try again.';
    jokeTextEs.textContent = 'Ocurrió un error. Por favor intente de nuevo.';
  } finally {
    button.disabled = false;
    button.textContent = 'Get New Joke';
  }
}

function setupDiscordIntegration() {
  const webhookInput = document.getElementById('webhookUrl');
  const sendToDiscordBtn = document.getElementById('sendToDiscord');
  const statusMessage = document.getElementById('discordStatus');
  
  webhookInput.addEventListener('input', (e) => {
    sendToDiscordBtn.disabled = !e.target.value;
    statusMessage.textContent = '';
    statusMessage.className = 'status-message';
  });
  
  sendToDiscordBtn.addEventListener('click', async () => {
    const webhookUrl = webhookInput.value;
    
    if (!currentJoke || !currentJokeEs) {
      statusMessage.textContent = 'Please generate a joke first!';
      statusMessage.className = 'status-message error';
      return;
    }
    
    sendToDiscordBtn.disabled = true;
    statusMessage.textContent = 'Sending...';
    statusMessage.className = 'status-message';
    
    const success = await sendToDiscord(webhookUrl, currentJoke, currentJokeEs);
    
    if (success) {
      statusMessage.textContent = 'Joke sent successfully!';
      statusMessage.className = 'status-message success';
    } else {
      statusMessage.textContent = 'Failed to send joke. Please check your webhook URL.';
      statusMessage.className = 'status-message error';
    }
    
    sendToDiscordBtn.disabled = !webhookUrl;
  });
}

async function updateSchedule(time, enabled) {
  try {
    const response = await fetch('https://your-glitch-project.glitch.me/update-cron', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        newTime: time,
        enabled: enabled
      }),
    });
    
    if (!response.ok) throw new Error('Failed to update schedule');
    return true;
  } catch (error) {
    console.error('Error updating schedule:', error);
    return false;
  }
}

function setupAutomation() {
  const scheduleTime = document.getElementById('scheduleTime');
  const updateScheduleBtn = document.getElementById('updateSchedule');
  const automationToggle = document.getElementById('automationToggle');
  const scheduleStatus = document.getElementById('scheduleStatus');
  
  updateScheduleBtn.addEventListener('click', async () => {
    const time = scheduleTime.value;
    const enabled = automationToggle.checked;
    
    scheduleStatus.textContent = 'Updating schedule...';
    scheduleStatus.className = 'status-message';
    
    const success = await updateSchedule(time, enabled);
    
    if (success) {
      scheduleStatus.textContent = 'Schedule updated successfully!';
      scheduleStatus.className = 'status-message success';
    } else {
      scheduleStatus.textContent = 'Failed to update schedule. Please try again.';
      scheduleStatus.className = 'status-message error';
    }
  });
  
  automationToggle.addEventListener('change', async () => {
    const time = scheduleTime.value;
    const enabled = automationToggle.checked;
    await updateSchedule(time, enabled);
  });
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('getJoke').addEventListener('click', updateJoke);
  setupDiscordIntegration();
  setupAutomation();
});