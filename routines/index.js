/**
 * Central export for all route modules
 */

const createAuthRoutes = require('./auth.routes');
const createAdminRoutes = require('./admin.routes');
const createUserRoutes = require('./user.routes');

module.exports = {
    createAuthRoutes,
    createAdminRoutes,
    createUserRoutes
};