"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const reportes_controller_1 = require("../controllers/reportes.controller");
const router = (0, express_1.Router)();
router.get('/emergencias', reportes_controller_1.getEmergencias);
router.get('/cuadro-honor', reportes_controller_1.getCuadroHonor);
router.get('/analitica-operacional', reportes_controller_1.getAnaliticaOperacional);
exports.default = router;
