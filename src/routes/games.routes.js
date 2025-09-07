const express = require('express');   
const router = express.Router();      


router.get('/health', (req, res) => { 
  res.json({ ok: true });             
});

// ≈≈≈ LITEN "MINNES-DATABAS" ≈≈≈
const games = new Map();

// Gör ett kort slump-id, t.ex. "k3f9x1a2"
const newId = () => Math.random().toString(36).slice(2, 10);

// POST /games  →  { id }
router.post('/games', (req, res) => {
  const id = newId();

  const state = {
    id,
    boardSize: 15,
    board: Array.from({ length: 15 }, () => Array(15).fill(null)), // 15x15 tomt bräde
    currentPlayer: 'X',
    moves: [],
    winner: null
  };

  games.set(id, state);       
  res.status(201).json({ id }); 
});

// GET /games/:id
router.get('/games/:id', (req, res) => {
    const { id } = req.params;        
    const game = games.get(id);       
  
    if (!game) {                    
      return res.status(404).json({ error: 'Game not found' });
    }
  
    res.json(game);                   
  });

  // POST /games/:id/moves 
router.post('/games/:id/moves', (req, res) => {
    const { id } = req.params;          
    const move = req.body ?? {};         
    const game = games.get(id);          
  
    if (!game) {
      return res.status(404).json({ error: 'Game not found' });
    }
  
    game.moves.push(move);              
    res.json({ id, ...move });        
  });
  

module.exports = router;
