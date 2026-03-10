CREATE TABLE `users` (
  `userID` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(255) NOT NULL,
  `password` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `role` enum('user','admin') DEFAULT 'user',
  `created_at` datetime DEFAULT current_timestamp(),
  `updated_at` datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`userID`),
  UNIQUE KEY `uq_users_username` (`username`),
  UNIQUE KEY `uq_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `games` (
  `gameID` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL DEFAULT 'Unnamed Game',
  `description` text DEFAULT NULL,
  `createdAt` datetime DEFAULT current_timestamp(),
  `startedAt` datetime DEFAULT NULL,
  `endedAt` datetime DEFAULT NULL,
  `status` enum('planned','started','ended','processed') DEFAULT 'planned',
  `createdBy` int(11) DEFAULT NULL,
  `winner_userID` int(11) DEFAULT NULL,
  `participantID` int(11) DEFAULT NULL,
  PRIMARY KEY (`gameID`),
  KEY `createdBy` (`createdBy`),
  KEY `winner_userID` (`winner_userID`),
  CONSTRAINT `games_ibfk_1` FOREIGN KEY (`createdBy`) REFERENCES `users` (`userID`) ON DELETE SET NULL,
  CONSTRAINT `games_ibfk_2` FOREIGN KEY (`winner_userID`) REFERENCES `users` (`userID`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE `game_participants` (
  `participantID` int(11) NOT NULL AUTO_INCREMENT,
  `gameID` int(11) NOT NULL,
  `userID` int(11) NOT NULL,
  `score` int(11) DEFAULT NULL,
  PRIMARY KEY (`participantID`),
  KEY `gameID` (`gameID`),
  KEY `userID` (`userID`),
  CONSTRAINT `game_participants_ibfk_1` FOREIGN KEY (`gameID`) REFERENCES `games` (`gameID`) ON DELETE CASCADE,
  CONSTRAINT `game_participants_ibfk_2` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

ALTER TABLE `games`
  ADD KEY `participantID` (`participantID`),
  ADD CONSTRAINT `games_ibfk_3` FOREIGN KEY (`participantID`) REFERENCES `game_participants` (`participantID`) ON DELETE SET NULL;

CREATE TABLE `refresh_tokens` (
  `token` varchar(255) NOT NULL,
  `userID` int(11) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime DEFAULT current_timestamp(),
  PRIMARY KEY (`token`),
  KEY `userID` (`userID`),
  CONSTRAINT `refresh_tokens_ibfk_1` FOREIGN KEY (`userID`) REFERENCES `users` (`userID`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
