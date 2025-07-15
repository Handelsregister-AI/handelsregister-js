"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Handelsregister = void 0;
var axios_1 = require("axios");
var fs = require("fs");
var path = require("path");
var cliProgress = require("cli-progress");
var errors_1 = require("./errors");
var cache_1 = require("./utils/cache");
var retry_1 = require("./utils/retry");
var fileHandler_1 = require("./utils/fileHandler");
var DEFAULT_BASE_URL = 'https://handelsregister.ai/api/v1/';
var DEFAULT_TIMEOUT = 90000; // 90 seconds
var USER_AGENT = 'handelsregister-js/1.0.0';
var Handelsregister = /** @class */ (function () {
    function Handelsregister(config) {
        if (typeof config === 'string') {
            this.apiKey = config;
            config = { apiKey: config };
        }
        else {
            this.apiKey = config.apiKey;
        }
        if (!this.apiKey) {
            var envApiKey = process.env.HANDELSREGISTER_API_KEY;
            if (envApiKey) {
                this.apiKey = envApiKey;
            }
            else {
                throw new errors_1.AuthenticationError('API key is required. Pass it to the constructor or set HANDELSREGISTER_API_KEY environment variable.');
            }
        }
        var baseURL = config.baseUrl || DEFAULT_BASE_URL;
        var timeout = config.timeout || DEFAULT_TIMEOUT;
        this.httpClient = axios_1.default.create({
            baseURL: baseURL,
            timeout: timeout,
            headers: {
                'User-Agent': USER_AGENT
            }
        });
        if (config.cacheEnabled !== false) {
            this.cache = new cache_1.Cache();
        }
        this.rateLimit = config.rateLimit;
    }
    Handelsregister.prototype.fetchOrganization = function (params) {
        return __awaiter(this, void 0, void 0, function () {
            var searchParams, query, cacheKey, cachedData, queryParams, response, companyData, error_1, axiosError, status_1, data;
            var _this = this;
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        searchParams = typeof params === 'string'
                            ? { q: params }
                            : params;
                        query = searchParams.q || '';
                        if (!query || query.trim() === '') {
                            throw new errors_1.ValidationError('Search query (q) is required');
                        }
                        cacheKey = this.cache ? (0, cache_1.generateCacheKey)(__assign(__assign({}, searchParams), { api_key: this.apiKey })) : null;
                        if (cacheKey && ((_a = this.cache) === null || _a === void 0 ? void 0 : _a.has(cacheKey))) {
                            cachedData = this.cache.get(cacheKey);
                            if (cachedData)
                                return [2 /*return*/, cachedData];
                        }
                        queryParams = {
                            api_key: this.apiKey,
                            q: query
                        };
                        if (searchParams.features && searchParams.features.length > 0) {
                            queryParams['feature[]'] = searchParams.features;
                        }
                        if (searchParams.aiSearch !== undefined) {
                            queryParams.ai_search = searchParams.aiSearch;
                        }
                        _b.label = 1;
                    case 1:
                        _b.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retry)(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!(this.rateLimit && this.rateLimit > 0)) return [3 /*break*/, 2];
                                            return [4 /*yield*/, (0, retry_1.sleep)(this.rateLimit * 1000)];
                                        case 1:
                                            _a.sent();
                                            _a.label = 2;
                                        case 2: return [4 /*yield*/, this.httpClient.get('/fetch-organization', {
                                                params: queryParams,
                                                paramsSerializer: function (params) {
                                                    var parts = [];
                                                    var _loop_1 = function (key) {
                                                        var value = params[key];
                                                        if (Array.isArray(value)) {
                                                            value.forEach(function (v) { return parts.push("".concat(key, "=").concat(encodeURIComponent(v))); });
                                                        }
                                                        else {
                                                            parts.push("".concat(key, "=").concat(encodeURIComponent(value)));
                                                        }
                                                    };
                                                    for (var key in params) {
                                                        _loop_1(key);
                                                    }
                                                    return parts.join('&');
                                                }
                                            })];
                                        case 3: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); }, {
                                shouldRetry: function (error) {
                                    var _a, _b, _c;
                                    if (((_a = error.response) === null || _a === void 0 ? void 0 : _a.status) === 401)
                                        return false;
                                    if (((_b = error.response) === null || _b === void 0 ? void 0 : _b.status) === 429)
                                        return true;
                                    if (((_c = error.response) === null || _c === void 0 ? void 0 : _c.status) >= 500)
                                        return true;
                                    if (!error.response)
                                        return true; // Network errors
                                    return false;
                                }
                            })];
                    case 2:
                        response = _b.sent();
                        if (response.status === 401) {
                            throw new errors_1.AuthenticationError();
                        }
                        if (!response.data || typeof response.data !== 'object') {
                            throw new errors_1.InvalidResponseError('Invalid response format from API', response.data);
                        }
                        companyData = response.data;
                        if (cacheKey && this.cache) {
                            this.cache.set(cacheKey, companyData);
                        }
                        return [2 /*return*/, companyData];
                    case 3:
                        error_1 = _b.sent();
                        if (error_1 instanceof errors_1.HandelsregisterError) {
                            throw error_1;
                        }
                        if (axios_1.default.isAxiosError(error_1)) {
                            axiosError = error_1;
                            if (axiosError.response) {
                                status_1 = axiosError.response.status;
                                data = axiosError.response.data;
                                if (status_1 === 401) {
                                    throw new errors_1.AuthenticationError();
                                }
                                else if (status_1 === 429) {
                                    throw new errors_1.RateLimitError();
                                }
                                else {
                                    throw new errors_1.HandelsregisterError("API request failed with status ".concat(status_1), status_1, data);
                                }
                            }
                            else if (axiosError.request) {
                                throw new errors_1.NetworkError('Network error: No response received from server');
                            }
                        }
                        throw new errors_1.HandelsregisterError('An unexpected error occurred', undefined, error_1);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Handelsregister.prototype.fetchDocument = function (companyId, documentType, outputFile) {
        return __awaiter(this, void 0, void 0, function () {
            var validDocumentTypes, response, buffer, absolutePath, dir, error_2, axiosError, status_2;
            var _this = this;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        if (!companyId || companyId.trim() === '') {
                            throw new errors_1.ValidationError('Company ID is required');
                        }
                        validDocumentTypes = ['shareholders_list', 'AD', 'CD'];
                        if (!validDocumentTypes.includes(documentType)) {
                            throw new errors_1.ValidationError("Invalid document type. Must be one of: ".concat(validDocumentTypes.join(', ')));
                        }
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        return [4 /*yield*/, (0, retry_1.retry)(function () { return __awaiter(_this, void 0, void 0, function () {
                                return __generator(this, function (_a) {
                                    switch (_a.label) {
                                        case 0:
                                            if (!(this.rateLimit && this.rateLimit > 0)) return [3 /*break*/, 2];
                                            return [4 /*yield*/, (0, retry_1.sleep)(this.rateLimit * 1000)];
                                        case 1:
                                            _a.sent();
                                            _a.label = 2;
                                        case 2: return [4 /*yield*/, this.httpClient.get('/fetch-document', {
                                                params: {
                                                    api_key: this.apiKey,
                                                    company_id: companyId,
                                                    document_type: documentType
                                                },
                                                responseType: 'arraybuffer'
                                            })];
                                        case 3: return [2 /*return*/, _a.sent()];
                                    }
                                });
                            }); })];
                    case 2:
                        response = _a.sent();
                        if (response.status === 401) {
                            throw new errors_1.AuthenticationError();
                        }
                        buffer = Buffer.from(response.data);
                        if (outputFile) {
                            absolutePath = path.resolve(outputFile);
                            dir = path.dirname(absolutePath);
                            if (!fs.existsSync(dir)) {
                                fs.mkdirSync(dir, { recursive: true });
                            }
                            fs.writeFileSync(absolutePath, buffer);
                        }
                        return [2 /*return*/, buffer];
                    case 3:
                        error_2 = _a.sent();
                        if (error_2 instanceof errors_1.HandelsregisterError) {
                            throw error_2;
                        }
                        if (axios_1.default.isAxiosError(error_2)) {
                            axiosError = error_2;
                            if (axiosError.response) {
                                status_2 = axiosError.response.status;
                                if (status_2 === 401) {
                                    throw new errors_1.AuthenticationError();
                                }
                                else if (status_2 === 404) {
                                    throw new errors_1.HandelsregisterError('Document not found', 404);
                                }
                                else {
                                    throw new errors_1.HandelsregisterError("Failed to fetch document with status ".concat(status_2), status_2);
                                }
                            }
                        }
                        throw new errors_1.HandelsregisterError('Failed to fetch document', undefined, error_2);
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    Handelsregister.prototype.enrich = function (options) {
        return __awaiter(this, void 0, void 0, function () {
            var filePath, inputType, queryProperties, snapshotDir, _a, snapshotInterval, _b, params, fileData, items, snapshotPath, processedItems, startIndex, snapshotFile, snapshotData, progressBar, errors, i, item, queryParts, _i, _c, itemProp, searchParams, companyData, enrichedItem, error_3, errorMessage, outputPath;
            return __generator(this, function (_d) {
                switch (_d.label) {
                    case 0:
                        filePath = options.filePath, inputType = options.inputType, queryProperties = options.queryProperties, snapshotDir = options.snapshotDir, _a = options.snapshotInterval, snapshotInterval = _a === void 0 ? 10 : _a, _b = options.params, params = _b === void 0 ? {} : _b;
                        return [4 /*yield*/, (0, fileHandler_1.readFile)(filePath, inputType)];
                    case 1:
                        fileData = _d.sent();
                        items = fileData.data;
                        if (items.length === 0) {
                            return [2 /*return*/, {
                                    processedCount: 0,
                                    errorCount: 0,
                                    outputPath: filePath
                                }];
                        }
                        processedItems = [];
                        startIndex = 0;
                        if (snapshotDir) {
                            snapshotFile = "snapshot_".concat(path.basename(filePath, path.extname(filePath)), ".json");
                            snapshotPath = path.join(snapshotDir, snapshotFile);
                            if (fs.existsSync(snapshotPath)) {
                                snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf-8'));
                                processedItems = snapshotData.processed || [];
                                startIndex = processedItems.length;
                            }
                        }
                        progressBar = new cliProgress.SingleBar({
                            format: 'Progress |{bar}| {percentage}% | {value}/{total} | {eta_formatted}',
                            barCompleteChar: '\u2588',
                            barIncompleteChar: '\u2591',
                            hideCursor: true
                        });
                        progressBar.start(items.length, startIndex);
                        errors = [];
                        i = startIndex;
                        _d.label = 2;
                    case 2:
                        if (!(i < items.length)) return [3 /*break*/, 8];
                        item = items[i];
                        _d.label = 3;
                    case 3:
                        _d.trys.push([3, 5, , 6]);
                        queryParts = [];
                        for (_i = 0, _c = Object.entries(queryProperties); _i < _c.length; _i++) {
                            itemProp = _c[_i][0];
                            if (item[itemProp]) {
                                queryParts.push(String(item[itemProp]));
                            }
                        }
                        if (queryParts.length === 0) {
                            throw new Error('No query properties found in item');
                        }
                        searchParams = __assign({ q: queryParts.join(' ') }, params);
                        return [4 /*yield*/, this.fetchOrganization(searchParams)];
                    case 4:
                        companyData = _d.sent();
                        enrichedItem = __assign(__assign({}, item), { handelsregister_data: companyData });
                        processedItems.push(enrichedItem);
                        // Save snapshot at intervals
                        if (snapshotPath && (i + 1) % snapshotInterval === 0) {
                            fs.writeFileSync(snapshotPath, JSON.stringify({
                                processed: processedItems,
                                lastIndex: i
                            }, null, 2));
                        }
                        return [3 /*break*/, 6];
                    case 5:
                        error_3 = _d.sent();
                        errorMessage = error_3 instanceof Error ? error_3.message : String(error_3);
                        errors.push({ row: i + 1, error: errorMessage });
                        processedItems.push(item); // Keep original item on error
                        return [3 /*break*/, 6];
                    case 6:
                        progressBar.update(i + 1);
                        _d.label = 7;
                    case 7:
                        i++;
                        return [3 /*break*/, 2];
                    case 8:
                        progressBar.stop();
                        outputPath = filePath.replace(new RegExp("\\.".concat(inputType, "$")), "_enriched.".concat(inputType));
                        return [4 /*yield*/, (0, fileHandler_1.writeFile)(outputPath, processedItems, inputType, fileData.headers)];
                    case 9:
                        _d.sent();
                        // Clean up snapshot
                        if (snapshotPath && fs.existsSync(snapshotPath)) {
                            fs.unlinkSync(snapshotPath);
                        }
                        return [2 /*return*/, {
                                processedCount: items.length - errors.length,
                                errorCount: errors.length,
                                outputPath: outputPath,
                                errors: errors.length > 0 ? errors : undefined
                            }];
                }
            });
        });
    };
    return Handelsregister;
}());
exports.Handelsregister = Handelsregister;
