const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'mysql',
        logging: false,
        timezone: '+08:00', // 设置时区为东八区
        dialectOptions: {
            dateStrings: true,
            typeCast: true,
            timezone: '+08:00' // 确保MySQL连接也使用正确的时区
        },
    }
);

module.exports = sequelize;