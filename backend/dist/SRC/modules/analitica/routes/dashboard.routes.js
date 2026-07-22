"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportes_controller_1 = require("../controllers/reportes.controller");
const router = (0, express_1.Router)();
router.get('/resumen', reportes_controller_1.getDashboard);
exports.default = router;
