INSERT INTO users (username, password, email, phone_number, role) VALUES
  ('alice', 'password1', 'alice@example.com', '1234567890', 'user'),
  ('bob', 'password2', 'bob@example.com', '0987654321', 'admin'),
  ('charlie', 'password3', 'charlie@example.com', NULL, 'user');

INSERT INTO games (name, description, createdBy, status) VALUES
  ('Game One', 'First test game', 1, 'planned'),
  ('Game Two', 'Second test game', 2, 'started');

INSERT INTO game_participants (gameID, userID, score) VALUES
  (1, 1, 10),
  (1, 2, 15),
  (2, 2, 20),
  (2, 3, 5);

INSERT INTO game_participants (gameID, userID, scoreID) VALUES
  (1, 1, 95),
  (1, 2, 45),
  (2, 2, 80),
  (2, 3, 25);

INSERT INTO refresh_tokens (token, userID, expires_at) VALUES
  ('token123', 1, '2026-04-01 00:00:00'),
  ('token456', 2, '2026-04-01 00:00:00');
