const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const TransactionSync = sequelize.define('TransactionSync', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    lastProcessedId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        comment: '最后处理的交易ID'
    }
    },
    {
    tableName: 'TransactionSync',
    }
);

module.exports = TransactionSync;