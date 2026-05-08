const { query, transaction } = require("../config/database");

/**
 * Build a round-robin schedule for the provided participants.
 * Assigns fields per round starting at 1.
 *
 * @param {Array<{userId: number, username: string}>} participants
 * @returns {{ rounds: Array, playerRounds: Array }}
 */
const buildRoundRobinSchedule = (participants) => {
  if (!Array.isArray(participants) || participants.length === 0) {
    return { rounds: [], playerRounds: [] };
  }

  const roster = [...participants]
    .sort((a, b) => a.userId - b.userId)
    .map((p) => ({ userId: p.userId, username: p.username }));

  const working = [...roster];
  if (working.length % 2 !== 0) {
    working.push(null);
  }

  const total = working.length;
  const rounds = [];

  for (let roundNumber = 1; roundNumber <= total - 1; roundNumber++) {
    const matches = [];
    const sittingOut = [];
    let fieldNumber = 1;

    for (let i = 0; i < total / 2; i++) {
      const playerA = working[i];
      const playerB = working[total - 1 - i];

      if (!playerA && !playerB) {
        continue;
      }

      if (!playerA || !playerB) {
        sittingOut.push(playerA || playerB);
        continue;
      }

      matches.push({
        field: fieldNumber,
        playerA,
        playerB,
      });
      fieldNumber += 1;
    }

    rounds.push({
      round: roundNumber,
      matches,
      sittingOut,
    });

    const rotated = [
      working[0],
      working[total - 1],
      ...working.slice(1, total - 1),
    ];
    for (let index = 0; index < total; index++) {
      working[index] = rotated[index];
    }
  }

  const playerRounds = roster.map((player) => {
    const roundsForPlayer = rounds.map((round) => {
      const match = round.matches.find(
        (m) =>
          m.playerA.userId === player.userId ||
          m.playerB.userId === player.userId,
      );

      if (match) {
        const opponent =
          match.playerA.userId === player.userId
            ? match.playerB
            : match.playerA;
        return {
          round: round.round,
          opponent,
          field: match.field,
          isSittingOut: false,
        };
      }

      const isSittingOut = round.sittingOut.some(
        (sittingPlayer) => sittingPlayer.userId === player.userId,
      );
      return {
        round: round.round,
        opponent: null,
        field: null,
        isSittingOut: isSittingOut,
      };
    });

    return {
      userId: player.userId,
      username: player.username,
      rounds: roundsForPlayer,
    };
  });

  return { rounds, playerRounds };
};

/**
 * Create a new game
 * @param {Object} gameData - Game data
 * @param {number} creatorId - ID of the user creating the game
 * @returns {Object} Created game object
 */
const createGame = async (gameData, creatorId) => {
  const { name, description, plannedAt, startedAt, endedAt, status } = gameData;

  const result = await query(
    "INSERT INTO games (name, description, plannedAt, startedAt, endedAt, createdBy) VALUES (?, ?, ?, ?, ?, ?)",
    [
      name || "Unnamed Game",
      description || null,
      plannedAt || null,
      startedAt || null,
      endedAt || null,
      creatorId,
    ],
  );

  return {
    id: result.insertId,
    name: name || "Unnamed Game",
    description,
    plannedAt: plannedAt || null,
    startedAt,
    endedAt,
    status: status || "planned",
    createdBy: creatorId,
  };
};

/**
 * Get all games
 * @returns {Array} Array of all games
 */
