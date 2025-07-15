"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = exports.NetworkError = exports.RateLimitError = exports.AuthenticationError = exports.InvalidResponseError = exports.HandelsregisterError = void 0;
var HandelsregisterError = /** @class */ (function (_super) {
    __extends(HandelsregisterError, _super);
    function HandelsregisterError(message, statusCode, response) {
        var _this = _super.call(this, message) || this;
        _this.name = 'HandelsregisterError';
        _this.statusCode = statusCode;
        _this.response = response;
        Object.setPrototypeOf(_this, HandelsregisterError.prototype);
        return _this;
    }
    return HandelsregisterError;
}(Error));
exports.HandelsregisterError = HandelsregisterError;
var InvalidResponseError = /** @class */ (function (_super) {
    __extends(InvalidResponseError, _super);
    function InvalidResponseError(message, response) {
        var _this = _super.call(this, message, undefined, response) || this;
        _this.name = 'InvalidResponseError';
        Object.setPrototypeOf(_this, InvalidResponseError.prototype);
        return _this;
    }
    return InvalidResponseError;
}(HandelsregisterError));
exports.InvalidResponseError = InvalidResponseError;
var AuthenticationError = /** @class */ (function (_super) {
    __extends(AuthenticationError, _super);
    function AuthenticationError(message) {
        if (message === void 0) { message = 'Invalid or missing API key'; }
        var _this = _super.call(this, message, 401) || this;
        _this.name = 'AuthenticationError';
        Object.setPrototypeOf(_this, AuthenticationError.prototype);
        return _this;
    }
    return AuthenticationError;
}(HandelsregisterError));
exports.AuthenticationError = AuthenticationError;
var RateLimitError = /** @class */ (function (_super) {
    __extends(RateLimitError, _super);
    function RateLimitError(message, retryAfter) {
        if (message === void 0) { message = 'Rate limit exceeded'; }
        var _this = _super.call(this, message, 429) || this;
        _this.name = 'RateLimitError';
        _this.retryAfter = retryAfter;
        Object.setPrototypeOf(_this, RateLimitError.prototype);
        return _this;
    }
    return RateLimitError;
}(HandelsregisterError));
exports.RateLimitError = RateLimitError;
var NetworkError = /** @class */ (function (_super) {
    __extends(NetworkError, _super);
    function NetworkError(message, originalError) {
        var _this = _super.call(this, message) || this;
        _this.name = 'NetworkError';
        if (originalError) {
            _this.stack = originalError.stack;
        }
        Object.setPrototypeOf(_this, NetworkError.prototype);
        return _this;
    }
    return NetworkError;
}(HandelsregisterError));
exports.NetworkError = NetworkError;
var ValidationError = /** @class */ (function (_super) {
    __extends(ValidationError, _super);
    function ValidationError(message) {
        var _this = _super.call(this, message, 400) || this;
        _this.name = 'ValidationError';
        Object.setPrototypeOf(_this, ValidationError.prototype);
        return _this;
    }
    return ValidationError;
}(HandelsregisterError));
exports.ValidationError = ValidationError;
