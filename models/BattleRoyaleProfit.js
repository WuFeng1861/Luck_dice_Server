const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BattleRoyaleProfit = sequelize.define('BattleRoyaleProfit', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  roundId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '游戏场次ID'
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '用户名称'
  },
  profit: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '收益金额'
  }
}, {
  tableName: 'BattleRoyaleProfits',
  indexes: [
    {
      fields: ['roundId'],
      name: 'idx_round_id',
      unique: true,
    },
    {
      fields: ['userId'],
      name: 'idx_user_id'
    }
  ]
});

module.exports = BattleRoyaleProfit;