const getAllGames = async () => {
  const games = await query(`
    SELECT * FROM games WHERE status = 'planned' ORDER BY createdAt DESC
  `);

  if (games.length === 0) return [];

  const gameIds = games.map((g) => g.gameID);
  const placeholders = gameIds.map(() => "?").join(",");
  const participants = await query(
    `SELECT gp.gameID, gp.userID, u.username, u.elo
     FROM game_participants gp
     JOIN users u ON gp.userID = u.userID
     WHERE gp.gameID IN (${placeholders})`,
    gameIds,
  );

  const participantsByGame = {};
  for (const p of participants) {
    if (!participantsByGame[p.gameID]) participantsByGame[p.gameID] = [];
    participantsByGame[p.gameID].push({
      userId: p.userID,
      username: p.username,
      elo: p.elo,
    });
  }

  return games.map((game) => {
    const gameParticipants = participantsByGame[game.gameID] || [];
    const averageElo =
      gameParticipants.length > 0
        ? Math.round(
            gameParticipants.reduce((sum, p) => sum + p.elo, 0) /
              gameParticipants.length,
          )
        : null;

    return {
      id: game.gameID,
      name: game.name,
      description: game.description,
      plannedAt: game.plannedAt,
      createdAt: game.createdAt,
      startedAt: game.startedAt,
      endedAt: game.endedAt,
      status: game.status,
      createdBy: game.createdBy,
      winnerUserId: game.winner_userID,
      signupCount: gameParticipants.length,
      averageElo,
    };
  });
};

/**
 * Get game by ID
 * @param {number} gameId - Game ID
 * @returns {Object|null} Game object or null if not found
 */
const getGameById = async (gameId) => {
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    return null;
  }

  const game = games[0];

  // Get participants
  const participants = await query(
    `SELECT gp.participantID, gp.userID, u.elo, u.username
     FROM game_participants gp
     JOIN users u ON gp.userID = u.userID
     WHERE gp.gameID = ?`,
    [gameId],
  );

  const participantData = participants.map((p) => ({
    id: p.participantID,
    userId: p.userID,
    username: p.username,
    elo: p.elo,
  }));

  return {
    id: game.gameID,
    name: game.name,
    description: game.description,
    plannedAt: game.plannedAt,
    createdAt: game.createdAt,
    startedAt: game.startedAt,
    endedAt: game.endedAt,
    status: game.status,
    createdBy: game.createdBy,
    winnerUserId: game.winner_userID,
    participants: participantData,
    schedule: buildRoundRobinSchedule(participantData),
  };
};

/**
 * Get schedule for a game with rounds, opponents and fields.
 * @param {number} gameId - Game ID
 * @returns {Object|null} Schedule object or null if game not found
 */
const getGameSchedule = async (gameId) => {
  const game = await getGameById(gameId);

  if (!game) {
    return null;
  }

  return {
    gameId: game.id,
    name: game.name,
    status: game.status,
    participantCount: game.participants.length,
    rounds: game.schedule.rounds,
    playerRounds: game.schedule.playerRounds,
  };
};

/**
 * Sign up for a game
 * @param {number} gameId - Game ID
 * @param {number} userId - User ID
 * @param {number} adminId - Admin ID (optional, if added by admin)
 * @returns {Object} Signup object
 * @throws {Error} If already signed up or game not found
 */
const signupForGame = async (gameId, userId, adminId = null) => {
  // Check if game exists
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  // Check if user has been removed from this game
  const removedCheck = await query(
    "SELECT * FROM removed_game_participants WHERE gameID = ? AND userID = ?",
    [gameId, userId],
  );

  if (removedCheck.length > 0) {
    const error = new Error("You have been removed from this game and cannot rejoin");
    error.status = 403;
    throw error;
  }

  // Check if already signed up
  const existingSignups = await query(
    "SELECT * FROM game_participants WHERE gameID = ? AND userID = ?",
    [gameId, userId],
  );

  if (existingSignups.length > 0) {
    const error = new Error("Already signed up for this game");
    error.status = 409;
    throw error;
  }

  const result = await query(
    "INSERT INTO game_participants (gameID, userID, added_by_admin, added_by_admin_id) VALUES (?, ?, ?, ?)",
    [gameId, userId, adminId ? 1 : 0, adminId || null],
  );

  return {
    id: result.insertId,
    gameId,
    userId,
    addedByAdmin: adminId ? true : false,
  };
};

/**
 * Remove a user from a game
 * @param {number} gameId - Game ID
 * @param {number} userId - User ID
 * @throws {Error} If not signed up, game not found, or user was added by admin
 */
