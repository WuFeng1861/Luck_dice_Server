# Casino Game API Documentation

## 游戏流程说明

### 大逃杀游戏流程

1. 游戏周期：
   - 每局游戏总时长为6分钟
   - 等待时间：1分钟
   - 游戏时间：5分钟
   - 结算时间：游戏结束后立即结算

2. 游戏状态：
   - waiting: 等待开始
   - running: 游戏进行中
   - settling: 结算中
   - finished: 已结束

3. 游戏规则：
   - 游戏分为8个区域，玩家可以选择任意区域下注
   - 玩家可以多次下注，每次可以选择多个区域
   - 如果游戏结束时下注区域总数小于3个，则返还所有玩家筹码
   - 结算时随机选择2个区域作为安全区域
   - 安全区域内的玩家按下注比例分配奖池（总下注额的90%）
   - 只要玩家有任意一个下注区域在安全区域内，即视为获胜

4. 下注状态：
   - pending: 等待结算
   - win: 获胜
   - lose: 失败
   - refunded: 已退还

## 认证接口

### 获取验证码
```http
GET /api/auth/captcha
```

**响应示例：**
```json
{
  "captchaId": "550e8400-e29b-41d4-a716-446655440000",
  "svg": "<svg>...</svg>"
}
```

### 用户登录
```http
POST /api/auth/login
```

**请求体：**
```json
{
  "username": "testuser",
  "password": "password123",
  "captchaId": "550e8400-e29b-41d4-a716-446655440000",
  "captchaText": "ABC123"
}
```

