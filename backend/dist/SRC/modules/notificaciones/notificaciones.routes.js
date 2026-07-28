"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificaciones_controller_1 = require("./notificaciones.controller");
const router = (0, express_1.Router)();
router.post('/cron', notificaciones_controller_1.ejecutarCronNotificaciones);
exports.default = router;
