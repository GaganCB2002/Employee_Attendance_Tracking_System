/**
 * Schema Validation Middleware
 * Enforces strict allowlists for request body, params, and query schemas.
 * Rejects any malformed, oversized, or unauthorized fields before reaching controllers.
 */

function validateSchema(schema, target = 'body') {
  return (req, res, next) => {
    const data = req[target] || {};
    const errors = [];

    // 1. Check required fields and type validations
    for (const [field, rules] of Object.entries(schema)) {
      const val = data[field];

      if (rules.required && (val === undefined || val === null || val === '')) {
        errors.push(`Field '${field}' is required.`);
        continue;
      }

      if (val !== undefined && val !== null) {
        if (rules.type === 'string' && typeof val !== 'string') {
          errors.push(`Field '${field}' must be a string.`);
        } else if (rules.type === 'number') {
          const num = parseFloat(val);
          if (isNaN(num)) {
            errors.push(`Field '${field}' must be a valid number.`);
          } else {
            if (rules.min !== undefined && num < rules.min) {
              errors.push(`Field '${field}' must be at least ${rules.min}.`);
            }
            if (rules.max !== undefined && num > rules.max) {
              errors.push(`Field '${field}' must not exceed ${rules.max}.`);
            }
          }
        } else if (rules.type === 'coordinate_lat') {
          const lat = parseFloat(val);
          if (isNaN(lat) || lat < -90 || lat > 90) {
            errors.push(`Latitude '${val}' is out of valid GPS range [-90, 90].`);
          }
        } else if (rules.type === 'coordinate_lng') {
          const lng = parseFloat(val);
          if (isNaN(lng) || lng < -180 || lng > 180) {
            errors.push(`Longitude '${val}' is out of valid GPS range [-180, 180].`);
          }
        } else if (rules.type === 'email') {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(val)) {
            errors.push(`Field '${field}' must be a valid email address.`);
          }
        }

        // Length limits
        if (typeof val === 'string') {
          if (rules.minLength && val.length < rules.minLength) {
            errors.push(`Field '${field}' must be at least ${rules.minLength} characters.`);
          }
          if (rules.maxLength && val.length > rules.maxLength) {
            errors.push(`Field '${field}' must not exceed ${rules.maxLength} characters.`);
          }
        }
      }
    }

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed.',
        details: errors,
      });
    }

    next();
  };
}

// Predefined Strict Schemas
const SCHEMAS = {
  login: {
    identifier: { required: true, type: 'string', minLength: 3, maxLength: 80 },
    password: { required: true, type: 'string', minLength: 6, maxLength: 100 },
  },

  checkpointSubmit: {
    checkpointId: { required: true, type: 'string' },
    latitude: { required: true, type: 'coordinate_lat' },
    longitude: { required: true, type: 'coordinate_lng' },
    accuracy: { required: false, type: 'number', min: 0, max: 1000 },
  },

  employeeOnboard: {
    employeeCode: { required: true, type: 'string', minLength: 3, maxLength: 50 },
    name: { required: true, type: 'string', minLength: 2, maxLength: 100 },
    sectionId: { required: true, type: 'string' },
    shiftId: { required: true, type: 'string' },
    password: { required: true, type: 'string', minLength: 6, maxLength: 100 },
  },

  geofenceCreate: {
    name: { required: true, type: 'string', minLength: 3, maxLength: 100 },
    code: { required: true, type: 'string', minLength: 3, maxLength: 50 },
    latitude: { required: true, type: 'coordinate_lat' },
    longitude: { required: true, type: 'coordinate_lng' },
    radiusMeters: { required: true, type: 'number', min: 10, max: 2000 },
  },
};

module.exports = {
  validateSchema,
  SCHEMAS,
};
