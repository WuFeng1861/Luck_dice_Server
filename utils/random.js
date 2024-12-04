const crypto = require('crypto');

/**
 * 生成指定范围内的密码学安全的随机整数
 * @param {number} min 最小值（包含）
 * @param {number} max 最大值（包含）
 * @returns {number} 生成的随机数
 */
function getSecureRandomInt(min, max) {
    if (min > max) throw new Error('Min cannot be greater than max');

    const range = max - min + 1;
    // 计算需要多少位来表示范围
    const bitsNeeded = Math.ceil(Math.log2(range));
    const bytesNeeded = Math.ceil(bitsNeeded / 8);
    // 计算最大有效值，确保均匀分布
    const maxValid = Math.pow(2, bitsNeeded) - (Math.pow(2, bitsNeeded) % range);

    let randomValue;
    do {
        const buffer = crypto.randomBytes(bytesNeeded);
        randomValue = 0;
        for (let i = 0; i < bytesNeeded; i++) {
            randomValue = (randomValue << 8) + buffer[i];
        }
        randomValue = randomValue & (Math.pow(2, bitsNeeded) - 1); // 保留需要的位数
    } while (randomValue >= maxValid); // 重新生成直到在有效范围内

    return min + (randomValue % range);
}

/**
 * 生成1-6之间的均匀分布的骰子点数
 * @returns {number} 1-6之间的随机数
 */
function rollDice() {
    return getSecureRandomInt(1, 6);
}

/**
 * 生成多个骰子的点数
 * @param {number} count 骰子数量
 * @returns {number[]} 骰子点数数组
 */
function rollMultipleDice(count) {
    return Array(count).fill(0).map(() => rollDice());
}

/**
 * 生成1-13之间的均匀分布的扑克牌点数
 * @returns {number} 1-13之间的随机数
 */
function drawCard() {
    return getSecureRandomInt(1, 13);
}

module.exports = {
    getSecureRandomInt,
    rollDice,
    rollMultipleDice,
    drawCard
};