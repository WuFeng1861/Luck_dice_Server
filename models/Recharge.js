const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Recharge = sequelize.define('Recharge', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '用户ID'
  },
  transactionId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '关联的交易ID'
  },
  amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: '充值金额'
  },
  status: {
    type: DataTypes.ENUM('pending', 'completed', 'failed'),
    defaultValue: 'pending',
    comment: '充值状态'
  }
}, {
  tableName: 'Recharges',
  timestamps: true,
  indexes: [
    {
      fields: ['userId'],
      unique: false,
      name: 'idx_userId'
    },
    {
      fields: ['transactionId'],
      unique: false,
      name: 'idx_transactionId'
    },
    {
      fields: ['status'],
      unique: false,
      name: 'idx_status'
    },
    {
      fields: ['createdAt'],
      unique: false,
      name: 'idx_createdAt'
    }
  ]
});

module.exports = Recharge;