const leaveGame = async (gameId, userId) => {
  // Check if game exists
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  // Check if user is signed up
  const existingSignups = await query(
    "SELECT * FROM game_participants WHERE gameID = ? AND userID = ?",
    [gameId, userId],
  );

  if (existingSignups.length === 0) {
    const error = new Error("User is not signed up for this game");
    error.status = 409;
    throw error;
  }

  // Check if user was added by admin - they cannot leave
  const participant = existingSignups[0];
  if (participant.added_by_admin) {
    const error = new Error("You cannot leave this game because you were added by an admin");
    error.status = 403;
    throw error;
  }

  await query("DELETE FROM game_participants WHERE gameID = ? AND userID = ?", [
    gameId,
    userId,
  ]);
};

/**
 * Calculate new ELO ratings using the standard ELO formula.
 * In a multi-player context the winner is paired against every other
 * participant; each loser is paired against the winner only.
 *
 * @param {number} ratingA - Current ELO of player A
 * @param {number} ratingB - Current ELO of player B
 * @param {number} scoreA  - Actual score for A (1 = win, 0 = loss, 0.5 = draw)
 * @param {number} K       - K-factor (default 32)
 * @returns {{ newA: number, newB: number }}
 */
const calculateElo = (ratingA, ratingB, scoreA, K = 32) => {
  const expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
  const expectedB = 1 - expectedA;
  return {
    newA: Math.round(ratingA + K * (scoreA - expectedA)),
    newB: Math.round(ratingB + K * (1 - scoreA - expectedB)),
  };
};

/**
 * Move a game from 'planned' to 'started'.
 * @param {number} gameId
 * @returns {Object} Updated game
 */
const startGame = async (gameId) => {
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);
  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }
  if (games[0].status !== "planned") {
    const error = new Error(
      `Game cannot be started from status '${games[0].status}'`,
    );
    error.status = 409;
    throw error;
  }

  await query(
    "UPDATE games SET status = 'started', startedAt = NOW(), current_round = 1 WHERE gameID = ?",
    [gameId],
  );

  return {
    ...(await query("SELECT * FROM games WHERE gameID = ?", [gameId]))[0],
  };
};

/**
 * Move a game from 'started' to 'ended'.
 * @param {number} gameId
 * @returns {Object} Updated game
 */
const endGame = async (gameId) => {
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);
  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }
  if (games[0].status !== "started") {
    const error = new Error(
      `Game cannot be ended from status '${games[0].status}'`,
    );
    error.status = 409;
    throw error;
  }

  await query(
    "UPDATE games SET status = 'ended', endedAt = NOW() WHERE gameID = ?",
    [gameId],
  );

  return {
    ...(await query("SELECT * FROM games WHERE gameID = ?", [gameId]))[0],
  };
};

/**
 * Process a finished game: record scores, determine ELO deltas, write
 * historical_elo rows (which trigger users.elo update), and mark 'processed'.
 *
 * @param {number} gameId   - Game to process
 * @param {number} winnerId - userID of the winner
 * @param {Array}  scores   - [{ userId, score }] — final scores per participant
 * @returns {Object} Summary of ELO changes
 */
