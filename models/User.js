const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const BigNumber = require('bignumber.js');
const bcrypt = require('bcryptjs');

// 配置 BigNumber，设置更严格的精度控制
BigNumber.config({
  DECIMAL_PLACES: 2,           // 保留2位小数
  ROUNDING_MODE: BigNumber.ROUND_DOWN,  // 向下取整
  EXPONENTIAL_AT: [-10, 20],   // 控制科学计数法的范围
  RANGE: [-1e9, 1e9],         // 限制数值范围
  CRYPTO: false,              // 不使用密码学随机数
  MODULO_MODE: BigNumber.ROUND_DOWN,  // 取模时向下取整
  FORMAT: {
    decimalSeparator: '.',     // 小数点符号
    groupSeparator: '',        // 不使用千位分隔符
    groupSize: 0,              // 不分组
    secondaryGroupSize: 0,     // 不使用二级分组
    fractionGroupSeparator: '', // 小数部分不使用分隔符
    fractionGroupSize: 0       // 小数部分不分组
  }
});

class User extends Model {
  async updateBalance(amount) {
    try {
      // 转换为 BigNumber 并验证输入
      const currentBalance = new BigNumber(this.balance);
      const changeAmount = new BigNumber(amount);

      // 验证金额是否合法
      if (!changeAmount.isFinite()) {
        throw new Error('无效的金额');
      }

      // 计算新余额
      const newBalance = currentBalance.plus(changeAmount);

      // 检查余额是否会变成负数
      if (newBalance.isLessThan(0)) {
        throw new Error('余额不足');
      }

      // 检查余额是否超出范围
      if (newBalance.isGreaterThan(new BigNumber('1e9'))) {
        throw new Error('余额超出限制');
      }

      // 更新余额，强制保留2位小数
      const formattedBalance = newBalance.toFixed(2, BigNumber.ROUND_DOWN);
      
      // 再次验证格式化后的余额
      const finalBalance = new BigNumber(formattedBalance);
      if (!finalBalance.isEqualTo(newBalance)) {
        throw new Error('余额精度异常');
      }

      this.balance = formattedBalance;
      await this.save();
      return this.balance;

    } catch (error) {
      if (error.message === '余额不足' || 
          error.message === '无效的金额' || 
          error.message === '余额超出限制' ||
          error.message === '余额精度异常') {
        throw error;
      }
      throw new Error('余额更新失败');
    }
  }
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  };
}

User.init({
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  balance: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0,
    validate: {
      min: 0,
      isDecimal: true,
      // 自定义验证器确保精度
      isValidAmount(value) {
        const amount = new BigNumber(value);
        if (!amount.isFinite() || 
            amount.isLessThan(0) || 
            amount.isGreaterThan(new BigNumber('1e9')) ||
            !amount.isEqualTo(amount.toFixed(2))) {
          throw new Error('无效的余额金额');
        }
      }
    }
  }
}, {
  sequelize,
  modelName: 'User',
  timestamps: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      }
    }
  }
});

module.exports = User; 