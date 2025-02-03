const express = require('express');
const crypto = require('crypto');
const mongoose = require('mongoose');
const session = require('express-session');
const ngrok = require("ngrok")
const app = express();

// MongoDB User Schema
const userSchema = new mongoose.Schema({
  telegramId: { type: String, required: true, unique: true },
  username: String,
  firstName: String,
  lastName: String,
  photoUrl: String,
  authDate: Date
});

const User = mongoose.model('User', userSchema);

// Configure express-session
app.use(session({
  secret: 'your-session-secret',
  resave: false,
  saveUninitialized: false
}));

// Replace with your bot token from BotFather
const BOT_TOKEN = '7872322715:AAGSkfLfo8gIlJ2IWb-rBgNfda3C8MQgUmY';

// Function to verify Telegram authentication data
function verifyTelegramAuth(data) {
  console.log("req.query",data);
  const { hash, ...authData } = data;
  console.log("Auth Data-->",authData);
  // Sort keys alphabetically
  const dataCheckString = Object.keys(authData)
    .sort()
    .map(key => `${key}=${authData[key]}`)
    .join('\n');
  
  // Create a secret key using SHA256
  const secretKey = crypto
    .createHash('sha256')
    .update(BOT_TOKEN)
    .digest();
  
  // Generate hash using HMAC SHA256
  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');
    if(calculatedHash===hash){
  
      return calculatedHash === hash;
   }
}

// Route to handle Telegram authentication
app.get('/auth/telegram/callback', async (req, res) => {
  console.log("Welcome to Auth Section");
  try {
    // Verify the authentication data
    if (!verifyTelegramAuth(req.query)) {
      return res.status(401).json({ error: 'Authentication failed' });
    }

    // Check if auth date is not expired (authentication data is valid for 24 hours)
    const authDate = parseInt(req.query.auth_date) * 1000;
    if (Date.now() - authDate > 86400000) {
      return res.status(401).json({ error: 'Authentication expired' });
    }

    // Find or create user in database
    const userData = {
      telegramId: req.query.id,
      username: req.query.username,
      firstName: req.query.first_name,
      lastName: req.query.last_name,
      photoUrl: req.query.photo_url,
      authDate: new Date(authDate)
    };

    const user = await User.findOneAndUpdate(
      { telegramId: userData.telegramId },
      userData,
      { upsert: true, new: true }
    );

    // Set user session
    req.session.user = user;
    
    // Redirect to home page or dashboard
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Protected route example
app.get('/dashboard', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.json({ user: req.session.user });
});
app.get("/",(req,res)=>{
   res.send("Hello World");

})

// Login page route that includes Telegram Widget
app.get('/login', (req, res) => {
   console.log("welcome to login");
  res.send(`
  <html>
  <head>
    <title>Login with Telegram</title>
  </head>
  <body style="text-align: center; padding-top: 50px;">
    <h1>Welcome to Login Page</h1>
    <div id="telegram-login">
      <script 
        async 
        src="https://telegram.org/js/telegram-widget.js" 
        data-telegram-login="wistefBot" 
        data-size="large" 
        data-radius="20"
        data-auth-url="https://wistefbot.loca.lt/auth/telegram/callback"
        data-request-access="write">
      </script>
    </div>
  </body>
</html>
  `);
});

//Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/telegram-auth', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const localtunnel = require('localtunnel');

app.listen(2000, async () => {
  console.log('Server running on port 3000');
  const tunnel = await localtunnel({ 
    port: 2000,
    subdomain: 'wistefbot' // This will give you https://wistefbot.loca.lt
  });
  console.log('Tunnel URL:', tunnel.url);
});



          // <script async src="https://telegram.org/js/telegram-widget.js?22" data-telegram-login="wistefBot" data-size="large" data-onauth="onTelegramAuth(user)" data-request-access="write"></script>
          // <script type="text/javascript">
          //   function onTelegramAuth(user) {
          //     alert('Logged in as ' + user.first_name + ' ' + user.last_name + ' (' + user.id + (user.username ? ', @' + user.username : '') + ')');
          //   }
          // </script> 