const processGame = async (gameId, winnerId, scores) => {
  return transaction(async (conn) => {
    // 1. Validate game state
    const [game] = await conn.execute("SELECT * FROM games WHERE gameID = ?", [
      gameId,
    ]);
    if (game.length === 0) {
      const error = new Error("Game not found");
      error.status = 404;
      throw error;
    }
    if (game[0].status !== "ended") {
      const error = new Error(
        `Game must be in 'ended' state to process (current: '${game[0].status}')`,
      );
      error.status = 409;
      throw error;
    }

    // 2. Load participants and their current ELO ratings
    const [participants] = await conn.execute(
      `SELECT gp.participantID, gp.userID, u.elo
       FROM game_participants gp
       JOIN users u ON u.userID = gp.userID
       WHERE gp.gameID = ?`,
      [gameId],
    );

    if (participants.length < 2) {
      const error = new Error(
        "A game needs at least 2 participants to process",
      );
      error.status = 422;
      throw error;
    }

    // 3. Validate winner is a participant
    const winnerEntry = participants.find((p) => p.userID === winnerId);
    if (!winnerEntry) {
      const error = new Error("Winner is not a participant in this game");
      error.status = 422;
      throw error;
    }

    // 4. Update each participant's score in game_participants
    for (const { userId, score } of scores) {
      await conn.execute(
        "UPDATE game_participants SET score = ? WHERE gameID = ? AND userID = ?",
        [score, gameId, userId],
      );
    }

    // 5. Calculate ELO changes
    // Winner is paired against every other participant; losers are only
    // paired against the winner (standard multi-player ELO approach).
    const eloMap = Object.fromEntries(
      participants.map((p) => [p.userID, p.elo]),
    );
    const eloChanges = Object.fromEntries(
      participants.map((p) => [p.userID, 0]),
    );

    const losers = participants.filter((p) => p.userID !== winnerId);
    for (const loser of losers) {
      const { newA, newB } = calculateElo(
        eloMap[winnerId] + eloChanges[winnerId],
        eloMap[loser.userID] + eloChanges[loser.userID],
        1, // winner wins
      );
      eloChanges[winnerId] = newA - eloMap[winnerId];
      eloChanges[loser.userID] = newB - eloMap[loser.userID];
    }

    // 6. Insert historical_elo rows — the DB trigger updates users.elo
    const eloResults = [];
    for (const participant of participants) {
      const { userID, elo: oldElo } = participant;
      const newElo = oldElo + eloChanges[userID];

      await conn.execute(
        "INSERT INTO historical_elo (userID, elo) VALUES (?, ?)",
        [userID, newElo],
      );

      eloResults.push({
        userId: userID,
        isWinner: userID === winnerId,
        oldElo,
        newElo,
        change: eloChanges[userID],
      });
    }

    // 7. Mark game as processed and set winner
    await conn.execute(
      "UPDATE games SET status = 'processed', winner_userID = ? WHERE gameID = ?",
      [winnerId, gameId],
    );

    return {
      gameId,
      winnerId,
      eloChanges: eloResults,
    };
  });
};

module.exports = {
  createGame,
  getAllGames,
  getGameById,
  getGameSchedule,
  signupForGame,
  leaveGame,
  startGame,
  endGame,
  processGame,
  removeUserFromGameAsAdmin,
  getCurrentRound,
  setCurrentRound,
  sendMatchRequest,
  respondToMatchRequest,
  getMatchRequests,
};

/**
 * Remove a user from a game (admin only) and record in removed_game_participants
 * @param {number} gameId - Game ID
 * @param {number} userId - User ID to remove
 * @param {number} adminId - Admin ID performing the removal
 * @param {string} reason - Reason for removal (optional)
 * @throws {Error} If user not found in game
 */
async function removeUserFromGameAsAdmin(gameId, userId, adminId, reason = null) {
  // Check if user is signed up
  const existingSignups = await query(
    "SELECT * FROM game_participants WHERE gameID = ? AND userID = ?",
    [gameId, userId],
  );

  if (existingSignups.length === 0) {
    const error = new Error("User is not signed up for this game");
    error.status = 409;
    throw error;
  }

  // Remove user from game_participants
  await query("DELETE FROM game_participants WHERE gameID = ? AND userID = ?", [
    gameId,
    userId,
  ]);

  // Record removal in removed_game_participants
  await query(
    "INSERT INTO removed_game_participants (gameID, userID, removed_by_admin_id, reason) VALUES (?, ?, ?, ?)",
    [gameId, userId, adminId, reason],
  );
}

/**
 * Get current round for a game
 * @param {number} gameId - Game ID
 * @returns {number|null} Current round number or null if not started
 */
async function getCurrentRound(gameId) {
  const games = await query("SELECT current_round FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  return games[0].current_round;
}

/**
 * Set current round for a game (admin only)
 * @param {number} gameId - Game ID
 * @param {number} roundNumber - Round number to set
 * @throws {Error} If game not found or invalid round
 */
async function setCurrentRound(gameId, roundNumber) {
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);

  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  if (roundNumber < 1) {
    const error = new Error("Round number must be at least 1");
    error.status = 422;
    throw error;
  }

  await query("UPDATE games SET current_round = ? WHERE gameID = ?", [roundNumber, gameId]);

  return { gameId, currentRound: roundNumber };
}

