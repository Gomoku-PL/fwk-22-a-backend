const gameService = require('../services/game.service');

const isInt = (n) => Number.isInteger(n);

async function newGame(req, res) {
    try {
        const { size=15, firstPlayer='B', winLength=5, allowOverlines=true } = req.body || {};

        //400 validation errors
        if (!isInt(size) || size < 5 || size > 25) {
            return res.status(400).json({ error: 'INVALID_SIZE', message:'Size must be an integer between 5 and 25' });
        }
        if (!['B','W'].includes(firstPlayer)) {
            return res.status(400).json({ error: 'INVALID_FIRST_PLAYER', message:"First player must be 'B' or 'W'" });
        }
        if (!isInt(winLength) || winLength < 3 || winLength > size) {
            return res.status(400).json({ error: 'INVALID_WIN_LENGTH', message:`Win length must be an integer >=3 and <= ${size}` });
        }
        if (typeof allowOverlines !== 'boolean') {
            return res.status(400).json({ error: 'INVALID_OVERLINES', message:"Allow overlines must be a boolean" });
        }
        const dto = await gameService.createGame({ size, firstPlayer, winLength, allowOverlines });
        return res.status(201).json(dto);
    }
    catch (err) {
        console.error('Error in newGame:', err);
        return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to create game' });
    }
}
async function makeMove(req, res) {
    try {
        const { id } = req.params;
        const { x, y } = req.body || {};

        if(!id) {
            return res.status(400).json({ error: 'MISSING_GAME_ID', message: 'Game ID is required' });
        }
        if (!isInt(x) || !isInt(y)) {
            return res.status(400).json({ error: 'INVALID_COORDINATES', message: 'Coordinates x and y must be integers' });
        }
        const dto = await gameService.applyMove({ gameId: id, x, y });
        return res.status(200).json(dto);

    } catch (err) {
        switch (err.code) {
            case 'NOT_FOUND':
                return res.status(404).json({ error: err.code, message: err.message });
                case 'OUT_OF_BOUNDS':
                case 'OCCUPIED':
                    case 'InVALID_STATE':
                        return res.status(400).json({ error: err.code, message: err.message });
            case 'BAD_REQUEST':
                return res.status(400).json({ error: err.code, message: err.message });
            default:
                console.error('Error in makeMove:', err);
                return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to apply move' });
        }
    }
}
async function undoMove(req, res) {
    try {
        const { id } = req.params;
        const {steps=1} = req.body || {};

        if(!id) {
            return res.status(400).json({ error: 'MISSING_GAME_ID', message: 'Game ID is required' });
        }
        if (!isInt(steps) || steps < 1) {
            return res.status(400).json({ error: 'INVALID_STEPS', message: 'Steps must be a positive integer' });
        }
        const dto = await gameService.undoMove({ gameId: id, steps });
        return res.status(200).json(dto);
    } catch (err) {
        switch (err.code) {
            case 'NOT_FOUND':
                return res.status(404).json({ error: err.code, message: err.message });
                case 'NOTHING_TO_UNDO':
                    return res.status(400).json({ error: err.code, message: err.message });
            case 'BAD_REQUEST':
                return res.status(400).json({ error: err.code, message: err.message });
            default:
                console.error('Error in undoMove:', err);
                return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR', message: 'Failed to undo move' });
        }
    }
}
module.exports = { newGame, makeMove, undoMove };