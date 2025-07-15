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
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Company = void 0;
var client_1 = require("./client");
var Company = /** @class */ (function () {
    function Company(searchQuery, configOrClient, options) {
        this.searchQuery = searchQuery;
        this.features = options === null || options === void 0 ? void 0 : options.features;
        if (configOrClient instanceof client_1.Handelsregister) {
            this.client = configOrClient;
        }
        else {
            this.client = new client_1.Handelsregister(configOrClient || process.env.HANDELSREGISTER_API_KEY || '');
        }
    }
    Company.prototype.ensureData = function () {
        return __awaiter(this, void 0, void 0, function () {
            var _a;
            return __generator(this, function (_b) {
                switch (_b.label) {
                    case 0:
                        if (!!this.data) return [3 /*break*/, 2];
                        _a = this;
                        return [4 /*yield*/, this.client.fetchOrganization({
                                q: this.searchQuery,
                                features: this.features
                            })];
                    case 1:
                        _a.data = _b.sent();
                        _b.label = 2;
                    case 2: return [2 /*return*/, this.data];
                }
            });
        });
    };
    Company.prototype.refresh = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        this.data = undefined;
                        return [4 /*yield*/, this.ensureData()];
                    case 1:
                        _a.sent();
                        return [2 /*return*/];
                }
            });
        });
    };
    // Basic properties
    Company.prototype.getId = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.entity_id];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "entityId", {
        get: function () {
            var _a;
            return ((_a = this.data) === null || _a === void 0 ? void 0 : _a.entity_id) || '';
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getName = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.name];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "name", {
        get: function () {
            var _a;
            return ((_a = this.data) === null || _a === void 0 ? void 0 : _a.name) || '';
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getStatus = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.status];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "status", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.status;
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getPurpose = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.purpose];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "purpose", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.purpose;
        },
        enumerable: false,
        configurable: true
    });
    // Registration information
    Company.prototype.getCourt = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.court];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "court", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.court;
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getRegisterType = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.register_type];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "registerType", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.register_type;
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getRegisterNumber = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.register_number];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "registerNumber", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.register_number;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "registrationNumber", {
        get: function () {
            return this.registerNumber;
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getRegisterDate = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.register_date];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "registerDate", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.register_date;
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getLegalForm = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.legal_form];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "legalForm", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.legal_form;
        },
        enumerable: false,
        configurable: true
    });
    // Address information
    Company.prototype.getAddress = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data, parts;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        if (!data.address)
                            return [2 /*return*/, undefined];
                        parts = [
                            data.address.street,
                            data.address.postal_code,
                            data.address.city,
                            data.address.country_code
                        ].filter(Boolean);
                        return [2 /*return*/, parts.length > 0 ? parts.join(', ') : undefined];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "address", {
        get: function () {
            var _a;
            if (!((_a = this.data) === null || _a === void 0 ? void 0 : _a.address))
                return undefined;
            var parts = [
                this.data.address.street,
                this.data.address.postal_code,
                this.data.address.city,
                this.data.address.country_code
            ].filter(Boolean);
            return parts.length > 0 ? parts.join(', ') : undefined;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "street", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.street;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "postalCode", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.postal_code;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "city", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.city;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "countryCode", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.country_code;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "coordinates", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.address) === null || _b === void 0 ? void 0 : _b.coordinates;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "website", {
        // Contact information
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.website;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "phoneNumber", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.phone_number;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "email", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.email;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "keywords", {
        // Business information
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.keywords;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "productsAndServices", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.products_and_services;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "industryClassification", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.industry_classification;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "wz2008Codes", {
        get: function () {
            var _a;
            return (_a = this.data) === null || _a === void 0 ? void 0 : _a.wz2008_codes;
        },
        enumerable: false,
        configurable: true
    });
    // Related persons
    Company.prototype.getRelatedPersons = function (type) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        if (!data.related_persons)
                            return [2 /*return*/, []];
                        if (type === 'current') {
                            return [2 /*return*/, data.related_persons.current || []];
                        }
                        else if (type === 'past') {
                            return [2 /*return*/, data.related_persons.past || []];
                        }
                        // Return all if no type specified
                        return [2 /*return*/, __spreadArray(__spreadArray([], (data.related_persons.current || []), true), (data.related_persons.past || []), true)];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "currentRelatedPersons", {
        get: function () {
            var _a, _b;
            return ((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.related_persons) === null || _b === void 0 ? void 0 : _b.current) || [];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "pastRelatedPersons", {
        get: function () {
            var _a, _b;
            return ((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.related_persons) === null || _b === void 0 ? void 0 : _b.past) || [];
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getRelatedPersonsByRole = function (role) {
        var _a, _b, _c, _d;
        var allPersons = __spreadArray(__spreadArray([], (((_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.related_persons) === null || _b === void 0 ? void 0 : _b.current) || []), true), (((_d = (_c = this.data) === null || _c === void 0 ? void 0 : _c.related_persons) === null || _d === void 0 ? void 0 : _d.past) || []), true);
        return allPersons.filter(function (person) {
            return person.role.toLowerCase().includes(role.toLowerCase());
        });
    };
    // Financial data
    Company.prototype.getFinancialKPIs = function (year) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        if (!data.financial_kpi)
                            return [2 /*return*/, []];
                        if (year !== undefined) {
                            return [2 /*return*/, data.financial_kpi.filter(function (kpi) { return kpi.year === year; })];
                        }
                        return [2 /*return*/, data.financial_kpi];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "financialKPIs", {
        get: function () {
            var _a;
            return ((_a = this.data) === null || _a === void 0 ? void 0 : _a.financial_kpi) || [];
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getFinancialKPIByYear = function (year) {
        var _a, _b;
        return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.financial_kpi) === null || _b === void 0 ? void 0 : _b.find(function (kpi) { return kpi.year === year; });
    };
    Object.defineProperty(Company.prototype, "latestFinancialKPI", {
        get: function () {
            var _a;
            if (!((_a = this.data) === null || _a === void 0 ? void 0 : _a.financial_kpi) || this.data.financial_kpi.length === 0) {
                return undefined;
            }
            return this.data.financial_kpi.reduce(function (latest, current) {
                return current.year > latest.year ? current : latest;
            });
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getBalanceSheets = function (year) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        if (!data.balance_sheet_accounts)
                            return [2 /*return*/, []];
                        if (year !== undefined) {
                            return [2 /*return*/, data.balance_sheet_accounts.filter(function (sheet) { return sheet.year === year; })];
                        }
                        return [2 /*return*/, data.balance_sheet_accounts];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "balanceSheets", {
        get: function () {
            var _a;
            return ((_a = this.data) === null || _a === void 0 ? void 0 : _a.balance_sheet_accounts) || [];
        },
        enumerable: false,
        configurable: true
    });
    Company.prototype.getProfitLossAccounts = function (year) {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        if (!data.profit_and_loss_account)
                            return [2 /*return*/, []];
                        if (year !== undefined) {
                            return [2 /*return*/, data.profit_and_loss_account.filter(function (account) { return account.year === year; })];
                        }
                        return [2 /*return*/, data.profit_and_loss_account];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "profitLossAccounts", {
        get: function () {
            var _a;
            return ((_a = this.data) === null || _a === void 0 ? void 0 : _a.profit_and_loss_account) || [];
        },
        enumerable: false,
        configurable: true
    });
    // Publications
    Company.prototype.getPublications = function () {
        return __awaiter(this, void 0, void 0, function () {
            var data;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1:
                        data = _a.sent();
                        return [2 /*return*/, data.publications || []];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "publications", {
        get: function () {
            var _a;
            return ((_a = this.data) === null || _a === void 0 ? void 0 : _a.publications) || [];
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "requestCreditCost", {
        // Meta information
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.meta) === null || _b === void 0 ? void 0 : _b.request_credit_cost;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Company.prototype, "creditsRemaining", {
        get: function () {
            var _a, _b;
            return (_b = (_a = this.data) === null || _a === void 0 ? void 0 : _a.meta) === null || _b === void 0 ? void 0 : _b.credits_remaining;
        },
        enumerable: false,
        configurable: true
    });
    // Document fetching
    Company.prototype.fetchDocument = function (documentType, outputFile) {
        return __awaiter(this, void 0, void 0, function () {
            var entityId;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.getId()];
                    case 1:
                        entityId = _a.sent();
                        return [2 /*return*/, this.client.fetchDocument(entityId, documentType, outputFile)];
                }
            });
        });
    };
    // Raw data access
    Company.prototype.getRawData = function () {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0: return [4 /*yield*/, this.ensureData()];
                    case 1: return [2 /*return*/, _a.sent()];
                }
            });
        });
    };
    Object.defineProperty(Company.prototype, "rawData", {
        get: function () {
            return this.data;
        },
        enumerable: false,
        configurable: true
    });
    // Utility methods
    Company.prototype.toJSON = function () {
        return this.data;
    };
    Company.prototype.toString = function () {
        if (!this.data) {
            return "Company(".concat(this.searchQuery, ") - not loaded");
        }
        return "Company(".concat(this.data.name, ") - ").concat(this.data.legal_form || 'Unknown', " - ").concat(this.data.status || 'Unknown status');
    };
    return Company;
}());
exports.Company = Company;
