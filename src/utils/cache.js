"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cache = void 0;
exports.generateCacheKey = generateCacheKey;
var Cache = /** @class */ (function () {
    function Cache(defaultTTL) {
        if (defaultTTL === void 0) { defaultTTL = 3600000; }
        this.cache = new Map();
        this.defaultTTL = defaultTTL;
    }
    Cache.prototype.set = function (key, data, ttl) {
        this.cache.set(key, {
            data: data,
            timestamp: Date.now(),
            ttl: ttl || this.defaultTTL
        });
    };
    Cache.prototype.get = function (key) {
        var entry = this.cache.get(key);
        if (!entry) {
            return null;
        }
        var now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
            this.cache.delete(key);
            return null;
        }
        return entry.data;
    };
    Cache.prototype.has = function (key) {
        var value = this.get(key);
        return value !== null;
    };
    Cache.prototype.clear = function () {
        this.cache.clear();
    };
    Cache.prototype.delete = function (key) {
        return this.cache.delete(key);
    };
    Cache.prototype.size = function () {
        var _this = this;
        // Clean up expired entries first
        var now = Date.now();
        var keysToDelete = [];
        this.cache.forEach(function (entry, key) {
            if (now - entry.timestamp > entry.ttl) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(function (key) { return _this.cache.delete(key); });
        return this.cache.size;
    };
    return Cache;
}());
exports.Cache = Cache;
function generateCacheKey(params) {
    var sortedKeys = Object.keys(params).sort();
    var keyParts = [];
    for (var _i = 0, sortedKeys_1 = sortedKeys; _i < sortedKeys_1.length; _i++) {
        var key = sortedKeys_1[_i];
        var value = params[key];
        if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
                keyParts.push("".concat(key, ":").concat(value.sort().join(',')));
            }
            else {
                keyParts.push("".concat(key, ":").concat(String(value)));
            }
        }
    }
    return keyParts.join('|');
}
