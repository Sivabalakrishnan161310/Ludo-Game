const { analyseBoardSituation } = require('./analyseBoardSituation');
const { pickDice_Peaceful, pickDice_Tense, pickDice_Critical } = require('./dicePickers');
const { selectMove_Peaceful, selectMove_Tense, selectMove_Critical } = require('./moveSelectors');

function getEngineDecision(gameState) {
  const { players, currentPlayerId } = gameState;
  const currentPlayer = players.find(p => p.id === currentPlayerId);

  // Layer 1: analyse the board
  const { gameState_label, totalTension, scores } = analyseBoardSituation(gameState);

  // Layer 2: pick the dice roll
  let chosenRoll;
  if      (gameState_label === 'PEACEFUL')  chosenRoll = pickDice_Peaceful(players);
  else if (gameState_label === 'TENSE')     chosenRoll = pickDice_Tense(players);
  else                                      chosenRoll = pickDice_Critical(players);

  // Layer 3: pick which coin to move (we'll calculate this in case we need it for bots, 
  // but as requested, we won't force it on humans)
  let chosenCoin;
  if      (gameState_label === 'PEACEFUL')  chosenCoin = selectMove_Peaceful(currentPlayer, chosenRoll, players);
  else if (gameState_label === 'TENSE')     chosenCoin = selectMove_Tense(currentPlayer, chosenRoll, players);
  else                                      chosenCoin = selectMove_Critical(currentPlayer, chosenRoll, players);

  return {
    roll:        chosenRoll,
    coinId:      chosenCoin ? chosenCoin.id : null,
    state:       gameState_label,
    tension:     totalTension,
    scores:      scores
  };
}

module.exports = {
  getEngineDecision
};
