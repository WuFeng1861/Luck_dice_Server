const sequelize = require('../config/database');
const User = require('./User');
const Transaction = require('./Transaction');
const TransactionSync = require('./TransactionSync');
const Recharge = require('./Recharge');

// 定义模型关联关系（不使用外键约束）
Transaction.hasMany(Recharge, {
  foreignKey: 'transactionId',
  as: 'rechargeRecords',
  constraints: false
});

Recharge.belongsTo(Transaction, {
  foreignKey: 'transactionId',
  as: 'transactionDetails',
  constraints: false
});

User.hasMany(Recharge, {
  foreignKey: 'userId',
  as: 'rechargeHistory',
  constraints: false
});

Recharge.belongsTo(User, {
  foreignKey: 'userId',
  as: 'rechargeOwner',
  constraints: false
});

module.exports = {
  sequelize,
  User,
  Transaction,
  TransactionSync,
  Recharge
};