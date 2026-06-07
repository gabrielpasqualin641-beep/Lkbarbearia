const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');
const barberController = require('../controllers/barberController');
const movementController = require('../controllers/movementController');
const valeController = require('../controllers/valeController');
const appointmentController = require('../controllers/appointmentController');

const { authMiddleware, adminOnly } = require('../middlewares/auth');

// Rotas de Autenticação
router.post('/auth/login', authController.login);
router.post('/auth/logout', authController.logout);
router.get('/auth/barbers', authController.listPublicBarbers);

// Rotas de Barbeiros (protegidas)
router.get('/barbers', authMiddleware, barberController.list);
router.post('/barbers', authMiddleware, adminOnly, barberController.create);
router.put('/barbers/:id', authMiddleware, adminOnly, barberController.update);
router.delete('/barbers/:id', authMiddleware, adminOnly, barberController.delete);

// Rotas de Movimentações (protegidas)
router.get('/movements', authMiddleware, movementController.list);
router.post('/movements', authMiddleware, movementController.create);

// Rotas de Vales (protegidas)
router.get('/vales', authMiddleware, valeController.list);
router.post('/vales', authMiddleware, valeController.create);
router.patch('/vales/:id/status', authMiddleware, adminOnly, valeController.updateStatus);

// Rotas de Agendamentos (protegidas)
router.get('/appointments', authMiddleware, appointmentController.list);
router.post('/appointments', authMiddleware, appointmentController.create);
router.patch('/appointments/:id/status', authMiddleware, appointmentController.updateStatus);

module.exports = router;