/**
 * Send a match request to another player for a specific game
 * @param {number} gameId - Game ID
 * @param {number} requestedByUserId - User ID sending the request
 * @param {number} requestedForUserId - User ID the request is for
 * @param {string} message - Optional message with the request
 * @returns {Object} Created match request
 */
async function sendMatchRequest(gameId, requestedByUserId, requestedForUserId, message = null) {
  // Check if game exists
  const games = await query("SELECT * FROM games WHERE gameID = ?", [gameId]);
  if (games.length === 0) {
    const error = new Error("Game not found");
    error.status = 404;
    throw error;
  }

  // Check if both users exist
  const users = await query(
    "SELECT userID FROM users WHERE userID IN (?, ?)",
    [requestedByUserId, requestedForUserId],
  );

  if (users.length !== 2) {
    const error = new Error("One or both users not found");
    error.status = 404;
    throw error;
  }

  // Check if request already exists
  const existingRequest = await query(
    "SELECT * FROM match_requests WHERE gameID = ? AND requested_by_user_id = ? AND requested_for_user_id = ?",
    [gameId, requestedByUserId, requestedForUserId],
  );

  if (existingRequest.length > 0) {
    const error = new Error("Match request already exists");
    error.status = 409;
    throw error;
  }

  const result = await query(
    "INSERT INTO match_requests (gameID, requested_by_user_id, requested_for_user_id, message) VALUES (?, ?, ?, ?)",
    [gameId, requestedByUserId, requestedForUserId, message],
  );

  return {
    id: result.insertId,
    gameId,
    requestedByUserId,
    requestedForUserId,
    status: "pending",
    message,
    createdAt: new Date(),
  };
}

/**
 * Respond to a match request (accept or reject)
 * @param {number} requestId - Match request ID
 * @param {string} status - 'accepted' or 'rejected'
 * @returns {Object} Updated match request
 */
async function respondToMatchRequest(requestId, status) {
  if (!["accepted", "rejected"].includes(status)) {
    const error = new Error("Status must be 'accepted' or 'rejected'");
    error.status = 422;
    throw error;
  }

  const requests = await query("SELECT * FROM match_requests WHERE id = ?", [requestId]);

  if (requests.length === 0) {
    const error = new Error("Match request not found");
    error.status = 404;
    throw error;
  }

  const request = requests[0];

  // If accepting, sign up the user for the game
  if (status === "accepted") {
    try {
      await signupForGame(request.gameID, request.requested_for_user_id);
    } catch (error) {
      // If signup fails, still update the request status but throw error
      await query("UPDATE match_requests SET status = ? WHERE id = ?", [status, requestId]);
      throw error;
    }
  }

  await query("UPDATE match_requests SET status = ? WHERE id = ?", [status, requestId]);

  return {
    id: requestId,
    gameId: request.gameID,
    requestedByUserId: request.requested_by_user_id,
    requestedForUserId: request.requested_for_user_id,
    status,
    updatedAt: new Date(),
  };
}

/**
 * Get match requests for a user
 * @param {number} userId - User ID
 * @param {string} status - Filter by status ('pending', 'accepted', 'rejected', 'cancelled')
 * @returns {Array} Array of match requests
 */
async function getMatchRequests(userId, status = null) {
  let query_string = `
    SELECT mr.*, g.name as game_name, u.username as requested_by_username
    FROM match_requests mr
    JOIN games g ON mr.gameID = g.gameID
    JOIN users u ON mr.requested_by_user_id = u.userID
    WHERE mr.requested_for_user_id = ?
  `;
  const params = [userId];

  if (status) {
    query_string += " AND mr.status = ?";
    params.push(status);
  }

  query_string += " ORDER BY mr.created_at DESC";

  const requests = await query(query_string, params);

  return requests.map((r) => ({
    id: r.id,
    gameId: r.gameID,
    gameName: r.game_name,
    requestedByUserId: r.requested_by_user_id,
    requestedByUsername: r.requested_by_username,
    status: r.status,
    message: r.message,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));
}
