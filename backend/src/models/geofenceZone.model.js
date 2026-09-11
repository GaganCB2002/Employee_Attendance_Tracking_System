const prisma = require('../config/db');

const GeofenceZoneModel = {
  findMany: (args) => prisma.geofenceZone.findMany(args),
  findUnique: (args) => prisma.geofenceZone.findUnique(args),
  create: (args) => prisma.geofenceZone.create(args),
  update: (args) => prisma.geofenceZone.update(args),
  delete: (args) => prisma.geofenceZone.delete(args),

  listActive: (sectionId) => {
    const where = {
      isActive: true,
      ...(sectionId ? { OR: [{ sectionId }, { sectionId: null }] } : {}),
    };
    return prisma.geofenceZone.findMany({
      where,
      include: { section: true },
      orderBy: { name: 'asc' },
    });
  },
};

module.exports = GeofenceZoneModel;
