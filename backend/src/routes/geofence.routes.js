const express = require('express');
const router = express.Router();
const GeofenceController = require('../controllers/geofence.controller');
const authMiddleware = require('../middleware/authMiddleware');
const { requireAdmin, requireSuperAdmin } = require('../middleware/roleMiddleware');

router.use(authMiddleware);

// Publicly readable to all authenticated users (employees need to see active zones)
router.get('/', GeofenceController.list);
router.post('/validate', GeofenceController.validate);

// Admin operations
router.post('/', requireSuperAdmin, GeofenceController.create);
router.put('/:id', requireAdmin, GeofenceController.update);
router.delete('/:id', requireSuperAdmin, GeofenceController.delete);

module.exports = router;
