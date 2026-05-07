// __tests__/helpers/testUtils.js
/**
 * Test utilities and mock helpers
 */

/**
 * Mock database query function
 */
const mockQuery = jest.fn();

/**
 * Reset all mocks
 */
const resetMocks = () => {
  mockQuery.mockClear();
};

/**
 * Sample test data
 */
const testData = {
  users: {
    testUser1: {
      userID: 1,
      username: 'testuser1',
      email: 'test1@example.com',
      password: 'hashedPassword123',
      role: 'user',
      elo: 1200,
      phone_number: '1234567890',
      created_at: new Date('2024-01-01'),
    },
    testUser2: {
      userID: 2,
      username: 'testuser2',
      email: 'test2@example.com',
      password: 'hashedPassword456',
      role: 'user',
      elo: 1150,
      phone_number: '0987654321',
      created_at: new Date('2024-01-02'),
    },
    admin: {
      userID: 3,
      username: 'admin',
      email: 'admin@example.com',
      password: 'hashedAdminPassword',
      role: 'admin',
      elo: 1500,
      phone_number: '5555555555',
      created_at: new Date('2023-12-01'),
    },
  },
  games: {
    game1: {
      gameID: 1,
      player1ID: 1,
      player2ID: 2,
      winner_id: 1,
      score_player1: 21,
      score_player2: 18,
      elo_change_p1: 12,
      elo_change_p2: -12,
      created_at: new Date('2024-01-15'),
    },
  },
  tokens: {
    validAccessToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDQwNzIwMDB9.test',
    validRefreshToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InVzZXIiLCJpYXQiOjE3MDQwNzIwMDB9.testRefresh',
    expiredToken:
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwicm9sZSI6InVzZXIiLCJleHAiOjE2OTAwMDAwMDB9.expired',
  },
};

module.exports = {
  mockQuery,
  resetMocks,
  testData,
};
