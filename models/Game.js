const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Game = sequelize.define('Game', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  gameType: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      isIn: [['single', 'triple', 'dragon-tiger']]
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  selectedOption: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'none'
  },
  diceResults: {
    type: DataTypes.JSON,
    allowNull: false
  },
  win: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  finalBalance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  }
});

module.exports = Game; 