CREATE DATABASE IF NOT EXISTS merc_game;

USE merc_game;

CREATE TABLE IF NOT EXISTS Users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  balance DECIMAL(10, 2) DEFAULT 0.00,
  address VARCHAR(255),
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_username (username)
);

CREATE TABLE IF NOT EXISTS Games (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  gameType VARCHAR(20) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  selectedOption VARCHAR(20) NOT NULL,
  diceResults JSON NOT NULL,
  win BOOLEAN NOT NULL,
  finalBalance DECIMAL(10, 2) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id)
);

CREATE TABLE IF NOT EXISTS Transactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  chainId INT NOT NULL,
  hash VARCHAR(255) NOT NULL UNIQUE,
  coinName VARCHAR(50) NOT NULL,
  type INT NOT NULL,
  sender VARCHAR(255) NOT NULL,
  receiver VARCHAR(255) NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  createTime BIGINT NOT NULL,
  fee DECIMAL(36, 18) NOT NULL,
  remark TEXT,
  processed BOOLEAN DEFAULT FALSE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_chainId (chainId),
  INDEX idx_hash (hash),
  INDEX idx_sender (sender),
  INDEX idx_receiver (receiver),
  INDEX idx_processed (processed)
);

CREATE TABLE IF NOT EXISTS Recharges (
  id INT PRIMARY KEY AUTO_INCREMENT,
  userId INT NOT NULL,
  transactionId INT NOT NULL,
  amount DECIMAL(36, 18) NOT NULL,
  status ENUM('pending', 'completed', 'failed') DEFAULT 'pending',
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id),
  FOREIGN KEY (transactionId) REFERENCES Transactions(id),
  INDEX idx_userId (userId),
  INDEX idx_status (status),
  INDEX idx_transactionId (transactionId),
  INDEX idx_createdAt (createdAt)
);

CREATE TABLE IF NOT EXISTS BattleRoyales (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gameId VARCHAR(36) NOT NULL UNIQUE,
  status ENUM('waiting', 'running', 'settling', 'finished') DEFAULT 'waiting',
  startTime DATETIME NOT NULL,
  endTime DATETIME NOT NULL,
  safeZones VARCHAR(255),
  totalBets DECIMAL(10, 2) DEFAULT 0,
  isValid BOOLEAN DEFAULT TRUE,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_gameId (gameId),
  INDEX idx_status (status),
  INDEX idx_startTime (startTime),
  INDEX idx_endTime (endTime)
);

CREATE TABLE IF NOT EXISTS BattleRoyaleBets (
  id INT PRIMARY KEY AUTO_INCREMENT,
  gameId VARCHAR(36) NOT NULL,
  userId INT NOT NULL,
  zone INT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'win', 'lose', 'refunded') DEFAULT 'pending',
  winAmount DECIMAL(10, 2) DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (userId) REFERENCES Users(id),
  INDEX idx_gameId (gameId),
  INDEX idx_userId (userId),
  INDEX idx_status (status)
);

CREATE TABLE IF NOT EXISTS BattleRoyaleProfits (
  id INT PRIMARY KEY AUTO_INCREMENT,
  roundId INT NOT NULL,
  userId INT NOT NULL,
  username VARCHAR(255) NOT NULL,
  profit DECIMAL(10, 2) NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_round_id (roundId),
  INDEX idx_user_id (userId)
);

CREATE TABLE IF NOT EXISTS TransactionSync (
  id INT PRIMARY KEY AUTO_INCREMENT,
  lastProcessedId INT NOT NULL,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert initial sync record
INSERT INTO TransactionSync (lastProcessedId) VALUES (1);