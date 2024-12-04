const { cache , deleteCache } = require('./cache');

const getUserCache = (userId) => {
    const cacheKey = `user:${userId}`;
    return cache.get(cacheKey);
}

const setUserCache = (userId, user) => {
    const cacheKey = `user:${userId}`;
    cache.set(cacheKey, user);
}

const removeUserCache = (userId) => {
    const cacheKey = `user:${userId}`;
    cache.delete(cacheKey);
    setTimeout(() => {
        deleteCache(cacheKey);
    }, 500)
}

const deleteUserCacheForUpdateBalance = (userId) => {
    // 立即删除缓存
    removeUserCache(userId);
    deleteCache(`history:${userId}:*`)
    // 延迟双删缓存
    setTimeout(() => {
        deleteCache(`history:${userId}:*`)
    }, 500);
}

module.exports = {
    getUserCache,
    setUserCache,
    removeUserCache,
    deleteUserCacheForUpdateBalance
}