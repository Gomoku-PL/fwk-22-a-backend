const express = require("express");
const app = express();
const PORT = 4000;

app.use(express.json());
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.use(express.json()); 

const gamesRoutes = require('./routes/games.routes'); 
app.use('/', gamesRoutes); 

