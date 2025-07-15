#!/usr/bin/env node
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
var commander_1 = require("commander");
var chalk = require("chalk");
var Table = require("cli-table3");
var dotenv = require("dotenv");
var src_1 = require("../src");
var fileHandler_1 = require("../src/utils/fileHandler");
// Load environment variables
dotenv.config();
var program = new commander_1.Command();
program
    .name('handelsregister')
    .description('CLI for accessing German company registry (Handelsregister) data')
    .version('1.0.0')
    .option('-k, --api-key <key>', 'API key (defaults to HANDELSREGISTER_API_KEY env var)')
    .option('--no-color', 'Disable colored output');
// Fetch command
program
    .command('fetch <query>')
    .description('Fetch company information')
    .option('-f, --feature <features...>', 'Features to include', [])
    .option('--json', 'Output as JSON')
    .option('--no-ai-search', 'Disable AI search')
    .action(function (query, options) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, client, features, data, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
                if (!apiKey) {
                    console.error(chalk.red('Error: API key is required. Set HANDELSREGISTER_API_KEY or use --api-key'));
                    process.exit(1);
                }
                client = new src_1.Handelsregister(apiKey);
                features = options.feature;
                return [4 /*yield*/, client.fetchOrganization({
                        q: query,
                        features: features,
                        aiSearch: options.aiSearch === false ? 'off' : 'on'
                    })];
            case 1:
                data = _a.sent();
                if (options.json) {
                    console.log(JSON.stringify(data, null, 2));
                }
                else {
                    displayCompanyData(data);
                }
                return [3 /*break*/, 3];
            case 2:
                error_1 = _a.sent();
                console.error(chalk.red("Error: ".concat(error_1.message)));
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Document command
program
    .command('document <query>')
    .description('Download company documents')
    .requiredOption('-t, --type <type>', 'Document type (shareholders_list, AD, CD)')
    .option('-o, --output <file>', 'Output file path')
    .action(function (query, options) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, company, entityId, outputFile, _a, _b, _c, _d, _e, error_2;
    return __generator(this, function (_f) {
        switch (_f.label) {
            case 0:
                _f.trys.push([0, 4, , 5]);
                apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
                if (!apiKey) {
                    console.error(chalk.red('Error: API key is required. Set HANDELSREGISTER_API_KEY or use --api-key'));
                    process.exit(1);
                }
                company = new src_1.Company(query, apiKey);
                return [4 /*yield*/, company.getId()];
            case 1:
                entityId = _f.sent();
                outputFile = options.output || "".concat(entityId, "_").concat(options.type, ".pdf");
                _b = (_a = console).log;
                _d = (_c = chalk).blue;
                _e = "Fetching document for: ".concat;
                return [4 /*yield*/, company.getName()];
            case 2:
                _b.apply(_a, [_d.apply(_c, [_e.apply("Fetching document for: ", [_f.sent()])])]);
                console.log(chalk.gray("Document type: ".concat(options.type)));
                return [4 /*yield*/, company.fetchDocument(options.type, outputFile)];
            case 3:
                _f.sent();
                console.log(chalk.green("\u2713 Document saved to: ".concat(outputFile)));
                return [3 /*break*/, 5];
            case 4:
                error_2 = _f.sent();
                console.error(chalk.red("Error: ".concat(error_2.message)));
                process.exit(1);
                return [3 /*break*/, 5];
            case 5: return [2 /*return*/];
        }
    });
}); });
// Enrich command
program
    .command('enrich <file>')
    .description('Enrich data file with company information')
    .option('-i, --input <type>', 'Input file type (json, csv, xlsx) - auto-detected if not specified')
    .option('-q, --query-properties <mappings...>', 'Property mappings in format prop1=column1 prop2=column2')
    .option('-f, --feature <features...>', 'Features to include', [])
    .option('-s, --snapshot-dir <dir>', 'Directory for snapshot files')
    .option('--snapshot-interval <n>', 'Save snapshot every N items', '10')
    .action(function (file, options) { return __awaiter(void 0, void 0, void 0, function () {
    var apiKey, queryProperties, _i, _a, mapping, _b, key, value, client, inputType, features, result, errorTable_1, error_3;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _c.trys.push([0, 2, , 3]);
                apiKey = program.opts().apiKey || process.env.HANDELSREGISTER_API_KEY;
                if (!apiKey) {
                    console.error(chalk.red('Error: API key is required. Set HANDELSREGISTER_API_KEY or use --api-key'));
                    process.exit(1);
                }
                if (!options.queryProperties || options.queryProperties.length === 0) {
                    console.error(chalk.red('Error: --query-properties is required'));
                    process.exit(1);
                }
                queryProperties = {};
                for (_i = 0, _a = options.queryProperties; _i < _a.length; _i++) {
                    mapping = _a[_i];
                    _b = mapping.split('='), key = _b[0], value = _b[1];
                    if (key && value) {
                        queryProperties[value] = key;
                    }
                }
                client = new src_1.Handelsregister(apiKey);
                inputType = options.input || (0, fileHandler_1.detectFileType)(file);
                features = options.feature;
                console.log(chalk.blue('Starting enrichment process...'));
                console.log(chalk.gray("Input file: ".concat(file)));
                console.log(chalk.gray("File type: ".concat(inputType)));
                console.log(chalk.gray("Query mappings: ".concat(JSON.stringify(queryProperties))));
                return [4 /*yield*/, client.enrich({
                        filePath: file,
                        inputType: inputType,
                        queryProperties: queryProperties,
                        snapshotDir: options.snapshotDir,
                        snapshotInterval: parseInt(options.snapshotInterval),
                        params: features.length > 0 ? { q: '', features: features } : {}
                    })];
            case 1:
                result = _c.sent();
                console.log(chalk.green('\n✓ Enrichment completed!'));
                console.log(chalk.gray("Processed: ".concat(result.processedCount, " items")));
                console.log(chalk.gray("Errors: ".concat(result.errorCount, " items")));
                console.log(chalk.gray("Output: ".concat(result.outputPath)));
                if (result.errors && result.errors.length > 0) {
                    console.log(chalk.yellow('\nErrors:'));
                    errorTable_1 = new Table({
                        head: ['Row', 'Error'],
                        style: { head: ['yellow'] }
                    });
                    result.errors.slice(0, 10).forEach(function (err) {
                        errorTable_1.push([err.row, err.error]);
                    });
                    console.log(errorTable_1.toString());
                    if (result.errors.length > 10) {
                        console.log(chalk.gray("... and ".concat(result.errors.length - 10, " more errors")));
                    }
                }
                return [3 /*break*/, 3];
            case 2:
                error_3 = _c.sent();
                console.error(chalk.red("Error: ".concat(error_3.message)));
                process.exit(1);
                return [3 /*break*/, 3];
            case 3: return [2 /*return*/];
        }
    });
}); });
// Helper function to display company data
function displayCompanyData(data) {
    var _a, _b, _c;
    console.log(chalk.bold.blue('\n=== Company Information ===\n'));
    // Basic info
    var basicTable = new Table();
    basicTable.push(['Name', data.name || '-'], ['Entity ID', data.entity_id || '-'], ['Status', data.status || '-'], ['Legal Form', data.legal_form || '-'], ['Court', data.court || '-'], ['Register Number', data.register_number || '-']);
    console.log(basicTable.toString());
    // Address
    if (data.address) {
        console.log(chalk.bold.blue('\n=== Address ==='));
        var addressTable = new Table();
        addressTable.push(['Street', data.address.street || '-'], ['Postal Code', data.address.postal_code || '-'], ['City', data.address.city || '-'], ['Country', data.address.country_code || '-']);
        console.log(addressTable.toString());
    }
    // Contact
    if (data.website || data.phone_number || data.email) {
        console.log(chalk.bold.blue('\n=== Contact ==='));
        var contactTable = new Table();
        if (data.website)
            contactTable.push(['Website', data.website]);
        if (data.phone_number)
            contactTable.push(['Phone', data.phone_number]);
        if (data.email)
            contactTable.push(['Email', data.email]);
        console.log(contactTable.toString());
    }
    // Related persons
    if (((_b = (_a = data.related_persons) === null || _a === void 0 ? void 0 : _a.current) === null || _b === void 0 ? void 0 : _b.length) > 0) {
        console.log(chalk.bold.blue('\n=== Current Management ==='));
        var personsTable_1 = new Table({
            head: ['Name', 'Role'],
            style: { head: ['blue'] }
        });
        data.related_persons.current.forEach(function (person) {
            personsTable_1.push([person.name, person.role]);
        });
        console.log(personsTable_1.toString());
    }
    // Financial KPIs
    if (((_c = data.financial_kpi) === null || _c === void 0 ? void 0 : _c.length) > 0) {
        console.log(chalk.bold.blue('\n=== Financial KPIs ==='));
        var kpiTable_1 = new Table({
            head: ['Year', 'Revenue', 'Profit', 'Employees'],
            style: { head: ['blue'] }
        });
        data.financial_kpi.slice(-3).forEach(function (kpi) {
            kpiTable_1.push([
                kpi.year,
                kpi.revenue ? "\u20AC".concat(kpi.revenue.toLocaleString()) : '-',
                kpi.profit ? "\u20AC".concat(kpi.profit.toLocaleString()) : '-',
                kpi.employees || '-'
            ]);
        });
        console.log(kpiTable_1.toString());
    }
    // Meta info
    if (data.meta) {
        console.log(chalk.bold.blue('\n=== API Usage ==='));
        var metaTable = new Table();
        if (data.meta.request_credit_cost !== undefined) {
            metaTable.push(['Credits Used', data.meta.request_credit_cost]);
        }
        if (data.meta.credits_remaining !== undefined) {
            metaTable.push(['Credits Remaining', data.meta.credits_remaining]);
        }
        console.log(metaTable.toString());
    }
}
// Parse and execute
program.parse(process.argv);
// Show help if no command provided
if (!process.argv.slice(2).length) {
    program.outputHelp();
}
