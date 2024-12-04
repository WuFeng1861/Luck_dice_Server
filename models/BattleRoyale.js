const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const BattleRoyale = sequelize.define('BattleRoyale', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  gameId: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: '游戏场次ID'
  },
  status: {
    type: DataTypes.ENUM('waiting', 'running', 'settling', 'finished'),
    defaultValue: 'waiting',
    comment: '游戏状态'
  },
  startTime: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '游戏开始时间'
  },
  endTime: {
    type: DataTypes.DATE,
    allowNull: false,
    comment: '游戏结束时间'
  },
  safeZones: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: '安全区域数组字符串',
    get() {
      const value = this.getDataValue('safeZones');
      return value ? JSON.parse(value) : null;
    },
    set(value) {
      this.setDataValue('safeZones', value ? JSON.stringify(value) : null);
    }
  },
  totalBets: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0,
    comment: '总下注金额'
  },
  isValid: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    comment: '是否有效场次'
  }
});

module.exports = BattleRoyale;