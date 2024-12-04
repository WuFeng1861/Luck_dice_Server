const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BattleRoyaleBet = sequelize.define('BattleRoyaleBet', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '游戏场次ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  zone: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      min: 1,
      max: 8
    },
    comment: '下注区域'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '下注金额'
  },
  status: {
    type: DataTypes.ENUM('pending', 'win', 'lose', 'refunded'),
    defaultValue: 'pending',
    comment: '下注状态'
  },
  winAmount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '获胜金额'
  }
});

module.exports = BattleRoyaleBet;