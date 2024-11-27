class Cache {
  constructor() {
    this.store = new Map();
    this.locks = new Map();
  }

  // 设置缓存
  set(key, value, ttl = 3600) {
    const expiresAt = Date.now() + ttl * 1000;
    this.store.set(key, {
      value,
      expiresAt
    });
  }

  // 获取缓存
  get(key) {
    const data = this.store.get(key);
    if (!data) return null;
    
    if (Date.now() > data.expiresAt) {
      this.delete(key);
      return null;
    }
    
    return data.value;
  }

  // 删除缓存（支持通配符）
  delete(pattern) {
    if (pattern.includes('*')) {
      // 将通配符转换为正则表达式
      const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
      // 遍历所有键，删除匹配的缓存
      for (const key of this.store.keys()) {
        if (regex.test(key)) {
          this.store.delete(key);
        }
      }
    } else {
      // 直接删除指定的键
      this.store.delete(pattern);
    }
  }

  // 清空所有缓存
  clear() {
    this.store.clear();
  }

  // 获取缓存锁
  async getLock(key, timeout = 5000) {
    const lockKey = `lock:${key}`;
    const startTime = Date.now();

    while (this.locks.has(lockKey)) {
      if (Date.now() - startTime > timeout) {
        throw new Error('获取锁超时');
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.locks.set(lockKey, true);
    return true;
  }

  // 释放缓存锁
  releaseLock(key) {
    const lockKey = `lock:${key}`;
    this.locks.delete(lockKey);
  }
}

// 创建单例实例
const cache = new Cache();

// 缓存装饰器
const withCache = (keyPrefix) => {
  return function(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = async function(...args) {
      const key = `${keyPrefix}:${args.join(':')}`;
      
      // 尝试从缓存获取
      const cachedValue = cache.get(key);
      if (cachedValue) {
        return cachedValue;
      }

      try {
        // 获取锁
        await cache.getLock(key);
        
        // 双重检查
        const doubleCheckCache = cache.get(key);
        if (doubleCheckCache) {
          return doubleCheckCache;
        }

        // 执行原方法
        const result = await originalMethod.apply(this, args);
        
        // 设置缓存
        cache.set(key, result);
        
        return result;
      } finally {
        // 释放锁
        cache.releaseLock(key);
      }
    };

    return descriptor;
  };
};

// 缓存删除工具
const deleteCache = async (key, delay = 500) => {
  cache.delete(key);
  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
    cache.delete(key);
  }
};

module.exports = {
  cache,
  withCache,
  deleteCache
}; 