const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Transaction = sequelize.define('Transaction', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  chainId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '链上交易ID'
  },
  hash: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '交易哈希'
  },
  coinName: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '币种名称'
  },
  type: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: '交易类型'
  },
  sender: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '发送地址'
  },
  receiver: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: '接收地址'
  },
  amount: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: '交易金额'
  },
  createTime: {
    type: DataTypes.BIGINT,
    allowNull: false,
    comment: '创建时间'
  },
  fee: {
    type: DataTypes.DECIMAL(36, 18),
    allowNull: false,
    comment: '手续费'
  },
  remark: {
    type: DataTypes.TEXT,
    comment: '备注'
  },
  processed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已处理'
  }
}, {
  tableName: 'Transactions',
  timestamps: true,
  indexes: [
    { fields: ['chainId'] },
    { fields: ['hash'], unique: true },
    { fields: ['sender'] },
    { fields: ['receiver'] },
    { fields: ['processed'] },
    { fields: ['createTime'] }
  ]
});

module.exports = Transaction;