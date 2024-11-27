const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
require('dotenv').config();

const sequelize = require('./config/database');
const swaggerSpecs = require('./config/swagger');
const authRoutes = require('./routes/auth');
const gameRoutes = require('./routes/game');
const errorMiddleware = require('./middleware/error');
const statsRoutes = require('./routes/stats');

const app = express();

// 中间件
app.use(cors());
app.use(express.json());

// Swagger 文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/game', gameRoutes);
app.use('/api/stats', statsRoutes);

// 错误处理
app.use(errorMiddleware);

// 数据库连接和表同步
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database connected and synced');
    
    // 启动服务器
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Swagger documentation available at http://localhost:${PORT}/api-docs`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
  }); 