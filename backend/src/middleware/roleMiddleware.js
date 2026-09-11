/**
 * Role-Based Access Control and Section-Scoping Middleware
 */

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Unauthorized. Authentication required.' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}`,
      });
    }

    next();
  };
}

const requireAdmin = requireRole('SUPER_ADMIN', 'SECTION_ADMIN');
const requireSuperAdmin = requireRole('SUPER_ADMIN');

/**
 * Ensures that if the logged-in user is a SECTION_ADMIN, they cannot access or target
 * another section's data. If targetSectionId is passed, validates against user's sectionId.
 */
function enforceSectionScope(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Unauthorized.' });
  }

  // Super admins have universal access across all sections
  if (req.user.role === 'SUPER_ADMIN') {
    req.scopedSectionId = req.query.sectionId || req.body.sectionId || null;
    return next();
  }

  // Section admins are locked to their own section
  if (req.user.role === 'SECTION_ADMIN') {
    const adminSectionId = req.user.sectionId;

    if (!adminSectionId) {
      return res.status(403).json({
        success: false,
        error: 'Section Admin has no assigned section. Contact Super Admin.',
      });
    }

    const requestedSectionId = req.params.sectionId || req.query.sectionId || req.body.sectionId;
    if (requestedSectionId && requestedSectionId !== adminSectionId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You are only authorized to manage your assigned section.',
      });
    }

    // Force server-side scoping
    req.scopedSectionId = adminSectionId;
    return next();
  }

  // Regular employees
  req.scopedSectionId = req.user.sectionId;
  next();
}

module.exports = {
  requireRole,
  requireAdmin,
  requireSuperAdmin,
  enforceSectionScope,
};
