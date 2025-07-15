"use strict";
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
exports.readFile = readFile;
exports.writeFile = writeFile;
exports.detectFileType = detectFileType;
var fs = require("fs");
var path = require("path");
var sync_1 = require("csv-parse/sync");
var sync_2 = require("csv-stringify/sync");
var XLSX = require("xlsx");
function readFile(filePath, fileType) {
    return __awaiter(this, void 0, void 0, function () {
        var absolutePath;
        return __generator(this, function (_a) {
            absolutePath = path.resolve(filePath);
            if (!fs.existsSync(absolutePath)) {
                throw new Error("File not found: ".concat(absolutePath));
            }
            switch (fileType) {
                case 'json':
                    return [2 /*return*/, readJsonFile(absolutePath)];
                case 'csv':
                    return [2 /*return*/, readCsvFile(absolutePath)];
                case 'xlsx':
                    return [2 /*return*/, readExcelFile(absolutePath)];
                default:
                    throw new Error("Unsupported file type: ".concat(fileType));
            }
            return [2 /*return*/];
        });
    });
}
function writeFile(filePath, data, fileType, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var absolutePath, dir, _a;
        return __generator(this, function (_b) {
            switch (_b.label) {
                case 0:
                    absolutePath = path.resolve(filePath);
                    dir = path.dirname(absolutePath);
                    if (!fs.existsSync(dir)) {
                        fs.mkdirSync(dir, { recursive: true });
                    }
                    _a = fileType;
                    switch (_a) {
                        case 'json': return [3 /*break*/, 1];
                        case 'csv': return [3 /*break*/, 3];
                        case 'xlsx': return [3 /*break*/, 5];
                    }
                    return [3 /*break*/, 7];
                case 1: return [4 /*yield*/, writeJsonFile(absolutePath, data)];
                case 2:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 3: return [4 /*yield*/, writeCsvFile(absolutePath, data, headers)];
                case 4:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 5: return [4 /*yield*/, writeExcelFile(absolutePath, data, headers)];
                case 6:
                    _b.sent();
                    return [3 /*break*/, 8];
                case 7: throw new Error("Unsupported file type: ".concat(fileType));
                case 8: return [2 /*return*/];
            }
        });
    });
}
function readJsonFile(filePath) {
    var content = fs.readFileSync(filePath, 'utf-8');
    var data = JSON.parse(content);
    if (!Array.isArray(data)) {
        throw new Error('JSON file must contain an array of objects');
    }
    var headers = data.length > 0 ? Object.keys(data[0]) : [];
    return { data: data, headers: headers };
}
function readCsvFile(filePath) {
    var content = fs.readFileSync(filePath, 'utf-8');
    var records = (0, sync_1.parse)(content, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });
    var headers = records.length > 0 ? Object.keys(records[0]) : [];
    return { data: records, headers: headers };
}
function readExcelFile(filePath) {
    var workbook = XLSX.readFile(filePath);
    var firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    var data = XLSX.utils.sheet_to_json(firstSheet);
    var headers = data.length > 0 ? Object.keys(data[0]) : [];
    return { data: data, headers: headers };
}
function writeJsonFile(filePath, data) {
    return __awaiter(this, void 0, void 0, function () {
        var content;
        return __generator(this, function (_a) {
            content = JSON.stringify(data, null, 2);
            fs.writeFileSync(filePath, content, 'utf-8');
            return [2 /*return*/];
        });
    });
}
function writeCsvFile(filePath, data, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var columns, content;
        return __generator(this, function (_a) {
            columns = headers || (data.length > 0 ? Object.keys(data[0]) : []);
            content = (0, sync_2.stringify)(data, {
                header: true,
                columns: columns
            });
            fs.writeFileSync(filePath, content, 'utf-8');
            return [2 /*return*/];
        });
    });
}
function writeExcelFile(filePath, data, headers) {
    return __awaiter(this, void 0, void 0, function () {
        var workbook, worksheet;
        return __generator(this, function (_a) {
            workbook = XLSX.utils.book_new();
            worksheet = XLSX.utils.json_to_sheet(data, {
                header: headers
            });
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            XLSX.writeFile(workbook, filePath);
            return [2 /*return*/];
        });
    });
}
function detectFileType(filePath) {
    var ext = path.extname(filePath).toLowerCase();
    switch (ext) {
        case '.json':
            return 'json';
        case '.csv':
            return 'csv';
        case '.xlsx':
        case '.xls':
            return 'xlsx';
        default:
            throw new Error("Cannot detect file type for extension: ".concat(ext));
    }
}