**响应示例：**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "testuser",
    "balance": "1000.00",
    "address": "0x123..."
  }
}
```

### 用户注册
```http
POST /api/auth/register
```

**请求体：**
```json
{
  "username": "newuser",
  "password": "password123",
  "captchaId": "550e8400-e29b-41d4-a716-446655440000",
  "captchaText": "ABC123"
}
```

**响应示例：**
```json
{
  "message": "注册成功",
  "user": {
    "id": 1,
    "username": "newuser"
  }
}
```

### 绑定地址
```http
POST /api/auth/bind-address
```

**请求体：**
```json
{
  "address": "0x123...",
  "captchaId": "550e8400-e29b-41d4-a716-446655440000",
  "captchaText": "ABC123",
  "signRes": "0x456..."
}
```

**响应示例：**
```json
{
  "message": "地址绑定成功",
  "user": {
    "id": 1,
    "username": "testuser",
    "balance": "1000.00",
    "address": "0x123..."
  }
}
```

## 游戏接口

### 单骰子游戏

#### 下注
```http
POST /api/game/bet/single
```

**请求体：**
```json
{
  "amount": 100,
  "selectedFace": 6
}
```

**响应示例：**
```json
{
  "finalNumber": 6,
  "win": true,
  "winAmount": "450.00",
  "amount": "100.00"
}
```

### 三骰子游戏

#### 下注
```http
POST /api/game/bet/triple
```

**请求体：**
```json
{
  "amount": 100,
  "selectedOption": "big"
}
```

**响应示例：**
```json
{
  "diceResults": [4, 5, 6],
  "sum": 15,
  "win": true,
  "winAmount": "180.00",
  "amount": "100.00"
}
```

### 龙虎斗游戏

#### 下注
```http
POST /api/game/bet/dragon-tiger
```

**请求体：**
```json
{
  "amount": 100,
  "selectedOption": "dragon"
}
```

**响应示例：**
```json
{
  "dragonCard": 10,
  "tigerCard": 5,
  "win": true,
  "winAmount": "200.00",
  "amount": "100.00"
}
```

### 大逃杀游戏

#### 获取当前游戏
```http
GET /api/battle-royale/current
```

**响应示例：**
```json
{
  "id": 1,
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "running",
  "startTime": "2024-01-20T12:00:00Z",
  "endTime": "2024-01-20T12:05:00Z",
  "safeZones": null,
  "totalBets": "1000.00",
  "isValid": true,
  "userBets": [
    {
      "id": 1,
      "zone": 3,
      "amount": "100.00",
      "status": "pending"
    }
  ],
  "zoneBets": {
    "1": "100.00",
    "2": "200.00",
    "3": "300.00",
    "4": "400.00",
    "5": "500.00",
    "6": "600.00",
    "7": "700.00",
    "8": "800.00"
  }
}
```

#### 获取指定游戏详情
```http
GET /api/battle-royale/{gameId}
```

**响应示例：**
```json
{
  "id": 1,
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "finished",
  "startTime": "2024-01-20T12:00:00Z",
  "endTime": "2024-01-20T12:05:00Z",
  "safeZones": [3, 5],
  "totalBets": "1000.00",
  "isValid": true,
  "userBets": [
    {
      "id": 1,
      "zone": 3,
      "amount": "100.00",
      "status": "win",
      "winAmount": "180.00"
    },
    {
      "id": 2,
      "zone": 5,
      "amount": "200.00",
      "status": "win",
      "winAmount": "360.00"
    }
  ],
  "zoneBets": {
    "1": "100.00",
    "2": "200.00",
    "3": "300.00",
    "4": "400.00",
    "5": "500.00",
    "6": "600.00",
    "7": "700.00",
    "8": "800.00"
  },
  "userStats": {
    "totalBetAmount": "300.00",
    "totalWinAmount": "540.00",
    "netProfit": "240.00"
  }
}
```

#### 获取游戏区域下注情况
```http
GET /api/battle-royale/zone-bets?gameId={gameId}
```

**响应示例：**
```json
{
  "gameId": "550e8400-e29b-41d4-a716-446655440000",
  "zoneBets": {
    "1": "100.00",
    "2": "200.00",
    "3": "300.00",
    "4": "400.00",
    "5": "500.00",
    "6": "600.00",
    "7": "700.00",
    "8": "800.00"
  },
  "totalBets": "3600.00"
}
```

#### 游戏下注（支持多区域下注）
```http
POST /api/battle-royale/bet
```

**请求体：**
```json
{
  "bets": [
    {
      "zone": 3,
      "amount": 100
    },
    {
      "zone": 5,
      "amount": 200
    }
  ]
}
```

**响应示例：**
```json
{
  "message": "下注成功",
  "bets": [
    {
      "id": 1,
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": 1,
      "zone": 3,
      "amount": "100.00",
      "status": "pending"
    },
    {
      "id": 2,
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": 1,
      "zone": 5,
      "amount": "200.00",
      "status": "pending"
    }
  ]
}
```

#### 获取游戏历史
```http
GET /api/battle-royale/history?page=1
```

**响应示例：**
```json
{
  "games": [
    {
      "id": 1,
      "gameId": "550e8400-e29b-41d4-a716-446655440000",
      "status": "finished",
      "startTime": "2024-01-20T12:00:00Z",
      "endTime": "2024-01-20T12:05:00Z",
      "safeZones": [3, 5],
      "totalBets": "1000.00",
      "isValid": true,
      "bets": [
        {
          "zone": 3,
          "amount": "100.00",
          "status": "win",
          "winAmount": "180.00"
        },
        {
          "zone": 5,
          "amount": "200.00",
          "status": "win",
          "winAmount": "360.00"
        }
      ]
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 50,
    "totalPages": 5
  }
}
```

## 统计接口

### 获取每日统计
```http
GET /api/stats/daily
```

**响应示例：**
```json
{
  "stats": [
    {
      "gameType": "single",
      "totalGames": 100,
      "totalBets": "10000.00",
      "totalPayouts": "9000.00",
      "totalWins": 45,
      "totalLosses": 55,
      "profit": "1000.00",
      "winRate": "45.00%",
      "houseEdge": "10.00%",
      "gameTypeName": "幸运骰子"
    }
  ],
  "period": "daily"
}
```

### 获取每周统计
```http
GET /api/stats/weekly
```

### 获取每月统计
```http
GET /api/stats/monthly
```

### 获取自定义时间范围统计
```http
GET /api/stats/custom?startDate=2024-01-01&endDate=2024-01-31
```

## 充值接口

### 获取充值历史
```http
GET /api/recharge/history?page=1
```

**响应示例：**
```json
{
  "history": [
    {
      "id": 1,
      "amount": "1000.00",
      "status": "completed",
      "hash": "0x123...",
      "coinName": "MERC",
      "createTime": 1705747200,
      "createdAt": "2024-01-20T12:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 50,
    "totalPages": 5
  }
}
```

## 通用接口

### 获取用户余额
```http
GET /api/game/balance
```

**响应示例：**
```json
{
  "balance": "1000.00"
}
```

### 获取游戏历史
```http
GET /api/game/history?page=1
```

**响应示例：**
```json
{
  "history": [
    {
      "id": 1,
      "gameType": "single",
      "amount": "100.00",
      "selectedOption": "6",
      "diceResults": [6],
      "win": true,
      "finalBalance": "1450.00",
      "createdAt": "2024-01-20T12:00:00Z"
    }
  ],
  "pagination": {
    "currentPage": 1,
    "pageSize": 10,
    "totalItems": 50,
    "totalPages": 5
  }
}
```